// backend/sms.js
const { exec } = require('child_process');

/**
 * Invia un SMS concatenato tramite Gammu
 * @param {string} numero - Numero di telefono del destinatario
 * @param {string} messaggio - Testo del messaggio da inviare
 * @returns {Promise<string>} - Output del comando Gammu
 */
function sendSMS(numero, messaggio) {
  return new Promise((resolve, reject) => {
    // Protegge le virgolette interne
    const safeMessage = messaggio.replace(/"/g, '\\"');

    // Comando Gammu per invio tramite EMS (concatenato)
    const comando = `echo "${safeMessage}" | gammu --sendsms EMS ${numero}`;

    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Errore invio SMS:', error.message);
        reject(`Errore durante l'invio dell'SMS: ${stderr || error.message}`);
      } else {
        console.log('✅ SMS inviato con successo:', stdout);
        resolve(stdout);
      }

      if (stderr) {
        console.error('❗ Dettagli errore:', stderr);
      }
    });
  });
}

module.exports = { sendSMS };
