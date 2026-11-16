import type { Kind } from "../../../packages/shared/src/index";

// World pixels: foundation/roof span two grid cells; other pieces fit one.
// The same measurements apply to placement ghosts and completed structures.
export function constructionVisual(kind: Kind) {
  switch (kind) {
    case "foundation":
    case "roof":
      return { width: 128, height: 128, originX: 0.5, originY: 0.5 };
    case "wall":
    case "door":
      return { width: 64, height: 64, originX: 0.5, originY: 0.5 };
    case "storage":
      return { width: 40, height: 40, originX: 0.5, originY: 0.5 };
  }
}
