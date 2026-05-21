type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

export const isCoarsePointerDevice = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

export const getShortViewportEdge = () => {
  if (typeof window === "undefined") return 0;

  return Math.min(window.innerWidth || 0, window.innerHeight || 0);
};

export const getDeviceMemory = () => {
  if (typeof navigator === "undefined") return undefined;

  return (navigator as NavigatorWithDeviceMemory).deviceMemory;
};

export const isConstrainedMobileDevice = () => {
  if (!isCoarsePointerDevice()) return false;

  const shortViewportEdge = getShortViewportEdge();
  const deviceMemory = getDeviceMemory();

  return (
    shortViewportEdge <= 430 ||
    (typeof deviceMemory === "number" && deviceMemory <= 4)
  );
};

export const getPreferredPixelDensity = () => {
  if (typeof window === "undefined") return 1;

  const devicePixelRatio = window.devicePixelRatio || 1;

  if (isConstrainedMobileDevice()) {
    return 1;
  }

  if (isCoarsePointerDevice()) {
    return Math.min(devicePixelRatio, 1.5);
  }

  return Math.min(devicePixelRatio, 2);
};
