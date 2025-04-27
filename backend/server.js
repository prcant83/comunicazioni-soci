// backend/server.js aggiornato completo
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const { exec } = require('child_process');
const { sendEmail } = require('./email');
const { startWhatsApp, sendWhatsApp, statoWhatsApp } = require('./whatsapp');
const { sendSMS } = require('./sms');
const { salvaLogInvio } = require('./utils/log');
require('dotenv').config();

const app = express();
const PORT = 3000;
const pathProgetto = '/home/riccardo/comunicazioni-soci';

// Avvia WhatsApp
startWhatsApp();

// DB
const db = new sqlite3.Database('./database/soci.sqlite', (err) => {
  if (err) console.error('❌ Errore connessione DB:', err.message);
  else console.log('✅ Database SQLite collegato.');
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/allegati/email', express.static(path.join(__dirname, '../allegati/email')));
app.use('/allegati/whatsapp', express.static(path.join(__dirname, '../allegati/whatsapp')));
app.use('/backend', express.static(__dirname));

// Multer configurazione
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

// 📚 Rubriche
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

// 👤 Contatti
app.delete('/rubriche/contatto/:id', (req, res) => {
  db.run("DELETE FROM soci WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).send('Errore eliminazione contatto');
    res.send('✅ Contatto eliminato');
  });
});

app.post('/rubriche/contatto', (req, res) => {
  const { nome, telefono, email, rubrica } = req.body;
  db.run("INSERT INTO soci (nome, telefono, email, rubrica) VALUES (?, ?, ?, ?)",
    [nome, telefono, email, rubrica],
    function (err) {
      if (err) return res.status(500).send('Errore inserimento');
      res.send(`Contatto ${nome} aggiunto`);
    });
});

app.put('/rubriche/contatto/:id', (req, res) => {
  const { nome, telefono, email } = req.body;
  db.run("UPDATE soci SET nome = ?, telefono = ?, email = ? WHERE id = ?",
    [nome, telefono, email, req.params.id],
    function (err) {
      if (err) return res.status(500).send('Errore aggiornamento');
      res.send('Contatto aggiornato');
    });
});

// 📜 Log
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
    conditions.push("data >= ?");
    params.push(start);
  }
  if (end) {
    conditions.push("data <= ?");
    params.push(end);
  }

  if (conditions.length) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY id DESC LIMIT ?";
  params.push(parseInt(limit) || 100);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).send('Errore recupero log');
    res.json(rows);
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

// 📱 SMS
app.post('/send-sms', async (req, res) => {
  const { rubrica, messaggio, numero } = req.body;

  const invia = async (numeroDest) => {
    try {
      await sendSMS(numeroDest, messaggio);
      salvaLogInvio('sms', numeroDest, messaggio, rubrica || null, '');
    } catch (err) {
      console.error(`❌ Errore invio SMS a ${numeroDest}:`, err.message);
      salvaLogInvio('sms', numeroDest, `ERRORE: ${err.message}`, rubrica || null);
    }
  };

  if (numero) {
    await invia(numero);
    return res.send('✅ SMS inviato al numero specificato');
  }

  if (!rubrica) return res.status(400).send('❌ Rubrica non specificata');

  db.all("SELECT telefono FROM soci WHERE rubrica = ?", [rubrica], async (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    if (!rows.length) return res.status(404).send('Rubrica vuota');
    for (const row of rows) {
      await invia(row.telefono);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    res.send('✅ Messaggi SMS inviati con successo');
  });
});

// 📟 Stato WhatsApp
app.get('/api/stato/whatsapp-qr', (req, res) => {
  const qrPath = path.join(__dirname, '../session/Default/qrcode.png');
  const qrCode = fs.existsSync(qrPath) ? fs.readFileSync(qrPath, { encoding: 'base64' }) : null;
  res.json({
    pronto: statoWhatsApp.pronto,
    qrCode: qrCode,
    errore: statoWhatsApp.errore || null
  });
});

// 📶 Stato GSM - Aspetta fino a 8 secondi l'output di gammu
app.get('/api/stato/gsm-signal', (req, res) => {
  const child = exec('gammu --monitor 1', { timeout: 8000 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }

    const match = stdout.match(/Signal strength\s*:\s*(-?\d+) dBm[\s\S]*Network level\s*:\s*(\d+)%/i);

    if (match) {
      const segnale_dBm = parseInt(match[1]);
      const percentuale = parseInt(match[2]);
      res.json({
        segnale_dBm,
        percentuale,
        risposta: `📶 Segnale: ${percentuale}% (${segnale_dBm} dBm)`
      });
    } else {
      res.status(500).json({ error: "Impossibile leggere il segnale GSM" });
    }
  });

  // Termina il processo massimo dopo 8 secondi (di sicurezza)
  setTimeout(() => {
    child.kill();
  }, 8000);
});

// 🔄 Riavvia Raspberry
app.post('/api/riavvia', (req, res) => {
  exec('sudo reboot', (err) => {
    if (err) return res.status(500).send('Errore riavvio: ' + err.message);
    res.send('✅ Riavvio in corso...');
  });
});

// ⚙️ Aggiorna Sistema (setup completo)
app.post('/api/aggiorna', (req, res) => {
  exec(`cd ${pathProgetto} && bash setup.sh`, (err, stdout, stderr) => {
    if (err) return res.status(500).send('Errore aggiornamento: ' + (stderr || err.message));
    res.send('✅ Setup completato:\n' + stdout);
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
