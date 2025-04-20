// backend/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendEmail(to, subject, message, allegato = null) {
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

  // Aggiunge l’allegato solo se presente
  if (allegato) {
    mailOptions.attachments = [
      {
        filename: allegato.split('/').pop(),
        path: allegato
      }
    ];
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email inviata a ${to}: ${info.messageId}`);
}

module.exports = { sendEmail };
