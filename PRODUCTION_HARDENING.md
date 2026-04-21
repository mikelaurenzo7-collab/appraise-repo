# AppraiseAI Production Hardening Guide

Complete guide for deploying AppraiseAI to production with security, monitoring, and reliability best practices.

## 1. Rate Limiting

Rate limiting protects APIs from abuse and ensures fair resource allocation.

### Configuration

Rate limiters are configured in `server/_core/rateLimiter.ts`:

| Limiter | Limit | Window | Purpose |
|---------|-------|--------|---------|
| Global | 100 requests | 15 min | All routes |
| Auth | 5 requests | 15 min | Login attempts |
| API | 50 requests | 1 min | tRPC endpoints |
| Payment | 10 requests | 1 hour | Payment endpoints |
| Upload | 5 uploads | 1 hour | File uploads |
| Submission | 3 submissions | 24 hours | Property submissions |

### Implementation

```typescript
import { globalLimiter, apiLimiter, authLimiter } from './server/_core/rateLimiter';

// Apply global limiter
app.use(globalLimiter);

// Apply specific limiters to routes
app.post('/api/auth/login', authLimiter, loginHandler);
app.use('/api/trpc', apiLimiter);
app.post('/api/payments/checkout', paymentLimiter, checkoutHandler);
```

### Monitoring

Rate limit info is included in response headers:
- `RateLimit-Limit`: Total requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time when limit resets

## 2. Error Monitoring with Sentry

Sentry captures and reports errors in real-time.

### Setup

1. **Create Sentry account:** https://sentry.io
2. **Create project:** Select Node.js
3. **Get DSN:** Copy your project DSN
4. **Set environment variable:**
   ```bash
   export SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"
   ```

### Configuration

```typescript
import { initializeSentry, attachSentryErrorHandlers } from './server/_core/errorMonitoring';

// Initialize Sentry
initializeSentry(app);

// ... your routes ...

// Attach error handlers (must be last)
attachSentryErrorHandlers(app);
```

### Usage

```typescript
import { captureException, captureEvent, setUserContext } from './server/_core/errorMonitoring';

// Capture exceptions
try {
  // code
} catch (error) {
  captureException(error, { context: 'payment_processing' });
}

// Capture events
captureEvent('User signed up', 'info', { userId: '123' });

// Set user context for error tracking
setUserContext(userId, email, username);
```

### Dashboard

Monitor errors at: https://sentry.io/organizations/your-org/issues/

## 3. CI/CD Pipeline

GitHub Actions automatically tests and builds on every push.

### Workflows

#### `.github/workflows/ci.yml` - Continuous Integration
- **Triggers:** Push to main/develop, Pull requests
- **Jobs:**
  - `test`: Unit tests with MySQL
  - `e2e`: Playwright E2E tests
  - `lint`: TypeScript and formatting checks
  - `build`: Build verification

#### `.github/workflows/deploy.yml` - Production Deployment
- **Triggers:** Push to main
- **Steps:**
  - Install dependencies
  - Run tests
  - Build project
  - Deploy to Manus
  - Notify on success/failure

### Running Locally

```bash
# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Check TypeScript
pnpm check

# Format code
pnpm format

# Build
pnpm build
```

### GitHub Actions Secrets

Set these in GitHub repository settings:

```
DATABASE_URL=mysql://user:pass@host/db
SENTRY_DSN=https://key@sentry.io/project
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
```

## 4. Environment Variables

### Required for Production

```bash
# Database
DATABASE_URL=mysql://user:pass@host/db

# Authentication
JWT_SECRET=long-random-secret-key
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# APIs
ATTOM_API_KEY=your-key
LIGHTBOX_API_KEY=your-key
RENTCAST_API_KEY=your-key
REGRID_API_KEY=your-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Monitoring
SENTRY_DSN=https://key@sentry.io/project

# Email
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-key

# App Config
VITE_APP_ID=your-app-id
VITE_APP_TITLE=AppraiseAI
OWNER_NAME=Your Name
OWNER_OPEN_ID=your-open-id
```

## 5. Security Best Practices

### API Security

1. **Rate Limiting:** Enabled on all endpoints
2. **CORS:** Configure allowed origins
3. **HTTPS:** Always use HTTPS in production
4. **Headers:** Set security headers
5. **Input Validation:** Validate all inputs with Zod

### Database Security

1. **SSL:** Use SSL for database connections
2. **Credentials:** Use environment variables
3. **Backups:** Regular automated backups
4. **Encryption:** Encrypt sensitive data at rest

### Authentication

1. **OAuth:** Use Manus OAuth for login
2. **Sessions:** Secure session cookies
3. **JWT:** Sign and verify tokens
4. **CSRF:** Protect against CSRF attacks

### File Upload Security

1. **Validation:** Check file types and sizes
2. **Scanning:** Scan uploads for malware
3. **Storage:** Store in S3 with restricted access
4. **Limits:** Rate limit uploads per user

## 6. Performance Optimization

### Frontend

- **Code Splitting:** Lazy load routes
- **Caching:** Cache static assets
- **Compression:** Gzip responses
- **CDN:** Use CDN for static files

### Backend

- **Database Indexing:** Index frequently queried columns
- **Query Optimization:** Use efficient queries
- **Caching:** Cache frequently accessed data
- **Connection Pooling:** Use connection pools

### Monitoring

- **APM:** Use Sentry for performance monitoring
- **Metrics:** Track key metrics
- **Alerts:** Set up alerts for anomalies

## 7. Deployment Checklist

Before deploying to production:

- [ ] All tests passing (unit + E2E)
- [ ] TypeScript compilation successful
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Rate limiters configured
- [ ] Sentry DSN set
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Error logging enabled
- [ ] Performance benchmarks met

## 8. Monitoring & Alerts

### Key Metrics to Monitor

1. **Error Rate:** % of failed requests
2. **Response Time:** API latency
3. **Throughput:** Requests per second
4. **Database:** Query performance
5. **Memory:** Memory usage
6. **CPU:** CPU utilization

### Alert Thresholds

- Error rate > 5%: Critical
- Response time > 1s: Warning
- Memory > 80%: Warning
- Database queries > 100ms: Warning

### Sentry Alerts

Configure in Sentry dashboard:
- Alert on new issues
- Alert on issue regression
- Alert on spike in event frequency

## 9. Scaling Considerations

### Horizontal Scaling

1. **Load Balancer:** Distribute traffic
2. **Multiple Instances:** Run multiple app instances
3. **Database Replication:** Master-slave setup
4. **Cache Layer:** Redis for caching

### Vertical Scaling

1. **More CPU:** Increase server CPU
2. **More Memory:** Increase RAM
3. **Better Database:** Upgrade database tier
4. **Faster Storage:** Use SSD storage

## 10. Disaster Recovery

### Backup Strategy

1. **Database:** Daily automated backups
2. **Code:** Version control on GitHub
3. **Configuration:** Store in environment variables
4. **Files:** S3 with versioning enabled

### Recovery Procedures

1. **Database Restore:** Use latest backup
2. **Code Rollback:** Revert to previous commit
3. **Configuration Restore:** Use backup env vars
4. **File Recovery:** Restore from S3 versions

## Troubleshooting

### High Error Rate

1. Check Sentry dashboard for error patterns
2. Review recent code changes
3. Check database connectivity
4. Verify external API availability
5. Check rate limiter logs

### Slow Response Times

1. Check database query performance
2. Review application logs
3. Check server resource usage
4. Verify external API latency
5. Check network connectivity

### Rate Limiting Issues

1. Check rate limiter configuration
2. Verify client IP detection
3. Check for distributed attacks
4. Review rate limit headers
5. Adjust limits if needed

---

**Last Updated:** April 21, 2026
**Version:** 1.0.0
**Status:** Production Ready
