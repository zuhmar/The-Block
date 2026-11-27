# In-game settings

The entry screen contains no settings or world-reset controls. Once in-game, use
**SETTINGS** in the HUD or pause menu. The panel has Basic and Advanced sections.

- Basic: effects mute/volume, shared mouse/touch look sensitivity, HUD crosshair.
- Advanced: render resolution, unscoped field of view, inverted vertical look,
  camera bobbing, character preview, and the existing confirmed local-world reset.

Changes apply immediately. Camera, controls and rendering preferences use
`street-survival:preferences:v1`; sound retains `street-survival:sound:v1`, preserving
previous audio choices. Invalid values are clamped or replaced with safe defaults.
If storage is unavailable, the panel explains that changes last for this session.

Balanced rendering retains the previous pixel-ratio caps (1.25 mobile, 1.5 desktop).
Low caps at 0.75; High caps at 1.75 mobile or 2 desktop, never above device resolution.
Field of view ranges from 60 to 100 degrees and leaves weapon zoom values intact.
Camera bobbing affects the walking camera; combat and harvesting animations remain.

Opening the panel pauses play, clears held movement/fire/aim inputs and cancels
reloads or pending uses. Closing returns to the previous playing or paused state.
Escape closes the dialog and keyboard focus stays inside it. Settings defaults
restore preferences/audio only; the separate local-world reset retains confirmation.
No save, inventory, building or account data is changed by ordinary settings edits.
