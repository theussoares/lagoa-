// Scene, hook events, simulation tick and the render loop.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildWorld, buildDesk, box, KANBAN_STAGES } from './world.js'
import { ROLES, SPARE_DESKS } from './roster.js'
import { buildAvatar } from './avatar.js'
import { Agent } from './brain.js'
import { loadModels } from './models.js'
import { scenario, loop } from './demo.js'
import { Conversations, TRAITS, pickByAffinity } from './social.js'
import { createDayClock, applyLight, isLunch, formatHour } from './daycycle.js'
import { createFx } from './fx.js'
import { createFollow } from './follow.js'

// Public page (lagoamais.com.br/equipe): no hooks, a demo loop and a virtual work day.
const PUBLIC = document.documentElement.dataset.mode === 'public'
const LABEL_DISTANCE = 22
// Simulation runs at a fixed rate, independent of the camera and of the frame rate.
const SIM_STEP = 1 / 20
const PLANNING = new Set(['tech-lead', 'product-owner', 'arquiteto', 'cto'])
const REVIEWING = new Set(['qa', 'seguranca', 'infra', 'code-reviewer', 'revisor-ui'])

// ---------- Scene ----------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1d1a17)
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 300)
const renderer = new THREE.WebGLRenderer({ antialias: true })
// Phones and tablets: lighter rendering (pixel ratio and shadow resolution) to save battery.
const LIGHT_MODE = matchMedia('(pointer: coarse)').matches
renderer.setPixelRatio(Math.min(devicePixelRatio, LIGHT_MODE ? 1.25 : 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0, 0.5); controls.maxPolarAngle = Math.PI / 2.3; controls.enableDamping = true
// Wheel/pinch zoom heads to where the pointer is, a bit faster than the default, between a close look and the whole floor.
controls.zoomToCursor = true; controls.zoomSpeed = 1.6; controls.minDistance = 3; controls.maxDistance = 90
const fitCamera = () => { const k = Math.max(1, 1.45 / camera.aspect); camera.position.set(0, 34 * k, 30 * k); camera.lookAt(controls.target) }
fitCamera()

const hemi = new THREE.HemisphereLight(0xfff4e5, 0x6b5a48, 1.1)
scene.add(hemi)
const sun = new THREE.DirectionalLight(0xfff1dc, 1.4)
sun.position.set(12, 34, 18); sun.castShadow = true
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20 })
sun.shadow.mapSize.setScalar(LIGHT_MODE ? 1024 : 2048); sun.shadow.bias = -0.0005
scene.add(sun)

// ---------- Loading ----------
const statusEl = document.getElementById('status')
const loadingEl = document.getElementById('loading')
const loadingBar = document.getElementById('loadingBar')
await loadModels((done) => { loadingBar.style.width = `${Math.round(done * 100)}%` })
const world = buildWorld(scene)
const fx = createFx(scene)

// ---------- Sprites ----------
function textSprite(text, bg, fg, size = 34) {
  const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')
  ctx.font = `700 ${size}px system-ui`; const w = Math.ceil(ctx.measureText(text).width) + 36
  canvas.width = w; canvas.height = size + 22
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, w, canvas.height, 14); ctx.fill()
  ctx.font = `700 ${size}px system-ui`; ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, 18, canvas.height / 2 + 2)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }))
  sprite.scale.set(w / 110, canvas.height / 110, 1); sprite.renderOrder = 10
  return sprite
}

// ---------- Office state shared with the agents ----------
const agents = new Map()
const office = {
  world,
  lunch: false,
  list: () => [...agents.values()],
  pickByAffinity,
  say(agent, text, seconds = 0) {
    if (agent.bubble) agent.avatar.root.remove(agent.bubble)
    agent.bubble = null
    if (!text) return
    agent.bubble = textSprite(text, '#fbfaf7f0', '#1d1a17'); agent.bubble.position.y = 2.75
    agent.avatar.root.add(agent.bubble)
    agent.bubbleUntil = seconds ? performance.now() + seconds * 1000 : Infinity
  },
}
office.talk = new Conversations(office)

let spareIndex = 0
function createAgent(id) {
  const role = ROLES[id] ?? (() => {
    const spare = SPARE_DESKS[spareIndex++ % SPARE_DESKS.length]
    return { name: id, ...spare, trait: 'social', look: { model: 'male-a', tint: 0xcccccc, top: 0x9e9e9e }, idle: { desk: 3, copa: 1, coffee: 1 } }
  })()
  const desk = buildDesk(scene, { x: role.desk[0], z: role.desk[1], room: role.room, dual: role.dual, item: role.item, accent: role.look.top })
  const avatar = buildAvatar(role.look)
  avatar.root.traverse((o) => { o.userData.agentId = id })
  scene.add(avatar.root)
  const label = textSprite(role.name, '#1d1a17d9', '#f4ecdf', 28); label.position.y = 2.25; label.visible = false
  avatar.root.add(label)
  const agent = new Agent({ id, role, avatar, desk, office })
  agent.label = label
  agents.set(id, agent)
  return agent
}
const agentFor = (id) => agents.get(id) ?? createAgent(id)

// ---------- Day ----------
const forcedParam = new URLSearchParams(location.search).get('hora')
const day = createDayClock({ virtual: PUBLIC, forcedHour: forcedParam === null ? null : Number(forcedParam) })
const syncHours = () => { office.lunch = isLunch(day.hour) }
syncHours()

for (const id of Object.keys(ROLES)) createAgent(id)
for (const agent of agents.values()) { agent.decide(); agent.settle() }
loadingEl.hidden = true

// ---------- Handoff papers ----------
const papers = []
function handoff(fromId, toId) {
  const from = agentFor(fromId).pos, to = agentFor(toId).pos
  const mesh = box(0.4, 0.02, 0.55, 0xffffff); scene.add(mesh)
  papers.push({ mesh, from: from.clone(), to: to.clone(), t: 0 })
}

// ---------- HUD ----------
const logEl = document.getElementById('log')
const logToggle = document.getElementById('logToggle')
logToggle.onclick = () => {
  logEl.hidden = !logEl.hidden
  logToggle.textContent = logEl.hidden ? 'Mostrar log' : 'Esconder log'
  logToggle.setAttribute('aria-expanded', String(!logEl.hidden))
}
const ZOOM_STEP = 0.7
function zoom(factor) {
  const offset = camera.position.clone().sub(controls.target)
  const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)
  camera.position.copy(controls.target).add(offset.setLength(distance))
}
document.getElementById('zoomIn').onclick = () => zoom(ZOOM_STEP)
document.getElementById('zoomOut').onclick = () => zoom(1 / ZOOM_STEP)
function log(html) { const d = document.createElement('div'); d.innerHTML = html; logEl.prepend(d); while (logEl.children.length > 40) logEl.lastChild.remove() }
const escape = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// ---------- Events (hooks or demo) ----------
let lastActive = 'main'
let demand = null
const setStage = (stage) => { if (!demand) return; demand.stage = Math.max(demand.stage, stage); world.setKanban(demand) }

function celebrate() {
  const present = [...agents.values()]
  for (const a of present) a.cheer(a.role.trait === 'festeiro' ? 4 : 2.5 + Math.random())
  for (const a of present.filter((p) => p.role.trait === 'festeiro')) office.say(a, '🎉🎉', 3)
  fx.celebrate(present.map((a) => a.pos))
  // Someone chatty goes to tell a colleague the news.
  const teller = present.find((a) => a.role.trait === 'social' && !a.task && !a.talk)
  const listener = teller && present.find((a) => a !== teller && a.atDesk && !a.talk)
  if (listener) setTimeout(() => {
    const spot = teller.visitSpot(listener)
    if (spot) teller.setPlan([{ go: spot }, { fn: () => teller.startTalkWith(listener, 'news') }, { do: 'converse', secs: 20, endWithTalk: true }], 'Contando a novidade')
  }, 4500)
}

function handle(event) {
  switch (event.type) {
    case 'demand': {
      document.getElementById('demandText').textContent = event.text
      demand = { text: event.text, stage: 0 }; world.setKanban(demand)
      office.talk.lastDemand = event.text.toLowerCase()
      agentFor('main').assignTask('nova demanda!')
      lastActive = 'main'; log(`<b>Você</b> → ${escape(event.text)}`)
      break
    }
    case 'agentStart': {
      const a = agentFor(event.role)
      handoff(lastActive, event.role); lastActive = event.role
      a.assignTask(event.text)
      setStage(PLANNING.has(event.role) ? 0 : REVIEWING.has(event.role) ? 2 : 1)
      log(`<b>${escape(a.role.name)}</b> começou: ${escape(event.text)}`)
      break
    }
    case 'agentDone': {
      const a = agentFor(event.role)
      a.finishTask(); handoff(event.role, 'main'); lastActive = 'main'
      log(`<b>${escape(a.role.name)}</b> entregou`)
      break
    }
    case 'alert': {
      const a = agentFor(event.role)
      office.say(a, `⛔ bloqueado: ${event.text}`, 4)
      fx.alert(a.pos)
      // Back to "Fazendo": the fix is work in progress again.
      if (demand) { demand.stage = 1; world.setKanban(demand) }
      log(`<b>${escape(a.role.name)}</b> bloqueou: ${escape(event.text)}`)
      break
    }
    case 'tool': agentFor(event.role).flash(event.tool); break
    case 'idle': {
      for (const a of agents.values()) a.finishTask()
      if (demand && demand.stage > 0) { demand.stage = KANBAN_STAGES.length - 1; world.setKanban(demand); celebrate() }
      log('<b>Equipe</b> entregou 🎉')
      break
    }
  }
}

const demoButton = document.getElementById('demo')
if (PUBLIC) {
  statusEl.textContent = 'demonstração'
  demoButton.hidden = true
  loop(handle, () => !office.lunch)
} else {
  const source = new EventSource('/events')
  source.onopen = () => { statusEl.textContent = 'ao vivo (hooks)' }
  source.onerror = () => { statusEl.textContent = 'sem conexão com o servidor — use a Demo' }
  source.onmessage = (msg) => handle(JSON.parse(msg.data))
  demoButton.onclick = () => { for (const [sec, event] of scenario()) setTimeout(() => handle(event), sec * 1000) }
}

// ---------- Camera follow, info card, cinema ----------
const follow = createFollow({
  camera, controls, renderer, agents,
  describe: (a) => ({ name: a.role.name, trait: TRAITS[a.role.trait]?.label ?? '', activity: a.describeActivity(), energy: a.energy }),
})

// ---------- Loop ----------
const clock = new THREE.Clock()
const clockEl = document.getElementById('clock')
let simAccumulator = 0, lastHud = -Infinity
function frame() {
  // Hidden tab: no simulation and no rendering. Reading the delta here avoids a jump when the tab comes back.
  if (document.hidden) { clock.getDelta(); return }
  const dt = Math.min(clock.getDelta(), 1), t = clock.elapsedTime, now = performance.now()

  simAccumulator += dt
  while (simAccumulator >= SIM_STEP) {
    simAccumulator -= SIM_STEP
    day.tick(SIM_STEP); syncHours()
    for (const a of agents.values()) a.tick(SIM_STEP, now)
    office.talk.update(now)
  }
  if (now - lastHud > 1000) {
    lastHud = now
    const dark = day.hour >= 18 || day.hour < 6
    const phase = office.lunch ? '🍽️ almoço' : `${dark ? '🌙' : '☀️'} expediente`
    clockEl.textContent = `${formatHour(day.hour)} · ${phase}`
  }
  applyLight({ hour: day.hour, sun, hemi, scene, lamps: world.lamps })

  let meetingActive = false
  for (const a of agents.values()) {
    a.animate(now, t)
    if (a.bubble && now > a.bubbleUntil) office.say(a, null)
    a.label.visible = (a.id === follow.hoveredId || a.id === follow.followId || !!a.task || camera.position.distanceTo(a.pos) < LABEL_DISTANCE)
    if (a.task && a.slot.room === 'reuniao' && !a.walking) meetingActive = true
  }
  world.meetingScreen.material.emissiveIntensity += ((meetingActive ? 0.8 : 0.12) - world.meetingScreen.material.emissiveIntensity) * 0.05
  world.gameScreen.emissive.setHSL((t * 0.12) % 1, 0.7, 0.45)
  for (let i = papers.length - 1; i >= 0; i--) {
    const p = papers[i]; p.t += dt / 1.3
    const k = Math.min(p.t, 1)
    p.mesh.position.lerpVectors(p.from, p.to, k); p.mesh.position.y = 2 + Math.sin(k * Math.PI) * 3.5
    p.mesh.rotation.y += dt * 6
    if (p.t >= 1) { scene.remove(p.mesh); papers.splice(i, 1) }
  }
  fx.update(dt, t)
  follow.update(now)
  controls.update(); renderer.render(scene, camera)
}
// Timer instead of requestAnimationFrame: keeps the office moving when the pane is in the background.
setInterval(frame, 1000 / 40)
// Handy for tweaking poses from the devtools console.
window.__office = { agents, camera, controls, scene, office, day, handle }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fitCamera(); renderer.setSize(innerWidth, innerHeight) })
