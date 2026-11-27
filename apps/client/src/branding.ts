export const GAME_NAME = "Survive the Block";
export const LOGO_BASE = "/assets/branding/survive-the-block";
/** Responsive copies of the approved logo; no saved identifiers depend on this label. */
export function logoMarkup(className = "", sizes = "320px") {
  return `<img class="game-logo ${className}" src="${LOGO_BASE}-768.webp" srcset="${LOGO_BASE}-384.webp 384w, ${LOGO_BASE}-768.webp 768w, ${LOGO_BASE}-1536.webp 1536w" sizes="${sizes}" width="1536" height="1024" alt="${GAME_NAME}" decoding="async">`;
}
