#!/bin/bash
echo "🔧 Inizio installazione guidata comunicazioni-soci..."

# Clonazione repository se non presente
if [ ! -d "comunicazioni-soci" ]; then
  echo "📦 Clonazione del repository da GitHub..."
  git clone https://github.com/prcant83/comunicazioni-soci.git
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

# Crea file .env se assente
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

# Crea cartelle necessarie
mkdir -p database
mkdir -p allegati/email
mkdir -p allegati/whatsapp

# ⚙️ Aggiorna struttura tabella soci rimuovendo "cognome"
echo "📐 Aggiorno struttura tabella soci..."
sqlite3 ./database/soci.sqlite <<EOF
PRAGMA foreign_keys=off;

-- Crea nuova tabella senza la colonna cognome
CREATE TABLE IF NOT EXISTS soci_nuova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  telefono TEXT,
  email TEXT,
  rubrica TEXT
);

-- Copia dati esistenti
INSERT INTO soci_nuova (id, nome, telefono, email, rubrica)
SELECT id, nome, telefono, email, rubrica FROM soci;

-- Sostituisci tabella vecchia
DROP TABLE soci;
ALTER TABLE soci_nuova RENAME TO soci;

PRAGMA foreign_keys=on;
EOF

# 🗃️ Ricrea tabella log_invio (se non esiste)
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

echo "✅ Setup completato! Avvia con: npm start"
