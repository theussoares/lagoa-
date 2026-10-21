// Kenney mini character with its own clips (idle, walk, sit, interact, emote) plus small bone tweaks
// on top (typing, mouse, sipping, gaming, hands on head) so seated work looks different from seated rest.
import * as THREE from 'three'
import { character, glasses as glassesModel } from './models.js'
import { box } from './world.js'

// Calibrated against the furniture kit chair (see models.js scale).
export const TUNE = { sitY: 0.4, perchY: 0.78, armAxis: 'x', armSign: -1, glassesY: 0.32, glassesZ: 0.2, glassesScale: 1.6 }

const CLIP = { walk: 'walk', stand: 'idle', talk: 'emote-yes', point: 'interact-right', frustrated: 'sit', perch: 'sit' }
const SEATED = new Set(['sit', 'type', 'mouse', 'think', 'read', 'sitTalk', 'game', 'frustrated', 'sip'])
export const isSeated = (pose) => SEATED.has(pose)
const FADE = 0.25

export function buildAvatar(look) {
  const root = new THREE.Group()
  const rig = character(look.model)
  if (look.tint) rig.model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(look.tint)) } })
  root.add(rig.model)
  let glasses = null
  if (look.glasses && rig.bones.head) {
    glasses = glassesModel()
    const inv = 1 / rig.model.scale.x
    glasses.scale.setScalar(TUNE.glassesScale * inv * 0.6)
    glasses.position.set(0, TUNE.glassesY * inv, TUNE.glassesZ * inv)
    rig.bones.head.add(glasses)
  }
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.13, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }))
  mug.visible = false; mug.castShadow = true; root.add(mug)
  const notepad = box(0.22, 0.02, 0.28, 0xfff3b0); notepad.visible = false; root.add(notepad)
  const controller = box(0.3, 0.06, 0.13, 0x1d1d1d); controller.visible = false; root.add(controller)
  // Rest pose per bone: clips without a track for a bone would otherwise keep our tweaks and accumulate them.
  const rest = Object.values(rig.bones).filter(Boolean).map((bone) => [bone, bone.quaternion.clone()])
  return { root, rig, rest, mug, notepad, controller, glasses, clip: null, lastT: null, height: 1 }
}

function play(av, name) {
  if (av.clip === name) return
  const next = av.rig.actions[name]; if (!next) return
  const prev = av.clip && av.rig.actions[av.clip]
  next.reset().setEffectiveWeight(1).fadeIn(FADE).play()
  if (prev) prev.fadeOut(FADE)
  av.clip = name
}

// Rotates a bone around the arm axis after the clip has posed it.
function bend(bone, angle) { if (bone) bone.rotation[TUNE.armAxis] += angle * TUNE.armSign }

export function applyPose(av, pose, t, phase, holding) {
  const dt = av.lastT === null ? 0 : Math.min(t - av.lastT, 1)
  av.lastT = t
  const seated = isSeated(pose)
  play(av, seated ? 'sit' : (CLIP[pose] ?? 'idle'))
  for (const [bone, q] of av.rest) bone.quaternion.copy(q)
  av.rig.mixer.update(dt)

  const { armL, armR, head } = av.rig.bones
  av.rig.model.position.y = seated ? TUNE.sitY : pose === 'perch' ? TUNE.perchY : 0
  const wiggle = (speed, amount, offset = 0) => Math.sin(t * speed + phase + offset) * amount
  switch (pose) {
    case 'type': bend(armL, 1.1 + wiggle(16, 0.12)); bend(armR, 1.1 + wiggle(16, 0.12, 2)); break
    case 'mouse': bend(armL, 1.0); bend(armR, 0.9 + wiggle(3, 0.08)); if (head) head.rotation.y += wiggle(0.7, 0.25); break
    case 'think': bend(armR, 2.2); if (head) head.rotation.x -= 0.15; break
    case 'read': bend(armL, 0.9); bend(armR, 0.9); if (head) head.rotation.x += 0.3; break
    case 'sip': bend(armR, 1.4 + (Math.sin(t * 0.9 + phase) + 1) * 0.5); break
    case 'game': bend(armL, 1.0 + wiggle(12, 0.1)); bend(armR, 1.0 + wiggle(13, 0.1)); break
    case 'sitTalk': bend(armR, 0.6 + Math.max(0, wiggle(3, 0.7))); bend(armL, 0.3 + Math.max(0, wiggle(2.3, 0.5, 1))); break
    case 'frustrated': bend(armL, 2.8); bend(armR, 2.8); if (head) head.rotation.x -= 0.2; break
    default: break
  }
  if (holding && !seated && pose !== 'walk') bend(armR, 1.2)
  if (holding && pose === 'walk') bend(armR, 1.0)

  const handY = seated ? 0.95 + TUNE.sitY - 0.25 : 0.95
  av.mug.visible = !!holding
  if (holding) av.mug.position.set(-0.3, pose === 'sip' ? handY + 0.25 + Math.sin(t * 0.9 + phase) * 0.12 : handY, 0.3)
  av.controller.visible = pose === 'game'
  av.controller.position.set(0, handY, 0.4)
  av.notepad.visible = pose === 'read'
  av.notepad.position.set(0, handY + 0.05, 0.38)
}
