import "./editor.css";
import { CATALOG, KNOWN_ASSETS, newMap, type CatalogAsset } from "./catalog";
import {
  BEHAVIORS,
  LAYERS,
  MapHistory,
  makeObject,
  validateMap,
  validateGlb,
  MAX_OBJECTS,
  MAX_CUSTOM_ASSETS,
  MAX_ASSET_TOTAL,
  type MapDocument,
  type MapObject,
} from "./document";
import {
  loadDraft,
  saveDraft,
  exportBundle,
  importBundle,
  download,
} from "./storage";
import { EditorViewport } from "./viewport";
import type { Vector3 } from "three";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<header><div class="brand"><b>STREET SURVIVAL</b><small>WORLD WORKSHOP · SEPARATE MAP EDITOR</small></div><input id="project" aria-label="Map name" maxlength="80"><span id="status" role="status">Loading draft…</span><button id="save">Save draft</button><button id="export" class="primary">Export ZIP</button><button id="json">JSON</button><button id="import">Import map</button><a href="/" target="_blank" rel="noopener">Open game ↗</a></header>
<nav aria-label="Editor tools"><button id="catalog-toggle">Catalog</button><button id="select" class="active">Select</button><button id="turn">Turn 90°</button><button id="road">Draw roads</button><button id="coast">Shoreline</button><span class="divider"></span><button id="move">Move</button><button id="rotate">Rotate</button><button id="scale">Scale</button><button id="undo">Undo</button><button id="redo">Redo</button><button id="duplicate">Duplicate</button><button id="delete">Delete</button><span class="divider"></span><button id="city">City</button><button id="fit">Whole map</button><button id="top">Top</button><button id="focus">Focus</button><button id="properties-toggle">Properties</button><button id="help">Help</button></nav>
<div class="workspace"><aside id="catalog-panel"><div class="panel-title">ASSET LIBRARY <button id="close-catalog" aria-label="Close catalog">×</button></div><input id="search" placeholder="Search assets / objects" aria-label="Search assets or objects"><select id="category" aria-label="Asset category"><option>All assets</option>${LAYERS.map((l) => `<option>${l}</option>`).join("")}<option>Custom models</option><option>Scene objects</option></select><div class="new-controls"><button id="new-current">Current map</button><button id="new-blank">Blank island</button></div><button id="add-glb">＋ Import GLB model</button><div id="asset-list"></div><small class="quiet">Compact city + jail island · up to 2,000 objects<br>Original models + reusable map prefabs</small></aside>
<main><div class="settings"><label><input type="checkbox" id="snap" checked> Snap</label><label>Grid <select id="step"><option>.5</option><option>1</option><option selected>2</option><option>4</option><option>8</option><option>16</option></select> m</label><label>Height <input type="number" id="height" value="0" min="-10" max="80" step=".25"></label><label><input id="surface" type="checkbox"> On surfaces</label><label><input id="grid" type="checkbox"> Grid</label><label><input id="roofs" type="checkbox"> Hide roofs</label><label><input id="collision" type="checkbox"> Solid bounds</label><label>Cutaway <input id="section" type="number" min="0" max="80" placeholder="off" step=".5"></label></div><div id="viewport"><canvas id="canvas" aria-label="3D map editor. Drag to pan, right drag to orbit, scroll to zoom."></canvas><div class="viewport-label"><b id="mode-label">SELECT & ARRANGE</b><span id="count"></span></div><div id="toast" role="status"></div></div><footer id="hint">Drag to pan · Right drag to orbit · Scroll to zoom · Shift-click to select several</footer></main>
<aside id="properties-panel"><div class="panel-title">INSPECTOR <button id="close-properties" aria-label="Close properties">×</button></div><div id="inspector"></div><div class="panel-title">LAYERS</div><div id="layers"></div><p class="quiet">Behavior and solid bounds are authoring metadata. Exports do not change the live game.</p></aside></div>
<input id="map-file" type="file" accept=".json,.zip" hidden><input id="glb-file" type="file" accept=".glb" hidden>
<dialog id="help-dialog"><h1>Build your world</h1><p>This workshop is separate from the game. Drafts stay in this browser. Export a ZIP to back up or share your map for integration.</p><ul><li>Pick an asset, then click or tap the world to place it. R rotates the next placement.</li><li>Select an object in the world or use “Scene objects” in the library. Shift-click adds to a selection. Drag the gizmo to move, rotate or scale.</li><li>Drag to pan, right-drag to orbit, scroll to zoom. On a phone, use one finger to pan and two to zoom/orbit.</li><li>Draw roads: click successive endpoints. Escape ends the road. Width uses the placement-width field.</li><li>Shoreline: drag the amber vertices. Shift-click near an edge inserts a vertex. Delete removes the selected vertex. Invalid outlines are rejected.</li><li>On surfaces places props on upward faces. Height adds an offset. Hide roofs or use Cutaway to work on interiors.</li><li>G: move · T: rotate · S: scale · R: turn 90° · F: focus · Delete: remove · Ctrl/⌘ D: duplicate · Ctrl/⌘ Z: undo · Ctrl/⌘ Shift Z: redo · Ctrl/⌘ S: save.</li><li>Custom models must be self-contained GLB v2, up to 16 MB each and 32 MB per map. ZIP exports include them. Existing building interiors are grouped prefabs.</li></ul><p>New maps and imports affect only this editor. Nothing overwrites player saves or publishes changes to the game.</p><button id="help-close" class="primary">Got it</button></dialog>`;
let doc: MapDocument = newMap(true),
  assets = new Map<string, ArrayBuffer>();
const history = new MapHistory();
let view: EditorViewport;
let active: CatalogAsset | undefined,
  yaw = 0,
  roadWidth = 8,
  roadStart: Vector3 | undefined,
  dirty = false,
  revision = 0,
  saveTimer: ReturnType<typeof setTimeout> | undefined,
  toastTimer: ReturnType<typeof setTimeout>;
function notify(message: string) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 6500);
}
function selected() {
  return doc.objects.filter((o) => view.selected.has(o.id));
}
function mark() {
  dirty = true;
  revision++;
  $("status").textContent = "Unsaved changes";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void save(), 800);
}
async function save() {
  const version = revision;
  try {
    const used = new Map(doc.assets.map((a) => [a.id, assets.get(a.id)!]));
    await saveDraft(structuredClone(doc), used);
    if (version === revision) {
      dirty = false;
      $("status").textContent = "Saved on this device";
    }
  } catch {
    $("status").textContent = "Storage unavailable · export a ZIP";
    notify("Draft could not be saved. Export a ZIP to keep your work.");
  }
}
function refresh() {
  view.rebuild();
  $<HTMLInputElement>("project").value = doc.name;
  $("count").textContent = `${doc.objects.length} / ${MAX_OBJECTS} objects`;
  $<HTMLButtonElement>("undo").disabled = !history.canUndo;
  $<HTMLButtonElement>("redo").disabled = !history.canRedo;
  renderLibrary();
  inspector();
}
function changed(before: MapDocument) {
  try {
    doc = validateMap(doc, KNOWN_ASSETS);
    if (JSON.stringify(before) !== JSON.stringify(doc)) {
      history.commit(before);
      mark();
    }
  } catch (error) {
    doc = before;
    notify((error as Error).message);
  }
  refresh();
}
function edit(fn: () => void) {
  const before = structuredClone(doc);
  fn();
  changed(before);
}
function select(id: string | undefined, multi = false) {
  const ids = multi ? new Set(view.selected) : new Set<string>();
  if (id) {
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
  }
  view.setSelection(ids);
  inspector();
  if ($<HTMLSelectElement>("category").value === "Scene objects")
    renderLibrary();
}
function setMode(mode: "select" | "place" | "road" | "coast") {
  roadStart = undefined;
  view.setMode(mode);
  for (const key of ["select", "road", "coast"])
    $(key).classList.toggle("active", key === mode);
  $("mode-label").textContent =
    mode === "place"
      ? `PLACE · ${active?.name ?? ""}`
      : mode === "road"
        ? "DRAW CONNECTED ROADS"
        : mode === "coast"
          ? "EDIT SHORELINE"
          : "SELECT & ARRANGE";
  $("hint").textContent =
    mode === "place"
      ? "Click / tap to place · R turns 90° · Escape returns to selection"
      : mode === "road"
        ? "Click successive road endpoints · Escape ends road · Width in inspector"
        : mode === "coast"
          ? "Drag amber vertices · Shift-click inserts a vertex · Delete removes selected vertex"
          : "Drag to pan · Right drag to orbit · Scroll to zoom · Shift-click to select several";
  inspector();
}
function activate(a: CatalogAsset) {
  active = a;
  yaw = 0;
  view.setGhost(a, yaw);
  setMode("place");
  renderLibrary();
  if (innerWidth < 900) $("catalog-panel").classList.remove("open");
}
function place(point: Vector3) {
  if (view.mode === "road") {
    if (!roadStart) {
      roadStart = point.clone();
      notify("Click the next road endpoint.");
      return;
    }
    const length = Math.hypot(point.x - roadStart.x, point.z - roadStart.z);
    if (length < 0.1) return;
    const width = roadWidth;
    const previous = roadStart.clone();
    edit(() => {
      doc.objects.push(
        makeObject("road", "Road", "Terrain", "decoration", {
          x: (previous.x + point.x) / 2,
          y: point.y,
          z: (previous.z + point.z) / 2,
          yaw:
            (Math.atan2(point.x - previous.x, point.z - previous.z) * 180) /
            Math.PI,
          scale: [width, 0.08, length],
        }),
      );
    });
    roadStart = point.clone();
    return;
  }
  if (!active) return;
  if (doc.objects.length >= MAX_OBJECTS) {
    notify("Object limit reached. Remove objects before adding more.");
    return;
  }
  const a = active;
  edit(() => {
    doc.objects.push(
      makeObject(a.id, a.name, a.layer, a.behavior, {
        x: point.x,
        y: point.y,
        z: point.z,
        yaw,
        scale: a.scale ? [...a.scale] : [1, 1, 1],
      }),
    );
  });
}
function renderLibrary() {
  const list = $("asset-list");
  list.replaceChildren();
  const query = $<HTMLInputElement>("search").value.toLowerCase(),
    category = $<HTMLSelectElement>("category").value;
  if (category === "Scene objects") {
    const matches = doc.objects.filter((o) =>
      o.name.toLowerCase().includes(query),
    );
    for (const o of matches.slice(0, 200)) {
      const b = document.createElement("button");
      b.className = "asset" + (view.selected.has(o.id) ? " active" : "");
      b.textContent = `${o.locked ? "🔒 " : ""}${o.name}`;
      b.title = `${o.layer} · ${o.x.toFixed(1)}, ${o.z.toFixed(1)}`;
      b.onclick = (e) => {
        setMode("select");
        select(o.id, e.shiftKey);
        view.focus();
      };
      list.append(b);
    }
    if (matches.length > 200) {
      const p = document.createElement("p");
      p.textContent = "First 200 matches. Search to narrow the list.";
      list.append(p);
    }
    return;
  }
  const custom = doc.assets.map((a) => view.asset(a.id)!).filter(Boolean);
  for (const a of [...CATALOG, ...custom].filter(
    (a) =>
      (category === "All assets" ||
        (category === "Custom models" && a.id.startsWith("custom:")) ||
        category === a.layer) &&
      a.name.toLowerCase().includes(query),
  )) {
    const b = document.createElement("button");
    b.className =
      "asset" + (active?.id === a.id && view.mode === "place" ? " active" : "");
    const title = document.createElement("strong"),
      subtitle = document.createElement("small");
    title.textContent = a.name;
    subtitle.textContent = a.id.startsWith("custom:")
      ? "Imported GLB"
      : a.layer;
    b.append(title, subtitle);
    b.onclick = () => activate(a);
    list.append(b);
  }
}
function field(
  label: string,
  value: string | number,
  type = "text",
  change: (value: string) => void = () => {},
  limits: Record<string, string> = {},
) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const caption = document.createElement("span");
  caption.textContent = label;
  const input = document.createElement("input");
  input.type = type;
  input.value = String(value);
  Object.entries(limits).forEach(([k, v]) => input.setAttribute(k, v));
  input.onchange = () => change(input.value);
  wrapper.append(caption, input);
  $("inspector").append(wrapper);
  return input;
}
function checkbox(
  label: string,
  value: boolean,
  change: (value: boolean) => void,
) {
  const wrapper = document.createElement("label");
  wrapper.className = "check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = value;
  input.onchange = () => change(input.checked);
  wrapper.append(input, document.createTextNode(label));
  $("inspector").append(wrapper);
}
function choice(
  label: string,
  value: string,
  options: readonly string[],
  change: (v: string) => void,
) {
  const l = document.createElement("label");
  l.className = "field";
  l.textContent = label;
  const s = document.createElement("select");
  for (const v of options) {
    const o = new Option(v, v);
    s.add(o);
  }
  s.value = value;
  s.onchange = () => change(s.value);
  l.append(s);
  $("inspector").append(l);
}
function inspector() {
  const panel = $("inspector");
  panel.replaceChildren();
  if (view.mode === "road") {
    const p = document.createElement("p");
    p.textContent =
      "Click successive points to make a connected road. Roads follow the active height.";
    panel.append(p);
    const input = field(
      "Road width (m)",
      roadWidth,
      "number",
      (v) => {
        roadWidth = Math.max(1, Math.min(40, Number(v) || 8));
      },
      {
        min: "1",
        max: "40",
        step: "1",
      },
    );
    input.id = "road-width";
    return;
  }
  const objects = selected(),
    o = objects[0];
  if (!o || view.mode === "place") {
    const p = document.createElement("p");
    p.className = "quiet";
    p.textContent =
      view.mode === "place"
        ? `Placing ${active?.name}. Click the world to add it.`
        : view.mode === "coast"
          ? "Drag shoreline vertices. Shift-click inserts a point. Delete removes the selected point."
          : "Select an object to inspect it. Use Scene objects to find anything in the map.";
    panel.append(p);
    return;
  }
  const p = document.createElement("p");
  p.className = "quiet";
  p.textContent =
    objects.length > 1
      ? `${objects.length} objects selected · shared properties below`
      : o.asset;
  panel.append(p);
  const patch = (fn: (object: MapObject) => void, allowLocked = false) => {
    if (!allowLocked && objects.some((o) => o.locked)) {
      notify("Unlock the selection before editing it.");
      inspector();
      return;
    }
    edit(() => objects.forEach(fn));
  };
  if (objects.length === 1) {
    field("Name", o.name, "text", (v) => patch((o) => (o.name = v)), {
      maxlength: "100",
    });
    for (const key of ["x", "y", "z", "yaw"] as const) {
      field(
        key === "yaw" ? "Rotation Y (°)" : key.toUpperCase() + " (m)",
        Number(o[key].toFixed(3)),
        "number",
        (v) => patch((o) => (o[key] = Number(v))),
        {
          step: key === "yaw" ? "15" : ".25",
          min: key === "y" ? "-10" : key === "yaw" ? "-36000" : "-320",
          max: key === "y" ? "80" : key === "yaw" ? "36000" : "320",
        },
      );
    }
    for (let i = 0; i < 3; i++)
      field(
        "Scale " + ["X", "Y", "Z"][i],
        Number(o.scale[i].toFixed(3)),
        "number",
        (v) => patch((o) => (o.scale[i] = Number(v))),
        { min: ".05", max: "640", step: ".1" },
      );
  }
  field("Tint", o.color, "color", (v) => patch((o) => (o.color = v)));
  choice("Layer", o.layer, LAYERS, (v) =>
    patch((o) => (o.layer = v as MapObject["layer"])),
  );
  choice("Behavior", o.behavior, BEHAVIORS, (v) =>
    patch((o) => (o.behavior = v as MapObject["behavior"])),
  );
  checkbox("Solid / collision metadata", o.solid, (v) =>
    patch((o) => (o.solid = v)),
  );
  checkbox("Visible", o.visible, (v) => patch((o) => (o.visible = v)));
  checkbox(
    "Locked",
    objects.some((o) => o.locked),
    (v) => patch((o) => (o.locked = v), true),
  );
  field(
    "Loot tier (1–5)",
    o.lootTier,
    "number",
    (v) => patch((o) => (o.lootTier = Number(v))),
    { min: "1", max: "5", step: "1" },
  );
  field(
    "Respawn (seconds)",
    o.respawn,
    "number",
    (v) => patch((o) => (o.respawn = Number(v))),
    { min: "0", max: "86400", step: "1" },
  );
}
function turn() {
  if (view.mode === "place" && active) {
    yaw = (yaw + 90) % 360;
    view.setGhost(active, yaw);
    notify(`Placement turned to ${yaw}°`);
  } else if (!selected().some((o) => o.locked))
    edit(() => selected().forEach((o) => (o.yaw = (o.yaw + 90) % 360)));
}
function duplicate() {
  const list = selected().filter((o) => !o.locked);
  if (!list.length) return;
  const ids: string[] = [];
  edit(() => {
    for (const o of list) {
      const copy = structuredClone(o);
      copy.id = crypto.randomUUID();
      copy.name = (copy.name + " copy").slice(0, 100);
      copy.x = Math.min(320, copy.x + view.snapStep);
      copy.z = Math.min(320, copy.z + view.snapStep);
      doc.objects.push(copy);
      ids.push(copy.id);
    }
  });
  view.setSelection(ids);
  inspector();
}
function remove() {
  if (view.mode === "coast") {
    view.removeCoastPoint();
    return;
  }
  if (selected().some((o) => o.locked)) {
    notify("Unlock selected objects before deleting.");
    return;
  }
  edit(() => {
    doc.objects = doc.objects.filter((o) => !view.selected.has(o.id));
  });
  view.setSelection([]);
  inspector();
}
function travel(kind: "undo" | "redo") {
  const next = history[kind](doc);
  if (next) {
    doc = next;
    view.setSelection([]);
    mark();
    refresh();
  }
}
function reset(current: boolean) {
  if (
    !confirm(
      "Replace this editor layout? Export a ZIP first if you want to keep a separate backup. The game is unaffected.",
    )
  )
    return;
  edit(() => {
    doc = newMap(current);
  });
  view.setSelection([]);
  setMode("select");
  refresh();
  view.fit();
}
function fileName() {
  return (
    doc.name.replace(/[^a-z0-9_-]/gi, "-").slice(0, 60) || "street-survival-map"
  );
}
async function start() {
  let storageNotice = "";
  try {
    const draft = await loadDraft();
    if (draft) {
      const d = validateMap(draft.doc, KNOWN_ASSETS),
        stored = new Map(draft.assets);
      for (const a of d.assets) {
        const b = stored.get(a.id);
        if (!b || b.byteLength !== a.bytes) throw Error("Draft model missing");
        validateGlb(b);
      }
      doc = d;
      assets = stored;
    }
  } catch {
    storageNotice =
      "Could not restore a valid draft. Your game saves are untouched; import a backup ZIP if needed.";
  }
  doc = validateMap(doc, KNOWN_ASSETS);
  view = new EditorViewport(
    $<HTMLCanvasElement>("canvas"),
    () => doc,
    select,
    place,
    changed,
    notify,
  );
  view.setCustom(assets);
  view.configureSnap();
  view.setGrid(false);
  refresh();
  $("status").textContent = "Editor draft · this device only";
  if (storageNotice) notify(storageNotice);
  $("project").onchange = () =>
    edit(() => (doc.name = $<HTMLInputElement>("project").value.trim()));
  $("save").onclick = () => void save();
  $("search").oninput = renderLibrary;
  $("category").onchange = renderLibrary;
  for (const key of ["select", "road", "coast"] as const)
    $(key).onclick = () => {
      view.setGhost(undefined);
      setMode(key);
    };
  for (const [key, mode] of [
    ["move", "translate"],
    ["rotate", "rotate"],
    ["scale", "scale"],
  ] as const)
    $(key).onclick = () => {
      setMode("select");
      view.setTransform(mode);
    };
  for (const key of ["city", "fit", "top", "focus"] as const)
    $(key).onclick = () => view[key]();
  $("undo").onclick = () => travel("undo");
  $("redo").onclick = () => travel("redo");
  $("turn").onclick = turn;
  $("duplicate").onclick = duplicate;
  $("delete").onclick = remove;
  $("snap").onchange = () => {
    view.snapEnabled = $<HTMLInputElement>("snap").checked;
    view.configureSnap();
    view.setGrid($<HTMLInputElement>("grid").checked);
  };
  $("step").onchange = () => {
    view.snapStep = Number($<HTMLSelectElement>("step").value);
    view.configureSnap();
    view.setGrid($<HTMLInputElement>("grid").checked);
  };
  $("height").onchange = () =>
    (view.height = Math.max(
      -10,
      Math.min(80, Number($<HTMLInputElement>("height").value) || 0),
    ));
  $("surface").onchange = () =>
    (view.onSurfaces = $<HTMLInputElement>("surface").checked);
  $("grid").onchange = () => view.setGrid($<HTMLInputElement>("grid").checked);
  $("roofs").onchange = () => {
    view.hideRoofs = $<HTMLInputElement>("roofs").checked;
    view.rebuild();
  };
  $("collision").onchange = () =>
    view.setCollisions($<HTMLInputElement>("collision").checked);
  $("section").onchange = () => {
    const v = $<HTMLInputElement>("section").value;
    view.setSection(v === "" ? undefined : Number(v));
  };
  for (const layer of LAYERS) {
    const l = document.createElement("label");
    l.className = "check";
    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = true;
    c.onchange = () => {
      if (c.checked) view.hiddenLayers.delete(layer);
      else view.hiddenLayers.add(layer);
      view.rebuild();
    };
    l.append(c, document.createTextNode(layer));
    $("layers").append(l);
  }
  $("new-current").onclick = () => reset(true);
  $("new-blank").onclick = () => reset(false);
  $("export").onclick = () => {
    try {
      download(
        fileName() + ".zip",
        exportBundle(doc, assets).slice().buffer as ArrayBuffer,
        "application/zip",
      );
      notify(
        "ZIP exported. Keep it as a backup or share it for game integration.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  $("json").onclick = () => {
    download(
      fileName() + ".json",
      JSON.stringify(doc, null, 2),
      "application/json",
    );
    if (doc.assets.length)
      notify(
        "JSON references custom models. Use Export ZIP for a complete backup including those files.",
      );
  };
  $("import").onclick = () => $<HTMLInputElement>("map-file").click();
  $("map-file").onchange = async () => {
    const input = $<HTMLInputElement>("map-file"),
      file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      if (file.size > 40 * 1024 * 1024) throw Error("Map file is too large");
      let next: MapDocument,
        incoming = new Map<string, ArrayBuffer>();
      if (file.name.toLowerCase().endsWith(".zip")) {
        const bundle = importBundle(
          new Uint8Array(await file.arrayBuffer()),
          KNOWN_ASSETS,
        );
        next = bundle.doc;
        incoming = bundle.assets;
      } else {
        if (file.size > 4 * 1024 * 1024)
          throw Error("JSON maps must be smaller than 4 MB");
        next = validateMap(JSON.parse(await file.text()), KNOWN_ASSETS);
        for (const a of next.assets)
          if (assets.get(a.id)?.byteLength !== a.bytes)
            throw Error(
              "Custom models are missing. Import the complete ZIP instead.",
            );
      }
      if (
        !confirm(
          "Replace the editor layout with this map? The game is unaffected.",
        )
      )
        return;
      for (const [id, bytes] of incoming) assets.set(id, bytes);
      view.setCustom(assets);
      edit(() => (doc = next));
      view.setSelection([]);
      setMode("select");
      refresh();
      view.fit();
      notify("Map imported into the editor.");
    } catch (e) {
      notify("Import failed: " + (e as Error).message);
    }
  };
  $("add-glb").onclick = () => $<HTMLInputElement>("glb-file").click();
  $("glb-file").onchange = async () => {
    const input = $<HTMLInputElement>("glb-file"),
      file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      if (
        doc.assets.length >= MAX_CUSTOM_ASSETS ||
        doc.assets.reduce((n, a) => n + a.bytes, 0) + file.size >
          MAX_ASSET_TOTAL
      )
        throw Error("Custom model project budget reached (12 models / 32 MB)");
      if (file.size > 16 * 1024 * 1024)
        throw Error("GLB must be smaller than 16 MB");
      const bytes = await file.arrayBuffer();
      validateGlb(bytes);
      const id = "custom:" + crypto.randomUUID(),
        name = file.name.replace(/\.glb$/i, "").slice(0, 100) || "Custom model";
      assets.set(id, bytes);
      view.setCustom(assets);
      edit(() => doc.assets.push({ id, name, bytes: bytes.byteLength }));
      activate(view.asset(id)!);
      notify(
        "Model imported. Click the map to place it; adjust its scale in Properties.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  $("help").onclick = () => $<HTMLDialogElement>("help-dialog").showModal();
  $("help-close").onclick = () => $<HTMLDialogElement>("help-dialog").close();
  for (const name of ["catalog", "properties"]) {
    $(name + "-toggle").onclick = () =>
      $(name + "-panel").classList.toggle("open");
    $("close-" + name).onclick = () =>
      $(name + "-panel").classList.remove("open");
  }
  window.addEventListener("keydown", (e) => {
    if (
      (e.target as HTMLElement).matches(
        "input,select,textarea,[contenteditable]",
      ) ||
      $<HTMLDialogElement>("help-dialog").open
    )
      return;
    const key = e.key.toLowerCase(),
      mod = e.ctrlKey || e.metaKey;
    if (mod && ["s", "z", "y", "d"].includes(key)) {
      e.preventDefault();
      if (key === "s") void save();
      if (key === "d") duplicate();
      if (key === "y" || (key === "z" && e.shiftKey)) travel("redo");
      else if (key === "z") travel("undo");
      return;
    }
    if (key === "escape") {
      setMode("select");
      view.setGhost(undefined);
    }
    if (key === "delete" || key === "backspace") {
      e.preventDefault();
      remove();
    }
    if (key === "f") view.focus();
    if (key === "g") view.setTransform("translate");
    if (key === "t") view.setTransform("rotate");
    if (key === "s") view.setTransform("scale");
    if (key === "r") turn();
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
void start().catch((error) => {
  notify("Editor could not start: " + (error as Error).message);
  $("status").textContent = "Editor unavailable";
  console.error(error);
});
