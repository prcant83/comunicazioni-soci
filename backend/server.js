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
      results.forEach((r) => {
        stmt.run(r.nome, r.telefono, r.email, rubrica);
      });
      stmt.finalize();
      fs.unlinkSync(req.file.path);
      res.send('✅ Contatti importati con successo.');
    });
});

// Invia Email (singola o a rubrica)
app.post('/send-email', async (req, res) => {
  const { to, subject, message, rubrica, allegato } = req.body;

  if (rubrica && !to) {
    db.all("SELECT email FROM soci WHERE rubrica = ?", [rubrica], async (err, rows) => {
      if (err) return res.status(500).send('Errore DB');
      if (!rows || rows.length === 0) return res.status(404).send('Rubrica vuota');

      for (const row of rows) {
        const destinatario = row.email?.trim();
        if (!destinatario) continue;

        try {
          await sendEmail(destinatario, subject, message, allegato);
          salvaLogInvio('email', destinatario, message, rubrica, allegato || null);
          console.log(`📧 Email inviata a ${destinatario}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.error(`❌ Errore invio email a ${destinatario}:`, err.message || err);
        }
      }

      res.send('✅ Email inviate a tutti i contatti della rubrica');
    });
  } else if (to && !rubrica) {
    const destinatario = to.trim();
    if (!destinatario) return res.status(400).send('Indirizzo email non valido');

    try {
      await sendEmail(destinatario, subject, message, allegato);
      salvaLogInvio('email', destinatario, message, null, allegato || null);
      res.send('✅ Email inviata');
    } catch (err) {
      console.error('❌ Errore invio email singola:', err.message || err);
      res.status(500).send('Errore invio email singola');
    }
  } else {
    res.status(400).send('❌ Devi specificare una rubrica o un destinatario singolo');
  }
});

// API: elenco rubriche
app.get('/rubriche', (req, res) => {
  db.all("SELECT DISTINCT rubrica FROM soci", [], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    const rubriche = rows.map(r => r.rubrica);
    res.json(rubriche);
  });
});

// API: contatti di una rubrica
app.get('/rubrica/:nome', (req, res) => {
  const rubrica = req.params.nome;
  db.all("SELECT * FROM soci WHERE rubrica = ?", [rubrica], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    res.json(rows);
  });
});

// Elimina rubrica
app.delete('/rubrica/:nome', (req, res) => {
  const rubrica = req.params.nome;
  db.run("DELETE FROM soci WHERE rubrica = ?", [rubrica], function (err) {
    if (err) return res.status(500).send('Errore eliminazione rubrica');
    res.send(`✅ Rubrica "${rubrica}" eliminata con successo.`);
  });
});

// Elimina singolo contatto
app.delete('/contatto/:id', (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM soci WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).send('Errore eliminazione contatto');
    res.send('✅ Contatto eliminato con successo.');
  });
});

// Modifica contatto
app.put('/contatto/:id', (req, res) => {
  const id = req.params.id;
  const { nome, telefono, email } = req.body;
  db.run("UPDATE soci SET nome = ?, telefono = ?, email = ? WHERE id = ?",
    [nome, telefono, email, id], function (err) {
      if (err) return res.status(500).send('Errore modifica contatto');
      res.send('✅ Contatto aggiornato con successo.');
    });
});

// API: log invii
app.get('/api/log', (req, res) => {
  db.all("SELECT * FROM log_invio ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).send('Errore recupero log');
    res.json(rows);
  });
});

// Avvio server
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
