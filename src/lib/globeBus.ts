/** Tiny pub/sub so panels can steer the globe without prop-drilling through the layout. */

export interface GlobeFocus {
  lat: number;
  lng: number;
  label?: string;
  severity?: string;
}

type Listener = (focus: GlobeFocus) => void;

const listeners = new Set<Listener>();

export function onGlobeFocus(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function focusGlobe(focus: GlobeFocus): void {
  listeners.forEach((cb) => cb(focus));
}
