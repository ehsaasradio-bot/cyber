/** Tiny pub/sub so panels can steer the globe without prop-drilling through the layout. */

export interface GlobeFocus {
  lat: number;
  lng: number;
  label?: string;
  severity?: string;
}

/** Full event payload shown in the SOC detail card. */
export interface GlobeSelection {
  title: string;
  severity: string;
  type?: string;
  source?: string;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  occurredAt?: string;
  metadata?: Record<string, unknown> | null;
}

type Listener = (focus: GlobeFocus) => void;
type SelectListener = (sel: GlobeSelection | null) => void;

const listeners = new Set<Listener>();
const selectListeners = new Set<SelectListener>();

export function onGlobeFocus(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function focusGlobe(focus: GlobeFocus): void {
  listeners.forEach((cb) => cb(focus));
}

export function onGlobeSelect(cb: SelectListener): () => void {
  selectListeners.add(cb);
  return () => selectListeners.delete(cb);
}

/** Pass null to close the detail card. */
export function selectGlobeEvent(sel: GlobeSelection | null): void {
  selectListeners.forEach((cb) => cb(sel));
}
