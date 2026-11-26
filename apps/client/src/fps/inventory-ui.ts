import { lootItemSpec } from "./loot-item-spec";
import * as THREE from "three";
import { createInventoryPlayer } from "./meshy-player";
import {
  ITEM_KINDS,
  itemName,
  itemIcon,
  isGun,
  stackLimit,
  selectedItem,
  splitStack,
  moveStack,
  bindHotbar,
  type Inventory,
  type ItemStack,
  type ItemKind,
} from "./inventory";
export function itemMarkup(s: ItemStack | null) {
  return s
    ? `<img src="${itemIcon(s.kind)}" alt=""><span class="item-name">${itemName(s.kind)}</span><b class="item-quantity">${s.quantity}</b>`
    : '<span class="empty-slot">·</span>';
}
type Options = {
  get: () => Inventory;
  changed: () => void;
  close: () => void;
  activate: (index: number) => void;
  store: (id: string) => boolean;
  withdraw: (kind: ItemKind) => number;
  drop: (id: string) => boolean;
  atReserve: () => boolean;
  health: () => number;
  use: (id: string) => boolean;
};
export function createInventoryDialog(options: Options) {
  const overlay = document.createElement("div");
  overlay.id = "inventory-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "inventory-title");
  overlay.innerHTML = `<div class="inventory-card"><header class="inventory-heading"><div><span class="eyebrow">YOUR LOADOUT</span><h2 id="inventory-title">INVENTORY <small id="inventory-capacity"></small></h2></div><button id="inventory-close" aria-label="Close inventory">CLOSE ×</button></header><div class="inventory-body"><aside class="inventory-player"><canvas id="inventory-player-canvas" aria-label="Your black stick figure character"></canvas><div><b>YOUR SURVIVOR</b><span id="inventory-health"></span><p>Black stick figure</p><small id="inventory-equipped"></small></div></aside><section class="inventory-bag"><p class="inventory-help" id="inventory-help">Select an item, then a hand slot. Drag items to move or swap.</p><div id="inventory-grid" aria-label="20 carried item slots"></div><div class="inventory-details"><div><strong id="inventory-item-name">Select an item</strong><span id="inventory-item-info">Resources / bullets ×500 · Explosives ×5 · Guns ×1</span></div><div class="inventory-actions"><button id="inventory-use">USE</button><button id="inventory-move">MOVE</button><button id="inventory-split">SPLIT</button><button id="inventory-store">STORE</button><button id="inventory-drop">DROP</button><button id="inventory-unbind">UNBIND</button></div></div><div class="inventory-hotbar-heading"><b>HAND SLOTS</b><button id="inventory-hands">EMPTY HANDS <small>H</small></button></div><div id="inventory-hotbar" aria-label="5 hand slots"></div></section></div><section class="inventory-reserve"><div><b>LEGACY RESERVE</b><span id="inventory-reserve-note"></span></div><div id="inventory-reserve-items"></div><small>Legacy supplies can be withdrawn at jail. Store new loot in a player-built chest on your plot.</small></section><p class="inventory-feedback" id="inventory-feedback" role="status" aria-live="polite"></p></div>`;
  document.body.append(overlay);
  const $ = <T extends HTMLElement = HTMLElement>(q: string) =>
    overlay.querySelector<T>(q)!;
  let selected: string | null = null,
    moving = false,
    disposePreview: (() => void) | undefined;
  const cells = Array.from({ length: 20 }, (_, i) => {
    const b = document.createElement("button");
    b.className = "inventory-slot";
    b.dataset.index = String(i);
    b.addEventListener("click", () => {
      const inv = options.get(),
        s = inv.slots[i];
      if (moving && selected) {
        const from = inv.slots.findIndex((v) => v?.id === selected);
        if (moveStack(inv, from, i)) {
          selected = inv.slots[i]?.id ?? null;
          options.changed();
        }
        moving = false;
      } else if (!s && selected) {
        moveStack(
          inv,
          inv.slots.findIndex((v) => v?.id === selected),
          i,
        );
        options.changed();
      } else selected = s?.id === selected ? null : (s?.id ?? null);
      render();
    });
    b.addEventListener("dragstart", (e) => {
      const s = options.get().slots[i];
      if (s) {
        selected = s.id;
        e.dataTransfer?.setData("text/plain", s.id);
      }
    });
    b.addEventListener("dragover", (e) => e.preventDefault());
    b.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer?.getData("text/plain");
      if (!id) return;
      const inv = options.get();
      moveStack(
        inv,
        inv.slots.findIndex((s) => s?.id === id),
        i,
      );
      options.changed();
      render();
    });
    $("#inventory-grid").append(b);
    return b;
  });
  const hotbar = Array.from({ length: 5 }, (_, i) => {
    const b = document.createElement("button");
    b.className = "inventory-slot";
    b.dataset.hotbar = String(i);
    b.addEventListener("click", () => {
      if (selected) {
        bindHotbar(options.get(), selected, i);
        options.changed();
        feedback("Assigned to hand slot " + (i + 1));
      } else options.activate(i);
      render();
    });
    b.addEventListener("dragover", (e) => e.preventDefault());
    b.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer?.getData("text/plain");
      if (id) {
        bindHotbar(options.get(), id, i);
        options.changed();
        render();
      }
    });
    $("#inventory-hotbar").append(b);
    return b;
  });
  function feedback(message: string) {
    $("#inventory-feedback").textContent = message;
  }
  function render() {
    const inv = options.get(),
      s = inv.slots.find((v) => v?.id === selected);
    if (!s) selected = null;
    $("#inventory-capacity").textContent =
      inv.slots.filter(Boolean).length + " / 20";
    $("#inventory-health").textContent = "Health " + options.health();
    $("#inventory-equipped").textContent =
      "In hand: " +
      (selectedItem(inv) ? itemName(selectedItem(inv)!.kind) : "Empty hands");
    cells.forEach((b, i) => {
      const s = inv.slots[i];
      const html = itemMarkup(s);
      if (b.innerHTML !== html) b.innerHTML = html;
      b.classList.toggle("selected", !!s && s.id === selected);
      b.draggable = !!s;
      b.setAttribute(
        "aria-label",
        s
          ? `Slot ${i + 1}: ${itemName(s.kind)}, ${s.quantity}`
          : `Empty slot ${i + 1}`,
      );
      b.setAttribute("aria-pressed", String(!!s && s.id === selected));
    });
    hotbar.forEach((b, i) => {
      const s = inv.slots.find((s) => s?.id === inv.hotbar[i]) ?? null;
      const html = `<small class="slot-number">${i + 1}</small>${itemMarkup(s)}`;
      if (b.innerHTML !== html) b.innerHTML = html;
      b.classList.toggle("selected", inv.active === i);
      b.title = "Assign selected item to hand " + (i + 1);
      b.setAttribute(
        "aria-label",
        `Hand slot ${i + 1}: ${s ? itemName(s.kind) : "Empty hands"}`,
      );
    });
    $("#inventory-item-name").textContent = s
      ? itemName(s.kind)
      : "Select an item";
    $("#inventory-item-info").textContent = s
      ? `${s.quantity} / ${stackLimit(s.kind)} per slot${isGun(s.kind) ? " · " + s.magazine + " loaded" : ""}`
      : "Resources / bullets ×500 · Explosives ×5 · Guns ×1";
    $<HTMLButtonElement>("#inventory-use").disabled =
      !s ||
      !lootItemSpec(s.kind)?.heal ||
      options.health() <= 0 ||
      options.health() >= 100;
    for (const id of ["move", "drop"])
      $<HTMLButtonElement>("#inventory-" + id).disabled = !s;
    $<HTMLButtonElement>("#inventory-split").disabled =
      !s || s.quantity < 2 || !inv.slots.includes(null);
    $<HTMLButtonElement>("#inventory-store").disabled = true;
    $("#inventory-help").textContent = moving
      ? "Choose a slot to move, merge or swap."
      : "Select an item, then a hand slot. Drag items to move or swap.";
    $<HTMLButtonElement>("#inventory-unbind").disabled =
      !s || !inv.hotbar.includes(s.id);
    $("#inventory-reserve-note").textContent = options.atReserve()
      ? "At spawn · tap a supply to withdraw"
      : "Return to jail to withdraw legacy supplies";
    const reserve = $("#inventory-reserve-items");
    reserve.replaceChildren();
    for (const kind of ITEM_KINDS) {
      const count = inv.reserve.reduce(
        (n, s) => n + (s.kind === kind ? s.quantity : 0),
        0,
      );
      if (!count) continue;
      const b = document.createElement("button");
      b.dataset.reserve = kind;
      b.innerHTML = `<img src="${itemIcon(kind)}" alt=""><span>${itemName(kind)} <b>×${count.toLocaleString()}</b></span>`;
      b.disabled = !options.atReserve();
      b.addEventListener("click", () => {
        const n = options.withdraw(kind);
        feedback(n ? `Withdrew ${n} ${itemName(kind)}` : "Inventory full");
        render();
      });
      reserve.append(b);
    }
    if (!inv.reserve.length) reserve.textContent = "Reserve empty";
  }
  $("#inventory-unbind").addEventListener("click", () => {
    if (!selected) return;
    const i = options.get().hotbar.indexOf(selected);
    if (i >= 0) {
      bindHotbar(options.get(), null, i);
      options.changed();
      feedback("Removed from hand slot");
      render();
    }
  });
  $("#inventory-use").addEventListener("click", () => {
    if (selected)
      feedback(
        options.use(selected)
          ? "Used item · health restored"
          : "Cannot use this item now",
      );
    render();
  });
  $("#inventory-close").addEventListener("click", options.close);
  $("#inventory-hands").addEventListener("click", () => {
    options.activate(-1);
    render();
  });
  $("#inventory-move").addEventListener("click", () => {
    moving = !moving;
    render();
  });
  $("#inventory-split").addEventListener("click", () => {
    if (selected && splitStack(options.get(), selected)) {
      options.changed();
      feedback("Stack split");
      render();
    }
  });
  $("#inventory-store").addEventListener("click", () => {
    if (selected && options.store(selected)) {
      selected = null;
      feedback("Stored at spawn");
      render();
    }
  });
  $("#inventory-drop").addEventListener("click", () => {
    if (selected && options.drop(selected)) {
      selected = null;
      feedback("Dropped nearby · E / USE to pick up");
      render();
    }
  });
  overlay.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.code === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      options.close();
    } else if (/^Digit[1-5]$/.test(e.code) && selected) {
      e.preventDefault();
      e.stopPropagation();
      bindHotbar(options.get(), selected, Number(e.code.slice(-1)) - 1);
      options.changed();
      render();
    } else if (e.key === "Tab") {
      const focus = [
          ...overlay.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ],
        first = focus[0],
        last = focus.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  function preview() {
    const canvas = $<HTMLCanvasElement>("#inventory-player-canvas");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return () => {};
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6c8171, 2.3));
    const light = new THREE.DirectionalLight(0xffebce, 3);
    light.position.set(-2, 4, 3);
    scene.add(light);
    const actor = createInventoryPlayer();
    scene.add(actor.root);
    const box = new THREE.Box3().setFromObject(actor.root),
      center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3());
    actor.root.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
    camera.position.set(0, size.y * 0.53, size.y * 2.4);
    camera.lookAt(0, size.y * 0.5, 0);
    let frame = 0,
      last = 0,
      drag: number | undefined,
      x = 0;
    canvas.onpointerdown = (e) => {
      drag = e.pointerId;
      x = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = (e) => {
      if (e.pointerId === drag) {
        actor.root.rotation.y += (e.clientX - x) * 0.012;
        x = e.clientX;
      }
    };
    canvas.onpointerup = () => {
      drag = undefined;
    };
    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (now - last < 50) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (
        canvas.width !== Math.round(width * renderer.getPixelRatio()) ||
        canvas.height !== Math.round(height * renderer.getPixelRatio())
      ) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      actor.update(dt);
      renderer.render(scene, camera);
      canvas.dataset.rendered = "true";
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      renderer.forceContextLoss();
      // A lost WebGL context cannot be reused on the same canvas. Give the
      // next opening a fresh canvas while releasing this preview's GPU data.
      const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
      fresh.removeAttribute("data-rendered");
      fresh.removeAttribute("width");
      fresh.removeAttribute("height");
      canvas.replaceWith(fresh);
    };
  }
  return {
    isOpen: () => !overlay.hidden,
    open() {
      overlay.hidden = false;
      selected = null;
      moving = false;
      feedback("");
      render();
      disposePreview = preview();
      $("#inventory-close").focus();
    },
    close() {
      overlay.hidden = true;
      disposePreview?.();
      disposePreview = undefined;
    },
    render,
    feedback,
  };
}
