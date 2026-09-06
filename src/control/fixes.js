// Compatibility layer for the upgraded presentation state.
const blackButton = document.getElementById('blackBtn');
if (blackButton) blackButton.addEventListener('click', () => window.scriptureAPI.blackLive());

// The selected translation is global: changing it re-resolves the current
// preview/live scripture and every scheduled scripture on the desktop too.
const translationSelect = document.getElementById('versionSelect');
if (translationSelect && window.scriptureAPI.setVersion) {
  translationSelect.addEventListener('change', () => window.scriptureAPI.setVersion(translationSelect.value));
  window.scriptureAPI.getState().then(snapshot => {
    if (snapshot && snapshot.selectedVersion) translationSelect.value = snapshot.selectedVersion;
  }).catch(() => {});
}
