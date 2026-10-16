# Convite para guardar o Lagoa+ na tela inicial

Status: **implementado** (card, regra e testes; ícones ainda pendentes, ver §6). Caminhos de front relativos a `apps/web/`.

## 1. Contexto

Ainda não há app nas lojas. O cliente entra por QR/link, cria a conta por SMS e ganha o primeiro carimbo pelo QR da
visita. Na próxima compra ele precisa reencontrar o cartão na fila do balcão; guardar o Lagoa+ na tela inicial resolve
isso, e no iPhone é pré-requisito para aviso (push) no futuro.

Restrição de produto: **o convite nunca pode atrapalhar o fluxo no balcão** (entrar → código SMS → carimbar).

## 2. Quando mostrar

| Momento | Decisão |
| --- | --- |
| Antes do cadastro, no código SMS, na leitura do QR | Nunca. |
| Tela "Carimbo ganho" | Não. É a recompensa; o pedido a estragaria (regra pico-fim). |
| **Carteira, na primeira chegada depois do 1º ganho** | **Sim.** Card discreto e dispensável, sem modal. |
| Depois de dispensar | Pergunta de novo só depois do 2º e do 3º ganho (máximo 2 reaparições), depois nunca mais. |
| App já instalado (`display-mode: standalone`) ou instalação concluída | Nunca. |
| Navegador embutido (Instagram, WhatsApp, Facebook) | Não mostra o card; mostra "Abrir no navegador" só se o ganho veio de lá (fora do MVP). |

Aviso (notificação) é pedido **separado**, só depois de instalado, nunca no mesmo momento.

## 3. O que o card diz

- Título: "Guarde seu cartão na tela inicial"
- Apoio (o benefício, não "instale o app"): "Na próxima compra, abra com um toque."
- Ações: **Guardar** (primária) e **Agora não** (secundária, alvo ≥ 44 px).
- Toda string vem de `pt-BR.json` (`install.*`).

## 4. Como instala

| Plataforma | Mecanismo |
| --- | --- |
| Android / Chrome | Captura `beforeinstallprompt`; **Guardar** chama `prompt()` (só dentro do toque). Resultado `accepted` encerra o convite. |
| iPhone / Safari | Sem API. **Como guardar** abre, dentro do próprio card, 3 passos em texto (sem modal): Compartilhar → Adicionar à Tela de Início → Adicionar. |
| Outros (desktop, navegador embutido) | Não mostra. |

O navegador decide quando o convite nativo é possível; se o evento não chegar, o card de Android não aparece.

## 5. Regras e estado

- Estado do convite (`dismissedCount`, `lastDismissedAt`, `installed`) fica **só no aparelho** (`localStorage`), em
  composable dedicado, na linha de `useSeenStamps`. Não vai ao servidor, não tem celular.
- "Ganhos desde a última dispensa" vem do saldo/caderneta já carregados na Carteira; sem endpoint novo.
- Camadas: `useInstallPrompt()` (Browser API: evento, `matchMedia`, user agent) → `useInstallInviteScreen`/derivação na
  `useWalletScreen` → `components/wallet/InstallInvite.vue` (dumb, props + emits). Regra de "mostrar ou não" é função pura
  em `utils/` com teste.
- Acessibilidade: card é uma `<section>` com título; botões reais; botão dos passos com `aria-expanded`.

## 6. Pré-requisitos e riscos

1. **Ícones.** `nuxt.config.ts` publica manifest com `icons: []` e o service worker se autodestrói
   (`selfDestroying`). Sem ícones 192/512 (e `apple-touch-icon` 180) o Chrome não oferece instalação e o iPhone guarda
   um ícone genérico. **Bloqueio:** precisa da logo (PRODUCT.md proíbe marca inventada).
2. **Service worker.** Hoje desligado de propósito (navegação quebrava offline). O convite não exige cache; se o Chrome
   exigir SW para `beforeinstallprompt`, será preciso um SW mínimo sem cache de navegação. **Testar em aparelho real.**
3. **Sessão no iPhone.** O app instalado pode não compartilhar o cookie `lagoa_at` (httpOnly) do Safari e pedir novo login
   por SMS. Testar antes de promover a instalação; se acontecer, o texto do convite deve avisar ("vai pedir seu código
   uma vez").
4. **`start_url`** é `/carteira`, que exige sessão: confirmar que sem sessão cai em `/entrar` sem perder o link `#visita=`.

## 7. Critérios de aceite

- CA-1: nenhum convite aparece antes do 1º ganho nem na tela "Carimbo ganho".
- CA-2: após o 1º ganho, a Carteira mostra o card uma vez; **Agora não** o esconde e ele só volta após o 2º e o 3º ganho.
- CA-3: em Android com evento disponível, **Guardar** abre o diálogo nativo; aceito, o card some para sempre.
- CA-4: em iPhone/Safari, **Guardar** abre os 3 passos; **Agora não** conta como dispensa.
- CA-5: em modo `standalone` o card nunca aparece.
- CA-6: nenhum dado do convite vai ao servidor, a log ou a analytics com celular.
- CA-7: o fluxo entrar → SMS → carimbar não ganha nenhum passo nem tela nova.

## 8. Fora do escopo

Aviso/push, SW com cache offline, abrir fora do navegador embutido, loja de apps.

## 9. Nome "check-in" na interface

Na tela do cliente o termo passa a **"Carimbar"** (aba, título "Carimbar minha visita"); o histórico mostra
"QR da visita". O código mantém `checkIn` (glossário do `CLAUDE.md`). Textos do QR da loja dizem "entrar no clube".
