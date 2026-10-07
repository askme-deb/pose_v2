import * as Sentry from '@sentry/node';

let sentryEnabled = false;

/**
 * Error reporting to Sentry. A no-op unless SENTRY_DSN is set, so local dev
 * and CI run without a Sentry project. Call once at service startup, before
 * the app starts listening.
 */
export function initObservability(serviceName: string) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || sentryEnabled) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    serverName: serviceName,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  Sentry.setTag('service', serviceName);
  sentryEnabled = true;

  process.on('unhandledRejection', (reason) => Sentry.captureException(reason));
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!sentryEnabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
