# Day and night

Street Survival uses a repeating 30-minute world clock: 20 real minutes from 06:00
to 18:00, followed by ten real minutes overnight. The HUD shows a 24-hour clock and
Dawn, Day, Dusk or Night. Lighting blends continuously through sunrise and sunset.

The cycle samples UTC wall-clock time against a fixed epoch. Reloading, pausing,
backgrounding a tab or changing frame rate does not reset or slow it. Devices with
the same UTC clock see the same phase; this is a visual client clock, not a new
server-authoritative gameplay timer. Existing saves, loot restocks, production,
upkeep and combat timers retain their current behavior.

Sun direction and intensity, moon fill, sky/fog color, hemisphere light and the
first-person hand/weapon lights follow the phase. The water, foam and ripple shaders
share the daylight value so they stay consistent with the rest of the world. Ambient night light has a floor
so the cartoon world remains readable. This adds no shadow maps.

The 74 city lamps use one instanced bulb mesh. At dusk the bulbs fade in and a fixed
pool of nearby point lights supplies warm illumination: two on phones, four on
desktop. Light objects are reused and lighting updates at 10 Hz. Daytime disables
their intensity. There are no per-lamp shadow cameras or textures.

Implementation: `apps/client/src/fps/day-night.ts` contains the pure clock and
transition curves; `day-night-view.ts` applies them to the existing scene. The
read-only `canvas.dataset.dayNight` diagnostic exposes the phase and light budget.

Validation: `tests/day-night.test.ts` covers timing, repeated and negative cycles,
continuous transitions, night visibility, fog matching, clock correction, and the
bounded mobile light pool. Browser checks cover noon/dusk/night, phase retention
across reload, and the phone HUD/light budget.
