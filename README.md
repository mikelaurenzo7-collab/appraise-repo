# AppraiseAI

AppraiseAI is a full-stack Manus-ready property tax appeal platform. It combines a React/Vite frontend, an Express+tRPC backend, Drizzle/MySQL persistence, background filing/report queues, and Manus platform services for auth, storage, notifications, email, and LLM access.

## Stack

- React 19 + Vite 7
- Express + tRPC 11
- Drizzle ORM + MySQL
- Vitest + Playwright
- Manus runtime integrations (`vite-plugin-manus-runtime`, Forge APIs, Manus OAuth)

## Project layout

- `client/` — SPA, routes, UI components, analytics bootstrapping
- `server/` — API, auth, queues, webhooks, Manus service integrations
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

## Manus deployment notes

- Set `PUBLIC_APP_URL` to the live Manus URL (or your custom domain). Server-generated links and emails use this value.
- Set `VITE_PUBLIC_APP_URL` to the same origin if you want client-side metadata to reflect the production hostname at build time.
- Webhooks require raw request bodies, so keep the current server bootstrap order intact when editing middleware.
- Manus storage/email/LLM integrations depend on `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`.
- Stripe and Lob webhooks must be configured in Manus with the deployed `/api/stripe/webhook` and `/api/lob/webhook` endpoints.

## Health endpoints

- `GET /healthz` — process liveness
- `GET /readyz` — readiness with database probe
