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

  let loading = false;
  let hasRendered = false;

  const style = document.createElement('style');
  style.textContent = `
    .transport-insights-lite{margin-top:13px}
    .transport-insight-lite-card{
      min-width:0;
      overflow:hidden;
      border:1px solid rgba(223,229,237,.96);
      border-radius:17px;
      background:rgba(255,255,255,.96);
      box-shadow:0 12px 34px rgba(31,48,73,.07);
      padding:15px 18px 12px;
    }
    .transport-insight-lite-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      margin-bottom:5px;
    }
    .transport-insight-lite-head small{
      display:block;
      margin-bottom:3px;
      color:#98a2af;
      font-size:7px;
      font-weight:750;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .transport-insight-lite-head h3{
      margin:0;
      color:#1a2b40;
      font-family:var(--font-display,"Manrope","Inter",sans-serif);
      font-size:13px;
      font-weight:750;
      letter-spacing:-.035em;
    }
    .transport-insight-lite-head p{
      margin:3px 0 0;
      color:#8a95a3;
      font-size:8.5px;
      font-weight:450;
    }
    .transport-period-lite{
      display:inline-flex;
      align-items:center;
      gap:6px;
      flex:0 0 auto;
      padding:5px 8px;
      border:1px solid #e5e9ee;
      border-radius:999px;
      background:#fafbfc;
      color:#7b8796;
      font-size:7.5px;
      font-weight:700;
      white-space:nowrap;
    }
    .transport-period-lite:before{
      content:"";
      width:5px;
      height:5px;
      border-radius:50%;
      background:#ff9414;
    }
    .transport-chart-lite-wrap{position:relative;min-height:132px}
    .transport-line-lite{display:block;width:100%;height:132px;overflow:visible}
    .transport-grid-lite{stroke:#f0f3f6;stroke-width:1}
    .transport-axis-lite{fill:#9aa4b1;font-family:var(--font-ui,"Inter",sans-serif);font-size:8px;font-weight:550}
    .transport-line-lite-revenue{fill:none;stroke:#f68a16;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
    .transport-line-lite-margin{fill:none;stroke:#15906d;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
    .transport-point-lite-revenue{fill:#fff;stroke:#f68a16;stroke-width:1.9}
    .transport-point-lite-margin{fill:#fff;stroke:#15906d;stroke-width:1.9}
    .transport-legend-lite{
      display:flex;
      align-items:center;
      gap:14px;
      margin-top:0;
      color:#7f8997;
      font-size:8px;
      font-weight:600;
    }
    .transport-legend-lite span{display:inline-flex;align-items:center;gap:6px}
    .transport-legend-lite i{display:block;width:12px;height:2px;border-radius:999px;background:#f68a16}
    .transport-legend-lite span:last-child i{background:#15906d}
    .transport-lite-empty{
      min-height:120px;
      display:grid;
      place-content:center;
      text-align:center;
      color:#8793a2;
      font-size:9px;
    }
    .transport-lite-empty strong{display:block;margin-bottom:4px;color:#31445a;font-size:11px}
    @media(max-width:740px){
      .transport-insight-lite-card{padding:13px}
      .transport-line-lite{height:125px}
      .transport-chart-lite-wrap{min-height:125px}
    }
  `;
  document.head.appendChild(style);

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
    return ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc'].reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
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
    const dashboardMain = dashboard.querySelector('.dashboard-main');
    if (dashboardMain) dashboardMain.insertAdjacentElement('afterend', container);
    else dashboard.appendChild(container);
    return container;
  }

  function smoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      d += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  }

  function buildChart(months, series) {
    const width = 900;
    const height = 126;
    const left = 42;
    const right = 17;
    const top = 10;
    const bottom = 25;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const maxValue = Math.max(1, ...series.flatMap((item) => [item.revenue, Math.max(0, item.margin)]));
    const magnitude = Math.pow(10, Math.max(0, String(Math.floor(maxValue)).length - 2));
    const roundedMax = Math.max(1000, Math.ceil(maxValue / magnitude) * magnitude);
    const x = (index) => left + (months.length <= 1 ? plotW / 2 : (index / (months.length - 1)) * plotW);
    const y = (value) => top + plotH - (Math.max(0, value) / roundedMax) * plotH;
    const revenuePoints = series.map((item, index) => ({ x: x(index), y: y(item.revenue), value: item.revenue }));
    const marginPoints = series.map((item, index) => ({ x: x(index), y: y(item.margin), value: item.margin }));
    const grid = [0, 1].map((ratio) => {
      const gy = top + plotH - ratio * plotH;
      return `<line class="transport-grid-lite" x1="${left}" y1="${gy}" x2="${left + plotW}" y2="${gy}"/><text class="transport-axis-lite" x="${left - 8}" y="${gy + 3}" text-anchor="end">${shortFormatter.format(roundedMax * ratio)}</text>`;
    }).join('');
    const labels = months.map((month, index) => `<text class="transport-axis-lite" x="${x(index)}" y="${height - 6}" text-anchor="middle">${month.label}</text>`).join('');
    const revenueDots = revenuePoints.map((point, index) => `<circle class="transport-point-lite-revenue" cx="${point.x}" cy="${point.y}" r="2.8"><title>${months[index].label} · CA ${money(point.value)}</title></circle>`).join('');
    const marginDots = marginPoints.map((point, index) => `<circle class="transport-point-lite-margin" cx="${point.x}" cy="${point.y}" r="2.8"><title>${months[index].label} · Marge ${money(point.value)}</title></circle>`).join('');
    return `<svg class="transport-line-lite" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Évolution du chiffre d'affaires et de la marge">${grid}<path class="transport-line-lite-revenue" d="${smoothPath(revenuePoints)}"/><path class="transport-line-lite-margin" d="${smoothPath(marginPoints)}"/>${revenueDots}${marginDots}${labels}</svg>`;
  }

  async function renderInsights(force = false) {
    if (loading) return;
    if (hasRendered && !force) return;
    loading = true;
    const container = ensureContainer();
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
      const expenseByTrip = new Map();
      expenses.forEach((item) => expenseByTrip.set(String(item.trip_id), (expenseByTrip.get(String(item.trip_id)) || 0) + expenseTotal(item)));
      const monthly = months.map((month) => {
        const monthTrips = trips.filter((trip) => String(trip.date || '').slice(0, 7) === month.key);
        const revenue = monthTrips.reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
        const variable = monthTrips.reduce((sum, trip) => sum + (expenseByTrip.get(String(trip.id)) || 0), 0);
        return { revenue, margin: revenue - variable };
      });
      container.innerHTML = `<article class="transport-insight-lite-card"><div class="transport-insight-lite-head"><div><small>Tendance</small><h3>Activité sur 6 mois</h3><p>Chiffre d’affaires et marge opérationnelle.</p></div><span class="transport-period-lite">6 mois</span></div><div class="transport-chart-lite-wrap">${buildChart(months, monthly)}</div><div class="transport-legend-lite"><span><i></i>CA</span><span><i></i>Marge</span></div></article>`;
      hasRendered = true;
    } catch (error) {
      console.error('Erreur graphique dashboard :', error);
      if (!hasRendered) container.innerHTML = '<article class="transport-insight-lite-card"><div class="transport-lite-empty"><div><strong>Graphique indisponible</strong>Les indicateurs principaux restent accessibles.</div></div></article>';
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