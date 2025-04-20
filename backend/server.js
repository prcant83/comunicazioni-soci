const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const { sendEmail } = require('./email');
const { startWhatsApp } = require('./whatsapp');
const { salvaLogInvio } = require('./utils/log');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Avvia WhatsApp
startWhatsApp();

// Connessione DB
const db = new sqlite3.Database('./database/soci.sqlite', (err) => {
  if (err) console.error('❌ Errore connessione DB:', err.message);
  else console.log('✅ Database SQLite collegato.');
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Upload CSV (senza cognome)
const upload = multer({ dest: 'csv/' });
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

// Invia Email
app.post('/send-email', async (req, res) => {
  const { to, subject, message, rubrica, allegato } = req.body;

  if (rubrica && !to) {
    db.all("SELECT email FROM soci WHERE rubrica = ?", [rubrica], async (err, rows) => {
      if (err) return res.status(500).send('Errore DB');
      if (!rows.length) return res.status(404).send('Rubrica vuota');
      
      for (const row of rows) {
        try {
          await sendEmail(row.email, subject, message, allegato);
          salvaLogInvio('email', row.email, message, rubrica, allegato || '');
        } catch (err) {
          console.error(`❌ Errore invio email a ${row.email}:`, err.message);
          salvaLogInvio('email', row.email, `ERRORE: ${err.message}`, rubrica);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      res.send('✅ Email inviate a tutti i contatti della rubrica');
    });
  } else if (to) {
    try {
      await sendEmail(to, subject, message, allegato);
      salvaLogInvio('email', to, message, null, allegato || '');
      res.send('✅ Email inviata');
    } catch (err) {
      console.error(`❌ Errore invio email:`, err.message);
      salvaLogInvio('email', to, `ERRORE: ${err.message}`, null);
      res.status(500).send('Errore invio email');
    }
  } else {
    res.status(400).send('❌ Nessun destinatario specificato');
  }
});

// Rubriche
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

// Contatti
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

// Log
app.get('/api/log', (req, res) => {
  db.all("SELECT * FROM log_invio ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).send('Errore recupero log');
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
