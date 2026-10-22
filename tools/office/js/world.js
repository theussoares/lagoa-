// Floor plan, furniture and the walking network (door column → aisle → slot).
import * as THREE from 'three'
import { furniture } from './models.js'

// Extra Y rotation so each kit model faces +z (calibrated by eye).
export const FACE = { desk: Math.PI, chairDesk: 0, chairModernCushion: 0, loungeSofaLong: 0, tableCoffee: 0, televisionModern: 0, kitchenCabinet: 0, kitchenFridgeLarge: 0, kitchenCoffeeMachine: 0, bookcaseOpen: 0, loungeChair: 0, laptop: 0, computerKeyboard: 0, computerMouse: 0 }
const kit = (scene, name, opts) => furniture(scene, name, { ...opts, rotY: (opts.rotY ?? 0) + (FACE[name] ?? 0) })

// Corridor runs along z = 0 (|z| < 1). North rooms: z ∈ [-13, -1]. South rooms: z ∈ [1, 13].
export const ROOMS = {
  recepcao:  { name: 'Recepção',          x: [-22, -14], side: -1, doorX: -18,  accent: 0xe8743b },
  diretoria: { name: 'Diretoria',         x: [-14, -4],  side: -1, doorX: -9,   accent: 0xb5473f },
  reuniao:   { name: 'Sala de reunião',   x: [-4, 8],    side: -1, doorX: -2.5, accent: 0x3a7bd5 },
  produto:   { name: 'Produto',           x: [8, 22],    side: -1, doorX: 15,   accent: 0x5f9e57 },
  dev:       { name: 'Desenvolvimento',   x: [-22, -2],  side: 1,  doorX: -12,  accent: 0x3f7fc4 },
  qualidade: { name: 'Qualidade',         x: [-2, 8],    side: 1,  doorX: 3,    accent: 0x8a5cc4 },
  copa:      { name: 'Copa',              x: [8, 15],    side: 1,  doorX: 9,    accent: 0xd9a441 },
  lounge:    { name: 'Games & descanso',  x: [15, 22],   side: 1,  doorX: 20.5, accent: 0x7a4fe0 },
}
const DOOR_WIDTH = 1.8
const ROOM_FAR = 13
const ENTRANCE_Z = -6

const V = (x, z) => new THREE.Vector3(x, 0, z)
const mats = new Map()
export function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra)
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }))
  return mats.get(key)
}
export function box(w, h, d, color, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color, extra) : color)
  m.castShadow = true; m.receiveShadow = true
  return m
}
function cyl(rTop, rBottom, h, color, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat(color))
  m.castShadow = true; m.receiveShadow = true
  return m
}
const at = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh }
const tint = (accent, amount) => new THREE.Color(0xf4f1ec).lerp(new THREE.Color(accent), amount)

// ---------- Slots and routing ----------
export function makeSlot({ room, x, z, lookX, lookZ, pose = 'stand', aisle, approach }) {
  return { room, pos: V(x, z), look: V(lookX, lookZ), pose, aisle: aisle ?? z, approach, taken: null }
}
const wp = (p, room, kind, back = []) => ({ p, room, kind, back })

// Points from the room's door column to the slot. Each one remembers how to walk back to the column.
function approachOf(slot) {
  const R = ROOMS[slot.room]
  const raw = slot.approach ? slot.approach.map(([x, z]) => V(x, z)) : [V(R.doorX, slot.aisle), V(slot.pos.x, slot.aisle)]
  const out = []
  raw.forEach((p, i) => out.push(wp(p, slot.room, i === 0 ? 'column' : 'aisle', out.slice().reverse())))
  out.push({ ...wp(slot.pos.clone(), slot.room, 'slot', out.slice().reverse()), slot })
  return out
}
const doorPoint = (room) => wp(V(ROOMS[room].doorX, ROOMS[room].side * 1), room, 'door')
const hallPoint = (room) => wp(V(ROOMS[room].doorX, 0), room, 'hall')

export function route(here, target) {
  const path = []
  if (here.kind === 'hall') path.push(hallPoint(target.room), doorPoint(target.room))
  else {
    path.push(...here.back)
    if (here.room !== target.room) path.push(doorPoint(here.room), hallPoint(here.room), hallPoint(target.room), doorPoint(target.room))
  }
  path.push(...approachOf(target))
  return path
}
export const nodeAt = (slot) => approachOf(slot).at(-1)

// ---------- Canvas panels (boards, screens, logo) ----------
function panel(parent, draw, w, h, x, y, z, rotY = 0, emissive = false) {
  const canvas = document.createElement('canvas'); canvas.width = Math.round(w * 160); canvas.height = Math.round(h * 160)
  const ctx = canvas.getContext('2d'); draw(ctx, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshStandardMaterial({ map: texture, emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? texture : null, emissiveIntensity: emissive ? 0.5 : 0 })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
  mesh.position.set(x, y, z); mesh.rotation.y = rotY; parent.add(mesh)
  return mesh
}
const font = (ctx, px, weight = 700) => { ctx.font = `${weight} ${px}px system-ui, sans-serif` }

function drawLogo(ctx, w, h) {
  ctx.fillStyle = '#1d1a17'; ctx.fillRect(0, 0, w, h)
  font(ctx, h * 0.55, 800); ctx.fillStyle = '#f4ecdf'; ctx.textBaseline = 'middle'; ctx.fillText('Lagoa', w * 0.1, h * 0.52)
  ctx.fillStyle = '#e8743b'; ctx.fillText('+', w * 0.1 + ctx.measureText('Lagoa').width, h * 0.52)
}
function drawGoals(ctx, w, h) {
  ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0, 0, w, h)
  font(ctx, 34); ctx.fillStyle = '#1d1a17'; ctx.fillText('Metas do trimestre', 24, 50)
  const goals = [['Lojas Fundador', 0.7, '#e8743b'], ['Clientes ativos', 0.55, '#3f7fc4'], ['Visitas / semana', 0.82, '#5f9e57']]
  goals.forEach(([label, value, color], i) => {
    const y = 100 + i * 70; font(ctx, 24, 500); ctx.fillStyle = '#4a443d'; ctx.fillText(label, 24, y)
    ctx.fillStyle = '#e7e2da'; ctx.fillRect(24, y + 12, w - 48, 22); ctx.fillStyle = color; ctx.fillRect(24, y + 12, (w - 48) * value, 22)
  })
}
// Kanban wall. `current` is the live demand: a highlighted card in the column of its stage.
export const KANBAN_STAGES = ['A fazer', 'Fazendo', 'Revisão', 'Feito']
function drawKanban(ctx, w, h, current = null) {
  ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0, 0, w, h)
  const cw = w / 4
  const colors = ['#ffd66b', '#9ad0f5', '#f7a8c4', '#b6e3a1']
  KANBAN_STAGES.forEach((name, i) => {
    font(ctx, 26); ctx.fillStyle = '#1d1a17'; ctx.fillText(name, i * cw + 14, 40)
    ctx.fillStyle = '#e7e2da'; ctx.fillRect(i * cw + cw - 2, 10, 2, h - 20)
    const count = [3, 1, 2, 4][i]
    for (let k = 0; k < count; k++) {
      ctx.fillStyle = colors[(i + k) % 4]; ctx.fillRect(i * cw + 14 + (k % 2) * (cw / 2 - 6), 130 + Math.floor(k / 2) * 66, cw / 2 - 22, 54)
    }
    if (current?.stage !== i) return
    ctx.fillStyle = '#e8743b'; ctx.fillRect(i * cw + 10, 56, cw - 22, 64)
    font(ctx, 20); ctx.fillStyle = '#ffffff'
    const words = current.text.split(' '); let line = '', y = 82
    for (const word of words) {
      if (ctx.measureText(line + word).width > cw - 40 && line) { ctx.fillText(line.trim(), i * cw + 18, y); line = ''; y += 24; if (y > 112) break }
      line += word + ' '
    }
    if (y <= 112) ctx.fillText(line.trim(), i * cw + 18, y)
  })
}
function drawTests(ctx, w, h) {
  ctx.fillStyle = '#121418'; ctx.fillRect(0, 0, w, h)
  font(ctx, 30); ctx.fillStyle = '#e6edf3'; ctx.fillText('Suíte de testes', 20, 44)
  font(ctx, 26, 600); ctx.fillStyle = '#4ade80'; ctx.fillText('✓ 248 passaram', 20, 90); ctx.fillStyle = '#f87171'; ctx.fillText('✗ 3 falharam', 20, 128)
  for (let i = 0; i < 14; i++) { ctx.fillStyle = i === 9 ? '#f87171' : '#4ade80'; const bh = 30 + ((i * 37) % 70); ctx.fillRect(20 + i * ((w - 40) / 14), h - 20 - bh, (w - 40) / 14 - 6, bh) }
}
function drawDiagram(ctx, w, h) {
  ctx.fillStyle = '#fdfdfb'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 5
  const boxes = [[0.08, 0.2, 'web'], [0.4, 0.2, 'BFF'], [0.72, 0.2, 'API'], [0.72, 0.62, 'DB'], [0.4, 0.62, 'auth']]
  font(ctx, 30); ctx.fillStyle = '#1d1a17'
  for (const [x, y, label] of boxes) { ctx.strokeRect(x * w, y * h, w * 0.2, h * 0.22); ctx.fillText(label, x * w + 14, y * h + h * 0.14) }
  ctx.beginPath(); ctx.moveTo(0.28 * w, 0.31 * h); ctx.lineTo(0.4 * w, 0.31 * h); ctx.moveTo(0.6 * w, 0.31 * h); ctx.lineTo(0.72 * w, 0.31 * h)
  ctx.moveTo(0.82 * w, 0.42 * h); ctx.lineTo(0.82 * w, 0.62 * h); ctx.moveTo(0.5 * w, 0.42 * h); ctx.lineTo(0.5 * w, 0.62 * h); ctx.stroke()
}
function drawChart(ctx, w, h) {
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h)
  font(ctx, 34); ctx.fillStyle = '#e2e8f0'; ctx.fillText('Lagoa+ · indicadores', 24, 50)
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 6; ctx.beginPath()
  for (let i = 0; i <= 10; i++) { const x = 30 + i * (w - 60) / 10; const y = h - 40 - (Math.sin(i * 0.7) * 0.2 + i * 0.07) * (h - 120); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }
  ctx.stroke()
}
function drawPoster(color, title) {
  return (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, color); g.addColorStop(1, '#1d1a17'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    font(ctx, w * 0.16, 900); ctx.fillStyle = '#ffffff'; ctx.fillText(title, w * 0.08, h * 0.85)
    ctx.beginPath(); ctx.arc(w / 2, h * 0.4, w * 0.25, 0, Math.PI * 2); ctx.fillStyle = '#ffffff33'; ctx.fill()
  }
}
function drawRoomName(name, accent) {
  return (ctx, w, h) => {
    ctx.fillStyle = '#' + new THREE.Color(accent).getHexString() + 'dd'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, h / 3); ctx.fill()
    font(ctx, h * 0.55, 800); ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(name, w / 2, h / 2 + 2)
  }
}

// ---------- Furniture ----------
function plant(scene, x, z, size = 1) { kit(scene, 'pottedPlant', { x, z, height: 1.3 * size }) }
function chair(scene, x, z, rotY, color = 0x2f3640, name = 'chairDesk') {
  kit(scene, name, { x, z, rotY, height: 0.95, tint: tint(color, 0.35).getHex() })
}

// A desk facing north with chair, keyboard, mouse, one or two monitors and a personal item.
export function buildDesk(scene, { x, z, room, dual = false, item = 'mug', accent = 0x444444 }) {
  const desk = kit(scene, 'desk', { x, z, width: 1.8 })
  const top = desk.userData.size.y, depth = desk.userData.size.z
  const screens = []
  for (const dx of dual ? [-0.42, 0.42] : [0]) {
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x15171a, emissive: 0x000000 })
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.46, 0.04), screenMat); scr.castShadow = true
    scr.position.set(x + dx, top + 0.42, z - depth * 0.25); scr.rotation.y = dual ? -dx * 0.35 : 0; scene.add(scr)
    at(scene, box(0.06, 0.3, 0.06, 0x333333), x + dx, top + 0.15, z - depth * 0.25 - 0.03)
    at(scene, box(0.3, 0.02, 0.2, 0x333333), x + dx, top + 0.01, z - depth * 0.25)
    screens.push(screenMat)
  }
  kit(scene, 'computerKeyboard', { x, z: z + depth * 0.15, y: top, width: 0.6 })
  kit(scene, 'computerMouse', { x: x + 0.45, z: z + depth * 0.15, y: top, width: 0.1 })
  const side = { x: x - 0.75, z: z - depth * 0.05, y: top }
  if (item === 'mug') at(scene, cyl(0.06, 0.06, 0.12, accent, 10), side.x, top + 0.06, side.z)
  if (item === 'books') kit(scene, 'books', { ...side, width: 0.4 })
  if (item === 'plant') kit(scene, 'plantSmall2', { ...side, height: 0.4 })
  if (item === 'headphones') { const hp = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 16, Math.PI), mat(0x222222)); hp.rotation.x = -Math.PI / 2; at(scene, hp, side.x, top + 0.03, side.z) }
  if (item === 'laptop') kit(scene, 'laptop', { ...side, width: 0.5 })
  const chairZ = z + depth / 2 + 0.45
  chair(scene, x, chairZ, Math.PI, accent)
  const slot = makeSlot({ room, x, z: chairZ, lookX: x, lookZ: z - 3, pose: 'sit', aisle: chairZ + 0.9 })
  return { slot, screens, pos: V(x, z) }
}

// ---------- Rooms, walls and decor ----------
export function buildWorld(scene) {
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.1, metalness: 0.1 })
  const wallColor = 0xf7f6f3
  const GLASS_H = 2.1, TALL_H = 2.8, LOW_H = 0.5, T = 0.12

  at(scene, box(46, 0.05, 28, 0xd9d4cc), 0, -0.03, 0).castShadow = false
  at(scene, box(44, 0.04, 2, 0xc9c2b6), 0, 0.005, 0).castShadow = false

  const glassWall = (w, x, z, alongX, accent) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(alongX ? w : T, GLASS_H, alongX ? T : w), glass)
    at(scene, pane, x, GLASS_H / 2, z)
    at(scene, box(alongX ? w : 0.1, 0.08, alongX ? 0.1 : w, accent ?? 0xb8b8b8), x, GLASS_H, z)
  }
  const solid = (w, h, x, z, alongX) => at(scene, box(alongX ? w : T * 2, h, alongX ? T * 2 : w, wallColor), x, h / 2, z)

  const lamps = []
  for (const [id, room] of Object.entries(ROOMS)) {
    const [x0, x1] = room.x, cx = (x0 + x1) / 2, w = x1 - x0
    const zNear = room.side, zFar = room.side * ROOM_FAR, cz = (zNear + zFar) / 2
    at(scene, box(w - 0.2, 0.03, ROOM_FAR - 1.2, tint(room.accent, 0.08).getHex()), cx, 0.01, cz).castShadow = false
    at(scene, box(Math.min(w - 2, 6), 0.02, 4, tint(room.accent, 0.35).getHex()), cx, 0.03, cz).castShadow = false
    // Corridor side: glass with a door gap.
    const left = room.doorX - DOOR_WIDTH / 2 - x0, right = x1 - (room.doorX + DOOR_WIDTH / 2)
    if (left > 0.05) glassWall(left, x0 + left / 2, zNear, true, room.accent)
    if (right > 0.05) glassWall(right, x1 - right / 2, zNear, true, room.accent)
    // Back wall: tall in the north, low in the south so the camera sees in.
    solid(w, room.side < 0 ? TALL_H : LOW_H, cx, zFar, true)
    // Side walls: glass between rooms, solid on the building edge.
    for (const edge of [x0, x1]) {
      if (Math.abs(edge) === 22) {
        if (id === 'recepcao' && edge === -22) {
          const gapTop = ENTRANCE_Z - 1.1, gapBottom = ENTRANCE_Z + 1.1
          solid(Math.abs(zFar - gapTop), TALL_H, edge, (zFar + gapTop) / 2, false)
          solid(Math.abs(gapBottom - zNear), TALL_H, edge, (gapBottom + zNear) / 2, false)
        } else solid(ROOM_FAR - 1, room.side < 0 ? TALL_H : 1.2, edge, cz, false)
      } else if (edge === x0) glassWall(ROOM_FAR - 1, edge, cz, false)  // shared partition: built once, by the room on its east
    }
    panel(scene, drawRoomName(room.name, room.accent), Math.min(3.6, w - 1), 0.6, room.doorX + (room.side < 0 ? 0 : 0), 0.04, zNear + room.side * 1.1, 0).rotation.x = -Math.PI / 2
    // Warm pendant lamp per room.
    const lampX = id === 'reuniao' ? 2 : cx, lampZ = id === 'reuniao' ? -6.5 : cz
    at(scene, cyl(0.25, 0.4, 0.18, 0xf4f1ec), lampX, 3.25, lampZ).castShadow = false
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffc77a, emissiveIntensity: 1.5 }))
    at(scene, bulb, lampX, 3.05, lampZ)
    const light = new THREE.PointLight(id === 'lounge' ? 0x9b6bff : 0xffd29a, id === 'lounge' ? 30 : 18, 14, 1.6)
    light.position.set(lampX, 3, lampZ); light.userData.base = light.intensity; scene.add(light); lamps.push(light)
  }
  solid(2, TALL_H, -22, 0, false); solid(2, TALL_H, 22, 0, false)

  const slots = { meeting: [], presenter: null, coffee: [], copa: [], lounge: [], board: [], huddle: [] }

  // Reception: logo, counter, waiting chairs, entrance.
  panel(scene, drawLogo, 4, 1.2, -18, 1.9, -12.85)
  at(scene, box(3.2, 1.05, 0.9, 0xe8743b), -18, 0.52, -9.8)
  at(scene, box(3.4, 0.06, 1.1, 0xf4f1ec), -18, 1.08, -9.8)
  for (const z of [-7.5, -6.2, -4.9]) kit(scene, 'loungeChair', { x: -15.2, z, rotY: -Math.PI / 2, height: 1.0, tint: 0xffd2b8 })
  kit(scene, 'coatRackStanding', { x: -21.2, z: -3.2, height: 2.0 })
  plant(scene, -21.2, -12.2, 1.3); plant(scene, -15, -4, 1)
  at(scene, box(1.6, 0.02, 2.2, 0x8a7d6c), -21, 0.03, ENTRANCE_Z)

  // Board room / diretoria: goals panel and a reading corner.
  panel(scene, drawGoals, 4.4, 2.2, -9, 1.6, -12.85)
  plant(scene, -13.3, -12.3, 1.2); plant(scene, -4.7, -12.3, 1.2)
  kit(scene, 'bookcaseOpen', { x: -6.5, z: -3.6, rotY: Math.PI, height: 1.5 })
  kit(scene, 'lampRoundFloor', { x: -4.8, z: -2.2, height: 2.0 })

  // Meeting room: table, chairs, big screen and a presenter spot.
  at(scene, box(7.4, 0.08, 2.4, 0x6b4f3a), 2, 0.9, -6.5)
  at(scene, box(0.4, 0.86, 1.4, 0x3f2e22), -0.5, 0.43, -6.5); at(scene, box(0.4, 0.86, 1.4, 0x3f2e22), 4.5, 0.43, -6.5)
  const meetingScreen = panel(scene, drawChart, 4.4, 2.3, 2, 1.7, -12.85, 0, true)
  meetingScreen.material.emissiveIntensity = 0.15
  for (const x of [-0.6, 1.3, 3.2, 5.1]) {
    chair(scene, x, -8.35, 0, 0x3a7bd5, 'chairModernCushion'); chair(scene, x, -4.65, Math.PI, 0x3a7bd5, 'chairModernCushion')
    slots.meeting.push(makeSlot({ room: 'reuniao', x, z: -8.35, lookX: x, lookZ: -6.5, pose: 'sit', aisle: -9.3 }))
    slots.meeting.push(makeSlot({ room: 'reuniao', x, z: -4.65, lookX: x, lookZ: -6.5, pose: 'sit', aisle: -3.7 }))
  }
  slots.presenter = makeSlot({ room: 'reuniao', x: 2, z: -10.8, lookX: 2, lookZ: -6.5, aisle: -10.8 })
  plant(scene, 7.3, -12.3, 1.2); plant(scene, -3.3, -1.8, 0.9)

  // Product: kanban wall and standing spots in front of it.
  const kanban = panel(scene, drawKanban, 4.6, 2.2, 15, 1.6, -12.85)
  const setKanban = (current) => {
    const canvas = kanban.material.map.image
    drawKanban(canvas.getContext('2d'), canvas.width, canvas.height, current)
    kanban.material.map.needsUpdate = true
  }
  for (const x of [14.2, 15.8]) slots.board.push(makeSlot({ room: 'produto', x, z: -11.6, lookX: x, lookZ: -14 }))
  plant(scene, 21.3, -12.3, 1.2); plant(scene, 8.7, -1.8, 0.9)

  // Development: freestanding whiteboard with a huddle area, diagram on the wall, shelf.
  panel(scene, drawDiagram, 3.6, 2, -21.85, 1.5, 7.5, Math.PI / 2)
  at(scene, box(2.6, 1.5, 0.06, 0xffffff), -12, 1.4, 12.2)
  panel(scene, drawDiagram, 2.4, 1.3, -12, 1.4, 12.16, Math.PI)
  for (const dx of [-0.9, 0, 0.9]) slots.huddle.push(makeSlot({ room: 'dev', x: -12 + dx, z: 10.4 + Math.abs(dx) * 0.3, lookX: -12, lookZ: 12.2 }))
  kit(scene, 'bookcaseOpen', { x: -21.4, z: 2.6, rotY: Math.PI / 2, height: 1.5 })
  plant(scene, -21.2, 1.8, 1.1); plant(scene, -2.8, 12.2, 1.1)

  // Quality: test dashboard on a stand.
  at(scene, box(0.1, 1.0, 0.1, 0x333333), 3, 0.5, 12.3)
  panel(scene, drawTests, 2.6, 1.5, 3, 1.75, 12.25, Math.PI, true).material.emissiveIntensity = 0.35
  plant(scene, -1.3, 12.3, 1); plant(scene, 7.3, 1.8, 0.9)

  // Copa: cabinets, coffee machine, fridge, round table with chairs.
  for (const x of [9.6, 10.8, 12.0]) kit(scene, 'kitchenCabinet', { x, z: 12.3, rotY: Math.PI, width: 1.2 })
  kit(scene, 'kitchenCoffeeMachine', { x: 9.6, z: 12.3, y: 0.95, rotY: Math.PI, height: 0.6 })
  kit(scene, 'kitchenFridgeLarge', { x: 14.2, z: 12.2, rotY: Math.PI, height: 2.3 })
  kit(scene, 'tableRound', { x: 11.5, z: 6.5, width: 1.7 })
  const copaSpots = [[10.1, 6.5, null], [11.5, 5.1, null], [11.5, 7.9, null], [12.9, 6.5, [[9, 4.2], [12.9, 4.2]]]]
  for (const [x, z, approach] of copaSpots) {
    chair(scene, x, z, Math.atan2(11.5 - x, 6.5 - z), 0xd9a441, 'chairModernCushion')
    slots.copa.push(makeSlot({ room: 'copa', x, z, lookX: 11.5, lookZ: 6.5, pose: 'sit', approach }))
  }
  slots.copa.push(makeSlot({ room: 'copa', x: 12.4, z: 10.4, lookX: 13.6, lookZ: 10.4 }), makeSlot({ room: 'copa', x: 13.6, z: 10.4, lookX: 12.4, lookZ: 10.4 }))
  slots.coffee.push(makeSlot({ room: 'copa', x: 9.6, z: 11.4, lookX: 9.6, lookZ: 13 }), makeSlot({ room: 'copa', x: 10.6, z: 11.4, lookX: 10.6, lookZ: 13 }))

  // Lounge: TV on the east wall, sofa, coffee table, bean bags, posters, purple light.
  at(scene, box(0.08, 1.5, 2.6, 0x111111), 21.8, 1.6, 7.5)
  const gameScreen = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x3355ff, emissiveIntensity: 0.9 })
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), gameScreen); tv.position.set(21.74, 1.6, 7.5); tv.rotation.y = -Math.PI / 2; scene.add(tv)
  at(scene, box(0.5, 0.45, 2.4, 0x2b2b2b), 21.5, 0.23, 7.5)
  kit(scene, 'loungeSofaLong', { x: 17.0, z: 7.5, rotY: Math.PI / 2, width: 3.6, tint: 0xd8c8ff })
  kit(scene, 'tableCoffee', { x: 19, z: 7.5, rotY: Math.PI / 2, width: 1.4 })
  kit(scene, 'speaker', { x: 21.3, z: 5.6, height: 1.0 }); kit(scene, 'speaker', { x: 21.3, z: 9.4, height: 1.0 })
  for (const z of [6.5, 7.5, 8.5]) slots.lounge.push(makeSlot({ room: 'lounge', x: 17.25, z, lookX: 22, lookZ: z, pose: 'game', approach: [[20.5, 3], [18.2, 3], [18.2, z]] }))
  for (const [x, z] of [[19.8, 4.2], [19.8, 11]]) {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat(0xe8a33b)); bag.scale.y = 0.6; bag.castShadow = true; at(scene, bag, x, 0.3, z)
    slots.lounge.push(makeSlot({ room: 'lounge', x, z, lookX: 21.8, lookZ: 7.5, pose: 'game', approach: [[20.5, z]] }))
  }
  panel(scene, drawPoster('#7a4fe0', 'GG'), 1.1, 1.5, 21.85, 1.6, 3.2, -Math.PI / 2)
  panel(scene, drawPoster('#e8743b', '1UP'), 1.1, 1.5, 21.85, 1.6, 11.8, -Math.PI / 2)
  plant(scene, 15.8, 12.3, 1.1)

  return { slots, meetingScreen, gameScreen, lamps, setKanban }
}
