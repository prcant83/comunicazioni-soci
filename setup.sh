#!/bin/bash
echo "🔧 Inizio installazione guidata comunicazioni-soci..."

# Clonazione repository o aggiornamento
if [ ! -d "comunicazioni-soci" ]; then
  echo "📦 Clonazione del repository da GitHub..."
  git clone https://github.com/prcant83/comunicazioni-soci.git
else
  echo "🔄 Repository già presente, controllo aggiornamenti da GitHub..."
  cd comunicazioni-soci
  git reset --hard HEAD
  git pull
  cd ..
fi

cd comunicazioni-soci

# Aggiorna pacchetti sistema
echo "🔄 Aggiorno pacchetti del sistema..."
sudo apt update
sudo apt upgrade -y

# Node.js
if ! command -v node &> /dev/null; then
  echo "⚙️  Installazione Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "✅ Node.js già installato"
fi

# Installa pacchetti Linux richiesti
echo "📦 Installazione pacchetti Linux richiesti..."
sudo apt install -y sqlite3 gammu gammu-smsd chromium usb-modeswitch libusb-1.0-0

# Pulizia vecchi moduli Node
echo "🧹 Pulizia node_modules precedenti..."
rm -rf node_modules package-lock.json

# Installa dipendenze Node.js
echo "📦 Installazione moduli Node.js..."
npm install

# File .env
if [ ! -f ".env" ]; then
  echo "🛠️  Creazione file .env con valori di esempio..."
  cat <<EOL > .env
SMTP_HOST=pro.eu.turbo-smtp.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=smtp@orsognacantina.it
SMTP_PASS=173hfyejdhHRHDJE,11
FROM_EMAIL=noreplay@orsognacantina.it
EOL
  chmod 600 .env
  echo "✅ File .env creato e protetto. Modifica manualmente le credenziali SMTP!"
fi

# Cartelle necessarie
echo "🗂️  Creo cartelle necessarie..."
mkdir -p database allegati/email allegati/whatsapp session/Default tmp backend/utils

# File log.js se mancante
if [ ! -f "backend/utils/log.js" ]; then
  echo "🛠️  Creo file backend/utils/log.js..."
  cat <<EOF > backend/utils/log.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/soci.sqlite');

function salvaLogInvio(tipo, destinatario, messaggio, rubrica = null, allegato = '') {
  const data = new Date().toISOString();
  db.run(
    "INSERT INTO log_invio (data, tipo, destinatario, rubrica, messaggio, allegato) VALUES (?, ?, ?, ?, ?, ?)",
    [data, tipo, destinatario, rubrica, messaggio, allegato],
    function (err) {
      if (err) {
        console.error('❌ Errore salvataggio log:', err.message);
      } else {
        console.log('📝 Log invio salvato.');
      }
    }
  );
}

module.exports = { salvaLogInvio };
EOF
fi

# Configura gammu
echo "📱 Configuro gammu per SIM800C (ttyUSB0)..."
sudo tee /etc/gammurc > /dev/null <<EOF
[gammu]
port = /dev/ttyUSB0
connection = at
EOF

# Aggiorna struttura tabella soci
echo "📐 Aggiorno struttura database soci..."
sqlite3 ./database/soci.sqlite <<EOF
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS soci_nuova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  telefono TEXT,
  email TEXT,
  rubrica TEXT,
  data_creazione TEXT DEFAULT (datetime('now')),
  data_modifica TEXT
);

INSERT INTO soci_nuova (id, nome, telefono, email, rubrica, data_creazione)
SELECT id, nome, telefono, email, rubrica, datetime('now') FROM soci;

DROP TABLE soci;
ALTER TABLE soci_nuova RENAME TO soci;

PRAGMA foreign_keys=on;
EOF

# Ricrea tabella log_invio
echo "📚 Creo o aggiorno tabella log_invio..."
sqlite3 ./database/soci.sqlite <<EOF
CREATE TABLE IF NOT EXISTS log_invio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT,
  tipo TEXT,
  destinatario TEXT,
  rubrica TEXT,
  messaggio TEXT,
  allegato TEXT
);
EOF

# Creo servizio systemd
echo "⚙️ Creo servizio systemd per avvio automatico..."
APP_DIR=$(pwd)
cat <<EOF | sudo tee /etc/systemd/system/comunicazioni-soci.service > /dev/null
[Unit]
Description=Comunicazioni Soci
After=network.target

[Service]
ExecStart=/usr/bin/node backend/server.js
WorkingDirectory=$APP_DIR
Restart=always
Environment=NODE_ENV=production
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Abilita servizio all'avvio
echo "🔄 Riavvio servizio systemd..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable comunicazioni-soci.service
sudo systemctl restart comunicazioni-soci.service

echo "✅ Setup completato! Il sistema si avvierà automaticamente ad ogni riavvio."
