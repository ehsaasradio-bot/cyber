"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/format";
import { onCriticalPulse } from "@/lib/criticalPulse";

interface IndexPayload {
  global: { score: number };
}

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
}

/**
 * Opt-in ambient "weather" layer: rain density tracks the live global
 * CyberWeather Index score, lightning flashes fire off the same critical-pulse
 * bus that drives the blast-radius rings. Pure canvas 2D, no deps.
 */
export default function StormOverlay({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const dropsRef = useRef<Drop[]>([]);
  const intensityRef = useRef(0.15);
  const rafRef = useRef<number | null>(null);

  const { data } = useSWR<IndexPayload>(active ? "/api/index" : null, fetcher, {
    refreshInterval: 300_000,
  });

  useEffect(() => {
    if (data) intensityRef.current = Math.max(0.08, Math.min(1, data.global.score / 100));
  }, [data]);

  useEffect(() => {
    if (!active) return;
    return onCriticalPulse(() => {
      const el = flashRef.current;
      if (!el) return;
      el.style.transition = "none";
      el.style.opacity = "0.55";
      requestAnimationFrame(() => {
        el.style.transition = "opacity 600ms ease-out";
        el.style.opacity = "0";
      });
    });
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (): Drop => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      len: 8 + Math.random() * 16,
      speed: 5 + Math.random() * 7,
      opacity: 0.15 + Math.random() * 0.25,
    });
    dropsRef.current = Array.from({ length: 120 }, spawn);

    let last = performance.now();
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 50) / 16.7;
      last = now;
      if (document.visibilityState !== "visible") return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const target = Math.round(150 * intensityRef.current);
      const drops = dropsRef.current;
      while (drops.length < target) drops.push(spawn());
      if (drops.length > target) drops.length = target;

      ctx.strokeStyle = "rgba(148,197,255,0.5)";
      ctx.lineWidth = 1;
      for (const d of drops) {
        ctx.globalAlpha = d.opacity;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.len);
        ctx.stroke();
        d.y += d.speed * dt;
        d.x -= 0.4 * dt;
        if (d.y > canvas.height) Object.assign(d, spawn(), { y: Math.random() * -40 });
      }
      ctx.globalAlpha = 1;
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={flashRef} className="absolute inset-0 bg-white opacity-0" />
    </div>
  );
}
