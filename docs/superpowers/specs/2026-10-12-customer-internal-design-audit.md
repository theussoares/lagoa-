# Auditoria do app do cliente — telas internas

Data: 2026-10-12 · Escopo: Carteira, Descobrir, Prêmios, Resgate, Check-in, Perfil, Ranking, Convite, layout `customer`, `AppTabBar` · Spec: [customer-internal-design-design.md](./2026-10-12-customer-internal-design-design.md)

Leitura de código contra o MASTER e o checklist da task 1. Nada foi corrigido aqui. Capturas de tela não foram feitas (ver "Como verificar").

## Varreduras

| Varredura | Resultado |
| --- | --- |
| Hex solto em `layers/customer/app` e `layers/ui/app/components` | Nenhuma ocorrência |
| `text-[...rem]` fora da escala (clientes + `layers/ui`) | 30 usos, 11 tamanhos: `0.9375rem` ×11 (InlineStatus, PanelRefreshAction, CounterKeypad, SpineNav, FoldModule, RedemptionStub, PhoneDisplay), `1.375rem` ×10 (ranking/List, check-in/Notice, wallet/Empty, rewards ×3, RewardCoupon, StampCard, ChallengeCard, RedemptionTicket), `1.75rem` ×4, `2.25rem` ×2 (sign-in/Hero, ScreenHeader), `1.25rem` ×2, `1.0625rem` ×2, e um de cada `1.5rem`, `2rem`, `2.75rem`, `3.5rem`, `4rem` |
| Ícones/skeletons `size-4..7` | Só decorativos (`aria-hidden`) e skeletons; nenhum alvo de toque pequeno encontrado |
| Linhas de `<script>` por página | profile 91, wallet 64, sign-in 63, discover 51, reward-redemption 47, rewards 34, ranking 28, invite 5, check-in 5 (limite do CLAUDE.md: 30) |
| Cabeçalho | `ScreenHeader` só em Carteira (sem foto) e Descobrir (com foto). `PageTitle` liso em Prêmios, Ranking, Perfil, Resgate, Check-in e passos Ganhou/Entrou |

## Achados

| # | Tela | Regra | Severidade | Onda |
| --- | --- | --- | --- | --- |
| 1 | Carteira | `ScreenHeader` sem foto da cidade; Descobrir já tem. Inconsistência entre as duas telas mais vistas | alto | 2 (plano atual, Task 5) |
| 2 | Descobrir | URL da foto montada dentro da página (`cityHeaderImageUrl` + `CITY_HEADER_IMAGE`), sem composable nem teste; a Carteira precisaria copiar | alto | 2 (Task 2) |
| 3 | Prêmios | `PageTitle` liso, sem o vocabulário do Entrar | alto | 2 (Task 6) |
| 4 | Perfil | `PageTitle` liso | alto | 2 (Task 6) |
| 5 | Ranking | `PageTitle` liso | médio | 2 (Task 6) |
| 6 | `ScreenHeader` | Sem teste: h1 único, título longo sem corte, fallback sem foto, foto decorativa (`alt=""`) | alto | 2 (Task 3) |
| 7 | `main.css` | Animações novas podem esquecer `prefers-reduced-motion`; nada garante isso | alto | 2 (Task 4) |
| 8 | Resgate | `PageTitle` liso numa tela de momento crítico; botão voltar solto acima do título; skeleton usa `role="status"` com `aria-label`, ok | médio | 3 |
| 9 | Check-in | `PageTitle` liso; passos Ganhou/Entrou (`EarnedStep`/`JoinedStep`) usam `PageTitle focusable`: é o momento de maior emoção do app e tem o visual mais pobre | alto | 3 |
| 10 | Perfil | Página de 91 linhas de script, acima do limite; lógica deveria estar em `useProfileScreen` | médio | 4 |
| 11 | Carteira, Descobrir, Resgate, Prêmios | Scripts acima de 30 linhas (64, 51, 47, 34) | médio | 4 (refatoração, não cola com o visual) |
| 12 | `layers/customer` e `layers/ui` | Tamanhos de texto soltos (`text-[…rem]`): 11 valores diferentes em 30 usos; `1.375rem` (título de seção) e `0.9375rem` (texto pequeno) repetem 10 e 11 vezes. Falta uma escala de tipo no design system | médio | 1 (pequeno, junto da Task 7) |
| 13 | `AppTabBar` | Ação central de check-in sai da barra (`-mt-6`, `size-16`): o alvo passa de 44px, ok. `h-[4.75rem]` fixo: conferir se o conteúdo reserva a altura em 375px | médio | verificar visualmente |
| 14 | Convite | Tela só com "abrindo…" sem estado de erro visível na página (depende de `useInviteScreen`) | médio | 4 |
| 15 | Todas | Estados vazio/erro existem na Carteira (`Empty`, `Problem`); Prêmios, Ranking e Perfil precisam ser conferidos tela a tela com sessão | médio | 3–4 |

Ordem por severidade: alto (1, 2, 3, 4, 6, 7, 9), médio (5, 8, 10–15).

## Como verificar

Sem sessão local disponível: as telas internas só abrem logadas e o app do cliente não tem mock. O login é por SMS no Supabase Auth (nuvem). O `.env` de dev aponta para o projeto `ozgkauepsjaefyhagcuo`, e ainda não foi confirmado se ele é a homologação ou a produção. Para virar verificação visual é preciso um celular de teste com código fixo configurado num projeto de homologação, mais dados de exemplo (`ALLOW_SEED=1 pnpm --filter @lagoa/api db:seed` no Postgres local do Docker ou na homologação). Até lá, a verificação das ondas é por testes (Vitest) e leitura de código.

## Plano seguinte

- **Onda 2 (plano atual):** 1, 2, 3, 4, 5, 6, 7.
- **Onda 3 (plano seguinte):** 8, 9, 15 (Resgate, Check-in, passos Ganhou/Entrou).
- **Onda 4:** 10, 11, 14 e itens de formulário do Perfil.
- **Pequeno e solto:** 12 (token do tamanho de título de seção), 13 (conferir a barra em 375px).
