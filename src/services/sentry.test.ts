const mockInit = jest.fn();

function loadSentryService() {
  jest.resetModules();
  jest.doMock('@sentry/react-native', () => ({ init: mockInit }), { virtual: true });
  return require('./sentry') as typeof import('./sentry');
}

describe('initializeSentry', () => {
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    mockInit.mockClear();
  });

  afterAll(() => {
    if (originalDsn) process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
    else delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  it('does not initialize the SDK without a public DSN', () => {
    const { initializeSentry } = loadSentryService();

    expect(initializeSentry()).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('initializes once with error-only, privacy-safe options', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/42';
    const { initializeSentry } = loadSentryService();

    expect(initializeSentry()).toBe(true);
    expect(initializeSentry()).toBe(true);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.invalid/42',
        enableAutoSessionTracking: false,
        enableAutoPerformanceTracing: false,
        enableLogs: false,
        maxBreadcrumbs: 0,
        sendDefaultPii: false,
        tracePropagationTargets: [],
      }),
    );

    const options = mockInit.mock.calls[0][0];
    const event = {
      breadcrumbs: [{ message: 'token' }],
      contexts: { device: { locale: 'fr-FR' } },
      exception: { values: [{ type: 'Error', value: 'email@example.invalid' }] },
      extra: { coordinates: '45.1, 6.1' },
      request: { headers: { authorization: 'Bearer token' } },
      tags: { user_id: '123' },
      user: { email: 'email@example.invalid' },
    };

    expect(options.beforeBreadcrumb({ category: 'console' })).toBeNull();
    expect(options.beforeSend(event)).toEqual({
      exception: { values: [{ type: 'Error' }] },
    });
  });
});
