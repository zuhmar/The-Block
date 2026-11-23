import { preloadNorthLab } from "./north-lab-model";
import { preloadStorageModels } from "./storage-models";
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
import "./theme.css";
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML =
  '<div id="loading-screen" class="overlay"><div class="menu-card loading-card"><span class="eyebrow">WELCOME TO THE BLOCK</span><h2>STREET <em>SURVIVAL</em></h2><p role="status">Preparing the streets…</p><div class="loading-track" aria-hidden="true"><i></i></div><small>Scavenge. Build. Survive.</small></div></div>';
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
  preloadStorageModels(),
  preloadNorthLab(),
])
  .catch(() => undefined)
  .then(() => import("./main"));
