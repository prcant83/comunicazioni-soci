// backend/server.js aggiornato definitivo con cache segnale + correzione log + nuova API giorni

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const { exec } = require('child_process');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { sendEmail } = require('./email');
const { startWhatsApp, sendWhatsApp, statoWhatsApp } = require('./whatsapp');
const { sendSMS } = require('./sms');
const { salvaLogInvio } = require('./log');
require('dotenv').config();

const app = express();
const PORT = 3000;
const pathProgetto = '/home/riccardo/comunicazioni-soci';

startWhatsApp();

const db = new sqlite3.Database('./database/soci.sqlite', (err) => {
  if (err) console.error('❌ Errore connessione DB:', err.message);
  else console.log('✅ Database SQLite collegato.');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/allegati/email', express.static(path.join(__dirname, '../allegati/email')));
app.use('/allegati/whatsapp', express.static(path.join(__dirname, '../allegati/whatsapp')));
app.use('/backend', express.static(__dirname));

const upload = multer({ dest: 'tmp/' });

// 📥 Importa CSV
app.post('/upload', upload.single('file'), (req, res) => {
  const results = [];
  const rubrica = req.body.rubrica || 'Generica';
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      if (data.nome && data.telefono && data.email) {
        results.push({
          nome: data.nome.trim(),
          telefono: data.telefono.trim(),
          email: data.email.trim()
        });
      }
    })
    .on('end', () => {
      const stmt = db.prepare("INSERT INTO soci (nome, telefono, email, rubrica) VALUES (?, ?, ?, ?)");
      results.forEach(r => stmt.run(r.nome, r.telefono, r.email, rubrica));
      stmt.finalize();
      fs.unlinkSync(req.file.path);
      res.send('✅ Contatti importati con successo.');
    });
});

// 📧 Invia Email
app.post('/send-email', upload.single('allegato'), async (req, res) => {
  const { to, subject, message, rubrica } = req.body;
  const fileTempPath = req.file ? req.file.path : null;
  const originalName = req.file ? req.file.originalname : null;

  const invia = async (dest) => {
    try {
      const percorsoAllegatoSalvato = await sendEmail(dest, subject, message, fileTempPath, originalName);
      salvaLogInvio('email', dest, message, rubrica || null, percorsoAllegatoSalvato || '');
    } catch (err) {
      console.error(`❌ Errore invio email a ${dest}:`, err.message);
      salvaLogInvio('email', dest, `ERRORE: ${err.message}`, rubrica || null);
    }
  };

  if (rubrica && !to) {
    db.all("SELECT email FROM soci WHERE rubrica = ?", [rubrica], async (err, rows) => {
      if (err) return res.status(500).send('Errore DB');
      if (!rows.length) return res.status(404).send('Rubrica vuota');
      for (const row of rows) {
        await invia(row.email);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      res.send('✅ Email inviate a tutti i contatti della rubrica');
    });
  } else if (to) {
    await invia(to);
    res.send('✅ Email inviata');
  } else {
    res.status(400).send('❌ Nessun destinatario specificato');
  }
});

// 📚 Rubriche e Contatti
app.get('/rubriche', (req, res) => {
  db.all("SELECT DISTINCT rubrica FROM soci", [], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    res.json(rows.map(r => r.rubrica));
  });
});

app.get('/rubriche/:nome', (req, res) => {
  db.all("SELECT * FROM soci WHERE rubrica = ?", [req.params.nome], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    res.json(rows);
  });
});

app.delete('/rubriche/:nome', (req, res) => {
  db.run("DELETE FROM soci WHERE rubrica = ?", [req.params.nome], function (err) {
    if (err) return res.status(500).send('Errore eliminazione rubrica');
    res.send(`✅ Rubrica "${req.params.nome}" eliminata`);
  });
});

app.delete('/rubriche/contatto/:id', (req, res) => {
  db.run("DELETE FROM soci WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).send('Errore eliminazione contatto');
    res.send('✅ Contatto eliminato');
  });
});

app.post('/rubriche/contatto', (req, res) => {
  const { nome, telefono, email, rubrica } = req.body;
  db.run("INSERT INTO soci (nome, telefono, email, rubrica) VALUES (?, ?, ?, ?)", [nome, telefono, email, rubrica], function (err) {
    if (err) return res.status(500).send('Errore inserimento');
    res.send(`Contatto ${nome} aggiunto`);
  });
});

app.put('/rubriche/contatto/:id', (req, res) => {
  const { nome, telefono, email } = req.body;
  db.run("UPDATE soci SET nome = ?, telefono = ?, email = ? WHERE id = ?", [nome, telefono, email, req.params.id], function (err) {
    if (err) return res.status(500).send('Errore aggiornamento');
    res.send('Contatto aggiornato');
  });
});

// 📋 Log (corretto)
app.get('/api/log', (req, res) => {
  const { tipo, start, end, limit } = req.query;
  let sql = "SELECT * FROM log_invio";
  const conditions = [];
  const params = [];

  if (tipo) {
    conditions.push("tipo = ?");
    params.push(tipo);
  }
  if (start) {
    conditions.push("date(data) >= date(?)");
    params.push(start);
  }
  if (end) {
    conditions.push("date(data) <= date(?)");
    params.push(end);
  }

  if (conditions.length) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY id DESC";

  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit));
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).send('Errore recupero log');
    res.json(rows);
  });
});

// 📅 API per date log
app.get('/api/log/days', (req, res) => {
  db.all("SELECT DISTINCT date(data) as giorno FROM log_invio ORDER BY giorno DESC", [], (err, rows) => {
    if (err) return res.status(500).send('Errore recupero giorni log');
    res.json(rows.map(r => r.giorno));
  });
});

// 💬 WhatsApp
app.post('/send-whatsapp', upload.single('allegato'), async (req, res) => {
  const { rubrica, messaggio, telefono } = req.body;
  let percorsoAllegato = '';

  if (req.file) {
    const estensione = path.extname(req.file.originalname);
    const nomeUnico = `wa_${Date.now()}${estensione}`;
    const destinazione = path.join(__dirname, '../allegati/whatsapp', nomeUnico);
    fs.renameSync(req.file.path, destinazione);
    percorsoAllegato = `allegati/whatsapp/${nomeUnico}`;
  }

  const invia = async (numero) => {
    try {
      await sendWhatsApp(numero, messaggio, percorsoAllegato ? path.join(__dirname, '../', percorsoAllegato) : null);
      salvaLogInvio('whatsapp', numero, messaggio, rubrica || null, percorsoAllegato || '');
    } catch (err) {
      console.error(`❌ Errore invio WhatsApp a ${numero}:`, err.message);
      salvaLogInvio('whatsapp', numero, `ERRORE: ${err.message}`, rubrica || null);
    }
  };

  if (telefono) {
    await invia(telefono);
    return res.send('✅ Messaggio WhatsApp inviato al numero specificato');
  }

  if (!rubrica) return res.status(400).send('❌ Rubrica non specificata');

  db.all("SELECT telefono FROM soci WHERE rubrica = ?", [rubrica], async (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    if (!rows.length) return res.status(404).send('Rubrica vuota');
    for (const row of rows) {
      await invia(row.telefono);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    res.send('✅ Messaggi WhatsApp inviati a tutta la rubrica');
  });
});

// 📟 Stato WhatsApp
app.get('/api/stato/whatsapp-qr', (req, res) => {
  const qrPath = path.join(__dirname, '../session/Default/qrcode.png');
  const qrCode = fs.existsSync(qrPath) ? fs.readFileSync(qrPath, { encoding: 'base64' }) : null;
  res.json({ pronto: statoWhatsApp.pronto, qrCode: qrCode, errore: statoWhatsApp.errore || null });
});

// 📶 Stato GSM - CACHE
let ultimoSegnaleGSM = { segnale_csq: null, percentuale: null, risposta: '', timestamp: 0 };

function aggiornaSegnaleGSM() {
  const port = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 115200, autoOpen: false });

  port.open(err => {
    if (err) {
      console.error('❌ Errore apertura porta seriale:', err.message);
      return;
    }

    console.log('✅ Porta seriale aperta per aggiornare segnale GSM.');

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    let atRisposto = false;

    parser.on('data', (line) => {
      console.log('📶 Risposta modem:', line);

      if (!atRisposto && line.includes('OK')) {
        atRisposto = true;
        console.log('✅ Modem pronto, ora chiedo il segnale...');
        setTimeout(() => {
          port.write('AT+CSQ\r');
        }, 500); // mezzo secondo dopo OK
      }

      if (line.includes('+CSQ:')) {
        const match = line.match(/\+CSQ:\s*(\d+),/);
        if (match) {
          const csq = parseInt(match[1]);
          const percentuale = Math.round((csq / 31) * 100);
          ultimoSegnaleGSM = {
            segnale_csq: csq,
            percentuale: percentuale,
            risposta: `📶 Segnale: ${percentuale}% (CSQ ${csq})`,
            timestamp: Date.now()
          };
          console.log(`📶 Segnale aggiornato: ${ultimoSegnaleGSM.risposta}`);
          port.close();
        }
      }
    });

    setTimeout(() => {
      console.log('⌛ Attendo prima di inviare AT...');
      port.write('AT\r');
    }, 2000);

    setTimeout(() => {
      if (!atRisposto) {
        console.error('❌ Modem non ha risposto ad AT nemmeno dopo 3 secondi.');
        port.close();
      }
    }, 5000);
  });
}

aggiornaSegnaleGSM();
setInterval(aggiornaSegnaleGSM, 30000);

app.get('/api/stato/gsm-signal', (req, res) => {
  if (ultimoSegnaleGSM.timestamp > 0) {
    res.json(ultimoSegnaleGSM);
  } else {
    res.status(500).json({ error: 'Segnale GSM non disponibile' });
  }
});

// 🔄 Riavvia Raspberry
app.post('/api/riavvia', (req, res) => {
  exec('sudo reboot', (err) => {
    if (err) return res.status(500).send('Errore riavvio: ' + err.message);
    res.send('✅ Riavvio in corso...');
  });
});

// ⚙️ Aggiorna Sistema
app.post('/api/aggiorna', (req, res) => {
  exec(`cd ${pathProgetto} && bash setup.sh`, (err, stdout, stderr) => {
    if (err) return res.status(500).send('Errore aggiornamento: ' + (stderr || err.message));
    res.send('✅ Setup completato:\\n' + stdout);
  });
});

// ❌ Scollega WhatsApp
app.post('/api/whatsapp-reset', (req, res) => {
  exec(`rm -rf ${pathProgetto}/session/Default && sudo systemctl restart comunicazioni-soci.service`, (err, stdout, stderr) => {
    if (err) return res.status(500).send('Errore reset WhatsApp: ' + (stderr || err.message));
    res.send('✅ WhatsApp scollegato. Scannerizza un nuovo QR Code.');
  });
});

// ▶️ Server
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
