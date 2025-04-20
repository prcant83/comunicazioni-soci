// utils/log.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/soci.sqlite');

function salvaLogInvio(tipo, destinatario, messaggio, rubrica = '', allegato = '') {
  const sql = `
    INSERT INTO log_invio (data, tipo, destinatario, rubrica, messaggio, allegato)
    VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?)
  `;
  db.run(sql, [tipo, destinatario, rubrica, messaggio, allegato], function(err) {
    if (err) {
      console.error('❌ Errore salvataggio log:', err.message);
    } else {
      console.log(`📚 Log salvato: ${tipo} -> ${destinatario}`);
    }
  });
}

module.exports = { salvaLogInvio };
