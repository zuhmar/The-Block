import * as THREE from "three";
import { createRemotePlayer } from "./meshy-player";
import type { FpsPublicPlayer } from "../../../../packages/shared/src/fps-protocol";
export class OnlinePlayers {
  private players = new Map<
    string,
    {
      rig: ReturnType<typeof createRemotePlayer>;
      state: FpsPublicPlayer;
      last: THREE.Vector3;
      tag: THREE.Sprite;
      shots: number;
      fireUntil: number;
      at: number;
    }
  >();
  constructor(private scene: THREE.Scene) {}
  snapshot(states: FpsPublicPlayer[], self: string) {
    const ids = new Set(
      states.filter((p) => p.id !== self && p.health > 0).map((p) => p.id),
    );
    for (const [id, p] of this.players)
      if (!ids.has(id)) {
        this.scene.remove(p.rig.root, p.tag);
        p.rig.dispose();
        (p.tag.material.map as THREE.Texture)?.dispose();
        p.tag.material.dispose();
        this.players.delete(id);
      }
    for (const state of states) {
      if (!ids.has(state.id)) continue;
      let p = this.players.get(state.id);
      if (!p) {
        const rig = createRemotePlayer();
        rig.root.position.set(state.pose.x, state.pose.y, state.pose.z);
        this.scene.add(rig.root);
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 96;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "rgba(10,16,20,.85)";
        ctx.fillRect(0, 0, 512, 96);
        ctx.font = "bold 38px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(state.name, 256, 43);
        ctx.font = "28px sans-serif";
        ctx.fillStyle = "#a8f0ad";
        ctx.fillText("PLAYER", 256, 80);
        const material = new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          depthTest: true,
          transparent: true,
        });
        const tag = new THREE.Sprite(material);
        tag.scale.set(2.6, 0.49, 1);
        this.scene.add(tag);
        p = {
          rig,
          state,
          last: rig.root.position.clone(),
          tag,
          shots: state.shots,
          fireUntil: 0,
          at: performance.now(),
        };
        this.players.set(state.id, p);
      }
      if (p.shots !== state.shots) p.fireUntil = performance.now() + 220;
      p.shots = state.shots;
      p.last.copy(p.rig.root.position);
      p.state = state;
      p.at = performance.now();
    }
  }
  update(dt: number) {
    for (const p of this.players.values()) {
      const target = new THREE.Vector3(
          p.state.pose.x,
          p.state.pose.y,
          p.state.pose.z,
        ),
        distance = p.last.distanceTo(target),
        moving = distance > 0.03;
      p.rig.root.position.lerp(target, Math.min(1, dt * 14));
      p.rig.root.rotation.y = p.state.pose.yaw + Math.PI;
      p.rig.update(
        dt,
        moving,
        distance > 0.6,
        p.state.tool,
        p.state.reloadUntil > Date.now(),
        p.fireUntil > performance.now(),
      );
      p.tag.position
        .copy(p.rig.root.position)
        .add(new THREE.Vector3(0, 2.3, 0));
      p.tag.visible = p.state.health > 0;
    }
  }
  get size() {
    return this.players.size;
  }
}
