(() => {
  const titles = {
    dashboard: ['Vue synthétique', 'Tableau de bord'],
    'new-trip': ['Saisie opérationnelle', 'Nouvelle course'],
    trips: ['Suivi opérationnel', 'Courses'],
    fleet: ['Gestion de flotte', 'Flotte'],
    expenses: ['Suivi financier', 'Dépenses'],
    reports: ['Analyse', 'Rapports'],
  };

  const showView = (viewId) => {
    const target = document.getElementById(viewId);
    if (!target) return;

    document.querySelectorAll('.view').forEach((view) => {
      view.classList.toggle('active', view.id === viewId);
    });

    document.querySelectorAll('.nav-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === viewId);
    });

    const [eyebrow, title] = titles[viewId] || titles.dashboard;
    document.getElementById('eyebrow').textContent = eyebrow;
    document.getElementById('page-title').textContent = title;

    history.replaceState(null, '', `#${viewId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.view));
  });

  const form = document.querySelector('#new-trip form');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const initialLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Enregistrement...';

    window.setTimeout(() => {
      submitButton.disabled = false;
      submitButton.textContent = initialLabel;
      alert('Prototype V3 : la connexion Supabase sera ajoutée après validation de cette interface.');
    }, 500);
  });

  const requestedView = location.hash.replace('#', '');
  showView(document.getElementById(requestedView) ? requestedView : 'dashboard');
})();