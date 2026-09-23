import * as Sentry from '@sentry/react-native';
import { APP_VERSION, IS_PROD } from '../config';

/**
 * Crash reporting (Sentry).
 *
 * Off unless EXPO_PUBLIC_SENTRY_DSN is set, so local dev and Expo Go work
 * without an account. Set it in eas.json (per build profile) or a .env file:
 *   EXPO_PUBLIC_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
 *
 * Only error events are sent: no performance tracing, no session replay, and
 * no default PII (IP address, cookies) - this app is used by families of minors.
 */

// Must be a literal process.env read so Expo inlines it at build time
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let enabled = false;

/** Initialise crash reporting once at startup. Safe to call without a DSN. */
export function initCrashReporting(): void {
  if (enabled || !SENTRY_DSN) {
    return;
  }
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: IS_PROD ? 'production' : 'development',
      release: APP_VERSION,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      enableAutoSessionTracking: true,
      beforeSend(event) {
        // Belt and braces: never ship auth headers or user emails
        if (event.request?.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers.authorization;
        }
        if (event.user) {
          event.user = event.user.id ? { id: event.user.id } : undefined;
        }
        return event;
      },
    });
    enabled = true;
  } catch (error) {
    console.warn('Crash reporting failed to initialise', error);
  }
}

/** Report a handled error (e.g. from an error boundary). No-op when disabled. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) {
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Tag reports with the signed-in user's id (never email/name). Pass null on logout. */
export function setCrashReportingUser(userId: string | null): void {
  if (!enabled) {
    return;
  }
  Sentry.setUser(userId ? { id: userId } : null);
}
