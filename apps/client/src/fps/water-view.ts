import * as THREE from "three";
import { COMPACT } from "./compact-plan";
import { onIsland, WORLD_SIZE } from "./coast";
import { onDock, PIERS } from "./harbor-layout";
import {
  waterCircle,
  waterRibbon,
  RIPPLE_LIMIT,
  RIPPLE_SECONDS,
  type WaterPoint,
} from "./water-geometry";
const urls = {
  water: new URL("./textures/water/water.webp", import.meta.url).href,
  foam: new URL("./textures/water/foam.webp", import.meta.url).href,
  ripple: new URL("./textures/water/ripple.webp", import.meta.url).href,
};
const textures = new Map<string, THREE.Texture>();
export async function preloadWaterAssets() {
  const loader = new THREE.TextureLoader();
  await Promise.allSettled(
    Object.entries(urls).map(async ([key, url]) => {
      const t = await loader.loadAsync(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
      t.anisotropy = 2;
      textures.set(key, t);
    }),
  );
}
function fallback(color: number[]) {
  const t = new THREE.DataTexture(new Uint8Array(color), 1, 1);
  t.needsUpdate = true;
  return t;
}
const vertex = `#include <fog_pars_vertex>
varying vec2 vWater;
void main(){vec4 world=modelMatrix*vec4(position,1.0);vWater=world.xz;vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const surfaceFragment = `#include <fog_pars_fragment>
uniform float uDaylight;uniform sampler2D uTile;uniform float uTime;varying vec2 vWater;
vec2 mirrorUv(vec2 p){return 1.0-abs(fract(p*.5)*2.0-1.0);}
void main(){
 vec2 p=vWater/11.0;
 vec2 bend=vec2(sin(p.y*2.1+uTime*.35),cos(p.x*2.3-uTime*.29))*.035;
 vec3 a=texture2D(uTile,mirrorUv(p+bend+vec2(uTime*.016,uTime*.008))).rgb;
 vec3 b=texture2D(uTile,mirrorUv(p*.83-bend+vec2(-uTime*.011,uTime*.013))).rgb;
 vec3 color=mix(a,b,.36)*.82;
 float glint=pow(max(0.0,sin(p.x*3.1+p.y*4.7+uTime*.8)*cos(p.y*2.7-uTime*.5)),12.0);
 color+=vec3(.12,.2,.2)*glint;
 gl_FragColor=vec4(color*mix(vec3(.12,.2,.34),vec3(1.0),uDaylight),1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;
const foamVertex = `#include <fog_pars_vertex>
varying vec2 vUv;void main(){vUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const foamFragment = `#include <fog_pars_fragment>
uniform float uDaylight;uniform sampler2D uFoam;uniform float uTime;varying vec2 vUv;
void main(){vec4 foam=texture2D(uFoam,vec2(1.0-abs(fract((vUv.x+uTime*.025)*.5)*2.0-1.0),vUv.y+sin(vUv.x*2.0+uTime*.65)*.025));
 float alpha=foam.a*(.34+.12*sin(uTime*.8+vUv.x*.4));if(alpha<.015)discard;gl_FragColor=vec4(mix(foam.rgb,vec3(.8,1.0,1.0),.25)*mix(vec3(.25,.34,.48),vec3(1.0),uDaylight),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;
const rippleVertex = `#include <fog_pars_vertex>
uniform float uTime;attribute float aBorn;varying float vAge;varying vec2 vUv;
void main(){vAge=(uTime-aBorn)/1.8;vUv=uv;vec3 p=position;p.xy*=.35+clamp(vAge,0.0,1.0)*1.35;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const rippleFragment = `#include <fog_pars_fragment>
uniform float uDaylight;uniform sampler2D uRipple;varying vec2 vUv;varying float vAge;
void main(){if(vAge<0.0||vAge>=1.0)discard;vec4 tex=texture2D(uRipple,vUv);float r=length(vUv-vec2(.5));
 float ring=max(1.0-smoothstep(.008,.024,abs(r-.35)),1.0-smoothstep(.007,.02,abs(r-.22)));
 float alpha=tex.a*ring*smoothstep(0.0,.08,vAge)*pow(1.0-vAge,1.4)*.65;if(alpha<.01)discard;gl_FragColor=vec4(vec3(.78,.97,1.0)*mix(vec3(.25,.34,.48),vec3(1.0),uDaylight),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;
export function createWater(coasts: readonly (readonly WaterPoint[])[]) {
  const root = new THREE.Group();
  root.name = "animated-cartoon-water";
  const time = { value: 0 };
  const daylight = { value: 1 };
  const uniforms = (other: Record<string, THREE.IUniform>) => ({
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: time,
    uDaylight: daylight,
    ...other,
  });
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms({
      uTile: { value: textures.get("water") ?? fallback([12, 116, 142, 255]) },
    }),
    vertexShader: vertex,
    fragmentShader: surfaceFragment,
    fog: true,
  });
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE * 5, WORLD_SIZE * 5),
    material,
  );
  surface.name = "water-surface";
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = -0.18;
  root.add(surface);
  const loops = coasts.map((points) => ({ points, width: 2.4 }));
  if (COMPACT.active)
    for (const x of [-4.2, 4.2])
      for (const z of [-96, -88, -80])
        loops.push({ points: waterCircle(x, z, 0.16), width: 0.7 });
  for (const p of PIERS)
    for (const side of [-1, 1])
      for (let z = p.z - p.depth / 2 + 5; z < p.z + p.depth / 2; z += 10)
        loops.push({
          points: waterCircle(p.x + side * (p.width / 2 + 0.2), z, 0.12, 8),
          width: 0.7,
        });
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (const loop of loops) {
    const band = waterRibbon(loop.points, 0.05, loop.width, -0.135),
      offset = positions.length / 3;
    positions.push(...band.positions);
    uv.push(...band.uv);
    indices.push(...band.indices.map((i) => i + offset));
  }
  const foamGeo = new THREE.BufferGeometry();
  foamGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  foamGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  foamGeo.setIndex(indices);
  const foamMat = new THREE.ShaderMaterial({
    uniforms: uniforms({
      uFoam: { value: textures.get("foam") ?? fallback([255, 255, 255, 0]) },
    }),
    vertexShader: foamVertex,
    fragmentShader: foamFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  foamMat.forceSinglePass = true;
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.name = "shoreline-foam";
  root.add(foam);
  const born = new Float32Array(RIPPLE_LIMIT).fill(-100),
    geo = new THREE.PlaneGeometry(1, 1);
  geo.setAttribute("aBorn", new THREE.InstancedBufferAttribute(born, 1));
  const rippleMat = new THREE.ShaderMaterial({
    uniforms: uniforms({
      uRipple: {
        value: textures.get("ripple") ?? fallback([255, 255, 255, 0]),
      },
    }),
    vertexShader: rippleVertex,
    fragmentShader: rippleFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  rippleMat.forceSinglePass = true;
  const pool = new THREE.InstancedMesh(geo, rippleMat, RIPPLE_LIMIT);
  pool.name = "pooled-water-ripples";
  pool.frustumCulled = false;
  root.add(pool);
  const dummy = new THREE.Object3D();
  dummy.rotation.x = -Math.PI / 2;
  dummy.scale.setScalar(0);
  dummy.updateMatrix();
  for (let i = 0; i < RIPPLE_LIMIT; i++) pool.setMatrixAt(i, dummy.matrix);
  let cursor = 0,
    emitted = 0,
    impacts = 0,
    lastAmbient = -10,
    lastWake = -10,
    lastPlayer: WaterPoint | undefined;
  const wet = (p: WaterPoint) => !onIsland(p) && !onDock(p, 0);
  function splash(p: WaterPoint, size = 2) {
    if (!wet(p)) return false;
    const slot = cursor++ % RIPPLE_LIMIT;
    born[slot] = time.value;
    dummy.position.set(p.x, -0.11, p.z);
    dummy.rotation.set(-Math.PI / 2, 0, slot * 0.7);
    dummy.scale.setScalar(Math.max(0.4, Math.min(4, size)));
    dummy.updateMatrix();
    pool.setMatrixAt(slot, dummy.matrix);
    pool.instanceMatrix.needsUpdate = true;
    (geo.getAttribute("aBorn") as THREE.InstancedBufferAttribute).needsUpdate =
      true;
    emitted++;
    return true;
  }
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.18),
    impact = new THREE.Vector3();
  function splashRay(ray: THREE.Ray, maxDistance: number) {
    if (
      ray.intersectPlane(waterPlane, impact) &&
      impact.distanceTo(ray.origin) <= maxDistance &&
      splash(impact, 2.2)
    ) {
      impacts++;
      return true;
    }
    return false;
  }
  return {
    root,
    setDaylight(value: number) {
      daylight.value = Number.isFinite(value)
        ? THREE.MathUtils.clamp(value, 0, 1)
        : 1;
    },
    material,
    foam,
    pool,
    splash,
    splashRay,
    stats() {
      let active = 0;
      for (const t of born)
        if (time.value - t >= 0 && time.value - t < RIPPLE_SECONDS) active++;
      return {
        daylight: daylight.value,
        source: textures.size === 3 ? "ai-textures" : "fallback",
        layers: 2,
        drawCalls: 3,
        pool: RIPPLE_LIMIT,
        active,
        emitted,
        impacts,
        time: time.value,
        foamVertices: positions.length / 3,
      };
    },
    update(clock: number, player?: WaterPoint) {
      time.value = clock;
      if (!player) return;
      if (
        lastPlayer &&
        clock - lastWake > 0.32 &&
        Math.hypot(player.x - lastPlayer.x, player.z - lastPlayer.z) > 0.7
      ) {
        for (let i = 0; i < 8; i++) {
          const p = {
            x: player.x + Math.cos((i * Math.PI) / 4) * 0.9,
            z: player.z + Math.sin((i * Math.PI) / 4) * 0.9,
          };
          if (splash(p, 1.3)) {
            lastWake = clock;
            break;
          }
        }
        lastPlayer = { ...player };
      } else if (!lastPlayer) lastPlayer = { ...player };
      if (clock - lastAmbient > 2.4) {
        lastAmbient = clock;
        const nearby = loops
          .slice(coasts.length)
          .filter(
            (l) =>
              Math.hypot(l.points[0].x - player.x, l.points[0].z - player.z) <
              65,
          );
        const nearest = nearby[Math.floor(clock / 2.4) % nearby.length];
        if (nearest) splash(nearest.points[0], 1.6);
      }
    },
  };
}
