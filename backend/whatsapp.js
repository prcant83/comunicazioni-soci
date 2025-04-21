const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Avvia il client
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

// Invia messaggio WhatsApp, con o senza allegato
async function sendWhatsApp(to, messaggio, allegatoPath = null) {
  if (!client || !client.info || !client.info.wid) {
    throw new Error('Client WhatsApp non pronto.');
  }

  const numero = to.replace(/\D/g, '') + '@c.us';

  if (allegatoPath && fs.existsSync(allegatoPath)) {
    const fileBuffer = fs.readFileSync(allegatoPath);
    const mimeType = getMimeType(allegatoPath);
    const base64 = fileBuffer.toString('base64');
    const media = new MessageMedia(mimeType, base64, path.basename(allegatoPath));
    await client.sendMessage(numero, media, { caption: messaggio });
  } else {
    await client.sendMessage(numero, messaggio);
  }

  console.log(`📨 Messaggio WhatsApp inviato a ${to}`);
}

// Funzione per dedurre il tipo MIME
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

module.exports = { startWhatsApp, sendWhatsApp };
