const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/soci.sqlite');

function salvaLogInvio(tipo, destinatario, messaggio, rubrica = null) {
  const data = new Date().toISOString();
  db.run(
    `INSERT INTO log_invio (tipo, destinatario, messaggio, data, rubrica) VALUES (?, ?, ?, ?, ?)`,
    [tipo, destinatario, messaggio, data, rubrica],
    (err) => {
      if (err) console.error('❌ Errore salvataggio log:', err);
    }
  );
}

module.exports = { salvaLogInvio };
