# Lagoa+ — Design System (MASTER)

> Ao construir uma tela, leia primeiro `design-system/lagoa/pages/<superfície>.md`.
> O que estiver lá sobrescreve este arquivo; o resto vale daqui.
>
> Código do tema: `layers/ui/app/assets/css/main.css` e `layers/ui/app/app.config.ts`.
> Lib: Nuxt UI v4 ([ADR-0001](../../docs/adr/0001-component-library.md)). Produto: [`PRODUCT.md`](../../PRODUCT.md).

## Mundo: Carimbo e Caderneta

O cartão de carimbo de papel levado a sério como interface: tinta de almofada
sobre cartão branco, a caderneta pautada do comércio de bairro. Cada visita é
uma impressão de verdade; o prêmio é um carimbo vermelho batido torto.

**Recusamos:** carteira fintech com anel de progresso, cartão herói azul-marinho,
dashboard SaaS de cards de métrica, gradiente, glass, emoji, roxo de IA,
skeuomorfismo de textura falsa (sem papel envelhecido, sem grão, sem sombra de
couro). O papel é sugerido por cor, régua e tinta, não por textura.

## Cor

Estratégia **restrita**: neutro de papel + uma tinta de ação. O vermelho é
reservado e raro.

| Papel | Token Nuxt UI | Claro | Escuro | Uso |
| --- | --- | --- | --- | --- |
| Tinta azul | `primary` → `tinta` | `tinta-700` #2E48A7 | `tinta-300` #A4BFFF | ação principal, carimbos batidos, foco, links |
| Tinta vermelha | `secondary` → `carimbo` | `carimbo-600` #B62C15 | `carimbo-300` #FDA796 | **só** prêmio liberado, resgate, código ativo |
| Folha | `success` → `folha` | `folha-600` #0D7A46 | `folha-300` | confirmação (carimbo lançado, código válido) |
| Erro | `error` → `red` | padrão Nuxt UI | padrão | erro de formulário e falha; sempre com ícone + texto |
| Aviso | `warning` → `amber` | padrão | padrão | antifraude, código perto de expirar |
| Mesa (neutro) | `neutral` → `mesa` | ver escala | ver escala | fundos, texto, régua |

Superfícies:

| Token | Claro | Escuro |
| --- | --- | --- |
| `--lagoa-desk` (fundo da página, a mesa) | `mesa-100` #E9EEF0 | `mesa-950` #181B1D |
| `--ui-bg` (cartão, folha, input) | #FFFFFF | #212628 |
| `--ui-text-highlighted` | `mesa-950` | `mesa-50` |
| `--ui-text` | `mesa-800` | `mesa-200` |
| `--ui-text-muted` | `mesa-600` (5.7:1 no branco) | `mesa-400` (5.7:1 no cartão) |
| `--lagoa-rule` (pauta da caderneta) | `mesa-200` | `mesa-800` |
| `--lagoa-slot` (casa vazia de carimbo) | `mesa-500` (≥3:1) | `mesa-500` (≥3:1) |

Contrastes verificados: branco sobre `tinta-700` 8.1:1; `tinta-700` sobre mesa
6.9:1; branco sobre `carimbo-600` 6.3:1; `mesa-900` sobre `tinta-300` 7.4:1.

Regras:

- Nunca hex solto em componente: só tokens (`text-primary`, `bg-default`,
  `var(--lagoa-desk)`).
- Vermelho nunca decora. Se aparece, existe prêmio ou código em jogo.
- Cor nunca é o único sinal: prêmio leva o texto "Prêmio liberado"; erro leva
  ícone e frase.
- Claro e escuro são desenhados juntos; escuro é "caderneta à noite", não
  inversão.

## Tipografia

Uma família: **Archivo** variável (eixos `wght` 100–900 e `wdth` 62–125),
self-hosted via `@fontsource-variable/archivo/wdth.css`. A largura condensada
faz o papel do letreiro de carimbo; a largura normal é o texto de leitura.

| Papel | Tamanho / altura | Peso | Largura | Uso |
| --- | --- | --- | --- | --- |
| `count` | 56 / 1.0 | 800 | 75% | o número que falta ("2") |
| `letreiro` | 20 / 1.1, caixa-alta, +0.02em | 700 | 75% | nome da loja no cartão, abas de módulo |
| `title` (`.type-title`) | 32 / 1.02, caixa-alta | 800 | 75% | título de tela, sempre sobre a régua dupla (`PageTitle`) |
| `h2` (`.type-h2`) | 22 / 1.2 | 650 | 95% | seção |
| `body` | 17 / 1.5 (app) · 16 / 1.5 (painel) | 400 | 100% | texto |
| `small` | 16 / 1.4 no app · 15 / 1.4 no painel | 450 | 100% | meta, data, apoio |
| `tag` (`.type-tag`) | 14 / 1.2, caixa-alta, +0.06em | 650 | 75% | número de carimbo, status curto, `StampTag` |

- App do cliente: nada abaixo de 16px, exceto tag (14px condensada). Painel: texto corrido nunca abaixo de 15px; nada abaixo de 14px.
- Números de contagem, telefone, código e valores: `tabular-nums`.
- Hierarquia por escala e largura, não por cor.
- Proibido: rótulo/eyebrow acima de título, texto em gradiente, mono como
  enfeite. Código de resgate pode usar a largura 62% em caixa-alta, não mono.

## Forma e elevação

| Elemento | Raio |
| --- | --- |
| Cartão, folha, módulo | 14px (`--radius-card`) |
| Botão, input, teclado | 10px (`--ui-radius`) |
| Casa de carimbo, impressão | círculo |
| Chip, filtro, badge | pílula |

- Uma elevação só: `--lagoa-shadow-card` (sombra tingida, offset + blur).
  Cartão com sombra não leva borda.
- Dentro do cartão separa-se com **régua** (1px `--lagoa-rule`), nunca com
  cartão aninhado.
- Sem `border-left` colorido, sem sombra dura deslocada.

## Espaço

Escala de 4px: 4, 8, 12, 16, 20, 24, 32, 40, 56. Margem lateral do app: 20px.
Mais espaço acima de um título do que abaixo. Entre alvos de toque: ≥ 8px.

## Ícones

Phosphor via Iconify (`@iconify-json/ph`, classes `i-ph-*`). Peso **regular**
na interface; peso **bold** dentro das impressões de carimbo. Nenhum SVG de
ícone desenhado à mão; nenhum emoji. Ícone sem texto exige `aria-label`.

## Motion

| Token | Valor | Uso |
| --- | --- | --- |
| `--lagoa-dur-fast` | 120ms | pressão, hover |
| `--lagoa-dur-base` | 200ms | troca de estado, folha abrindo |
| `--lagoa-dur-stamp` | 420ms | a batida do carimbo |
| `--ease-out-expo` | `cubic-bezier(.16,1,.3,1)` | entradas |
| `--ease-stamp` | `cubic-bezier(.34,1.4,.64,1)` | batida (leve rebote) |

**Interação assinatura: a batida do carimbo** (`.stamp-press`). A impressão
desce de cima maior e desfocada, assenta girando para sua inclinação
(`--stamp-tilt`, entre −6° e +6°, fixa por carimbo) e a tinta firma. No PWA,
`navigator.vibrate(15)` quando suportado. É o único momento coreografado do
produto: aparece no Carimbo ganho, no cartão quando o carimbo chega e na linha
nova da caderneta do Balcão. Todo o resto é troca de estado curta.

Os três tamanhos da batida:

| Momento | O que acontece |
| --- | --- |
| Carimbo comum | impressão grande (96px) cai sobre a régua do título, depois a casa do cartão recebe a tinta |
| Quase lá (mais uma visita igual a esta fecha o cartão) | igual, e "Falta só 1 carimbo!" é batido logo abaixo como letreiro em moldura de tinta |
| Prêmio liberado | impressão vermelha com o ícone de presente, título "Prêmio liberado", selo no cartão, vibração dupla. Só na batida que cruza a meta: com o prêmio guardado, as visitas seguintes são comuns |

No Balcão o `LaunchReceipt` é o canhoto do lançamento: impressão de 64px à
esquerda, título em letreiro, régua tracejada em cima e embaixo (não caixa cinza).

- `prefers-reduced-motion`: a impressão aparece já assentada, sem queda.
- Saídas ~65% da duração da entrada. Animação nunca bloqueia toque.
- Só `transform`, `opacity` e `filter`.

## Componentes

### Da lib (Nuxt UI), tematizados por `app.config.ts`

| Necessidade | Componente | Regra |
| --- | --- | --- |
| Ação | `UButton` | tamanho padrão `lg` (≥48px); um primário por tela; `xl` para "Dar 1 carimbo" e "Fazer check-in" |
| Campo | `UInput`, `UFormField`, `UForm` | label visível sempre; schema Zod de `shared/`; erro abaixo do campo |
| Código | `UPinInput` | 6 casas, caixa-alta, `tabular-nums`; dentro do `RedemptionStub` |
| Folha inferior | `UDrawer` | ações do cartão e confirmação no app |
| Aviso transitório | `UToast` | 4s; nunca para erro que exige ação |
| Painel | `UDashboardSidebar`, `UDashboardPanel` | navegação do lojista |
| Tabela | `UTable` | clientes; celular mascarado; números tabulares |
| Tema | claro por padrão | escolha claro/escuro no Perfil (app) e em Configurações (painel) |

### De domínio (`layers/ui`, construídos por nós)

| Componente | O que é |
| --- | --- |
| `StampCard` | o cartão: letreiro da loja, grade de casas, frase "faltam N para <prêmio>" |
| `StampSlot` | casa de carimbo: vazia (círculo pontilhado numerado) ou batida |
| `StampImpression` | impressão: anel duplo, ícone Phosphor bold, inclinação fixa, tinta azul (ou vermelha no prêmio) |
| `CardStack` | maço de cartões: topo inteiro, os próximos espiam pela borda, ordenados por proximidade do prêmio |
| `LedgerList` | caderneta: linhas pautadas (data/hora · loja ou celular mascarado · +1) |
| `RedemptionStub` | canhoto picotado com o código de 6 caracteres e o tempo restante |
| `CounterKeypad` | teclado 3×3 + 0 do Balcão, teclas de 64px |
| `PhoneDisplay` | visor do celular com máscara `(67) 9____-____`, dígitos grandes |
| `AppTabBar` | barra inferior do app: 4 destinos + check-in central |

Componentes de domínio são dumb (props/emits), recebem texto pronto e seguem
`CLAUDE.md`.

## Conteúdo e voz

- Fala com "você", frases curtas, verbo na frente: "Fazer check-in",
  "Resgatar prêmio", "Dar 1 carimbo".
- Todo cartão diz o que falta numa frase: "Faltam 2 para um corte grátis".
- Erro diz o problema e a saída: "Esse código venceu. Peça para o cliente
  gerar outro."
- Dados de exemplo nos mocks são marcados como exemplo; nada de números do
  piloto inventados.

## Acessibilidade

WCAG 2.2 AA. Alvos ≥ 44px (padrão 48px), texto base 17px no app, zoom
liberado, foco visível em tinta (2px, offset 2px), seleção de texto e foco
tematizados, elementos reais (`<button>`, `<a>`, `<input>` + `<label>`),
`aria-live="polite"` para "carimbo registrado" e contagem do código.

## Checklist antes de entregar uma tela

- [ ] Só tokens; nenhuma cor ou raio solto.
- [ ] Um primário por tela; vermelho só onde há prêmio/código.
- [ ] Claro e escuro conferidos lado a lado.
- [ ] Estados: carregando (esqueleto no formato final), vazio, erro, sucesso, offline.
- [ ] Celular mascarado em toda lista.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] 390px (app) ou 1280px (painel) sem rolagem horizontal; texto ampliado não quebra.

## Moldura autoral (o que substitui o padrão da lib)

A moldura das telas também é do mundo, não só os cartões:

| Em vez de | Use | Por quê |
| --- | --- | --- |
| `h1` solto com classes avulsas | `PageTitle` (letreiro 32px sobre `.ledger-rule`) | toda tela abre como página de caderneta |
| `UAlert` (caixa colorida) | `InkNote` (recorte pautado com carimbinho; tons `ink`, `warning`, `error`, `success`, `pencil` para modo de teste) | aviso é anotação na margem, não banner de SaaS |
| `UBadge` | `StampTag` (letreiro em moldura de tinta, levemente torto) | etiqueta batida, legível (14px) |
| barra de progresso (`UProgress`, trilho arredondado) | `SlotRow` (casas de carimbo) ou `InkRule` (régua com marcações) | progresso é casa carimbada ou marca na régua, nunca barra |
| gráfico de barras por dia | `TallyMarks` (risquinhos em grupos de 5) | contagem de caderneta |
| módulos abertos em fila (paredão de formulário) | `FoldModule` (folha dobrada: título + resumo do que vale; abre ao clicar ou sozinha quando há erro dentro) | o essencial fica aberto, o resto se lê sem abrir |
| `URadioGroup` desabilitado para opção travada | linha só de leitura com `StampTag` "Travado" | travado é decisão tomada, não controle apagado |
| `UNavigationMenu` na barra do painel | `SpineNav` (linhas pautadas; página aberta leva carimbinho) | a barra é a lombada da caderneta |
