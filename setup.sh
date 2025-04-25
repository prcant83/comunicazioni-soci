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

# Aggiorna pacchetti
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

# Altri pacchetti richiesti
sudo apt install -y sqlite3 gammu gammu-smsd chromium

# Installa dipendenze Node.js
npm install

# Installa modulo QR Code per salvataggio immagini
npm install qrcode


# File .env
if [ ! -f ".env" ]; then
cat <<EOL > .env
SMTP_HOST=pro.eu.turbo-smtp.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=smtp@orsognacantina.it
SMTP_PASS=173hfyejdhHRHDJE,11
FROM_EMAIL=noreplay@orsognacantina.it
EOL
echo "🛠️  File .env creato (modifica le credenziali SMTP)"
fi

# Cartelle necessarie
mkdir -p database allegati/email allegati/whatsapp

# Configura gammu per SIM800C
echo "📱 Configuro gammu per SIM800C (ttyUSB0)..."
sudo tee /etc/gammurc > /dev/null <<EOF
[gammu]
port = /dev/ttyUSB0
connection = at
EOF

# Aggiorna struttura soci
echo "📐 Aggiorno struttura tabella soci..."
sqlite3 ./database/soci.sqlite <<EOF
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS soci_nuova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  telefono TEXT,
  email TEXT,
  rubrica TEXT
);

INSERT INTO soci_nuova (id, nome, telefono, email, rubrica)
SELECT id, nome, telefono, email, rubrica FROM soci;

DROP TABLE soci;
ALTER TABLE soci_nuova RENAME TO soci;

PRAGMA foreign_keys=on;
EOF

# Ricrea tabella log_invio
echo "📚 Creo tabella log_invio..."
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

echo "⚙️ Creo servizio systemd per avvio automatico..."
APP_DIR=$(pwd)
cat <<EOF | sudo tee /etc/systemd/system/comunicazioni-soci.service > /dev/null
[Unit]
Description=Comunicazioni Soci
After=network.target

[Service]
ExecStart=/usr/bin/npm start
WorkingDirectory=$APP_DIR
Restart=always
Environment=NODE_ENV=production
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Abilita servizio all'avvio
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable comunicazioni-soci.service
sudo systemctl restart comunicazioni-soci.service


echo "✅ Setup completato! Il sistema si avvierà automaticamente ad ogni riavvio."
