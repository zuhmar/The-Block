# Enterable building models

Five original furnished 3D buildings, using the same footprints and names as the current small Street Survival map:

| File            | Building      | Interior                                                                 |
| --------------- | ------------- | ------------------------------------------------------------------------ |
| `store.glb`     | General Store | Stocked shelves, checkout counter/register and refrigerator              |
| `shelter.glb`   | The Haven     | Four beds, dining table/bench, kitchen and medical cabinet               |
| `workshop.glb`  | Workshop      | Workbenches, tool boards, vises, cabinets and work table                 |
| `home.glb`      | Old Residence | Living room, kitchen, bedroom partition, bed and cupboards; pitched roof |
| `warehouse.glb` | Warehouse     | Storage racks, boxed stock, loaded pallets and workbench                 |

The buildings use a glossy cartoon street-survival palette: warm corner-store paint, teal safehouse walls, terracotta workshop brick, purple abandoned residence and blue industrial cladding. Dark cornices, painted edge highlights, barred windows, oversized brick marks and original abstract graffiti keep the shapes readable. The residence has boarded panes and industrial buildings have shutter ribs. Interiors share glossy materials with brighter stock packaging and furniture accents. These details reuse the existing instancing pipeline, without additional downloaded textures or lights.

Each GLB is self-contained and uses meters with Y up. The model origin is the building's ground-level center. The front faces +Z for store/shelter/workshop and −Z for home/warehouse, matching their existing world placements. The files include an independent `door-hinge` node and `open-door` / `close-door` animation clips. The game adds its text signage separately; the exports require no image textures.

```sh
pnpm assets:buildings
```

`apps/client/src/fps/building-layout.ts` defines walls, door poses, furniture footprints and collision. `building-models.ts` creates the corresponding hollow shells, glass windows, doors, ceilings, roof details, furnishings and decorative props. Floors are nearly flush with the outside surface for walking through the entrance.

In game, approach a door and press **E** or tap **USE**. Doors work from either side, swing inward and stop if their next pose would intersect the player or a living NPC. Their current angle drives both movement collision and the visible mesh. Walls, glass, furniture and closed doors block shots; an open entrance permits shots. Furniture is scenery, not an inventory or shop interaction system.

Static geometry is instanced by material. Furniture is batched per building and rendered only near that building and inside the camera view; collision and projectile cover remain active. The room appears before the player reaches its windows or entrance. Doors remain separate dynamic meshes. No real-time shadow maps, extra rendering contexts or per-room point lights are added.

Local building/wood saves and the previous online database are untouched. These five fixed-world doors reset on page reload or a local prototype reset; player construction keeps its existing persistence behavior.

Verification includes pure door/swing/furniture collision tests, GLB loader roundtrips, walking into all five buildings with actual browser controls, operating doors from inside/outside, closed-door movement/shot blocking, open-door shots, and phone joystick/USE interaction. Software-WebGL checks do not establish physical-phone FPS.
