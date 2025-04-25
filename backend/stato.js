// backend/stato.js

async function aggiornaStato() {
  const qr = document.getElementById('qr');
  const segnale = document.getElementById('segnale');
  const modem = document.getElementById('modem');
  const log = document.getElementById('log');

  try {
    // WhatsApp
    const qrRes = await fetch('/api/stato/whatsapp-qr');
    const qrJson = await qrRes.json();
    qr.innerHTML = qrJson.qrCode
      ? `<img src="data:image/png;base64,${qrJson.qrCode}" alt="QR Code WhatsApp" style="max-width:300px;">`
      : qrJson.pronto
        ? '<span style="color:green;">✅ WhatsApp connesso</span>'
        : `<span style="color:red;">❌ Errore: ${qrJson.errore || 'Stato non disponibile'}</span>`;

    // GSM Info
    const modemRes = await fetch('/api/stato/gsm-modem');
    const modemJson = await modemRes.json();
    modem.textContent = modemJson.risposta || '❌ Nessuna info dal modem.';

    // Segnale GSM
    const segnaleRes = await fetch('/api/stato/gsm-signal');
    const segnaleJson = await segnaleRes.json();
    if (segnaleJson.percentuale !== null) {
      const tacche = Math.round(segnaleJson.percentuale / 20);
      const icone = '📶'.repeat(tacche) + '▫️'.repeat(5 - tacche);
      segnale.innerHTML = `${icone} ${segnaleJson.percentuale}%`;
    } else {
      segnale.innerHTML = '❌ Nessun segnale GSM';
    }

    // Log ultimi 10
    const logRes = await fetch('/api/log?limit=10');
    const logs = await logRes.json();
    log.innerHTML = logs.length
      ? logs.map(e => `<li style="color:${e.messaggio.startsWith('ERRORE') ? 'red' : 'black'}">[${e.data}] <b>${e.tipo.toUpperCase()}</b>: ${e.destinatario} → ${e.messaggio}</li>`).join('')
      : '<li>Nessun log recente.</li>';

  } catch (err) {
    qr.innerHTML = '<p style="color:red;">Errore QR</p>';
    modem.textContent = 'Errore modem.';
    segnale.textContent = 'Errore segnale.';
    log.innerHTML = '<li>Errore log.</li>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  aggiornaStato();
  setInterval(aggiornaStato, 10000);
});
