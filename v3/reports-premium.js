(() => {
  'use strict';

  if (window.__NEXIS_REPORTS_PREMIUM__) return;
  window.__NEXIS_REPORTS_PREMIUM__ = true;

  const view = document.getElementById('reports');
  if (!view) return;

  const style = document.createElement('style');
  style.textContent = `
    #reports{max-width:none}
    #reports .reports-page{gap:13px}
    #reports .reports-heading{align-items:center!important;margin:0 0 2px!important}
    #reports .reports-heading h2{display:none!important}
    #reports .reports-heading p{margin:0!important;color:#758196!important;font-size:10.5px!important}
    #reports .reports-actions{padding:6px;border:1px solid #e3e8ef;border-radius:13px;background:rgba(255,255,255,.78);box-shadow:0 7px 18px rgba(31,48,73,.035)}
    #reports .reports-actions button{min-height:38px!important;padding:8px 13px!important}
    #reports .reports-actions button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

    #reports .reports-filter{
      display:grid!important;
      grid-template-columns:180px 240px!important;
      justify-content:start;
      width:max-content;
      padding:8px!important;
      border:1px solid #e4e9ef;
      border-radius:14px;
      background:linear-gradient(180deg,#fafbfd,#f7f9fc);
      box-shadow:0 7px 18px rgba(31,48,73,.03);
    }
    #reports .reports-filter input,#reports .reports-filter select{height:41px!important;margin:0!important;background:#fff!important;border-color:#dce3eb!important;font-weight:650}

    #reports .reports-kpis{
      grid-template-columns:repeat(4,minmax(0,1fr))!important;
      gap:12px!important;
    }
    #reports .reports-kpi{
      position:relative;
      overflow:hidden;
      min-height:103px;
      padding:16px 15px 15px 57px!important;
      border-radius:16px!important;
    }
    #reports .reports-kpi:before{
      content:"";
      position:absolute;
      left:15px;
      top:17px;
      width:31px;
      height:31px;
      border-radius:10px;
      background:#eef4fa;
      box-shadow:0 6px 15px rgba(31,48,73,.055);
    }
    #reports .reports-kpi:after{
      position:absolute;
      left:23px;
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
    #reports .reports-kpi:nth-child(1):after{content:"▣"}
    #reports .reports-kpi:nth-child(2):after{content:"₣"}
    #reports .reports-kpi:nth-child(3):before{background:#fff1df}
    #reports .reports-kpi:nth-child(3):after{content:"−";color:#c96a00;font-size:18px}
    #reports .reports-kpi:nth-child(4):before{background:#eaf8f2}
    #reports .reports-kpi:nth-child(4):after{content:"↗";color:#07845d}
    #reports .reports-kpi:nth-child(5):before{background:#f0effa}
    #reports .reports-kpi:nth-child(5):after{content:"%";color:#655791}
    #reports .reports-kpi:nth-child(6):before{background:#fff3e5}
    #reports .reports-kpi:nth-child(6):after{content:"−";color:#bd6a00;font-size:18px}
    #reports .reports-kpi:nth-child(7):before{background:#e8f8f1}
    #reports .reports-kpi:nth-child(7):after{content:"✓";color:#07845d}
    #reports .reports-kpi span{font-size:8.5px!important;letter-spacing:.055em!important}
    #reports .reports-kpi strong{font-size:18px!important;letter-spacing:-.035em}
    #reports #reports-net-card strong{font-size:21px!important}
    #reports .reports-kpi small{line-height:1.35!important}

    #reports .reports-grid{grid-template-columns:minmax(0,1.55fr) minmax(320px,.72fr)!important;gap:13px!important}
    #reports .reports-panel{
      position:relative;
      overflow:hidden;
      padding:18px!important;
      border-radius:17px!important;
      background:radial-gradient(circle at 100% 0,rgba(255,145,18,.055),transparent 24%),rgba(255,255,255,.97)!important;
    }
    #reports .reports-panel:before{
      content:"";
      position:absolute;
      inset:0 0 auto;
      height:4px;
      background:linear-gradient(90deg,#ff8a00,#ffb34d 38%,#1b3a59 100%);
    }
    #reports .reports-panel:nth-child(2):before{background:linear-gradient(90deg,#1b3a59,#527da5 58%,#ff9a1a)}
    #reports .reports-panel-head{margin:3px 1px 14px!important;align-items:center!important}
    #reports .reports-panel-head h3{font-size:15px!important;letter-spacing:-.02em;color:#1d3047}
    #reports .reports-panel-head p{font-size:10px!important}
    #reports .reports-panel-badge{
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:6px 9px;
      border:1px solid #e2e8ef;
      border-radius:999px;
      background:#f8fafc;
      color:#68758a;
      font-size:8.5px;
      font-weight:800;
      white-space:nowrap;
    }
    #reports .reports-panel-badge:before{content:"";width:6px;height:6px;border-radius:50%;background:#ff9414;box-shadow:0 0 0 4px rgba(255,148,20,.1)}

    #reports .reports-table-wrap{
      border-radius:14px!important;
      border:1px solid #e4e9ef!important;
      box-shadow:0 7px 20px rgba(31,48,73,.035);
      background:#fff;
    }
    #reports .reports-table{min-width:1040px!important;border-collapse:separate;border-spacing:0}
    #reports .reports-table th{
      height:42px;
      padding:0 11px!important;
      background:#f5f8fb!important;
      border-bottom:1px solid #e2e8ef!important;
      color:#708095!important;
      font-size:8px!important;
      font-weight:850!important;
      letter-spacing:.055em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    #reports .reports-table td{
      height:64px;
      padding:10px 11px!important;
      border-bottom:1px solid #edf1f5!important;
      color:#2d3c50;
      font-size:10.5px;
    }
    #reports .reports-table tr:last-child td{border-bottom:0!important}
    #reports .reports-table tbody tr:not(.reports-empty-row){transition:background .14s ease,box-shadow .14s ease}
    #reports .reports-table tbody tr:not(.reports-empty-row):hover{background:#fbfcfe!important;box-shadow:inset 3px 0 0 #ff9414}
    #reports .reports-plate{
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
    #reports .reports-plate:before{content:"";width:7px;height:7px;border-radius:2px;background:#315f88}
    #reports .reports-money{font-weight:720!important;color:#435268}
    #reports .reports-margin{display:inline-flex;padding:6px 8px;border-radius:8px;background:#eaf8f2;color:#07845d!important;font-weight:900!important}
    #reports .reports-margin.negative{background:#fff0f1;color:#bd3d44!important}
    #reports td[data-net-cell="charges"]{color:#bd6a00!important;font-weight:800!important}
    #reports td[data-net-cell="net"]{font-size:11px!important}
    #reports .reports-rank{
      display:inline-grid;
      place-items:center;
      width:24px;
      height:24px;
      margin-right:7px;
      border-radius:8px;
      background:#f2f5f8;
      color:#738095;
      font-size:8.5px;
      font-weight:900;
    }
    #reports tr:nth-child(1) .reports-rank{background:#fff1d8;color:#b76000}
    #reports tr:nth-child(2) .reports-rank{background:#edf2f7;color:#49627b}
    #reports tr:nth-child(3) .reports-rank{background:#f7eee7;color:#8d633e}

    #reports .expense-breakdown{gap:15px!important;padding:3px 1px}
    #reports .breakdown-row{gap:7px!important}
    #reports .breakdown-label{font-size:10px!important}
    #reports .breakdown-label span{display:flex;align-items:center;gap:7px;color:#46566b!important}
    #reports .breakdown-label span:before{content:"";width:7px;height:7px;border-radius:3px;background:#ff9414}
    #reports .breakdown-row:nth-child(2) .breakdown-label span:before{background:#315f88}
    #reports .breakdown-row:nth-child(3) .breakdown-label span:before{background:#7b5b25}
    #reports .breakdown-row:nth-child(4) .breakdown-label span:before{background:#655791}
    #reports .breakdown-row:nth-child(5) .breakdown-label span:before{background:#8794a5}
    #reports .breakdown-label strong{font-size:9.5px!important}
    #reports .breakdown-track{height:9px!important;background:#edf1f5!important;box-shadow:inset 0 1px 2px rgba(31,48,73,.05)}
    #reports .breakdown-fill{background:linear-gradient(90deg,#ffad42,#ff8500)!important;box-shadow:0 3px 8px rgba(255,133,0,.17)}
    #reports .reports-insight{
      position:relative;
      margin-top:17px!important;
      padding:14px 14px 14px 45px!important;
      border-color:#e1e7ee!important;
      border-radius:13px!important;
      background:linear-gradient(145deg,#f8fafc,#fff)!important;
      line-height:1.6!important;
    }
    #reports .reports-insight:before{
      content:"i";
      position:absolute;
      left:13px;
      top:13px;
      width:22px;
      height:22px;
      display:grid;
      place-items:center;
      border-radius:8px;
      background:#fff1df;
      color:#bd6200;
      font-size:11px;
      font-weight:900;
    }

    #reports .reports-empty-cell{
      height:220px!important;
      padding:24px!important;
      text-align:center;
      background:linear-gradient(180deg,#fff,#fbfcfe);
    }
    .reports-premium-empty{display:grid;justify-items:center;gap:8px;max-width:350px;margin:auto}
    .reports-premium-empty-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:#fff3e3;color:#d66f00;box-shadow:0 8px 20px rgba(255,138,0,.11)}
    .reports-premium-empty-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .reports-premium-empty strong{font-size:13px;color:#21334a}
    .reports-premium-empty span{font-size:10px;line-height:1.55;color:#7b8797}

    @media(max-width:1250px){#reports .reports-kpis{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
    @media(max-width:1050px){#reports .reports-grid{grid-template-columns:1fr!important}}
    @media(max-width:740px){
      #reports .reports-heading{align-items:flex-start!important;flex-direction:column!important}
      #reports .reports-actions{width:100%;display:grid!important;grid-template-columns:1fr 1fr}
      #reports .reports-actions button{width:100%}
      #reports .reports-filter{width:100%;grid-template-columns:1fr!important}
      #reports .reports-kpis{grid-template-columns:1fr!important}
    }
    @media print{
      #reports .reports-heading{display:flex!important}
      #reports .reports-heading h2{display:block!important}
      #reports .reports-actions,#reports .reports-filter{display:none!important}
      #reports .reports-kpis{grid-template-columns:repeat(3,1fr)!important}
      #reports .reports-panel{box-shadow:none!important;border:1px solid #dfe5ec!important}
    }
  `;
  document.head.appendChild(style);

  const icons = {
    export: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
  };

  function enhanceActions() {
    const exportButton = document.getElementById('reports-export');
    const printButton = document.getElementById('reports-print');
    if (exportButton && !exportButton.dataset.premiumReady) {
      exportButton.dataset.premiumReady = 'true';
      exportButton.innerHTML = `${icons.export}<span>Exporter CSV</span>`;
    }
    if (printButton && !printButton.dataset.premiumReady) {
      printButton.dataset.premiumReady = 'true';
      printButton.innerHTML = `${icons.print}<span>Imprimer</span>`;
    }
  }

  function enhancePanels() {
    view.querySelectorAll('.reports-panel-head').forEach((head, index) => {
      if (head.querySelector('.reports-panel-badge')) return;
      const badge = document.createElement('span');
      badge.className = 'reports-panel-badge';
      badge.textContent = index === 0 ? 'Classement flotte' : 'Analyse des coûts';
      head.appendChild(badge);
    });
  }

  function enhanceRows() {
    const body = document.getElementById('reports-truck-body');
    if (!body) return;

    [...body.querySelectorAll('tr')].forEach((row, index) => {
      const empty = row.querySelector('.reports-empty,.reports-loading');
      if (empty) {
        row.classList.add('reports-empty-row');
        empty.classList.add('reports-empty-cell');
        const loading = empty.textContent.includes('Chargement');
        if (!empty.querySelector('.reports-premium-empty')) {
          empty.innerHTML = `<div class="reports-premium-empty"><span class="reports-premium-empty-icon">${icons.chart}</span><strong>${loading ? 'Préparation du rapport' : 'Aucune activité sur cette période'}</strong><span>${loading ? 'Nexis calcule les performances de la flotte.' : 'Sélectionnez un autre mois ou enregistrez des missions.'}</span></div>`;
        }
        return;
      }

      const plate = row.querySelector('.reports-plate');
      if (plate && !plate.querySelector('.reports-rank')) {
        plate.insertAdjacentHTML('afterbegin', `<span class="reports-rank">${index + 1}</span>`);
      }
    });
  }

  function initialize() {
    const body = document.getElementById('reports-truck-body');
    if (!body) return false;
    view.classList.add('reports-premium');
    enhanceActions();
    enhancePanels();
    enhanceRows();
    new MutationObserver(() => {
      enhanceRows();
      enhancePanels();
    }).observe(view, { childList: true, subtree: true });
    return true;
  }

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(view, { childList: true, subtree: true });
  }
})();