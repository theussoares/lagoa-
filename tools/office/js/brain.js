// Behavior: each agent runs a plan (go somewhere → do something → …) and picks the next one by itself.
// Decision (what), movement (route along the door/aisle network) and animation (pose) stay separate.
import * as THREE from 'three'
import { route, nodeAt, makeSlot } from './world.js'
import { applyPose, isSeated } from './avatar.js'
import { CHAT_LINES, GAME_LINES, REVIEW_LINES, ROAM_LINES } from './roster.js'

const WALK_SPEED = 3.0
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const HUDDLE_LINES = ['e se a gente…', 'desenha aí', 'faz sentido', 'boa ideia!', 'quebra em 3']
const WORK_CYCLE = ['type', 'type', 'mouse', 'type', 'think', 'type', 'mouse']
const DESK_IDLE_CYCLE = ['mouse', 'read', 'think', 'type', 'mouse']
const MEETING_CYCLE = ['sitTalk', 'sit', 'think', 'sitTalk', 'sit']

export function isOffHours(hour) { return hour >= 20 || hour < 7 }

export class Agent {
  constructor({ id, role, avatar, desk, office }) {
    Object.assign(this, { id, role, avatar, desk, office })
    this.phase = Math.random() * 10
    this.energy = rand(0.5, 1)
    this.task = null
    this.steps = []; this.stepIndex = 0; this.stepUntil = 0; this.nextLineAt = 0
    this.path = []; this.pendingTarget = null
    this.here = nodeAt(desk.slot); this.slot = desk.slot
    this.holding = false; this.hidden = false; this.chatWith = null
    this.reserved = new Set()
    avatar.root.position.copy(desk.slot.pos)
  }

  get pos() { return this.avatar.root.position }
  get step() { return this.steps[this.stepIndex] }
  get walking() { return this.path.length > 0 }
  get idleAtDesk() { return !this.task && !this.walking && !this.hidden && this.slot === this.desk.slot && this.step?.do === 'deskIdle' }

  claim(slot) { slot.taken = this.id; this.reserved.add(slot); return slot }
  releaseAll() { for (const s of this.reserved) if (s.taken === this.id) s.taken = null; this.reserved.clear() }

  // ---------- Plans ----------
  setPlan(steps) { this.steps = steps; this.stepIndex = -1; this.advance() }
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

  decide() {
    this.releaseAll()
    const office = this.office
    if (this.task) return this.setPlan(this.workPlan())
    if (office.offHours) {
      if (this.hidden) return this.setPlan([{ do: 'stand', secs: rand(20, 40) }])
      return this.setPlan([{ go: this.claim(office.world.slots.exit) }, { fn: () => this.leave() }])
    }
    if (this.hidden) { this.arrive(); return this.setPlan([{ go: this.desk.slot }, { do: 'deskIdle', secs: rand(10, 25) }]) }
    this.setPlan(this.idlePlan())
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

  idlePlan() {
    const weights = { ...this.role.idle }
    if (this.energy < 0.35) for (const k of ['coffee', 'copa', 'lounge']) if (weights[k]) weights[k] *= 4
    const kinds = Object.keys(weights)
    let roll = Math.random() * kinds.reduce((sum, k) => sum + weights[k], 0)
    const ordered = kinds.filter((k) => (roll -= weights[k]) < 0).concat(kinds)
    for (const kind of ordered) {
      const plan = this.planFor(kind)
      if (plan) return plan
    }
    return [{ go: this.desk.slot }, { do: 'deskIdle', secs: rand(15, 30) }]
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
        return [{ go: this.claim(spot) }, { fn: () => { this.holding = true } }, { do: spot.pose === 'perch' ? 'perch' : 'talk', secs: rand(15, 30), lines: CHAT_LINES },
          { fn: () => { this.holding = false; this.energy += 0.5 } }]
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
        return [{ go: this.claim(spot) }, { do: 'talk', secs: rand(12, 20), lines: HUDDLE_LINES }]
      }
      case 'bug': return [{ go: desk }, { do: 'type', secs: rand(4, 7) }, { do: 'frustrated', secs: 2.5, say: '🐛 achei um bug!' },
        { do: 'read', secs: 5, say: '📝 anotando' }, { do: 'type', secs: rand(5, 9) }]
      case 'chat': return this.visitPlan(this.role.chatWith, 'talk', CHAT_LINES, 'sitTalk')
      case 'review': return this.visitPlan(null, 'point', REVIEW_LINES, 'mouse', ['dev', 'qualidade', 'produto'])
      case 'roam': {
        const devs = this.office.list().filter((a) => a !== this && a.desk.slot.room === 'dev' && !a.hidden)
        const stops = devs.sort(() => Math.random() - 0.5).slice(0, 3)
        if (!stops.length) return null
        return stops.flatMap((a) => {
          const spot = this.visitSpot(a); if (!spot) return []
          return [{ go: spot }, { fn: () => this.engage(a, 5, 'sitTalk') }, { do: 'talk', secs: 5, say: ROAM_LINES }]
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
  visitPlan(preferred, pose, lines, partnerPose, rooms) {
    const candidates = this.office.list().filter((a) => a !== this && !a.hidden && !a.walking && a.slot === a.desk.slot &&
      (preferred ? preferred.includes(a.id) : rooms.includes(a.desk.slot.room)))
    const other = pick(candidates); if (!other) return null
    const spot = this.visitSpot(other); if (!spot) return null
    const secs = rand(7, 11)
    return [{ go: spot }, { fn: () => this.engage(other, secs, partnerPose) }, { do: pose, secs, lines }]
  }
  engage(other, secs, pose) { other.chatWith = { agent: this, until: performance.now() + secs * 1000, pose } }

  // ---------- Hooks ----------
  assignTask(text) {
    if (this.hidden) this.arrive()
    this.task = text || 'trabalhando…'
    this.holding = false
    this.office.say(this, this.task)
    this.decide()
  }
  finishTask() {
    if (!this.task) return
    this.task = null
    this.energy = Math.max(0, this.energy - 0.25)
    this.office.say(this, '✓ feito', 2.5)
    this.releaseAll()
    this.setPlan([{ do: this.walking ? 'stand' : this.restingPose(), secs: 2.5 }])
  }
  restingPose() { return isSeated(this.slot.pose) || this.slot.pose === 'sit' ? 'sit' : 'stand' }

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

  // ---------- Frame update ----------
  update(dt, now, t) {
    if (this.hidden) { if (this.step && now > this.stepUntil && !this.step.go) this.advance(); return }
    if (this.walking) this.walk(dt)
    else if (this.step && !this.step.go && now > this.stepUntil) this.advance()
    else if (this.step?.lines && now > this.nextLineAt) {
      this.nextLineAt = now + rand(5000, 11000)
      if (Math.random() < 0.55) this.office.say(this, pick(this.step.lines), 2.5)
    }
    const workingNow = this.task && !this.walking
    this.energy = Math.min(1, Math.max(0, this.energy - dt * (workingNow ? 0.006 : 0.002)))
    this.animate(now, t)
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

  currentPose(now) {
    if (this.walking) return 'walk'
    const step = this.step
    const cycle = (list, secs) => list[Math.floor((now / 1000 + this.phase * 7) / secs) % list.length]
    const partner = this.chatWith && now < this.chatWith.until && this.slot === this.desk.slot ? this.chatWith : null
    if (partner) return partner.pose
    const pose = step?.do ?? this.slot.pose
    if (pose === 'work') return this.slot.pose === 'sit' ? cycle(WORK_CYCLE, 4) : 'talk'
    if (pose === 'meeting') return cycle(MEETING_CYCLE, 5)
    if (pose === 'present') return cycle(['point', 'talk', 'talk'], 4)
    if (pose === 'deskIdle') return cycle(DESK_IDLE_CYCLE, 6)
    if (pose === 'stand' && this.slot.pose === 'sit') return 'sit'
    return pose
  }

  animate(now, t) {
    const pose = this.currentPose(now)
    if (!this.walking) {
      const partner = this.chatWith && now < this.chatWith.until && pose !== 'mouse' ? this.chatWith.agent.pos : null
      const look = partner ?? this.slot.look
      const target = Math.atan2(look.x - this.pos.x, look.z - this.pos.z)
      let diff = target - this.avatar.root.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.avatar.root.rotation.y += diff * 0.15
    }
    if (this.chatWith && now > this.chatWith.until) this.chatWith = null
    applyPose(this.avatar, pose, t, this.phase, this.holding)
    for (const screen of this.desk.screens) {
      const lit = this.task ? 0x4fc3f7 : (this.slot === this.desk.slot && !this.walking ? 0x2a3f55 : 0x000000)
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
