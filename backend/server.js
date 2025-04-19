// backend/server.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const { sendEmail } = require('./email');
const { startWhatsApp } = require('./whatsapp');
const rubricheRouter = require('./rubriche'); // 👈 importato correttamente
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

// 📌 Usa il router per rubriche
app.use('/rubriche', rubricheRouter);

// Upload CSV
const upload = multer({ dest: 'csv/' });
app.post('/upload', upload.single('file'), (req, res) => {
  const results = [];
  const rubrica = req.body.rubrica || 'Generica';

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const stmt = db.prepare("INSERT INTO soci (nome, telefono, email, rubrica) VALUES (?, ?, ?, ?)");
      results.forEach((r) => {
        stmt.run(r.nome, r.telefono, r.email, rubrica);
      });
      stmt.finalize();
      fs.unlinkSync(req.file.path); // cancella il CSV dopo l’import
      res.send('✅ Contatti importati con successo.');
    });
});

// Invia Email
app.post('/send-email', async (req, res) => {
  const { to, subject, message, rubrica } = req.body;

  if (rubrica) {
    db.all("SELECT email FROM soci WHERE rubrica = ?", [rubrica], async (err, rows) => {
      if (err) return res.status(500).send('Errore DB');
      if (rows.length === 0) return res.status(404).send('Rubrica vuota');

      for (let i = 0; i < rows.length; i++) {
        const email = rows[i].email;
        try {
          await sendEmail(email, subject, message);
          console.log(`📧 Email inviata a ${email}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (err) {
          console.error(`❌ Errore invio email a ${email}:`, err);
        }
      }

      res.send('✅ Email inviate a tutti i contatti della rubrica');
    });
  } else if (to) {
    try {
      await sendEmail(to, subject, message);
      res.send('✅ Email inviata');
    } catch (err) {
      console.error('❌ Errore invio email:', err);
      res.status(500).send('Errore invio email');
    }
  } else {
    res.status(400).send('❌ Nessun destinatario specificato');
  }
});

// Avvio server
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
