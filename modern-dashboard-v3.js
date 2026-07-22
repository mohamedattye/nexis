(() => {
  if (document.documentElement.dataset.modernDashboardV3 === 'true') return;
  document.documentElement.dataset.modernDashboardV3 = 'true';

  const icons = {
    Course: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l5-5 4 3 7-8M15 7h4v4"/></svg>',
    Dépenses: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h3"/></svg>',
    Charges: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg>',
    Résultats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
  };

  const enhanceNavigation = () => {
    const nav = document.querySelector('.nexis-quick-nav');
    if (!nav || nav.dataset.modernReady === 'true') return;
    nav.dataset.modernReady = 'true';
    nav.querySelectorAll('button').forEach((button) => {
      const label = button.textContent.trim();
      button.innerHTML = `${icons[label] || ''}<span>${label}</span>`;
    });
  };

  const addSectionDescriptions = () => {
    const descriptions = new Map([
      ['Nouvelle course', 'Enregistrez une nouvelle course en quelques secondes.'],
      ['Dépenses liées à la course', 'Renseignez les dépenses variables directement liées à la course.'],
      ['Charges mensuelles véhicule', 'Ajoutez les charges fixes et mécaniques du véhicule.']
    ]);

    document.querySelectorAll('.card-head').forEach((head) => {
      const title = head.querySelector('h2')?.textContent?.trim();
      if (!title || !descriptions.has(title) || head.querySelector('.modern-section-description')) return;
      const paragraph = document.createElement('p');
      paragraph.className = 'modern-section-description';
      paragraph.textContent = descriptions.get(title);
      head.querySelector('div:last-child')?.appendChild(paragraph);
    });
  };

  const enhanceKpis = () => {
    const labels = {
      'kpi-revenue': 'Période sélectionnée',
      'kpi-expenses': 'Période sélectionnée',
      'kpi-fixed': 'Période sélectionnée',
      'kpi-profit': 'Résultat après charges'
    };

    document.querySelectorAll('.kpi-box').forEach((card) => {
      if (card.dataset.modernReady === 'true') return;
      card.dataset.modernReady = 'true';
      const value = card.querySelector('h3');
      if (!value) return;
      const note = document.createElement('small');
      note.className = 'modern-kpi-note';
      note.textContent = labels[value.id] || 'Période sélectionnée';
      value.insertAdjacentElement('afterend', note);
    });
  };

  const enhanceButtons = () => {
    const tripButton = document.querySelector('#trip-form button[type="submit"]');
    const expenseButton = document.querySelector('#trip-expense-form button[type="submit"]');
    if (tripButton && !tripButton.querySelector('svg')) {
      tripButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Ajouter la course</span>';
    }
    if (expenseButton && !expenseButton.querySelector('svg')) {
      expenseButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg><span>Ajouter dépense</span>';
    }
  };

  const addInputPlaceholders = () => {
    const placeholders = {
      truck: 'Sélectionner un camion',
      'loading-zone': 'Sélectionner une zone',
      'unloading-zone': 'Sélectionner une zone',
      revenue: 'Montant'
    };
    Object.entries(placeholders).forEach(([id, placeholder]) => {
      const input = document.getElementById(id);
      if (input && !input.placeholder) input.placeholder = placeholder;
    });
  };

  const style = document.createElement('style');
  style.dataset.modernDashboardV3 = 'true';
  style.textContent = `
    :root {
      --nexis-blue: #075bf2;
      --nexis-blue-dark: #0348c9;
      --nexis-ink: #081a3a;
      --nexis-muted: #65748b;
      --nexis-border: #dce5f2;
      --nexis-surface: #ffffff;
    }

    body {
      background: linear-gradient(135deg, #f3f7fd 0%, #edf3fb 52%, #f7f9fc 100%) !important;
    }

    main.container {
      width: min(1380px, calc(100% - 32px)) !important;
    }

    .hero-v2 {
      border-radius: 24px !important;
      background:
        radial-gradient(circle at 86% 25%, rgba(25, 111, 255, .25), transparent 28%),
        radial-gradient(circle at 8% 5%, rgba(50, 134, 255, .15), transparent 24%),
        linear-gradient(115deg, #03152f 0%, #061c3c 52%, #06285c 100%) !important;
      box-shadow: 0 18px 45px rgba(10, 38, 84, .18) !important;
    }

    .hero-v2::before {
      content: '';
      position: absolute;
      inset: 0 0 0 auto;
      width: 38%;
      opacity: .20;
      background-image: radial-gradient(circle, #4a8fff 1.1px, transparent 1.2px);
      background-size: 13px 13px;
      mask-image: linear-gradient(to left, black, transparent);
      pointer-events: none;
    }

    .nexis-banner {
      min-height: 184px !important;
      padding: 25px 32px !important;
    }

    .nexis-banner__logo-wrap {
      width: 132px !important;
      height: 132px !important;
      flex-basis: 132px !important;
      border-radius: 25px !important;
      border: 1px solid rgba(94, 180, 255, .72) !important;
      background: linear-gradient(145deg, rgba(17, 50, 91, .95), rgba(3, 25, 57, .96)) !important;
      box-shadow: 0 0 0 1px rgba(83, 177, 255, .20), 0 16px 32px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12) !important;
    }

    .nexis-banner__logo {
      width: 112% !important;
      height: 112% !important;
      object-fit: contain !important;
    }

    .nexis-banner h1 {
      font-size: clamp(31px, 2.65vw, 43px) !important;
      max-width: 790px !important;
      white-space: normal !important;
    }

    .nexis-banner__subtitle {
      max-width: 650px !important;
      font-size: 16px !important;
      color: #d9e5f6 !important;
    }

    .nexis-banner__badge {
      padding: 10px 14px !important;
      border-radius: 12px !important;
      background: rgba(10, 34, 73, .72) !important;
      border-color: rgba(111, 166, 244, .45) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.07) !important;
    }

    .nexis-quick-nav {
      width: 100% !important;
      max-width: none !important;
      min-height: 58px;
      justify-content: center !important;
      gap: 16px !important;
      margin: 12px auto 16px !important;
      padding: 0 20px !important;
      border-radius: 17px !important;
      border: 1px solid rgba(218, 227, 240, .95) !important;
      box-shadow: 0 8px 22px rgba(23, 45, 84, .07) !important;
    }

    .nexis-quick-nav button {
      position: relative;
      display: inline-flex !important;
      align-items: center;
      gap: 9px;
      min-height: 58px;
      padding: 0 22px !important;
      border-radius: 0 !important;
      color: #26354d !important;
      font-size: 14px !important;
    }

    .nexis-quick-nav button svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .nexis-quick-nav button:hover,
    .nexis-quick-nav button.is-active {
      background: transparent !important;
      color: var(--nexis-blue) !important;
    }

    .nexis-quick-nav button.is-active::after {
      content: '';
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 0;
      height: 3px;
      border-radius: 4px 4px 0 0;
      background: var(--nexis-blue);
    }

    .kpi-strip {
      gap: 14px !important;
      margin-bottom: 16px !important;
    }

    .kpi-box {
      min-height: 108px;
      padding: 19px 20px !important;
      border: 1px solid var(--nexis-border) !important;
      border-radius: 17px !important;
      background: rgba(255,255,255,.97) !important;
      box-shadow: 0 9px 24px rgba(24, 52, 92, .07) !important;
    }

    .kpi-box__icon {
      width: 52px !important;
      height: 52px !important;
      border-radius: 14px !important;
      font-size: 25px !important;
    }

    .kpi-box p {
      color: #43516a !important;
      font-size: 13px !important;
      font-weight: 700 !important;
    }

    .kpi-box h3 {
      margin-top: 4px !important;
      color: var(--nexis-ink) !important;
      font-size: clamp(19px, 1.7vw, 25px) !important;
      letter-spacing: -.025em;
    }

    .modern-kpi-note {
      display: block;
      margin-top: 5px;
      color: #7b8799;
      font-size: 11px;
      font-weight: 600;
    }

    section.card {
      border: 1px solid var(--nexis-border) !important;
      border-radius: 19px !important;
      background: rgba(255,255,255,.98) !important;
      box-shadow: 0 8px 24px rgba(26, 54, 95, .06) !important;
    }

    #trip-form,
    #trip-expense-form {
      align-items: end;
    }

    .card-head {
      margin-bottom: 18px !important;
    }

    .card-head__icon {
      width: 48px !important;
      height: 48px !important;
      border-radius: 14px !important;
      background: linear-gradient(145deg, #e9f2ff, #dceaff) !important;
    }

    .card-head__kicker {
      color: var(--nexis-blue) !important;
      font-size: 11px !important;
      letter-spacing: .08em !important;
    }

    .card-head h2 {
      color: var(--nexis-ink) !important;
      font-size: 21px !important;
    }

    .modern-section-description {
      margin: 3px 0 0;
      color: var(--nexis-muted);
      font-size: 12px;
      font-weight: 500;
    }

    label {
      color: #25344d !important;
      font-size: 12.5px !important;
      font-weight: 700 !important;
    }

    input,
    select {
      min-height: 46px !important;
      border: 1px solid #d6e0ed !important;
      border-radius: 10px !important;
      background: #fff !important;
      color: #10213d !important;
      box-shadow: inset 0 1px 2px rgba(12, 35, 70, .025) !important;
    }

    input:focus,
    select:focus {
      outline: none !important;
      border-color: #6da3f4 !important;
      box-shadow: 0 0 0 3px rgba(40, 112, 232, .12) !important;
    }

    input::placeholder {
      color: #9aa8bb !important;
    }

    #trip-form button[type='submit'],
    #trip-expense-form button[type='submit'] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 47px;
      border-radius: 10px !important;
      background: linear-gradient(135deg, #075bf2, #034bd2) !important;
      box-shadow: 0 9px 18px rgba(3, 83, 225, .24) !important;
    }

    #trip-form button[type='submit'] svg,
    #trip-expense-form button[type='submit'] svg {
      width: 19px;
      height: 19px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    @media (max-width: 1180px) {
      .nexis-banner__logo-wrap {
        width: 110px !important;
        height: 110px !important;
        flex-basis: 110px !important;
      }
      .nexis-quick-nav { justify-content: flex-start !important; }
    }

    @media (max-width: 720px) {
      main.container { width: min(100% - 18px, 1380px) !important; }
      .nexis-banner__logo-wrap {
        width: 82px !important;
        height: 82px !important;
        flex-basis: 82px !important;
      }
      .nexis-banner h1 { font-size: 27px !important; }
      .nexis-quick-nav { padding: 0 8px !important; gap: 2px !important; }
      .nexis-quick-nav button { padding: 0 13px !important; }
      .nexis-quick-nav button svg { display: none; }
    }
  `;
  document.head.appendChild(style);

  const enhance = () => {
    enhanceNavigation();
    addSectionDescriptions();
    enhanceKpis();
    enhanceButtons();
    addInputPlaceholders();
  };

  const observer = new MutationObserver(() => window.requestAnimationFrame(enhance));
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
})();
