// Authored reference neighborhood. This data describes scenery, never gameplay services.
export const MARKET_QUARTER = {
  bounds: { x: 7104, y: 5184, width: 1712, height: 1152 },
  buildings: [
    { id: "shoprow-downtown-1", x: 7600, y: 5344, width: 160, height: 160 },
    { id: "shoprow-downtown-2", x: 7856, y: 5344, width: 224, height: 160 },
    { id: "shoprow-downtown-3", x: 8160, y: 5336, width: 224, height: 176 },
    { id: "shoprow-downtown-4", x: 8456, y: 5328, width: 224, height: 192 },
    { id: "downtown-5", x: 8688, y: 5372, width: 96, height: 104 },
    // A second kiosk belongs by the café rather than sitting alone in the square.
    { id: "shoprow-downtown-5", x: 8656, y: 5600, width: 96, height: 104 },
  ],
  paths: [
    {
      width: 64,
      points: [
        { x: 7432, y: 5152 },
        { x: 7432, y: 5472 },
        { x: 8752, y: 5472 },
      ],
    },
    {
      width: 64,
      points: [
        { x: 7840, y: 5472 },
        { x: 7840, y: 6352 },
      ],
    },
    {
      width: 48,
      points: [
        { x: 7488, y: 5680 },
        { x: 8768, y: 5680 },
      ],
    },
  ],
  gardens: [
    { x: 7616, y: 5504, width: 192, height: 112 },
    { x: 8000, y: 5504, width: 128, height: 112 },
  ],
  props: [
    {
      id: "market-fountain",
      x: 8320,
      y: 5760,
      width: 112,
      height: 112,
      asset: "map-prop-3",
      solid: true,
    },
    {
      id: "market-table-west",
      x: 8360,
      y: 5556,
      width: 64,
      height: 48,
      asset: "map-street-cafe-table",
      solid: true,
    },
    {
      id: "market-table-east",
      x: 8528,
      y: 5556,
      width: 64,
      height: 48,
      asset: "map-street-cafe-table",
      solid: true,
    },
    {
      id: "market-bicycle",
      x: 8720,
      y: 5744,
      width: 42,
      height: 52,
      asset: "map-street-bicycle",
      solid: true,
    },
    {
      id: "market-planter-west",
      x: 7504,
      y: 5528,
      width: 64,
      height: 32,
      asset: "map-street-planter",
      solid: true,
    },
    {
      id: "market-planter-east",
      x: 8688,
      y: 5528,
      width: 64,
      height: 32,
      asset: "map-street-planter",
      solid: true,
    },
    {
      id: "market-service-bin",
      x: 8152,
      y: 5928,
      width: 48,
      height: 42,
      asset: "map-street-dumpster",
      solid: true,
    },
    {
      id: "market-recycling",
      x: 8096,
      y: 5928,
      width: 28,
      height: 38,
      asset: "map-street-recycling",
      solid: true,
    },
    {
      id: "market-flowers-west",
      x: 7656,
      y: 5556,
      width: 52,
      height: 36,
      asset: "map-nature-wildflowers",
      solid: false,
    },
    {
      id: "market-flowers-east",
      x: 7772,
      y: 5556,
      width: 52,
      height: 36,
      asset: "map-nature-wildflowers",
      solid: false,
    },
  ],
};
export const inMarketQuarter = (p: { x: number; y: number }) =>
  p.x >= MARKET_QUARTER.bounds.x &&
  p.x <= MARKET_QUARTER.bounds.x + MARKET_QUARTER.bounds.width &&
  p.y >= MARKET_QUARTER.bounds.y &&
  p.y <= MARKET_QUARTER.bounds.y + MARKET_QUARTER.bounds.height;
