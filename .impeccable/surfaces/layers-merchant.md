---
version: 1
slug: "layers-merchant"
primary_target: "layers/merchant"
related_targets: []
---

# Superfície: painel do lojista (desktop 1280px, tablet no balcão)

- **Modo:** Operate. Atendente entre um cliente e outro; olha de relance, digita rápido.
- **Tarefa principal:** Balcão: digitar celular, dar 1 carimbo ou lançar por valor, validar código de resgate. Depois: clientes sumidos, programa, campanhas.
- **Estados que importam:** cliente novo (cartão criado na hora), carimbo lançado, código válido/expirado/já usado, sem conexão, celular incompleto.
- **Momento memorável:** a mesma batida do carimbo, agora do lado de quem carimba.

## Direction contract

THESIS: O Balcão é a caderneta do comércio de bairro: digitou, carimbou, anotou. Tão rápido quanto papel. Recusa o dashboard SaaS de cards de métrica com gráfico decorativo.

OWN-WORLD: Mesmo mundo do cliente: mesa cinza-papel, cartões brancos, tinta azul para ação, vermelho só para prêmio/resgate. Módulos com régua fina e aba de título em Archivo condensada caixa-alta (densidade de balcão, sem espaço inflado). Celular sempre mascarado; números tabulares.

STORY: Atendente digita o celular, aperta um botão grande e vê a linha nova cair na caderneta do dia com a impressão do carimbo; valida um código como quem confere um canhoto.

FIRST VIEWPORT: Balcão em duas colunas: à esquerda, visor do celular em dígitos grandes, teclado 3×3 de 64px e o botão "Dar 1 carimbo" de largura total; abaixo, canhoto picotado com 6 casas para o código de resgate. À direita, a caderneta de hoje: linhas pautadas com hora, celular mascarado, loja e impressão. Barra lateral estreita de navegação em tinta.

FORM: Carimbo e Caderneta, candidato 1 da lista (IMPECCABLE'S PICK, escolhido pelo usuário), seed 7562e27b. Elevação do recusado Portal Japonês Denso: módulos com régua e aba. Interação assinatura: carimbo bate na linha nova da caderneta.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
