
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/soci.sqlite');

function logEvento(tipo, destinatario, messaggio, mezzo) {
  const dataOra = new Date().toISOString();
  db.run(
    "INSERT INTO log (data_ora, tipo, destinatario, messaggio, mezzo) VALUES (?, ?, ?, ?, ?)",
    [dataOra, tipo, destinatario, messaggio, mezzo],
    (err) => {
      if (err) console.error('Errore log:', err.message);
    }
  );
}

module.exports = { logEvento };
