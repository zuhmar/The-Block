import type { Kind } from "../../../packages/shared/src/index";

// World pixels: foundation/roof span two grid cells; other pieces fit one.
// The same measurements apply to placement ghosts and completed structures.
export function constructionVisual(kind: Kind) {
  switch (kind) {
    case "foundation":
    case "roof":
      return { width: 128, height: 128, originX: 0.5, originY: 0.5 };
    case "wall":
      return { width: 64, height: 56, originX: 0.5, originY: 0.65 };
    case "door":
      return { width: 48, height: 56, originX: 0.5, originY: 0.65 };
    case "storage":
      return { width: 40, height: 40, originX: 0.5, originY: 0.65 };
  }
}
