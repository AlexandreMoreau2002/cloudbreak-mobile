export const CHART_HEIGHT = 196;
export const CHART_WIDTH_INSET = 14;
export const COMPACT_CHART_HEIGHT = 164;

// Geometrie compacte fixee pour la mini-viz Home.
// On la garde volontairement explicite, car cette version privilegie
// une lecture editoriale stable plutot qu'un rendu purement algorithmique.
export const COMPACT_GEO = {
  mainHeight: 92,
  mainHalfW: 34,
  mainLeft: 54,
  smallHeight: 40,
  smallHalfW: 15,
  smallLeft: 27,
  summitLineY: 72,
  cloudBelowY: 100,
  cloudTightY: 80,
  cloudCoverY: 58,
} as const;
