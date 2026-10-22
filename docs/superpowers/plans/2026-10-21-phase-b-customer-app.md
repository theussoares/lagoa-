# Fase B — App do cliente (barra nova, Descobrir em trilhos, Hits): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o cliente ganha a barra Descobrir · Hits · Carimbar · Carteira · Mais, um Descobrir em trilhos com carrossel de destaque e a aba Hits com os produtos aprovados das lojas, tudo atrás de uma chave.

**Architecture:** API nova só de leitura no NestJS (`customer/hits`, `discover/featured`, campo `surpriseDayToday` no catálogo), "rende X" calculado por `planEarning` sem cliente. O BFF ganha uma rota por rota da API e o layer `customer` ganha serviços, composables de tela e componentes no padrão atual (SSR, `useAsyncQuery`). A barra e as telas novas só aparecem com `NUXT_PUBLIC_HITS_ENABLED=true`. Com a chave desligada, o app fica exatamente como hoje.

**Tech Stack:** Nuxt 4 + Nuxt UI v4 (SSR), NestJS + Drizzle, Zod em `shared/`, Vitest.

**Spec:** [`docs/specs/hits-showcase/design.md`](../../specs/hits-showcase/design.md). Mockup: [`docs/specs/hits-showcase/mockups/discover-hits-nav-v2.html`](../../specs/hits-showcase/mockups/discover-hits-nav-v2.html). A Fase A (dados, Hits do lojista, API do admin) já está em produção.

## Global Constraints

- Tudo do [`CLAUDE.md`](../../../CLAUDE.md) e de [`SECURITY_RULES.md`](../../security/SECURITY_RULES.md). Código em inglês, texto em `pt-BR.json` com chave em inglês.
- O app **continua abrindo na Carteira** (`/carteira`).
- "Rende X" é igual para todo mundo: regra base do programa **ativo** + dobro do **dia surpresa** quando vale hoje. Sai de `planEarning` (`shared/domain/earning.ts`) com `card: null`, `customerBirthday: null`. Aniversário e boas-vindas ficam fora. Nunca é gravado nem copiado.
- A vitrine só mostra item `approved`, com `ends_at` nulo ou futuro, de loja `approved`, **com foto**.
- Todo destaque leva o selo visível: "Destaque" no Descobrir e "Patrocinado" no Hits.
- Botão do produto: o do item se existir, senão o da loja. O link sai de `shared/utils/shopContactHref.ts` e abre em nova aba.
- Listas com `limit` + cursor, sem N+1; índice `DESC` com `desc nulls last`.
- Dado de cliente não entra em nada disto. As rotas são só leitura, autenticadas como as do Descobrir hoje.
- Termo novo entra no glossário antes do código. Os da Fase A já estão lá.
- Chave `NUXT_PUBLIC_HITS_ENABLED` (padrão `false`), no molde de `useCampaignsEnabled`.

## Review Focus

1. **Produto aprovado cuja loja foi suspensa ou cujo `ends_at` passou** some do Hits e do banner na hora. Teste na Task 2.
2. **Pontos por real sem preço** não mostram o selo "rende"; **carimbo sem preço** mostra "rende 1 carimbo". Teste na Task 2.
3. **Ramo sem nenhuma loja ou produto** (ex.: Pet) mostra o vazio próprio, não uma tela em branco nem um erro. Teste na Task 5 e na Task 6.
4. **Chave desligada**: barra, rotas e telas idênticas às de hoje; `/hits` devolve 404. Teste na Task 4.
5. **Deep link antigo `/premios`** continua funcionando: com a chave ligada, cai na aba Prêmios da Carteira. Teste na Task 4.

---

### Task 1: Contratos e catálogo com "dia surpresa hoje"

**Files:**
- Create: `shared/schemas/showcase.ts` (contratos públicos do Hits e do destaque)
- Modify: `shared/schemas/shop.ts` (`ShopSummarySchema.program` + `surpriseDayToday: z.boolean().default(false)`)
- Modify: `apps/api/src/shops/catalog-row.ts`, `catalog-shop.ts`, `shop-summary.mapper.ts` (preencher `surpriseDayToday` com `now`)
- Create: `shared/domain/showcaseEarning.ts`
- Modify: `shared/constants/domain.ts` (`HITS_PAGE_SIZE = 20`, `HITS_BANNERS_MAX = 5`)
- Test: `shared/domain/showcaseEarning.test.ts`, `apps/api/src/shops/shop-summary.mapper.test.ts`

**Interfaces:**
- Produces:
  - `ShowcaseEarningSchema = z.object({ unit: ProgramUnitSchema, units: z.number().int().positive(), doubled: z.boolean() }).nullable()`, `type ShowcaseEarning`.
  - `showcaseEarning(input: { rules: ProgramRules; bonusRules: BonusRules; priceCents: number | null; now: Date }): ShowcaseEarning`. Monta o `EarnInput` com `{ kind: 'amount', amountCents }` se o modo é por real e há preço, `{ kind: 'visit' }` se o modo é por visita. Devolve `null` quando o modo é por real e não há preço, ou quando `planEarning` falha. `doubled` = `appliedBonuses` contém o dia surpresa.
  - `isSurpriseDayToday(bonusRules: BonusRules, now: Date): boolean` (data local, mesma regra que `applyVisitBonuses` usa).
  - `PublicHitItemSchema`: `id`, `title`, `description` (nullable), `priceCents` (nullable), `photoUrl`, `earning: ShowcaseEarningSchema`, `contact: ShopPublicContactSchema.nullable()`, `shop: { id, name, category, neighborhood }`.
  - `PublicHitItemPageSchema = { items: PublicHitItem[]; nextCursor: string | null }`.
  - `HitsBannerSchema = { item: PublicHitItem; sponsored: boolean }`.
  - `HitsQuerySchema` (strict): `group: ShopGroupSchema.optional()`, `cursor: z.uuid().optional()`.
  - `FeaturedShopSchema = ShopSummarySchema.extend({ sponsored: z.boolean() })`.

- [ ] **Step 1: Testes que falham.**
  - `showcaseEarning`:
    - Carimbo por visita, sem preço → `{ unit: 'stamp', units: 1, doubled: false }`.
    - 10 pts/real com `priceCents` 5990 → `{ unit: 'point', units: 599, doubled: false }`. Conferir com o arredondamento real de `planEarning`.
    - Por real sem preço → `null`.
    - Dia surpresa hoje → `units` em dobro e `doubled: true`.
    - Aniversário e boas-vindas nunca entram.
  - `isSurpriseDayToday`: em 2026-10-21T02:00Z (22h local de 20/10), uma regra com data `2026-10-20` dá `true`.
  - Mapper: `surpriseDayToday` sai `true` só no dia.
- [ ] **Step 2:** `pnpm test -- showcaseEarning` + `pnpm test:api -- shop-summary`. FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar + `pnpm typecheck` + `pnpm typecheck:api`. PASS.
- [ ] **Step 5: Commit** `feat(shared): showcase earning and surprise-day flag in the catalog`.

### Task 2: API do cliente — Hits e destaque

**Files:**
- Create: `apps/api/src/customer/hits/{hits.controller,hits.service,hits.repository,drizzle-hits.repository,hits.module}.ts` + `hits.integration.test.ts`, `hits.http.test.ts`
- Modify: `apps/api/src/customer/discover/*` (`GET /discover/featured`), `customer.module.ts`
- Test: `apps/api/src/customer/discover/discover.integration.test.ts`

**Interfaces:**
- Consumes: Task 1 (`showcaseEarning`, schemas); tabelas `hit_items`, `featured_placements`; `contactFromColumns`; `shopAssetUrl`; `categoriesOf(group)`.
- Produces:
  - `GET /v1/hits?group=&cursor=` → `PublicHitItemPage`.
    - Filtro: `status='approved' AND photo_path IS NOT NULL AND (ends_at IS NULL OR ends_at > now) AND shop.status='approved'`.
    - `group` filtra por `shops.category IN categoriesOf(group)`.
    - Ordem `approved_at desc nulls last, id desc`; cursor `(approved_at, id)` lido no SQL, como em `admin/hits`.
    - Página `HITS_PAGE_SIZE`, `limit + 1`.
    - Um select com join em `shops` + `programs` ativos, sem N+1.
  - `GET /v1/hits/banners` → `HitsBanner[]`, no máximo `HITS_BANNERS_MAX`:
    - Primeiro, os `featured_placements` `hitsBanner` vigentes (`cancelled_at IS NULL`, `starts_at <= now < ends_at`) cujo item passa no filtro acima: `sponsored: true`, mais antigo primeiro.
    - Depois, completa com o item aprovado mais novo de cada loja `founderPro` aprovada que ainda não apareceu: `sponsored: false`.
    - Ruling do controller (o design deixava em aberto): Pro entra no banner automaticamente, mas só depois dos pagos.
  - `GET /v1/discover/featured` → `FeaturedShop[]`, no máximo `FEATURED_CAROUSEL_MAX`:
    - Lojas aprovadas com `discoverCarousel` vigente vêm primeiro (`sponsored: true`); destaque de loja suspensa fica de fora (pausado).
    - Depois, as lojas `founderPro` aprovadas (`sponsored: false`), sem repetir.
    - Dentro de cada grupo, rotação estável por dia: ordenar por `md5(shop_id || <data local ISO>)`.

- [ ] **Step 1: Testes que falham** (integração, banco real):
  - Item aprovado de loja suspensa não aparece.
  - Item com `ends_at` no passado não aparece.
  - Item sem foto não aparece.
  - `group=pet` sem lojas pet → `items: []`.
  - Paginação com página 2 (injetar o tamanho, como em `admin/hits`): sem duplicata nem buraco.
  - Por real sem preço → `earning: null`; carimbo sem preço → `units: 1`.
  - Banner pago vem antes do Pro; banner com item expirado some.
  - Featured: pago primeiro, Pro depois, sem repetir; ordem igual em duas chamadas no mesmo dia.
  - HTTP: sem token → 401; `?group=xyz` → 400.
- [ ] **Step 2–4:** FAIL → implementar → PASS (`pnpm test:api:db -- customer/hits discover`). Rodar a suíte inteira da API uma vez.
- [ ] **Step 5: Commit** `feat(api): customer hits feed, banners and featured shops`.

### Task 3: BFF e serviços do cliente

**Files:**
- Create: `apps/web/server/api/hits/index.get.ts`, `apps/web/server/api/hits/banners.get.ts`, `apps/web/server/api/discover/featured.get.ts` (query validada com `HitsQuerySchema`, caminho fixo, `callApi`)
- Create: `apps/web/layers/customer/app/services/HitsService.ts` + `services/http/HttpHitsService.ts`
- Modify: `DiscoverService.ts` (+ `listFeatured()`), `HttpDiscoverService`, `CustomerServices.ts`, o plugin de serviços do cliente
- Test: `apps/web/layers/customer/test/hitsService.test.ts` (http contra fetcher falso, resposta validada pelo schema)

**Interfaces:**
- Produces:
  - `interface HitsService { list(query: HitsQuery): Promise<Result<PublicHitItemPage, TransportError>>; banners(): Promise<Result<HitsBanner[], TransportError>> }`.
  - `DiscoverService.listFeatured(): Promise<Result<FeaturedShop[], TransportError>>`.

- [ ] **Step 1–4:** Teste que falha (resposta fora do schema vira `TransportError`; `group` vai na query) → implementar → `pnpm test` + `pnpm typecheck` PASS.
- [ ] **Step 5: Commit** `feat(web): customer hits and featured services`.

### Task 4: Chave, barra nova, menu Mais e Prêmios dentro da Carteira

**Files:**
- Create: `apps/web/layers/customer/app/composables/useHitsEnabled.ts` (lê `runtimeConfig.public.hitsEnabled`, molde `useCampaignsEnabled`), `nuxt.config` (`public.hitsEnabled: false`)
- Modify: `apps/web/layers/ui/app/components/AppTabBar.vue` + `layers/ui/app/types/wallet.ts`
- Modify: `apps/web/layers/customer/app/layouts/customer.vue`
- Create: `apps/web/layers/customer/app/components/more-menu/Sheet.vue` (`UDrawer`/`USlideover` de baixo)
- Modify: `pages/wallet.vue`, `useWalletScreen.ts`; a página `rewards.vue` redireciona com a chave ligada
- Modify: `pt-BR.json` (`nav.hits`, `nav.more`, `moreMenu.*`, `wallet.tabs.cards`, `wallet.tabs.rewards`)
- Test: `apps/web/layers/ui/test/AppTabBar.nuxt.test.ts`, `apps/web/layers/customer/test/customerLayout.nuxt.test.ts`, `walletTabs.nuxt.test.ts`

**Interfaces:**
- Produces:
  - `TabBarItem` ganha a variante `{ kind: 'button'; label; icon; activeIcon; onSelect: () => void }` (a atual vira `kind: 'link'`, que continua o padrão). `AppTabBar` renderiza `<button type="button" aria-haspopup="dialog">` para a variante botão.
  - Layout com a chave ligada:
    - Itens `[Descobrir /descobrir, Hits /hits, Carteira /carteira, Mais (botão)]` e ação central `Carimbar /check-in`.
    - Ícones: `i-ph-compass`, `i-ph-fire`, `i-ph-wallet`, `i-ph-dots-three-outline`.
    - `useSwipeNavigation` só com as rotas link.
  - Layout com a chave desligada: exatamente como hoje.
  - Menu Mais:
    - Ranking (`/ranking`) e Perfil (`/perfil`).
    - Linhas de 56px, alvo ≥ 44px; fecha no Esc e ao navegar.
    - **Sem Convidar amigo.**
  - Carteira com a chave ligada:
    - Abas "Cartões" | "Prêmios", seleção por `?aba=premios`.
    - A aba Prêmios reusa `RewardsReadySection`, `RewardsUpcomingSection` e `RewardsHistorySection` com os dados de `useRewardsScreen`.
    - `/premios` → `navigateTo('/carteira?aba=premios', { redirectCode: 301 })`.
  - `/hits` sem a chave → 404 (`createError({ statusCode: 404 })` no middleware da página).

- [ ] **Step 1: Testes que falham:**
  - Chave off: a barra tem os 4 itens antigos e `/premios` renderiza a tela de hoje.
  - Chave on:
    - A barra tem Descobrir, Hits, Carimbar, Carteira e Mais, e Mais é `button` com `aria-haspopup`.
    - O clique em Mais abre a folha com Ranking e Perfil, e não há "Convidar".
    - `/premios` redireciona para `/carteira?aba=premios`.
    - Na Carteira, a aba Prêmios mostra a seção de prontos.
- [ ] **Step 2–4:** FAIL → implementar → `pnpm test` + `pnpm typecheck` PASS.
- [ ] **Step 5: Commit** `feat(web): new customer tab bar, more menu and rewards inside the wallet (flagged)`.

### Task 5: Descobrir em trilhos

**Files:**
- Modify: `pages/discover.vue`, `composables/useDiscoverScreen.ts` (+ sub-composable `useDiscoverRails.ts` se passar de 150 linhas)
- Create: `components/discover/{FeaturedCarousel,GroupChips,Rail}.vue`, `utils/discoverRails.ts` (mapeador puro)
- Modify: `pt-BR.json` (`discover.featuredBadge` "Destaque", `discover.rails.surpriseDay` "Dia surpresa", `discover.rails.surpriseDayLead` "Visita vale o dobro só hoje", `discover.rails.welcome` "Cartão já começa andado", `discover.rails.welcomeLead` "Boas-vindas ao entrar no clube", `discover.groups.*`, `discover.groupEmpty`)
- Test: `apps/web/layers/customer/test/discoverRails.test.ts`, `discoverScreen.nuxt.test.ts`

**Interfaces:**
- Consumes: Task 3 `listFeatured`, `listShops`, `listChallenges`; `shopGroupOf`.
- Produces:
  - `buildDiscoverRails(shops: readonly ShopSummary[], group: ShopGroup | null): { surpriseDay: ShopSummary[]; welcome: ShopSummary[]; others: ShopSummary[] }`. Uma loja aparece em um trilho só, nesta ordem de prioridade: dia surpresa, depois boas-vindas, depois o resto.
  - Tela com a chave ligada, de cima para baixo:
    - `ScreenHeader` (cidade).
    - `FeaturedCarousel`, que sobe sobre a faixa (`-mt-10`), com rolagem horizontal snap e o selo "Destaque" só em `sponsored`. Some quando a lista vem vazia.
    - Chips: "Tudo" e os 5 ramos, `aria-pressed`, 44px de altura.
    - Trilhos "Dia surpresa" e "Cartão já começa andado", cada um escondido quando vazio.
    - Desafios (`DiscoverChallengeList`).
    - Lojas restantes (`DiscoverFreshShops` / `DiscoverKnownShops`).
  - A busca atual continua e desliga chips e trilhos enquanto há texto.
  - Com a chave desligada, a tela é exatamente a de hoje.

- [ ] **Step 1: Testes que falham:**
  - `buildDiscoverRails`:
    - Loja com dia surpresa e boas-vindas entra só em "Dia surpresa".
    - `group='pet'` sem pet → todos vazios.
  - Tela:
    - Featured vazio → sem carrossel.
    - Ramo vazio → mostra `discover.groupEmpty`.
    - Erro no featured não derruba o resto da tela: o carrossel some e o resto renderiza.
- [ ] **Step 2–4:** FAIL → implementar → `pnpm test` + `pnpm typecheck` PASS. Conferir no navegador (`pnpm dev` + `pnpm dev:api`, chave ligada), screenshot em 390px.
- [ ] **Step 5: Commit** `feat(web): discover rails with featured carousel (flagged)`.

### Task 6: Aba Hits

**Files:**
- Create: `pages/hits.vue` (`path: '/hits'`, `layout: 'customer'`, `middleware: 'customer-auth'`, 404 sem a chave), `composables/useHitsScreen.ts`
- Create: `components/hits/{BannerCarousel,ItemCard,ItemGrid,Empty}.vue`, `utils/hitItemView.ts` (preço via `formatCurrency`, frase do "rende")
- Modify: `pt-BR.json` (`hits.title` "Hits da Lagoa", `hits.lead` "O que tá saindo na cidade", `hits.sponsored` "Patrocinado", `hits.earn.stamp` "rende {n} carimbo | rende {n} carimbos", `hits.earn.point` "rende {n} pts", `hits.earn.doubled` "em dobro hoje", `hits.priceOnRequest` "Sob consulta", `hits.loadMore` "Ver mais", `hits.empty`, `hits.groupEmpty`)
- Test: `apps/web/layers/customer/test/hitItemView.test.ts`, `hitsScreen.nuxt.test.ts`

**Interfaces:**
- Consumes: Task 3 `HitsService`, Task 4 `useHitsEnabled`, Task 5 `GroupChips`.
- Produces:
  - Tela, de cima para baixo:
    - `ScreenHeader`.
    - Banners com rolagem snap, com o selo "Patrocinado" só em `sponsored`. Somem quando vazios.
    - Chips de ramo (reusa `DiscoverGroupChips`).
    - Grade de 2 colunas com `ItemCard`: foto `object-cover`, título, loja, preço ou "Sob consulta", selo do "rende" em `sol` só quando `earning !== null`, e o botão (`shopContactHref`, `target="_blank" rel="noopener noreferrer"`) só quando há `contact`.
    - "Ver mais" usa o cursor e acrescenta à lista.
  - Primeira página via `useAsyncQuery` (SSR). Trocar de ramo zera a lista; resposta atrasada de um ramo antigo é ignorada.

- [ ] **Step 1: Testes que falham:**
  - `hitItemView`:
    - `priceCents: null` → "Sob consulta".
    - `earning: null` → sem selo.
    - `{ unit: 'stamp', units: 1, doubled: true }` → "rende 1 carimbo" + "em dobro hoje".
  - Tela:
    - Lista vazia → `hits.empty`.
    - Ramo vazio → `hits.groupEmpty`.
    - "Ver mais" pede com o cursor e acrescenta.
    - **Troca rápida de ramo** (resposta do ramo antigo chega depois) não mistura os itens.
    - Item sem `contact` → sem botão.
- [ ] **Step 2–4:** FAIL → implementar → `pnpm test` + `pnpm typecheck` PASS. Navegador com a chave ligada e um item aprovado no banco local (aprovar via `admin/hits` com o `admin:dev` da Fase A, ou `UPDATE` no `lagoa_dev`). Screenshot em 390px, claro e escuro.
- [ ] **Step 5: Commit** `feat(web): customer hits tab (flagged)`.

### Task 7: Documentação e chave

**Files:**
- Modify: `CLAUDE.md` ("Estado do projeto": um parágrafo curto sobre a barra nova, a chave `NUXT_PUBLIC_HITS_ENABLED`, `/hits` e Prêmios dentro da Carteira), `design-system/lagoa/pages/customer.md` (barra e telas novas)

- [ ] **Step 1:** Atualizar os dois textos (português).
- [ ] **Step 2:** `pnpm test`, `pnpm typecheck`, `pnpm typecheck:api`, `pnpm test:api:db` uma vez. Tudo verde.
- [ ] **Step 3: Commit** `docs: customer hits and new tab bar`.
