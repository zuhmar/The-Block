import * as THREE from "three";
import type { SurvivalState } from "./survival-state";
export function createHousingView(scene: THREE.Scene, s: SurvivalState) {
  const root = new THREE.Group();
  root.name = "housing-plots";
  scene.add(root);
  const markers = s.plots.map((p) => {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-p.width / 2, 0.04, -p.depth / 2),
      new THREE.Vector3(p.width / 2, 0.04, -p.depth / 2),
      new THREE.Vector3(p.width / 2, 0.04, p.depth / 2),
      new THREE.Vector3(-p.width / 2, 0.04, p.depth / 2),
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0xd9b95c });
    const line = new THREE.LineLoop(geometry, material);
    g.add(line);
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 1.5, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x70533b }),
    );
    post.position.set(0, 0.75, p.depth / 2 + 1);
    g.add(post);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.7, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd9b95c }),
    );
    board.position.set(0, 1.2, p.depth / 2 + 1);
    g.add(board);
    root.add(g);
    return { p, g, line, material };
  });
  return {
    root,
    update(s: SurvivalState, player: { x: number; z: number }) {
      for (const m of markers) {
        const distance = Math.hypot(player.x - m.p.x, player.z - m.p.z);
        m.g.visible = distance < 100 && s.plots.some((p) => p.id === m.p.id);
        m.line.visible = distance < 45 || s.lease?.plotId === m.p.id;
        m.material.color.setHex(
          s.lease?.plotId === m.p.id
            ? 0x60caad
            : s.abandoned.some((a) => a.plotId === m.p.id)
              ? 0xc56255
              : 0xd9b95c,
        );
      }
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
      root.removeFromParent();
    },
  };
}
