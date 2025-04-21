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
 * @returns {Promise<void>}
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

  // Se c'è un allegato, salvalo e includilo
  if (filePathTemp) {
    const nomeFile = path.basename(filePathTemp);
    const cartellaDestinazione = path.join(__dirname, '../allegati/email');
    const percorsoFinale = path.join(cartellaDestinazione, nomeFile);

    // Crea la cartella se non esiste
    if (!fs.existsSync(cartellaDestinazione)) {
      fs.mkdirSync(cartellaDestinazione, { recursive: true });
    }

    // Sposta il file temporaneo nella cartella finale
    fs.renameSync(filePathTemp, percorsoFinale);

    // Aggiunge allegato alla mail
    mailOptions.attachments = [{
      filename: nomeFile,
      path: percorsoFinale
    }];

    // Aggiunge percorso finale all'opzione per registrarlo nei log
    mailOptions._allegatoSalvato = percorsoFinale;
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email inviata a ${to}: ${info
