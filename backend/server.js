const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const { exec } = require('child_process');
const { sendEmail } = require('./email');
const { startWhatsApp } = require('./whatsapp');
const { sendSMS } = require('./sms');
const { salvaLogInvio } = require('./utils/log');
require('dotenv').config();

const app = express();
const PORT = 3000;

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
app.use('/backend', express.static(path.join(__dirname, './')));


// Multer configurazione
const upload = multer({ dest: 'tmp/' });

// 📥 Import CSV
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
      results.forEach(r => {
        stmt.run(r.nome, r.telefono, r.email, rubrica);
      });
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

// 📜 Log con filtro tipo (email, whatsapp, sms)
app.get('/api/log', (req, res) => {
  const tipo = req.query.tipo;
  const limit = parseInt(req.query.limit) || 100;
  const sql = tipo
    ? "SELECT * FROM log_invio WHERE tipo = ? ORDER BY id DESC LIMIT ?"
    : "SELECT * FROM log_invio ORDER BY id DESC LIMIT ?";
  const params = tipo ? [tipo, limit] : [limit];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).send('Errore recupero log');
    res.json(rows);
  });
});

// 💬 Invia WhatsApp
app.post('/send-whatsapp', upload.single('allegato'), async (req, res) => {
  const { rubrica, messaggio } = req.body;
  let percorsoAllegato = '';

  if (req.file) {
    const estensione = path.extname(req.file.originalname);
    const nomeUnico = `wa_${Date.now()}${estensione}`;
    const destinazione = path.join(__dirname, '../allegati/whatsapp', nomeUnico);
    fs.renameSync(req.file.path, destinazione);
    percorsoAllegato = `allegati/whatsapp/${nomeUnico}`;
  }

  const { sendWhatsApp } = require('./whatsapp');

  const invia = async (numero) => {
    try {
      await sendWhatsApp(numero, messaggio, percorsoAllegato ? path.join(__dirname, '../', percorsoAllegato) : null);
      salvaLogInvio('whatsapp', numero, messaggio, rubrica || null, percorsoAllegato || '');
    } catch (err) {
      console.error(`❌ Errore invio WhatsApp a ${numero}:`, err.message);
      salvaLogInvio('whatsapp', numero, `ERRORE: ${err.message}`, rubrica || null);
    }
  };

  if (!rubrica) return res.status(400).send('❌ Rubrica non specificata');

  db.all("SELECT telefono FROM soci WHERE rubrica = ?", [rubrica], async (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    if (!rows.length) return res.status(404).send('Rubrica vuota');

    for (const row of rows) {
      await invia(row.telefono);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    res.send('✅ Messaggi WhatsApp inviati con successo');
  });
});

// 📱 Invia SMS
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

// 📟 Stato: QR WhatsApp
app.get('/api/stato/whatsapp-qr', (req, res) => {
  const { statoWhatsApp } = require('./whatsapp');

app.get('/api/stato/whatsapp-qr', (req, res) => {
  res.json({
    pronto: statoWhatsApp.pronto,
    qrCode: statoWhatsApp.qr ? fs.existsSync(path.join(__dirname, '../session/Default/qrcode.png'))
      ? fs.readFileSync(path.join(__dirname, '../session/Default/qrcode.png'), { encoding: 'base64' })
      : null : null,
    errore: statoWhatsApp.errore
  });
});
  });

// 📶 Stato: Segnale GSM
app.get('/api/stato/gsm-signal', (req, res) => {
  exec('gammu --identify', (err, stdout, stderr) => {
    if (err) return res.json({ risposta: 'Errore: ' + (stderr || err.message) });
    return res.json({ risposta: stdout.trim() });
  });
});

// ▶️ Avvio server
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
