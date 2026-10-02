# App do cliente (PWA, 390px) — sobrescreve o MASTER

Direção completa: `.impeccable/surfaces/layers-customer.md`.

## Layout

- Viewport de referência 390×844; `min-h-dvh`; safe areas (`env(safe-area-inset-*)`)
  no topo e na barra inferior.
- Margem lateral 20px. Fundo da tela é a mesa (`--lagoa-desk`); conteúdo vive em cartões brancos.
- `AppTabBar` fixa embaixo: Carteira · Descobrir · **Check-in** (centro, botão
  redondo de 64px em tinta) · Prêmios · Perfil. Conteúdo reserva a altura da barra.

## Carteira (primeira tela)

1. Saudação curta e avatar (uma linha, sem título grande).
2. `CardStack` ocupa ~60% da altura: o cartão do topo é o clube mais perto do
   prêmio. Letreiro da loja, grade 2×5 de `StampSlot` numeradas, frase
   "Faltam **2** para um corte grátis" com o número no tamanho `count`.
3. Abaixo, as bordas dos próximos cartões espiam (12px cada, até 3) com
   letreiro e "faltam N"; tocar traz o cartão para o topo (troca com
   `--lagoa-dur-base`).
4. Cartão com prêmio liberado sobe para o topo e recebe a impressão vermelha
   "PRÊMIO LIBERADO" e o botão "Resgatar prêmio".
5. Depois do maço: a caderneta (`LedgerList`) com as últimas visitas.

## Telas e o que muda

| Tela | Nota |
| --- | --- |
| Entrar / Código e LGPD | Um campo por tela; `inputmode="tel"`, `autocomplete="tel"`; código via `UPinInput` com `autocomplete="one-time-code"`; consentimento de avisos é um switch desligado por padrão com texto claro |
| Cartão da loja | Cartão inteiro + regras bônus como linhas pautadas; endereço e horário |
| Check-in | Câmera em tela cheia com moldura; fallback "digitar código da loja"; antifraude mostra quando libera de novo ("Próximo carimbo aqui a partir das 18h") em `warning` |
| Carimbo ganho | Tela da batida: cartão no centro, a nova impressão cai com `.stamp-press`; frase do que falta; `aria-live` |
| Resgate | `RedemptionStub` com código grande e contagem de 10 min; brilho de tela não é alterado pelo app |
| Descobrir | Lista de lojas como cartões em branco (sem carimbo ainda) com letreiro e regra do clube; desafios como cartão com casas por loja |
| Perfil | Consentimentos revogáveis, dados, sair |

## Tipografia aqui

Body 17px. `count` 56px só no cartão do topo e no Carimbo ganho.
