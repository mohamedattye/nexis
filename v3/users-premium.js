(() => {
  'use strict';

  if (window.__NEXIS_USERS_PREMIUM__) return;
  window.__NEXIS_USERS_PREMIUM__ = true;

  const view = document.getElementById('users');
  if (!view) return;

  const style = document.createElement('style');
  style.textContent = `
    #users{max-width:none}
    #users .users-page{gap:13px}
    #users .users-head{margin:0 0 2px!important}
    #users .users-head h2{display:none!important}
    #users .users-head p{margin:0!important;color:#758196!important;font-size:10.5px!important}

    #users .users-kpis{gap:12px!important}
    #users .users-kpi{
      position:relative;
      overflow:hidden;
      min-height:102px;
      padding:16px 16px 15px 58px!important;
      border-radius:16px!important;
      box-shadow:0 12px 34px rgba(31,48,73,.07)!important;
    }
    #users .users-kpi:before{
      content:"";
      position:absolute;
      left:16px;
      top:17px;
      width:31px;
      height:31px;
      border-radius:10px;
      background:#eef4fa;
      box-shadow:0 6px 15px rgba(31,48,73,.055);
    }
    #users .users-kpi:after{
      position:absolute;
      left:24px;
      top:23px;
      width:15px;
      height:15px;
      display:grid;
      place-items:center;
      color:#315b82;
      font-size:14px;
      font-weight:900;
      line-height:1;
    }
    #users .users-kpi:nth-child(1):after{content:"▣"}
    #users .users-kpi:nth-child(2):before{background:#eaf8f2}
    #users .users-kpi:nth-child(2):after{content:"✓";color:#07845d}
    #users .users-kpi:nth-child(3):before{background:#fff1df}
    #users .users-kpi:nth-child(3):after{content:"A";color:#c96a00;font-size:11px}
    #users .users-kpi span{font-size:8.5px!important;text-transform:uppercase;letter-spacing:.055em!important}
    #users .users-kpi strong{font-size:20px!important;letter-spacing:-.035em}

    #users .users-panel{
      position:relative;
      overflow:hidden;
      padding:18px!important;
      border-radius:17px!important;
      background:radial-gradient(circle at 100% 0,rgba(255,145,18,.055),transparent 24%),rgba(255,255,255,.97)!important;
      box-shadow:0 12px 34px rgba(31,48,73,.07)!important;
    }
    #users .users-panel:before{
      content:"";
      position:absolute;
      inset:0 0 auto;
      height:4px;
      background:linear-gradient(90deg,#ff8a00,#ffb34d 38%,#1b3a59 100%);
    }

    #users .users-toolbar{
      position:relative;
      display:grid!important;
      grid-template-columns:minmax(300px,1fr) auto!important;
      gap:10px!important;
      margin:3px 0 11px!important;
      padding:10px!important;
      border:1px solid #e5eaf0;
      border-radius:14px;
      background:linear-gradient(180deg,#fafbfd,#f7f9fc);
    }
    #users .users-toolbar:before{
      content:"";
      position:absolute;
      left:24px;
      top:50%;
      width:14px;
      height:14px;
      transform:translateY(-50%);
      border:1.8px solid #8794a5;
      border-radius:50%;
      pointer-events:none;
      z-index:2;
    }
    #users .users-toolbar:after{
      content:"";
      position:absolute;
      left:36px;
      top:calc(50% + 5px);
      width:6px;
      height:1.8px;
      transform:rotate(45deg);
      border-radius:2px;
      background:#8794a5;
      pointer-events:none;
      z-index:2;
    }
    #users-search{height:42px!important;margin:0!important;padding-left:38px!important;border-radius:12px!important;background:#fff!important;font-weight:620}
    #users .users-filter-tabs{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
    #users .users-filter-tab{
      min-height:34px;
      padding:7px 10px;
      border:1px solid transparent;
      border-radius:9px;
      background:transparent;
      color:#68758a;
      font:inherit;
      font-size:8.5px;
      font-weight:850;
      cursor:pointer;
      transition:background .14s ease,border-color .14s ease,color .14s ease;
    }
    #users .users-filter-tab:hover{background:#fff;border-color:#e1e7ee;color:#34465c}
    #users .users-filter-tab.active{background:#fff3e3;border-color:#ffd7a2;color:#a95700;box-shadow:0 5px 12px rgba(255,138,0,.07)}

    #users .users-help{
      position:relative;
      margin:0 0 12px!important;
      padding:11px 13px 11px 42px!important;
      border-radius:12px!important;
      background:linear-gradient(145deg,#f8fafc,#fff)!important;
      line-height:1.55!important;
    }
    #users .users-help:before{
      content:"i";
      position:absolute;
      left:12px;
      top:10px;
      width:21px;
      height:21px;
      display:grid;
      place-items:center;
      border-radius:7px;
      background:#edf4fb;
      color:#315f88;
      font-size:10px;
      font-weight:900;
    }

    #users .users-table-wrap{
      border-radius:14px!important;
      border:1px solid #e4e9ef!important;
      box-shadow:0 7px 20px rgba(31,48,73,.035);
      background:#fff;
    }
    #users .users-table{min-width:850px!important;border-collapse:separate!important;border-spacing:0!important}
    #users .users-table th{
      height:42px;
      padding:0 12px!important;
      background:#f5f8fb!important;
      border-bottom:1px solid #e2e8ef!important;
      color:#708095!important;
      font-size:8.5px!important;
      font-weight:850!important;
      letter-spacing:.06em!important;
      text-transform:uppercase;
      white-space:nowrap;
    }
    #users .users-table td{
      height:66px;
      padding:10px 12px!important;
      border-bottom:1px solid #edf1f5!important;
      color:#2d3c50;
      font-size:10.5px!important;
    }
    #users .users-table tr:last-child td{border-bottom:0!important}
    #users .users-table tbody tr:not(.users-empty-row){transition:background .14s ease,box-shadow .14s ease}
    #users .users-table tbody tr:not(.users-empty-row):hover{background:#fbfcfe!important;box-shadow:inset 3px 0 0 #ff9414}
    #users .users-identity{position:relative;padding-left:43px;min-height:34px;display:flex;flex-direction:column;justify-content:center}
    #users .users-avatar{
      position:absolute;
      left:0;
      top:50%;
      transform:translateY(-50%);
      width:33px;
      height:33px;
      display:grid;
      place-items:center;
      border-radius:11px;
      background:linear-gradient(145deg,#eaf1f8,#f7fafc);
      color:#315b82;
      font-size:10px;
      font-weight:900;
      box-shadow:0 5px 12px rgba(31,48,73,.06);
    }
    #users .users-identity strong{font-size:11px!important;color:#24364d}
    #users .users-identity small{font-size:9px!important}
    #users .users-badge{min-height:25px!important;padding:0 9px!important;border-radius:999px!important}
    #users .users-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#f2f4f7;color:#687386}
    #users .users-status.active{background:#eaf8f2;color:#087b58}
    #users .users-current{min-height:29px!important;padding:0 9px!important;border:1px solid #dfe5ec;background:#f7f9fc!important}
    #users .users-action{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:5px;
      min-height:32px!important;
      padding:6px 9px!important;
      border-radius:9px!important;
      transition:background .14s ease,border-color .14s ease,color .14s ease,transform .14s ease!important;
    }
    #users .users-action:hover{transform:translateY(-1px)}
    #users .users-action svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

    #users .users-dialog{width:min(470px,100%)!important;border-radius:18px!important;box-shadow:0 30px 80px rgba(6,22,40,.3)!important}
    #users .users-dialog-head{padding:18px 19px!important;background:linear-gradient(145deg,#fff,#f8fafc)}
    #users .users-dialog-head h3{font-size:17px!important;letter-spacing:-.025em}
    #users .users-dialog-close{width:34px!important;height:34px!important;border-radius:10px!important}
    #users .users-dialog-body{padding:19px!important;gap:14px!important}
    #users .users-dialog-body input,#users .users-dialog-body select{height:42px!important;border-radius:11px!important;background:#fff!important}
    #users .users-dialog-note{padding:11px 12px!important;border-radius:11px!important;background:#fff8ed!important}
    #users .users-dialog-actions button{height:40px!important;border-radius:10px!important;padding:0 14px!important}
    #users .users-save{background:linear-gradient(135deg,#ff9b22,#ff8300)!important;box-shadow:0 8px 18px rgba(255,132,0,.2)}

    #users .users-empty-cell{
      height:220px!important;
      padding:24px!important;
      text-align:center;
      background:linear-gradient(180deg,#fff,#fbfcfe);
    }
    .users-premium-empty{display:grid;justify-items:center;gap:8px;max-width:350px;margin:auto}
    .users-premium-empty-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:#fff3e3;color:#d66f00;box-shadow:0 8px 20px rgba(255,138,0,.11)}
    .users-premium-empty-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .users-premium-empty strong{font-size:13px;color:#21334a}
    .users-premium-empty span{font-size:10px;line-height:1.55;color:#7b8797}

    @media(max-width:900px){
      #users .users-toolbar{grid-template-columns:1fr!important}
      #users .users-toolbar:before,#users .users-toolbar:after{top:31px}
      #users .users-filter-tabs{justify-content:flex-start}
    }
    @media(max-width:740px){
      #users .users-kpis{grid-template-columns:1fr!important}
      #users .users-toolbar{padding:8px!important}
      #users .users-toolbar:before,#users .users-toolbar:after{display:none}
      #users-search{padding-left:11px!important}
      #users .users-filter-tabs{display:grid;grid-template-columns:1fr 1fr;width:100%}
      #users .users-filter-tab{width:100%}
    }
  `;
  document.head.appendChild(style);

  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.5 4 4-.5L18.8 8.7l-3.5-3.5z"/><path d="m13.8 6.7 3.5 3.5"/></svg>',
    power: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8v8.1"/><path d="M6.2 6.2a8 8 0 1 0 11.6 0"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-4 2.4-6 5.5-6s5 2 5.5 6M16 8.5a2.5 2.5 0 0 1 0 5M17 14c2.1.5 3.2 2.2 3.5 5"/></svg>'
  };

  let activeFilter = 'all';

  function initials(name, email) {
    const source = String(name || email || 'U').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
  }

  function ensureFilters() {
    const toolbar = view.querySelector('.users-toolbar');
    if (!toolbar || toolbar.querySelector('.users-filter-tabs')) return;
    const filters = document.createElement('div');
    filters.className = 'users-filter-tabs';
    filters.innerHTML = `
      <button class="users-filter-tab active" type="button" data-users-filter="all">Tous</button>
      <button class="users-filter-tab" type="button" data-users-filter="admin">Administrateurs</button>
      <button class="users-filter-tab" type="button" data-users-filter="operator">Opérateurs</button>
      <button class="users-filter-tab" type="button" data-users-filter="inactive">Inactifs</button>`;
    toolbar.appendChild(filters);
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-users-filter]');
      if (!button) return;
      activeFilter = button.dataset.usersFilter;
      filters.querySelectorAll('.users-filter-tab').forEach((item) => item.classList.toggle('active', item === button));
      applyFilter();
    });
  }

  function applyFilter() {
    const body = document.getElementById('users-body');
    if (!body) return;
    [...body.querySelectorAll('tr')].forEach((row) => {
      if (row.classList.contains('users-empty-row')) return;
      const role = row.querySelector('.users-badge')?.classList.contains('admin') ? 'admin' : 'operator';
      const inactive = !row.querySelector('.users-status')?.classList.contains('active');
      const visible = activeFilter === 'all' || activeFilter === role || (activeFilter === 'inactive' && inactive);
      row.hidden = !visible;
    });
  }

  function enhanceRows() {
    const body = document.getElementById('users-body');
    if (!body) return;

    [...body.querySelectorAll('tr')].forEach((row) => {
      const empty = row.querySelector('.users-empty,.users-loading,.users-error');
      if (empty) {
        row.classList.add('users-empty-row');
        empty.classList.add('users-empty-cell');
        const loading = empty.textContent.includes('Chargement');
        const error = empty.classList.contains('users-error');
        if (!empty.querySelector('.users-premium-empty')) {
          empty.innerHTML = `<div class="users-premium-empty"><span class="users-premium-empty-icon">${icons.users}</span><strong>${error ? 'Chargement impossible' : loading ? 'Chargement des utilisateurs' : 'Aucun utilisateur à afficher'}</strong><span>${error ? 'Vérifiez vos droits administrateur et la connexion à Supabase.' : loading ? 'Nexis récupère les comptes et leurs autorisations.' : 'Modifiez la recherche ou le filtre sélectionné.'}</span></div>`;
        }
        return;
      }

      const identity = row.querySelector('.users-identity');
      if (identity && !identity.querySelector('.users-avatar')) {
        const name = identity.querySelector('strong')?.textContent.trim();
        const email = identity.querySelector('small')?.textContent.trim();
        identity.insertAdjacentHTML('afterbegin', `<span class="users-avatar">${initials(name, email)}</span>`);
      }

      const edit = row.querySelector('[data-edit-user]');
      if (edit && !edit.dataset.premiumReady) {
        edit.dataset.premiumReady = 'true';
        edit.innerHTML = `${icons.edit}<span>Modifier</span>`;
      }

      const toggle = row.querySelector('[data-toggle-user]');
      if (toggle && !toggle.dataset.premiumReady) {
        toggle.dataset.premiumReady = 'true';
        const label = toggle.textContent.trim();
        toggle.innerHTML = `${icons.power}<span>${label}</span>`;
      }
    });
    applyFilter();
  }

  function initialize() {
    const body = document.getElementById('users-body');
    if (!body) return false;
    view.classList.add('users-premium');
    ensureFilters();
    enhanceRows();
    new MutationObserver(enhanceRows).observe(body, { childList: true, subtree: true });
    return true;
  }

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(view, { childList: true, subtree: true });
  }
})();