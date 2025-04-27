const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Invia un SMS concatenato tramite Gammu salvando su file temporaneo
 * @param {string} numero - Numero di telefono del destinatario
 * @param {string} messaggio - Testo del messaggio da inviare
 * @returns {Promise<string>} - Output del comando Gammu
 */
async function sendSMS(numero, messaggio) {
  return new Promise((resolve, reject) => {
    try {
      const filePath = path.join('/tmp', `sms_${Date.now()}.txt`);
      fs.writeFileSync(filePath, messaggio, { encoding: 'utf8' });

      const comando = `gammu sendsms EMS ${numero} -unicodefiletext "${filePath}"`;

      exec(comando, (error, stdout, stderr) => {
        // Elimina il file temporaneo comunque
        fs.unlinkSync(filePath);

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

    } catch (err) {
      console.error('❌ Errore gestione file temporaneo:', err.message);
      reject('Errore creazione file temporaneo.');
    }
  });
}

module.exports = { sendSMS };
