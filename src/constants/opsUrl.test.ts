describe('opsUrl', () => {
  const previousBaseUrl = process.env.EXPO_PUBLIC_LEGAL_BASE_URL;

  afterEach(() => {
    if (previousBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_LEGAL_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_LEGAL_BASE_URL = previousBaseUrl;
    }
    jest.resetModules();
  });

  it('retombe sur l\'hôte ops de production quand la variable est absente', () => {
    delete process.env.EXPO_PUBLIC_LEGAL_BASE_URL;

    jest.isolateModules(() => {
      const { OPS_BASE_URL } = require('@/constants/opsUrl');
      expect(OPS_BASE_URL).toBe('https://ops.cloudbreak-app.com');
    });
  });

  it('utilise la variable d\'environnement quand elle est définie', () => {
    process.env.EXPO_PUBLIC_LEGAL_BASE_URL = 'http://localhost:3100';

    jest.isolateModules(() => {
      const { OPS_BASE_URL } = require('@/constants/opsUrl');
      expect(OPS_BASE_URL).toBe('http://localhost:3100');
    });
  });

  it('retire les slashs finaux', () => {
    process.env.EXPO_PUBLIC_LEGAL_BASE_URL = 'https://dev-ops.cloudbreak-app.com//';

    jest.isolateModules(() => {
      const { OPS_BASE_URL } = require('@/constants/opsUrl');
      expect(OPS_BASE_URL).toBe('https://dev-ops.cloudbreak-app.com');
    });
  });
});
