/* Field Survey Tracker auth.js */
// ===== AUTH =====
sb.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    currentUser = session.user;
    showApp();
    await waitForMap();
    await checkAdmin();
    await loadAll();
    setupRealtime();
  } else {
    currentUser = null; isAdmin = false;
    teardownRealtime();
    showAuth();
  }
});

function waitForMap() {
  return new Promise(resolve => {
    if (leafletMap) { resolve(); return; }
    const check = setInterval(() => { if (leafletMap) { clearInterval(check); resolve(); } }, 100);
    setTimeout(() => { clearInterval(check); resolve(); }, 3000);
  });
}

async function checkAdmin() {
  isAdmin = false;
  currentUserRole = 'staff';
  if (!currentUser) return;

  try {
    // Preferred v4 permission source: public.profiles.role
    const roleRes = await sb.rpc('current_user_role');
    if (!roleRes.error && roleRes.data) {
      currentUserRole = roleRes.data;
      isAdmin = roleRes.data === 'admin';
    } else {
      // Fallback if RPC is not deployed yet: read profiles directly
      const { data: profile, error: profileErr } = await sb
        .from('profiles')
        .select('role,status')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (profileErr) throw profileErr;
      currentUserRole = (profile && profile.status === 'active') ? profile.role : 'staff';
      isAdmin = currentUserRole === 'admin';
    }
  } catch(e) {
    console.warn('[checkAdmin] profiles role not ready, falling back to admins/bootstrap', e);
    try {
      const { data } = await sb
        .from('admins')
        .select('id')
        .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email?.toLowerCase()}`)
        .maybeSingle();
      isAdmin = !!data || currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      currentUserRole = isAdmin ? 'admin' : 'staff';
    } catch(_) {
      isAdmin = currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      currentUserRole = isAdmin ? 'admin' : 'staff';
    }
  }

  const adminBtn = document.getElementById('admin-btn');
  if (adminBtn) adminBtn.style.display = isAdmin ? 'block' : 'none';
  const badge = document.getElementById('user-role-badge');
  if (badge) badge.textContent = currentUser?.email ? `${currentUser.email} • ${currentUserRole}` : currentUserRole;
}

function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  if (!leafletMap) initMap();
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
    // Trigger in DB should create this automatically; this is a safe fallback.
    await sb.from('profiles').upsert({
      id: data.user.id, email, display_name: email, role: 'staff', status: 'inactive'
    }, { onConflict: 'id' });
  }
  msg.textContent = error ? error.message : 'ລົງທະບຽນສຳເລັດ! ລໍ Admin ກຳນົດສິດ/ເປີດ active';
}
async function doLogout() {
  // Robust logout fix: clear Supabase session even if signOut throws,
  // then force a clean reload back to the login screen.
  try { showToast('ກຳລັງອອກຈາກລະບົບ...', 'info', 1500); } catch (_) {}

  try { teardownRealtime(); } catch (_) {}

  try {
    await sb.auth.signOut({ scope: 'local' });
  } catch (err1) {
    console.warn('Local signOut failed, continuing cleanup:', err1);
  }

  try {
    await sb.auth.signOut();
  } catch (err2) {
    console.warn('Default signOut failed, continuing cleanup:', err2);
  }

  currentUser = null;
  currentUserRole = 'anonymous';
  isAdmin = false;

  const badge = document.getElementById('user-role-badge');
  if (badge) badge.textContent = '';

  // Keep business data cache, but remove all Supabase auth/session keys.
  try {
    Object.keys(localStorage).forEach(k => {
      const key = k.toLowerCase();
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) {
        localStorage.removeItem(k);
      }
    });
  } catch (_) {}

  try {
    Object.keys(sessionStorage).forEach(k => {
      const key = k.toLowerCase();
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) {
        sessionStorage.removeItem(k);
      }
    });
  } catch (_) {}

  showAuth();

  // Force reload so Supabase client cannot reuse an in-memory session.
  setTimeout(() => {
    const cleanUrl = window.location.origin + window.location.pathname + '?logout=' + Date.now();
    window.location.replace(cleanUrl);
  }, 250);
}
