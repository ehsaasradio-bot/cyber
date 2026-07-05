"use client";

/** Pub/sub for brand-new critical/high events — feeds both the blast-radius
 * shockwave (Globe/FlatMap) and the lightning flash (StormOverlay). */

export interface CriticalPulseEvent {
  lat: number;
  lng: number;
  severity: string;
  title: string;
}

type Listener = (e: CriticalPulseEvent) => void;
const listeners = new Set<Listener>();

export function onCriticalPulse(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitCriticalPulse(e: CriticalPulseEvent): void {
  listeners.forEach((cb) => cb(e));
}
