const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const mjml = require('mjml');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const csv = require('csv-parser');
const { initializeWhatsapp } = require('./whatsapp');

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const dbPath = path.join(__dirname, '../database/soci.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Errore apertura database:', err.message);
    } else {
        console.log('✅ Database SQLite collegato.');
    }
});

const storage = multer({ dest: 'csv/' });

app.post('/upload', storage.single('csv'), (req, res) => {
    const filePath = req.file.path;
    const soci = [];
    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            soci.push(row);
        })
        .on('end', () => {
            const insert = db.prepare('INSERT INTO soci (nome, email, telefono) VALUES (?, ?, ?)');
            soci.forEach(socio => {
                insert.run(socio.nome, socio.email, socio.telefono);
            });
            insert.finalize();
            res.send('✅ CSV importato con successo.');
        });
});

app.post('/send-email', (req, res) => {
    const { subject, html } = req.body;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    db.all('SELECT email FROM soci', [], (err, rows) => {
        if (err) return res.status(500).send('Errore query soci');

        rows.forEach(row => {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: row.email,
                subject,
                html: mjml(html).html
            };
            transporter.sendMail(mailOptions);
        });

        res.send('📧 Email inviate');
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server avviato su http://localhost:${PORT}`);
    initializeWhatsapp();
});
