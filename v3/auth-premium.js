(() => {
  'use strict';

  if (window.__NEXIS_AUTH_PREMIUM__) return;
  window.__NEXIS_AUTH_PREMIUM__ = true;

  const style = document.createElement('style');
  style.textContent = `
    body.auth-locked .auth-overlay{
      padding:28px!important;
      background:
        radial-gradient(circle at 14% 10%,rgba(255,151,25,.13),transparent 27%),
        radial-gradient(circle at 90% 90%,rgba(32,70,106,.13),transparent 31%),
        linear-gradient(145deg,#edf2f7,#f7f9fc 48%,#e8eef5)!important;
    }
    body.auth-locked .auth-overlay:before{
      content:"";
      position:absolute;
      inset:0;
      pointer-events:none;
      opacity:.42;
      background-image:linear-gradient(rgba(29,55,82,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(29,55,82,.035) 1px,transparent 1px);
      background-size:34px 34px;
      mask-image:linear-gradient(to bottom,black,transparent 85%);
    }
    body.auth-locked .auth-overlay:after{
      content:"NEXIS  •  LOGISTICS ERP";
      position:fixed;
      left:32px;
      bottom:24px;
      color:rgba(39,64,91,.45);
      font-size:8px;
      font-weight:850;
      letter-spacing:.16em;
    }

    .auth-card{
      position:relative;
      z-index:1;
      width:min(455px,100%)!important;
      border-radius:20px!important;
      border:1px solid rgba(215,224,234,.96)!important;
      box-shadow:0 30px 90px rgba(13,32,54,.24)!important;
    }
    body.auth-locked .auth-card{
      width:min(960px,100%)!important;
      display:grid;
      grid-template-columns:minmax(0,1.05fr) minmax(390px,.95fr);
      min-height:570px;
      overflow:hidden;
      background:#fff!important;
    }
    body.auth-locked .auth-card:before{
      content:"";
      grid-column:1;
      grid-row:1/3;
      background:
        radial-gradient(circle at 80% 16%,rgba(255,154,28,.22),transparent 27%),
        linear-gradient(145deg,#11283f,#173a58 52%,#245478);
    }
    body.auth-locked .auth-card:after{
      content:"Pilotez les missions, les dépenses et la rentabilité de votre flotte depuis un seul espace sécurisé.";
      position:absolute;
      left:48px;
      top:185px;
      width:min(390px,42%);
      color:rgba(234,242,250,.78);
      font-size:14px;
      line-height:1.7;
    }
    body.auth-locked .auth-card-head{
      position:absolute;
      left:43px;
      top:40px;
      width:min(390px,42%);
      padding:0!important;
      border:0!important;
      background:transparent!important;
      z-index:2;
    }
    body.auth-locked .auth-card-brand img{
      width:58px!important;
      height:58px!important;
      border-radius:17px!important;
      background:rgba(255,255,255,.08);
      box-shadow:0 12px 28px rgba(0,0,0,.16);
    }
    body.auth-locked .auth-card-brand strong{color:#fff!important;font-size:22px!important;letter-spacing:.02em}
    body.auth-locked .auth-card-brand small{color:rgba(227,238,248,.65)!important;font-size:9px!important;letter-spacing:.06em;text-transform:uppercase}
    body.auth-locked .auth-card-body{
      grid-column:2;
      grid-row:1/3;
      display:flex;
      align-items:center;
      padding:48px 44px!important;
      background:#fff;
    }
    body.auth-locked #auth-login-view,body.auth-locked #auth-loading-view{width:100%}

    .auth-card-head{
      padding:18px 20px!important;
      background:linear-gradient(145deg,#fff,#f8fafc)!important;
    }
    .auth-card-brand img{box-shadow:0 6px 16px rgba(31,48,73,.08)}
    .auth-close{border-radius:10px!important;transition:background .14s ease,transform .14s ease}
    .auth-close:hover{transform:translateY(-1px)}
    .auth-card-body{padding:22px!important}
    .auth-intro h2{font-size:22px!important;letter-spacing:-.035em!important}
    body.auth-locked .auth-intro h2{font-size:27px!important;color:#14283f!important}
    .auth-intro p{font-size:11px!important;line-height:1.65!important}
    body.auth-locked .auth-intro p{margin-bottom:24px!important;font-size:12px!important}
    .auth-form{gap:15px!important}
    .auth-form label{font-size:9.5px!important;letter-spacing:.015em}
    .auth-form input{
      height:46px!important;
      margin-top:7px!important;
      border-radius:12px!important;
      background:#fbfcfe!important;
      transition:border-color .14s ease,box-shadow .14s ease,background .14s ease;
    }
    .auth-form input:focus{background:#fff!important}
    .auth-password-wrap{position:relative;margin-top:7px}
    .auth-password-wrap input{margin-top:0!important;padding-right:48px!important}
    .auth-password-toggle{
      position:absolute;
      right:6px;
      top:50%;
      transform:translateY(-50%);
      width:35px;
      height:35px;
      display:grid;
      place-items:center;
      border:0;
      border-radius:9px;
      background:transparent;
      color:#738095;
      cursor:pointer;
    }
    .auth-password-toggle:hover{background:#eef3f7;color:#344a61}
    .auth-password-toggle svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .auth-submit{
      height:46px!important;
      border-radius:12px!important;
      font-size:11px!important;
      box-shadow:0 10px 22px rgba(255,133,0,.24)!important;
      transition:transform .14s ease,box-shadow .14s ease!important;
    }
    .auth-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 13px 27px rgba(255,133,0,.3)!important}
    .auth-security-note{
      position:relative;
      margin-top:17px!important;
      padding:11px 12px 11px 40px!important;
      border-radius:11px!important;
      background:linear-gradient(145deg,#f8fafc,#fff)!important;
    }
    .auth-security-note:before{
      content:"✓";
      position:absolute;
      left:12px;
      top:10px;
      width:20px;
      height:20px;
      display:grid;
      place-items:center;
      border-radius:7px;
      background:#eaf8f2;
      color:#07845d;
      font-size:9px;
      font-weight:900;
    }
    .auth-error{border-radius:11px!important}

    .auth-user-button{
      position:relative;
      height:36px!important;
      padding:0 12px 0 38px!important;
      border-radius:12px!important;
      max-width:235px!important;
      box-shadow:0 5px 15px rgba(31,48,73,.04);
    }
    .auth-user-button:before{
      position:absolute;
      left:8px;
      width:23px!important;
      height:23px!important;
      display:grid;
      place-items:center;
      border-radius:8px!important;
      background:linear-gradient(145deg,#e8f7f0,#dff3ea)!important;
      box-shadow:inset 0 0 0 1px rgba(16,139,98,.1);
    }
    .auth-user-button:after{
      content:"";
      position:absolute;
      left:16px;
      top:12px;
      width:7px;
      height:7px;
      border:1.5px solid #07845d;
      border-radius:50%;
      box-sizing:border-box;
    }

    .auth-account{gap:15px!important}
    .auth-account-box{
      position:relative;
      padding:16px 16px 16px 61px!important;
      border-radius:14px!important;
      background:linear-gradient(145deg,#f8fafc,#fff)!important;
    }
    .auth-account-avatar{
      position:absolute;
      left:15px;
      top:16px;
      width:34px;
      height:34px;
      display:grid;
      place-items:center;
      border-radius:11px;
      background:linear-gradient(145deg,#eaf1f8,#f7fafc);
      color:#315b82;
      font-size:10px;
      font-weight:900;
      box-shadow:0 5px 12px rgba(31,48,73,.06);
    }
    .auth-role{border:1px solid #ccebdc}
    .auth-logout{
      height:42px!important;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      border-radius:11px!important;
      transition:background .14s ease,transform .14s ease!important;
    }
    .auth-logout:hover:not(:disabled){transform:translateY(-1px)}
    .auth-logout svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .auth-loading{min-height:190px!important}
    .auth-spinner{width:38px!important;height:38px!important;border-width:3px!important}

    @media(max-width:820px){
      body.auth-locked .auth-overlay{padding:16px!important}
      body.auth-locked .auth-card{display:block;min-height:0;width:min(455px,100%)!important}
      body.auth-locked .auth-card:before,body.auth-locked .auth-card:after{display:none}
      body.auth-locked .auth-card-head{position:static;width:auto;padding:18px 20px!important;border-bottom:1px solid #e8edf3!important;background:linear-gradient(145deg,#fff,#f8fafc)!important}
      body.auth-locked .auth-card-brand img{width:44px!important;height:44px!important;border-radius:12px!important;background:transparent}
      body.auth-locked .auth-card-brand strong{color:#172942!important;font-size:16px!important}
      body.auth-locked .auth-card-brand small{color:#7b8796!important;font-size:8px!important}
      body.auth-locked .auth-card-body{display:block;padding:24px!important}
      body.auth-locked .auth-intro h2{font-size:23px!important}
      body.auth-locked .auth-overlay:after{display:none}
    }
    @media(max-width:520px){
      .auth-card{border-radius:16px!important}
      .auth-card-body,body.auth-locked .auth-card-body{padding:20px!important}
      .auth-user-button{max-width:145px!important}
    }
  `;
  document.head.appendChild(style);

  const icons = {
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.4-5.2 9.2-5.2S21.2 12 21.2 12s-3.4 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.9A9.6 9.6 0 0 1 12 6.8c5.8 0 9.2 5.2 9.2 5.2a16.4 16.4 0 0 1-2.4 2.8M6.3 7.4C4.1 9 2.8 12 2.8 12s3.4 5.2 9.2 5.2c1 0 2-.2 2.8-.4M10.2 10.2a2.5 2.5 0 0 0 3.6 3.6"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>'
  };

  function initials(name, email) {
    const source = String(name || email || 'N').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
  }

  function enhance() {
    const overlay = document.querySelector('.auth-overlay');
    const password = document.getElementById('auth-password');
    const accountBox = document.querySelector('.auth-account-box');
    const logout = document.getElementById('auth-logout');
    if (!overlay || !password || !accountBox || !logout) return false;

    if (!password.parentElement.classList.contains('auth-password-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'auth-password-wrap';
      password.parentNode.insertBefore(wrap, password);
      wrap.appendChild(password);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'auth-password-toggle';
      toggle.setAttribute('aria-label', 'Afficher le mot de passe');
      toggle.innerHTML = icons.eye;
      wrap.appendChild(toggle);
      toggle.addEventListener('click', () => {
        const show = password.type === 'password';
        password.type = show ? 'text' : 'password';
        toggle.innerHTML = show ? icons.eyeOff : icons.eye;
        toggle.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
        password.focus();
      });
    }

    if (!accountBox.querySelector('.auth-account-avatar')) {
      const avatar = document.createElement('span');
      avatar.className = 'auth-account-avatar';
      accountBox.insertBefore(avatar, accountBox.firstChild);
    }

    if (!logout.dataset.premiumReady) {
      logout.dataset.premiumReady = 'true';
      logout.innerHTML = `${icons.logout}<span>Se déconnecter</span>`;
    }

    const syncAccount = () => {
      const avatar = accountBox.querySelector('.auth-account-avatar');
      const email = document.getElementById('auth-account-email')?.textContent;
      const name = document.getElementById('auth-account-name')?.textContent;
      if (avatar) avatar.textContent = initials(name, email);
    };
    syncAccount();
    new MutationObserver(syncAccount).observe(accountBox, { childList: true, subtree: true, characterData: true });
    return true;
  }

  if (!enhance()) {
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();