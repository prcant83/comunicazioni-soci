// backend/rubriche.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/soci.sqlite');

// ✅ Elenco rubriche
router.get('/', (req, res) => {
  db.all("SELECT DISTINCT rubrica FROM soci", [], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    const rubriche = rows.map(r => r.rubrica);
    res.json(rubriche);
  });
});

// ✅ Contatti di una rubrica
router.get('/:nome', (req, res) => {
  const rubrica = req.params.nome;
  db.all("SELECT * FROM soci WHERE rubrica = ?", [rubrica], (err, rows) => {
    if (err) return res.status(500).send('Errore DB');
    res.json(rows);
  });
});

// ✅ Elimina rubrica
router.delete('/:nome', (req, res) => {
  const rubrica = req.params.nome;
  db.run("DELETE FROM soci WHERE rubrica = ?", [rubrica], function(err) {
    if (err) return res.status(500).send('Errore eliminazione');
    res.send(`Rubrica "${rubrica}" eliminata con successo.`);
  });
});

// ✅ Elimina contatto singolo
router.delete('/contatto/:id', (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM soci WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).send('Errore eliminazione contatto');
    res.send(`Contatto con ID ${id} eliminato.`);
  });
});

// ✅ Modifica contatto singolo
router.put('/contatto/:id', express.json(), (req, res) => {
  const id = req.params.id;
  const { nome, telefono, email } = req.body;
  db.run(
    "UPDATE soci SET nome = ?, telefono = ?, email = ? WHERE id = ?",
    [nome, telefono, email, id],
    function(err) {
      if (err) return res.status(500).send('Errore aggiornamento');
      res.send(`Contatto con ID ${id} aggiornato.`);
    }
  );
});

// ✅ Aggiungi nuovo contatto
router.post('/contatto', express.json(), (req, res) => {
  const { nome, telefono, email, rubrica } = req.body;
  if (!nome || !telefono || !email || !rubrica) {
    return res.status(400).send("Tutti i campi sono obbligatori");
  }
  db.run(
    "INSERT INTO soci (nome, telefono, email, rubrica) VALUES (?, ?, ?, ?)",
    [nome, telefono, email, rubrica],
    function(err) {
      if (err) return res.status(500).send('Errore inserimento contatto');
      res.send(`Contatto aggiunto alla rubrica ${rubrica}.`);
    }
  );
});

module.exports = router;
