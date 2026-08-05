(() => {
  'use strict';

  if (window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__) return;
  window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__ = true;
  if (!window.supabase?.createClient) return;

  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const money = (value) => `${formatter.format(Number(value) || 0)} FCFA`;
  const expenseFields = ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc'];

  let loading = false;
  let hasRendered = false;
  let selectedDate = todayValue();

  const style = document.createElement('style');
  style.textContent = `
    .transport-insights-lite{margin-top:12px;margin-bottom:12px}
    .daily-runs-card{
      min-width:0;
      overflow:hidden;
      border:1px solid rgba(223,229,237,.96);
      border-radius:16px;
      background:rgba(255,255,255,.97);
      box-shadow:0 10px 28px rgba(31,48,73,.055);
      padding:15px 17px 13px;
    }
    .daily-runs-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      margin-bottom:11px;
    }
    .daily-runs-title small{
      display:block;
      margin-bottom:3px;
      color:#9aa4b1;
      font-size:6.8px;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .daily-runs-title h3{
      margin:0;
      color:#1a2b40;
      font-family:var(--font-display,"Manrope","Inter",sans-serif);
      font-size:14px;
      font-weight:760;
      letter-spacing:-.035em;
    }
    .daily-runs-title p{
      margin:3px 0 0;
      color:#929ca8;
      font-size:8.2px;
    }
    .daily-runs-date{
      height:34px;
      padding:0 10px;
      border:1px solid #e0e6ed;
      border-radius:10px;
      background:#fbfcfd;
      color:#4d5d70;
      font:600 8.5px var(--font-ui,"Inter",sans-serif);
      outline:none;
    }
    .daily-runs-date:focus{
      border-color:#efaa5a;
      box-shadow:0 0 0 3px rgba(255,139,20,.08);
    }
    .daily-runs-summary{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:8px;
      margin-bottom:10px;
    }
    .daily-runs-stat{
      min-width:0;
      padding:9px 10px;
      border:1px solid #edf1f4;
      border-radius:11px;
      background:#fafbfd;
    }
    .daily-runs-stat span{
      display:block;
      color:#8a95a3;
      font-size:7px;
      font-weight:650;
      text-transform:uppercase;
      letter-spacing:.045em;
    }
    .daily-runs-stat strong{
      display:block;
      margin-top:4px;
      color:#22364d;
      font-family:var(--font-display,"Manrope","Inter",sans-serif);
      font-size:11px;
      font-weight:760;
      letter-spacing:-.025em;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .daily-runs-stat.profit strong{color:#07845d}
    .daily-runs-stat.loss strong{color:#bd3d44}
    .daily-runs-table-wrap{
      overflow:auto;
      border:1px solid #e7ebf0;
      border-radius:11px;
      background:#fff;
    }
    .daily-runs-table{
      width:100%;
      border-collapse:collapse;
      min-width:720px;
    }
    .daily-runs-table th{
      padding:8px 10px!important;
      background:#f8fafc!important;
      color:#8994a2!important;
      font-size:7px!important;
      font-weight:700!important;
      text-align:left;
      border-bottom:1px solid #edf1f4;
    }
    .daily-runs-table td{
      padding:9px 10px!important;
      color:#35475b;
      font-size:8.5px!important;
      border-bottom:1px solid #f0f2f5;
      vertical-align:middle;
    }
    .daily-runs-table tbody tr:last-child td{border-bottom:0}
    .daily-runs-truck{
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:4px 7px;
      border-radius:8px;
      background:#eef4f8;
      color:#345574;
      font-weight:750;
      white-space:nowrap;
    }
    .daily-runs-route{font-weight:700;color:#26394f}
    .daily-runs-money{font-weight:700;white-space:nowrap}
    .daily-runs-margin{font-weight:750;color:#07845d;white-space:nowrap}
    .daily-runs-margin.loss{color:#bd3d44}
    .daily-runs-status{
      display:inline-flex;
      align-items:center;
      gap:5px;
      padding:4px 7px;
      border-radius:999px;
      background:#edf8f3;
      color:#087b5b;
      font-size:7.2px;
      font-weight:700;
      white-space:nowrap;
    }
    .daily-runs-status:before{
      content:"";
      width:4px;
      height:4px;
      border-radius:50%;
      background:#14a77b;
    }
    .daily-runs-empty{
      min-height:82px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      padding:14px 16px;
      border:1px dashed #dce3ea;
      border-radius:11px;
      background:#fbfcfd;
    }
    .daily-runs-empty strong{
      display:block;
      margin-bottom:4px;
      color:#31445a;
      font-size:10px;
    }
    .daily-runs-empty span{color:#8a95a3;font-size:8.5px}
    .daily-runs-empty button{
      flex:0 0 auto;
      min-height:34px;
      padding:0 11px;
      border:1px solid #e0e6ed;
      border-radius:9px;
      background:#fff;
      color:#485a6e;
      font:700 8px var(--font-ui,"Inter",sans-serif);
      cursor:pointer;
    }
    .daily-runs-empty button:hover{background:#f5f7fa}
    @media(max-width:900px){
      .daily-runs-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    @media(max-width:740px){
      .daily-runs-card{padding:12px}
      .daily-runs-head{align-items:flex-start;flex-direction:column}
      .daily-runs-date{width:100%}
      .daily-runs-summary{grid-template-columns:1fr 1fr}
      .daily-runs-empty{align-items:flex-start;flex-direction:column}
    }
  `;
  document.head.appendChild(style);

  function todayValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function expenseTotal(item) {
    return expenseFields.reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
  }

  function formatHumanDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Aujourd’hui';
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formatted = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function ensureContainer() {
    let container = document.getElementById('transport-insights');
    if (container) {
      container.className = 'transport-insights-lite';
      return container;
    }
    container = document.createElement('section');
    container.id = 'transport-insights';
    container.className = 'transport-insights-lite';
    const alert = dashboard.querySelector('.dashboard-alert');
    const dashboardMain = dashboard.querySelector('.dashboard-main');
    if (alert) alert.insertAdjacentElement('afterend', container);
    else if (dashboardMain) dashboardMain.insertAdjacentElement('beforebegin', container);
    else dashboard.appendChild(container);
    return container;
  }

  function latestActiveDate(trips) {
    const dates = trips
      .map((trip) => String(trip.date || ''))
      .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
      .sort((a, b) => b.localeCompare(a));
    return dates[0] || '';
  }

  function buildRows(trips, expenses, date) {
    const dayTrips = trips.filter((trip) => String(trip.date || '') === date);
    const expenseMap = new Map();
    expenses.forEach((item) => {
      expenseMap.set(String(item.trip_id), (expenseMap.get(String(item.trip_id)) || 0) + expenseTotal(item));
    });

    return dayTrips.map((trip) => {
      const revenue = Number(trip.revenue) || 0;
      const costs = expenseMap.get(String(trip.id)) || 0;
      return {
        id: trip.id,
        truck: trip.truck || '—',
        loading: trip.loading_zone || '—',
        unloading: trip.unloading_zone || '—',
        revenue,
        costs,
        margin: revenue - costs
      };
    }).sort((a, b) => String(a.truck).localeCompare(String(b.truck), 'fr', { numeric: true }));
  }

  function renderTable(rows) {
    if (!rows.length) return '';
    return `<div class="daily-runs-table-wrap"><table class="daily-runs-table">
      <thead><tr><th>Camion</th><th>Trajet</th><th>Statut</th><th>CA</th><th>Dépenses</th><th>Marge</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <td><span class="daily-runs-truck">${escapeHtml(row.truck)}</span></td>
        <td><span class="daily-runs-route">${escapeHtml(row.loading)} → ${escapeHtml(row.unloading)}</span></td>
        <td><span class="daily-runs-status">Enregistrée</span></td>
        <td class="daily-runs-money">${money(row.revenue)}</td>
        <td class="daily-runs-money">${money(row.costs)}</td>
        <td class="daily-runs-margin ${row.margin < 0 ? 'loss' : ''}">${money(row.margin)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  async function renderInsights(force = false) {
    if (loading) return;
    if (hasRendered && !force) return;
    loading = true;
    const container = ensureContainer();

    try {
      const [tripsResult, expensesResult] = await Promise.all([
        client.from('trips').select('*').order('date', { ascending: false }),
        client.from('trip_expenses').select('*')
      ]);
      if (tripsResult.error) throw tripsResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const trips = tripsResult.data || [];
      const expenses = expensesResult.data || [];
      const rows = buildRows(trips, expenses, selectedDate);
      const truckCount = new Set(rows.map((row) => row.truck).filter(Boolean)).size;
      const totals = rows.reduce((acc, row) => {
        acc.revenue += row.revenue;
        acc.costs += row.costs;
        acc.margin += row.margin;
        return acc;
      }, { revenue: 0, costs: 0, margin: 0 });
      const latest = latestActiveDate(trips);

      container.innerHTML = `<article class="daily-runs-card">
        <div class="daily-runs-head">
          <div class="daily-runs-title"><small>Exploitation quotidienne</small><h3>Courses du jour</h3><p>${escapeHtml(formatHumanDate(selectedDate))}</p></div>
          <input class="daily-runs-date" id="daily-runs-date" type="date" value="${escapeHtml(selectedDate)}" />
        </div>
        <div class="daily-runs-summary">
          <div class="daily-runs-stat"><span>Courses</span><strong>${rows.length}</strong></div>
          <div class="daily-runs-stat"><span>Camions mobilisés</span><strong>${truckCount}</strong></div>
          <div class="daily-runs-stat"><span>CA du jour</span><strong>${money(totals.revenue)}</strong></div>
          <div class="daily-runs-stat ${totals.margin < 0 ? 'loss' : 'profit'}"><span>Marge du jour</span><strong>${money(totals.margin)}</strong></div>
        </div>
        ${rows.length ? renderTable(rows) : `<div class="daily-runs-empty"><div><strong>Aucune course enregistrée pour cette journée.</strong><span>Sélectionnez une autre date ou créez une nouvelle mission.</span></div>${latest && latest !== selectedDate ? `<button type="button" id="daily-runs-last-active">Voir le dernier jour actif</button>` : ''}</div>`}
      </article>`;

      document.getElementById('daily-runs-date')?.addEventListener('change', (event) => {
        selectedDate = event.target.value || todayValue();
        hasRendered = false;
        renderInsights(true);
      });

      document.getElementById('daily-runs-last-active')?.addEventListener('click', () => {
        if (!latest) return;
        selectedDate = latest;
        hasRendered = false;
        renderInsights(true);
      });

      hasRendered = true;
    } catch (error) {
      console.error('Erreur courses du jour dashboard :', error);
      if (!hasRendered) {
        container.innerHTML = '<article class="daily-runs-card"><div class="daily-runs-empty"><div><strong>Courses du jour indisponibles</strong><span>Les indicateurs principaux restent accessibles.</span></div></div></article>';
      }
    } finally {
      loading = false;
    }
  }

  function onNavigation() {
    if (location.hash === '#dashboard' || !location.hash) renderInsights(false);
  }

  window.addEventListener('hashchange', onNavigation);
  document.addEventListener('nexis:auth-changed', () => window.setTimeout(() => renderInsights(true), 100));
  onNavigation();
})();