# Refatoração do front — plano de execução (Engenheiro)

Fonte: [`responsibilities.md`](./responsibilities.md) e
[`solution-design.md`](./solution-design.md) (aprovado com ajustes, seção 9).
Caminhos relativos a `apps/web/` (exceto `shared/`). Sem mudança de
comportamento: nenhuma tela, texto, chave de `pt-BR.json` ou regra muda.

Linha de base (2026-10-03, antes da onda 0): `pnpm test` 234 verdes,
`pnpm typecheck` verde.

## Ordem

```
onda 0: QA-0
onda 1: U1 (commit 1 = só git mv, entra primeiro) → T1 (parte de U1 integrado)
onda 2: S1 → lote A (N-A1 ∥ N-A2 ∥ N-A3, com QA-A) → lote B (N-B1..B4, QA-B) → lote C (N-C1..C7, QA-C)
revisão por lote → merge (só com pedido do usuário)
```

Cada subtarefa roda em worktree isolado, parte do branch integrado do
Engenheiro (`claude/frontend-refactor-responsibilities-*`) e só é aceita com
`pnpm test` e `pnpm typecheck` verdes e `git diff` sem mudança em
`layers/core/i18n/locales/pt-BR.json`.

## Regras comuns a todo briefing

- Código, testes e commits em inglês; doc em português.
- LGPD: celular digitado nunca em store, URL, log, `focusRequest`, snapshot
  ou `console.*` de teste. Testes usam só os números do `seed.example.ts`.
- Nenhum teste é pulado, desativado ou afrouxado para ficar verde.
- Se um contrato (assinatura de service, schema de `shared/`) precisar mudar:
  parar e escalar ao Engenheiro → Arquiteto.

---

## Onda 0

### QA-0 — rede de segurança dos fluxos críticos

| Campo | Valor |
| --- | --- |
| Dono | `qa` |
| Depende de | — |
| Toca | `vitest.config.ts`, `tsconfig.test.json` (se preciso), `layers/*/test/**`, `layers/core/test/conventions.test.ts` |
| NÃO toca | nada em `layers/*/app/**`, `shared/**` (fora de teste), `pt-BR.json` |

Entregas:

1. `vitest.config.ts` com dois projetos: `unit` (node; testes atuais,
   `*.test.ts` sem `.nuxt.`) e `nuxt` (`@nuxt/test-utils`,
   `environment: 'nuxt'`, `layers/*/test/**/*.nuxt.test.ts`). `pnpm test`
   roda os dois.
2. Testes de página (mock backend + seed, `localStorage` limpo por teste):
   - **Balcão** (`merchant/pages/counter.vue`): lançar visita por celular
     digitado e pelo teclado; modo valor; celular inválido → erro + foco no
     celular; Enter com valor vazio passa ao valor; validar resgate (código
     certo → preview com celular **mascarado**; entregar); código errado →
     casas limpas e foco no canhoto; `unauthorized` → sai da sessão; loja
     suspensa → `useShopStatus().refresh()`.
   - **Check-in** (`customer/pages/check-in.vue`): código digitado válido →
     carimbo ganho + foco no título; código inválido → casas limpas + foco;
     link `?loja=` → check-in automático e `router.replace` sem o parâmetro;
     cooldown (antifraude) → aviso; `unauthorized` → `signOut` sem limpar
     casas nem mover foco. QR/câmera: só o caminho que roda em happy-dom
     (mock de `useQrScanner`); o resto é teste manual do N-A2.
   - **Criar o clube** (`merchant/pages/club-setup.vue`): avançar com erro
     → foco no primeiro `[aria-invalid="true"]`; avançar os passos; criar;
     cartaz exibido; aviso ao sair (`window.confirm`) antes do cartaz e não
     depois; sem aviso indo ao login.
3. Snapshot só do **texto** renderizado (não HTML) das três telas com seed
   fixa, em estados **sem celular digitado no visor**: montagem, depois do
   lançamento, preview de resgate (celular mascarado é aceito).
4. `layers/core/test/conventions.test.ts` (projeto `unit`):
   - `export (interface|type)` fora de `types/` em `.vue`, `utils/`,
     `composables/`, `stores/` → falha. Em `services/` permitido (interface
     do service + uniões de erro). `core/app/mock/**` permitido.
   - `window.` / `navigator.` / `document.` fora de composable de browser →
     falha.
   - Limites de página (script ≤ 30, template ≤ 60, linhas não vazias).
   - Duas listas: **exceções permanentes nomeadas** (`core/app/stores/session.ts`,
     `core/app/plugins/backend.ts`, `core/app/mock/**`) e **lista
     transitória** do que ainda não migrou — um caminho por linha, ordem
     alfabética. O teste também falha se um item da lista transitória já
     cumpre a regra (força encolher a lista).

Pronto quando: tudo acima verde em `pnpm test`; `pnpm typecheck` verde;
nenhum arquivo de `app/` alterado; grep por números de celular do seed em
`__snapshots__` só encontra a forma mascarada.

---

## Onda 1

### U1 — design system: mover peças de domínio e criar composables de base

| Campo | Valor |
| --- | --- |
| Dono | `dev-ui` |
| Depende de | QA-0 integrado |
| NÃO toca | i18n, composables de tela, lógica de página (só troca de tag/import), tipos fora dos 3 arquivos que move |

**Commit 1 (só `git mv`, conteúdo idêntico, entra primeiro)** + commit de
fiação (tags/imports) para manter verde:

- `ui/components/CounterLedger.vue` → `merchant/components/counter/CounterLedger.vue`
- `ui/components/LaunchReceipt.vue` → `merchant/components/counter/LaunchReceipt.vue` (`<CounterLaunchReceipt>`)
- `ui/components/CheckInPoster.vue` → `merchant/components/club-setup/Poster.vue` (`<ClubSetupPoster>`)
- `ui/components/CustomerTable.vue` → `merchant/components/customers/Table.vue` (`<CustomersTable>`)
- `ui/types/counter.ts` → `merchant/types/counter.ts` (`CounterLedgerEntryModel`, `LaunchReceiptModel`; `phone` vira `MaskedPhone`) + `ui/types/keypad.ts` (`CounterKeypadLabels`)
- `ui/types/customers.ts` → `merchant/types/customer.ts`; `ui/types/poster.ts` → `merchant/types/poster.ts`
- `merchant/components/setup/` → `club-setup/`; `campaign/` → `campaigns/`
- cliente: `CheckInNotice` → `check-in/Notice.vue`, `SignInHero` → `sign-in/Hero.vue`,
  `Wallet{Empty,Problem,StackSkeleton}` → `wallet/*.vue`, `BirthdayForm` → `profile/BirthdayForm.vue` (`<ProfileBirthdayForm>`)
- `MerchantSignInAside` → `merchant-sign-in/Aside.vue`

Depois (commits seguintes):

- Quebrar `RedemptionTicket` (`RedemptionTicketCode`, `RedemptionTicketTimer`,
  `ui/utils/ticketCode.ts`) e `ShopCard` (`ShopCardMedia`, `ShopCardPreview`,
  `ui/utils/slotGrid.ts`).
- Tirar lógica de `PhoneDisplay` (`useInputCaret`, `ui/utils/aria.ts`),
  `RedemptionStub` (`focusFirstInput`), `CardStack` (`ui/utils/cardStack.ts#stackPeeks`).
- Criar `ui/types/focus.ts`, `ui/composables/useFocus.ts`
  (`useFocusRequest`, `useFocusTarget`, `focusFirstInput`, `focusFirstMatching`),
  `ui/composables/useInputCaret.ts`; `core/types/browser.ts`,
  `core/composables/{useLeaveGuard,usePrint,useHaptics,usePageTitle,useThemeChoiceLabels}.ts`;
  `ui/components/{FieldErrorMessage,PanelRefreshAction,InlineStatus}.vue`.
  Os composables novos **não são ligados** às páginas (isso é onda 2).
- Testes unitários dos utils e composables novos.

Pronto quando: `grep` de cada nome antigo de componente (`SetupSteps`,
`SetupShopFields`, `SetupPosterStep`, `Campaign*`, `BirthdayForm`,
`CheckInPoster`, `CustomerTable`, `LaunchReceipt`) só acha os nomes novos;
testes de página do QA-0 verdes (falham com componente desconhecido);
snapshots de texto inalterados; `pnpm test`/`typecheck` verdes.

### T1 — tipos em arquivo próprio, datas e helpers

| Campo | Valor |
| --- | --- |
| Dono | `dev-tipos` |
| Depende de | U1 integrado (rebaseia sobre ele) |
| NÃO toca | `.vue` além de linhas de `import`; props; componentes; `ui/types/{counter,customers,poster}.ts` e os destinos que U1 criou (`merchant/types/{counter,customer,poster}.ts` — só **acrescenta** declarações neles) ; lógica |

- Criar `types/` em core/customer/merchant (+ `ui/types/{qr,tally,form}.ts`);
  mover todas as declarações da tabela da seção 4 do solution-design.
- Derivações/duplicatas 1–7 (seção 4).
- `shared/utils/dateFormat.ts` (`formatTime`, `formatShortDate`,
  `formatShortDateTime`, `formatWeekdayShortDate`, `formatLongWeekdayDate`;
  pt-BR + `PILOT_TIME_ZONE`) com teste de saída idêntica; trocar os
  `Intl.DateTimeFormat` de tela (só import/chamada; nas páginas, a troca é
  só de import).
- `core/utils/units.ts#unitsText`, `core/utils/errorCode.ts`
  (`errorCodeOf`, `hasErrorCode`) com teste.
- `tsconfig.test.json`: incluir `types/**`, `core/app/utils/**`; tirar `translate.ts`.
- Encolher a lista transitória de tipos do `conventions.test.ts`.

Pronto quando: regra de `export (interface|type)` do `conventions.test.ts`
sem exceção transitória para `utils/`, `composables/`, `stores/` e `.vue`
(restando só o que é de lote A/B/C, ex.: `*Labels` que somem nos lotes);
`pnpm test`/`typecheck` verdes; nenhuma assinatura mudou.

---

## Onda 2 (não disparada ainda)

| ID | Dono | O quê | Depende de | Revisão |
| --- | --- | --- | --- | --- |
| S1 | `dev-stores` | `useMerchantSessionGuard`/`useCustomerSessionGuard` observando o código de erro **de cada fonte** (dispara em `error → pending → error`; `unauthorized` precede loja fechada; `refreshShopStatus` só no Balcão); testes de paridade com duas fontes em erro; `session.ts` com `import.meta.client`, nenhuma leitura nova de `localStorage`, `ssr: false` | T1 | `code-reviewer` |
| N-A1 | `dev-nuxt` | `counter.vue` (A1); `customerLine` só de `preview.maskedPhone` | S1 | `code-reviewer` |
| N-A2 | `dev-nuxt` | `check-in.vue` (A2); teste manual de câmera (Android Chrome, iOS Safari) registrado no PR | S1 | `code-reviewer` |
| N-A3 | `dev-nuxt` | `club-setup.vue` (A3), `useProgramFieldOptions`, `program/*` com `$t`, fiação mínima em `program.vue` | S1 | `code-reviewer` |
| QA-A | `qa` | teste dos composables de tela e componentes novos do lote A; tirar as páginas da lista transitória | N-A* | — |
| N-B1..B4 | `dev-nuxt` (≤ 3 em paralelo) | discover, campaigns, merchant-sign-in, customers | lote A integrado | B3, B4: `code-reviewer`; B1, B2: `revisor-ui` |
| N-C1..C7 | `dev-nuxt` (≤ 3 em paralelo) | program, sign-in, profile, rewards, reward-redemption, wallet, home (+ settings) | lote B integrado | C2, C3, C5: `code-reviewer`; resto: `revisor-ui` |

N-A1/A2/A3 editam a mesma lista transitória do `conventions.test.ts` (um
caminho por linha, ordem alfabética) — conflito trivial na integração.

## Registro de execução

(atualizado pelo Engenheiro a cada onda)

- **QA-0** — integrado (cherry-pick de `f140ef9`). 288 testes (234 + 54), typecheck verde.
  Novidades: `vitest` com projetos `unit`/`nuxt`; `tsconfig.nuxt-test.json` e
  `vue-tsc` no `typecheck`; `@types/node`. Lacunas aceitas: câmera real
  (manual no N-A2), `USelect` de categoria (entra pelo store no teste), cartaz
  sem snapshot (código aleatório do mock; coberto por asserts), cliente
  "novo" do Balcão usa número do seed.
- **U1** — integrado (fast-forward; commit só de `git mv`: `2d84ccd`). 334 testes, typecheck verde, snapshots do QA-0 sem `-u`.
  Desvios aceitos: `previewGridStyle` novo em `ui/utils/slotGrid.ts` (o antigo mudaria o layout do `ShopCard`);
  `BROWSER_COMPOSABLES` por nome de arquivo; `tsconfig.test.json` inclui `layers/ui/test/**`.
  Ponto para revisão: `core/composables/useThemeChoiceLabels.ts` importa (só tipo) `ThemeChoiceLabels` de `#layers/ui`.
- **T1** — integrado (fast-forward sobre o U1; `6646333`..`eb31c97`). 375 testes, typecheck verde, snapshots e i18n inalterados.
  `TRANSITIONAL_EXPORTED_TYPES` vazia. Pendências levadas ao lote A3: `SetupStepItem.label` ainda existe (tirar muda prop de `Steps.vue`);
  `*Labels`/`LapsedPreviewLabels` movidos para `types/`, apagam nos lotes. `ProgramSnapshot` virou tipo de `types/program.ts`.
- **Onda 1 encerrada.** Próximo: S1 (`dev-stores`, revisão `code-reviewer`).
- **S1** — integrado (`b377e4b`, `48c1b49`, correção de paridade do cliente `726db33`). `code-reviewer`: aprovado.
  Opcionais aplicados: `hasErrorCode` com `readonly DomainErrorCode[]`; testes de reavaliação do Balcão com fonte parada em erro.
  Nota para o lote C: `reward-redemption.vue`/`profile.vue` usam `watch(state)`; trocar pela guarda só perde o caso
  `unauthorized → unauthorized` sem `pending` (já fora da tela) — registrar no PR.
- **Lote A** — N-A1 (Balcão), N-A2 (check-in), N-A3 (criar o clube + `program/*` + fiação em `program.vue`) integrados por merge;
  conflito só nas listas transitórias do `conventions.test.ts` (as 3 páginas saíram de todas). Testes de página do QA-0 e snapshots
  inalterados; `programPage.nuxt.test.ts` com snapshot de texto criado antes da fiação.
- **QA-A** — integrado: +162 testes (composables de tela e componentes de `counter/`, `check-in/`, `club-setup/`, `program/`).
  Sem bug de comportamento. Observações: `@complete` do `UPinInput` dispara 2× no happy-dom (inofensivo: `validate` ignora repetido);
  `aria-label` das casas do `UPinInput` em inglês, vindo do Nuxt UI (fora deste refactor, ver pendências).
- **Revisão `code-reviewer` do lote A** — aprovado, nada bloqueante. Aplicado o achado importante: `club-setup/RulesStep.vue` e
  `RewardStep.vue` não mutam mais o `defineModel('program')` por dentro; emitem o rascunho inteiro (+ teste).
  Pendências opcionais (não aplicadas): `program/EarnFields.vue` com script de 47 linhas (> 40) → extrair `program/ModeField.vue`;
  `club-setup/FormStep.vue`/`PosterStep.vue` importam rotas de `composables/useMerchantSession` → mover para `utils/`;
  comentário no `check-in/ScanStep.vue` sobre o `<video>` lido só ao montar; `placeholder="R$ 0,00"` solto em `counter/AmountField.vue`
  (já existia); `aria-label` pt-BR do `UPinInput`.
- **Antes do PR do lote A:** registrar o teste manual da câmera em aparelho (ajuste 6) e a conferência manual de `beforeunload`/print.
- **Lote A encerrado.** 559 testes, typecheck verde. Próximo: lote B (N-B1..B4 + QA-B).
