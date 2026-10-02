# Painel do lojista (desktop 1280px / tablet) — sobrescreve o MASTER

Direção completa: `.impeccable/surfaces/layers-merchant.md`.

## Layout

- `UDashboardSidebar` estreita (220px) em `mesa-950` no claro e no escuro, itens
  com ícone + texto: Início, Balcão, Clientes, Programa, Campanhas, Configurações.
- Área de trabalho sobre a mesa; módulos são folhas brancas com **aba de título**
  em `letreiro` 15px e régua fina embaixo. Densidade de balcão: espaço de 16px
  dentro do módulo, 20px entre módulos; nada de card de métrica gigante.
- Body 16px; tabelas 15px; números tabulares.

## Balcão (primeira tela)

Duas colunas (5/7):

- **Esquerda — lançar visita:** `PhoneDisplay` (dígitos 44px tabulares, máscara
  `(67) 9____-____`), `CounterKeypad` 3×3 + 0 com teclas de 64px (teclado físico
  também funciona), botão `xl` "Dar 1 carimbo" de largura total e botão
  secundário "Lançar por valor". Cliente novo: aviso em `success` "Cartão novo
  criado" na própria coluna.
- Abaixo: **Validar resgate** como `RedemptionStub` (canhoto picotado) com
  `UPinInput` de 6 casas; resultado válido/vencido/já usado em linha, com ícone.
- **Direita — caderneta de hoje:** `LedgerList` com hora, celular mascarado
  `(67) 9••••-0374`, ação (+1 carimbo, +N pontos, resgate) e a impressão; a
  linha nova entra no topo com a batida do carimbo.

## Outras telas

| Tela | Nota |
| --- | --- |
| Início | Caderneta da semana + clientes sumidos como lista acionável; números em linha de texto, não em card de métrica |
| Clientes | `UTable` com filtro "sumidos há 30+ dias"; celular sempre mascarado; sem exportar telefone |
| Programa e prêmios | Editor do clube com prévia viva do `StampCard` do cliente ao lado |
| Campanhas | Só para quem consentiu; contagem de alcance antes de enviar; confirmação explícita |
| Criar o clube | Passo a passo com prévia do cartão; indicador de etapas |

## Teclado

Balcão é operável só por teclado: dígitos digitam no visor, `Enter` dá o
carimbo, `Backspace` apaga, `Esc` limpa. Foco volta ao visor depois de cada
lançamento.
