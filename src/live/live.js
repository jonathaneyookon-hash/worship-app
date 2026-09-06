const stage = document.getElementById('stage');
const verseText = document.getElementById('verseText');
const verseRef = document.getElementById('verseRef');

function renderDisplay(snapshot) {
  if (!snapshot) return;
  if (snapshot.output === 'black') {
    stage.classList.add('blackout');
    return;
  }
  stage.classList.remove('blackout');
  if (snapshot.output === 'clear' || !snapshot.live) {
    verseText.classList.remove('visible');
    verseRef.classList.remove('visible');
    verseText.textContent = '';
    verseRef.textContent = '';
    return;
  }
  const payload = snapshot.live;
  verseText.textContent = payload.text || '';
  verseRef.textContent = `${payload.reference || ''}  (${String(payload.version || '').toUpperCase()})`;
  verseText.classList.add('visible');
  verseRef.classList.add('visible');
}

window.scriptureAPI.onLiveDisplay(renderDisplay);
window.scriptureAPI.onLiveUpdate((payload) => {
  renderDisplay({ output: 'live', live: payload });
});
window.scriptureAPI.onLiveClear(() => renderDisplay({ output: 'clear', live: null }));

window.scriptureAPI.onLiveTheme((theme) => {
  if (!theme) return;
  if (theme.type === 'image' && theme.url) {
    stage.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url("${theme.url}")`;
    stage.style.backgroundSize = 'cover';
    stage.style.backgroundPosition = 'center';
    stage.style.backgroundColor = '#000';
  } else if (theme.background) {
    stage.style.backgroundImage = 'none';
    stage.style.background = theme.background;
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.close();
});
