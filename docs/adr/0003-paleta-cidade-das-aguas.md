# ADR-0003: Paleta "Cidade das Águas" (azul-lago e âmbar)

Status: aceita (2026-10-11)

## Contexto

O verde-petróleo com lima lia como "fintech genérica" e não tinha relação com Três Lagoas. O nome da cidade vem
das três lagoas urbanas (Lagoa Maior, do Meio e das Almas), ela é conhecida como "Cidade das Águas" e a Lagoa
Maior é o cartão-postal, com mirante para o pôr do sol (IBGE, Wikipédia, imprensa de turismo). Nenhuma fonte liga
a cidade ao verde. Não achamos fonte oficial sobre o significado das cores da bandeira.

## Decisão

- `tinta` (primary) passa a azul-lago: `tinta-700` #0F6381 (claro), `tinta-300` #74CBE3 (escuro), `tinta-950` #062B3A.
- O acento quente é o pôr do sol na lagoa: a rampa `sol` (âmbar, `sol-500` #F2A33A) substitui `lima`.
- `carimbo` (vermelho, só prêmio) e `folha` (verde, só confirmação) não mudam: o verde deixa de ser marca e fica
  só como "confirmado".
- Superfícies escuras vão para tons de lago (`--lagoa-desk` #061C24, `--ui-bg` #0A2631).
- Nome `tinta` mantido (é a tinta da almofada de carimbo): só mudam os valores.

## Contraste medido (WCAG)

Claro: branco sobre `tinta-700` 6,7:1; título 14,9:1; apoio 6,3:1; `sol-700` sobre `sol-100` 5,4:1.
Escuro: `tinta-950` sobre `tinta-300` 8,1:1; texto 12,5:1; apoio 7,0:1; ícone âmbar 7,6:1; casa vazia 4,25:1 (≥3:1).

## Consequências

- App, painel e landing mudam juntos (herdam `layers/ui`).
- Âmbar e vermelho do prêmio ficam próximos no escuro: o prêmio já leva texto e ícone, a cor nunca é o único sinal.
- Direção descartada: "Trilho e Papel" (carvão, ferrugem e creme), mais distinta, mas tira o app do escuro e o
  ferrugem fica perto do vermelho do prêmio.
