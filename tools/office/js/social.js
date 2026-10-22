// Social layer: who talks to whom, what they say and when the talk ends. Rules and variations, no generative AI:
// cheap, predictable and good enough to feel alive. Movement and poses stay in brain.js / avatar.js.

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const LINE_SECS = 2.6

// Personality changes how each one spends idle time (multipliers on the role's idle weights).
export const TRAITS = {
  focado:   { label: 'Concentrado', weights: { desk: 2.5, coffee: 0.5, copa: 0.4, lounge: 0.4, chat: 0.3 } },
  social:   { label: 'Comunicativo', weights: { chat: 3, copa: 2, review: 1.5, desk: 0.7 }, extra: { chat: 1 } },
  cafe:     { label: 'Movido a café', weights: { coffee: 3.5, copa: 1.5 }, extra: { coffee: 1 } },
  festeiro: { label: 'Comemora tudo', weights: { lounge: 2, copa: 1.3 }, extra: { lounge: 1 } },
}

// Scripts: [speaker index, line]. {a}/{b} are the participants' names, {demanda} the current demand.
const SCRIPTS = {
  smalltalk: [
    [[0, 'E aí, tudo certo?'], [1, 'Tudo! Correria hoje'], [0, 'Nem me fala 😅']],
    [[0, 'Viu o jogo ontem?'], [1, 'Vi! Que final…'], [0, 'Ainda tô nervoso kkk']],
    [[0, 'Bora almoçar mais tarde?'], [1, 'Bora! Aquele lugar novo?'], [0, 'Fechado 🍔']],
    [[0, 'Quem fez esse café?'], [1, 'Eu! Tá forte?'], [0, 'Perfeito ☕']],
    [[0, 'Deploy na sexta?'], [1, 'Nunca mais 😂'], [0, 'Aprendemos, né']],
  ],
  work: [
    [[0, 'Como tá {demanda}?'], [1, 'Andando bem!'], [0, 'Qualquer coisa me chama']],
    [[0, '{b}, revisa meu PR depois?'], [1, 'Claro, manda o link'], [0, 'Valeu! 🙏']],
    [[0, 'E se a gente quebrar em partes?'], [1, 'Faz sentido'], [0, 'Vou desenhar no quadro']],
  ],
  help: [
    [[1, '{a}, já olhou o log da API?'], [0, 'Boa! Vou testar agora'], [1, 'Me chama se travar 👍'], [0, 'Valeu! 🙌']],
    [[1, 'Tenta isolar num teste'], [0, 'Hmm, verdade…'], [0, 'Achei! Era o cache 😅'], [1, 'Clássico']],
    [[1, 'Deixa eu ver… esse tipo tá errado'], [0, 'Nossa, nem vi!'], [1, 'Acontece 😉']],
  ],
  review: [
    [[0, 'Olha esse diff 👀'], [1, 'Hmm, e se extrair isso?'], [0, 'Boa, faço agora']],
    [[0, 'Faltou teste aqui'], [1, 'Verdade, vou cobrir'], [0, 'Fechou ✅']],
  ],
  news: [
    [[0, 'Entregamos {demanda}! 🎉'], [1, 'Boa!! Bora comemorar'], [0, 'Café por minha conta ☕']],
    [[0, 'Subiu {demanda}!'], [1, 'Que orgulho 🥹'], [0, 'Time bom é assim']],
  ],
  lunch: [
    [[0, 'Que fome!'], [1, 'Trouxe marmita hoje'], [0, 'Cheiro bom 😋']],
    [[0, 'Esse almoço tá ótimo'], [1, 'Né? Precisava'], [0, 'Depois um cafezinho']],
  ],
  checkin: [
    [[0, 'Como tá aí?'], [1, 'De boa, quase lá'], [0, 'Show 👍']],
    [[0, 'Algum bloqueio?'], [1, 'Nada por enquanto'], [0, 'Qualquer coisa grita']],
  ],
}
const JOIN_LINES = ['Do que vocês tão falando?', 'Posso entrar nessa?', 'Ouvi meu nome? 👀', 'Tô dentro!']
const STUCK_LINES = ['Hmm, esse bug está complicado…', 'Não tô entendendo esse erro 🤔', 'Por que isso não passa?!']


export class Conversations {
  constructor(office) {
    this.office = office
    this.active = new Set()
    this.lastDemand = 'a demanda'
  }

  start(members, kind, { room } = {}) {
    for (const m of members) if (m.talk) this.end(m.talk)
    const script = pick(SCRIPTS[kind])
    const conv = { members, room, lines: script.slice(), index: 0, nextAt: performance.now() + 400, speaker: null, kind }
    for (const m of members) m.talk = conv
    this.active.add(conv)
    return conv
  }

  // Someone arriving where others already talk joins in (with a line of their own).
  joinOrStart(agent, room, kind) {
    const here = [...this.active].find((c) => c.room === room && c.members.length < 4)
    if (here) {
      here.members.push(agent); agent.talk = here
      here.lines.splice(here.index, 0, [here.members.length - 1, pick(JOIN_LINES)])
      return here
    }
    const others = this.office.list().filter((a) => a !== agent && !a.talk && !a.walking && a.slot.room === room && a.step?.do === 'converse')
    if (!others.length) return null
    return this.start([agent, ...others.slice(0, 2)], kind, { room })
  }

  end(conv) {
    this.active.delete(conv)
    for (const m of conv.members) {
      if (m.talk !== conv) continue
      m.talk = null
      if (m.step?.endWithTalk) m.stepUntil = 0
    }
  }

  isSpeaking(agent) { return agent.talk?.speaker === agent }

  // Who an agent looks at while talking: the speaker, or the next person when they are the speaker.
  focusOf(agent) {
    const conv = agent.talk; if (!conv) return null
    if (conv.speaker && conv.speaker !== agent) return conv.speaker.pos
    return conv.members.find((m) => m !== agent)?.pos ?? null
  }

  update(now) {
    for (const conv of this.active) {
      if (now < conv.nextAt) continue
      if (conv.index >= conv.lines.length) { this.end(conv); continue }
      const [who, text] = conv.lines[conv.index++]
      const speaker = conv.members[Math.min(who, conv.members.length - 1)]
      const other = conv.members.find((m) => m !== speaker)
      const line = text.replace('{a}', conv.members[0].role.name).replace('{b}', other?.role.name ?? '').replace('{demanda}', this.lastDemand)
      conv.speaker = speaker
      this.office.say(speaker, line, LINE_SECS)
      conv.nextAt = now + LINE_SECS * 1000 + 300
    }
  }

  // A busy dev gets stuck and calls the closest available helper (affinity first).
  requestHelp(asker) {
    const helpers = this.office.list().filter((a) => a !== asker && !a.task && !a.talk && !a.helping)
    if (!helpers.length) return false
    const helper = pickByAffinity(asker, helpers)
    this.office.say(asker, pick(STUCK_LINES), 3)
    helper.helpWith(asker)
    return true
  }
}

// Same room or listed as a friend (chatWith) weighs more.
export function affinity(a, b) {
  let score = 1
  if (a.desk.slot.room === b.desk.slot.room) score += 2
  if (a.role.chatWith?.includes(b.id) || b.role.chatWith?.includes(a.id)) score += 3
  if (b.role.trait === 'social') score += 1
  return score
}
export function pickByAffinity(agent, candidates) {
  const total = candidates.reduce((s, c) => s + affinity(agent, c), 0)
  let roll = Math.random() * total
  return candidates.find((c) => (roll -= affinity(agent, c)) < 0) ?? candidates[0]
}
