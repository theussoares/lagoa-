# QR dinâmico por visita: solution design

Fonte: [`spec.md`](./spec.md). Status: **aprovado com ajustes pelo CTO (2026-10-06)**; ajustes já aplicados neste
arquivo e resumidos na seção R. Sem código nesta etapa.
Caminhos de front relativos a `apps/web/`; `shared/` e `apps/api/` relativos à raiz.

## R. Revisão do CTO (o que mudou)

Revisado contra a spec e o código (`customer/check-in/*`, `ledger.store.ts`, `drizzle-referral-settlement.ts`,
`drizzle-account.repository.ts`, `domain-exception.ts`, `zod-validation.pipe.ts`, `all-exceptions.filter.ts`,
`app.module.ts` (throttler), `shared/{constants/domain,utils/checkInCode,schemas/visit}.ts`, `useCheckIn`,
`useCheckInScreen`, `middleware/customer-{auth,guest}.ts`, `pages/sign-in.vue`, `useCustomerSession.safeReturnPath`).

1. **P-03 fechado: `VISIT_CODE_LENGTH = 5`**, com limite próprio para o código digitado. 28⁵ ≈ 17,2 mi; com o limite
   geral do check-in (10/min por conta) e ~200 QRs ativos na cidade, uma conta acertaria ~0,17 código alheio por dia
   (cada acerto rouba a visita de alguém no caixa). Por isso o código curto ganha **rota irmã** `POST /v1/check-in/code`
   com `@Throttle` de 5 tentativas a cada 10 min por conta (+ 60/min por IP): ~720 tentativas/dia → ~0,008 acerto/dia/conta.
   Rota separada em vez de throttler nomeado com `skipIf` no corpo: limite explícito no controller, handler explícito no
   BFF, teste de 429 direto. Seções 2.4, 4.1, 4.3, 5, 6.1 e 10.
2. **P-19 fechado: token no fragmento, `/check-in#visita=<token>`.** O fragmento nunca sai do aparelho: não chega ao
   log de acesso da hospedagem/CDN, não vai no `Referer` e não entra no `?para=` do login (hoje `customer-auth` grava
   `to.fullPath` no `?para=` e o SSR redireciona, então com query o token apareceria em duas linhas de log e ficaria na
   URL do login durante todo o SMS). O envio já tinha de ir para `onMounted` (o fragmento só existe no navegador), então
   não há custo de SSR. O QR da loja continua `?loja=` (código público, cartazes impressos). **O CA-25 e a RN-14 da spec
   mudam** (texto novo na seção 1, P-19). Seções 1, 2.1, 2.6, 6.2, 6.4, 6.5, 10 e 11.
3. **P-05, P-12, P-17 e P-18 saem de "pendente do dono"** com a recomendação da spec (P-18, que a spec não tem, fica no
   default deste desenho). Seção 1.
4. **Login preserva o fragmento da visita** (consequência do item 2): `customer-auth`, `customer-guest` e `sign-in.vue`
   repassam só um `#visita=` válido; o `?para=` nunca carrega fragmento. Seção 6.2.
5. **Tela de check-in:** com fragmento de visita a câmera não liga (sem pedido de permissão à toa) e o `scrollBehavior`
   ignora `#visita=`. Seção 6.4.
6. **Script de dev:** `issued_by` = dono da loja. Seção 6.6.
7. `Referrer-Policy` deixa de ser mitigação necessária do token (fica como endurecimento opcional). Seção 11.

Lido antes de propor: `CLAUDE.md`, `spec.md`, `apps/api/src/customer/check-in/*`, `apps/api/src/ledger/*`,
`apps/api/src/customer/{referral,account}/*`, `apps/api/src/database/schema/*`, migrations `0000..0013`,
`apps/api/src/common/{clock,readable-code}.ts`, `apps/api/src/common/http/*`, `shared/{constants,domain,schemas,types,utils}`,
BFF (`server/api/check-in.post.ts`, `server/utils/{apiCall,upstream,schemas}.ts`, `server/api/[...path].ts`),
cliente (`useCheckIn`, `useCheckInScreen`, `pages/check-in.vue`, `components/check-in/*`, `types/checkIn.ts`,
`utils/checkInModel.ts`, `services/CheckInService.ts`, `services/http/*`, `useInviteScreen`, `pages/wallet.vue`,
`middleware/customer-auth.ts`), lojista (`useCounterScreen`, `useCounterLaunch*`, `CounterService`, `MerchantServices`,
`components/counter/*`, `types/counter.ts`, `utils/{counterAction,counterModels,posterModel}.ts`), mock
(`MockBackend`, `state.ts`, `handlers/{counter,earning,wallet,merchant,queries}.ts`, `withSession.ts`,
`runtime.ts`, `layers/core/test/mockCustomerServices.ts`), `pt-BR.json`, `nuxt.config.ts`.

---

## 0. Escopo desta etapa (decisão do dono, P-16 opção b)

| Entra | Não entra |
| --- | --- |
| Contratos em `shared/` (schemas, constantes, erros, domínio puro de validade e uso único) | Módulo `apps/api/src/merchant/*` (emitir, consultar, cancelar QR da visita) |
| API do cliente: `POST /v1/shop-join` (novo) e `POST /v1/check-in` (passa a ser `claimVisitQr`) | Autenticação de lojista na API e BFF do lojista |
| Banco: tabela `visit_qrs` + migration | Cancelar QRs ativos na troca de programa **na API** (a troca de programa é do `merchant/*`) |
| BFF: `POST /api/shop-join` e `POST /api/check-in` com o schema novo | Telas do admin |
| App do cliente: entrar no clube, ganhar pelo QR da visita, código digitado, avisos novos | Estorno, PDV, offline |
| Lojista **só no mock do navegador**: gerar, acompanhar, cancelar e imprimir o QR da visita no Balcão; Balcão sem campo de celular | |
| Script de desenvolvimento que emite um QR da visita direto no banco (para testar o cliente real) | |

Consequência aceita: **não há ponta a ponta fora do mock**. O QR emitido pelo mock vive no `localStorage` do
navegador do lojista e a API não o conhece. O lado do cliente é provado por testes de integração (QR inserido por
fixture) e, manualmente, pelo script de desenvolvimento (seção 6.6).

---

## 1. Decisões adotadas (perguntas da spec)

| Pergunta | Decisão | Efeito no desenho |
| --- | --- | --- |
| P-01 | (a) mantém `checkInCode`/`check_in_code`; glossário registra o nome legado | Sem migration de rename; `?loja=` e convites seguem |
| P-02 | (a) boas-vindas na 1ª visita pelo QR da visita | `planEarning` não muda; o mock passa a seguir a mesma regra (hoje dá boas-vindas na criação do cartão, seção 7.3) |
| P-03 | (b) código curto junto do QR, único entre ativos, **5 caracteres** (CTO) | `VISIT_CODE_LENGTH = 5`; rota `POST /v1/check-in/code` com limite de 5 tentativas/10 min por conta (seção R, item 1) |
| P-04 | (b) QR com valor em cartão de versão "por visita" conta como 1 visita (valor só registrado); cartão de versão "por real" com QR sem valor → `visitQrStale` | Função pura `resolveVisitEarnInput` em `shared/domain/visitQr.ts` |
| P-05 | Limite existe (recomendação da spec); o número entra junto com a emissão no `merchant/*` | Não entra nesta etapa (regra de emissão); o mock não limita; constante `VISIT_QR_ACTIVE_MAX_PER_SHOP` nasce com o `merchant/visit-qrs` |
| P-12 | Clientes criados por celular no mock ficam só no mock | A API não cria cliente por celular; não há vínculo a herdar. O mock some com a API do lojista |
| P-17 | Revisar o termo de uso (texto fora do repositório) antes do deploy; se não cobrir "a loja vê, mascarado, quem entrou no clube", subir `TERMS_VERSION` | Sem código novo: `@RequiresTerms` já barra quem não aceitou a versão nova |
| P-18 | Manter: "já é cliente" = tem cartão na loja; pagamento exige cartão criado depois do convite | Sem mudança em `referral`/`drizzle-referral-settlement.ts`; risco 2 da seção 11 |
| P-19 | Token no **fragmento**: `/check-in#visita=<token>` (CTO) | `visitQrLink`/`readScannedQr` usam `hash`; login repassa o fragmento; CA-25 e RN-14 mudam (abaixo) |
| P-06 | (a) o QR da visita cria o cartão | `LedgerStore.lockOrCreateCard` no uso do QR, como o check-in de hoje |
| P-07 | Cartão sem visita aparece em Clientes como "entrou, sem visita"; "novo" e "sumido" contam da 1ª visita | `isLapsedSince` já ignora `lastVisitAt` nulo; muda só o texto `customers.lastVisit.never` |
| P-08 | (a) janela antifraude vale também para o QR da visita | `checkInAvailableAt` sem mudança; recusa registrada no QR para o Balcão mostrar |
| P-09 | (b) `check_in_enabled` vira "aceita entrar pelo cartaz" | Sem migration; `checkInDisabled` passa a ser erro do **entrar no clube**, nunca do ganho |
| P-10 | (a) ledger grava `visit`/`amount` com `recordedBy = issuedBy` | `LedgerStore.credit` sem porta nova; `checkIn` fica só para linhas antigas |
| P-11 | (a) consulta periódica; intervalo **3 s**, o mesmo do resgate (`useRewardRedemption`) | Constante local `VISIT_QR_STATUS_POLL_MS` no composable do Balcão; o dono pode trocar |
| P-13 | (a) sem smartphone não ganha | Sai o lançamento por celular |
| P-14 | Mesma validade (5 min) para tela e impresso | Sem constante própria |
| P-15 | Aviso no Início até o lojista imprimir o cartaz novo | Subtarefa M6, só no mock (seção 9) |
| P-16 | (b) cliente real + lojista no mock | Escopo da seção 0 |

**Nada depende mais do dono para começar.** Registro das duas perguntas novas deste desenho:

- **P-18 (nova), indicação para quem já entrou no clube.** Hoje `alreadyCustomer` = "tem cartão na loja"
  (`drizzle-referral.repository.ts`) e o pagamento exige cartão criado depois do convite
  (`drizzle-referral-settlement.ts`). Com o QR da loja, quem **entrou e nunca comprou** deixa de ser indicável.
  Decisão: **manter** (conservador, sem mudança). Alternativa para depois do piloto: "cliente" = cartão com
  `last_visit_at` não nulo, e o pagamento exige "nenhuma visita antes do convite".
- **P-19 (nova), onde vai o token.** Decisão do CTO: **fragmento** (`#visita=`), não query. Com `?visita=` o token
  chegaria ao servidor no GET da página (log de acesso da hospedagem/CDN), e para quem não está logado iria de novo no
  `?para=` do redirect do `customer-auth` (segunda linha de log, e a URL do login carregando a credencial durante o
  SMS). O fragmento não sai do aparelho nem vai no `Referer`. Validade de 5 min e uso único continuam, mas deixam de ser
  a única barreira. **Mudanças na spec (PO):**
  - **RN-14:** "O QR da visita é um link `/check-in#visita=<token>` (fragmento, nunca query): a câmera nativa abre o
    app já no check-in. O app lê o fragmento só no navegador e o tira da URL (`router.replace`) antes de enviar. O
    login preserva o fragmento sem passá-lo pelo `?para=`."
  - **CA-25:** "Em teste, o conteúdo do QR da visita casa com
    `^https?://[^?#]+/check-in#visita=[A-Za-z0-9_-]{43}$` e o do QR da loja com
    `^https?://[^?#]+/check-in\?loja=[A-Za-z0-9_-]+$`; nenhum dos dois contém dígitos de celular, e-mail, id de cliente
    ou valor. Em teste de middleware, o redirect para `/entrar` de quem abre `/check-in#visita=<token>` não leva o
    token no `?para=`."
  - **§9 da spec:** "Logs de BFF/API não registram a query string de `/check-in`" vira "o token nunca está na URL que
    chega ao servidor (fragmento)".

Decisões técnicas minhas (sem impacto de produto, registradas para o CTO):

- **Ordem de decisão do uso (RN-11):** "já usado" (mesma pessoa → replay; outra → `visitQrAlreadyUsed`) é checado
  **antes** de "vencido". Senão quem perdeu a resposta e reenvia aos 5 min 01 s receberia `visitQrExpired` de um
  carimbo que já ganhou (contradiz CA-14).
- **Cancelado por troca de programa responde `visitQrStale`, não `invalidVisitQr`.** A spec manda cancelar os ativos na
  troca (RN-15) **e** responder `visitQrStale` (CA-16); com o passo 1 da RN-11 isso daria `invalidVisitQr`. Solução:
  coluna `cancel_reason` (`merchant` | `programChanged`).
- **Janela antifraude da versão ativa** (a que o lojista vê em Programa), não da versão do cartão. Hoje o check-in usa a
  do cartão; com o lojista atestando a venda, a política vigente da loja é a que vale.
- **`POST /v1/shop-join` devolve `{ shopId, cardId, alreadyMember }`**, não o cartão inteiro: o app busca o `WalletCard`
  por `GET /api/wallet/cards/:shopId`, como o check-in já faz depois de ganhar. Um só mapeador de `WalletCard`.
- **Recusa por janela é anotada no QR** fora da transação do ganho (`noteRefusal`), para o Balcão mostrar "recusado"
  (CA-15) sem consumir o QR (RN-16).

---

## 2. Contratos em `shared/`

### 2.1 Constantes (`shared/constants/domain.ts`, modificar)

```ts
/** QR da visita: uso único, gerado na hora da venda. */
export const VISIT_QR_TTL_MINUTES = 5
/**
 * O QR da visita é um link `/check-in#visita=<token>`: a câmera do celular já abre o app no ganho. Fragmento, nunca
 * query: o token não chega ao servidor no GET da página nem entra em log de acesso (P-19).
 */
export const VISIT_QR_LINK_PARAM = 'visita'
/** 32 bytes (256 bits) em base64url, sem padding: 43 caracteres. */
export const VISIT_TOKEN_BYTES = 32
export const VISIT_TOKEN_LENGTH = 43
/** Folga antes do parse (o servidor responde `invalidVisitQr` ao que não tiver o formato). */
export const VISIT_TOKEN_INPUT_MAX_LENGTH = 64
/** Código curto da visita, digitado. Diferente de CHECK_IN_CODE_LENGTH para o app saber qual dos dois é. P-03. */
export const VISIT_CODE_LENGTH = 5
/** Tentativas de código curto por conta (rota própria): 28⁵ combinações só ficam fora de alcance com teto baixo. */
export const VISIT_CODE_ATTEMPTS_LIMIT = 5
export const VISIT_CODE_ATTEMPTS_WINDOW_MINUTES = 10
export const VISIT_CODE_INPUT_MAX_LENGTH = 32
```

`CHECK_IN_LINK_PARAM` e `CHECK_IN_CODE_*` continuam (P-01); só o comentário muda para "entrar no clube".

### 2.2 IDs (`shared/schemas/ids.ts`, modificar)

`VisitQrIdSchema = id.brand<'VisitQrId'>()` e `type VisitQrId`.

### 2.3 Schemas novos (`shared/schemas/visitQr.ts`, criar)

```ts
export const VisitTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/).brand<'VisitToken'>()   // VISIT_TOKEN_LENGTH
export const VisitCodeSchema = readableCodeSchema(VISIT_CODE_LENGTH).brand<'VisitCode'>()
export const VisitQrStatusSchema = z.enum(['active', 'claimed', 'expired', 'cancelled'])
export const VisitQrCancelReasonSchema = z.enum(['merchant', 'programChanged'])

/** O que a venda rende; mesma forma de `EarnInput` (programStrategies), validada na emissão. */
export const VisitQrEarnSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('visit') }),
  z.object({ kind: z.literal('amount'), amountCents: z.number().int().positive().max(AMOUNT_MAX_CENTS) }),
])

/** Lojista gera. Valor só no modo por real; nunca vem do cliente. */
export const VisitQrIssueRequestSchema = z.strictObject({
  amountCents: z.number().int().positive().max(AMOUNT_MAX_CENTS).optional(),
})

/** Recusa por janela antifraude: o QR continua ativo e o Balcão mostra até quando. Sem dado do cliente. */
export const VisitQrRefusalSchema = z.object({
  code: z.literal('checkInCooldown'),
  availableAt: IsoDateTimeSchema,
  refusedAt: IsoDateTimeSchema,
})

/** Visão do lojista. `claim` reaproveita o recibo do Balcão (celular só mascarado). */
export const VisitQrSchema = z.object({
  id: VisitQrIdSchema,
  visitCode: VisitCodeSchema,
  status: VisitQrStatusSchema,          // `expired` já derivado de `expiresAt` na leitura
  earn: VisitQrEarnSchema,
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  claim: VisitRegisteredSchema.nullable(),
  refusal: VisitQrRefusalSchema.nullable(),
})

/** Só a resposta da emissão leva o token: o servidor guarda o hash e não consegue devolvê-lo depois. */
export const IssuedVisitQrSchema = VisitQrSchema.extend({ token: VisitTokenSchema })

/** Credencial já validada (depois do parse): o app manda uma das duas. */
export const VisitQrCredentialSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('token'), token: VisitTokenSchema }),
  z.object({ kind: z.literal('visitCode'), code: VisitCodeSchema }),
])

/** Conteúdo lido pela câmera ou pelo link. */
export const ScannedQrSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('shop'), code: CheckInCodeSchema }),
  z.object({ kind: z.literal('visit'), token: VisitTokenSchema }),
])

/** Rota futura do lojista (`merchant/visit-qrs/:id`). */
export const VisitQrIdParamSchema = z.uuid().pipe(VisitQrIdSchema)
```

Tipos derivados por `z.infer`: `VisitToken`, `VisitCode`, `VisitQrStatus`, `VisitQrCancelReason`, `VisitQrEarn`,
`VisitQrIssueRequest`, `VisitQrRefusal`, `VisitQr`, `IssuedVisitQr`, `VisitQrCredential`, `ScannedQr`.

### 2.4 Schemas modificados

`shared/schemas/visit.ts`:

- `CheckInRequestSchema` **sai**; entra:

  ```ts
  /** Corpo de `POST /check-in` (token do QR). Objetos estritos: campo extra (ex.: `amountCents`) é 400 (CA-12). */
  export const VisitQrClaimRequestSchema = z.union([
    z.strictObject({ token: z.string().max(VISIT_TOKEN_INPUT_MAX_LENGTH) }),
    /** App antigo mandando o código do cartaz na rota de ganho: responde `shopQrJoinOnly`. */
    z.strictObject({ code: z.string().max(CHECK_IN_CODE_INPUT_MAX_LENGTH) }),
  ])
  /** Corpo de `POST /check-in/code` (código curto digitado; rota com limite próprio, P-03). */
  export const VisitCodeClaimRequestSchema = z.strictObject({ visitCode: z.string().max(VISIT_CODE_INPUT_MAX_LENGTH) })
  ```

- `CheckInResultSchema` não muda. `activity.kind` passa a vir `visit` ou `amount` (P-10).
- `VisitRegisteredSchema` continua (vira o `claim` do `VisitQr`).
- `IdempotencyKeySchema` continua aceito no cabeçalho.

`shared/schemas/shop.ts`:

```ts
export const ShopJoinRequestSchema = z.strictObject({ code: z.string().max(CHECK_IN_CODE_INPUT_MAX_LENGTH) })
export const ShopJoinResultSchema = z.object({ shopId: ShopIdSchema, cardId: LoyaltyCardIdSchema, alreadyMember: z.boolean() })
```

Comentários de `CheckInCodeSchema` e `ShopPosterSchema` passam a dizer "entrar no clube".

### 2.5 Erros (`shared/types/errors.ts`, modificar)

```ts
/** QR da visita inexistente, cancelado pelo lojista, de outra loja ou de loja não aprovada. */
| { readonly code: 'invalidVisitQr' }
| { readonly code: 'visitQrExpired' }
| { readonly code: 'visitQrAlreadyUsed' }
/** Programa da loja mudou desde a emissão (ou o cartão é de uma versão que não aceita esse QR, P-04). */
| { readonly code: 'visitQrStale' }
/** QR do cartaz enviado à rota de ganho: ele só coloca no clube. */
| { readonly code: 'shopQrJoinOnly' }
```

`checkInDisabled` muda de sentido (P-09): "loja não aceita entrar pelo cartaz". `DomainEntity` não muda.

HTTP (`apps/api/src/common/http/domain-exception.ts`, `STATUS_BY_CODE`): `invalidVisitQr` 404, `visitQrExpired` 410,
`visitQrAlreadyUsed` 409, `visitQrStale` 409, `shopQrJoinOnly` 422.

### 2.6 Leitura do QR (`shared/utils/checkInCode.ts`, modificar)

```ts
/** Câmera/link: `?loja=` → entrar; `#visita=` → ganhar; código puro de 6 → entrar. `?visita=` não é aceito. */
export function readScannedQr(content: string): Result<ScannedQr, ErrorOf<'invalidShopQr' | 'invalidVisitQr'>>
export function parseVisitCode(input: string): Result<VisitCode, ErrorOf<'invalidVisitQr'>>
export function parseVisitToken(input: string): Result<VisitToken, ErrorOf<'invalidVisitQr'>>
/** Fragmento da URL (`#visita=<token>`, com ou sem `#`) → token; qualquer outro fragmento → `null`. */
export function readVisitFragment(hash: string): VisitToken | null
/** Conteúdo do QR da visita: `<origin>/check-in#visita=<token>` (CA-25). */
export function visitQrLink(origin: string, token: VisitToken): string
```

`readCheckInQr` sai (substituído por `readScannedQr`). `parseCheckInCode` e `checkInLink` continuam. O fragmento é
`visita=<token>` (formato de `URLSearchParams`, lido com `new URLSearchParams(hash.slice(1))`), para caber outro par
no futuro sem mudar o leitor.

### 2.7 Domínio puro (`shared/domain/visitQr.ts`, criar)

Usado pela API (cliente, agora; lojista, depois) e pelo mock. É aqui que "validade" e "uso único" moram.

```ts
export interface VisitQrSnapshot {
  readonly status: 'active' | 'claimed' | 'cancelled' | 'expired'   // como está gravado
  readonly cancelReason: VisitQrCancelReason | null
  readonly expiresAt: Date
  readonly claimedBy: string | null
  readonly programId: string
  /** Versão ativa da loja agora; `null` se a loja não tem programa ativo. */
  readonly activeProgramId: string | null
  readonly shopApproved: boolean
}

export type VisitQrUseError = ErrorOf<'invalidVisitQr' | 'visitQrExpired' | 'visitQrAlreadyUsed' | 'visitQrStale'>

export function visitQrExpiresAt(createdAt: Date): Date
/** Situação para exibir: `active` com `now >= expiresAt` vira `expired`. */
export function visitQrStatusAt(snapshot: Pick<VisitQrSnapshot, 'status' | 'expiresAt'>, now: Date): VisitQrStatus

/**
 * RN-11 passos 1–4, nesta ordem: loja não aprovada → invalid; já usado (mesma pessoa → replay, outra → alreadyUsed);
 * cancelado (programChanged → stale, merchant → invalid); vencido; versão do programa mudou → stale.
 */
export function decideVisitQrUse(qr: VisitQrSnapshot, customerId: string, now: Date): Result<'claim' | 'replay', VisitQrUseError>

/** RN-07: valor obrigatório e válido no modo por real; proibido nos modos por visita. */
export function planVisitQrIssue(rules: ProgramRules, amountCents: number | undefined): Result<VisitQrEarn, EarnError>

/** P-04: o que o QR rende no cartão desta pessoa (que pode estar numa versão anterior do programa). */
export function resolveVisitEarnInput(cardRules: ProgramRules, earn: VisitQrEarn): Result<EarnInput, ErrorOf<'visitQrStale'>>

export interface VisitEarningRequest {
  readonly rules: ProgramRules            // da versão do cartão (ou a ativa, cartão novo/zerado)
  readonly bonusRules: BonusRules
  readonly cooldownHours: number          // da versão ativa
  readonly card: EarningCard
  readonly birthday: Birthday | null
  readonly earn: VisitQrEarn
  readonly now: Date
}
/** RN-11 passos 5–6: janela (`checkInAvailableAt`) e o que rende (`planEarning`). Sem cópia das duas. */
export function decideVisitEarning(request: VisitEarningRequest): Result<EarningPlan, ErrorOf<'checkInCooldown' | 'visitQrStale'>>
```

`planEarning`, `checkInAvailableAt`, `programStrategies` e `bonusRules` **não mudam**.

---

## 3. Banco (`apps/api`)

### 3.1 Schema Drizzle

- `apps/api/src/database/schema/enums.ts` (modificar): `visitQrStatus` (`active`, `claimed`, `expired`, `cancelled`),
  `visitQrCancelReason` (`merchant`, `programChanged`), `visitQrEarnKind` (`visit`, `amount`).
- `apps/api/src/database/schema/visit-qrs.ts` (criar), exportado em `schema/index.ts`:

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid v7 (`primaryId()`) | |
| `shop_id` | uuid → `shops.id`, not null | |
| `program_id` | uuid → `programs.id`, not null | versão ativa na emissão (RN-06) |
| `issued_by` | uuid → `app_users.id`, not null | vira `ledger_entries.recorded_by` |
| `token_hash` | bytea, not null | SHA-256 do token (token tem 256 bits; não precisa de HMAC) |
| `visit_code` | char(VISIT_CODE_LENGTH), not null | em claro: é curto e só serve com a loja ativa; hash não protege 17 mi de combinações |
| `earn_kind` | `visit_qr_earn_kind`, not null | |
| `amount_cents` | integer, null | |
| `status` | `visit_qr_status`, not null, default `active` | `expired` só é gravado de forma preguiçosa (pela emissão futura, ao colidir código) |
| `cancel_reason` | `visit_qr_cancel_reason`, null | |
| `created_at` | timestamptz (`createdAt()`) | |
| `expires_at` | timestamptz, not null | |
| `claimed_by` | uuid → `customer_profiles.user_id`, null | apagado no `DELETE /customer/account` |
| `claimed_at` | timestamptz, null | |
| `ledger_entry_id` | uuid → `ledger_entries.id`, null | |
| `refused_at` | timestamptz, null | última recusa por janela (RN-16) |
| `refusal_available_at` | timestamptz, null | |

CHECKs (literais no SQL, como `programs_*_check`, porque o drizzle-kit não resolve `#shared`):

- `visit_qrs_earn_check`: `(earn_kind = 'amount' AND amount_cents BETWEEN 1 AND 1000000) OR (earn_kind = 'visit' AND amount_cents IS NULL)` (1000000 = `AMOUNT_MAX_CENTS`).
- `visit_qrs_claim_check`: `(status = 'claimed') = (claimed_at IS NOT NULL AND ledger_entry_id IS NOT NULL)` (sem `claimed_by`, que pode ser apagado).
- `visit_qrs_cancel_check`: `(status = 'cancelled') = (cancel_reason IS NOT NULL)`.
- `visit_qrs_expiry_check`: `expires_at > created_at`.

Índices:

- `visit_qrs_token_hash_uq` único em `token_hash` (uso pelo link/câmera).
- `visit_qrs_active_code_uq` único em `visit_code` `WHERE status = 'active'` (código único entre ativos, na rede toda: o
  app digita sem saber a loja).
- `visit_qrs_code_created_idx` em `(visit_code, created_at DESC)` (replay pelo código: a linha mais nova; consulta com
  `order by created_at desc nulls last`, regra do `CLAUDE.md`).
- `visit_qrs_shop_active_idx` em `shop_id` `WHERE status = 'active'` (cancelar ativos na troca de programa, contar ativos
  para P-05; usados pelo `merchant/*` futuro).
- `visit_qrs_claimed_by_idx` em `claimed_by` `WHERE claimed_by IS NOT NULL` (apagar a conta zera `claimed_by` por pessoa sem varrer a tabela).
- `visit_qrs_ledger_entry_uq` único em `ledger_entry_id` `WHERE ledger_entry_id IS NOT NULL`.

### 3.2 Migration

- `apps/api/drizzle/0014_visit_qrs.sql` (gerada por `pnpm --filter @lagoa/api db:generate`) + snapshot em `drizzle/meta`.
- Acrescentar no mesmo arquivo (ou `0015_visit_qrs_rls.sql`, custom como a `0001`):
  `ALTER TABLE "visit_qrs" ENABLE ROW LEVEL SECURITY;` (sem policy pública, como as demais).
- Sem mudança em `programs.check_in_enabled` (P-09) nem em `shops.check_in_code` (P-01).
- `ledger_kind` já tem `visit` e `amount`; sem mudança de enum.

### 3.3 Ordem de locks (evita deadlock)

Uso do QR: `visit_qrs` (`FOR UPDATE` só da linha do QR) → `loyalty_cards` (via `LedgerStore.lockOrCreateCard`).
Troca de programa futura (`merchant/*`): `programs` → `visit_qrs` (cancela ativos), sem cartão. Resgate:
`loyalty_cards` + `redemptions`. Indicação: depois do commit. Nenhum ciclo.

### 3.4 Documentação do modelo

`docs/database-model.md` (modificar): tabela `visit_qrs`, a seção "Balcão e celular" passa a dizer que o ganho vem do QR
da visita e que o Balcão não recebe mais celular.

---

## 4. API do cliente (`apps/api/src/customer`)

Padrão de sempre: controller (HTTP, `ZodValidationPipe`, `unwrap`) → service (`Result`, sem Drizzle) → `*.rules.ts`
(puro) → repository (classe abstrata) / `Drizzle*Repository`.

### 4.1 Endpoints

| Método e rota | Corpo | Resposta 2xx | Erros (corpo = `DomainError`) |
| --- | --- | --- | --- |
| `POST /v1/shop-join` | `ShopJoinRequest` `{ code }` | 200 `ShopJoinResult` `{ shopId, cardId, alreadyMember }` | 400 `validation`; 404 `invalidShopQr` (inexistente, pendente, suspensa: CA-03); 403 `checkInDisabled` (loja não aceita entrada pelo cartaz, P-09); 403 `termsNotAccepted`; 401 `unauthorized`; 429 `rateLimited` |
| `POST /v1/check-in` (`claimVisitQr`, token) | `VisitQrClaimRequest` `{ token }` \| legado `{ code }`; cabeçalho opcional `Idempotency-Key` | 200 `CheckInResult` | 400 `validation` (campo extra, CA-12); 404 `invalidVisitQr`; 410 `visitQrExpired`; 409 `visitQrAlreadyUsed`; 409 `visitQrStale`; 429 `checkInCooldown` + `availableAt`; 422 `shopQrJoinOnly` (corpo legado); 403 `termsNotAccepted`; 401; 429 `rateLimited` |
| `POST /v1/check-in/code` (`claimVisitQr`, código curto) | `VisitCodeClaimRequest` `{ visitCode }`; cabeçalho opcional `Idempotency-Key` | 200 `CheckInResult` | os mesmos do token, menos `shopQrJoinOnly` |

Todos com `@RequiresTerms()`. `shop-join` e `check-in` com o mesmo
`@Throttle({ default: { limit: 10, ttl: 60_000 }, ip: { limit: 60, ttl: 60_000 } })` do check-in de hoje (CA-21).
`check-in/code` com `@Throttle({ default: { limit: VISIT_CODE_ATTEMPTS_LIMIT, ttl: VISIT_CODE_ATTEMPTS_WINDOW_MINUTES
* 60_000 }, ip: { limit: 60, ttl: 60_000 } })`: 5 tentativas a cada 10 min por conta (P-03; o token de 256 bits não
precisa disso, o código de 5 caracteres precisa). Mesmo corpo de 404 para credencial inexistente, cancelada, de outra
loja e de loja não aprovada (RN-03, CA-17, CA-18): não vaza existência.

Rotas futuras do lojista (contrato só para registro; **não implementar agora**, ver seção 7.6):
`POST /v1/merchant/visit-qrs` (`VisitQrIssueRequest` → 201 `IssuedVisitQr`; `invalidAmount`, `amountNotAccepted`,
`shopPendingApproval`, `shopSuspended`), `GET /v1/merchant/visit-qrs/:id` (→ `VisitQr`; outra loja = 404 `notFound`),
`POST /v1/merchant/visit-qrs/:id/cancel` (→ `VisitQr`; idempotente: cancelar `claimed`/`expired`/`cancelled` devolve a
situação atual sem erro, RN-10).

### 4.2 Entrar no clube: módulo novo `apps/api/src/customer/shop-join/`

| Arquivo | Conteúdo |
| --- | --- |
| `shop-join.controller.ts` | `@Controller('shop-join')`, `@Post()`, `ShopJoinRequestSchema` |
| `shop-join.service.ts` | `ShopJoinService.joinShop(customerId: string, rawCode: string): Promise<Result<ShopJoinResult, ShopJoinError>>`; `ShopJoinError = ErrorOf<'invalidShopQr' \| 'checkInDisabled' \| 'unauthorized'>` |
| `shop-join.rules.ts` | `decideShopJoin(shop: JoinableShop, existingCardId: string \| null): Result<'join' \| 'alreadyMember', ErrorOf<'checkInDisabled'>>` (já é membro → `alreadyMember` mesmo com a entrada desligada) |
| `shop-join.repository.ts` | contrato abaixo |
| `drizzle-shop-join.repository.ts` | I/O |
| `shop-join.module.ts` | importa `LedgerModule`, `ProfileModule`; registrado em `customer.module.ts` |
| `shop-join.rules.test.ts`, `shop-join.service.test.ts`, `shop-join.http.test.ts`, `shop-join.integration.test.ts`, `shop-join.fixtures.ts` | testes (seção 10) |

```ts
export interface JoinableShop {
  readonly shopId: string
  readonly programId: string            // versão ativa
  readonly joinEnabled: boolean         // programs.check_in_enabled (P-09)
  readonly expiration: ExpirationPolicy
  readonly target: number
}

export abstract class ShopJoinRepository {
  /** Só loja aprovada com programa ativo e janela válida; o resto é indistinguível de código inexistente. */
  abstract findShopByCode(code: CheckInCode): Promise<JoinableShop | null>
  /** Leitura simples (sem lock): quem já é membro sai sem transação e sem escrita (RN-02). */
  abstract findCardId(customerId: string, shopId: string): Promise<string | null>
  /**
   * Cria o cartão zerado na versão ativa via `LedgerStore.lockOrCreateCard` (corrida: o segundo vê `created = false`).
   * Sem `credit`, sem ledger de visita, `last_visit_at` nulo (RN-01). `unauthorized` sem perfil.
   */
  abstract join(customerId: string, shop: JoinableShop, now: Date): Promise<Result<{ cardId: string; created: boolean }, ErrorOf<'unauthorized'>>>
}
```

Não chama `ReferralSettlement` (RN-19, CA-04).

### 4.3 Ganhar pelo QR da visita: `apps/api/src/customer/check-in/` (modificar)

| Arquivo | Mudança |
| --- | --- |
| `check-in.controller.ts` | `@Post()` com `VisitQrClaimRequestSchema` e o `Throttle` de hoje; `@Post('code')` com `VisitCodeClaimRequestSchema` e o `Throttle` do código curto (4.1). Os dois montam a `VisitQrClaimRequest` do service e chamam `CheckInService.claimVisitQr`; `RequiresTerms` nos dois |
| `check-in.service.ts` | `checkIn` sai; entra `claimVisitQr` (abaixo). `settleReferral` continua igual (fora da transação, só quando não é replay) |
| `check-in.rules.ts` | `decideCheckIn` sai; entram adaptadores finos sobre `decideVisitQrUse` e `decideVisitEarning` de `shared/domain/visitQr.ts` |
| `check-in.repository.ts` | contrato novo (abaixo); `findShopByCode` sai daqui (vai para `shop-join`) |
| `drizzle-check-in.repository.ts` | implementação; `alignProgramVersion` e `ProgramVersionChanged` continuam |
| `check-in.fixtures.ts`, testes | reescritos para o QR da visita |

```ts
// check-in.service.ts
export type ClaimVisitQrError = ErrorOf<
  'invalidVisitQr' | 'visitQrExpired' | 'visitQrAlreadyUsed' | 'visitQrStale' | 'checkInCooldown' | 'shopQrJoinOnly' | 'unauthorized'
>
/** `request` é `VisitQrClaimRequest | VisitCodeClaimRequest` (as duas rotas caem aqui). */
claimVisitQr(customerId: string, request: VisitQrClaimRequest | VisitCodeClaimRequest, clientKey?: string): Promise<Result<CheckInResult, ClaimVisitQrError>>
```

Fluxo do service:

1. `{ code }` (legado) → `shopQrJoinOnly`, sem I/O. `{ token }` → `parseVisitToken` e `hashVisitToken`; `{ visitCode }` →
   `parseVisitCode`. Formato inválido → `invalidVisitQr`.
2. `repository.findVisitQr(credential, customerId)` (sem lock): `null` → `invalidVisitQr`.
3. `repository.claim(...)` com `now = clock.now()` e os dois decisores; `ProgramVersionChanged` → relê e tenta uma vez
   (como hoje).
4. Recusa `checkInCooldown` → `repository.noteRefusal(...)` (best effort, falha só loga o tipo) e devolve o erro.
5. Sucesso não-replay → `ReferralSettlement.settlePending` (RN-19).
6. Monta `CheckInResult`: `activity.kind = earn.kind` (`visit`/`amount`), `nextCheckInAt = recordedAt + cooldownHours`.

`clientKey` (`Idempotency-Key`) continua aceito e validado, mas o replay agora é pelo próprio QR (RN-11.3); não entra
na chave do ledger.

```ts
// check-in.repository.ts
export type VisitQrLookup = { readonly kind: 'tokenHash'; readonly tokenHash: Buffer } | { readonly kind: 'visitCode'; readonly code: VisitCode }

export interface VisitQrTarget {
  readonly visitQrId: string
  /** Loja + regras da versão que credita para esta pessoa: a do cartão com saldo, senão a da emissão. */
  readonly shop: CatalogShop
  readonly programId: string
  readonly cooldownHours: number        // versão ativa
  readonly issuedBy: string
  readonly earn: VisitQrEarn
}

export interface LockedVisitQr extends VisitQrSnapshot {
  readonly claimedAt: Date | null
  readonly ledgerEntryId: string | null
}

export interface VisitClaimState {
  readonly card: EarningCard
  readonly birthday: Birthday | null
}

export interface VisitClaimRecorded {
  readonly cardId: string
  readonly entryId: string
  readonly units: number
  readonly balanceAfter: number
  readonly recordedAt: Date
  /** `true`: a mesma pessoa reenviou o QR já usado por ela; nada foi escrito. */
  readonly replayed: boolean
}

export interface VisitClaimDeciders<E> {
  readonly qr: (qr: LockedVisitQr) => Result<'claim' | 'replay', E>
  readonly earning: (state: VisitClaimState) => Result<EarningPlan, E>
}

export abstract class CheckInRepository {
  /** QR em qualquer situação (o decisor precisa ver claimed/cancelled); `null` só se não existe. Pelo código: a linha mais nova. */
  abstract findVisitQr(lookup: VisitQrLookup, customerId: string): Promise<VisitQrTarget | null>

  /**
   * Uma transação: trava o QR (`FOR UPDATE`), relê a situação e chama `decide.qr`; replay devolve o lançamento gravado
   * (mesmo `entryId`, CA-14). Senão trava/cria o cartão (`LedgerStore.lockOrCreateCard`, vencimento aplicado), alinha a
   * versão, chama `decide.earning`, credita (`LedgerStore.credit`: `kind` = `earn.kind`, `recordedBy = issuedBy`,
   * `amountCents`, chave `visit-qr:<visitQrId>`) e marca o QR `claimed` (`claimed_by`, `claimed_at`, `ledger_entry_id`).
   * Recusa de qualquer decisor = rollback total (cartão novo inclusive).
   */
  abstract claim<E>(
    attempt: { readonly customerId: string; readonly target: VisitQrTarget; readonly now: Date },
    decide: VisitClaimDeciders<E>,
  ): Promise<Result<VisitClaimRecorded, E | ErrorOf<'unauthorized'>>>

  /** Anota a última recusa por janela no QR ainda ativo (fora da transação do ganho; RN-16, CA-15). */
  abstract noteRefusal(visitQrId: string, refusal: { readonly availableAt: Date; readonly refusedAt: Date }): Promise<void>
}
```

Dois cadeados de uso único (RN-12): a linha do QR travada e a chave única `visit-qr:<id>` no ledger.

### 4.4 Peças compartilhadas da API

| Arquivo | Ação |
| --- | --- |
| `apps/api/src/common/visit-token.ts` (criar) | `generateVisitToken(): VisitToken` (`randomBytes(VISIT_TOKEN_BYTES)` em base64url) e `hashVisitToken(token): Buffer` (SHA-256). Usado pelo check-in, pelas fixtures, pelo script de dev e, depois, pelo `merchant/visit-qrs` |
| `apps/api/src/common/visit-token.test.ts` (criar) | formato, entropia (tamanho), hash estável |
| `apps/api/src/common/http/domain-exception.ts` | `STATUS_BY_CODE` com os 5 códigos novos |
| `apps/api/src/ledger/ledger.store.ts` | **sem porta nova**; só o comentário de `recordedBy` ("quem atestou a venda: emissor do QR da visita") e o JSDoc da classe (check-in → QR da visita) |
| `apps/api/src/ledger/referral-settlement.ts` | comentário: quem chama é o uso do QR da visita |
| `apps/api/src/customer/account/drizzle-account.repository.ts` | `erase` zera `visit_qrs.claimed_by` de quem sai (spec, seção 9) |
| `apps/api/src/customer/customer.module.ts` | importa `ShopJoinModule` |
| `apps/api/src/test-support/test-database.ts` | `createVisitQr({ shopId, programId?, issuedBy?, earn?, createdAt?, status?, cancelReason? }): Promise<{ id; token; visitCode }>` |
| `apps/api/src/database/dev-issue-visit-qr.ts` (criar) + script `visit-qr:dev` no `apps/api/package.json` | ver 6.6 |

---

## 5. BFF (`apps/web/server`)

| Arquivo | Ação |
| --- | --- |
| `server/api/shop-join.post.ts` (criar) | `parsedBody(event, ShopJoinRequestSchema)` → `callApi(event, { method: 'POST', path: '/shop-join', body })` |
| `server/api/check-in.post.ts` (modificar) | `BodySchema` vira `VisitQrClaimRequestSchema` (inclui o legado `{ code }`, para a API responder `shopQrJoinOnly` em vez de um 400 genérico) |
| `server/api/check-in/code.post.ts` (criar) | `parsedBody(event, VisitCodeClaimRequestSchema)` → `callApi(event, { method: 'POST', path: '/check-in/code', body })`, repassando `idempotency-key` |

Sem proxy genérico (o `[...path].ts` segue devolvendo 404). `idempotency-key` já está em `FORWARDED_REQUEST_HEADERS`.
`origin-guard` já cobre a escrita. Não há BFF do lojista nesta etapa.

---

## 6. App do cliente (`layers/customer`)

### 6.1 Service (interface trocável)

`layers/customer/app/services/CheckInService.ts` (modificar):

```ts
export type ShopJoinError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'termsNotAccepted'> | TransportError
export type ClaimVisitQrError =
  | ErrorOf<'invalidVisitQr' | 'visitQrExpired' | 'visitQrAlreadyUsed' | 'visitQrStale' | 'checkInCooldown' | 'termsNotAccepted'>
  | TransportError
export type CheckInError = ShopJoinError | ClaimVisitQrError | ErrorOf<'invalidShopQr' | 'invalidVisitQr'>

export interface CheckInService {
  /** QR do cartaz (ou código de 6 digitado): entra no clube; não rende. */
  joinShop(code: CheckInCode): Promise<Result<ShopJoinResult, ShopJoinError>>
  /** QR da visita (ou código curto): ganha. Validade, uso único e antifraude são do servidor. */
  claimVisitQr(credential: VisitQrCredential): Promise<Result<CheckInResult, ClaimVisitQrError>>
}
```

`shopQrJoinOnly` não entra na união: o app novo nunca manda `{ code }` para `/check-in`.

| Arquivo | Ação |
| --- | --- |
| `services/http/HttpCheckInService.ts` | `joinShop` → `POST /shop-join`; `claimVisitQr` → `POST /check-in` com `{ token }` ou `POST /check-in/code` com `{ visitCode }` (pelo `kind` da credencial), `idempotency-key` novo por toque; `allowing(...)` com os códigos de cada assinatura (`rateLimited` do código curto já é `TransportError` e já tem aviso em `toCheckInNotice`) |
| `services/http/createHttpCustomerServices.ts` | sem mudança de assinatura |
| `layers/core/test/mockCustomerServices.ts` | `checkIn` sai; `joinShop` e `claimVisitQr` sobre os handlers do mock (7.3) |

### 6.2 Smart × dumb

| Peça | Papel | Arquivo |
| --- | --- | --- |
| `pages/check-in.vue` | smart (rota + composição); ganha o ramo `CheckInJoinedStep` | modificar |
| `composables/useCheckInScreen.ts` | composable de tela: lê `?loja=` e o fragmento `#visita=` (só em `onMounted`), troca câmera/digitação, foco, haptics | modificar |
| `middleware/customer-auth.ts` | `?para=` = caminho + query **sem** fragmento (`to.fullPath` traz o `#` na navegação no cliente); o redirect leva `hash` só se `readVisitFragment(to.hash)` aceitar. No SSR o fragmento não chega, e o navegador o reaplica sozinho no 302 (RFC 9110 §10.2.2) | modificar |
| `middleware/customer-guest.ts`, `pages/sign-in.vue` | ao sair do login, repassam `route.hash` se for fragmento de visita válido (helper puro `returnLocation(para, hash)` ao lado de `safeReturnPath` em `useCustomerSession.ts`); qualquer outro fragmento é descartado | modificar |
| `composables/useCheckIn.ts` | dado: intenção (entrar × ganhar), envio, `retry`, estado | modificar |
| `composables/useCheckInJoinedView.ts` | sub-composable do estado "entrou no clube" (espelho do `useCheckInEarnedView`) | criar |
| `utils/checkInInput.ts` | puro: `toCheckInIntent(raw, source, codeKind)` e `linkIntent(query)` | criar |
| `utils/checkInModel.ts` | puro: `toCheckInNotice` cobre os erros novos; `toCheckInJoinedModel`; textos de "próxima visita" | modificar |
| `components/check-in/JoinedStep.vue` | dumb: título, loja, boas-vindas pendentes, dica "peça o QR da visita", "Ver na carteira" | criar |
| `components/check-in/CodeForm.vue` | dumb: `length` e `kind` por prop; emite `switchKind` ("tenho o código do cartaz" / "da visita") | modificar |
| `components/check-in/ScanStep.vue`, `Notice.vue`, `EarnedStep.vue` | dumb: só textos/chaves | modificar |
| `utils/walletCardModel.ts` + `pages/wallet.vue` | dica no cartão sem visita (`lastVisitAt === null`): "peça o QR da visita no caixa" e boas-vindas pendentes | modificar |
| `layers/ui/app/types/wallet.ts` | `StampCardModel.note: string \| null` (texto pronto; `ui` continua sem i18n) | modificar |
| `composables/useInviteScreen.ts` | sem mudança de código (já leva a `/check-in?loja=`); comentário: termina em "entrou no clube" | modificar comentário |

### 6.3 Tipos (`layers/customer/app/types/checkIn.ts`, modificar)

```ts
export type CheckInCodeKind = 'visit' | 'shop'
export type CheckInIntent =
  | { readonly kind: 'join'; readonly code: CheckInCode }
  | { readonly kind: 'claim'; readonly credential: VisitQrCredential }

export type CheckInState =
  | { status: 'idle' }
  | { status: 'submitting'; source: CheckInSource; intent: CheckInIntent['kind'] }
  | { status: 'earned'; result: CheckInResult; card: WalletCard | null }
  | { status: 'joined'; result: ShopJoinResult; card: WalletCard | null }
  | { status: 'error'; error: CheckInError; source: CheckInSource; intent: CheckInIntent['kind'] }

export interface CheckIn {
  state: Readonly<Ref<CheckInState>>
  submit: (intent: CheckInIntent, source: CheckInSource) => Promise<void>
  retry: () => Promise<void>
  reset: () => void
}

export interface CheckInJoinedModel {
  readonly title: string           // "Você entrou no clube" | "Você já é do clube"
  readonly lead: string
  readonly welcome: string | null  // "Suas 2 de boas-vindas entram na primeira compra." (P-02)
  readonly next: string            // "Na hora de pagar, peça o QR da visita no caixa."
  readonly announcement: string
}
export interface CheckInJoinedView { readonly text: CheckInJoinedModel; readonly card: StampCardModel | null }
```

`CheckInScreen` ganha `joined: CheckInJoinedView | null`, `view: 'earned' | 'joined' | 'notice' | 'scan' | 'type'`,
`codeKind: CheckInCodeKind`, `codeLength: number`, `switchCodeKind: () => void`. `codeInvalid` passa a valer para
`invalidShopQr` e `invalidVisitQr` digitados.

### 6.4 Regras de tela

- Câmera: `readScannedQr` decide; código puro de 6 = entrar.
- Digitação: padrão `codeKind = 'visit'` (o caso do caixa, câmera negada, H-C3); "tenho o código do cartaz" troca para
  `'shop'` (6 casas). O `UPinInput` usa `codeLength` do modo.
- Link: `#visita=` (fragmento) tem prioridade sobre `?loja=`; os dois são tirados da URL com `router.replace({ query: {},
  hash: '' })` antes de enviar (RN-14 revista). Com fragmento de visita a câmera não liga (`shouldScan` considera o link
  pendente): ninguém recebe pedido de permissão de câmera para um ganho que já veio pelo link.
- `app/router.options.ts` (ou o `scrollBehavior` existente): fragmento que não é `id` de elemento (`#visita=`) não
  tenta rolar até ele.
- `checkInCooldown` → aviso com "a próxima visita que rende nesta loja libera {when}" (H-C5).
- `visitQrExpired`, `visitQrAlreadyUsed`, `visitQrStale`, `invalidVisitQr` → aviso "peça um novo no caixa"
  (`recovery: 'scanAgain'`) (H-C4).
- `checkInDisabled` (só no entrar) → "Esta loja não aceita entrada pelo cartaz. Peça o QR da visita no caixa."
- `joined` → busca o `WalletCard` (`wallet.getCard(shopId)`) como o ganho já faz; sem cartão (rede caiu), mostra só o texto.

### 6.5 SSR

| Página | Decisão |
| --- | --- |
| `/check-in` | **SSR só da casca** (`ssr: true` como hoje). O envio (`?loja=`/`#visita=`) passa a rodar **só no cliente** (`onMounted`): hoje `useCheckInScreen` chama `submit` no `setup`, o que no SSR faz um POST durante o GET da página e o repete na hidratação. O fragmento nem chega ao servidor, então servidor e cliente renderizam o mesmo estado inicial (sem diferença de hidratação). O estado (`shallowRef`) não vai no payload; nenhum `useAsyncData` novo |
| `/carteira` | SSR como hoje (`useAsyncQuery` existentes); a dica do cartão sem visita é `computed` do dado já carregado; sem chave nova |
| `/convite` | cliente (`onMounted`), sem mudança |
| `/balcao`, `/programa`, `/painel`, Criar o clube | SPA (`routeRules ssr: false`) como hoje |

Nenhum estado de módulo novo. O token nunca vai para store, `localStorage` nem log do app.

### 6.6 Testar o cliente real sem a API do lojista

`apps/api/src/database/dev-issue-visit-qr.ts` (+ `pnpm --filter @lagoa/api visit-qr:dev <checkInCode> [amountCents]`):
lê a loja e o programa ativo, aplica `planVisitQrIssue`, grava a linha com `generateVisitToken`/`hashVisitToken`
(`issued_by` = dono da loja) e imprime o link (`#visita=`) e o código curto no terminal. Recusa rodar sem `ALLOW_DEV_VISIT_QR=1` e com `NODE_ENV=production`. É a
mesma costura que o `merchant/visit-qrs` vai usar (seção 7.6), sem endpoint público.

---

## 7. Lojista no mock (`layers/merchant` + `layers/core/app/mock`)

### 7.1 Service (interface nova, ISP)

`layers/merchant/app/services/VisitQrService.ts` (criar):

```ts
export type IssueVisitQrError = ErrorOf<'invalidAmount' | 'amountNotAccepted'> | ShopClosedError | TransportError
/** QR de outra loja responde como inexistente. */
export type VisitQrLookupError = ErrorOf<'notFound'> | ShopClosedError | TransportError

export interface VisitQrService {
  issueVisitQr(request: VisitQrIssueRequest): Promise<Result<IssuedVisitQr, IssueVisitQrError>>
  getVisitQr(id: VisitQrId): Promise<Result<VisitQr, VisitQrLookupError>>
  /** Idempotente: QR que não está ativo volta como está (cancelar `claimed` não desfaz o ganho, RN-10). */
  cancelVisitQr(id: VisitQrId): Promise<Result<VisitQr, VisitQrLookupError>>
}

/** Só no mock (como `ShopApprovalTestingService`): simula o uso por um cliente do seed (RN-22). */
export interface VisitQrTestingService {
  simulateClaim(id: VisitQrId): Promise<Result<VisitQr, VisitQrLookupError>>
}
```

| Arquivo | Ação |
| --- | --- |
| `services/CounterService.ts` | sai `registerVisit`, `registerAmount`, `RegisterVisitError` (CA-24); ficam resgate e caderneta; `ShopClosedError` continua exportado daqui |
| `services/MerchantServices.ts` | `visitQr: VisitQrService`, `visitQrTesting: VisitQrTestingService \| null` |
| `services/mock/createMockMerchantServices.ts` | liga os handlers do mock via `asMerchant` |

### 7.2 Smart × dumb no Balcão

| Peça | Papel | Arquivo |
| --- | --- | --- |
| `pages/counter.vue` | smart; `CounterLaunchPanel` vira `CounterVisitQrPanel` | modificar |
| `composables/useCounterScreen.ts` | tela; foco inicial em `issueVisitQr` (ou `amount` no modo por real) | modificar |
| `composables/useVisitQr.ts` | dado: emitir, consultar a cada `VISIT_QR_STATUS_POLL_MS` (3 s) enquanto `active`, contagem (`useCountdown`), confirmar com o servidor ao zerar, cancelar, `simulateClaim`; guarda o token **só em memória**; mede a diferença de relógio na emissão (`createdAt` do servidor × relógio local) | criar (substitui `useCounterLaunch.ts`) |
| `composables/useVisitQrPanel.ts` | sub-composable de tela: valor (modo por real), Enter = gerar (CA-09), rótulos, modelo do QR, recibo do uso, `ledger.prepend` quando vira `claimed`, foco volta para "gerar" depois de `claimed`/`expired` | criar (substitui `useCounterLaunchForm.ts`) |
| `utils/visitQrModels.ts` | puro: `toVisitQrDisplayModel(qr, token, origin, remainingSeconds, t)`, `visitQrRemainingSeconds(expiresAt, localNow, skewMs)`, `toVisitQrIssueText(action, amountCents, t)` (pontos antes de bônus, H-L2); recibo do uso reaproveita `toLaunchReceipt` | criar |
| `utils/counterModels.ts` | `toLaunchFormText` sai; `toLaunchReceipt` fica | modificar |
| `utils/counterAction.ts` | sem mudança (`counterActionFor`, `amountDigits`) | — |
| `components/counter/VisitQrPanel.vue` | dumb: `PanelModule` com form ou QR + feedback | criar (substitui `LaunchPanel.vue`) |
| `components/counter/VisitQrIssueForm.vue` | dumb: `CounterAmountField` (modo por real) + botão "Gerar" | criar (substitui `LaunchForm.vue`) |
| `components/counter/VisitQrCard.vue` | dumb: QR grande (`qrPath`), código curto, contagem, situação, "Imprimir", "Cancelar", "Gerar outro", "Simular uso (teste)" quando houver | criar |
| `components/counter/LaunchFeedback.vue`, `LaunchReceipt.vue`, `AmountField.vue` | reaproveitados | — |
| `components/counter/LaunchForm.vue`, `LaunchPanel.vue` | apagar | apagar |
| `composables/useCounterLaunch.ts`, `useCounterLaunchForm.ts` | apagar | apagar |

Imprimir (H-L5) usa `usePrint` e classes `print:` para sair só o `VisitQrCard`. Recarregar a página perde o token
(o servidor só tem o hash): o painel volta ao formulário; o QR antigo vence sozinho em 5 min.

Tipos (`layers/merchant/app/types/counter.ts`, modificar): saem `CounterLaunch`, `CounterLaunchState`,
`CounterLaunchView`, `LaunchFormText`, `CounterField`; entram:

```ts
export type VisitQrState =
  | { status: 'idle' }
  | { status: 'issuing' }
  | { status: 'error'; code: DomainErrorCode }
  | { status: 'showing'; qr: VisitQr; token: VisitToken; skewMs: number }

export interface VisitQrControl {
  amount: Ref<string>
  state: Readonly<Ref<VisitQrState>>
  remaining: Readonly<Ref<number>>
  issue: (action: CounterAction) => Promise<void>
  cancel: () => Promise<void>
  reset: () => void
  /** `null` fora do mock. */
  simulateClaim: (() => Promise<void>) | null
}

export interface VisitQrDisplayModel {
  readonly qr: string                    // path do SVG
  readonly qrLabel: string
  readonly visitCode: string
  readonly status: VisitQrStatus
  readonly statusLabel: string
  readonly countdown: string | null      // "4:12" enquanto ativo
  readonly refusal: string | null        // "Recusado: esse cliente já ganhou aqui. Libera hoje às 18:40."
  readonly receipt: { readonly key: string; readonly model: LaunchReceiptModel } | null
}

export type CounterFocusTarget = 'amount' | 'issueVisitQr' | 'redemptionCode'

export interface CounterVisitQrView { /* amountText, action, issueLabel, amountHint, pending, amountErrorCode, alertCode,
  programFailed, display: VisitQrDisplayModel | null, canSimulate, inputAmount, issue, cancel, issueAnother, print,
  simulateClaim, retryProgram */ }
```

`CounterScreen.launch` vira `CounterScreen.visitQr`.

### 7.3 Mock (`layers/core/app/mock`)

| Arquivo | Ação |
| --- | --- |
| `state.ts` | `VisitQrRecordSchema` (`id`, `shopId`, `programId`, `issuedBy: MerchantId`, `token` **em claro** (exceção do mock, documentada: não há hash síncrono no navegador e o mock não é servidor real), `visitCode`, `earn`, `status`, `cancelReason`, `createdAt`, `expiresAt`, `claimedBy`, `claimedAt`, `ledgerEntryId`, `refusal`); `MockState.visitQrs`; `MOCK_STATE_VERSION = 8` (estado salvo antigo é descartado e volta ao seed, como nas versões anteriores) |
| `seed.example.ts` | `visitQrs: []` |
| `handlers/visitQr.ts` (criar) | `issueVisitQr(ctx, shopId, request)` (`requireOperationalShop` + `planVisitQrIssue` + código único entre ativos com `ctx.random`), `getVisitQr`, `cancelVisitQr`, `claimVisitQr(ctx, customerId, credential)` (`decideVisitQrUse` + `decideVisitEarning` + credita + anota recusa), `simulateVisitQrClaim(ctx, shopId, id)` (cliente do seed), `toVisitQrView` |
| `handlers/wallet.ts` | `checkIn` sai; entra `joinShop(ctx, customerId, code)` (cartão zerado, sem ledger, idempotente) |
| `handlers/counter.ts` | `registerVisit` sai; `ensureCustomer` deixa de ser chamado no ganho |
| `handlers/earning.ts` | boas-vindas na **primeira visita**, não no primeiro cartão (`existing === undefined \|\| existing.lastVisitAt === null`), igual a `planEarning`; senão quem entrou no clube perderia as boas-vindas no mock |
| `handlers/merchant.ts` | `updateProgram` cancela os ativos da loja com `cancelReason: 'programChanged'` (RN-15). O mock não versiona programa: `visitQrStale` sai só por esse motivo |
| `handlers/queries.ts` | `ensureCustomer` fica só para login/seed |

### 7.4 Outras telas do lojista

| Arquivo | Ação |
| --- | --- |
| `utils/posterModel.ts`, `components/club-setup/Poster.vue`, `PosterStep.vue` | textos "entre no clube" (H-L6); `qrLabel` novo |
| Programa e prêmios (`composables/useProgramEditor.ts`, componentes do bloco "visitRules") | só chaves/textos (P-09: toggle vira "entrada pelo cartaz"; janela = "intervalo mínimo entre visitas do mesmo cliente") |
| `utils/customerModels.ts` | nenhuma regra nova; texto `customers.lastVisit.never` muda (P-07) |
| Início (P-15) | ver subtarefa M6 |

### 7.5 Seed do mock para o fluxo de demonstração

Nenhum dado novo além de `visitQrs: []`. O "Simular uso (teste)" escolhe um cliente do seed (o primeiro sem janela
aberta na loja) e passa pelo mesmo `claimVisitQr` do mock.

### 7.6 Costura para a API do lojista (futuro)

1. `apps/api/src/merchant/visit-qrs/` com o mesmo padrão: `visit-qrs.rules.ts` chama `planVisitQrIssue` e
   `visitQrStatusAt`; repository usa `generateVisitToken`/`hashVisitToken`, `visit_qrs_active_code_uq` (colisão de
   código com linha vencida → grava `expired` e tenta de novo) e `visit_qrs_shop_active_idx` (P-05).
2. A troca de programa no `merchant/program` cancela os ativos (`cancel_reason = 'programChanged'`) na mesma
   transação da nova versão.
3. Visão `VisitQr.claim.entry.maskedPhone` de conta apagada: `MaskedPhoneSchema` não aceita vazio; o contrato do
   `CounterEntry` precisa de "cliente removido" antes (`maskedPhone` nulo). Fica para essa etapa.
4. Front: `services/http/HttpVisitQrService.ts` + `server/api/merchant/visit-qrs/*` (handlers explícitos) +
   plugin `merchantServices` escolhe http; `visitQrTesting` vira `null`. Nenhum composable ou componente muda.

---

## 8. Chaves i18n (`layers/core/i18n/locales/pt-BR.json`)

Texto final é da UX/PO; abaixo, a proposta. "Mudar" = mesma chave, texto novo.

**Novas**

| Chave | Texto proposto |
| --- | --- |
| `errors.invalidVisitQr` | Esse QR da visita não vale. Peça um novo no caixa. |
| `errors.visitQrExpired` | Este QR venceu. Peça um novo no caixa. |
| `errors.visitQrAlreadyUsed` | Esse QR já foi usado. Peça um novo no caixa. |
| `errors.visitQrStale` | A loja mudou o clube. Peça um novo QR no caixa. |
| `errors.shopQrJoinOnly` | Esse é o QR do cartaz: ele só coloca você no clube. Atualize o app e peça o QR da visita no caixa. |
| `checkIn.typeVisitCode` / `checkIn.typeShopCode` | Tenho o código da visita / Tenho o código do cartaz da loja |
| `checkIn.visitCodeLabel` / `checkIn.shopCodeLabel` | Código da visita / Código da loja |
| `checkIn.submitClaim` / `checkIn.submitJoin` | Ganhar / Entrar no clube |
| `checkIn.invalidVisitCode` | Esse código não vale. Confira com o caixa ou peça um novo. |
| `checkIn.submittingJoin` | Entrando no clube… |
| `checkIn.notice.visitQrExpiredTitle` / `visitQrUsedTitle` / `visitQrStaleTitle` / `invalidVisitQrTitle` / `joinDisabledTitle` | QR vencido / QR já usado / O clube mudou / QR não reconhecido / Entrada pelo cartaz desligada |
| `checkIn.joined.title` / `titleAgain` | Você entrou no clube / Você já é do clube |
| `checkIn.joined.lead` | {shop} já está na sua carteira. |
| `checkIn.joined.welcome` | Suas {units} de boas-vindas entram na primeira compra. |
| `checkIn.joined.next` | Na hora de pagar, peça o QR da visita no caixa. |
| `checkIn.joined.toWallet` | Ver na carteira |
| `checkIn.joined.announce` | {title}. {lead} |
| `wallet.card.firstVisitHint` | Peça o QR da visita no caixa para ganhar. |
| `wallet.card.welcomePending` | Suas {units} de boas-vindas entram na primeira compra. |
| `counter.visitQr.title` | QR da visita |
| `counter.visitQr.lead` | Gere na hora da venda e mostre ao cliente. Vale {minutes} min e uma vez só. |
| `counter.visitQr.issue` / `issueAmount` | Gerar QR da visita / Gerar QR de {amount} |
| `counter.visitQr.amountLabel` / `amountHint` / `amountPreview` | Valor da compra / Vale {points} por real gasto. / {amount} vale {points} (antes de bônus). |
| `counter.visitQr.qrLabel` | QR da visita, vale até {time} |
| `counter.visitQr.codeLabel` | Código para digitar |
| `counter.visitQr.expiresIn` | Vence em {time} |
| `counter.visitQr.status.active` / `claimed` / `expired` / `cancelled` | Aguardando o cliente / Usado / Vencido / Cancelado |
| `counter.visitQr.refused` | Recusado: esse cliente já ganhou aqui. Libera {when}. |
| `counter.visitQr.cancel` / `print` / `issueAnother` / `simulateClaim` | Cancelar QR / Imprimir QR / Gerar outro / Simular uso (teste) |
| `counter.visitQr.programProblem` | Não deu para carregar o clube da loja. |
| `home.posterReprint.title` / `body` / `action` | Imprima o cartaz novo / O cartaz agora só coloca o cliente no clube; o carimbo vem do QR da visita. / Imprimir cartaz |

**Mudar**

`errors.checkInDisabled` (Esta loja não aceita entrada pelo cartaz. Peça o QR da visita no caixa.),
`errors.checkInCooldown` (Você já ganhou nesta loja. A próxima libera {when}.), `checkIn.leadScan`, `checkIn.leadType`,
`checkIn.viewfinderLabel`, `checkIn.notice.cooldownTitle`/`cooldown`, `checkIn.earned.next` (Próxima visita que rende
aqui: {when}.), `wallet.empty`, `poster.headline`, `poster.instruction`, `poster.qrLabel`, `clubSetup.poster.lead`,
`clubSetup.poster.approved`, `program.visitRules.title`, `program.visitRules.checkIn.label`/`description`,
`program.visitRules.cooldown`/`cooldownHint`, `customers.lastVisit.never` (Entrou, sem visita ainda).

**Remover** (na subtarefa que tira o uso): `counter.launch.*` (o que não migrar para `counter.visitQr.*`),
`checkIn.typeCode`, `checkIn.codeLabel`, `checkIn.submit`, `checkIn.invalidCode`, `checkIn.notice.disabledTitle`.
Ficam: `counter.ledger.earnedCheckIn` e `ledger.kind.checkIn` (linhas antigas).

---

## 9. Subtarefas, ordem e paralelismo

Cada subtarefa fecha com `pnpm typecheck`, `pnpm test` (e `pnpm test:api`/`typecheck:api` quando tocar a API) verdes.

| Id | Subtarefa | Depende de | Arquivos principais |
| --- | --- | --- | --- |
| **S0** | Glossário (spec §2 + mudanças de sentido; `VISIT_QR_LINK_PARAM` como **fragmento** `#visita=`, P-19) no `CLAUDE.md`; "Estado do projeto" (check-in → QR da visita; entrar no clube; token só no fragmento); `docs/database-model.md`; PO atualiza RN-14, CA-25 e §9 da spec (texto na seção 1) | aprovação do CTO (dada) | `CLAUDE.md`, `docs/database-model.md`, `spec.md` |
| **S1** | Contratos `shared/` (2.1–2.7) + testes | S0 | `shared/constants/domain.ts`, `schemas/{ids,visit,shop,visitQr}.ts`, `types/errors.ts`, `utils/checkInCode.ts`, `domain/visitQr.ts`, `apps/api/src/common/http/domain-exception.ts` |
| **S2** | i18n: todas as chaves **novas** de uma vez (remoções ficam com quem tira o uso) | S1 | `pt-BR.json` |
| **A1** | Banco: enums, `visit-qrs.ts`, migration + RLS, `visit-token.ts`, `createVisitQr` no `test-support`, `EXPLAIN` | S1 | seção 3, 4.4 |
| **A2** | `customer/shop-join` completo | S1 | 4.2 |
| **A3** | `customer/check-in` → `claimVisitQr` (rotas `check-in` e `check-in/code`) | A1 | 4.3 |
| **A4** | `erase` zera `claimed_by` + teste | A1 | `drizzle-account.repository.ts`, `account.integration.test.ts` |
| **A5** | Script `visit-qr:dev` | A1 | 6.6 |
| **B1** | BFF `shop-join.post.ts` + `check-in.post.ts` + `check-in/code.post.ts` | S1 | seção 5 |
| **M1** | Mock: state v8, `handlers/visitQr.ts`, `joinShop`, saída de `registerVisit`/`checkIn`, boas-vindas na 1ª visita, `updateProgram` cancela | S1 | 7.3 |
| **C1** | `CheckInService` + `HttpCheckInService` + harness `mockCustomerServices` | S1, M1 (harness) | 6.1 |
| **C2** | Tela de check-in (tipos, `useCheckIn`, `useCheckInScreen`, `useCheckInJoinedView`, `checkInInput`, `checkInModel`, `JoinedStep`, `CodeForm`, página); `customer-auth`/`customer-guest`/`sign-in.vue` com o fragmento de visita; `scrollBehavior`; remove chaves antigas de `checkIn.*` | C1, S2 | 6.2–6.5 |
| **C3** | Dica no cartão da carteira | S1, S2 | `walletCardModel.ts`, `wallet.vue`, `layers/ui/app/types/wallet.ts` |
| **M2** | `VisitQrService` + `MerchantServices` + `createMockMerchantServices` + `CounterService` sem `register*` + contrato | M1 | 7.1 |
| **M3** | `useVisitQr`, `useVisitQrPanel`, `visitQrModels`, tipos, `useCounterScreen` | M2, S2 | 7.2 |
| **M4** | Componentes do Balcão + `counter.vue`; apaga `Launch*`/`useCounterLaunch*`; remove `counter.launch.*` | M3 | 7.2 |
| **M5** | Cartaz, Criar o clube, Programa e prêmios, Clientes: textos (P-01, P-07, P-09) | S2 | 7.4 |
| **M6** | P-15: aviso no Início até imprimir o cartaz novo (mock: marca por loja no estado do mock; futuro: coluna em `shops`) | M1, S2; **design** | Início (`useMerchantHome`, componente novo em `components/home/`) |

**Paralelismo** (depois de S1; S2 é curta e destrava as telas):

```
S0 → S1 ─┬─ S2 ───────────────────────────────┐
         ├─ A1 ─┬─ A3                         │
         │      ├─ A4                         │
         │      └─ A5                         │
         ├─ A2                                │
         ├─ B1                                │
         ├─ M1 ─┬─ C1 ── C2 (precisa de S2) ◄─┤
         │      ├─ M2 ── M3 ── M4  (S2) ◄─────┤
         │      └─ M6 (S2, design) ◄──────────┤
         ├─ C3 (S2) ◄─────────────────────────┤
         └─ M5 (S2) ◄─────────────────────────┘
```

- Trilhas independentes entre si: **API** (A*), **BFF** (B1), **cliente** (C*), **lojista/mock** (M*).
- Pontos de conflito: `pt-BR.json` (por isso S2 antes, e remoções só nas subtarefas donas), `MockState` (só M1 mexe),
  `types/counter.ts` (M3 e M4 com o mesmo dono ou M3 entrega os tipos antes).
- Dependem de **design** (mundo "Carimbo e Caderneta", `design-system/lagoa/MASTER.md`) antes de C2/M4/M6: estado
  "entrou no clube", `VisitQrCard` (QR grande + contagem + situações), aviso de reimpressão. Lógica (C1, M2, M3) não espera.

---

## 10. Estratégia de testes

| Camada | O que prova | CA |
| --- | --- | --- |
| `shared/domain/visitQr.test.ts` | tabela de `decideVisitQrUse` (toda a ordem, inclusive replay antes de vencido e `programChanged` → stale); `visitQrStatusAt` em `T0+4:59` (`active`) e `T0+5:00` (`expired`); `planVisitQrIssue` (0, sem valor, acima do teto, valor em modo carimbo); `resolveVisitEarnInput` (P-04, os dois sentidos); `decideVisitEarning` (janela, boas-vindas na 1ª visita, aniversário + dia surpresa = 2×) | 05–07, 10, 11, 14–16, 18–20 |
| `shared/utils/checkInCode.test.ts` | `readScannedQr` (loja, visita por fragmento, `?visita=` recusado, código puro, lixo); `readVisitFragment`; `visitQrLink` casa com `^https?://[^?#]+/check-in#visita=[A-Za-z0-9_-]{43}$` e `checkInLink` com `^https?://[^?#]+/check-in\?loja=[A-Za-z0-9_-]+$`, sem dígitos de celular, e-mail, id ou valor | 25 (revisto) |
| Web `layers/customer/test` (middleware/login) | `customer-auth` com `/check-in#visita=<token>`: `?para=` sem token, redirect com o fragmento; `returnLocation` repassa só fragmento de visita válido; e2e (Playwright) do link sem sessão: abre `/entrar`, entra e ganha, e o servidor de teste nunca recebe o token em URL | 25 (revisto) |
| `shared/schemas` | `VisitQrClaimRequestSchema` recusa `amountCents` e objetos misturados | 12 |
| API `*.rules.test.ts` / `*.service.test.ts` (repository falso) | ordem de chamada, `shopQrJoinOnly` sem I/O, `noteRefusal` só em `checkInCooldown`, indicação só fora de replay, `ProgramVersionChanged` tenta uma vez | 04, 15 |
| API `*.http.test.ts` | corpos e status (404/410/409/422/429), campo extra = 400, `RequiresTerms`, `Throttle` (11ª = 429 no token; **6ª em 10 min = 429 no `check-in/code`**), `Idempotency-Key` inválido = 400 | 12, 21 |
| API `*.integration.test.ts` (Postgres real) | `shop-join`: CA-01, 02, 03, 04. `check-in`: CA-10, 11 (relógio injetado), 13 (**2 requisições concorrentes × 20 rodadas**: exatamente 1 sucesso, 1 `visitQrAlreadyUsed`, 1 linha `visit-qr:<id>`), 14, 15 (QR continua `active` com `refused_at`), 16, 17, 18, 19 (2 + 1 = 3 e indicação paga), 20; vencimento aplicado antes do crédito; `EXPLAIN` das buscas por `token_hash`, por `visit_code` e do lock (usa índice, sem seq scan) | 01–04, 10, 11, 13–20 |
| API teste de log (no estilo de `all-exceptions.filter.test.ts` / `pii.service.test.ts`) | usar, recusar e erro inesperado no `claimVisitQr`/`joinShop` não escrevem token, celular nem e-mail em log | 26 |
| API `account.integration.test.ts` | apagar a conta zera `claimed_by` e mantém o QR `claimed` válido no CHECK | — |
| Web `layers/merchant/test/visitQrService.contract.ts` + `mockVisitQrService.test.ts` | contrato do `VisitQrService` (LSP: o `HttpVisitQrService` futuro roda o mesmo arquivo): emitir, consultar, cancelar, outra loja = `notFound`, loja pendente/suspensa, cancelado → uso `invalidVisitQr`, troca de programa → `visitQrStale` | 05–08, 16, 18 |
| Web `layers/core/test` (mock) | `claimVisitQr`/`joinShop` do mock com a mesma tabela de casos do shared | 01, 02, 10, 11, 14, 15 |
| Web `layers/customer/test` | `checkInInput.test.ts`, `checkInModel.test.ts` (avisos novos, "entrou no clube", boas-vindas pendentes), `httpCustomerServices.test.ts` (rotas e corpos, token → `/check-in`, código → `/check-in/code`), `checkInScreen.nuxt.test.ts` (`#visita=`/`?loja=` saem da URL, câmera não liga com fragmento de visita, **nada é enviado no SSR**, troca de modo do código, foco), `checkInPage.nuxt.test.ts`, `walletCardModel.test.ts` (dica) | H-C1..C5 |
| Web `layers/merchant/test` | `visitQrModels.test.ts` (contagem com diferença de relógio, recusa, recibo); `counterScreen.nuxt.test.ts` com relógio e timers falsos: Enter gera (CA-09), consulta a cada 3 s vira "usado" e entra na caderneta (CA-22), passa de `expiresAt` → "vencido" + "gerar outro" (CA-23); `counterPage.nuxt.test.ts`: não existe campo de celular (CA-24); `posterModel.test.ts` (texto e link) | 09, 22–25 |
| `layers/core/test/conventions.test.ts` | segue verde (tipos só em `types/`, sem `$fetch` em componente, tamanhos de página/composable) | — |

---

## 11. Riscos

1. **Sem ponta a ponta até existir `merchant/*` (P-16).** O QR do mock não é aceito pela API. Mitigação: testes de
   integração com fixture e o script `visit-qr:dev`. O piloto **não** pode ir ao ar só com esta etapa: o lojista real
   não teria como gerar QR.
2. **Indicação de quem entrou antes de comprar (P-18).** Com o default atual, convidar alguém que já entrou pelo cartaz
   não paga. Pode frustrar o "traga um amigo" no balcão.
3. **Token em URL (P-19, resolvido).** No fragmento ele não chega ao servidor, ao `Referer` nem ao `?para=`; resta o
   histórico local do aparelho até o `router.replace` (milissegundos) e leitores de QR de terceiros que descartem o
   fragmento (o cliente cai na tela de check-in e usa o código curto). `Referrer-Policy: same-origin` fica como
   endurecimento opcional, não como mitigação. Regressão a vigiar: alguém "simplificar" para `?visita=`; o CA-25 revisto
   e o teste do middleware barram.
4. **Cliente novo demora mais que 5 min para criar conta.** O QR vence no meio do cadastro por SMS. O lojista gera outro;
   medir no piloto antes de mexer na validade (P-14).
5. **Envio no `setup` hoje (SSR + hidratação).** A mudança para `onMounted` corrige, mas altera o momento do envio;
   os testes de tela precisam cobrir o fluxo de link.
6. **Janela antifraude barra a 2ª compra do dia (P-08).** A recusa aparece no Balcão; o lojista pode achar que o QR
   "não funcionou". Texto de recusa precisa ser claro.
7. **Mock diferente do servidor em versões de programa.** O mock não versiona programa; `visitQrStale` só por
   cancelamento na troca. O contrato do `VisitQrService` não cobre P-04 no mock (só na API).
8. **Mock guarda token em claro no `localStorage`.** Aceitável por ser mock; desaparece com a API do lojista.
9. **Códigos curtos "presos" por linhas vencidas com `status = 'active'`.** O índice único parcial considera ativa a
   linha vencida até alguém gravar `expired`. Hoje não afeta o cliente (a regra lê `expires_at`); a emissão futura
   precisa tratar a colisão (7.6).
10. **Recibo do lojista com conta apagada.** `CounterEntry.maskedPhone` não aceita "removido"; resolver antes do
    `merchant/visit-qrs` (7.6).
11. **Conflito de merge no `pt-BR.json`** entre trilhas paralelas. Mitigação: S2 antes e remoções nas subtarefas donas.
12. **Termo de uso (P-17).** Se o jurídico pedir texto novo, subir `TERMS_VERSION` força todos a aceitar de novo
    antes de entrar no clube ou ganhar (`termsNotAccepted`); comunicar antes do deploy.
