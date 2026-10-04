# Estudo: animação e gamificação no app do cliente

## Ponto de partida

- O design system (`MASTER.md`, Motion) diz que **a batida do carimbo é o único momento coreografado**. Todo o resto é troca de estado curta. Ampliar animação e jogo é uma decisão de produto: o `MASTER.md` muda junto.
- Público de 50+ a jovem, uso com uma mão, no balcão, com pressa. Alvos de 44 px, `prefers-reduced-motion`, só `transform`/`opacity`/`filter`, celular Android simples.
- Quem paga o prêmio é a loja. **Gamificação é cosmética**: sem custo para o lojista, sem promessa de prêmio novo. Bônus em unidades só vêm das regras que o lojista já liga.
- Quanto mais o app premia a visita, mais vale fraudar. Tudo que usa visita conta só visita já validada (janela de check-in no servidor).

## O que cabe no mundo "Carimbo e Caderneta"

| # | Ideia | O que o cliente vê | Custo | Dado novo |
|---|---|---|---|---|
| 1 | **Polimento de movimento** | Cartão que enche com a tinta, número do saldo que sobe, transição cartão da carteira para o detalhe, resposta tátil nos botões, esqueleto no lugar de spinner | baixo | nenhum |
| 2 | **Prêmio liberado em grande** | A batida vermelha ganha respingo de tinta e selo que gira; vibração dupla já existe | baixo | nenhum |
| 3 | **Passaporte da cidade** | Página da caderneta com um carimbo por loja visitada (cada loja tem o seu); página cheia vira selo | médio | derivado do ledger |
| 4 | **Selos de conquista** | "Primeira visita", "3 lojas novas", "Trouxe um amigo", "10 visitas". Aparecem como etiqueta batida (`StampTag`) | médio | derivado do ledger + indicações |
| 5 | **Sequência semanal** | "3 semanas seguidas" por loja ou na cidade; perde sem punição (volta a 1, sem aviso agressivo) | médio | derivado do ledger |
| 6 | **Desafios com progresso visível** | Os desafios do Descobrir ganham barra de tinta e celebração ao fechar | baixo | já existe em Descobrir |
| 7 | **Dia surpresa em destaque** | Etiqueta torta "hoje vale 2×" na loja, com o `live-dot` | baixo | já existe (`surpriseDay`) |

## O que fica de fora (por ora)

- Ranking entre pessoas e pontuação pública (expõe dado pessoal; LGPD).
- Moeda própria, loja de resgate, pontos que valem dinheiro (custo para o lojista; fraude).
- Notificação de "você vai perder a sequência" (pressão em público de 50+; exige consentimento de avisos).
- Confete genérico de biblioteca: quebra a identidade de papel e tinta.

## Ordem sugerida

1. **Fase A (sem backend):** itens 1, 2, 6, 7. Atualiza o `MASTER.md` (motion de cartão e prêmio) e ganha testes de `reduced-motion`.
2. **Fase B (API):** `GET /customer/achievements` calcula passaporte, selos e sequência a partir do ledger e das indicações (nenhuma tabela nova de escrita). Front: página "Caderneta" e selos no Perfil.
3. **Fase C:** medir (visitas por semana, retorno em 30 dias) antes de decidir sequência e novos selos.

## Decisões para o time

1. Aceitar mais de um momento coreografado e atualizar o `MASTER.md`?
2. Selos são só do app, ou o lojista pode criar o seu selo de loja no futuro?
3. Sequência semanal entra ou fica só em medição?

## Decisões registradas (2026-10)

1. `MASTER.md` atualizado: mais de um momento coreografado é permitido, sempre em papel e tinta.
2. **Ranking de pessoas entra**, com guardas: opt-in explícito e revogável, só **apelido** (nunca celular nem nome), conta só visitas já validadas no mês (fuso da cidade), sem prêmio. API: `GET /customer/ranking` e `PUT /customer/ranking/consent`; front: `/ranking` (link no Perfil).
3. Feito: respingo de tinta no selo de prêmio e o ranking. Contagem animada do "falta" foi testada e desistida (quebra snapshots e acessibilidade sem ganho claro).
