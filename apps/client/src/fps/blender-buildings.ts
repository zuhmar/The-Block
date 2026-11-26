import {
  isCityApartments,
  apartmentDoors,
  apartmentDoorState,
} from "./city-apartments-layout";
import { isMart } from "./block-mart-layout";
import {
  preloadBlockMart,
  createBlockMart,
  createMartProxy,
} from "./block-mart-view";
import { JAIL_BUILDING_WALLS, JAIL_BUILDING_SLABS } from "./jail-kit-layout";
import * as THREE from "three";
import {
  BUILDINGS,
  frontOf,
  buildingDoorOffset,
  fixtures,
  partitions,
  buildingSlabs,
  buildingStories,
  buildingStairs,
  STORY_HEIGHT,
  DOOR_WIDTH,
  OPENING_WIDTH,
  WALL,
} from "./building-layout";
import { createBuildingModel } from "./building-models";
const URLS: Record<string, string> = {
  "north-main-lab": new URL(
    "./models/buildings/north-main-lab.glb",
    import.meta.url,
  ).href,
  "north-workshop": new URL(
    "./models/buildings/north-workshop.glb",
    import.meta.url,
  ).href,
  "north-warehouse": new URL(
    "./models/buildings/north-warehouse.glb",
    import.meta.url,
  ).href,
  "north-secondary-lab": new URL(
    "./models/buildings/north-secondary-lab.glb",
    import.meta.url,
  ).href,
  "north-packing": new URL(
    "./models/buildings/north-packing.glb",
    import.meta.url,
  ).href,
  "north-security": new URL(
    "./models/buildings/north-security.glb",
    import.meta.url,
  ).href,
  "north-staff": new URL("./models/buildings/north-staff.glb", import.meta.url)
    .href,
  "district-diner": new URL(
    "./models/buildings/district-diner.glb",
    import.meta.url,
  ).href,
  "district-market": new URL(
    "./models/buildings/district-market.glb",
    import.meta.url,
  ).href,
  "district-garage": new URL(
    "./models/buildings/district-garage.glb",
    import.meta.url,
  ).href,
  "district-duplex": new URL(
    "./models/buildings/district-duplex.glb",
    import.meta.url,
  ).href,
  "district-clinic": new URL(
    "./models/buildings/district-clinic.glb",
    import.meta.url,
  ).href,
  "district-offices": new URL(
    "./models/buildings/district-offices.glb",
    import.meta.url,
  ).href,

  "military-command": new URL(
    "./models/buildings/military-command.glb",
    import.meta.url,
  ).href,
  "military-barracks": new URL(
    "./models/buildings/military-barracks.glb",
    import.meta.url,
  ).href,
  "military-hangar": new URL(
    "./models/buildings/military-hangar.glb",
    import.meta.url,
  ).href,
  "military-tent": new URL(
    "./models/buildings/military-tent.glb",
    import.meta.url,
  ).href,
  "military-medical": new URL(
    "./models/buildings/military-medical.glb",
    import.meta.url,
  ).href,

  flats: new URL("./models/buildings/flats.glb", import.meta.url).href,
  "city-apartments": new URL(
    "./models/city-apartments/city-apartments.glb",
    import.meta.url,
  ).href,
  tenement: new URL("./models/tenement-v2/tenement.glb", import.meta.url).href,
  jail: new URL("./models/buildings/jail.glb", import.meta.url).href,
  store: new URL("./models/buildings/store.glb", import.meta.url).href,
  shelter: new URL("./models/buildings/shelter.glb", import.meta.url).href,
  workshop: new URL("./models/buildings/workshop.glb", import.meta.url).href,
  home: new URL("./models/buildings/home.glb", import.meta.url).href,
  warehouse: new URL("./models/meshy-warehouse/warehouse.glb", import.meta.url)
    .href,
};
const proxyGeometry = new THREE.BoxGeometry(1, 1, 1),
  proxyMaterial = new THREE.MeshBasicMaterial();
/** Low-detail shooting geometry matches the existing physical layout, never rendered. */
export function createBuildingShotProxy(index: number) {
  if (isMart(BUILDINGS[index])) return createMartProxy(index);
  const b = BUILDINGS[index],
    front = frontOf(b),
    root = new THREE.Group(),
    door = new THREE.Group();
  root.name = "building-shot-proxy";
  function box(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    doorIndex?: number,
  ) {
    const m = new THREE.Mesh(proxyGeometry, proxyMaterial);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.visible = false;
    if (doorIndex !== undefined) m.userData.doorIndex = doorIndex;
    parent.add(m);
    return m;
  }
  if (b.type === "jail") {
    for (const w of JAIL_BUILDING_WALLS)
      box(root, w.x, w.y + w.height / 2, w.z, w.width, w.height, w.depth);
    for (const slab of JAIL_BUILDING_SLABS) {
      box(root, slab.x, 5.55, slab.z, slab.width, 0.15, slab.depth);
      box(root, slab.x, 0.007, slab.z, slab.width, 0.025, slab.depth);
    }
  } else {
    for (const x of [-b.width / 2, b.width / 2])
      box(root, x, b.height / 2, 0, WALL, b.height, b.depth);
    box(root, 0, b.height / 2, (-front * b.depth) / 2, b.width, b.height, WALL);
    const sideWidth = (b.width - OPENING_WIDTH) / 2;
    for (const side of [-1, 1])
      box(
        root,
        side * (OPENING_WIDTH / 2 + sideWidth / 2),
        b.height / 2,
        (front * b.depth) / 2,
        sideWidth,
        b.height,
        WALL,
      );
    box(
      root,
      0,
      (b.height + 2.85) / 2,
      (front * b.depth) / 2,
      OPENING_WIDTH,
      b.height - 2.85,
      WALL,
    );
    if (!isCityApartments(b))
      box(
        root,
        0,
        buildingStories(b) > 1 ? b.height : 3.25,
        0,
        b.width,
        buildingStories(b) > 1 ? 0.18 : 0.1,
        b.depth,
      );
    box(root, 0, 0.007, 0, b.width, 0.025, b.depth);
  }
  door.position.set(-DOOR_WIDTH / 2, 0, buildingDoorOffset(b));
  root.add(door);
  const doorPanel = box(
    door,
    DOOR_WIDTH / 2,
    1.4,
    0,
    DOOR_WIDTH,
    2.8,
    0.14,
    index,
  );
  for (const f of fixtures(index)) {
    const height = {
      shelf: 1.95,
      rack: 2.65,
      bed: 0.8,
      bench: 1,
      table: 0.95,
      counter: 1.15,
      fridge: 2.3,
      cabinet: 1.9,
      sofa: 1.1,
      kitchen: 1.35,
      pallet: 1,
      workbench: 2.25,
    }[f.kind];
    box(root, f.x, (f.y ?? 0) + height / 2, f.z, f.width, height, f.depth);
  }
  for (const p of partitions(index))
    box(root, p.x, (p.y ?? 0) + p.height / 2, p.z, p.width, p.height, p.depth);
  for (const slab of buildingSlabs(index))
    box(root, slab.x, slab.y - 0.09, slab.z, slab.width, 0.18, slab.depth);
  const stairSteps = isCityApartments(b) ? 20 : 16;
  for (const stair of buildingStairs(index))
    for (let step = 0; step < stairSteps; step++) {
      const height = ((step + 1) / stairSteps) * STORY_HEIGHT;
      box(
        root,
        stair.x,
        stair.y + height - 0.1,
        stair.startZ - (front * (step + 0.5) * stair.run) / stairSteps,
        stair.width,
        0.2,
        stair.run / stairSteps,
      );
    }
  const apartmentHinges: THREE.Group[] = [];
  if (isCityApartments(b)) {
    apartmentDoors.forEach((d, id) => {
      const frame = new THREE.Group();
      frame.position.set(d.x, d.y, d.z);
      frame.rotation.y = d.yaw;
      root.add(frame);
      const hinge = new THREE.Group();
      frame.add(hinge);
      apartmentHinges.push(hinge);
      const panel = box(
        hinge,
        d.width / 2,
        d.height / 2,
        0,
        d.width,
        d.height,
        0.14,
        index,
      );
      panel.userData.apartmentDoorId = id;
    });
    box(root, 7.65, 12.62, -0.8, 2.7, 0.24, 10.85);
  }
  // Match the bedroom partition from the same source as player collision.
  return { root, door, doorPanel, apartmentHinges };
}
const loaded = new Map<number, THREE.Group>();
let tenementLod: THREE.Group | undefined;
let apartmentLod: THREE.Group | undefined;
let apartmentTemplate: THREE.Group | undefined;
export async function preloadBlenderBuildings() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled([
    preloadBlockMart(),
    loader.loadAsync(URLS["city-apartments"]).then((g) => {
      apartmentTemplate = g.scene;
    }),
    loader
      .loadAsync(
        new URL(
          "./models/city-apartments/city-apartments-lod.glb",
          import.meta.url,
        ).href,
      )
      .then((g) => {
        apartmentLod = g.scene;
      }),
    loader
      .loadAsync(
        new URL("./models/tenement-v2/tenement-lod.glb", import.meta.url).href,
      )
      .then((gltf) => {
        tenementLod = gltf.scene;
      }),
    ...BUILDINGS.map(async (b, index) => {
      const gltf = await loader.loadAsync(URLS[b.type]);
      loaded.set(index, gltf.scene);
    }),
  ]);
}
export function loadBlenderBuilding(
  index: number,
  geometry: THREE.BoxGeometry,
  makeSign: (text: string, w: number, h: number) => THREE.Mesh,
) {
  if (isMart(BUILDINGS[index])) return createBlockMart(index);
  const b = BUILDINGS[index],
    proxy = createBuildingShotProxy(index);
  try {
    let root =
      loaded.get(index) ??
      (isCityApartments(b) ? apartmentTemplate?.clone(true) : undefined) ??
      loaded
        .get(BUILDINGS.findIndex((other) => other.type === b.type))
        ?.clone(true);
    if (!root) throw Error("Building asset unavailable");
    const door = root.getObjectByName(b.type + "-door-hinge");
    if (!door) throw Error("Missing animated building door");
    const additionalDoors: THREE.Object3D[] = [];
    if (b.type === "tenement" || isCityApartments(b)) {
      let version: string | undefined;
      root.traverse((o) => {
        version ??= o.userData.assetVersion;
      });
      const lodTemplate = isCityApartments(b) ? apartmentLod : tenementLod;
      if (lodTemplate) {
        const low = lodTemplate.clone(true),
          lowDoor = low.getObjectByName(b.type + "-door-hinge");
        if (lowDoor) {
          const lod = new THREE.LOD();
          lod.addLevel(root, 0);
          lod.addLevel(low, 50);
          const wrapper = new THREE.Group();
          wrapper.add(lod);
          root = wrapper;
          additionalDoors.push(lowDoor);
        }
      }
      root.userData.assetVersion = version;
    }
    const apartment = isCityApartments(b)
      ? {
          update: () => {
            apartmentDoorState(index).angles.forEach((angle, id) => {
              const h = root?.getObjectByName("apartment-door-" + id);
              if (h) h.rotation.y = angle;
              if ("apartmentHinges" in proxy)
                proxy.apartmentHinges[id].rotation.y = angle;
            });
            root?.updateMatrixWorld(true);
            proxy.root.updateMatrixWorld(true);
          },
        }
      : undefined;
    if (apartment)
      apartmentDoors.forEach((_, id) =>
        root?.getObjectByName("apartment-door-" + id)?.traverse((o) => {
          o.userData.dynamicDoor = true;
          o.userData.doorIndex = index;
          o.userData.apartmentDoorId = id;
        }),
      );
    let doorPanel: THREE.Mesh | undefined;
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.userData.part === "interior") o.userData.interiorBuilding = index;
      if (o.userData.part === "door") {
        o.userData.dynamicDoor = true;
        o.userData.doorIndex = index;
        doorPanel ??= o;
      }
    });
    if (!doorPanel) throw Error("Missing building door leaf");
    return {
      root,
      door,
      doorPanel,
      shotRoot: proxy.root,
      shotDoor: proxy.door,
      source: "blender",
      additionalDoors,
      apartment,
      mart: undefined,
    };
  } catch {
    const fallback =
      b.type === "jail"
        ? createBuildingShotProxy(index)
        : createBuildingModel(index, geometry, makeSign);
    if (b.type === "jail")
      fallback.root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.visible = true;
          o.material = new THREE.MeshStandardMaterial({
            color: 0x66788c,
            roughness: 0.4,
          });
        }
      });
    return {
      ...fallback,
      shotRoot: proxy.root,
      shotDoor: proxy.door,
      source: "fallback",
      additionalDoors: [] as THREE.Object3D[],
      mart: undefined,
    };
  }
}
