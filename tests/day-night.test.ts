import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  dayNightState,
  CYCLE_EPOCH,
  CYCLE_MS,
  DAY_MS,
  NIGHT_MS,
} from "../apps/client/src/fps/day-night";
import { createDayNightView } from "../apps/client/src/fps/day-night-view";
import { STREET_PLAN } from "../apps/client/src/fps/city-streets-layout";
test("shared clock completes a 20-minute day and ten-minute night without resets or frame dependence", () => {
  assert.equal(dayNightState(CYCLE_EPOCH).time, "06:00");
  assert.equal(dayNightState(CYCLE_EPOCH + DAY_MS / 2).time, "12:00");
  assert.equal(dayNightState(CYCLE_EPOCH + DAY_MS).time, "18:00");
  assert.equal(
    dayNightState(CYCLE_EPOCH + DAY_MS + NIGHT_MS / 2).time,
    "00:00",
  );
  for (const offset of [0, 123456, DAY_MS + 789, CYCLE_MS - 1]) {
    const state = dayNightState(CYCLE_EPOCH + offset);
    assert.deepEqual(
      dayNightState(CYCLE_EPOCH + offset + CYCLE_MS * 20),
      state,
    );
    assert.deepEqual(
      dayNightState(CYCLE_EPOCH + offset - CYCLE_MS * 20),
      state,
    );
  }
});
test("sunrise, sunset and cycle wrap blend continuously with bounded lighting", () => {
  for (const offset of [0, DAY_MS, CYCLE_MS]) {
    const a = dayNightState(CYCLE_EPOCH + offset - 1),
      b = dayNightState(CYCLE_EPOCH + offset + 1);
    assert.ok(Math.abs(a.daylight - b.daylight) < 0.0001);
    assert.ok(Math.abs(a.lamps - b.lamps) < 0.0001);
  }
  for (let t = 0; t < CYCLE_MS; t += 1000) {
    const s = dayNightState(CYCLE_EPOCH + t);
    assert.ok(
      s.daylight >= 0 && s.daylight <= 1 && s.lamps >= 0 && s.lamps <= 1,
    );
    assert.ok(s.hour >= 0 && s.hour < 24);
  }
  assert.equal(dayNightState(CYCLE_EPOCH + DAY_MS / 2).lamps, 0);
  assert.equal(dayNightState(CYCLE_EPOCH + DAY_MS + NIGHT_MS / 2).lamps, 1);
  assert.ok(Number.isFinite(dayNightState(NaN).daylight));
});
test("night changes world and hand lighting, keeps fog coherent and bounds shadow-free streetlights on phones", () => {
  const original = [...STREET_PLAN.props];
  STREET_PLAN.props.splice(
    0,
    STREET_PLAN.props.length,
    ...[0, 100, 200].map((x) => ({
      x,
      z: 0,
      y: 0,
      yaw: 0,
      width: 0.26,
      depth: 0.26,
      height: 4.25,
      kind: "lamp" as const,
    })),
  );
  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color();
    scene.fog = new THREE.Fog(0, 48, 115);
    const ambient = new THREE.HemisphereLight(),
      sun = new THREE.DirectionalLight(),
      viewAmbient = new THREE.HemisphereLight(),
      viewLight = new THREE.DirectionalLight(),
      renderer = { toneMappingExposure: 1.25 };
    const cycle = createDayNightView({
      scene,
      ambient,
      sun,
      viewAmbient,
      viewLight,
      renderer,
      mobile: true,
    });
    const noon = CYCLE_EPOCH + DAY_MS / 2,
      midnight = CYCLE_EPOCH + DAY_MS + NIGHT_MS / 2;
    cycle.update(noon, { x: 0, z: 0 });
    const skyDay = (scene.background as THREE.Color).getHex();
    assert.equal(ambient.intensity, 2.5);
    assert.equal(cycle.diagnostics().activeLocalLights, 0);
    cycle.update(midnight, { x: 0, z: 0 });
    assert.notEqual((scene.background as THREE.Color).getHex(), skyDay);
    assert.equal(
      (scene.background as THREE.Color).getHex(),
      scene.fog.color.getHex(),
    );
    assert.ok(
      ambient.intensity >= 0.7 &&
        viewAmbient.intensity >= 0.8 &&
        viewLight.intensity >= 0.6,
    );
    assert.equal(sun.intensity, 0);
    assert.equal(cycle.diagnostics().phase, "Night");
    const points = scene.children.filter(
      (o) => o instanceof THREE.PointLight,
    ) as THREE.PointLight[];
    assert.equal(points.length, 2);
    assert.ok(points.every((l) => !l.castShadow));
    assert.equal(cycle.diagnostics().activeLocalLights, 1);
    const old = points.find((l) => l.intensity > 0)!.position.x;
    cycle.update(midnight + 100, { x: 100, z: 0 });
    assert.ok(
      Math.abs(points.find((l) => l.intensity > 0)!.position.x - old) > 50,
    );
    assert.equal(cycle.diagnostics().localLightBudget, 2);
    cycle.update(noon, { x: 0, z: 0 });
    assert.equal(
      cycle.diagnostics().activeLocalLights,
      0,
      "clock correction must not freeze lighting",
    );
  } finally {
    STREET_PLAN.props.splice(0, STREET_PLAN.props.length, ...original);
  }
});

test("water, foam and ripples share a clamped daylight value without changing geometry or effects", async () => {
  const { createWater } = await import("../apps/client/src/fps/water-view");
  const water = createWater([]);
  const surface = water.material.uniforms.uDaylight;
  water.setDaylight(0);
  assert.equal(surface.value, 0);
  assert.equal(water.stats().daylight, 0);
  for (const o of [water.foam, water.pool]) {
    const shader = (o as THREE.Mesh).material as THREE.ShaderMaterial;
    assert.equal(shader.uniforms.uDaylight, surface);
    assert.match(shader.fragmentShader, /uDaylight/);
  }
  water.setDaylight(2);
  assert.equal(surface.value, 1);
  water.setDaylight(-1);
  assert.equal(surface.value, 0);
  water.setDaylight(NaN);
  assert.equal(surface.value, 1);
  assert.equal(water.stats().drawCalls, 3);
});
