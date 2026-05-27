/* Field Survey Tracker permissions.js */
// Centralized frontend permission logic. RLS remains the final security layer in Supabase.
function getUserRole() {
  return currentUserProfile?.role || currentUserRole || 'anonymous';
}
function isActiveUser() {
  return !!currentUser && currentUserProfile?.status === 'active';
}
function canAccessAdminPanel() {
  return isActiveUser() && getUserRole() === 'admin';
}
function canSeeAllRecords() {
  return isActiveUser() && getUserRole() === 'admin';
}
function sameTeam(record) {
  return !!record?.team_id && !!currentUserProfile?.team_id && record.team_id === currentUserProfile.team_id;
}
function ownsRecord(record) {
  return !!currentUser?.id && record?.created_by === currentUser.id;
}
function assignedRecord(record) {
  return !!currentUser?.id && record?.assigned_to === currentUser.id;
}
function canViewRecord(record) {
  if (!isActiveUser()) return false;
  const role = getUserRole();
  if (role === 'admin') return true;
  if (role === 'manager') return sameTeam(record) || ownsRecord(record) || assignedRecord(record);
  if (role === 'staff') return ownsRecord(record) || assignedRecord(record);
  return false;
}
function canEditRecord(record) {
  if (!isActiveUser()) return false;
  const role = getUserRole();
  if (role === 'admin') return true;
  if (role === 'manager') return sameTeam(record) || ownsRecord(record) || assignedRecord(record);
  if (role === 'staff') return ownsRecord(record) || assignedRecord(record);
  return false;
}
function canDeleteRecord(record) {
  return isActiveUser() && getUserRole() === 'admin';
}
function canCreateRecord() {
  return isActiveUser() && ['admin', 'manager', 'staff'].includes(getUserRole());
}
function filterVisibleRecords(records) {
  // Supabase RLS should already filter records. This frontend filter protects cached data.
  return (records || []).filter(canViewRecord);
}
function updateRoleUI() {
  const role = getUserRole();
  isAdmin = role === 'admin' && isActiveUser();
  const adminBtn = document.getElementById('admin-btn');
  if (adminBtn) adminBtn.style.display = canAccessAdminPanel() ? 'block' : 'none';
  const fab = document.getElementById('fab-btn');
  if (fab) fab.style.display = canCreateRecord() && currentView !== 'admin' ? 'flex' : 'none';
  const badge = document.getElementById('user-role-badge');
  if (badge) {
    const status = currentUserProfile?.status || 'no-profile';
    badge.textContent = currentUser?.email ? `${currentUser.email} • ${role} • ${status}` : role;
  }
}
