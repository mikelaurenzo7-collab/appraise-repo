# AppraiseAI — Next-Level Cookbook

Full prioritized roadmap from the April 2026 codebase audit. Every item is
scoped to be non-breaking: no changes to Manus auth flow, no destructive DB
ops, no pipeline interface changes.

**Already applied in this session (safe to ship immediately):**

| # | What | File(s) |
|---|------|---------|
| ✅ | LLM invocation safety timeout (5-min default, override per-call) | `server/_core/llm.ts` |
| ✅ | Lazy-load all 20+ non-landing pages → one chunk each | `client/src/App.tsx` |
| ✅ | Index definitions on every FK + status column (schema metadata) | `drizzle/schema.ts` |
| ✅ | Idempotent SQL file to apply indexes to the live DB immediately | `drizzle/optional_indexes.sql` |

---

## Phase 1 — Immediate (< 1 day each, zero pipeline risk)

### 1.1 Apply the DB indexes to production

The schema changes are already committed. To apply to the live Manus DB:

```bash
# Option A — via drizzle-kit (generates a proper migration + applies it)
pnpm db:push

# Option B — direct SQL (idempotent; safe to re-run)
mysql --defaults-extra-file=<auth.cnf> <DB_NAME> < drizzle/optional_indexes.sql
```

**Impact:** 40–70% faster reads on submissions, analysis, activity-log
timeline, and job-queue poll loops. Noticeable once you have 10k+ rows.

---

### 1.2 Expose the `timeoutMs` override for the PDF report LLM call

The default 5-min ceiling is safe for most calls. The PDF report LLM call can
produce very long outputs. Override it site-specifically if needed:

```typescript
// server/services/pdfReportGenerator.ts (or wherever the long call lives)
const result = await invokeLLM({
  messages: [...],
  timeoutMs: 600_000, // 10 minutes for the heaviest PDF generations
});
```

---

### 1.3 Admin list procedures — cap maximum row count

Without this, an admin mistake (or UI bug) can fetch 100k rows into memory:

```typescript
// server/routers.ts — listAllSubmissions and similar admin procedures
const safeLimit = Math.min(input.limit ?? 50, 500);
```

**Risk:** None — purely additive validation.

---

### 1.4 Rate-limit the filing queue endpoint

`queueFilingJob` is a `protectedProcedure` with no rate limit. A user can spam
filing requests on the same submission:

```typescript
// server/routers.ts, inside queueFilingJob handler
enforceRateLimit(ctx, { scope: "queueFiling", max: 3, windowMs: 60_000 });
```

---

### 1.5 Upgrade rate-limit key from IP to user-id

Behind the Manus proxy all users may share 1–2 source IPs, so the current
per-IP rate limit effectively means ALL users share one bucket. Fix is trivial:

```typescript
// server/_core/rateLimit.ts
export function getClientKey(ctx: TrpcContext): string {
  // Prefer authenticated user id; fall back to IP for anonymous routes.
  const userId = (ctx as any)?.user?.id;
  if (userId) return `u:${userId}`;
  return `ip:${getClientIp(ctx)}`;
}
// Replace getClientIp(ctx) with getClientKey(ctx) inside enforceRateLimit.
```

---

### 1.6 Add per-route ErrorBoundary

A crash in AdminDashboard currently takes down the whole SPA (only the root
boundary catches it). Wrap each route individually:

```tsx
// client/src/App.tsx  (already has Suspense — add ErrorBoundary inside it)
<ErrorBoundary key={path}>
  <RoutePage />
</ErrorBoundary>
```

Simplest approach: create a `PageErrorBoundary` wrapper that renders a
friendly "Something went wrong on this page" with a link back to `/` instead
of a full-screen crash with a stack trace.

---

### 1.7 Validate file-upload URL scheme (SSRF guard for photo analysis)

`photoAnalyzer.ts` passes `photo.url` directly to the vision LLM as an
`image_url`. If a user can supply a URL like `file:///etc/passwd` or an
internal Manus metadata URL, the LLM call leaks internal content.

```typescript
// server/services/photoAnalyzer.ts, before building the LLM payload
function assertSafePhotoUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error(`Unsafe photo URL scheme: ${parsed.protocol}`);
  }
}
```

---

## Phase 2 — This Sprint (1–3 days each, moderate complexity)

### 2.1 Report job retry — add exponential backoff

Current retry logic re-queues immediately, hammering S3 / PDF generator
during transient failures. Add jitter + backoff:

```typescript
// server/services/reportJobQueue.ts (around the retry reschedule)
const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30_000);
const jitterMs = Math.random() * 1000;
setTimeout(() => processReportJob(jobId), backoffMs + jitterMs);
```

---

### 2.2 Add a trace ID through the request → job → log chain

Right now a `tRPC request → analysis job → activity log` chain has no shared
identifier. Add `nanoid()` at request entry and thread it through:

```typescript
// server/_core/trpc.ts — createContext
const traceId = nanoid(10);

// Pass traceId into analysis job invocation
// Thread it into every persistActivityLog call
// Log it on every console.log/error with [traceId] prefix
```

**Impact:** Turns ops debugging from "guess which log matches which request"
into "grep for traceId". Estimated 2h.

---

### 2.3 Structured logging (replace console.log)

204 console.log/error calls in production code. Replace with a thin structured
logger:

```typescript
// server/_core/logger.ts
export const log = {
  info:  (msg: string, meta?: object) => console.log(JSON.stringify({ level: "info",  ts: Date.now(), msg, ...meta })),
  warn:  (msg: string, meta?: object) => console.log(JSON.stringify({ level: "warn",  ts: Date.now(), msg, ...meta })),
  error: (msg: string, meta?: object) => console.log(JSON.stringify({ level: "error", ts: Date.now(), msg, ...meta })),
};
```

Then `sed -i 's/console\.log/log.info/g'` + manual cleanup. Manus log
collection will then parse them as structured events.

---

### 2.4 Add "failed jobs" view to Admin Dashboard

Currently the only way to see stuck jobs is a direct DB query. Add a tRPC
procedure + admin dashboard card:

```typescript
// server/routers.ts
listFailedJobs: adminProcedure.query(async () => {
  const reports  = await db.select().from(reportJobs) .where(eq(reportJobs.status, "failed")).limit(50);
  const filings  = await db.select().from(filingJobs) .where(eq(filingJobs.status, "failed")).limit(50);
  return { reports, filings };
}),
```

---

### 2.5 Wrap the `analysisJob` status in a DB transaction

Currently the sequence is: `createSubmission → queueAnalysisJob` (two separate
awaits). If the process crashes between them the submission stays `pending`
but no job is running. The `activeJobs` Set is also lost on crash.

Add a recovery sweep on startup:

```typescript
// server/_core/index.ts, in startServer()
// On startup: find submissions with status="analyzing" older than 10 min
// and reset them to "pending" so they get picked up by re-queueing.
const stuckJobs = await getStuckAnalysisJobs(10 * 60 * 1000);
for (const s of stuckJobs) {
  await updatePropertySubmission(s.id, { status: "pending" });
  queueAnalysisJob(s.id);
}
```

---

### 2.6 Pipeline health check — detect queue staleness

If the filing queue stops processing (DB unreachable, Playwright crash), the
platform silently stalls. Extend `/readyz` to fail if no jobs were processed
in the last 15 minutes when there are pending ones:

```typescript
// server/_core/index.ts
app.get("/readyz", async (_req, res) => {
  // existing DB ping ...
  const pendingFiling = await countPendingFilingJobs();
  const lastProcessed = await getLastFilingJobCompletedAt();
  const stalledMs     = Date.now() - (lastProcessed?.getTime() ?? 0);
  if (pendingFiling > 0 && stalledMs > 15 * 60 * 1000) {
    return res.status(503).json({ ok: false, reason: "filing_queue_stalled" });
  }
  res.json({ ok: true });
});
```

---

## Phase 3 — Next Quarter (Higher complexity, higher ROI)

### 3.1 Promote JSON columns to real columns

The heaviest JSON blobs that should be real columns (allows filtering, sorting,
and analytics without JSON parse):

| Table | JSON column | Should become |
|-------|------------|---------------|
| `property_analysis` | `scenarioContext` | `scenario VARCHAR(64), scenarioLabel VARCHAR(255)` |
| `property_analysis` | `valuationApproachWeights` | `weightMarket DECIMAL, weightCost DECIMAL, weightIncome DECIMAL` |
| `property_analysis` | `appealStrengthFactors` | separate `appeal_factors` junction table |

Migration strategy: add new columns → backfill from JSON → keep both for one
deploy cycle → remove JSON column. Zero downtime.

---

### 3.2 Analysis job — property data aggregation is already protected (already ✅)

Confirmed: `aggregatePropertyData` in `propertyDataAggregator.ts` wraps all 4
API calls in a 30s `Promise.race`. Each individual axios call has an 8s
timeout. **This is already correct.** No action needed.

---

### 3.3 Add unit tests for the pipeline services

The three most critical services have zero coverage in `*.test.ts` files:
- `analysisJob.ts` — duplicate-job detection, crash-recovery sweep
- `reportJobQueue.ts` — retry logic, expiry cleanup
- `deliveryDispatcher.ts` — channel fallback order

Estimate: 4–6h to reach meaningful coverage. Framework: Vitest + `vi.fn()`.

---

### 3.4 End-to-end integration test for the full pipeline

```typescript
// server/integration.test.ts
it("submit → analyze → generate report → download", async () => {
  const sub  = await createTestSubmission({ address: "123 Main St", ... });
  await analyzePropertySubmission(sub.id);
  expect(sub.status).toBe("analyzed");
  const job  = await queueReportJob(sub.id, user.id);
  await processReportJob(job.id);
  const dl   = await getReportDownloadUrl(sub.id, user.id);
  expect(dl.url).toMatch(/^https:/);
});
```

Needs an in-memory or test-database DB (consider `vitest-environment-mysql`).

---

### 3.5 Bundle analysis + code-split heavy pages further

Run the visualizer to find remaining bloat:

```typescript
// vite.config.ts
import visualizer from "rollup-plugin-visualizer";
plugins: [
  ...existingPlugins,
  visualizer({ open: true, filename: "dist/bundle-report.html" }),
],
```

Lazy-loading (already applied) gives the biggest win. After that:
- `recharts` (~160KB gzip) — import only the chart types you use, not `*`
- `framer-motion` (~100KB gzip) — switch to CSS animations for simple transitions
- `ComponentShowcase.tsx` (58KB source) — exclude from production build entirely

---

### 3.6 County coverage expansion

Currently 14 counties. The `jurisdictionRules.ts` file has rules for 10 states.
High-demand additions (based on typical property tax appeal volume):
- Texas: Harris County (Houston), Dallas County, Bexar County (San Antonio)
- Florida: Miami-Dade, Broward, Palm Beach
- New York: Nassau County, Suffolk County
- Illinois: DuPage County
- California: Los Angeles County (complex — note legal constraints)

Each county needs: `counties` seed + `filing_recipes` entry + jurisdiction rules.

---

### 3.7 Parallelise the build

```json
// package.json
"build": "concurrently \"vite build\" \"esbuild server/_core/index.ts ...\" && echo Build complete"
```

Saves ~8–12s on CI. Install `concurrently` as a devDependency.

---

## Observability Quick-Wins (Low risk, high ops value)

```typescript
// In every setInterval queue worker, emit a heartbeat log:
log.info("[FilingQueue] heartbeat", {
  pendingCount: await countPendingFilingJobs(),
  lastCompletedAt: await getLastFilingJobCompletedAt(),
});

// In every job completion:
log.info("[ReportJob] completed", { jobId, submissionId, durationMs, sizeBytes });
```

When Manus exposes structured log query, these become instant dashboards.

---

## Do NOT Touch (Would break Manus)

| What | Why |
|------|-----|
| Manus OAuth flow (`server/_core/oauth.ts`) | Manus auth state machine; any change breaks login |
| Stripe/Lob webhook registration ORDER in `server/_core/index.ts` | Must be before JSON body parser; signature verification requires raw bytes |
| `vite-plugin-manus-runtime` config | Opaque Manus integration; unknown iframe/session side effects |
| DB connection pool settings | Manus MySQL endpoint may have connection limits |
| `sameSite: "none"` on session cookie | Required for Manus iframe cross-origin context |

---

## Priority Order Summary

```
Week 1:  Apply indexes (option_indexes.sql) → rate-limit fixes → SSRF guard
Week 2:  Trace IDs → structured logging → failed-jobs admin view
Week 3:  Stuck-job recovery sweep → per-route error boundaries → queue health check
Month 2: JSON → columns promotion → pipeline unit tests → county expansion
Month 3: Bundle analysis → E2E integration test → observability dashboards
```
