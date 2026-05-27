/* Field Survey Tracker utils.js */
// ===== SAFETY HELPERS =====
function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function escapeAttr(value) { return escapeHTML(value); }
function escapeRegExp(value) { return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function getRecordTypeById(id) {
  if (allData.partner.some(r => r.id === id)) return 'partner';
  if (allData.customer.some(r => r.id === id)) return 'customer';
  return currentTab;
}
function tableNameFor(type) { return type === 'partner' ? 'partners' : 'customers'; }
function isValidStatus(type, status) { return STATUS_CONFIG[type].some(s => s.val === status); }
function isValidImageFile(file) {
  return file && file.type?.startsWith('image/') && file.size <= 5 * 1024 * 1024;
}
