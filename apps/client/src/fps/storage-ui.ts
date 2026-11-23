import { itemName, type Inventory } from "./inventory";
import { itemMarkup } from "./inventory-ui";
import { STORAGE_SLOTS, type StorageSlots } from "./storage";
import "./storage.css";
type Options = {
  inventory: () => Inventory;
  slots: () => StorageSlots;
  transfer: (side: "bag" | "chest", index: number, quantity: number) => number;
  close: () => void;
};
export function createStorageDialog(options: Options) {
  const overlay = document.createElement("div");
  overlay.id = "storage-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "storage-title");
  overlay.innerHTML = `<div class="storage-card"><div class="storage-heading"><div><span class="eyebrow">PLAYER-BUILT CONTAINER</span><h2 id="storage-title">STORAGE CHEST</h2></div><button id="storage-close" aria-label="Close storage">CLOSE ×</button></div><p class="storage-guide">Select an item, then deposit or withdraw it. Resources / bullets ×500 · Explosives ×5 · Guns ×1.</p><div class="storage-columns"><section><h3>YOUR INVENTORY <small id="storage-bag-count"></small></h3><div id="storage-bag-grid" class="storage-grid" aria-label="20 carried inventory slots"></div></section><section><h3>CHEST <small id="storage-chest-count"></small></h3><div id="storage-chest-grid" class="storage-grid" aria-label="20 chest storage slots"></div></section></div><div class="storage-controls"><b id="storage-selected">Select an item</b><label>Amount <select id="storage-amount"><option value="all">Full stack</option><option value="half">Half stack</option><option value="one">One item</option></select></label><button id="storage-transfer" class="primary" disabled>TRANSFER</button></div><p id="storage-feedback" role="status" aria-live="polite">Contents save on this device. Empty the chest before dismantling it.</p></div>`;
  document.body.append(overlay);
  const $ = <T extends HTMLElement = HTMLElement>(q: string) =>
    overlay.querySelector<T>(q)!;
  let selection: { side: "bag" | "chest"; index: number } | undefined,
    previous: HTMLElement | null = null;
  const cells = {
    bag: [] as HTMLButtonElement[],
    chest: [] as HTMLButtonElement[],
  };
  for (const side of ["bag", "chest"] as const)
    for (let i = 0; i < STORAGE_SLOTS; i++) {
      const b = document.createElement("button");
      b.className = "inventory-slot";
      b.dataset.index = String(i);
      b.onclick = () => {
        selection = { side, index: i };
        render();
      };
      $(`#storage-${side}-grid`).append(b);
      cells[side].push(b);
    }
  function slots(side: "bag" | "chest") {
    return side === "bag" ? options.inventory().slots : options.slots();
  }
  function render() {
    for (const side of ["bag", "chest"] as const) {
      const list = slots(side);
      cells[side].forEach((b, i) => {
        const item = list[i];
        b.innerHTML = itemMarkup(item);
        b.classList.toggle(
          "selected",
          selection?.side === side && selection.index === i,
        );
        b.setAttribute(
          "aria-label",
          `${side === "bag" ? "Inventory" : "Chest"} slot ${i + 1}: ${item ? itemName(item.kind) + " ×" + item.quantity : "empty"}`,
        );
        b.setAttribute(
          "aria-pressed",
          String(selection?.side === side && selection.index === i),
        );
      });
      $(`#storage-${side}-count`).textContent =
        `${list.filter(Boolean).length} / ${STORAGE_SLOTS}`;
    }
    const item = selection && slots(selection.side)[selection.index];
    $("#storage-selected").textContent = item
      ? itemName(item.kind) + " ×" + item.quantity
      : "Select an item";
    const transfer = $<HTMLButtonElement>("#storage-transfer");
    transfer.disabled = !item;
    transfer.textContent =
      selection?.side === "bag" ? "DEPOSIT →" : "← WITHDRAW";
  }
  $("#storage-transfer").onclick = () => {
    if (!selection) return;
    const item = slots(selection.side)[selection.index];
    if (!item) return;
    const amount = $<HTMLSelectElement>("#storage-amount").value,
      n = options.transfer(
        selection.side,
        selection.index,
        amount === "one"
          ? 1
          : amount === "half"
            ? Math.max(1, Math.floor(item.quantity / 2))
            : item.quantity,
      );
    $("#storage-feedback").textContent = n
      ? `${selection.side === "bag" ? "Deposited" : "Withdrew"} ${n} ${itemName(item.kind)}.`
      : "No space available. Make room in the destination first.";
    render();
  };
  $("#storage-close").onclick = options.close;
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focus = [
        ...overlay.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
          "button:not(:disabled),select",
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
  });
  return {
    open() {
      selection = undefined;
      previous = document.activeElement as HTMLElement;
      overlay.hidden = false;
      $("#storage-feedback").textContent =
        "Contents save on this device. Empty the chest before dismantling it.";
      render();
      $("#storage-close").focus();
    },
    close() {
      if (overlay.hidden) return;
      overlay.hidden = true;
      previous?.focus();
    },
    render,
  };
}
