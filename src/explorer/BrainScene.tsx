import { useEffect, useRef } from 'react'
import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createBrainModel, disposeMeshes, type SceneState } from './brainModel'
import { PARTS, type PartId } from './parts'
import { partVisible, type CameraRequest, type Hover, type Pin, type Preset } from './state'

export type Orientation = { label: string; x: number; y: number }
export type Projection = { pins: Pin[]; orientation: Orientation[] }

type Callbacks = {
  onReady: () => void
  onUnavailable: () => void
  onProject: (projection: Projection) => void
  onHover: (hover: Hover) => void
  onPick: (part: PartId | null) => void
  onStopRotation: () => void
}

const ATLAS = `${import.meta.env.BASE_URL}atlas/brain-atlas.glb`
const VIEWS: Record<Preset, T.Vector3> = {
  top: new T.Vector3(0, 1, -0.15).normalize(),
  side: new T.Vector3(1, 0.1, 0).normalize(),
  front: new T.Vector3(0, 0.1, 1).normalize(),
}
const DIRECTIONS = [
  ['A', new T.Vector3(0, 0, 1)], ['P', new T.Vector3(0, 0, -1)],
  ['L', new T.Vector3(-1, 0, 0)], ['R', new T.Vector3(1, 0, 0)],
] as const

function getPartId(object: T.Object3D) {
  const id: unknown = object.userData.partId

  return PARTS.find((part) => part.id === id)?.id ?? null
}

function createScene(node: HTMLDivElement, callbacks: Callbacks) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.domElement.setAttribute('aria-hidden', 'true')
  node.append(renderer.domElement)

  const scene = new T.Scene()
  const environment = new RoomEnvironment()
  const pmrem = new T.PMREMGenerator(renderer)
  const lighting = pmrem.fromScene(environment, 0.04)
  scene.environment = lighting.texture
  environment.dispose()
  pmrem.dispose()

  const key = new T.DirectionalLight('#F2F5FF', 1.75)
  key.position.set(-3, 5, 4)
  scene.add(key)

  const camera = new T.PerspectiveCamera(35, 1, 0.1, 150)
  camera.position.copy(VIEWS.top).multiplyScalar(10)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.rotateSpeed = 0.7
  controls.autoRotateSpeed = 0.6

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const request = new AbortController()
  const pointer = new T.Vector2()
  const projected = new T.Vector3()
  const ray = new T.Raycaster()
  let model: ReturnType<typeof createBrainModel> | undefined
  let state: SceneState | undefined
  let frame: number | undefined
  let hoverFrame: number | undefined
  let projectDirty = true
  let disposed = false
  let width = 1
  let height = 1
  let previous = performance.now()
  let down: { x: number; y: number; pointer: number; moved: boolean } | null = null

  function fitDistance(bounds: T.Sphere) {
    const vertical = T.MathUtils.degToRad(camera.fov)
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect)

    return bounds.radius / Math.sin(Math.min(vertical, horizontal) / 2) * 1.08
  }

  function aim(bounds: T.Sphere, direction: T.Vector3) {
    const distance = fitDistance(bounds)
    controls.minDistance = distance * 0.45
    controls.maxDistance = distance * 1.8
    controls.target.copy(bounds.center)
    camera.position.copy(bounds.center).addScaledVector(direction, distance)
    controls.update()
    cameraChanged()
  }

  function clampTarget() {
    if (!model || model.bounds.containsPoint(controls.target)) return

    const old = controls.target.clone()
    model.bounds.clampPoint(old, controls.target)
    camera.position.add(controls.target).sub(old)
    camera.lookAt(controls.target)
    camera.updateMatrixWorld()
  }

  function availableMeshes() {
    if (!model || !state) return []

    const view = state.view

    return model.pickables.filter((mesh) => {
      const id = getPartId(mesh)

      return id !== null && partVisible(id, view)
    })
  }

  function projectPins() {
    if (!model || !state) return

    camera.updateMatrixWorld()
    const meshes = availableMeshes().filter((mesh) => [mesh.material].flat().every((material) => !material.transparent))
    const pins: Pin[] = []
    for (const { id } of PARTS) {
      if (!partVisible(id, state.view)) continue

      const anchor = model.anchors.get(id)!
      projected.copy(anchor).project(camera)
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 0.96 || Math.abs(projected.y) > 0.95) continue

      ray.setFromCamera(pointer.set(projected.x, projected.y), camera)
      const blockers = meshes.filter((mesh) => getPartId(mesh) !== id)
      const hit = ray.intersectObjects(blockers, false)[0]
      if (hit && hit.distance + 0.05 < camera.position.distanceTo(anchor)) continue

      pins.push({ id, x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 })
    }

    const inverse = camera.quaternion.clone().invert()
    const orientation = DIRECTIONS.flatMap(([label, direction]) => {
      const axis = direction.clone().applyQuaternion(inverse)
      const length = Math.hypot(axis.x, axis.y)

      return length > 0.28 ? [{ label, x: axis.x / length * 23, y: -axis.y / length * 23 }] : []
    })

    callbacks.onProject({ pins, orientation })
  }

  function pick(clientX: number, clientY: number): PartId | null {
    const rect = node.getBoundingClientRect()
    if (!state || !model || !rect.width || !rect.height) return null

    const x = (clientX - rect.left) / rect.width * 2 - 1
    const y = 1 - (clientY - rect.top) / rect.height * 2
    ray.setFromCamera(pointer.set(x, y), camera)
    const hits = ray.intersectObjects(availableMeshes(), false)
    // Circuit picking can reach deep structures through the translucent cortex.
    const hit = state.view === 'anatomy' ? hits[0] : hits.find(({ object }) => getPartId(object) !== 'cortex') ?? hits[0]

    return hit ? getPartId(hit.object) : null
  }

  function render(now: number) {
    frame = undefined
    const delta = Math.min((now - previous) / 1000, 0.06)
    previous = now

    if (controls.autoRotate) controls.update(delta)

    clampTarget()
    if (model && state) model.update(state, motion.matches)
    renderer.render(scene, camera)

    if (projectDirty) {
      projectDirty = false
      projectPins()
    }

    if (controls.autoRotate) queueRender()
  }

  function queueRender() {
    if (frame === undefined && !disposed) frame = requestAnimationFrame(render)
  }

  function cameraChanged() {
    projectDirty = true
    queueRender()
  }

  function pointerDown(event: PointerEvent) {
    controls.autoRotate = false
    callbacks.onStopRotation()
    if (event.button !== 0 || !event.isPrimary) {
      if (down) down.moved = true
      return
    }

    down = { x: event.clientX, y: event.clientY, pointer: event.pointerId, moved: false }
    callbacks.onHover(null)
  }

  function pointerMove(event: PointerEvent) {
    if (down) {
      down.moved ||= Math.hypot(event.clientX - down.x, event.clientY - down.y) >= 4
      return
    }

    if (event.pointerType === 'touch') return
    if (hoverFrame !== undefined) cancelAnimationFrame(hoverFrame)

    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = undefined
      if (down) return

      const id = pick(event.clientX, event.clientY)
      const rect = node.getBoundingClientRect()
      renderer.domElement.style.cursor = id ? 'pointer' : ''

      callbacks.onHover(id ? { id, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
    })
  }

  function pointerUp(event: PointerEvent) {
    if (!down || down.pointer !== event.pointerId) return

    const isClick = !down.moved && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 4
    down = null

    if (isClick) callbacks.onPick(pick(event.clientX, event.clientY))
  }

  function leave() {
    if (hoverFrame !== undefined) cancelAnimationFrame(hoverFrame)

    hoverFrame = undefined
    renderer.domElement.style.cursor = ''
    callbacks.onHover(null)
  }

  function cancelPointer() {
    down = null
    leave()
  }

  const observer = new ResizeObserver(([entry]) => {
    const size = entry.contentRect
    if (!size.width || !size.height) return

    width = size.width
    height = size.height
    const bounds = model?.bounds
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)

    if (bounds) {
      const direction = camera.position.clone().sub(controls.target).normalize()
      aim(bounds, direction)
    } else {
      cameraChanged()
    }
  })

  const canvas = renderer.domElement
  observer.observe(node)
  controls.addEventListener('change', cameraChanged)
  motion.addEventListener('change', queueRender)
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointercancel', cancelPointer)
  canvas.addEventListener('pointerleave', leave)
  canvas.addEventListener('webglcontextlost', callbacks.onUnavailable)

  async function loadAtlas() {
    let loaded: T.Group | undefined

    try {
      const response = await fetch(ATLAS, { signal: request.signal })
      if (!response.ok) throw new Error('The brain atlas could not be loaded.')

      const asset = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
      loaded = asset.scene
      if (disposed) {
        disposeMeshes(loaded)
        return
      }

      model = createBrainModel(loaded)
      scene.add(model.root)
      aim(model.bounds, VIEWS.top)
      callbacks.onReady()
    } catch {
      if (loaded && !model) disposeMeshes(loaded)
      if (!disposed) callbacks.onUnavailable()
    }
  }

  loadAtlas()

  return {
    update(next: SceneState) {
      projectDirty ||= !state || state.view !== next.view || state.selected !== next.selected
      if (!controls.autoRotate && next.autoRotate) previous = performance.now()
      controls.autoRotate = next.autoRotate
      state = next
      queueRender()
    },
    move({ preset }: CameraRequest) {
      if (model) aim(model.bounds, VIEWS[preset])
    },
    dispose() {
      disposed = true
      request.abort()
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (hoverFrame !== undefined) cancelAnimationFrame(hoverFrame)

      observer.disconnect()
      motion.removeEventListener('change', queueRender)
      controls.removeEventListener('change', cameraChanged)
      canvas.removeEventListener('webglcontextlost', callbacks.onUnavailable)
      controls.dispose()
      model?.dispose()
      lighting.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}

export default function BrainScene({ state, command, callbacks }: {
  state: SceneState
  command: CameraRequest | null
  callbacks: Callbacks
}) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<ReturnType<typeof createScene> | null>(null)

  useEffect(() => {
    try {
      scene.current = createScene(host.current!, callbacks)
    } catch {
      callbacks.onUnavailable()
      return
    }

    return () => {
      scene.current?.dispose()
      scene.current = null
    }
  }, [callbacks])

  useEffect(() => scene.current?.update(state), [state])
  useEffect(() => {
    if (command) scene.current?.move(command)
  }, [command])

  return <div className="brain-canvas" ref={host} aria-hidden="true" />
}
