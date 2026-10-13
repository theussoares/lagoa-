import type { Post } from '~/types/content'

export const POSTS: Post[] = [
  {
    slug: 'por-que-cliente-nao-volta',
    title: 'Por que o cliente compra uma vez e não volta',
    description: 'O problema do comércio local quase nunca é falta de cliente. É falta de motivo para voltar. Veja onde a volta se perde e o que fazer.',
    date: '2026-10-01',
    readingMinutes: 4,
    body: [
      { kind: 'p', text: 'Quando a loja está parada numa terça à tarde, a reação comum é buscar cliente novo: anúncio, promoção, post. Só que o cliente que já passou pela sua porta costuma ser o mais barato de trazer de volta, e é o que a maioria das lojas deixa ir embora.' },
      { kind: 'h2', text: 'A volta não acontece sozinha' },
      { kind: 'p', text: 'Quem compra e gosta nem sempre volta. A vida corre, o concorrente fica mais perto, a loja some da cabeça. Sem um motivo claro e simples para retornar, o cliente decide na hora de sair, e na maioria das vezes decide por nada.' },
      { kind: 'h2', text: 'Três lugares onde a volta se perde' },
      { kind: 'ul', items: [
        'Na saída: ninguém diz ao cliente o que ele ganha se voltar.',
        'Na semana seguinte: nada lembra a loja, e o cliente nem sabe quanto falta para um prêmio.',
        'No mês seguinte: o cliente sumiu e você só percebe quando olha o caixa.',
      ] },
      { kind: 'quote', text: 'Não é falta de cliente. É falta de motivo para ele voltar.' },
      { kind: 'h2', text: 'O que muda com um programa de fidelidade' },
      { kind: 'p', text: 'Um cartão de carimbos faz duas coisas ao mesmo tempo: dá ao cliente uma meta visível (faltam 2 para o corte grátis) e dá à loja uma razão para chamar o cliente de volta. A meta cria o hábito. O prêmio fecha o ciclo.' },
      { kind: 'p', text: 'O erro comum é achar que isso exige sistema caro ou cartão de papel que se perde na carteira. Hoje o carimbo cabe no celular do cliente, sem baixar aplicativo, e o lojista lança na própria venda.' },
      { kind: 'h2', text: 'Por onde começar' },
      { kind: 'ol', items: [
        'Escolha um prêmio que o cliente queira de verdade e que custe pouco para você.',
        'Defina uma meta alcançável: algo entre 5 e 10 visitas costuma ser percebido como possível.',
        'Ofereça o carimbo em toda venda, sem o cliente precisar pedir.',
        'Olhe uma vez por semana quem está há muito tempo sem aparecer.',
      ] },
    ],
  },
  {
    slug: 'quanto-custa-perder-cliente',
    title: 'Quanto custa perder um cliente (a conta que ninguém faz)',
    description: 'Uma conta simples, com o seu ticket médio, mostra quanto a loja deixa de ganhar quando o cliente não volta.',
    date: '2026-10-03',
    readingMinutes: 4,
    body: [
      { kind: 'p', text: 'A venda perdida não aparece em lugar nenhum. Não existe linha no caixa dizendo "o cliente que não voltou". Por isso é fácil achar que o problema é pequeno. A conta abaixo ajuda a enxergar.' },
      { kind: 'h2', text: 'A conta' },
      { kind: 'p', text: 'Pegue o seu ticket médio e multiplique por quantas vezes por ano um cliente satisfeito poderia voltar. Exemplo ilustrativo: com ticket médio de R$ 30 e um cliente que voltaria 6 vezes ao ano, cada cliente que some leva embora cerca de R$ 180 por ano. Troque pelos seus números.' },
      { kind: 'p', text: 'Agora pense em quantos clientes novos passam por semana e nunca mais voltam. Mesmo poucos já pesam, porque o valor se repete todo ano.' },
      { kind: 'h2', text: 'Por que é mais barato trazer de volta do que buscar um novo' },
      { kind: 'ul', items: [
        'O cliente que já comprou conhece a loja e confia.',
        'Você não paga anúncio para falar com ele: ele já está na sua base.',
        'Um prêmio pequeno costuma custar menos do que a verba para atrair um desconhecido.',
      ] },
      { kind: 'h2', text: 'Um plano que se paga' },
      { kind: 'p', text: 'No plano Fundador (R$ 79,90 por mês), com ticket médio de R$ 30, três voltas a mais no mês já cobrem o valor. É uma conta de exemplo: o resultado real depende da sua loja. Por isso o Lagoa+ não tem fidelidade: se não fizer sentido, você cancela.' },
      { kind: 'quote', text: 'O caixa de amanhã está na base de clientes de hoje.' },
    ],
  },
  {
    slug: 'cartao-de-papel-ou-digital',
    title: 'Cartão de carimbo de papel ou digital: qual vale mais a pena',
    description: 'Comparamos o cartãozinho de papel com o carimbo no celular: custo, fraude, perda e o que você aprende sobre o cliente.',
    date: '2026-10-06',
    readingMinutes: 5,
    body: [
      { kind: 'p', text: 'O cartão de papel funciona, e por isso durou tanto. Mas ele tem limites que a maioria dos lojistas já sentiu. Vale comparar com calma antes de decidir.' },
      { kind: 'h2', text: 'Onde o papel falha' },
      { kind: 'ul', items: [
        'Perde-se: o cartão fica na outra bolsa, na gaveta, na lavagem.',
        'Fraude fácil: carimbo se copia, e ninguém controla quantas vezes por dia foi usado.',
        'Zero informação: você não sabe quem voltou, quem sumiu nem quando.',
        'Custo escondido: impressão, carimbo, tinta, tempo de quem entrega.',
      ] },
      { kind: 'h2', text: 'O que o digital resolve' },
      { kind: 'p', text: 'No cartão digital o cliente não perde nada, porque o carimbo está no celular. O lojista gera um QR na venda, de uso único e com validade curta, e isso corta a fraude. E como cada visita fica registrada, dá para ver quem voltou e quem sumiu.' },
      { kind: 'h2', text: 'Onde o digital precisa ser simples' },
      { kind: 'p', text: 'Digital só ganha se não atrapalhar o balcão. Se o cliente precisa baixar aplicativo, criar senha e o lojista digitar telefone, a fila cresce e o programa morre em uma semana. O caminho é: um QR, uma leitura, carimbo na carteira.' },
      { kind: 'h2', text: 'Resumo' },
      { kind: 'ol', items: [
        'Papel: barato de começar, caro de manter e cego para você.',
        'Digital simples: um passo a mais no balcão, mas com controle e dado.',
        'Digital complicado: pior que o papel.',
      ] },
    ],
  },
  {
    slug: 'como-escolher-meta-do-carimbo',
    title: 'Como escolher a meta e o prêmio do cartão de carimbos',
    description: 'Quantos carimbos pedir e qual prêmio dar para que o cliente queira completar o cartão sem a loja perder margem.',
    date: '2026-10-09',
    readingMinutes: 4,
    body: [
      { kind: 'p', text: 'A meta e o prêmio são a única decisão de verdade do programa. Uma meta longa demais cansa. Um prêmio grande demais corrói a margem. Veja um jeito simples de acertar.' },
      { kind: 'h2', text: 'A meta: o cliente tem que sentir que dá' },
      { kind: 'p', text: 'Comece pela frequência natural do seu cliente. Se ele vem toda semana (café, padaria), 10 carimbos são alcançáveis em poucos meses. Se vem uma vez por mês (barbearia), 6 ou 8 já são uma boa meta. O cartão precisa ser completado dentro de um tempo em que o cliente ainda lembra do começo.' },
      { kind: 'h2', text: 'O prêmio: algo desejado e barato para você' },
      { kind: 'ul', items: [
        'Um serviço ou item de custo baixo e valor percebido alto (o corte grátis, a sobremesa).',
        'Algo que traga o cliente de novo, como um upgrade ou um item que ele ainda não experimentou.',
        'Evite descontos genéricos de porcentagem: o cliente não sente o prêmio.',
      ] },
      { kind: 'h2', text: 'Dê uma largada' },
      { kind: 'p', text: 'Cartão que já começa com carimbos andados convida a continuar. É a ideia do bônus de boas-vindas: quem começa andado tem pressa de terminar.' },
      { kind: 'h2', text: 'Ajuste depois' },
      { kind: 'p', text: 'Não precisa acertar de primeira. Observe por algumas semanas quantos clientes estão perto de completar e ajuste. No Lagoa+ você pode trocar a meta quando quiser: os cartões com saldo terminam na regra em que começaram.' },
    ],
  },
]

export function findPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug)
}
