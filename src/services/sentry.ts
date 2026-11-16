import * as Sentry from '@sentry/react-native';

let isInitialized = false;

function stripSensitiveData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  delete event.breadcrumbs;
  delete event.extra;
  delete event.request;
  delete event.tags;
  delete event.user;
  delete event.contexts;

  for (const exception of event.exception?.values ?? []) {
    delete exception.value;
  }

  return event;
}

export function initializeSentry(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || isInitialized) return Boolean(dsn);

  Sentry.init({
    dsn,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoPerformanceTracing: false,
    enableAutoSessionTracking: false,
    enableLogs: false,
    maxBreadcrumbs: 0,
    sendDefaultPii: false,
    tracePropagationTargets: [],
    beforeBreadcrumb: () => null,
    beforeSend: stripSensitiveData,
  });

  isInitialized = true;
  return true;
}
