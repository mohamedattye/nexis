(() => {
  'use strict';

  const nav = document.querySelector('.sidebar nav');
  if (!nav || nav.dataset.enhanced === 'true') return;

  const icons = {
    dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
    'new-trip': '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/></svg>',
    trips: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    fleet: '<svg viewBox="0 0 24 24"><path d="M3 15V8h12l3 4h3v3"/><path d="M5 15h14"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    expenses: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h2M14 15h1"/></svg>',
    'vehicle-charges': '<svg viewBox="0 0 24 24"><path d="M4 7h16M7 3h10l2 4H5z"/><path d="M5 7v12h14V7"/><circle cx="9" cy="13" r="2"/><path d="M13 13h3M13 16h3"/></svg>',
    reports: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/><path d="M2 20h20"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><circle cx="17" cy="9" r="2"/><path d="M16 14a5 5 0 0 1 5 5v1"/></svg>'
  };

  const groups = [
    { title: 'Opérations', views: ['dashboard', 'new-trip', 'trips', 'fleet'] },
    { title: 'Pilotage', views: ['expenses', 'vehicle-charges', 'reports'] },
    { title: 'Administration', views: ['users'] }
  ];

  function decorate(button) {
    if (!button || button.querySelector('.nav-icon')) return button;
    const view = button.dataset.view || '';
    const label = button.textContent.trim();
    button.textContent = '';
    const icon = document.createElement('span');
    icon.className = 'nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = icons[view] || icons.trips;
    const text = document.createElement('span');
    text.className = 'nav-label';
    text.textContent = label;
    button.append(icon, text);
    return button;
  }

  function rebuild() {
    const buttons = new Map([...nav.querySelectorAll('.nav-item[data-view]')].map((button) => [button.dataset.view, button]));
    const fragment = document.createDocumentFragment();

    groups.forEach((group) => {
      const available = group.views.map((view) => buttons.get(view)).filter(Boolean);
      if (!available.length) return;

      const section = document.createElement('section');
      section.className = 'nav-group';
      section.dataset.group = group.title.toLowerCase();

      const title = document.createElement('span');
      title.className = 'nav-group-title';
      title.textContent = group.title;

      const items = document.createElement('div');
      items.className = 'nav-group-items';
      available.forEach((button) => items.appendChild(decorate(button)));

      section.append(title, items);
      fragment.appendChild(section);
    });

    [...buttons.values()].filter((button) => !grouped(button.dataset.view)).forEach((button) => {
      fragment.appendChild(decorate(button));
    });

    nav.replaceChildren(fragment);
    nav.dataset.enhanced = 'true';
  }

  function grouped(view) {
    return groups.some((group) => group.views.includes(view));
  }

  rebuild();

  new MutationObserver(() => {
    if ([...nav.querySelectorAll(':scope > .nav-item')].length) {
      nav.dataset.enhanced = 'false';
      rebuild();
    }
  }).observe(nav, { childList: true });
})();