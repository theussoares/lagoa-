// Scripted demands that follow the official flow (tech lead triage → roles). Used by the Demo button and the public loop.
// Texts are generic on purpose: the public page must not reveal what is really being built.

const DEMANDS = [
  { size: 'P', text: 'Corrigir texto do botão de login', dev: ['dev-junior'], review: 'revisor-ui' },
  { size: 'P', text: 'Ajustar espaçamento do card da loja', dev: ['dev-ui'], review: 'revisor-ui' },
  { size: 'M', text: 'Filtro por ramo na vitrine', dev: ['dev-nuxt', 'dev-tipos'], review: 'revisor-ui' },
  { size: 'M', text: 'Tela de histórico de visitas', dev: ['dev-nuxt', 'dev-stores'], review: 'revisor-ui' },
  { size: 'G', text: 'Novo programa de pontos', dev: ['dev-tipos', 'dev-nuxt', 'dev-stores'], review: 'code-reviewer', security: true, infra: true },
  { size: 'G', text: 'Resgate de prêmio pelo app', dev: ['dev-tipos', 'dev-nuxt', 'dev-junior'], review: 'code-reviewer', security: true },
]
const TASKS = {
  'dev-nuxt': 'montando a tela', 'dev-ui': 'ajustando o layout', 'dev-stores': 'estado da tela', 'dev-tipos': 'tipos e schema',
  'dev-junior': 'textos e ajustes',
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const jitter = (base) => base * (0.8 + Math.random() * 0.5)

/** Returns [secondsFromStart, event][] for one demand going through the team. */
export function scenario(demand = pick(DEMANDS)) {
  const events = []
  let t = 0
  const at = (dt, event) => { t += dt; events.push([t, event]) }
  const work = (role, text, secs) => { at(0.6, { type: 'agentStart', role, text }); return (secsOverride) => at(secsOverride ?? jitter(secs), { type: 'agentDone', role }) }

  at(0, { type: 'demand', text: demand.text })
  work('tech-lead', `triagem: tamanho ${demand.size}`, 6)()
  if (demand.size !== 'P') {
    const doneSpec = work('product-owner', 'escrevendo a spec', 8)
    if (demand.size === 'G') {
      const doneDesign = work('arquiteto', 'desenhando a solução', 9)
      doneSpec(); doneDesign(jitter(3))
      work('cto', 'aprovando o design', 5)()
    } else doneSpec()
  }
  const devs = demand.dev.map((role) => work(role, TASKS[role], 14))
  at(4, { type: 'tool', role: demand.dev[0], tool: 'Edit' })
  at(3, { type: 'tool', role: demand.dev.at(-1), tool: 'Write' })
  devs.forEach((done, i) => done(i ? jitter(3) : undefined))
  if (demand.size !== 'P') {
    const checks = [work('qa', 'rodando os testes', 8)]
    if (demand.security) checks.push(work('seguranca', 'checando dado pessoal', 8))
    if (demand.infra) checks.push(work('infra', 'migration e deploy', 7))
    checks.forEach((done, i) => done(i ? jitter(2) : undefined))
  }
  work(demand.review, 'revisando o diff', 7)()
  at(2, { type: 'idle' })
  return events
}

/** Plays scenarios forever with a break between them, so the office also shows idle life. */
export function loop(handle, pauseSecs = [18, 35]) {
  const run = () => {
    const events = scenario()
    for (const [sec, event] of events) setTimeout(() => handle(event), sec * 1000)
    const total = events.at(-1)[0]
    setTimeout(run, (total + pauseSecs[0] + Math.random() * (pauseSecs[1] - pauseSecs[0])) * 1000)
  }
  setTimeout(run, 4000)
}
