<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Webshop starter: Next.js 16 App Router + Supabase + Stripe. Setup for a new shop owner is in
**[AGENT-SETUP.md](./AGENT-SETUP.md)** — follow it step by step, including its rules (ask the human before
anything that costs money or goes live; never print or commit secrets).

## Conventions

- **Language:** customer-facing text in Croatian; code, comments and identifiers in English. Public URLs are
  Croatian (`/proizvodi`, `/kosarica`, `/naplata`), admin URLs English (`/admin/products`).
- **Money:** integer cents everywhere (`price_cents`, `total_cents`), currency EUR. Format with `formatPrice()`,
  parse admin input with `parsePriceToCents()` (`src/lib/utils.ts`).
- **Data:** read in Server Components through `src/lib/shop/catalog.ts` (cookie-less public client, cacheable).
  Writes are Server Actions (`actions.ts` next to the route). Use `src/lib/supabase/server.ts` for the logged-in
  user and in admin actions (RLS still applies), `service.ts` (secret key, bypasses RLS) only on the server for
  creating orders and confirming payments.
- **Prices and stock are never trusted from the browser.** Checkout recomputes everything from the database.
- **Payments:** order paid + stock decrement happen only in `confirmPaidOrder()` → SQL `mark_order_paid()`
  (idempotent). Don't decrement stock anywhere else.
- **Auth:** `requireUser()` / `requireAdmin()` from `src/lib/auth.ts` in layouts, pages and every admin action.
  Admin = `profiles.role = 'admin'`, checked in SQL by `public.is_admin()`.
- **Database changes:** new additive migration in `supabase/migrations/`. Every new public table needs
  `enable row level security`, explicit `grant`s and policies in the same file (Supabase no longer auto-grants
  new tables). Update `src/types/database.ts` to match.
- **Styling:** Tailwind with tokens from the BRAND block in `src/app/globals.css` (`bg-primary`,
  `text-muted-foreground`, …). No hard-coded brand colours in components.
- **UI feedback:** inline messages (`FormMessage`) and two-step confirm buttons — no `alert()` / `confirm()`.
- **No shortcuts:** no `// @ts-ignore`, no `ignoreBuildErrors`, no disabling RLS.

## Checks before you finish

```bash
npm run typecheck && npm run lint && npm run build
```
