# Animated glossy cartoon water

The active ocean uses original AI-generated water, foam and ripple artwork. `art/ai/water/references` keeps the originals; `pnpm assets:water` creates the runtime WebP files and records their source hashes in the manifest. The three runtime images total approximately 53KB (512px water, 512px foam, 256px ripple).

Two mirrored texture layers scroll in different directions with mild UV distortion and moving glossy highlights. Mirrored sampling prevents a color discontinuity at texture repeat boundaries without claiming that generated source edges are pixel-identical. Outward shoreline ribbons use arc-length UVs with an even repeat count, so the foam's phase closes around both the city and jail island. Small foam loops surround the bridge and harbor supports. Foam scrolls and pulses softly. There are no reflection cameras, screen-space reflections, animated vertex buffers or per-wave objects.

Ripple sprites expand and fade in one fixed pool of 16 instanced quads. Nearby support ripples, moving shoreline contact and real unobstructed bullet impacts can emit them. An annular shader mask limits the AI sprite's translucent fringe to two clean rings. Transparent materials use one pass. The ocean, foam and ripple pool use three draw calls total; the legacy river adds its own surface draw when that map is active. All effects share one animation clock.

Textures preload through the existing bootstrap; failures fall back to simple water and invisible effect masks. This is visual work only: existing water collision, bridge/dock movement, combat damage and persistent saves are unchanged. Water is still non-swimmable. Contact ripples appear near the water's edge rather than enabling entry into the sea.

Verification covers closed outward foam geometry, finite vertices/indices, texture budgets and transparency, fixed pool capacity/expiry, dry-ground rejection and covered/short-range ray rejection. Browser checks must verify actual shader compilation, texture loading, animation pixels, a real weapon impact and touch layout. Browser emulation does not establish physical-phone frame rate.
