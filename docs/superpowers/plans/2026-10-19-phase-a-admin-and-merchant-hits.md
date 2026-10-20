# Fase A — Painel de admin + Hits do lojista: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a loja cadastra produtos do Hits no painel e a rede os aprova (e gerencia lojas, destaques e a própria equipe) num painel de admin novo; nada aparece ainda para o cliente.

**Architecture:** dados e regras novas em `shared/` + `apps/api` (tabelas `hit_items`, `hit_item_status_events`, `featured_placements`, `admin_users`, `admin_events`); módulos `merchant/hits` e `admin/*` no mesmo NestJS, no padrão controller → service → rules → repository. O lojista usa o BFF do `apps/web`; o admin é um app Nuxt novo (`apps/admin`, SPA, deploy próprio) com BFF próprio, login por e-mail/senha + Turnstile + TOTP. Token de admin é marcado no `app_metadata.role` do Supabase e recusado fora de `admin/*`.

**Tech Stack:** Nuxt 4 + Nuxt UI v4, NestJS, Drizzle/Postgres (Supabase), Supabase Auth (senha + MFA TOTP), Cloudflare Turnstile, Vitest.

**Spec:** [`docs/specs/hits-showcase/design.md`](../../specs/hits-showcase/design.md) e
[`docs/specs/admin-panel/design.md`](../../specs/admin-panel/design.md). A Fase B (app do cliente) fica para outro plano.

## Global Constraints

- Tudo do [`CLAUDE.md`](../../../CLAUDE.md) e de [`SECURITY_RULES.md`](../../security/SECURITY_RULES.md). Código em inglês, texto de UI em `pt-BR.json` via chave em inglês.
- Termos novos entram no glossário do `CLAUDE.md` **antes** do código (Task 1).
- Toda query do lojista filtra pela loja resolvida do JWT (`@CurrentShop()`); nenhuma rota recebe `shopId` do lojista.
- Escrita que depende de leitura: transação com `FOR UPDATE` no repository; evento de auditoria na mesma transação.
- Índice `DESC` → consulta com `desc nulls last`; listas com `limit` + cursor, sem N+1.
- Foto: só o caminho no bucket `shop-assets`, URL montada por `shopAssetUrl`.
- Botão: mesmas regras do botão da loja (`ShopPublicContactSchema`, CHECK `shops_cta_modes_check`), `https://` ou WhatsApp `^[1-9]{2}9[0-9]{8}$`.
- Celular/e-mail nunca em log nem URL. Admin vê contato do dono **só no detalhe** da loja; dado de cliente nunca.
- Toda rota `admin/*`: JWT com `app_metadata.role = 'admin'` + `aal = 'aal2'` + linha ativa em `admin_users`.
- Migration nova: `apps/api/drizzle/0028_*` (gerada por `pnpm --filter @lagoa/api db:generate`), RLS ligado sem policy, como `0015`.
- Infra (projeto Vercel, DNS, Turnstile, envs) só com confirmação explícita do dono, ação por ação.

## Review Focus

1. **Lojista edita um item enquanto o admin aprova a versão antiga** → a aprovação tem que falhar (`conflict`), não publicar o conteúdo novo sem revisão. Teste na Task 8.
2. **Token de admin (`role=admin`) chamando rota de cliente ou de lojista** → 403; e token de cliente/lojista em `admin/*` → 403. Teste na Task 6.
3. **Admin com senha certa mas sem TOTP (`aal1`)** → 403 em todo `admin/*` exceto as rotas de MFA do BFF. Teste na Task 6.
4. **Dois admins criando destaque no mesmo período ao mesmo tempo, última vaga** → só um passa. Teste na Task 9.
5. **Lojista mandando o id de um item de outra loja** (PATCH/arquivar/foto) → 404, sem vazar existência. Teste na Task 4.

---

## Parte 1 — Domínio e dados

### Task 1: Glossário, categorias, ramo e contratos do Hits em `shared/`

**Files:**
- Modify: `CLAUDE.md` (tabela do glossário: linhas do design de Hits + `adminUser`, `adminInvite`, `adminTeam`, `adminEvent`)
- Modify: `shared/schemas/shop.ts` (`ShopCategorySchema` ganha `clothing`, `services`, `home`)
- Create: `shared/domain/shopGroup.ts`, `shared/schemas/hitItem.ts`, `shared/schemas/featured.ts`, `shared/schemas/admin.ts`
- Modify: `shared/constants/domain.ts`
- Modify: `apps/web/layers/core/i18n/locales/pt-BR.json` (`categories.clothing` "Roupas e acessórios", `categories.services` "Serviços", `categories.home` "Casa e construção")
- Test: `shared/domain/shopGroup.test.ts`, `shared/schemas/hitItem.test.ts`

**Interfaces:**
- Produces:
  - `type ShopGroup = 'food' | 'beauty' | 'clothing' | 'services' | 'pet'`; `ShopGroupSchema`; `shopGroupOf(category: ShopCategory): ShopGroup`; `categoriesOf(group: ShopGroup): readonly ShopCategory[]`.
  - Constantes: `HIT_ITEM_TITLE_MAX_LENGTH = 60`, `HIT_ITEM_DESCRIPTION_MAX_LENGTH = 140`, `HIT_ITEM_PRICE_MAX_CENTS = 10_000_000`, `HIT_ITEMS_MAX_FOUNDER = 5`, `HIT_ITEMS_MAX_FOUNDER_PRO = 20`, `HIT_ITEM_REJECTION_REASON_MAX_LENGTH = 200`, `FEATURED_PAID_SLOTS_DISCOVER = 4`, `FEATURED_PAID_SLOTS_HITS = 3`, `FEATURED_CAROUSEL_MAX = 8`, `FEATURED_NOTE_MAX_LENGTH = 200`. (Valores provisórios do PO; mudam só aqui.)
  - `HitItemStatusSchema = z.enum(['pending','approved','rejected','archived'])`.
  - `HitItemDraftSchema` (strict): `title`, `description` (nullable), `priceCents` (int > 0, nullable), `contact: ShopPublicContactSchema.nullable()` (null = usa o da loja), `endsAt` (ISO datetime, nullable).
  - `MerchantHitItemSchema`: draft + `id`, `status`, `rejectionReason` (nullable), `photoUrl` (url, nullable), `createdAt`, `updatedAt`.
  - `FeaturedSurfaceSchema = z.enum(['discoverCarousel','hitsBanner'])`; `FeaturedPlacementDraftSchema` (strict): `shopId`, `surface`, `hitItemId` (nullable; obrigatório se `hitsBanner`, proibido se `discoverCarousel`, via `superRefine`), `startsAt`, `endsAt` (> `startsAt`), `note` (nullable).
  - `shared/schemas/admin.ts`: `AdminUserSchema` (`id`, `name`, `email`, `disabledAt` nullable, `createdAt`), `AdminInviteSchema` (strict: `name` 2–80, `email`), `AdminShopActionSchema` (discriminada por `action`: `approve` | `suspend` (+`reason` obrigatório) | `reactivate` | `changePlan` (+`plan`)), `HitItemReviewSchema` (discriminada: `approve` (+`expectedVersion: number`) | `reject` (+`reason`) | `takeDown` (+`reason`)).

- [ ] **Step 1:** Adicionar as linhas ao glossário do `CLAUDE.md` (copiar a tabela de "Glossário" dos dois designs). Commit isolado: `docs: glossary for hits and admin`.
- [ ] **Step 2: Testes que falham** — `shopGroup.test.ts`: `shopGroupOf('pizzeria') === 'food'`, `shopGroupOf('barbershop') === 'beauty'`, `shopGroupOf('gym') === 'services'`, `shopGroupOf('other') === 'services'`, `shopGroupOf('petShop') === 'pet'`; "toda categoria tem exatamente um ramo" (`ShopCategorySchema.options.every(c => categoriesOf(shopGroupOf(c)).includes(c))`). `hitItem.test.ts`: aceita draft mínimo; recusa `priceCents: 0`; recusa título de 61; recusa `contact.url` `http://`; `FeaturedPlacementDraftSchema` recusa `hitsBanner` sem `hitItemId`, `discoverCarousel` com `hitItemId` e `endsAt <= startsAt`.
- [ ] **Step 3:** Rodar `pnpm --filter @lagoa/web test shared` (ou o vitest do pacote que cobre `shared/`; conferir em `apps/web/vitest.config.*`). Esperado: FAIL.
- [ ] **Step 4:** Implementar (mapa `food`: cafe, bakery, pizzeria, restaurant; `beauty`: barbershop, beauty; `clothing`; `services`: services, gym, home, other; `pet`: petShop).
- [ ] **Step 5:** Rodar de novo + `pnpm typecheck` + `pnpm typecheck:api`. Esperado: PASS (o select de categoria do Criar o clube ganha as 3 opções pelo i18n).
- [ ] **Step 6: Commit** `feat(shared): shop groups, new categories and hits/admin contracts`.

### Task 2: Tabelas e migration 0028

**Files:**
- Modify: `apps/api/src/database/schema/enums.ts` (`shopCategory` + `clothing`,`services`,`home`; `hitItemStatus`; `featuredSurface`)
- Create: `apps/api/src/database/schema/hits.ts`, `apps/api/src/database/schema/admin.ts`
- Modify: `apps/api/src/database/schema/shops.ts` (`shop_status_events.actor_admin_id uuid null → admin_users`), `schema/index.ts`
- Create: `apps/api/drizzle/0028_<gerado>.sql` + acrescentar `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` para as 5 tabelas novas
- Modify: `apps/api/src/test-support/test-database.ts` (`createHitItem`, `createAdminUser`)
- Test: `apps/api/src/database/schema/hits.integration.test.ts`

**Interfaces:**
- Produces (Drizzle): `hitItems`, `hitItemStatusEvents`, `featuredPlacements`, `adminUsers`, `adminEvents`.
  - `hit_items`: colunas do design + `version integer not null default 1` (sobe a cada edição do lojista; base do conflito da Review Focus 1). Botão: as 5 colunas de `shops` com o **mesmo** CHECK (`hit_items_cta_modes_check`, `hit_items_whatsapp_check`, `hit_items_cta_kind_check` — copiar o SQL, trocando a tabela). CHECKs: `price_cents IS NULL OR price_cents BETWEEN 1 AND 10000000`; `char_length(title) BETWEEN 1 AND 60`; `status <> 'rejected' OR rejection_reason IS NOT NULL`. Índices: `(shop_id, created_at desc nulls last)`; parcial `(approved_at desc nulls last, id) WHERE status='approved'`; parcial `(created_at, id) WHERE status='pending'`.
  - `hit_item_status_events`: `hit_item_id`, `from_status`, `to_status`, `actor_admin_id` null, `reason` null, `created_at`; índice `(hit_item_id, created_at desc)`.
  - `featured_placements`: colunas do design; CHECK `ends_at > starts_at`; CHECK `(surface='hitsBanner') = (hit_item_id IS NOT NULL)`; índice `(surface, starts_at, ends_at) WHERE cancelled_at IS NULL`.
  - `admin_users`: `id uuid pk` (= `auth.users.id`, sem FK para `app_users`), `name`, `email_encrypted bytea`, `email_hash bytea unique`, `invited_by uuid null → admin_users`, `disabled_at`, `created_at`. (E-mail cifrado com o `PiiService` como em `app_users`.)
  - `admin_events`: `actor_admin_id`, `kind text` (`invite` | `disable` | `reactivate` | `resetMfa`), `target_admin_id`, `created_at`.
  - `TestDatabase.createHitItem(shopId: string, overrides?: Partial<typeof hitItems.$inferInsert>): Promise<{ id: string }>`; `TestDatabase.createAdminUser(overrides?): Promise<{ id: string }>`.

- [ ] **Step 1: Teste que falha** (`hits.integration.test.ts`, `describe.skipIf(!TEST_DATABASE_URL)`): insert de `hit_items` com `cta_kind='url'` e `cta_url='http://x'` rejeita; `status='rejected'` sem motivo rejeita; `price_cents=0` rejeita; `featured_placements` `hitsBanner` sem item rejeita; `ends_at = starts_at` rejeita.
- [ ] **Step 2:** `pnpm test:api:db` (container `lagoa-postgres` já rodando, ver memória). Esperado: FAIL (tabela não existe).
- [ ] **Step 3:** Escrever os schemas, `pnpm --filter @lagoa/api db:generate`, acrescentar o RLS ao SQL gerado, `pnpm db:migrate:local`.
- [ ] **Step 4:** `pnpm test:api:db` + `pnpm --filter @lagoa/api db:check`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat(api): hits, featured placements and admin tables (0028)`.

### Task 3: Regras puras do item do Hits

**Files:**
- Create: `apps/api/src/hits/hit-item.rules.ts`, `apps/api/src/hits/hit-item.rules.test.ts`

**Interfaces:**
- Produces:
  - `hitItemCap(plan: ShopPlan): number`.
  - `planMerchantEdit(current: { status: HitItemStatus; version: number }): { status: 'pending'; version: number }` — sempre `pending`, `version + 1`.
  - `canCreateOrUnarchive(input: { plan: ShopPlan; activeCount: number }): Result<void, ErrorOf<'limitReached'>>` (`activeCount` = não arquivados).
  - `planReview(current: { status: HitItemStatus; version: number }, review: HitItemReview & { expectedVersion?: number }): Result<{ to: HitItemStatus; reason: string | null }, ErrorOf<'conflict'> | ErrorOf<'invalidTransition'>>` — `approve` só de `pending` e com `expectedVersion === version`; `reject` só de `pending`; `takeDown` só de `approved` (vira `rejected`).
  - `isOnShowcase(input: { status: HitItemStatus; endsAt: Date | null; shopStatus: ShopStatus }, now: Date): boolean`.

- [ ] **Step 1: Testes que falham:** cap 5/20; editar `approved` → `pending`, `version` 3→4; criar com 5 ativos no Fundador → `limitReached`; Pro rebaixado com 12 ativos → `limitReached` ao criar, mas os 12 seguem (nada nas regras os arquiva); approve com `expectedVersion` 3 e `version` 4 → `conflict`; approve de `archived` → `invalidTransition`; takeDown de `pending` → `invalidTransition`; `isOnShowcase` falso com loja `suspended`, com `endsAt` no passado e com status `pending`.
- [ ] **Step 2:** `pnpm test:api -- hit-item.rules`. FAIL.
- [ ] **Step 3:** Implementar. Se `ErrorOf<'limitReached' | 'conflict' | 'invalidTransition'>` não existir em `shared/types/errors.ts`, acrescentar lá (com a forma dos códigos existentes).
- [ ] **Step 4:** Rodar. PASS.
- [ ] **Step 5: Commit** `feat(api): hit item rules`.

### Task 4: API do lojista `merchant/hits`

**Files:**
- Create: `apps/api/src/merchant/hits/{hits.controller,hits.service,hits.repository,drizzle-hits.repository,hits.module}.ts`, `hits.service.test.ts`, `hits.integration.test.ts`, `hits.http.test.ts`
- Modify: `apps/api/src/merchant/merchant.module.ts`
- Reuse: `ShopPhotoStorage`, `image-header.ts` e a validação de `shop-photo.rules.ts` (tamanho, tipo, cabeçalho) para a foto do item

**Interfaces:**
- Consumes: Task 3 rules; `contactFromColumns`/`columnsFromContact`; `shopAssetUrl`.
- Produces (todas `@MerchantSurface()`, `@Controller('merchant/hits')`):
  - `GET /merchant/hits` → `{ items: MerchantHitItem[]; cap: number }` (todos da loja, `created_at desc nulls last`, limite = cap + arquivados recentes 50).
  - `POST /merchant/hits` body `HitItemDraft` → `MerchantHitItem` (status `pending`, sem foto ainda) | `limitReached`.
  - `PATCH /merchant/hits/:id` body `HitItemDraft` → `MerchantHitItem` (Task 3 `planMerchantEdit`) | `notFound`.
  - `PUT /merchant/hits/:id/photo` body `ShopPhotoUploadSchema` (mesmo formato do logo) → `MerchantHitItem` (troca a foto = edição: volta a `pending`); caminho `hits/<shopId>/<itemId>-<random>.<ext>`, remove a antiga em melhor esforço.
  - `POST /merchant/hits/:id/archive` / `POST /merchant/hits/:id/unarchive` → `MerchantHitItem`.
  - Repository: `abstract findForShop(shopId, id)`, `listForShop(shopId, limit)`, `countActive(shopId)`, `insert(shopId, draft)`, `updateLocked(shopId, id, mutate: (row) => Patch | Error)` — trava `FOR UPDATE` com `WHERE id = $1 AND shop_id = $2`; evento em `hit_item_status_events` (`actor_admin_id` null) quando o status muda, na mesma transação.
  - Item sem foto **não** entra na fila do admin (Task 8 filtra `photo_path IS NOT NULL`).

- [ ] **Step 1: Testes que falham** — `hits.integration.test.ts`: cria, lista, edita aprovado → `pending` e `version` sobe; 6º item no Fundador → `limitReached`; **PATCH/arquivar/foto com id de item de outra loja → `notFound`** (Review Focus 5); arquivar e desarquivar com teto cheio → `limitReached`. `hits.http.test.ts`: sem token 401; body com `shopId` extra → 400 (schema strict).
- [ ] **Step 2:** `pnpm test:api:db -- merchant/hits`. FAIL.
- [ ] **Step 3:** Implementar no padrão de `shop-contact`/`shop-photo`.
- [ ] **Step 4:** Rodar + `pnpm typecheck:api`. PASS (inclui `merchant-surface.sweep.test.ts`).
- [ ] **Step 5: Commit** `feat(api): merchant hits endpoints`.

### Task 5: BFF e tela "Hits" no painel do lojista

**Files:**
- Create: `apps/web/server/api/merchant/hits/index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id]/photo.put.ts`, `[id]/archive.post.ts`, `[id]/unarchive.post.ts` (cada um: `parsedBody` com o schema do `shared`, `id` validado com `z.uuid()`, `callApi` com caminho fixo)
- Create: `apps/web/layers/merchant/app/services/HitItemService.ts`, `services/http/HttpHitItemService.ts`, `services/mock/MockHitItemService.ts` (+ registrar em `MerchantServices.ts`, `createHttpMerchantServices.ts` e no mock)
- Create: `apps/web/layers/merchant/app/pages/hits.vue` (`path: '/hits'`), `composables/useHitsScreen.ts`, `components/hits/{List,Form,StatusBadge,Preview}.vue`
- Modify: `apps/web/layers/merchant/app/layouts/merchant.vue` (item "Hits" no menu), `pt-BR.json` (`merchantHits.*`), `nuxt.config` `routeRules` (`/hits` com `ssr: false`, como as outras do painel)
- Reuse: campos do editor de botão de `components/shop-link/*` (WhatsApp/URL/rótulo) com um seletor extra "Usar o botão da loja"
- Test: `apps/web/layers/merchant/app/services/mock/MockHitItemService.test.ts` (mesmo contrato do http, regra L do CLAUDE.md), `useHitsScreen.test.ts`

**Interfaces:**
- Consumes: Task 4 endpoints via `/api/merchant/hits/**`.
- Produces: `interface HitItemService { list(); create(draft); update(id, draft); uploadPhoto(id, upload); archive(id); unarchive(id) }`, cada um `Promise<Result<…, HitItemError>>` com `HitItemError = ErrorOf<'notFound' | 'limitReached'> | TransportError`.

- [ ] **Step 1: Testes que falham:** mock cumpre o contrato (criar → `pending`; editar aprovado → `pending`; 6º → `limitReached`); `useHitsScreen`: depois de salvar um aprovado mostra o aviso `merchantHits.backToReview`; item `rejected` mostra o motivo.
- [ ] **Step 2:** `pnpm test -- hits`. FAIL.
- [ ] **Step 3:** Implementar. Tela: lista (foto, título, preço com `formatCurrency`, `StatusBadge` "Em análise" / "No ar" / "Recusado: <motivo>" / "Arquivado"), contador "N de <cap>", formulário com foto (reusar `useImageResize`), prévia do card. Página ≤ 30 linhas de script, componente dumb ≤ 40.
- [ ] **Step 4:** `pnpm test` + `pnpm typecheck`. Subir `pnpm dev` + `pnpm dev:api` e conferir no navegador: cadastrar, editar, ver o status; screenshot.
- [ ] **Step 5: Commit** `feat(web): merchant hits screen`.

## Parte 2 — Auth e API do admin

### Task 6: Marcação de admin no token e guards

**Files:**
- Modify: `apps/api/src/auth/auth.types.ts` (`AuthUser` + `role: 'admin' | null`, `aal: 'aal1' | 'aal2' | null`), `apps/api/src/auth/supabase-auth.guard.ts` (ler `payload.app_metadata.role` e `payload.aal`)
- Create: `apps/api/src/admin/access/{admin-surface.decorator,admin.guard,admin-users.reader,drizzle-admin-users.reader,admin.context,current-admin.decorator}.ts`
- Create: `apps/api/src/auth/surface-role.guard.ts` (global, registrado depois do `SupabaseAuthGuard`): se `user.role === 'admin'` e a rota **não** tem `@AdminSurface()` → 403
- Test: `apps/api/src/admin/access/admin.guard.http.test.ts`, `apps/api/src/admin/access/admin-surface.sweep.test.ts` (como `merchant-surface.sweep.test.ts`)

**Interfaces:**
- Produces: `@AdminSurface()` (class decorator: `UseGuards(AdminGuard)` + metadata); `AdminGuard` exige `role === 'admin'`, `aal === 'aal2'` e `admin_users` com `disabled_at IS NULL` → senão 403 `forbidden`; `@CurrentAdmin(): AdminContext` = `{ adminId: string }`.

- [ ] **Step 1: Testes que falham** (`admin.guard.http.test.ts`, com JWKS de teste como em `supabase-auth.guard.test.ts`): **token `role=admin` em `GET /v1/wallet` e em `GET /v1/merchant/session` → 403**; token de cliente em `/v1/admin/shops` → 403; **admin `aal1` em `/v1/admin/shops` → 403**; admin `aal2` desativado → 403; admin `aal2` ativo → 200. Sweep: todo controller do `AdminModule` tem `@AdminSurface()`.
- [ ] **Step 2:** `pnpm test:api -- admin/access`. FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar a suíte inteira da API (o guard global não pode quebrar rota existente). PASS.
- [ ] **Step 5: Commit** `feat(api): admin role, aal2 and surface guards`.

### Task 7: `admin/shops`

**Files:**
- Modify: `apps/api/src/database/shop-status.ts` (`changeShopStatus` aceita `actor: { kind: 'script'; nickname } | { kind: 'admin'; adminId }`; o script segue funcionando)
- Create: `apps/api/src/admin/shops/{controller,service,repository,drizzle-repository,module,rules}.ts` + testes
- Create: `apps/api/src/admin/admin.module.ts`; registrar no `app.module.ts`

**Interfaces:**
- Produces (`@AdminSurface()`, `@Controller('admin/shops')`):
  - `GET /admin/shops?status=&q=&cursor=` → `{ shops: AdminShopRow[]; nextCursor }` (`AdminShopRow` = id, nome, categoria, bairro, status, plano, createdAt; **sem contato**); `pending` primeiro, depois `created_at desc nulls last`; `q` = `ILIKE` no nome.
  - `GET /admin/shops/:id` → `AdminShopDetail` = row + endereço + programa ativo + `owner: { phone, email | null }` (decifrado pelo `PiiService`, só aqui) + `stats: { customers, visitsLast30Days }` (agregado) + `history` (`shop_status_events`, últimos 20).
  - `POST /admin/shops/:id/actions` body `AdminShopAction` → `AdminShopDetail` | `nothingToChange` | `notFound`.
  - Schemas `AdminShopRowSchema`, `AdminShopDetailSchema` em `shared/schemas/admin.ts`.

- [ ] **Step 1: Testes que falham** (integração): aprovar `pending` grava evento com `actor_admin_id`; suspender sem `reason` → 400; trocar plano Pro→Fundador não toca `hit_items`; lista não traz celular em nenhum campo (`JSON.stringify(row)` não contém os dígitos do dono); script `shop:status` continua passando no teste existente.
- [ ] **Step 2–4:** FAIL → implementar → PASS (`pnpm test:api:db -- admin/shops`).
- [ ] **Step 5: Commit** `feat(api): admin shops`.

### Task 8: `admin/hits`

**Files:**
- Create: `apps/api/src/admin/hits/{controller,service,repository,drizzle-repository,module}.ts` + testes

**Interfaces:**
- Consumes: Task 3 `planReview`.
- Produces (`@Controller('admin/hits')`):
  - `GET /admin/hits?status=pending|approved&cursor=` → `{ items: AdminHitItem[]; nextCursor }` (`AdminHitItem` = item + `version` + loja (id, nome, status) + `photoUrl` + **botão efetivo** (`contact` do item ou da loja) + `contactSource: 'item' | 'shop'`); `pending` em `created_at asc`, só com `photo_path IS NOT NULL`.
  - `POST /admin/hits/:id/review` body `HitItemReview` → `AdminHitItem` | `conflict` | `invalidTransition` | `notFound`. Trava a linha `FOR UPDATE`; grava `approved_at` ao aprovar; evento com `actor_admin_id`.

- [ ] **Step 1: Testes que falham:** **lojista edita (version 1→2) e admin aprova com `expectedVersion: 1` → `conflict`, item segue `pending`** (Review Focus 1); recusar sem motivo → 400; takeDown de aprovado → `rejected` com motivo visível no `GET /merchant/hits`; item sem foto não aparece na fila.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `feat(api): admin hits review`.

### Task 9: Destaques pagos (`featured`)

**Files:**
- Create: `apps/api/src/featured/featured.rules.ts` + teste; `apps/api/src/admin/featured/{controller,service,repository,drizzle-repository,module}.ts` + testes

**Interfaces:**
- Produces:
  - `paidSlotsFor(surface: FeaturedSurface): number`.
  - `peakOverlap(existing: readonly { startsAt: Date; endsAt: Date }[], candidate: { startsAt: Date; endsAt: Date }): number` — maior número de períodos existentes que se sobrepõem a algum instante do candidato (varredura de eventos; intervalos semiabertos `[start, end)`).
  - `planPlacement(input: { candidate; existing; surface; shopStatus; hitItem: { status; shopId } | null; shopId }): Result<void, ErrorOf<'slotsFull'> | ErrorOf<'invalidTarget'>>` — `slotsFull` se `peakOverlap >= paidSlotsFor(surface)`; `invalidTarget` se loja não `approved`, ou banner com item não `approved` / de outra loja.
  - `GET /admin/featured?surface=&from=&to=` → `{ placements: AdminPlacement[]; proShops: { id; name }[] }`.
  - `GET /admin/featured/availability?surface=&from=&to=` → `{ days: { date: string; freeSlots: number }[] }` (máx. 90 dias).
  - `POST /admin/featured` body `FeaturedPlacementDraft` → `AdminPlacement` | `slotsFull` | `invalidTarget`. Na transação: `pg_advisory_xact_lock(hashtext('featured:' || surface))` antes de ler os vigentes.
  - `POST /admin/featured/:id/cancel` → `AdminPlacement`.

- [ ] **Step 1: Testes que falham:** rules — 4 vagas no Descobrir ocupadas em 10–20/11 recusam 15–16/11 e aceitam 20–25/11 (semiaberto); banner com item `pending` → `invalidTarget`. Integração — **duas criações concorrentes (`Promise.all`) para a última vaga → uma `ok`, outra `slotsFull`** (Review Focus 4); cancelado libera a vaga.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `feat(api): paid featured placements`.

### Task 10: `admin/team`, primeiro admin e tentativas de login

**Files:**
- Create: `apps/api/src/admin/team/{controller,service,repository,drizzle-repository,module}.ts`, `admin/team/supabase-admin-auth.ts` (único lugar com `SUPABASE_SERVICE_ROLE_KEY` além dos já existentes) + testes
- Create: `apps/api/src/database/admin-create.ts` + script `admin:create` no `apps/api/package.json` (`--email --name`; cria via `inviteUserByEmail` com `app_metadata.role='admin'` e insere `admin_users`)
- Create: `apps/api/src/auth/login-attempts/admin-login-attempts.controller.ts` (`POST /v1/auth/admin-login-attempts`, só com `BFF_SHARED_SECRET`, chave = hash do e-mail, `@FailClosedThrottle()`, reaproveita `login-attempt-gate.ts`)

**Interfaces:**
- Produces (`@Controller('admin/team')`): `GET /admin/team` → `AdminUser[]`; `POST /admin/team/invite` body `AdminInvite` → `AdminUser` | `alreadyExists`; `POST /admin/team/:id/disable`, `/reactivate`, `/reset-mfa` → `AdminUser` | `forbidden` (alvo = o próprio admin). Cada ação grava `admin_events`. `reset-mfa` apaga os fatores TOTP do alvo pela API admin do Supabase. `AdminAuth` (classe abstrata) com `invite(email, name)`, `deleteMfaFactors(userId)`; implementação Supabase + fake para testes.

- [ ] **Step 1: Testes que falham:** convidar grava `admin_users` e `admin_events(kind='invite')`; desativar a si mesmo → `forbidden`; reset-mfa em si mesmo → `forbidden`; desativado + reativado volta a passar no `AdminGuard`; `admin-login-attempts` sem segredo → 401, acima do teto → 429, storage fora → 503 (fail-closed).
- [ ] **Step 2–4:** FAIL → implementar → PASS (`pnpm test:api:db -- admin/team login-attempts`).
- [ ] **Step 5: Commit** `feat(api): admin team, bootstrap script and admin login attempts`.

## Parte 3 — `apps/admin`

### Task 11: Esqueleto do app

**Files:**
- Create: `apps/admin/{package.json,nuxt.config.ts,tsconfig.json,app/app.vue,app/layouts/admin.vue,app/pages/index.vue,i18n/locales/pt-BR.json,vitest.config.ts}`
- Modify: raiz `package.json` (`dev:admin` porta 3002, `build:admin`, `typecheck:admin`, `test:admin`)

**Interfaces:**
- Produces: app Nuxt `@lagoa/admin` que `extends: ['../web/layers/ui']` (alias `#shared` e `#layers/ui` como `apps/site`), `ssr: false`, `colorMode` claro, `routeRules '/**': { headers: { ...SECURITY_HEADERS, 'X-Robots-Tag': 'noindex, nofollow' } }`, CSP sem inline (SPA: `script-src 'self'`; conferir com `contentSecurityPolicy.ts`), `frame-ancestors 'none'`. `runtimeConfig`: `apiBaseUrl`, `supabaseUrl`, `supabaseAnonKey`, `turnstileSecret`, `bffSharedSecret`, `allowedOrigins`; `public.turnstileSiteKey`. Layout desktop 1280px com menu: Lojas · Hits · Destaques · Equipe · Minha conta.

- [ ] **Step 1:** Teste de config (`apps/admin/server/test/securityHeaders.test.ts`): resposta de `/` traz `X-Robots-Tag: noindex, nofollow` e `frame-ancestors 'none'`.
- [ ] **Step 2–4:** FAIL → criar o app → `pnpm install`, `pnpm typecheck:admin`, `pnpm test:admin` PASS; `pnpm dev:admin` abre a casca no navegador.
- [ ] **Step 5: Commit** `feat(admin): app skeleton`.

### Task 12: BFF do admin — login, MFA e sessão

**Files:**
- Create: `apps/admin/server/api/auth/{login.post,mfa-enroll.post,mfa-verify.post,refresh.post,logout.post,session.get}.ts`
- Create: `apps/admin/server/utils/{turnstile,adminCookies,adminApi}.ts` + testes em `apps/admin/server/test`
- Reuse (import relativo de `../web/server/utils`): `originGuard`, `upstream`, `securityLog`, `securityHeaders`

**Interfaces:**
- Produces:
  - `verifyTurnstile(token: string, secret: string, ip: string | undefined): Promise<boolean>` (POST `https://challenges.cloudflare.com/turnstile/v0/siteverify`; qualquer falha = `false`).
  - Cookies `lagoa_admin_at` / `lagoa_admin_rt`: httpOnly, Secure, SameSite=Strict, path `/`, host-only.
  - `login.post` body `{ email, password, captchaToken }`: Origin → Turnstile → `POST /v1/auth/admin-login-attempts` → `grant_type=password` no Supabase → grava cookies → responde `{ next: 'enroll' | 'verify' }` (pela lista de fatores TOTP). Erro sempre genérico `invalidCredentials` (não diz se o e-mail existe).
  - `mfa-enroll.post` → `{ qrSvg, secret }`; `mfa-verify.post` body `{ code }` → challenge + verify no Supabase, troca os cookies pelo token `aal2`.
  - `session.get` → `{ admin: { name } } | { next: 'verify' | 'enroll' } | null`.
  - `callAdminApi(event, call)`: como `callApi` do web, com os cookies do admin.

- [ ] **Step 1: Testes que falham:** `verifyTurnstile` com fetch falhando → `false`; login sem captcha válido → 400 e Supabase não é chamado; login com Origin de fora → 403; cookie sai com `SameSite=Strict` e sem `Domain`; logout limpa os dois cookies; nenhuma linha de log contém o e-mail (`securityLogLine`).
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `feat(admin): login with captcha and TOTP`.

### Task 13: Telas do admin

**Files:**
- Create: `apps/admin/server/api/admin/**` (um handler por rota das Tasks 7–10, caminho fixo, entrada validada com o schema do `shared`)
- Create: `apps/admin/app/pages/{sign-in,mfa,shops/index,shops/[id],hits,featured,team,account}.vue`, `app/composables/use<Tela>Screen.ts`, `app/services/{AdminShopsService,AdminHitsService,AdminFeaturedService,AdminTeamService}.ts` + `http/*`, `app/components/<tela>/*`, `app/middleware/admin-auth.global.ts`
- Test: `use<Tela>Screen.test.ts` para Lojas, Hits e Destaques

**Interfaces:**
- Consumes: Tasks 7–10, Task 12 (`session.get`).
- Produces: telas do design do admin. Hits: card grande com foto, preço, **link do botão visível por inteiro** e "botão da loja"/"botão próprio"; aprovar envia `expectedVersion`; `conflict` mostra "O lojista mudou este produto. Recarregue para revisar de novo." Destaques: agenda de vagas livres (Task 9 `availability`) antes do formulário; `slotsFull` mostra o dia lotado. Lojas: contato do dono só no detalhe.

- [ ] **Step 1: Testes que falham:** `useHitsScreen` em `conflict` recarrega a fila e mostra a mensagem; `useFeaturedScreen` desabilita "Lançar destaque" quando o período escolhido tem dia com `freeSlots: 0`; middleware manda `next: 'verify'` para `/mfa`.
- [ ] **Step 2–4:** FAIL → implementar → PASS; `pnpm dev:admin` + `pnpm dev:api` contra o banco local com um admin criado pelo `admin:create`: entrar (Turnstile em modo de teste, chave `1x00000000000000000000AA`), aprovar uma loja, aprovar um item cadastrado pela Task 5, lançar um destaque; screenshots.
- [ ] **Step 5: Commit** `feat(admin): shops, hits, featured, team and account screens`.

### Task 14: Infra (só com confirmação do dono, ação por ação)

Sem código novo; checklist executado com o dono.

- [ ] **Step 1:** Banco de teste: `0028` aplicada + `pnpm test:api:db` verde; depois `pnpm --filter @lagoa/api db:migrate:prod` (regra do `CLAUDE.md`).
- [ ] **Step 2:** Criar widget no Cloudflare Turnstile para `admin.lagoamais.com.br` (o dono cria ou autoriza).
- [ ] **Step 3:** Projeto Vercel novo `lagoa-admin` (root `apps/admin`), envs: `NUXT_API_BASE_URL`, `NUXT_SUPABASE_URL`, `NUXT_SUPABASE_ANON_KEY`, `NUXT_TURNSTILE_SECRET`, `NUXT_PUBLIC_TURNSTILE_SITE_KEY`, `NUXT_BFF_SHARED_SECRET`, `NUXT_ALLOWED_ORIGINS=https://admin.lagoamais.com.br`.
- [ ] **Step 4:** Domínio `admin.lagoamais.com.br` no projeto + registro DNS onde o domínio está.
- [ ] **Step 5:** API: deploy com os módulos novos; `admin:create` do primeiro admin (o dono); entrar em produção, cadastrar o TOTP, aprovar um item de teste e arquivá-lo.
