import {
  DAY_MS,
  UPKEEP_GRACE_MS,
  leaseStatus,
  type SurvivalState,
  type HousingPlot,
} from "./survival-state";
import "./survival.css";
export function createSurvivalDialog(options: {
  get: () => SurvivalState;
  distance: (p: HousingPlot) => number;
  buy: (id: string) => string | Promise<string>;
  pay: (days: number) => string | Promise<string>;
  craft: (kind: "axe" | "pickaxe") => string | Promise<string>;
  close: () => void;
}) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "housing-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "housing-title");
  document.body.append(overlay);
  let message = "";
  function render() {
    const s = options.get(),
      now = Date.now(),
      p = s.plots.find((p) => p.id === s.lease?.plotId),
      status = leaseStatus(s, now),
      remaining = s.lease
        ? Math.max(
            0,
            s.lease.paidUntil +
              (status === "grace" ? UPKEEP_GRACE_MS : 0) -
              now,
          )
        : 0;
    overlay.innerHTML = `<div class="housing-card"><div class="housing-heading"><h2 id="housing-title">LAND & SURVIVAL</h2><button id="housing-close">CLOSE ×</button></div><p><b>CASH $${s.cash.toLocaleString()}</b> · Earn cash and supplies by searching containers.</p><p id="housing-feedback" role="status" aria-live="polite"></p><section><h3>${p ? `YOUR PLOT · ${p.id.toUpperCase()}` : "NO OWNED PLOT"}</h3><p>${p ? `${status === "grace" ? "UPKEEP OVERDUE · grace expires" : "Paid upkeep remaining"}: ${(remaining / DAY_MS).toFixed(1)} days · $${p.daily}/day` : "Visit a plot sign to purchase land. One plot per player. Purchase includes one day of upkeep."}</p>${p ? `<div class="housing-actions">${[1, 7, 30].map((d) => `<button data-upkeep="${d}" ${options.distance(p) > 4 ? "disabled" : ""}>PAY ${d} DAY${d > 1 ? "S" : ""} · $${p.daily * d}</button>`).join("")}</div>` : ""}<p class="housing-warning">Houses are raidable at all times. Unpaid upkeep has a 48-hour grace period, then you lose the plot. Abandoned buildings and contents are removed after 3 more days. Upkeep funds cannot be looted.</p></section><section><h3>HAND CRAFTING</h3><p>Loot supplies first, then craft tools to gather more.</p><div class="housing-actions"><button data-craft="axe">CRAFT AXE · 25 wood + 10 rock</button><button data-craft="pickaxe">CRAFT PICKAXE · 25 wood + 15 rock</button></div></section><section><h3>HOUSING PLOTS</h3><div class="housing-plots">${s.plots
      .map((p) => {
        const distance = options.distance(p),
          abandoned = s.abandoned.some((a) => a.plotId === p.id);
        return `<article><b>${p.id.toUpperCase()} · ${p.width} × ${p.depth}m</b><span>${Math.round(distance)}m to sign · ${p.x}, ${p.z}</span><span>$${p.price} purchase · $${p.daily}/day · 100 pieces · 9m height</span><button data-buy="${p.id}" ${s.lease || abandoned || distance > 4 ? "disabled" : ""}>${s.lease?.plotId === p.id ? "OWNED" : abandoned ? "ABANDONED" : distance > 4 ? "VISIT SIGN TO BUY" : "BUY $" + p.price}</button></article>`;
      })
      .join("")}</div></section></div>`;
    overlay.querySelector("#housing-feedback")!.textContent = message;
    overlay.querySelector<HTMLButtonElement>("#housing-close")!.onclick =
      options.close;
    overlay.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach(
      (b) =>
        (b.onclick = async () => {
          message = await options.buy(b.dataset.buy!);
          render();
        }),
    );
    overlay.querySelectorAll<HTMLButtonElement>("[data-upkeep]").forEach(
      (b) =>
        (b.onclick = async () => {
          message = await options.pay(Number(b.dataset.upkeep));
          render();
        }),
    );
    overlay.querySelectorAll<HTMLButtonElement>("[data-craft]").forEach(
      (b) =>
        (b.onclick = async () => {
          message = await options.craft(b.dataset.craft as "axe" | "pickaxe");
          render();
        }),
    );
  }
  return {
    open() {
      message = "";
      overlay.hidden = false;
      render();
      overlay.querySelector<HTMLButtonElement>("#housing-close")!.focus();
    },
    close() {
      overlay.hidden = true;
    },
    render,
  };
}
