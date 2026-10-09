# @lagoa/api

API do Lagoa+ (NestJS + Drizzle sobre o Postgres do Supabase). Cobre a superfície do **cliente**
(`src/customer/*`) e do **lojista** (`src/merchant/*`).

Regras de código, glossário e LGPD: [`CLAUDE.md`](../../CLAUDE.md). Modelo de dados:
[`docs/database-model.md`](../../docs/database-model.md). Plano e decisões:
[`docs/specs/api-customer/plan.md`](../../docs/specs/api-customer/plan.md) e [`docs/plans/2026-10-05-api-merchant.md`](../../docs/plans/2026-10-05-api-merchant.md). Como o front consome:
[`frontend-integration.md`](../../docs/specs/api-customer/frontend-integration.md).

## Rodar

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # preencher (ver abaixo)
pnpm dev:api                              # http://localhost:3333, recarrega ao salvar
pnpm test:api                             # unidade + HTTP (integração é pulada sem banco)
pnpm typecheck:api && pnpm build:api
```

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Postgres (pooler do Supabase). Credencial de servidor: nunca vai ao front. |
| `SUPABASE_URL` | Origem do projeto; o JWT é validado pelo JWKS público em `/auth/v1/.well-known/jwks.json`. |
| `PII_ENCRYPTION_KEY` | 32 bytes em base64 (`openssl rand -base64 32`). Cifra celular e e-mail. **Perdeu = perdeu os dados cifrados.** |
| `PII_HASH_PEPPER` | Segredo do HMAC de busca por celular/e-mail. Trocar muda todos os hashes. |
| `TRUST_PROXY_HOPS` | Quantos proxies estão na frente (0 local, 1 atrás de um load balancer). Errado = limite pelo IP errado. |
| `BFF_SHARED_SECRET` | Segredo (≥ 32 caracteres) que o BFF do Nuxt manda em `x-bff-secret`. Com ele a API confia no IP do cliente em `x-client-ip` para o limite por IP. |
| `CORS_ORIGIN` | Origens do app, separadas por vírgula. Com o BFF do Nuxt o navegador não chama a API: em produção deixe **vazio** (nenhuma origem liberada). |
| `ALLOW_SEED` | Só em `.env` de banco de dev: libera `pnpm --filter @lagoa/api db:seed`. |

## Estrutura

```
src/
  auth/        guard do JWT (Supabase), @Public(), limite por usuário
  common/      PiiService (AES-GCM + HMAC), filtro de erros, ZodValidationPipe, Clock
  config/      variáveis de ambiente validadas com Zod
  database/    schema Drizzle, tipo Tx, seed
  ledger/      LedgerStore (única porta de escrita), RedemptionLookup, ReferralSettlement
  programs/    regra "achatada" do banco -> ProgramRules/ExpirationPolicy do shared
  shops/       loja + clube já validados (Descobrir e Carteira)
  customer/    superfície do cliente: profile, registration, session, discover, wallet,
               check-in, redemption, referral
  merchant/    superfície do lojista: session, club-setup, visit-qrs, counter, program,
               customers, home
drizzle/       migrations versionadas
```

Fluxo de uma rota: `controller` (só HTTP: valida com `ZodValidationPipe`, devolve `unwrap(result)`) →
`service` (orquestra, devolve `Result<T, DomainError>`) → `*.rules.ts` (decisão pura) → `repository`
(classe abstrata = contrato; `Drizzle*` = I/O). Tipos, schemas e a regra de negócio comum com o front vivem
em `shared/`.

## Rotas

Prefixo `/v1` (menos `/health`). Todas exigem `Authorization: Bearer <JWT do Supabase>`, exceto `/health`.

### Cliente

| Método e rota | O que faz |
|---|---|
| `POST /customer/registration` `{ phone }` | Cria o cliente (e-mail vem do token). Idempotente. |
| `GET /customer/session` | `CustomerSession`; `404 notFound` = login sem cadastro. |
| `GET/PUT /customer/profile` | Perfil (celular mascarado); nome e aniversário (trava de 365 dias). |
| `PUT /customer/profile/consent` `{ granted }` | Consentimento de avisos. |
| `POST /customer/profile/terms` | Aceite dos termos (grava a versão). |
| `GET /discover/shops`, `/discover/challenges` | Vitrine (só lojas aprovadas); desafios vazios no MVP. |
| `GET /wallet/cards`, `/wallet/cards/:shopId` | Cartões (ordenados pelo prêmio), saldo já com vencimento aplicado. |
| `GET /wallet/activity?limit`, `/wallet/rewards?limit` | Caderneta e resgates entregues. |
| `POST /check-in` `{ token }` (ou `{ code }`) + `Idempotency-Key` opcional | Carimbo pelo token do QR da visita dinâmico ou código da loja. |
| `POST /redemptions` `{ cardId }`, `GET /redemptions/:id` | Código de resgate (6 caracteres, 10 min) e seu estado. |
| `GET /referrals/me`, `POST /referrals` `{ referralCode, shopCode }` | Código do indicador; guarda o convite do link (204 sempre). |

### Lojista (Painel / Balcão)

| Método e rota | O que faz |
|---|---|
| `GET /merchant/session` | `MerchantSession` da loja do lojista. |
| `POST /merchant/club-setup` | Cria loja e programa do clube de fidelidade (`pending`). |
| `GET /merchant/poster` | Dados para impressão do cartaz com QR code da loja. |
| `GET /merchant/shop/status` | Situação da loja (`pending`, `approved`, `suspended`). |
| `POST /merchant/shop/test-approve` | Aprovação rápida de loja em ambiente de teste/dev. |
| `POST /merchant/visit-qrs` `{ amountCents? }` | Emite QR dinâmico de visita (token opaco de uso único). |
| `GET /merchant/visit-qrs/:id` | Consulta estado, claim e dados do cliente mascarados. |
| `POST /merchant/visit-qrs/:id/cancel` | Cancela QR dinâmico ativo de forma idempotente. |
| `GET /merchant/program` | Consulta o programa de fidelidade ativo da loja. |
| `PUT /merchant/program` | Altera programa ou cria nova versão ativa (invalida QRs abertos). |
| `GET /merchant/counter/entries/today` | Caderneta de movimentações e resgates de hoje no balcão. |
| `POST /merchant/counter/redemptions/validate` `{ code }` | Valida código de resgate de 6 caracteres no balcão. |
| `POST /merchant/counter/redemptions/:id/confirm` | Confirma entrega do prêmio e debita saldo do cartão. |
| `GET /merchant/customers?filter=all|lapsed|rewardReady` | Diretório de clientes da loja (dados pessoais mascarados). |
| `GET /merchant/home/summary` (ou `/week-summary`) | Resumo de métricas agregadas dos últimos 7 dias. |

### Erros

O corpo de erro é sempre `{ code, ... }`; `code` é o `DomainError` do `shared` que o front traduz
(`errors.<code>` no `pt-BR.json`). Extras sem `DomainError`: `validation` (400, com `issues[{path, code}]`, nunca o
valor), `rateLimited` (429), `routeNotFound` (404), `internal` (500, sem detalhe). Atenção: `checkInCooldown` também é
429 — o front distingue pelo `code`, não pelo status.

## Segurança (resumo)

- Rota autenticada por padrão; só ES256/RS256; toda query filtra pelo `user.id` do JWT, nunca por id do cliente.
- Celular e e-mail cifrados em repouso (AES-256-GCM, payload com versão da chave) e indexados por HMAC com pepper;
  só saem mascarados; nunca em log, URL ou erro. RLS ligado em todas as tabelas, sem policy pública.
- `helmet`, CORS por origem, limite de requisições por usuário e por IP (rotas sensíveis mais curtas).
- Antifraude e códigos decididos no servidor, em transação com lock de linha. Escrita só pelo `LedgerStore`.
- **Termos:** `POST /check-in`, `POST /redemptions` e `POST /referrals` respondem `403 termsNotAccepted` até o cliente
  aceitar a versão atual (`TERMS_VERSION` em `shared/constants/domain.ts`); subir a versão pede novo aceite.
- **Operação:** em `NODE_ENV=production` a API não sobe sem `TRUST_PROXY_HOPS` e com `SUPABASE_URL` sem https. Com mais de uma
  instância o limite de requisições (em memória) se multiplica: use armazenamento compartilhado. Configure
  `statement_timeout`/`lock_timeout` no papel do banco (o pooler do Supabase recusa parâmetros de conexão).
  Requisição com token inválido é barrada antes do limite (custo baixo, JWKS em cache); proteja a borda
  (WAF/CDN) contra flood. Rotação da chave de PII: o payload cifrado leva a versão da chave (`KEY_VERSION`), então a
  rotação é aditiva (acrescentar a versão 2 ao `PiiService` e recifrar), sem quebrar o que já está gravado.

## Banco e migrations

Schema em `src/database/schema`. Mudou? `pnpm --filter @lagoa/api db:generate --name <nome>` e revise o SQL em
`drizzle/`. Aplicar: `pnpm --filter @lagoa/api db:migrate` (com `DATABASE_URL`) **ou** pelo MCP do Supabase
(`apply_migration`) com o mesmo SQL. Migration aplicada não se reescreve: corrija com uma nova. Armadilha: índice
`DESC` do Drizzle é `NULLS LAST`; a consulta precisa de `order by ... desc nulls last` (ver `CLAUDE.md`).

## Testes

- Unidade e HTTP: repositório falso, rodam sempre.
- Integração (`*.integration.test.ts`): Postgres de verdade, só com `TEST_DATABASE_URL`. Cada teste cria os dados
  que usa e apaga no fim (`TestDatabase`). No CI sobe um `postgres:17`, aplica as migrations e roda tudo.
  Local: `TEST_DATABASE_URL=$DATABASE_URL pnpm test:api` **só contra banco de dev**.

## Painel do lojista (Balcão)

Organizado em módulos focados em `src/merchant/*`:
- `session`: sessão e associação do usuário lojista com sua loja.
- `club-setup`: criação da loja e regras iniciais do clube, cartaz e aprovação.
- `visit-qrs`: emissão e ciclo de vida do Dynamic Visit QR (token opaco de 43 caracteres, 5 min TTL).
- `program`: governança do programa com trava de modo e invalidação automática de QRs ativos.
- `counter`: consulta da caderneta de hoje e validação/entrega atômica de resgates.
- `customers`: diretório de clientes da loja com mascaramento obrigatório LGPD (`(XX) X••••-XXXX`) e filtros.
- `home`: métricas agregadas da semana via função de domínio `summarizeWeek`.

