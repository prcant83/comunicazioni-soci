#!/bin/bash
echo "🔧 Inizio installazione guidata comunicazioni-soci..."

# Clonazione repository se non presente
if [ ! -d "comunicazioni-soci" ]; then
  echo "📦 Clonazione del repository da GitHub..."
  git clone https://github.com/prcant83/comunicazioni-soci.git
fi

cd comunicazioni-soci

# Aggiornamento pacchetti
sudo apt update
sudo apt upgrade -y

# Verifica installazione Node.js
if ! command -v node &> /dev/null; then
  echo "⚙️  Installazione Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "✅ Node.js già installato"
fi

# Altri pacchetti necessari
sudo apt install -y sqlite3 gammu gammu-smsd chromium

# Installazione dipendenze Node.js
npm install

# Creazione file .env base
if [ ! -f ".env" ]; then
cat <<EOL > .env
SMTP_HOST=pro.eu.turbo-smtp.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=utente@example.it
SMTP_PASS=password
FROM_EMAIL=noreply@orsognacantina.it
EOL
echo "🛠️  File .env creato (modificare con le proprie credenziali SMTP)"
fi

# Creazione database e tabella soci
mkdir -p database
sqlite3 ./database/soci.sqlite <<EOF
CREATE TABLE IF NOT EXISTS soci (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  cognome TEXT,
  telefono TEXT,
  email TEXT,
  rubrica TEXT
);
EOF
echo "🗃️  Creo database e tabella soci..."

# Creazione tabella log_invio per log degli invii
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
echo "✅ Tabella log_invio creata (se non esiste)"

echo "✅ Setup completato. Avvia l'app con: npm start"
