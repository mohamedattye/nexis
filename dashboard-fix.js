(() => {
  const VERSION = '20260723-enterprise-1';

  const loadStyle = (href, key) => {
    if (document.querySelector(`link[data-${key}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?v=${VERSION}`;
    link.setAttribute(`data-${key}`, 'true');
    document.head.appendChild(link);
  };

  const loadScript = (src, key) => {
    if (document.querySelector(`script[data-${key}]`)) return;
    const script = document.createElement('script');
    script.src = `${src}?v=${VERSION}`;
    script.async = false;
    script.setAttribute(`data-${key}`, 'true');
    document.body.appendChild(script);
  };

  const replaceBrokenLogos = () => {
    document.querySelectorAll('img[src*="logo-nexis"]').forEach((img) => {
      const fallback = document.createElement('div');
      fallback.className = 'nexis-logo-fallback';
      fallback.textContent = 'NX';
      img.addEventListener('error', () => img.replaceWith(fallback), { once: true });
      if (img.complete && img.naturalWidth === 0) img.replaceWith(fallback);
    });
  };

  const buildShell = () => {
    if (document.querySelector('[data-nexis-v2-shell]')) return;
    const main = document.querySelector('main.container');
    if (!main || !main.parentNode) return;

    document.body.dataset.nexisV2Shell = 'true';

    const shell = document.createElement('div');
    shell.className = 'nexis-v2-shell';
    shell.dataset.nexisV2Shell = 'true';

    const sidebar = document.createElement('aside');
    sidebar.className = 'nexis-v2-sidebar';
    sidebar.innerHTML = `
      <div class="nexis-v2-brand">
        <div class="nexis-logo-fallback">NX</div>
        <div><strong>NEXIS</strong><span>Pilotage logistique</span></div>
      </div>
      <nav class="nexis-v2-nav" aria-label="Navigation principale">
        <button type="button" class="is-active" data-target="top"><span>□</span>Tableau de bord</button>
        <button type="button" data-target="trip-form"><span>＋</span>Nouvelle course</button>
        <button type="button" data-target="trip-table-body"><span>≡</span>Courses</button>
        <button type="button" data-target="cost-form"><span>▣</span>Flotte & charges</button>
        <button type="button" data-target="general-expense-form"><span>₣</span>Dépenses</button>
        <button type="button" data-target="finance-chart"><span>⌁</span>Rapports</button>
      </nav>
      <div class="nexis-v2-sidebar-note">
        <span class="nexis-v2-status-dot"></span>
        <div><strong>Preview sécurisée</strong><small>Données Supabase connectées</small></div>
      </div>`;

    const workspace = document.createElement('div');
    workspace.className = 'nexis-v2-workspace';

    const topbar = document.createElement('header');
    topbar.className = 'nexis-v2-topbar';
    topbar.innerHTML = `
      <button type="button" class="nexis-v2-menu" aria-label="Ouvrir le menu">☰</button>
      <div><p>Centre de contrôle</p><h2>Vue d'ensemble de l'activité</h2></div>
      <div class="nexis-v2-topbar-actions">
        <button type="button" class="nexis-v2-search"><span>Rechercher</span></button>
        <button type="button" class="nexis-v2-primary" data-target="trip-form">Nouvelle course</button>
      </div>`;

    main.parentNode.insertBefore(shell, main);
    shell.append(sidebar, workspace);
    workspace.append(topbar, main);

    shell.querySelector('.nexis-v2-menu')?.addEventListener('click', () => {
      document.body.classList.toggle('nexis-v2-menu-open');
    });
  };

  const boot = () => {
    loadStyle('nexis-v2.css', 'nexis-v2-style');
    loadStyle('enterprise-v2.css', 'nexis-enterprise-style');
    replaceBrokenLogos();
    buildShell();
    loadScript('searchable-trucks.js', 'nexis-searchable-trucks');
    loadScript('banner-v2.js', 'nexis-banner-v2');
    loadScript('modern-dashboard-v3.js', 'nexis-modern-dashboard-v3');
    loadScript('enterprise-v2.js', 'nexis-enterprise-modules');

    window.setTimeout(() => {
      replaceBrokenLogos();
      buildShell();
    }, 500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();