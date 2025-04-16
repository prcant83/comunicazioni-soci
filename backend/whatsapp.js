const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('🔐 Scansiona il QR Code per accedere a WhatsApp');
});

client.on('ready', () => {
  console.log('✅ WhatsApp client connesso e pronto');
});

client.initialize();

async function sendMessage(numero, messaggio, filePath = null) {
  const chatId = numero + '@c.us';
  if (filePath) {
    const media = MessageMedia.fromFilePath(path.resolve(filePath));
    await client.sendMessage(chatId, media, { caption: messaggio });
  } else {
    await client.sendMessage(chatId, messaggio);
  }
  return 'Messaggio inviato con successo';
}

module.exports = { sendMessage };