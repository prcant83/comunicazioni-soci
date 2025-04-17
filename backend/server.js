require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const whatsappClient = require('./whatsapp');
const transporter = require('../utils/email');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

// WhatsApp
app.post('/api/send-whatsapp', async (req, res) => {
  const { destinatario, messaggio } = req.body;
  try {
    await whatsappClient.sendMessage(destinatario, messaggio);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Email
app.post('/api/send-email', async (req, res) => {
  const { destinatario, messaggio } = req.body;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: destinatario,
      subject: 'Comunicazione Soci',
      html: `<p>${messaggio}</p>`
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// SMS
app.post('/api/send-sms', async (req, res) => {
  const { destinatario, messaggio } = req.body;
  const command = `echo "${messaggio}" | gammu --sendsms TEXT ${destinatario}`;
  exec(command, (error, stdout, stderr) => {
    if (error) return res.json({ success: false, error: stderr });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});