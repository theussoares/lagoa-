# Merchant API Implementation Plan (Updated with Dynamic Visit QR & Architecture)

> **For Claude / Developers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the complete Merchant API surface in NestJS (`apps/api/src/merchant/*`) aligned with the **Dynamic Visit QR** specification (`docs/specs/dynamic-visit-qr/*` and `HANDOFF.md`), covering:
1. Session & Shop Context Guard (`merchant/session`).
2. Club Setup, Shop Status & Counter Poster (`merchant/club-setup`).
3. Counter Visit QRs (`merchant/visit-qrs` — replaces legacy phone visits with single-use, 5-minute dynamic QR / 5-char visit code generation, status polling, and cancellation).
4. Counter Core: Redemptions Fulfillment & Today's Activity (`merchant/counter`).
5. Program Management (`merchant/program` with mode lock & auto-invalidation of active visit QRs on new program version).
6. Customers Directory with strict LGPD PII masking & Weekly metrics summary (`merchant/customers` & `merchant/home`).
7. End-to-End Integration, Referral Settlement Verification & Module Assembly.

**Architecture:** Strictly adheres to the established NestJS API Clean Architecture / DDD patterns of the repository:
`Controller` (HTTP protocol, `ZodValidationPipe`, `unwrap(result)`) → `Service` (pure orchestration, returns `Result<T, DomainError>`, strictly no Drizzle ORM imports) → `*.rules.ts` (pure domain rules, tested in memory without DB) → `Repository` (abstract class interface for DI) → `Drizzle*Repository` (I/O, SQL, Drizzle ORM, transactions, atomic row locks). Writes use atomic transactions and shared `LedgerStore`.

**Tech Stack:** NestJS 12, Drizzle ORM, PostgreSQL (Supabase), Zod 4, Vitest, TypeScript strict.

---

## Approved Architectural & Business Decisions (Updated)

1. **Merchant Authentication & Session Discovery (`GET /v1/merchant/session`) — APPROVED:**
   - **Regra:** No MVP é estritamente **1 dono = 1 loja**. Sem suporte a múltiplas filiais ou membros/atendentes adicionais por conta.
   - **Resolução:** A API autentica via JWT do Supabase Auth e localiza a loja do usuário via `shops.ownerUserId = user.id`.
   - **Retorno:**
     - Com loja: devolve `MerchantSession` com `shopId`, `shopName` e `shopStatus`.
     - Sem loja: devolve `404 notFound` (`entity: 'merchant'`), permitindo que o frontend direcione para `/balcao/criar-clube`.

2. **Substituição de Lançamento por Celular por Dynamic Visit QR (`merchant/visit-qrs`) — APPROVED:**
   - **Regra (HANDOFF & spec.md):** *"Balcão não recebe mais celular. Princípio da privacidade e combate a fraude."* O cliente não dita celular no balcão e o lojista não digita telefone de cliente.
   - **Resolução:** 
     - Lojista gera o QR da visita na venda (`POST /v1/merchant/visit-qrs`). O QR dura 5 minutos (`VISIT_QR_TTL_MINUTES = 5`), é de uso único e possui um código curto de 5 caracteres (`visitCode`).
     - Se o programa for por valor em reais (`pointsPerCurrency`), o valor (`amountCents`) é obrigatório e fica cravado no QR.
     - A rota de consulta (`GET /v1/merchant/visit-qrs/:id`) permite ao Balcão fazer polling a cada 3 segundos para detectar quando o QR foi resgatado pelo cliente (`claimed`), vencido (`expired`) ou se houve recusa por janela antifraude (`refusal`).
     - Cancelamento (`POST /v1/merchant/visit-qrs/:id/cancel`) é idempotente.
     - **Cartaz fixo da loja (`checkInCode`):** serve **estritamente para entrar no clube** (`POST /v1/shop-join`). Não pontua nem gera visita.

3. **Invalidação de QRs Ativos ao Atualizar Programa (`merchant/program`) — APPROVED:**
   - **Regra (RN-15 / solution-design.md §7.6):** Ao criar uma nova versão de programa via `PUT /v1/merchant/program`, qualquer `VisitQr` da loja que ainda esteja com `status = 'active'` deve ser cancelado atomicamente na mesma transação com `cancel_reason = 'programChanged'`. Quando o cliente escanear um QR emitido na versão anterior, a API de check-in responde `visitQrStale`.

4. **Test Shop Approval in Non-Production (`POST /v1/merchant/shop/test-approve`) — APPROVED:**
   - **Regra:** Como o painel do Admin da rede está fora do MVP, lojas nascem com `status = 'pending'`.
   - **Resolução:** Incluir o endpoint `POST /v1/merchant/shop/test-approve` para promover a loja para `approved`, **estritamente bloqueado em ambiente de produção** (`NODE_ENV === 'production'` resulta em `403 Forbidden`). Atende aos testes automatizados e de desenvolvimento.

5. **Campaigns Feature Exclusion — APPROVED:**
   - **Regra:** O dispatcher de envio de mensagens e campanhas em lote (`Campaign` e `CampaignRecipient`) está **oficialmente excluído** da API no MVP, conforme previsto em `docs/database-model.md`.
   - **Resolução:** O backend não terá serviços de disparo de notificações. A identificação de clientes sumidos há mais de 30 dias é atendida 100% pelo filtro em `GET /v1/merchant/customers?filter=lapsed`.

---

## Phase Overview

- **Phase 1: Foundation, Session & Shop Context Guard (`merchant/session` & `merchant/common`)** [STATUS: DONE]
- **Phase 2: Club Setup, Poster & Status (`merchant/club-setup`)** [STATUS: DONE]
- **Phase 3: Counter Visit QRs (`merchant/visit-qrs`)** [STATUS: PENDING - NEW BUSINESS RULE]
- **Phase 4: Counter Redemptions & Today's Activity (`merchant/counter`)** [STATUS: REFACTOR NEEDED - REMOVE CELLPHONE VISITS]
- **Phase 5: Program Management & Dynamic Invalidation (`merchant/program`)** [STATUS: IN PROGRESS - ADD QR CANCEL ON UPDATE]
- **Phase 6: Customers Directory & Weekly Summary (`merchant/customers` & `merchant/home`)** [STATUS: PENDING]
- **Phase 7: End-to-End Integration & Module Assembly (`merchant/merchant.integration.test.ts`)** [STATUS: PENDING]

---

## Detailed Implementation Tasks

### Task 1: Merchant Session & Shop Context Guard (`merchant/session`)
> **Status:** IMPLEMENTED ✅

#### 1. Objetivo da etapa
Criar o módulo base de sessão do lojista (`merchant/session`), permitindo identificar se o usuário autenticado é proprietário de uma loja, e um decorador/guard reutilizável para injetar a loja ativa em todas as requisições autenticadas do lojista.

#### 2. Arquivos Implementados
- `apps/api/src/merchant/session/session.controller.ts`
- `apps/api/src/merchant/session/session.service.ts`
- `apps/api/src/merchant/session/session.repository.ts`
- `apps/api/src/merchant/session/drizzle-session.repository.ts`
- `apps/api/src/merchant/session/session.module.ts`
- `apps/api/src/merchant/session/session.service.test.ts`
- `apps/api/src/merchant/session/session.http.test.ts`
- `apps/api/src/merchant/common/merchant-shop.guard.ts`
- `apps/api/src/merchant/common/current-shop.decorator.ts`
- `apps/api/src/merchant/merchant.module.ts`

#### 3. Endpoints
- `GET /v1/merchant/session`: Devolve `MerchantSession` ou `404 notFound { entity: 'merchant' }`.

---

### Task 2: Club Setup & Onboarding (`merchant/club-setup`)
> **Status:** IMPLEMENTED ✅

#### 1. Objetivo da etapa
Permitir que o lojista autenticado registre sua loja e defina o primeiro programa de fidelidade, gerando o `checkInCode` único de 6 caracteres (código do cartaz de entrar no clube) e o cartaz de balcão.

#### 2. Arquivos Implementados
- `apps/api/src/merchant/club-setup/club-setup.controller.ts`
- `apps/api/src/merchant/club-setup/club-setup.service.ts`
- `apps/api/src/merchant/club-setup/club-setup.rules.ts`
- `apps/api/src/merchant/club-setup/club-setup.repository.ts`
- `apps/api/src/merchant/club-setup/drizzle-club-setup.repository.ts`
- `apps/api/src/merchant/club-setup/club-setup.module.ts`
- `apps/api/src/merchant/club-setup/club-setup.rules.test.ts`
- `apps/api/src/merchant/club-setup/club-setup.service.test.ts`
- `apps/api/src/merchant/club-setup/club-setup.http.test.ts`

#### 3. Endpoints
- `POST /v1/merchant/club-setup`: `{ shop: {...}, program: {...} }`
- `GET /v1/merchant/poster`: Devolve `ShopPoster` (código de 6 caracteres do cartaz, nome, prêmio, meta, unidade).
- `GET /v1/merchant/shop/status`: Devolve `ShopStatus`.
- `POST /v1/merchant/shop/test-approve`: Aprova a loja em ambiente dev/test (bloqueado em produção).

---

### Task 3: Counter Dynamic Visit QRs (`merchant/visit-qrs`)
> **Status:** PENDING ❌ (Nova regra obrigatória do HANDOFF / spec.md)

#### 1. Objetivo da etapa
Implementar o backend do motor de emissão de **Dynamic Visit QR** para o Balcão:
1. `issueVisitQr`: gera um QR de uso único com validade de 5 minutos (`VISIT_QR_TTL_MINUTES = 5`), código curto legível de 5 caracteres (`visitCode`), atrelando a transação à versão ativa do programa e operador autenticado. Se o programa for por valor em reais, valida `amountCents`. Retorna `IssuedVisitQr` (contendo o token em claro, retornado apenas nesta resposta).
2. `getVisitQr`: consulta o status do QR (`active`, `claimed`, `expired`, `cancelled`), retornando os dados do claim (com `maskedPhone`) ou recusa antifraude para atualização do painel do lojista via polling a cada 3s.
3. `cancelVisitQr`: cancelamento manual idempotente feito pelo lojista (`cancelReason: 'merchant'`).

#### 2. Arquivos que serão criados ou alterados
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.controller.ts`
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.service.ts`
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.rules.ts`
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.repository.ts`
- Create: `apps/api/src/merchant/visit-qrs/drizzle-visit-qrs.repository.ts`
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.module.ts`
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.rules.test.ts`
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.service.test.ts`
- Create: `apps/api/src/merchant/visit-qrs/visit-qrs.http.test.ts`
- Modify: `apps/api/src/merchant/merchant.module.ts`

#### 3. O que será implementado
- `visit-qrs.rules.ts`:
  - Utiliza `planVisitQrIssue(programRules, amountCents)` de `#shared/domain/visitQr` para validar valores de acordo com o modo do programa.
  - Utiliza `visitQrStatusAt(qr, now)` para derivar status `expired` se `now >= expiresAt`.
- `visit-qrs.repository.ts`:
  - Interface abstrata definindo:
    - `findActiveProgram(shopId)`
    - `insertVisitQr(data: NewVisitQrData): Promise<VisitQrRecord>`
    - `findById(shopId: string, id: string): Promise<VisitQrRecord | null>`
    - `cancel(shopId: string, id: string, reason: VisitQrCancelReason): Promise<VisitQrRecord | null>`
- `drizzle-visit-qrs.repository.ts`:
  - Geração de token criptográfico usando `generateVisitToken()` e hash `hashVisitToken()`.
  - Geração de código legível de 5 caracteres (`generateReadableCode(5)`).
  - Tratamento de colisão de código curto com índice `visit_qrs_active_code_uq`: se colidir com linha cujo `expiresAt <= now`, atualiza a linha anterior para `expired` e tenta novamente.
  - Consulta com join para resolver claim (quando resgatado, junta com `ledger_entries`, `loyalty_cards` e decifra/mascara o telefone via `PiiService`).
- `visit-qrs.service.ts`:
  - Orquestra emissão, verificação de loja aprovada (`shopPendingApproval`, `shopSuspended`), consulta e cancelamento idempotente.
- `visit-qrs.controller.ts`:
  - `POST /v1/merchant/visit-qrs` `{ amountCents? }`
  - `GET /v1/merchant/visit-qrs/:id`
  - `POST /v1/merchant/visit-qrs/:id/cancel`

#### 4. Dependências da etapa
- `#shared/domain/visitQr` (`planVisitQrIssue`, `visitQrExpiresAt`, `visitQrStatusAt`)
- `#shared/schemas/visitQr` (`VisitQrIssueRequestSchema`, `IssuedVisitQrSchema`, `VisitQrSchema`)
- `apps/api/src/common/visit-token.ts` (`generateVisitToken`, `hashVisitToken`)
- `PiiService`
- Tabela `visit_qrs` do Drizzle

#### 5. Regras de negócio envolvidas
- Se a loja não for `approved`, rejeita com `shopPendingApproval` ou `shopSuspended`.
- No modo `pointsPerCurrency`, `amountCents` é estritamente obrigatório e deve ser inteiro positivo <= `AMOUNT_MAX_CENTS`. Caso contrário, erro `invalidAmount`.
- Nos modos `stamps` e `pointsPerVisit`, `amountCents` é estritamente proibido. Caso enviado, erro `amountNotAccepted`.
- O token opaco (43 caracteres base64url) só é retornado na chamada de emissão `POST /v1/merchant/visit-qrs`. Nunca é persistido em claro no banco (apenas SHA-256 `tokenHash`).
- Cancelamento é idempotente: cancelar QR que já foi `claimed`, `expired` ou `cancelled` devolve o estado atual sem lançar erro.

#### 6. Endpoints envolvidos
- `POST /v1/merchant/visit-qrs` `{ amountCents? }` → 201 `IssuedVisitQr`
- `GET /v1/merchant/visit-qrs/:id` → 200 `VisitQr`
- `POST /v1/merchant/visit-qrs/:id/cancel` → 200 `VisitQr`

#### 7. Tratamento de erros
- `400 invalidAmount` / `amountNotAccepted`
- `403 shopPendingApproval` / `shopSuspended`
- `404 notFound` se o QR não pertencer à loja do lojista

#### 8. Critério para considerar concluída
- 100% dos testes unitários e HTTP de `visit-qrs` passando.
- `pnpm typecheck:api` limpo.

---

### Task 4: Counter Redemptions & Today's Activity (`merchant/counter`)
> **Status:** REFACTOR NEEDED ⚠️ (Remover rotas legadas de celular `/visits` e `/amount`)

#### 1. Objetivo da etapa
Ajustar o módulo `merchant/counter`:
1. **Remover** endpoints e métodos de lançamento de visita manual por celular (`POST /merchant/counter/visits` e `POST /merchant/counter/amount`), pois agora visitas são realizadas exclusivamente via Dynamic Visit QR escaneado pelo cliente.
2. **Manter e validar** os fluxos de validação de resgate de prêmio (`validateRedemption`) e confirmação de entrega do prêmio (`confirmRedemption`).
3. **Manter** a listagem da caderneta de hoje (`listTodayEntries`), cobrindo eventos do tipo visita (oriundos de QR da visita) e resgates entregues.

#### 2. Arquivos que serão criados ou alterados
- Modify: `apps/api/src/merchant/counter/counter.controller.ts` (remover endpoints de celular, manter `entries/today`)
- Modify: `apps/api/src/merchant/counter/counter.service.ts` (remover lógica de celular e criação automática de usuário por telefone)
- Modify: `apps/api/src/merchant/counter/counter.repository.ts` / `drizzle-counter.repository.ts`
- Modify: `apps/api/src/merchant/counter/counter.module.ts`
- Modify: `apps/api/src/merchant/counter/counter.http.test.ts`
- Keep & Verify: `apps/api/src/merchant/counter/counter-redemptions.*`

#### 3. O que será implementado / ajustado
- `counter.controller.ts`:
  - `GET /merchant/counter/entries/today` (mantido)
  - `counter-redemptions.controller.ts`:
    - `POST /merchant/counter/redemptions/validate` `{ code }`
    - `POST /merchant/counter/redemptions/:id/confirm` (ou body com `{ redemptionId }`)
- Limpeza de DTOs e códigos órfãos de lançamento por celular.

---

### Task 5: Program Management & Dynamic Invalidation (`merchant/program`)
> **Status:** IMPLEMENTED ✅

#### 1. Objetivo da etapa
Garantir o gerenciamento do programa de fidelidade do lojista com a trava de alteração de modo quando houver cartões emitidos e **cancelamento atômico de QRs da visita ativos** quando uma nova versão do programa for criada.

#### 2. Arquivos alterados
- Modify: `apps/api/src/merchant/program/drizzle-program.repository.ts`
- Modify: `apps/api/src/merchant/program/program.service.test.ts`
- Modify: `apps/api/src/merchant/program/program.http.test.ts`

#### 3. Regra Adicionada (RN-15 do Dynamic Visit QR)
- Na transação de `saveProgram` (quando `isNewVersion = true`):
  ```ts
  // Além de desativar a versão anterior do programa:
  await tx.update(programs).set({ active: false }).where(...)
  // CANCELA todos os VisitQrs da loja que ainda estão ativos:
  await tx.update(visitQrs)
    .set({ status: 'cancelled', cancelReason: 'programChanged' })
    .where(and(eq(visitQrs.shopId, shopId), eq(visitQrs.status, 'active')))
  ```
- Isso garante que quando um cliente escanear um QR que estava na tela na hora da troca de programa, a API de check-in responda `visitQrStale`.

---

### Task 6: Customers Directory & Weekly Metrics (`merchant/customers` & `merchant/home`)
> **Status:** PENDING ❌

#### 1. Objetivo da etapa
Fornecer a visualização da carteira de clientes da loja com mascaramento obrigatório de dados pessoais (LGPD), suporte a filtros (`all`, `lapsed`, `rewardReady`), e métricas agregadas da semana para o painel inicial do lojista.

#### 2. Arquivos que serão criados
- Create: `apps/api/src/merchant/customers/customers.controller.ts`
- Create: `apps/api/src/merchant/customers/customers.service.ts`
- Create: `apps/api/src/merchant/customers/customers.repository.ts`
- Create: `apps/api/src/merchant/customers/drizzle-customers.repository.ts`
- Create: `apps/api/src/merchant/customers/customers.module.ts`
- Create: `apps/api/src/merchant/customers/customers.service.test.ts`
- Create: `apps/api/src/merchant/customers/customers.http.test.ts`
- Create: `apps/api/src/merchant/home/home.controller.ts`
- Create: `apps/api/src/merchant/home/home.service.ts`
- Create: `apps/api/src/merchant/home/home.repository.ts`
- Create: `apps/api/src/merchant/home/drizzle-home.repository.ts`
- Create: `apps/api/src/merchant/home/home.module.ts`
- Create: `apps/api/src/merchant/home/home.service.test.ts`
- Create: `apps/api/src/merchant/home/home.http.test.ts`
- Modify: `apps/api/src/merchant/merchant.module.ts`

#### 3. O que será implementado
- `customers.repository.ts`:
  - Query juntando `loyalty_cards`, `customer_profiles`, `app_users` e total de visitas em `ledger_entries`.
  - Ordenação por `lastVisitAt DESC NULLS LAST`.
- `customers.service.ts`:
  - Decifra e mascara telefone via `PiiService` (`maskedPhone`).
  - Filtros: `all`, `lapsed` (sem visita há 30+ dias via `isLapsedSince` ou `lastVisitAt === null`), `rewardReady` (`balance >= target`).
- `home.service.ts`:
  - Agrega métricas dos últimos 7 dias via função pura `summarizeWeek(entries, now)` de `#shared/domain/weekSummary`.
- Endpoints:
  - `GET /v1/merchant/customers?filter=all|lapsed|rewardReady`
  - `GET /v1/merchant/home/week-summary`

---

### Task 7: Full Integration & Referral Settlement Verification
> **Status:** PENDING ❌

#### 1. Objetivo da etapa
Verificar a integração ponta a ponta de todo o ciclo de vida do lojista e clientes contra banco PostgreSQL real (usando `TestDatabase`):
1. Criação do lojista e da loja (`club-setup`).
2. Aprovação da loja via `test-approve`.
3. Lojista emite um `VisitQr` dinâmico no Balcão (`POST /v1/merchant/visit-qrs`).
4. Cliente indicado escaneia o token do QR (`POST /v1/check-in`).
5. Verificação de que o claim ocorreu, a primeira visita liquidou o `ReferralSettlement.settlePending` para o indicador, e o QR mudou de status para `claimed`.
6. Lojista consulta `GET /v1/merchant/visit-qrs/:id` e vê o claim com o telefone mascarado.
7. Cliente acumula pontos até a meta e gera resgate; lojista valida e entrega no balcão (`/redemptions/validate` e `/confirm`).
8. Verificação do diretório de clientes e resumo semanal.
9. Atualização da documentação no `README.md`.

---

## Execution Checklist & Progress Tracker

- [x] **Task 1: Merchant Session & Guard** (`merchant/session`)
- [x] **Task 2: Club Setup & Poster** (`merchant/club-setup`)
- [x] **Task 3: Dynamic Visit QRs** (`merchant/visit-qrs`)
- [x] **Task 4: Refactor Counter (Remove Phone Visits, Keep Redemptions & Today Entries)** (`merchant/counter`)
- [x] **Task 5: Program Management Update (Invalidate Active QRs on Program Change)** (`merchant/program`)
- [ ] **Task 6: Customers Directory & Weekly Summary** (`merchant/customers`, `merchant/home`)
- [ ] **Task 7: E2E Integration & Verification** (`merchant.integration.test.ts`)
