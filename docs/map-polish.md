Map scenery revision 1 retains the 16,384 × 16,384 world, road network, services, district bounds and player coordinates.

City frontage now uses 30 additional street-facing buildings (135 total), 126 building-to-sidewalk connections, smaller aprons, and district-specific loading areas, paving and planting. Mountain sprites follow curved ridges with foothills; gravel transitions use overlapping soft shapes, and coastal shallows soften the shoreline. All artwork reuses the existing original AI-generated map assets.

Before the scenery revision, persistence saves the original world JSON as layout backup 4. Existing foundation footprints join the reserved scenery areas without translating players, structures or inventories. The revision is idempotent; normal construction rules remain unchanged.

Verification includes world coverage and access, collision, migration and exact backup preservation, multiplayer persistence, production builds, and a desktop/mobile Chromium map smoke test. The browser test uses software WebGL and does not measure physical phone performance.

Scenery revision 2 adds four original AI storefronts (cafe, laundromat, grocery, bookstore), 42 compact commercial infill buildings, 62 paved forecourts and 81 service alley surfaces. Downtown keeps one bank, hospital and police landmark; surrounding commercial buildings use a wider storefront mix. Uptown retains its green residential setbacks. Entrances, service points, road shoulders and parks stay open. Street furniture occupies shop side edges, away from doorways. A paved central civic plaza replaces the service-area lawn; commercial hardscape fills Downtown setbacks while the public parks remain planted.

Revision 2 saves an exact pre-update JSON backup as layout 5, then refreshes scenery reservations for bases constructed since revision 1. There is no coordinate migration. The existing 256-tile world, player controls, combat, inventory, crafting, networking and construction contracts are retained.

Scenery revision 3 adds eight original AI building designs and twelve street prop designs (217 total runtime assets; 71 official map assets). Building variety uses existing safe architecture envelopes with small kiosks, narrow bakeries, medium diners/garages, duplexes, corner offices and larger apartment/warehouse silhouettes. Required district roles and civic landmarks remain present. Downtown paving joins into continuous rows with exposed-edge curbs, and parked vehicles receive marked parking pockets. There are 156 new placed street props; larger props use the existing terrain collision system and all building entrances remain clear.

Before revision 3, raw world JSON is saved as layout backup 6. Scenery reservations refresh for all existing foundation footprints. There is no coordinate translation or gameplay-system replacement.

Scenery revision 4 focuses on block composition with the existing artwork: 20 small shops move beside larger neighbors and align their frontages, while the gaps between suitable buildings become 12 shared courtyards, 20 narrow alleys and 15 industrial service yards. Courtyards have planted centers and seating; industrial gaps have loading markings. A new planted island breaks up the central plaza. Downtown paving margins shrink from 144 pixels to 96 horizontally and 80 vertically while existing entrance connections stay intact.

Placement checks retain road shoulders, parks, original services and minimum building gaps. Courtyard planted centers leave at least 52 pixels of walking space on each side. No buildings move more than 300 pixels. Before revision 4, layout backup 7 preserves the exact saved JSON and base scenery reservations refresh without moving player coordinates or changing inventory, combat, networking or construction systems.
