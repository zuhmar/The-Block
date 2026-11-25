# Street Survival — survival and housing foundation

The player leaves jail and survives through looting, crafting and fighting. No jobs are part of this direction. The long-term game is PvP-focused, with contested resource areas and reward activities; those shared-world systems are not implemented by this change.

## Implemented in the current 3D prototype

- New device saves start at the jail release point with empty hands, an empty inventory, no cash and the base black stick figure. The former free 10,000 wood/weapon test kit is not granted to new releases or respawns. Existing saves retain their inventories, legacy reserves and buildings.
- Death drops every carried stack, including equipped guns with their current magazines, ammunition, tools, explosives and resources. Pocket cash drops too. Death is persisted immediately and only recorded once; reloading a dead save does not restore gear. Respawning returns empty to jail. Home storage, legacy reserve withdrawals, land ownership and prepaid upkeep are not carried items and are retained.
- The jail release point has an 8m weapon-free protection radius against incoming NPC bullets and self-blast damage. This is local prototype protection, not network PvP authority.
- Containers provide wood, rock, pistol ammunition, a varying tool/weapon/explosive and $25–100 cash. Full-inventory checks are atomic. Containers restock after ten real-time minutes; dying does not reset their cooldowns. Old one-time opened containers migrate to one cooldown before restocking.
- LAND (H on desktop) provides hand crafting: axe = 25 wood + 10 rock; pickaxe = 25 wood + 15 rock. Existing workbenches and furnaces retain their production recipes. New items must fit in the 20-slot inventory.
- Twelve authored urban infill parcels sit between buildings across the compact city blocks, excluding roads, water, existing buildings and resource yards. Legacy private bases reserve their replacement parcels. Signs show where to interact. The LAND panel lists coordinates, distance, price and upkeep. Purchasing and upkeep payment require standing within 4m of the plot sign.
- A player may own one plot. Small plots are 16×16m, cost $300 and require $25/day. Larger plots are 24×24m, cost $700 and require $60/day. These are initial balance constants. Purchase includes one day of upkeep. Payments prepay 1, 7 or 30 days; overdue time is carried forward rather than erased.
- New construction must fit wholly inside the owned plot, with a 9m height limit and the existing 100-piece global budget. The existing support, door, stacking, material and collision rules still apply. Purchase clears gathering vegetation/nodes in the plot and prevents their respawn while it remains owned.
- Houses remain vulnerable to the existing C4/structure-health rules at all times. There is no raid schedule or upkeep immunity for structures. Destroyed storage spills its contents. Existing offline homes remain in the local saved world, but actual remote/offline raiders require multiplayer authority.
- When prepaid upkeep expires, a 48-hour grace period begins. When that ends, the lease is forfeited and building rights are lost. Buildings remain abandoned for three additional days, then their structures and contents are cleared. Only then can the plot be bought again. New buyers receive empty plots. Old builds outside purchased plots are grandfathered, not retroactively deleted.
- Upkeep uses elapsed wall-clock time, including pause, closed sessions and reload. Protected prepaid time is separate from carried cash. A raid/death cannot steal prepaid upkeep. No unspent upkeep is refunded on forfeiture.

## Persistence and authority

`Save.survival` stores pocket cash, death state, plot catalog, lease deadlines, abandonment deadlines and container cooldowns. The existing inventory, dropped-item, structure/storage and harvest data remain in place. Unknown/corrupt survival fields do not wipe legacy buildings. Dropped-item validation supports larger full-loot collections; ordinary manual-drop limits are unchanged.

This build is still explicitly a single-player, device-local 3D prototype. Local saves and clocks are editable; cash, plots and deadlines are not protected against tampering. The historical online game/database is separate and is not migrated or modified. Server-authoritative accounts, plot ownership, PvP death/loot, offline raids, permissions for friends, resource-zone control, trading and reward events remain necessary for the multiplayer release. No shared-world ownership, actual player-vs-player combat or server anti-cheat guarantee is claimed here.

## Relevant implementation

`survival-state.ts` owns upkeep and lease settlement, `housing.ts` owns plot selection and build bounds, `full-loot.ts` owns carried-item death drops, `survival-loot.ts` owns repeatable loot and hand crafting, and `survival-ui.ts`/`housing-view.ts` provide the UI and plot markers. Existing resource, inventory, construction and storage systems are reused.

## Verification

The game suite passed 261 tests. New coverage exercises full-loot magazine preservation/idempotence, save migration, plot boundaries and height limits, real-time upkeep/grace/forfeiture/cleanup, atomic rewards/crafting and resource reservation. A desktop browser fixture completed purchase, seven-day upkeep payment, tool crafting, inside/outside plot building, fatal C4 damage, persisted full-loot death, reload while dead, empty jail respawn, deadline-based forfeiture and abandonment cleanup without page errors or missing assets. A phone-layout browser checked fresh empty inventory/cash, real container loot, cooldown protection, hand crafting, inventory/modal layout and reload without free gear. Browser fixtures are local-only and are not a physical-device performance or multiplayer-authority benchmark.
