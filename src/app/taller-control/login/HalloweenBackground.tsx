"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Deterministic PRNG so the graveyard skyline is stable across resizes. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Bat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number; // 0 = far, 1 = near
  phase: number;
  flapSpeed: number;
  heading: number;
  orbit: boolean;
  orbitAngle: number;
  orbitRx: number;
  orbitRy: number;
  orbitSpeed: number;
  life: number; // -1 = permanent, otherwise frames remaining (swarm bats)
}

interface Ember {
  x: number;
  y: number;
  vy: number;
  vx: number;
  r: number;
  phase: number;
  hue: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface HauntLight {
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
}

/** Draws a bat silhouette centred at the origin. `flap` goes -1..1. */
function drawBat(ctx: CanvasRenderingContext2D, flap: number, eyes: boolean) {
  const tipY = -flap * 0.95;
  const elbowY = -flap * 0.45 - 0.2;

  const wing = () => {
    ctx.beginPath();
    ctx.moveTo(0.12, -0.12);
    ctx.quadraticCurveTo(0.45, elbowY - 0.25, 0.6, elbowY);
    ctx.quadraticCurveTo(0.9, tipY - 0.2, 1.25, tipY);
    // scalloped trailing edge
    const p1 = { x: 1.0, y: tipY * 0.6 + 0.18 };
    const p2 = { x: 0.72, y: elbowY * 0.4 + 0.28 };
    const p3 = { x: 0.42, y: elbowY * 0.2 + 0.3 };
    const p4 = { x: 0.12, y: 0.16 };
    ctx.quadraticCurveTo((1.25 + p1.x) / 2, (tipY + p1.y) / 2 - 0.16, p1.x, p1.y);
    ctx.quadraticCurveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 0.16, p2.x, p2.y);
    ctx.quadraticCurveTo((p2.x + p3.x) / 2, (p2.y + p3.y) / 2 - 0.14, p3.x, p3.y);
    ctx.quadraticCurveTo((p3.x + p4.x) / 2, (p3.y + p4.y) / 2 - 0.1, p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
  };

  wing();
  ctx.save();
  ctx.scale(-1, 1);
  wing();
  ctx.restore();

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0.05, 0.16, 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(0, -0.28, 0.13, 0, Math.PI * 2);
  ctx.fill();
  // ears
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.32);
  ctx.lineTo(-0.1, -0.52);
  ctx.lineTo(-0.03, -0.38);
  ctx.moveTo(0.12, -0.32);
  ctx.lineTo(0.1, -0.52);
  ctx.lineTo(0.03, -0.38);
  ctx.fill();

  if (eyes) {
    const prev = ctx.fillStyle;
    ctx.fillStyle = "#ff3b1f";
    ctx.shadowColor = "#ff2a00";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-0.05, -0.29, 0.03, 0, Math.PI * 2);
    ctx.arc(0.05, -0.29, 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = prev;
  }
}

/** Recursive gnarly dead tree. */
function drawTree(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  x: number,
  y: number,
  len: number,
  angle: number,
  width: number,
  depth: number,
) {
  if (depth === 0 || len < 4) return;
  const x2 = x + Math.cos(angle) * len;
  const y2 = y + Math.sin(angle) * len;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  const cx = (x + x2) / 2 + (rand() - 0.5) * len * 0.35;
  const cy = (y + y2) / 2 + (rand() - 0.5) * len * 0.35;
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
  const branches = 2 + (rand() > 0.6 ? 1 : 0);
  for (let i = 0; i < branches; i++) {
    const spread = (rand() - 0.5) * 1.3;
    drawTree(ctx, rand, x2, y2, len * (0.62 + rand() * 0.18), angle + spread, width * 0.65, depth - 1);
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function HalloweenBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let frame = 0;

    const mouse = { x: -9999, y: -9999, px: 0, py: 0 };
    const parallax = { x: 0, y: 0 };

    let stars: Star[] = [];
    let bats: Bat[] = [];
    let embers: Ember[] = [];
    let windows: HauntLight[] = [];
    let landscape: HTMLCanvasElement | null = null;
    let farHills: HTMLCanvasElement | null = null;

    // Fog puff sprite
    const fogSprite = document.createElement("canvas");
    fogSprite.width = fogSprite.height = 256;
    {
      const f = fogSprite.getContext("2d")!;
      const g = f.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "rgba(170, 150, 210, 0.55)");
      g.addColorStop(0.5, "rgba(120, 100, 170, 0.2)");
      g.addColorStop(1, "rgba(60, 40, 100, 0)");
      f.fillStyle = g;
      f.fillRect(0, 0, 256, 256);
    }
    const fogPuffs = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random(),
      y: 0.72 + Math.random() * 0.3,
      s: 260 + Math.random() * 380,
      v: (0.00006 + Math.random() * 0.00012) * (i % 2 ? 1 : -1),
      a: 0.25 + Math.random() * 0.35,
    }));

    const clouds = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random(),
      y: 0.08 + Math.random() * 0.3,
      w: 0.25 + Math.random() * 0.25,
      v: 0.00004 + Math.random() * 0.00008,
      a: 0.35 + (i % 3) * 0.15,
    }));

    // Lightning
    let flash = 0;
    let bolt: { x: number; y: number }[] | null = null;
    let nextLightning = 240 + Math.random() * 400;

    const moon = () => ({
      x: W * 0.78 + parallax.x * 18,
      y: H * 0.24 + parallax.y * 12,
      r: Math.max(70, Math.min(W, H) * 0.13),
    });

    function makeBat(overrides: Partial<Bat> = {}): Bat {
      const depth = Math.random();
      const orbit = Math.random() < 0.3;
      return {
        x: Math.random() * W,
        y: Math.random() * H * 0.7,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 1,
        size: 8 + depth * 26,
        depth,
        phase: Math.random() * Math.PI * 2,
        flapSpeed: 0.25 + Math.random() * 0.2,
        heading: Math.random() * Math.PI * 2,
        orbit,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRx: 1.6 + Math.random() * 1.8,
        orbitRy: 0.6 + Math.random() * 0.7,
        orbitSpeed: (0.004 + Math.random() * 0.008) * (Math.random() < 0.5 ? 1 : -1),
        life: -1,
        ...overrides,
      };
    }

    function buildLandscape() {
      const rand = mulberry32(1031);

      // Far hills layer
      farHills = document.createElement("canvas");
      farHills.width = W * dpr;
      farHills.height = H * dpr;
      const fh = farHills.getContext("2d")!;
      fh.scale(dpr, dpr);
      fh.fillStyle = "#1a0f2e";
      fh.beginPath();
      fh.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) {
        const y = H * 0.74 - Math.sin(x * 0.004) * 40 - Math.sin(x * 0.011 + 2) * 22;
        fh.lineTo(x, y);
      }
      fh.lineTo(W, H);
      fh.fill();

      // Near landscape
      landscape = document.createElement("canvas");
      landscape.width = W * dpr;
      landscape.height = H * dpr;
      const l = landscape.getContext("2d")!;
      l.scale(dpr, dpr);
      const ground = "#07040d";
      l.fillStyle = ground;
      l.strokeStyle = ground;
      l.lineCap = "round";

      const groundY = (x: number) => H * 0.86 - Math.sin(x * 0.003 + 1) * 26 - Math.sin(x * 0.009) * 10;

      l.beginPath();
      l.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) l.lineTo(x, groundY(x));
      l.lineTo(W, H);
      l.fill();

      // Haunted house on the left hill
      windows = [];
      const hx = W * 0.1;
      const hy = groundY(hx) + 6;
      const s = Math.max(0.7, Math.min(1.3, W / 1400));
      l.save();
      l.translate(hx, hy);
      l.scale(s, s);
      l.beginPath();
      // main body
      l.rect(-70, -120, 140, 120);
      // roof
      l.moveTo(-85, -120);
      l.lineTo(0, -190);
      l.lineTo(85, -120);
      // tower
      l.rect(40, -210, 44, 110);
      l.moveTo(32, -210);
      l.lineTo(62, -275);
      l.lineTo(92, -210);
      // chimney
      l.rect(-55, -185, 16, 50);
      l.fill();
      // crooked fence
      l.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const fx = 95 + i * 16;
        l.beginPath();
        l.moveTo(fx, 2);
        l.lineTo(fx + (rand() - 0.5) * 6, -26 - rand() * 8);
        l.stroke();
      }
      l.beginPath();
      l.moveTo(92, -14);
      l.lineTo(240, -10);
      l.stroke();
      l.restore();

      const win = (x: number, y: number, w: number, h: number) =>
        windows.push({ x: hx + x * s, y: hy + y * s, w: w * s, h: h * s, phase: rand() * 100 });
      win(-50, -95, 22, 28);
      win(28, -95, 22, 28);
      win(-12, -60, 24, 32);
      win(52, -180, 20, 26);
      win(-8, -150, 16, 16);

      // Dead trees
      const trees = [W * 0.32, W * 0.62, W * 0.93];
      trees.forEach((tx, i) => {
        const base = groundY(tx);
        const size = (60 + rand() * 50) * s * (i === 2 ? 1.3 : 1);
        drawTree(l, rand, tx, base + 4, size, -Math.PI / 2 + (rand() - 0.5) * 0.2, 12 * s, 7);
      });

      // Tombstones
      for (let i = 0; i < 14; i++) {
        const tx = W * 0.22 + rand() * W * 0.7;
        const base = groundY(tx) + 6;
        const w = (14 + rand() * 16) * s;
        const h = (20 + rand() * 26) * s;
        const tilt = (rand() - 0.5) * 0.35;
        l.save();
        l.translate(tx, base);
        l.rotate(tilt);
        l.beginPath();
        if (rand() > 0.35) {
          l.moveTo(-w / 2, 0);
          l.lineTo(-w / 2, -h + w / 2);
          l.arc(0, -h + w / 2, w / 2, Math.PI, 0);
          l.lineTo(w / 2, 0);
          l.fill();
        } else {
          // cross
          l.rect(-w * 0.15, -h * 1.2, w * 0.3, h * 1.2);
          l.rect(-w * 0.5, -h * 0.95, w, w * 0.28);
          l.fill();
        }
        l.restore();
      }

      // Pumpkins (glowing faces drawn per-frame, store positions in windows w/ negative width flag)
      for (let i = 0; i < 4; i++) {
        const px = W * (0.28 + i * 0.19) + rand() * 40;
        const py = groundY(px) - 4;
        windows.push({ x: px, y: py, w: -(12 + rand() * 6) * s, h: 0, phase: rand() * 100 });
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = Array.from({ length: Math.floor((W * H) / 5000) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.75,
        r: Math.random() * 1.3 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.04,
      }));

      const batCount = Math.min(60, Math.max(22, Math.floor(W / 30)));
      bats = Array.from({ length: batCount }, () => makeBat());

      embers = Array.from({ length: 70 }, () => makeEmber(true));

      buildLandscape();
    }

    function makeEmber(anywhere = false): Ember {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 10,
        vy: -(0.2 + Math.random() * 0.6),
        vx: (Math.random() - 0.5) * 0.3,
        r: 0.8 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.75 ? 25 + Math.random() * 15 : 275 + Math.random() * 25,
      };
    }

    function makeBolt() {
      const pts: { x: number; y: number }[] = [];
      let x = W * (0.15 + Math.random() * 0.7);
      let y = 0;
      pts.push({ x, y });
      while (y < H * 0.75) {
        y += 18 + Math.random() * 30;
        x += (Math.random() - 0.5) * 60;
        pts.push({ x, y });
      }
      return pts;
    }

    /* ---------------------------- drawing ---------------------------- */

    function drawSky() {
      const g = ctx!.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#05020c");
      g.addColorStop(0.45, "#1a0b2e");
      g.addColorStop(0.75, "#3b1446");
      g.addColorStop(0.9, "#6b2a2a");
      g.addColorStop(1, "#2a0f12");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
    }

    function drawStars() {
      for (const s of stars) {
        const tw = 0.4 + Math.sin(frame * s.speed + s.phase) * 0.4;
        ctx!.fillStyle = `rgba(255, 240, 220, ${Math.max(0.05, tw)})`;
        ctx!.beginPath();
        ctx!.arc(s.x + parallax.x * 4, s.y + parallax.y * 3, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawMoon() {
      const { x, y, r } = moon();
      // huge halo
      const halo = ctx!.createRadialGradient(x, y, r * 0.8, x, y, r * 4.5);
      halo.addColorStop(0, "rgba(255, 140, 50, 0.35)");
      halo.addColorStop(0.3, "rgba(200, 70, 40, 0.14)");
      halo.addColorStop(1, "rgba(80, 20, 60, 0)");
      ctx!.fillStyle = halo;
      ctx!.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);

      // disc
      const disc = ctx!.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      disc.addColorStop(0, "#fff1c9");
      disc.addColorStop(0.55, "#ffb45e");
      disc.addColorStop(1, "#e0602a");
      ctx!.fillStyle = disc;
      ctx!.shadowColor = "rgba(255, 120, 40, 0.9)";
      ctx!.shadowBlur = 60;
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.shadowBlur = 0;

      // craters
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.clip();
      const craters = [
        [0.3, -0.25, 0.18],
        [-0.35, 0.1, 0.14],
        [0.1, 0.4, 0.22],
        [-0.1, -0.5, 0.09],
        [0.55, 0.2, 0.1],
        [-0.55, -0.35, 0.08],
      ];
      for (const [cx, cy, cr] of craters) {
        ctx!.fillStyle = "rgba(170, 70, 30, 0.28)";
        ctx!.beginPath();
        ctx!.arc(x + cx * r, y + cy * r, cr * r, 0, Math.PI * 2);
        ctx!.fill();
      }
      // terminator shade
      const shade = ctx!.createLinearGradient(x - r, y - r, x + r, y + r);
      shade.addColorStop(0.55, "rgba(60, 10, 30, 0)");
      shade.addColorStop(1, "rgba(60, 10, 30, 0.55)");
      ctx!.fillStyle = shade;
      ctx!.fillRect(x - r, y - r, r * 2, r * 2);
      ctx!.restore();
    }

    function drawClouds() {
      for (const c of clouds) {
        const cx = ((c.x + frame * c.v) % 1.4) * W - W * 0.2 + parallax.x * 10;
        const cy = c.y * H;
        const w = c.w * W;
        ctx!.fillStyle = `rgba(20, 8, 30, ${c.a})`;
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, w * 0.5, w * 0.07, 0, 0, Math.PI * 2);
        ctx!.ellipse(cx - w * 0.18, cy - w * 0.04, w * 0.22, w * 0.06, 0, 0, Math.PI * 2);
        ctx!.ellipse(cx + w * 0.15, cy - w * 0.05, w * 0.18, w * 0.07, 0, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function updateAndDrawBats(layer: "far" | "near") {
      const m = moon();
      for (let i = bats.length - 1; i >= 0; i--) {
        const b = bats[i];
        const isFar = b.depth < 0.5;
        if ((layer === "far") !== isFar) continue;

        if (!reducedMotion) {
          if (b.orbit && b.life < 0) {
            b.orbitAngle += b.orbitSpeed;
            const tx = m.x + Math.cos(b.orbitAngle) * m.r * b.orbitRx;
            const ty = m.y + Math.sin(b.orbitAngle) * m.r * b.orbitRy;
            b.vx += (tx - b.x) * 0.004;
            b.vy += (ty - b.y) * 0.004;
          } else {
            b.heading += (Math.random() - 0.5) * 0.15;
            b.vx += Math.cos(b.heading) * 0.06;
            b.vy += Math.sin(b.heading) * 0.04 + Math.sin(frame * 0.02 + b.phase) * 0.02;
            // stay out of the ground
            if (b.y > H * 0.72) b.vy -= 0.08;
          }

          // scatter from the cursor
          const dx = b.x - mouse.x;
          const dy = b.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 170 * 170) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / 170) * 1.6;
            b.vx += (dx / d) * f;
            b.vy += (dy / d) * f;
          }

          const maxV = 2 + b.depth * 3 + (b.life > 0 ? 4 : 0);
          const v = Math.hypot(b.vx, b.vy);
          if (v > maxV) {
            b.vx = (b.vx / v) * maxV;
            b.vy = (b.vy / v) * maxV;
          }
          b.vx *= 0.985;
          b.vy *= 0.985;
          b.x += b.vx;
          b.y += b.vy;

          if (b.life > 0) {
            b.life--;
            if (b.life === 0 || b.x < -80 || b.x > W + 80 || b.y < -80 || b.y > H + 80) {
              bats.splice(i, 1);
              continue;
            }
          } else {
            const pad = 60;
            if (b.x < -pad) b.x = W + pad;
            if (b.x > W + pad) b.x = -pad;
            if (b.y < -pad) b.y = H * 0.6;
            if (b.y > H + pad) b.y = -pad;
          }
          b.phase += b.flapSpeed;
        }

        const flap = Math.sin(b.phase);
        const tilt = Math.max(-0.5, Math.min(0.5, b.vx * 0.08));
        const lit = flash > 0.2;
        const shade = Math.floor(8 + (1 - b.depth) * 30);
        ctx!.fillStyle = lit
          ? `rgba(${shade}, ${shade - 4}, ${shade + 10}, 1)`
          : `rgba(${shade}, ${Math.max(0, shade - 6)}, ${shade + 12}, ${0.55 + b.depth * 0.45})`;
        ctx!.save();
        ctx!.translate(b.x + parallax.x * b.depth * 20, b.y + parallax.y * b.depth * 12);
        ctx!.rotate(tilt);
        ctx!.scale(b.size, b.size);
        drawBat(ctx!, flap, b.depth > 0.7);
        ctx!.restore();
      }
    }

    function drawWindowsAndPumpkins() {
      for (const w of windows) {
        if (w.w < 0) {
          // jack-o'-lantern
          const r = -w.w;
          const flick = 0.75 + Math.sin(frame * 0.3 + w.phase) * 0.1 + Math.random() * 0.15;
          const glow = ctx!.createRadialGradient(w.x, w.y, 0, w.x, w.y, r * 4);
          glow.addColorStop(0, `rgba(255, 140, 20, ${0.45 * flick})`);
          glow.addColorStop(1, "rgba(255, 80, 0, 0)");
          ctx!.fillStyle = glow;
          ctx!.fillRect(w.x - r * 4, w.y - r * 4, r * 8, r * 8);

          ctx!.fillStyle = "#c2410c";
          ctx!.beginPath();
          ctx!.ellipse(w.x - r * 0.35, w.y, r * 0.6, r * 0.8, 0, 0, Math.PI * 2);
          ctx!.ellipse(w.x + r * 0.35, w.y, r * 0.6, r * 0.8, 0, 0, Math.PI * 2);
          ctx!.ellipse(w.x, w.y, r * 0.65, r * 0.85, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = "#14532d";
          ctx!.fillRect(w.x - r * 0.08, w.y - r * 1.1, r * 0.16, r * 0.35);
          // face
          ctx!.fillStyle = `rgba(255, 230, 120, ${flick})`;
          ctx!.shadowColor = "#ffb020";
          ctx!.shadowBlur = 10;
          ctx!.beginPath();
          ctx!.moveTo(w.x - r * 0.45, w.y - r * 0.1);
          ctx!.lineTo(w.x - r * 0.25, w.y - r * 0.45);
          ctx!.lineTo(w.x - r * 0.08, w.y - r * 0.1);
          ctx!.moveTo(w.x + r * 0.45, w.y - r * 0.1);
          ctx!.lineTo(w.x + r * 0.25, w.y - r * 0.45);
          ctx!.lineTo(w.x + r * 0.08, w.y - r * 0.1);
          ctx!.fill();
          ctx!.beginPath();
          ctx!.moveTo(w.x - r * 0.5, w.y + r * 0.2);
          ctx!.lineTo(w.x - r * 0.25, w.y + r * 0.45);
          ctx!.lineTo(w.x, w.y + r * 0.3);
          ctx!.lineTo(w.x + r * 0.25, w.y + r * 0.45);
          ctx!.lineTo(w.x + r * 0.5, w.y + r * 0.2);
          ctx!.lineTo(w.x, w.y + r * 0.35);
          ctx!.closePath();
          ctx!.fill();
          ctx!.shadowBlur = 0;
        } else {
          const on = Math.sin(frame * 0.05 + w.phase) > -0.85;
          const flick = on ? 0.7 + Math.random() * 0.3 : 0.08;
          ctx!.fillStyle = `rgba(255, 170, 50, ${flick})`;
          ctx!.shadowColor = "#ff9a1a";
          ctx!.shadowBlur = on ? 18 : 0;
          ctx!.fillRect(w.x, w.y, w.w, w.h);
          ctx!.shadowBlur = 0;
          ctx!.fillStyle = "#07040d";
          ctx!.fillRect(w.x + w.w / 2 - 1, w.y, 2, w.h);
          ctx!.fillRect(w.x, w.y + w.h / 2 - 1, w.w, 2);
        }
      }
    }

    function drawFog() {
      ctx!.globalCompositeOperation = "lighter";
      for (const p of fogPuffs) {
        if (!reducedMotion) p.x = (p.x + p.v + 1.5) % 1.5;
        const x = p.x * W * 1.3 - W * 0.2;
        const y = p.y * H;
        ctx!.globalAlpha = p.a * 0.5;
        ctx!.drawImage(fogSprite, x - p.s / 2, y - p.s * 0.3, p.s, p.s * 0.6);
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    }

    function drawEmbers() {
      ctx!.globalCompositeOperation = "lighter";
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        if (!reducedMotion) {
          e.y += e.vy;
          e.x += e.vx + Math.sin(frame * 0.02 + e.phase) * 0.3;
          if (e.y < -10) embers[i] = makeEmber();
        }
        const a = 0.5 + Math.sin(frame * 0.08 + e.phase) * 0.4;
        ctx!.fillStyle = `hsla(${e.hue}, 100%, 60%, ${a})`;
        ctx!.shadowColor = `hsl(${e.hue}, 100%, 55%)`;
        ctx!.shadowBlur = 8;
        ctx!.beginPath();
        ctx!.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
      ctx!.globalCompositeOperation = "source-over";
    }

    function drawLightning() {
      if (reducedMotion) return;
      nextLightning--;
      if (nextLightning <= 0) {
        flash = 1;
        bolt = makeBolt();
        nextLightning = 420 + Math.random() * 600;
        // occasional double strike
        if (Math.random() < 0.5) setTimeout(() => (flash = 0.8), 140);
      }
      if (flash > 0) {
        ctx!.fillStyle = `rgba(200, 180, 255, ${flash * 0.22})`;
        ctx!.fillRect(0, 0, W, H);
        if (bolt && flash > 0.45) {
          ctx!.strokeStyle = `rgba(240, 230, 255, ${flash})`;
          ctx!.shadowColor = "#b69cff";
          ctx!.shadowBlur = 25;
          ctx!.lineWidth = 2.5;
          ctx!.beginPath();
          bolt.forEach((p, i) => (i ? ctx!.lineTo(p.x, p.y) : ctx!.moveTo(p.x, p.y)));
          ctx!.stroke();
          ctx!.shadowBlur = 0;
        }
        flash *= 0.9;
        if (flash < 0.02) flash = 0;
      }
    }

    function render() {
      frame++;
      parallax.x += ((mouse.px - 0.5) * 2 - parallax.x) * 0.04;
      parallax.y += ((mouse.py - 0.5) * 2 - parallax.y) * 0.04;

      drawSky();
      drawStars();
      drawMoon();
      drawClouds();
      updateAndDrawBats("far");
      if (farHills) ctx!.drawImage(farHills, parallax.x * -6, 0, W, H);
      drawFog();
      if (landscape) ctx!.drawImage(landscape, parallax.x * -12, 0, W, H);
      ctx!.save();
      ctx!.translate(parallax.x * -12, 0);
      drawWindowsAndPumpkins();
      ctx!.restore();
      updateAndDrawBats("near");
      drawEmbers();
      drawLightning();

      if (!reducedMotion) raf = requestAnimationFrame(render);
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.px = e.clientX / W;
      mouse.py = e.clientY / H;
    }
    function onLeave() {
      mouse.x = mouse.y = -9999;
    }
    function onClick(e: MouseEvent) {
      if (reducedMotion) return;
      // Ignore clicks on interactive UI (form, links, buttons)
      const target = e.target as HTMLElement | null;
      if (target?.closest("form, a, button, input, label")) return;
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 5;
        bats.push(
          makeBat({
            x: e.clientX,
            y: e.clientY,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            heading: a,
            orbit: false,
            depth: 0.55 + Math.random() * 0.45,
            size: 14 + Math.random() * 20,
            flapSpeed: 0.5 + Math.random() * 0.2,
            life: 220,
          }),
        );
      }
      flash = Math.max(flash, 0.5);
    }

    resize();
    render();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("click", onClick);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 h-full w-full" />;
}
