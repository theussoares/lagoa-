# Lagoa+

A loyalty club for local commerce, piloting in Três Lagoas, MS (Brazil).
Customers collect stamps or points at shops around town in a single wallet;
merchants register visits at the counter and see who stopped coming back; the
network approves shops and bills the plan.

> The product UI is in Brazilian Portuguese (pt-BR). Code, commits and
> comments are in English; team docs (specs, ADRs, `CLAUDE.md`) are in
> Portuguese.

## Surfaces

| Surface  | Audience               | Format           | What it does                                                        |
| -------- | ---------------------- | ---------------- | ------------------------------------------------------------------- |
| Customer | Shoppers               | Mobile PWA       | Wallet, shop cards, check-in, rewards, Discover, profile            |
| Merchant | Shop owners and staff  | Desktop SPA      | Set up the club, counter (visit QR, redemptions), program, customers |
| Admin    | Network operators      | Desktop          | Shop approval, plans and billing, aggregate metrics, Discover       |
| Landing  | Prospective merchants  | Static site      | Pitch and sign-up for the merchant counter                          |

Production domains: `app.lagoamais.com.br` (customer),
`balcao.lagoamais.com.br` (merchant), `lagoamais.com.br` (landing page).

## How it works

- **Join a club:** the customer scans the shop's poster QR and gets an empty
  card. It is not a visit and earns nothing.
- **Earn:** at the sale the merchant generates a single-use visit QR (valid for
  5 minutes). The customer scans it, or types the short code, and earns.
- **Program modes:** stamp card, points per real spent, or points per visit,
  plus bonus rules (welcome, birthday, refer a friend, surprise day).
- **Anti-fraud:** at most one rewarding visit per customer per shop in a
  configurable window. Validation is always server-side.
- **Redeem:** the customer generates a 6-character code (valid ~10 minutes);
  the merchant validates it at the counter and confirms delivery.
- **Discover:** a showcase of network shops and city-wide challenges.

Full product context: [`PRODUCT.md`](./PRODUCT.md).

## Repository layout

pnpm workspace monorepo:

```
apps/
  web/     Nuxt 4 app: customer + merchant surfaces (and the BFF in server/)
  site/    Nuxt landing page, pre-rendered
  api/     NestJS + Drizzle API on Supabase Postgres
shared/    Zod schemas, domain rules and types shared by web and api (alias #shared)
docs/      ADRs, specs, database model, security rules
design-system/lagoa/   Visual identity ("Carimbo e Caderneta")
```

## Tech stack

- **Front:** Nuxt 4 (Vue 3, `<script setup lang="ts">`, Pinia), Nuxt UI v4,
  `@nuxtjs/i18n`.
- **BFF:** Nitro routes in `apps/web/server`. The browser only talks to its own
  domain; auth tokens live in httpOnly cookies.
- **API:** NestJS, Drizzle ORM, Postgres (Supabase), Zod validation.
- **Auth:** SMS login through Supabase.
- **Tests:** Vitest, `@nuxt/test-utils`, Playwright.

## Getting started

Requirements: Node.js, pnpm 12 and Docker (for the local database).

```bash
pnpm install
```

Start the local database and apply migrations:

```bash
pnpm db:up
pnpm db:migrate:local
```

Run the apps (API env vars are listed in `apps/api/.env.example`):

```bash
pnpm dev:api    # API
pnpm dev        # web app: customer at /carteira, merchant at /balcao
pnpm dev:site   # landing page on port 3001
```

## Scripts

| Command                | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `pnpm dev`             | Web app in dev mode                                     |
| `pnpm build`           | Production build of the web app                         |
| `pnpm test`            | Web unit and component tests                            |
| `pnpm typecheck`       | Type-check the web app                                  |
| `pnpm dev:api`         | API in dev mode                                         |
| `pnpm test:api`        | API tests                                               |
| `pnpm test:api:db`     | API tests including integration tests on the test DB    |
| `pnpm typecheck:api`   | Type-check the API                                      |
| `pnpm dev:site`        | Landing page in dev mode                                |
| `pnpm generate:site`   | Pre-render the landing page (needs `NUXT_PUBLIC_APP_URL`) |
| `pnpm db:up` / `db:down` / `db:reset` | Manage the local Postgres container     |

## Conventions

- Code, file names, commits, comments and tests are in English. Only what the
  end user sees is Portuguese, via translation keys in
  `apps/web/layers/core/i18n/locales/pt-BR.json`.
- Layered flow: page → components → composables → stores → services →
  repositories → `shared/`. Each layer only knows the one below.
- API pattern per feature: `controller` → `service` → `*.rules.ts` →
  `repository`.
- A phone number is personal data (LGPD): masked in lists, never in logs, URLs
  or analytics.
- Production migrations only go through `pnpm --filter @lagoa/api db:migrate:prod`,
  after the test database passes. See [`apps/api/README.md`](./apps/api/README.md).

More detail lives in [`CLAUDE.md`](./CLAUDE.md) (architecture and rules),
[`EQUIPE.md`](./EQUIPE.md) (agent team),
[`docs/security/SECURITY_RULES.md`](./docs/security/SECURITY_RULES.md) and
[`docs/adr`](./docs/adr).
