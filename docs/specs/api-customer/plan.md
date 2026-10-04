# API do cliente: plano de implementação em 5 fases

Escopo: tudo que o app do cliente (mobile) consome, em `apps/api/src/customer/*`.
O painel do lojista (Balcão, Programa, Clientes) é do Caio, em `merchant/*`.
Contratos de entrada e saída vêm de `shared/schemas`; os services do front que
cada fase atende estão em `apps/web/layers/customer/app/services`.

## Regras de cada fase

- **Padrão de código** (CLAUDE.md, "Padrão da API"): controller → service →
  `*.rules.ts` (puro) → repository. DRY com `shared/domain`, SOLID, sem `any`.
- **Segurança:** rota autenticada por padrão, query sempre pelo `user.id` do JWT,
  celular e e-mail só mascarados, nada de dado pessoal em log, erro HTTP = `DomainError`.
- **Performance:** toda query nova passa por `EXPLAIN` (só índice, sem varredura de
  tabela que cresce), sem N+1, listas sempre com `limit`.
- **Testes:** regra pura sem banco, HTTP com repositório falso, repository
  validado uma vez contra o banco real do `lagoa-` (dados de teste removidos).
- **Fluxo:** branch por fase a partir da `main` → implementar → `typecheck` +
  testes + build → revisão (`code-reviewer`) → corrigir achados → PR → merge →
  próxima fase.

## Fase 1: Fundação e conta
Telas: Entrar, Código e LGPD, Perfil. Front: `ProfileService`, parte do `AuthService`.

- Entrega o que já existe: scaffold `apps/api`, schema Drizzle, migrations, `PiiService`,
  guard do Supabase, módulo `profile` (perfil, aniversário com trava, consentimento, termos).
- **Cadastro** `POST /v1/customer/registration`: JWT (e-mail) + celular → cria
  `app_users` + `customer_profiles` numa transação, gera `referralCode`, celular único
  por hash.
- **Sessão** `GET /v1/customer/session` (`CustomerSession`: id, `isNewCustomer`).
- Filtro global de exceções (formato único, sem stack nem dado pessoal), logs com redação.
- CI no GitHub Actions: typecheck + testes de `apps/api` e `shared`.

## Fase 2: Lojas e Descobrir
Tela: Descobrir. Front: `DiscoverService`.

- Leitura de loja para o cliente: só `status = approved`, junto do `program`
  (`ShopSummary`: unidade, meta, prêmio, taxa, `welcomeUnits`).
- `GET /v1/discover/shops`, `GET /v1/discover/challenges` (lista vazia: desafios
  estão fora do MVP, ver `docs/database-model.md`).
- `programs/program-rules.mapper.ts`: traduz a regra "achatada" do banco para o `ProgramRules` do `shared`
  (reutilizado nas fases 3 e 4). A busca de loja por `checkInCode` entra na fase 4, onde é usada.
- Seed de desenvolvimento: `pnpm --filter @lagoa/api db:seed` (idempotente) e `db:seed -- --reset`
  (remove). Lojas fictícias: 3 aprovadas, 1 pendente, 1 suspensa.

## Fase 3: Carteira e Cartão da loja
Telas: Carteira, Cartão da loja. Front: `WalletService`.

- `GET /v1/wallet/cards` (já ordenado por proximidade do prêmio), `GET /v1/wallet/cards/:shopId`.
- `GET /v1/wallet/activity?limit` e `GET /v1/wallet/rewards?limit` (só resgates entregues).
- Carimbos (`stamps`) derivados do ledger, sem tabela própria.
- Mapa dos tipos do ledger do banco (`welcomeBonus`, `referralBonus`, `expiration`)
  para os do `shared` (`LedgerKind`); se faltar tipo, ajuste no `shared` combinado com o front.
- Entram só `visit`, `amount`, `checkIn` e `redemption` na caderneta (os tipos do `shared`); bônus de
  boas-vindas e indicação aparecem como carimbos do cartão (`source`). Ampliar `LedgerKind` fica para
  quando o front tiver os textos.
- A expiração (prêmio guardado 30 dias, inatividade) é toda da fase 5, na leitura e na escrita.
- Índices do ledger com `id` no fim (desempate do mesmo instante) e consultas `nulls last`.
- Queries em lote (cartões + último ledger) sem N+1.

## Fase 4: Check-in e Carimbo ganho
Telas: Check-in, Carimbo ganho. Front: `CheckInService`.

- `POST /v1/check-in` `{ code }` → `CheckInResult`.
- Transação com lock no cartão: antifraude (janela do `checkInCooldownHours`, vale
  qualquer visita), cartão criado na primeira visita, boas-vindas, estratégia do
  modo (`programStrategies`), bônus de aniversário e dia surpresa (vale o maior),
  idempotência por `idempotencyKey`.
- Cartão chega à meta: define `rewardExpiresAt`.
- **Ledger compartilhado** (`apps/api/src/ledger/ledger.store.ts`): `lockOrCreateCard` + `credit`, usados
  também pelo Balcão do Caio. A regra do que uma visita rende é `planEarning` (`shared/domain/earning.ts`);
  a janela é `checkInAvailableAt`. O Balcão chama `planEarning` com `input` de visita ou de valor.
- Limite de requisições mais estrito nesta rota.

## Fase 5: Resgate, Expiração, Indicação e fechamento
Tela: Resgate. Front: `RewardRedemptionService`. Entregue em três PRs.

**5.1 Resgate** (feito)
- `POST /v1/redemptions` `{ cardId }` (gera ou devolve o código ativo; 6 caracteres legíveis, 10 min; um código
  ativo por cartão garantido por índice único parcial), `GET /v1/redemptions/:id` (vencido sai como `expired`
  e libera o código da loja).
- Migration `0004`: `redemptions.created_at` e `redemptions_active_card_uq`.
- `LedgerStore.settleRedemption`: a entrega no Balcão (débito da meta no ledger, `redeemed`, cartão que recomeça
  com boas-vindas `welcome-restart:<id>`, nunca duas vezes; recusa loja não aprovada, código vencido e meta
  que subiu depois do pedido). `RedemptionLookup.findActive(shopId, texto)` acha o código que o lojista digitou.
  Quem chama (Balcão) garante que `recordedBy` é dono/equipe da loja e abre a transação.

**5.2 Expiração** (feito)
- `shared/domain/expiration.ts` (`planExpiration`/`applyExpiration`): inatividade leva o saldo todo; prêmio guardado
  e não resgatado em `REWARD_HOLD_DAYS` perde uma meta (e a guarda recomeça se sobrar outra meta inteira).
  O mock do front usa a mesma função.
- `LedgerStore.lockOrCreateCard(tx, key, expiry)` já devolve o cartão em dia e grava a linha `expiration`
  (chave `expiration:<cartão>:<tipo>:<quando venceu>`, uma vez só); o pedido de resgate e a entrega também
  aplicam. Quem lança (check-in, Balcão) não tem como esquecer.
- A Carteira mostra o saldo efetivo na leitura (sem gravar). Sem job: o vencimento é gravado no próximo
  lançamento ou pedido de resgate. Telas do lojista que leem `balance` cru devem usar `planExpiration`.

**5.3 Indicação** (feito)
- `POST /v1/referrals` `{ referralCode, shopCode }` guarda o convite do link como `Referral` pendente (204 sempre,
  valendo ou não: não vira oráculo de contas nem de lojas) e `GET /v1/referrals/me` devolve o código do indicador.
- Pagamento na primeira visita: `ReferralSettlement.settlePending` (em `ledger/`), chamado **depois** do commit da
  visita, em transação própria (um cartão por transação: sem deadlock entre dois clientes que se indicam).
  Idempotente, bônus `referralBonus` no cartão do indicador (criado se não existir), `rejected` se a regra foi
  desligada. O Balcão do Caio chama a mesma coisa depois da primeira visita lançada.
- Coluna `loyalty_cards.last_activity_at` (migration `0007`): a inatividade conta da última visita **ou bônus**;
  o antifraude do check-in continua só em `last_visit_at`. A chave do vencimento inclui a última linha do cartão.

**5.4 Fechamento** (feito)
- `Idempotency-Key` no check-in (reenvio devolve o carimbo já gravado; chave por cliente + loja + cartão).
- `customer_profiles.terms_version` (migration `0008`) e `TERMS_VERSION` no `shared`: o aceite grava a versão.
- Payload cifrado de PII com a versão da chave (rotação aditiva).
- Testes de integração de perfil, cadastro, Descobrir e Carteira (mais os de check-in, resgate, vencimento e
  indicação): 241 testes da API, todos contra Postgres no CI.
- `EXPLAIN (ANALYZE)` em volume (300 lojas, 20 mil clientes, 60 mil cartões, 300 mil linhas de ledger): todas as
  consultas críticas abaixo de 5 ms e com índice (transação desfeita, nada ficou no banco).
- README da API, guia de integração com o front, revisão de segurança de ponta a ponta.

## Pendências registradas (revisões)

| Item | Onde | Fase |
|---|---|---|
| Teto diário de respostas `phoneAlreadyUsed` por conta (sondagem de celular; hoje só o limite de 5/min por conta e 15/min por IP) | cadastro | PO |
| Requisição com token inválido não passa pelo limite (custo baixo: ES256 com JWKS em cache) | `app.module.ts` | 5 |
| Lojista que vira cliente com celular diferente do já gravado: o gravado vence, sem aviso | `drizzle-registration.repository.ts` | 5 |
| Quem tira o aniversário e quer repor a mesma data fica travado até 365 dias: PO confirmar | `profile.rules.ts` | PO |
| Índice `(status, name, id)` para a ordem da vitrine, se passar de centenas de lojas | `shops` | 5 |
| Regras do clube lidas fora do lock no check-in: ok hoje; reavaliar quando o lojista puder trocar o modo | `drizzle-check-in.repository.ts` | 5 |
| Balcão: chamar `ReferralSettlement.settlePending` depois de toda primeira visita lançada + teste de integração "primeira visita pelo Balcão paga a indicação" | `merchant/*` (Caio) | 6 |

## Decisões registradas

- **Histórico de loja suspensa:** a caderneta do cliente continua mostrando o histórico (é dado dele);
  o cartão some da carteira e do `getCard` enquanto a loja não estiver `approved`. PO confirma.
- **Migrations 0002/0003:** o índice do ledger por cliente nasceu sem `id` e foi refeito na 0003.
  Ambas já estão aplicadas no projeto `lagoa-`; não se reescreve histórico aplicado.
- **Contrato do ledger (com o Caio):** `occurred_at` vem do `Clock` da aplicação (nunca recua em relação
  ao último lançamento do cartão, sob o lock). Visita e boas-vindas gravadas juntas têm o mesmo instante e
  o desempate é o `id` (UUID v7, ordem de inserção): o `LedgerStore.credit` insere as **boas-vindas antes
  da visita**, para ficarem nas casas 1 e 2. Toda escrita no ledger passa por `LedgerStore`.
- **Retry do check-in:** sem `Idempotency-Key`, quem reenvia por timeout recebe `checkInCooldown` (a janela
  já impede o lançamento duplo) e vê o carimbo na carteira. `Idempotency-Key` fica para a fase 5.

- **Resgate não é visita** (`redemption` tem `countsAsVisit = false`): não adia a inatividade nem libera um
  novo check-in. Se resgatar no balcão deve contar como presença, o PO decide e o `settleRedemption` passa a
  gravar `lastVisitAt` num campo à parte do cooldown.
- **Inatividade e guarda do prêmio:** a inatividade não vence antes do prêmio guardado, e a guarda seguinte corre
  a partir do vencimento da anterior (`+ 30 dias`), nunca de "agora", para a leitura ser estável.

- **Boas-vindas são da primeira visita, não do primeiro cartão** (`planEarning`: `card === null` ou `lastVisitAt`
  nulo): quem ganhou o cartão por indicação ainda recebe as boas-vindas na primeira visita real.
- **Pagamento da indicação** é tentado a cada check-in bem-sucedido (idempotente, uma consulta pelo índice único);
  uma falha passageira é refeita na visita seguinte.
- **Decisões para o PO (não implementadas):** (1) teto de bônus por indicador e loja numa janela (ex.: N por mês),
  porque o celular é declarado e o código da loja é público: contas falsas somam bônus; (2) a latência da captura de
  convite varia com o motivo de não valer (8 caracteres + limite de requisições tornam a enumeração inviável;
  uniformizar com uma consulta só se virar requisito).

## Pontos de contato com o Caio

| Item | Quando |
|---|---|
| Padrão de módulo (`CLAUDE.md`) e `shared/` como contrato | já vale |
| Serviço de ledger (escrita) | pronto: `LedgerStore` (ver `apps/api/README.md`, "Para o painel do lojista") |
| Validação e entrega de resgate no Balcão | pronto: `RedemptionLookup` + `LedgerStore.settleRedemption` |
| Aprovação de loja (`Shop.status`) | em aberto no modelo |
