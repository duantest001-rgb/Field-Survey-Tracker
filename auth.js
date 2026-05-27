/* Field Survey Tracker auth.js */
// ===== AUTH =====
// v6.1.2: login recovery patch
// Goal: do not block login just because profiles SELECT/upsert is restricted by RLS.
// The final data security still stays in Supabase RLS.

let authBooting = false;

sb.auth.onAuthStateChange(async (_event, session) => {
  if (authBooting) return;
  authBooting = true;
  try {
    if (session?.user) await startAuthenticatedSession(session.user, { source: 'auth-event' });
    else endAuthenticatedSession();
  } catch (err) {
    console.error('[auth state change failed]', err);
    showAuthError('ການກວດ session ມີບັນຫາ: ' + getErrorMessage(err));
  } finally {
    authBooting = false;
  }
});

async function startAuthenticatedSession(user, options = {}) {
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
  if (typeof loadAll === 'function') await loadAll({ reason: options.source || 'auth' });
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

  // 1) Normal path: read own profile from public.profiles.
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('id,email,display_name,role,status,team_id,created_at,updated_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (data) return normalizeProfile(data, user);
  } catch (err) {
    console.warn('[fetch profile select failed]', err);
  }

  // 2) Recovery path: if profile SELECT is blocked by RLS, use RPC role.
  // current_user_role() should be SECURITY DEFINER and returns anonymous when user is inactive/no profile.
  try {
    const { data: role, error } = await sb.rpc('current_user_role');
    if (error) throw error;
    if (role && role !== 'anonymous') {
      return normalizeProfile({
        id: user.id,
        email: user.email,
        display_name: user.email,
        role,
        status: 'active',
        team_id: null
      }, user);
    }
  } catch (err) {
    console.warn('[fetch profile rpc fallback failed]', err);
  }

  // 3) New user path: try to create inactive staff profile.
  // If this fails because RLS blocks insert, we still return inactive profile for clear UI message.
  const fallback = {
    id: user.id,
    email: (user.email || '').toLowerCase(),
    display_name: user.email || 'New user',
    role: 'staff',
    status: 'inactive',
    team_id: null
  };

  try {
    const { data, error } = await sb
      .from('profiles')
      .upsert(fallback, { onConflict: 'id' })
      .select('id,email,display_name,role,status,team_id,created_at,updated_at')
      .maybeSingle();
    if (error) throw error;
    return normalizeProfile(data || fallback, user);
  } catch (err) {
    console.warn('[create fallback profile failed]', err);
    return fallback;
  }
}

function normalizeProfile(profile, user) {
  return {
    id: profile?.id || user?.id || null,
    email: (profile?.email || user?.email || '').toLowerCase(),
    display_name: profile?.display_name || user?.email || '',
    role: profile?.role || 'staff',
    status: profile?.status || 'inactive',
    team_id: profile?.team_id || null,
    created_at: profile?.created_at || null,
    updated_at: profile?.updated_at || null
  };
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
  const auth = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  if (auth) auth.style.display = 'flex';
  if (app) app.style.display = 'none';
}

function showApp() {
  const auth = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  if (auth) auth.style.display = 'none';
  if (app) app.style.display = 'flex';
  if (!leafletMap && typeof initMap === 'function') initMap();
  updateRoleUI();
}

function showPendingApproval(profile) {
  showAuth();
  const msg = document.getElementById('auth-msg') || document.getElementById('reg-msg');
  if (msg) {
    const status = profile?.status || 'no profile';
    const role = profile?.role || 'unknown';
    msg.textContent = `ບັນຊີນີ້ຍັງເຂົ້າ app ບໍ່ໄດ້: status=${status}, role=${role}. ໃຫ້ Admin ເປີດ active ແລະກຳນົດ role/team.`;
  }
  try { showToast('⏳ ບັນຊີຍັງລໍ Admin ອະນຸມັດ', 'error', 6000); } catch (_) {}

  // Do not keep an inactive/no-profile session in browser.
  clearAuthStorage();
  withTimeout(sb.auth.signOut({ scope: 'local' }), 1000).catch(() => {});
}

function showAuthError(message) {
  showAuth();
  const msg = document.getElementById('auth-msg') || document.getElementById('reg-msg');
  if (msg) msg.textContent = message;
  try { showToast(message, 'error', 6000); } catch (_) {}
}

function toggleAuth() {
  const login = document.getElementById('auth-form-login');
  const register = document.getElementById('auth-form-register');
  if (!login || !register) return;
  const isLogin = login.style.display !== 'none';
  login.style.display = isLogin ? 'none' : 'block';
  register.style.display = isLogin ? 'block' : 'none';
}

async function doLogin() {
  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-pass');
  const msg = document.getElementById('auth-msg');
  const email = (emailEl?.value || '').trim().toLowerCase();
  const pass = passEl?.value || '';

  if (!email || !pass) {
    if (msg) msg.textContent = 'ກະລຸນາໃສ່ email ແລະ password';
    return;
  }

  if (msg) msg.textContent = 'ກຳລັງເຂົ້າສູ່ລະບົບ...';

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
      if (msg) msg.textContent = 'Email ຫຼື Password ບໍ່ຖືກຕ້ອງ: ' + error.message;
      return;
    }

    if (data?.user) {
      // Explicitly start session instead of relying only on onAuthStateChange.
      await startAuthenticatedSession(data.user, { source: 'login-button' });
      if (msg) msg.textContent = '';
      return;
    }

    if (msg) msg.textContent = 'Login ສຳເລັດ ແຕ່ບໍ່ພົບ user session. ກະລຸນາ refresh ແລ້ວລອງໃໝ່.';
  } catch (err) {
    console.error('[login failed]', err);
    if (msg) msg.textContent = 'Login error: ' + getErrorMessage(err);
  }
}

async function doRegister() {
  const email = (document.getElementById('reg-email')?.value || '').trim().toLowerCase();
  const pass = document.getElementById('reg-pass')?.value || '';
  const msg = document.getElementById('reg-msg');

  if (!email || !pass) {
    if (msg) msg.textContent = 'ກະລຸນາໃສ່ email ແລະ password';
    return;
  }

  if (msg) msg.textContent = 'ກຳລັງລົງທະບຽນ...';
  try {
    const { data, error } = await sb.auth.signUp({ email, password: pass });
    if (error) {
      if (msg) msg.textContent = error.message;
      return;
    }
    if (data?.user?.id) {
      await sb.from('profiles').upsert({
        id: data.user.id, email, display_name: email, role: 'staff', status: 'inactive'
      }, { onConflict: 'id' });
    }
    if (msg) msg.textContent = 'ລົງທະບຽນສຳເລັດ! ລໍ Admin ກຳນົດສິດ/ເປີດ active';
  } catch (err) {
    console.error('[register failed]', err);
    if (msg) msg.textContent = 'Register error: ' + getErrorMessage(err);
  }
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

function getErrorMessage(err) {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.error_description || JSON.stringify(err);
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
