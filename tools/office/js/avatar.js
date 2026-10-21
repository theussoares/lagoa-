// Articulated low-poly person: legs with knees, arms with elbows, outfit, hair and accessories.
import * as THREE from 'three'
import { box, mat } from './world.js'

const HIP = 0.9
const SEAT = 0.6

function sphere(r, color, w = 12, h = 10) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat(color)); m.castShadow = true; return m }
const at = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh }

function limb(parent, x, y, upper, lower, color, lowerColor, end) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, 0); parent.add(pivot)
  at(pivot, box(upper[0], upper[1], upper[2], color), 0, -upper[1] / 2, 0)
  const joint = new THREE.Group(); joint.position.y = -upper[1]; pivot.add(joint)
  at(joint, box(lower[0], lower[1], lower[2], lowerColor), 0, -lower[1] / 2, 0)
  if (end) end(joint, lower[1])
  return { pivot, joint }
}

function buildHair(head, look) {
  const c = look.hairColor
  switch (look.hair) {
    case 'short': { const top = sphere(0.235, c); top.scale.set(1, 0.6, 1.02); at(head, top, 0, 0.08, -0.01); break }
    case 'long': {
      const top = sphere(0.24, c); top.scale.set(1.02, 0.65, 1.05); at(head, top, 0, 0.07, -0.01)
      at(head, box(0.42, 0.5, 0.16, c), 0, -0.15, -0.14); break
    }
    case 'bun': { const top = sphere(0.235, c); top.scale.set(1, 0.6, 1.02); at(head, top, 0, 0.08, -0.01); at(head, sphere(0.11, c), 0, 0.22, -0.12); break }
    case 'curly': for (let i = 0; i < 7; i++) at(head, sphere(0.1, c, 8, 6), Math.cos(i * 0.9) * 0.16, 0.14 + (i % 2) * 0.05, Math.sin(i * 0.9) * 0.12 - 0.04); break
    case 'cap': {
      const top = sphere(0.24, look.capColor ?? 0x333333); top.scale.set(1.02, 0.55, 1.02); at(head, top, 0, 0.09, 0)
      at(head, box(0.3, 0.03, 0.2, look.capColor ?? 0x333333), 0, 0.07, 0.24); break
    }
    default: break
  }
}

export function buildAvatar(look) {
  const height = look.height ?? 1, width = look.width ?? 1
  const root = new THREE.Group()
  const body = new THREE.Group(); root.add(body)
  body.scale.set(width, height, width)
  const skin = look.skin, top = look.top, bottom = look.bottom
  const sleeve = look.outfit === 'tee' ? skin : top

  const legs = [-0.12, 0.12].map((x) => limb(body, x, HIP, [0.17, 0.46, 0.19], [0.15, 0.42, 0.16], bottom, bottom,
    (joint, len) => at(joint, box(0.17, 0.08, 0.28, 0x2b2b2b), 0, -len - 0.02, 0.05)))

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.32, 4, 12), mat(top)); torso.castShadow = true
  torso.scale.set(1.05, 1, 0.68); at(body, torso, 0, HIP + 0.36, 0)
  if (look.outfit === 'suit') {
    at(body, box(0.13, 0.36, 0.02, 0xffffff), 0, HIP + 0.44, 0.165)
    at(body, box(0.06, 0.3, 0.025, look.tie ?? 0xb5473f), 0, HIP + 0.42, 0.18)
  }
  if (look.outfit === 'shirt') at(body, box(0.22, 0.06, 0.04, 0xffffff), 0, HIP + 0.66, 0.13)
  if (look.outfit === 'hoodie') {
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.06, 8, 16), mat(top)); hood.rotation.x = Math.PI / 2.4; at(body, hood, 0, HIP + 0.7, -0.08)
    at(body, box(0.26, 0.12, 0.03, top), 0, HIP + 0.2, 0.17)
  }
  at(body, box(0.08, 0.11, 0.02, 0xffffff), 0.12, HIP + 0.5, 0.17)
  if (look.backpack) at(body, box(0.34, 0.42, 0.16, 0x4a443d), 0, HIP + 0.38, -0.24)

  const head = new THREE.Group(); head.position.y = HIP + 0.86; body.add(head)
  at(head, sphere(0.22, skin, 16, 14), 0, 0, 0)
  for (const x of [-0.08, 0.08]) at(head, sphere(0.03, 0x1d1a17, 8, 6), x, 0.03, 0.2)
  at(head, sphere(0.035, skin, 8, 6), 0, -0.02, 0.22)
  buildHair(head, look)
  if (look.beard) { const beard = sphere(0.18, look.beardColor ?? 0x2b1d14); beard.scale.set(1.05, 0.7, 0.8); at(head, beard, 0, -0.1, 0.06) }
  if (look.glasses) {
    const frame = mat(0x1d1a17)
    for (const x of [-0.08, 0.08]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14), frame); at(head, ring, x, 0.03, 0.215) }
    at(head, box(0.05, 0.012, 0.012, 0x1d1a17), 0, 0.035, 0.22)
  }
  if (look.headphones) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 18, Math.PI), mat(0x222222)); at(head, band, 0, 0.02, 0)
    for (const x of [-0.24, 0.24]) at(head, box(0.06, 0.13, 0.12, 0x222222), x, 0, 0)
  }

  const shoulderX = 0.32
  const hand = (joint, len) => at(joint, sphere(0.065, skin, 8, 6), 0, -len - 0.04, 0)
  const arms = [-shoulderX, shoulderX].map((x) => limb(body, x, HIP + 0.6, [0.12, 0.3, 0.13], [0.11, 0.27, 0.12], top, sleeve, hand))

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.13, 10), mat(0xffffff)); mug.position.set(0, -0.36, 0.06); mug.visible = false
  arms[1].joint.add(mug)
  const notepad = box(0.18, 0.24, 0.02, 0xfff3b0); notepad.position.set(0, -0.36, 0.06); notepad.visible = false
  arms[0].joint.add(notepad)
  const controller = box(0.32, 0.07, 0.14, 0x1d1d1d); controller.visible = false; at(body, controller, 0, HIP + 0.22, 0.42)

  return { root, body, head, legs, arms, mug, notepad, controller, height }
}

// Seated poses put the hips on the chair; standing poses keep the feet on the floor.
const SEATED = new Set(['sit', 'type', 'mouse', 'think', 'read', 'sitTalk', 'game', 'frustrated', 'sip'])
export const isSeated = (pose) => SEATED.has(pose)

export function applyPose(av, pose, t, phase, holding) {
  const [legL, legR] = av.legs, [armL, armR] = av.arms
  const seated = isSeated(pose)
  for (const l of [...av.legs, ...av.arms]) { l.pivot.rotation.set(0, 0, 0); l.joint.rotation.set(0, 0, 0) }
  av.head.rotation.set(0, 0, 0)
  av.body.position.y = seated ? (pose === 'game' ? SEAT - 0.2 : SEAT) - HIP * av.height : 0
  armL.pivot.rotation.z = -0.08; armR.pivot.rotation.z = 0.08
  const s = Math.sin(t * 2 + phase)

  if (seated) { for (const l of av.legs) { l.pivot.rotation.x = -1.5; l.joint.rotation.x = 1.45 } }
  if (pose === 'perch') { for (const l of av.legs) { l.pivot.rotation.x = -0.9; l.joint.rotation.x = 0.9 } av.body.position.y = 0.88 - HIP * av.height + 0.1 }

  switch (pose) {
    case 'walk': {
      const w = Math.sin(t * 9 + phase)
      legL.pivot.rotation.x = w * 0.55; legR.pivot.rotation.x = -w * 0.55
      legL.joint.rotation.x = Math.max(0, -w) * 0.7; legR.joint.rotation.x = Math.max(0, w) * 0.7
      armL.pivot.rotation.x = -w * 0.45; armR.pivot.rotation.x = w * 0.45
      av.body.position.y = Math.abs(w) * 0.04
      break
    }
    case 'type': {
      armL.pivot.rotation.x = -0.55; armR.pivot.rotation.x = -0.55
      armL.joint.rotation.x = -0.95 + Math.sin(t * 16 + phase) * 0.12; armR.joint.rotation.x = -0.95 + Math.sin(t * 16 + phase + 2) * 0.12
      av.head.rotation.x = 0.1
      break
    }
    case 'mouse': {
      armL.pivot.rotation.x = -0.5; armL.joint.rotation.x = -0.9
      armR.pivot.rotation.x = -0.6; armR.joint.rotation.x = -0.8; armR.pivot.rotation.z = 0.2 + Math.sin(t * 3 + phase) * 0.06
      av.head.rotation.y = Math.sin(t * 0.7 + phase) * 0.25
      break
    }
    case 'think': {
      armR.pivot.rotation.x = -0.4; armR.joint.rotation.x = -2.3; armR.pivot.rotation.z = -0.15
      av.head.rotation.x = -0.15; av.head.rotation.y = Math.sin(t * 0.5 + phase) * 0.2
      break
    }
    case 'read': {
      armL.pivot.rotation.x = -0.7; armL.joint.rotation.x = -0.9; armR.pivot.rotation.x = -0.55; armR.joint.rotation.x = -0.9
      av.head.rotation.x = 0.35
      break
    }
    case 'sip': {
      armL.pivot.rotation.x = -0.5; armL.joint.rotation.x = -0.9
      const lift = (Math.sin(t * 0.9 + phase) + 1) / 2
      armR.pivot.rotation.x = -0.3 - lift * 0.3; armR.joint.rotation.x = -1.2 - lift * 1.1
      break
    }
    case 'game': {
      armL.pivot.rotation.x = -0.75; armR.pivot.rotation.x = -0.75
      armL.joint.rotation.x = -0.75 + Math.sin(t * 12 + phase) * 0.08; armR.joint.rotation.x = -0.75 + Math.sin(t * 13 + phase) * 0.08
      armL.pivot.rotation.z = 0.25; armR.pivot.rotation.z = -0.25
      av.body.rotation.z = Math.sin(t * 2.5 + phase) * 0.06
      break
    }
    case 'talk': case 'sitTalk': {
      const g = Math.sin(t * 3 + phase), g2 = Math.sin(t * 2.3 + phase + 1)
      armR.pivot.rotation.x = -0.4 - Math.max(0, g) * 0.6; armR.joint.rotation.x = -0.9
      armL.pivot.rotation.x = -0.2 - Math.max(0, g2) * 0.5; armL.joint.rotation.x = -0.7
      av.head.rotation.x = Math.sin(t * 4 + phase) * 0.06
      break
    }
    case 'point': {
      armR.pivot.rotation.x = -1.3 + s * 0.08; armR.joint.rotation.x = -0.1
      av.head.rotation.x = 0.1
      break
    }
    case 'frustrated': {
      armL.pivot.rotation.x = -2.4; armR.pivot.rotation.x = -2.4
      armL.joint.rotation.x = -1.6; armR.joint.rotation.x = -1.6
      armL.pivot.rotation.z = -0.4; armR.pivot.rotation.z = 0.4
      av.head.rotation.x = -0.25 + Math.sin(t * 6) * 0.05
      break
    }
    case 'perch': case 'stand': case 'sit': default: {
      armL.pivot.rotation.x = s * 0.03; armR.pivot.rotation.x = -s * 0.03
      if (pose === 'sit') { armL.pivot.rotation.x = -0.4; armR.pivot.rotation.x = -0.4; armL.joint.rotation.x = -0.6; armR.joint.rotation.x = -0.6 }
      break
    }
  }
  if (pose !== 'game') av.body.rotation.z = 0
  if (holding && pose !== 'sip' && pose !== 'type' && pose !== 'game') { armR.pivot.rotation.x = -0.25; armR.joint.rotation.x = -1.3 }
  av.mug.visible = !!holding
  av.controller.visible = pose === 'game'
  av.notepad.visible = pose === 'read'
}
