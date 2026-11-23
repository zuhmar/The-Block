import { pieceBase, type Piece } from "./world";
import {
  C4_STRUCTURE_DAMAGE,
  C4_STRUCTURE_RADIUS,
  structureHealth,
} from "./structure-health";
import type { V3 } from "./explosives";
type Part = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  yaw: number;
};
/** Match the same physical parts used for placement and bullet cover, including swung doors. */
function parts(p: Piece, pieces: Piece[]): Part[] {
  const base = pieceBase(p, pieces),
    r = (p.rotation * Math.PI) / 2;
  let x = p.x,
    z = p.z,
    y = base,
    yaw = r;
  if (p.kind === "door") {
    x -= 0.54 * Math.cos(r);
    z += 0.54 * Math.sin(r);
    y += 0.02;
    yaw += p.doorAngle ?? (p.open ? -Math.PI / 2 : 0);
  }
  const local =
    p.kind === "doorway"
      ? [
          { x: -0.78, y: 1.25, width: 0.44, height: 2.5, depth: 0.16 },
          { x: 0.78, y: 1.25, width: 0.44, height: 2.5, depth: 0.16 },
          { x: 0, y: 2.3, width: 2, height: 0.4, depth: 0.16 },
        ]
      : p.kind === "door"
        ? [{ x: 0.54, y: 1.03, width: 1.08, height: 2.06, depth: 0.1 }]
        : [
            {
              x: 0,
              y:
                p.kind === "wall"
                  ? 1.25
                  : p.kind === "foundation"
                    ? 0.25
                    : p.kind === "floor"
                      ? 0.09
                      : 0.6,
              width: p.kind === "storage" ? 1 : 2,
              height:
                p.kind === "wall"
                  ? 2.5
                  : p.kind === "foundation"
                    ? 0.5
                    : p.kind === "floor"
                      ? 0.18
                      : 0.8,
              depth: p.kind === "wall" ? 0.16 : p.kind === "storage" ? 0.8 : 2,
            },
          ];
  return local.map((b) => ({
    ...b,
    x: x + Math.cos(yaw) * b.x,
    y: y + b.y,
    z: z - Math.sin(yaw) * b.x,
    yaw,
  }));
}
function closestPoint(point: V3, b: Part): V3 {
  const dx = point.x - b.x,
    dz = point.z - b.z,
    c = Math.cos(b.yaw),
    s = Math.sin(b.yaw),
    clamp = (n: number, h: number) => Math.max(-h, Math.min(h, n));
  const x = clamp(c * dx - s * dz, b.width / 2),
    z = clamp(s * dx + c * dz, b.depth / 2);
  return {
    x: b.x + c * x + s * z,
    y: b.y + clamp(point.y - b.y, b.height / 2),
    z: b.z - s * x + c * z,
  };
}
export function structureBlastPoint(p: Piece, pieces: Piece[], point: V3) {
  return parts(p, pieces)
    .map((b) => closestPoint(point, b))
    .sort(
      (a, b) =>
        Math.hypot(a.x - point.x, a.y - point.y, a.z - point.z) -
        Math.hypot(b.x - point.x, b.y - point.y, b.z - point.z),
    )[0];
}
/** Fixed damage per charge. Determine all hits against the original cover before removing anything. */
export function damageStructuresWithC4(
  pieces: Piece[],
  center: V3,
  attachedPieceId?: string,
  visible: (piece: Piece, target: V3) => boolean = () => true,
) {
  const damaged: string[] = [],
    destroyed: string[] = [];
  for (const p of pieces) {
    const point = structureBlastPoint(p, pieces, center);
    if (
      p.id !== attachedPieceId &&
      (Math.hypot(point.x - center.x, point.y - center.y, point.z - center.z) >
        C4_STRUCTURE_RADIUS ||
        !visible(p, point))
    )
      continue;
    p.health = Math.max(0, structureHealth(p) - C4_STRUCTURE_DAMAGE);
    damaged.push(p.id);
    if (p.health === 0) destroyed.push(p.id);
  }
  if (!destroyed.length) return { pieces, damaged, destroyed };
  const elevations = new Map(pieces.map((p) => [p.id, pieceBase(p, pieces)])),
    removed = new Set(destroyed),
    survivors = pieces.filter((p) => !removed.has(p.id));
  // Losing an old implicit foundation must not teleport an intact piece to another height.
  for (const p of survivors)
    if (
      p.y === undefined &&
      Math.abs(pieceBase(p, survivors) - elevations.get(p.id)!) > 0.001
    )
      p.y = elevations.get(p.id)!;
  return { pieces: survivors, damaged, destroyed };
}
