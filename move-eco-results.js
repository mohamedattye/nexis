(() => {
  const ecoStrip = document.querySelector('.eco-strip');
  const chartsGrid = document.querySelector('.charts-grid');

  if (!ecoStrip || !chartsGrid) return;

  const wrapper = document.createElement('section');
  wrapper.className = 'eco-results-card';
  wrapper.setAttribute('aria-label', 'Indicateurs environnementaux');

  const heading = document.createElement('div');
  heading.className = 'eco-results-heading';
  heading.innerHTML = `
    <div>
      <p class="eco-results-kicker">PERFORMANCE ENVIRONNEMENTALE</p>
      <h2>Indicateurs écologiques</h2>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .eco-results-card {
      margin-top: 18px;
      background: #ffffff;
      border-radius: 22px;
      padding: 22px;
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
    }

    .eco-results-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .eco-results-heading h2 {
      margin: 3px 0 0;
      font-size: 20px;
      color: #0f172a;
    }

    .eco-results-kicker {
      margin: 0;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #0f9f6e;
    }

    .eco-results-card .eco-strip {
      margin: 0;
      box-shadow: none;
      background: transparent;
    }

    @media (max-width: 760px) {
      .eco-results-card {
        padding: 16px;
      }
    }
  `;

  document.head.appendChild(style);
  chartsGrid.parentNode.insertBefore(wrapper, chartsGrid);
  wrapper.appendChild(heading);
  wrapper.appendChild(ecoStrip);
})();
