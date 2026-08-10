(() => {
  'use strict';

  const TEST_SUPABASE_URL = 'https://kvtivxvopdunphydqybc.supabase.co';
  const TEST_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5GxFfEObAfXUJ7-CubL3-g_3eZlZQHq';
  const SAAS_TEST_APP_URL = 'https://nexis-saas-test.onrender.com/';

  if (!window.supabase?.createClient) {
    console.error('Supabase JS indisponible : configuration de test non appliquée.');
    return;
  }

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  window.supabase.createClient = function createNexisTestClient() {
    const client = originalCreateClient(TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY);

    // En environnement SaaS Test, toutes les confirmations et récupérations
    // doivent revenir sur le nouveau domaine, même si l'utilisateur a encore
    // un ancien onglet nexis-v2-preview ouvert dans son navigateur.
    if (client?.auth) {
      const originalSignUp = client.auth.signUp.bind(client.auth);
      client.auth.signUp = function nexisSignUp(credentials = {}) {
        return originalSignUp({
          ...credentials,
          options: {
            ...(credentials.options || {}),
            emailRedirectTo: SAAS_TEST_APP_URL
          }
        });
      };

      const originalResetPasswordForEmail = client.auth.resetPasswordForEmail.bind(client.auth);
      client.auth.resetPasswordForEmail = function nexisResetPasswordForEmail(email, options = {}) {
        return originalResetPasswordForEmail(email, {
          ...options,
          redirectTo: SAAS_TEST_APP_URL
        });
      };
    }

    return client;
  };

  window.NEXIS_ENVIRONMENT = Object.freeze({
    name: 'test',
    project: 'Nexis V3 Test',
    url: TEST_SUPABASE_URL,
    appUrl: SAAS_TEST_APP_URL
  });
})();