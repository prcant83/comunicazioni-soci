// backend/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const info = await transporter.sendMail({
    from: `"PRcant.NET" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });

  console.log("📧 Email inviata:", info.messageId);
}

module.exports = { sendEmail };
