(() => {
  const stats = document.getElementById('stats');
  const summary = document.querySelector('.executive-summary');
  const grid = summary?.querySelector('.summary-grid');

  if (!stats || !summary || !grid) return;

  const style = document.createElement('style');
  style.textContent = `
    #stats.nexis-source-stats {
      display: none !important;
    }

    .executive-summary .summary-grid.nexis-unified-summary {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
    }

    .executive-summary .summary-card {
      min-width: 0;
    }

    .executive-summary .summary-card p {
      margin: 0 0 7px;
      font-size: 0.74rem;
      line-height: 1.25;
    }

    .executive-summary .summary-card h3 {
      margin: 0;
      font-size: 1.08rem;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .executive-summary .summary-card.is-positive h3 {
      color: #059669;
    }

    .executive-summary .summary-card.is-negative h3 {
      color: #dc2626;
    }

    @media (max-width: 1180px) {
      .executive-summary .summary-grid.nexis-unified-summary {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 700px) {
      .executive-summary .summary-grid.nexis-unified-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 430px) {
      .executive-summary .summary-grid.nexis-unified-summary {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);

  stats.classList.add('nexis-source-stats');
  summary.classList.add('nexis-nav-target');
  grid.classList.add('nexis-unified-summary');

  const kicker = summary.querySelector('.card-head__kicker');
  const title = summary.querySelector('h2');
  if (kicker) kicker.textContent = 'SYNTHÈSE MENSUELLE';
  if (title) title.textContent = 'Synthèse mensuelle';

  grid.innerHTML = `
    <div class="summary-card">
      <p>Courses</p>
      <h3 id="summary-trips">0</h3>
    </div>
    <div class="summary-card">
      <p>Chiffre d’affaires</p>
      <h3 id="summary-revenue">0 FCFA</h3>
    </div>
    <div class="summary-card">
      <p>Dépenses totales</p>
      <h3 id="summary-expenses">0 FCFA</h3>
    </div>
    <div class="summary-card">
      <p>Marge opérationnelle</p>
      <h3 id="summary-margin">0 FCFA</h3>
    </div>
    <div class="summary-card">
      <p>Résultat net</p>
      <h3 id="summary-profit">0 FCFA</h3>
    </div>
    <div class="summary-card">
      <p>Rentabilité</p>
      <h3 id="summary-ratio">0%</h3>
    </div>
  `;

  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const amount = (value) => {
    const parsed = Number(String(value || '').replace(/[^0-9-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const money = (value) =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FCFA`;

  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const setStatus = (id, value) => {
    const card = document.getElementById(id)?.closest('.summary-card');
    if (!card) return;
    card.classList.toggle('is-negative', value < 0);
    card.classList.toggle('is-positive', value > 0);
  };

  const sync = () => {
    const values = new Map();

    stats.querySelectorAll('.stat-card').forEach((card) => {
      const label = normalize(card.querySelector('h3')?.textContent);
      const value = card.querySelector('p')?.textContent?.trim();
      if (label && value) values.set(label, value);
    });

    const trips = values.get('courses') || '0';
    const revenue = amount(values.get("chiffre d'affaires"));
    const variableExpenses = amount(values.get('depenses course'));
    const fixedExpenses = amount(values.get('charges fixes/mecaniques'));
    const margin = amount(values.get('marge operationnelle'));
    const profit = amount(values.get('resultat net reel'));
    const totalExpenses = variableExpenses + fixedExpenses;
    const ratio = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    setValue('summary-trips', trips);
    setValue('summary-revenue', money(revenue));
    setValue('summary-expenses', money(totalExpenses));
    setValue('summary-margin', money(margin));
    setValue('summary-profit', money(profit));
    setValue('summary-ratio', `${ratio}%`);

    setStatus('summary-margin', margin);
    setStatus('summary-profit', profit);
  };

  const observer = new MutationObserver(sync);
  observer.observe(stats, { childList: true, subtree: true, characterData: true });
  sync();

  // Le raccourci Résultats doit mener à la synthèse unique.
  window.setTimeout(() => {
    const resultButton = [...document.querySelectorAll('.nexis-quick-nav button')]
      .find((button) => normalize(button.textContent) === 'resultats');

    if (resultButton) {
      const replacement = resultButton.cloneNode(true);
      resultButton.replaceWith(replacement);
      replacement.addEventListener('click', () => {
        summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, 100);
})();
