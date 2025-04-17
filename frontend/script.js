document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await fetch('/upload', {
        method: 'POST',
        body: formData
    });
    alert('CSV caricato');
});

document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        subject: formData.get('subject'),
        html: formData.get('html')
    };
    await fetch('/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    alert('Email inviate');
});
