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

**Evolução (out/2026, referência de produto aprovada):** o app do cliente passa
a ter cabeçalho de tela com foto da cidade, **um card herói por tela** e cards
de loja com foto, em verde-petróleo e lima, abrindo no escuro. O carimbo
continua sendo a assinatura (casas, impressão, batida); o que muda é a moldura:
mais imagem, cantos maiores, tipografia de produto.

**Recusamos:** carteira fintech com anel de progresso, dashboard SaaS de cards
de métrica, gradiente decorativo, glass, emoji, roxo de IA, skeuomorfismo de
textura falsa (sem papel envelhecido, sem grão, sem sombra de couro). Foto só
com função (a cidade no topo, a vitrine da loja); nunca como papel de parede.

## Cor

Estratégia **restrita**: uma tinta verde-petróleo profunda, um acento vivo (lima)
e neutros derivados deles. Nada de cinza azulado chapado. O vermelho é
reservado e raro. Referência estudada: enggaja.com (tinta escura + acento vivo,
bordas e texto de apoio no mesmo tom da tinta).

| Papel | Token Nuxt UI | Claro | Escuro | Uso |
| --- | --- | --- | --- | --- |
| Tinta | `primary` → `tinta` | `tinta-700` #167A48 | `tinta-300` #82DBA8 | ação principal, carimbos batidos, foco, links |
| Tinta profunda | `tinta-950` #0B3538 | texto forte, cabeçalho de tela | idem | títulos, `--lagoa-header` |
| Lima | `--color-lima-*` (acento, sem papel em `app.config`) | `lima-100` fundo / `lima-700` texto | `lima-900` / `lima-200` | "aberta agora", ícone do herói, destaque positivo; nunca ação |
| Carimbo | `secondary` → `carimbo` | `carimbo-600` #B62C15 | `carimbo-300` #FDA796 | **só** prêmio liberado, resgate, código ativo |
| Folha | `success` → `folha` | `folha-600` #0D7A46 | `folha-300` | confirmação (carimbo lançado, código válido) |
| Sol | `--color-sol-*` | `sol-100` / `sol-800` | `sol-900` / `sol-200` | selo de destaque ("Desafio do mês") |
| Erro / Aviso | `error` → `red`, `warning` → `amber` | padrão | padrão | sempre com ícone + texto |
| Mesa (neutro) | `neutral` → `mesa` | cinzas neutros, levemente quentes | ver superfícies | bordas, apoio |

Superfícies. **O app abre no escuro**; o claro é escolha da pessoa (Perfil /
Configurações). Fundo claro é branco puro (nada azulado: parece "tema de IA").

| Token | Claro | Escuro |
| --- | --- | --- |
| `--lagoa-desk` (fundo da página) | #FFFFFF | #08201F |
| `--ui-bg` (cartão, folha, input) | #FFFFFF | #0F2A2D |
| `--ui-bg-muted` / `-elevated` / `-accented` | `mesa-50` / `100` / `200` | #133438 / #194147 / #235157 |
| `--ui-text-highlighted` | `tinta-950` | #F3FBF6 |
| `--ui-text` / `-toned` / `-muted` | `mesa-800` / `700` / `600` | #D3E6DC / #B3CCBF / #8FB0A1 |
| `--lagoa-header` | `tinta-900` | `tinta-950` |
| `--lagoa-rule` (pauta) | `mesa-200` | branco 10% |
| `--lagoa-slot` (casa vazia) | `mesa-500` (≥3:1) | #6F9686 (≥3:1) |

Regras:

- Nunca hex solto em componente: só tokens (`text-primary`, `bg-default`,
  `var(--lagoa-desk)`, `--color-lima-*`).
- Vermelho nunca decora. Se aparece, existe prêmio ou código em jogo.
- Lima vivo só como fundo ou detalhe; texto lima usa `lima-700` (claro) ou
  `lima-200` (escuro) para manter 4.5:1.
- Cor nunca é o único sinal: prêmio leva o texto "Prêmio liberado"; erro leva
  ícone e frase.
- Claro e escuro são desenhados juntos; escuro é "caderneta à noite", não
  inversão.

## Tipografia

Duas famílias, ambas self-hosted via `@fontsource-variable`:

- **Bricolage Grotesque** (`--font-display`, `.font-display`): títulos, nome de
  loja, números grandes. Peso 700, tracking negativo (-0.025em).
- **Archivo** variável (`wght` 100–900, `wdth` 62–125): texto de leitura e o
  letreiro condensado de carimbo (`.letreiro`, só em impressões e selos).

| Papel | Tamanho / altura | Peso | Fonte | Uso |
| --- | --- | --- | --- | --- |
| `count` | 56 / 1.0 | 800 | display | o número que falta ("2") |
| `title` (`.type-title`) | 36 / 1.02 | 750 | display, -0.03em | título de tela (`PageTitle` no painel, `ScreenHeader` no app) |
| `h2` (`.type-h2`) | 24 / 1.15 | 700 | display, -0.02em | seção |
| `letreiro` | 20 / 1.1, caixa-alta, +0.02em | 700 | Archivo 75% | carimbo, selo, abas de módulo |
| `body` | 17 / 1.5 (app) · 16 / 1.5 (painel) | 400 | Archivo | texto |
| `small` | 16 / 1.4 no app · 15 / 1.4 no painel | 450 | Archivo | meta, data, apoio |
| `eyebrow-tag` | 13 / 1.2, caixa-alta, +0.12em | 700 | Archivo | selo e chip ("Desafio do mês", "Aberta agora") |
| `tag` (`.type-tag`) | 14 / 1.2, caixa-alta, +0.06em | 650 | Archivo 75% | número de carimbo, `StampTag` |

- App do cliente: nada abaixo de 16px, exceto tag/eyebrow (13–14px). Painel:
  texto corrido nunca abaixo de 15px; nada abaixo de 14px.
- Números de contagem, telefone, código e valores: `tabular-nums`.
- Hierarquia por escala e peso, não por cor.
- Proibido: texto em gradiente, mono como enfeite. Código de resgate pode usar
  a largura 62% em caixa-alta, não mono.

## Forma e elevação

| Elemento | Raio |
| --- | --- |
| Cartão, folha, módulo | 24px (`--radius-card`) |
| Ícone em medalhão, bloco interno | 16px (`rounded-2xl`) |
| Cabeçalho de tela (cantos de baixo) | 28px (`--radius-header`) |
| Botão | pílula |
| Input, teclado | 10px (`--ui-radius`) |
| Casa de carimbo, impressão | círculo |
| Chip, filtro, badge | pílula |

- Uma elevação só: `--lagoa-shadow-card` (filete de 1px + sombra tingida da
  tinta, difusa e baixa). Cartão com sombra não leva borda.
- Brilho do acento (`--lagoa-glow`) só em destaque pontual, nunca em lista.
- Foto: sempre com `object-cover`, texto sobre foto só em cima de véu
  (`--lagoa-scrim`) que garanta 4.5:1. Sem foto, a faixa cai para a cor
  `--lagoa-header` lisa; a tela nunca depende da imagem para ser legível.
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
| `--ease-elegant` | `cubic-bezier(.23,1,.32,1)` | entradas de card e ícone |
| `--lagoa-dur-rise` | 520ms | entrada de card |

**Entradas (de fora para dentro da tela):** `.rise` (sobe 20px e aparece,
escalonada por `--i` × 70ms), `.pop-tilt` (ícone entra girado e assenta),
`.live-dot` (anel que pulsa em "aberta agora"), `.slow-pan` (panorâmica lenta
da foto do cabeçalho). Todas desligam em `prefers-reduced-motion`.

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
| Código | `UPinInput` | 6 casas, caixa-alta, `tabular-nums`; dentro do `RedemptionStub`. Alfabeto sem sósias (`READABLE_CODE_ALPHABET`: sem 0/O, 1/I, 8/B, 5/S, 2/Z, U/V) |
| Folha inferior | `UDrawer` | ações do cartão e confirmação no app |
| Aviso transitório | `UToast` | 4s; nunca para erro que exige ação |
| Painel | `UDashboardSidebar`, `UDashboardPanel` | navegação do lojista |
| Tabela | `UTable` | clientes; celular mascarado; números tabulares |
| Tema | escuro por padrão | escolha claro/escuro no Perfil (app) e em Configurações (painel) |

### De domínio (`layers/ui`, construídos por nós)

| Componente | O que é |
| --- | --- |
| `StampCard` | o cartão: letreiro da loja, grade de casas, frase "faltam N para <prêmio>". A grade fecha em fileiras iguais (`slotGridStyle`: 8 casas = 4 + 4, nunca 5 + 3) e a casa tem sempre o tamanho de uma fileira cheia; cartão com menos casas fica mais estreito e centrado |
| `StampSlot` | casa de carimbo: vazia (círculo pontilhado numerado) ou batida |
| `StampImpression` | impressão: anel duplo, ícone Phosphor bold, inclinação fixa, tinta verde (ou vermelha no prêmio) |
| `CardStack` | maço de cartões: topo inteiro, os próximos espiam pela borda, ordenados por proximidade do prêmio |
| `LedgerList` | caderneta: linhas pautadas (data/hora · loja ou celular mascarado · +1) |
| `RedemptionStub` | canhoto picotado com o código de 6 caracteres e o tempo restante |
| `CounterKeypad` | teclado 3×3 + 0 do Balcão, teclas de 64px |
| `PhoneDisplay` | visor do celular com máscara `(67) 9____-____`, dígitos grandes |
| `AppTabBar` | barra inferior do app: 4 destinos + check-in central; o botão sobe 20px e o conteúdo reserva espaço para ele |
| `ScreenHeader` | faixa de topo do app do cliente: título, frase, foto opcional com véu e ações (busca, mapa, perfil). Substitui o `PageTitle` nas abas do app; o painel do lojista segue com `PageTitle` |
| `HeroCard` | o card único de destaque da tela (próximo prêmio, desafio do mês): selo `sol`, título, frase, progresso em `SlotRow` e ação. Uma por tela, sobe sobre a faixa do cabeçalho |
| `ShopCard` | loja com foto de capa, logo, nota, distância, status (Aberta agora) e a linha do prêmio. Sem foto, usa a cor da loja com o ícone dela |
| `MetricTile` | número do painel do lojista: rótulo `eyebrow-tag`, ícone em medalhão lima, valor em display 48px e frase de período. Três no topo do Início; o resto (caderneta da semana, sumidos) segue em `PanelModule` |
| `ShopTile` | versão compacta (foto + nome + nota) para carrossel horizontal de "Novas" |

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
| `h1` solto com classes avulsas | `PageTitle` (título display 36px, sem régua) | toda tela abre igual; no app do cliente o `ScreenHeader` faz esse papel |
| `UAlert` (caixa colorida) | `InkNote` (recorte pautado com carimbinho; tons `ink`, `warning`, `error`, `success`, `pencil` para modo de teste) | aviso é anotação na margem, não banner de SaaS |
| `UBadge` | `StampTag` (letreiro em moldura de tinta, levemente torto) | etiqueta batida, legível (14px) |
| barra de progresso (`UProgress`, trilho arredondado) | `SlotRow` (casas de carimbo) ou `InkRule` (régua com marcações) | progresso é casa carimbada ou marca na régua, nunca barra |
| gráfico de barras por dia | `TallyMarks` (risquinhos em grupos de 5) | contagem de caderneta |
| módulos abertos em fila (paredão de formulário) | `FoldModule` (folha dobrada: título + resumo do que vale; abre ao clicar ou sozinha quando há erro dentro) | o essencial fica aberto, o resto se lê sem abrir |
| `URadioGroup` desabilitado para opção travada | linha só de leitura com `StampTag` "Travado" | travado é decisão tomada, não controle apagado |
| `UNavigationMenu` na barra do painel | `SpineNav` (pílula por página; a aberta ganha fundo claro e ponto lima pulsando) | a barra lateral é sempre escura (`--lagoa-header`), no claro e no escuro |

## Telas do app do cliente (evolução)

- Toda aba abre com `ScreenHeader`; o primeiro conteúdo é o `HeroCard`, que
  sobe 40px sobre a faixa.
- Depois do herói, seções com `h2` e lista de `ShopCard`; "Novas" é carrossel
  de `ShopTile`.
- O texto de apoio fica em uma frase; nada de explicação repetida entre seção
  e card.
- Dados de exemplo (endereço, foto) vêm marcados nos mocks e nunca aparecem como
  texto de produção ("Endereço de exemplo" não vai para a tela).
