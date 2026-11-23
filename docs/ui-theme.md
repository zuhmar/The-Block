# Street Survival UI theme

The main menu and loading screen now use an original AI-illustrated dusk scene: the black stick-figure survivor, jail district, harbor, bridge and military compound. The artwork is a promotional illustration rather than a screenshot. The editable original is `art/ai/ui/street-survival-menu.png`; the runtime WebP is approximately 189 KB and shares one cached URL between loading and menu screens.

`apps/client/src/fps/theme.css` supplies the charcoal steel / amber visual system after the existing layout stylesheet. Menu, inventory, workshop, build panel, model gallery, HUD, item slots and buttons share panel borders, subtle inset highlights, glossy gradients and distinct selected/disabled/focus states. Panels and buttons use CSS, keeping labels editable and edges sharp at different resolutions; they are not baked into the background graphic. The entry arrow is drawn in CSS to avoid missing-symbol glyphs.

The new menu keeps ENTER/RESUME, sound volume/mute, character/weapon preview and reset bindings. Keyboard/touch controls are available in HOW TO PLAY. Reset retains the existing confirmation. Device-local save information stays visible. No gameplay, inventory, crafting or save formats change.

Desktop composition leaves the survivor visible beside the menu. Phone composition uses a portrait crop above a compact scrollable card, and short screens use a condensed title. Primary actions remain visible on the tested 390×844, 320×640 and 844×390 layouts. Safe-area padding and reduced-motion behavior are included. Loading progress is decorative/indeterminate and does not claim a measured completion percentage.

Barlow Regular/SemiBold and Barlow Condensed Bold are self-hosted WOFF fonts converted from the Google Fonts sources in `art/fonts`. Their SIL Open Font License notices accompany the source and runtime fonts. Runtime theme artwork, fonts and notices total under 400 KB. No font or artwork CDN requests are required during play.
