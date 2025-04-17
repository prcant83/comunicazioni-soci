const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
let client;

function initializeWhatsapp() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { headless: true }
    });

    client.on('qr', qr => {
        console.log('🔐 Scansiona il QR Code per accedere a WhatsApp');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp client connesso e pronto');
    });

    client.on('authenticated', () => {
        console.log('🔑 Autenticazione WhatsApp avvenuta con successo');
    });

    client.on('disconnected', () => {
        console.log('⚠️ Disconnesso da WhatsApp');
    });

    client.initialize();
}

module.exports = { initializeWhatsapp };
