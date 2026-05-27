/* Field Survey Tracker realtime.js */
// ===== REALTIME =====
function scheduleLoadAll(reason = 'realtime') {
  if (realtimeLoadTimer) clearTimeout(realtimeLoadTimer);
  realtimeLoadTimer = setTimeout(() => {
    realtimeLoadTimer = null;
    loadAll({ reason });
  }, 700);
}
function scheduleAdminLoad(reason = 'realtime-admin') {
  if (!canAccessAdminPanel()) return;
  if (realtimeLoadTimer) clearTimeout(realtimeLoadTimer);
  realtimeLoadTimer = setTimeout(() => {
    realtimeLoadTimer = null;
    loadAdminData();
  }, 700);
}
function setupRealtime() {
  if (realtimeChannel || !currentUser || !isActiveUser()) return;
  realtimeChannel = sb.channel('survey-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, () => { scheduleLoadAll('partners-change'); showToast('🔄 ຂໍ້ມູນ Partner ອັບເດດ', 'info', 1500); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { scheduleLoadAll('customers-change'); showToast('🔄 ຂໍ້ມູນ ລູກຄ້າ ອັບເດດ', 'info', 1500); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { scheduleAdminLoad('profiles-change'); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => { scheduleAdminLoad('teams-change'); })
    .subscribe(status => {
      const dot = document.getElementById('rt-dot');
      if (dot) dot.style.display = status === 'SUBSCRIBED' ? 'inline-block' : 'none';
    });
}
function teardownRealtime() {
  if (realtimeLoadTimer) { clearTimeout(realtimeLoadTimer); realtimeLoadTimer = null; }
  if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
  const dot = document.getElementById('rt-dot');
  if (dot) dot.style.display = 'none';
}
