const capture = jest.fn();
const PostHog = jest.fn(() => ({ capture }));

function loadAnalytics() {
  jest.resetModules();
  jest.doMock(
    'posthog-react-native',
    () => ({
      __esModule: true,
      default: PostHog,
    }),
    { virtual: true },
  );

  return require('@/services/analytics') as typeof import('@/services/analytics');
}

describe('analytics', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    capture.mockClear();
    PostHog.mockClear();
  });

  it('does not initialize or capture without a PostHog key', () => {
    const { track } = loadAnalytics();

    track('onboarding_complete');

    expect(PostHog).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('initializes once with automatic collection disabled and captures safe events', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'public-test-key';
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com';
    const { track } = loadAnalytics();

    track('onboarding_step_viewed', { step: 1 });
    track('onboarding_step_viewed', { step: 2 });

    expect(PostHog).toHaveBeenCalledTimes(1);
    expect(PostHog).toHaveBeenCalledWith('public-test-key', {
      addTracingHeaders: [],
      captureAppLifecycleEvents: false,
      capturePushNotificationOpened: false,
      capturePushNotificationSubscriptions: false,
      disableGeoip: true,
      disableRemoteFeatureFlags: true,
      disableSurveys: true,
      errorTracking: {
        autocapture: false,
        exceptionSteps: { enabled: false },
      },
      enableSessionReplay: false,
      host: 'https://eu.i.posthog.com',
      personProfiles: 'never',
      preloadFeatureFlags: false,
      rageClickConfig: { enabled: false },
      sendFeatureFlagEvent: false,
      setDefaultPersonProperties: false,
    });
    expect(capture).toHaveBeenNthCalledWith(1, 'onboarding_step_viewed', { step: 1 });
    expect(capture).toHaveBeenNthCalledWith(2, 'onboarding_step_viewed', { step: 2 });
  });

  it('rejects unknown events and unsafe allowed properties', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'public-test-key';
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com';
    const { track } = loadAnalytics();

    track('onboarding_step_viewed', { note: 'email@example.com', step: 1 });
    track('onboarding_step_viewed', { note: 'email@example.com' });
    track('auth_submitted', { error_code: 'free text' });
    track('unknown_event', { value: 'anything' });
    track('peak_selected', { peak_id: 'email@example.com', source: 'search' });
    track('score_date_changed', { date: 'not a date', method: 'tap' });
    track('score_hour_changed', { hour: 42, verdict: 'high' });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('onboarding_step_viewed', { step: 1 });
  });
});
