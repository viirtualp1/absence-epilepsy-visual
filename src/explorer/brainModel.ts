import * as T from 'three'
import { SEIZURE_ONSET } from '../model/recording'
import { PARTS, type PartId } from './parts'
import type { Phase } from './phases'
import { partVisible, type View } from './state'

export type SceneState = {
  view: View
  phase: Phase
  time: number
  selected: PartId | null
  hovered: PartId | null
  lead: number | null
  autoRotate: boolean
}

type Pulse = { curve: T.CatmullRomCurve3; dot: T.Mesh; halo: T.Sprite }

const PHASE_COLORS = { baseline: '#5EEAD4', absence: '#FBBF24', after: '#93C5FD' }
const ELECTRODE_ANGLES = [
  [-0.27, 0.52, 0.89], [-0.66, 0.96, 0.49],
  [0.27, 0.52, 0.89], [0.66, 0.96, 0.49],
  [-0.63, 0.92, -0.56], [-0.28, 0.59, -0.95],
  [0.63, 0.92, -0.56], [0.28, 0.59, -0.95],
] as const

export function disposeMeshes(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>()
  const materials = new Set<T.Material>()

  root.traverse((object) => {
    if (object instanceof T.Mesh || object instanceof T.Line) geometries.add(object.geometry)
    if (object instanceof T.Mesh || object instanceof T.Line || object instanceof T.Sprite) {
      for (const material of [object.material].flat()) materials.add(material)
    }
  })

  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

function radialTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64

  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'white')
  gradient.addColorStop(0.35, 'rgba(255,255,255,.48)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)

  return new T.CanvasTexture(canvas)
}

function setOpacity(material: T.Material, opacity: number, depthWrite = true) {
  const transparent = opacity < 1
  if (material.transparent !== transparent) {
    material.transparent = transparent
    material.needsUpdate = true
  }

  material.opacity = opacity
  material.depthWrite = depthWrite && !transparent
}

function corticalMaterial(rim: T.Uniform<number>, shell: T.Uniform<number>) {
  const material = new T.MeshPhysicalMaterial({
    color: '#AEB9D3', roughness: 0.5, sheen: 0.5, sheenColor: new T.Color('#DCE4F5'),
    emissive: '#8495bc',
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimStrength = rim
    shader.uniforms.shellStrength = shell
    shader.fragmentShader = 'uniform float rimStrength;\nuniform float shellStrength;\n' + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.5);
      diffuseColor.a *= mix(1.0, 0.26 + 0.74 * rim, shellStrength);
      totalEmissiveRadiance += vec3(0.45, 0.57, 0.82) * rim * rimStrength;`,
    )
  }

  return material
}

export function createBrainModel(atlas: T.Group) {
  const bounds = new T.Box3().setFromObject(atlas)
  const sphere = bounds.getBoundingSphere(new T.Sphere())
  const vertex = new T.Vector3()
  let radiusSquared = 0

  atlas.traverse((object) => {
    if (!(object instanceof T.Mesh)) return

    const positions = object.geometry.getAttribute('position')
    for (let index = 0; index < positions.count; index++) {
      vertex.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld)
      radiusSquared = Math.max(radiusSquared, sphere.center.distanceToSquared(vertex))
    }
  })

  sphere.radius = Math.sqrt(radiusSquared)

  const groups = new Map(PARTS.map(({ id }) => [id, new T.Group()]))
  const originalMaterials = new Set<T.Material>()
  const root = new T.Group()
  const rim = new T.Uniform(0)
  const shell = new T.Uniform(1)
  const cortex = corticalMaterial(rim, shell)
  const thalamus = new T.MeshStandardMaterial({ color: '#F5B54A', emissive: '#7A4A10', roughness: 0.5 })
  const hindbrain = new T.MeshStandardMaterial({ color: '#8190AB', emissive: '#667792', roughness: 0.66 })
  const core = new T.MeshBasicMaterial()
  const glow = new T.MeshBasicMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false })
  const pulseCore = new T.MeshBasicMaterial({ color: '#FFFFFF' })
  const radial = radialTexture()
  const pulseGlow = new T.SpriteMaterial({ map: radial, transparent: true, blending: T.AdditiveBlending, depthWrite: false })
  const electrode = new T.MeshBasicMaterial()
  const electrodeHighlight = new T.MeshBasicMaterial({ color: '#FFFFFF' })
  const pairLine = new T.LineDashedMaterial({ color: '#ECEEF2', dashSize: 0.055, gapSize: 0.035, transparent: true, opacity: 0.85, depthWrite: false })
  const atlasMaterials = { cortex, thalamus, hindbrain }
  const pulses: Pulse[] = []
  const electrodes: T.Mesh[] = []
  const pairs: T.Line[] = []
  const pickables: T.Mesh[] = []
  const ray = new T.Raycaster()

  function addPart(mesh: T.Mesh, id: PartId, order: number) {
    mesh.userData.partId = id
    mesh.renderOrder = order
    groups.get(id)!.add(mesh)
    pickables.push(mesh)
  }

  for (const { id, meshes } of PARTS) {
    if (id === 'electrodes' || id === 'pathways') continue

    for (const name of meshes) {
      const mesh = atlas.getObjectByName(name)
      if (!(mesh instanceof T.Mesh)) throw new Error(`Missing atlas structure ${name}`)

      for (const material of [mesh.material].flat()) originalMaterials.add(material)
      mesh.material = atlasMaterials[id]
      mesh.applyMatrix4(mesh.parent!.matrixWorld)
      addPart(mesh, id, id === 'thalamus' ? 2 : 0)
    }
  }

  originalMaterials.forEach((material) => material.dispose())
  groups.forEach((group) => root.add(group))
  root.updateMatrixWorld(true)

  const cortexMeshes = pickables.filter((mesh) => mesh.userData.partId === 'cortex')

  function surface(origin: T.Vector3, direction: T.Vector3) {
    // Cast inward so a folded hemisphere resolves to its outer surface.
    const outside = origin.clone().addScaledVector(direction, sphere.radius * 2.5)
    ray.set(outside, direction.clone().negate())

    return ray.intersectObjects(cortexMeshes, false)[0]?.point
  }

  const pulseGeometry = new T.SphereGeometry(0.028, 12, 8)

  for (const side of ['L', 'R']) {
    const relay = groups.get('thalamus')!.getObjectByName(`Thalamus_${side}`)!
    const start = new T.Box3().setFromObject(relay).getCenter(new T.Vector3())

    for (let index = 0; index < 3; index++) {
      const anchor = atlas.getObjectByName(`Anchor_${side}_${index}`)
      if (!anchor) throw new Error(`Missing atlas pathway anchor ${side}${index}`)

      const suggested = anchor.getWorldPosition(new T.Vector3())
      const direction = suggested.clone().sub(start).normalize()
      const end = surface(start, direction) ?? suggested
      const bend = start.clone().lerp(end, 0.52).add(new T.Vector3(0, 0.17, 0.06))
      const curve = new T.CatmullRomCurve3([start, bend, end])
      const coreMesh = new T.Mesh(new T.TubeGeometry(curve, 24, 0.009, 6), core)
      const glowMesh = new T.Mesh(new T.TubeGeometry(curve, 24, 0.026, 7), glow)
      glowMesh.renderOrder = 3
      const dot = new T.Mesh(pulseGeometry, pulseCore)
      dot.renderOrder = 4
      const halo = new T.Sprite(pulseGlow)
      halo.scale.setScalar(0.22)
      halo.renderOrder = 4

      addPart(coreMesh, 'pathways', 3)
      groups.get('pathways')!.add(glowMesh, dot, halo)
      pulses.push({ curve, dot, halo })
    }
  }

  const electrodeGeometry = new T.SphereGeometry(0.041, 14, 10)
  for (const coordinates of ELECTRODE_ANGLES) {
    const direction = new T.Vector3(...coordinates).normalize()
    const position = surface(sphere.center, direction) ?? sphere.center.clone().addScaledVector(direction, sphere.radius * 0.7)
    const marker = new T.Mesh(electrodeGeometry, electrode)
    marker.position.copy(position).addScaledVector(direction, 0.032)

    addPart(marker, 'electrodes', 4)
    electrodes.push(marker)
  }

  for (let index = 0; index < electrodes.length; index += 2) {
    const geometry = new T.BufferGeometry().setFromPoints([electrodes[index].position, electrodes[index + 1].position])
    const pair = new T.Line(geometry, pairLine)
    pair.computeLineDistances()
    pair.visible = false
    pair.renderOrder = 4
    groups.get('electrodes')!.add(pair)
    pairs.push(pair)
  }

  const shadow = new T.Mesh(
    new T.PlaneGeometry(sphere.radius * 2.8, sphere.radius * 2.8),
    new T.MeshBasicMaterial({ color: '#000000', map: radial, opacity: 0.5, transparent: true, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(sphere.center.x, bounds.min.y - 0.05, sphere.center.z)
  shadow.renderOrder = -1
  root.add(shadow)
  root.updateMatrixWorld(true)

  const thalamusCenter = new T.Box3().setFromObject(groups.get('thalamus')!).getCenter(new T.Vector3())
  const hindbrainCenter = new T.Box3().setFromObject(groups.get('hindbrain')!).getCenter(new T.Vector3())
  const cortexAnchor = surface(sphere.center, new T.Vector3(0.72, 0.7, 0.48).normalize()) ?? sphere.center
  const anchors = new Map<PartId, T.Vector3>([
    ['thalamus', thalamusCenter],
    ['cortex', cortexAnchor],
    ['pathways', pulses[5].curve.getPointAt(0.56)],
    ['electrodes', electrodes[0].position],
    ['hindbrain', hindbrainCenter.add(new T.Vector3(-0.38, 0, -0.28))],
  ])

  function update(state: SceneState, reduceMotion: boolean) {
    const active = state.phase === 'absence'
    const color = PHASE_COLORS[state.phase]

    function dim(id: PartId) {
      return !state.selected || state.selected === id ? 1 : 0.4
    }

    function highlighted(id: PartId) {
      return state.hovered === id || state.selected === id
    }

    groups.forEach((group, id) => { group.visible = partVisible(id, state.view) })
    const anatomy = state.view === 'anatomy'
    setOpacity(cortex, (anatomy ? 1 : 0.08) * dim('cortex'))
    cortex.emissiveIntensity = (anatomy ? 0.08 : 0) + (highlighted('cortex') ? 0.35 : 0)
    shell.value = anatomy ? 0 : 1
    rim.value = (anatomy ? 0.25 : 3.2) + (highlighted('cortex') ? 0.65 : 0)
    setOpacity(thalamus, dim('thalamus'))
    thalamus.emissiveIntensity = (active ? 1.2 : 0.4) + (highlighted('thalamus') ? 0.35 : 0)
    setOpacity(hindbrain, (anatomy ? 1 : 0.18) * dim('hindbrain'))
    hindbrain.emissiveIntensity = highlighted('hindbrain') ? 0.35 : 0.03

    const pathwayOpacity = dim('pathways')
    core.color.set(color)
    core.color.lerp(new T.Color('#FFFFFF'), highlighted('pathways') ? 0.32 : 0)
    setOpacity(core, pathwayOpacity, false)
    glow.color.set(color)
    glow.opacity = (active ? 0.55 : 0.25) * pathwayOpacity
    pulseGlow.color.set(color)
    pulseGlow.opacity = 0.83 * pathwayOpacity
    setOpacity(pulseCore, pathwayOpacity, false)

    for (const [index, { curve, dot, halo }] of pulses.entries()) {
      const clock = active ? (state.time - SEIZURE_ONSET) * 0.66 : state.time * (0.31 + index * 0.04) + index * 0.17
      const progress = 0.5 - Math.cos(2 * Math.PI * clock) * 0.43
      dot.visible = halo.visible = !reduceMotion
      curve.getPointAt(progress, dot.position)
      halo.position.copy(dot.position)
    }

    electrode.color.set(active ? color : '#C6CDD9')
    setOpacity(electrode, (highlighted('electrodes') ? 1 : 0.72) * dim('electrodes'))
    for (const [index, marker] of electrodes.entries()) {
      marker.material = Math.floor(index / 2) === state.lead ? electrodeHighlight : electrode
      marker.scale.setScalar(marker.material === electrodeHighlight ? 1.45 : 1)
    }

    for (const [index, pair] of pairs.entries()) pair.visible = index === state.lead
  }

  return {
    root, bounds: sphere, anchors, pickables, update,
    dispose() {
      disposeMeshes(root)
      // These materials may have been swapped off every marker at disposal time.
      electrode.dispose()
      electrodeHighlight.dispose()
      radial.dispose()
    },
  }
}
