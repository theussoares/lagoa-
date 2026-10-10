# API do painel do lojista: handoff

Estado em **2026-10-10**. Spec: [spec.md](./spec.md) (aprovada pelo dono). Desenho:
[solution-design.md](./solution-design.md) (aprovado com ajustes do CTO, seção "R"). Plano: [plan.md](./plan.md).

## Decisão de produto (confirmada com o dono)

- **Ganhar é só pelo Balcão.** Na venda, o lojista gera um QR da visita (código curto de 5 caracteres para digitar),
  uso único, 5 min. Carimbos e pontos por visita rendem o valor fixo do programa; pontos por real, o valor digitado
  fica preso no QR.
- **QR do cartaz (`?loja=`) só entra no clube:** cartão zerado, não rende.
- P-M1 a P-M6 aceitas: trava de modo cai (versão do programa), loja suspensa só lê, 20 QRs ativos por loja,
  lembrete = aviso no app + presente no cartão, campanha só para Fundador Pro, aprovação por script.

## Onde estamos

| Fase | Situação | Onde |
|---|---|---|
| BFF + login do lojista | Feito | `develop` (#49) |
| Fundação (`0019`) + M1 Criar o clube (`0020`) | Feito | `develop` (#50, #51) |
| M2 Balcão (QR da visita, resgate, `0021`) | Feito | `develop` (#52) |
| M3 Programa + mecanismo do termo | Feito, gate desligado | `develop` (#53) |
| Pendências do piloto (`isSameProgram`, rascunho do termo, Playwright de fumaça) | Feito | `develop` (#54) |
| Tela de aceite do termo + Campanhas escondida | Feito | `feat/mvp-pilot-ready` |
| M4 Início e Clientes | API e BFF existem (do #43), **sem o endurecimento da 4.2/4.3** | `develop` |
| M5 Campanhas | Não existe na API nem no BFF; **escondida no piloto** (decisão do dono, 2026-10-10) | — |
| M6 Corte do mock | Não começou (não bloqueia) | — |

- Painel do lojista roda na API real por padrão (`merchantBackend = 'http'`); o mock só com
  `NUXT_PUBLIC_MERCHANT_BACKEND=mock`.
- **Testes de integração rodam no CI** contra Postgres 17 (`.github/workflows/ci.yml`: migrations, paridade `--exact`,
  `TEST_DATABASE_URL`). O bloqueio antigo "sem Postgres" acabou.
- `main` está no release #45 (até a `0018`). **Os PRs #49 a #53 (42 commits) estão só na `develop`.**
- **Produção (Supabase `lagoa-`, sa-east-1):** 19 migrations aplicadas, a última é `0018_shop_assets_bucket`.
  Faltam `0019`, `0020` e `0021`. Nenhuma loja cadastrada (checado em 2026-10-10).

## O que falta para começar os testes do piloto

Teste do piloto = lojistas e clientes de verdade em Três Lagoas, no ambiente de produção.

### Bloqueia (fazer antes do primeiro lojista)

1. ~~#54~~ feito.
2. ~~Campanhas~~ escondida no `http` (menu, botão do Início e rota redirecionam para `/painel`; `useCampaignsEnabled`).
   Volta com `NUXT_PUBLIC_CAMPAIGNS_ENABLED=true` quando a M5 existir.
3. **Termo do lojista:** feito no código. A sessão traz `termsAccepted`; o Início mostra o termo (versão limpa do
   [rascunho](./termo-lojista-rascunho.md), `merchantTerms.*`, versão `2026-10-pilot`) e grava o aceite. Em produção,
   ligar `MERCHANT_TERMS_REQUIRED=1` na API. **Decisão do dono:** o piloto usa o rascunho sem revisão jurídica; o texto
   revisado entra com versão nova (todo lojista aceita de novo). Ficaram de fora do texto as lacunas do rascunho
   (encarregado/DPO, canal de atendimento, prazos de cancelamento e aviso). Junto: revisar o termo do cliente (P-17).
4. **Release `develop` → `main`** com CI verde.
5. **Banco de produção:** `pnpm --filter @lagoa/api db:migrate:prod` (aplica `0019`–`0021`; exige o banco de teste
   igual ao repo e os testes passando nele). Logo depois do deploy da API: `db:backfill-visits` (zero lojas hoje, mas
   roda por garantia). Nada de MCP nem SQL à mão.
6. **Deploy e variáveis** (API e web na Vercel), conferir uma a uma:
   - API: `NODE_ENV=production`, `TRUST_PROXY_HOPS`, `SUPABASE_URL` https, `PII_ENCRYPTION_KEY`, `PII_HASH_PEPPER`,
     `COMTELE_AUTH_KEY`, `SEND_SMS_HOOK_SECRET`, `BFF_SHARED_SECRET`, `CORS_ORIGIN` vazio, **`ENABLE_TEST_APPROVE=0`**,
     sem `ALLOW_SEED`/`ALLOW_DEV_VISIT_QR`.
   - Web: `NUXT_API_BASE_URL`, `NUXT_SUPABASE_ANON_KEY` (nunca a service_role), `NUXT_BFF_SHARED_SECRET` igual ao da
     API, `NUXT_PUBLIC_SUPABASE_URL`, sem `NUXT_PUBLIC_MERCHANT_BACKEND=mock` e sem `NUXT_PUBLIC_CAMPAIGNS_ENABLED`.
   - API: `MERCHANT_TERMS_REQUIRED=1`.
   - Vercel: deploy automático só em `main`, `develop` e `stable` (`git.deploymentEnabled` nos três `vercel.json`).
   - Supabase: hook Auth > Send SMS apontando para `POST /v1/auth/hooks/send-sms` com o segredo; saldo na Comtele.
   - Site (`apps/site`): `NUXT_PUBLIC_APP_URL` do Balcão de produção no `generate`.
7. **Ensaio ponta a ponta em celular real** (não existe e2e com sessão; o Playwright do #54 é só fumaça sem login).
   Roteiro mínimo, com um lojista e um cliente de teste:
   1. Lojista entra por SMS → Criar o clube → loja aprovada por `shop:status` (`ALLOW_SHOP_ADMIN=1`, `--actor`).
   2. Imprime o cartaz; cliente escaneia `?loja=`, faz cadastro/LGPD e entra no clube (cartão zerado).
   3. Balcão gera QR da visita; cliente escaneia (e outro, digitando o código curto) → carimbo; Balcão mostra `claimed`.
   4. Antifraude: segunda visita na janela é recusada e não consome o QR; QR vencido (5 min) e cancelado recusam.
   5. Modo pontos por real com valor preso; troca de programa com cartão em andamento (cartão segue na versão antiga,
      QR vivo vira `visitQrStale`).
   6. Completa o cartão → resgate pelo código → Balcão valida e confirma; código usado/vencido explica o motivo.
   7. Início e Clientes mostram os números e o celular mascarado; "Hoje" no dia local.
   8. Cliente apaga a conta → Balcão mostra "Cliente removido"; dono tentando apagar a conta recebe `accountOwnsShop`.

### Pode esperar o começo do piloto (antes de escalar)

- **Clientes (4.3):** a lista sai **sem `limit` nem paginação** (`drizzle-customers.repository.ts`), contra a regra do
  `CLAUDE.md`. Aguenta o volume das primeiras lojas; fazer keyset com `cardId` antes de crescer. Junto, 4.2 (Início por
  `startOfLocalDay` com paridade de `summarizeWeek`) e CA-16/17/18.
- `@CurrentShop()` nos services (hoje resolvem por `user.id`; o guard já barra rota sem loja).
- Mock de programa ainda aplica no lugar (sem versionar); some com a M6.
- Contrato `visitQrService.contract` rodando também contra o `HttpVisitQrService`.
- `from_plan` em `shop_status_events` (migration nova).
- Telas do QR e do "entrou no clube" sem design dedicado (passar pelo `design-system/lagoa/MASTER.md`).
- Cobrança: plano é só `shops.plan` via script; pagamento fica fora do sistema no piloto. Admin da rede não tem tela.

## Riscos aceitos

- **Celular informado sem SMS** (dono, 2026-10-09): quem entra por e-mail e informa o celular de um lojista faz esse
  lojista receber `409 phoneAlreadyUsed` no Criar o clube. Solução futura: `app_users.phone_verified`.
- Contador de limite com janela fixa (pico até 2× na virada); respostas distintas no código curto revelam que um código
  existiu (ADR-0002, handoff do QR).

## Pontos de atenção

- Toda escrita de saldo passa pelo `LedgerStore`; resgate por `RedemptionLookup` + `settleRedemption`.
- A loja sai sempre do JWT (guard + `@MerchantSurface()`); nenhuma rota recebe `shopId`.
- Celular só mascarado, decifrado em lote no service. Token do QR e código de resgate nunca em log.

## Próximo passo (nova sessão)

1. Merge de `feat/mvp-pilot-ready` na `develop`, release → `main`.
2. `db:migrate:prod`, `db:backfill-visits`, variáveis e deploy.
3. Ensaio do roteiro acima, incluindo o aceite do termo no Início antes de gerar o primeiro QR.
