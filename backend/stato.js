async function aggiornaStato() {
  const qr = document.getElementById('qr');
  const segnale = document.getElementById('segnale');
  const tacche = document.getElementById('taccheSegnale');
  const sim = document.getElementById('moduloSIM');
  const log = document.getElementById('log');

  try {
    // QR WhatsApp
    const qrRes = await fetch('/api/stato/whatsapp-qr');
    const qrJson = await qrRes.json();
    if (qrJson.pronto) {
      qr.innerHTML = '<p style="color:green;">✅ WhatsApp connesso</p>';
    } else if (qrJson.qrCode) {
      qr.innerHTML = `<img src="data:image/png;base64,${qrJson.qrCode}" alt="QR Code WhatsApp" style="max-width:300px;">`;
    } else {
      qr.innerHTML = `<p style="color:red;">❌ WhatsApp non connesso</p>`;
    }

    // Segnale GSM
    const segnaleRes = await fetch('/api/stato/gsm-signal');
    const segnaleJson = await segnaleRes.json();
    const risposta = segnaleJson.risposta || '';

    segnale.textContent = risposta;

    // Tacche segnale (semplificate)
    const match = risposta.match(/Signal strength\s*:\s*(\d+)\s*/i);
    const livello = match ? parseInt(match[1]) : -1;
    let nTacche = 0;

    if (livello >= 20) nTacche = 5;
    else if (livello >= 15) nTacche = 4;
    else if (livello >= 10) nTacche = 3;
    else if (livello >= 5) nTacche = 2;
    else if (livello >= 1) nTacche = 1;

    tacche.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const div = document.createElement('div');
      div.classList.add('tacca');
      if (i <= nTacche) div.classList.add('attiva');
      tacche.appendChild(div);
    }

    // SIM collegata
    sim.textContent = risposta.includes('/dev/ttyUSB') ? '📟 SIM800C rilevato' : '❌ Nessun dispositivo USB trovato';

    // Log ultimi 10
    const logRes = await fetch('/api/log?limit=10');
    const logs = await logRes.json();
    log.innerHTML = logs.length
      ? logs.map(e => `<li>[${e.data}] <b>${e.tipo.toUpperCase()}</b>: ${e.destinatario} → ${e.messaggio}</li>`).join('')
      : '<li>Nessun log recente.</li>';

  } catch (err) {
    qr.innerHTML = '<p style="color:red;">Errore QR.</p>';
    segnale.textContent = 'Errore GSM.';
    sim.textContent = 'Errore lettura modulo.';
    tacche.innerHTML = '';
    log.innerHTML = '<li>Errore caricamento log.</li>';
  }
}

function riavviaSistema() {
  if (confirm('Sei sicuro di voler riavviare il Raspberry?')) {
    fetch('/api/riavvia', { method: 'POST' })
      .then(res => res.text())
      .then(alert)
      .catch(err => alert('Errore: ' + err));
  }
}

function aggiornaSistema() {
  if (confirm('Vuoi procedere con l\'intero setup (aggiornamento completo)?')) {
    fetch('/api/aggiorna', { method: 'POST' })
      .then(res => res.text())
      .then(alert)
      .catch(err => alert('Errore: ' + err));
  }
}

function resettaWhatsApp() {
  if (confirm('Vuoi scollegare WhatsApp e resettare la sessione? (richiederà una nuova scansione QR)')) {
    fetch('/api/whatsapp-reset', { method: 'POST' })
      .then(res => res.text())
      .then(alert)
      .catch(err => alert('Errore: ' + err));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  aggiornaStato();
  setInterval(aggiornaStato, 10000);
});
