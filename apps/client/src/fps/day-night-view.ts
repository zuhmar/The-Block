import * as THREE from "three";
import { dayNightState } from "./day-night";
import { STREET_PLAN } from "./city-streets-layout";
import { roadsideModel } from "./roadside-models";

function lampHead() {
  const model = roadsideModel("streetlamp");
  if (!model) return new THREE.Vector3(0, 4, 0.9);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3(),
    point = new THREE.Vector3();
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const vertices = o.geometry.getAttribute("position");
      for (let i = 0; i < vertices.count; i++) {
        point.fromBufferAttribute(vertices, i).applyMatrix4(o.matrixWorld);
        if (
          point.y > 3.35 &&
          point.y < 4.12 &&
          Math.hypot(point.x, point.z) > 0.3
        )
          bounds.expandByPoint(point);
      }
    }
  });
  if (bounds.isEmpty()) return new THREE.Vector3(0, 4, 0.9);
  const center = bounds.getCenter(new THREE.Vector3());
  center.y = bounds.min.y + 0.035;
  return center;
}
export function createDayNightView(options: {
  scene: THREE.Scene;
  ambient: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  viewAmbient: THREE.HemisphereLight;
  viewLight: THREE.DirectionalLight;
  renderer: { toneMappingExposure: number };
  mobile: boolean;
}) {
  const { scene, ambient, sun, viewAmbient, viewLight, renderer } = options;
  const moon = new THREE.DirectionalLight(0xa2bce9, 0.4);
  scene.add(moon);
  const nightSky = new THREE.Color(0x14243c),
    daySky = new THREE.Color(0xb7d8db),
    duskSky = new THREE.Color(0xa98b8c),
    sky = new THREE.Color();
  const daySun = new THREE.Color(0xffe4bb),
    duskSun = new THREE.Color(0xffb172);
  const dayAmbient = new THREE.Color(0xe8f6ff),
    nightAmbient = new THREE.Color(0xa9bddf);
  const dayGround = new THREE.Color(0x809166),
    nightGround = new THREE.Color(0x47556e);
  const anchor = lampHead(),
    axis = new THREE.Vector3(0, 1, 0);
  const heads = STREET_PLAN.props
    .filter((p) => p.kind === "lamp")
    .map((p) =>
      anchor
        .clone()
        .multiplyScalar(p.height / 4.3)
        .applyAxisAngle(axis, p.yaw)
        .add(new THREE.Vector3(p.x, p.y, p.z)),
    );
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdc96,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    depthWrite: false,
  });
  const glows = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.095, 8, 6),
    glowMaterial,
    heads.length,
  );
  const transform = new THREE.Matrix4();
  heads.forEach((head, i) => {
    transform.makeTranslation(head.x, head.y, head.z);
    glows.setMatrixAt(i, transform);
  });
  glows.computeBoundingSphere();
  glows.name = "night-streetlamp-bulbs";
  glows.visible = false;
  scene.add(glows);
  const lights = Array.from({ length: options.mobile ? 2 : 4 }, () => {
    const light = new THREE.PointLight(0xffd69a, 0, 9, 2);
    light.castShadow = false;
    scene.add(light);
    return light;
  });
  const candidates = heads.map((position, index) => ({
    position,
    index,
    distance: Infinity,
  }));
  let nextUpdate = -Infinity,
    state = dayNightState(Date.now());
  function update(now: number, player: { x: number; z: number }) {
    // Catch wall-clock jumps and tab resumes, while updating lighting at 10 Hz.
    if (now < nextUpdate && now >= nextUpdate - 100) return state;
    nextUpdate = now + 100;
    state = dayNightState(now);
    sky
      .copy(nightSky)
      .lerp(daySky, state.daylight)
      .lerp(duskSky, state.warmth * 0.28);
    (scene.background as THREE.Color).copy(sky);
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(sky);
    ambient.color.copy(nightAmbient).lerp(dayAmbient, state.daylight);
    ambient.groundColor.copy(nightGround).lerp(dayGround, state.daylight);
    ambient.intensity = 1 + state.daylight * 1.5;
    sun.color.copy(daySun).lerp(duskSun, state.warmth);
    sun.intensity = 2.6 * Math.max(0, Math.sin(state.angle));
    sun.position.set(
      player.x + Math.cos(state.angle) * 60,
      Math.sin(state.angle) * 65,
      player.z + 25,
    );
    sun.target.position.set(player.x, 0, player.z);
    sun.target.updateMatrixWorld();
    moon.intensity = 0.5 * (1 - state.daylight);
    moon.position.set(
      player.x - Math.cos(state.angle) * 60,
      Math.max(0.15, -Math.sin(state.angle)) * 65,
      player.z - 25,
    );
    moon.target.position.set(player.x, 0, player.z);
    moon.target.updateMatrixWorld();
    viewAmbient.intensity = 1 + state.daylight;
    viewLight.intensity = 0.9 + state.daylight * 1.6;
    viewLight.color.copy(nightAmbient).lerp(daySun, state.daylight);
    renderer.toneMappingExposure = 1.4 - state.daylight * 0.15;
    glows.visible = state.lamps > 0.01;
    glowMaterial.opacity = state.lamps * 0.95;
    for (const c of candidates)
      c.distance = Math.hypot(c.position.x - player.x, c.position.z - player.z);
    candidates.sort((a, b) => a.distance - b.distance || a.index - b.index);
    lights.forEach((light, i) => {
      const c = candidates[i];
      light.intensity = c && c.distance < 18 ? state.lamps * 22 : 0;
      if (c) light.position.copy(c.position);
    });
    return state;
  }
  return {
    update,
    diagnostics: () => ({
      time: state.time,
      phase: state.phase,
      daylight: state.daylight,
      streetlights: heads.length,
      activeLocalLights: lights.filter((l) => l.intensity > 0).length,
      localLightBudget: lights.length,
      shadows: false,
    }),
  };
}
