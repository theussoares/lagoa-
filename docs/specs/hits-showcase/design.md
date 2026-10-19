# Hits, Descobrir em trilhos e barra nova — design

Estado em 2026-10-19. Saiu de uma conversa de brainstorming (Opus) com o dono do produto. Mockups de
referência: [`mockups/discover-hits-nav-v2.html`](./mockups/discover-hits-nav-v2.html) (dados de exemplo).
Próximo passo no fluxo do time ([`EQUIPE.md`](../../../EQUIPE.md)): spec do PO e `solution-design.md` do Arquiteto
a partir deste documento.

Depende do [painel de admin](../admin-panel/design.md) para aprovar produtos e vender destaque. Os dois
projetos andam juntos, mas o Hits só vai ao ar com a aprovação funcionando.

## Por quê

Inspiração: o **Hits do iFood**, uma vitrine curada dentro do app (ícone/banner na home), com filtros por tipo e um
selo de vantagem em cada card. Para nós, que não temos só comida (serviço, roupa, pet, beleza), a ideia vira duas
coisas:

1. **Descobrir passa a ser a vitrine chamariz das lojas:** onde o cliente acha a loja que rende mais carimbo ou
   ponto hoje, filtrando por ramo, com um carrossel de lojas em destaque no topo.
2. **Hits é a vitrine de produtos e serviços:** a loja posta o que vende ("Corte + barba R$ 45", "Camiseta linho
   R$ 59,90"), o cliente vê quanto aquilo rende no clube e toca para chamar no WhatsApp ou abrir o link de
   agendar/pedir.

Os dois servem ao princípio "a cidade é o produto": cada tela leva a outra loja da rede. E abrem uma segunda
receita além do plano: **destaque pago** (carrossel do Descobrir e banner do Hits).

## Decisões do dono do produto (2026-10-19)

- O mockup "A · Vitrine em trilhos" vira o **modelo do Descobrir**, com um **carrossel de lojas em destaque no
  topo**: só Fundador Pro ou quem pagar o destaque.
- **Hits** é uma aba nova onde **as lojas postam produtos**. Os **banners do topo do Hits** são só de Pro ou de
  quem pagar o destaque.
- **Barra de baixo nova:** Descobrir · Hits · **Carimbar** (centro) · Carteira (com Prêmios dentro) · Mais (menu
  com Ranking, Perfil etc.).
- **O app continua abrindo na Carteira** (o cliente no balcão quer ver quanto falta, sem toque a mais).
- Tocar num produto do Hits leva ao **WhatsApp com mensagem pronta ou a um link** (agendar, pedir), na mesma
  configuração do botão do card da loja, mas **o produto pode ter um botão diferente do da loja**.
- **Produto do Hits passa por aprovação da rede** antes de aparecer (no painel de admin).
- **Convidar amigo fica escondido** por enquanto, no app e no Balcão (tarefa separada, depois). O menu Mais não
  mostra o convite.

## Metas, não metas, antimetas

- **Metas:**
  - cliente filtra o Descobrir por ramo e vê, por trilho, onde rende mais hoje (dia surpresa, boas-vindas…);
  - cliente rola o Hits, vê preço e "rende X" de cada item, e chega ao WhatsApp/link da loja num toque;
  - lojista cadastra, edita, tira e acompanha a situação dos seus produtos no painel;
  - a rede aprova/recusa produtos e liga destaques por período no admin;
  - Pro aparece no carrossel do Descobrir sem ninguém ter que cadastrar nada.
- **Não metas:** carrinho, pagamento, pedido ou reserva dentro do Lagoa+; estoque; variações de produto (tamanho,
  cor); busca por texto; contagem de cliques; cobrança automática do destaque (a venda do destaque é combinada fora
  e lançada no admin); "Convidar amigo".
- **Antimetas (seria falha mesmo funcionando):**
  - produto aparecer sem aprovação, ou continuar aparecendo depois de editado sem nova aprovação;
  - produto de loja `pending`/`suspended` aparecer;
  - "rende X" calculado com uma cópia da regra em vez de `planEarning`, ou gravado e ficando velho quando a loja
    troca o programa;
  - banner/destaque sem marcação visível de "Destaque"/"Patrocinado";
  - o botão aceitar algo que não seja `https://` ou WhatsApp válido (mesmas regras do botão da loja);
  - a Carteira deixar de ser a tela inicial.

## Restrições do projeto que valem aqui

Todas as do [`CLAUDE.md`](../../../CLAUDE.md) e de [`SECURITY_RULES.md`](../../security/SECURITY_RULES.md). Em
especial: padrão controller → service → `*.rules.ts` → repository; toda query do lojista filtra pela loja do
`user.id` do JWT; BFF com um handler explícito por rota; lista que cresce sai com `limit`/cursor e sem N+1; índice
`DESC` com `nulls last`; textos em `pt-BR.json`; termo novo no glossário antes de virar código; foto só por
caminho no bucket, nunca URL gravada.

## Modelagem

### Ramo (filtro das duas telas)

`shop_category` hoje: `barbershop, beauty, cafe, bakery, pizzeria, restaurant, petShop, gym, other`. Não cobre roupa
nem serviço.

- Somar valores ao enum: `clothing`, `services`, `home` (lista final é do PO; ver "Deixado ao builder").
- Mapa puro em `shared/` de categoria → **ramo** (`shopGroup`): `food` (cafe, bakery, pizzeria, restaurant),
  `beauty` (barbershop, beauty), `clothing`, `services` (services, gym, home, other), `pet` (petShop). O filtro das
  telas usa o ramo; a loja continua escolhendo a categoria.

### `hit_items` (produto do Hits)

| Coluna | Tipo | Nota |
| --- | --- | --- |
| `id` | uuid | |
| `shop_id` | uuid → `shops` | |
| `title` | text | 1–60 caracteres |
| `description` | text null | até 140; opcional |
| `price_cents` | integer null | `null` = sem preço ("sob consulta"); > 0 quando houver |
| `photo_path` | text | caminho no bucket `shop-assets`, obrigatório |
| `cta_kind`, `whatsapp`, `whatsapp_message`, `cta_url`, `cta_label` | | **botão próprio, opcional**: mesmas colunas e o mesmo CHECK de `shops` (reaproveitar `shop-contact-columns.ts`); tudo `null` = usa o botão da loja; loja sem botão e produto sem botão = card sem botão |
| `status` | enum `hit_item_status` | `pending` · `approved` · `rejected` · `archived` |
| `rejection_reason` | text null | obrigatório quando `rejected`; o lojista vê |
| `ends_at` | timestamptz null | validade opcional; passou, some da vitrine sem mudar `status` |
| `created_at`, `updated_at`, `approved_at` | timestamptz | |

Regras (`hit-item.rules.ts`, puras):

- Lojista cria → `pending`. **Editar qualquer campo visível** de um item `approved` ou `rejected` → volta a
  `pending`. Arquivar é do lojista e vale a qualquer hora; desarquivar volta a `pending`.
- Teto de itens **não arquivados** por loja, por plano: constantes em `shared/` (`HIT_ITEMS_MAX_FOUNDER`,
  `HIT_ITEMS_MAX_FOUNDER_PRO`; valores do PO).
- A vitrine mostra só: item `approved`, `ends_at` nulo ou futuro, loja `approved`.

Índices: `(shop_id, created_at desc nulls last)` para o painel; `(status, approved_at desc nulls last)` parcial em
`status = 'approved'` para a vitrine; `(status, created_at)` parcial em `pending` para a fila do admin.

### `hit_item_status_events`

Mesmo padrão de `shop_status_events`: `hit_item_id`, `from_status`, `to_status`, `actor_admin_id` (→ admin do
[painel](../admin-panel/design.md)) ou `null` quando foi o lojista, `reason`, `created_at`.

### `featured_placements` (destaque pago)

| Coluna | Tipo | Nota |
| --- | --- | --- |
| `id` | uuid | |
| `shop_id` | uuid → `shops` | |
| `surface` | enum | `discoverCarousel` · `hitsBanner` |
| `hit_item_id` | uuid null → `hit_items` | só em `hitsBanner`; o banner mostra a foto/título do item |
| `starts_at`, `ends_at` | timestamptz | período pago; `ends_at > starts_at` |
| `created_by_admin_id` | uuid | quem lançou |
| `note` | text null | referência da venda (sem dado pessoal) |
| `cancelled_at` | timestamptz null | |

- **Vagas pagas (decisão do dono, 2026-10-19):** cada superfície tem um número fixo de vagas pagas
  (`FEATURED_PAID_SLOTS_DISCOVER`, `FEATURED_PAID_SLOTS_HITS`, valores do PO). Criar um destaque num período em que
  alguma hora já está com todas as vagas tomadas é **recusado** (regra pura + checagem com `FOR UPDATE`/lock na
  transação). O admin vê a agenda de vagas livres. Loja que pagou nunca fica fora do carrossel: as vagas pagas vêm
  primeiro e as Pro preenchem o resto do teto.
- **Carrossel do Descobrir** = lojas `approved` com plano `founderPro` (derivado do plano, **sem linha**) ∪ lojas com
  `discoverCarousel` vigente. Ordem: pago vigente primeiro, depois Pro; dentro de cada grupo, rotação estável por dia
  (para não ser sempre a mesma loja na frente). Teto de itens no carrossel em constante.
- **Banner do Hits** = `hitsBanner` vigente com item `approved` e dentro da validade. Pro tem direito a banner? Ver
  "Deixado ao builder": a decisão do dono foi "só Pro **ou** pago", então Pro sem linha também pode aparecer; o
  item usado é o mais recente aprovado.
- Tudo que é destaque leva o selo visível "Destaque" (Descobrir) ou "Patrocinado" (Hits).

### "Rende X"

**Decisão minha (revisável):** "rende X" é **igual para todo mundo**: a regra base do **programa ativo** da loja +
o multiplicador do **dia surpresa** quando ele vale hoje (é da loja, não do cliente). Aniversário, boas-vindas e a
versão antiga do programa de um cartão em andamento **ficam de fora** (são do cliente; a lista não é
personalizada e a consulta não junta cartões). Calculado na leitura com `planEarning` (montando a entrada sem
cliente), nunca uma cópia da regra e nunca gravado: por real → pontos do `price_cents`; por visita → "rende 1
carimbo" (ou N pontos), "2×" no dia surpresa. Sem preço, no modo por real, não mostra o selo.

### Ordem da grade do Hits

**Decisão do dono (2026-10-19):** aprovados mais recentes primeiro (`approved_at desc nulls last`), **sem
prioridade para Pro** (a vantagem do Pro é carrossel e banner). Cursor por `(approved_at, id)`.

### Plano e situação da loja

**Decisões minhas (revisáveis):**

- Pro que volta a Fundador com mais itens que o teto: os itens **continuam no ar**; a loja só não cria nem
  desarquiva até ficar abaixo do teto.
- Loja suspensa: some da vitrine (o filtro já exige loja `approved`); destaque pago vigente fica **pausado, não
  cancelado** (reembolso é decisão do admin). Nada é escrito em `hit_items` nem `featured_placements` ao suspender.

## API (`apps/api`)

Cliente (`customer/hits`, `customer/discover`):

- `GET /v1/hits?group=&cursor=` — itens da vitrine com loja (nome, ramo, bairro), "rende X" já montado como dado
  (unidade + quantidade, o front formata), botão efetivo (do item ou da loja). Paginado por cursor, `limit`.
- `GET /v1/hits/banners` — banners vigentes.
- `GET /v1/discover/shops` passa a trazer `featured` (carrossel) e o ramo de cada loja; os trilhos (dia surpresa,
  boas-vindas…) saem das `bonusRules` já existentes.

Lojista (`merchant/hits`): `GET /v1/merchant/hits`, `POST`, `PATCH /:id`, `POST /:id/archive`,
`POST /:id/unarchive`, upload da foto pelo mesmo fluxo de `merchant/shop-photo` (novo `ShopPhotoKind` ou caminho
próprio `hits/<id>`).

Admin: ver [admin-panel](../admin-panel/design.md) (`admin/hits`, `admin/featured`).

BFF: um handler explícito por rota (`server/api/hits/*`, `server/api/merchant/hits/*`).

## Front (`apps/web`)

Cliente:

- `AppTabBar`: Descobrir · Hits · Carimbar (centro) · Carteira · Mais. Tela inicial continua `/carteira`.
- **Descobrir** refeito no modelo "vitrine em trilhos": `ScreenHeader` + carrossel de destaque subindo sobre a faixa,
  chips de ramo, trilhos por tipo de oferta. Mantém os desafios (lugar no layout: builder).
- **Hits** (`pages/hits.vue`, slug `/hits`): banners, chips de ramo, grade de 2 colunas com foto, nome, loja, preço,
  selo "rende X" (âmbar, `sol`) e o botão. Abre em nova aba (mesma regra do botão da loja).
- **Carteira** ganha a aba Prêmios dentro (o conteúdo de `rewards.vue` passa para lá; a rota antiga redireciona).
- **Mais**: folha (bottom sheet) com Ranking, Perfil, Aparência, Ajuda. Sem Convidar amigo.

Lojista: tela nova **Hits** no painel (lista com situação e motivo de recusa, formulário com foto, prévia do card,
botão próprio opcional reaproveitando o editor do botão da loja, aviso de que editar volta para aprovação).

## Glossário (entra no `CLAUDE.md` antes do código)

| Domínio (pt-BR) | Código (en) |
| --- | --- |
| Hits (vitrine de produtos) | `hits` |
| Produto do Hits | `hitItem` |
| Situação do produto | `hitItemStatus` (`pending` \| `approved` \| `rejected` \| `archived`) |
| Banner do Hits | `hitsBanner` |
| Destaque pago | `featuredPlacement` (`surface`: `discoverCarousel` \| `hitsBanner`) |
| Ramo (filtro) | `shopGroup` |
| Menu Mais | `moreMenu` |

## Lançamento em fases (decisão do dono, 2026-10-19)

1. **Fase A:** [painel de admin](../admin-panel/design.md) + tela Hits do lojista. As lojas já cadastram e a rede
   aprova; nada aparece para o cliente.
2. **Fase B:** app do cliente (barra nova, Descobrir refeito, Hits, Prêmios na Carteira, menu Mais), tudo junto
   atrás de uma chave (`NUXT_PUBLIC_HITS_ENABLED`, no molde de `useCampaignsEnabled`).

## Deixado ao builder / ao PO

- Lista final de categorias novas e o mapa categoria → ramo (proposta acima).
- Tetos de itens por plano e de itens no carrossel.
- Pro sem destaque pago entra no banner do Hits automaticamente ou só no carrossel do Descobrir.
- Lugar dos desafios no Descobrir novo.
- Ícones da barra (Phosphor).

## Fora deste projeto

- Esconder "Convidar amigo" no app e no Balcão (tarefa própria, depois).
- Painel de admin: [design próprio](../admin-panel/design.md).
