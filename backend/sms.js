const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sendSMS(numero, messaggio) {
  return new Promise((resolve, reject) => {
    try {
      const filePath = path.join('/tmp', `sms_${Date.now()}.txt`);
      fs.writeFileSync(filePath, Buffer.from(messaggio, 'utf16le').swap16());

      const comando = `gammu sendsms EMS ${numero} -unicodefiletext "${filePath}"`;

      exec(comando, (error, stdout, stderr) => {
        fs.unlinkSync(filePath);

        if (error) {
          console.error('❌ Errore invio SMS:', error.message || stderr || stdout);
          reject(`Errore durante l'invio dell'SMS: ${error.message || stderr || stdout}`);
        } else {
          console.log('✅ SMS inviato con successo:', stdout);
          resolve(stdout);
        }
      });

    } catch (err) {
      console.error('❌ Errore gestione file temporaneo:', err.message);
      reject('Errore creazione file temporaneo.');
    }
  });
}

module.exports = { sendSMS };
