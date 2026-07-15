const stage = document.getElementById('stage');
const verseText = document.getElementById('verseText');
const verseRef = document.getElementById('verseRef');

window.scriptureAPI.onLiveUpdate((payload) => {
  verseText.textContent = payload.text;
  verseRef.textContent = `${payload.reference}  (${payload.version.toUpperCase()})`;
  verseText.classList.add('visible');
  verseRef.classList.add('visible');
});

window.scriptureAPI.onLiveClear(() => {
  verseText.classList.remove('visible');
  verseRef.classList.remove('visible');
  setTimeout(() => {
    verseText.textContent = '';
    verseRef.textContent = '';
  }, 400);
});

window.scriptureAPI.onLiveTheme((theme) => {
  if (theme.type === 'image' && theme.url) {
    stage.style.backgroundImage =
      `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url("${theme.url}")`;
    stage.style.backgroundSize = 'cover';
    stage.style.backgroundPosition = 'center';
    stage.style.backgroundColor = '#000';
  } else if (theme.background) {
    // type: 'color' (or legacy payloads that only sent { background })
    stage.style.backgroundImage = 'none';
    stage.style.background = theme.background;
  }
});

// Esc closes the live window (handy when it's on the same monitor while testing)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.close();
});
