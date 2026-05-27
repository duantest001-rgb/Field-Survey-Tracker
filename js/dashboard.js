/* Field Survey Tracker dashboard.js */
// ===== DASHBOARD =====
function renderDash() {
  if (currentView !== 'dash') return;
  const today = new Date().toDateString();
  document.getElementById('dash-total-p').textContent = allData.partner.length;
  document.getElementById('dash-total-c').textContent = allData.customer.length;
  document.getElementById('dash-today-p').textContent = allData.partner.filter(r => new Date(r.created_at).toDateString()===today).length;
  document.getElementById('dash-today-c').textContent = allData.customer.filter(r => new Date(r.created_at).toDateString()===today).length;

  const renderStatus = (data, statuses, containerId) => {
    const counts = {}; statuses.forEach(s => counts[s.val] = 0);
    data.forEach(r => { if (counts[r.status]!==undefined) counts[r.status]++; });
    document.getElementById(containerId).innerHTML = statuses.map(s => {
      const dot = s.val==='not_interested'?'dot-red':s.val==='considering'?'dot-amber':'dot-green';
      const pct = data.length ? Math.round(counts[s.val]/data.length*100) : 0;
      return `<div class="status-row"><span><span class="status-dot ${dot}"></span>${s.label.split(' ')[1]}</span><strong>${counts[s.val]} (${pct}%)</strong></div>`;
    }).join('');
    return counts;
  };

  const pc = renderStatus(allData.partner, STATUS_CONFIG.partner, 'dash-partner-status');
  const cc = renderStatus(allData.customer, STATUS_CONFIG.customer, 'dash-customer-status');

  // Charts
  const chartOpts = (labels, data, colors) => ({
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });

  if (chartPartner) chartPartner.destroy();
  chartPartner = new Chart(document.getElementById('chart-partner'), chartOpts(
    ['ເຂົ້າຮ່ວມ','ພິຈາລະນາ','ບໍ່ສົນໃຈ'], [pc.joined, pc.considering, pc.not_interested], ['#1D9E75','#BA7517','#E24B4A']
  ));

  if (chartCustomer) chartCustomer.destroy();
  chartCustomer = new Chart(document.getElementById('chart-customer'), chartOpts(
    ['ສົນໃຈ','ພິຈາລະນາ','ບໍ່ສົນໃຈ'], [cc.interested, cc.considering, cc.not_interested], ['#1D9E75','#BA7517','#E24B4A']
  ));

  // Trend chart (7 days)
  const days = [...Array(7)].map((_,i) => { const d = new Date(); d.setDate(d.getDate()-6+i); return d; });
  const labels7 = days.map(d => `${d.getDate()}/${d.getMonth()+1}`);
  const pCount = days.map(d => allData.partner.filter(r => new Date(r.created_at).toDateString()===d.toDateString()).length);
  const cCount = days.map(d => allData.customer.filter(r => new Date(r.created_at).toDateString()===d.toDateString()).length);
  if (chartTrend) chartTrend.destroy();
  chartTrend = new Chart(document.getElementById('chart-trend'), {
    type: 'bar',
    data: { labels: labels7, datasets: [
      { label: 'Partner', data: pCount, backgroundColor: '#1D9E75' },
      { label: 'ລູກຄ້າ', data: cCount, backgroundColor: '#378ADD' }
    ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  const recent = [...allData.partner.map(r=>({...r,_t:'Partner'})), ...allData.customer.map(r=>({...r,_t:'ລູກຄ້າ'}))]
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5);
  document.getElementById('dash-recent').innerHTML = recent.map(r =>
    `<div class="status-row"><span>${escapeHTML(r._t)}: ${escapeHTML(r.name)}</span><span class="status-badge status-${r.status}">${escapeHTML(STATUS_LABELS[r.status]||r.status)}</span></div>`
  ).join('') || '<div style="color:var(--text3);font-size:0.85rem;padding:8px 0">ຍັງບໍ່ມີຂໍ້ມູນ</div>';
}
