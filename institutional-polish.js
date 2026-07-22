(() => {
  if (document.documentElement.dataset.nexisInstitutionalReady === 'true') return;
  document.documentElement.dataset.nexisInstitutionalReady = 'true';

  if (!document.querySelector('link[data-nexis-institutional-polish]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'institutional-polish.css';
    link.dataset.nexisInstitutionalPolish = 'true';
    document.head.appendChild(link);
  }

  const translations = new Map([
    ['OPERATIONS', 'EXPLOITATION'],
    ['VARIABLE COSTS', 'DÉPENSES VARIABLES'],
    ['FIXED COSTS', 'CHARGES VÉHICULE'],
    ['GENERAL COSTS', 'CHARGES GÉNÉRALES'],
    ['CONTROLS', 'FILTRES ET EXPORTS'],
    ['EXECUTIVE SUMMARY', 'SYNTHÈSE MENSUELLE'],
    ['PERFORMANCE ENVIRONNEMENTALE', 'PERFORMANCE ENVIRONNEMENTALE']
  ]);

  document.querySelectorAll('.card-head__kicker, .eco-section__kicker').forEach((element) => {
    const current = element.textContent.trim().toUpperCase();
    if (translations.has(current)) {
      element.textContent = translations.get(current);
    }
  });

  const titleTranslations = new Map([
    ['Résumé exécutif', 'Synthèse mensuelle'],
    ['Filtres & actions', 'Filtres et exports']
  ]);

  document.querySelectorAll('h2').forEach((heading) => {
    const current = heading.textContent.trim();
    if (titleTranslations.has(current)) {
      heading.textContent = titleTranslations.get(current);
    }
  });
})();
