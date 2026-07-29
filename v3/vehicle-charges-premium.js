(() => {
  'use strict';

  if (window.__NEXIS_VEHICLE_CHARGES_PREMIUM__) return;
  window.__NEXIS_VEHICLE_CHARGES_PREMIUM__ = true;

  const view = document.getElementById('vehicle-charges');
  if (!view) return;

  const style = document.createElement('style');
  style.textContent = `
    #vehicle-charges{max-width:none}
    #vehicle-charges .charges-page{gap:13px}
    #vehicle-charges .charges-heading{align-items:center!important;margin:0 0 2px!important}
    #vehicle-charges .charges-heading h2{display:none!important}
    #vehicle-charges .charges-heading p{margin:0!important;color:#758196!important;font-size:10.5px!important}
    #vehicle-charges .charges-filter{padding:7px;border:1px solid #e3e8ef;border-radius:13px;background:rgba(255,255,255,.78);box-shadow:0 7px 18px rgba(31,48,73,.035)}
    #vehicle-charges .charges-filter input{height:40px!important;min-width:160px;margin:0!important;background:#fff!important}
    #vehicle-charges #charges-add{min-height:40px!important;padding:8px 14px!important}

    #vehicle-charges .charges-kpis{gap:12px!important}
    #vehicle-charges .charges-kpi{
      position:relative;
      overflow:hidden;
      min-height:102px;
      padding:16px 16px 15px 58px!important;
      border-radius:16px!important;
    }
    #vehicle-charges .charges-kpi:before{
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
    #vehicle-charges .charges-kpi:after{
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
    #vehicle-charges .charges-kpi:nth-child(1):after{content:"↗"}
    #vehicle-charges .charges-kpi:nth-child(2):before{background:#fff1df}
    #vehicle-charges .charges-kpi:nth-child(2):after{content:"−";color:#c86a00;font-size:18px}
    #vehicle-charges .charges-kpi:nth-child(3):before{background:#e8f8f1}
    #vehicle-charges .charges-kpi:nth-child(3):after{content:"✓";color:#07845d}
    #vehicle-charges .charges-kpi:nth-child(4):before{background:#f0effa}
    #vehicle-charges .charges-kpi:nth-child(4):after{content:"▣";color:#665895}
    #vehicle-charges .charges-kpi span{font-size:8.5px!important;letter-spacing:.055em!important}
    #vehicle-charges .charges-kpi strong{font-size:19px!important;letter-spacing:-.035em}
    #vehicle-charges #charges-net-card strong{font-size:21px!important}

    #vehicle-charges .charges-panel{
      position:relative;
      overflow:hidden;
      padding:18px!important;
      border-radius:17px!important;
      background:radial-gradient(circle at 100% 0,rgba(255,145,18,.06),transparent 24%),rgba(255,255,255,.97)!important;
    }
    #vehicle-charges .charges-panel:before{
      content:"";
      position:absolute;
      inset:0 0 auto;
      height:4px;
      background:linear-gradient(90deg,#ff8a00,#ffb34d 38%,#1b3a59 100%);
    }

    #vehicle-charges .charges-form-wrap{
      position:relative;
      margin:4px 0 16px!important;
      padding:18px!important;
      border:1px solid #ead7bd!important;
      border-radius:16px!important;
      background:linear-gradient(145deg,#fffaf3,#fff 48%,#f8fbfd)!important;
      box-shadow:0 12px 28px rgba(31,48,73,.055)!important;
    }
    #vehicle-charges .charges-form-wrap:before{
      content:"";
      position:absolute;
      inset:0 auto 0 0;
      width:4px;
      border-radius:16px 0 0 16px;
      background:linear-gradient(180deg,#ff8a00,#ffc36f);
    }
    #vehicle-charges .charges-form-head{margin-bottom:15px!important;padding-left:3px}
    #vehicle-charges .charges-form-head h3{font-size:16px!important;letter-spacing:-.02em;color:#1c3047}
    #vehicle-charges .charges-form-head p{font-size:10px!important}
    #vehicle-charges .charges-form{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:11px!important}
    #vehicle-charges .charges-form label{font-size:9.5px!important;color:#435169!important}
    #vehicle-charges .charges-form input,#vehicle-charges .charges-form select{height:41px!important;margin-top:6px!important;background:#fff!important;font-weight:650}
    #vehicle-charges .charges-form textarea{min-height:72px!important;margin-top:6px!important;background:#fff!important}
    #vehicle-charges .charge-context{grid-column:span 2}
    #vehicle-charges .charge-section-title{
      grid-column:1/-1;
      display:flex;
      align-items:center;
      gap:9px;
      margin-top:2px;
      padding-top:12px;
      border-top:1px solid #e8edf2;
      color:#273a51;
      font-size:10px;
      font-weight:850;
      letter-spacing:.025em;
      text-transform:uppercase;
    }
    #vehicle-charges .charge-section-title:before{
      content:"";
      width:8px;
      height:8px;
      border-radius:3px;
      background:#ff9414;
      box-shadow:0 0 0 5px rgba(255,148,20,.1);
    }
    #vehicle-charges .charge-section-title.operating:before{background:#315f88;box-shadow:0 0 0 5px rgba(49,95,136,.09)}
    #vehicle-charges .charges-preview{
      display:flex;
      align-items:center;
      gap:8px;
      margin-right:auto!important;
      padding:8px 11px;
      border:1px solid #f0d5b0;
      border-radius:10px;
      background:#fff8ef;
      color:#765636!important;
    }
    #vehicle-charges .charges-preview strong{margin-left:0!important;color:#bd6200!important;font-size:14px!important}
    #vehicle-charges .charges-form-actions{padding-top:4px!important}
    #vehicle-charges .charges-form-actions button{min-height:40px!important;padding:8px 15px!important}

    #vehicle-charges .charges-toolbar{
      margin:0 2px 12px!important;
      padding:0 1px;
    }
    #vehicle-charges .charges-toolbar h3{font-size:15px!important;letter-spacing:-.015em;color:#1d3047}
    #vehicle-charges .charges-toolbar p{font-size:10px!important}

    #vehicle-charges .charges-table-wrap{
      border-radius:14px!important;
      border:1px solid #e4e9ef!important;
      box-shadow:0 7px 20px rgba(31,48,73,.035);
      background:#fff;
    }
    #vehicle-charges .charges-table{min-width:1050px!important;border-collapse:separate;border-spacing:0}
    #vehicle-charges .charges-table th{
      height:42px;
      padding:0 12px!important;
      background:#f5f8fb!important;
      border-bottom:1px solid #e2e8ef!important;
      color:#708095!important;
      font-size:8.5px!important;
      font-weight:850!important;
      letter-spacing:.06em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    #vehicle-charges .charges-table td{
      height:64px;
      padding:10px 12px!important;
      border-bottom:1px solid #edf1f5!important;
      color:#2d3c50;
      font-size:10.5px;
    }
    #vehicle-charges .charges-table tr:last-child td{border-bottom:0!important}
    #vehicle-charges .charges-table tbody tr:not(.charges-empty-row){transition:background .14s ease,box-shadow .14s ease}
    #vehicle-charges .charges-table tbody tr:not(.charges-empty-row):hover{background:#fbfcfe!important;box-shadow:inset 3px 0 0 #ff9414}
    #vehicle-charges .charges-plate{
      display:inline-flex!important;
      align-items:center;
      gap:7px;
      padding:6px 9px!important;
      border-radius:9px!important;
      background:#edf4fb!important;
      color:#285075!important;
      font-size:10px;
      font-weight:850;
    }
    #vehicle-charges .charges-plate:before{content:"";width:7px;height:7px;border-radius:2px;background:#315f88}
    #vehicle-charges .charges-money{font-weight:720!important;color:#435268}
    #vehicle-charges .charges-total{display:inline-flex;padding:6px 8px;border-radius:8px;background:#fff4e6;color:#bd6200!important;font-weight:850!important}
    #vehicle-charges .charges-net{display:inline-flex;padding:6px 9px;border-radius:8px;background:#eaf8f2;color:#07845d!important;font-size:11px!important;font-weight:900!important}
    #vehicle-charges .charges-net.negative{background:#fff0f1;color:#bd3d44!important}
    #vehicle-charges .charges-actions{gap:5px!important}
    #vehicle-charges .charges-action{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:5px;
      min-height:32px;
      padding:6px 9px!important;
      border-radius:9px!important;
      background:#fff!important;
      font-size:9px!important;
      transition:background .14s ease,border-color .14s ease,color .14s ease,transform .14s ease!important;
    }
    #vehicle-charges .charges-action:hover{transform:translateY(-1px);background:#f7f9fc!important}
    #vehicle-charges .charges-action.danger{background:#fffafa!important}
    #vehicle-charges .charges-action svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

    #vehicle-charges .charges-empty-cell{
      height:220px!important;
      padding:24px!important;
      text-align:center;
      background:linear-gradient(180deg,#fff,#fbfcfe);
    }
    .charges-premium-empty{display:grid;justify-items:center;gap:8px;max-width:350px;margin:auto}
    .charges-premium-empty-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:#fff3e3;color:#d66f00;box-shadow:0 8px 20px rgba(255,138,0,.11)}
    .charges-premium-empty-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .charges-premium-empty strong{font-size:13px;color:#21334a}
    .charges-premium-empty span{font-size:10px;line-height:1.55;color:#7b8797}

    @media(max-width:1050px){
      #vehicle-charges .charges-form{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #vehicle-charges .charge-context{grid-column:span 1}
    }
    @media(max-width:740px){
      #vehicle-charges .charges-heading{align-items:flex-start!important;flex-direction:column!important}
      #vehicle-charges .charges-filter{width:100%;display:grid!important;grid-template-columns:1fr!important}
      #vehicle-charges .charges-filter input,#vehicle-charges #charges-add{width:100%}
      #vehicle-charges .charges-kpis,#vehicle-charges .charges-form{grid-template-columns:1fr!important}
      #vehicle-charges .charge-context,#vehicle-charges .charge-section-title,#vehicle-charges .charges-form .full,#vehicle-charges .charges-form-actions{grid-column:1!important}
      #vehicle-charges .charges-form-actions{align-items:stretch!important;flex-direction:column!important}
      #vehicle-charges .charges-preview{margin:0!important;width:100%;justify-content:space-between}
      #vehicle-charges .charges-form-actions button{width:100%}
    }
  `;
  document.head.appendChild(style);

  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.5 4 4-.5L18.8 8.7l-3.5-3.5z"/><path d="m13.8 6.7 3.5 3.5"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
  };

  function addFormStructure() {
    const form = document.getElementById('charges-form');
    if (!form || form.dataset.premiumReady) return;
    form.dataset.premiumReady = 'true';

    const truckLabel = document.getElementById('charges-truck')?.closest('label');
    const monthLabel = document.getElementById('charges-form-month')?.closest('label');
    truckLabel?.classList.add('charge-context');
    monthLabel?.classList.add('charge-context');

    const maintenance = document.getElementById('charge-maintenance')?.closest('label');
    const driver = document.getElementById('charge-driver_cost')?.closest('label');

    if (maintenance) {
      const title = document.createElement('div');
      title.className = 'charge-section-title';
      title.textContent = 'Entretien et conformité';
      form.insertBefore(title, maintenance);
    }
    if (driver) {
      const title = document.createElement('div');
      title.className = 'charge-section-title operating';
      title.textContent = 'Exploitation et financement';
      form.insertBefore(title, driver);
    }
  }

  function enhanceRows() {
    const body = document.getElementById('charges-body');
    if (!body) return;

    [...body.querySelectorAll('tr')].forEach((row) => {
      const empty = row.querySelector('.charges-empty,.charges-loading');
      if (empty) {
        row.classList.add('charges-empty-row');
        empty.classList.add('charges-empty-cell');
        const loading = empty.textContent.includes('Chargement');
        if (!empty.querySelector('.charges-premium-empty')) {
          empty.innerHTML = `<div class="charges-premium-empty"><span class="charges-premium-empty-icon">${icons.truck}</span><strong>${loading ? 'Chargement des charges' : 'Aucun camion à afficher'}</strong><span>${loading ? 'Nexis calcule la rentabilité nette de la flotte.' : 'Ajoutez un camion ou saisissez ses charges mensuelles.'}</span></div>`;
        }
        return;
      }

      const edit = row.querySelector('[data-edit-charge]');
      if (edit && !edit.dataset.premiumReady) {
        edit.dataset.premiumReady = 'true';
        const isEdit = edit.textContent.trim() === 'Modifier';
        edit.innerHTML = `${isEdit ? icons.edit : icons.add}<span>${isEdit ? 'Modifier' : 'Saisir'}</span>`;
      }

      const remove = row.querySelector('[data-delete-charge]');
      if (remove && !remove.dataset.premiumReady) {
        remove.dataset.premiumReady = 'true';
        remove.innerHTML = `${icons.trash}<span>Supprimer</span>`;
      }
    });
  }

  function initialize() {
    const body = document.getElementById('charges-body');
    const form = document.getElementById('charges-form');
    if (!body || !form) return false;

    view.classList.add('vehicle-charges-premium');
    addFormStructure();
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