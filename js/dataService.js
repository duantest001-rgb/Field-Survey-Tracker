/* Field Survey Tracker dataService.js */
// ===== DATA =====
async function loadAll(options = {}) {
  if (!currentUser || !isActiveUser()) return;
  if (isSyncing) return;
  isSyncing = true;
  try {
    const cached = getCachedData();
    const [{ data: p, error: pe }, { data: c, error: ce }] = await Promise.all([
      sb.from('partners').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('customers').select('*').is('deleted_at', null).order('created_at', { ascending: false })
    ]);

    // Backward compatibility: old DB may not have deleted_at column yet.
    let partnerData = p, customerData = c, partnerErr = pe, customerErr = ce;
    if (pe && String(pe.message || '').includes('deleted_at')) {
      const res = await sb.from('partners').select('*').order('created_at', { ascending: false });
      partnerData = res.data; partnerErr = res.error;
    }
    if (ce && String(ce.message || '').includes('deleted_at')) {
      const res = await sb.from('customers').select('*').order('created_at', { ascending: false });
      customerData = res.data; customerErr = res.error;
    }

    if (partnerErr) console.error('[loadAll partners]', partnerErr);
    if (customerErr) console.error('[loadAll customers]', customerErr);
    if (partnerErr && customerErr) throw partnerErr;

    const nextPartner = partnerErr ? filterVisibleRecords(cached.partner) : filterVisibleRecords(partnerData || []);
    const nextCustomer = customerErr ? filterVisibleRecords(cached.customer) : filterVisibleRecords(customerData || []);
    lastRemoteCounts = { partner: (partnerData || []).length, customer: (customerData || []).length };
    lastRemoteLoadAt = new Date().toISOString();

    // Guard: if server suddenly returns empty but local cache has data, do not make the screen look lost.
    if (!partnerErr && nextPartner.length === 0 && cached.partner.length > 0) {
      allData.partner = filterVisibleRecords(cached.partner);
      setDataSource('partner', 'cache', 'ກຳລັງໂຊວ໌ Partner ຈາກ Local Cache — Remote DB ສົ່ງ 0 ລາຍການ');
      showToast('⚠️ Server ສົ່ງ Partner 0 ລາຍການ — ກຳລັງໃຊ້ cache', 'error', 6000);
    } else {
      allData.partner = nextPartner;
      if (!partnerErr) { saveToCache('partner', allData.partner); setDataSource('partner', 'remote'); }
    }

    if (!customerErr && nextCustomer.length === 0 && cached.customer.length > 0) {
      allData.customer = filterVisibleRecords(cached.customer);
      setDataSource('customer', 'cache', 'ກຳລັງໂຊວ໌ Customer ຈາກ Local Cache — Remote DB ສົ່ງ 0 ລາຍການ');
      showToast('⚠️ Server ສົ່ງ Customer 0 ລາຍການ — ກຳລັງໃຊ້ cache', 'error', 6000);
    } else {
      allData.customer = nextCustomer;
      if (!customerErr) { saveToCache('customer', allData.customer); setDataSource('customer', 'remote'); }
    }

    renderCurrentViews(); updateRecoveryInfo();
  } catch(err) {
    console.error('[loadAll]', err);
    loadFromCache();
  } finally {
    isSyncing = false;
  }
}

async function saveRecord() {
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const notes = document.getElementById('f-notes').value.trim();
  const status = document.querySelector('.status-opt.selected')?.dataset.val;
  if (!name) { showToast('⚠️ ກະລຸນາໃສ່ຊື່', 'error'); return; }
  if (!phone) { showToast('⚠️ ກະລຸນາໃສ່ເບີໂທ', 'error'); return; }
  if (!isValidStatus(currentTab, status)) { showToast('⚠️ ກະລຸນາເລືອກສະຖານະ', 'error'); return; }
  if (editPhotoFile && !isValidImageFile(editPhotoFile)) { showToast('⚠️ ຮູບຕ້ອງເປັນ image ແລະ ບໍ່ເກີນ 5MB', 'error'); return; }

  if (id) {
    const existing = allData[currentTab].find(r => r.id === id);
    if (!canEditRecord(existing)) { showToast('❌ ທ່ານບໍ່ມີສິດແກ້ໄຂລາຍການນີ້', 'error'); return; }
  } else if (!canCreateRecord()) {
    showToast('❌ ບັນຊີນີ້ບໍ່ມີສິດສ້າງລາຍການ', 'error'); return;
  }

  const saveBtn = document.querySelector('.btn-save');
  saveBtn.disabled = true; saveBtn.textContent = '⏳ ກຳລັງບັນທຶກ...';

  try {
    let photoUrl = null;
    if (editPhotoFile) { showToast('📷 ອັບໂຫຼດຮູບ...', 'info'); photoUrl = await uploadPhoto(editPhotoFile); }
    const table = tableNameFor(currentTab);
    const payload = {
      name, phone, notes, status, lat: editLat, lng: editLng,
      location_name: document.getElementById('loc-status').textContent,
      updated_at: new Date().toISOString()
    };
    if (!id) {
      payload.created_by = currentUser.id;
      try {
        const { data: myProfile } = await sb.from('profiles').select('team_id').eq('id', currentUser.id).maybeSingle();
        if (myProfile?.team_id) payload.team_id = myProfile.team_id;
      } catch(_) {}
    }
    if (currentTab === 'partner') payload.business_type = document.getElementById('f-business').value.trim();
    else { payload.customer_type = document.getElementById('f-business').value.trim(); payload.budget = document.getElementById('f-budget').value.trim(); }
    if (photoUrl) payload.photo_url = photoUrl;
    else if (id) { const ex = allData[currentTab].find(r => r.id === id); if (ex?.photo_url) payload.photo_url = ex.photo_url; }

    let result = id
      ? await sb.from(table).update(payload).eq('id', id).select().maybeSingle()
      : await sb.from(table).insert(payload).select().maybeSingle();
    if (result.error && String(result.error.message || '').includes('updated_at')) {
      delete payload.updated_at;
      result = id
        ? await sb.from(table).update(payload).eq('id', id).select().maybeSingle()
        : await sb.from(table).insert(payload).select().maybeSingle();
    }
    if (result.error) throw result.error;
    if (result.data) {
      const target = allData[currentTab];
      const idx = target.findIndex(r => r.id === result.data.id);
      if (idx >= 0) target[idx] = result.data; else target.unshift(result.data);
      saveToCache(currentTab, target, { force: true });
    }
    closeModal();
    showToast(id ? '✅ ແກ້ໄຂສຳເລັດ!' : '✅ ເພີ່ມສຳເລັດ!');
    await loadAll();
  } catch(err) {
    showToast('❌ ' + (err.message || 'ເກີດຂໍ້ຜິດພາດ'), 'error', 5000);
  } finally { saveBtn.disabled = false; saveBtn.textContent = '💾 ບັນທຶກ'; }
}

async function deleteRecord(id, type = null) {
  const existing = [...allData.partner, ...allData.customer].find(r => r.id === id);
  if (!canDeleteRecord(existing)) { showToast('❌ ທ່ານບໍ່ມີສິດລຶບລາຍການນີ້', 'error'); return; }
  const recordType = type || getRecordTypeById(id);
  if (!confirm('ຍ້າຍລາຍການນີ້ໄປຖັງຂີ້ເຫຍື້ອບໍ? ຈະບໍ່ລຶບຖາວອນຖ້າ DB ມີ deleted_at.')) return;
  const table = tableNameFor(recordType);
  let { error } = await sb.from(table).update({ deleted_at: new Date().toISOString(), deleted_by: currentUser.id }).eq('id', id);
  if (error && String(error.message || '').includes('deleted_at')) {
    // Backward compatibility before migration: hard delete only if old schema has no soft-delete columns.
    ({ error } = await sb.from(table).delete().eq('id', id));
  }
  document.querySelectorAll('.leaflet-popup-close-button').forEach(b => b.click());
  if (error) { showToast('❌ ລຶບບໍ່ສຳເລັດ: ' + (error.message || ''), 'error', 5000); return; }
  allData[recordType] = allData[recordType].filter(r => r.id !== id);
  saveToCache(recordType, allData[recordType], { force: true });
  renderCurrentViews();
  showToast('🗑️ ຍ້າຍອອກຈາກລາຍການແລ້ວ');
}

async function uploadPhoto(file) {
  if (!isValidImageFile(file)) throw new Error('ຟາຍຮູບບໍ່ຖືກຕ້ອງ ຫຼື ໃຫຍ່ເກີນ 5MB');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb.storage.from('survey-photos').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return sb.storage.from('survey-photos').getPublicUrl(path).data.publicUrl;
}
