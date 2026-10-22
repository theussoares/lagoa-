// Kenney CC0 models (tools/office/models): furniture kit and animated mini characters.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'

const FURNITURE = ['desk', 'chairDesk', 'computerScreen', 'computerKeyboard', 'computerMouse', 'laptop', 'pottedPlant', 'plantSmall1',
  'plantSmall2', 'books', 'loungeSofa', 'loungeSofaLong', 'tableCoffee', 'kitchenFridgeLarge', 'kitchenCoffeeMachine', 'kitchenBar',
  'kitchenCabinet', 'bookcaseOpen', 'televisionModern', 'lampRoundFloor', 'tableRound', 'chair', 'chairModernCushion',
  'rugRectangle', 'rugRound', 'trashcan', 'speaker', 'loungeChair', 'coatRackStanding']
export const CHARACTERS = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f']

// Kit units are small; one factor keeps furniture proportions consistent with each other.
export const FURNITURE_SCALE = 2.6
export const CHARACTER_HEIGHT = 1.3

const MODELS_BASE = document.documentElement.dataset.models ?? '/models/'
const cache = new Map()
export async function loadModels(onProgress) {
  const loader = new GLTFLoader()
  const paths = [...FURNITURE.map((n) => `furniture/${n}`), ...CHARACTERS.map((n) => `characters/character-${n}`), 'characters/aid-glasses']
  let done = 0
  await Promise.all(paths.map(async (path) => {
    cache.set(path, await loader.loadAsync(`${MODELS_BASE}${path}.glb`))
    onProgress?.(++done / paths.length)
  }))
}

// Furniture centered on (x, z), resting on y, rotated around Y. Size by `scale`, or fit `width`/`height`.
export function furniture(parent, name, { x = 0, y = 0, z = 0, rotY = 0, scale, width, height, tint } = {}) {
  const model = cache.get(`furniture/${name}`).scene.clone(true)
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3())
  const k = width ? width / size.x : height ? height / size.y : (scale ?? FURNITURE_SCALE)
  model.scale.setScalar(k)
  model.position.set(-(box.min.x + size.x / 2) * k, -box.min.y * k, -(box.min.z + size.z / 2) * k)
  model.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true; o.receiveShadow = true
    if (tint) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(tint)) }
  })
  const group = new THREE.Group(); group.add(model)
  group.position.set(x, y, z); group.rotation.y = rotY
  parent.add(group)
  group.userData.size = size.multiplyScalar(k)
  return group
}

export function character(name) {
  const gltf = cache.get(`characters/character-${name}`)
  const model = cloneSkinned(gltf.scene)
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false } })
  const box = new THREE.Box3().setFromObject(model)
  model.scale.setScalar(CHARACTER_HEIGHT / box.getSize(new THREE.Vector3()).y)
  const mixer = new THREE.AnimationMixer(model)
  const actions = Object.fromEntries(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]))
  const bone = (n) => model.getObjectByName(n)
  return { model, mixer, actions, bones: { armL: bone('arm-left'), armR: bone('arm-right'), head: bone('head'), torso: bone('torso') } }
}

export function glasses() {
  const model = cache.get('characters/aid-glasses').scene.clone(true)
  model.traverse((o) => { if (o.isMesh) o.castShadow = true })
  return model
}
