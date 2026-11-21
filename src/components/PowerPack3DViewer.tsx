import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw, Pause, Play } from 'lucide-react';
import { PlantPumpAsset } from '../data/plantAssets';
import {
  PowerPackModelType,
  PumpHealthStatus,
  SensorHighlightKey,
} from '../utils/pumpModel';

interface PowerPack3DViewerProps {
  asset: PlantPumpAsset;
  activeSensor: SensorHighlightKey | null;
  onSelectSensor: (sensor: SensorHighlightKey | null) => void;
}

type CameraPreset = 'iso' | 'front' | 'top';

interface SensorPinMeta {
  key: SensorHighlightKey;
  label: string;
  color: number;
}

const SENSOR_PINS: SensorPinMeta[] = [
  { key: 'pressure', label: 'Pressure Tap (M12)', color: 0x38bdf8 },
  { key: 'flow', label: 'Discharge Flow Tap', color: 0x34d399 },
  { key: 'case_drain', label: 'Case-Drain Tap', color: 0xf59e0b },
  { key: 'oil_temp', label: 'Oil Temp RTD (ΔT)', color: 0xfb7185 },
  { key: 'motor', label: 'Motor CT / Vibration', color: 0xa78bfa },
  { key: 'tank_level', label: 'Sight Level Sensor', color: 0x22d3ee },
];

function detectSoftwareGl(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const vendor = String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '');
      const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|llvmpipe|software|mesa/i.test(`${vendor} ${rendererStr}`)) {
        return true;
      }
    }
  } catch {
    // Ignore restricted WebGL debug extension
  }
  return false;
}

interface BuiltPowerPack {
  group: THREE.Group;
  anchors: Record<SensorHighlightKey, THREE.Vector3>;
  spinners: THREE.Object3D[];
  pulseCurve: THREE.CatmullRomCurve3;
  alertMeshes: THREE.Mesh[];
}

function createFinnedMotor(
  radius: number,
  length: number,
  colorHex: number,
  vertical = false,
): { group: THREE.Group; fan: THREE.Object3D } {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.42,
    metalness: 0.52,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.48,
    metalness: 0.45,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.6,
  });

  const core = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), bodyMat);
  g.add(core);

  // Radial cooling fins along motor barrel
  const finCount = 8;
  for (let i = 0; i < finCount; i++) {
    const t = -length * 0.36 + (i / (finCount - 1)) * (length * 0.72);
    const fin = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.028, 20),
      finMat,
    );
    fin.position.y = t;
    g.add(fin);
  }

  // End fan cowl dome
  const cowl = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.02, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    bodyMat,
  );
  cowl.position.y = length * 0.5;
  g.add(cowl);

  // Subtle spinning cooling impeller visible through end grille
  const fan = new THREE.Group();
  fan.position.y = length * 0.5 + radius * 0.55;
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 1.15, 0.02, radius * 0.16),
      darkMetal,
    );
    blade.rotation.y = (b * Math.PI) / 4;
    fan.add(blade);
  }
  g.add(fan);

  // Terminal junction box mounted on the side
  const jbox = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 0.75, length * 0.34, radius * 0.72),
    darkMetal,
  );
  jbox.position.set(radius * 0.92, 0, 0);
  g.add(jbox);

  if (!vertical) {
    g.rotation.z = Math.PI / 2;
  }

  return { group: g, fan };
}

function createSightGlass(oilLevelPct: number, status: PumpHealthStatus): THREE.Group {
  const g = new THREE.Group();
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.56, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.65 }),
  );
  g.add(bezel);

  const glassBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.44, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.2 }),
  );
  g.add(glassBack);

  const fillFrac = Math.max(0.2, Math.min(0.95, oilLevelPct / 100));
  const oilColor = status === 'failing' ? 0xf97316 : status === 'degraded' ? 0xf59e0b : 0x38bdf8;
  const oilBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.42 * fillFrac, 0.078),
    new THREE.MeshStandardMaterial({
      color: oilColor,
      emissive: oilColor,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    }),
  );
  oilBar.position.y = -0.21 + 0.21 * fillFrac;
  g.add(oilBar);

  return g;
}

function buildPowerPackGeometry(
  modelType: PowerPackModelType,
  status: PumpHealthStatus,
  oilLevelPct: number,
): BuiltPowerPack {
  const group = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  const alertMeshes: THREE.Mesh[] = [];

  const steelDarkMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.58,
    metalness: 0.48,
  });
  const steelLightMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.36,
    metalness: 0.62,
  });
  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.32,
    metalness: 0.72,
  });
  const matteBlackMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.65,
    metalness: 0.3,
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.75,
    metalness: 0.15,
  });
  const alertHighlightMat = new THREE.MeshStandardMaterial({
    color: status === 'failing' ? 0xef4444 : status === 'degraded' ? 0xf59e0b : 0x64748b,
    emissive: status === 'failing' ? 0xef4444 : status === 'degraded' ? 0xf59e0b : 0x0ea5e9,
    emissiveIntensity: status === 'failing' ? 0.45 : status === 'degraded' ? 0.28 : 0.08,
    roughness: 0.35,
    metalness: 0.6,
  });

  if (modelType === 'compact_hpu') {
    // Matches Reference 1 (image_e49d769d.png): Rectangular steel tank + horizontal motor/pump
    // + solenoid valve block on post + braided hose + vertical pressure gauge + front sight glass
    const tank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.15, 1.4), steelDarkMat);
    tank.position.set(0, 0.65, 0);
    tank.castShadow = true;
    tank.receiveShadow = true;
    group.add(tank);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.07, 1.46), aluminumMat);
    deck.position.set(0, 1.24, 0);
    group.add(deck);

    // 4 steel mounting feet
    [-1.12, 1.12].forEach((x) => {
      [-0.58, 0.58].forEach((z) => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.22), matteBlackMat);
        foot.position.set(x, 0.04, z);
        group.add(foot);
      });
    });

    // Front sight glass + drain bung
    const sight = createSightGlass(oilLevelPct, status);
    sight.position.set(-0.78, 0.68, 0.72);
    group.add(sight);

    const drainBung = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16),
      aluminumMat,
    );
    drainBung.rotation.x = Math.PI / 2;
    drainBung.position.set(-1.05, 0.26, 0.73);
    group.add(drainBung);

    // Rear-right horizontal electric motor + bell housing + front-left pump
    const { group: motor, fan } = createFinnedMotor(0.36, 0.92, 0x475569, false);
    motor.position.set(0.35, 1.66, -0.28);
    group.add(motor);
    spinners.push(fan);

    const bellHousing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.54), matteBlackMat);
    bellHousing.position.set(-0.32, 1.56, -0.22);
    group.add(bellHousing);

    const pumpBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.44, 18),
      alertHighlightMat,
    );
    pumpBody.rotation.z = Math.PI / 2;
    pumpBody.position.set(-0.76, 1.56, -0.18);
    group.add(pumpBody);
    alertMeshes.push(pumpBody);

    // Curved suction pipe plunging from pump into top deck
    const suctionCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.78, 1.54, 0.06),
      new THREE.Vector3(-0.76, 1.52, 0.36),
      new THREE.Vector3(-0.76, 1.24, 0.38),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(suctionCurve, 16, 0.075, 12, false), aluminumMat));

    // Vertical stanchion post + hydraulic manifold + solenoid directional valve
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.68, 0.12), aluminumMat);
    post.position.set(0.18, 1.58, 0.26);
    group.add(post);

    const manifold = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.36), steelLightMat);
    manifold.position.set(0.18, 1.88, 0.26);
    group.add(manifold);

    const solenoidValve = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.24), matteBlackMat);
    solenoidValve.position.set(0.18, 2.15, 0.26);
    group.add(solenoidValve);

    // High-pressure arched braided hose from pump to manifold
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.88, 1.76, -0.24),
      new THREE.Vector3(-0.92, 2.24, -0.05),
      new THREE.Vector3(-0.35, 2.22, 0.24),
      new THREE.Vector3(-0.08, 1.92, 0.28),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 24, 0.048, 10, false), hoseMat));

    // Pressure gauge on vertical standpipe + filler breather cap
    const gaugePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 12), aluminumMat);
    gaugePipe.position.set(0.76, 1.56, 0.38);
    group.add(gaugePipe);

    const gaugeCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.08, 24),
      matteBlackMat,
    );
    gaugeCase.rotation.x = Math.PI / 2;
    gaugeCase.position.set(0.76, 1.94, 0.38);
    group.add(gaugeCase);

    const gaugeDial = new THREE.Mesh(
      new THREE.CircleGeometry(0.135, 20),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }),
    );
    gaugeDial.position.set(0.76, 1.94, 0.425);
    group.add(gaugeDial);

    const breather = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.12, 0.18, 16),
      matteBlackMat,
    );
    breather.position.set(0.98, 1.36, -0.18);
    group.add(breather);

    return {
      group,
      spinners,
      alertMeshes,
      pulseCurve: hoseCurve,
      anchors: {
        pressure: new THREE.Vector3(0.76, 2.02, 0.44),
        flow: new THREE.Vector3(0.18, 2.28, 0.32),
        case_drain: new THREE.Vector3(-0.84, 1.56, -0.44),
        oil_temp: new THREE.Vector3(0.98, 1.48, -0.18),
        motor: new THREE.Vector3(0.45, 2.06, -0.28),
        tank_level: new THREE.Vector3(-0.78, 0.72, 0.8),
      },
    };
  }

  if (modelType === 'accumulator_hpu') {
    // Matches Reference 2 (image_20cc5803.png): Flanged drip-tray tank + vertical blue motor
    // + tall dark bladder accumulator + 2 black diaphragm accumulators + teal manifold blocks + blue return filter
    const tealManifoldMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      roughness: 0.36,
      metalness: 0.55,
    });
    const cobaltMat = new THREE.MeshStandardMaterial({
      color: 0x3b4cca,
      roughness: 0.42,
      metalness: 0.48,
    });
    const tankGrayMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.46,
      metalness: 0.5,
    });

    // Bevelled drip tray baseplate
    const tray = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 1.9), steelDarkMat);
    tray.position.set(0, 0.04, 0);
    tray.receiveShadow = true;
    group.add(tray);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.0, 1.38), tankGrayMat);
    tank.position.set(-0.08, 0.58, 0);
    tank.castShadow = true;
    group.add(tank);

    // Side sight glass
    const sight = createSightGlass(oilLevelPct, status);
    sight.rotation.y = Math.PI / 2;
    sight.position.set(1.02, 0.62, 0.25);
    group.add(sight);

    // Vertical cobalt-blue electric motor at rear-center
    const { group: motor, fan } = createFinnedMotor(0.36, 0.88, 0x3b4cca, true);
    motor.position.set(-0.22, 1.52, -0.28);
    group.add(motor);
    spinners.push(fan);

    // Tall vertical charcoal bladder accumulator at rear-right
    const accGroup = new THREE.Group();
    const accCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 1.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.34, metalness: 0.6 }),
    );
    accCyl.position.y = 0.85;
    accGroup.add(accCyl);
    const accTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 12),
      new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.34, metalness: 0.6 }),
    );
    accTop.position.y = 1.47;
    accGroup.add(accTop);
    const accCap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), aluminumMat);
    accCap.position.y = 1.84;
    accGroup.add(accCap);
    accGroup.position.set(0.68, 1.12, -0.34);
    group.add(accGroup);

    // Main teal manifold block + solenoid stack + side blue return filter
    const mainManifold = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.54, 0.64), tealManifoldMat);
    mainManifold.position.set(0.28, 1.36, 0.24);
    group.add(mainManifold);
    alertMeshes.push(mainManifold);

    const valveStack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.24), aluminumMat);
    valveStack.position.set(0.32, 1.76, 0.16);
    group.add(valveStack);

    // Secondary left teal block
    const leftBlock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.4), tealManifoldMat);
    leftBlock.position.set(-0.84, 1.25, 0.18);
    group.add(leftBlock);

    // Two spherical black diaphragm accumulators
    [
      new THREE.Vector3(-0.84, 1.66, 0.18),
      new THREE.Vector3(0.06, 1.98, -0.02),
    ].forEach((pos) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), matteBlackMat);
      bulb.scale.set(1, 0.88, 1);
      bulb.position.copy(pos);
      group.add(bulb);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12), tealManifoldMat);
      cap.position.set(pos.x, pos.y + 0.23, pos.z);
      group.add(cap);
    });

    // Side-mounted blue return filter canister
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.56, 18), cobaltMat);
    filter.position.set(0.62, 0.94, 0.66);
    group.add(filter);

    // Copper-tinted hydraulic line connecting blocks
    const lineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, 1.24, 0.28),
      new THREE.Vector3(-0.32, 1.22, 0.44),
      new THREE.Vector3(-0.08, 1.32, 0.38),
      new THREE.Vector3(0.32, 1.48, 0.48),
      new THREE.Vector3(0.66, 1.48, -0.06),
    ]);
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(lineCurve, 22, 0.035, 10, false),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.72 }),
      ),
    );

    return {
      group,
      spinners,
      alertMeshes,
      pulseCurve: lineCurve,
      anchors: {
        pressure: new THREE.Vector3(0.68, 2.98, -0.34),
        flow: new THREE.Vector3(0.32, 1.92, 0.36),
        case_drain: new THREE.Vector3(-0.84, 1.92, 0.18),
        oil_temp: new THREE.Vector3(0.62, 1.24, 0.72),
        motor: new THREE.Vector3(-0.22, 2.02, -0.28),
        tank_level: new THREE.Vector3(1.06, 0.65, 0.25),
      },
    };
  }

  if (modelType === 'cooler_hpu') {
    // Matches Reference 3 (image_f70a1400.png): Light-steel cube tank + vertical silver motor
    // + overhead U grab-bar + bright green front shell-and-tube oil cooler + stacked valve block
    const whiteTankMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.4,
      metalness: 0.32,
    });
    const coolerGreenMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.34,
      metalness: 0.42,
    });

    const tank = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.2, 1.55), whiteTankMat);
    tank.position.set(0, 0.66, 0);
    tank.castShadow = true;
    group.add(tank);

    // Base skid rails
    [-0.92, 0.92].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 1.58), aluminumMat);
      rail.position.set(x, 0.05, 0);
      group.add(rail);
    });

    // Vertical brushed-silver finned motor at rear center
    const { group: motor, fan } = createFinnedMotor(0.38, 0.95, 0x94a3b8, true);
    motor.position.set(0.08, 1.72, -0.24);
    group.add(motor);
    spinners.push(fan);

    // Chrome U-shaped top grab frame
    const barCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.78, 1.26, -0.52),
      new THREE.Vector3(-0.78, 2.38, -0.52),
      new THREE.Vector3(0.45, 2.38, -0.52),
      new THREE.Vector3(0.45, 1.26, -0.52),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(barCurve, 24, 0.038, 10, false), steelLightMat));

    // Bright green horizontal shell-and-tube oil cooler on front face
    const coolerBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 1.18, 24),
      coolerGreenMat,
    );
    coolerBarrel.rotation.z = Math.PI / 2;
    coolerBarrel.position.set(-0.18, 0.66, 0.96);
    group.add(coolerBarrel);

    [-0.62, 0.26].forEach((x) => {
      const endBell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), coolerGreenMat);
      endBell.position.set(x, 0.66, 0.96);
      group.add(endBell);
    });

    // Stacked directional valve manifold on front-left deck (flagged under wear)
    const valveBase = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.34, 0.52), alertHighlightMat);
    valveBase.position.set(-0.56, 1.44, 0.24);
    group.add(valveBase);
    alertMeshes.push(valveBase);

    for (let s = 0; s < 3; s++) {
      const slice = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.44), steelDarkMat);
      slice.position.set(-0.76 + s * 0.2, 1.74, 0.24);
      group.add(slice);
    }

    // Return filter housing on bracket (right deck)
    const filterCan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.46, 18), steelLightMat);
    filterCan.position.set(0.68, 1.54, 0.14);
    group.add(filterCan);

    // Rigid silver pipe loop connecting manifold -> green oil cooler -> return filter
    const coolerPipe = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.56, 1.38, 0.52),
      new THREE.Vector3(-0.56, 1.02, 0.92),
      new THREE.Vector3(-0.46, 0.88, 0.96),
      new THREE.Vector3(0.22, 0.88, 0.96),
      new THREE.Vector3(0.56, 1.48, 0.44),
      new THREE.Vector3(0.68, 1.74, 0.14),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(coolerPipe, 26, 0.044, 10, false), steelLightMat));

    const sight = createSightGlass(oilLevelPct, status);
    sight.rotation.y = Math.PI / 2;
    sight.position.set(1.04, 0.65, 0.2);
    group.add(sight);

    return {
      group,
      spinners,
      alertMeshes,
      pulseCurve: coolerPipe,
      anchors: {
        pressure: new THREE.Vector3(-0.56, 1.94, 0.24),
        flow: new THREE.Vector3(0.68, 1.84, 0.14),
        case_drain: new THREE.Vector3(-0.88, 1.44, 0.24),
        oil_temp: new THREE.Vector3(-0.18, 0.96, 1.04),
        motor: new THREE.Vector3(0.08, 2.26, -0.24),
        tank_level: new THREE.Vector3(1.1, 0.65, 0.2),
      },
    };
  }

  if (modelType === 'skid_bank_hpu') {
    // Matches Reference 4 (image_fcae13ac.png): Dark skid base + 3 bright-blue parallel finned
    // electric motors with red bell housings + auxiliary transfer pump + overhead steel header pipes
    const redCouplingMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.38,
      metalness: 0.48,
    });

    const skid = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 2.0), matteBlackMat);
    skid.position.set(0, 0.08, 0);
    skid.receiveShadow = true;
    group.add(skid);

    // 3 Main parallel bright-blue electric motors + red couplings + pumps
    [-0.52, 0.28, 1.08].forEach((xPos, idx) => {
      const { group: m, fan } = createFinnedMotor(0.32, 0.86, 0x0284c7, false);
      m.rotation.y = Math.PI / 2; // Align motor shaft along Z axis
      m.position.set(xPos, 0.56, 0.34);
      group.add(m);
      spinners.push(fan);

      const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.28, 18), redCouplingMat);
      coupling.rotation.x = Math.PI / 2;
      coupling.position.set(xPos, 0.54, -0.24);
      group.add(coupling);

      const pump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16),
        idx === 1 ? alertHighlightMat : steelDarkMat,
      );
      pump.rotation.x = Math.PI / 2;
      pump.position.set(xPos, 0.54, -0.52);
      group.add(pump);
      if (idx === 1) alertMeshes.push(pump);

      // Vertical flanged riser pipe to overhead header
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.15, 14), steelLightMat);
      riser.position.set(xPos, 1.14, -0.58);
      group.add(riser);

      // Red flange gasket collar
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 16), redCouplingMat);
      flange.position.set(xPos, 1.24, -0.58);
      group.add(flange);
    });

    // Small auxiliary blue transfer pump on far left + drip pan
    const { group: auxMotor, fan: auxFan } = createFinnedMotor(0.18, 0.48, 0x0284c7, false);
    auxMotor.rotation.y = Math.PI / 2;
    auxMotor.position.set(-1.18, 0.38, 0.34);
    group.add(auxMotor);
    spinners.push(auxFan);

    const auxPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), redCouplingMat);
    auxPedestal.position.set(-1.18, 0.34, -0.04);
    group.add(auxPedestal);

    const dripPan = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.72), steelLightMat);
    dripPan.position.set(-1.35, 0.22, -0.45);
    group.add(dripPan);

    // Overhead horizontal steel header manifold pipe
    const headerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.35, 1.74, -0.58),
      new THREE.Vector3(-0.52, 1.74, -0.58),
      new THREE.Vector3(0.28, 1.74, -0.58),
      new THREE.Vector3(1.12, 1.74, -0.58),
      new THREE.Vector3(1.42, 1.74, -0.22),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(headerCurve, 24, 0.095, 14, false), steelLightMat));

    return {
      group,
      spinners,
      alertMeshes,
      pulseCurve: headerCurve,
      anchors: {
        pressure: new THREE.Vector3(0.28, 1.88, -0.58),
        flow: new THREE.Vector3(1.12, 1.88, -0.58),
        case_drain: new THREE.Vector3(0.28, 0.62, -0.78),
        oil_temp: new THREE.Vector3(-0.52, 1.28, -0.58),
        motor: new THREE.Vector3(0.28, 0.96, 0.34),
        tank_level: new THREE.Vector3(-1.35, 0.36, -0.45),
      },
    };
  }

  // Default / 5th archetype: 'central_station_hpu' (matches image_43d9bf99.png)
  // Large central industrial blue oil tank with twin circular inspection covers + flanking left & right 3-motor pump banks
  const stationBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.42,
    metalness: 0.46,
  });
  const stationDarkBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.46,
    metalness: 0.5,
  });

  // Central steel-blue oil reservoir tank
  const centralTank = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.32, 1.3), stationBlueMat);
  centralTank.position.set(0, 0.72, 0);
  centralTank.castShadow = true;
  group.add(centralTank);

  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.08, 1.75), stationDarkBlueMat);
  basePlinth.position.set(0, 0.04, 0);
  basePlinth.receiveShadow = true;
  group.add(basePlinth);

  // Twin circular bolted silver cleanout hatches on front face
  [-0.38, 0.32].forEach((x) => {
    const hatch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.05, 22),
      steelLightMat,
    );
    hatch.rotation.x = Math.PI / 2;
    hatch.position.set(x, 0.72, 0.66);
    group.add(hatch);
  });

  // Front vertical sight level gauge
  const sight = createSightGlass(oilLevelPct, status);
  sight.position.set(0.74, 0.72, 0.67);
  group.add(sight);

  // Top dual filter bowls & manifold header bars
  [-0.34, 0.24].forEach((x) => {
    const topFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.14, 0.28, 16),
      stationDarkBlueMat,
    );
    topFilter.position.set(x, 1.52, -0.15);
    group.add(topFilter);
  });

  // Flanking Left (Bank-A) & Right (Bank-B) 3-motor pump skids with arched flexible hoses
  [-1.42, 1.42].forEach((sideX, bankIdx) => {
    const dir = sideX < 0 ? -1 : 1;
    [-0.46, 0, 0.46].forEach((zOff, idx) => {
      const { group: m, fan } = createFinnedMotor(0.2, 0.52, 0x475569, false);
      m.position.set(sideX + dir * 0.16, 0.4, zOff);
      group.add(m);
      spinners.push(fan);

      const pump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.24, 16),
        bankIdx === 0 && idx === 1 ? alertHighlightMat : stationDarkBlueMat,
      );
      pump.rotation.z = Math.PI / 2;
      pump.position.set(sideX - dir * 0.24, 0.4, zOff);
      group.add(pump);
      if (bankIdx === 0 && idx === 1) alertMeshes.push(pump);

      // Arched hydraulic flex hose from pump into central tank
      const loopCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sideX - dir * 0.28, 0.52, zOff),
        new THREE.Vector3(sideX - dir * 0.42, 1.08, zOff),
        new THREE.Vector3(dir * 0.86, 1.04, zOff * 0.7),
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(loopCurve, 18, 0.032, 8, false), hoseMat));
    });
  });

  const mainHeaderCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.12, 1.08, 0),
    new THREE.Vector3(-0.65, 1.46, 0.12),
    new THREE.Vector3(0.0, 1.48, 0.12),
    new THREE.Vector3(0.65, 1.46, 0.12),
    new THREE.Vector3(1.12, 1.08, 0),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(mainHeaderCurve, 24, 0.045, 10, false), steelLightMat));

  return {
    group,
    spinners,
    alertMeshes,
    pulseCurve: mainHeaderCurve,
    anchors: {
      pressure: new THREE.Vector3(0, 1.56, 0.16),
      flow: new THREE.Vector3(0.65, 1.54, 0.16),
      case_drain: new THREE.Vector3(-1.16, 0.56, 0),
      oil_temp: new THREE.Vector3(-0.34, 1.68, -0.15),
      motor: new THREE.Vector3(-1.58, 0.7, 0),
      tank_level: new THREE.Vector3(0.74, 0.74, 0.76),
    },
  };
}

export function PowerPack3DViewer({
  asset,
  activeSensor,
  onSelectSensor,
}: PowerPack3DViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [webglError, setWebglError] = useState(false);

  const assetRef = useRef(asset);
  assetRef.current = asset;
  const activeSensorRef = useRef(activeSensor);
  activeSensorRef.current = activeSensor;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const onSelectSensorRef = useRef(onSelectSensor);
  onSelectSensorRef.current = onSelectSensor;

  // Imperative refs exposed from WebGL effect for rebuilding geometry or setting camera presets
  const sceneControlRef = useRef<{
    rebuildModel: (nextAsset: PlantPumpAsset) => void;
    setPreset: (preset: CameraPreset) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const isSoftwareGl = detectSoftwareGl(renderer);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 420);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.FogExp2(0x0b1220, 0.048);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);

    // Three-point CAD studio lighting (warm key + cool fill + sharp rim)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    keyLight.position.set(5.5, 7.5, 5.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-5.0, 3.8, -4.5);
    scene.add(rimLight);

    // Ground CAD floor plane + crisp technical grid + contact shadow disc
    const grid = new THREE.GridHelper(12, 24, 0x334155, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 32),
      new THREE.MeshBasicMaterial({
        color: 0x020617,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.015;
    scene.add(contactShadow);

    // Root container holding the current hydraulic power pack assembly
    const assemblyHolder = new THREE.Group();
    scene.add(assemblyHolder);

    // Sensor tap beacon nodes + live flow pulses
    const pinGroup = new THREE.Group();
    scene.add(pinGroup);

    const pinOrbGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const pinRingGeo = new THREE.RingGeometry(0.12, 0.165, 24);
    const pinMeshes: {
      key: SensorHighlightKey;
      orb: THREE.Mesh;
      ring: THREE.Mesh;
      baseColor: number;
    }[] = [];

    SENSOR_PINS.forEach((pin) => {
      const orbMat = new THREE.MeshStandardMaterial({
        color: pin.color,
        emissive: pin.color,
        emissiveIntensity: 0.75,
        roughness: 0.25,
      });
      const orb = new THREE.Mesh(pinOrbGeo, orbMat);
      orb.userData.sensorKey = pin.key;

      const ring = new THREE.Mesh(
        pinRingGeo,
        new THREE.MeshBasicMaterial({
          color: pin.color,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        }),
      );
      orb.add(ring);
      pinGroup.add(orb);
      pinMeshes.push({ key: pin.key, orb, ring, baseColor: pin.color });
    });

    // Live fluid pulses along the active hydraulic hose / manifold curve
    const PULSE_COUNT = 8;
    const pulseGeo = new THREE.SphereGeometry(0.058, 10, 10);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pulseInst = new THREE.InstancedMesh(pulseGeo, pulseMat, PULSE_COUNT);
    pulseInst.frustumCulled = false;
    scene.add(pulseInst);

    let currentPack: BuiltPowerPack | null = null;

    const disposeGroup = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mt) => mt.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    };

    const rebuildModel = (nextAsset: PlantPumpAsset) => {
      if (currentPack) {
        assemblyHolder.remove(currentPack.group);
        disposeGroup(currentPack.group);
      }
      currentPack = buildPowerPackGeometry(
        nextAsset.modelType,
        nextAsset.status,
        nextAsset.telemetry.oilLevelPct ?? 88,
      );
      assemblyHolder.add(currentPack.group);

      pinMeshes.forEach((pm) => {
        const anchor = currentPack!.anchors[pm.key];
        pm.orb.position.copy(anchor);
      });

      const pulseColor =
        nextAsset.status === 'failing'
          ? 0xf87171
          : nextAsset.status === 'degraded'
            ? 0xfbbf24
            : 0x38bdf8;
      pulseMat.color.setHex(pulseColor);
    };

    // Orbit camera spherical coordinates with smooth exponential damping
    const orbit = {
      theta: 0.72,
      phi: 1.06,
      radius: 5.5,
      targetTheta: 0.72,
      targetPhi: 1.06,
      targetRadius: 5.5,
    };
    const lookTarget = new THREE.Vector3(0, 1.05, 0);

    const setPreset = (preset: CameraPreset) => {
      if (preset === 'front') {
        orbit.targetTheta = 0.0;
        orbit.targetPhi = 1.24;
        orbit.targetRadius = 5.4;
      } else if (preset === 'top') {
        orbit.targetTheta = 0.25;
        orbit.targetPhi = 0.42;
        orbit.targetRadius = 6.2;
      } else {
        orbit.targetTheta = 0.72;
        orbit.targetPhi = 1.06;
        orbit.targetRadius = 5.5;
      }
    };

    sceneControlRef.current = { rebuildModel, setPreset };
    rebuildModel(assetRef.current);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer orbit + sensor tap raycasting
    let dragging = false;
    let movedDistance = 0;
    let lastX = 0;
    let lastY = 0;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const clickableOrbs = pinMeshes.map((p) => p.orb);

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      movedDistance = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      movedDistance += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;

      orbit.targetTheta -= dx * 0.008;
      orbit.targetPhi = Math.max(0.32, Math.min(1.42, orbit.targetPhi - dy * 0.006));
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasClick = dragging && movedDistance < 6;
      dragging = false;
      renderer.domElement.style.cursor = 'grab';

      if (wasClick) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(clickableOrbs, false);
        if (hits.length > 0) {
          const key = hits[0].object.userData.sensorKey as SensorHighlightKey;
          onSelectSensorRef.current(activeSensorRef.current === key ? null : key);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.targetRadius = Math.max(3.6, Math.min(8.2, orbit.targetRadius + e.deltaY * 0.003));
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => {
      setWebglError(false);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Pre-allocated animation loop scratch objects
    const scratchPos = new THREE.Vector3();
    const scratchMat = new THREE.Matrix4();
    const scratchScale = new THREE.Vector3(1, 1, 1);
    const scratchQuat = new THREE.Quaternion();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    const renderFrame = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      if (autoRotateRef.current && !dragging && !prefersReducedMotion) {
        orbit.targetTheta += dt * 0.24;
      }

      const damp = 1 - Math.exp(-8 * dt);
      orbit.theta += (orbit.targetTheta - orbit.theta) * damp;
      orbit.phi += (orbit.targetPhi - orbit.phi) * damp;
      orbit.radius += (orbit.targetRadius - orbit.radius) * damp;

      camera.position.set(
        lookTarget.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
        lookTarget.y + orbit.radius * Math.cos(orbit.phi),
        lookTarget.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
      );
      camera.lookAt(lookTarget);

      if (currentPack) {
        if (!prefersReducedMotion) {
          currentPack.spinners.forEach((fan) => {
            fan.rotation.y += dt * 7.5;
          });
        }

        // Update fluid flow pulses along hydraulic line
        const speed = assetRef.current.status === 'failing' ? 0.55 : 0.34;
        for (let i = 0; i < PULSE_COUNT; i++) {
          const u = ((elapsed * speed + i / PULSE_COUNT) % 1 + 1) % 1;
          currentPack.pulseCurve.getPointAt(u, scratchPos);
          scratchMat.compose(scratchPos, scratchQuat, scratchScale);
          pulseInst.setMatrixAt(i, scratchMat);
        }
        pulseInst.instanceMatrix.needsUpdate = true;
      }

      // Billboard sensor beacon rings toward camera & highlight selected sensor
      const selectedKey = activeSensorRef.current;
      pinMeshes.forEach((pm) => {
        pm.ring.lookAt(camera.position);
        const isSelected = selectedKey === pm.key;
        const targetScale = isSelected ? 1.55 : 1.0;
        pm.orb.scale.setScalar(targetScale);
        const mat = pm.orb.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isSelected ? 1.85 : 0.65;
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        timerId = window.setTimeout(() => {
          rafId = requestAnimationFrame(renderFrame);
        }, 70);
      } else {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      if (currentPack) disposeGroup(currentPack.group);
      pinOrbGeo.dispose();
      pinRingGeo.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      sceneControlRef.current = null;
    };
  }, []);

  // Swap 3D power pack assembly cleanly when the selected asset changes
  useEffect(() => {
    sceneControlRef.current?.rebuildModel(asset);
  }, [asset]);

  const activePinMeta = activeSensor
    ? SENSOR_PINS.find((p) => p.key === activeSensor) ?? null
    : null;

  return (
    <div
      data-testid="power-pack-3d-stage"
      data-model-type={asset.modelType}
      data-asset-id={asset.id}
      className="relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0B1220]"
    >
      {/* Top Viewport Info & Camera Preset Bar (no backdrop-blur over WebGL) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display font-semibold text-white">
            3D Digital Twin · {asset.architectureLabel}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono tabular-nums text-slate-400">
            {asset.tankCapacityL}L Tank · {asset.motorPowerKw} kW
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'iso', label: 'Isometric' },
              { id: 'front', label: 'Front' },
              { id: 'top', label: 'Top' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => sceneControlRef.current?.setPreset(preset.id)}
              className="cursor-pointer whitespace-nowrap rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-sky-500 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            aria-pressed={autoRotate}
            aria-label={autoRotate ? 'Pause 3D rotation' : 'Resume 3D rotation'}
            className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-sky-500 hover:text-white"
          >
            {autoRotate ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
            {autoRotate ? 'Spin' : 'Paused'}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectSensor(null);
              sceneControlRef.current?.setPreset('iso');
            }}
            aria-label="Reset 3D camera view"
            className="inline-flex cursor-pointer items-center rounded border border-slate-700 bg-slate-900 p-1 text-slate-300 transition-colors hover:border-sky-500 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Center 3D WebGL Canvas */}
      <div className="relative h-[380px] w-full sm:h-[440px]">
        {webglError ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
            <p className="font-display text-sm font-semibold text-white">
              3D Power Pack Preview ({asset.architectureLabel})
            </p>
            <p className="mt-1 text-xs text-slate-400">
              WebGL context unavailable in this browser. Live sensor telemetry remains active on the side panel.
            </p>
          </div>
        ) : (
          <div
            ref={mountRef}
            data-testid="power-pack-webgl-canvas"
            className="h-full w-full"
            aria-label={`Interactive 3D hydraulic power pack model for ${asset.name}. Drag to rotate 360 degrees or click glowing M12 sensor pins.`}
          />
        )}

        {/* Active Sensor Pin Callout (top-left, solid rgba backing, never occludes center) */}
        {activePinMeta && (
          <div
            data-testid="active-sensor-callout"
            role="status"
            className="absolute left-3 top-3 z-10 flex items-center gap-3 rounded-lg border border-sky-500/50 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
          >
            <span className="font-semibold text-sky-300">Focused Tap: {activePinMeta.label}</span>
            <button
              type="button"
              onClick={() => onSelectSensor(null)}
              className="cursor-pointer text-slate-400 underline underline-offset-2 hover:text-white"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Bottom Interactive Hint & Sensor Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/90 px-4 py-2 text-[11px] text-slate-400">
        <span>Drag to orbit 360° · Scroll to zoom · Click any glowing M12 pin or side value to inspect tap point</span>
        <span className="font-mono tabular-nums text-slate-300">
          {asset.id} · Updated {asset.lastUpdated}
        </span>
      </div>
    </div>
  );
}
