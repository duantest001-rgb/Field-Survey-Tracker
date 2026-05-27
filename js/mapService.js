/* Field Survey Tracker mapService.js */
// ===== MAP =====
function initMap() {
  leafletMap = L.map('map', { zoomControl: true, preferCanvas: false }).setView([17.97, 102.63], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19
  }).addTo(leafletMap);

  clusterGroup = L.markerClusterGroup({ maxClusterRadius: 50, disableClusteringAtZoom: 17 });
  leafletMap.addLayer(clusterGroup);

  const LocateBtn = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function() {
      const btn = L.DomUtil.create('button', '');
      btn.innerHTML = '📍'; btn.title = 'ຕຳແໜ່ງຂ້ອຍ';
      btn.style.cssText = 'width:34px;height:34px;background:#fff;border:2px solid rgba(0,0,0,0.2);border-radius:4px;cursor:pointer;font-size:16px;margin-top:4px;';
      L.DomEvent.on(btn, 'click', L.DomEvent.stop).on(btn, 'click', locateMe);
      return btn;
    }
  });
  leafletMap.addControl(new LocateBtn());

  leafletMap.on('click', (e) => {
    if (pickingLocation) {
      setModalLocation(e.latlng.lat, e.latlng.lng, 'ເລືອກຈາກແຜນທີ່');
      pickingLocation = false;
      leafletMap.getContainer().style.cursor = '';
      document.getElementById('modal').classList.add('open');
    }
  });
}

let locateMarker = null;
function locateMe() {
  showToast('📡 ກຳລັງຄົ້ນຫາ...', 'info', 2000);
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    leafletMap.setView([lat, lng], 17);
    if (locateMarker) leafletMap.removeLayer(locateMarker);
    locateMarker = L.circleMarker([lat, lng], { radius:10, fillColor:'#378ADD', color:'#fff', weight:3, fillOpacity:0.9 })
      .addTo(leafletMap).bindPopup('📍 ຕຳແໜ່ງຂອງທ່ານ').openPopup();
    showToast('✅ ພົບຕຳແໜ່ງ!', 'success');
  }, () => showToast('❌ ດຶງ GPS ບໍ່ໄດ້', 'error'), { enableHighAccuracy: true, timeout: 8000 });
}

function makeIcon(status) {
  const color = MARKER_COLORS[status] || '#888780';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.47 14 22 14 22S28 23.47 28 14C28 6.27 21.73 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white"/></svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [28,36], iconAnchor: [14,36], popupAnchor: [0,-36] });
}

function renderMarkers() {
  if (!leafletMap || !clusterGroup) return;
  clusterGroup.clearLayers();
  markers = {};
  allData[currentTab].forEach(rec => {
    if (!rec.lat || !rec.lng) return;
    const m = L.marker([rec.lat, rec.lng], { icon: makeIcon(rec.status) });
    const canEdit = canEditRecord(rec);
    const safeId = escapeAttr(rec.id);
    const safeStatus = isValidStatus(currentTab, rec.status) ? rec.status : STATUS_CONFIG[currentTab][0].val;
    const safeName = escapeHTML(rec.name);
    const safePhone = escapeHTML(rec.phone || '-');
    const safeType = escapeHTML(rec.business_type || rec.customer_type || '-');
    const safeLocation = escapeHTML(rec.location_name || '');
    m.bindPopup(`<div class="map-popup">
      <div class="map-popup-name">${safeName}</div>
      <div class="map-popup-info">📞 ${safePhone}</div>
      <div class="map-popup-info">🏪 ${safeType}</div>
      <div class="map-popup-info">📍 ${safeLocation}</div>
      <div class="map-popup-info"><span class="status-badge status-${safeStatus}">${escapeHTML(STATUS_LABELS[safeStatus]||safeStatus)}</span></div>
      <div class="map-popup-actions">
        ${canEdit ? `<button class="btn-sm primary" onclick="openEditModal('${safeId}')">✏️ ແກ້ໄຂ</button>` : ''}
        ${canDeleteRecord(rec) ? `<button class="btn-sm danger" onclick="deleteRecord('${safeId}','${currentTab}')">🗑️ ລຶບ</button>` : ''}
      </div></div>`, { maxWidth: 260 });
    clusterGroup.addLayer(m);
    markers[rec.id] = m;
  });
}
