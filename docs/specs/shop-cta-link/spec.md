# Botão do card da loja (link ou WhatsApp) — spec e handoff

Estado em 2026-10-16. Autor do desenho: sessão Opus; implementação: sessão Sonnet.

## Por quê

Hoje o lojista só consegue pôr **um WhatsApp** e o texto do botão (Configurações → "WhatsApp nos cards"). Muita loja
vende ou agenda por outro lugar (iFood, Booksy, Instagram, site próprio, cardápio online). O botão do card vira
"Chamar agora / Agendar agora / Comprar agora" apontando para **onde a loja realmente fecha a venda**, e ganha uma
tela própria no painel.

## Decisões do usuário (2026-10-16)

- **Um botão só** por loja (não uma lista de links).
- Aparece no **Descobrir e na Carteira**, como o botão de WhatsApp de hoje.
- **Todos os planos** (Fundador e Fundador Pro).
- **Tela própria no painel** para isso (sai de Configurações).
- Dois modos:
  1. **Link direto:** o lojista cola a URL e escreve o texto do botão.
  2. **WhatsApp:** o lojista põe o número e a mensagem que já aparece escrita no WhatsApp do cliente; nós montamos o link.

## Metas, não metas, antimetas

- **Metas:** cadastrar/trocar/tirar o botão numa tela clara; ver antes de salvar como o botão vai aparecer; o cliente
  toca e cai no lugar certo (WhatsApp com a mensagem pronta, ou o site).
- **Não metas:** vários links; "link na bio" da loja; contagem de cliques; moderação do link pelo admin; ícone escolhido
  pelo lojista.
- **Antimetas (seria falha mesmo funcionando):** aceitar `javascript:`/`data:`/`http:` ou qualquer coisa que não seja
  `https://` para um site público; o link abrir na mesma aba e tirar o cliente do app; texto do botão sem chave i18n
  quando é o padrão; quebrar lojas que já têm WhatsApp cadastrado.

## Decisões do desenho (minhas, revisáveis)

1. **Evoluir o `shopContact` que já existe**, não criar módulo novo. Mesmo endpoint (`GET/PUT /merchant/shop/contact`),
   mesma rota no BFF (`server/api/merchant/shop/contact.{get,put}.ts`), mesmo service no front. Menos churn e o dado já
   chega aos cards por `ShopSummary.contact`.
2. **União discriminada por `kind`** (`'whatsapp' | 'url'`) em vez de campos soltos.
3. Lojas com WhatsApp hoje viram `kind = 'whatsapp'` sem mensagem, pela migration. Nada muda para elas.
4. **Link direto exige texto do botão** (não há padrão bom para "um site qualquer"). WhatsApp sem texto usa o padrão
   `shopContact.defaultLabel` ("Falar no WhatsApp").
5. **Mensagem do WhatsApp opcional**, até `SHOP_WHATSAPP_MESSAGE_MAX_LENGTH = 300` caracteres. Quebra de linha vale.
6. **URL:** só `https:`; o que o lojista digitar sem esquema (`www.loja.com`, `loja.com/x`) ganha `https://` na frente
   antes de validar. Máximo `SHOP_CTA_URL_MAX_LENGTH = 500`. Recusa: usuário/senha na URL, host sem ponto, `localhost`,
   IP literal (v4 ou v6). O mesmo validador puro vive em `shared/` e roda no front, no BFF (schema) e na API (schema +
   CHECK no banco só para `^https://`).
7. **Tela nova** `/botao-do-card` (arquivo `pages/shop-link.vue`), item "Botão do card" na barra lateral do painel
   (ícone `i-ph-cursor-click`), logo depois de "Programa". Entra em `MERCHANT_SPA_ROUTES` no `nuxt.config.ts`.
8. O módulo "WhatsApp nos cards" **sai de Configurações** (Configurações fica com fotos e aparência).

## Contrato (`shared/`)

`shared/constants/domain.ts`: `SHOP_CTA_URL_MAX_LENGTH = 500`, `SHOP_WHATSAPP_MESSAGE_MAX_LENGTH = 300`
(`SHOP_CTA_LABEL_MAX_LENGTH = 24` já existe).

`shared/schemas/shop.ts` (substitui `ShopContactSchema`, `ShopContactUpdateSchema`, `ShopPublicContactSchema`):

```ts
const ShopCtaUrlSchema = z.string() /* trim → normaliza https:// → valida com isPublicHttpsUrl */ .brand<'ShopCtaUrl'>()
const WhatsappMessageSchema = z.string().trim().min(1).max(SHOP_WHATSAPP_MESSAGE_MAX_LENGTH)

export const ShopPublicContactSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('whatsapp'), whatsapp: PhoneNumberSchema, message: WhatsappMessageSchema.nullable(), ctaLabel: CtaLabelSchema.nullable() }),
  z.object({ kind: z.literal('url'), url: ShopCtaUrlSchema, ctaLabel: CtaLabelSchema }),
])
// O que o painel lê e grava: o botão ou nenhum.
export const ShopContactSchema = ShopPublicContactSchema.nullable()
export const ShopContactUpdateSchema = <mesma união com z.strictObject> .nullable()
```

`ShopSummary.contact` continua `ShopPublicContactSchema.optional()`.

`shared/utils/whatsapp.ts`: `whatsappLink(phone, message?)` → `https://wa.me/55<phone>` e, com mensagem,
`?text=${encodeURIComponent(message)}`.

`shared/utils/shopCtaUrl.ts` (novo): `normalizeShopCtaUrl(input): string` e `isPublicHttpsUrl(url): boolean` (usa `URL`;
regras do item 6). Testes cobrindo cada recusa e `www.` / `HTTPS://` / espaço em volta.

`shared/utils/shopContactHref.ts` (ou no mesmo arquivo do whatsapp): `shopContactHref(contact)` → whatsapp ou url.

## API (`apps/api`)

- Migration `0027_shop_cta_link` (gerar com `pnpm --filter @lagoa/api db:generate` e conferir):
  - colunas `cta_kind text`, `cta_url text`, `whatsapp_message text` em `shops`;
  - `UPDATE shops SET cta_kind = 'whatsapp' WHERE whatsapp IS NOT NULL`;
  - troca `shops_cta_label_check` por um CHECK por modo:
    - `cta_kind IS NULL` → `whatsapp`, `cta_url`, `whatsapp_message`, `cta_label` todos NULL;
    - `'whatsapp'` → `whatsapp` NOT NULL, `cta_url` NULL, `whatsapp_message` NULL ou 1..300;
    - `'url'` → `cta_url` NOT NULL e `~ '^https://'` e ≤ 500, `cta_label` NOT NULL, `whatsapp` e `whatsapp_message` NULL;
  - `cta_kind IN ('whatsapp','url')`. Mantém `shops_whatsapp_check`.
- `schema/shops.ts`, `drizzle-shop-contact.repository.ts` (`toContact` vira a união; linha que não passa no schema →
  `null`, como hoje), `shop-contact.rules.ts` (`planShopContact` agora só repassa a união/null; vale manter a função
  pelos testes), `catalog-row.ts`, `catalog-shop.ts`, `catalog.fixtures.ts`, `shop-summary.mapper.ts` (`contactOf` monta
  a união e valida com `ShopPublicContactSchema.safeParse`).
- Testes: `shop-contact.service.test.ts`, `shop-summary.mapper.test.ts`, `shop-contact.integration.test.ts` (cada
  CHECK recusa o que deve, incluindo `http://` e `url` sem label).
- **Banco:** a migration roda primeiro no banco de teste com os testes de integração (`lagoa-postgres` local via
  Docker; ver memória do time e `apps/api/README.md`). **Produção não é tarefa desta sessão.**

## BFF

`contact.put.ts` já valida com `ShopContactUpdateSchema`: só confirmar que o corpo `null` passa por `parsedBody`
(se `parsedBody` não aceitar `null`, mandar `{ contact: null }`… preferir ajustar o schema para
`z.strictObject({ contact: ShopPublicContactUpdate.nullable() })` nos dois lados — decisão do builder, desde que o
mesmo schema valha no BFF e na API).

## Front

**Cliente (`layers/customer`):** `utils/shopContact.ts` → `shopContactLink` usa `shopContactHref`; o `accessibleLabel`
depende do modo (`shopContact.accessibleLabel` "abre o WhatsApp" / novo `shopContact.accessibleLabelUrl`
"{label}: {shop} (abre outro site)"); o model ganha `icon` (`i-ph-whatsapp-logo` ou `i-ph-arrow-square-out`).
`ExternalLinkModel` em `layers/ui/app/types/discover.ts` ganha `icon?`. `ShopCard.vue` e `wallet/CardsContainer.vue`
usam `shop.contact.icon`. Conferir que o `<a>` final sai com `target="_blank"` e `rel` contendo `noopener noreferrer`
(o `UButton` com `external` põe `noopener`? verificar no HTML; se não, passar `rel` explícito).

**Lojista (`layers/merchant`):**
- `pages/shop-link.vue` (página fina, regra de páginas do CLAUDE.md) + `composables/useShopLinkScreen.ts`
  (evolução de `useShopContact`: modo escolhido, campos digitados × salvos como hoje, `save`, `remove`).
- `components/shop-link/`: `KindChoice.vue` (dois cartões-rádio reais: "WhatsApp" e "Link de um site"),
  `WhatsappFields.vue` (número + mensagem em `UTextarea` com contador), `UrlFields.vue` (URL `type="url"`
  `inputmode="url"`), `LabelField.vue` (texto + sugestões; sugestões por modo), `ButtonPreview.vue` (o botão como vai
  aparecer no card, mesmo `ActionButton`, mesmo ícone, desabilitado para clique; abaixo, "Testar link" abre o href em
  nova aba), barra de ações "Salvar" / "Tirar o botão".
- Sugestões: WhatsApp → "Chamar agora", "Agendar agora", "Pedir agora", "Falar no WhatsApp"; link → "Comprar agora",
  "Agendar agora", "Ver cardápio", "Pedir agora".
- `utils/shopContactForm.ts`: `toContactUpdate(form)` devolve `{ ok, update } | { ok: false, code }` com códigos
  `invalidWhatsapp`, `invalidUrl`, `missingLabel`.
- Remover `components/settings/ShopContact.vue` e o bloco em `pages/settings.vue`; ajustar o `lead` de Configurações.
- `layouts/merchant.vue`: item de navegação; `i18n`: `nav.shopLink`.
- `programPreviewModel.ts` mantém `contact: null`.
- Mock (`core/app/mock/handlers/shopContact.ts`, `queries.ts`) cumpre o mesmo contrato.

**Textos (pt-BR.json, chave `merchantShopLink.*`):** título "Botão do card"; lead "O botão aparece no card da sua loja
no Descobrir e na carteira de quem já é cliente. Escolha para onde ele leva."; erros "Digite um link que comece com
https://, como https://minhaloja.com.br." / "Escreva o texto do botão." Revisar com `design:ux-copy` se quiser.

## Segurança (ler `docs/security/SECURITY_RULES.md`)

- Link controlado pelo lojista aparece para clientes: validação de URL no servidor (schema na API + CHECK), nunca só no
  front. `target="_blank"` + `rel="noopener noreferrer"` (acrescentar `nofollow`).
- O número do WhatsApp é **do negócio** (público, já é assim hoje), não dado de cliente; ainda assim não logar.
- A mensagem pronta é texto do lojista: só vai codificada no `?text=`; nunca renderizada como HTML.
- Revisão final pelo agente `code-reviewer` (toca link externo exibido ao cliente).

## Plano de execução (ordem; TDD em cada passo)

1. Glossário no `CLAUDE.md`: atualizar a linha `shopContact` → "Botão do card da loja (WhatsApp com mensagem ou link)"
   `shopContact` (`kind: 'whatsapp' | 'url'`, `whatsapp`, `message`, `url`, `ctaLabel`).
2. `shared/`: constantes, `shopCtaUrl.ts` + testes, `whatsappLink` com mensagem + testes, schemas novos + testes.
3. API: migration + schema Drizzle + repository + mapper + testes unitários; depois integração no Postgres local.
4. BFF: ajustar/confirmar a rota PUT + teste em `server/test` se houver para contato.
5. Cliente: `shopContactLink` + ícone + labels acessíveis + testes de `discoverModel`/`walletCardModel`.
6. Lojista: tela nova, composable, componentes, mock, navegação, remoção em Configurações, textos.
7. `pnpm typecheck`, `pnpm test`, `pnpm typecheck:api`, `pnpm test:api` (com Postgres). Ver no navegador (mock:
   `NUXT_PUBLIC_MERCHANT_BACKEND=mock`, código `246810`) a tela nova nos dois modos e o card no Descobrir;
   screenshot como prova.
8. `code-reviewer`; corrigir o que for importante; atualizar a seção "Estado" deste arquivo; commit na branch e
   abrir PR para `develop` com a skill `abrir-pr` (perguntar antes de abrir).

## Deixado para o builder

Nome exato de componentes internos, layout fino da tela (seguir `design-system/lagoa/MASTER.md`, desktop 1280px,
alvos ≥ 44px), se o preview fica ao lado (desktop) ou abaixo dos campos, e o formato do corpo `null` no PUT (item BFF).

## Referência

- Formato do link de WhatsApp com mensagem: `https://wa.me/<DDI><número>?text=<mensagem codificada>`, número só com
  dígitos (sem `+`, parênteses ou zero à esquerda); codificar com `encodeURIComponent` (espaço `%20`, quebra `%0A`).
  O link só abre a conversa com o texto escrito; o cliente é quem envia.

## Estado (2026-10-16, implementação)

Passos 1 a 7 feitos na branch `claude/shop-cta-link-2f55e8`. Migration `0027_shop_cta_link` aplicada **só** no `lagoa_test` local
(container `lagoa-postgres`); produção não foi tocada e segue o `db:migrate:prod`.

**Desvios do desenho, com o porquê:**

1. **Envelope `{ contact }` no GET/PUT** (`ShopContactSchema`/`ShopContactUpdateSchema` são objetos com `contact: botão | null`),
   em vez de a união `.nullable()` pura. Corpo JSON `null` não passa pelo body-parser estrito do Express e a resposta `null` do
   Nest sai vazia; o envelope vale igual no BFF, na API e no mock. O BFF não precisou mudar (`contact.put.ts` já repassa o corpo validado).
2. **`ShopCtaUrl` sem tipo de marca**: o schema já recusa o que não é https público; a marca só obrigaria `as` nas fixtures.
3. **CHECK com `COALESCE(..., false)`**: sem ele um CHECK que dá `NULL` passa (ex.: `cta_label` solto com `cta_kind` nulo, ou
   `kind = 'url'` com `cta_url` nulo). Os testes de integração cobrem cada combinação recusada.
4. **Conversão linha → botão** em `apps/api/src/shops/shop-contact-columns.ts`, usada pelo repository do lojista e pelo catálogo
   (`catalog-row`); `CatalogShop.contact` já vem validado, e o mapper só repassa. Linha fora do contrato vira "sem botão".
5. **Composable de tela** devolve um `reactive` (`useShopLinkScreen`); sem container, a página compõe os componentes de `components/shop-link/`.
6. Cartões usam `rel="noopener noreferrer nofollow"` explícito (o `UButton external` só punha `noopener noreferrer`).

**Verificação:** `pnpm typecheck`, `pnpm test`, `pnpm typecheck:api` e `pnpm test:api` (com `TEST_DATABASE_URL` local) verdes.
Tela `/botao-do-card` vista no navegador com `NUXT_PUBLIC_MERCHANT_BACKEND=mock` nos dois modos (preview, erro de link, salvar).
O app do cliente não tem mock, então o card foi renderizado numa página descartável (não commitada) com o `toShopTeaserModel` e o
`ShopCard` reais: WhatsApp → `https://wa.me/5567991234567?text=Oi!%20Quero%20agendar`, link → `https://minhaloja.com.br/cardapio`,
ambos `target="_blank"` e rótulo de leitor de tela distinto ("abre o WhatsApp" / "abre outro site").

**Falta:** revisão do `code-reviewer`, PR para `develop` (perguntar antes), e a migration em produção (fora desta tarefa).

### Revisão do code-reviewer (aplicada)

- **URL canônica**: o schema de entrada grava `new URL(x).href` (`canonicalShopCtaUrl`), então `HTTPS://Loja.com`, `https:loja.com` ou barra invertida
  não batem no CHECK `^https://` (antes davam 500). Host só com rótulos `[a-z0-9-]` não vazios; porta fora do padrão recusada.
  Teste de integração: `HTTPS://Loja.com/Cardapio` salva como `https://loja.com/Cardapio`.
- **Erro ao carregar** o botão aparece na mensagem da tela e não deixa salvar às cegas; `unauthorized` derruba a sessão.
- `MOCK_STATE_VERSION` 9 → 10 (o formato de `contact` mudou).
- **Ordem de deploy obrigatória: migration `0027` → API → web.** O web novo valida `contact` com `kind`: contra a API antiga, a
  Carteira/Descobrir de lojas com WhatsApp falhariam. Entre a migration e a API nova, o PUT antigo (grava `whatsapp` sem `cta_kind`)
  recusa no CHECK: manter a janela curta.
- Segunda rodada (revisão do PR): `contact` inválido vira "sem botão" só da loja; corte de texto por code point e `whatsappLink` troca
  surrogate solto por U+FFFD (antes `encodeURIComponent` lançava); prévia sem `disabled` (mesmo visual do card, `inert`); ícone por modo
  em `shopContactIcon` (shared); códigos de erro do form derivados de um `as const`.
- Não feito (decisão): confirmação em "Tirar o botão" (é reversível em segundos: o lojista refaz o botão); sem teste de composável
  nem de BFF `contact.put` (cobertos pelos testes de schema e do mock; `useAsyncResult` exige montagem Nuxt).

## Deploy

O contrato de `ShopSummary.contact` e de `GET/PUT /merchant/shop/contact` mudou sem fase de compatibilidade. **Ordem obrigatória:**

1. **Migration `0027`** em produção, só pelo `db:migrate:prod` (teste primeiro, como manda o CLAUDE.md).
2. **Deploy da API.**
3. **Deploy do web.**

Por quê:

- **API antes da migration** quebra o `SELECT` do catálogo (as colunas `cta_kind`, `cta_url`, `whatsapp_message` não existem).
- **Web antes da API** quebra a tela do painel (o `GET /merchant/shop/contact` antigo não vem no envelope `{ contact }`). No cliente, o
  `ShopSummarySchema` agora trata `contact` fora do contrato (formato antigo `{ whatsapp, ctaLabel }`, sem `kind`) como "sem botão" **só daquela
  loja** (`.catch(undefined)`), então Descobrir e Carteira não caem: as lojas com WhatsApp só ficam sem o botão até a API nova subir.
- **Migration com a API antiga no ar**: o PUT antigo grava `whatsapp` sem `cta_kind` e o CHECK recusa. Manter a janela entre os passos 1 e 2 curta.

### Renumeração (0026 → 0027)

A produção já tem outra `0026` (`0026_otp_channel_choices`, PR 74, aplicada em 14/10), então a paridade recusou a nossa. O PR traz só a migration, o snapshot
e a tabela `otp_channel_choices` (schema `sms.ts`) daquela `0026`, na versão do commit `c8febd5` de `origin/feat/whatsapp-otp` (a que a produção aplicou, hash
`3517efac…`); a nossa virou `0027_shop_cta_link`. **Atenção:** o commit `552e9e5` dessa branch editou depois a `0026` já aplicada (acrescentou `ENABLE ROW LEVEL SECURITY`),
o que muda o hash e a paridade vai recusar quando ela for integrada; precisa virar uma migration nova lá.
