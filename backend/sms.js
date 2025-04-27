const { exec } = require('child_process');

// Invia SMS usando Gammu, forzando EMS per supporto concatenamento
function sendSMS(numero, messaggio) {
  return new Promise((resolve, reject) => {
    // Protegge eventuali virgolette nel messaggio
    const safeMessage = messaggio.replace(/"/g, '\\"');

    // Usa il comando EMS invece di TEXT per supportare SMS concatenati
    const comando = `echo "${safeMessage}" | gammu --sendsms EMS ${numero}`;

    // Esegue il comando
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
