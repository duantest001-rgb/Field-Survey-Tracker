/* Field Survey Tracker adminUsersTeams.js */
// ===== ADMIN: USERS & TEAMS =====
async function showAdmin() {
  if (!isAdmin) return;
  document.getElementById('map-view').style.display = 'none';
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('dash-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'flex';
  document.getElementById('fab-btn').style.display = 'none';
  await loadAdminData();
}

function teamNameById(teamId) {
  if (!teamId) return '—';
  return adminTeams.find(t => t.id === teamId)?.name || teamId.slice(0, 8) + '...';
}
function roleOptions(current) {
  return ['admin','manager','staff'].map(r => `<option value="${r}" ${current===r?'selected':''}>${r}</option>`).join('');
}
function statusOptions(current) {
  return ['active','inactive'].map(st => `<option value="${st}" ${current===st?'selected':''}>${st}</option>`).join('');
}
function teamOptions(current) {
  return `<option value="">No team</option>` + adminTeams.map(t => `<option value="${escapeAttr(t.id)}" ${current===t.id?'selected':''}>${escapeHTML(t.name)}</option>`).join('');
}

async function loadAdminData() {
  try {
    const [teamsRes, profilesRes] = await Promise.all([
      sb.from('teams').select('*').order('created_at', { ascending: true }),
      sb.from('profiles').select('id,email,display_name,role,status,team_id,created_at,updated_at').order('created_at', { ascending: true })
    ]);
    if (teamsRes.error) throw teamsRes.error;
    if (profilesRes.error) throw profilesRes.error;
    adminTeams = teamsRes.data || [];
    adminProfiles = profilesRes.data || [];
    renderTeamsAdmin();
    renderProfilesAdmin();
    renderAdminTeamStats();
    updateRecoveryInfo();
  } catch(e) {
    console.error('[loadAdminData]', e);
    const target = document.getElementById('profiles-list');
    if (target) target.innerHTML = `<div class="admin-muted" style="color:var(--red)">ດຶງຂໍ້ມູນ Users/Teams ບໍ່ໄດ້: ${escapeHTML(e.message || e)}</div>`;
  }
}

function renderTeamsAdmin() {
  const el = document.getElementById('teams-list');
  if (!el) return;
  if (!adminTeams.length) {
    el.innerHTML = '<div class="admin-muted">ຍັງບໍ່ມີ team. ສ້າງ Team ກ່ອນ ແລ້ວຈຶ່ງ assign user.</div>';
    return;
  }
  el.innerHTML = adminTeams.map(t => {
    const members = adminProfiles.filter(p => p.team_id === t.id).length;
    const records = [...allData.partner, ...allData.customer].filter(r => r.team_id === t.id).length;
    return `<div class="admin-user-row">
      <div>
        <strong>${escapeHTML(t.name)}</strong>
        <div class="admin-muted">${escapeHTML(t.description || '')}</div>
        <div class="admin-muted">Members: ${members} • Records: ${records}</div>
      </div>
      <button class="btn-sm danger" onclick="deleteTeam('${escapeAttr(t.id)}')">ລຶບ</button>
    </div>`;
  }).join('');
}

function renderProfilesAdmin() {
  const el = document.getElementById('profiles-list');
  if (!el) return;
  if (!adminProfiles.length) {
    el.innerHTML = '<div class="admin-muted">ຍັງບໍ່ມີ profiles. ໃຫ້ user Register/Login ກ່ອນ ຫຼື run v5 migration backfill.</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table">
    <thead><tr><th>User</th><th>Role</th><th>Team</th><th>Status</th><th>Save</th></tr></thead>
    <tbody>
      ${adminProfiles.map(p => `
        <tr>
          <td>
            <strong>${escapeHTML(p.display_name || p.email || p.id)}</strong>
            <div class="admin-muted">${escapeHTML(p.email || '')}</div>
            <div class="admin-muted">${escapeHTML(p.id.slice(0,8))}...</div>
          </td>
          <td><select class="admin-select" id="role-${escapeAttr(p.id)}">${roleOptions(p.role)}</select></td>
          <td><select class="admin-select" id="team-${escapeAttr(p.id)}">${teamOptions(p.team_id)}</select></td>
          <td><select class="admin-select" id="status-${escapeAttr(p.id)}">${statusOptions(p.status)}</select></td>
          <td><button class="btn-sm primary" onclick="saveUserProfile('${escapeAttr(p.id)}')">ບັນທຶກ</button></td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderAdminTeamStats() {
  const el = document.getElementById('admin-team-stats');
  if (!el) return;
  const allRecs = [...allData.partner.map(r=>({...r,_type:'Partner'})), ...allData.customer.map(r=>({...r,_type:'Customer'}))];
  const rows = adminTeams.map(t => {
    const members = adminProfiles.filter(p => p.team_id === t.id).length;
    const records = allRecs.filter(r => r.team_id === t.id).length;
    return `<div class="status-row"><span><span class="team-pill">${escapeHTML(t.name)}</span></span><span>${members} users • ${records} records</span></div>`;
  });
  const noTeamRecords = allRecs.filter(r => !r.team_id).length;
  rows.push(`<div class="status-row"><span>— No team</span><span>${noTeamRecords} records</span></div>`);
  el.innerHTML = rows.join('') || '<div class="admin-muted">ຍັງບໍ່ມີຂໍ້ມູນ</div>';
}

async function createTeam() {
  const name = document.getElementById('new-team-name').value.trim();
  const description = document.getElementById('new-team-desc').value.trim();
  if (!name) { showToast('⚠️ ໃສ່ຊື່ team ກ່ອນ', 'error'); return; }
  const { error } = await sb.from('teams').insert({ name, description, created_by: currentUser.id });
  if (error) { showToast('❌ ສ້າງ team ບໍ່ສຳເລັດ: ' + error.message, 'error', 5000); return; }
  document.getElementById('new-team-name').value = '';
  document.getElementById('new-team-desc').value = '';
  showToast('✅ ສ້າງ team ສຳເລັດ');
  await loadAdminData();
}

async function deleteTeam(id) {
  const members = adminProfiles.filter(p => p.team_id === id).length;
  const records = [...allData.partner, ...allData.customer].filter(r => r.team_id === id).length;
  if (members || records) {
    showToast('⚠️ ລຶບບໍ່ໄດ້: team ນີ້ຍັງມີ user ຫຼື record ຜູກຢູ່', 'error', 5000);
    return;
  }
  if (!confirm('ລຶບ team ນີ້ບໍ?')) return;
  const { error } = await sb.from('teams').delete().eq('id', id);
  if (error) { showToast('❌ ລຶບ team ບໍ່ສຳເລັດ: ' + error.message, 'error', 5000); return; }
  showToast('🗑️ ລຶບ team ແລ້ວ');
  await loadAdminData();
}

async function saveUserProfile(id) {
  const role = document.getElementById(`role-${id}`).value;
  const status = document.getElementById(`status-${id}`).value;
  const teamValue = document.getElementById(`team-${id}`).value;
  const payload = {
    role,
    status,
    team_id: teamValue || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('profiles').update(payload).eq('id', id);
  if (error) { showToast('❌ ບັນທຶກ user ບໍ່ສຳເລັດ: ' + error.message, 'error', 5000); return; }
  showToast('✅ ອັບເດດ user ສຳເລັດ');
  await loadAdminData();
}
