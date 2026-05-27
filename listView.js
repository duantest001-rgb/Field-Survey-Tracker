/* Field Survey Tracker exportService.js */
// ===== EXCEL EXPORT =====
function exportExcel() {
  const p = allData.partner.map(r => ({ ປະເພດ:'Partner', ຊື່:r.name, ເບີໂທ:r.phone, ທຸລະກິດ:r.business_type, ສະຖານະ:STATUS_LABELS[r.status]||r.status, ໝາຍເຫດ:r.notes, Location:r.location_name, ວັນທີ:r.created_at?.slice(0,10) }));
  const c = allData.customer.map(r => ({ ປະເພດ:'ລູກຄ້າ', ຊື່:r.name, ເບີໂທ:r.phone, ທຸລະກິດ:r.customer_type, ສະຖານະ:STATUS_LABELS[r.status]||r.status, ໝາຍເຫດ:r.notes, Location:r.location_name, ວັນທີ:r.created_at?.slice(0,10) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...p, ...c]), 'ທັງໝົດ');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(p), 'Partner');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(c), 'ລູກຄ້າ');
  XLSX.writeFile(wb, `survey_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('📤 Export Excel ສຳເລັດ!');
}
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function exportBackupJSON() {
  const cached = getCachedData();
  const payload = {
    app: 'Field Survey Tracker',
    version: 'v2-safe-backup',
    exported_at: new Date().toISOString(),
    user: currentUser ? { id: currentUser.id, email: currentUser.email } : null,
    remote_counts: lastRemoteCounts,
    data: {
      partner: allData.partner.length ? allData.partner : cached.partner,
      customer: allData.customer.length ? allData.customer : cached.customer
    }
  };
  downloadJSON(`survey_backup_${new Date().toISOString().slice(0,10)}.json`, payload);
  showToast('💾 Backup JSON ສຳເລັດ');
}
async function importBackupJSON(input) {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!confirm('Import backup JSON ເຂົ້າ Supabase ບໍ? ຄວນ Export backup ປັດຈຸບັນກ່ອນ.')) return;
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const partner = parsed.data?.partner || parsed.partner || [];
    const customer = parsed.data?.customer || parsed.customer || [];
    const clean = (r) => {
      const copy = { ...r };
      delete copy._t;
      if (!copy.created_by) copy.created_by = currentUser.id;
      copy.updated_at = new Date().toISOString();
      return copy;
    };
    let pErr = null, cErr = null;
    if (partner.length) {
      const res = await sb.from('partners').upsert(partner.map(clean), { onConflict: 'id' });
      pErr = res.error;
    }
    if (customer.length) {
      const res = await sb.from('customers').upsert(customer.map(clean), { onConflict: 'id' });
      cErr = res.error;
    }
    if (pErr || cErr) throw (pErr || cErr);
    showToast(`✅ Import ສຳເລັດ: Partner ${partner.length}, Customer ${customer.length}`, 'success', 5000);
    await loadAll();
  } catch(err) {
    console.error('[importBackupJSON]', err);
    showToast('❌ Import ບໍ່ສຳເລັດ: ' + (err.message || 'JSON ບໍ່ຖືກ'), 'error', 7000);
  }
}
