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
