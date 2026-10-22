// Scene, hook events and the frame loop.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildWorld, buildDesk, box } from './world.js'
import { ROLES, SPARE_DESKS } from './roster.js'
import { buildAvatar } from './avatar.js'
import { Agent, isOffHours } from './brain.js'
import { loadModels } from './models.js'
import { scenario, loop } from './demo.js'

// Public page (lagoamais.com.br/equipe): no hooks, a demo loop and always office hours.
const PUBLIC = document.documentElement.dataset.mode === 'public'

const LABEL_DISTANCE = 22

// ---------- Scene ----------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1d1a17)
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 300)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0, 0.5); controls.maxPolarAngle = Math.PI / 2.3; controls.enableDamping = true
const fitCamera = () => { const k = Math.max(1, 1.45 / camera.aspect); camera.position.set(0, 34 * k, 30 * k); camera.lookAt(controls.target) }
fitCamera()

scene.add(new THREE.HemisphereLight(0xfff4e5, 0x6b5a48, 1.1))
const sun = new THREE.DirectionalLight(0xfff1dc, 1.4)
sun.position.set(12, 34, 18); sun.castShadow = true
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20 })
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005
scene.add(sun)

const statusEl = document.getElementById('status')
statusEl.textContent = 'carregando modelos…'
await loadModels((done) => { statusEl.textContent = `carregando modelos… ${Math.round(done * 100)}%` })
const world = buildWorld(scene)

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

// ---------- Agents ----------
const agents = new Map()
const office = {
  world,
  offHours: false,
  list: () => [...agents.values()],
  say(agent, text, seconds = 0) {
    if (agent.bubble) agent.avatar.root.remove(agent.bubble)
    agent.bubble = null
    if (!text || agent.hidden) return
    agent.bubble = textSprite(text, '#fbfaf7f0', '#1d1a17'); agent.bubble.position.y = 2.75
    agent.avatar.root.add(agent.bubble)
    agent.bubbleUntil = seconds ? performance.now() + seconds * 1000 : Infinity
  },
}

let spareIndex = 0
function createAgent(id) {
  const role = ROLES[id] ?? (() => {
    const spare = SPARE_DESKS[spareIndex++ % SPARE_DESKS.length]
    return { name: id, ...spare, look: { model: 'male-a', tint: 0xcccccc, skin: 0xe0ac69, hair: 'short', hairColor: 0x5a3825, outfit: 'tee', top: 0x9e9e9e, bottom: 0x3a3f4b }, idle: { desk: 3, copa: 1, coffee: 1 } }
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

// ---------- Clock and hours ----------
const forcedHour = new URLSearchParams(location.search).get('hora')
const currentHour = () => (forcedHour !== null ? Number(forcedHour) : new Date().getHours())
const offHoursNow = () => !PUBLIC && isOffHours(currentHour())
office.offHours = offHoursNow()

for (const id of Object.keys(ROLES)) createAgent(id)
for (const agent of agents.values()) {
  if (office.offHours) { agent.leave(); agent.setPlan([{ do: 'stand', secs: Math.random() * 20 }]); continue }
  agent.decide(); agent.settle()
}

// ---------- Handoff papers ----------
const papers = []
function handoff(fromId, toId) {
  const from = agentFor(fromId).pos, to = agentFor(toId).pos
  const mesh = box(0.4, 0.02, 0.55, 0xffffff); scene.add(mesh)
  papers.push({ mesh, from: from.clone(), to: to.clone(), t: 0 })
}

// ---------- Events ----------
let lastActive = 'main'
const logEl = document.getElementById('log')
function log(html) { const d = document.createElement('div'); d.innerHTML = html; logEl.prepend(d); while (logEl.children.length > 40) logEl.lastChild.remove() }
const escape = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function handle(event) {
  switch (event.type) {
    case 'demand': {
      document.getElementById('demandText').textContent = event.text
      agentFor('main').assignTask('nova demanda!')
      lastActive = 'main'; log(`<b>Você</b> → ${escape(event.text)}`)
      break
    }
    case 'agentStart': {
      const a = agentFor(event.role)
      handoff(lastActive, event.role); lastActive = event.role
      a.assignTask(event.text)
      log(`<b>${escape(a.role.name)}</b> começou: ${escape(event.text)}`)
      break
    }
    case 'agentDone': {
      const a = agentFor(event.role)
      a.finishTask(); handoff(event.role, 'main'); lastActive = 'main'
      log(`<b>${escape(a.role.name)}</b> entregou`)
      break
    }
    case 'tool': agentFor(event.role).flash(event.tool); break
    case 'idle': {
      for (const a of agents.values()) a.finishTask()
      log('<b>Equipe</b> liberada 🎉')
      break
    }
  }
}

const demoButton = document.getElementById('demo')
if (PUBLIC) {
  statusEl.textContent = 'demonstração'
  demoButton.hidden = true
  loop(handle)
} else {
  const source = new EventSource('/events')
  source.onopen = () => { statusEl.textContent = 'ao vivo (hooks)' }
  source.onerror = () => { statusEl.textContent = 'sem conexão com o servidor — use a Demo' }
  source.onmessage = (msg) => handle(JSON.parse(msg.data))
  demoButton.onclick = () => { for (const [sec, event] of scenario()) setTimeout(() => handle(event), sec * 1000) }
}

// ---------- Hover: name tags show on hover, when close or while working ----------
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
let hoveredId = null
renderer.domElement.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects([...agents.values()].map((a) => a.avatar.root), true).find((h) => h.object.isMesh)
  hoveredId = hit?.object.userData.agentId ?? null
  renderer.domElement.style.cursor = hoveredId ? 'pointer' : ''
})

// ---------- Loop ----------
const clock = new THREE.Clock()
const clockEl = document.getElementById('clock')
let lastHourCheck = -Infinity
function frame() {
  const dt = Math.min(clock.getDelta(), 1), t = clock.elapsedTime, now = performance.now()
  if (now - lastHourCheck > 10000) {
    lastHourCheck = now
    office.offHours = offHoursNow()
    clockEl.textContent = office.offHours ? `🌙 ${currentHour()}h · fora do expediente` : `☀️ ${currentHour()}h · expediente`
  }
  let meetingActive = false
  for (const a of agents.values()) {
    a.update(dt, now, t)
    if (a.bubble && now > a.bubbleUntil) office.say(a, null)
    a.label.visible = !a.hidden && (a.id === hoveredId || !!a.task || camera.position.distanceTo(a.pos) < LABEL_DISTANCE)
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
  controls.update(); renderer.render(scene, camera)
}
// Timer instead of requestAnimationFrame: keeps the office moving when the pane is in the background.
setInterval(frame, 1000 / 40)
// Handy for tweaking poses from the devtools console.
window.__office = { agents, camera, controls, scene }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fitCamera(); renderer.setSize(innerWidth, innerHeight) })
