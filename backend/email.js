// backend/email.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Invia un'email con o senza allegato
 * @param {string} to - Destinatario
 * @param {string} subject - Oggetto
 * @param {string} message - Corpo HTML del messaggio
 * @param {string|null} filePathTemp - Percorso temporaneo dell’allegato (se presente)
 * @returns {Promise<string|null>} - Percorso del file allegato salvato (se presente)
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

  let percorsoFinale = null;

  if (filePathTemp) {
    const estensione = path.extname(filePathTemp) || '.pdf';
    const nomeFile = `allegato_${Date.now()}${estensione}`;
    const cartellaDestinazione = path.join(__dirname, '../allegati/email');
    percorsoFinale = path.join(cartellaDestinazione, nomeFile);

    if (!fs.existsSync(cartellaDestinazione)) {
      fs.mkdirSync(cartellaDestinazione, { recursive: true });
    }

    fs.renameSync(filePathTemp, percorsoFinale);

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
