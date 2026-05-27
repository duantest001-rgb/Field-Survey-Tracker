/* Field Survey Tracker realtime.js */
// ===== REALTIME =====
function setupRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = sb.channel('survey-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, () => { loadAll(); showToast('🔄 ຂໍ້ມູນ Partner ອັບເດດ', 'info', 2000); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { loadAll(); showToast('🔄 ຂໍ້ມູນ ລູກຄ້າ ອັບເດດ', 'info', 2000); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { if (isAdmin) loadAdminData(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => { if (isAdmin) loadAdminData(); })
    .subscribe(status => {
      const dot = document.getElementById('rt-dot');
      dot.style.display = status === 'SUBSCRIBED' ? 'inline-block' : 'none';
    });
}
function teardownRealtime() {
  if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
  document.getElementById('rt-dot').style.display = 'none';
}
