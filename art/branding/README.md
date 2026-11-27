# Survive the Block branding

`survive-the-block-logo.png` is the original approved 1536 × 1024 RGBA artwork.
The original remains unchanged. Responsive WebP copies at 384, 768 and 1536 pixels,
plus a small PNG browser icon, are served from `apps/client/static/assets/branding/`.
All retain transparency and the original aspect ratio.

Regenerate web assets with `pnpm exec tsx packages/art-tools/prepare-branding.ts`.
`web-assets.json` records their dimensions and sizes. `src/branding.ts` supplies the
shared accessible image markup; `src/branding.css` handles placement sizing.

The logo appears on loading and entry/pause screens, the gameplay HUD, inventory,
death screen, separate map editor, and the preserved older client’s sign-in view.
Browser titles and icons use the new branding. Save keys, authentication, map-export
format identifiers and game mechanics retain their existing behavior.
