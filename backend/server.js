require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const whatsapp = require('./whatsapp');
const email = require('./email');
const sms = require('./sms');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('frontend'));
const upload = multer({ dest: 'backend/uploads/' });

db.run(`CREATE TABLE IF NOT EXISTS soci (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  email TEXT,
  numero TEXT
)`);

app.post('/api/whatsapp/send', upload.single('media'), async (req, res) => {
  const { numero, messaggio } = req.body;
  const filePath = req.file ? req.file.path : null;
  try {
    const result = await whatsapp.sendMessage(numero, messaggio, filePath);
    db.run("INSERT INTO logs (data, canale, destinatario, messaggio, stato) VALUES (datetime('now'), ?, ?, ?, ?)", ['whatsapp', numero, messaggio, 'inviato']);
    res.json({ success: true, result });
  } catch (err) {
    db.run("INSERT INTO logs (data, canale, destinatario, messaggio, stato) VALUES (datetime('now'), ?, ?, ?, ?)", ['whatsapp', numero, messaggio, 'errore']);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/email/send', upload.single('allegato'), async (req, res) => {
  const { emailDestinatario, oggetto, html } = req.body;
  const allegato = req.file ? req.file.path : null;
  try {
    const result = await email.sendEmail(emailDestinatario, oggetto, html, allegato);
    db.run("INSERT INTO logs (data, canale, destinatario, messaggio, stato) VALUES (datetime('now'), ?, ?, ?, ?)", ['email', emailDestinatario, oggetto, 'inviato']);
    res.json({ success: true, result });
  } catch (err) {
    db.run("INSERT INTO logs (data, canale, destinatario, messaggio, stato) VALUES (datetime('now'), ?, ?, ?, ?)", ['email', emailDestinatario, oggetto, 'errore']);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sms/send', async (req, res) => {
  const { numero, messaggio } = req.body;
  try {
    const result = await sms.sendSMS(numero, messaggio);
    db.run("INSERT INTO logs (data, canale, destinatario, messaggio, stato) VALUES (datetime('now'), ?, ?, ?, ?)", ['sms', numero, messaggio, 'inviato']);
    res.json({ success: true, result });
  } catch (err) {
    db.run("INSERT INTO logs (data, canale, destinatario, messaggio, stato) VALUES (datetime('now'), ?, ?, ?, ?)", ['sms', numero, messaggio, 'errore']);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/logs', (req, res) => {
  db.all("SELECT * FROM logs ORDER BY id DESC LIMIT 100", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

app.post('/api/upload-csv', upload.single('csv'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Nessun file caricato' });
  const filePath = req.file.path;
  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv({ separator: ';', headers: ['nome', 'email', 'numero'] }))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      fs.unlinkSync(filePath);
      const stmt = db.prepare("INSERT INTO soci (nome, email, numero) VALUES (?, ?, ?)");
      results.forEach(r => stmt.run(r.nome, r.email, r.numero));
      stmt.finalize();
      res.json({ success: true, records: results.length });
    })
    .on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
    });
});

app.get('/api/soci', (req, res) => {
  db.all("SELECT * FROM soci ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
