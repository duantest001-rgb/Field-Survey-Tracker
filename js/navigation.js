/* Field Survey Tracker navigation.js */
// ===== TABS & VIEWS =====
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-partner').classList.toggle('active', tab==='partner');
  document.getElementById('tab-customer').classList.toggle('active', tab==='customer');
  renderMarkers(); renderList();
}
function switchView(view) {
  currentView = view;
  ['map','list'].forEach(v => {
    document.getElementById(`vbtn-${v}`).classList.toggle('active', v===view);
    document.getElementById(`${v}-view`).style.display = v===view ? 'flex' : 'none';
  });
  document.getElementById('dash-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'none';
  document.getElementById('fab-btn').style.display = canCreateRecord() ? 'flex' : 'none';
  document.getElementById('search-bar').classList.toggle('show', view==='list');
  if (view==='map') setTimeout(() => leafletMap.invalidateSize(), 100);
}
function showDash() {
  currentView = 'dash';
  document.getElementById('map-view').style.display = 'none';
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('dash-view').style.display = 'flex';
  document.getElementById('admin-view').style.display = 'none';
  document.getElementById('fab-btn').style.display = canCreateRecord() ? 'flex' : 'none';
  document.getElementById('search-bar').classList.remove('show');
  renderDash();
}
