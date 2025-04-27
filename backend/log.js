const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/soci.sqlite');

/**
 * Salva un'operazione di invio nei log
 * @param {string} tipo - Tipo di invio (email, whatsapp, sms)
 * @param {string} destinatario - Destinatario del messaggio
 * @param {string} messaggio - Testo del messaggio o eventuale errore
 * @param {string|null} rubrica - Rubrica associata (opzionale)
 * @param {string} allegato - Percorso dell'allegato (opzionale)
 */
function salvaLogInvio(tipo, destinatario, messaggio, rubrica = null, allegato = '') {
  const data = new Date().toISOString();
  db.run(
    "INSERT INTO log_invio (data, tipo, destinatario, rubrica, messaggio, allegato) VALUES (?, ?, ?, ?, ?, ?)",
    [data, tipo, destinatario, rubrica, messaggio, allegato],
    function (err) {
      if (err) {
        console.error('❌ Errore salvataggio log:', err.message);
      } else {
        console.log('📝 Log invio salvato.');
      }
    }
  );
}

module.exports = { salvaLogInvio };
