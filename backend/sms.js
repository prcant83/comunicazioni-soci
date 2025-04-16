const { exec } = require('child_process');

async function sendSMS(numero, messaggio) {
  return new Promise((resolve, reject) => {
    const command = `echo "${messaggio}" | gammu sendsms TEXT ${numero}`;
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr));
      resolve(stdout.trim());
    });
  });
}

module.exports = { sendSMS };