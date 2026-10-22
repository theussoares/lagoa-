// Who works here: desk, look and what each one likes to do when there is no task.
// idle weights: desk (stays at the desk doing role stuff), coffee (goes to the copa and comes back with a mug),
// copa (chats at the bar table), lounge (video game / sofa), chat (visits a colleague), review (shows something
// on a colleague's screen), roam (walks around the devs), board (kanban), huddle (whiteboard), bug (QA finds a bug).

const SKIN = [0xf1c9a5, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa66e4a]
const HAIR = { black: 0x1e1a17, brown: 0x5a3825, blond: 0xd9b26f, red: 0x9c3d1e, grey: 0x9a9a9a, blue: 0x3f6fd0 }

export const ROLES = {
  main: {
    name: 'Claude (gerente)', room: 'diretoria', desk: [-11.5, -9], dual: true, item: 'books', planner: true,
    look: { model: 'male-a', skin: SKIN[1], hair: 'short', hairColor: HAIR.black, glasses: true, outfit: 'suit', top: 0x2d3142, tie: 0xe8743b, bottom: 0x22252f, height: 1.02 },
    idle: { desk: 4, chat: 2, coffee: 2, copa: 1 }, chatWith: ['cto', 'tech-lead'],
  },
  cto: {
    name: 'CTO', room: 'diretoria', desk: [-6.5, -9], dual: true, item: 'mug', planner: true,
    look: { model: 'male-d', skin: SKIN[3], hair: 'bald', beard: true, beardColor: HAIR.grey, outfit: 'suit', top: 0x1f2a3a, tie: 0xb5473f, bottom: 0x1a1f28, height: 1.06, width: 1.1 },
    idle: { desk: 3, chat: 3, coffee: 1, copa: 1 }, chatWith: ['tech-lead', 'engenheiro', 'product-owner', 'main'],
  },
  'tech-lead': {
    name: 'Tech Lead', room: 'diretoria', desk: [-11.5, -4], dual: true, item: 'headphones', planner: true,
    look: { model: 'male-b', skin: SKIN[0], hair: 'curly', hairColor: HAIR.brown, glasses: true, outfit: 'shirt', top: 0x6c8ebf, bottom: 0x3a3f4b },
    idle: { roam: 4, review: 2, desk: 2, coffee: 1, copa: 1 },
  },
  'product-owner': {
    name: 'PO', room: 'produto', desk: [11, -9], item: 'plant', planner: true,
    look: { model: 'female-a', skin: SKIN[4], hair: 'long', hairColor: HAIR.red, outfit: 'shirt', top: 0x5f9e57, bottom: 0x4a443d, height: 0.96 },
    idle: { board: 4, desk: 2, chat: 1, copa: 2, coffee: 1 }, chatWith: ['arquiteto', 'engenheiro', 'cto'],
  },
  arquiteto: {
    name: 'Arquiteto', room: 'produto', desk: [19, -9], dual: true, item: 'books', planner: true,
    look: { model: 'male-c', skin: SKIN[2], hair: 'short', hairColor: HAIR.black, glasses: true, beard: true, beardColor: HAIR.black, outfit: 'shirt', top: 0xe9e4dc, bottom: 0x2d3142 },
    idle: { board: 2, desk: 4, coffee: 1, copa: 1, chat: 1 }, chatWith: ['engenheiro', 'product-owner'],
  },
  engenheiro: {
    name: 'Eng. Sênior', room: 'produto', desk: [19, -4], dual: true, item: 'mug', planner: true,
    look: { model: 'female-b', skin: SKIN[5], hair: 'bun', hairColor: HAIR.black, outfit: 'hoodie', top: 0x3f7fc4, bottom: 0x2d3142 },
    idle: { review: 3, desk: 3, coffee: 1, lounge: 1, huddle: 1 },
  },
  'dev-nuxt': {
    name: 'Dev Nuxt (pleno)', room: 'dev', desk: [-19.5, 5], dual: true, item: 'laptop',
    look: { model: 'male-e', skin: SKIN[0], hair: 'short', hairColor: HAIR.blond, headphones: true, outfit: 'tee', top: 0x41b883, bottom: 0x2d3142 },
    idle: { desk: 4, coffee: 2, lounge: 2, copa: 1, huddle: 1 },
  },
  'dev-ui': {
    name: 'Dev UI (pleno)', room: 'dev', desk: [-15.5, 5], item: 'plant',
    look: { model: 'female-c', skin: SKIN[1], hair: 'long', hairColor: HAIR.blue, glasses: true, outfit: 'tee', top: 0xe58fb4, bottom: 0x3a3f4b, height: 0.95 },
    idle: { desk: 4, copa: 2, coffee: 1, lounge: 1, chat: 1 }, chatWith: ['dev-nuxt', 'revisor-ui'],
  },
  'dev-stores': {
    name: 'Dev Stores (pleno)', room: 'dev', desk: [-8.5, 5], item: 'mug',
    look: { model: 'male-f', skin: SKIN[3], hair: 'curly', hairColor: HAIR.black, outfit: 'hoodie', top: 0xf2c94c, bottom: 0x2d3142, width: 1.1 },
    idle: { desk: 4, lounge: 2, coffee: 1, huddle: 1 },
  },
  infra: {
    name: 'Infra', room: 'dev', desk: [-4.5, 5], dual: true, item: 'headphones',
    look: { model: 'male-b', tint: 0xb8d8ff, skin: SKIN[4], hair: 'cap', hairColor: HAIR.brown, capColor: 0x5aa5a0, beard: true, beardColor: HAIR.brown, outfit: 'hoodie', top: 0x2f4f4f, bottom: 0x22252f, width: 1.12 },
    idle: { desk: 4, coffee: 2, copa: 1 },
  },
  'dev-tipos': {
    name: 'Dev Tipos (pleno)', room: 'dev', desk: [-19.5, 10], dual: true, item: 'books',
    look: { model: 'male-c', tint: 0xffd9b0, skin: SKIN[2], hair: 'short', hairColor: HAIR.black, glasses: true, beard: true, beardColor: HAIR.black, outfit: 'tee', top: 0x3178c6, bottom: 0x3a3f4b },
    idle: { desk: 5, coffee: 2, copa: 1, huddle: 1 },
  },
  'dev-junior': {
    name: 'Dev Júnior', room: 'dev', desk: [-15.5, 10], item: 'laptop',
    look: { model: 'female-d', skin: SKIN[5], hair: 'cap', hairColor: HAIR.black, capColor: 0xe8743b, outfit: 'tee', top: 0xa0d995, bottom: 0x4a6fa5, height: 0.93, backpack: true },
    idle: { desk: 3, lounge: 3, copa: 2, chat: 1, coffee: 1 }, chatWith: ['dev-nuxt', 'dev-tipos', 'engenheiro'],
  },
  'general-purpose': {
    name: 'Freela', room: 'dev', desk: [-8.5, 10], item: 'laptop',
    look: { model: 'female-e', skin: SKIN[1], hair: 'long', hairColor: HAIR.brown, outfit: 'shirt', top: 0x9e9e9e, bottom: 0x3a3f4b, backpack: true },
    idle: { desk: 2, copa: 2, lounge: 2, coffee: 1 },
  },
  qa: {
    name: 'QA', room: 'qualidade', desk: [0.5, 5], dual: true, item: 'mug',
    look: { model: 'female-f', skin: SKIN[0], hair: 'bun', hairColor: HAIR.red, glasses: true, outfit: 'shirt', top: 0xff9f43, bottom: 0x2d3142, height: 0.97 },
    idle: { desk: 3, bug: 3, coffee: 1, copa: 1 },
  },
  'code-reviewer': {
    name: 'Reviewer Sênior', room: 'qualidade', desk: [5.5, 5], dual: true, item: 'books',
    look: { model: 'male-d', tint: 0xd0e8c0, skin: SKIN[3], hair: 'short', hairColor: HAIR.grey, glasses: true, beard: true, beardColor: HAIR.grey, outfit: 'shirt', top: 0x8d6e63, bottom: 0x22252f, height: 1.04 },
    idle: { review: 3, desk: 3, coffee: 2 },
  },
  'revisor-ui': {
    name: 'Revisor UI', room: 'qualidade', desk: [0.5, 10], item: 'plant',
    look: { model: 'female-a', tint: 0xe0c8ff, skin: SKIN[4], hair: 'curly', hairColor: HAIR.blond, outfit: 'tee', top: 0xb39ddb, bottom: 0x3a3f4b },
    idle: { desk: 3, review: 2, copa: 1, lounge: 1 },
  },
  seguranca: {
    name: 'Segurança', room: 'qualidade', desk: [5.5, 10], dual: true, item: 'headphones',
    look: { model: 'male-f', tint: 0xa0a0b0, skin: SKIN[2], hair: 'short', hairColor: HAIR.black, outfit: 'hoodie', top: 0x22252f, bottom: 0x1a1a1a, hood: true },
    idle: { desk: 5, coffee: 1, copa: 1 },
  },
}

// Extra desks for agent types that are not in the roster yet.
export const SPARE_DESKS = [{ room: 'dev', desk: [-4.5, 10] }]

export const CHAT_LINES = ['☕ cafezinho?', 'haha', 'viu o jogo ontem?', 'deploy na sexta não', 'bora almoçar?', 'quem quebrou o CI?', 'kkkk', '🍩', 'e o fim de semana?', 'tem bolo hoje!']
export const GAME_LINES = ['🎮 GG!', 'mais uma!', 'lag!!', '🏆', 'revanche', 'pausa aí', 'quase!']
export const REVIEW_LINES = ['olha esse diff 👀', 'e se extrair isso?', 'faltou teste aqui', 'boa, aprovado ✅', 'esse nome tá estranho']
export const ROAM_LINES = ['como tá aí?', 'precisa de ajuda?', 'bloqueio?', 'manda o PR', '👍']
export const DESK_LINES = { think: ['🤔', 'hmm…'], read: ['📖', 'lendo a spec'], mouse: ['🖱️'], type: ['⌨️'] }
