export type PoliceMemory = {
  phase: "patrol" | "investigate" | "pursue" | "search" | "return";
  suspectId?: string;
  lastSeen?: { x: number; z: number; y?: number };
  forgetAt: number;
  searchLeft: number;
  pauseLeft: number;
  replanAt: number;
  progressLeft: number;
  underFireUntil?: number;
  cover?: { x: number; z: number };
};
export const newPoliceMemory = (): PoliceMemory => ({
  phase: "patrol",
  suspectId: undefined,
  lastSeen: undefined,
  cover: undefined,
  underFireUntil: 0,
  forgetAt: 0,
  searchLeft: 0,
  pauseLeft: 0,
  replanAt: 0,
  progressLeft: 0,
});
