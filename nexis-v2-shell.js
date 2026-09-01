(() => {
  if (document.querySelector('[data-nexis-v2-shell]')) return;

  const main = document.querySelector('main.container');
  if (!main) return;

  document.body.dataset.nexisV2Shell = 'true';

  const shell = document.createElement('div');
  shell.className = 'nexis-v2-shell';
  shell.dataset.nexisV2Shell = 'true';

  const sidebar = document.createElement('aside');
  sidebar.className = 'nexis-v2-sidebar';
  sidebar.innerHTML = `
    <div class="nexis-v2-brand">
      <img src="assets/logo-nexis.png" alt="Nexis" />
      <div><strong>NEXIS</strong><span>Pilotage logistique</span></div>
    </div>
    <nav class="nexis-v2-nav" aria-label="Navigation principale">
      <button type="button" class="is-active" data-target="top"><span>⌂</span>Tableau de bord</button>
      <button type="button" data-target="trip-form"><span>↗</span>Nouvelle course</button>
      <button type="button" data-target="trip-table-body"><span>▤</span>Courses</button>
      <button type="button" data-target="cost-form"><span>▣</span>Flotte & charges</button>
      <button type="button" data-target="general-expense-form"><span>₣</span>Dépenses</button>
      <button type="button" data-target="finance-chart"><span>⌁</span>Rapports</button>
    </nav>
    <div class="nexis-v2-sidebar-note">
      <span class="nexis-v2-status-dot"></span>
      <div><strong>Production active</strong><small>Vos données restent connectées</small></div>
    </div>`;

  const workspace = document.createElement('div');
  workspace.className = 'nexis-v2-workspace';

  const topbar = document.createElement('header');
  topbar.className = 'nexis-v2-topbar';
  topbar.innerHTML = `
    <button type="button" class="nexis-v2-menu" aria-label="Ouvrir le menu">☰</button>
    <div>
      <p>Centre de contrôle</p>
      <h2>Vue d'ensemble de l'activité</h2>
    </div>
    <div class="nexis-v2-topbar-actions">
      <button type="button" class="nexis-v2-search" aria-label="Rechercher">⌕ <span>Rechercher</span></button>
      <button type="button" class="nexis-v2-primary" data-target="trip-form">+ Nouvelle course</button>
    </div>`;

  main.parentNode.insertBefore(shell, main);
  shell.appendChild(sidebar);
  shell.appendChild(workspace);
  workspace.appendChild(topbar);
  workspace.appendChild(main);

  const scrollToTarget = (target) => {
    if (target === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(target);
    const section = element?.closest('section') || element;
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  shell.querySelectorAll('[data-target]').forEach((button) => {
    button.addEventListener('click', () => {
      scrollToTarget(button.dataset.target);
      if (button.closest('.nexis-v2-nav')) {
        shell.querySelectorAll('.nexis-v2-nav button').forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');
      }
      document.body.classList.remove('nexis-v2-menu-open');
    });
  });

  shell.querySelector('.nexis-v2-menu')?.addEventListener('click', () => {
    document.body.classList.toggle('nexis-v2-menu-open');
  });
})();
