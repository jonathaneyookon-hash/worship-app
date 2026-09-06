// Compatibility layer for the upgraded presentation state.
// The existing controller owns NDI events; this only adds true-black behavior.
const blackButton = document.getElementById('blackBtn');
if (blackButton) blackButton.addEventListener('click', () => window.scriptureAPI.blackLive());
