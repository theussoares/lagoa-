import type { GuideText } from '~/types/content'
import { REDEMPTION_CODE_LENGTH, REDEMPTION_CODE_TTL_MINUTES, REWARD_HOLD_DAYS, VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'

export const GUIDE_TEXTS: GuideText[] = [
  {
    id: 'getStarted',
    slug: 'comecar',
    title: 'Começar: do WhatsApp ao primeiro carimbo',
    description: 'O que acontece desde o primeiro contato até o seu clube funcionando no balcão.',
    body: [
      { kind: 'p', text: 'Montar o clube leva poucos passos, e a Equipe Lagoa+ faz a implantação com você, sem custo.' },
      { kind: 'ol', items: [
        'Você chama a rede no WhatsApp e conta sobre a sua loja.',
        'A Equipe Lagoa+ responde em até 24 horas e conversa com você antes de aprovar.',
        'Com a loja aprovada, vocês montam o clube juntos: meta, prêmio e regras.',
        'Você imprime o cartaz com o QR da loja e coloca no balcão.',
        'Na primeira venda, gere o QR da visita e mostre ao cliente.',
      ] },
      { kind: 'h2', text: 'Preciso de equipamento novo?' },
      { kind: 'p', text: 'Não. O Balcão roda no navegador do computador, do tablet ou do celular que já fica na loja. O cliente também não baixa aplicativo: a carteira abre no navegador e pode ser instalada na tela inicial.' },
    ],
  },
  {
    id: 'generateQr',
    slug: 'gerar-qr',
    title: 'Gerar o QR da visita na venda',
    description: 'Como lançar a visita no Balcão em poucos segundos e o que torna o QR seguro.',
    body: [
      { kind: 'p', text: `Na venda, você abre o Balcão e gera o QR da visita. Cada QR vale uma vez só e expira em ${VISIT_QR_TTL_MINUTES} minutos.` },
      { kind: 'h2', text: 'Dois tipos de QR' },
      { kind: 'ul', items: [
        'Carimbo: o cliente ganha o carimbo da visita.',
        'Por valor: você informa o valor da compra e, nos pontos por real, o cliente ganha pontos proporcionais.',
      ] },
      { kind: 'h2', text: 'O cliente escaneia' },
      { kind: 'p', text: 'O cliente aponta a câmera para o QR. Se preferir, digita o código curto que aparece na tela. Quem ainda não tem cartão já sai com ele. Você não digita o celular do cliente em nenhum momento.' },
      { kind: 'h2', text: 'Antifraude' },
      { kind: 'p', text: 'Cada cliente ganha no máximo uma visita que rende por janela de tempo que você define (por exemplo, uma vez por dia). Se o cliente tentar antes, a recusa não gasta o QR.' },
    ],
  },
  {
    id: 'redemption',
    slug: 'resgate',
    title: 'Resgate: validar e entregar o prêmio',
    description: 'O passo a passo para conferir o código do cliente e entregar o prêmio no balcão.',
    body: [
      { kind: 'p', text: `Quando o cartão completa, o cliente gera um código de ${REDEMPTION_CODE_LENGTH} letras e números que vale por cerca de ${REDEMPTION_CODE_TTL_MINUTES} minutos.` },
      { kind: 'ol', items: [
        'O cliente mostra o código na tela do celular.',
        'Você digita o código no Balcão e confere.',
        'Se for válido, o Balcão mostra o prêmio. Você entrega e confirma.',
        'O próximo cartão do cliente já pode começar andado, se a regra de boas-vindas estiver ligada.',
      ] },
      { kind: 'p', text: `O prêmio que o cliente não resgatar fica guardado por ${REWARD_HOLD_DAYS} dias. O código é de uso único e a validação é sempre feita no servidor.` },
    ],
  },
  {
    id: 'bonusRules',
    slug: 'regras-bonus',
    title: 'Regras bônus: aniversário, indicação e dia surpresa',
    description: 'Como ligar as regras que dão movimento no dia fraco e trazem cliente novo.',
    body: [
      { kind: 'p', text: 'As regras bônus são opcionais. Ligue só as que fazem sentido para a sua loja. Se duas regras caírem no mesmo dia, vale a maior: elas não se somam.' },
      { kind: 'ul', items: [
        'Boas-vindas: o cartão começa com 2 carimbos. Quem começa andado tem pressa de terminar.',
        'Indicação (traga um amigo): quem indica ganha +1 quando o amigo faz a primeira visita.',
        'Aniversário: no dia do aniversário, cada visita vale dois carimbos.',
        'Dia surpresa: carimbo em dobro só no dia que você escolher, ótimo para o dia fraco.',
      ] },
      { kind: 'h2', text: 'Sobre o aniversário' },
      { kind: 'p', text: 'O cliente informa dia e mês no perfil. A primeira data é livre; depois, a troca fica travada por 365 dias, para o bônus não virar dobro todo dia.' },
    ],
  },
]
