<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Webshop starter: Next.js 16 App Router + Neon Postgres (Drizzle) + Better Auth + Vercel Blob. Setup for a new shop
owner is in **[AGENT-SETUP.md](./AGENT-SETUP.md)** — follow it step by step, including its rules (ask the human
before anything that costs money or goes live; never print or commit secrets). Database: **DATABASE-SETUP.md**.
Payments, carriers, e-mail: **INTEGRATIONS.md**.

## Conventions

- **Language:** customer-facing text in Croatian; code, comments and identifiers in English. Public URLs are
  Croatian (`/proizvodi`, `/naplata`), admin URLs English (`/admin/products`).
- **Money:** integer cents everywhere, currency EUR. `formatPrice()` / `parsePriceToCents()` in `src/lib/utils.ts`.
- **Modules:** every integration is a module in `src/config/modules.ts`; gate code with `isModuleReady(id)`
  (`src/lib/modules.ts`). Merchant identifiers come from env or store settings, never from code.
- **Data:** Drizzle via `getDb()` (`src/db`). Schema in `src/db/schema.ts`; client components import enums/types
  from `@/db/enums` only. Reads in Server Components; writes are Server Actions next to the route.
- **Access checks live in code:** `requireUser()` / `requireAdmin()` in layouts and pages, `assertAdmin()` in every
  admin action and route (`src/lib/auth/server.ts`). `src/proxy.ts` only checks that a session cookie exists.
- **Auth contract (Better Auth):** own `pg` Pool in `src/lib/auth/auth.ts`, no Drizzle adapter, `auth` stays a
  direct export, keep the retry layers and trusted origins. Do not refactor these one by one.
- **Prices and stock are never trusted from the browser.** Checkout recomputes everything from the database.
- **Payments and stock:** only through `src/lib/shop/order-lifecycle.ts` (`markOrderPaid`, `cancelOrder`,
  `reserveStock`) — row lock + idempotent. Don't change stock anywhere else.
- **Side effects** (shipments, e-mails) go through `src/lib/live-guard.ts`: production only unless allowed.
- **Database changes:** edit `schema.ts`, `npm run db:generate`, commit the new file in `drizzle/`. Additive only.
- **Styling:** Tailwind with tokens from the BRAND block in `src/app/globals.css`. No hard-coded brand colours.
- **UI feedback:** inline messages and two-step confirm buttons, no `alert()` / `confirm()` / `prompt()`.
- **No shortcuts:** no `// @ts-ignore`, no `ignoreBuildErrors`, no skipped auth checks.

## Checks before you finish

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
