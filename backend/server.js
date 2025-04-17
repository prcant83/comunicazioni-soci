// backend/server.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const { sendEmail } = require('./email');
const { startWhatsApp } = require('./whatsapp');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Avvia WhatsApp
startWhatsApp();

// DB SQLite
const db = new sqlite3.Database('./database/soci.sqlite', (err) => {
  if (err) {
    console.error('❌ Errore connessione DB:', err.message);
  } else {
    console.log('✅ Database SQLite collegato.');
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Upload CSV
const upload = multer({ dest: 'csv/' });
app.post('/upload', upload.single('file'), (req, res) => {
  const results = [];
  const rubrica = req.body.rubrica || 'Generica';

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const stmt = db.prepare("INSERT INTO soci (nome, cognome, telefono, email, rubrica) VALUES (?, ?, ?, ?, ?)");
      results.forEach((r) => {
        stmt.run(r.nome, r.cognome, r.telefono, r.email, rubrica);
      });
      stmt.finalize();
      fs.unlinkSync(req.file.path);
      res.send('✅ Contatti importati con successo.');
    });
});

// Invia Email
app.post('/send-email', async (req, res) => {
  const { to, subject, message } = req.body;
  try {
    await sendEmail(to, subject, message);
    res.send('✅ Email inviata');
  } catch (err) {
    console.error('❌ Errore invio email:', err);
    res.status(500).send('Errore invio email');
  }
});

// Rubriche
app.get('/rubriche', (req, res) => {
  db.all("SELECT DISTINCT rubrica FROM soci", [], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    const rubriche = rows.map(r => r.rubrica);
    res.json(rubriche);
  });
});

app.get('/rubrica/:nome', (req, res) => {
  const rubrica = req.params.nome;
  db.all("SELECT * FROM soci WHERE rubrica = ?", [rubrica], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    res.json(rows);
  });
});

// Avvia server
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
