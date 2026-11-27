import { logoMarkup } from "../branding";
import type { GameSettings } from "./settings";
export function createSettingsDialog(options: {
  get: () => GameSettings;
  change: (settings: GameSettings) => void;
  close: () => void;
  defaults: () => void;
}) {
  const overlay = document.createElement("div");
  overlay.id = "settings-overlay";
  overlay.className = "overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "settings-title");
  overlay.innerHTML = `<section class="settings-card"><header class="settings-heading">${logoMarkup("", "72px")}<h2 id="settings-title">SETTINGS</h2><button id="settings-close" aria-label="Close settings">CLOSE ×</button></header><nav class="settings-tabs" aria-label="Settings sections"><button id="settings-basic-tab" aria-pressed="true">BASIC</button><button id="settings-advanced-tab" aria-pressed="false">ADVANCED</button></nav><div class="settings-body"><section id="settings-basic" aria-label="Basic settings"><h3>Sound</h3><div class="settings-row"><span>Sound effects</span><button id="sound-mute" type="button" aria-pressed="false">SOUND ON</button></div><label class="settings-range" for="sound-volume">Effects volume <output id="sound-level">60%</output><input id="sound-volume" type="range" min="0" max="100" step="5"></label><h3>Controls</h3><label class="settings-range" for="setting-sensitivity">Look sensitivity <output id="sensitivity-level"></output><input id="setting-sensitivity" type="range" min=".25" max="3" step=".05"></label><label class="settings-row">Show crosshair<input id="setting-crosshair" type="checkbox"></label></section><section id="settings-advanced" aria-label="Advanced settings" hidden><h3>Graphics and camera</h3><label class="settings-row">Render resolution<select id="setting-quality"><option value="low">Low · battery saver</option><option value="balanced">Balanced</option><option value="high">High · sharper image</option></select></label><p class="settings-note">Higher resolution uses more battery and graphics power.</p><label class="settings-range" for="setting-fov">Field of view <output id="fov-level"></output><input id="setting-fov" type="range" min="60" max="100" step="1"></label><label class="settings-row">Invert vertical look<input id="setting-invertY" type="checkbox"></label><label class="settings-row">Camera bobbing<input id="setting-headBob" type="checkbox"></label><h3>Character and local world</h3><button id="view-models">CHARACTERS & GEAR</button><button id="reset" class="settings-danger">RESET LOCAL WORLD</button><p class="settings-note">World reset removes this device’s progress and asks for confirmation.</p></section></div><footer class="settings-footer"><button id="settings-defaults">RESTORE SETTINGS DEFAULTS</button><span id="settings-feedback" role="status">Changes apply immediately.</span></footer></section>`;
  document.body.append(overlay);
  const $ = <T extends HTMLElement = HTMLElement>(q: string) =>
    overlay.querySelector<T>(q)!;
  function render() {
    const s = options.get();
    for (const k of ["crosshair", "invertY", "headBob"] as const)
      $<HTMLInputElement>("#setting-" + k).checked = s[k];
    for (const k of ["sensitivity", "fov"] as const)
      $<HTMLInputElement>("#setting-" + k).value = String(s[k]);
    $<HTMLSelectElement>("#setting-quality").value = s.quality;
    $("#sensitivity-level").textContent = s.sensitivity.toFixed(2) + "×";
    $("#fov-level").textContent = Math.round(s.fov) + "°";
  }
  for (const k of [
    "sensitivity",
    "crosshair",
    "fov",
    "quality",
    "invertY",
    "headBob",
  ] as const)
    $("#setting-" + k).addEventListener(
      k === "quality" ? "change" : "input",
      () => {
        const input = $<HTMLInputElement>("#setting-" + k),
          s = { ...options.get() };
        if (k === "sensitivity" || k === "fov") s[k] = Number(input.value);
        else if (k === "quality")
          s.quality = input.value as GameSettings["quality"];
        else s[k] = input.checked;
        options.change(s);
        render();
      },
    );
  for (const tab of ["basic", "advanced"]) {
    $("#settings-" + tab + "-tab").addEventListener("click", () => {
      for (const name of ["basic", "advanced"]) {
        $("#settings-" + name).hidden = name !== tab;
        $("#settings-" + name + "-tab").setAttribute(
          "aria-pressed",
          String(name === tab),
        );
      }
    });
  }
  $("#settings-close").addEventListener("click", options.close);
  $("#settings-defaults").addEventListener("click", () => {
    options.defaults();
    render();
  });
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      options.close();
    } else if (e.key === "Tab") {
      const controls = [
          ...overlay.querySelectorAll<HTMLElement>("button,input,select"),
        ].filter(
          (el) => el.getClientRects().length && !el.hasAttribute("disabled"),
        ),
        first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  return {
    open() {
      render();
      overlay.hidden = false;
      $("#settings-close").focus();
    },
    close() {
      overlay.hidden = true;
    },
    render,
    feedback(message: string) {
      $("#settings-feedback").textContent = message;
    },
  };
}
