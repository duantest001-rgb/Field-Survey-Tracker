/* Field Survey Tracker modal.js */
// ===== MODAL =====
let selectedStatus = null;
function openAddModal() {
  document.getElementById('edit-id').value = '';
  ['f-name','f-phone','f-business','f-budget','f-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('loc-status').textContent = 'ຍັງບໍ່ໄດ້ເລືອກ location';
  document.getElementById('photo-preview').classList.add('hidden');
  editLat = editLng = editPhotoFile = null;
  selectedStatus = 'considering';
  renderStatusSelector(); renderModalFields();
  document.getElementById('modal-title').textContent = currentTab==='partner' ? 'ເພີ່ມ Partner ໃໝ່' : 'ເພີ່ມ ລູກຄ້າ ໃໝ່';
  document.getElementById('modal').classList.add('open');
}
function openEditModal(id) {
  const rec = allData[currentTab].find(r => r.id===id);
  if (!rec) return;
  document.getElementById('edit-id').value = id;
  document.getElementById('f-name').value = rec.name||'';
  document.getElementById('f-phone').value = rec.phone||'';
  document.getElementById('f-business').value = rec.business_type||rec.customer_type||'';
  document.getElementById('f-budget').value = rec.budget||'';
  document.getElementById('f-notes').value = rec.notes||'';
  editLat = rec.lat; editLng = rec.lng;
  document.getElementById('loc-status').textContent = rec.location_name||(rec.lat?`${rec.lat.toFixed(5)}, ${rec.lng.toFixed(5)}`:'ຍັງບໍ່ມີ');
  selectedStatus = rec.status; editPhotoFile = null;
  if (rec.photo_url) { document.getElementById('photo-preview').src=rec.photo_url; document.getElementById('photo-preview').classList.remove('hidden'); }
  else document.getElementById('photo-preview').classList.add('hidden');
  renderStatusSelector(); renderModalFields();
  document.getElementById('modal-title').textContent = currentTab==='partner' ? 'ແກ້ໄຂ Partner' : 'ແກ້ໄຂ ລູກຄ້າ';
  document.getElementById('modal').classList.add('open');
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  editPhotoFile = null; document.getElementById('f-photo').value = '';
}
function renderStatusSelector() {
  document.getElementById('status-selector').innerHTML = STATUS_CONFIG[currentTab].map(o =>
    `<div class="status-opt ${o.val===selectedStatus?'selected':''}" data-val="${o.val}" onclick="selectStatus('${o.val}')">${o.label}</div>`
  ).join('');
}
function selectStatus(val) {
  selectedStatus = val;
  document.querySelectorAll('.status-opt').forEach(el => el.classList.toggle('selected', el.dataset.val===val));
}
function renderModalFields() {
  const isCustomer = currentTab==='customer';
  document.getElementById('fg-budget').classList.toggle('hidden', !isCustomer);
  document.getElementById('business-label').textContent = isCustomer ? 'ປະເພດລູກຄ້າ / ທຸລະກິດ' : 'ປະເພດທຸລະກິດ / ສິນຄ້າ';
}
