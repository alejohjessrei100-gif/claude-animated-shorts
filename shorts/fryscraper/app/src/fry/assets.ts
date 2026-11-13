// Asset URLs: Remotion's staticFile() in the Studio / CLI render, or a page-relative base on the phone website
// (the site sets window.FRY_BASE, so it works under any sub-path, e.g. an artifact host).
import { staticFile } from "remotion";
export const asset = (p: string) => {
  const base = (globalThis as { FRY_BASE?: string }).FRY_BASE;
  return base ? base + p : staticFile(p);
};
