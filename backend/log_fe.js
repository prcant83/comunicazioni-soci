// backend/log_fe.js

let meseCorrente = new Date().getMonth(); // 0-11
let annoCorrente = new Date().getFullYear();

async function caricaLog(filtri = {}) {
  const params = new URLSearchParams(filtri);
  const res = await fetch('/api/log?' + params.toString());
  const dati = await res.json();

  const tbody = document.getElementById('logTableBody');
  tbody.innerHTML = '';

  if (!dati.length) {
    document.getElementById('noLogsMessage').style.display = 'block';
  } else {
    document.getElementById('noLogsMessage').style.display = 'none';
  }

  dati.forEach(log => {
    const dataFormattata = new Date(log.data).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${log.id}</td>
      <td>${dataFormattata}</td>
      <td>${log.tipo}</td>
      <td>${log.destinatario}</td>
      <td>${log.rubrica || ''}</td>
      <td>${log.messaggio}</td>
      <td>${log.allegato ? `<a href='/${log.allegato}' target='_blank'>📎</a>` : ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function aggiornaCalendario() {
  const res = await fetch('/api/log/days');
  const giorniLog = await res.json(); // array tipo ["2025-04-27", ...]

  const calendario = document.getElementById('calendar');
  calendario.innerHTML = '';

  const intestazione = document.createElement('div');
  intestazione.className = 'calendar-header';
  intestazione.innerHTML = `
    <button onclick="cambiaMese(-1)"><<</button>
    <span>${new Date(annoCorrente, meseCorrente).toLocaleString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
    <button onclick="cambiaMese(1)">>></button>
  `;
  calendario.appendChild(intestazione);

  const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  giorniSettimana.forEach(g => {
    const div = document.createElement('div');
    div.textContent = g;
    div.className = 'calendar-cell';
    calendario.appendChild(div);
  });

  const primoGiornoMese = new Date(annoCorrente, meseCorrente, 1);
  const giornoSettimana = (primoGiornoMese.getDay() + 6) % 7; // Lunedì = 0
  const giorniNelMese = new Date(annoCorrente, meseCorrente + 1, 0).getDate();

  for (let i = 0; i < giornoSettimana; i++) {
    const div = document.createElement('div');
    div.className = 'calendar-cell empty';
    calendario.appendChild(div);
  }

  for (let giorno = 1; giorno <= giorniNelMese; giorno++) {
    const giornoCompleto = `${annoCorrente}-${(meseCorrente + 1).toString().padStart(2, '0')}-${giorno.toString().padStart(2, '0')}`;
    const cella = document.createElement('div');
    cella.className = 'calendar-cell';
    cella.textContent = giorno;

    if (giorniLog.includes(giornoCompleto)) {
      cella.classList.add('has-log');
    }

    cella.onclick = () => {
      document.getElementById('dataInizio').value = giornoCompleto;
      document.getElementById('dataFine').value = giornoCompleto;
      caricaLog({ start: giornoCompleto, end: giornoCompleto });
    };

    calendario.appendChild(cella);
  }
}

function cambiaMese(delta) {
  meseCorrente += delta;
  if (meseCorrente < 0) {
    meseCorrente = 11;
    annoCorrente--;
  }
  if (meseCorrente > 11) {
    meseCorrente = 0;
    annoCorrente++;
  }
  aggiornaCalendario();
}

function filtraLog() {
  const tipo = document.getElementById('filtroTipo').value;
  const start = document.getElementById('dataInizio').value;
  const end = document.getElementById('dataFine').value;

  const filtri = {};
  if (tipo) filtri.tipo = tipo;
  if (start) filtri.start = start;
  if (end) filtri.end = end;

  caricaLog(filtri);
}

function esportaPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text('Log Invii Soci', 14, 20);
  doc.autoTable({
    html: '#logTable',
    startY: 30,
    theme: 'striped',
    styles: { fontSize: 8 }
  });

  doc.save(`log_invii_${new Date().toISOString().slice(0,10)}.pdf`);
}

function esportaCSV() {
  let csv = 'ID,Data,Tipo,Destinatario,Rubrica,Messaggio,Allegato\n';
  const righe = document.querySelectorAll('#logTableBody tr');

  righe.forEach(tr => {
    const celle = tr.querySelectorAll('td');
    const riga = Array.from(celle).map(td => `"${td.innerText}"`).join(',');
    csv += riga + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `log_invii_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
}

window.addEventListener('DOMContentLoaded', async () => {
  const oggi = new Date().toISOString().slice(0, 10);
  await caricaLog({ start: oggi, end: oggi });
  await aggiornaCalendario();
});
