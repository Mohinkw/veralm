import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://bbfa801e21f3d320effd42f1c2da1d37@o4512491805409280.ingest.us.sentry.io/4512491913412608',
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});
