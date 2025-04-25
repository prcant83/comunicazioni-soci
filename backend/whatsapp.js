const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

let statoWhatsApp = {
  pronto: false,
  qr: null,
  errore: null
};

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
    statoWhatsApp.qr = qr;
    statoWhatsApp.pronto = false;
    statoWhatsApp.errore = null;
    console.log('🔐 Scansiona il QR Code per accedere a WhatsApp');
    qrcode.generate(qr, { small: true });

    // Salva QR come immagine
    const QRCode = require('qrcode');
    QRCode.toFile(path.join(__dirname, '../session/Default/qrcode.png'), qr);
  });

  client.on('ready', () => {
    statoWhatsApp.pronto = true;
    statoWhatsApp.qr = null;
    statoWhatsApp.errore = null;
    console.log('✅ WhatsApp client connesso e pronto');
  });

  client.on('authenticated', () => {
    console.log('🔑 Autenticazione WhatsApp avvenuta con successo');
  });

  client.on('auth_failure', (msg) => {
    statoWhatsApp.pronto = false;
    statoWhatsApp.qr = null;
    statoWhatsApp.errore = 'Autenticazione fallita';
    console.error('❌ Errore autenticazione:', msg);
  });

  client.on('disconnected', (reason) => {
    statoWhatsApp.pronto = false;
    statoWhatsApp.errore = 'Disconnesso: ' + reason;
    console.warn('⚠️ WhatsApp disconnesso:', reason);
  });

  client.initialize();
}

async function sendWhatsApp(to, messaggio, allegatoPath = null) {
  if (!statoWhatsApp.pronto) {
    throw new Error('Client WhatsApp non pronto.');
  }

  const numero = to.startsWith('+')
    ? to.replace(/\D/g, '') + '@c.us'
    : '39' + to.replace(/\D/g, '') + '@c.us';

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

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

module.exports = {
  startWhatsApp,
  sendWhatsApp,
  statoWhatsApp
};
