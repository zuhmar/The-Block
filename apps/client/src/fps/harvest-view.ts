import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createPlayerViewRig, type PlayerAction } from "./meshy-player";
import type { HarvestMotion } from "./harvest-animation";
const toolModels = new Map<string, THREE.Group>();
export async function preloadHarvestTools() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    ["axe", "pickaxe"].map(async (kind) => {
      const { scene } = await loader.loadAsync(
        `/assets/harvest-tools/${kind}.glb`,
      );
      toolModels.set(kind, scene);
    }),
  );
}
export function createHarvestView() {
  const rig = createPlayerViewRig("pistol"),
    tools = new THREE.Group(),
    wood = new THREE.MeshStandardMaterial({ color: 0x885329, roughness: 0.5 }),
    steel = new THREE.MeshStandardMaterial({
      color: 0x8fabb1,
      metalness: 0.5,
      roughness: 0.28,
    }),
    dark = new THREE.MeshStandardMaterial({ color: 0x273639, roughness: 0.45 });
  tools.position.copy(rig.gun.root.position);
  tools.quaternion.copy(rig.gun.root.quaternion);
  rig.gun.root.parent!.add(tools);
  const axe = new THREE.Group(),
    pick = new THREE.Group();
  tools.add(axe, pick);
  for (const group of [axe, pick]) {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 0.72, 10),
      wood,
    );
    handle.position.y = 0.12;
    group.add(handle);
    for (const y of [-0.1, 0.0]) {
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.035, 10),
        dark,
      );
      grip.position.y = y;
      group.add(grip);
    }
  }
  const head = new THREE.Mesh(
    new RoundedBoxGeometry(0.06, 0.17, 0.26, 2, 0.018),
    steel,
  );
  head.position.set(0, 0.43, -0.08);
  axe.add(head);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.17, 0.025), dark);
  edge.position.set(0, 0.43, -0.21);
  axe.add(edge);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.29, 0.32, 0),
    new THREE.Vector3(-0.2, 0.45, 0),
    new THREE.Vector3(0, 0.48, 0),
    new THREE.Vector3(0.2, 0.45, 0),
    new THREE.Vector3(0.29, 0.32, 0),
  ]);
  pick.add(
    new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.027, 6, false), steel),
  );
  for (const [kind, group] of [
    ["axe", axe],
    ["pickaxe", pick],
  ] as const) {
    const template = toolModels.get(kind);
    if (!template) continue;
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    group.clear();
    const model = template.clone(true);
    // Exports use a Y-up haft and a grip-centered origin. Fit the existing
    // hand socket without stretching the approved head/handle proportions.
    model.scale.setScalar(0.58);
    group.add(model);
    group.userData.modelSource = "blender";
  }
  if (toolModels.size === 2) {
    wood.dispose();
    steel.dispose();
    dark.dispose();
  }
  axe.rotation.y = 0.35;
  pick.rotation.y = -0.12;
  tools.scale.setScalar(0.8);
  // Keep the winding tool hand ahead of the near plane throughout the swing.
  rig.root.position.set(0, -0.23, -0.45);
  rig.root.visible = false;
  let motion: HarvestMotion = "chop";
  return {
    root: rig.root,
    setAspect: (aspect: number) => {
      rig.setAspect(aspect);
      // Keep the wider reference-shaped heads inside a narrow phone view.
      rig.root.position.set(
        aspect < 0.8 ? -0.18 : 0,
        aspect < 0.8 ? -0.28 : -0.23,
        aspect < 0.8 ? -0.6 : -0.45,
      );
      tools.scale.setScalar(aspect < 0.8 ? 0.6 : 0.8);
    },
    animate(
      time: number,
      moving: boolean,
      kind: HarvestMotion,
      progress: number,
      dt: number,
    ) {
      motion = kind;
      rig.equip(true);
      rig.animate(time, moving, 0, {
        dt,
        shotSerial: 0,
        harvest: { kind, progress },
      } as PlayerAction);
      rig.gun.root.visible = false;
      tools.visible = true;
      axe.visible = motion === "chop";
      pick.visible = motion === "mine";
      rig.root.userData.harvestPose = rig.root.userData.usePose ?? "";
      rig.root.userData.harvestTool = kind === "chop" ? "axe" : "pickaxe";
      rig.root.userData.harvestModelSource =
        (kind === "chop" ? axe : pick).userData.modelSource ?? "fallback";
    },
  };
}
