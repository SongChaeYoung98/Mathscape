<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import * as THREE from 'three';
  import { defaultSceneVisualSettings, type CameraPose, type ColorMap, type SceneVisualSettings } from './project';

  export let amplitude = 1;
  export let frequency = 1;
  export let phase = 0;
  export let visual: SceneVisualSettings = defaultSceneVisualSettings;
  export let cameraPose: CameraPose = {
    position: [5.8, 4.2, 6.4],
    target: [0, 0, 0],
    fovDegrees: 45
  };

  let host: HTMLDivElement;
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let surface: THREE.Mesh | undefined;
  let curveGroup: THREE.Group | undefined;
  let reference: THREE.Group | undefined;
  let frame = 0;
  let resizeObserver: ResizeObserver;
  const dispatch = createEventDispatcher<{ ready: HTMLCanvasElement }>();

  function surfacePalette(colorMap: ColorMap) {
    if (colorMap === 'fireline') {
      return {
        cool: new THREE.Color('#3c2334'),
        warm: new THREE.Color('#f4a261'),
        light: '#ffd089'
      };
    }

    if (colorMap === 'viridis') {
      return {
        cool: new THREE.Color('#2d5775'),
        warm: new THREE.Color('#72d38b'),
        light: '#b8f5b2'
      };
    }

    return {
      cool: new THREE.Color('#2f6f9f'),
      warm: new THREE.Color('#f2c14e'),
      light: '#f5d76e'
    };
  }

  function heightAt(x: number, z: number) {
    const radius = Math.sqrt(x * x + z * z);
    const heightScale = Math.max(0.2, Math.min(3, visual.surfaceHeightScale));
    return heightScale * amplitude * Math.sin(frequency * radius + phase) * Math.exp(-radius * 0.18);
  }

  function buildSurface() {
    const segments = Math.max(24, Math.min(160, Math.round(visual.surfaceResolution)));
    const size = 8;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors: number[] = [];
    const low = -Math.max(0.4, amplitude);
    const high = Math.max(0.4, amplitude);
    const palette = surfacePalette(visual.colorMap);

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const y = heightAt(x, z);
      positions.setY(index, y);

      const t = THREE.MathUtils.clamp((y - low) / (high - low), 0, 1);
      const color = palette.cool.clone().lerp(palette.warm, t);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.08,
      roughness: 0.38,
      side: THREE.DoubleSide,
      wireframe: visual.surfaceStyle === 'wireframe'
    });

    removeCurve();
    removeSurface();

    surface = new THREE.Mesh(geometry, material);
    scene.add(surface);
  }

  function buildCurve() {
    removeSurface();
    removeCurve();

    const palette = surfacePalette(visual.colorMap);
    const turns = Math.max(1, Math.min(8, Math.round(frequency)));
    const radius = Math.max(0.35, Math.min(3.2, amplitude * 1.1));
    const heightScale = Math.max(0.3, Math.min(3, visual.surfaceHeightScale));
    const segments = Math.max(80, Math.min(420, Math.round(visual.surfaceResolution * 2.5)));
    const points: THREE.Vector3[] = [];

    for (let index = 0; index <= segments; index += 1) {
      const progress = index / segments;
      const t = progress * Math.PI * 2;
      const angle = turns * t + phase;
      const ripple = Math.sin((turns + 1) * t + phase * 0.5);
      points.push(
        new THREE.Vector3(
          radius * Math.cos(angle),
          (progress - 0.5) * 4.2 * heightScale + ripple * 0.45,
          radius * Math.sin(angle)
        )
      );
    }

    const path = new THREE.CatmullRomCurve3(points);
    const tubeRadius = Math.max(0.025, Math.min(0.16, visual.lineWeight * 0.018));
    const geometry = new THREE.TubeGeometry(path, segments, tubeRadius, 14, false);
    const material = new THREE.MeshStandardMaterial({
      color: palette.warm,
      emissive: palette.cool,
      emissiveIntensity: 0.24,
      metalness: 0.18,
      roughness: 0.32,
      wireframe: visual.surfaceStyle === 'wireframe'
    });

    curveGroup = new THREE.Group();
    curveGroup.add(new THREE.Mesh(geometry, material));
    curveGroup.add(endpointMarker(points[0], palette.light, tubeRadius * 2.8));
    curveGroup.add(endpointMarker(points[points.length - 1], '#ffffff', tubeRadius * 2.8));
    scene.add(curveGroup);
  }

  function endpointMarker(position: THREE.Vector3, color: string, radius: number) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 18, 18),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18 })
    );
    marker.position.copy(position);
    return marker;
  }

  function buildReference() {
    if (!scene) return;

    if (reference) {
      scene.remove(reference);
      disposeObject(reference);
    }

    const palette = surfacePalette(visual.colorMap);
    reference = new THREE.Group();

    const grid = new THREE.GridHelper(8, 16, palette.light, '#253241');
    grid.position.y = -0.02;
    reference.add(grid);

    reference.add(axisLine('x', '#f07167', [0, 0.04, 0], [4.45, 0.04, 0]));
    reference.add(axisLine('y', '#e9c46a', [0, 0, 0], [0, 2.75, 0]));
    reference.add(axisLine('z', '#7cc7d8', [0, 0.04, 0], [0, 0.04, 4.45]));
    reference.add(axisLabel('x', '#f07167', [4.72, 0.14, 0]));
    reference.add(axisLabel('y', '#e9c46a', [0.08, 2.98, 0]));
    reference.add(axisLabel('z', '#7cc7d8', [0, 0.14, 4.72]));

    scene.add(reference);
  }

  function axisLine(axis: 'x' | 'y' | 'z', color: string, start: [number, number, number], end: [number, number, number]) {
    const group = new THREE.Group();
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end)
    ]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.86 });
    const line = new THREE.Line(geometry, material);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.22, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
    );
    cone.position.set(...end);

    if (axis === 'x') {
      cone.rotation.z = -Math.PI / 2;
    } else if (axis === 'z') {
      cone.rotation.x = Math.PI / 2;
    }

    group.add(line, cone);
    return group;
  }

  function axisLabel(label: string, color: string, position: [number, number, number]) {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'rgba(15, 20, 25, 0.7)';
      context.beginPath();
      context.arc(48, 48, 30, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = color;
      context.font = '700 42px Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, 48, 49);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.position.set(...position);
    sprite.scale.set(0.42, 0.42, 0.42);
    return sprite;
  }

  function disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else if (material) {
        material.dispose();
      }
    });
  }

  function removeSurface() {
    if (!surface) return;
    scene.remove(surface);
    disposeObject(surface);
    surface = undefined;
  }

  function removeCurve() {
    if (!curveGroup) return;
    scene.remove(curveGroup);
    disposeObject(curveGroup);
    curveGroup = undefined;
  }

  function resize() {
    if (!host || !renderer || !camera) return;
    const rect = host.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    frame = requestAnimationFrame(animate);
    if (surface) {
      surface.rotation.y += Math.max(0, Math.min(0.04, visual.rotationSpeed));
    }
    if (curveGroup) {
      curveGroup.rotation.y += Math.max(0, Math.min(0.04, visual.rotationSpeed));
    }
    applyCameraPose();
    renderer.render(scene, camera);
  }

  function applyCameraPose() {
    if (!camera || !cameraPose) return;
    camera.position.set(cameraPose.position[0], cameraPose.position[1], cameraPose.position[2]);
    camera.fov = cameraPose.fovDegrees;
    camera.lookAt(cameraPose.target[0], cameraPose.target[1], cameraPose.target[2]);
    camera.updateProjectionMatrix();
  }

  $: if (scene) {
    amplitude;
    frequency;
    phase;
    visual.colorMap;
    visual.lineWeight;
    visual.threeMode;
    visual.surfaceStyle;
    visual.surfaceHeightScale;
    visual.surfaceResolution;
    if (visual.threeMode === 'curve') {
      buildCurve();
    } else {
      buildSurface();
    }
  }

  $: if (scene) {
    visual.colorMap;
    buildReference();
  }

  $: if (camera) {
    applyCameraPose();
  }

  onMount(() => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f1419');

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    applyCameraPose();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    host.appendChild(renderer.domElement);
    dispatch('ready', renderer.domElement);

    const keyLight = new THREE.DirectionalLight('#f5d76e', 2.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight('#7ea4c8', 1.2));

    buildReference();
    if (visual.threeMode === 'curve') {
      buildCurve();
    } else {
      buildSurface();
    }
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    animate();
  });

  onDestroy(() => {
    cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    renderer?.dispose();
    surface && disposeObject(surface);
    curveGroup && disposeObject(curveGroup);
    reference && disposeObject(reference);
  });
</script>

<div class="three-host" bind:this={host} aria-label="3D radial sine surface preview"></div>

<style>
  .three-host {
    width: 100%;
    height: 100%;
    min-height: 320px;
    overflow: hidden;
    background: #0f1419;
    border: 1px solid #2d3a47;
    border-radius: 8px;
  }

  .three-host :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
