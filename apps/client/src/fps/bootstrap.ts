import { preloadCraftingModels } from "./crafting-models";
import { preloadSoundFiles } from "./sound";
import { preloadAmmoModels } from "./ammo-models";
import { preloadInventoryArt } from "./inventory-art";
import { preloadHarbor } from "./harbor-model";
import { preloadHarvestTools } from "./harvest-view";
import { preloadNatureModels } from "./nature-models";
import { preloadStreetFurniture } from "./street-furniture";
import { preloadLootChests } from "./loot-chests";
import { preloadWoodBuildings } from "./wood-buildings";
import { preloadMeshyPlayer } from "./meshy-player";
import { preloadBlenderBuildings } from "./blender-buildings";
import "./style.css";
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML =
  '<div class="overlay"><div class="menu-card"><span class="eyebrow">STREET SURVIVAL</span><h2 role="status">Loading town…</h2></div></div>';
void preloadSoundFiles();
void Promise.allSettled([
  preloadBlenderBuildings(),
  preloadMeshyPlayer(),
  preloadWoodBuildings(),
  preloadLootChests(),
  preloadStreetFurniture(),
  preloadNatureModels(),
  preloadHarvestTools(),
  preloadHarbor(),
  preloadInventoryArt(),
  preloadAmmoModels(),
  preloadCraftingModels(),
])
  .catch(() => undefined)
  .then(() => import("./main"));
