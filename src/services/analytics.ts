/**
 * analytics — interface d'événements produit.
 *
 * L'adaptateur ne transmet que la taxonomie explicitement autorisée. Sentry
 * reste l'unique outil de suivi d'erreurs : PostHog ne capture ni exceptions,
 * ni replay, ni événements automatiques.
 *
 * Usage :
 *   import { track } from '@/services/analytics';
 *   track('onboarding_complete');
 */
import PostHog from 'posthog-react-native';

type SafeProperty = boolean | number | string;
type SafeProperties = Record<string, SafeProperty>;
type PropertyValidator = (value: unknown) => value is SafeProperty;

const isBoolean: PropertyValidator = (value): value is boolean => typeof value === 'boolean';
const isUuid: PropertyValidator = (value): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function isEnum(values: readonly string[]): PropertyValidator {
  return (value): value is string => typeof value === 'string' && values.includes(value);
}

function isIntegerInRange(min: number, max: number): PropertyValidator {
  return (value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

const isDate: PropertyValidator = (value): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
};

const ALLOWED_PROPERTIES: Record<string, Record<string, PropertyValidator>> = {
  app_backgrounded: { session_duration_ms: isIntegerInRange(0, 86_400_000) },
  app_foregrounded: {},
  billing_period_selected: { period: isEnum(['monthly', 'annual']) },
  delete_account_initiated: {},
  forecast_shared: { peak_id: isUuid },
  language_toggled: { locale: isEnum(['fr', 'en']) },
  legal_link_opened: { link_type: isEnum(['privacy', 'cgu', 'support', 'other']) },
  location_settings_opened: {},
  newsletter_consent_toggled: { opted_in: isBoolean },
  notification_settings_opened: {},
  offline_mode_shown: { cached_minutes_ago: isIntegerInRange(0, 43_200) },
  onboarding_complete: {},
  onboarding_permission_result: { granted: isBoolean, type: isEnum(['location']) },
  onboarding_step_viewed: { step: isIntegerInRange(1, 4) },
  paywall_dismissed: {},
  paywall_opened: { trigger: isEnum(['quota', 'profile_banner', 'home_badge', 'unknown']) },
  peak_selected: { peak_id: isUuid, source: isEnum(['favorites', 'search', 'home_favorites', 'onboarding']) },
  plan_selected: { period: isEnum(['monthly', 'annual']) },
  quota_badge_viewed: { peak_id: isUuid },
  quota_dismissed: { peak_id: isUuid },
  restore_purchases_clicked: {},
  score_date_changed: { date: isDate, method: isEnum(['tap', 'swipe']) },
  score_hour_changed: { hour: isIntegerInRange(0, 23), verdict: isEnum(['none', 'high', 'medium', 'low']) },
  score_why_opened: { peak_id: isUuid },
  search_performed: { query_length: isIntegerInRange(0, 200), results_count: isIntegerInRange(0, 1_000) },
  signed_out: {},
  terrain_validation_opened: { peak_id: isUuid, source: isEnum(['manual']) },
  theme_toggled: { scheme: isEnum(['light', 'dark']) },
};

let client: PostHog | undefined;

function getClient(): PostHog | undefined {
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim();
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim();

  if (!key || !host) return undefined;

  client ??= new PostHog(key, {
    addTracingHeaders: [],
    captureAppLifecycleEvents: false,
    capturePushNotificationOpened: false,
    capturePushNotificationSubscriptions: false,
    disableGeoip: true,
    disableRemoteFeatureFlags: true,
    disableSurveys: true,
    enableSessionReplay: false,
    errorTracking: {
      autocapture: false,
      exceptionSteps: { enabled: false },
    },
    host,
    personProfiles: 'never',
    preloadFeatureFlags: false,
    rageClickConfig: { enabled: false },
    sendFeatureFlagEvent: false,
    setDefaultPersonProperties: false,
  });

  return client;
}

function filterProperties(event: string, props?: Record<string, unknown>): SafeProperties | undefined {
  const allowed = ALLOWED_PROPERTIES[event];
  if (!allowed) return undefined;
  if (!props) return {};

  const safeProperties: SafeProperties = {};

  for (const [key, validator] of Object.entries(allowed)) {
    const value = props[key];
    if (value === undefined) continue;
    if (!validator(value)) return undefined;
    safeProperties[key] = value;
  }

  return Object.keys(props).length === 0 || Object.keys(safeProperties).length > 0
    ? safeProperties
    : undefined;
}

export function track(event: string, props?: Record<string, unknown>): void {
  const safeProperties = filterProperties(event, props);
  if (!safeProperties) return;

  getClient()?.capture(event, safeProperties);
}
