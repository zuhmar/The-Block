import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { primitiveModel } from "./primitives";
import { CATALOG, type CatalogAsset } from "./catalog";
import { snap, type MapDocument, type MapObject } from "./document";
type Part = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  matrix: THREE.Matrix4;
  roof: boolean;
};
type Loaded = { parts: Part[]; bounds: THREE.Box3 };
export class EditorViewport {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2600);
  readonly orbit: OrbitControls;
  readonly transform: TransformControls;
  readonly selected = new Set<string>();
  hiddenLayers = new Set<string>();
  mode: "select" | "place" | "road" | "coast" = "select";
  snapStep = 2;
  snapEnabled = true;
  height = 0;
  onSurfaces = false;
  hideRoofs = false;
  sectionHeight: number | undefined;
  coastIndex: number | undefined;
  private terrain = new THREE.Group();
  private objects = new THREE.Group();
  private coastPoints = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: 0xffbd68,
      size: 9,
      sizeAttenuation: false,
    }),
  );
  private grid = new THREE.GridHelper(640, 320, 0x9ea582, 0x81927b);
  private pivot = new THREE.Object3D();
  private outline = new THREE.Box3Helper(new THREE.Box3(), 0xffbe69);
  private collisions = new THREE.Group();
  private showCollisions = false;
  private cache = new Map<string, Loaded>();
  private pending = new Map<string, Promise<void>>();
  private failed = new Set<string>();
  private custom = new Map<string, ArrayBuffer>();
  private refs = new Map<
    string,
    { mesh: THREE.InstancedMesh; index: number; local: THREE.Matrix4 }[]
  >();
  private loader = new GLTFLoader();
  private ray = new THREE.Raycaster();
  private cursor = new THREE.Vector2();
  private frame = 0;
  private rebuildFrame = 0;
  private pointer = new Map<number, { x: number; y: number; skip: boolean }>();
  private multiPointer = false;
  private dragBefore: MapDocument | undefined;
  private originals = new Map<string, THREE.Matrix4>();
  private startPivot = new THREE.Matrix4();
  private coastBefore: MapDocument | undefined;
  private ghost = new THREE.Group();
  private ghostMaterial = new THREE.MeshBasicMaterial({
    color: 0xffbe69,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  private ghostAsset: CatalogAsset | undefined;
  private ghostYaw = 0;
  private ghostScale: [number, number, number] = [1, 1, 1];
  private ghostPoint = new THREE.Vector3();
  constructor(
    readonly canvas: HTMLCanvasElement,
    private doc: () => MapDocument,
    private picked: (id: string | undefined, multi: boolean) => void,
    private placed: (point: THREE.Vector3) => void,
    private changed: (before: MapDocument) => void,
    private notify: (message: string) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.setClearColor(0x799ba3);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.scene.add(new THREE.HemisphereLight(0xe6f0fa, 0x465a31, 2.2));
    const sun = new THREE.DirectionalLight(0xffe1b2, 2.2);
    sun.position.set(-90, 160, 70);
    this.scene.add(sun);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshStandardMaterial({ color: 0x3e87a2, roughness: 0.6 }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.22;
    this.scene.add(
      sea,
      this.terrain,
      this.objects,
      this.pivot,
      this.outline,
      this.collisions,
      this.ghost,
      this.coastPoints,
    );
    this.grid.position.y = 0.025;
    this.scene.add(this.grid);
    this.coastPoints.visible = false;
    this.ray.params.Points.threshold = 2;
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.orbit.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.minDistance = 3;
    this.orbit.maxDistance = 1300;
    this.orbit.addEventListener("change", () => this.render());
    this.transform = new TransformControls(this.camera, canvas);
    this.transform.setSpace("world");
    this.scene.add(this.transform.getHelper());
    this.transform.addEventListener("change", () => this.render());
    this.transform.addEventListener("dragging-changed", (event) => {
      this.orbit.enabled = !event.value;
      if (event.value) {
        this.dragBefore = structuredClone(this.doc());
        this.originals.clear();
        for (const o of this.doc().objects)
          if (this.selected.has(o.id)) this.originals.set(o.id, this.matrix(o));
        this.startPivot.copy(this.pivot.matrixWorld).invert();
      } else if (this.dragBefore) {
        const before = this.dragBefore;
        this.dragBefore = undefined;
        this.changed(before);
      }
    });
    this.transform.addEventListener("objectChange", () => {
      if (!this.dragBefore) return;
      this.pivot.updateMatrixWorld(true);
      const delta = new THREE.Matrix4().multiplyMatrices(
        this.pivot.matrixWorld,
        this.startPivot,
      );
      for (const o of this.doc().objects) {
        const original = this.originals.get(o.id);
        if (!original) continue;
        const m = new THREE.Matrix4().multiplyMatrices(delta, original),
          p = new THREE.Vector3(),
          q = new THREE.Quaternion(),
          s = new THREE.Vector3();
        m.decompose(p, q, s);
        o.x = THREE.MathUtils.clamp(p.x, -320, 320);
        o.y = THREE.MathUtils.clamp(p.y, -10, 80);
        o.z = THREE.MathUtils.clamp(p.z, -320, 320);
        o.yaw = THREE.MathUtils.radToDeg(
          new THREE.Euler().setFromQuaternion(q, "YXZ").y,
        );
        o.scale = [s.x, s.y, s.z].map((n) =>
          THREE.MathUtils.clamp(Math.abs(n), 0.05, 640),
        ) as [number, number, number];
        this.updateObject(o);
      }
      this.updateOutline();
      this.render();
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (this.pointer.size) this.multiPointer = true;
      this.pointer.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        skip: this.transform.axis !== null || e.button !== 0,
      });
      if (this.mode === "coast" && e.button === 0) {
        this.setRay(e);
        const hit = this.ray.intersectObject(this.coastPoints)[0];
        if (hit?.index !== undefined) {
          this.coastIndex = hit.index;
          this.coastBefore = structuredClone(this.doc());
          this.orbit.enabled = false;
        }
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      const point = this.point(e);
      if (!point) return;
      this.ghostPoint.copy(point);
      this.positionGhost();
      if (this.coastBefore && this.coastIndex !== undefined) {
        this.doc().coast[this.coastIndex] = { x: point.x, z: point.z };
        this.rebuildCoast();
      }
      this.render();
    });
    canvas.addEventListener("pointerup", (e) => {
      const start = this.pointer.get(e.pointerId);
      this.pointer.delete(e.pointerId);
      if (this.coastBefore) {
        const before = this.coastBefore;
        this.coastBefore = undefined;
        this.orbit.enabled = true;
        this.changed(before);
      } else if (
        start &&
        !start.skip &&
        !this.multiPointer &&
        Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6
      ) {
        this.setRay(e);
        if (this.mode === "coast") {
          if (e.shiftKey) {
            const point = this.point(e);
            if (point) this.insertCoast(point);
          }
        } else if (this.mode === "select") {
          const hit = this.ray.intersectObjects(
            this.objects.children,
            false,
          )[0];
          const id =
            hit?.instanceId !== undefined
              ? (hit.object.userData.ids[hit.instanceId] as string)
              : undefined;
          this.picked(id, e.shiftKey);
        } else {
          const point = this.point(e);
          if (point) this.placed(point);
        }
      }
      if (!this.pointer.size) this.multiPointer = false;
    });
    canvas.addEventListener("pointercancel", () => {
      this.pointer.clear();
      this.multiPointer = false;
      if (this.coastBefore) {
        this.changed(this.coastBefore);
        this.coastBefore = undefined;
      }
      this.orbit.enabled = true;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.city();
    this.resize();
  }
  setCustom(assets: Map<string, ArrayBuffer>) {
    this.custom = assets;
    for (const key of [...this.cache.keys()])
      if (key.startsWith("custom:")) this.cache.delete(key);
  }
  asset(id: string): CatalogAsset | undefined {
    return (
      CATALOG.find((a) => a.id === id) ??
      (this.custom.has(id)
        ? {
            id,
            name:
              this.doc().assets.find((a) => a.id === id)?.name ??
              "Custom model",
            layer: "Props",
            behavior: "solid",
          }
        : undefined)
    );
  }
  private matrix(o: MapObject) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(o.x, o.y, o.z),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(o.yaw),
      ),
      new THREE.Vector3(...o.scale),
    );
  }
  private async load(asset: CatalogAsset) {
    if (
      this.cache.has(asset.id) ||
      this.pending.has(asset.id) ||
      this.failed.has(asset.id)
    )
      return;
    const task = (async () => {
      await Promise.resolve();
      try {
        let root: THREE.Object3D;
        if (asset.primitive) root = primitiveModel(asset.primitive);
        else if (this.custom.has(asset.id))
          root = (
            await this.loader.parseAsync(
              this.custom.get(asset.id)!.slice(0),
              "",
            )
          ).scene;
        else root = (await this.loader.loadAsync(asset.url!)).scene;
        root.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(root),
          center = bounds.getCenter(new THREE.Vector3());
        const anchor = asset.anchor ?? [center.x, bounds.min.y, center.z];
        root.position.sub(new THREE.Vector3(...anchor));
        root.updateMatrixWorld(true);
        const parts: Part[] = [];
        root.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          let geometry = o.geometry;
          if (o instanceof THREE.SkinnedMesh) {
            geometry = geometry.clone();
            const a = geometry.attributes.position,
              v = new THREE.Vector3();
            for (let i = 0; i < a.count; i++) {
              v.fromBufferAttribute(a, i);
              o.applyBoneTransform(i, v);
              a.setXYZ(i, v.x, v.y, v.z);
            }
            geometry.computeVertexNormals();
          }
          parts.push({
            geometry,
            material: o.material,
            matrix: o.matrixWorld.clone(),
            roof: o.userData.part === "roof",
          });
        });
        this.cache.set(asset.id, {
          parts,
          bounds: new THREE.Box3().setFromObject(root),
        });
        this.requestRebuild();
      } catch {
        this.failed.add(asset.id);
        this.notify(
          "Could not load " +
            asset.name +
            ". A placeholder remains; export keeps the asset reference.",
        );
      } finally {
        this.pending.delete(asset.id);
      }
    })();
    this.pending.set(asset.id, task);
  }
  private requestRebuild() {
    if (!this.rebuildFrame)
      this.rebuildFrame = requestAnimationFrame(() => {
        this.rebuildFrame = 0;
        this.rebuild();
      });
  }
  rebuild() {
    for (const child of this.objects.children)
      if (child instanceof THREE.InstancedMesh) {
        child.dispose();
        if (child.userData.ownedMaterial)
          (Array.isArray(child.material)
            ? child.material
            : [child.material]
          ).forEach((m) => m.dispose());
      }
    this.objects.clear();
    this.refs.clear();
    const groups = new Map<
      string,
      {
        part: Part;
        items: { id: string; matrix: THREE.Matrix4; local: THREE.Matrix4 }[];
      }
    >();
    for (const o of this.doc().objects) {
      if (!o.visible || this.hiddenLayers.has(o.layer)) continue;
      const a = this.asset(o.asset);
      if (!a) continue;
      void this.load(a);
      const loaded = this.cache.get(o.asset),
        world = this.matrix(o);
      let parts = loaded?.parts;
      if (!parts) {
        const placeholder = this.placeholder(a);
        parts = placeholder.parts;
      }
      for (const part of parts) {
        if (this.hideRoofs && part.roof) continue;
        const materials = Array.isArray(part.material)
          ? part.material
          : [part.material];
        const materialKey = materials.map((m) => m.uuid).join("-");
        const key = part.geometry.uuid + materialKey + o.color;
        let group = groups.get(key);
        if (!group) {
          let material = part.material;
          if (o.color !== "#ffffff") {
            material = materials.map((m) => {
              const copy = m.clone();
              if (copy instanceof THREE.MeshStandardMaterial)
                copy.color.multiply(new THREE.Color(o.color));
              return copy;
            });
            if (!Array.isArray(part.material)) material = material[0];
          }
          group = { part: { ...part, material }, items: [] };
          groups.set(key, group);
        }
        group.items.push({
          id: o.id,
          matrix: new THREE.Matrix4().multiplyMatrices(world, part.matrix),
          local: part.matrix,
        });
      }
    }
    for (const { part, items } of groups.values()) {
      const batch = new THREE.InstancedMesh(
        part.geometry,
        part.material,
        items.length,
      );
      batch.frustumCulled = false;
      batch.userData.ownedMaterial = items.some(
        (item) =>
          this.doc().objects.find((o) => o.id === item.id)?.color !== "#ffffff",
      );
      batch.userData.ids = items.map((i) => i.id);
      items.forEach((item, index) => {
        batch.setMatrixAt(index, item.matrix);
        if (!this.refs.has(item.id)) this.refs.set(item.id, []);
        this.refs.get(item.id)!.push({ mesh: batch, index, local: item.local });
      });
      this.objects.add(batch);
    }
    this.rebuildCoast();
    this.updateSelection();
    this.refreshGhost();
    this.render();
  }
  private placeholders = new Map<string, Loaded>();
  private placeholder(a: CatalogAsset) {
    if (!this.placeholders.has(a.id)) {
      const size = a.size ?? [1, 1, 1],
        g = new THREE.BoxGeometry(...size),
        m = new THREE.MeshStandardMaterial({
          color: 0x7c8173,
          wireframe: true,
        });
      this.placeholders.set(a.id, {
        parts: [
          {
            geometry: g,
            material: m,
            matrix: new THREE.Matrix4().makeTranslation(0, size[1] / 2, 0),
            roof: false,
          },
        ],
        bounds: new THREE.Box3(
          new THREE.Vector3(-size[0] / 2, 0, -size[2] / 2),
          new THREE.Vector3(size[0] / 2, size[1], size[2] / 2),
        ),
      });
    }
    return this.placeholders.get(a.id)!;
  }
  updateObject(o: MapObject) {
    for (const ref of this.refs.get(o.id) ?? []) {
      ref.mesh.setMatrixAt(
        ref.index,
        new THREE.Matrix4().multiplyMatrices(this.matrix(o), ref.local),
      );
      ref.mesh.instanceMatrix.needsUpdate = true;
    }
    this.render();
  }
  private bounds(o: MapObject) {
    const a = this.asset(o.asset);
    return (this.cache.get(o.asset) ?? (a && this.placeholder(a)))?.bounds
      .clone()
      .applyMatrix4(this.matrix(o));
  }
  setSelection(ids: Iterable<string>) {
    this.selected.clear();
    for (const id of ids) this.selected.add(id);
    this.updateSelection();
    this.render();
  }
  updateSelection() {
    this.transform.detach();
    const selected = this.doc().objects.filter((o) => this.selected.has(o.id));
    if (
      selected.length &&
      !selected.some((o) => o.locked) &&
      this.mode === "select"
    ) {
      const center = selected
        .reduce(
          (p, o) => p.add(new THREE.Vector3(o.x, o.y, o.z)),
          new THREE.Vector3(),
        )
        .divideScalar(selected.length);
      this.pivot.position.copy(center);
      this.pivot.rotation.set(0, 0, 0);
      this.pivot.scale.setScalar(1);
      this.pivot.updateMatrixWorld(true);
      this.transform.attach(this.pivot);
    }
    this.updateOutline();
  }
  private updateOutline() {
    const box = new THREE.Box3();
    for (const o of this.doc().objects)
      if (this.selected.has(o.id)) {
        const bounds = this.bounds(o);
        if (bounds) box.union(bounds);
      }
    this.outline.box.copy(box);
    this.outline.visible = !box.isEmpty();
    this.outline.updateMatrixWorld(true);
    this.updateCollisions();
  }
  setTransform(mode: "translate" | "rotate" | "scale") {
    if (mode === "scale" && this.selected.size > 1) {
      this.notify(
        "Scale one object at a time. Group move and rotate are supported.",
      );
      return;
    }
    this.transform.setMode(mode);
    this.transform.showX = mode !== "rotate";
    this.transform.showY = true;
    this.transform.showZ = mode !== "rotate";
    this.configureSnap();
  }
  configureSnap() {
    this.transform.setTranslationSnap(this.snapEnabled ? this.snapStep : null);
    this.transform.setRotationSnap(this.snapEnabled ? Math.PI / 12 : null);
    this.transform.setScaleSnap(this.snapEnabled ? 0.1 : null);
    if (this.grid) {
      const visible = this.grid.visible;
      this.grid.removeFromParent();
      this.grid.geometry.dispose();
      (Array.isArray(this.grid.material)
        ? this.grid.material
        : [this.grid.material]
      ).forEach((m) => m.dispose());
      this.grid = new THREE.GridHelper(
        640,
        Math.round(640 / Math.max(0.5, this.snapStep)),
        0xc4b089,
        0x859477,
      );
      this.grid.position.y = 0.025;
      this.grid.visible = visible;
      this.scene.add(this.grid);
    }
    this.render();
  }
  setGrid(visible: boolean) {
    this.grid.visible = visible;
    this.render();
  }
  setSection(height: number | undefined) {
    this.sectionHeight = height;
    this.renderer.clippingPlanes =
      height === undefined
        ? []
        : [new THREE.Plane(new THREE.Vector3(0, -1, 0), height)];
    this.render();
  }
  setCollisions(value: boolean) {
    this.showCollisions = value;
    this.updateCollisions();
    this.render();
  }
  private updateCollisions() {
    for (const o of this.collisions.children) {
      if (o instanceof THREE.Box3Helper) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    }
    this.collisions.clear();
    if (this.showCollisions)
      for (const o of this.doc().objects)
        if (o.visible && o.solid && !this.hiddenLayers.has(o.layer)) {
          const bounds = this.bounds(o);
          if (bounds)
            this.collisions.add(new THREE.Box3Helper(bounds, 0xff9069));
        }
  }
  private setRay(e: { clientX: number; clientY: number }) {
    const r = this.canvas.getBoundingClientRect();
    this.cursor.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.cursor, this.camera);
  }
  private point(e: { clientX: number; clientY: number }) {
    this.setRay(e);
    let point: THREE.Vector3 | undefined;
    if (this.onSurfaces && this.mode !== "coast") {
      const hit = this.ray
        .intersectObjects(this.objects.children, false)
        .find((h) => {
          if (!h.face || h.instanceId === undefined) return false;
          const matrix = new THREE.Matrix4();
          (h.object as THREE.InstancedMesh).getMatrixAt(h.instanceId, matrix);
          return h.face.normal.clone().transformDirection(matrix).y > 0.5;
        });
      if (hit)
        point = hit.point.clone().add(new THREE.Vector3(0, this.height, 0));
    }
    point ??=
      this.ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.height),
        new THREE.Vector3(),
      ) ?? undefined;
    if (!point || Math.abs(point.x) > 320 || Math.abs(point.z) > 320) return;
    const s = this.snapEnabled ? this.snapStep : 0;
    if (s) {
      point.x = snap(point.x, s);
      point.z = snap(point.z, s);
    }
    return point;
  }
  setGhost(
    asset: CatalogAsset | undefined,
    yaw = 0,
    scale?: [number, number, number],
  ) {
    this.ghostAsset = asset;
    this.ghostYaw = yaw;
    this.ghostScale = scale ?? asset?.scale ?? [1, 1, 1];
    if (asset) void this.load(asset);
    this.refreshGhost();
  }
  private refreshGhost() {
    this.ghost.clear();
    if (this.ghostAsset) {
      const loaded =
        this.cache.get(this.ghostAsset.id) ?? this.placeholder(this.ghostAsset);
      for (const p of loaded.parts) {
        const mesh = new THREE.Mesh(p.geometry, this.ghostMaterial);
        mesh.applyMatrix4(p.matrix);
        this.ghost.add(mesh);
      }
    }
    this.ghost.visible =
      !!this.ghostAsset && (this.mode === "place" || this.mode === "road");
    this.positionGhost();
  }
  private positionGhost() {
    this.ghost.position.copy(this.ghostPoint);
    this.ghost.rotation.y = THREE.MathUtils.degToRad(this.ghostYaw);
    this.ghost.scale.set(...this.ghostScale);
  }
  setMode(mode: typeof this.mode) {
    this.mode = mode;
    this.coastPoints.visible = mode === "coast";
    this.ghost.visible =
      !!this.ghostAsset && (mode === "place" || mode === "road");
    this.updateSelection();
    this.render();
  }
  rebuildCoast() {
    for (const child of this.terrain.children)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    this.terrain.clear();
    const shape = new THREE.Shape();
    this.doc().coast.forEach((p, i) =>
      i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z),
    );
    shape.closePath();
    const land = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({ color: 0x819b5d, roughness: 0.9 }),
    );
    land.rotation.x = -Math.PI / 2;
    land.position.y = -0.04;
    this.terrain.add(land);
    const vertices = this.doc().coast.flatMap((p) => [p.x, 0.15, p.z]);
    this.coastPoints.geometry.dispose();
    this.coastPoints.geometry = new THREE.BufferGeometry();
    this.coastPoints.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    this.render();
  }
  private insertCoast(point: THREE.Vector3) {
    const d = this.doc();
    if (d.coast.length >= 256) {
      this.notify("Shoreline limit: 256 points");
      return;
    }
    let index = 0,
      best = Infinity,
      nearest = { x: 0, z: 0 };
    for (let i = 0; i < d.coast.length; i++) {
      const a = d.coast[i],
        b = d.coast[(i + 1) % d.coast.length],
        dx = b.x - a.x,
        dz = b.z - a.z,
        t = THREE.MathUtils.clamp(
          ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz),
          0,
          1,
        ),
        x = a.x + t * dx,
        z = a.z + t * dz,
        distance = Math.hypot(x - point.x, z - point.z);
      if (distance < best) {
        best = distance;
        index = i;
        nearest = { x, z };
      }
    }
    const before = structuredClone(d);
    d.coast.splice(index + 1, 0, nearest);
    this.coastIndex = index + 1;
    this.changed(before);
  }
  removeCoastPoint() {
    if (this.coastIndex === undefined || this.doc().coast.length <= 6) return;
    const before = structuredClone(this.doc());
    this.doc().coast.splice(this.coastIndex, 1);
    this.coastIndex = undefined;
    this.changed(before);
  }
  city() {
    this.orbit.target.set(0, 0, 0);
    this.camera.position.set(95, 110, 135);
    this.orbit.update();
    this.render();
  }
  fit() {
    this.orbit.target.set(0, 0, 0);
    this.camera.position.set(410, 470, 500);
    this.orbit.update();
    this.render();
  }
  top() {
    const target = this.orbit.target.clone();
    const distance = Math.max(25, this.camera.position.distanceTo(target));
    this.camera.position.copy(target).add(new THREE.Vector3(0, distance, 0.01));
    this.orbit.update();
    this.render();
  }
  focus() {
    const box = new THREE.Box3();
    for (const o of this.doc().objects)
      if (this.selected.has(o.id)) {
        const b = this.bounds(o);
        if (b) box.union(b);
      }
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3()).length();
    this.orbit.target.copy(center);
    this.camera.position
      .copy(center)
      .add(
        new THREE.Vector3(1, 1.2, 1.5)
          .normalize()
          .multiplyScalar(Math.max(8, size * 1.7)),
      );
    this.orbit.update();
    this.render();
  }
  render() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.renderer.render(this.scene, this.camera);
      this.canvas.dataset.editor = JSON.stringify({
        objects: this.doc().objects.length,
        selected: [...this.selected],
        mode: this.mode,
        loaded: this.cache.size,
        loading: this.pending.size,
        failed: [...this.failed],
        drawCalls: this.renderer.info.render.calls,
      });
    });
  }
  private resize() {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
}
