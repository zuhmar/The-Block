Map scenery revision 1 retains the 16,384 × 16,384 world, road network, services, district bounds and player coordinates.

City frontage now uses 30 additional street-facing buildings (135 total), 126 building-to-sidewalk connections, smaller aprons, and district-specific loading areas, paving and planting. Mountain sprites follow curved ridges with foothills; gravel transitions use overlapping soft shapes, and coastal shallows soften the shoreline. All artwork reuses the existing original AI-generated map assets.

Before the scenery revision, persistence saves the original world JSON as layout backup 4. Existing foundation footprints join the reserved scenery areas without translating players, structures or inventories. The revision is idempotent; normal construction rules remain unchanged.

Verification includes world coverage and access, collision, migration and exact backup preservation, multiplayer persistence, production builds, and a desktop/mobile Chromium map smoke test. The browser test uses software WebGL and does not measure physical phone performance.
