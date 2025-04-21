// backend/sms.js
const { exec } = require('child_process');

// Invia SMS usando Gammu
function sendSMS(numero, messaggio) {
  return new Promise((resolve, reject) => {
    const comando = `echo "${messaggio}" | gammu --sendsms TEXT ${numero}`;

    // Esegui il comando per inviare l'SMS
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Errore invio SMS:', error.message);  // Miglioramento del log degli errori
        reject(`Errore durante l'invio dell'SMS: ${stderr || error.message}`);
      } else {
        // Successo
        console.log('✅ SMS inviato con successo:', stdout);  // Log del successo
        resolve(stdout);
      }

      // Aggiunta gestione degli errori di stderr, che potrebbe contenere dettagli sull'errore
      if (stderr) {
        console.error('❗ Dettagli errore:', stderr);
      }
    });
  });
}

module.exports = { sendSMS };
