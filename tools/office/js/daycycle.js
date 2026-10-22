// Office day: arrival, focus, lunch, leaving and night, with light that follows the hour.
// Public page runs a virtual clock (a work day in ~10 minutes, nights fast-forward); local mode uses the real clock.
import * as THREE from 'three'

const VIRTUAL_MINUTES_PER_SECOND = 1
const NIGHT_SPEEDUP = 8
export const HOURS = { arrive: 7.5, lunchStart: 12, lunchEnd: 13, leave: 18.5 }

export function createDayClock({ virtual, forcedHour }) {
  let hour = forcedHour ?? (virtual ? 9 + Math.random() * 6 : realHour())
  return {
    get hour() { return hour },
    tick(dt) {
      if (forcedHour !== null && forcedHour !== undefined) return
      if (!virtual) { hour = realHour(); return }
      const night = hour >= HOURS.leave + 0.5 || hour < HOURS.arrive - 0.5
      hour = (hour + (dt * VIRTUAL_MINUTES_PER_SECOND * (night ? NIGHT_SPEEDUP : 1)) / 60) % 24
    },
  }
}
function realHour() { const d = new Date(); return d.getHours() + d.getMinutes() / 60 }

export const isOffHours = (hour) => hour >= HOURS.leave || hour < HOURS.arrive
export const isLunch = (hour) => hour >= HOURS.lunchStart && hour < HOURS.lunchEnd
export const formatHour = (hour) => `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`

const smooth = (edge0, edge1, x) => { const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1); return t * t * (3 - 2 * t) }
const NIGHT_SKY = new THREE.Color(0x0b0f1a), DAY_SKY = new THREE.Color(0x24201c)
const NOON_SUN = new THREE.Color(0xfff1dc), LOW_SUN = new THREE.Color(0xffa860)

// Daylight 0..1: sunrise 6–8h, sunset 17–19h30. Lamps get stronger as daylight fades.
export function applyLight({ hour, sun, hemi, scene, lamps }) {
  const day = smooth(6, 8, hour) * (1 - smooth(17, 19.5, hour))
  const low = 1 - Math.abs(((hour - 6) / 13.5) * 2 - 1)
  sun.intensity = 0.15 + 1.25 * day
  sun.color.copy(LOW_SUN).lerp(NOON_SUN, THREE.MathUtils.clamp(low * 1.6, 0, 1))
  const angle = THREE.MathUtils.clamp((hour - 6) / 13.5, 0, 1) * Math.PI
  sun.position.set(Math.cos(angle) * -30, 10 + Math.sin(angle) * 26, 18)
  hemi.intensity = 0.35 + 0.75 * day
  scene.background.copy(NIGHT_SKY).lerp(DAY_SKY, day)
  for (const lamp of lamps) lamp.intensity = lamp.userData.base * (1 + (1 - day) * 0.9)
  return day
}
