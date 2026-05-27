/* Field Survey Tracker app.js */
// ===== APP INIT / VERSION =====
(function initVersionBadge(){
  try {
    const badge = document.createElement('div');
    badge.id = 'app-version-badge';
    badge.textContent = APP_VERSION;
    badge.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9999;background:rgba(0,0,0,.55);color:#fff;padding:4px 8px;border-radius:999px;font-size:11px;pointer-events:none;';
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(badge));
  } catch (_) {}
})();
