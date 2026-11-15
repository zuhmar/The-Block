# Top-down browser acceptance

1. Run `pnpm setup && pnpm dev`. Open localhost:5173 in two independent browser profiles at desktop width. Confirm assets load and there are no console errors.
2. Create two different appearances. Confirm all skin/hair/body/top choices persist and render, with distinct north/south/east/west poses. Walk on both axes, diagonally, sprint and crouch; verify the second session sees both X and Y movement.
3. Leave The Haven through the southern opening. Confirm the safe-zone HUD changes and protection expires. Try walking into a building footprint or closed wall: collision should hold, corners should slide and sprinting should not tunnel through.
4. Check the minimap tracks both coordinates, wheel zoom stays usable, and all navigation buttons/keyboard shortcuts work. Verify 1–0 hotbar actions use real inventory/weapon state.
5. Search containers with E, buy at the store, sell at Otis, consume supplies and craft/equip a bat. Confirm merchants/containers cannot be used from far north/south while sharing the same X coordinate.
6. Build on valid vacant ground using the compact construction panel. Confirm green/red preview, material costs, foundation selection and server rejection of road/safe-zone/footprint/collision/reach violations.
7. Build an enclosed layout with walls, a door and storage. Walk through an owner-opened door to store items, close it and log out. In the other session breach the door and loot. Restart the local server and verify damage, ownership, foundation immunity and theft remain saved.
8. Try attacks from either side of a shelter edge. Damage must be blocked. On open ground, test horizontal, vertical and diagonal attacks, facing, range, line of sight, ammo and reload.
9. Die while carrying items, equipped backpack, loaded ammo and cash. Verify one immediately public bag and a single winner for its final contested item. Respawn with skills and property retained.
10. Upgrade a disposable legacy database. Verify a pre-layout backup is retained, inventory/skills/cash/buildings persist, coordinates are assigned once, and a second migration changes nothing.
11. At 390px width and landscape phone dimensions, check login scrolling, touch movement, meters, minimap, hotbar, all floating panels and build preview. Blur/switch tabs while moving to check for stuck controls.
12. Record browser/device versions and screenshots before marking visual acceptance complete. Server and WebSocket tests alone do not prove rendering or touch usability.
