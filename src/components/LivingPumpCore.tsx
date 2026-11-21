import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  getPumpVisualParams,
  PumpHealthStatus,
} from '../utils/pumpModel';

interface LivingPumpCoreProps {
  status: PumpHealthStatus;
  onStatusChange: (status: PumpHealthStatus) => void;
}

interface SensorNodeSpec {
  id: string;
  label: string;
  signal: string;
  color: number;
  baseAngle: number;
  radius: number;
  xOffset: number;
  readings: Record<PumpHealthStatus, string>;
}

const SENSOR_NODES: SensorNodeSpec[] = [
  {
    id: 'pressure',
    label: 'M12 Tap · P1 Pressure',
    signal: '4–20mA Discharge Transducer',
    color: 0x38bdf8,
    baseAngle: 0.65,
    radius: 1.52,
    xOffset: 0.72,
    readings: {
      healthy: '210.4 bar · Ramp 242 bar/s',
      degraded: '204.8 bar · Ramp 204 bar/s',
      failing: '193.6 bar · Ramp 171 bar/s',
    },
  },
  {
    id: 'flow',
    label: 'M12 Tap · Q1 Main Flow',
    signal: '0–10V Turbine Flowmeter',
    color: 0x34d399,
    baseAngle: 2.35,
    radius: 1.48,
    xOffset: -0.45,
    readings: {
      healthy: '84.1 L/min · ηv 94.2%',
      degraded: '77.2 L/min · ηv 85.4%',
      failing: '68.0 L/min · ηv 75.8%',
    },
  },
  {
    id: 'temp',
    label: 'M12 Tap · T1 Oil Temp ΔT',
    signal: 'PT100 Suction vs Case Return',
    color: 0xa78bfa,
    baseAngle: 3.9,
    radius: 1.54,
    xOffset: 0.15,
    readings: {
      healthy: '48.2°C · ΔT +6.1°C',
      degraded: '54.8°C · ΔT +11.4°C',
      failing: '61.5°C · ΔT +15.2°C',
    },
  },
  {
    id: 'drain',
    label: 'M12 Tap · Q2 Case Drain',
    signal: 'Inline Leakage Line Tap',
    color: 0xf59e0b,
    baseAngle: 5.35,
    radius: 1.5,
    xOffset: -0.68,
    readings: {
      healthy: '1.6 L/min · Nominal',
      degraded: '3.5 L/min · Rising +42%',
      failing: '5.4 L/min · Critical Bypass',
    },
  },
];

// Scratch math objects allocated once at module scope (zero GC inside render loop)
const _projVec = new THREE.Vector3();
const _targetColor = new THREE.Color();
const _dummy = new THREE.Object3D();
const _pulsePos = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createBrushedMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const shade = 112 + ((y * 19) % 32);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createShadowDiscTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
    grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.28)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

export function LivingPumpCore({ status, onStatusChange }: LivingPumpCoreProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [inspectFault, setInspectFault] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [hoveredSensor, setHoveredSensor] = useState<{
    spec: SensorNodeSpec;
    x: number;
    y: number;
  } | null>(null);

  const statusRef = useRef<PumpHealthStatus>(status);
  const inspectRef = useRef<boolean>(inspectFault);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    inspectRef.current = inspectFault;
  }, [inspectFault]);

  const visualParams = getPumpVisualParams(status);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 340);

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.FogExp2(0x0b1220, 0.055);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0.35, 1.35, 5.55);
    camera.lookAt(0, 0.05, 0);

    // 3-point balanced studio lighting rig (warm key + cool hemisphere fill + steel rim)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.9);
    keyLight.position.set(4.5, 6.0, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -3.2;
      keyLight.shadow.camera.right = 3.2;
      keyLight.shadow.camera.top = 3.2;
      keyLight.shadow.camera.bottom = -3.2;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-4.2, 2.2, -3.5);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0x0ea5e9, 2.2, 7.5);
    coreLight.position.set(0, 0.1, 0.6);
    scene.add(coreLight);

    // Ground contact shadow plane for spatial grounding
    const shadowTex = createShadowDiscTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 32),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.62,
      }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.42;
    scene.add(shadowPlane);

    // Subtle precision reference base ring underneath the floating cutaway
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(1.72, 1.76, 48),
      new THREE.MeshBasicMaterial({
        color: 0x1e293b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      }),
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = -1.4;
    scene.add(baseRing);

    // Procedural brushed metal surface bump map
    const brushedTex = createBrushedMetalTexture();
    brushedTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // Shared calibrated PBR materials (distinct roughness & metalness contrast)
    const castHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.62,
      bumpMap: brushedTex,
      bumpScale: 0.015,
    });

    const machinedSteelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.22,
      bumpMap: brushedTex,
      bumpScale: 0.008,
    });

    const darkRotorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.34,
      bumpMap: brushedTex,
      bumpScale: 0.01,
    });

    const bronzeValveMat = new THREE.MeshStandardMaterial({
      color: 0xb47b38,
      metalness: 0.88,
      roughness: 0.26,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });

    const pistonShoeMat = new THREE.MeshStandardMaterial({
      color: 0xd49b4b,
      metalness: 0.86,
      roughness: 0.24,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });

    const coreAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: new THREE.Color(0x0ea5e9),
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.25,
    });

    // Semi-transparent optical glass cutaway casing (software-WebGL safe fallback)
    const glassCasingMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbe8ff,
      metalness: 0.08,
      roughness: 0.12,
      transmission: isSoftwareGl ? 0 : 0.84,
      transparent: true,
      opacity: isSoftwareGl ? 0.28 : 0.9,
      ior: 1.52,
      thickness: 0.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Root pump assembly group (rotates with scroll & mouse parallax)
    const pumpRoot = new THREE.Group();
    pumpRoot.position.set(0, 0.05, 0);
    scene.add(pumpRoot);

    const clickableMeshes: THREE.Object3D[] = [];

    // 1. Rear Mounting Flange (Primary Silhouette)
    const flangeGeo = new THREE.CylinderGeometry(1.24, 1.24, 0.24, 32);
    flangeGeo.rotateZ(Math.PI / 2);
    const frontFlange = new THREE.Mesh(flangeGeo, castHousingMat);
    frontFlange.position.x = -1.35;
    pumpRoot.add(frontFlange);
    clickableMeshes.push(frontFlange);

    // 4 Flange Mounting Ears + Bolts
    const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.32, 6);
    boltGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const bolt = new THREE.Mesh(boltGeo, machinedSteelMat);
      bolt.position.set(-1.35, Math.sin(a) * 1.08, Math.cos(a) * 1.08);
      pumpRoot.add(bolt);
    }

    // 2. SAE Spline Drive Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.15, 24);
    shaftGeo.rotateZ(Math.PI / 2);
    const driveShaft = new THREE.Mesh(shaftGeo, machinedSteelMat);
    driveShaft.position.x = -0.35;
    pumpRoot.add(driveShaft);

    // Shaft coupling collar
    const collarGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.28, 24);
    collarGeo.rotateZ(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, darkRotorMat);
    collar.position.x = -1.62;
    pumpRoot.add(collar);

    // 3. Rear Port Manifold Block
    const rearBlockGeo = new THREE.CylinderGeometry(1.16, 1.12, 0.48, 32);
    rearBlockGeo.rotateZ(Math.PI / 2);
    const rearBlock = new THREE.Mesh(rearBlockGeo, castHousingMat);
    rearBlock.position.x = 1.28;
    pumpRoot.add(rearBlock);
    clickableMeshes.push(rearBlock);

    // Port bosses (Pressure Out, Suction In, Case Drain Top)
    const portBossGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.45, 20);
    const pressureBoss = new THREE.Mesh(portBossGeo, machinedSteelMat);
    pressureBoss.position.set(1.26, 1.12, 0.35);
    pumpRoot.add(pressureBoss);

    const suctionBoss = new THREE.Mesh(portBossGeo, machinedSteelMat);
    suctionBoss.position.set(1.26, -1.12, -0.2);
    pumpRoot.add(suctionBoss);

    const drainBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.36, 16), bronzeValveMat);
    drainBoss.position.set(0.2, 1.16, -0.3);
    pumpRoot.add(drainBoss);

    // 4. Semi-Transparent Cutaway Glass Outer Housing (250° cutaway arc so internals are crystal clear)
    const glassShellGeo = new THREE.CylinderGeometry(
      1.1,
      1.1,
      2.32,
      36,
      1,
      true,
      Math.PI * 0.28,
      Math.PI * 1.44,
    );
    glassShellGeo.rotateZ(Math.PI / 2);
    const glassShell = new THREE.Mesh(glassShellGeo, glassCasingMat);
    glassShell.position.x = -0.06;
    glassShell.renderOrder = 6;
    pumpRoot.add(glassShell);
    clickableMeshes.push(glassShell);

    // Cutaway Structural Retaining Rings
    const trimRingGeo = new THREE.TorusGeometry(1.11, 0.045, 12, 40);
    trimRingGeo.rotateY(Math.PI / 2);
    const ringLeft = new THREE.Mesh(trimRingGeo, machinedSteelMat);
    ringLeft.position.x = -1.22;
    pumpRoot.add(ringLeft);

    const ringRight = new THREE.Mesh(trimRingGeo, machinedSteelMat);
    ringRight.position.x = 1.04;
    pumpRoot.add(ringRight);

    // Health-Reactive Telemetry Core Ring (inside housing rim)
    const coreRingGeo = new THREE.TorusGeometry(1.06, 0.025, 10, 48);
    coreRingGeo.rotateY(Math.PI / 2);
    const coreRingA = new THREE.Mesh(coreRingGeo, coreAccentMat);
    coreRingA.position.x = -0.58;
    pumpRoot.add(coreRingA);

    const coreRingB = new THREE.Mesh(coreRingGeo, coreAccentMat);
    coreRingB.position.x = 0.62;
    pumpRoot.add(coreRingB);

    // 5. Tilted Swash Plate Assembly (17° angle driving axial stroke)
    const swashGroup = new THREE.Group();
    swashGroup.position.x = -0.78;
    swashGroup.rotation.z = THREE.MathUtils.degToRad(17);
    const swashPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.88, 0.16, 32),
      machinedSteelMat,
    );
    swashPlate.rotation.z = Math.PI / 2;
    swashGroup.add(swashPlate);

    const swashWearFace = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.78, 32),
      coreAccentMat,
    );
    swashWearFace.rotation.y = Math.PI / 2;
    swashWearFace.position.x = 0.085;
    swashGroup.add(swashWearFace);
    pumpRoot.add(swashGroup);

    // 6. Rotating Cylinder Barrel + 7 Reciprocating Axial Pistons & Bronze Shoes
    const rotorGroup = new THREE.Group();
    rotorGroup.position.x = 0.24;
    pumpRoot.add(rotorGroup);

    const barrelGeo = new THREE.CylinderGeometry(0.76, 0.76, 1.02, 28);
    barrelGeo.rotateZ(Math.PI / 2);
    const barrelMesh = new THREE.Mesh(barrelGeo, darkRotorMat);
    rotorGroup.add(barrelMesh);
    clickableMeshes.push(barrelMesh);

    const pistonCount = 7;
    const pistonRadius = 0.52;
    const pistonGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.92, 16);
    pistonGeo.rotateZ(Math.PI / 2);
    const shoeGeo = new THREE.CylinderGeometry(0.155, 0.135, 0.12, 16);
    shoeGeo.rotateZ(Math.PI / 2);

    const pistonAssemblies: { group: THREE.Group; baseAngle: number }[] = [];
    for (let i = 0; i < pistonCount; i++) {
      const baseAngle = (i / pistonCount) * Math.PI * 2;
      const pGroup = new THREE.Group();

      const rod = new THREE.Mesh(pistonGeo, machinedSteelMat);
      rod.position.x = -0.46;
      pGroup.add(rod);

      // Bronze slipper shoe riding against the swash plate (flagged during wear)
      const shoe = new THREE.Mesh(shoeGeo, pistonShoeMat);
      shoe.position.x = -0.92;
      pGroup.add(shoe);
      clickableMeshes.push(shoe);

      pGroup.position.set(0, Math.sin(baseAngle) * pistonRadius, Math.cos(baseAngle) * pistonRadius);
      rotorGroup.add(pGroup);
      pistonAssemblies.push({ group: pGroup, baseAngle });
    }

    // 7. Stationary Kidney-Port Valve Plate (Bronze)
    const valvePlateGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.16, 32);
    valvePlateGeo.rotateZ(Math.PI / 2);
    const valvePlate = new THREE.Mesh(valvePlateGeo, bronzeValveMat);
    valvePlate.position.x = 0.9;
    pumpRoot.add(valvePlate);
    clickableMeshes.push(valvePlate);

    // 8. Curved Internal Fluid Channels (Pressure = Blue, Flow = Green, Case Drain = Amber)
    const pressureCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.86, 0.45, 0.42),
      new THREE.Vector3(1.05, 0.72, 0.45),
      new THREE.Vector3(1.24, 1.15, 0.36),
      new THREE.Vector3(1.48, 1.48, 0.25),
    ]);
    const flowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.42, -1.32, 0.34),
      new THREE.Vector3(1.16, -0.96, 0.48),
      new THREE.Vector3(0.68, -0.78, 0.56),
      new THREE.Vector3(0.08, -0.68, 0.52),
    ]);
    const drainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.66, 0.38, 0.42),
      new THREE.Vector3(-0.22, 0.82, 0.38),
      new THREE.Vector3(0.18, 1.1, 0.16),
      new THREE.Vector3(0.22, 1.46, -0.1),
    ]);

    const createChannelTube = (curve: THREE.CatmullRomCurve3, colorHex: number, radius: number) => {
      const tubeGeo = new THREE.TubeGeometry(curve, 24, radius, 10, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      pumpRoot.add(tubeMesh);
      return { tubeGeo, tubeMat };
    };

    const pressureTube = createChannelTube(pressureCurve, 0x38bdf8, 0.055);
    const flowTube = createChannelTube(flowCurve, 0x34d399, 0.055);
    const drainTube = createChannelTube(drainCurve, 0xf59e0b, 0.042);

    // Live Fluid Pulse Particles (InstancedMesh per channel)
    const PULSES_PER_CHANNEL = 10;
    const pulseSphereGeo = new THREE.SphereGeometry(0.062, 10, 10);

    const pressurePulseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const flowPulseMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const drainPulseMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const pressurePulses = new THREE.InstancedMesh(pulseSphereGeo, pressurePulseMat, PULSES_PER_CHANNEL);
    const flowPulses = new THREE.InstancedMesh(pulseSphereGeo, flowPulseMat, PULSES_PER_CHANNEL);
    const drainPulses = new THREE.InstancedMesh(pulseSphereGeo, drainPulseMat, PULSES_PER_CHANNEL);
    pressurePulses.frustumCulled = false;
    flowPulses.frustumCulled = false;
    drainPulses.frustumCulled = false;
    pumpRoot.add(pressurePulses, flowPulses, drainPulses);

    // 9. Floating M12 T-Splitter Sensor Tap Nodes (Interactive hover targets)
    const sensorMeshes: { mesh: THREE.Mesh; halo: THREE.Mesh; spec: SensorNodeSpec }[] = [];
    const sensorOrbGeo = new THREE.SphereGeometry(0.085, 14, 14);
    const sensorHaloGeo = new THREE.RingGeometry(0.11, 0.145, 20);

    SENSOR_NODES.forEach((spec) => {
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: new THREE.Color(spec.color),
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(sensorOrbGeo, mat);
      mesh.userData.sensorSpec = spec;

      const halo = new THREE.Mesh(
        sensorHaloGeo,
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        }),
      );
      mesh.add(halo);
      pumpRoot.add(mesh);
      sensorMeshes.push({ mesh, halo, spec });
    });

    // 10. Ambient Shop-Floor Oil-Mist Particles
    const ambientCount = 60;
    const ambientPositions = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      ambientPositions[i * 3] = (Math.random() - 0.5) * 9.0;
      ambientPositions[i * 3 + 1] = (Math.random() - 0.5) * 5.0;
      ambientPositions[i * 3 + 2] = -1.2 - Math.random() * 4.0;
    }
    const ambientGeo = new THREE.BufferGeometry();
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
    const ambientMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.045,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const ambientPoints = new THREE.Points(ambientGeo, ambientMat);
    scene.add(ambientPoints);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Interaction state (mouse parallax, scroll rotation, throttled raycast)
    let pointerX = 0;
    let pointerY = 0;
    let scrollRotationY = 0;
    let lastRaycastMs = 0;
    let activeSensorId: string | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerX = THREE.MathUtils.clamp(nx, -1, 1);
      pointerY = THREE.MathUtils.clamp(ny, -1, 1);

      const now = performance.now();
      if (now - lastRaycastMs < 55) return;
      lastRaycastMs = now;

      _pointerNdc.set(nx, ny);
      _raycaster.setFromCamera(_pointerNdc, camera);

      const sensorHits = _raycaster.intersectObjects(
        sensorMeshes.map((s) => s.mesh),
        false,
      );

      if (sensorHits.length > 0) {
        const hitMesh = sensorHits[0].object as THREE.Mesh;
        const spec = hitMesh.userData.sensorSpec as SensorNodeSpec;
        hitMesh.getWorldPosition(_projVec);
        _projVec.project(camera);
        const sx = ((_projVec.x + 1) / 2) * rect.width;
        const sy = (-(_projVec.y - 1) / 2) * rect.height;
        renderer.domElement.style.cursor = 'pointer';
        activeSensorId = spec.id;
        setHoveredSensor({ spec, x: sx, y: sy });
      } else {
        const bodyHits = _raycaster.intersectObjects(clickableMeshes, false);
        renderer.domElement.style.cursor = bodyHits.length > 0 ? 'pointer' : 'grab';
        if (activeSensorId !== null) {
          activeSensorId = null;
          setHoveredSensor(null);
        }
      }
    };

    const handlePointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
      activeSensorId = null;
      setHoveredSensor(null);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        setInspectFault((prev) => !prev);
      }
    };

    const handleScroll = () => {
      const y = window.scrollY;
      // Rotate 15-30 degrees smoothly as the user scrolls past the hero
      const progress = Math.min(1, y / 560);
      scrollRotationY = progress * THREE.MathUtils.degToRad(28);
      const nextOpacity = Math.max(0.35, 1 - Math.max(0, (y - 260) / 560));
      setScrollOpacity(nextOpacity);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 300);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation loop with software-WebGL afterDraw() pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let shaftAngle = 0;
    let pressurePhase = 0;
    let flowPhase = 0;
    let drainPhase = 0;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const syncState = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (syncState === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 85);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    }

    const updateChannelPulses = (
      mesh: THREE.InstancedMesh,
      curve: THREE.CatmullRomCurve3,
      phase: number,
      scale: number,
    ) => {
      for (let i = 0; i < PULSES_PER_CHANNEL; i++) {
        const t = (phase + i / PULSES_PER_CHANNEL) % 1;
        curve.getPointAt(t, _pulsePos);
        const edgeFade = Math.sin(t * Math.PI);
        const s = scale * (0.45 + 0.65 * edgeFade);
        _dummy.position.copy(_pulsePos);
        _dummy.scale.set(s, s, s);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      const motionScale = prefersReducedMotion ? 0.15 : 1;
      elapsed += dt * motionScale;

      const params = getPumpVisualParams(statusRef.current);

      // Smoothly transition core health illumination color
      const colorLerp = 1 - Math.exp(-12 * dt);
      _targetColor.setHex(params.coreHex);
      coreAccentMat.color.lerp(_targetColor, colorLerp);
      coreAccentMat.emissive.lerp(_targetColor, colorLerp);
      coreLight.color.lerp(_targetColor, colorLerp);
      rimLight.color.lerp(_targetColor, colorLerp);

      const pulseWave = 0.5 + 0.5 * Math.sin(elapsed * params.pulseFrequencyHz * Math.PI * 2);
      coreAccentMat.emissiveIntensity =
        params.emissiveIntensity * (0.65 + 0.55 * pulseWave);
      coreLight.intensity = 1.6 + pulseWave * (statusRef.current === 'failing' ? 1.8 : 0.7);

      // Highlight flagged failing wear component when user inspects or status is degraded/failing
      const faultGlowActive = inspectRef.current || statusRef.current === 'failing';
      const faultPulse = faultGlowActive ? 0.55 + 0.55 * pulseWave : 0;
      pistonShoeMat.emissive.setHex(
        statusRef.current === 'failing' ? 0xef4444 : 0xf59e0b,
      );
      pistonShoeMat.emissiveIntensity =
        statusRef.current === 'healthy' && !inspectRef.current ? 0 : faultPulse * 1.15;

      bronzeValveMat.emissive.setHex(
        statusRef.current === 'failing' ? 0xef4444 : 0xf59e0b,
      );
      bronzeValveMat.emissiveIntensity =
        statusRef.current === 'failing' && inspectRef.current ? faultPulse * 0.95 : 0;

      // Rotate axial cylinder barrel and reciprocate the 7 pistons along the tilted swash plate
      const rpmSpeed = statusRef.current === 'failing' ? 1.05 : statusRef.current === 'degraded' ? 1.45 : 1.85;
      shaftAngle += dt * rpmSpeed * motionScale;
      rotorGroup.rotation.x = shaftAngle;
      driveShaft.rotation.x = shaftAngle;

      for (let i = 0; i < pistonAssemblies.length; i++) {
        const item = pistonAssemblies[i];
        const worldAngle = item.baseAngle + shaftAngle;
        // Axial stroke dictated by 17° swash plate inclination
        const strokeX = Math.sin(worldAngle) * 0.19;
        item.group.position.x = strokeX;
      }

      // Advance fluid pulses along channels according to hydraulic state
      pressurePhase = (pressurePhase + dt * 0.52 * params.pressurePulseSpeed * motionScale) % 1;
      flowPhase = (flowPhase + dt * 0.48 * params.flowPulseSpeed * motionScale) % 1;
      drainPhase = (drainPhase + dt * 0.45 * params.caseDrainPulseSpeed * motionScale) % 1;

      updateChannelPulses(pressurePulses, pressureCurve, pressurePhase, 1.0);
      updateChannelPulses(flowPulses, flowCurve, flowPhase, 0.95);
      updateChannelPulses(
        drainPulses,
        drainCurve,
        drainPhase,
        statusRef.current === 'healthy' ? 0.72 : statusRef.current === 'degraded' ? 1.08 : 1.32,
      );

      // Orbit M12 sensor tap nodes gently around the cutaway casing
      for (let i = 0; i < sensorMeshes.length; i++) {
        const { mesh, halo, spec } = sensorMeshes[i];
        const orbitAngle = spec.baseAngle + elapsed * 0.24;
        mesh.position.set(
          spec.xOffset,
          Math.sin(orbitAngle) * spec.radius,
          Math.cos(orbitAngle) * spec.radius,
        );
        halo.lookAt(camera.position);
        const isHovered = activeSensorId === spec.id;
        const targetScale = isHovered ? 1.45 : 1.0;
        mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, targetScale, 8, dt));
      }

      // Subtle ambient oil-mist drift
      ambientPoints.rotation.y = elapsed * 0.03;

      // Smooth damped mouse parallax + scroll rotation reveal
      const baseRotY = -0.34 + scrollRotationY + pointerX * 0.24;
      const baseRotX = 0.14 - pointerY * 0.16;
      pumpRoot.rotation.y = THREE.MathUtils.damp(pumpRoot.rotation.y, baseRotY, 5.5, dt);
      pumpRoot.rotation.x = THREE.MathUtils.damp(pumpRoot.rotation.x, baseRotX, 5.5, dt);
      pumpRoot.position.y = 0.05 + Math.sin(elapsed * 1.1) * 0.04;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('scroll', handleScroll);

      // Dispose all procedural GPU assets
      flangeGeo.dispose();
      boltGeo.dispose();
      shaftGeo.dispose();
      collarGeo.dispose();
      rearBlockGeo.dispose();
      portBossGeo.dispose();
      glassShellGeo.dispose();
      trimRingGeo.dispose();
      coreRingGeo.dispose();
      barrelGeo.dispose();
      pistonGeo.dispose();
      shoeGeo.dispose();
      valvePlateGeo.dispose();
      pulseSphereGeo.dispose();
      sensorOrbGeo.dispose();
      sensorHaloGeo.dispose();
      ambientGeo.dispose();
      pressureTube.tubeGeo.dispose();
      pressureTube.tubeMat.dispose();
      flowTube.tubeGeo.dispose();
      flowTube.tubeMat.dispose();
      drainTube.tubeGeo.dispose();
      drainTube.tubeMat.dispose();
      castHousingMat.dispose();
      machinedSteelMat.dispose();
      darkRotorMat.dispose();
      bronzeValveMat.dispose();
      pistonShoeMat.dispose();
      coreAccentMat.dispose();
      glassCasingMat.dispose();
      pressurePulseMat.dispose();
      flowPulseMat.dispose();
      drainPulseMat.dispose();
      ambientMat.dispose();
      brushedTex.dispose();
      shadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  const stateColorText =
    status === 'failing'
      ? 'text-rose-400'
      : status === 'degraded'
        ? 'text-amber-400'
        : 'text-sky-400';

  return (
    <div
      data-testid="living-pump-core"
      data-pump-status={status}
      style={{ opacity: scrollOpacity }}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0B1220] text-slate-100 shadow-lg transition-opacity duration-200"
    >
      {/* Top minimal viewport spec bar (static text, zero pulsing dots) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono">
          <span className="font-medium text-slate-200">Axial Piston Cutaway</span>
          <span aria-hidden="true">·</span>
          <span className={`font-semibold ${stateColorText}`}>
            State: {visualParams.label}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono tabular-nums text-slate-300">
          <span>Score {visualParams.payload.health_score}/100</span>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span>ηv {visualParams.payload.eta_v_pct}%</span>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span data-testid="pump-confidence">
            Confidence: {visualParams.payload.confidence_pct}%
          </span>
        </div>
      </div>

      {/* Unobstructed 3D WebGL Viewport */}
      <div className="relative h-[360px] w-full sm:h-[420px]">
        {webglError ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#0B1220] p-6 text-center">
            <svg width="160" height="100" viewBox="0 0 160 100" fill="none" aria-hidden="true">
              <rect x="28" y="22" width="104" height="56" rx="8" stroke="#38BDF8" strokeWidth="2" />
              <line x1="12" y1="50" x2="148" y2="50" stroke="#94A3B8" strokeWidth="2" />
              <circle cx="80" cy="50" r="18" stroke="#F59E0B" strokeWidth="2" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-200">
              Interactive 3D Pump Cutaway Preview
            </p>
            <p className="mt-1 text-xs text-slate-400">
              WebGL context unavailable in this browser. Switch states below to inspect live telemetry output.
            </p>
          </div>
        ) : (
          <div
            ref={mountRef}
            data-testid="pump-webgl-canvas"
            className="h-full w-full"
            aria-label="Interactive 3D semi-transparent axial piston hydraulic pump showing reciprocating pistons, swash plate, fluid lines, and orbiting M12 sensor taps. Click pump to inspect flagged component."
          />
        )}

        {/* Hover tooltip for orbiting M12 sensor tap nodes */}
        {hoveredSensor && (
          <div
            role="status"
            style={{
              left: `${Math.min(Math.max(hoveredSensor.x, 90), 340)}px`,
              top: `${Math.max(hoveredSensor.y - 54, 12)}px`,
            }}
            className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-lg"
          >
            <p className="font-semibold text-white">{hoveredSensor.spec.label}</p>
            <p className="text-slate-400">{hoveredSensor.spec.signal}</p>
            <p className="mt-0.5 font-mono tabular-nums text-sky-300">
              {hoveredSensor.spec.readings[status]}
            </p>
          </div>
        )}

        {/* Click-triggered diagnostic callout banner (pinned to top-left corner, never covers center) */}
        {inspectFault && (
          <div
            data-testid="pump-fault-tooltip"
            role="status"
            className="absolute left-3 top-3 right-3 z-20 rounded-lg border border-slate-700 bg-slate-950/95 px-3.5 py-2.5 text-xs text-slate-100 shadow-lg sm:right-auto sm:max-w-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`font-semibold ${stateColorText}`}>
                Flagged Component: {visualParams.flaggedComponentLabel}
              </span>
              <button
                type="button"
                onClick={() => setInspectFault(false)}
                className="cursor-pointer text-slate-400 hover:text-white"
                aria-label="Close component diagnostic callout"
              >
                Dismiss
              </button>
            </div>
            <p className="mt-1 leading-relaxed text-slate-300">
              {visualParams.diagnosticTooltip}
            </p>
            <p className="mt-1.5 font-mono text-[11px] tabular-nums text-slate-400">
              Model Confidence: {visualParams.payload.confidence_pct}% · Health Score: {visualParams.payload.health_score}/100
            </p>
          </div>
        )}
      </div>

      {/* Unified Bottom Control Dock (Zero Viewport Occlusion) */}
      <div className="border-t border-slate-800 bg-slate-950/90 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Interactive state switcher simulating live edge JSON state */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
            {(['healthy', 'degraded', 'failing'] as PumpHealthStatus[]).map((stateKey) => {
              const active = status === stateKey;
              const label =
                stateKey === 'healthy'
                  ? 'Healthy'
                  : stateKey === 'degraded'
                    ? 'Degraded'
                    : 'Failing';
              return (
                <button
                  key={stateKey}
                  type="button"
                  onClick={() => {
                    onStatusChange(stateKey);
                    if (stateKey !== 'healthy') {
                      setInspectFault(true);
                    }
                  }}
                  aria-pressed={active}
                  className={`cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-500 ${
                    active
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setInspectFault((prev) => !prev)}
            className="cursor-pointer whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            {inspectFault ? 'Hide Diagnostic' : 'Inspect Flagged Wear'}
          </button>
        </div>

        {/* Channel color key + Live JSON payload from edge regression gateway */}
        <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-2.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="h-2 w-2 rounded-xs bg-sky-400" aria-hidden="true" />
                Pressure line
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="h-2 w-2 rounded-xs bg-emerald-400" aria-hidden="true" />
                Flow line
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="h-2 w-2 rounded-xs bg-amber-400" aria-hidden="true" />
                Case drain
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Live Edge JSON</span>
          </div>

          <code
            data-testid="edge-json-state"
            className="block w-full rounded bg-slate-900/80 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed break-all tabular-nums text-slate-200 sm:text-[10.5px] sm:break-normal"
          >
            {JSON.stringify({
              status: visualParams.payload.status,
              component: visualParams.payload.component,
              days_left: visualParams.payload.days_left,
              confidence: Number((visualParams.payload.confidence_pct / 100).toFixed(2)),
            })}
          </code>
        </div>
      </div>
    </div>
  );
}
