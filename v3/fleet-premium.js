(() => {
  'use strict';

  if (window.__NEXIS_FLEET_PREMIUM__) return;
  window.__NEXIS_FLEET_PREMIUM__ = true;

  const view = document.getElementById('fleet');
  const body = document.getElementById('fleet-body');
  if (!view || !body) return;

  const style = document.createElement('style');
  style.textContent = `
    #fleet{max-width:none}
    #fleet .fleet-page{gap:13px}
    #fleet .fleet-head{margin:0 0 2px!important}
    #fleet .fleet-head h2{display:none!important}
    #fleet .fleet-head p{
      margin:0!important;
      color:#758196!important;
      font-size:10.5px!important;
    }

    #fleet .fleet-kpis{gap:12px!important}
    #fleet .fleet-kpi{
      position:relative;
      overflow:hidden;
      min-height:98px;
      padding:16px 17px 15px 58px!important;
      border-radius:16px!important;
    }
    #fleet .fleet-kpi:before{
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
    #fleet .fleet-kpi:after{
      position:absolute;
      left:24px;
      top:23px;
      width:15px;
      height:15px;
      display:grid;
      place-items:center;
      color:#315b82;
      font-size:15px;
      font-weight:850;
      line-height:1;
    }
    #fleet .fleet-kpi:nth-child(1):after{content:"▣"}
    #fleet .fleet-kpi:nth-child(2):after{content:"↗";color:#c96a00}
    #fleet .fleet-kpi:nth-child(3):after{content:"₣";color:#315b82}
    #fleet .fleet-kpi:nth-child(4):after{content:"✓";color:#07845d}
    #fleet .fleet-kpi:nth-child(2):before{background:#fff3e3}
    #fleet .fleet-kpi:nth-child(4):before{background:#eaf8f2}
    #fleet .fleet-kpi span{font-size:9px!important;text-transform:uppercase;letter-spacing:.055em;font-weight:800}
    #fleet .fleet-kpi strong{font-size:19px!important;margin-top:7px!important;letter-spacing:-.035em}
    #fleet .fleet-kpi small{margin-top:4px!important}

    #fleet .fleet-panel{
      position:relative;
      overflow:hidden;
      padding:18px!important;
      border-radius:17px!important;
      background:radial-gradient(circle at 100% 0,rgba(255,145,18,.06),transparent 24%),rgba(255,255,255,.97)!important;
    }
    #fleet .fleet-panel:before{
      content:"";
      position:absolute;
      inset:0 0 auto;
      height:4px;
      background:linear-gradient(90deg,#ff8a00,#ffb34d 38%,#1b3a59 100%);
    }

    #fleet .fleet-toolbar{
      position:relative;
      grid-template-columns:minmax(280px,1fr) 190px auto!important;
      gap:9px!important;
      padding:10px!important;
      margin-top:3px;
      border:1px solid #e5eaf0;
      border-radius:14px;
      background:linear-gradient(180deg,#fafbfd,#f7f9fc);
    }
    #fleet .fleet-toolbar:before{
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
    #fleet .fleet-toolbar:after{
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
    #fleet-search{padding-left:38px!important}
    #fleet .fleet-toolbar input,#fleet .fleet-toolbar select{
      height:42px!important;
      margin:0!important;
      background:#fff!important;
      border-color:#dce3eb!important;
      font-size:11px!important;
      font-weight:620;
    }
    #fleet-add-toggle{
      min-width:146px;
      min-height:42px!important;
      padding:9px 14px!important;
    }

    #fleet .fleet-add-wrap{
      position:relative;
      margin-top:11px!important;
      padding:16px!important;
      border:1px solid #f0d6b3!important;
      border-radius:14px!important;
      background:linear-gradient(145deg,#fffaf3,#fff)!important;
      box-shadow:0 8px 22px rgba(255,138,0,.06);
    }
    #fleet .fleet-add-wrap:before{
      content:"Nouveau camion";
      display:block;
      margin-bottom:11px;
      color:#25364b;
      font-size:12px;
      font-weight:850;
      letter-spacing:-.01em;
    }
    #fleet .fleet-add-form{
      grid-template-columns:minmax(260px,1fr) auto auto!important;
      gap:9px!important;
    }
    #fleet .fleet-add-form input{height:42px!important;background:#fff!important}
    #fleet .fleet-add-form button{min-height:42px!important}

    #fleet .fleet-table-wrap{
      margin-top:13px!important;
      border-radius:14px!important;
      border:1px solid #e4e9ef!important;
      box-shadow:0 7px 20px rgba(31,48,73,.035);
      background:#fff;
    }
    #fleet .fleet-table{border-collapse:separate;border-spacing:0}
    #fleet .fleet-table th{
      height:42px;
      padding:0 12px!important;
      background:#f5f8fb!important;
      border-bottom:1px solid #e2e8ef!important;
      color:#708095!important;
      font-size:8.5px!important;
      font-weight:850!important;
      letter-spacing:.065em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    #fleet .fleet-table td{
      height:58px;
      padding:10px 12px!important;
      border-bottom:1px solid #edf1f5!important;
      color:#2d3c50;
      font-size:10.5px;
    }
    #fleet .fleet-table tr:last-child td{border-bottom:0!important}
    #fleet .fleet-table tbody tr:not(.fleet-empty-row){
      transition:background .14s ease,box-shadow .14s ease;
    }
    #fleet .fleet-table tbody tr:not(.fleet-empty-row):hover{
      background:#fbfcfe!important;
      box-shadow:inset 3px 0 0 #ff9414;
    }
    #fleet .fleet-plate{
      display:inline-flex!important;
      align-items:center;
      gap:7px;
      padding:6px 9px!important;
      border-radius:9px!important;
      background:#edf4fb!important;
      color:#285075!important;
      font-size:10px;
      font-weight:850;
      letter-spacing:.015em;
    }
    #fleet .fleet-plate:before{
      content:"";
      width:7px;
      height:7px;
      border-radius:2px;
      background:#315f88;
      box-shadow:5px 0 0 -2px #315f88;
    }
    #fleet .fleet-status{padding:6px 9px!important;gap:6px!important;font-size:9px!important}
    #fleet .fleet-money,#fleet .fleet-value{font-weight:720;white-space:nowrap}
    #fleet .fleet-muted-value{color:#687486}
    #fleet .fleet-last-date{color:#526176;white-space:nowrap}
    #fleet .fleet-actions{justify-content:flex-end}
    #fleet .fleet-action{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:6px;
      min-height:32px;
      padding:6px 9px!important;
      border-radius:9px!important;
      font-size:9px!important;
      transition:background .14s ease,border-color .14s ease,color .14s ease,transform .14s ease!important;
    }
    #fleet .fleet-action:hover{transform:translateY(-1px)}
    #fleet .fleet-action.warn{background:#fffaf3!important}
    #fleet .fleet-action svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}

    #fleet .fleet-empty-cell{
      height:220px!important;
      padding:24px!important;
      text-align:center;
      background:linear-gradient(180deg,#fff,#fbfcfe);
    }
    .fleet-premium-empty{display:grid;justify-items:center;gap:8px;max-width:340px;margin:auto}
    .fleet-premium-empty-icon{
      width:46px;height:46px;display:grid;place-items:center;border-radius:15px;
      background:#fff3e3;color:#d66f00;box-shadow:0 8px 20px rgba(255,138,0,.11)
    }
    .fleet-premium-empty-icon svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .fleet-premium-empty strong{font-size:13px;color:#21334a}
    .fleet-premium-empty span{font-size:10px;line-height:1.55;color:#7b8797}

    @media(max-width:1080px){
      #fleet .fleet-toolbar{grid-template-columns:1fr 175px!important}
      #fleet-add-toggle{grid-column:1/-1;justify-self:start}
    }
    @media(max-width:740px){
      #fleet .fleet-kpis{grid-template-columns:1fr!important}
      #fleet .fleet-toolbar{grid-template-columns:1fr!important;padding:8px!important}
      #fleet .fleet-toolbar:before,#fleet .fleet-toolbar:after{display:none}
      #fleet-search{padding-left:11px!important}
      #fleet-add-toggle{grid-column:auto;width:100%}
      #fleet .fleet-add-form{grid-template-columns:1fr!important}
      #fleet .fleet-add-form button{width:100%}
    }
  `;
  document.head.appendChild(style);

  function powerIcon(active) {
    return active
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8v8.1"/><path d="M6.2 6.2a8 8 0 1 0 11.6 0"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 0 0 12.4 4.4M19 12a7 7 0 0 0-12.4-4.4M12 3v8"/><path d="m4 4 16 16"/></svg>';
  }

  function truckIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
  }

  function enhanceRows() {
    [...body.querySelectorAll('tr')].forEach((row) => {
      const empty = row.querySelector('.fleet-empty,.fleet-loading');
      if (empty) {
        row.classList.add('fleet-empty-row');
        empty.classList.add('fleet-empty-cell');
        const text = empty.textContent.trim();
        if (!empty.querySelector('.fleet-premium-empty')) {
          empty.innerHTML = `<div class="fleet-premium-empty"><span class="fleet-premium-empty-icon">${truckIcon()}</span><strong>${text.includes('Chargement') ? 'Chargement de la flotte' : 'Aucun camion à afficher'}</strong><span>${text.includes('Chargement') ? 'Nexis récupère les informations des véhicules.' : 'Modifiez les filtres ou ajoutez un nouveau camion.'}</span></div>`;
        }
        return;
      }

      const cells = row.querySelectorAll('td');
      if (cells.length < 8) return;
      cells[2].classList.add('fleet-value');
      cells[3].classList.add('fleet-value');
      cells[4].classList.add('fleet-value','fleet-muted-value');
      cells[6].classList.add('fleet-last-date');

      const action = cells[7].querySelector('[data-toggle-truck]');
      if (action && !action.dataset.premiumReady) {
        action.dataset.premiumReady = 'true';
        const active = action.dataset.active === 'true';
        action.innerHTML = `${powerIcon(active)}<span>${active ? 'Désactiver' : 'Activer'}</span>`;
      }
    });
  }

  view.classList.add('fleet-premium');
  enhanceRows();
  new MutationObserver(enhanceRows).observe(body, { childList: true, subtree: true });
})();