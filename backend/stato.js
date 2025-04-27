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

    // Segnale GSM (aggiornato)
    const gsmRes = await fetch('/api/stato/gsm-signal');
    const gsmJson = await gsmRes.json();

    if (gsmJson.percentuale !== undefined) {
      segnale.textContent = gsmJson.risposta;

      tacche.innerHTML = '';
      let numTacche = 0;
      if (gsmJson.percentuale > 80) numTacche = 5;
      else if (gsmJson.percentuale > 60) numTacche = 4;
      else if (gsmJson.percentuale > 40) numTacche = 3;
      else if (gsmJson.percentuale > 20) numTacche = 2;
      else if (gsmJson.percentuale > 0) numTacche = 1;

      for (let i = 1; i <= 5; i++) {
        const barra = document.createElement('div');
        barra.className = 'tacca';
        barra.style.display = 'inline-block';
        barra.style.width = '15px';
        barra.style.height = `${i * 5 + 10}px`;
        barra.style.margin = '0 2px';
        barra.style.backgroundColor = (i <= numTacche) ? '#25D366' : '#ddd';
        barra.style.borderRadius = '2px';
        tacche.appendChild(barra);
      }

      sim.textContent = '📟 SIM800C rilevato';

    } else {
      segnale.textContent = 'Errore lettura segnale GSM';
      tacche.innerHTML = '';
      sim.textContent = '❌ SIM800C non rilevato';
    }

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

// Avvia l'aggiornamento periodico dello stato

document.addEventListener('DOMContentLoaded', () => {
  aggiornaStato();
  setInterval(aggiornaStato, 10000); // aggiornamento ogni 10 secondi
});
