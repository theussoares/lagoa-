# API do painel do lojista: plano em 6 fases

Spec: [spec.md](./spec.md). Desenho: [solution-design.md](./solution-design.md). Mesmas regras de fase do
[plano do cliente](../api-customer/plan.md#regras-de-cada-fase): branch por fase a partir da `develop`,
typecheck + testes + build, `EXPLAIN` de toda query nova, revisão do `code-reviewer` (obrigatória e aprofundada:
toca sessão, Balcão, resgate e dado pessoal), PR, merge, próxima fase.

**Mínimo para o piloto:** M1 + M2 + M3. M4 deixa o painel completo; M5 traz campanhas (lojista + aviso na
Carteira); M6 apaga o mock. Ajustes do CTO: seção R do [desenho](./solution-design.md).

Cada fase entrega **API + BFF + `Http*Service` do front** da mesma tela, para ser testável de ponta a ponta no
fim da fase. O mock continua funcionando até a M6 (`backend = mock`).

## M1: Fundação, sessão e Criar o clube

Telas: Entrar (lojista), Criar o clube, Configurações (status), cartaz, aviso do cartaz.

| # | Subtarefa | Agente | Depende |
|---|---|---|---|
| 1.0 | Seed com um dono por loja (hoje todas as lojas do seed têm o mesmo dono e o índice único da 0017 falharia) (R1) | `dev-tipos` | — |
| 1.1 | Migration `0017_merchant_panel` completa (seção 3.1 do desenho: checagem de dono duplicado, `shops.plan`, termo do lojista, `erased_at`, `visits_count`/`first_visit_at`, índices) + schema Drizzle + RLS | `dev-tipos` | 1.0 |
| 1.1b | `LedgerStore.credit` mantém `visits_count`/`first_visit_at` + backfill idempotente pelo ledger, rodado depois do deploy + teste de paridade (R3; saiu da M4) | `dev-tipos` | 1.1 |
| 1.2 | `accounts/app-user.writer.ts` extraído do cadastro do cliente (sem mudança de comportamento; colisão de celular → `phoneAlreadyUsed`) | `dev-tipos` | — |
| 1.2b | Conta: `erase` grava `erased_at`; `DELETE /customer/account` do dono → `409 accountOwnsShop` + texto (R8, R9) | `dev-tipos` | 1.1 |
| 1.3 | `merchant/access` (guard por controller, resolver com `MerchantShopContext`, `@CurrentShop` que falha fechado, teste que varre os controllers, `shop-access.rules.ts`) + testes http de 401/404 | `dev-tipos` | 1.1 |
| 1.4 | `merchant/session`, `merchant/club-setup` (idempotente, retry de `checkInCode` refazendo a transação, `poster_reprinted_at` no insert), `merchant/shop` (status, cartaz, aviso) | `dev-tipos` | 1.2, 1.3 |
| 1.5 | Script `shop:status` (status e plano) + `shop_status_events`, `actor` = apelido | `dev-tipos` | 1.1 |
| 1.6 | `shared`: remover ticket do `ClubSetupService`, constantes e erros novos, `startOfLocalDay`, `CounterEntry.maskedPhone` nulo | `dev-tipos` | — |
| 1.7 | BFF `server/api/merchant/{session,shops,shop/**}` + testes | `dev-nuxt` | 1.4 |
| 1.8 | Front: `Http{ClubSetup,ShopStatus,ShopPoster,PosterReprint}Service`, login do lojista pelo `/api/auth`, `merchant-auth`/`merchant-club-setup` sem ticket | `dev-nuxt` + `dev-stores` | 1.6, 1.7 |
| 1.9 | Integração: CA-02, CA-05, CA-06, CA-07, RLS, `accountOwnsShop`, celular em uso, paridade `visits_count` | `qa` | 1.4 |

Pronto quando: um celular novo entra, cria o clube, vê "aguardando aprovação"; o script aprova; o status muda.

## M2: Balcão (QR da visita e resgate)

Tela: Balcão. Sem esta fase ninguém ganha carimbo.

| # | Subtarefa | Agente | Depende |
|---|---|---|---|
| 2.1 | `merchant/visit-qrs` (issue: `FOR SHARE` em loja + versão ativa, advisory lock de transação, faxina dos vencidos, limite 20 com `now` do `Clock`; get com recibo e "cliente removido"; cancel idempotente) + `visit-qrs.logging.test.ts` + teste de corrida emitir × trocar programa (R2) | `dev-tipos` | M1 |
| 2.1b | `decideVisitQrUse` recusa uso pelo emissor/dono (`invalidVisitQr`), API do cliente e mock (R12) | `dev-tipos` | — |
| 2.2 | `RedemptionLookup.findByCode` (ativo primeiro; senão o mais novo em 24 h; outra loja = inválido) + índice `(shop_id, code, created_at desc)` (R11) | `dev-tipos` | — |
| 2.3 | `merchant/counter` (validate com `@FailClosedThrottle` por usuário; confirm via `settleRedemption` confirmando a transação nas recusas que marcam `expired`; today com `first_visit_at`) | `dev-tipos` | 2.2 |
| 2.4 | BFF `visit-qrs/**`, `counter/**` | `dev-nuxt` | 2.1, 2.3 |
| 2.5 | Front: `HttpVisitQrService`, `HttpCounterService`; contrato `visitQrService.contract.ts` rodando contra http; erro `visitQrLimitReached` com texto | `dev-nuxt` | 2.4 |
| 2.6 | Integração: CA-08 a CA-13, corrida de duas confirmações, QR emitido pela API e usado pela API do cliente | `qa` | 2.3 |
| 2.7 | e2e Playwright: lojista emite QR → cliente usa → Balcão mostra `claimed`; resgate de ponta a ponta | `qa` | 2.5 |

## M3: Programa e prêmios

| # | Subtarefa | Agente | Depende |
|---|---|---|---|
| 3.1 | `shared/domain/program.ts` `isSameProgram` + `toProgramRow` (inverso do mapper) | `dev-tipos` | — |
| 3.2 | `merchant/program` (get, put com versão + cancelamento dos QRs vivos e `expired` nos vencidos na mesma transação, active-cards) | `dev-tipos` | 3.1, M2 |
| 3.3 | Tirar `programModeLocked` (shared, `domainError.ts`, `pt-BR.json`, `useProgramEditor`, mock) (P-M1 decidida) | `dev-nuxt` | — |
| 3.4 | BFF + `HttpProgramService` | `dev-nuxt` | 3.2 |
| 3.5 | Integração: CA-14, CA-15, cartão antigo segue na versão antiga, QR antigo responde `visitQrStale` ao cliente | `qa` | 3.2 |
| 3.6 | Termo do lojista: `MERCHANT_TERMS_VERSION`, aceite no Criar o clube + rota de aceite, gate `merchantTermsNotAccepted` em QR/resgate/campanha (R14; texto do jurídico) | `dev-tipos` + `dev-nuxt` | M1 |

**Marco do piloto:** M1–M3 em `develop`, testes de integração rodando contra Postgres (pendência 1 do
[handoff do QR](../dynamic-visit-qr/HANDOFF.md)), texto do termo do lojista (P-M7) entregue pelo jurídico e
`MERCHANT_TERMS_VERSION` apontando para ele.

## M4: Início e Clientes

| # | Subtarefa | Agente | Depende |
|---|---|---|---|
| 4.1 | (movida para a M1 como 1.1b, R3) | — | — |
| 4.2 | `merchant/home` (faixa por `startOfLocalDay`, fuso como parâmetro, `toWeekSummary` puro, paridade com `summarizeWeek` incluindo virada da meia-noite local) | `dev-tipos` | M1 |
| 4.3 | `merchant/customers` (keyset com nulos nos dois casos, cursor com microssegundos, filtros, vencimento na leitura, sem contas apagadas, `cardId` no lugar de `customerId`, celular mascarado em lote) + `MerchantCustomerPageSchema` | `dev-tipos` | M1 |
| 4.4 | BFF + `HttpMerchantHomeService`, `HttpMerchantCustomersService`; "carregar mais" em Clientes; mock adaptado ao novo contrato paginado | `dev-nuxt` | 4.2, 4.3 |
| 4.5 | CA-16, CA-17, CA-18 (`EXPLAIN` em volume, transação desfeita) | `qa` | 4.3 |

## M5: Campanhas (P-M4 e P-M5 decididos)

Migration `0018_campaigns` (com `campaign_recipients.seen_at`), `ledger_kind += campaignBonus`, `merchant/campaigns`,
trava por plano (`founderPro`). **Inclui o lado do cliente** (R6): `GET /v1/customer/notices`,
`POST /v1/customer/notices/:id/seen`, BFF e faixa na Carteira; `DELETE /customer/account` apaga os destinatários da
pessoa. As duas pontas saem no mesmo PR: campanha sem leitura não chega a ninguém. Detalhe em solution-design 2.7.

## M6: Corte do mock

- Remover `MockMerchantServices`, handlers do lojista em `layers/core/app/mock`, `mockBackend.client.ts` (se o
  cliente também já não usa), `SignUpTicket`, `MerchantSignInResult`, `seed.example.ts` do lojista,
  `shopApprovalTesting`/`visitQrTesting`.
- Seed da API cria um lojista de dev com loja aprovada (substitui o código `246810`).
- Atualizar `CLAUDE.md` ("Lojista (transitório)" sai), `apps/api/README.md` (rotas do lojista),
  `docs/database-model.md` (colunas e tabelas novas).

## Estimativa

| Fase | Tamanho | Paralelismo |
|---|---|---|
| M1 | M+ | API (1.0–1.5) em paralelo com shared/front (1.6) |
| M2 | M | 2.1, 2.1b e 2.2–2.3 em paralelo |
| M3 | P+ | 3.6 em paralelo com 3.2 |
| M4 | M | 4.2 e 4.3 em paralelo |
| M5 | M+ | API do lojista e do cliente em paralelo |
| M6 | P | — |
