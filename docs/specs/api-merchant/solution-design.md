# API do painel do lojista: solution design

Estado: **aprovado com ajustes pelo CTO (2026-10-09)**; ajustes aplicados no corpo e no [plano](./plan.md),
resumidos na seção R. Spec: [spec.md](./spec.md).

## R. Ajustes do CTO

**Veredito: aprovado com ajustes.** Nada bloqueia o início da M1; os ajustes que mexem na M1 (R1, R3, R8, R9, R10)
entram nela. Revisado contra o código: `ledger.store.ts`, `redemption-lookup.ts`, `customer/check-in/*`,
`customer/registration/*`, `customer/account/drizzle-account.repository.ts`, `auth/{supabase-auth,user-throttler}.guard.ts`,
`app.module.ts`, `database/schema/*`, `database/seed.ts`, `test-support/test-database.ts`, `shared/{schemas,domain}`,
services e mock do lojista.

1. **Ponto 1, loja do dono: `owner_user_id` único agora, sem `shop_members`.** O resolver devolve um
   `MerchantShopContext { shopId, status, plan, role: 'owner' }` e os services só conhecem esse contexto: a troca futura
   por `shop_members` mexe no resolver e no índice, não nos services. Nest não tem guard por módulo: `@MerchantSurface()`
   é um `applyDecorators(UseGuards(MerchantShopGuard), SetMetadata(...))` **em cada controller**; `@CurrentShop()` lança
   se o guard não rodou (falha fechado) e um teste percorre os controllers do `MerchantModule` exigindo a metadata.
   **Achado:** `database/seed.ts` cria todas as lojas com o mesmo `SEED_OWNER_ID`; o índice único da 0017 falha em
   qualquer banco semeado. A 0017 começa com uma checagem que aborta com mensagem clara se houver dono com duas lojas, e o
   seed passa a criar um dono por loja (M1, não M6). Seções 2.1, 3.1.
2. **Ponto 2, limite de QRs ativos com `pg_advisory_xact_lock`: aprovado, com forma fixa.** Chave de dois inteiros
   (`pg_advisory_xact_lock(<constante da emissão>, hashtext(shop_id::text))`), só a variante de transação (o pooler do
   Supabase em modo transação não suporta lock de sessão). Na mesma transação, nesta ordem: (a) lê loja e versão ativa
   com `FOR SHARE OF shops, programs` — fecha a corrida com o `PUT /program` (que trava a mesma linha com `FOR UPDATE`);
   sem isso um QR pode nascer com a versão antiga depois do cancelamento e o cliente leva `visitQrStale`; (b) advisory
   lock; (c) faxina da loja: `status = 'expired'` nos ativos já vencidos (mantém o índice parcial pequeno e o `count`
   exato); (d) `count` dos ativos com o `now` do `Clock` como parâmetro, nunca `now()` do banco; (e) insert; colisão de
   `visit_code` com linha de outra loja ainda viva → sorteia outro (a faxina não alcança outra loja: se a linha que segura
   o código já venceu, grava `expired` nela e tenta de novo, como no 7.6 do desenho do QR). Seção 2.3.
3. **Ponto 3, `visits_count`/`first_visit_at`: aprovado, mas tudo no mesmo deploy (M1), não na M4.** Coluna criada na
   M1 e mantida só na M4 deixa M2–M3 gravando visitas sem atualizar: Hoje (`isNewCustomer`) e Clientes nasceriam errados.
   `LedgerStore.credit` incrementa sob o lock do cartão (toda chamada de `credit` é visita) e grava
   `first_visit_at = coalesce(first_visit_at, <instante gravado>)`. Backfill é SQL idempotente que **recalcula do ledger**
   (`count(*) filter (where counts_as_visit)`, `min(occurred_at) filter (...)`), rodado depois do código novo estar no ar
   (cobre visitas entre a migration e o deploy). `visitsCount` é vitalício (não zera no resgate nem no vencimento), como no
   mock. `isNewCustomer` do Hoje = `counts_as_visit and occurred_at = card.first_visit_at` (sem sub-select). Seções 2.4,
   2.6, 3.1.
4. **Ponto 4, keyset de Clientes com `rewardReady` depois do vencimento: aprovado.** Contrato explícito: a página pode vir
   com menos de 50 **ou vazia** com `nextCursor` não nulo; o front mostra "carregar mais" enquanto houver cursor. Ajustes:
   (a) predicado de keyset com nulos escrito nos dois casos (cursor com data: `last_visit_at < c or (last_visit_at = c and
   id < cid) or last_visit_at is null`; cursor sem data: `last_visit_at is null and id < cid`) — `(a, b) < (c, d)` não
   funciona com `null`; (b) o cursor guarda o instante com precisão de microssegundos (texto do Postgres), não um `Date`
   do JS (truncar em ms repete ou pula linhas); (c) o cursor é só posição: a loja vem sempre do guard; (d) a linha passa
   a ter `cardId` em vez de `customerId`: o id do cliente é o id do Supabase, igual em toda loja, e não deve chegar ao
   lojista (permitiria cruzar clientes entre lojas). Seção 2.6, 4.
5. **Ponto 5, fuso fixo `America/Campo_Grande`: aprovado.** `PILOT_TIME_ZONE` do `shared` vai como **parâmetro** da
   consulta (nunca literal no SQL). Limites `[início, fim)` calculados no Node por `startOfLocalDay` e usados como faixa no
   índice; o agrupamento por dia usa `(occurred_at at time zone $tz)::date`. MS não tem horário de verão desde 2019; o
   teste de paridade fixa um instante a minutos da meia-noite local. `shops.time_zone` só quando houver loja em outro
   fuso. Seções 2.4, 2.6.
6. **Ponto 6, leitura do aviso (P-M4): vai para a M5, e a M5 passa a incluir o lado do cliente.** Campanha sem leitura
   não chega a ninguém, então as duas pontas saem juntas. Mínimo: `campaign_recipients.seen_at`;
   `GET /v1/customer/notices?limit` (últimos 30 dias, filtra por `customer_id = user.id`, só com consentimento **atual**:
   revogou, some) e `POST /v1/customer/notices/:id/seen`; faixa na Carteira. A mensagem é texto livre do lojista: só
   texto (nada de `v-html`), limite do `ReminderDraftSchema`, sem link. `DELETE /customer/account` apaga os
   `campaign_recipients` da pessoa. O presente segue como `campaignBonus` na caderneta. P-M4 e P-M5 decididos: M5
   desbloqueada. Seção 2.7.
7. **Limite "por loja" do `validate` não funciona como escrito.** O `UserThrottlerGuard` é global e roda antes do guard
   do lojista: `request.merchantShop` ainda não existe e não há throttler nomeado `shop`. Com RN-02 (um dono, uma loja),
   por usuário já é por loja: fica `@FailClosedThrottle()` por usuário (+ teto por IP). Com equipe, o contador por loja
   vai no service via `ThrottlerStorage`. Seções 2.3, 2.4, 7.
8. **Conta apagada no painel.** `erase` troca o celular por buffer vazio e **não** apaga cartões nem ledger: decifrar
   esse celular no Hoje, no recibo do QR ou em Clientes dá 500. 0017 cria `app_users.erased_at` (backfill
   `octet_length(phone_encrypted) = 0`; `erase` passa a gravar). Clientes e alcance de campanha excluem contas apagadas;
   Hoje e recibo do QR mostram "cliente removido": `CounterEntrySchema.maskedPhone` vira `nullable` (pendência 7.6 item 3
   do desenho do QR). A prévia de resgate não precisa: `erase` já expira os códigos ativos. Seções 2.3, 2.4, 2.6, 3.1, 4.
9. **Dono não apaga a conta pelo app do cliente.** Hoje `erase` apaga `auth.users`: a loja ficaria sem login e o dono
   com celular vazio. `DELETE /customer/account` de quem é `shops.owner_user_id` responde 409 `accountOwnsShop` (erro
   novo + texto "fale com a rede"); encerrar loja é processo da rede (script). M1. Seção 2.2, 4.
10. **Criar o clube.** (a) `app_users` com o mesmo celular e outro id (cliente que entrou por e-mail e declarou o número)
    → 409 `phoneAlreadyUsed`, não 500 (mesmo mapa de constraint do cadastro do cliente); (b) colisão de `check_in_code`
    aborta a transação no Postgres: o retry refaz a transação inteira (ou usa savepoint), não só o insert; (c) segunda
    chamada com draft diferente devolve a loja existente sem aplicar o draft (documentado no service); (d)
    `poster_reprinted_at = now()` no insert da loja nova; as lojas que já existem ficam `null` (não há loja real ainda; sem
    heurística "criada depois da 0014"). Seções 2.2, 3.1.
11. **Resgate.** (a) `findByCode` prefere o código ativo; sem ativo, a linha mais nova da loja com aquele código criada
    há no máximo `REDEMPTION_LOOKUP_WINDOW_HOURS` (24) define `redemptionAlreadyUsed`/`redemptionExpired`; senão
    `redemptionInvalid` (código reaproveitado meses depois não vira "já usado"). Índice novo
    `redemptions (shop_id, code, created_at desc)` (hoje só existe o parcial dos ativos), consulta com `desc nulls last`.
    (b) `confirm`: `rewardNotReady` e `redemptionExpired` **confirmam** a transação (o `settleRedemption` grava
    `expired`); o repository devolve o `Result`, não lança. (c) O erro do `confirmRedemption` no front ganha
    `rewardNotReady` (com texto). Seção 2.4.
12. **Lojista ganhando no próprio QR: não fica como risco aceito.** Regra barata: uso do QR por quem é o emissor ou o
    dono da loja → `invalidVisitQr` (mesmo 404, não vaza motivo). Regra pura em `shared/domain/visitQr.ts`
    (`decideVisitQrUse` recebe o dono), mock igual. M2. Seção 7.
13. **Programa.** (a) O `PUT` cancela como `programChanged` só os ativos vivos (`expires_at > $now`) e grava `expired` nos
    vencidos; (b) `active-cards` usa o saldo cru: é estimativa para o aviso, documentar; (c) `shops.plan` entra na 0017
    sem condicional (P-M5 decidida). Seções 2.5, 3.1.
14. **Termo do lojista (P-M7): mecanismo pronto antes do marco do piloto (M3), texto do jurídico.**
    `MERCHANT_TERMS_VERSION`, `shops.merchant_terms_version`/`merchant_terms_accepted_at`, aceite no Criar o clube e rota
    de aceite; emitir QR, resgate e campanha respondem `merchantTermsNotAccepted` enquanto a versão não bater (mesmo
    padrão do `@RequiresTerms` do cliente). Assim o piloto espera só o texto, não código. Seção 2.1.
15. **Script `shop:status`.** `actor` é um identificador do operador (apelido), não e-mail; transação com `FOR UPDATE` na
    loja; grava `from`/`to`/`plan`. Suspender não precisa cancelar QRs: o uso já recusa loja não aprovada. Seção 7.

Lido antes: `CLAUDE.md`, `apps/api/README.md`, `apps/api/src/{ledger,customer/check-in,customer/registration,
customer/session,database/schema}`, `docs/database-model.md`, `docs/specs/api-customer/plan.md`,
`docs/specs/dynamic-visit-qr/{solution-design,HANDOFF}.md` (seção 7.6), mock do lojista
(`layers/core/app/mock/handlers/{merchant,onboarding,auth,counter,campaigns,visitQr,shopAccess}.ts`) e as
interfaces de `layers/merchant/app/services`.

## 1. Princípios

1. **Reaproveitar, não reescrever.** Saldo, resgate e vencimento passam por `LedgerStore`, `RedemptionLookup`,
   `planExpiration`, `planEarning`, `planVisitQrIssue`, `summarizeWeek`, `reminderEligibility`. Regra que o mock
   tem e o `shared/` ainda não tem **sobe para `shared/domain`** antes de virar código da API (mock e API usam a
   mesma).
2. **A loja vem do JWT.** Um `MerchantShopResolver` resolve a loja do dono por `owner_user_id = user.id`;
   nenhum controller recebe `shopId`.
3. **Mesmo padrão do cliente:** controller → service (`Result`) → `*.rules.ts` → repository abstrato +
   `Drizzle*Repository`. Erro HTTP = `DomainError`.
4. **BFF explícito:** uma rota em `apps/web/server/api/merchant/**` por rota da API, entrada validada pelo schema
   do `shared`, `callApi` com o cookie. Sem proxy genérico.
5. **Front:** só troca de implementação (`HttpMerchantServices`), escolhida no plugin; mock e http passam no
   mesmo teste de contrato.

## 2. Mapa de módulos da API

```
apps/api/src/merchant/
  merchant.module.ts            importa os módulos abaixo
  access/                       compartilhado da superfície
    merchant-shop.resolver.ts   resolve { shopId, status, programId } do dono (1 query, índice único)
    shop-access.rules.ts        requireOperational(status) -> Result<void, ShopClosedError>  (puro)
    current-shop.decorator.ts   @CurrentShop() injeta o que o guard resolveu
    merchant-shop.guard.ts      guard da superfície: 404 notFound{shop} sem loja (exceto session/club-setup)
  session/                      GET  /v1/merchant/session
  club-setup/                   POST /v1/merchant/shops
  shop/                         GET  /v1/merchant/shop/status, /shop/poster
                                GET  /v1/merchant/shop/poster-reprint, POST /shop/poster-reprint/printed
  visit-qrs/                    POST /v1/merchant/visit-qrs, GET /:id, POST /:id/cancel
  counter/                      POST /v1/merchant/counter/redemptions/validate
                                POST /v1/merchant/counter/redemptions/:id/confirm
                                GET  /v1/merchant/counter/entries/today
  program/                      GET/PUT /v1/merchant/program, GET /program/active-cards
  home/                         GET  /v1/merchant/home/week-summary
  customers/                    GET  /v1/merchant/customers?filter&cursor
  campaigns/                    GET  /v1/merchant/campaigns, POST /campaigns/reminders   (fase M5)
apps/api/src/accounts/
  app-user.writer.ts            ensureAppUser(tx, jwtUser) — extraído do cadastro do cliente (RN-07)
apps/api/scripts/
  shop-status.ts                aprova/suspende/plano (RN-03, P-M5), exige ALLOW_SHOP_ADMIN=1
```

Cada pasta de feature: `*.controller.ts`, `*.service.ts`, `*.rules.ts` (quando há decisão), `*.repository.ts`
(abstrato), `drizzle-*.repository.ts`, testes `*.rules.test.ts`, `*.service.test.ts`, `*.http.test.ts`,
`*.integration.test.ts`.

### 2.1 Acesso

- `MerchantShopGuard` roda depois dos guards globais (`SupabaseAuthGuard`, `UserThrottlerGuard`), só nos controllers do
  lojista: `@MerchantSurface()` (`applyDecorators(UseGuards(...), SetMetadata(...))`) em **cada controller** (R1). Faz
  `select id, status, plan, merchant_terms_version from shops where owner_user_id = $1` (índice único, ver 3.1) e põe
  `MerchantShopContext { shopId, status, plan, role: 'owner', termsVersion }` em `request.merchantShop`. Sem loja →
  `404 notFound { entity: 'shop' }`. `@CurrentShop()` lança se o contexto não existir; teste varre os controllers do
  `MerchantModule` exigindo a metadata.
- Termo do lojista (R14, a partir da M3): emitir QR, validar/confirmar resgate e campanha exigem
  `termsVersion = MERCHANT_TERMS_VERSION`, senão `403 merchantTermsNotAccepted`.
- `session` e `club-setup` usam `@MerchantSurface({ shopRequired: false })`.
- Rotas que mexem com cliente chamam `requireOperational(shop.status)` **no service**, não no guard (a regra
  fica testável e a mensagem é a do domínio). Dentro da transação de escrita o status é relido com
  `FOR SHARE` na linha de `shops` (suspensão no meio da requisição não passa).
- `recordedBy`/`issuedBy` = `user.id`.

### 2.2 Sessão e Criar o clube

- `GET /merchant/session` → `MerchantSession` (`merchantId = user.id`, `shopId`, `shopName`, `shopStatus`) ou
  `404 notFound{shop}`.
- `POST /merchant/shops` (`ClubSetupDraftSchema`) → 201 `MerchantSession`. Transação:
  `ensureAppUser` (celular do JWT; sem celular no JWT → `unauthorized`; celular já em outro `app_users` →
  `409 phoneAlreadyUsed`, R10), `insert shops ... on conflict (owner_user_id) do nothing returning` com
  `poster_reprinted_at = now()`, se não inseriu lê a existente e devolve 200 sem aplicar o draft (RN-08, CA-06);
  `checkInCode` por `randomReadableCode`: `unique_violation` em `check_in_code` aborta a transação, então o retry
  **refaz a transação inteira** (ou usa savepoint); insere `programs` ativa via `program-rules.mapper` (sentido inverso:
  `toProgramRow`, novo, ao lado do `toProgramRules`).
- `ensureAppUser` sai de `drizzle-registration.repository.ts` para `accounts/app-user.writer.ts`; o cadastro
  do cliente passa a chamá-lo (refator sem mudança de comportamento, coberto pelos testes de integração atuais).
- Limite: 5 criações/hora por usuário (`@Throttle`), falha aberto.
- Conta do dono (R9): `DELETE /customer/account` de quem é `shops.owner_user_id` → `409 accountOwnsShop`, nada apagado.

### 2.3 QR da visita

Contrato já fixado na seção 4.1/7.6 do [desenho do QR](../dynamic-visit-qr/solution-design.md).

- `issue` (R2), tudo numa transação, nesta ordem de locks:
  1. `select ... from shops join programs (ativa) where shops.id = $1 for share of shops, programs` →
     `requireOperational(status)` → `planVisitQrIssue(rules, amountCents)`. O `FOR SHARE` na versão ativa serializa
     com o `PUT /program` (que trava a mesma linha `FOR UPDATE`): o QR nunca nasce numa versão já desativada.
  2. `pg_advisory_xact_lock(<constante da emissão>, hashtext(shop_id::text))` (só variante de transação).
  3. Faxina: `update visit_qrs set status = 'expired' where shop_id = $1 and status = 'active' and expires_at <= $now`.
  4. `select count(*) ... where shop_id = $1 and status = 'active'` (índice `visit_qrs_shop_active_idx`);
     `≥ VISIT_QR_ACTIVE_MAX_PER_SHOP` → `visitQrLimitReached`. `$now` vem do `Clock`, nunca `now()` do banco.
  5. Token 256 bits (`visit-token.ts`), `visitCode` único entre ativos: colisão com linha viva de outra loja → outro
     código; colisão com linha vencida → grava `expired` nela e tenta de novo. Resposta única com o token.
- `get`/`cancel`: `where id = $1 and shop_id = $2`; ausente → `notFound{visitQr}`. Status lido com
  `visitQrStatusAt` (vencido aparece `expired` sem gravar). `cancel` faz `update ... where status = 'active'
  and expires_at > $now` e devolve o estado atual (idempotente).
- O `claim` (recibo `VisitRegistered`) é montado a partir de `ledger_entry_id` + cartão: um `LEFT JOIN` só. Conta
  apagada (`app_users.erased_at`) → `maskedPhone: null` ("cliente removido", R8).
- Limites (por usuário = por loja enquanto vale RN-02, R7): emitir 60/min (falha aberto); `get` 120/min (a tela
  consulta a cada 3 s).

### 2.4 Balcão: resgate e hoje

- `validate` (`{ code }`): `requireOperational` → `RedemptionLookup.findActive(shopId, code, now)` → prévia com
  celular mascarado (`PiiService.decrypt` + `maskPhone`, só no service, nunca em log). O lookup hoje só acha ativos:
  acrescentar `findByCode` (R11) que prefere o ativo; sem ativo, a linha mais nova da loja com o código criada há no
  máximo `REDEMPTION_LOOKUP_WINDOW_HOURS` dá `redemptionAlreadyUsed`/`redemptionExpired`; senão (e outra loja)
  `redemptionInvalid`. Índice novo `redemptions (shop_id, code, created_at desc)`, consulta com `desc nulls last`.
  `@FailClosedThrottle()`: 10/min por usuário (= por loja enquanto vale RN-02; o throttler global roda antes do guard
  do lojista e não conhece a loja, R7).
- `confirm` (`:id`): transação → `LedgerStore.settleRedemption(tx, { redemptionId, shopId, recordedBy, now })`
  → `CounterEntry` montada da linha de débito. `settleRedemption` já trava a linha e recusa a segunda entrega.
  Recusas `rewardNotReady` e `redemptionExpired` **confirmam** a transação (a marcação `expired` precisa ficar): o
  repository devolve o `Result`, não lança para desfazer. `rewardNotReady` entra no erro do front.
- `today`: `ledger_entries where shop_id = $1 and occurred_at >= $inicioDoDiaLocal and kind in (...)
  order by occurred_at desc nulls last, id desc limit 100` (índice `(shop_id, occurred_at desc)` existente).
  `isNewCustomer` = `counts_as_visit and occurred_at = loyalty_cards.first_visit_at` (join pelo `card_id`, sem
  sub-select, R3). Celulares: um `select` em lote em `app_users where id = any($1)`; conta apagada → `maskedPhone: null`.
- `inicioDoDiaLocal`: função nova `startOfLocalDay(now)` em `shared/utils/time.ts` com `PILOT_TIME_ZONE`
  (paridade com `localDateParts`, que o mock usa); o fuso vai como parâmetro, nunca literal no SQL (R5).

### 2.5 Programa

- `GET /program` → versão ativa via `toProgramRules`.
- `PUT /program` (`ProgramDraftSchema`): regra pura `program.rules.ts`
  `decideProgramChange(current, draft) -> 'unchanged' | 'newVersion'` (comparação estrutural do draft
  normalizado). Transação: `select ... from programs where shop_id = $1 and active for update`;
  `unchanged` → devolve; senão `update programs set active = false`, `insert` nova ativa,
  `update visit_qrs set status = 'cancelled', cancel_reason = 'programChanged' where shop_id = $1 and status =
  'active' and expires_at > $now` e `status = 'expired'` nos ativos vencidos (R13). Índice parcial único
  `programs_one_active_per_shop_uq` garante uma ativa. Ordem de locks: `programs` → `visit_qrs` (a emissão pega
  `programs` em `FOR SHARE` antes do advisory lock: sem ciclo).
- `programModeLocked` sai do service, do `domainError.ts` e do `pt-BR.json` (se P-M1 confirmar);
  `GET /program/active-cards` → `count(*) from loyalty_cards where program_id = <ativa> and balance > 0`
  (índice novo, 3.1). Saldo cru, sem vencimento: é estimativa para o aviso (R13). O mock passa a fazer versão também?
  **Não**: o mock só perde a trava; ele sai na fase M6.

### 2.6 Início e Clientes

- **Semana:** uma consulta agregada por dia local, `occurred_at >= $inicio and occurred_at < $fim` (limites do
  `startOfLocalDay`, R5) e grupo por `(occurred_at at time zone $tz)::date` com `$tz = PILOT_TIME_ZONE`:
  `count(*) filter (where counts_as_visit)`, `count(distinct customer_id) filter (...)`, resgates; "novos" =
  cartões da loja com `first_visit_at` na janela, agrupados pelo mesmo dia local (coluna mantida pelo `LedgerStore`,
  R3). Montagem final em `toWeekSummary(rows, now)` puro, com teste de paridade contra `summarizeWeek` (CA-16),
  incluindo um instante a minutos da meia-noite local.
- **Clientes:** keyset por `(last_visit_at desc nulls last, card_id desc)`, `limit 50`, só cartões de contas não
  apagadas (`app_users.erased_at is null`, R8). Predicado do keyset escrito nos dois casos (R4): cursor com data →
  `last_visit_at < c or (last_visit_at = c and id < cid) or last_visit_at is null`; cursor sem data →
  `last_visit_at is null and id < cid`. Filtros como `where`: `lapsed` = `last_visit_at < $now - 30 days` (nulo não é
  sumido, RN-21); `rewardReady` = `balance >= target` **depois** do vencimento: o filtro em SQL usa
  `balance >= target` como pré-filtro e o service aplica `planExpiration` e descarta (página pode vir com menos de 50,
  **ou vazia**, com `nextCursor` não nulo; o cursor aponta para a última linha lida, não a devolvida). `visitsCount` =
  coluna `loyalty_cards.visits_count` mantida pelo `LedgerStore.credit` (vitalícia). Nome do `customer_profiles`,
  consentimento do `customer_profiles.notifications_consent`, celular decifrado e mascarado em lote.
- Contrato: `MerchantCustomerPageSchema = { rows: MerchantCustomerRow[], nextCursor: string | null }` em
  `shared/schemas/customer.ts`; cursor opaco (base64url de `lastVisitAt|cardId`, instante com microssegundos como o
  Postgres devolve em texto), validado; é só posição, a loja vem do guard. `MerchantCustomerRow.customerId` sai e
  entra `cardId` (R4): o id do cliente é global e não vai ao lojista.

### 2.7 Campanhas (M5; P-M4/P-M5 decididos)

Lado do cliente (R6), na mesma fase: `campaign_recipients.seen_at timestamptz null`;
`GET /v1/customer/notices?limit` (`customer_id = user.id`, últimos 30 dias, só com `notifications_consent` atual,
`order by sent_at desc nulls last limit`) → `{ id, shopId, shopName, message, bonusUnits, unit, sentAt, seen }`;
`POST /v1/customer/notices/:id/seen` (filtra por `customer_id = user.id`); faixa na Carteira (SSR, `useAsyncQuery`).
Mensagem renderizada só como texto. `DELETE /customer/account` apaga os `campaign_recipients` da pessoa. Alcance e
envio excluem contas apagadas (`erased_at`).

- Tabelas `campaigns` (`id, shop_id, kind, unit, bonus_units, message, recipients_count, sent_at, sent_by`) e
  `campaign_recipients` (`campaign_id, customer_id, card_id`, PK composta; índice `(shop_id via campaign,
  customer_id, sent_at desc)` para o "já lembrado nos últimos 30 dias").
- `ledger_kind` ganha `campaignBonus` (migration de enum) e `LedgerStore.creditBonus` aceita o tipo, chave
  `campaign:<campaignId>:<customerId>`, `countsAsVisit = false`, mexe em `last_activity_at`.
- Alcance: uma consulta sobre `loyalty_cards` da loja + perfil + último lembrete (`LATERAL ... LIMIT 1`), regra
  em `reminderEligibility` (já no `shared`). Envio: recalcula numa transação, compara com
  `expectedRecipients`, grava campanha, destinatários e bônus (um cartão por vez com `lockOrCreateCard`, em
  ordem de `card_id` para não dar deadlock).
- `requireOperational` + (P-M5) `shop.plan = 'founderPro'` → senão `planRequired`.

## 3. Banco

### 3.1 Migration `0017_merchant_panel`

| Mudança | Motivo |
|---|---|
| Checagem inicial: aborta com mensagem se algum `owner_user_id` tiver mais de uma loja | o índice único falharia no meio (o seed antigo cria várias lojas por dono, R1) |
| `shops_owner_uq` único em `owner_user_id` (troca o índice simples) | 1 loja por dono (RN-02), idempotência do Criar o clube (RN-08) |
| `shops.poster_reprinted_at timestamptz null`; lojas existentes ficam `null`; o Criar o clube grava `now()` | aviso do cartaz (RN-23, R10) |
| `shops.plan` enum `shop_plan` (`founder`, `founderPro`) default `founder` | P-M5 (decidida, R13) |
| `shops.merchant_terms_version text null`, `shops.merchant_terms_accepted_at timestamptz null` | termo do lojista (P-M7, R14; gate a partir da M3) |
| `loyalty_cards.visits_count int not null default 0` | Clientes sem `count` por linha |
| `loyalty_cards.first_visit_at timestamptz null` | "novos" na semana, `isNewCustomer` do Hoje e "entrou, sem visita" |
| `app_users.erased_at timestamptz null` + backfill `where octet_length(phone_encrypted) = 0` | painel não decifra celular de conta apagada (R8) |
| índice `loyalty_cards (shop_id, last_visit_at desc nulls last, id desc)` | keyset de Clientes (substitui `(shop_id, last_visit_at)`) |
| índice `loyalty_cards (program_id) where balance > 0` | `active-cards` |
| índice `redemptions (shop_id, code, created_at desc)` | `findByCode` fora dos ativos (R11) |
| `shop_status_events (id, shop_id, from, to, plan, actor, reason, created_at)` + RLS | auditoria do script (RN-03) |

`LedgerStore.credit` passa a manter `visits_count` (+1) e `first_visit_at = coalesce(first_visit_at, <instante
gravado>)` na mesma transação, sob o lock do cartão, **no mesmo deploy da migration (M1)** (R3). Backfill
`visits_count`/`first_visit_at` é um SQL idempotente que recalcula do ledger (`counts_as_visit`) e roda depois de o
código novo estar no ar. `erase` passa a gravar `erased_at`. Teste de integração: backfill e incremento batem com
`count(*)`/`min(occurred_at)` do ledger.

`0018_campaigns` fica para M5.

### 3.2 RLS

Toda tabela nova com RLS ligado e sem policy (padrão da `0001`); o teste de RLS existente passa a cobrir.

## 4. `shared/`

| Arquivo | Mudança |
|---|---|
| `constants/domain.ts` | `VISIT_QR_ACTIVE_MAX_PER_SHOP = 20`, `MERCHANT_CUSTOMERS_PAGE_SIZE = 50`, `COUNTER_TODAY_LIMIT = 100`, `REDEMPTION_LOOKUP_WINDOW_HOURS = 24`, `MERCHANT_TERMS_VERSION` (M3); remover `SIGN_UP_TICKET_TTL_MINUTES` (M6) |
| `schemas/customer.ts` | `MerchantCustomerPageSchema`, `MerchantCustomerCursorSchema`; `MerchantCustomerRow.customerId` → `cardId` (R4) |
| `schemas/visit.ts` | `CounterEntrySchema.maskedPhone` `nullable` = cliente removido (R8) |
| `schemas/session.ts` | `SignUpTicket*` e `MerchantSignInResult*` saem em M6 |
| `types/errors.ts` | `visitQrLimitReached`, `accountOwnsShop` (R9), `merchantTermsNotAccepted` (R14), `planRequired` (M5); `programModeLocked` sai (P-M1) |
| `utils/time.ts` | `startOfLocalDay`, `localDayKey` |
| `domain/program.ts` (novo) | `isSameProgram(a, b)` usado pela regra de versão (API) |
| `domain/visitQr.ts` | `decideVisitQrUse` recusa o uso pelo emissor ou pelo dono da loja (`invalidVisitQr`, R12) |

## 5. BFF (`apps/web/server/api/merchant/**`)

Um handler por rota, padrão de `check-in.post.ts`: valida entrada com o schema do `shared`, `callApi(event,
{ method, path })`, `originGuard` nas escritas. Rotas: `session.get`, `shops.post`, `shop/status.get`,
`shop/poster.get`, `shop/poster-reprint.get`, `shop/poster-reprint/printed.post`, `visit-qrs/index.post`,
`visit-qrs/[id].get`, `visit-qrs/[id]/cancel.post`, `counter/redemptions/validate.post`,
`counter/redemptions/[id]/confirm.post`, `counter/entries/today.get`, `program/index.get`, `program/index.put`,
`program/active-cards.get`, `home/week-summary.get`, `customers.get`, `campaigns/index.get`,
`campaigns/reminders.post`; do cliente na M5: `notices.get`, `notices/[id]/seen.post`. `[id]` validado com `VisitQrIdSchema`/`RedemptionIdSchema` antes de montar o
caminho (sem path traversal). Teste por rota em `server/test` (método, caminho fixo, 400 na entrada ruim).

## 6. Front

- `layers/merchant/app/services/http/`: `HttpCounterService`, `HttpVisitQrService`, `HttpProgramService`,
  `HttpMerchantCustomersService`, `HttpMerchantHomeService`, `HttpClubSetupService`, `HttpShopPosterService`,
  `HttpShopStatusService`, `HttpPosterReprintService`, `HttpCampaignService` sobre o `ApiClient` do core; cada
  resposta validada com o schema do `shared`. `createHttpMerchantServices()`.
- Plugin: `MerchantServices` vem do http quando `runtimeConfig.public.backend === 'http'` (o mesmo seletor do
  cliente); `shopApprovalTesting` e `visitQrTesting` = `null`.
- Testes de contrato: os `*.contract.ts` existentes (ex.: `visitQrService.contract.ts`) rodam contra mock e
  http (http com fetcher falso). Novos contratos para counter, program e customers.
- Sessão: `merchant-auth` chama `GET /api/merchant/session` uma vez (como `useCustomerSession().restore()`);
  `notFound` → `/criar-clube`. O login do lojista usa `/api/auth/otp` + `/api/auth/verify` (já existem).
  `merchant-club-setup` deixa de exigir ticket; exige usuário logado sem loja.
- Clientes: `useCustomersScreen` ganha "carregar mais" com `nextCursor` (página vazia com cursor não é fim); a chave
  da linha passa a ser `cardId` (`customerModels.ts`).
- Erros novos com texto no `pt-BR.json`: `visitQrLimitReached`, `rewardNotReady` no confirmar resgate,
  `accountOwnsShop` (Perfil do cliente), `merchantTermsNotAccepted` (M3). Balcão mostra "cliente removido" quando
  `maskedPhone` é `null`.
- Programa: remover o ramo `programModeLocked` de `useProgramEditor`; aviso vira informativo.
- Rotas do painel continuam SPA (`ssr: false`) nesta entrega; SSR do painel fica para depois (sem ganho no
  desktop do lojista, e evita mexer no `useAsyncResult`).

## 7. Segurança

- IDOR: o guard é o único caminho até `shopId`; teste http com dois lojistas em toda rota (CA-03).
- Código de resgate: `FailClosedThrottle` por usuário (= por loja sob RN-02, R7); resposta igual para outra loja e
  inexistente.
- Token do QR: só na resposta do `issue`; nunca em log (o `check-in.logging.test.ts` ganha irmão
  `visit-qrs.logging.test.ts`).
- PII: decifrar só para mascarar, em lote, no service; nenhum DTO tem campo `phone`. Teste que varre as
  respostas por 11 dígitos (CA-17/19).
- Script de status: exige `ALLOW_SHOP_ADMIN=1`, transação com `FOR UPDATE` na loja, grava `shop_status_events` com
  `actor` (apelido do operador, argumento obrigatório; não e-mail, R15), nunca roda em CI.
- Lojista que também é cliente: as superfícies não se cruzam (rotas `customer/*` filtram por cliente, `merchant/*`
  por loja do dono). Lojista ganhando carimbo na própria loja: **recusado** (R12): uso do QR pelo emissor ou pelo
  dono → `invalidVisitQr`. Dono não apaga a conta pelo app do cliente (`accountOwnsShop`, R9).
- Conta apagada: o painel nunca decifra celular de `erased_at` não nulo; Clientes e campanhas a excluem, Balcão
  mostra "cliente removido" (R8).
- Identificador de cliente: nenhuma resposta do lojista leva `customerId` (id global do Supabase); a linha de
  Clientes usa `cardId` (R4).

## 8. Riscos e alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Tabela `shop_members` já agora | Não há equipe no MVP; `owner_user_id` resolve, e o guard isola a troca futura |
| `count(*)` do ledger por cliente na lista | N+1 ou agregação pesada por página; `visits_count` sob o lock custa uma coluna |
| Limite de QR ativo por `UNIQUE` parcial ou trigger | Não expressa "N por loja"; advisory lock por loja é curto e local |
| Painel com SSR já nesta entrega | Dobra o trabalho do front sem benefício para o lojista no desktop |

| Limite por loja num throttler nomeado `shop` | O throttler global roda antes do guard do lojista; sob RN-02 por usuário = por loja (R7) |
| Travar `shops` `FOR UPDATE` em vez do advisory lock | Conflita com o `FOR KEY SHARE` das FKs (todo insert em ledger/cartão/QR da loja esperaria) |

Riscos: backfill de `visits_count`/`first_visit_at` em produção (pequeno hoje; SQL idempotente rodado depois do
deploy, R3); `today` com fuso fixo do piloto (outra cidade em outro fuso exige `shops.time_zone`); página de Clientes
`rewardReady` pode vir vazia com cursor (contrato aceito, R4).
