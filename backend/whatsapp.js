// ✅ backend/whatsapp.js
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

let client;

function startWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('🔐 Scansiona il QR Code per accedere a WhatsApp');
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp client connesso e pronto');
  });

  client.on('authenticated', () => {
    console.log('🔑 Autenticazione WhatsApp avvenuta con successo');
  });

  client.on('auth_failure', () => {
    console.error('❌ Autenticazione WhatsApp fallita');
  });

  client.on('disconnected', () => {
    console.warn('⚠️ WhatsApp disconnesso. Riavvia il client.');
  });

  client.initialize();
}

async function sendWhatsApp(to, message) {
  if (!client || !client.info) {
    throw new Error('Client non inizializzato o disconnesso');
  }

  const number = to.replace(/[^0-9]/g, '') + '@c.us';
  console.log(`📨 Invio messaggio a: ${number} | Contenuto: ${message}`);

  try {
    const sentMsg = await client.sendMessage(number, message);
    console.log('✅ Messaggio inviato:', sentMsg.id.id);
    return sentMsg;
  } catch (err) {
    console.error('❌ Errore invio messaggio:', err);
    throw err;
  }
}

module.exports = { startWhatsApp, sendWhatsApp };
