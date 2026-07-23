(() => {
  const byIdSection = (id) => document.getElementById(id)?.closest('section') || null;

  const collectModules = () => {
    const modules = {
      dashboard: [],
      newTrip: [],
      trips: [],
      fleet: [],
      expenses: [],
      reports: [],
    };

    const push = (name, element) => {
      if (element && !modules[name].includes(element)) modules[name].push(element);
    };

    push('dashboard', document.querySelector('.hero-v2'));
    push('dashboard', document.querySelector('.kpi-strip'));
    push('dashboard', document.querySelector('.eco-strip'));
    push('dashboard', document.getElementById('stats'));
    push('dashboard', document.querySelector('.executive-summary'));

    push('newTrip', byIdSection('trip-form'));
    push('newTrip', byIdSection('trip-expense-form'));

    push('trips', document.querySelector('.filters'));
    push('trips', byIdSection('trip-table-body'));

    push('fleet', byIdSection('cost-form'));
    push('fleet', byIdSection('cost-table-body'));
    push('fleet', byIdSection('review-table-body'));

    push('expenses', byIdSection('general-expense-form'));

    push('reports', document.querySelector('.executive-summary'));
    push('reports', document.querySelector('.charts-grid'));

    return modules;
  };

  const allManagedSections = (modules) =>
    [...new Set(Object.values(modules).flat().filter(Boolean))];

  const titles = {
    dashboard: ["Tableau de bord", "Vue synthétique de l'activité"],
    newTrip: ["Nouvelle course", "Saisie opérationnelle"],
    trips: ["Courses", "Historique et suivi"],
    fleet: ["Flotte & charges", "Coûts véhicules et performance"],
    expenses: ["Dépenses", "Charges générales"],
    reports: ["Rapports", "Analyse financière"],
  };

  const activateModule = (moduleName, modules) => {
    const managed = allManagedSections(modules);
    managed.forEach((section) => {
      section.dataset.erpHidden = modules[moduleName]?.includes(section) ? 'false' : 'true';
    });

    const [title, subtitle] = titles[moduleName] || titles.dashboard;
    const topbar = document.querySelector('.nexis-v2-topbar');
    if (topbar) {
      const eyebrow = topbar.querySelector('p');
      const heading = topbar.querySelector('h2');
      if (eyebrow) eyebrow.textContent = subtitle;
      if (heading) heading.textContent = title;
    }

    document.querySelectorAll('.nexis-v2-nav button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.module === moduleName);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    localStorage.setItem('nexis-v2-active-module', moduleName);
  };

  const buildTabs = (modules) => {
    const main = document.querySelector('main.container');
    if (!main || document.querySelector('.nexis-module-tabs')) return;

    const tabs = document.createElement('div');
    tabs.className = 'nexis-module-tabs';
    const items = [
      ['dashboard', 'Tableau de bord'],
      ['newTrip', 'Nouvelle course'],
      ['trips', 'Courses'],
      ['fleet', 'Flotte'],
      ['expenses', 'Dépenses'],
      ['reports', 'Rapports'],
    ];

    items.forEach(([moduleName, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.module = moduleName;
      button.textContent = label;
      button.addEventListener('click', () => activateModule(moduleName, modules));
      tabs.appendChild(button);
    });

    main.prepend(tabs);
  };

  const wireSidebar = (modules) => {
    const mapping = {
      top: 'dashboard',
      'trip-form': 'newTrip',
      'trip-table-body': 'trips',
      'cost-form': 'fleet',
      'general-expense-form': 'expenses',
      'finance-chart': 'reports',
    };

    document.querySelectorAll('.nexis-v2-nav button[data-target]').forEach((button) => {
      const moduleName = mapping[button.dataset.target];
      if (!moduleName) return;
      button.dataset.module = moduleName;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        activateModule(moduleName, modules);
      }, true);
    });

    document.querySelector('.nexis-v2-primary')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateModule('newTrip', modules);
    }, true);
  };

  const removeDecorativeEmoji = () => {
    document.querySelectorAll('.kpi-box__icon, .card-head__icon, .eco-item > span').forEach((element) => {
      element.setAttribute('aria-hidden', 'true');
    });
  };

  const boot = () => {
    const modules = collectModules();
    buildTabs(modules);
    wireSidebar(modules);
    removeDecorativeEmoji();

    const saved = localStorage.getItem('nexis-v2-active-module');
    activateModule(modules[saved] ? saved : 'dashboard', modules);

    document.querySelectorAll('.nexis-module-tabs button').forEach((button) => {
      const observer = new MutationObserver(() => {
        button.classList.toggle('is-active', button.dataset.module === localStorage.getItem('nexis-v2-active-module'));
      });
      observer.observe(document.body, { attributes: true, subtree: true });
    });

    const syncTabs = () => {
      const active = localStorage.getItem('nexis-v2-active-module') || 'dashboard';
      document.querySelectorAll('.nexis-module-tabs button').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.module === active);
      });
    };
    syncTabs();
    window.addEventListener('storage', syncTabs);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 700), { once: true });
  } else {
    setTimeout(boot, 700);
  }
})();