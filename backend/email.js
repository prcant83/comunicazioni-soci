const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail(to, subject, html, attachmentPath = null) {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to,
    subject,
    html
  };

  if (attachmentPath) {
    mailOptions.attachments = [
      {
        filename: path.basename(attachmentPath),
        path: attachmentPath
      }
    ];
  }

  const info = await transporter.sendMail(mailOptions);
  return `Email inviata: ${info.messageId}`;
}

module.exports = { sendEmail };