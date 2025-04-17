// backend/rubriche.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/soci.sqlite');

function getRubriche(callback) {
  db.all("SELECT DISTINCT rubrica FROM soci", [], (err, rows) => {
    if (err) return callback(err);
    const rubriche = rows.map(r => r.rubrica);
    callback(null, rubriche);
  });
}

function getContattiRubrica(nome, callback) {
  db.all("SELECT * FROM soci WHERE rubrica = ?", [nome], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

module.exports = { getRubriche, getContattiRubrica };
