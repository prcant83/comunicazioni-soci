// backend/log_fe.js

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
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${log.id}</td>
      <td>${log.data}</td>
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
  const giorni = await res.json();

  const calendario = document.getElementById('calendar');
  calendario.innerHTML = '';

  const oggi = new Date();
  const meseCorrente = oggi.toISOString().slice(0, 7); // es. '2025-04'

  for (let giorno = 1; giorno <= 31; giorno++) {
    const giornoCompleto = `${meseCorrente}-${giorno.toString().padStart(2, '0')}`;
    const cella = document.createElement('div');
    cella.className = 'calendar-cell';
    cella.textContent = giorno;

    if (giorni.includes(giornoCompleto)) {
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

