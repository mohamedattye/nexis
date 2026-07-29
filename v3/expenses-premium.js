(() => {
  'use strict';

  if (window.__NEXIS_EXPENSES_PREMIUM__) return;
  window.__NEXIS_EXPENSES_PREMIUM__ = true;

  const view = document.getElementById('expenses');
  const body = document.getElementById('expenses-body');
  if (!view || !body) return;

  const style = document.createElement('style');
  style.textContent = `
    #expenses{max-width:none}
    #expenses .expenses-page{gap:13px}
    #expenses .expenses-heading{margin:0 0 2px!important}
    #expenses .expenses-heading h2{display:none!important}
    #expenses .expenses-heading p{margin:0!important;color:#758196!important;font-size:10.5px!important}

    #expenses .expenses-summary{
      grid-template-columns:1.25fr repeat(4,minmax(0,1fr))!important;
      gap:12px!important;
    }
    #expenses .expenses-kpi{
      position:relative;
      overflow:hidden;
      min-height:100px;
      padding:16px 15px 15px 56px!important;
      border-radius:16px!important;
    }
    #expenses .expenses-kpi:before{
      content:"";
      position:absolute;
      left:15px;
      top:17px;
      width:30px;
      height:30px;
      border-radius:10px;
      background:#eef4fa;
      box-shadow:0 6px 15px rgba(31,48,73,.055);
    }
    #expenses .expenses-kpi:after{
      position:absolute;
      left:23px;
      top:23px;
      width:14px;
      height:14px;
      display:grid;
      place-items:center;
      font-size:14px;
      font-weight:900;
      line-height:1;
      color:#315b82;
    }
    #expenses .expenses-kpi:nth-child(1):before{background:#fff1df}
    #expenses .expenses-kpi:nth-child(1):after{content:"Σ";color:#c96a00}
    #expenses .expenses-kpi:nth-child(2):after{content:"◐";color:#315b82}
    #expenses .expenses-kpi:nth-child(3):after{content:"R";color:#7b5b25;font-size:11px}
    #expenses .expenses-kpi:nth-child(4):after{content:"↗";color:#c96a00}
    #expenses .expenses-kpi:nth-child(5):after{content:"+";color:#6a4c8d}
    #expenses .expenses-kpi:nth-child(5):before{background:#f3eef9}
    #expenses .expenses-kpi span{font-size:8.5px!important;letter-spacing:.055em!important}
    #expenses .expenses-kpi strong{font-size:17px!important;letter-spacing:-.035em}
    #expenses .expenses-kpi:first-child strong{font-size:19px!important;color:#c66a00}
    #expenses .expenses-kpi small{line-height:1.35}

    #expenses .expenses-panel{
      position:relative;
      overflow:hidden;
      padding:18px!important;
      border-radius:17px!important;
      background:radial-gradient(circle at 100% 0,rgba(255,145,18,.06),transparent 24%),rgba(255,255,255,.97)!important;
    }
    #expenses .expenses-panel:before{
      content:"";
      position:absolute;
      inset:0 0 auto;
      height:4px;
      background:linear-gradient(90deg,#ff8a00,#ffb34d 38%,#1b3a59 100%);
    }

    #expenses .expenses-toolbar{
      position:relative;
      grid-template-columns:minmax(300px,1fr) 185px 210px!important;
      gap:9px!important;
      padding:10px!important;
      margin-top:3px;
      border:1px solid #e5eaf0;
      border-radius:14px;
      background:linear-gradient(180deg,#fafbfd,#f7f9fc);
    }
    #expenses .expenses-toolbar:before{
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
    #expenses .expenses-toolbar:after{
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
    #expenses-search{padding-left:38px!important}
    #expenses .expenses-toolbar input,#expenses .expenses-toolbar select{
      height:42px!important;
      margin:0!important;
      background:#fff!important;
      border-color:#dce3eb!important;
      font-size:11px!important;
      font-weight:620;
    }
    #expenses .expenses-toolbar>.primary{display:none!important}
    #expenses .expenses-count{
      display:inline-flex;
      align-items:center;
      gap:7px;
      margin:11px 2px 0!important;
      color:#667387!important;
      font-weight:700;
    }
    #expenses .expenses-count:before{
      content:"";
      width:6px;
      height:6px;
      border-radius:50%;
      background:#ff9414;
      box-shadow:0 0 0 4px rgba(255,148,20,.1);
    }

    #expenses .expenses-table-wrap{
      margin-top:11px!important;
      border-radius:14px!important;
      border:1px solid #e4e9ef!important;
      box-shadow:0 7px 20px rgba(31,48,73,.035);
      background:#fff;
    }
    #expenses .expenses-table{min-width:880px!important;border-collapse:separate;border-spacing:0}
    #expenses .expenses-table th{
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
    #expenses .expenses-table td{
      height:68px;
      padding:10px 12px!important;
      border-bottom:1px solid #edf1f5!important;
      color:#2d3c50;
      font-size:10.5px;
      vertical-align:middle;
    }
    #expenses .expenses-table tr:last-child td{border-bottom:0!important}
    #expenses .expenses-table th:nth-child(5),#expenses .expenses-table th:nth-child(6),#expenses .expenses-table th:nth-child(7),#expenses .expenses-table th:nth-child(8),
    #expenses .expenses-table td:nth-child(5),#expenses .expenses-table td:nth-child(6),#expenses .expenses-table td:nth-child(7),#expenses .expenses-table td:nth-child(8){display:none!important}
    #expenses .expenses-table tbody tr:not(.expenses-empty-row){
      cursor:pointer;
      transition:background .14s ease,box-shadow .14s ease;
    }
    #expenses .expenses-table tbody tr:not(.expenses-empty-row):hover{
      background:#fbfcfe!important;
      box-shadow:inset 3px 0 0 #ff9414;
    }
    #expenses .expenses-plate{
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
    #expenses .expenses-plate:before{
      content:"";
      width:7px;
      height:7px;
      border-radius:2px;
      background:#315f88;
    }
    #expenses .expenses-trip{
      display:flex;
      align-items:center;
      gap:7px;
      color:#203148!important;
      font-weight:720!important;
    }
    #expenses .expenses-trip-arrow{color:#df7806;font-size:14px;font-weight:900}
    #expenses .expense-breakdown{
      display:flex;
      align-items:center;
      gap:5px;
      flex-wrap:wrap;
      max-width:390px;
    }
    #expenses .expense-chip{
      display:inline-flex;
      align-items:center;
      gap:4px;
      min-height:25px;
      padding:4px 7px;
      border:1px solid #e3e8ee;
      border-radius:8px;
      background:#f8fafc;
      color:#617084;
      font-size:8px;
      font-weight:700;
      white-space:nowrap;
    }
    #expenses .expense-chip strong{color:#26384e;font-size:8.5px}
    #expenses .expense-chip.zero{opacity:.46}
    #expenses .expenses-total{
      color:#c96a00!important;
      font-size:11px!important;
      font-weight:900!important;
    }
    #expenses .expenses-open-cell{text-align:right}
    #expenses .expenses-open{
      display:inline-flex!important;
      align-items:center;
      justify-content:center;
      gap:6px;
      min-height:32px;
      padding:6px 10px!important;
      border:1px solid #e0e6ed!important;
      border-radius:9px!important;
      background:#fff!important;
      color:#526176!important;
      font-size:9px!important;
      font-weight:800!important;
      text-decoration:none!important;
      transition:background .14s ease,border-color .14s ease,color .14s ease,transform .14s ease!important;
    }
    #expenses .expenses-open:hover{
      transform:translateY(-1px);
      background:#fff1df!important;
      border-color:#ffd29a!important;
      color:#ae5a00!important;
    }
    #expenses .expenses-open svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

    #expenses .expenses-empty-cell{
      display:table-cell!important;
      height:220px!important;
      padding:24px!important;
      text-align:center;
      background:linear-gradient(180deg,#fff,#fbfcfe);
    }
    .expenses-premium-empty{display:grid;justify-items:center;gap:8px;max-width:350px;margin:auto}
    .expenses-premium-empty-icon{
      width:46px;height:46px;display:grid;place-items:center;border-radius:15px;
      background:#fff3e3;color:#d66f00;box-shadow:0 8px 20px rgba(255,138,0,.11)
    }
    .expenses-premium-empty-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .expenses-premium-empty strong{font-size:13px;color:#21334a}
    .expenses-premium-empty span{font-size:10px;line-height:1.55;color:#7b8797}

    @media(max-width:1180px){
      #expenses .expenses-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important}
    }
    @media(max-width:900px){
      #expenses .expenses-toolbar{grid-template-columns:1fr 180px!important}
      #expenses-truck{grid-column:1/-1}
    }
    @media(max-width:740px){
      #expenses .expenses-summary{grid-template-columns:1fr!important}
      #expenses .expenses-toolbar{grid-template-columns:1fr!important;padding:8px!important}
      #expenses-truck{grid-column:auto}
      #expenses .expenses-toolbar:before,#expenses .expenses-toolbar:after{display:none}
      #expenses-search{padding-left:11px!important}
      #expenses .expenses-table-wrap{overflow-x:auto}
    }
  `;
  document.head.appendChild(style);

  function eyeIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.4-5.2 9.2-5.2S21.2 12 21.2 12s-3.4 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  }

  function receiptIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>';
  }

  function parseMoney(text) {
    const value = Number(String(text || '').replace(/[^0-9-]/g, '')) || 0;
    return value;
  }

  function enhanceRows() {
    const headers = view.querySelectorAll('.expenses-table thead th');
    if (headers.length >= 10) {
      headers[3].textContent = 'Détail des dépenses';
      headers[9].textContent = '';
    }

    [...body.querySelectorAll('tr')].forEach((row) => {
      const empty = row.querySelector('.expenses-empty,.expenses-loading');
      if (empty) {
        row.classList.add('expenses-empty-row');
        empty.classList.add('expenses-empty-cell');
        const loading = empty.textContent.includes('Chargement');
        if (!empty.querySelector('.expenses-premium-empty')) {
          empty.innerHTML = `<div class="expenses-premium-empty"><span class="expenses-premium-empty-icon">${receiptIcon()}</span><strong>${loading ? 'Chargement des dépenses' : 'Aucune dépense à afficher'}</strong><span>${loading ? 'Nexis récupère les frais liés aux missions.' : 'Les dépenses saisies dans les missions apparaîtront ici.'}</span></div>`;
        }
        return;
      }

      const cells = row.querySelectorAll('td');
      if (cells.length < 10) return;

      const route = cells[2].textContent.split('→').map((part) => part.trim());
      if (route.length === 2 && !cells[2].querySelector('.expenses-trip-arrow')) {
        cells[2].innerHTML = `<span class="expenses-trip"><span>${route[0]}</span><span class="expenses-trip-arrow">→</span><span>${route[1]}</span></span>`;
      }

      if (!cells[3].querySelector('.expense-breakdown')) {
        const labels = ['Carburant', 'Ration', 'Rapido', 'Manœuvre', 'Autres'];
        const values = [cells[3], cells[4], cells[5], cells[6], cells[7]].map((cell) => cell.textContent.trim());
        cells[3].innerHTML = `<div class="expense-breakdown">${labels.map((label, index) => `<span class="expense-chip ${parseMoney(values[index]) === 0 ? 'zero' : ''}"><span>${label}</span><strong>${values[index]}</strong></span>`).join('')}</div>`;
      }

      cells[9].classList.add('expenses-open-cell');
      const open = cells[9].querySelector('[data-open-mission]');
      if (open && !open.dataset.premiumReady) {
        open.dataset.premiumReady = 'true';
        open.innerHTML = `${eyeIcon()}<span>Voir</span>`;
        open.setAttribute('aria-label', 'Ouvrir la mission associée');
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

  view.classList.add('expenses-premium');
  enhanceRows();
  new MutationObserver(enhanceRows).observe(body, { childList: true, subtree: true });
})();