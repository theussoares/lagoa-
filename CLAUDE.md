# Lagoa+

Clube de fidelidade para o comércio local (piloto em Três Lagoas/MS). O cliente
junta carimbos ou pontos nas lojas da cidade numa carteira única; o lojista
lança visitas no balcão e acompanha quem voltou; a rede aprova lojas e cobra o
plano.

Design de referência do MVP: https://claude.ai/artifact/BkmsXbbcBXZTe9GStye6Ui
Equipe de agentes e regras de uso dos modelos: [`EQUIPE.md`](./EQUIPE.md).

## Estado do projeto

- **Front:** Nuxt 4 (Vue 3, `<script setup lang="ts">`, Pinia).
- **Backend:** ainda não definido. Até o ADR do CTO sair, o front consome uma
  camada de API tipada e mockável em `layers/core` — nenhum componente chama
  `fetch`/`$fetch` direto.

## Superfícies

| Superfície | Formato             | Telas do MVP                                                                  |
| ---------- | ------------------- | ----------------------------------------------------------------------------- |
| Cliente    | mobile (390px)      | Entrar, Código e LGPD, Carteira, Cartão da loja, Check-in, Carimbo ganho, Resgate, Descobrir, Perfil |
| Lojista    | desktop (1280px)    | Criar o clube, Início, Balcão, Programa e prêmios, Clientes, Campanhas        |
| Admin      | desktop (1280px)    | Lojas (aprovação), Planos e cobrança, Métricas da rede, Vitrine Descobrir     |

## Glossário de domínio

- **Clube / programa:** a regra de fidelidade de uma loja. Modos: *cartão de
  carimbos* (N carimbos = prêmio), *pontos por real* e *pontos por visita*.
- **Carimbo / ponto:** unidade ganha a cada visita válida.
- **Lançar visita:** lojista digita o celular do cliente no Balcão e dá 1
  carimbo (ou lança por valor). Cliente novo ganha cartão na hora.
- **Check-in:** cliente escaneia o QR da loja e ganha o carimbo sozinho.
- **Antifraude:** no máximo 1 check-in por cliente/loja a cada janela
  configurável (ex.: 4 h, 1 dia).
- **Regras bônus:** boas-vindas (cartão começa com 2 carimbos), aniversário em
  dobro, traga um amigo (+1 quando o amigo faz a 1ª visita), dia surpresa em dobro.
- **Expiração:** carimbos vencem após X meses sem visita (ou nunca).
- **Resgate:** cliente gera um código de uso único (6 caracteres, ~10 min de
  validade); o lojista valida no Balcão e confirma a entrega. Prêmio não
  resgatado fica guardado 30 dias. Após o resgate o próximo cartão já começa
  andado se a regra de boas-vindas estiver ligada.
- **Descobrir:** vitrine das lojas da rede e desafios da cidade
  (ex.: "visite 3 lojas novas").
- **Clientes sumidos:** sem visita há mais de 30 dias; alvo de lembrete com
  carimbo bônus, só para quem aceitou avisos.
- **Plano Fundador:** R$ 79/mês com preço travado; lojas entram por aprovação
  do admin da rede.

## Regras que não se negociam

- **Celular é dado pessoal (LGPD).** Mascarado em listas
  (`(67) 9••••-0374`), nunca em logs, URLs, analytics ou métricas da rede. O
  admin vê só dados agregados.
- Consentimento de avisos é explícito e revogável; sem consentimento, sem
  campanha.
- Código de resgate e regras de antifraude são validados no servidor. O front
  só exibe.
- Toda string visível é pt-BR e passa pela camada de textos definida pelo
  Arquiteto (sem texto solto espalhado pelos componentes).
- Acessibilidade: alvos de toque ≥ 44px, contraste 4.5:1, elementos
  interativos reais (`<button>`, `<a>`, `<input>` + `<label>`).
