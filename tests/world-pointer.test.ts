import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type Phaser from "phaser";
import {
  constructionTarget,
  pointerToWorld,
} from "../apps/client/src/world-pointer.js";
import { act, createPlayer, emptyWorld } from "../apps/server/src/engine.js";
import { type Point, WORLD } from "../packages/shared/src/index.js";

const require = createRequire(import.meta.url);
// Phaser's real render matrix is DOM-free, so camera projection can be checked
// without claiming a browser render or replacing the game engine's math.
const Matrix =
  require("phaser/src/gameobjects/components/TransformMatrix.js") as typeof Phaser.GameObjects.Components.TransformMatrix;
class CameraFixture {
  matrix = new Matrix();
  zoom = 1;
  scrollX = 2600;
  scrollY = 1000;
  constructor(
    public width = 800,
    public height = 600,
  ) {}
  preRender() {
    const dx = (this.width / this.zoom - this.width) / 2;
    const dy = (this.height / this.zoom - this.height) / 2;
    this.scrollX = Math.max(
      dx,
      Math.min(WORLD.width - this.width - dx, this.scrollX),
    );
    this.scrollY = Math.max(
      dy,
      Math.min(WORLD.height - this.height - dy, this.scrollY),
    );
    this.matrix
      .applyITRS(this.width / 2, this.height / 2, 0, this.zoom, this.zoom)
      .translate(-this.width / 2, -this.height / 2);
  }
  getWorldPoint(x: number, y: number) {
    const p = this.matrix.applyInverse(x, y);
    return { x: p.x + this.scrollX, y: p.y + this.scrollY };
  }
  screenPoint(p: Point) {
    return this.matrix.transformPoint(p.x - this.scrollX, p.y - this.scrollY);
  }
}
function near(a: Point, b: Point) {
  assert(
    Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001,
    `${JSON.stringify(a)} != ${JSON.stringify(b)}`,
  );
}
test("stationary pointer tracks camera movement instead of cached world coordinates", () => {
  const camera = new CameraFixture(),
    pointer = { x: 350, y: 250, worldX: 0, worldY: 0 };
  const first = pointerToWorld(pointer, camera);
  near(first, { x: 2950, y: 1250 });
  camera.scrollX += 150;
  camera.scrollY += 80;
  const moved = pointerToWorld(pointer, camera);
  near(moved, { x: first.x + 150, y: first.y + 80 });
  near(camera.screenPoint(moved), pointer);
});
test("projection stays aligned with the render matrix after zoom, resize and world-bound clamping", () => {
  const camera = new CameraFixture();
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ])
    for (const zoom of [0.65, 0.84, 1.03, 1.45])
      for (const scroll of [-500, 1000, 9000]) {
        camera.width = width;
        camera.height = height;
        camera.zoom = zoom;
        camera.scrollX = camera.scrollY = scroll;
        const pointer = { x: width * 0.7, y: height * 0.4 };
        const world = pointerToWorld(pointer, camera);
        near(camera.screenPoint(world), pointer);
        near(pointerToWorld({ x: width / 2, y: height / 2 }, camera), {
          x: camera.scrollX + width / 2,
          y: camera.scrollY + height / 2,
        });
      }
});
test("preview, clicked build target and authoritative structure agree at every supported zoom", () => {
  const look = {
    skin: "#c98c62",
    hair: "#252939",
    top: "#ec8753",
    body: "standard",
    style: "short",
  } as const;
  for (const zoom of [0.65, 0.84, 1.03, 1.45]) {
    const camera = new CameraFixture(390, 844);
    camera.zoom = zoom;
    camera.scrollX = 3000 - camera.width / 2;
    camera.scrollY = 1344 - camera.height / 2;
    camera.preRender();
    const world = emptyWorld(),
      player = createPlayer("builder", "Builder", look);
    player.x = 3000;
    player.y = 1344;
    world.players[player.id] = player;
    act(world, player.id, {
      type: "build",
      kind: "foundation",
      x: 3008,
      y: 1344,
    });
    const floor = Object.values(world.structures)[0];
    const pointer = {
      ...camera.screenPoint({ x: 3034, y: 1279 }),
      worldX: 400,
      worldY: 560,
    };
    const preview = constructionTarget(pointer, camera, "wall", floor),
      clicked = constructionTarget(pointer, camera, "wall", floor);
    assert.deepEqual(clicked, preview);
    act(world, player.id, {
      type: "build",
      kind: "wall",
      x: clicked.x,
      y: clicked.y,
      foundation: floor.id,
    });
    const wall = Object.values(world.structures).find(
      (s) => s.kind === "wall",
    )!;
    assert.deepEqual(
      { x: wall.x, y: wall.y, rotation: wall.rotation },
      preview,
    );
  }
});
