# Mobile rendering investigation

The renderer repeatedly uploaded unchanged label textures, replaced unchanged HUD controls on every snapshot, and painted/uploaded a complete retina terrain chunk on the main thread. Earlier movement/network checks did not measure these costs.

Changes:

- Set Phaser text colors only when they change. Phaser's `setColor` otherwise rerasterizes and uploads the text even when the value is identical.
- Retain HUD elements until their displayed content changes. Meter widths use tenths of a percent, while authoritative survival values remain untouched. Coordinate text changes only when the displayed position changes.
- Run the existing terrain painter in an OffscreenCanvas worker, using the same assets, drawing order, resolution and saved-building reservations. Keep the original painter as a fallback when workers fail or are unsupported.
- Split each painted 1024-world-pixel chunk into sixteen 256-pixel patches, with matching one-pixel gutters. Upload at most two patches per frame, stopping after an upload reaches the four-millisecond scheduling budget. A single upload cannot be interrupted; this is a scheduling target, not a guaranteed frame-time ceiling.
- Upload patches nearest the camera center first. Keep one chunk request in flight. Release obsolete worker results, partial uploads, unloaded textures and ImageBitmaps on camera travel, reservation changes, resize and shutdown.

The map remains 256×256 tiles with 16×16-tile chunks. Collision, movement prediction, multiplayer authority and persistent data are unchanged.

## Evidence

See [render-performance-check.json](render-performance-check.json). In the local six-second stationary comparison, text redraws fell from 368 to zero, and HUD DOM mutations from 354 to 66. In the walking test, whole-chunk main-thread preparation took 186–198 ms before the change. Worker requests/completions took approximately 0.1 ms, and the final bounded upload batches took 1–4 ms per frame, including chunk installation when complete.

These are local software-WebGL measurements, not physical-phone FPS or network measurements. Software rendering still produced uneven frame intervals; the evidence establishes reduced main-thread work rather than a promised device frame rate.

`tests/browser/terrain-worker.py` compares worker output with the fallback painter pixel-for-pixel across city, waterfront, northwestern and southern terrain, including retina density and building reservations. It checks the two-upload frame limit, obsolete-result cleanup, bitmap release and fallback rendering. `tests/browser/render-quality.py` checks resize, camera centering and clicked building coordinates; `tests/browser/mobile-input.py` checks real touch transitions and authoritative movement.
