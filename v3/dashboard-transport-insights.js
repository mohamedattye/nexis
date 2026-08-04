(() => {
  'use strict';

  if (window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__) return;
  window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__ = true;
  if (!window.supabase?.createClient) return;

  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const shortFormatter = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
  const money = (value) => `${formatter.format(Number(value) || 0)} FCFA`;
  const shortMoney = (value) => `${shortFormatter.format(Number(value) || 0)} FCFA`;
  const expenseKeys = ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc'];
  const expenseLabels = { fuel: 'Carburant', ration: 'Ration', rapido: 'Rapido / péage', manoeuvre: 'Manœuvre', misc: 'Autres frais' };

  const style = document.createElement('style');
  style.textContent = `
    .transport-insights{
      display:grid;
      grid-template-columns:minmax(0,1.75fr) minmax(290px,.75fr);
      gap:13px;
      margin-top:13px;
    }
    .transport-insight-card{
      min-width:0;
      overflow:hidden;
      border:1px solid rgba(223,229,237,.96);
      border-radius:17px;
      background:rgba(255,255,255,.96);
      box-shadow:0 12px 34px rgba(31,48,73,.07);
      padding:18px;
    }
    .transport-insight-card.performance{grid-column:1/-1}
    .transport-insight-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      margin-bottom:13px;
    }
    .transport-insight-head small{
      display:block;
      margin-bottom:4px;
      color:#8a96a6;
      font-size:8px;
      font-weight:850;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .transport-insight-head h3{
      margin:0;
      color:#1b2d43;
      font-size:15px;
      letter-spacing:-.025em;
    }
    .transport-insight-head p{
      margin:5px 0 0;
      color:#818c9b;
      font-size:9px;
      line-height:1.45;
    }
    .transport-period-badge{
      display:inline-flex;
      align-items:center;
      gap:6px;
      flex:0 0 auto;
      padding:6px 9px;
      border:1px solid #e1e7ed;
      border-radius:999px;
      background:#f8fafc;
      color:#6d7a8c;
      font-size:8px;
      font-weight:800;
      white-space:nowrap;
    }
    .transport-period-badge:before{
      content:"";
      width:6px;
      height:6px;
      border-radius:50%;
      background:#ff9414;
      box-shadow:0 0 0 4px rgba(255,148,20,.09);
    }

    .transport-chart-wrap{position:relative;min-height:235px}
    .transport-line-chart{display:block;width:100%;height:235px;overflow:visible}
    .transport-grid-line{stroke:#edf1f5;stroke-width:1}
    .transport-axis-label{fill:#8c97a5;font-size:9px;font-weight:650}
    .transport-line-revenue{fill:none;stroke:#ff8a00;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .transport-line-margin{fill:none;stroke:#10936c;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .transport-area-revenue{fill:url(#nexisRevenueGradient)}
    .transport-point-revenue{fill:#fff;stroke:#ff8a00;stroke-width:2.5}
    .transport-point-margin{fill:#fff;stroke:#10936c;stroke-width:2.5}
    .transport-chart-legend{display:flex;align-items:center;gap:16px;margin-top:5px;color:#6f7d90;font-size:9px;font-weight:700}
    .transport-chart-legend span{display:inline-flex;align-items:center;gap:6px}
    .transport-chart-legend i{display:block;width:14px;height:3px;border-radius:999px;background:#ff8a00}
    .transport-chart-legend span:last-child i{background:#10936c}

    .transport-donut-layout{display:grid;grid-template-columns:145px 1fr;align-items:center;gap:12px;min-height:235px}
    .transport-donut{
      position:relative;
      width:136px;
      height:136px;
      margin:auto;
      border-radius:50%;
      background:#eef2f5;
    }
    .transport-donut:after{
      content:"";
      position:absolute;
      inset:26px;
      border-radius:50%;
      background:#fff;
      box-shadow:inset 0 0 0 1px #edf1f5;
    }
    .transport-donut-center{
      position:absolute;
      inset:0;
      z-index:2;
      display:grid;
      place-content:center;
      text-align:center;
      pointer-events:none;
    }
    .transport-donut-center span{color:#8a96a5;font-size:8px;font-weight:750;text-transform:uppercase;letter-spacing:.06em}
    .transport-donut-center strong{margin-top:4px;color:#203249;font-size:13px;letter-spacing:-.025em}
    .transport-cost-list{display:grid;gap:9px}
    .transport-cost-row{display:grid;grid-template-columns:9px minmax(0,1fr) auto;align-items:center;gap:7px}
    .transport-cost-dot{width:7px;height:7px;border-radius:3px;background:var(--dot)}
    .transport-cost-row span{color:#58677a;font-size:9px;font-weight:720;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .transport-cost-row strong{color:#26384e;font-size:9px;white-space:nowrap}

    .transport-performance-list{display:grid;gap:11px}
    .transport-performance-row{
      display:grid;
      grid-template-columns:130px minmax(180px,1fr) 95px 95px;
      align-items:center;
      gap:12px;
    }
    .transport-truck-name{display:flex;align-items:center;gap:8px;min-width:0;color:#284867;font-size:10px;font-weight:850}
    .transport-truck-icon{width:28px;height:28px;display:grid;place-items:center;border-radius:9px;background:#eef4fa;color:#315f88;flex:0 0 28px}
    .transport-truck-icon svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .transport-performance-track{height:9px;border-radius:999px;background:#edf1f5;overflow:hidden}
    .transport-performance-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#ff9f2a,#ff8200);min-width:3px}
    .transport-performance-meta{color:#6f7d8f;font-size:9px;font-weight:720;white-space:nowrap;text-align:right}
    .transport-performance-margin{font-size:9.5px;font-weight:850;white-space:nowrap;text-align:right;color:#07845d}
    .transport-performance-margin.negative{color:#bd3d44}
    .transport-empty{
      min-height:210px;
      display:grid;
      place-content:center;
      text-align:center;
      color:#8793a2;
      font-size:10px;
      line-height:1.55;
    }
    .transport-empty strong{display:block;margin-bottom:5px;color:#31445a;font-size:12px}

    @media(max-width:1050px){
      .transport-insights{grid-template-columns:1fr}
      .transport-insight-card.performance{grid-column:auto}
      .transport-performance-row{grid-template-columns:120px minmax(150px,1fr) 80px 90px}
    }
    @media(max-width:740px){
      .transport-insight-card{padding:14px}
      .transport-donut-layout{grid-template-columns:1fr}
      .transport-performance-row{grid-template-columns:1fr}
      .transport-performance-meta,.transport-performance-margin{text-align:left}
      .transport-line-chart{height:210px}
    }
  `;
  document.head.appendChild(style);

  function monthKey(date) {
    return String(date || '').slice(0, 7);
  }

  function lastMonths(count = 6) {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }

  function expenseTotal(item) {
    return expenseKeys.reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function truckIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
  }

  function ensureContainer() {
    let container = document.getElementById('transport-insights');
    if (container) return container;
    container = document.createElement('section');
    container.id = 'transport-insights';
    container.className = 'transport-insights';
    const dashboardMain = dashboard.querySelector('.dashboard-main');
    if (dashboardMain) dashboardMain.insertAdjacentElement('afterend', container);
    else dashboard.appendChild(container);
    return container;
  }

  function buildLineChart(months, series) {
    const width = 760;
    const height = 220;
    const left = 42;
    const right = 16;
    const top = 18;
    const bottom = 32;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const maxValue = Math.max(1, ...series.flatMap((item) => [item.revenue, Math.max(0, item.margin)]));
    const roundedMax = Math.max(1000, Math.ceil(maxValue / Math.pow(10, Math.max(0, String(Math.floor(maxValue)).length - 2))) * Math.pow(10, Math.max(0, String(Math.floor(maxValue)).length - 2)));
    const x = (index) => left + (months.length <= 1 ? plotW / 2 : (index / (months.length - 1)) * plotW);
    const y = (value) => top + plotH - (Math.max(0, value) / roundedMax) * plotH;
    const points = (key) => series.map((item, index) => `${x(index)},${y(item[key])}`).join(' ');
    const revenueArea = `${left},${top + plotH} ${points('revenue')} ${left + plotW},${top + plotH}`;
    const grid = [0, .25, .5, .75, 1].map((ratio) => {
      const gy = top + plotH - ratio * plotH;
      return `<line class="transport-grid-line" x1="${left}" y1="${gy}" x2="${left + plotW}" y2="${gy}"/><text class="transport-axis-label" x="${left - 8}" y="${gy + 3}" text-anchor="end">${shortFormatter.format(roundedMax * ratio)}</text>`;
    }).join('');
    const labels = months.map((month, index) => `<text class="transport-axis-label" x="${x(index)}" y="${height - 9}" text-anchor="middle">${month.label}</text>`).join('');
    const revenuePoints = series.map((item, index) => `<circle class="transport-point-revenue" cx="${x(index)}" cy="${y(item.revenue)}" r="4"><title>${months[index].label} · CA ${money(item.revenue)}</title></circle>`).join('');
    const marginPoints = series.map((item, index) => `<circle class="transport-point-margin" cx="${x(index)}" cy="${y(item.margin)}" r="4"><title>${months[index].label} · Marge ${money(item.margin)}</title></circle>`).join('');
    return `<svg class="transport-line-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Évolution du chiffre d'affaires et de la marge">
      <defs><linearGradient id="nexisRevenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff8a00" stop-opacity=".16"/><stop offset="100%" stop-color="#ff8a00" stop-opacity="0"/></linearGradient></defs>
      ${grid}<polygon class="transport-area-revenue" points="${revenueArea}"/><polyline class="transport-line-revenue" points="${points('revenue')}"/><polyline class="transport-line-margin" points="${points('margin')}"/>${revenuePoints}${marginPoints}${labels}
    </svg>`;
  }

  function buildDonut(expenses) {
    const totals = Object.fromEntries(expenseKeys.map((key) => [key, expenses.reduce((sum, item) => sum + (Number(item?.[key]) || 0), 0)]));
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const colors = ['#ff8a00', '#315f88', '#a7762e', '#72569a', '#98a3b1'];
    if (!total) return '<div class="transport-empty"><div><strong>Aucune dépense sur la période</strong>Les catégories apparaîtront dès que des frais seront enregistrés.</div></div>';
    let angle = 0;
    const stops = expenseKeys.map((key, index) => {
      const pct = totals[key] / total * 100;
      const start = angle;
      angle += pct;
      return `${colors[index]} ${start}% ${angle}%`;
    }).join(',');
    const rows = expenseKeys.map((key, index) => `<div class="transport-cost-row"><i class="transport-cost-dot" style="--dot:${colors[index]}"></i><span>${expenseLabels[key]}</span><strong>${Math.round(totals[key] / total * 100)}%</strong></div>`).join('');
    return `<div class="transport-donut-layout"><div class="transport-donut" style="background:conic-gradient(${stops})"><div class="transport-donut-center"><span>Total</span><strong>${shortMoney(total)}</strong></div></div><div class="transport-cost-list">${rows}</div></div>`;
  }

  function buildPerformance(trips, expenses) {
    const expenseByTrip = new Map();
    expenses.forEach((item) => expenseByTrip.set(String(item.trip_id), (expenseByTrip.get(String(item.trip_id)) || 0) + expenseTotal(item)));
    const rows = new Map();
    trips.forEach((trip) => {
      const plate = String(trip.truck || 'Sans camion');
      const current = rows.get(plate) || { plate, missions: 0, revenue: 0, expense: 0 };
      current.missions += 1;
      current.revenue += Number(trip.revenue) || 0;
      current.expense += expenseByTrip.get(String(trip.id)) || 0;
      rows.set(plate, current);
    });
    const ranked = [...rows.values()].map((row) => ({ ...row, margin: row.revenue - row.expense })).sort((a, b) => b.margin - a.margin).slice(0, 6);
    if (!ranked.length) return '<div class="transport-empty"><div><strong>Aucune performance à comparer</strong>Les camions apparaîtront ici dès que des missions seront enregistrées.</div></div>';
    const maxMargin = Math.max(1, ...ranked.map((row) => Math.max(0, row.margin)));
    return `<div class="transport-performance-list">${ranked.map((row) => `<div class="transport-performance-row"><div class="transport-truck-name"><span class="transport-truck-icon">${truckIcon()}</span><span>${escapeHtml(row.plate)}</span></div><div class="transport-performance-track"><div class="transport-performance-fill" style="width:${Math.max(2, Math.max(0, row.margin) / maxMargin * 100)}%"></div></div><div class="transport-performance-meta">${row.missions} mission${row.missions > 1 ? 's' : ''}</div><div class="transport-performance-margin ${row.margin < 0 ? 'negative' : ''}">${money(row.margin)}</div></div>`).join('')}</div>`;
  }

  async function renderInsights() {
    const container = ensureContainer();
    container.innerHTML = '<article class="transport-insight-card"><div class="transport-empty">Chargement des indicateurs transport…</div></article>';
    try {
      const months = lastMonths(6);
      const firstMonth = months[0].key;
      const [tripResult, expenseResult] = await Promise.all([
        client.from('trips').select('*').gte('date', `${firstMonth}-01`).order('date', { ascending: true }),
        client.from('trip_expenses').select('*').gte('date', `${firstMonth}-01`).order('date', { ascending: true })
      ]);
      if (tripResult.error) throw tripResult.error;
      if (expenseResult.error) throw expenseResult.error;
      const trips = tripResult.data || [];
      const expenses = expenseResult.data || [];
      const expensesByTrip = new Map();
      expenses.forEach((item) => expensesByTrip.set(String(item.trip_id), (expensesByTrip.get(String(item.trip_id)) || 0) + expenseTotal(item)));
      const monthly = months.map((month) => {
        const monthTrips = trips.filter((trip) => monthKey(trip.date) === month.key);
        const revenue = monthTrips.reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
        const variable = monthTrips.reduce((sum, trip) => sum + (expensesByTrip.get(String(trip.id)) || 0), 0);
        return { revenue, margin: revenue - variable, missions: monthTrips.length };
      });
      const totalMissions = monthly.reduce((sum, item) => sum + item.missions, 0);

      container.innerHTML = `
        <article class="transport-insight-card">
          <div class="transport-insight-head"><div><small>Pilotage transport</small><h3>Activité de la flotte</h3><p>Évolution du chiffre d’affaires et de la marge opérationnelle.</p></div><span class="transport-period-badge">6 derniers mois</span></div>
          <div class="transport-chart-wrap">${buildLineChart(months, monthly)}</div>
          <div class="transport-chart-legend"><span><i></i>Chiffre d’affaires</span><span><i></i>Marge</span></div>
        </article>
        <article class="transport-insight-card">
          <div class="transport-insight-head"><div><small>Structure des coûts</small><h3>Répartition des dépenses</h3><p>${totalMissions} mission${totalMissions > 1 ? 's' : ''} analysée${totalMissions > 1 ? 's' : ''}.</p></div></div>
          ${buildDonut(expenses)}
        </article>
        <article class="transport-insight-card performance">
          <div class="transport-insight-head"><div><small>Rentabilité flotte</small><h3>Performance par camion</h3><p>Classement selon la marge générée sur les 6 derniers mois.</p></div><span class="transport-period-badge">Top flotte</span></div>
          ${buildPerformance(trips, expenses)}
        </article>`;
    } catch (error) {
      console.error('Erreur graphiques transport :', error);
      container.innerHTML = '<article class="transport-insight-card"><div class="transport-empty"><div><strong>Graphiques temporairement indisponibles</strong>Les données principales du tableau de bord restent accessibles.</div></div></article>';
    }
  }

  function refreshIfDashboard() {
    if (location.hash === '#dashboard' || !location.hash) renderInsights();
  }

  window.addEventListener('hashchange', refreshIfDashboard);
  window.addEventListener('focus', refreshIfDashboard);
  document.addEventListener('nexis:auth-changed', () => window.setTimeout(refreshIfDashboard, 100));
  refreshIfDashboard();
})();