// backend/stato.js

async function aggiornaStato() {
  const qr = document.getElementById('qr');
  const segnale = document.getElementById('segnale');
  const log = document.getElementById('log');

  try {
    // QR WhatsApp
    const qrRes = await fetch('/api/stato/whatsapp-qr');
    const qrJson = await qrRes.json();
    qr.innerHTML = qrJson.qrCode
      ? `<img src="data:image/png;base64,${qrJson.qrCode}" alt="QR Code WhatsApp" style="max-width:300px;">`
      : '<p>✅ WhatsApp già connesso.</p>';

    // Segnale GSM
    const segnaleRes = await fetch('/api/stato/gsm-signal');
    const segnaleJson = await segnaleRes.json();
    segnale.textContent = segnaleJson.risposta || 'Nessuna risposta';

    // Log ultimi 10
    const logRes = await fetch('/api/log?limit=10');
    const logs = await logRes.json();
    log.innerHTML = logs.length
      ? logs.map(e => `<li>[${e.data}] <b>${e.tipo.toUpperCase()}</b>: ${e.destinatario} → ${e.messaggio}</li>`).join('')
      : '<li>Nessun log recente.</li>';

  } catch (err) {
    qr.innerHTML = '<p style="color:red;">Errore nel caricamento QR.</p>';
    segnale.textContent = 'Errore nel caricamento.';
    log.innerHTML = '<li>Errore caricamento log.</li>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  aggiornaStato();
  setInterval(aggiornaStato, 10000);
});

