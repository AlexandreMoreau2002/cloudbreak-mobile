describe('legalUrls', () => {
  const previousBaseUrl = process.env.EXPO_PUBLIC_LEGAL_BASE_URL;
  const previousSupportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_LEGAL_BASE_URL = previousBaseUrl;
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = previousSupportEmail;
    jest.resetModules();
  });

  it('utilise les variables d\'environnement quand elles sont définies', () => {
    process.env.EXPO_PUBLIC_LEGAL_BASE_URL = 'http://localhost:3100';
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'contact@example.com';

    jest.isolateModules(() => {
      const { LEGAL_URLS } = require('@/constants/legalUrls');
      expect(LEGAL_URLS.privacy).toBe('http://localhost:3100/fr/privacy');
      expect(LEGAL_URLS.cgu).toBe('http://localhost:3100/fr/cgu');
      expect(LEGAL_URLS.support).toBe('mailto:contact@example.com');
    });
  });

  it('retombe sur les valeurs par défaut quand les variables sont absentes', () => {
    delete process.env.EXPO_PUBLIC_LEGAL_BASE_URL;
    delete process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

    jest.isolateModules(() => {
      const { LEGAL_URLS } = require('@/constants/legalUrls');
      expect(LEGAL_URLS.privacy).toBe('https://ops.cloudbreak-app.com/fr/privacy');
      expect(LEGAL_URLS.cgu).toBe('https://ops.cloudbreak-app.com/fr/cgu');
      expect(LEGAL_URLS.support).toBe('mailto:contact@cloudbreak-app.com');
    });
  });
});
