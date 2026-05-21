import kaboom, { KaboomCtx } from "kaboom";
import { getPreferredPixelDensity } from "./deviceProfile";

export let k: KaboomCtx;

export const initKaboomWithCanvas = (canvas: HTMLCanvasElement) => {
  k = kaboom({
    global: false,
    touchToMouse: true,
    canvas,
    debug: false,
    pixelDensity: getPreferredPixelDensity(),
  });
};
