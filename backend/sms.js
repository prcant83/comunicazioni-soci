// backend/sms.js
const { exec } = require('child_process');

// Invia SMS usando Gammu
function sendSMS(numero, messaggio) {
  return new Promise((resolve, reject) => {
    const comando = `echo "${messaggio}" | gammu --sendsms TEXT ${numero}`;
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Errore invio SMS:', stderr);
        reject(stderr);
      } else {
        console.log('✅ SMS inviato:', stdout);
        resolve(stdout);
      }
    });
  });
}

module.exports = { sendSMS };
