# Onda 5 — Botões, hierarquia e nomenclatura (app do cliente)

Data: 2026-10-12 · Escopo: telas do cliente (mobile 390px) · Fora: painel do lojista, Onda 6 (animações e cards) · Parte de: [customer-internal-design-design.md](./2026-10-12-customer-internal-design-design.md) · Auditoria: [customer-internal-design-audit.md](./2026-10-12-customer-internal-design-audit.md)

## Objetivo

Hoje cada tela escolhe `color` e `variant` do `UButton` à mão (11 `neutral`, 3 `error`, 1 `secondary`; 12 `outline`, 4 `ghost`, 1 `link`). O resultado é hierarquia plana (o Perfil tem três botões contornados iguais), a ação principal de um card de erro com aparência de secundária e o mesmo destino com rótulos diferentes ("carteira" tem 5). A onda troca a escolha manual por **papéis de ação** e fixa um **glossário de rótulos**.

## Referências validadas

- Material 3, botões: um botão em destaque por tela; preenchido para a ação final, contornado para alternativa/saída. https://m3.material.io/components/buttons/guidelines
- Apple HIG, botões: a ação principal leva a cor de destaque. https://developer.apple.com/design/human-interface-guidelines/buttons
- WCAG 2.2 1.4.11: indicador de foco com contraste mínimo de 3:1 contra o fundo. https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- NN/g, textos de interface: rótulo começa com verbo; mesmo verbo para o mesmo comando; evitar "OK/Continuar/Próximo". https://www.nngroup.com/articles/ui-copy/
- Carbon, botões: verbo + objeto; não truncar rótulo. https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines

## Entendimento acordado

Quem usa o app deve achar sempre a ação principal sem ler tudo, entender o que cada botão faz só pelo rótulo e ver o foco do teclado em qualquer fundo. Sucesso: nenhuma tela do cliente chama `UButton` com `color`/`variant`; uma tela tem no máximo um `primary`; um destino ou comando tem um só rótulo.

## Design

### 1. `ActionButton` (`layers/ui/app/components/ActionButton.vue`)

Componente de `layers/ui`: não conhece i18n (recebe `label` pronto ou slot), não conhece rota (repassa `to`/`type`/`@click` ao `UButton`).

Props: `role` (obrigatória), `surface` (`'light' | 'dark'`, padrão `'light'`), `size` opcional (`'lg' | 'xl'`), `block`, `loading`, `disabled`, `icon`, `to`, `type`.

| Papel | Nuxt UI | Tamanho padrão | Uso |
|---|---|---|---|
| `primary` | `color=primary variant=solid` | `xl` | a ação final da tela |
| `reward` | `color=secondary variant=solid` | `xl` | só levar ao resgate de prêmio |
| `secondary` | `color=neutral variant=outline` | `lg` | alternativa ou saída |
| `quiet` | `color=neutral variant=ghost` | `lg` | baixa prioridade |
| `danger` | `color=error variant=outline` | `lg` | abrir a confirmação de algo destrutivo |
| `dangerConfirm` | `color=error variant=solid` | `lg` | confirmar o destrutivo, dentro da confirmação |
| `inline` | `color=primary variant=link` | `lg` | link dentro de frase (acrescentado no plano) |

O mapa papel → `{ color, variant, size }` é um objeto constante em `layers/ui/app/utils/actionRole.ts` (estratégia plugável, sem `switch` espalhado). Tipos em `layers/ui/app/types/action.ts` (`ActionRole`, `ActionSurface`).

Regras de uso (documentadas no MASTER):
- Um `primary` por tela. Telas de configuração (Perfil) não têm `primary`.
- `reward` e `primary` não aparecem juntos na mesma região; quando há prêmio liberado, `reward` é o destaque e a outra ação cai para `secondary`.
- "Tentar de novo" de card de erro é `primary` (é a única ação do card).

### 2. Foco por fundo

`ActionButton surface="dark"` troca o anel de foco para `outline-white` (3:1 contra a faixa de tinta, WCAG 1.4.11). Sobre fundo claro vale o anel do tema (tinta, ≥ 2px).

Os ícones redondos do cabeçalho (voltar do Resgate, perfil da Carteira, mapa) hoje repetem as classes em três lugares. Viram `HeaderIconLink` (`layers/ui`), com `label` (nome acessível, obrigatório), `icon`, `to`, alvo ≥ 44px e foco branco. Fecha o ponto aberto da Onda 3 (`BackLink` e link da Carteira).

### 3. Glossário de rótulos (`pt-BR.json`, chaves em inglês)

Verbo + objeto; um destino ou comando, um rótulo.

| Intenção | Rótulo | Onde hoje diverge |
|---|---|---|
| Ir à Carteira | "Ver carteira" | "Ver na carteira", "Abrir a carteira", "Carteira" |
| Voltar à Carteira | "Voltar para a carteira" | — |
| Ir ao resgate | "Resgatar prêmio" | "Mostrar código no balcão" (Prêmios) |
| Remover aniversário | "Tirar aniversário"; confirma "Tirar aniversário"; cancela "Manter a data" | "Tirar a data", "Manter" |
| Apagar conta | "Apagar minha conta"; confirma "Apagar minha conta"; cancela "Manter minha conta" | "Sim, apagar tudo" |
| Digitar o código | "Digitar o código da visita" | "Tenho o código da visita" |

Rótulos que já estão corretos (verbo + objeto, único) ficam: "Tentar de novo", "Ver lojas da rede", "Baixar meus dados", "Sair desta conta", "Receber código", "Reenviar código", "Escanear de novo". A lista final de cada tela sai do plano, após varrer `pt-BR.json`; o glossário vira tabela no MASTER.

### 4. Hierarquia por tela

| Tela | Ajuste |
|---|---|
| Carteira (erro) | "Tentar de novo" vira `primary` |
| Carimbo ganho | prêmio liberado: `reward` "Resgatar prêmio" + `secondary` "Ver carteira"; sem prêmio: `primary` "Ver carteira" |
| Carteira (resgate) | `reward` "Resgatar prêmio" |
| Prêmios | ação de resgate com o rótulo e o papel do glossário |
| Perfil | Ranking vira linha de navegação (não botão); "Baixar meus dados" `secondary`; "Sair desta conta" `quiet`; "Apagar minha conta" `danger`; confirmação com `dangerConfirm` + `secondary` |
| Aniversário | "Tirar aniversário" `danger`; confirmar `dangerConfirm`; "Manter a data" `secondary` |
| Check-in | escanear/entrar `primary`; "Digitar o código da visita" `secondary` |
| Entrar | "Receber código" `primary`; "Reenviar código" `quiet` |
| Ranking, Descobrir, Convite | papéis conforme a tabela, sem mudança visual além da cor/variante |

"Salvar aniversário" é `primary` `size=lg`: é o envio do próprio formulário (a regra "Perfil sem primary" vale para ações da página).

Telas listadas só como exemplo acima são fechadas no plano, uma a uma, contra o código atual (19 arquivos do cliente usam `UButton`).

### 5. Garantias (testes)

- `ActionButton`: um teste por papel confere `color`/`variant`/`size` resultantes; `surface="dark"` confere a classe de foco branco; `loading`/`disabled` repassados.
- `HeaderIconLink`: nome acessível obrigatório, alvo ≥ 44px, foco branco.
- Contraste por cálculo: texto branco sobre `carimbo-600` e sobre `tinta-700` ≥ 4.5:1; foco branco sobre a faixa de tinta ≥ 3:1.
- Convenção (`conventions.test.ts`): proíbe `<UButton` com `color` ou `variant` em `layers/customer/app` (lista transitória só encolhe; meta: vazia no fim da onda) e proíbe `outline-white` solto fora de `ActionButton`/`HeaderIconLink`.
- Glossário: teste sobre `pt-BR.json` garante que os rótulos antigos listados na seção 3 não voltam.
- Cada tela alterada mantém seu teste de tela e ganha asserções do papel do botão principal.

## Fora do escopo

Painel do lojista; animações e novo tratamento de cards (Onda 6); tokens de tamanho de texto (item 12 da auditoria); troca de cores da marca.

## Riscos

- Mudar rótulos quebra testes que buscam texto: atualizar junto, no mesmo commit da troca.
- `reward` sobre foto escura precisa de `surface="dark"` quando o botão ficar sobre a faixa; conferir no navegador (Carimbo ganho).
- Ranking como linha de navegação muda o toque no Perfil: alvo ≥ 44px e `NuxtLink` real.
