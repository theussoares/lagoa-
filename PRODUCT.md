# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

O app do cliente é uma PWA instalável (tela cheia, safe areas, câmera para o QR
de check-in). Painel do lojista e admin são web desktop.

## Stack

Nuxt 4 (Vue 3, `<script setup lang="ts">`, Pinia) com Nuxt UI v4 como lib de
componentes ([ADR-0001](docs/adr/0001-component-library.md)). Backend ainda não
definido: o front consome services com implementação mock.

## Users

- **Cliente:** morador de Três Lagoas/MS, de todas as idades (inclui 50+ e
  também público jovem acostumado a banco digital e delivery). Usa o celular no
  balcão da loja, com pressa e muitas vezes com uma mão só, para ganhar o
  carimbo e ver quanto falta para o prêmio.
- **Lojista:** dono ou atendente de comércio local (barbearia, café, pizzaria,
  pet shop, academia). Usa o painel no computador ou tablet do balcão, entre um
  atendimento e outro, para gerar o QR da visita na venda e validar
  resgates. Também configura o clube e vê quem sumiu.
- **Admin da rede:** aprova lojas, cobra o plano e vê métricas agregadas.

## Product Purpose

Clube de fidelidade da cidade: uma carteira única onde o cliente junta carimbos
ou pontos em várias lojas locais, e o lojista traz o cliente de volta sem
cartão de papel nem app próprio. Sucesso no piloto: lojas lançando visitas todo
dia, clientes voltando para resgatar e descobrindo lojas novas da rede.

## Positioning

Uma rede local, não um app por loja: o mesmo cartão vale no barbeiro, no café e
na pizzaria da cidade, e a vitrine Descobrir leva o cliente de uma loja para
outra. Para o lojista, o balcão é tão rápido quanto anotar no papel.

## Operating Context

- Balcão: na venda, o lojista gera um QR da visita de uso único (5 min), de
  carimbo ou com o valor da compra para dar pontos. Não digita o celular do
  cliente.
- Check-in: cliente escaneia o QR da visita (ou digita o código curto) e
  ganha; sem cartão, ganha o cartão na hora. Antifraude por janela (ex.: 1 por
  4 h). O QR do cartaz da loja só faz o cliente entrar no clube.
- Planos: Fundador R$ 79,90/mês e Fundador Pro R$ 89,90/mês (inclui clientes
  sumidos e campanhas), preço travado e sem fidelidade.
- Resgate: cliente gera código de 6 caracteres válido por ~10 min; lojista
  valida no Balcão e confirma a entrega.
- Modos de programa: cartão de carimbos, pontos por real, pontos por visita.
- Regras bônus: boas-vindas, aniversário em dobro, traga um amigo, dia surpresa.
- Clientes sumidos: sem visita há 30+ dias, alvo de lembrete com consentimento.

## Capabilities and Constraints

- Telas do MVP listadas no `CLAUDE.md` (cliente, lojista, admin).
- Celular é dado pessoal (LGPD): mascarado em listas, nunca em URL, log ou
  métrica; admin vê só agregados.
- Consentimento de avisos explícito e revogável.
- Código de resgate e antifraude validados no servidor; o front só exibe.
- Interface 100% pt-BR; código em inglês.
- Claro e escuro desde o MVP: abre no escuro; o claro é escolha da pessoa (Perfil no app, Configurações no painel).
- Em aberto: backend (ADR do CTO), ferramenta de analytics.

## Brand Commitments

- Nome: **Lagoa+**.
- O design de referência anterior (canvas "Lagoa+ — UI do MVP") vale como
  evidência de conteúdo e fluxo, não como identidade visual: o mundo visual
  será substituído.

## Evidence on Hand

- Design de referência com 15 telas e copy de exemplo:
  https://claude.ai/artifact/BkmsXbbcBXZTe9GStye6Ui
- Não há logo, fotos de lojas, depoimentos nem números reais do piloto. Nada
  disso deve ser inventado como fato; dados de exemplo ficam marcados como tal.

## Product Principles

1. **O balcão não espera.** Lançar visita e validar resgate cabem em segundos,
   sem leitura.
2. **Quanto falta é sempre visível.** Todo cartão diz em uma frase o que falta
   para o prêmio.
3. **A cidade é o produto.** Cada tela pode levar a outra loja da rede.
4. **Dado pessoal é tratado como dinheiro.** Mascarado, mínimo, com
   consentimento.
5. **Óbvio para quem tem 70, agradável para quem tem 20.**

## Accessibility & Inclusion

WCAG 2.2 AA. Público inclui pessoas 50+: texto base ≥ 16px, contraste 4.5:1,
alvos de toque ≥ 44px, suporte a zoom e texto ampliado, nada transmitido só por
cor, `prefers-reduced-motion` respeitado.
