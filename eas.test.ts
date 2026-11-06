import easConfig from './eas.json';

describe('eas.json — profil production', () => {
  const env = (easConfig.build.production as { env?: Record<string, string> }).env;

  it("fixe explicitement l'API et le site ops de production", () => {
    expect(env?.EXPO_PUBLIC_API_URL).toBe('https://api.cloudbreak-app.com');
    expect(env?.EXPO_PUBLIC_LEGAL_BASE_URL).toBe('https://ops.cloudbreak-app.com');
  });

  it('désactive les mocks et fixe la boîte de support', () => {
    expect(env?.EXPO_PUBLIC_MOCK_API).toBe('false');
    expect(env?.EXPO_PUBLIC_SUPPORT_EMAIL).toBe('contact@cloudbreak-app.com');
  });

  it("n'embarque aucun secret ni flag de debug", () => {
    expect(Object.keys(env ?? {}).every((key) => key.startsWith('EXPO_PUBLIC_'))).toBe(true);
    expect(env).not.toHaveProperty('EXPO_PUBLIC_DEBUG');
    expect(env).not.toHaveProperty('EXPO_PUBLIC_DEV_TOOLS');
  });
});

describe('eas.json — profil staging (TestFlight sur backend dev)', () => {
  const profile = easConfig.build.staging as {
    distribution?: string;
    autoIncrement?: boolean;
    env?: Record<string, string>;
  };

  it('distribue via le store avec auto-incrément du build', () => {
    expect(profile.distribution).toBe('store');
    expect(profile.autoIncrement).toBe(true);
  });

  it("pointe explicitement sur l'API et le site ops de dev", () => {
    expect(profile.env?.EXPO_PUBLIC_API_URL).toBe('https://dev-api.cloudbreak-app.com');
    expect(profile.env?.EXPO_PUBLIC_LEGAL_BASE_URL).toBe('https://dev-ops.cloudbreak-app.com');
  });

  it('désactive les mocks et fixe la boîte de support', () => {
    expect(profile.env?.EXPO_PUBLIC_MOCK_API).toBe('false');
    expect(profile.env?.EXPO_PUBLIC_SUPPORT_EMAIL).toBe('contact@cloudbreak-app.com');
  });

  it("n'embarque aucun secret ni flag de debug", () => {
    const env = profile.env ?? {};
    expect(Object.keys(env).every((key) => key.startsWith('EXPO_PUBLIC_'))).toBe(true);
    expect(env).not.toHaveProperty('EXPO_PUBLIC_DEBUG');
    expect(env).not.toHaveProperty('EXPO_PUBLIC_DEV_TOOLS');
  });
});

describe('eas.json — Supabase hors du fichier versionné', () => {
  it.each(['staging', 'production'])(
    'ne fixe pas les variables Supabase dans le profil %s',
    (name) => {
      const env = (easConfig.build[name as 'production'] as { env?: Record<string, string> }).env;
      expect(env).not.toHaveProperty('EXPO_PUBLIC_SUPABASE_URL');
      expect(env).not.toHaveProperty('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    },
  );
});
