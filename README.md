# AppraiseAI

AppraiseAI is a property tax appeal platform that builds USPAP-aligned appraisal briefs, runs the three statutory grounds (excessive market value, lack of uniformity, errors of fact), and packages owner-, board-, and assessor-facing PDFs from a single submission. React/Vite frontend, Express + tRPC backend, Drizzle ORM over Postgres (Supabase), Anthropic Claude as the sole LLM provider, deployed serverless on Vercel.

## Stack

- React 19 + Vite 7
- Express + tRPC 11
- Drizzle ORM + Postgres (Supabase)
- Anthropic Claude (Opus 4.7) — sole LLM provider
- Vitest + Playwright
- Vercel serverless functions (`api/index.ts`, `api/cron.ts`)

## Project layout

- `client/` — SPA, routes, UI components, analytics bootstrapping
- `server/` — Express app, tRPC routers, queues, webhooks, services
- `api/` — Vercel serverless function entrypoints
- `drizzle/` — schema and SQL migrations
- `shared/` — shared constants, types, pricing logic
- `e2e/` — Playwright coverage

## Local development

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install dependencies:

   ```bash
   corepack enable
   corepack pnpm install
   ```

3. Start the app:

   ```bash
   corepack pnpm dev
   ```

The dev server serves the frontend and backend together on the same port.

## Validation

```bash
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

## Vercel deployment notes

- The build command `npm run build` produces the static frontend in `dist/public` and a bundled local-server entrypoint at `dist/index.js`. Vercel compiles `api/index.ts` and `api/cron.ts` independently as serverless functions via `@vercel/node`.
- `vercel.json` rewrites all `/api/*` traffic to `api/index.ts` (the Express+tRPC app). A trailing `/(.*) → /index.html` rewrite serves the SPA for non-API routes; static assets are served directly from the filesystem before the rewrite is consulted.
- Set `APP_BASE_URL` (or `PUBLIC_APP_URL`) to the deployed Vercel URL. Server-generated links and Supabase OAuth callbacks use this value.
- Required env vars: `DATABASE_URL`, `JWT_SECRET` (≥32 chars), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`. Production additionally requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- Stripe and Lob webhooks must point to `/api/stripe/webhook` and `/api/lob/webhook`. These endpoints are mounted before the JSON body parser so signature verification receives the raw request body.
- Cron jobs are configured in `vercel.json` and call `/api/cron?task=...` on Vercel's schedule (every 2-30 minutes depending on task).

## Health endpoints

- `GET /healthz` — process liveness
- `GET /readyz` — readiness with database probe and filing-queue staleness check
