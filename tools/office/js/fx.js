// One-shot effects: confetti when a demand is delivered, a red pulse when security blocks.
import * as THREE from 'three'

const CONFETTI = 260
const GRAVITY = 6
const COLORS = [0xe8743b, 0x3f7fc4, 0x5f9e57, 0xd9a441, 0x8a5cc4, 0xe58fb4]

export function createFx(scene) {
  const piece = new THREE.PlaneGeometry(0.12, 0.2)
  const confetti = new THREE.InstancedMesh(piece, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONFETTI)
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  confetti.frustumCulled = false; confetti.visible = false
  const color = new THREE.Color()
  for (let i = 0; i < CONFETTI; i++) confetti.setColorAt(i, color.setHex(COLORS[i % COLORS.length]))
  scene.add(confetti)
  const parts = Array.from({ length: CONFETTI }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), spin: 0 }))
  let confettiLeft = 0

  const alertLight = new THREE.PointLight(0xff3b30, 0, 16, 1.4)
  alertLight.position.set(3, 3, 7); scene.add(alertLight)
  let alertLeft = 0

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1)
  return {
    // Bursts over each spot (people who celebrate).
    celebrate(spots) {
      if (!spots.length) return
      parts.forEach((part, i) => {
        const at = spots[i % spots.length]
        part.p.set(at.x + (Math.random() - 0.5), 3 + Math.random(), at.z + (Math.random() - 0.5))
        part.v.set((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 5)
        part.r.set(Math.random() * 6, Math.random() * 6, 0); part.spin = (Math.random() - 0.5) * 12
      })
      confettiLeft = 4; confetti.visible = true
    },
    alert(at) { alertLight.position.set(at.x, 3, at.z); alertLeft = 4 },
    update(dt, t) {
      if (confettiLeft > 0) {
        confettiLeft -= dt
        parts.forEach((part, i) => {
          part.v.y -= GRAVITY * dt; part.v.multiplyScalar(1 - dt * 0.8)
          part.p.addScaledVector(part.v, dt)
          if (part.p.y < 0.02) { part.p.y = 0.02; part.v.set(0, 0, 0) }
          part.r.x += part.spin * dt; part.r.y += part.spin * dt * 0.7
          confetti.setMatrixAt(i, m.compose(part.p, q.setFromEuler(part.r), one))
        })
        confetti.instanceMatrix.needsUpdate = true
        if (confettiLeft <= 0) confetti.visible = false
      }
      alertLeft = Math.max(0, alertLeft - dt)
      alertLight.intensity = alertLeft > 0 ? 25 * (0.5 + 0.5 * Math.sin(t * 10)) : 0
    },
  }
}
