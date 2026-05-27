/* Field Survey Tracker auth.js */
// ===== AUTH =====
let authBooting = false;

sb.auth.onAuthStateChange(async (_event, session) => {
  if (authBooting) return;
  authBooting = true;
  try {
    if (session?.user) await startAuthenticatedSession(session.user);
    else endAuthenticatedSession();
  } finally {
    authBooting = false;
  }
});

async function startAuthenticatedSession(user) {
  currentUser = user;
  if (typeof teardownRealtime === 'function') teardownRealtime();

  const profile = await fetchOrCreateProfile(user);
  currentUserProfile = profile;
  currentUserRole = profile?.role || 'anonymous';
  updateRoleUI();

  if (!profile || profile.status !== 'active') {
    showPendingApproval(profile);
    return;
  }

  showApp();
  await waitForMap();
  if (typeof loadAll === 'function') await loadAll({ reason: 'auth' });
  if (typeof setupRealtime === 'function') setupRealtime();
}

function endAuthenticatedSession() {
  currentUser = null;
  currentUserProfile = null;
  currentUserRole = 'anonymous';
  isAdmin = false;
  dataSourceState = { partner: 'remote', customer: 'remote', message: '' };
  if (typeof teardownRealtime === 'function') teardownRealtime();
  updateRoleUI();
  showAuth();
}

async function fetchOrCreateProfile(user) {
  if (!user?.id) return null;
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('id,email,display_name,role,status,team_id,created_at,updated_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  } catch (err) {
    console.warn('[fetch profile]', err);
  }

  // Safe fallback for new users. Admin must activate them later.
  try {
    const fallback = {
      id: user.id,
      email: (user.email || '').toLowerCase(),
      display_name: user.email || 'New user',
      role: 'staff',
      status: 'inactive'
    };
    const { data, error } = await sb.from('profiles').upsert(fallback, { onConflict: 'id' }).select('id,email,display_name,role,status,team_id,created_at,updated_at').maybeSingle();
    if (error) throw error;
    return data || fallback;
  } catch (err) {
    console.warn('[create fallback profile]', err);
    return null;
  }
}

function waitForMap() {
  return new Promise(resolve => {
    if (leafletMap) { resolve(); return; }
    const check = setInterval(() => { if (leafletMap) { clearInterval(check); resolve(); } }, 100);
    setTimeout(() => { clearInterval(check); resolve(); }, 3000);
  });
}

async function checkAdmin() {
  // Backward-compatible name used by other files. v6.1 uses profiles.role only.
  if (!currentUser) return;
  currentUserProfile = await fetchOrCreateProfile(currentUser);
  currentUserRole = currentUserProfile?.role || 'anonymous';
  updateRoleUI();
}

function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  if (!leafletMap && typeof initMap === 'function') initMap();
  updateRoleUI();
}
function showPendingApproval(profile) {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  const msg = document.getElementById('auth-msg') || document.getElementById('reg-msg');
  if (msg) {
    const status = profile?.status || 'no profile';
    msg.textContent = `ບັນຊີນີ້ຍັງບໍ່ພ້ອມໃຊ້ງານ (${status}). ກະລຸນາໃຫ້ Admin ກຳນົດ role/team ແລະເປີດ active.`;
  }
  showToast('⏳ ບັນຊີຍັງລໍ Admin ອະນຸມັດ', 'error', 6000);
  // Prevent stuck sessions for inactive/no-profile users. They can login again after Admin activates them.
  clearAuthStorage();
  withTimeout(sb.auth.signOut({ scope: 'local' }), 1000).catch(() => {});
}

function toggleAuth() {
  const isLogin = document.getElementById('auth-form-login').style.display !== 'none';
  document.getElementById('auth-form-login').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-form-register').style.display = isLogin ? 'block' : 'none';
}
async function doLogin() {
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const pass = document.getElementById('auth-pass').value;
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'ກຳລັງເຂົ້າສູ່ລະບົບ...';
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  msg.textContent = error ? 'Email ຫຼື Password ບໍ່ຖືກຕ້ອງ' : '';
}
async function doRegister() {
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('reg-pass').value;
  const msg = document.getElementById('reg-msg');
  msg.textContent = 'ກຳລັງລົງທະບຽນ...';
  const { data, error } = await sb.auth.signUp({ email, password: pass });
  if (!error && data?.user?.id) {
    await sb.from('profiles').upsert({
      id: data.user.id, email, display_name: email, role: 'staff', status: 'inactive'
    }, { onConflict: 'id' });
  }
  msg.textContent = error ? error.message : 'ລົງທະບຽນສຳເລັດ! ລໍ Admin ກຳນົດສິດ/ເປີດ active';
}

function clearAuthStorage() {
  try {
    Object.keys(localStorage).forEach(k => {
      const key = k.toLowerCase();
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) localStorage.removeItem(k);
    });
  } catch (_) {}
  try {
    Object.keys(sessionStorage).forEach(k => {
      const key = k.toLowerCase();
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) sessionStorage.removeItem(k);
    });
  } catch (_) {}
}
function withTimeout(promise, ms = 1200) {
  return Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms))]);
}
async function doLogout() {
  try { showToast('ກຳລັງອອກຈາກລະບົບ...', 'info', 1200); } catch (_) {}
  if (typeof teardownRealtime === 'function') teardownRealtime();

  // Clear UI/local auth immediately. Do not wait for network.
  clearAuthStorage();
  currentUser = null;
  currentUserProfile = null;
  currentUserRole = 'anonymous';
  isAdmin = false;
  updateRoleUI();
  showAuth();

  try { await withTimeout(sb.auth.signOut({ scope: 'local' }), 1200); } catch (err) { console.warn('[logout local]', err); }
  try { await withTimeout(sb.auth.signOut(), 1200); } catch (err) { console.warn('[logout]', err); }

  const cleanUrl = window.location.origin + window.location.pathname + '?logout=' + Date.now();
  window.location.replace(cleanUrl);
}
