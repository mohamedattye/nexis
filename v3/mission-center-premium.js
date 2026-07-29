(() => {
  'use strict';

  if (window.__NEXIS_MISSION_CENTER_PREMIUM__) return;
  window.__NEXIS_MISSION_CENTER_PREMIUM__ = true;

  const view = document.getElementById('trips');
  const body = document.getElementById('missions-body');
  if (!view || !body) return;

  const style = document.createElement('style');
  style.textContent = `
    #trips{max-width:none}
    #trips>.panel{
      position:relative;
      overflow:hidden;
      padding:20px!important;
      background:radial-gradient(circle at 100% 0,rgba(255,144,18,.065),transparent 25%),rgba(255,255,255,.97)!important;
    }
    #trips>.panel:before{
      content:"";
      position:absolute;
      inset:0 0 auto;
      height:4px;
      background:linear-gradient(90deg,#ff8a00,#ffb34d 38%,#1b3a59 100%);
    }
    #trips .panel-head{
      align-items:center;
      margin-bottom:16px;
      padding:3px 2px 0;
    }
    #trips .panel-head small{
      color:#bf6700;
      font-weight:850;
      letter-spacing:.1em;
    }
    #trips .panel-head h2{
      margin-top:4px;
      font-size:20px;
      letter-spacing:-.03em;
      color:#16283e;
    }
    #trips .panel-description{
      margin-top:5px!important;
      color:#788496!important;
      font-size:10px!important;
    }
    #trips .panel-head>.primary{display:none!important}

    #trips .filters{
      position:relative;
      display:grid!important;
      grid-template-columns:minmax(300px,1fr) 190px 210px!important;
      gap:9px!important;
      margin-bottom:13px!important;
      padding:10px!important;
      border:1px solid #e5eaf0;
      border-radius:14px;
      background:linear-gradient(180deg,#fafbfd,#f7f9fc);
    }
    #trips .filters:before{
      content:"";
      position:absolute;
      left:24px;
      top:50%;
      width:15px;
      height:15px;
      transform:translateY(-50%);
      border:1.8px solid #8794a5;
      border-radius:50%;
      pointer-events:none;
      z-index:2;
    }
    #trips .filters:after{
      content:"";
      position:absolute;
      left:37px;
      top:calc(50% + 5px);
      width:6px;
      height:1.8px;
      transform:rotate(45deg);
      border-radius:2px;
      background:#8794a5;
      pointer-events:none;
      z-index:2;
    }
    #mission-search{padding-left:38px!important}
    #trips .filters input,#trips .filters select{
      height:42px!important;
      margin:0!important;
      background:#fff!important;
      border-color:#dce3eb!important;
      font-size:11px!important;
      font-weight:620;
    }

    #trips .table-scroll{
      border-radius:14px!important;
      border:1px solid #e4e9ef!important;
      box-shadow:0 7px 20px rgba(31,48,73,.035);
      background:#fff;
    }
    #trips table{border-collapse:separate;border-spacing:0}
    #trips thead th{
      height:42px;
      padding:0 13px!important;
      background:#f5f8fb!important;
      border-bottom:1px solid #e2e8ef!important;
      color:#708095!important;
      font-size:8.5px!important;
      font-weight:850!important;
      letter-spacing:.07em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    #trips tbody td{
      height:58px;
      padding:10px 13px!important;
      border-bottom:1px solid #edf1f5!important;
      color:#2a394d;
      font-size:10.5px;
    }
    #trips tbody tr:last-child td{border-bottom:0!important}
    #trips tbody tr:not(.mission-empty-row){
      cursor:pointer;
      transition:background .14s ease,transform .14s ease,box-shadow .14s ease;
    }
    #trips tbody tr:not(.mission-empty-row):hover{
      background:#fbfcfe!important;
      box-shadow:inset 3px 0 0 #ff9414;
    }
    #trips tbody tr:not(.mission-empty-row):hover .mission-open-button{
      background:#fff1df;
      border-color:#ffd29a;
      color:#ae5a00;
    }
    #trips .truck-badge{
      padding:6px 9px!important;
      border-radius:9px!important;
      background:#edf4fb!important;
      color:#285075!important;
      font-size:10px;
      font-weight:850;
      letter-spacing:.015em;
    }
    #trips .mission-route{
      display:flex;
      align-items:center;
      gap:8px;
      font-weight:720;
      color:#203148;
      white-space:nowrap;
    }
    #trips .mission-route-arrow{
      color:#e07b08;
      font-size:14px;
      font-weight:900;
    }
    #trips .mission-money{font-weight:720;white-space:nowrap;color:#35465a}
    #trips .mission-expense{color:#647083}
    #trips .positive,#trips .negative{
      font-weight:850!important;
      white-space:nowrap;
    }
    #trips .mission-open-cell{text-align:right}
    #trips .mission-open-button{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:6px;
      min-height:32px;
      padding:6px 10px;
      border:1px solid #e0e6ed;
      border-radius:9px;
      background:#fff;
      color:#526176;
      font:inherit;
      font-size:9px;
      font-weight:800;
      cursor:pointer;
      transition:background .14s ease,border-color .14s ease,color .14s ease,transform .14s ease;
    }
    #trips .mission-open-button:hover{transform:translateY(-1px)}
    #trips .mission-open-button svg{
      width:14px;
      height:14px;
      fill:none;
      stroke:currentColor;
      stroke-width:1.8;
      stroke-linecap:round;
      stroke-linejoin:round;
    }

    #trips .mission-empty-cell{
      height:230px!important;
      padding:24px!important;
      text-align:center;
      background:linear-gradient(180deg,#fff,#fbfcfe);
    }
    .mission-empty-state{
      display:grid;
      justify-items:center;
      gap:8px;
      max-width:360px;
      margin:auto;
    }
    .mission-empty-icon{
      width:46px;
      height:46px;
      display:grid;
      place-items:center;
      border-radius:15px;
      background:#fff3e3;
      color:#d66f00;
      box-shadow:0 8px 20px rgba(255,138,0,.11);
    }
    .mission-empty-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .mission-empty-state strong{font-size:13px;color:#21334a}
    .mission-empty-state span{font-size:10px;line-height:1.55;color:#7b8797}
    .mission-empty-state .primary{margin-top:5px;min-height:36px!important;padding:8px 13px!important;font-size:10px!important}

    @media(max-width:1000px){
      #trips .filters{grid-template-columns:1fr 170px!important}
      #mission-truck-filter{grid-column:1/-1}
    }
    @media(max-width:740px){
      #trips>.panel{padding:14px!important}
      #trips .filters{grid-template-columns:1fr!important;padding:8px!important}
      #mission-truck-filter{grid-column:auto}
      #trips .filters:before,#trips .filters:after{display:none}
      #mission-search{padding-left:11px!important}
      #trips .table-scroll{overflow-x:auto}
      #trips table{min-width:760px}
    }
  `;
  document.head.appendChild(style);

  function eyeIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.4-5.2 9.2-5.2S21.2 12 21.2 12s-3.4 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  }

  function emptyIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8h7l3 3V20H7z"/><path d="M14 3.8V7h3M9.5 11h5M9.5 14h3.5"/></svg>';
  }

  function enhanceRows() {
    const rows = [...body.querySelectorAll('tr')];
    rows.forEach((row) => {
      const message = row.querySelector('.table-message');
      if (message) {
        row.classList.add('mission-empty-row');
        message.classList.add('mission-empty-cell');
        if (!message.querySelector('.mission-empty-state')) {
          message.innerHTML = `<div class="mission-empty-state"><span class="mission-empty-icon">${emptyIcon()}</span><strong>Aucune mission à afficher</strong><span>Créez votre première mission ou modifiez les filtres sélectionnés.</span><button class="primary" type="button" data-view="new-trip">Créer une mission</button></div>`;
        }
        return;
      }

      const cells = row.querySelectorAll('td');
      if (cells.length < 7) return;

      row.classList.add('mission-premium-row');
      cells[2].classList.add('mission-route-cell');
      const route = cells[2].textContent.split('→').map((part) => part.trim());
      if (route.length === 2 && !cells[2].querySelector('.mission-route')) {
        cells[2].innerHTML = `<span class="mission-route"><span>${route[0]}</span><span class="mission-route-arrow">→</span><span>${route[1]}</span></span>`;
      }
      cells[3].classList.add('mission-money');
      cells[4].classList.add('mission-money','mission-expense');
      cells[6].classList.add('mission-open-cell');

      const open = cells[6].querySelector('[data-open-mission]');
      if (open && !open.classList.contains('mission-open-button')) {
        open.className = 'mission-open-button';
        open.innerHTML = `${eyeIcon()}<span>Voir</span>`;
        open.setAttribute('aria-label', 'Ouvrir la fiche de mission');
      }

      if (!row.dataset.openBound) {
        row.dataset.openBound = 'true';
        row.addEventListener('click', (event) => {
          if (event.target.closest('button,a,input,select')) return;
          row.querySelector('[data-open-mission]')?.click();
        });
      }
    });
  }

  view.classList.add('mission-center-premium');
  enhanceRows();
  new MutationObserver(enhanceRows).observe(body, { childList: true, subtree: true });
})();