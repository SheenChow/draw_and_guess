"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { Stroke } from "@/types/game";

export type SharedCanvasHandle = {
  toDataURL: () => string;
};

type Props = {
  strokes: Stroke[];
  readOnly: boolean;
  color: string;
  lineWidth: number;
  onStroke?: (stroke: Stroke) => void;
};

function drawSegment(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  scaleX: number,
  scaleY: number
) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = Math.max(1, s.lineWidth * Math.min(scaleX, scaleY));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(s.x0 * scaleX, s.y0 * scaleY);
  ctx.lineTo(s.x1 * scaleX, s.y1 * scaleY);
  ctx.stroke();
}

export const SharedCanvas = forwardRef<SharedCanvasHandle, Props>(function SharedCanvas(
  { strokes, readOnly, color, lineWidth, onStroke },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const paintAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = rect.width;
    const h = rect.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);
    const scaleX = w;
    const scaleY = h;
    for (const s of strokes) {
      drawSegment(ctx, s, scaleX, scaleY);
    }
  }, [strokes]);

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas) return "";
      return canvas.toDataURL("image/png");
    },
  }));

  useEffect(() => {
    paintAll();
  }, [paintAll]);

  useEffect(() => {
    const ro = new ResizeObserver(() => paintAll());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [paintAll]);

  const normPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { nx: 0, ny: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return { nx: Math.min(1, Math.max(0, x)), ny: Math.min(1, Math.max(0, y)) };
  };

  const start = (clientX: number, clientY: number) => {
    if (readOnly || !onStroke) return;
    drawing.current = true;
    const { nx, ny } = normPoint(clientX, clientY);
    last.current = { x: nx, y: ny };
  };

  const move = (clientX: number, clientY: number) => {
    if (readOnly || !drawing.current || !onStroke || !last.current) return;
    const { nx, ny } = normPoint(clientX, clientY);
    const prev = last.current;
    const stroke: Stroke = {
      x0: prev.x,
      y0: prev.y,
      x1: nx,
      y1: ny,
      color,
      lineWidth,
    };
    onStroke(stroke);
    last.current = { x: nx, y: ny };
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-3xl aspect-[4/3] touch-none rounded-xl border border-slate-700 bg-[#0d1117] shadow-lg cursor-crosshair"
      onMouseDown={(e) => start(e.clientX, e.clientY)}
      onMouseMove={(e) => move(e.clientX, e.clientY)}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={(e) => {
        e.preventDefault();
        const t = e.touches[0];
        if (t) start(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        const t = e.touches[0];
        if (t) move(t.clientX, t.clientY);
      }}
      onTouchEnd={end}
    />
  );
});
