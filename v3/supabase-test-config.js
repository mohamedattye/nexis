(() => {
  'use strict';

  const TEST_SUPABASE_URL = 'https://kvtivxvopdunphydqybc.supabase.co';
  const TEST_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5GxFfEObAfXUJ7-CubL3-g_3eZlZQHq';

  if (!window.supabase?.createClient) {
    console.error('Supabase JS indisponible : configuration de test non appliquée.');
    return;
  }

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  window.supabase.createClient = function createNexisTestClient() {
    return originalCreateClient(TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY);
  };

  window.NEXIS_ENVIRONMENT = Object.freeze({
    name: 'test',
    project: 'Nexis V3 Test',
    url: TEST_SUPABASE_URL
  });
})();