// backend/whatsapp.js
const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const fs = require('fs');

const SESSION_FILE_PATH = './whatsapp-session.json';
let client;

async function startWhatsApp() {
  let sessionData;
  if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require('../whatsapp-session.json');
  }

  client = new Client({
    session: sessionData,
    puppeteer: {
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('🔐 Scansiona il QR Code per accedere a WhatsApp');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', (session) => {
    console.log('🔑 Autenticazione WhatsApp avvenuta con successo');
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(session));
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp client connesso e pronto');
  });

  await client.initialize();
}

module.exports = { startWhatsApp };
