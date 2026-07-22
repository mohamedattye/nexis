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
      margin-bottom: 18px;
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
      gap: 32px;
      min-height: 190px;
      padding: 30px 34px;
    }

    .nexis-banner__brand {
      display: flex;
      align-items: center;
      gap: 24px;
      min-width: 0;
    }

    .nexis-banner__logo-wrap {
      width: 112px;
      height: 112px;
      flex: 0 0 112px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border-radius: 24px;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 12px 28px rgba(0,0,0,.22);
    }

    .nexis-banner__logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 7px;
      filter: drop-shadow(0 6px 12px rgba(0,0,0,.24));
    }

    .nexis-banner__copy {
      max-width: 760px;
    }

    .nexis-banner__eyebrow {
      margin: 0 0 7px;
      color: #8fb7ff;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .18em;
    }

    .nexis-banner h1 {
      margin: 0;
      max-width: 760px;
      color: #fff;
      font-size: clamp(28px, 3vw, 45px);
      line-height: 1.08;
      letter-spacing: -.035em;
    }

    .nexis-banner__subtitle {
      max-width: 680px;
      margin: 12px 0 0;
      color: #cbd8ec;
      font-size: 16px;
      line-height: 1.55;
    }

    .nexis-banner__badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
      max-width: 390px;
    }

    .nexis-banner__badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 13px;
      border: 1px solid rgba(151,184,235,.20);
      border-radius: 14px;
      background: rgba(255,255,255,.055);
      color: #edf4ff;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      backdrop-filter: blur(6px);
    }

    .nexis-banner__badge svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: #67a0ff;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    @media (max-width: 1050px) {
      .nexis-banner {
        align-items: flex-start;
        flex-direction: column;
      }

      .nexis-banner__badges {
        justify-content: flex-start;
        max-width: none;
        padding-left: 136px;
      }
    }

    @media (max-width: 720px) {
      .hero-v2 {
        border-radius: 20px;
      }

      .nexis-banner {
        min-height: auto;
        padding: 24px 20px;
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