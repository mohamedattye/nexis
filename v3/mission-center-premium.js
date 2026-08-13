(() => {
  'use strict';

  if (window.__NEXIS_MISSION_CENTER_PREMIUM__) return;
  window.__NEXIS_MISSION_CENTER_PREMIUM__ = true;

  const view = document.getElementById('trips');
  const body = document.getElementById('missions-body');
  const table = body?.closest('table');
  const panel = view?.querySelector(':scope > .panel');
  const filters = view?.querySelector('.filters');
  const resultCount = document.getElementById('missions-result-count');
  if (!view || !body || !table || !panel || !filters) return;

  const db = window.NexisAuth?.client || window.supabase?.createClient?.();
  const moneyFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const clientNames = new Map();
  const tripClients = new Map();
  let clientFilter = '';
  let enhancing = false;

  const style = document.createElement('style');
  style.textContent = `
    #trips{max-width:none}
    #trips>.panel{padding:20px!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:14px!important;box-shadow:0 6px 22px rgba(22,42,65,.035)!important;overflow:visible!important}
    #trips>.panel:before{display:none!important}
    #trips .panel-head{align-items:flex-end!important;margin-bottom:15px!important;padding:0!important}
    #trips .panel-head small{color:#8a97a7!important;font-size:9.5px!important;font-weight:750!important;letter-spacing:.07em!important}
    #trips .panel-head h2{margin-top:5px!important;font-size:18px!important;letter-spacing:-.025em!important;color:#182a40!important}
    #trips .panel-description{margin-top:5px!important;color:#7f8c9c!important;font-size:10.5px!important;line-height:1.4!important}
    #trips .panel-head>.primary{display:none!important}

    .mission-center-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
    .mission-center-kpi{min-width:0;padding:12px 13px;border:1px solid #e4eaf0;border-radius:11px;background:#fafbfd}
    .mission-center-kpi span{display:block;color:#8290a1;font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.055em}
    .mission-center-kpi strong{display:block;margin-top:5px;color:#24384e;font-size:14px;line-height:1.2;font-weight:760;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mission-center-kpi.margin strong{color:#0a8e66}
    .mission-center-kpi.margin.negative strong{color:#bd3d44}

    #trips .filters{display:grid!important;grid-template-columns:minmax(260px,1fr) 155px 175px 190px auto!important;gap:8px!important;margin-bottom:12px!important;padding:9px!important;border:1px solid #e5eaf0!important;border-radius:12px!important;background:#f8fafc!important}
    #trips .filters:before,#trips .filters:after{display:none!important}
    #trips .filters input,#trips .filters select{height:40px!important;margin:0!important;padding:0 11px!important;border:1px solid #d9e1e9!important;border-radius:9px!important;background:#fff!important;color:#34495f!important;font-size:10.5px!important;font-weight:550!important;box-shadow:none!important}
    #mission-search{padding-left:11px!important}
    .mission-filter-reset{height:40px;padding:0 11px;border:1px solid #dfe5eb;border-radius:9px;background:#fff;color:#607186;font:700 9.5px var(--font-ui,"Inter",sans-serif);cursor:pointer;white-space:nowrap}
    .mission-filter-reset:hover{background:#f5f7f9}

    #trips .table-scroll{margin:0!important;border-radius:12px!important;border:1px solid #e4e9ef!important;box-shadow:none!important;background:#fff!important;overflow:auto}
    #trips table{width:100%!important;min-width:980px!important;border-collapse:separate!important;border-spacing:0!important}
    #trips thead th{height:41px!important;padding:0 12px!important;background:#f8fafc!important;border-bottom:1px solid #e2e8ef!important;color:#758397!important;font-size:9.5px!important;font-weight:750!important;letter-spacing:.045em!important;text-transform:uppercase!important;white-space:nowrap!important;text-align:left!important}
    #trips tbody td{height:54px!important;padding:11px 12px!important;border-bottom:1px solid #edf1f5!important;color:#34485e!important;font-size:11px!important;line-height:1.4!important;vertical-align:middle!important}
    #trips tbody tr:last-child td{border-bottom:0!important}
    #trips tbody tr:not(.mission-empty-row){cursor:pointer;transition:background .14s ease,box-shadow .14s ease}
    #trips tbody tr:not(.mission-empty-row):hover{background:#fbfcfd!important;box-shadow:inset 2px 0 0 #ff8a00!important}
    #trips tbody tr[data-client-hidden="true"]{display:none!important}

    #trips .truck-badge{padding:5px 8px!important;border-radius:7px!important;background:#eef4fa!important;color:#315876!important;font-size:10px!important;font-weight:750!important}
    #trips .mission-client-name{max-width:160px;color:#293f56;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #trips .mission-client-empty{color:#9aa6b3;font-weight:500}
    #trips .mission-route{display:flex;align-items:center;gap:7px;font-weight:620;color:#2b4057;white-space:nowrap}
    #trips .mission-route-arrow{color:#d57708;font-size:13px;font-weight:800}
    #trips .mission-money{font-weight:650;white-space:nowrap;color:#405268}
    #trips .mission-expense{color:#69788a}
    #trips .positive,#trips .negative{font-weight:750!important;white-space:nowrap!important}
    #trips .mission-open-cell{text-align:right!important;width:68px}
    #trips .mission-open-button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid #dfe5eb;border-radius:9px;background:#fff;color:#5f7084;cursor:pointer;transition:background .14s ease,border-color .14s ease,color .14s ease}
    #trips .mission-open-button:hover{background:#fff6eb;border-color:#f1c58d;color:#b66100}
    #trips .mission-open-button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

    #trips .mission-empty-cell{height:190px!important;padding:24px!important;text-align:center!important;background:#fff!important}
    .mission-empty-state{display:grid;justify-items:center;gap:7px;max-width:340px;margin:auto}
    .mission-empty-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#fff4e8;color:#d66f00}
    .mission-empty-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .mission-empty-state strong{font-size:12px;color:#263a50}.mission-empty-state span{font-size:10px;line-height:1.5;color:#8491a1}.mission-empty-state .primary{margin-top:4px;min-height:36px!important;padding:0 12px!important;font-size:10px!important}

    @media(max-width:1200px){#trips .filters{grid-template-columns:1fr 150px 170px!important}.mission-client-filter{grid-column:1/3}.mission-filter-reset{grid-column:3}}
    @media(max-width:820px){.mission-center-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#trips>.panel{padding:15px!important}#trips .filters{grid-template-columns:1fr!important}.mission-client-filter,.mission-filter-reset{grid-column:auto!important}#trips table{min-width:900px!important}}
  `;
  document.head.appendChild(style);

  function money(value) {
    return `${moneyFormatter.format(Number(value) || 0)} FCFA`;
  }

  function parseMoney(text) {
    const normalized = String(text || '').replace(/[^0-9-]/g, '');
    return Number(normalized) || 0;
  }

  function eyeIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.4-5.2 9.2-5.2S21.2 12 21.2 12s-3.4 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  }

  function emptyIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8h7l3 3V20H7z"/><path d="M14 3.8V7h3M9.5 11h5M9.5 14h3.5"/></svg>';
  }

  function ensureKpis() {
    if (document.getElementById('mission-center-kpis')) return;
    const kpis = document.createElement('div');
    kpis.id = 'mission-center-kpis';
    kpis.className = 'mission-center-kpis';
    kpis.innerHTML = `
      <article class="mission-center-kpi"><span>Missions</span><strong id="mission-center-count">0</strong></article>
      <article class="mission-center-kpi"><span>Chiffre d’affaires</span><strong id="mission-center-revenue">0 FCFA</strong></article>
      <article class="mission-center-kpi"><span>Dépenses</span><strong id="mission-center-expenses">0 FCFA</strong></article>
      <article class="mission-center-kpi margin"><span>Marge</span><strong id="mission-center-margin">0 FCFA</strong></article>`;
    filters.insertAdjacentElement('beforebegin', kpis);
  }

  function ensureClientFilter() {
    let select = document.getElementById('mission-client-filter');
    if (!select) {
      select = document.createElement('select');
      select.id = 'mission-client-filter';
      select.className = 'mission-client-filter';
      select.innerHTML = '<option value="">Tous les clients</option>';
      filters.appendChild(select);
      select.addEventListener('change', () => {
        clientFilter = select.value;
        applyClientFilter();
      });
    }

    if (!document.getElementById('mission-filter-reset')) {
      const reset = document.createElement('button');
      reset.id = 'mission-filter-reset';
      reset.type = 'button';
      reset.className = 'mission-filter-reset';
      reset.textContent = 'Réinitialiser';
      reset.addEventListener('click', () => {
        const search = document.getElementById('mission-search');
        const month = document.getElementById('mission-month');
        const truck = document.getElementById('mission-truck-filter');
        if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles:true })); }
        if (month) { month.value = ''; month.dispatchEvent(new Event('change', { bubbles:true })); }
        if (truck) { truck.value = ''; truck.dispatchEvent(new Event('change', { bubbles:true })); }
        select.value = '';
        clientFilter = '';
        window.setTimeout(applyClientFilter, 20);
      });
      filters.appendChild(reset);
    }
  }

  function ensureClientHeader() {
    const row = table.querySelector('thead tr');
    if (!row || row.querySelector('[data-mission-client-head]')) return;
    const truckHead = row.children[1];
    const clientHead = document.createElement('th');
    clientHead.dataset.missionClientHead = 'true';
    clientHead.textContent = 'Client';
    truckHead?.insertAdjacentElement('afterend', clientHead);
  }

  function populateClientFilter() {
    const select = document.getElementById('mission-client-filter');
    if (!select) return;
    const selected = select.value;
    const names = [...clientNames.entries()].sort((a,b) => a[1].localeCompare(b[1], 'fr'));
    select.innerHTML = '<option value="">Tous les clients</option>' + names.map(([id,name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join('');
    select.value = names.some(([id]) => id === selected) ? selected : '';
    clientFilter = select.value;
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  async function loadClientContext() {
    if (!db) return;
    try {
      const [clientsResult, tripsResult] = await Promise.all([
        db.from('clients').select('id,company_name').order('company_name', { ascending:true }),
        db.from('trips').select('id,client_id')
      ]);
      if (clientsResult.error) throw clientsResult.error;
      if (tripsResult.error) throw tripsResult.error;
      clientNames.clear();
      tripClients.clear();
      (clientsResult.data || []).forEach(item => clientNames.set(String(item.id), item.company_name || 'Client'));
      (tripsResult.data || []).forEach(item => tripClients.set(String(item.id), item.client_id ? String(item.client_id) : ''));
      populateClientFilter();
      enhanceRows();
    } catch (error) {
      console.warn('Centre des missions — clients :', error);
    }
  }

  function enhanceEmptyRow(row, message) {
    row.classList.add('mission-empty-row');
    message.colSpan = 8;
    message.classList.add('mission-empty-cell');
    if (!message.querySelector('.mission-empty-state')) {
      message.innerHTML = `<div class="mission-empty-state"><span class="mission-empty-icon">${emptyIcon()}</span><strong>Aucune mission à afficher</strong><span>Créez votre première mission ou modifiez les filtres.</span><button class="primary" type="button" data-view="new-trip">Créer une mission</button></div>`;
    }
  }

  function enhanceRows() {
    if (enhancing) return;
    enhancing = true;
    try {
      ensureClientHeader();
      const rows = [...body.querySelectorAll('tr')];
      rows.forEach(row => {
        const message = row.querySelector('.table-message');
        if (message) {
          enhanceEmptyRow(row, message);
          return;
        }

        let cells = [...row.querySelectorAll('td')];
        if (cells.length < 7) return;
        const open = row.querySelector('[data-open-mission]');
        const tripId = String(open?.dataset.openMission || '');

        if (!row.querySelector('[data-mission-client-cell]')) {
          const clientCell = document.createElement('td');
          clientCell.dataset.missionClientCell = 'true';
          cells[1].insertAdjacentElement('afterend', clientCell);
        }

        cells = [...row.querySelectorAll('td')];
        const clientCell = row.querySelector('[data-mission-client-cell]');
        const clientId = tripClients.get(tripId) || '';
        const clientName = clientNames.get(clientId) || '';
        clientCell.dataset.clientId = clientId;
        clientCell.innerHTML = clientName
          ? `<div class="mission-client-name" title="${escapeHtml(clientName)}">${escapeHtml(clientName)}</div>`
          : '<span class="mission-client-empty">—</span>';

        row.classList.add('mission-premium-row');
        const routeCell = cells[3];
        if (routeCell) {
          const route = routeCell.textContent.split('→').map(part => part.trim());
          if (route.length === 2 && !routeCell.querySelector('.mission-route')) {
            routeCell.innerHTML = `<span class="mission-route"><span>${escapeHtml(route[0])}</span><span class="mission-route-arrow">→</span><span>${escapeHtml(route[1])}</span></span>`;
          }
        }
        cells[4]?.classList.add('mission-money');
        cells[5]?.classList.add('mission-money','mission-expense');
        cells[7]?.classList.add('mission-open-cell');

        if (open && !open.classList.contains('mission-open-button')) {
          open.className = 'mission-open-button';
          open.innerHTML = eyeIcon();
          open.setAttribute('aria-label','Ouvrir la fiche de mission');
          open.title = 'Voir la mission';
        }

        if (!row.dataset.openBound) {
          row.dataset.openBound = 'true';
          row.addEventListener('click', event => {
            if (event.target.closest('button,a,input,select')) return;
            row.querySelector('[data-open-mission]')?.click();
          });
        }
      });
      applyClientFilter();
    } finally {
      enhancing = false;
    }
  }

  function updateKpis() {
    const rows = [...body.querySelectorAll('tr')].filter(row => !row.classList.contains('mission-empty-row') && row.dataset.clientHidden !== 'true');
    let revenue = 0;
    let expenses = 0;
    let margin = 0;
    rows.forEach(row => {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length < 8) return;
      revenue += parseMoney(cells[4]?.textContent);
      expenses += parseMoney(cells[5]?.textContent);
      margin += parseMoney(cells[6]?.textContent);
    });
    document.getElementById('mission-center-count').textContent = String(rows.length);
    document.getElementById('mission-center-revenue').textContent = money(revenue);
    document.getElementById('mission-center-expenses').textContent = money(expenses);
    const marginEl = document.getElementById('mission-center-margin');
    if (marginEl) marginEl.textContent = money(margin);
    const marginCard = marginEl?.closest('.mission-center-kpi');
    marginCard?.classList.toggle('negative', margin < 0);
    if (resultCount) resultCount.textContent = `${rows.length} mission${rows.length > 1 ? 's' : ''} affichée${rows.length > 1 ? 's' : ''}`;
  }

  function applyClientFilter() {
    const rows = [...body.querySelectorAll('tr')];
    rows.forEach(row => {
      if (row.classList.contains('mission-empty-row')) return;
      const id = row.querySelector('[data-mission-client-cell]')?.dataset.clientId || '';
      row.dataset.clientHidden = clientFilter && id !== clientFilter ? 'true' : 'false';
    });
    updateKpis();
  }

  view.classList.add('mission-center-premium');
  ensureKpis();
  ensureClientFilter();
  ensureClientHeader();
  enhanceRows();

  new MutationObserver(() => window.requestAnimationFrame(enhanceRows)).observe(body, { childList:true, subtree:true });
  ['mission-search','mission-month','mission-truck-filter'].forEach(id => {
    const element = document.getElementById(id);
    element?.addEventListener('input', () => window.setTimeout(updateKpis, 20));
    element?.addEventListener('change', () => window.setTimeout(updateKpis, 20));
  });

  Promise.resolve(window.NexisAuth?.ready).finally(loadClientContext);
})();