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
     