const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
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

client.initialize();

module.exports = client;