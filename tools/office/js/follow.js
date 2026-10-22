// Camera that follows someone (click a person), an info card, and a cinema mode that hops between busy people.
import * as THREE from 'three'

const CLICK_TOLERANCE_PX = 6
const CINEMA_SECS = 8
const FOLLOW_OFFSET = new THREE.Vector3(0, 5.5, 7.5)

export function createFollow({ camera, controls, renderer, agents, describe }) {
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
  const card = document.getElementById('card')
  const cinemaButton = document.getElementById('cinema')
  let followId = null, hoveredId = null, cinema = false, nextCut = 0, lastCard = 0
  const lastTarget = new THREE.Vector3()

  const agentAt = (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const visible = [...agents.values()].filter((a) => !a.hidden).map((a) => a.avatar.root)
    return raycaster.intersectObjects(visible, true).find((h) => h.object.isMesh)?.object.userData.agentId ?? null
  }

  function follow(id, { fromCinema = false } = {}) {
    followId = id
    if (!fromCinema) setCinema(false)
    const a = agents.get(id)
    lastTarget.copy(a.pos)
    // Swing the camera close the first time; after that the user can orbit freely around the moving target.
    camera.position.copy(a.pos).add(FOLLOW_OFFSET)
    controls.target.copy(a.pos).setY(0.9)
    card.hidden = false
    renderCard(true)
  }
  function stop() { followId = null; card.hidden = true; setCinema(false) }
  function setCinema(on) {
    cinema = on; nextCut = 0
    cinemaButton.setAttribute('aria-pressed', String(on))
    cinemaButton.textContent = on ? '■ Parar cinema' : '🎬 Cinema'
    if (!on && !followId) card.hidden = true
  }

  function renderCard(force) {
    const now = performance.now()
    if (!followId || (!force && now - lastCard < 300)) return
    lastCard = now
    const info = describe(agents.get(followId))
    card.querySelector('[data-name]').textContent = info.name
    card.querySelector('[data-trait]').textContent = info.trait
    card.querySelector('[data-activity]').textContent = info.activity
    card.querySelector('[data-energy]').style.width = `${Math.round(info.energy * 100)}%`
  }

  let downAt = null
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY } })
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > CLICK_TOLERANCE_PX) return
    const id = agentAt(e)
    if (id) follow(id); else if (followId && !cinema) stop()
  })
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    hoveredId = agentAt(e)
    renderer.domElement.style.cursor = hoveredId ? 'pointer' : ''
  })
  card.querySelector('[data-close]').onclick = stop
  cinemaButton.onclick = () => setCinema(!cinema)
  addEventListener('keydown', (e) => { if (e.key === 'Escape') stop() })

  return {
    get hoveredId() { return hoveredId },
    get followId() { return followId },
    update(now) {
      if (cinema && now > nextCut) {
        nextCut = now + CINEMA_SECS * 1000
        const visible = [...agents.values()].filter((a) => !a.hidden && a.id !== followId)
        const busy = visible.filter((a) => a.task || a.talk)
        const next = (busy.length ? busy : visible)[Math.floor(Math.random() * (busy.length || visible.length))]
        if (next) follow(next.id, { fromCinema: true })
      }
      const a = followId && agents.get(followId)
      if (!a) return
      if (a.hidden) { stop(); return }
      // Move target and camera by how much the person moved, so the user's chosen angle is kept.
      const delta = a.pos.clone().sub(lastTarget)
      lastTarget.copy(a.pos)
      controls.target.add(delta); camera.position.add(delta)
      renderCard(false)
    },
  }
}
