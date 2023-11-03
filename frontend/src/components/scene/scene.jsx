import { Mesh, PlaneGeometry, Group, Vector3, MathUtils } from 'three'
import React, { useRef, useState, useLayoutEffect } from 'react'
import { createRoot, events, extend, useFrame } from '@react-three/fiber'
import { Plane, useAspect, useTexture, shaderMaterial } from '@react-three/drei'
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing'
import { MaskFunction } from 'postprocessing'
import Fireflies from './firefliesScene.jsx'
import bgUrl from '../../assets/img/scene/bgrd.png'
import starsUrl from '../../assets/img/scene/effect.png'
import groundUrl from '../../assets/img/scene/bgrd_top.png'
import bearUrl from '../../assets/img/scene/object.png'
import leaves1Url from '../../assets/img/scene/leaves1.png'
import leaves2Url from '../../assets/img/scene/leaves2.png'

const LayerMaterial = shaderMaterial(
  { textr: null, movement: [0, 0, 0], scale: 1, factor: 0, wiggle: 0, time: 0 },
  ` uniform float time;
    uniform vec2 resolution;
    uniform float wiggle;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main()	{
      vUv = uv;
      vec3 transformed = vec3(position);
      if (wiggle > 0.) {
        float theta = sin(time + position.y) / 2.0 * wiggle;
        float c = cos(theta);
        float s = sin(theta);
        mat3 m = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
        transformed = transformed * m;
        vNormal = vNormal * m;
      }      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.);
    }`,
  ` uniform float time;
    uniform vec2 resolution;
    uniform float factor;
    uniform float scale;
    uniform vec3 movement;
    uniform sampler2D textr;
    varying vec2 vUv;
    void main()	{
      vec2 uv = vUv / scale + movement.xy * factor;
      vec4 color = texture2D(textr, uv);
      if (color.a < 0.1) discard;
      gl_FragColor = vec4(color.rgb, .1);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`,
)

extend({ LayerMaterial })

function Experience() {
  const scaleF = useAspect(2600, 1000, 1.05)
  const scaleN = useAspect(1600, 1000, 1.05)
  const scaleW = useAspect(2200, 1000, 1.05)
  const textures = useTexture([bgUrl, starsUrl, groundUrl, bearUrl, leaves1Url, leaves2Url])
  const group = useRef()
  const layersRef = useRef([])
  const [movement] = useState(() => new Vector3())
  const [temp] = useState(() => new Vector3())
  const layers = [
    { texture: textures[0], x: 0, y: 0, z: 0, factor: 0.05, scale: scaleF },
    { texture: textures[1], x: 0, y: 0, z: 10, factor: 0.001, scale: scaleW },
    { texture: textures[2], x: 0, y: 0, z: 20, factor: 0.01, scale: scaleW },
    { texture: textures[3], x: 0, y: 0, z: 30, scaleFactor: 0.87, scale: scaleN },
    { texture: textures[4], x: 0, y: 0, z: 40, factor: 0.5, scaleFactor: 1, wiggle: 0.6, scale: scaleW },
    { texture: textures[5], x: -20, y: -20, z: 49, factor: 0.15, scaleFactor: 1.3, wiggle: 1, scale: scaleW },
  ]

  useFrame((state, delta) => {
    movement.lerp(temp.set(state.pointer.x, state.pointer.y * 0.2, 0), 0.2)
    group.current.position.x = MathUtils.lerp(group.current.position.x, state.pointer.x * 20, 0.05)
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, state.pointer.y / 20, 0.05)
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, -state.pointer.x / 2, 0.05)
    layersRef.current[4].uniforms.time.value = layersRef.current[5].uniforms.time.value += delta
  }, 1)

  return (
    <group ref={group}>
      <Fireflies count={20} radius={80} colors={['orange']} />
      {layers.map(({ scale, texture, ref, factor = 0, scaleFactor = 1, wiggle = 0, x, y, z }, i) => (
        <Plane scale={scale} args={[1, 1, wiggle ? 10 : 1, wiggle ? 10 : 1]} position={[x, y, z]} key={i} ref={ref}>
          <layerMaterial
            movement={movement}
            textr={texture}
            factor={factor}
            ref={(el) => (layersRef.current[i] = el)}
            wiggle={wiggle}
            scale={scaleFactor}
          />
        </Plane>
      ))}
    </group>
  )
}

function Effects() {
  const ref = useRef()
  useLayoutEffect(() => {
    const maskMaterial = ref.current.maskPass.getFullscreenMaterial()
    maskMaterial.maskFunction = MaskFunction.MULTIPLY_RGB_SET_ALPHA
  })
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <DepthOfField ref={ref} target={[0, 0, 30]} bokehScale={2} focalLength={0} width={1440} />
      <Vignette softness={.3}/>
    </EffectComposer>
  )
}

export default function Scene() {
  return (
    <Canvas>
      <Experience />
      <Effects />
    </Canvas>
  )
}

function Canvas({ children }) {
  extend({ Mesh, PlaneGeometry, Group })
  const canvas = useRef(null)
  const root = useRef(null)
  useLayoutEffect(() => {
    if (!root.current) {
      root.current = createRoot(canvas.current).configure({
        events,
        orthographic: true,
        gl: { antialias: false },
        camera: { zoom: 5, position: [0, 0, 200], far: 300, near: 50 },
        onCreated: (state) => {
          state.events.connect(document.getElementById('root'))
          state.setEvents({
            compute: (event, state) => {
              state.pointer.set((event.clientX / state.size.width) * 2 - 1, -(event.clientY / state.size.height) * 2 + 1)
              state.raycaster.setFromCamera(state.pointer, state.camera)
            },
          })
        },
      })
    }
    const resize = () => root.current.configure({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', resize)
    root.current.render(children)
    return () => window.removeEventListener('resize', resize)
  }, []);

  return <canvas ref={canvas} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', display: 'block' }} />
}