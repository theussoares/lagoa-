# API do painel do lojista: spec

Estado: aprovada pelo dono, 2026-10-09. Desenho: [solution-design.md](./solution-design.md). Plano:
[plan.md](./plan.md). Handoff: [HANDOFF.md](./HANDOFF.md).

## Problema

O painel do lojista (`/painel`, `/balcao`, `/programa`, `/clientes`, `/campanhas`, `/configuracoes`) roda só
sobre o mock do navegador (`localStorage`). Sem API do lojista:

- o Balcão não emite QR da visita de verdade, então **nenhum cliente real ganha carimbo** (o ganho agora é só
  pelo QR da visita, [spec do QR](../dynamic-visit-qr/spec.md));
- o lojista não entrega prêmio (o resgate do cliente gera código, mas ninguém confirma);
- não há loja real: o Criar o clube grava no navegador.

**O piloto não vai ao ar sem isto.**

## Objetivo

Trocar o mock do painel por `apps/api/src/merchant/*`, atrás do BFF do Nuxt, mantendo os contratos de
`shared/` e as interfaces de service do front (`layers/merchant/app/services`). Fora o que esta spec muda de
propósito (seção "Mudanças de contrato"), a tela não percebe a troca.

## Fora do escopo

- Tela do admin da rede (aprovação, planos, métricas). A aprovação sai por script interno (RN-03).
- Cobrança e plano no sistema (Fundador/Fundador Pro continuam combinados fora).
- Equipe da loja (mais de um login por loja) e mais de uma loja por lojista.
- Upload de logo.
- Envio real de lembrete por SMS/push (ver P-M4).

## Atores

- **Lojista (dono):** usuário do Supabase que entrou pelo celular e é `shops.owner_user_id` de uma loja.
- **Cliente:** já atendido pela API do cliente; aqui só aparece mascarado.
- **Rede:** aprova a loja (por script no MVP).

## Regras de negócio

**Conta e acesso**

- **RN-01** O lojista entra com o mesmo login por SMS do cliente (`/api/auth/*`, cookie `lagoa_at`). A mesma
  pessoa pode ser cliente e lojista: é o mesmo usuário do Supabase.
- **RN-02** Lojista = dono de uma loja. No MVP, **1 loja por usuário** e **1 usuário por loja** (o dono).
  Toda rota do lojista resolve a loja pelo `user.id` do JWT; nenhuma rota recebe `shopId` do cliente.
- **RN-03** Loja nasce `pending`. A rede aprova (`approved`) ou suspende (`suspended`) por script interno
  auditável (`pnpm --filter @lagoa/api shop:status <shopId> <status>`), até existir a tela do admin.
- **RN-04** Loja `pending` ou `suspended` **lê** o painel (Início, Programa, cartaz, Clientes, Campanhas) e
  **edita o Programa**, mas **não mexe com cliente**: emitir QR da visita, validar/entregar resgate e mandar
  campanha respondem `shopPendingApproval` / `shopSuspended` (mesma regra do mock, `requireOperationalShop`).
- **RN-05** Login de lojista com loja `suspended` entra e vê o aviso; não é barrado no login (muda o mock, que
  barrava). Motivo: o lojista precisa ver o cartaz, os clientes e falar com a rede.

**Criar o clube**

- **RN-06** Usuário logado sem loja vê o Criar o clube. Loja e programa nascem juntos numa transação
  (`ClubSetupDraft`), com `checkInCode` único gerado no servidor. O ticket de cadastro (`SignUpTicket`) deixa
  de existir: o JWT já prova o celular.
- **RN-07** Criar o clube cria o `app_users` se a pessoa ainda não for cliente (celular do JWT, cifrado e com
  hash, como no cadastro do cliente). Não cria `customer_profiles`.
- **RN-08** Segunda tentativa com loja já criada (duas abas, duplo clique) devolve a sessão da loja existente,
  sem criar outra (idempotente por dono).

**Balcão**

- **RN-09** QR da visita: emitir, consultar e cancelar seguem a [spec do QR](../dynamic-visit-qr/spec.md)
  (RN-01 a RN-22 de lá). `issued_by` = usuário do JWT. QR de outra loja responde `notFound` (entity `visitQr`).
- **RN-10** Limite de QRs ativos por loja (P-05 da spec do QR): **20** ao mesmo tempo
  (`VISIT_QR_ACTIVE_MAX_PER_SHOP`). Acima disso, `visitQrLimitReached`; o lojista cancela um ou espera vencer.
- **RN-11** Validar resgate: o lojista digita o código de 6 caracteres; código de outra loja = inexistente
  (`redemptionInvalid`). A prévia mostra prêmio, celular **mascarado** e validade. Validar não consome nada.
- **RN-12** Confirmar entrega: débito da meta no ledger, cartão recomeça (com boas-vindas se ligada), uma vez
  só. Toda a regra já existe em `LedgerStore.settleRedemption`; confirmar duas vezes devolve
  `redemptionAlreadyUsed`.
- **RN-13** Validação de código é tentativa de adivinhação em potencial: limite por loja e por usuário, **falha
  fechado** (se o contador cair, recusa).
- **RN-14** "Hoje no Balcão" lista as linhas da caderneta da loja do dia local do piloto
  (`America/Campo_Grande`), mais nova primeiro, só tipos de balcão (`visit`, `amount`, `checkIn`, `redemption`),
  celular mascarado, no máximo 100 linhas.

**Programa e prêmios**

- **RN-15** O lojista troca meta, modo, prêmio, regras bônus, expiração e janela antifraude quando quiser.
  Trocar cria uma **nova versão** (`programs.active`): cartões com saldo terminam na versão em que começaram;
  cartão novo, zerado ou recém-resgatado pega a ativa (já implementado no `LedgerStore`).
- **RN-16** Com a versão, a trava de modo (`programModeLocked`) **cai**: trocar carimbo ↔ pontos não prejudica
  quem já tem saldo. A tela troca o aviso de bloqueio por "N clientes terminam o cartão nas regras atuais"
  (`countActiveCards` continua, com o sentido de "cartões com saldo na versão atual"). (P-M1, decidido.)
- **RN-17** Salvar o programa cancela, na mesma transação, todos os QRs da visita ativos da loja com
  `cancelReason = programChanged` (RN-15 da spec do QR).
- **RN-18** Salvar sem mudança nenhuma não cria versão nova (idempotente).

**Início e Clientes**

- **RN-19** Resumo da semana: 7 dias locais (hoje incluso), visitas, clientes distintos, clientes novos (1ª
  visita na loja) e resgates. Só contagens.
- **RN-20** Clientes: lista da loja com celular mascarado, primeiro nome, saldo **efetivo** (vencimento aplicado
  na leitura, `planExpiration`), meta, número de visitas, última visita, sumido (> 30 dias), aceita avisos.
  Filtros `all`, `lapsed`, `rewardReady`. **Paginada** (50 por página, mais recente primeiro); nunca devolve o
  celular inteiro.
- **RN-21** Cartão sem visita (entrou pelo cartaz) aparece como "entrou, sem visita" e não conta como sumido
  (P-07 da spec do QR).

**Cartaz**

- **RN-22** Cartaz do balcão: nome, `checkInCode`, prêmio, unidade e meta da versão ativa.
- **RN-23** Aviso "imprima o cartaz novo" (P-15 da spec do QR): pendente até o lojista marcar como impresso.
  Loja criada depois do QR da visita já nasce com o aviso resolvido.

**Campanhas** (lembrete para sumidos, Fundador Pro)

- **RN-24** Alcance só em números (`ReminderReach`), refeito no envio; se mudou desde a confirmação,
  `reachChanged` e nada sai.
- **RN-25** Só recebe quem tem consentimento **no momento do envio**, está sumido, não venceu e não recebeu
  lembrete da loja nos últimos 30 dias (`reminderEligibility`).
- **RN-26** O presente (`bonusUnits`) entra no cartão como `campaignBonus`, pelo `LedgerStore`, idempotente por
  campanha + cliente; **não conta como visita** (o cliente segue sumido até voltar).
- **RN-27** Histórico das 10 últimas campanhas, sem destinatários.
- **RN-28** Canal de entrega e trava por plano: aviso no app + presente no cartão (P-M4) e só para Fundador Pro
  (`shops.plan`, P-M5).

## Mudanças de contrato (front e `shared/`)

| O quê | Antes | Depois |
|---|---|---|
| `ClubSetupService.createClub` | `(ticket, draft)` | `(draft)`; sessão vem do cookie |
| `AuthService.signInMerchant` | devolve `MerchantSignInResult` (`session` \| `signUp` com ticket) | login por SMS comum + `GET /api/merchant/session` → `MerchantSession` ou `notFound` (vai ao Criar o clube) |
| `SignUpTicket`, `SIGN_UP_TICKET_TTL_MINUTES` | existem | removidos (com o mock) |
| `UpdateProgramError` | `invalidProgram \| programModeLocked` | `invalidProgram` |
| `MerchantCustomersService.listCustomers` | `(filter)` → todas as linhas | `(filter, cursor?)` → `{ rows, nextCursor }` |
| `IssueVisitQrError` | — | `+ visitQrLimitReached` |
| Login com loja suspensa | `shopSuspended` no login | entra; Balcão recusa (RN-05) |
| `MerchantCustomerRow` | `customerId` | `cardId` (o id do cliente é global e cruzaria lojas; R4 do CTO) |
| `CounterEntry.maskedPhone` | sempre presente | nulo quando o cliente apagou a conta ("cliente removido"; R8) |
| `ValidateRedemptionError` (confirmar) | — | `+ rewardNotReady` (R11) |
| Erros novos | — | `accountOwnsShop` (dono apagando a conta de cliente, 409; R9), `merchantTermsNotAccepted` (R14) |

## Critérios de aceite

**Acesso**
- **CA-01** Sem cookie, toda rota `/api/merchant/**` responde 401; o painel manda para o login.
- **CA-02** Usuário sem loja: `GET /api/merchant/session` → 404 `notFound` (entity `shop`); a tela abre o
  Criar o clube.
- **CA-03** Usuário A nunca lê nem altera nada da loja de B: teste de IDOR em todas as rotas com dois lojistas
  (QR, resgate, clientes, programa, campanha).
- **CA-04** Loja `pending`: emitir QR, validar resgate e mandar campanha → 403 `shopPendingApproval`; ler e
  editar programa → 200.

**Criar o clube**
- **CA-05** Criar o clube com draft válido → 201 `MerchantSession` com `shopStatus = pending`; `shops`,
  `programs` (ativa) e, se preciso, `app_users` criados na mesma transação. Draft inválido → 400, nada gravado.
- **CA-06** Duas chamadas concorrentes do mesmo usuário → uma loja só; as duas respondem a mesma sessão.
- **CA-07** Cliente existente que cria clube mantém o mesmo `app_users` (sem `phoneAlreadyUsed`).

**Balcão**
- **CA-08** Emitir QR (modo carimbos) → 201 com `token` e `visitCode`; o banco guarda só o hash; o cliente usa o
  token pela API do cliente e o `GET` do QR passa a `claimed` com o recibo mascarado.
- **CA-09** 21º QR ativo → 409 `visitQrLimitReached`.
- **CA-10** Cancelar QR `claimed` → 200 com o estado `claimed` (não desfaz o ganho).
- **CA-11** Validar código certo → `RedemptionPreview`; de outra loja → `redemptionInvalid`; vencido →
  `redemptionExpired`; após o limite de tentativas → 429 `rateLimited`.
- **CA-12** Duas confirmações simultâneas do mesmo resgate → uma `CounterEntry`, a outra
  `redemptionAlreadyUsed`; o ledger tem um débito só.
- **CA-13** "Hoje" mostra o resgate confirmado e a visita do QR, mais nova primeiro, só do dia local.

**Programa**
- **CA-14** Salvar programa alterado → nova versão ativa, anterior inativa, QRs ativos cancelados com
  `programChanged`, cartão com saldo continua na versão antiga (teste de integração).
- **CA-15** Salvar o mesmo programa → mesma versão, nenhum QR cancelado.

**Início e Clientes**
- **CA-16** Resumo da semana bate com o `summarizeWeek` do `shared` para o mesmo ledger (teste de paridade).
- **CA-17** Clientes paginado: 120 cartões → 3 páginas sem repetição nem buraco; saldo vencido aparece zerado;
  nenhuma resposta tem 11 dígitos de celular.

**Desempenho e LGPD**
- **CA-18** `EXPLAIN (ANALYZE)` com volume (300 lojas, 20 mil clientes, 300 mil linhas de ledger): toda consulta
  do lojista < 10 ms e por índice.
- **CA-19** Nenhum log, erro ou URL do painel carrega celular, e-mail, token de QR ou código de resgate.

## Decisões do dono do produto

Aceitas as recomendações em 2026-10-09 (P-M7 segue com o jurídico).

| # | Pergunta | Decisão |
|---|---|---|
| P-M1 | Com versão de programa, a trava de modo cai? | Sim (RN-16). |
| P-M2 | Loja suspensa entra no painel? | Sim, só leitura para o cliente (RN-05). |
| P-M3 | Limite de QRs ativos por loja | 20 (RN-10). |
| P-M4 | Como o lembrete chega ao cliente? | Piloto: aviso no app (carteira) + presente no cartão, sem custo. SMS (Comtele já integrado) só depois, com teto por loja/mês e custo no plano Pro. |
| P-M5 | Campanhas só para Fundador Pro? Onde marcar o plano? | Coluna `shops.plan` (`founder` \| `founderPro`), setada pelo mesmo script da aprovação; campanha exige `founderPro`. |
| P-M6 | Aprovação por script basta para o piloto? | Sim, com log de quem rodou (RN-03). Tela do admin depois. |
| P-M7 | Termos de uso do lojista | Precisa de aceite próprio (contrato do lojista, LGPD: a loja é controladora dos dados dos clientes dela?). Jurídico. Não bloqueia código; bloqueia o piloto. |
