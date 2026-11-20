// Phaser's setColor uploads a new text texture even when the color is unchanged.
export function setLabelColor(
  label: { style: { color: unknown }; setColor(color: string): unknown },
  color: string,
) {
  if (label.style.color !== color) label.setColor(color);
}

const hudHTML = new WeakMap<HTMLElement, string>();
export function setHudHTML(element: HTMLElement, html: string) {
  if (hudHTML.get(element) === html) return;
  element.innerHTML = html;
  hudHTML.set(element, html);
}

// Subpixel survival changes should not replace meter DOM ten times a second.
export const meterWidth = (value: number) =>
  Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
