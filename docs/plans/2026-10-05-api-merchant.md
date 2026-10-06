# Merchant API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the complete Merchant API surface in NestJS (`apps/api/src/merchant/*`) covering Counter (visits, amount, redemptions), Club Setup & Onboarding, Program configuration, Customer list with PII masking, and Weekly metrics summary.

**Architecture:** Strictly adheres to the established NestJS API architecture of the repository:
`Controller` (HTTP validation via `ZodValidationPipe`, `unwrap(result)`) → `Service` (orchestration, returns `Result<T, DomainError>`, no Drizzle imports) → `*.rules.ts` (pure domain rules, tested without DB) → `Repository` (abstract class interface) → `Drizzle*Repository` (I/O & SQL). Writes use atomic transactions and shared `LedgerStore`.

**Tech Stack:** NestJS 12, Drizzle ORM, PostgreSQL (Supabase), Zod 4, Vitest, TypeScript strict.

---

## Approved Architectural & Business Decisions

1. **Merchant Authentication & Session Discovery (`GET /v1/merchant/session`) — APPROVED:**
   - **Regra:** No MVP é estritamente **1 dono = 1 loja**. Sem suporte a múltiplas filiais ou membros/atendentes adicionais por conta.
   - **Resolução:** A API autentica via JWT do Supabase Auth e localiza a loja do usuário via `shops.ownerUserId = user.id`.
   - **Retorno:**
     - Com loja: devolve `MerchantSession` com `shopId`, `shopName` e `shopStatus`.
     - Sem loja: devolve `404 notFound` (`entity: 'merchant'`), permitindo que o frontend direcione para `/balcao/criar-clube`.

2. **Counter Auto-Enrollment on Phone Entry — APPROVED:**
   - **Regra:** Princípio do produto: *"O balcão não espera. Cliente novo ganha cartão na hora."*
   - **Resolução:** Se o lojista digitar um celular que ainda não existe em `app_users`, o Nest cria atomicamente o registro em `app_users` + `customer_profiles` (com `referralCode` gerado) dentro da transação, e cria o cartão com o bônus de boas-vindas já aplicado via `LedgerStore.lockOrCreateCard`.
   - O telefone é cifrado e tem hash HMAC gerado via `PiiService`. Quando o cliente entrar no app futuramente com o mesmo número, o vínculo é automático.

3. **Test Shop Approval in Non-Production (`POST /v1/merchant/shop/test-approve`) — APPROVED:**
   - **Regra:** Como o painel do Admin da rede está fora do MVP, lojas nascem com `status = 'pending'`.
   - **Resolução:** Incluir o endpoint `POST /v1/merchant/shop/test-approve` para promover a loja para `approved`, **estritamente bloqueado em ambiente de produção** (`NODE_ENV === 'production'` resulta em `403 Forbidden`). Isso atende ao serviço de testes do front (`ShopApprovalTestingService`).

4. **Campaigns Feature Exclusion — APPROVED:**
   - **Regra:** O dispatcher de envio de mensagens e campanhas em lote (`Campaign` e `CampaignRecipient`) está **oficialmente excluído** da API no MVP, conforme previsto em `docs/database-model.md`.
   - **Resolução:** O backend não terá serviços de disparo de notificações. A identificação de clientes sumidos há mais de 30 dias é atendida 100% pelo filtro em `GET /v1/merchant/customers?filter=lapsed`.

---

## Phase Overview

- **Phase 1: Foundation, Session & Shop Context (`merchant/session` & `merchant/shops`)**
- **Phase 2: Club Setup & Onboarding (`merchant/club-setup`)**
- **Phase 3: Counter Core — Visits, Amount & Today's Activity (`merchant/counter`)**
- **Phase 4: Counter Redemptions — Validation & Fulfillment (`merchant/counter/redemptions`)**
- **Phase 5: Program Management (`merchant/program`)**
- **Phase 6: Customers Directory & Weekly Summary (`merchant/customers` & `merchant/home`)**
- **Phase 7: End-to-End Integration, Referral Settlement Verification & Module Assembly**

---

## Detailed Implementation Tasks

### Task 1: Merchant Session & Shop Context Guard

#### 1. Objetivo da etapa
Criar o módulo base de sessão do lojista (`merchant/session`), permitindo identificar se o usuário autenticado é proprietário de uma loja, e um decorador/guard reutilizável para injetar a loja ativa em todas as requisições autenticadas do lojista.

#### 2. Arquivos que serão criados ou alterados
- Create: `apps/api/src/merchant/session/session.controller.ts`
- Create: `apps/api/src/merchant/session/session.service.ts`
- Create: `apps/api/src/merchant/session/session.repository.ts`
- Create: `apps/api/src/merchant/session/drizzle-session.repository.ts`
- Create: `apps/api/src/merchant/session/session.module.ts`
- Create: `apps/api/src/merchant/session/session.service.test.ts`
- Create: `apps/api/src/merchant/session/session.http.test.ts`
- Create: `apps/api/src/merchant/common/merchant-shop.guard.ts`
- Create: `apps/api/src/merchant/common/current-shop.decorator.ts`
- Create: `apps/api/src/merchant/merchant.module.ts`
- Modify: `apps/api/src/app.module.ts`

#### 3. O que será implementado
- `SessionRepository`: método `findByOwnerUserId(userId: string): Promise<MerchantShopContext | null>`.
- `SessionService`: valida se o usuário possui loja; retorna `Result<MerchantSession, ErrorOf<'notFound'>>`.
- `SessionController`: rota `GET /merchant/session` usando `@CurrentUser()`.
- `MerchantShopGuard`: guard que valida se o usuário autenticado tem uma loja válida e injeta `request.shop` no request.
- `merchant.module.ts` importado em `app.module.ts`.

#### 4. Dependências da etapa
- `AuthModule` (`SupabaseAuthGuard`, `@CurrentUser()`)
- `DatabaseModule` (`shops` schema)
- `#shared/schemas/session` (`MerchantSessionSchema`)

#### 5. Regras de negócio envolvidas
- Um lojista é identificado pelo `ownerUserId` da tabela `shops`.
- Se o usuário não possui loja, deve retornar `404 notFound` (`entity: 'merchant'`), permitindo ao front redirecionar para criação de clube.
- O status da loja (`pending`, `approved`, `suspended`) deve vir no payload da sessão.

#### 6. Alterações no banco, se necessário
Nenhuma. Tabela `shops` já possui `owner_user_id` e índice `shops_owner_idx`.

#### 7. Endpoints envolvidos
- `GET /v1/merchant/session` (Autenticado, JWT Supabase)

#### 8. Validações
- Validação do JWT pelo guard global.
- Resposta tipada e validada pelo `MerchantSessionSchema`.

#### 9. Tratamento de erros
- `404 notFound { entity: 'merchant' }` se o usuário não tiver loja cadastrada.
- `401 unauthorized` se o token JWT for ausente/inválido.

#### 10. Segurança
- O `ownerUserId` é estritamente extraído do token JWT autenticado (`user.id`), impedindo IDOR.

#### 11. Testes necessários
- Unitário (`session.service.test.ts`): loja encontrada vs não encontrada.
- HTTP (`session.http.test.ts`): teste com token autenticado mockado retornando 200 e 404.

#### 12. Critério para considerar a etapa concluída
- `pnpm test:api src/merchant/session` passa com 100% de sucesso.
- `pnpm typecheck:api` executa sem erros.

#### 13. Commits após cada etapa
```bash
git commit -m "feat(api): add merchant session module and shop context guard"
```

---

### Task 2: Club Setup & Onboarding (`merchant/club-setup`)

#### 1. Objetivo da etapa
Permitir que o lojista autenticado registre sua loja e defina o primeiro programa de fidelidade, gerando o `checkInCode` único de 6 caracteres e o cartaz de balcão.

#### 2. Arquivos que serão criados ou alterados
- Create: `apps/api/src/merchant/club-setup/club-setup.controller.ts`
- Create: `apps/api/src/merchant/club-setup/club-setup.service.ts`
- Create: `apps/api/src/merchant/club-setup/club-setup.rules.ts`
- Create: `apps/api/src/merchant/club-setup/club-setup.repository.ts`
- Create: `apps/api/src/merchant/club-setup/drizzle-club-setup.repository.ts`
- Create: `apps/api/src/merchant/club-setup/club-setup.module.ts`
- Create: `apps/api/src/merchant/club-setup/club-setup.rules.test.ts`
- Create: `apps/api/src/merchant/club-setup/club-setup.service.test.ts`
- Create: `apps/api/src/merchant/club-setup/club-setup.http.test.ts`
- Modify: `apps/api/src/merchant/merchant.module.ts`

#### 3. O que será implementado
- `club-setup.rules.ts`: regras de unicidade de `checkInCode`, validação de limites de programa (`target`, `earnUnits`, `bonusRules`).
- `club-setup.repository.ts`: transação atômica criando `shops` (status `pending`, `checkInCode` gerado) e `programs` (`active: true`).
- `club-setup.service.ts`: orquestra a criação do clube garantindo idempotência (se o usuário já tem loja, rejeita ou retorna conflito).
- Endpoint para busca de poster de check-in (`GET /merchant/poster`).
- Endpoint para status da loja (`GET /merchant/shop/status`).
- Endpoint de teste dev-only para aprovação de loja (`POST /merchant/shop/test-approve`).

#### 4. Dependências da etapa
- `Task 1` (Sessão do lojista)
- `#shared/schemas/onboarding` (`ClubSetupDraftSchema`)
- `#shared/schemas/shop` (`ShopPosterSchema`, `ShopStatusSchema`)
- `#shared/utils/readableCode` (`generateReadableCode`)

#### 5. Regras de negócio envolvidas
- A loja nasce com `status = 'pending'`.
- `checkInCode` tem 6 caracteres alfanuméricos legíveis e é globalmente único.
- `Program` é ativado com `active: true` e `shopId` vinculado.
- `bonusRules` armazenadas em JSONB e validadas conforme o schema.

#### 6. Alterações no banco, se necessário
Nenhuma. Schemas `shops` e `programs` em Drizzle já suportam todas as colunas.

#### 7. Endpoints envolvidos
- `POST /v1/merchant/club-setup` `{ shop: {...}, program: {...} }`
- `GET /v1/merchant/poster` (devolve `ShopPoster`: nome, código, prêmio, meta, unidade)
- `GET /v1/merchant/shop/status` (devolve `ShopStatus`)
- `POST /v1/merchant/shop/test-approve` (só ativo se `NODE_ENV !== 'production'`)

#### 8. Validações
- `ZodValidationPipe(ClubSetupDraftSchema)`.
- Rejeição de `checkInCooldownHours` fora de 1..168.
- Validação de expiração (1..24 meses ou 'never').

#### 9. Tratamento de erros
- `409 conflict` se o lojista já possuir uma loja criada.
- `400 validation` para payloads inválidos.
- `403 forbidden` ao tentar usar `test-approve` em produção.

#### 10. Segurança
- Loja criada atrelada ao `user.id` do token JWT autenticado.
- Geração de código de check-in sem caracteres confusos (0/O, 1/I/L).

#### 11. Testes necessários
- `club-setup.rules.test.ts`: validações de rascunho e geração de código.
- `club-setup.service.test.ts`: sucesso e colisão de dono existente.
- `club-setup.http.test.ts`: POST cria loja e programa; GET poster devolve dados consistentes.

#### 12. Critério para considerar a etapa concluída
- `pnpm test:api src/merchant/club-setup` passa 100%.
- Criação e consulta de status funcionam ponta a ponta em testes de unidade e HTTP.

#### 13. Commits após cada etapa
```bash
git commit -m "feat(api): add merchant club setup, poster and status endpoints"
```

---

### Task 3: Counter Core — Visits, Amount & Activity (`merchant/counter`)

#### 1. Objetivo da etapa
Implementar o motor de atendimento do Balcão: registro de visita simples (`registerVisit`), lançamento por valor financeiro (`registerAmount`) e listagem das entradas lançadas no dia de hoje (`listTodayEntries`).

#### 2. Arquivos que serão criados ou alterados
- Create: `apps/api/src/merchant/counter/counter.controller.ts`
- Create: `apps/api/src/merchant/counter/counter.service.ts`
- Create: `apps/api/src/merchant/counter/counter.rules.ts`
- Create: `apps/api/src/merchant/counter/counter.repository.ts`
- Create: `apps/api/src/merchant/counter/drizzle-counter.repository.ts`
- Create: `apps/api/src/merchant/counter/counter.module.ts`
- Create: `apps/api/src/merchant/counter/counter.rules.test.ts`
- Create: `apps/api/src/merchant/counter/counter.service.test.ts`
- Create: `apps/api/src/merchant/counter/counter.http.test.ts`
- Modify: `apps/api/src/merchant/merchant.module.ts`

#### 3. O que será implementado
- `counter.rules.ts`: regras de lançamento de balcão (bloqueio de loja pendente/suspensa, validação de modo de programa para valor em reais).
- `counter.repository.ts`:
  - Busca e criação automática de cliente por telefone mascarado/hash.
  - Consulta das entradas de balcão do dia (`listTodayEntries`) ordenadas por `occurredAt DESC NULLS LAST`.
- `counter.service.ts`:
  - Garante que a loja está `approved`.
  - Resolve ou cria `customerId` a partir do `phone`.
  - Abre transação com `LedgerStore.lockOrCreateCard`.
  - Calcula ganho com `planEarning({ rules, bonusRules, customerBirthday, card, input, now })`.
  - Registra crédito com `LedgerStore.credit`.
  - Após o commit, dispara `ReferralSettlement.settlePending(customerId, shopId, now)` caso seja a primeira visita.
- `counter.controller.ts`:
  - `POST /merchant/counter/visits`
  - `POST /merchant/counter/amount`
  - `GET /merchant/counter/entries/today`

#### 4. Dependências da etapa
- `LedgerModule` (`LedgerStore`, `ReferralSettlement`)
- `PiiService` (`hashPhone`, `encryptPhone`, `decryptPhone`)
- `#shared/domain/earning` (`planEarning`)
- `#shared/schemas/visit` (`VisitRegisteredSchema`, `CounterEntrySchema`)

#### 5. Regras de negócio envolvidas
- Se a loja estiver `pending` ou `suspended`, recusa com `shopPendingApproval` ou `shopSuspended`.
- Se o modo não for `pointsPerCurrency`, rejeitar `registerAmount` com `amountNotAccepted`.
- O cálculo do ganho respeita as regras ativas do programa e bônus (aniversário, dia surpresa).
- A idempotência utiliza chave no formato `counter:visit:<shopId>:<customerId>:<timestamp_minute>`.
- Após confirmação da primeira visita, a indicação pendente é liquidada de forma assíncrona/idempotente via `ReferralSettlement`.

#### 6. Alterações no banco, se necessário
Nenhuma. `ledger_entries` possui índice `ledger_shop_occurred_idx`.

#### 7. Endpoints envolvidos
- `POST /v1/merchant/counter/visits` `{ phone }`
- `POST /v1/merchant/counter/amount` `{ phone, amountCents }`
- `GET /v1/merchant/counter/entries/today`

#### 8. Validações
- `PhoneNumberSchema` no formato nacional válido.
- `amountCents` inteiro positivo.
- Idempotency-Key opcional no cabeçalho HTTP.

#### 9. Tratamento de erros
- `403 shopPendingApproval` se a loja não estiver aprovada.
- `403 shopSuspended` se a loja estiver suspensa.
- `400 amountNotAccepted` se tentar lançar valor em programa que não é pontos por real.
- `400 invalidAmount` para centavos <= 0.

#### 10. Segurança
- Celular do cliente recebido no body é hashed/cifrado imediatamente.
- Toda resposta HTTP devolve apenas o celular mascarado (`maskedPhone`).
- Validação estrita de que o operador é dono da loja através do JWT.

#### 11. Testes necessários
- `counter.rules.test.ts`: rejeição de loja pendente e modo incorreto.
- `counter.service.test.ts`: fluxo de visita simples, visita com valor, criação de cliente novo no balcão e disparo do settlement de indicação.
- `counter.http.test.ts`: contratos de endpoints e códigos de erro de domínio.

#### 12. Critério para considerar a etapa concluída
- Todos os testes de `counter` passam.
- `pnpm test:api` continua verde em todas as suítes existentes.

#### 13. Commits após cada etapa
```bash
git commit -m "feat(api): implement merchant counter visits, amount registration and today entries"
```

---

### Task 4: Counter Redemptions — Validation & Fulfillment (`merchant/counter/redemptions`)

#### 1. Objetivo da etapa
Permitir ao atendente validar o código de resgate de 6 caracteres apresentado pelo cliente no balcão e confirmar a entrega do prêmio.

#### 2. Arquivos que serão criados ou alterados
- Create: `apps/api/src/merchant/counter/counter-redemptions.controller.ts`
- Create: `apps/api/src/merchant/counter/counter-redemptions.service.ts`
- Create: `apps/api/src/merchant/counter/counter-redemptions.service.test.ts`
- Create: `apps/api/src/merchant/counter/counter-redemptions.http.test.ts`
- Modify: `apps/api/src/merchant/counter/counter.module.ts`

#### 3. O que será implementado
- `validateRedemption(code)`:
  - Normaliza o código legível via `normalizeReadableCode`.
  - Chama `RedemptionLookup.findActive(shopId, code, now)`.
  - Recupera o celular do cliente e mascara via `maskPhone`.
  - Retorna `RedemptionPreview`: `{ redemptionId, rewardTitle, maskedPhone, expiresAt }`.
- `confirmRedemption(redemptionId)`:
  - Abre transação no banco.
  - Chama `LedgerStore.settleRedemption(tx, { redemptionId, shopId, recordedBy: user.id, now })`.
  - Retorna o `CounterEntry` resultante do resgate.

#### 4. Dependências da etapa
- `RedemptionLookup` (`apps/api/src/ledger/redemption-lookup.ts`)
- `LedgerStore.settleRedemption` (`apps/api/src/ledger/ledger.store.ts`)
- `#shared/schemas/redemption` (`RedemptionPreviewSchema`)

#### 5. Regras de negócio envolvidas
- Código inexistente ou de outra loja devolve `redemptionInvalid` (não revela se o código existe em outro comércio).
- Código expirado devolve `redemptionExpired`.
- Código já utilizado devolve `redemptionAlreadyUsed`.
- Ao confirmar o resgate, a meta de unidades é debitada e o cartão recomeça com pontos de boas-vindas caso configurado na loja.

#### 6. Alterações no banco, se necessário
Nenhuma. `redemptions` já conta com `redemptions_active_code_uq`.

#### 7. Endpoints envolvidos
- `POST /v1/merchant/counter/redemptions/validate` `{ code }`
- `POST /v1/merchant/counter/redemptions/confirm` `{ redemptionId }`

#### 8. Validações
- `RedemptionCodeSchema` (6 caracteres).
- `UuidSchema` para `redemptionId`.

#### 9. Tratamento de erros
- `400 redemptionInvalid`
- `400 redemptionExpired`
- `400 redemptionAlreadyUsed`
- `403 shopPendingApproval` / `shopSuspended`

#### 10. Segurança
- Lock de linha no resgate e no cartão durante a confirmação para evitar duplo resgate simultâneo.
- `recordedBy` gravado com o UUID do lojista autenticado para auditoria.

#### 11. Testes necessários
- `counter-redemptions.service.test.ts`: validação bem-sucedida, código expirado, confirmação de resgate e atualização de saldo.
- `counter-redemptions.http.test.ts`: fluxo HTTP completo dos dois endpoints.

#### 12. Critério para considerar a etapa concluída
- Testes cobrindo validação e entrega passam com 100% de sucesso.
- `unwrap` mapeia os `DomainError` para as respostas HTTP corretas.

#### 13. Commits após cada etapa
```bash
git commit -m "feat(api): add merchant redemption validation and fulfillment endpoints"
```

---

### Task 5: Program Management (`merchant/program`)

#### 1. Objetivo da etapa
Disponibilizar endpoints para o lojista visualizar e atualizar as regras do seu programa de fidelidade, aplicando a trava de alteração de modalidade caso já existam cartões emitidos.

#### 2. Arquivos que serão criados ou alterados
- Create: `apps/api/src/merchant/program/program.controller.ts`
- Create: `apps/api/src/merchant/program/program.service.ts`
- Create: `apps/api/src/merchant/program/program.rules.ts`
- Create: `apps/api/src/merchant/program/program.repository.ts`
- Create: `apps/api/src/merchant/program/drizzle-program.repository.ts`
- Create: `apps/api/src/merchant/program/program.module.ts`
- Create: `apps/api/src/merchant/program/program.rules.test.ts`
- Create: `apps/api/src/merchant/program/program.service.test.ts`
- Create: `apps/api/src/merchant/program/program.http.test.ts`
- Modify: `apps/api/src/merchant/merchant.module.ts`

#### 3. O que será implementado
- `program.rules.ts`: função `canChangeProgramMode(activeCardsCount: number, currentMode: ProgramMode, targetMode: ProgramMode): boolean`.
- `program.repository.ts`: busca o programa ativo da loja, conta cartões associados à loja, e salva alterações.
- Versionamento do programa: se alterar regras críticas, desativa a versão anterior (`active: false`) e insere nova linha ativa conforme modelagem (`programs_one_active_per_shop_uq`).
- `program.service.ts`: orquestra leitura, contagem de cartões ativos e atualização.
- `program.controller.ts`:
  - `GET /merchant/program`
  - `GET /merchant/program/cards/count`
  - `PUT /merchant/program`

#### 4. Dependências da etapa
- `programs` e `loyalty_cards` schema
- `ProgramRulesMapper` (`apps/api/src/programs/program-rules.mapper.ts`)
- `#shared/schemas/program` (`ProgramSchema`, `ProgramDraftSchema`)

#### 5. Regras de negócio envolvidas
- Se `countActiveCards > 0` e o lojista tentar alterar o `mode` (`stamps` ↔ `pointsPerCurrency` ↔ `pointsPerVisit`), rejeita com `programModeLocked`.
- Alteração de meta (`target`), título do prêmio e regras bônus é permitida a qualquer momento.

#### 6. Alterações no banco, se necessário
Nenhuma. A tabela `programs` já possui a coluna `active` com índice único parcial `programs_one_active_per_shop_uq`.

#### 7. Endpoints envolvidos
- `GET /v1/merchant/program`
- `GET /v1/merchant/program/cards/count`
- `PUT /v1/merchant/program` `{ rules, rewardTitle, ... }`

#### 8. Validações
- `ZodValidationPipe(ProgramDraftSchema)` no payload de update.

#### 9. Tratamento de erros
- `409 programModeLocked` se tentar mudar o modo com cartões ativos.
- `400 invalidProgram` para regras incoerentes.
- `404 notFound` se a loja não tiver programa ativo.

#### 10. Segurança
- Acesso restrito ao programa da loja do lojista autenticado.

#### 11. Testes necessários
- `program.rules.test.ts`: trava de modo quando cartões > 0.
- `program.service.test.ts`: atualização com sucesso, recusa de trava de modo.
- `program.http.test.ts`: GET e PUT respondendo contratos esperados.

#### 12. Critério para considerar a etapa concluída
- Testes unitários e HTTP passam.
- `pnpm typecheck:api` limpo.

#### 13. Commits após cada etapa
```bash
git commit -m "feat(api): implement merchant program management and mode lock rules"
```

---

### Task 6: Customers Directory & Weekly Metrics (`merchant/customers` & `merchant/home`)

#### 1. Objetivo da etapa
Fornecer a visualização da carteira de clientes da loja com mascaramento obrigatório de dados pessoais (LGPD), suporte a filtros (`all`, `lapsed`, `rewardReady`), e métricas agregadas da semana para o painel inicial do lojista.

#### 2. Arquivos que serão criados ou alterados
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
  - Query juntando `loyalty_cards`, `customer_profiles`, `app_users` e contagem de visitas em `ledger_entries`.
  - Ordenação por `lastVisitAt DESC NULLS LAST`.
  - Aplicação de `planExpiration` ao saldo antes de devolver.
- `customers.service.ts`:
  - Mascaramento de telefone via `PiiService.decryptPhone` seguido de `maskPhone`.
  - Aplicação dos filtros: `all`, `lapsed` (sem visita há 30+ dias via `isLapsedSince`), `rewardReady` (`balance >= target`).
- `home.repository.ts`:
  - Busca das entradas de ledger da loja nos últimos 7 dias.
- `home.service.ts`:
  - Agregação semanal via função pura `summarizeWeek(entries, now)` de `#shared/domain/weekSummary`.
- Controllers para ambos os módulos.

#### 4. Dependências da etapa
- `PiiService`
- `#shared/domain/customer` (`isLapsedSince`)
- `#shared/domain/loyaltyCard` (`isRewardReady`)
- `#shared/domain/weekSummary` (`summarizeWeek`)
- `#shared/schemas/customer` (`MerchantCustomerRowSchema`, `CustomerFilterSchema`)
- `#shared/schemas/weekSummary` (`WeekSummarySchema`)

#### 5. Regras de negócio envolvidas
- **LGPD:** O número de telefone cru NUNCA é retornado na listagem de clientes. Apenas `maskedPhone`.
- Clientes sumidos (`lapsed`) são aqueles cuja `lastVisitAt` tem mais de 30 dias ou nunca visitaram.
- O resumo semanal considera contagens de visitas, novos cartões criados e prêmios entregues nos últimos 7 dias.

#### 6. Alterações no banco, se necessário
Nenhuma. Índice `loyalty_cards_shop_last_visit_idx` já cobre a busca e ordenação.

#### 7. Endpoints envolvidos
- `GET /v1/merchant/customers?filter=all|lapsed|rewardReady`
- `GET /v1/merchant/home/week-summary`

#### 8. Validações
- `ZodValidationPipe` para o query param `filter`.

#### 9. Tratamento de erros
- `400 validation` para filtros inválidos.
- Resposta vazia (`[]` ou resumo zerado) caso a loja seja nova.

#### 10. Segurança
- Isolamento multi-tenant: o filtro `shopId` é estritamente fixado na loja do usuário autenticado.
- Proteção PII estrita: nenhum e-mail ou celular decifrado sai na resposta.

#### 11. Testes necessários
- `customers.service.test.ts`: filtros `all`, `lapsed` e `rewardReady`, mascaramento do celular.
- `customers.http.test.ts`: retorno paginado/limitado e validação de schema.
- `home.service.test.ts`: cálculo correto dos 7 dias e agregação de eventos.
- `home.http.test.ts`: contrato de `WeekSummary`.

#### 12. Critério para considerar a etapa concluída
- Todas as suítes de teste de clientes e home passam.
- Nenhum dado pessoal não mascarado exposto.

#### 13. Commits após cada etapa
```bash
git commit -m "feat(api): implement merchant customers list with PII masking and weekly summary metrics"
```

---

### Task 7: Full Integration & Referral Settlement Verification

#### 1. Objetivo da etapa
Verificar a integração ponta a ponta de todo o módulo `merchant`, incluindo a integração entre o Balcão e a liquidação de indicações pendentes (`ReferralSettlement.settlePending`).

#### 2. Arquivos que serão criados ou alterados
- Create: `apps/api/src/merchant/merchant.integration.test.ts`
- Modify: `apps/api/README.md` (atualizar documentação das rotas implementadas)

#### 3. O que será implementado
- Teste de integração completo contra banco PostgreSQL real (usando `TestDatabase`):
  1. Criação do lojista e da loja (`club-setup`).
  2. Aprovação da loja.
  3. Lançamento de primeira visita para cliente indicado no Balcão.
  4. Verificação de que o bônus de indicação foi creditado no cartão do indicador.
  5. Acúmulo até a meta e validação + entrega do código de resgate no Balcão.
  6. Consulta da listagem de clientes e do resumo semanal.
- Atualização do README da API documentando a superfície `/v1/merchant/*`.

#### 4. Dependências da etapa
- Tasks 1 a 6 concluídas.
- `TestDatabase` harness.

#### 5. Regras de negócio envolvidas
- Resolução da pendência registrada na Fase 5: *"Balcão: chamar ReferralSettlement.settlePending depois de toda primeira visita lançada + teste de integração"*.

#### 6. Alterações no banco, se necessário
Nenhuma.

#### 7. Endpoints envolvidos
Todas as rotas do `/v1/merchant/*`.

#### 8. Validações
Execução completa de `pnpm test:api` (todos os testes unitários, HTTP e integração) e `pnpm typecheck:api`.

#### 9. Tratamento de erros
Garantir que nenhum erro 500 não tratado ocorra em fluxos inválidos.

#### 10. Segurança
Revisão de logs para certificar que nenhum PII ou token foi gravado.

#### 11. Testes necessários
- `merchant.integration.test.ts` cobrindo o ciclo de vida completo do lojista e clientes.

#### 12. Critério para considerar a etapa concluída
- 100% dos testes da API passando (`pnpm test:api`).
- `pnpm typecheck:api` passando sem warnings.
- `pnpm build:api` completando com sucesso.

#### 13. Commits após cada etapa
```bash
git commit -m "test(api): add merchant end-to-end integration tests and update api documentation"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-10-05-api-merchant.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints.
