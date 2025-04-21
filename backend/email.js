const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Invia un'email con o senza allegato
 * @param {string} to - Destinatario
 * @param {string} subject - Oggetto
 * @param {string} message - Corpo HTML
 * @param {string|null} filePathTemp - Percorso file temporaneo
 * @returns {Promise<string>} - Path dell'allegato salvato (vuoto se non presente)
 */
async function sendEmail(to, subject, message, filePathTemp = null) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: `"PRcant.NET" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: message
  };

  let percorsoFinale = '';

  if (filePathTemp) {
    const nomeFile = `allegato_${Date.now()}${path.extname(filePathTemp) || '.dat'}`;
    const cartellaDestinazione = path.join(__dirname, '../allegati/email');
    percorsoFinale = path.join(cartellaDestinazione, nomeFile);

    // Crea cartella se non esiste
    if (!fs.existsSync(cartellaDestinazione)) {
      fs.mkdirSync(cartellaDestinazione, { recursive: true });
    }

    // Copia il file al percorso finale
    fs.copyFileSync(filePathTemp, percorsoFinale);
    fs.unlinkSync(filePathTemp); // Rimuove file tmp

    mailOptions.attachments = [{
      filename: nomeFile,
      path: percorsoFinale
    }];
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email inviata a ${to}: ${info.response}`);

  return percorsoFinale ? `allegati/email/${path.basename(percorsoFinale)}` : '';
}

module.exports = { sendEmail };
