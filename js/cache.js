/* Field Survey Tracker cache.js */
// ===== OFFLINE / CACHE =====
window.addEventListener('online', () => {
  document.getElementById('offline-badge')?.classList.remove('show');
  if (currentUser && isActiveUser()) scheduleLoadAll('online');
});
window.addEventListener('offline', () => {
  document.getElementById('offline-badge')?.classList.add('show');
  loadFromCache(false);
});

function safeJSONParse(raw, fallback) {
  try { return JSON.parse(raw || ''); } catch(e) { return fallback; }
}
function cacheUserPart() {
  return currentUser?.id || 'anonymous';
}
function cachePrefix() {
  return `fst:${APP_VERSION}:${cacheUserPart()}`;
}
function cacheKey(key) { return `${cachePrefix()}:${key}`; }
function cacheUpdatedKey(key) { return `${cacheKey(key)}:updated_at`; }
function backupKey(key) { return `${cachePrefix()}:backup:${key}:${new Date().toISOString().replace(/[:.]/g,'-')}`; }
function legacyCacheKey(key) { return 'cache_' + key; }

function saveToCache(key, data, options = {}) {
  try {
    const oldRaw = localStorage.getItem(cacheKey(key));
    const oldData = safeJSONParse(oldRaw, []);
    if (!options.force && Array.isArray(oldData) && oldData.length > 0 && Array.isArray(data) && data.length === 0) {
      localStorage.setItem(backupKey(key), JSON.stringify(oldData));
      console.warn(`[cache] skipped empty overwrite for ${key}; old user/version cache preserved`);
      return false;
    }
    if (oldRaw) localStorage.setItem(backupKey(key), oldRaw);
    localStorage.setItem(cacheKey(key), JSON.stringify(data || []));
    localStorage.setItem(cacheUpdatedKey(key), new Date().toISOString());
    return true;
  } catch(e) { console.warn('[saveToCache]', e); return false; }
}

function readCacheForKey(key) {
  const modern = safeJSONParse(localStorage.getItem(cacheKey(key)), []);
  if (modern.length) return modern;
  // One-way fallback for older v5/v6 cache. It is filtered by permission before display.
  return safeJSONParse(localStorage.getItem(legacyCacheKey(key)), []);
}
function getCachedData() {
  return {
    partner: readCacheForKey('partner'),
    customer: readCacheForKey('customer'),
    updated_at: localStorage.getItem(cacheUpdatedKey('partner')) || localStorage.getItem(cacheUpdatedKey('customer')) || localStorage.getItem('cache_partner_updated_at') || localStorage.getItem('cache_customer_updated_at') || null
  };
}
function setDataSource(type, source, message = '') {
  dataSourceState[type] = source;
  dataSourceState.message = message || dataSourceState.message || '';
  updateDataSourceBanner();
}
function updateDataSourceBanner() {
  let el = document.getElementById('data-source-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'data-source-banner';
    el.style.cssText = 'display:none;position:fixed;top:58px;left:10px;right:10px;z-index:9998;background:#fff4cf;border:1px solid #f0c24b;color:#5c4300;padding:8px 12px;border-radius:12px;font-size:.85rem;box-shadow:0 4px 12px rgba(0,0,0,.12);';
    document.body.appendChild(el);
  }
  const usingCache = dataSourceState.partner === 'cache' || dataSourceState.customer === 'cache';
  if (!usingCache) { el.style.display = 'none'; return; }
  el.textContent = dataSourceState.message || 'ກຳລັງໂຊວ໌ Local Cache ບາງສ່ວນ, ບໍ່ແມ່ນ Remote DB ທັງໝົດ';
  el.style.display = 'block';
}
function loadFromCache(manual = false) {
  const cached = getCachedData();
  allData.partner = filterVisibleRecords(cached.partner);
  allData.customer = filterVisibleRecords(cached.customer);
  setDataSource('partner', 'cache', 'ກຳລັງໂຊວ໌ Local Cache — ກວດ Supabase/RLS ຖ້າຂໍ້ມູນ Remote ບໍ່ຂຶ້ນ');
  setDataSource('customer', 'cache');
  renderCurrentViews();
  updateRecoveryInfo();
  if (allData.partner.length || allData.customer.length) showToast(manual ? '📦 ໂຫຼດຂໍ້ມູນຈາກ local cache ແລ້ວ' : '📵 ໃຊ້ຂໍ້ມູນ offline/cache', 'info', 4000);
  else showToast('⚠️ ບໍ່ພົບ local cache ສຳລັບ user/version ນີ້', 'error', 4000);
}
function updateRecoveryInfo() {
  const el = document.getElementById('recovery-info');
  if (!el) return;
  const cached = getCachedData();
  el.textContent = `Remote: Partner ${lastRemoteCounts.partner}, Customer ${lastRemoteCounts.customer} | Cache (${cacheUserPart().slice(0,8)}): Partner ${cached.partner.length}, Customer ${cached.customer.length}`;
}
function clearCurrentUserCache() {
  const prefix = cachePrefix();
  Object.keys(localStorage).forEach(k => { if (k.startsWith(prefix)) localStorage.removeItem(k); });
  showToast('🧹 ລຶບ cache ຂອງ user/version ນີ້ແລ້ວ', 'info', 3000);
}
function renderCurrentViews() {
  renderMarkers();
  renderList();
  if (currentView === 'dash') renderDash();
}
