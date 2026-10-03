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

## Fase 5: Resgate, Indicação e fechamento
Tela: Resgate. Front: `RewardRedemptionService`.

- `POST /v1/redemptions` (gera ou devolve o código ativo; 6 caracteres legíveis,
  10 min), `GET /v1/redemptions/:id` (expira sozinho na leitura).
- A validação e a entrega no Balcão são do Caio; o contrato do débito no ledger
  (`redemption`) é o do serviço de ledger da fase 4.
- **Indicação:** link `ref` + `loja` guardado no cadastro; na primeira visita válida
  cria `Referral` e paga `referralBonus` no cartão do indicador, com todas as
  regras do `docs/database-model.md`.
- **Expiração:** rotina agendada para prêmio não resgatado (30 dias) e carimbos
  vencidos por inatividade.
- Fechamento: revisão de segurança de ponta a ponta, `EXPLAIN` das queries críticas,
  README da API, checklist de integração com o front (`Http*Service`).

## Pendências registradas (revisões)

| Item | Onde | Fase |
|---|---|---|
| Teto diário de respostas `phoneAlreadyUsed` por conta (sondagem de celular) | cadastro | 5 |
| Requisição com token inválido não passa pelo limite (custo baixo: ES256 com JWKS em cache) | `app.module.ts` | 5 |
| Lojista que vira cliente com celular diferente do já gravado: o gravado vence, sem aviso | `drizzle-registration.repository.ts` | 5 |
| Versão dos termos aceitos (`termsVersion`) para auditoria LGPD; exige migration | `customer_profiles` | 5 |
| Quem tira o aniversário e quer repor a mesma data fica travado até 365 dias: PO confirmar | `profile.rules.ts` | PO |
| Testes de repository Drizzle (filtro `approved`, ordem, lock) contra Postgres de verdade, hoje só validados à mão | `apps/api` | 5 |
| Índice `(status, name, id)` para a ordem da vitrine, se passar de centenas de lojas | `shops` | 5 |
| Rotação da chave de cifra de PII (prefixo de versão no payload) | `pii.service.ts` | 5 |

## Decisões registradas

- **Histórico de loja suspensa:** a caderneta do cliente continua mostrando o histórico (é dado dele);
  o cartão some da carteira e do `getCard` enquanto a loja não estiver `approved`. PO confirma.
- **Migrations 0002/0003:** o índice do ledger por cliente nasceu sem `id` e foi refeito na 0003.
  Ambas já estão aplicadas no projeto `lagoa-`; não se reescreve histórico aplicado.
- **Contrato do ledger (fase 4, com o Caio):** `occurred_at` usa `now()` da transação, então visita e
  boas-vindas gravadas juntas têm o mesmo instante e o desempate é o `id` (UUID v7, ordem de inserção).
  O serviço de ledger insere as **boas-vindas antes da visita**, para ficarem nas casas 1 e 2.

## Pontos de contato com o Caio

| Item | Quando |
|---|---|
| Padrão de módulo (`CLAUDE.md`) e `shared/` como contrato | já vale |
| Serviço de ledger (escrita) | desenhar no início da fase 4 |
| Validação de resgate no Balcão | fase 5 |
| Aprovação de loja (`Shop.status`) | em aberto no modelo |
