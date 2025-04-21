📬 Comunicazioni Soci

Applicazione Node.js auto-ospitata per l'invio di Email, WhatsApp e (prossimamente) SMS a contatti organizzati in rubriche, con allegati, log dettagliati e interfaccia web responsive.

---

🚀 Funzionalità attuali

✅ Invio email con o senza allegati  
✅ Invio WhatsApp con o senza allegati  
✅ Importazione contatti da file CSV  
✅ Gestione rubriche (creazione, modifica, eliminazione contatti)  
✅ Log di tutti gli invii con anteprima allegati  
✅ Interfaccia frontend responsive e intuitiva  
✅ Sistema auto-ospitato su Raspberry Pi o server personale  
🔒 Nessun servizio esterno obbligatorio  
📄 Supporto a PDF, immagini e file generici come allegati  

---

📁 Struttura del progetto

comunicazioni-soci/
├── server.js                 # Server principale Express
├── email.js                  # Invio email e gestione allegati
├── whatsapp.js               # Invio WhatsApp via whatsapp-web.js
├── utils/
│   └── log.js                # Gestione dei log su SQLite
├── database/
│   └── soci.sqlite           # DB rubriche e log invii
├── allegati/
│   ├── email/                # Allegati salvati da invii email
│   └── whatsapp/             # Allegati WhatsApp
├── tmp/                      # Cartella temporanea upload
├── frontend/
│   ├── index.html            # Homepage con pulsanti
│   ├── email.html            # Form invio email
│   ├── whatsapp.html         # Form invio WhatsApp
│   ├── rubrica.html          # Gestione rubriche e contatti
│   └── log.html              # Visualizzazione log
├── .env                      # Configurazione SMTP
├── setup.sh                  # Script installazione e setup
└── README.md                 # Documentazione

---

⚙️ Configurazione ambiente

Crea un file `.env` nella root con le seguenti variabili:

SMTP_HOST=smtp.tuodominio.it  
SMTP_PORT=587  
SMTP_SECURE=false  
SMTP_USER=tuoutente@tuodominio.it  
SMTP_PASS=tuapassword  

---

🛠 Installazione

git clone https://github.com/prcant83/comunicazioni-soci.git  
cd comunicazioni-soci  
chmod +x setup.sh  
./setup.sh

---

▶️ Avvio del server

node server.js

Apri il browser su:

http://localhost:3000/frontend/index.html

---

✉️ Invio Email

- Seleziona singolo destinatario o rubrica
- Carica PDF, immagini o altri file
- Il file sarà salvato in `allegati/email/` e loggato

---

💬 Invio WhatsApp

- Il sistema usa whatsapp-web.js
- All'avvio si apre un QR da scansionare
- Supporta allegati (immagini e PDF)

---

📚 Rubriche

- Crea rubriche manualmente o importa file CSV
- Ogni contatto ha nome, email, telefono, rubrica
- Puoi modificare o eliminare i singoli contatti

---

📜 Log degli invii

- Pagina `log.html` con filtro per tipo (email, WhatsApp, SMS)
- Visualizzazione allegati con anteprima immagini e link scaricabili

---

🔜 Prossime funzionalità

- ✅ Invio SMS via chiavetta LTE (ZTE + gammu)
- 🔄 Notifiche di esito invio
- 🖨️ Esportazione dei log in CSV/PDF
- 🛡️ Autenticazione utente (basic login)

---

💻 Requisiti

- Node.js v18+
- Raspberry Pi 4 / PC con Linux o Windows
- Connessione a Internet per email / WhatsApp
- Browser web moderno

---

👨‍💻 Autore

Riccardo Cantelmi  
pRcant.NET – Soluzioni IT Avanzate  
https://www.prcant.net

📬 Email: riccardocantelmi@gmail.com  
📍 Atessa (CH), Abruzzo

---

🔐 Note sulla Privacy

Tutti i dati restano in locale. Nessuna informazione viene inviata a servizi esterni non dichiarati.

---

❤️ Licenza

Questo progetto è distribuito con licenza MIT.  
Se ti è utile, sentiti libero di migliorarlo, estenderlo o condividerlo.# Comunicazioni Soci
Applicazione web per invio comunicazioni via WhatsApp, Email, SMS.
