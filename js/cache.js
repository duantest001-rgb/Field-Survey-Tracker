/* Field Survey Tracker cache.js */
// ===== OFFLINE =====
window.addEventListener('online', () => { document.getElementById('offline-badge').classList.remove('show'); loadAll(); });
window.addEventListener('offline', () => { document.getElementById('offline-badge').classList.add('show'); loadFromCache(); });

function safeJSONParse(raw, fallback) {
  try { return JSON.parse(raw || ''); } catch(e) { return fallback; }
}
function cacheKey(key) { return 'cache_' + key; }
function backupKey(key) { return 'backup_' + key + '_' + new Date().toISOString().replace(/[:.]/g,'-'); }
function saveToCache(key, data, options = {}) {
  try {
    const oldRaw = localStorage.getItem(cacheKey(key));
    const oldData = safeJSONParse(oldRaw, []);
    // Prevent overwriting existing cache with accidental empty server response.
    if (!options.force && Array.isArray(oldData) && oldData.length > 0 && Array.isArray(data) && data.length === 0) {
      localStorage.setItem(backupKey(key), JSON.stringify(oldData));
      console.warn(`[cache] skipped empty overwrite for ${key}; old cache preserved`);
      return false;
    }
    if (oldRaw) localStorage.setItem(backupKey(key), oldRaw);
    localStorage.setItem(cacheKey(key), JSON.stringify(data || []));
    localStorage.setItem(cacheKey(key) + '_updated_at', new Date().toISOString());
    return true;
  } catch(e) { console.warn('[saveToCache]', e); return false; }
}
function getCachedData() {
  return {
    partner: safeJSONParse(localStorage.getItem('cache_partner'), []),
    customer: safeJSONParse(localStorage.getItem('cache_customer'), []),
    updated_at: localStorage.getItem('cache_partner_updated_at') || localStorage.getItem('cache_customer_updated_at') || null
  };
}
function loadFromCache(manual = false) {
  const cached = getCachedData();
  allData.partner = cached.partner; allData.customer = cached.customer;
  renderMarkers(); renderList(); renderDash(); updateRecoveryInfo();
  if (cached.partner.length || cached.customer.length) showToast(manual ? '📦 ໂຫຼດຂໍ້ມູນຈາກ local cache ແລ້ວ' : '📵 ໃຊ້ຂໍ້ມູນ offline', 'info', 4000);
  else showToast('⚠️ ບໍ່ພົບ local cache', 'error', 4000);
}
function updateRecoveryInfo() {
  const el = document.getElementById('recovery-info');
  if (!el) return;
  const cached = getCachedData();
  el.textContent = `Remote: Partner ${lastRemoteCounts.partner}, Customer ${lastRemoteCounts.customer} | Cache: Partner ${cached.partner.length}, Customer ${cached.customer.length}`;
}
