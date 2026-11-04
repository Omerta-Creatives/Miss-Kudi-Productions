"use client";

import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

interface AtelierWeaveCanvasProps {
  mode: "signin" | "reset-request" | "reset-verify" | "change-password";
  authenticatedTier?: "superadmin" | "admin" | "staff" | null;
  rememberMe: boolean;
}

/**
 * GPU-friendly HTML5 Canvas + live selectable DOM overlay inspired by DavidHDev/canvas-ui,
 * oso95/scroll-world camera depth scrubbing, and GSAP/Framer damped pointer harmonics.
 */
export default function AtelierWeaveCanvas({
  mode,
  authenticatedTier,
  rememberMe,
}: AtelierWeaveCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const plateY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [-6, 8]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(280, Math.floor(rect.width));
      height = Math.max(168, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => resize())
        : null;
    ro?.observe(canvas);

    const drawFrame = (timeMs: number) => {
      const t = prefersReducedMotion ? 0 : timeMs * 0.0014;
      const p = pointerRef.current;
      // Smooth damped interpolation (GSAP quickTo / spring feel)
      p.x += (p.targetX - p.x) * 0.08;
      p.y += (p.targetY - p.y) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // Warm unbleached atelier linen backdrop
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#192110");
      grad.addColorStop(0.58, "#222d16");
      grad.addColorStop(1, "#161d0e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // CAD registration grid hairlines
      ctx.strokeStyle = "rgba(220, 214, 204, 0.08)";
      ctx.lineWidth = 1;
      const step = 28;
      for (let gx = step; gx < width; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx + 0.5, 0);
        ctx.lineTo(gx + 0.5, height);
        ctx.stroke();
      }
      for (let gy = step; gy < height; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy + 0.5);
        ctx.lineTo(width, gy + 0.5);
        ctx.stroke();
      }

      // Woven warp & weft harmonic threads reacting to pointer + auth state
      const amplitude =
        mode === "reset-verify" ? 13 : mode === "signin" ? 9 : 11;
      const threadCount = 9;
      for (let i = 0; i < threadCount; i++) {
        const baseY = ((i + 1) / (threadCount + 1)) * height;
        const isAccent = i % 3 === 0;
        ctx.beginPath();
        ctx.lineWidth = isAccent ? 1.35 : 0.85;
        ctx.strokeStyle = isAccent
          ? "rgba(216, 195, 148, 0.42)"
          : "rgba(167, 196, 128, 0.22)";

        for (let x = 0; x <= width; x += 8) {
          const nx = x / width;
          const dist = Math.hypot(nx - p.x, baseY / height - p.y);
          const pull = Math.max(0, 1 - dist * 2.1) * 12;
          const wave =
            Math.sin(nx * 7.5 + t + i * 0.55) * amplitude * 0.55 +
            Math.cos(nx * 3.2 - t * 0.7 + i) * (pull * 0.45);
          const y = baseY + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // CAD pattern registration crosshairs
      const crossX = 24 + p.x * (width - 48);
      const crossY = 24 + p.y * (height - 48);
      ctx.strokeStyle = "rgba(232, 211, 149, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crossX - 8, crossY);
      ctx.lineTo(crossX + 8, crossY);
      ctx.moveTo(crossX, crossY - 8);
      ctx.lineTo(crossX, crossY + 8);
      ctx.stroke();

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame(0);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [mode, prefersReducedMotion]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerRef.current.targetX = (e.clientX - rect.left) / rect.width;
    pointerRef.current.targetY = (e.clientY - rect.top) / rect.height;
  };

  const modeLabel =
    mode === "signin"
      ? "CREDENTIAL VERIFICATION"
      : mode === "reset-request"
      ? "OTP RECOVERY DISPATCH"
      : mode === "reset-verify"
      ? "6-DIGIT CODE SEAL ACTIVE"
      : "CREDENTIAL ROTATION";

  return (
    <motion.div
      ref={containerRef}
      style={{ y: plateY }}
      className="atelier-canvas-shell"
      onPointerMove={handlePointerMove}
    >
      <canvas
        ref={canvasRef}
        className="atelier-weave-canvas"
        aria-hidden="true"
      />
      <div className="atelier-canvas-overlay">
        <div className="atelier-canvas-top">
          <span className="atelier-canvas-kicker mono">
            CAD SECURITY LOOM · {modeLabel}
          </span>
          <span className="atelier-canvas-chip mono">
            {rememberMe ? "30D WORKSTATION COOKIE" : "8H FLOOR SHIFT SESSION"}
          </span>
        </div>

        <div className="atelier-canvas-bottom">
          <div>
            <div className="atelier-canvas-title">
              Three Lagos Plants · Unified RBAC Ledger
            </div>
            <p className="atelier-canvas-sub">
              PBKDF2-SHA256 password hashing, HMAC-signed{" "}
              <code className="mono">HttpOnly</code> cookies, and 15-minute
              origin-bound OTP recovery across Yaba, Victoria Island, and Ikeja.
            </p>
          </div>
          <div className="atelier-canvas-metrics mono">
            <div>
              <span>PLANTS</span>
              <strong>03 ACTIVE</strong>
            </div>
            <div>
              <span>CLEARANCE</span>
              <strong>
                {authenticatedTier
                  ? authenticatedTier.toUpperCase()
                  : "LOCKED"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
