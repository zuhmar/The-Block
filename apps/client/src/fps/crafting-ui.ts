import {
  STATIONS,
  RECIPES,
  isStationKind,
  ingredientEntries,
  missingIngredients,
  recipeFor,
} from "./crafting";
import { itemIcon, itemName, countItem, type Inventory } from "./inventory";
import type { Piece } from "./world";
export function createStationDialog(options: {
  inventory: () => Inventory;
  piece: () => Piece | undefined;
  close: () => void;
  action: (
    action: "start" | "collect" | "cancel",
    recipe?: string,
  ) => string | Promise<string>;
}) {
  const overlay = document.createElement("div");
  overlay.id = "station-overlay";
  overlay.className = "station-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "station-title");
  overlay.innerHTML = `<div class="station-card"><header><div><small>YOUR WORKSHOP</small><h2 id="station-title"></h2></div><button id="station-close">CLOSE ×</button></header><div class="station-intro"><img id="station-icon" alt=""><p id="station-guide"></p></div><section class="station-job"><strong id="station-job-name">Ready for a recipe</strong><span id="station-time"></span><progress id="station-progress" max="1" value="0" aria-label="Production progress"></progress><div><button id="station-collect">COLLECT OUTPUT</button><button id="station-cancel">CANCEL & REFUND</button></div></section><div class="station-list" id="station-recipes"></div><p id="station-feedback" role="status" aria-live="polite"></p><footer><span id="station-capacity"></span><span>Outputs stay here until collected.</span></footer></div>`;
  document.body.append(overlay);
  const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
    overlay.querySelector<T>(s)!;
  let rows: {
    id: string;
    button: HTMLButtonElement;
    ingredients: {
      kind: Parameters<typeof countItem>[1];
      count: number;
      element: HTMLElement;
    }[];
  }[] = [];
  async function action(kind: "start" | "collect" | "cancel", recipe?: string) {
    const error = await options.action(kind, recipe);
    $("#station-feedback").textContent =
      error ||
      (kind === "collect"
        ? "Collected output"
        : kind === "cancel"
          ? "Ingredients refunded"
          : "Production started");
    render();
    $("#station-close").focus();
  }
  $("#station-close").addEventListener("click", options.close);
  $("#station-collect").addEventListener("click", () => action("collect"));
  $("#station-cancel").addEventListener("click", () => action("cancel"));
  overlay.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.code === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      options.close();
    }
    if (e.key === "Tab") {
      const buttons = [
          ...overlay.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled):not([hidden])",
          ),
        ],
        first = buttons[0],
        last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  function render() {
    const piece = options.piece();
    if (!piece || !isStationKind(piece.kind)) {
      options.close();
      return;
    }
    const inv = options.inventory(),
      job = piece.job,
      recipe = job && recipeFor(piece.kind, job.recipe),
      ready = !!job && job.remaining === 0;
    $("#station-job-name").textContent = recipe
      ? (ready ? "READY · " : "PROCESSING · ") + recipe.name
      : "Ready for a recipe";
    $("#station-time").textContent = job
      ? ready
        ? "Collect the finished materials"
        : Math.ceil(job.remaining) + " seconds remaining"
      : "One job at a time";
    const progress = $<HTMLProgressElement>("#station-progress");
    progress.max = recipe?.seconds ?? 1;
    progress.value = recipe && job ? recipe.seconds - job.remaining : 0;
    $("#station-collect").hidden = !ready;
    $("#station-cancel").hidden = !job || ready;
    $("#station-capacity").textContent =
      inv.slots.filter(Boolean).length + " / 20 carried slots";
    for (const row of rows) {
      const r = RECIPES.find((r) => r.id === row.id)!;
      row.button.disabled = !!job || !!missingIngredients(inv, r.inputs);
      row.button.title = job
        ? "Finish the current job"
        : missingIngredients(inv, r.inputs);
      for (const part of row.ingredients) {
        const owned = countItem(inv, part.kind);
        part.element.textContent = `${itemName(part.kind)} ${owned} / ${part.count}`;
        part.element.classList.toggle("missing", owned < part.count);
      }
    }
  }
  return {
    open() {
      const piece = options.piece();
      if (!piece || !isStationKind(piece.kind)) return;
      const station = STATIONS[piece.kind];
      $("#station-title").textContent = station.name;
      $<HTMLImageElement>("#station-icon").src =
        `/assets/crafting/station-${piece.kind}.png`;
      $("#station-guide").textContent =
        piece.kind === "furnace"
          ? "Burn wood to refine sulfur and metal ore. Smelting also produces charcoal. Fuel and ore come from your carried inventory."
          : "Mix refined sulfur and charcoal into gunpowder, then make ammunition with gunpowder and metal fragments.";
      $("#station-feedback").textContent = "";
      const list = $("#station-recipes");
      list.replaceChildren();
      rows = [];
      for (const r of RECIPES.filter((r) => r.station === piece.kind)) {
        const row = document.createElement("article");
        row.className = "station-recipe";
        const summary = document.createElement("div");
        summary.className = "station-outputs";
        for (const [kind, n] of ingredientEntries(r.outputs)) {
          const item = document.createElement("span");
          const icon = document.createElement("img");
          icon.src = itemIcon(kind);
          icon.alt = "";
          const label = document.createElement("b");
          label.textContent = `${itemName(kind)} ×${n}`;
          item.append(icon, label);
          summary.append(item);
        }
        const inputs = document.createElement("div");
        inputs.className = "station-inputs";
        const ingredients = ingredientEntries(r.inputs).map(([kind, count]) => {
          const element = document.createElement("span");
          inputs.append(element);
          return { kind, count, element };
        });
        const button = document.createElement("button");
        button.dataset.recipe = r.id;
        button.textContent =
          (r.station === "furnace" ? "SMELT" : "CRAFT") + ` · ${r.seconds}s`;
        button.addEventListener("click", () => action("start", r.id));
        row.append(summary, inputs, button);
        list.append(row);
        rows.push({ id: r.id, button, ingredients });
      }
      overlay.hidden = false;
      render();
      $("#station-close").focus();
    },
    close() {
      overlay.hidden = true;
    },
    render,
  };
}
