/* Field Survey Tracker ui.js */
// ===== TOAST =====
function showToast(msg, type='success', duration=3000) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, duration);
}
