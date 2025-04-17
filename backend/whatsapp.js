const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

function startWhatsApp() {
  client.on('qr', (qr) => {
    console.log('🔐 Scansiona il QR Code per accedere a WhatsApp');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp client connesso e pronto');
  });

  client.on('authenticated', () => {
    console.log('🔑 Autenticazione WhatsApp avvenuta con successo');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Errore autenticazione:', msg);
  });

  client.initialize();
}

module.exports = { startWhatsApp };
