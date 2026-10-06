# QR dinâmico por visita: só o lojista faz o cliente ganhar

Status: **decidido** (perguntas fechadas no `solution-design.md`, seção 1; RN-14, CA-25 e §9 revistos pelo P-19). Caminhos de front relativos a
`apps/web/`; `shared/` fica na raiz.

Lido antes de escrever: `CLAUDE.md`, `PRODUCT.md`, `docs/database-model.md`,
`docs/specs/api-customer/plan.md`, `apps/api/src/customer/check-in/*`, `apps/api/src/ledger/ledger.store.ts`,
`shared/domain/{antifraud,earning,programStrategies}.ts`, `shared/schemas/visit.ts`,
`shared/constants/domain.ts`, `shared/utils/checkInCode.ts`, Balcão (`useCounterScreen`,
`useCounterLaunchForm`, `CounterService`), mock (`handlers/counter.ts`, `handlers/earning.ts`,
`handlers/campaigns.ts`), check-in do cliente (`useCheckInScreen`, `pages/check-in.vue`) e cartaz
(`utils/posterModel.ts`).

---

## 1. Contexto

Hoje há dois jeitos de ganhar:

| Hoje | Quem age | Onde no código |
| --- | --- | --- |
| **Check-in**: cliente escaneia o QR fixo do cartaz (`/check-in?loja=<checkInCode>`) e ganha 1 visita sozinho | cliente | `POST /v1/check-in` → `CheckInService` → `decideCheckIn` → `planEarning` → `CheckInRepository.record` (LedgerStore) |
| **Lançar visita**: lojista digita o celular no Balcão e dá 1 visita ou lança por valor; cliente novo ganha cartão na hora | lojista | mock `registerVisit` (`handlers/counter.ts`); ainda não há `merchant/*` na API |

Problemas que motivam a mudança (decisão do dono do produto):

- O QR fixo fica exposto no balcão: qualquer pessoa com uma foto do cartaz ganha carimbo sem comprar,
  limitada só pela janela antifraude.
- Pontos por real não funcionam no check-in (`checkInDisabled`): só o Balcão sabe o valor.
- Digitar celular no Balcão expõe dado pessoal na frente de outros clientes e depende de celular
  declarado, não verificado (`database-model.md`, "Balcão e celular").

**Decisão:**

1. O **QR da loja** (cartaz fixo, `checkInCode`) passa a **só** colocar o cliente no clube da loja
   (cria o cartão). Não rende carimbo nem ponto.
2. Para ganhar, o lojista gera na hora um **QR da visita** (uso único, validade curta), mostra na tela ou
   imprime, e o cliente escaneia. Só isso rende (carimbo, pontos por visita ou pontos por real).
3. **Lançar visita por celular sai do Balcão.** Quem não tem conta entra pelo QR da loja.

**Premissas aceitas:** QR da visita de uso único, validade de 5 min em constante de `shared/`; a janela
antifraude por cliente/loja continua; no modo pontos por real o lojista digita o valor antes de gerar e o
valor fica preso ao código; regras bônus, `planEarning`, `checkInAvailableAt` e `LedgerStore` continuam
sendo a única conta e a única porta de escrita; toda validação no servidor.

---

## 2. Glossário novo (entra na tabela do `CLAUDE.md` antes de virar código)

| Domínio (pt-BR) | Código (en) | Observação |
| --- | --- | --- |
| QR da loja (cartaz fixo; só entra no clube) | `shopQr` | O código impresso continua `checkInCode` (nome legado, ver P-01). |
| Entrar no clube (pelo QR da loja) | `joinShop` / `shopJoin` | Cria o cartão zerado; não é visita. |
| QR da visita (dinâmico, uso único) | `visitQr` | Gerado pelo lojista para uma venda. |
| Token do QR da visita (vai no QR) | `visitToken` | Opaco, alta entropia, sem dado pessoal. |
| Código curto da visita (digitado) | `visitCode` | Alternativa à câmera; ver P-03. |
| Gerar QR da visita | `issueVisitQr` | Balcão. |
| Usar o QR da visita (cliente) | `claimVisitQr` | Não usar `redeem`: conflita com resgate (`redemption`). |
| Cancelar QR da visita | `cancelVisitQr` | Balcão. |
| Situação do QR da visita | `visitQrStatus` (`active` \| `claimed` \| `expired` \| `cancelled`) | `expired` é derivado de `expiresAt` na leitura. |
| Validade do QR da visita | `VISIT_QR_TTL_MINUTES` | `shared/constants/domain.ts`, valor 5. |
| Parâmetro do link do QR da visita | `VISIT_QR_LINK_PARAM` | Fragmento `/check-in#visita=<token>` (nunca query); ver RN-14. |

Linhas que **mudam de sentido** no glossário atual:

- **Check-in** (`checkIn`): passa a ser "cliente escaneia o **QR da visita** gerado pelo lojista e ganha".
- **Lançar visita** (`visit` / `registerVisit`): deixa de existir como ação do Balcão por celular.
  `visit` continua sendo o tipo de ganho por visita (`EarnInput.kind = 'visit'`).
- **Código da loja (check-in)** (`checkInCode`): passa a ser "código da loja (entrar no clube)".

---

## 3. Superfícies e telas

O design de referência antigo (artefato no `CLAUDE.md`) **não foi consultado nesta spec** (link de artefato
do claude.ai, sem acesso por esta ferramenta). Pelo que existe no código e em `PRODUCT.md`, **não há tela
de QR da visita** nem estado "entrou no clube" no app: são telas/estados novos e precisam de design no
mundo "Carimbo e Caderneta" (`design-system/lagoa/MASTER.md`) antes da implementação.

| Superfície | Tela | Efeito |
| --- | --- | --- |
| Cliente | Check-in (`/check-in`) | Lê os dois QRs: loja → entrar no clube; visita → ganhar. Estados novos: "entrou no clube" e os erros do QR da visita. |
| Cliente | Carimbo ganho | Igual, alimentado pelo QR da visita (inclui pontos por real, que hoje não existe no check-in). |
| Cliente | Carteira / Cartão da loja | Cartão zerado aparece logo após entrar no clube, com dica "peça o QR da visita no caixa". |
| Cliente | Convite (`/convite`) | Continua levando a `/check-in?loja=`; agora termina em "entrou no clube", e a indicação paga na 1ª visita pelo QR da visita. |
| Lojista | Balcão | Formulário de celular sai; entra o painel "Gerar QR da visita" (valor no modo por real), com QR grande, código curto, contagem regressiva, situação e imprimir/cancelar. Resgate e caderneta do dia continuam. |
| Lojista | Criar o clube (passo do cartaz) e cartaz impresso | Texto do cartaz muda: "entre no clube", não "ganhe carimbo". |
| Lojista | Programa e prêmios | `checkInEnabled` perde o sentido atual (RN-17); janela antifraude continua configurável. |
| Lojista | Início, Clientes, Campanhas | Cliente que entrou e ainda não comprou passa a existir (cartão sem visita). Ver P-07. |
| Admin | (sem tela no MVP) | Nenhuma tela nova. Quando houver Métricas da rede: só agregados (entradas no clube, QRs gerados/usados/expirados), sem celular. |

---

## 4. Histórias por superfície

### Cliente

- **H-C1.** Como cliente, escaneio o QR do cartaz da loja e entro no clube dela, para ver o cartão na
  carteira mesmo antes de comprar.
- **H-C2.** Como cliente, ao pagar, escaneio o QR que o lojista me mostra e vejo o carimbo (ou os pontos)
  cair no cartão na hora.
- **H-C3.** Como cliente sem câmera liberada, digito o código curto da visita e ganho do mesmo jeito.
- **H-C4.** Como cliente, se o QR venceu, já foi usado ou não vale, vejo o motivo em pt-BR e o que fazer
  ("peça um novo ao lojista").
- **H-C5.** Como cliente que já ganhou dentro da janela antifraude, vejo a partir de quando posso ganhar de
  novo nesta loja.

### Lojista (Balcão; mock até existir `merchant/*`)

- **H-L1.** Como lojista no modo carimbo ou pontos por visita, gero o QR da visita com uma ação (botão ou
  Enter) e mostro a tela ao cliente.
- **H-L2.** Como lojista no modo pontos por real, digito o valor da compra, vejo quantos pontos ele vale
  (antes de bônus) e gero o QR com o valor preso.
- **H-L3.** Como lojista, vejo a situação do QR mudar sozinha: aguardando → usado (com celular mascarado e o
  que rendeu) ou vencido, sem recarregar a página.
- **H-L4.** Como lojista, cancelo um QR gerado por engano (valor errado, cliente desistiu).
- **H-L5.** Como lojista, imprimo o QR da visita para o cliente escanear depois de pagar.
- **H-L6.** Como lojista, imprimo o cartaz da loja sabendo que ele só serve para entrar no clube.

### Admin

- **H-A1.** (futuro, sem tela) Como admin, vejo por loja e na rede quantos QRs da visita foram gerados,
  usados e vencidos, e quantas entradas no clube viraram 1ª visita. Nada individual.

---

## 5. Regras de negócio

### Entrar no clube (QR da loja)

- **RN-01.** Escanear ou digitar o `checkInCode` de uma loja **aprovada** cria o cartão do cliente nessa
  loja, com saldo 0, na versão ativa do programa, sem linha de ledger que conte como visita. `last_visit_at`
  continua nulo e a janela antifraude não começa.
- **RN-02.** Se o cliente já tem cartão nessa loja, a ação é idempotente: devolve o cartão existente com
  `alreadyMember = true` e não grava nada.
- **RN-03.** Loja pendente ou suspensa responde como código inexistente (`invalidShopQr`), como hoje
  (`findShopByCode` não distingue).
- **RN-04.** Boas-vindas: ver **P-02** (decisão necessária). Recomendação: as boas-vindas continuam caindo
  na **1ª visita** (pelo QR da visita), como `planEarning` já faz (`lastVisitAt === null`). O cartão recém-
  criado mostra "suas N de boas-vindas entram na primeira compra".

### Gerar o QR da visita (lojista)

- **RN-05.** Só dono/equipe de uma loja **aprovada** gera QR da visita. Pendente → `shopPendingApproval`;
  suspensa → `shopSuspended` (mesmos códigos do `CounterService` de hoje).
- **RN-06.** O QR da visita guarda, no servidor: loja, versão do programa ativa na emissão (`programId`),
  quem gerou (`issuedBy`), o tipo de ganho (`visit` ou `amount` + `amountCents`), `createdAt`,
  `expiresAt = createdAt + VISIT_QR_TTL_MINUTES` e a situação.
- **RN-07.** Modo por real: o valor é obrigatório e validado na emissão com as mesmas regras de hoje
  (`invalidAmount`, `AMOUNT_MAX_CENTS`). Modos por visita: não aceita valor (`amountNotAccepted`). O valor
  nunca vem do cliente.
- **RN-08.** O token é aleatório e opaco (sem id de loja, cliente ou valor legível), com entropia suficiente
  para não ser adivinhado; o banco guarda só o hash do token. Tamanho: decisão técnica do time de API
  (recomendação: ≥ 128 bits).
- **RN-09.** Mais de um QR ativo por loja ao mesmo tempo é permitido (duas pessoas no caixa, fila). Limite
  de ativos por loja: `[A DEFINIR]` (P-05).
- **RN-10.** O lojista pode cancelar um QR `active`. Cancelar `claimed` não desfaz o ganho (estorno está
  fora de escopo).

### Usar o QR da visita (cliente)

- **RN-11.** Ordem de decisão no servidor, tudo numa transação com o QR travado (`FOR UPDATE`) e o cartão
  travado pelo `LedgerStore`:
  1. token inexistente, de loja não aprovada ou cancelado → `invalidVisitQr`;
  2. `now >= expiresAt` → `visitQrExpired`;
  3. já usado **por outra pessoa** → `visitQrAlreadyUsed`; já usado **pela mesma pessoa** → devolve o
     resultado gravado (replay, sem escrever de novo);
  4. versão do programa mudou desde a emissão → `visitQrStale` (RN-15);
  5. janela antifraude (`checkInAvailableAt`) → `checkInCooldown` com `availableAt`;
  6. `planEarning` com o `EarnInput` preso ao QR → credita pelo `LedgerStore`, marca o QR `claimed`
     (`claimedBy`, `claimedAt`, `ledgerEntryId`) na mesma transação.
- **RN-12.** Uso único garantido por dois cadeados: o QR travado na transação e a chave de idempotência do
  ledger `visit-qr:<visitQrId>` (única). Duas leituras simultâneas geram exatamente **uma** linha de ganho.
- **RN-13.** Se o cliente não tem cartão na loja, o uso do QR da visita cria o cartão (entra no clube e
  ganha no mesmo passo). O QR da loja não é pré-requisito para ganhar; é a porta de quem ainda não tem conta
  no app ou quer só entrar. (Ver P-06 se o dono quiser obrigar a entrada antes.)
- **RN-14.** O QR da visita é um link `/check-in#visita=<token>` (fragmento, nunca query): a câmera nativa
  abre o app já no check-in. O app lê o fragmento só no navegador e o tira da URL (`router.replace`) antes de
  enviar. O login preserva o fragmento sem passá-lo pelo `?para=`.
- **RN-15.** Programa mudou entre gerar e escanear: o QR é preso à versão ativa da emissão. Trocar o
  programa (nova versão em `programs.active`) **cancela os QRs ativos** da loja; um QR de versão antiga que
  chegar responde `visitQrStale` e o lojista gera outro. Cartão com saldo numa versão anterior continua
  ganhando pela regra da própria versão (`findShopByCode` já resolve isso); ver P-04 para o descompasso de
  modo (cartão antigo por visita × QR novo com valor e vice-versa).
- **RN-16.** Antifraude: recusa por janela **não consome** o QR (o lojista vê "recusado: já ganhou aqui
  até HH:MM" e decide cancelar ou mostrar a outro cliente). Toda visita confirmada conta para a janela,
  como hoje. Consequência a confirmar: duas compras do mesmo cliente no mesmo dia, dentro da janela, só
  rendem uma vez (P-08).
- **RN-17.** `programs.check_in_enabled` deixa de bloquear ganho: o QR da visita é o único caminho de ganho
  e não pode ser desligado sem tirar o clube da loja. Recomendação: reinterpretar como "aceita entrada pelo
  QR do cartaz" ou remover (P-09). Pontos por real deixam de retornar `checkInDisabled`.
- **RN-18.** Ledger: a visita pelo QR grava `kind = 'visit'` ou `'amount'` (é uma venda atestada pelo
  lojista), `recordedBy = issuedBy`, `countsAsVisit = true`, `amountCents` quando houver. `checkIn` fica
  como tipo histórico das linhas antigas (a caderneta continua lendo). Ver P-10.
- **RN-19.** Indicação: depois do commit da 1ª visita pelo QR da visita, chama
  `ReferralSettlement.settlePending` (fora da transação, como o check-in faz). Entrar no clube **não** paga
  indicação (não é visita).
- **RN-20.** Bônus do dia (aniversário, dia surpresa; vale o maior) e prêmio guardado
  (`rewardExpiresAt` em `REWARD_HOLD_DAYS`) saem de `planEarning`, sem cópia. Vencimento por inatividade é
  aplicado pelo `LedgerStore.lockOrCreateCard` antes de creditar, como hoje.

### Balcão

- **RN-21.** O Balcão não tem mais campo de celular para ganho. Validar e confirmar resgate continua
  igual. A caderneta do dia mostra as visitas pelo QR com celular mascarado.
- **RN-22.** O mock (`handlers/counter.ts`) troca `registerVisit(phone, input)` por
  `issueVisitQr(input)`, `getVisitQr(id)`, `cancelVisitQr(id)` e um `claimVisitQr(token, customerId)`
  que usa `planEarning` e `checkInAvailableAt` (mesmas funções do servidor). `ensureCustomer` por celular
  deixa de ser chamado no fluxo de ganho.

---

## 6. Critérios de aceite

Tempos medidos com relógio injetado (`Clock` na API, `ctx.now` no mock). `T0` = `createdAt` do QR.

### Entrar no clube

- **CA-01.** Dado loja aprovada e cliente sem cartão, quando ele envia o `checkInCode` válido, então
  existe 1 cartão novo com `balance = 0` e `last_visit_at = null`, 0 linhas de ledger com
  `countsAsVisit = true`, e a resposta traz `alreadyMember = false`.
- **CA-02.** Dado cliente que já tem cartão, quando envia o mesmo código 3 vezes, então continua com 1
  cartão, 0 linhas novas no ledger e `alreadyMember = true` nas 3 respostas.
- **CA-03.** Dado loja `pending` ou `suspended`, quando o cliente envia o código dela, então recebe
  `invalidShopQr` e nenhum cartão é criado.
- **CA-04.** Dado convite pendente do indicador A para B na loja L, quando B entra no clube de L pelo QR da
  loja, então o convite continua `pending` e A não recebe bônus.

### Gerar

- **CA-05.** Dado loja aprovada no modo carimbo, quando o lojista gera um QR, então a resposta traz
  `expiresAt = T0 + 5 min`, `status = active`, o link `/check-in#visita=<token>` e o código curto; o banco
  não guarda o token em claro.
- **CA-06.** Dado modo pontos por real, quando o lojista gera sem valor ou com valor 0, então recebe
  `invalidAmount` e nenhum QR é criado; com valor acima de `AMOUNT_MAX_CENTS`, idem.
- **CA-07.** Dado modo carimbo, quando o pedido de emissão traz valor, então recebe `amountNotAccepted`.
- **CA-08.** Dado loja `pending` / `suspended`, quando o lojista tenta gerar, então recebe
  `shopPendingApproval` / `shopSuspended`.
- **CA-09.** Dado o Balcão aberto no modo carimbo, quando o lojista aperta Enter (sem clicar), então o QR
  aparece com 1 ação; no modo por real, com valor digitado + 1 ação.

### Usar

- **CA-10.** Dado QR ativo de carimbo e cliente com cartão 3/10 fora da janela, quando ele usa o QR em
  `T0 + 4 min 59 s`, então o cartão vai a 4/10, há 1 linha `visit` com `recordedBy = issuedBy` e o QR fica
  `claimed` com `claimedBy` = cliente.
- **CA-11.** Dado o mesmo QR, quando o uso chega em `T0 + 5 min 0 s`, então a resposta é
  `visitQrExpired` e nada é gravado.
- **CA-12.** Dado QR por real com 4.590 centavos e taxa de 1 ponto por real, quando o cliente usa, então o
  ganho é o que `planEarning({ kind: 'amount', amountCents: 4590 })` devolve, e o corpo da requisição do
  cliente não tem campo de valor (schema Zod rejeita campo extra).
- **CA-13.** Dado dois clientes A e B enviando o mesmo token em paralelo (teste de integração com 2
  requisições concorrentes, repetido 20 vezes), então em todas as rodadas exatamente 1 recebe sucesso, o
  outro `visitQrAlreadyUsed`, e há exatamente 1 linha de ledger com a chave `visit-qr:<id>`.
- **CA-14.** Dado cliente A que já usou o QR, quando A envia o mesmo token de novo, então recebe o mesmo
  resultado (mesmo `activity.id`) e o ledger não muda.
- **CA-15.** Dado cliente com visita confirmada há 1 h e janela de 4 h, quando usa um QR novo, então
  recebe `checkInCooldown` com `availableAt = última visita + 4 h`, o QR continua `active` e o Balcão mostra
  a recusa.
- **CA-16.** Dado QR gerado na versão V1, quando o lojista troca o programa (V2) e o cliente usa o QR de V1,
  então recebe `visitQrStale`, nada é gravado, e o QR aparece `cancelled` no Balcão.
- **CA-17.** Dado loja suspensa depois da emissão, quando o cliente usa o QR, então recebe
  `invalidVisitQr` e nada é gravado.
- **CA-18.** Dado QR cancelado pelo lojista, quando o cliente usa, então recebe `invalidVisitQr`.
- **CA-19.** Dado cliente sem cartão na loja e boas-vindas de 2 ligadas, quando usa um QR de carimbo, então
  o cartão nasce com 2 + 1 = 3 (se P-02 seguir a recomendação) e a indicação pendente dele nessa loja é paga.
- **CA-20.** Dado aniversário do cliente num dia surpresa (ambos 2×), quando usa QR de carimbo, então ganha
  2, não 4.
- **CA-21.** Dado token aleatório que não existe, quando enviado 11 vezes em 1 min pelo mesmo usuário, então
  a 11ª recebe 429 (mesmo limite do check-in de hoje: 10/min por usuário, 60/min por IP).

### Balcão (mock)

- **CA-22.** Dado QR exibido, quando o cliente usa, então o painel troca para "usado" com celular mascarado
  `(67) 9••••-0374` e o que rendeu em até `[A DEFINIR]` s (intervalo de consulta, P-11), e a linha entra na
  caderneta do dia.
- **CA-23.** Dado QR exibido, quando o relógio passa `expiresAt`, então o painel mostra "vencido" sem
  recarregar e oferece "gerar outro" com 1 ação.
- **CA-24.** Dado o Balcão, então não existe campo de celular para ganho (teste de página), e
  `CounterService` não tem mais `registerVisit`/`registerAmount`.

### LGPD

- **CA-25.** Em teste, o conteúdo do QR da visita casa com
  `^https?://[^?#]+/check-in#visita=[A-Za-z0-9_-]{43}$` e o do QR da loja com
  `^https?://[^?#]+/check-in\?loja=[A-Za-z0-9_-]+$`; nenhum dos dois contém dígitos de celular, e-mail, id de
  cliente ou valor. Em teste de middleware, o redirect para `/entrar` de quem abre `/check-in#visita=<token>`
  não leva o token no `?para=`.
- **CA-26.** Em teste de log (como os existentes de redação), emitir, usar, cancelar e recusar um QR não
  escreve celular, e-mail nem token completo em nenhum log.

---

## 7. Casos de borda

| Caso | Comportamento |
| --- | --- |
| QR expirado | `visitQrExpired`; cliente: "Este QR venceu. Peça um novo no caixa." Balcão: "vencido" + gerar outro. |
| QR já usado por outro | `visitQrAlreadyUsed`. O cliente que chegou depois pede outro. Balcão já mostra quem usou (mascarado). |
| Mesmo cliente escaneia duas vezes (duplo toque, rede caiu) | Replay do resultado (RN-11.3), sem duplicar. `Idempotency-Key` continua aceito. |
| Dois clientes escaneiam juntos | Um ganha, outro `visitQrAlreadyUsed` (CA-13). |
| QR da tela fotografado por outra pessoa da fila | Quem usar primeiro ganha. Mitigação: validade de 5 min, uso único, Balcão mostra o celular mascarado de quem usou, lojista cancela/gera outro. Risco residual aceito. |
| Outro lojista | QR é da loja que gerou; lojista de outra loja não lê nem cancela (resposta igual a inexistente). O ganho cai sempre na loja do QR, não importa onde o cliente está. |
| Janela antifraude | `checkInCooldown` com `availableAt`; QR não é consumido (RN-16). |
| Programa mudou entre gerar e escanear | `visitQrStale`; QRs ativos cancelados na troca (RN-15). |
| Cartão antigo (versão por visita) × QR com valor, ou o inverso | Ver P-04. |
| Loja suspensa depois de gerar | `invalidVisitQr` (indistinguível, como hoje). |
| Loja ainda não aprovada | Não gera QR da visita (CA-08); QR da loja responde `invalidShopQr` (CA-03). O cartaz pode ser impresso no Criar o clube, mas só funciona depois da aprovação. |
| Carimbo que vence (inatividade) | `lockOrCreateCard` aplica o vencimento antes de creditar; o cliente vê o saldo já vencido + o ganho. Entrar no clube não renova atividade (não é visita). |
| Prêmio guardado 30 dias | Ganhar com prêmio guardado não mexe no prazo (`planEarning` mantém `rewardExpiresAt`). |
| Código de resgate expirado ou já usado | Fluxo de resgate não muda; códigos de resgate e de visita têm erros distintos. Validar resgate no Balcão não gera QR da visita. |
| Cliente novo que antes era criado no Balcão | Deixa de existir. Quem não tem conta cria pelo app (QR da loja ou QR da visita leva ao login). Clientes já criados por celular no mock seguem com o saldo; vínculo com a conta real é pela busca por `phoneHash` no cadastro (confirmar com a API, P-12). |
| Cliente sem smartphone/câmera | Câmera negada → código curto digitado (P-03). Sem smartphone algum → não ganha (P-13). |
| Cliente sem consentimento de avisos | Entra no clube e ganha normalmente; não entra em campanha nem em lembrete. Entrar no clube não é consentimento. |
| QR impresso que o cliente escaneia em casa | Vence em 5 min como o da tela; ver P-14. |
| Cartazes já impressos | O link `?loja=` continua válido (vira entrar no clube), mas o texto promete carimbo; o lojista precisa reimprimir (aviso no Balcão/Programa, P-15). |
| App antigo em cache (PWA) enviando `?loja=` para `POST /v1/check-in` | Ver impacto na API: a rota antiga responde de forma que o app antigo mostre um erro compreensível, sem ganho. |
| Conta apagada (`DELETE /customer/account`) | `visit_qrs.claimed_by` vira nulo (ou a linha some junto, como o ledger); o Balcão passa a mostrar "cliente removido". |
| Relógio do aparelho do lojista errado | A contagem regressiva usa `expiresAt` do servidor menos a diferença medida na resposta; a decisão é só do servidor. |

---

## 8. Impacto por superfície

### API (`apps/api`)

- **Novo, cliente:** `POST /v1/shop-join` `{ code }` → `{ card, alreadyMember }` (RN-01 a RN-04), com o
  mesmo `Throttle` do check-in. Reaproveita `findShopByCode` e `LedgerStore.lockOrCreateCard`, sem `credit`.
- **Muda, cliente:** `POST /v1/check-in` passa a receber `{ token }` (ou `{ code }` curto, P-03) e decide
  como RN-11. `decideCheckIn` ganha o passo do QR e usa o `EarnInput` preso ao QR em vez de
  `{ kind: 'visit' }`. Pedido com `checkInCode` de loja nessa rota → erro novo `shopQrJoinOnly` (o app novo
  nunca envia; serve para PWA antiga e para o app sugerir "entrar no clube"). Erros novos em `shared/types/errors`:
  `invalidVisitQr`, `visitQrExpired`, `visitQrAlreadyUsed`, `visitQrStale`, `shopQrJoinOnly`.
- **Novo, lojista:** `POST /v1/merchant/visit-qrs` `{ amountCents? }`, `GET /v1/merchant/visit-qrs/:id`,
  `POST /v1/merchant/visit-qrs/:id/cancel`. **Depende de autenticação de lojista na API, que não existe**
  (P-16). Sem ela, a ponta a ponta não roda: o lojista é mock no navegador e o cliente é API real.
- **Banco:** tabela `visit_qrs` (`id`, `shop_id`, `program_id`, `issued_by`, `token_hash` único,
  `visit_code` único parcial entre ativos, `earn_kind`, `amount_cents`, `status`, `created_at`,
  `expires_at`, `claimed_by`, `claimed_at`, `ledger_entry_id`). Índices: `token_hash` único;
  `(shop_id, status) where status = 'active'`; `visit_code where status = 'active'` único. `EXPLAIN` das
  consultas de emissão, uso e situação, como as demais.
- **Troca de programa** cancela os ativos da loja na mesma transação da nova versão.
- **`ledger.store.ts`:** sem porta nova; `credit` recebe `kind` `visit`/`amount`, `recordedBy` e a chave
  `visit-qr:<id>`.
- **`shared/`:** `VISIT_QR_TTL_MINUTES = 5`, `VISIT_QR_LINK_PARAM = 'visita'`, schemas
  `VisitQrIssueRequest`, `VisitQr` (visão do lojista, com `maskedPhone` só quando `claimed`),
  `CheckInRequest` novo, `ShopJoinResult`; `readCheckInQr` passa a devolver
  `{ kind: 'shop' | 'visit', value }`.

### Cliente (`layers/customer`, BFF `server/api/**`)

- BFF: handler novo `POST /api/shop-join`; `POST /api/check-in` com o schema novo. Sem proxy genérico.
- `CheckInService`: `joinShop(code)` e `checkIn(token)`; `useCheckInScreen` decide pela leitura do QR
  (`?loja=` → entrar; `#visita=` → ganhar) e tira os dois da URL.
- Estado novo "entrou no clube" (com boas-vindas pendentes, se P-02 seguir a recomendação) e avisos novos
  em `utils/checkInModel.ts` (`toCheckInNotice`) para os erros novos. Textos em `pt-BR.json`
  (`checkIn.joined.*`, `errors.visitQrExpired` etc.).
- Cartão da loja: dica "peça o QR da visita no caixa" quando `lastVisitAt` é nulo.

### Lojista (mock, `layers/merchant` + `layers/core/app/mock`)

- `CounterService`: sai `registerVisit`/`registerAmount`; entram `issueVisitQr`, `getVisitQr`,
  `cancelVisitQr`. Tipos de erro na interface do service, como hoje.
- `useCounterLaunchForm` / `useCounterLaunch` viram `useVisitQrPanel` (valor no modo por real, gerar,
  situação com consulta periódica, cancelar, imprimir via `usePrint`). Componentes novos em
  `components/counter/` (painel, QR grande com `qrPath`, contagem regressiva). Foco volta para "gerar"
  depois de `claimed`/`expired`.
- Mock: handlers novos (RN-22); para exercitar "usado" sem a API, um gatilho só de desenvolvimento simula o
  uso por um cliente do seed usando o mesmo `claimVisitQr` do mock.
- Cartaz (`posterModel.ts`, `club-setup/Poster*.vue`): textos `poster.headline`/`poster.instruction`
  mudam para "entre no clube".
- Programa e prêmios: toggle de `checkInEnabled` conforme P-09; texto da janela antifraude passa a falar de
  "intervalo mínimo entre visitas do mesmo cliente".

### Admin

- Sem tela e sem código nesta feature.

---

## 9. Impacto em LGPD

- **Menos dado pessoal no balcão:** o lojista deixa de digitar celular; o celular só aparece mascarado
  depois do uso do QR.
- **QR e URL sem dado pessoal:** o QR leva só o token opaco (CA-25); nenhum id de cliente, celular, e-mail
  ou valor.
- **Token não é dado pessoal, mas é credencial:** guardado só como hash, nunca inteiro em log (CA-26),
  tirado da URL do app antes do envio. O token nunca está na URL que chega ao servidor (fragmento).
- **Entrar no clube cria vínculo cliente × loja:** o lojista passa a ver (mascarado) quem entrou sem comprar.
  O termo de uso precisa cobrir isso; se o texto atual só fala de "visita", revisar o termo e subir
  `TERMS_VERSION` (P-17).
- **Consentimento de avisos:** inalterado. Entrar no clube não é consentimento.
- **Apagar a conta:** `visit_qrs.claimed_by` entra no apagamento (`DELETE /customer/account`).
- **Admin:** só contagens agregadas (H-A1).

---

## 10. Fora de escopo

- Telas do admin e métricas da rede.
- Estorno de visita (desfazer um QR `claimed`).
- Rotação do código da loja (tabela `CheckInCode`).
- Integração com PDV/cupom fiscal, NFC, funcionamento offline.
- Equipe da loja com papéis diferentes (`ShopMember`): quem gera é o dono logado.
- Migração de dados de clientes criados por celular no mock (o mock some quando a API do lojista existir).
- Desafios do Descobrir.

---

## 11. Perguntas em aberto

Cada uma com opções e recomendação; nenhuma inventa número.

- **P-01. Nome do código do cartaz.** (a) Manter `checkInCode` no código e no banco; (b) renomear para
  `joinCode`. **Recomendo (a)** no MVP: sem migration, links `?loja=` e convites seguem iguais; o glossário
  registra o nome legado.
- **P-02. Quando entram as boas-vindas.** (a) Na 1ª visita pelo QR da visita (`planEarning` como está);
  (b) ao entrar no clube. **Recomendo (a):** boas-vindas presas a uma compra real, sem mudar `planEarning`;
  (b) obriga mudar a regra de "primeira visita" e abre farm de boas-vindas por conta nova.
- **P-03. Código digitado.** (a) Só QR, sem digitação; (b) código curto exibido junto do QR, único entre
  ativos. Se (b): o comprimento precisa ser **diferente** de `CHECK_IN_CODE_LENGTH` para o app saber qual
  dos dois é, valor `[A DEFINIR]`. **Recomendo (b):** a tela de check-in já tem o modo digitar para câmera
  negada.
- **P-04. Cartão antigo com modo diferente do QR.** (a) Recusar com `visitQrStale` e o lojista gera outro
  no modo certo; (b) QR com valor numa versão por visita conta como 1 visita (valor só registrado). O
  inverso (cartão antigo por real, QR sem valor) não tem como render. **Recomendo (b)** para o primeiro
  caso e recusa explícita para o inverso, com o Balcão oferecendo "gerar com valor".
- **P-05. Limite de QRs ativos por loja.** Valor `[A DEFINIR]`. Recomendo existir (limita abuso e ruído na
  tela).
- **P-06. Entrar no clube é obrigatório antes de ganhar?** (a) Não, o QR da visita cria o cartão (RN-13);
  (b) sim. **Recomendo (a):** um passo a menos no caixa.
- **P-07. Cliente que entrou e nunca comprou** conta como "novo cliente" no Início? Aparece em Clientes? É
  "sumido" depois de 30 dias? **Recomendo:** aparece em Clientes como "entrou, sem visita"; "novo cliente"
  e "sumido" continuam contando a partir da 1ª visita.
- **P-08. Janela antifraude com venda atestada pelo lojista.** Premissa mantida, mas antes o Balcão não era
  barrado pela janela (o mock não checa). Com a janela de 1 dia, a segunda compra do dia não rende. (a)
  Manter; (b) janela só para o mesmo QR/mesmo valor; (c) janela mínima menor para QR da visita.
  **Recomendo (a)** no piloto e medir recusas por `checkInCooldown` no Balcão.
- **P-09. `checkInEnabled`.** (a) Remover; (b) virar "aceita entrar pelo cartaz". **Recomendo (b)**.
- **P-10. Tipo no ledger.** (a) `visit`/`amount` com `recordedBy` (RN-18); (b) continuar `checkIn`.
  **Recomendo (a):** a caderneta do Balcão já sabe mostrar e o valor fica registrado.
- **P-11. Atualização da situação no Balcão.** (a) Consulta periódica com intervalo `[A DEFINIR]`; (b)
  Supabase Realtime/SSE. **Recomendo (a)** no MVP.
- **P-12. Clientes criados por celular no Balcão (mock).** Confirmar com a API que o cadastro pelo app com
  o mesmo celular herda cartões; senão, documentar que esses saldos ficam só no mock.
- **P-13. Cliente sem smartphone.** Sem o lançamento por celular, não ganha. (a) Aceitar; (b) manter
  lançamento por celular escondido para casos excepcionais. **Recomendo (a)** conforme a decisão, e medir
  pedidos no piloto.
- **P-14. QR impresso.** Mesma validade do da tela (5 min) ou validade própria `[A DEFINIR]`? **Recomendo**
  a mesma no MVP; validade maior aumenta o risco de repasse.
- **P-15. Cartazes impressos com o texto antigo.** Aviso no Balcão/Programa pedindo reimpressão?
  **Recomendo** aviso único no Início até o lojista imprimir o cartaz novo.
- **P-16. Dependência da API do lojista.** O QR da visita precisa ser emitido pelo servidor que o cliente
  consome. (a) Esta feature entrega a autenticação de lojista e o primeiro módulo `merchant/visit-qrs`; (b)
  esperar o `merchant/*` do Caio e entregar antes só o lado do cliente + mock. **Decisão de planejamento do
  dono e do Caio.** Até lá, a ponta a ponta não é testável fora do mock.
- **P-17. Termo de uso.** Entrar no clube compartilha (mascarado) o vínculo com o lojista sem visita: o
  texto atual cobre? Se não, nova `TERMS_VERSION`.
