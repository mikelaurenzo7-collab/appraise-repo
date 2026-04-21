import * as Sentry from '@sentry/node';
import { Express } from 'express';

/**
 * Initialize Sentry error monitoring
 * Captures and reports errors to Sentry dashboard
 */
export function initializeSentry(app: Express) {
  // Initialize Sentry
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '', // Set via environment variable
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  return app;
}

/**
 * Attach Sentry error handlers to Express app
 */
export function attachSentryErrorHandlers(app: Express) {
  // Custom error handler for unhandled errors
  app.use((err: any, req: any, res: any, next: any) => {
    // Capture error in Sentry
    Sentry.captureException(err, {
      tags: {
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      },
      extra: {
        body: req.body,
        query: req.query,
      },
    });

    // Send error response
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      requestId: res.sentry,
    });
  });
}

/**
 * Capture custom events in Sentry
 */
export function captureEvent(message: string, level: 'info' | 'warning' | 'error' = 'info', extra?: Record<string, any>) {
  Sentry.captureMessage(message, level);
  if (extra) {
    Sentry.setContext('extra', extra);
  }
}

/**
 * Capture exceptions with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error);
  if (context) {
    Sentry.setContext('error_context', context);
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string = 'custom', level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}
