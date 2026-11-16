import {
  snapBuildPoint,
  type Kind,
  type Point,
} from "../../../packages/shared/src/index";

interface WorldCamera {
  preRender(): void;
  getWorldPoint(x: number, y: number): Point;
}

// Pointer.worldX/worldY are cached until another input event. Refresh camera
// bounds and transforms before projecting, including when the pointer is still.
export function pointerToWorld(pointer: Point, camera: WorldCamera): Point {
  camera.preRender();
  return camera.getWorldPoint(pointer.x, pointer.y);
}

export function constructionTarget(
  pointer: Point,
  camera: WorldCamera,
  kind: Kind,
  floor?: Point,
) {
  return snapBuildPoint(kind, pointerToWorld(pointer, camera), floor);
}
