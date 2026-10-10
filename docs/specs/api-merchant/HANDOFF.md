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

## Atualização (2026-10-09, PR do BFF do lojista)

O estado abaixo ("Nenhum código") estava defasado: a `develop` já tinha os módulos `merchant/*` da API (PR #43) com
migrations `0017`/`0018` **diferentes** das do plano (a próxima livre é a `0019`). Entregue depois: BFF
`server/api/merchant/**`, login/sessão do lojista pelo `/api/auth` + `GET /merchant/session` (sem ticket) e o plugin
escolhendo `http`/`mock` (`merchantBackend`). **Segue pendente:** guard de acesso (`merchant/access`), `erased_at`,
`shops.plan`, termo do lojista, `shop_status_events`/`shop:status`, `accountOwnsShop`, campanhas (M5) e o corte do mock (M6).
O `club-setup` da API devolve `invalidClubSetup` (não é idempotente) quando o dono já tem loja; o plano pede 200 com a loja
existente (RN-08, CA-06).

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
