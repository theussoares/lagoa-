# API do painel do lojista: handoff

Estado em 2026-10-09. Spec: [spec.md](./spec.md) (aprovada pelo dono). Desenho:
[solution-design.md](./solution-design.md) (**aprovado com ajustes pelo CTO**, seção "R" no topo). Plano:
[plan.md](./plan.md).

## Decisão de produto (confirmada com o dono)

- **Ganhar é só pelo Balcão.** Na venda, o lojista gera um QR da visita (com código curto de 5 caracteres
  para digitar), uso único, 5 min. Carimbos e pontos por visita: rende o valor fixo do programa. Pontos por
  real: o lojista digita o valor e ele fica preso no QR.
- **QR do cartaz (balcão/mesa, `?loja=`) só entra no clube:** cartão zerado, não rende. Sem conta, passa antes
  pelo login/cadastro do cliente.
- Decisões P-M1 a P-M6 aceitas conforme recomendação: trava de modo cai (versão do programa), loja suspensa
  entra só para ler, 20 QRs ativos por loja, lembrete = aviso no app + presente no cartão, campanha só para
  Fundador Pro (`shops.plan`), aprovação por script.

## Atualização (2026-10-09, PRs #49, #50 e #51)

O handoff original ("Nenhum código", abaixo) estava defasado: a `develop` já tinha os módulos `merchant/*` da API
(PR #43) com migrations `0017`/`0018` **diferentes** das do plano (as próximas livres são `0019` e `0020`).

**Entregue:**
- BFF `server/api/merchant/**`, login/sessão do lojista pelo `/api/auth` + `GET /merchant/session` (sem ticket) e plugin
  escolhendo `http`/`mock` (`merchantBackend`).
- Fundação do CTO: `0019_merchant_foundation` (dono único, `shops.plan`, termo do lojista, `erased_at`,
  `visits_count`/`first_visit_at` com backfill, `shop_status_events`), seed com um dono por loja, `LedgerStore.credit`
  mantendo os contadores, `merchant/access` (guard + `@CurrentShop` + varredura + teste que monta o `MerchantModule`),
  `accountOwnsShop`, `shop:status` (com `--dry-run`) e `db:backfill-visits` (cartão a cartão, com lock).
- M1: `ensureAppUser` extraído (sem ele o Criar o clube dava FK violation para quem só tinha login), Criar o clube
  idempotente (201/200), `phoneAlreadyUsed`, retry do código de check-in, limite de 5/h, e-mail do token nunca gravado,
  recusa de conta apagada; `0020_poster_reprinted_at` e o aviso do cartaz ponta a ponta.

**Fica para a M2 em diante (achados do code-reviewer):**
- Balcão "Hoje" com conta apagada: `CounterEntry.maskedPhone` nulo (R8; hoje o decifrar lança e dá 500).
- `@CurrentShop()` nos services (hoje seguem por `user.id`; o guard já barra rota sem loja).
- `from_plan` em `shop_status_events` (exige migration nova).
- Gate do termo do lojista (3.6), índices de Clientes e de resgate, campanhas (M5), corte do mock (M6).

**Risco aceito (decisão do dono, 2026-10-09):** o celular que um cliente *informa* no cadastro (entrando por e-mail, sem
SMS) não é verificado. Quem fizer isso com o número de um lojista faz esse lojista receber `409 phoneAlreadyUsed` no
Criar o clube; e quem se cadastrou assim e depois cria clube com outro celular fica com o primeiro em `app_users`.
Solução futura: `app_users.phone_verified` e deixar o celular confirmado por SMS substituir o informado (M2+).

## O que está feito (versão original do handoff)

- Spec, solution design (com ajustes do CTO R1–R15) e plano M1–M6. **Nenhum código.** Nada commitado.

## Ajustes do CTO que mais mudam o trabalho

- **R1** O seed tem todas as lojas com o mesmo dono: corrigir o seed (1.0) antes da migration `0017`, que aborta
  se achar dono com duas lojas.
- **R2** Emissão de QR: `FOR SHARE` em loja e programa ativo → advisory lock → expira vencidos → conta com o
  `Clock` da aplicação.
- **R3** `visits_count`/`first_visit_at` nascem **e passam a ser mantidos** na M1 (não na M4).
- **R4** Linha de Clientes usa `cardId`, não `customerId`; cursor com microssegundos; `null` tratado.
- **R7** Limite da validação de resgate é só por usuário (1 dono = 1 loja), falha fechado.
- **R8/R9** Conta apagada: `app_users.erased_at`, "cliente removido" no Balcão; dono não apaga a conta de
  cliente (`409 accountOwnsShop`).
- **R12** Lojista **não** ganha no QR que ele mesmo emitiu (`invalidVisitQr`).
- **R6/M5** Campanhas incluem o lado do cliente no mesmo PR (`GET /v1/customer/notices`, faixa na Carteira).
- **R14** Termo do lojista: mecanismo na M3; o piloto espera só o texto do jurídico (P-M7).

## Próximo passo (nova sessão, Sonnet)

Começar a **M1** numa branch a partir da `develop`, seguindo a tabela da M1 em `plan.md`:

1. Em paralelo: **1.0** (seed com um dono por loja), **1.2** (`ensureAppUser`), **1.6** (`shared`).
2. Depois: **1.1** (migration `0017` completa) → **1.1b**, **1.2b**, **1.3**, **1.5** → **1.4** → **1.7** → **1.8**.
3. **1.9** (integração) e revisão do `code-reviewer` antes do PR.

Ler antes: `CLAUDE.md`, a seção "R" do desenho, `apps/api/README.md` ("Para o painel do lojista").

## Bloqueios e pendências

1. **Postgres para os testes de integração:** sem ele não dá para provar CA-06, CA-12, CA-14 nem o backfill.
   Subir Postgres local (Docker) ou branch do Supabase só para teste (pendência 1 do
   [handoff do QR](../dynamic-visit-qr/HANDOFF.md)). Não rodar integração contra o banco real.
2. **P-M7** termo do lojista: texto com o jurídico; bloqueia o piloto, não o código.

## Pontos de atenção

- Toda escrita de saldo passa pelo `LedgerStore`; resgate já existe (`RedemptionLookup` + `settleRedemption`).
- A loja sai sempre do JWT (resolver + guard em cada controller); nenhuma rota recebe `shopId`.
- Celular só mascarado, decifrado em lote no service. Token do QR e código de resgate nunca em log.
