import { preloadBlenderBuildings } from "./blender-buildings";
import "./style.css";
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML =
  '<div class="overlay"><div class="menu-card"><span class="eyebrow">STREET SURVIVAL</span><h2 role="status">Loading town…</h2></div></div>';
void preloadBlenderBuildings()
  .catch(() => undefined)
  .then(() => import("./main"));
