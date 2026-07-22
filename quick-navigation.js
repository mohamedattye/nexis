(() => {
  if (document.querySelector('.nexis-quick-nav')) return;

  const main = document.querySelector('main.container');
  if (!main) return;

  const sections = [...main.querySelectorAll('section.card')];
  const findSection = (title) =>
    sections.find((section) =>
      section.querySelector('h2')?.textContent?.trim().toLowerCase().includes(title)
    );

  const targets = [
    { label: 'Course', section: findSection('nouvelle course') },
    { label: 'Dépenses', section: findSection('dépenses liées') },
    { label: 'Charges', section: findSection('charges mensuelles') },
    { label: 'Résultats', section: document.querySelector('.stats') }
  ].filter((item) => item.section);

  if (!targets.length) return;

  const style = document.createElement('style');
  style.textContent = `
    .nexis-quick-nav {
      position: sticky;
      top: 10px;
      z-index: 50;
      display: flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
      max-width: calc(100% - 24px);
      margin: 14px auto 18px;
      padding: 6px;
      overflow-x: auto;
      border: 1px solid rgba(213, 224, 241, 0.92);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(10px);
      scrollbar-width: none;
    }

    .nexis-quick-nav::-webkit-scrollbar { display: none; }

    .nexis-quick-nav button {
      flex: 0 0 auto;
      border: 0;
      border-radius: 10px;
      padding: 9px 14px;
      background: transparent;
      color: #475569;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .nexis-quick-nav button:hover,
    .nexis-quick-nav button.is-active {
      background: #edf4ff;
      color: #1761c9;
    }

    .nexis-nav-target {
      scroll-margin-top: 86px;
    }

    @media (max-width: 640px) {
      .nexis-quick-nav {
        width: calc(100% - 20px);
        justify-content: flex-start;
        margin-top: 10px;
      }

      .nexis-quick-nav button {
        padding: 9px 12px;
      }
    }
  `;
  document.head.appendChild(style);

  const nav = document.createElement('nav');
  nav.className = 'nexis-quick-nav';
  nav.setAttribute('aria-label', 'Navigation rapide');

  targets.forEach(({ label, section }, index) => {
    section.classList.add('nexis-nav-target');

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    if (index === 0) button.classList.add('is-active');
    nav.appendChild(button);
  });

  const hero = main.querySelector('.hero-v2');
  if (hero) hero.insertAdjacentElement('afterend', nav);
  else main.prepend(nav);

  const buttons = [...nav.querySelectorAll('button')];
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      const activeIndex = targets.findIndex((item) => item.section === visible.target);
      buttons.forEach((button, index) => {
        button.classList.toggle('is-active', index === activeIndex);
      });
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: [0.01, 0.2, 0.5] }
  );

  targets.forEach(({ section }) => observer.observe(section));
})();
