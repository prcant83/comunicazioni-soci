const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { createLogger, format, transports } = require('winston');

// === Setup directory per i log su file ===
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// === Logger con Winston ===
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(logDir, 'combined.log') }),
    new transports.Console()
  ]
});

// === Database SQLite ===
const db = new sqlite3.Database('./database/soci.sqlite', (err) => {
  if (err) logger.error('❌ Errore apertura DB soci.sqlite: ' + err.message);
  else logger.info('📚 Database soci.sqlite pronto per il logging');
});

// === Funzione principale ===
function salvaLogInvio(tipo, destinatario, messaggio, rubrica = null, allegato = '') {
  const data = new Date().toISOString();

  // Log su file
  logger.info(`[${tipo}] ${destinatario} | ${rubrica || '-'} | ${messaggio} | ${allegato || '-'}`);

  // Log su database
  db.run(
    "INSERT INTO log_invio (data, tipo, destinatario, rubrica, messaggio, allegato) VALUES (?, ?, ?, ?, ?, ?)",
    [data, tipo, destinatario, rubrica, messaggio, allegato],
    (err) => {
      if (err) logger.error(`❌ Errore inserimento log DB: ${err.message}`);
    }
  );
}

module.exports = { salvaLogInvio, logger };
