(() => {
  const hero = document.querySelector('.hero-v2');
  if (!hero || hero.dataset.bannerV2Ready === 'true') return;

  hero.dataset.bannerV2Ready = 'true';
  hero.innerHTML = `
    <div class="nexis-banner">
      <div class="nexis-banner__brand">
        <div class="nexis-banner__logo-wrap">
          <img src="assets/logo-nexis.png" alt="Nexis Logistics" class="nexis-banner__logo" />
        </div>
        <div class="nexis-banner__copy">
          <p class="nexis-banner__eyebrow">NEXIS LOGISTICS</p>
          <h1>Pilotage logistique simple et rentable</h1>
          <p class="nexis-banner__subtitle">
            Centralisez vos opérations, maîtrisez vos coûts et pilotez la rentabilité de votre flotte en temps réel.
          </p>
        </div>
      </div>

      <div class="nexis-banner__badges" aria-label="Points forts de Nexis">
        <span class="nexis-banner__badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
          Flotte connectée
        </span>
        <span class="nexis-banner__badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2"/></svg>
          Temps réel
        </span>
        <span class="nexis-banner__badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7h9v8H2zM13 9h6l3 3v3h-9zM5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
          Multi-camions
        </span>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.dataset.nexisBannerV2 = 'true';
  style.textContent = `
    .hero-v2 {
      position: relative;
      overflow: hidden;
      margin-bottom: 16px;
      padding: 0;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 26px;
      background:
        radial-gradient(circle at 12% 15%, rgba(37,99,235,.28), transparent 33%),
        linear-gradient(120deg, #07172f 0%, #0b1d3a 56%, #0a2247 100%);
      box-shadow: 0 20px 45px rgba(15, 35, 70, .18);
    }

    .hero-v2::after {
      content: '';
      position: absolute;
      right: -120px;
      bottom: -170px;
      width: 430px;
      height: 430px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(20,107,255,.20), transparent 68%);
      pointer-events: none;
    }

    .nexis-banner {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      min-height: 160px;
      padding: 22px 30px;
    }

    .nexis-banner__brand {
      display: flex;
      align-items: center;
      gap: 20px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .nexis-banner__logo-wrap {
      width: 104px;
      height: 104px;
      flex: 0 0 104px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border-radius: 22px;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 12px 28px rgba(0,0,0,.22);
    }

    .nexis-banner__logo {
      width: 130%;
      height: 130%;
      max-width: none;
      object-fit: contain;
      padding: 0;
      filter: drop-shadow(0 6px 12px rgba(0,0,0,.24));
    }

    .nexis-banner__copy {
      min-width: 0;
      max-width: 660px;
    }

    .nexis-banner__eyebrow {
      margin: 0 0 6px;
      color: #9fc1ff;
      font-size: 12.5px;
      font-weight: 800;
      letter-spacing: .18em;
    }

    .nexis-banner h1 {
      margin: 0;
      max-width: 660px;
      color: #fff;
      font-size: clamp(27px, 2vw, 32px);
      line-height: 1.08;
      letter-spacing: -.03em;
    }

    .nexis-banner__subtitle {
      max-width: 640px;
      margin: 9px 0 0;
      color: #e1e9f5;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.45;
    }

    .nexis-banner__badges {
      display: flex;
      flex-wrap: nowrap;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      max-width: none;
      flex: 0 0 auto;
    }

    .nexis-banner__badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 11px;
      border: 1px solid rgba(151,184,235,.24);
      border-radius: 13px;
      background: rgba(255,255,255,.065);
      color: #f4f7fc;
      font-size: 12.5px;
      font-weight: 750;
      white-space: nowrap;
      backdrop-filter: blur(6px);
    }

    .nexis-banner__badge svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: #76a9ff;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    @media (min-width: 1180px) {
      .nexis-banner h1 {
        white-space: nowrap;
      }
    }

    @media (max-width: 1179px) {
      .nexis-banner {
        align-items: flex-start;
        flex-direction: column;
      }

      .nexis-banner__badges {
        flex-wrap: wrap;
        justify-content: flex-start;
        max-width: none;
        padding-left: 124px;
      }
    }

    @media (max-width: 720px) {
      .hero-v2 {
        border-radius: 20px;
      }

      .nexis-banner {
        min-height: auto;
        padding: 22px 20px;
      }

      .nexis-banner__brand {
        align-items: flex-start;
        gap: 16px;
      }

      .nexis-banner__logo-wrap {
        width: 76px;
        height: 76px;
        flex-basis: 76px;
        border-radius: 18px;
      }

      .nexis-banner h1 {
        font-size: 26px;
      }

      .nexis-banner__subtitle {
        font-size: 14px;
      }

      .nexis-banner__badges {
        padding-left: 0;
      }
    }

    @media (max-width: 500px) {
      .nexis-banner__brand {
        flex-direction: column;
      }

      .nexis-banner__badge {
        width: 100%;
        justify-content: center;
      }
    }
  `;
  document.head.appendChild(style);
})();
