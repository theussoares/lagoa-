// Behavior: each agent runs a plan (go somewhere → do something → …) and picks the next one by itself.
// Decision (what), movement (route along the door/aisle network) and animation (pose) stay separate;
// conversations live in social.js.
import * as THREE from 'three'
import { route, nodeAt, makeSlot } from './world.js'
import { applyPose, isSeated } from './avatar.js'
import { GAME_LINES } from './roster.js'
import { TRAITS } from './social.js'

const WALK_SPEED = 3.0
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const WORK_CYCLE = ['type', 'type', 'mouse', 'type', 'think', 'type', 'mouse']
const DESK_IDLE_CYCLE = ['mouse', 'read', 'think', 'type', 'mouse']
const MEETING_CYCLE = ['sitTalk', 'sit', 'think', 'sitTalk', 'sit']
const STUCK_ROOMS = new Set(['dev', 'qualidade'])
const STUCK_CHANCE = 0.35
const ACTIVITY = {
  desk: 'Na mesa', coffee: 'Pegando café', copa: 'Na copa', lounge: 'Jogando videogame', board: 'Organizando o kanban',
  huddle: 'No quadro branco', bug: 'Caçando um bug', chat: 'Batendo papo', review: 'Mostrando código', roam: 'Circulando entre os devs',
  lunch: 'Almoçando', leave: 'Indo embora', arrive: 'Chegando', rest: 'Descansando',
}

export class Agent {
  constructor({ id, role, avatar, desk, office }) {
    Object.assign(this, { id, role, avatar, desk, office })
    this.phase = Math.random() * 10
    this.energy = rand(0.5, 1)
    this.task = null; this.talk = null; this.helping = null
    this.activity = ACTIVITY.desk
    this.steps = []; this.stepIndex = 0; this.stepUntil = 0; this.nextLineAt = 0; this.nextStuckAt = 0; this.cheerUntil = 0
    this.path = []; this.pendingTarget = null
    this.here = nodeAt(desk.slot); this.slot = desk.slot
    this.holding = false; this.hidden = false
    this.reserved = new Set()
    avatar.root.position.copy(desk.slot.pos)
  }

  get pos() { return this.avatar.root.position }
  get step() { return this.steps[this.stepIndex] }
  get walking() { return this.path.length > 0 }
  get atDesk() { return !this.walking && !this.hidden && this.slot === this.desk.slot }

  claim(slot) { slot.taken = this.id; this.reserved.add(slot); return slot }
  releaseAll() { for (const s of this.reserved) if (s.taken === this.id) s.taken = null; this.reserved.clear() }

  // ---------- Plans ----------
  setPlan(steps, activity) { if (activity) this.activity = activity; this.steps = steps; this.stepIndex = -1; this.advance() }
  advance() {
    this.stepIndex++
    const step = this.step
    if (!step) return this.decide()
    if (step.fn) { step.fn(); return this.advance() }
    if (step.go) return this.walkTo(step.go)
    this.stepUntil = performance.now() + step.secs * 1000
    if (step.say) this.office.say(this, Array.isArray(step.say) ? pick(step.say) : step.say, 3)
    this.nextLineAt = performance.now() + rand(2000, 5000)
  }
  walkTo(slot) {
    this.slot = slot
    if (this.walking) { this.pendingTarget = slot; return }
    this.path = route(this.here, slot)
  }
  // Replaces the step after the current one (used when a planned talk can't happen).
  shortenNext() { this.steps.splice(this.stepIndex + 1, 1, { do: 'stand', secs: 1.5, say: '🤷' }) }

  decide() {
    this.releaseAll()
    this.helping = null
    const office = this.office
    if (this.task) return this.setPlan(this.workPlan())
    if (office.offHours) {
      if (this.hidden) return this.setPlan([{ do: 'stand', secs: rand(15, 40) }])
      return this.setPlan([{ go: this.claim(office.world.slots.exit) }, { fn: () => this.leave() }], ACTIVITY.leave)
    }
    if (this.hidden) { this.arrive(); return this.setPlan([{ go: this.desk.slot }, { do: 'deskIdle', secs: rand(10, 25) }], ACTIVITY.arrive) }
    if (office.lunch) return this.setPlan(this.lunchPlan(), ACTIVITY.lunch)
    this.idlePlan()
  }

  workPlan() {
    const { slots } = this.office.world
    let target = this.desk.slot, pose = 'work'
    if (this.role.planner) {
      const seat = this.id === 'product-owner' && !slots.presenter.taken ? slots.presenter : slots.meeting.find((s) => !s.taken)
      if (seat) { target = this.claim(seat); pose = seat === slots.presenter ? 'present' : 'meeting' }
    }
    return [{ go: target }, { do: pose, secs: Infinity }]
  }

  // Role weights × personality, with low energy pushing towards breaks.
  idlePlan() {
    const trait = TRAITS[this.role.trait]
    const weights = { ...this.role.idle, ...trait?.extra }
    for (const [kind, k] of Object.entries(trait?.weights ?? {})) if (weights[kind]) weights[kind] *= k
    if (this.energy < 0.35) for (const k of ['coffee', 'copa', 'lounge']) if (weights[k]) weights[k] *= 4
    const kinds = Object.keys(weights)
    let roll = Math.random() * kinds.reduce((sum, k) => sum + weights[k], 0)
    const ordered = kinds.filter((k) => (roll -= weights[k]) < 0).concat(kinds)
    for (const kind of ordered) {
      const plan = this.planFor(kind)
      if (plan) return this.setPlan(plan, ACTIVITY[kind])
    }
    this.setPlan([{ go: this.desk.slot }, { do: 'deskIdle', secs: rand(15, 30) }], ACTIVITY.desk)
  }

  lunchPlan() {
    const { slots } = this.office.world
    const seat = pick(slots.copa.filter((s) => !s.taken))
    if (seat) return this.copaSteps(seat, 'lunch', rand(20, 35))
    const couch = pick(slots.lounge.filter((s) => !s.taken))
    if (couch) return [{ go: this.claim(couch) }, { do: 'game', secs: rand(20, 35), lines: GAME_LINES }]
    return [{ go: this.desk.slot }, { do: 'sip', secs: rand(15, 25) }]
  }

  copaSteps(spot, kind, secs) {
    return [{ go: this.claim(spot) }, { fn: () => { this.holding = true; this.office.talk.joinOrStart(this, 'copa', kind) } },
      { do: 'converse', secs }, { fn: () => { this.holding = false; this.energy += 0.5 } }]
  }

  planFor(kind) {
    const { slots } = this.office.world
    const desk = this.desk.slot
    const free = (list) => list.filter((s) => !s.taken)
    switch (kind) {
      case 'desk': return [{ go: desk }, { do: 'deskIdle', secs: rand(15, 40) }]
      case 'coffee': {
        const spot = pick(free(slots.coffee)); if (!spot) return null
        return [{ go: this.claim(spot) }, { do: 'stand', secs: 3, say: '☕' }, { fn: () => { this.holding = true; this.energy += 0.3 } },
          { go: desk }, { do: 'sip', secs: rand(8, 14) }, { fn: () => { this.holding = false } }]
      }
      case 'copa': {
        const spot = pick(free(slots.copa)); if (!spot) return null
        return this.copaSteps(spot, 'smalltalk', rand(15, 28))
      }
      case 'lounge': {
        const spot = pick(free(slots.lounge)); if (!spot) return null
        return [{ go: this.claim(spot) }, { do: 'game', secs: rand(20, 40), lines: GAME_LINES }, { fn: () => { this.energy += 0.6 } }]
      }
      case 'board': {
        const spot = pick(free(slots.board)); if (!spot) return null
        return [{ go: this.claim(spot) }, { do: 'point', secs: rand(8, 14), say: '📌' }, { do: 'stand', secs: 3 }]
      }
      case 'huddle': {
        const spot = pick(free(slots.huddle)); if (!spot) return null
        return [{ go: this.claim(spot) }, { do: 'talk', secs: rand(12, 20), lines: ['e se a gente…', 'desenha aí', 'faz sentido', 'quebra em 3'] }]
      }
      case 'bug': return [{ go: desk }, { do: 'type', secs: rand(4, 7) }, { do: 'frustrated', secs: 2.5, say: '🐛 achei um bug!' },
        { do: 'read', secs: 5, say: '📝 anotando' }, { do: 'type', secs: rand(5, 9) }]
      case 'chat': return this.visitPlan((a) => true, Math.random() < 0.5 ? 'smalltalk' : 'work')
      case 'review': return this.visitPlan((a) => ['dev', 'qualidade', 'produto'].includes(a.desk.slot.room), 'review')
      case 'roam': {
        const devs = this.office.list().filter((a) => a !== this && a.desk.slot.room === 'dev' && a.atDesk && !a.talk)
        const stops = devs.sort(() => Math.random() - 0.5).slice(0, 3)
        if (!stops.length) return null
        return stops.flatMap((a) => {
          const spot = this.visitSpot(a); if (!spot) return []
          return [{ go: spot }, { fn: () => this.startTalkWith(a, 'checkin') }, { do: 'converse', secs: 15, endWithTalk: true }]
        })
      }
      default: return null
    }
  }

  // Standing spot next to a colleague's chair.
  visitSpot(other) {
    const chair = other.desk.slot
    for (const dx of [1.3, -1.3]) {
      const spot = makeSlot({ room: chair.room, x: chair.pos.x + dx, z: chair.pos.z, lookX: chair.pos.x, lookZ: chair.pos.z, aisle: chair.aisle })
      if (!this.office.list().some((a) => a.slot.pos.distanceTo(spot.pos) < 0.3)) return this.claim(spot)
    }
    return null
  }
  visitPlan(filter, kind) {
    const candidates = this.office.list().filter((a) => a !== this && a.atDesk && !a.talk && filter(a))
    if (!candidates.length) return null
    const other = this.office.pickByAffinity(this, candidates)
    const spot = this.visitSpot(other); if (!spot) return null
    return [{ go: spot }, { fn: () => this.startTalkWith(other, kind) }, { do: 'converse', secs: 20, endWithTalk: true }]
  }
  // On arrival: talk only if the colleague is still there and free.
  startTalkWith(other, kind) {
    if (!other.atDesk || other.talk) { this.shortenNext(); return }
    this.office.talk.start([this, other], kind)
  }

  // Called by social.js when a colleague is stuck.
  helpWith(asker) {
    this.releaseAll()
    const spot = this.visitSpot(asker)
    if (!spot) return
    this.helping = asker
    this.setPlan([{ go: spot }, { fn: () => this.startTalkWith(asker, 'help') }, { do: 'converse', secs: 25, endWithTalk: true }],
      `Ajudando ${asker.role.name}`)
  }

  // ---------- Hooks ----------
  assignTask(text) {
    if (this.hidden) this.arrive()
    this.task = text || 'trabalhando…'
    this.holding = false
    this.nextStuckAt = performance.now() + rand(15000, 40000)
    this.office.say(this, this.task)
    this.decide()
  }
  finishTask() {
    if (!this.task) return
    this.task = null
    this.energy = Math.max(0, this.energy - 0.25)
    this.office.say(this, '✓ feito', 2.5)
    this.releaseAll()
    this.setPlan([{ do: this.walking ? 'stand' : this.restingPose(), secs: 2.5 }], ACTIVITY.rest)
  }
  restingPose() { return isSeated(this.slot.pose) || this.slot.pose === 'sit' ? 'sit' : 'stand' }
  cheer(secs) { if (!this.hidden) this.cheerUntil = performance.now() + secs * 1000 }

  leave() { this.hidden = true; this.avatar.root.visible = false; this.office.say(this, null) }
  arrive() {
    const exit = this.office.world.slots.exit
    this.hidden = false; this.avatar.root.visible = true
    this.path = []; this.pendingTarget = null
    this.here = nodeAt(exit); this.slot = exit; this.pos.copy(exit.pos)
  }

  // Jump straight to the end of the first walk (used on page load so the office starts alive).
  settle() {
    if (!this.walking) return
    const last = this.path.at(-1)
    this.pos.copy(last.p); this.here = last; this.path = []; this.pendingTarget = null
    this.advance()
  }

  describeActivity() {
    if (this.hidden) return 'Fora do escritório'
    if (this.talk) return `Conversando com ${this.talk.members.filter((m) => m !== this).map((m) => m.role.name).join(', ')}`
    if (this.task) return `Trabalhando: ${this.task}`
    return this.walking ? `${this.activity} (a caminho)` : this.activity
  }

  // ---------- Simulation tick (decisions and movement) ----------
  tick(dt, now) {
    if (this.hidden) { if (this.step && now > this.stepUntil && !this.step.go) this.advance(); return }
    if (this.walking) this.walk(dt)
    else if (this.step && !this.step.go && now > this.stepUntil) this.advance()
    else if (this.step?.lines && !this.talk && now > this.nextLineAt) {
      this.nextLineAt = now + rand(5000, 11000)
      if (Math.random() < 0.55) this.office.say(this, pick(this.step.lines), 2.5)
    }
    if (this.task && this.atDesk && !this.talk && STUCK_ROOMS.has(this.desk.slot.room) && now > this.nextStuckAt) {
      this.nextStuckAt = now + rand(25000, 60000)
      if (Math.random() < STUCK_CHANCE) this.office.talk.requestHelp(this)
    }
    const workingNow = this.task && !this.walking
    this.energy = Math.min(1, Math.max(0, this.energy - dt * (workingNow ? 0.006 : 0.002)))
  }

  walk(dt) {
    const next = this.path[0]
    const delta = new THREE.Vector3().subVectors(next.p, this.pos); delta.y = 0
    const dist = delta.length()
    const stepLen = WALK_SPEED * dt
    if (dist <= stepLen) {
      this.pos.x = next.p.x; this.pos.z = next.p.z
      this.here = next; this.path.shift()
      if (this.pendingTarget) { this.path = route(this.here, this.pendingTarget); this.pendingTarget = null }
      if (!this.path.length && this.step?.go) this.advance()
      return
    }
    delta.multiplyScalar(stepLen / dist); this.pos.add(delta)
    this.avatar.root.rotation.y = Math.atan2(delta.x, delta.z)
  }

  // ---------- Frame (animation only) ----------
  currentPose(now) {
    if (this.walking) return 'walk'
    if (now < this.cheerUntil) return 'cheer'
    const seated = this.slot.pose === 'sit' || this.slot.pose === 'game'
    if (this.talk) {
      if (this.office.talk.isSpeaking(this)) return seated ? 'sitTalk' : 'talk'
      return seated ? (this.task ? 'mouse' : 'sit') : 'stand'
    }
    const cycle = (list, secs) => list[Math.floor((now / 1000 + this.phase * 7) / secs) % list.length]
    const pose = this.step?.do ?? this.slot.pose
    if (pose === 'work') return seated ? cycle(WORK_CYCLE, 4) : 'talk'
    if (pose === 'meeting') return cycle(MEETING_CYCLE, 5)
    if (pose === 'present') return cycle(['point', 'talk', 'talk'], 4)
    if (pose === 'deskIdle') return cycle(DESK_IDLE_CYCLE, 6)
    if (pose === 'converse') return seated ? 'sit' : 'stand'
    if (pose === 'stand' && this.slot.pose === 'sit') return 'sit'
    return pose
  }

  animate(now, t) {
    const pose = this.currentPose(now)
    if (!this.walking) {
      const look = this.office.talk.focusOf(this) ?? this.slot.look
      const target = Math.atan2(look.x - this.pos.x, look.z - this.pos.z)
      let diff = target - this.avatar.root.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.avatar.root.rotation.y += diff * 0.15
    }
    applyPose(this.avatar, pose, t, this.phase, this.holding)
    for (const screen of this.desk.screens) {
      const lit = this.task ? 0x4fc3f7 : (this.atDesk ? 0x2a3f55 : 0x000000)
      if (screen.emissive.getHex() !== lit && !this.flashUntil) screen.emissive.setHex(lit)
    }
    if (this.flashUntil && now > this.flashUntil) this.flashUntil = 0
  }

  flash(tool) {
    for (const screen of this.desk.screens) screen.emissive.setHex(0x81c784)
    this.flashUntil = performance.now() + 500
    if (this.task) this.office.say(this, `🔧 ${tool}`, 1.5)
  }
}
