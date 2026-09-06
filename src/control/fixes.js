// Compatibility layer for the upgraded presentation state.
const blackButton = document.getElementById('blackBtn');
const ndiButton = document.getElementById('ndiBtn');

if (blackButton) {
  blackButton.addEventListener('click', () => window.scriptureAPI.blackLive());
}

if (ndiButton) {
  (async () => {
    try {
      const status = await window.scriptureAPI.ndiStatus();
      ndiButton.textContent = status.available ? (status.running ? 'NDI: On' : 'NDI: Off') : 'NDI: Install';
      if (status.running) ndiButton.classList.add('btn-ndi-on');
    } catch (_) { ndiButton.textContent = 'NDI: Off'; }
  })();
  ndiButton.addEventListener('click', async () => {
    try {
      const status = await window.scriptureAPI.ndiStatus();
      if (!status.available) {
        alert('NDI is not installed. Install the NDI Runtime and run npm install grandiose.');
        return;
      }
      if (status.running) {
        await window.scriptureAPI.ndiStop();
        ndiButton.textContent = 'NDI: Off';
        ndiButton.classList.remove('btn-ndi-on');
      } else {
        const next = await window.scriptureAPI.ndiStart();
        if (next.running) {
          ndiButton.textContent = 'NDI: On';
          ndiButton.classList.add('btn-ndi-on');
        } else if (next.error) alert(next.error);
      }
    } catch (e) { alert(e.message); }
  });
}
