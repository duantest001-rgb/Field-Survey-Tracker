/* Field Survey Tracker listView.js */
// ===== LIST VIEW =====
function renderList() {
  const container = document.getElementById('list-items');
  document.getElementById('list-loading').style.display = 'none';
  const q = document.getElementById('search-input')?.value.toLowerCase() || '';
  const fs = document.getElementById('filter-status')?.value || '';
  let data = allData[currentTab];
  if (q) data = data.filter(r => (r.name||'').toLowerCase().includes(q) || (r.phone||'').includes(q) || (r.business_type||r.customer_type||'').toLowerCase().includes(q));
  if (fs) data = data.filter(r => r.status === fs);
  if (!data.length) { container.innerHTML = '<div class="loading">ຍັງບໍ່ມີຂໍ້ມູນ<br>ກົດ + ເພື່ອເພີ່ມ</div>'; return; }

  function hl(text) {
    const safe = escapeHTML(text || '');
    if (!q || !safe) return safe;
    return safe.replace(new RegExp(`(${escapeRegExp(q)})`, 'gi'), '<mark class="highlight">$1</mark>');
  }
  const canEdit = (rec) => canEditRecord(rec);

  container.innerHTML = data.map(rec => {
    const typeFld = currentTab === 'partner' ? rec.business_type : rec.customer_type;
    const extra = currentTab === 'customer' && rec.budget ? `💰 ${escapeHTML(rec.budget)}` : '';
    const safeId = escapeAttr(rec.id);
    const safeStatus = isValidStatus(currentTab, rec.status) ? rec.status : STATUS_CONFIG[currentTab][0].val;
    const photoUrl = String(rec.photo_url || '');
    const photoHtml = photoUrl.startsWith('http') ? `<img src="${escapeAttr(photoUrl)}" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-top:8px;" onerror="this.style.display='none'"/>` : '';
    return `<div class="record-card">
      <div class="record-card-header">
        <div style="flex:1;min-width:0;">
          <div class="record-name">${hl(rec.name)}</div>
          <div class="record-info">📞 ${hl(rec.phone||'-')}</div>
          ${typeFld ? `<div class="record-info">🏪 ${hl(typeFld)}</div>` : ''}
          ${extra ? `<div class="record-info">${extra}</div>` : ''}
          ${rec.location_name ? `<div class="record-info">📍 ${escapeHTML(rec.location_name)}</div>` : ''}
          <div class="record-info" style="color:var(--text3);font-size:0.75rem;">📅 ${escapeHTML(rec.created_at?.slice(0,10)||'')}</div>
        </div>
        <span class="status-badge status-${safeStatus}">${escapeHTML(STATUS_LABELS[safeStatus]||safeStatus)}</span>
      </div>
      ${rec.notes ? `<div class="record-info" style="font-style:italic;">💬 ${escapeHTML(rec.notes)}</div>` : ''}
      ${photoHtml}
      <div class="record-actions">
        ${canEdit(rec) ? `<button class="btn-sm primary" onclick="openEditModal('${safeId}')">✏️ ແກ້ໄຂ</button>` : ''}
        ${rec.phone ? `<a class="btn-sm" href="tel:${escapeAttr(rec.phone)}" style="text-decoration:none">📞 ໂທ</a>` : ''}
        ${rec.lat ? `<button class="btn-sm" onclick="flyTo(${Number(rec.lat)},${Number(rec.lng)})">🗺️ ແຜນທີ່</button>` : ''}
        ${rec.lat ? `<a class="btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${Number(rec.lat)},${Number(rec.lng)}" style="text-decoration:none">🌐 Google Maps</a>` : ''}
        ${canDeleteRecord(rec) ? `<button class="btn-sm danger" onclick="deleteRecord('${safeId}','${currentTab}')">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function flyTo(lat, lng) {
  switchView('map');
  setTimeout(() => { leafletMap.setView([lat, lng], 17); }, 100);
}
