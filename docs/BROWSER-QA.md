# Browser acceptance to execute locally

1. Run `pnpm setup && pnpm dev`. Open localhost:5173 in two independent browser profiles at desktop width. Confirm there are no console or asset-loading errors.
2. Create two different accounts with different skin/hair/body/top choices. Confirm choices match the generated sprites. Walk, sprint and crouch; verify both sessions see movement and nearby labels. Reload and sign in to the same character.
3. Walk to a container and press E. Confirm cooldown and inventory. Buy at the store; sell at the scrap trader; consume supplies. Craft/equip a bat and buy/reload a pistol.
4. Walk to a vacant parcel, gather/buy sufficient wood and place foundation, wall, door, roof and crate. Confirm red preview outside parcels, near occupied space, out of reach or without materials; the server must reject invalid placements.
5. Enter the base at its west edge through the foundation panel. Open your door, walk inside, store items, close it and log out. In the other session enter the base from the west, breach barriers and loot. Restart the Node server and verify the breach and theft remain saved.
6. Attack from within shelter toward outside and vice versa: no damage. Leave shelter, face another player and attack on the open street. Die while carrying items, equipped backpack, loaded ammo and cash. Verify exactly one public bag; other client may loot immediately. Respawn with skills/property retained.
7. Try simultaneously taking the final bag item from both sessions. Verify only one receives it and the state remains correct after reconnect.
8. Test the base entrance and main street separately. Closed walls block only the base lane; street traversal must stay open. Attempt storage access from the street or across a closed barrier: it must fail.
9. At 390px viewport width check login overflow, HUD, inventory/build/map/chat panels, touch walk/run/crouch/attack/reload buttons, and prevention of sticky movement after tab blur.
10. Repeat with both clients attacking/looting during disconnect and restart. Note browser version, device, errors and screenshots before marking browser acceptance complete.
