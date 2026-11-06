"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Procedural Star Glow Texture
 */
function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.18, "rgba(220, 245, 255, 0.95)");
    gradient.addColorStop(0.45, "rgba(56, 189, 248, 0.35)");
    gradient.addColorStop(0.8, "rgba(14, 50, 120, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Comet Head Flare Texture (128x128)
 * Features brilliant white-cyan core with soft coma and 4-point cross diffraction spikes.
 */
function createCometHeadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Radial Coma Glow
    const coma = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    coma.addColorStop(0.0, "rgba(255, 255, 255, 1)");
    coma.addColorStop(0.12, "rgba(207, 250, 254, 0.95)");
    coma.addColorStop(0.28, "rgba(56, 189, 248, 0.65)");
    coma.addColorStop(0.55, "rgba(2, 132, 199, 0.2)");
    coma.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = coma;
    ctx.fillRect(0, 0, 128, 128);

    // Horizontal Diffraction Spike
    const hSpike = ctx.createLinearGradient(0, 64, 128, 64);
    hSpike.addColorStop(0.0, "rgba(56, 189, 248, 0)");
    hSpike.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
    hSpike.addColorStop(1.0, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = hSpike;
    ctx.fillRect(4, 62, 120, 4);

    // Vertical Diffraction Spike
    const vSpike = ctx.createLinearGradient(64, 0, 64, 128);
    vSpike.addColorStop(0.0, "rgba(56, 189, 248, 0)");
    vSpike.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
    vSpike.addColorStop(1.0, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = vSpike;
    ctx.fillRect(62, 4, 4, 120);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Diamond Starlet Sparkle Texture (64x64)
 * For the twinkling blue stardust wake ("destellos azules").
 */
function createSparkleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const cx = 32;
    const cy = 32;

    // Glowing diamond starlet
    ctx.fillStyle = "rgba(186, 230, 253, 0.9)";
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.quadraticCurveTo(cx, cy, 60, cy);
    ctx.quadraticCurveTo(cx, cy, cx, 60);
    ctx.quadraticCurveTo(cx, cy, 4, cy);
    ctx.quadraticCurveTo(cx, cy, cx, 4);
    ctx.fill();

    // Central white flare
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    centerGlow.addColorStop(0, "rgba(255, 255, 255, 1)");
    centerGlow.addColorStop(0.4, "rgba(56, 189, 248, 0.8)");
    centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Volumetric Nebula Cloud Puff Texture (256x256)
 */
function createNebulaCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.0, "rgba(255, 255, 255, 0.7)");
    grad.addColorStop(0.25, "rgba(180, 230, 255, 0.4)");
    grad.addColorStop(0.5, "rgba(80, 160, 255, 0.15)");
    grad.addColorStop(0.75, "rgba(30, 60, 180, 0.04)");
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = "rgba(200, 240, 255, 0.08)";
    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI * 2) / 7;
      const dist = 36 + (i % 2) * 18;
      const cx = 128 + Math.cos(angle) * dist;
      const cy = 128 + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(cx, cy, 48, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Ultra-HD Saturn Surface Texture (2048x1024)
 */
function createSaturnTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0.0, "#364d60");
    grad.addColorStop(0.05, "#465d70");
    grad.addColorStop(0.12, "#6d6d60");
    grad.addColorStop(0.2, "#a88d5e");
    grad.addColorStop(0.3, "#ccab70");
    grad.addColorStop(0.4, "#e5c58e");
    grad.addColorStop(0.48, "#f6e2bd");
    grad.addColorStop(0.52, "#faebd2");
    grad.addColorStop(0.56, "#eed3a5");
    grad.addColorStop(0.64, "#d8b479");
    grad.addColorStop(0.74, "#b9935b");
    grad.addColorStop(0.84, "#8a6839");
    grad.addColorStop(0.94, "#50391d");
    grad.addColorStop(1.0, "#2c1c0d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 1024);

    // North Polar Hexagon Jetstream
    const hexCenterX = 1024;
    const hexCenterY = 55;
    const hexRadius = 48;
    ctx.fillStyle = "rgba(42, 68, 88, 0.7)";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const x = hexCenterX + hexRadius * Math.cos(a);
      const y = hexCenterY + hexRadius * 0.45 * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    const polarEye = ctx.createRadialGradient(hexCenterX, hexCenterY, 2, hexCenterX, hexCenterY, 20);
    polarEye.addColorStop(0, "rgba(25, 45, 62, 0.95)");
    polarEye.addColorStop(1, "rgba(42, 68, 88, 0)");
    ctx.fillStyle = polarEye;
    ctx.beginPath();
    ctx.ellipse(hexCenterX, hexCenterY, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let y = 0; y < 1024; y += 2) {
      const f1 = y * 0.08;
      const f2 = y * 0.22;
      const noise = Math.sin(f1) * 0.6 + Math.cos(f2) * 0.4;
      const alpha = Math.max(0, noise * 0.2 + 0.05);

      if (y % 4 === 0) {
        ctx.fillStyle = `rgba(255, 248, 228, ${alpha * 0.65})`;
      } else {
        ctx.fillStyle = `rgba(60, 42, 18, ${alpha * 0.7})`;
      }
      ctx.fillRect(0, y, 2048, 2);
    }

    const stormGrad = ctx.createRadialGradient(1350, 410, 6, 1350, 410, 90);
    stormGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    stormGrad.addColorStop(0.35, "rgba(248, 236, 205, 0.5)");
    stormGrad.addColorStop(0.7, "rgba(220, 195, 145, 0.2)");
    stormGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = stormGrad;
    ctx.beginPath();
    ctx.ellipse(1350, 410, 140, 38, -0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural 2048px Ultra-HD Saturn Ring Texture
 */
function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    for (let x = 0; x < 2048; x++) {
      const u = x / 2048;

      if (u < 0.10 || u > 0.972) {
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
      } else if (u >= 0.10 && u < 0.22) {
        const t = (u - 0.10) / 0.12;
        ctx.fillStyle = `rgba(165, 140, 110, ${t * 0.18})`;
      } else if (u >= 0.22 && u < 0.40) {
        const t = (u - 0.22) / 0.18;
        const micro = Math.sin(x * 0.4) * 0.08 + 0.45;
        ctx.fillStyle = `rgba(195, 170, 135, ${t * micro * 0.7})`;
      } else if (u >= 0.40 && u < 0.68) {
        const micro = Math.sin(x * 0.3) * 0.08 + Math.cos(x * 0.7) * 0.05 + 0.88;
        ctx.fillStyle = `rgba(255, 242, 212, ${micro * 0.98})`;
      } else if (u >= 0.68 && u < 0.74) {
        if (u >= 0.693 && u <= 0.698) {
          ctx.fillStyle = "rgba(180, 160, 130, 0.28)";
        } else {
          ctx.fillStyle = "rgba(4, 3, 2, 0.02)";
        }
      } else if (u >= 0.74 && u < 0.94) {
        if (u >= 0.882 && u <= 0.892) {
          ctx.fillStyle = "rgba(4, 3, 2, 0.03)";
        } else if (u >= 0.932 && u <= 0.936) {
          ctx.fillStyle = "rgba(4, 3, 2, 0.04)";
        } else {
          const micro = Math.sin(x * 0.38) * 0.08 + 0.78;
          ctx.fillStyle = `rgba(238, 220, 188, ${micro * 0.88})`;
        }
      } else if (u >= 0.955 && u <= 0.970) {
        const fPeak = 1 - Math.abs(u - 0.9625) / 0.0075;
        ctx.fillStyle = `rgba(250, 235, 205, ${Math.max(0, fPeak) * 0.85})`;
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
      }

      ctx.fillRect(x, 0, 1, 1);
    }
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Titan Texture
 */
function createTitanTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, "#92400e");
    grad.addColorStop(0.3, "#d97706");
    grad.addColorStop(0.5, "#f59e0b");
    grad.addColorStop(0.7, "#d97706");
    grad.addColorStop(1, "#78350f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Terrestrial Planet Texture
 */
function createTerrestrialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#031733";
    ctx.fillRect(0, 0, 256, 128);

    ctx.fillStyle = "#0c3b5e";
    for (let i = 0; i < 18; i++) {
      const cx = (i * 47) % 256;
      const cy = (i * 29) % 128;
      const r = 18 + (i % 12);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(220, 245, 255, 0.35)";
    for (let i = 0; i < 12; i++) {
      const cx = (i * 37 + 20) % 256;
      const cy = (i * 19 + 15) % 128;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 35, 9, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Universe Canvas:
 * 1. Hyper-realistic Saturn with shadow mapping and orbiting moons Titan & Enceladus.
 * 2. Epic Volumetric Cosmic Nebula with vast gas veils and stardust filaments.
 * 3. Cinematic Blue Comet with glowing ion tail and sparkling diamond stardust wake ("destellos azules")!
 * 4. Supermassive Black Hole with Keplerian Accretion Disk & Gravitational Lensing.
 * 5. Smooth Mouse Parallax for cinematic depth.
 */
export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030611");

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0, 12);

    const starTexture = createStarTexture();
    const cometHeadTexture = createCometHeadTexture();
    const sparkleTexture = createSparkleTexture();
    const nebulaCloudTexture = createNebulaCloudTexture();

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0x0e1b30, 1.3);
    scene.add(ambientLight);

    // Primary Solar Directional Light
    const cosmicLight = new THREE.DirectionalLight(0xfff6e8, 3.4);
    cosmicLight.position.set(-11, 8, 10);
    cosmicLight.castShadow = true;
    cosmicLight.shadow.mapSize.width = 2048;
    cosmicLight.shadow.mapSize.height = 2048;
    cosmicLight.shadow.camera.near = 1;
    cosmicLight.shadow.camera.far = 35;
    cosmicLight.shadow.camera.left = -14;
    cosmicLight.shadow.camera.right = 14;
    cosmicLight.shadow.camera.top = 14;
    cosmicLight.shadow.camera.bottom = -14;
    cosmicLight.shadow.bias = -0.0002;
    scene.add(cosmicLight);

    // Subtle blue rim light from deep space
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(8, -6, -4);
    scene.add(rimLight);

    // ==========================================
    // 1. DEEP STARFIELD (3D background stars)
    // ==========================================
    const starCount = 3800;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starColorPalette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#bdeaff"),
      new THREE.Color("#7dd3fc"),
      new THREE.Color("#e0f2fe"),
      new THREE.Color("#fef08a"),
      new THREE.Color("#c4b5fd"),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const dist = 30 + Math.random() * 55;

      starPositions[i3] = dist * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = dist * Math.cos(phi);

      const color = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
      starColors[i3] = color.r;
      starColors[i3 + 1] = color.g;
      starColors[i3 + 2] = color.b;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.28,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // ==========================================
    // 2. EXPANSIVE VOLUMETRIC NEBULA
    // ==========================================
    const nebulaCount = 1800;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPositions = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);

    const colCyan = new THREE.Color("#0891b2");
    const colSky = new THREE.Color("#38bdf8");
    const colSapphire = new THREE.Color("#1e40af");
    const colViolet = new THREE.Color("#6b21a8");
    const colIndigo = new THREE.Color("#312e81");
    const colMagenta = new THREE.Color("#9d174d");

    for (let i = 0; i < nebulaCount; i++) {
      const i3 = i * 3;
      const region = i % 3;

      let x = 0;
      let y = 0;
      let z = 0;
      const col = new THREE.Color();

      if (region === 0) {
        // Broad Upper Cosmic Rift (sweeping across the upper background)
        const t = Math.random();
        x = -16 + t * 32;
        y = 3.5 + Math.sin(t * Math.PI) * 4.5 + (Math.random() - 0.5) * 5.0;
        z = -14 + (Math.random() - 0.5) * 8.0;

        if (t < 0.35) {
          col.lerpColors(colSky, colCyan, Math.random());
        } else if (t < 0.7) {
          col.lerpColors(colCyan, colSapphire, Math.random());
        } else {
          col.lerpColors(colSapphire, colViolet, Math.random());
        }
      } else if (region === 1) {
        // Deep Interstellar Veil (Soft luminous background wash)
        x = (Math.random() - 0.5) * 26;
        y = (Math.random() - 0.5) * 16;
        z = -18 + (Math.random() - 0.5) * 8;

        const mix = Math.random();
        if (mix < 0.45) {
          col.lerpColors(colIndigo, colSapphire, Math.random());
        } else if (mix < 0.8) {
          col.lerpColors(colViolet, colIndigo, Math.random());
        } else {
          col.lerpColors(colMagenta, colViolet, Math.random());
        }
      } else {
        // Lower Cosmic Gas Cloudbank
        const t = Math.random();
        x = -14 + t * 28;
        y = -5.0 - Math.sin(t * Math.PI) * 2.8 + (Math.random() - 0.5) * 4.0;
        z = -12 + (Math.random() - 0.5) * 6.0;

        col.lerpColors(colCyan, colSapphire, Math.random());
      }

      nebulaPositions[i3] = x;
      nebulaPositions[i3 + 1] = y;
      nebulaPositions[i3 + 2] = z;

      nebulaColors[i3] = col.r;
      nebulaColors[i3 + 1] = col.g;
      nebulaColors[i3 + 2] = col.b;
    }

    nebulaGeo.setAttribute("position", new THREE.BufferAttribute(nebulaPositions, 3));
    nebulaGeo.setAttribute("color", new THREE.BufferAttribute(nebulaColors, 3));

    const nebulaMat = new THREE.PointsMaterial({
      size: 7.5,
      map: nebulaCloudTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.14,
    });
    const nebulaPoints = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaPoints);

    // ==========================================
    // 3. PHOTOREALISTIC SATURN SYSTEM (Left)
    // ==========================================
    const saturnGroup = new THREE.Group();
    saturnGroup.position.set(-8.2, 0.35, -1.8);
    saturnGroup.rotation.x = 0.52;
    saturnGroup.rotation.y = -0.32;
    saturnGroup.rotation.z = 0.38;
    scene.add(saturnGroup);

    const saturnTexture = createSaturnTexture();
    const saturnGeo = new THREE.SphereGeometry(1.35, 64, 48);
    const saturnMat = new THREE.MeshStandardMaterial({
      map: saturnTexture,
      roughness: 0.7,
      metalness: 0.05,
    });
    const saturnMesh = new THREE.Mesh(saturnGeo, saturnMat);
    saturnMesh.scale.set(1.0, 0.902, 1.0);
    saturnMesh.castShadow = true;
    saturnMesh.receiveShadow = true;
    saturnGroup.add(saturnMesh);

    const saturnAtmoGeo = new THREE.SphereGeometry(1.37, 48, 32);
    const saturnAtmoMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const saturnAtmoMesh = new THREE.Mesh(saturnAtmoGeo, saturnAtmoMat);
    saturnAtmoMesh.scale.set(1.0, 0.902, 1.0);
    saturnGroup.add(saturnAtmoMesh);

    const saturnRingTexture = createSaturnRingTexture();
    const saturnRingGeo = new THREE.RingGeometry(1.65, 3.4, 128);
    const saturnRingMat = new THREE.MeshStandardMaterial({
      map: saturnRingTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
      roughness: 0.35,
      metalness: 0.08,
      alphaTest: 0.03,
    });
    const saturnRingMesh = new THREE.Mesh(saturnRingGeo, saturnRingMat);
    saturnRingMesh.rotation.x = Math.PI / 2;
    saturnRingMesh.castShadow = true;
    saturnRingMesh.receiveShadow = true;
    saturnGroup.add(saturnRingMesh);

    // Titan & Enceladus Moons
    const titanTexture = createTitanTexture();
    const titanGeo = new THREE.SphereGeometry(0.16, 24, 20);
    const titanMat = new THREE.MeshStandardMaterial({
      map: titanTexture,
      roughness: 0.8,
      metalness: 0.05,
    });
    const titanMesh = new THREE.Mesh(titanGeo, titanMat);
    titanMesh.castShadow = true;
    saturnGroup.add(titanMesh);

    const enceladusGeo = new THREE.SphereGeometry(0.07, 18, 14);
    const enceladusMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.15,
    });
    const enceladusMesh = new THREE.Mesh(enceladusGeo, enceladusMat);
    enceladusMesh.castShadow = true;
    saturnGroup.add(enceladusMesh);

    let titanAngle = 0.8;
    let enceladusAngle = 2.4;

    // ==========================================
    // 4. SUPERMASSIVE BLACK HOLE (Right side)
    // ==========================================
    const blackHoleGroup = new THREE.Group();
    blackHoleGroup.position.set(8.2, 0.5, -2.5);
    blackHoleGroup.rotation.x = 0.38;
    blackHoleGroup.rotation.z = -0.2;
    scene.add(blackHoleGroup);

    const horizonGeo = new THREE.SphereGeometry(1.15, 48, 48);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    horizon.renderOrder = 1;
    blackHoleGroup.add(horizon);

    const photonRingGeo = new THREE.RingGeometry(1.15, 1.28, 64);
    const photonRingMat = new THREE.MeshBasicMaterial({
      color: 0xe0f7ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const photonRing = new THREE.Mesh(photonRingGeo, photonRingMat);
    photonRing.rotation.x = Math.PI / 2;
    blackHoleGroup.add(photonRing);

    const diskParticleCount = 8500;
    const diskGeo = new THREE.BufferGeometry();
    const diskPositions = new Float32Array(diskParticleCount * 3);
    const diskColors = new Float32Array(diskParticleCount * 3);
    const diskData = new Float32Array(diskParticleCount * 2);

    const hotColor = new THREE.Color("#ffffff");
    const midCyan = new THREE.Color("#38bdf8");
    const midBlue = new THREE.Color("#0284c7");
    const outerViolet = new THREE.Color("#3b0764");

    for (let i = 0; i < diskParticleCount; i++) {
      const i3 = i * 3;
      const i2 = i * 2;

      const t = Math.pow(Math.random(), 2.2);
      const radius = 1.3 + t * 3.4;
      const angle = Math.random() * Math.PI * 2;

      diskData[i2] = radius;
      diskData[i2 + 1] = angle;

      const randomY = (Math.random() - 0.5) * 0.12 * (radius / 4.5);
      diskPositions[i3] = Math.cos(angle) * radius;
      diskPositions[i3 + 1] = randomY;
      diskPositions[i3 + 2] = Math.sin(angle) * radius;

      const col = new THREE.Color();
      if (t < 0.25) {
        col.lerpColors(hotColor, midCyan, t * 4);
      } else if (t < 0.65) {
        col.lerpColors(midCyan, midBlue, (t - 0.25) * 2.5);
      } else {
        col.lerpColors(midBlue, outerViolet, (t - 0.65) * 2.85);
      }

      diskColors[i3] = col.r;
      diskColors[i3 + 1] = col.g;
      diskColors[i3 + 2] = col.b;
    }

    diskGeo.setAttribute("position", new THREE.BufferAttribute(diskPositions, 3));
    diskGeo.setAttribute("color", new THREE.BufferAttribute(diskColors, 3));

    const diskMat = new THREE.PointsMaterial({
      size: 0.085,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
    });
    const diskPoints = new THREE.Points(diskGeo, diskMat);
    blackHoleGroup.add(diskPoints);

    const lensArchCount = 2500;
    const lensGeo = new THREE.BufferGeometry();
    const lensPositions = new Float32Array(lensArchCount * 3);
    const lensColors = new Float32Array(lensArchCount * 3);

    for (let i = 0; i < lensArchCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const r = 1.32 + Math.pow(Math.random(), 2) * 1.5;

      lensPositions[i3] = Math.cos(angle) * r;
      lensPositions[i3 + 1] = Math.sin(angle) * r;
      lensPositions[i3 + 2] = (Math.random() - 0.5) * 0.25;

      const col = new THREE.Color().lerpColors(midCyan, midBlue, Math.random());
      lensColors[i3] = col.r * 0.8;
      lensColors[i3 + 1] = col.g * 0.8;
      lensColors[i3 + 2] = col.b * 0.8;
    }

    lensGeo.setAttribute("position", new THREE.BufferAttribute(lensPositions, 3));
    lensGeo.setAttribute("color", new THREE.BufferAttribute(lensColors, 3));

    const lensMat = new THREE.PointsMaterial({
      size: 0.075,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.65,
    });
    const lensPoints = new THREE.Points(lensGeo, lensMat);
    blackHoleGroup.add(lensPoints);

    // ==========================================
    // 5. CINEMATIC BLUE COMET (SILKY PARTICLE TAIL & BLUE SPARKLES)
    // ==========================================
    // A) Comet Head Group (Diffraction starburst flare + bright core)
    const cometHeadGroup = new THREE.Group();
    scene.add(cometHeadGroup);

    // Brilliant Cross Starburst Sprite
    const cometSpriteMat = new THREE.SpriteMaterial({
      map: cometHeadTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 1.0,
      depthWrite: false,
    });
    const cometSprite = new THREE.Sprite(cometSpriteMat);
    cometSprite.scale.set(1.4, 1.4, 1);
    cometHeadGroup.add(cometSprite);

    // Core hot cyan-white nucleus orb
    const nucleusGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const nucleusMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    cometHeadGroup.add(nucleusMesh);

    // B) Luminous Silky Particle Ion Tail (NO rigid cones! 320 smooth overlapping gas particles)
    const TAIL_PARTICLES = 320;
    const tailPositions = new Float32Array(TAIL_PARTICLES * 3);
    const tailColors = new Float32Array(TAIL_PARTICLES * 3);
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPositions, 3));
    tailGeo.setAttribute("color", new THREE.BufferAttribute(tailColors, 3));

    const tailMat = new THREE.PointsMaterial({
      size: 0.65,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    });
    const tailPoints = new THREE.Points(tailGeo, tailMat);
    scene.add(tailPoints);

    // C) Sparkling Blue Stardust Wake ("Destellos Azules" - 400 diamond sparkles)
    const MAX_SPARKLES = 400;
    const sparklePositions = new Float32Array(MAX_SPARKLES * 3);
    const sparkleColors = new Float32Array(MAX_SPARKLES * 3);
    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    sparkleGeo.setAttribute("color", new THREE.BufferAttribute(sparkleColors, 3));

    const sparkleMat = new THREE.PointsMaterial({
      size: 0.38,
      map: sparkleTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1.0,
    });
    const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparklePoints);

    interface SparkleData {
      active: boolean;
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
      color: THREE.Color;
      twinkleSpeed: number;
    }

    const sparkles: SparkleData[] = Array.from({ length: MAX_SPARKLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      color: new THREE.Color(),
      twinkleSpeed: 20,
    }));

    const blueSparklePalette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#67e8f9"),
      new THREE.Color("#38bdf8"),
      new THREE.Color("#0284c7"),
      new THREE.Color("#60a5fa"),
      new THREE.Color("#93c5fd"),
    ];

    let cometActive = false;
    let cometProgress = 0;
    const cometDuration = 5.6; // Duration of sweep in seconds
    let nextCometTime = 2000; // First flight shortly after mount

    // Majestic parabolic sweep across the upper cosmos (above the login card)
    const P0 = new THREE.Vector3(-16, 8.5, -6.5);
    const P1 = new THREE.Vector3(0, 5.6, -5.2);
    const P2 = new THREE.Vector3(16, 7.0, -7.0);

    function getCometPosition(t: number, out: THREE.Vector3) {
      const u = 1 - t;
      out.x = u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x;
      out.y = u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y;
      out.z = u * u * P0.z + 2 * u * t * P1.z + t * t * P2.z;
      return out;
    }

    function getCometDirection(t: number, out: THREE.Vector3) {
      const u = 1 - t;
      out.x = 2 * u * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
      out.y = 2 * u * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
      out.z = 2 * u * (P1.z - P0.z) + 2 * t * (P2.z - P1.z);
      return out.normalize();
    }

    cometHeadGroup.visible = false;
    tailPoints.visible = false;

    // ==========================================
    // 6. DISTANT TERRESTRIAL EXOPLANET & GALAXY
    // ==========================================
    const terrestrialTexture = createTerrestrialTexture();
    const exoplanetGeo = new THREE.SphereGeometry(0.45, 36, 28);
    const exoplanetMat = new THREE.MeshStandardMaterial({
      map: terrestrialTexture,
      roughness: 0.9,
      metalness: 0.05,
    });
    const exoplanetMesh = new THREE.Mesh(exoplanetGeo, exoplanetMat);
    exoplanetMesh.position.set(-3.2, 4.0, -7.0);
    scene.add(exoplanetMesh);

    const exoAtmoGeo = new THREE.SphereGeometry(0.48, 32, 24);
    const exoAtmoMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const exoAtmoMesh = new THREE.Mesh(exoAtmoGeo, exoAtmoMat);
    exoAtmoMesh.position.copy(exoplanetMesh.position);
    scene.add(exoAtmoMesh);

    const galaxyGroup = new THREE.Group();
    galaxyGroup.position.set(0.5, -4.5, -14.0);
    galaxyGroup.rotation.x = 0.8;
    galaxyGroup.rotation.y = 0.4;
    scene.add(galaxyGroup);

    const galaxyParticleCount = 3500;
    const galaxyGeo = new THREE.BufferGeometry();
    const galaxyPositions = new Float32Array(galaxyParticleCount * 3);
    const galaxyColors = new Float32Array(galaxyParticleCount * 3);

    const galCore = new THREE.Color("#fef08a");
    const galArm = new THREE.Color("#38bdf8");
    const galOuter = new THREE.Color("#1e1b4b");

    for (let i = 0; i < galaxyParticleCount; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 2) * 5.0;
      const branches = 2;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const spin = r * 0.9;

      const spread = 0.3 * (r / 5.0) + 0.05;
      const rx = (Math.random() - 0.5) * spread;
      const ry = (Math.random() - 0.5) * spread * 0.4;
      const rz = (Math.random() - 0.5) * spread;

      const angle = branchAngle + spin;
      galaxyPositions[i3] = Math.cos(angle) * r + rx;
      galaxyPositions[i3 + 1] = ry;
      galaxyPositions[i3 + 2] = Math.sin(angle) * r + rz;

      const col = new THREE.Color();
      const normR = r / 5.0;
      if (normR < 0.25) {
        col.lerpColors(galCore, galArm, normR * 4);
      } else {
        col.lerpColors(galArm, galOuter, (normR - 0.25) * 1.33);
      }

      galaxyColors[i3] = col.r;
      galaxyColors[i3 + 1] = col.g;
      galaxyColors[i3 + 2] = col.b;
    }

    galaxyGeo.setAttribute("position", new THREE.BufferAttribute(galaxyPositions, 3));
    galaxyGeo.setAttribute("color", new THREE.BufferAttribute(galaxyColors, 3));

    const galaxyMat = new THREE.PointsMaterial({
      size: 0.12,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
    });
    const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
    galaxyGroup.add(galaxyPoints);

    // ==========================================
    // MOUSE PARALLAX & RESIZE (Dynamic Positioning)
    // ==========================================
    let mouseX = 0;
    let mouseY = 0;
    let targetCamX = 0;
    let targetCamY = 0;

    function handleMouseMove(e: MouseEvent) {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = normX * 0.7;
      mouseY = normY * 0.4;
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    function resize() {
      const parent = canvas?.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();

      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const distSaturn = camera.position.z - (-1.8);
      const visibleHeightSaturn = 2 * Math.tan(vFovRad / 2) * distSaturn;
      const visibleWidthSaturn = visibleHeightSaturn * camera.aspect;

      const cardPx = Math.min(896, width * 0.92);
      const cardLeftWorld = -(cardPx / width) * (visibleWidthSaturn / 2);
      const leftBoundaryWorld = -visibleWidthSaturn / 2;
      const availableLeftSpace = Math.abs(cardLeftWorld - leftBoundaryWorld);

      if (width >= 1024 && availableLeftSpace >= 3.0) {
        const targetSaturnX = (leftBoundaryWorld + cardLeftWorld) / 2;
        saturnGroup.position.set(targetSaturnX, 0.35, -1.8);
        const saturnScale = Math.min(1.05, Math.max(0.72, availableLeftSpace / 5.2));
        saturnGroup.scale.setScalar(saturnScale);

        const cardRightWorld = -cardLeftWorld;
        const rightBoundaryWorld = visibleWidthSaturn / 2;
        const targetBlackHoleX = (cardRightWorld + rightBoundaryWorld) / 2;
        blackHoleGroup.position.set(targetBlackHoleX, 0.4, -2.5);
        const bhScale = Math.min(1.0, Math.max(0.7, availableLeftSpace / 5.2));
        blackHoleGroup.scale.setScalar(bhScale);

        exoplanetMesh.position.set(-3.5, 4.2, -7.0);
        exoAtmoMesh.position.copy(exoplanetMesh.position);
      } else {
        saturnGroup.position.set(-2.6, 4.5, -3.2);
        saturnGroup.scale.setScalar(0.72);

        blackHoleGroup.position.set(2.6, 4.2, -4.2);
        blackHoleGroup.scale.setScalar(0.68);

        exoplanetMesh.position.set(-0.2, 5.2, -8.0);
        exoAtmoMesh.position.copy(exoplanetMesh.position);
      }
    }

    resize();
    window.addEventListener("resize", resize);

    // ==========================================
    // RENDER LOOP
    // ==========================================
    let rafId = 0;
    let disposed = false;
    let lastTime = performance.now();

    const cometPos = new THREE.Vector3();
    const cometDir = new THREE.Vector3();
    const tailRight = new THREE.Vector3();
    const tailUp = new THREE.Vector3(0, 1, 0);

    function render(currentTime: number) {
      if (disposed) return;
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (!reducedMotion) {
        // Rotate Saturn on its axis
        saturnMesh.rotation.y += delta * 0.14;
        saturnRingMesh.rotation.z += delta * 0.035;

        // Orbit Moons Titan & Enceladus
        titanAngle += delta * 0.06;
        titanMesh.position.set(
          Math.cos(titanAngle) * 5.2,
          Math.sin(titanAngle * 0.5) * 0.35,
          Math.sin(titanAngle) * 5.2
        );

        enceladusAngle += delta * 0.16;
        enceladusMesh.position.set(
          Math.cos(enceladusAngle) * 3.75,
          Math.sin(enceladusAngle * 0.4) * 0.15,
          Math.sin(enceladusAngle) * 3.75
        );

        // Volumetric Nebula gentle breathing drift
        nebulaPoints.rotation.y += delta * 0.005;
        nebulaPoints.rotation.z += delta * 0.002;

        // Rotate Exoplanet & Galaxy
        exoplanetMesh.rotation.y += delta * 0.08;
        galaxyPoints.rotation.y += delta * 0.06;
        starPoints.rotation.y += delta * 0.008;

        // Keplerian accretion disk rotation
        const posAttr = diskGeo.attributes.position as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;

        for (let i = 0; i < diskParticleCount; i++) {
          const i2 = i * 2;
          const i3 = i * 3;
          const r = diskData[i2];
          const speed = (0.7 / Math.pow(r, 1.3)) * delta;
          diskData[i2 + 1] += speed;
          const angle = diskData[i2 + 1];

          posArr[i3] = Math.cos(angle) * r;
          posArr[i3 + 2] = Math.sin(angle) * r;
        }
        posAttr.needsUpdate = true;
        lensPoints.rotation.z += delta * 0.05;

        // ==========================================
        // COMET & BLUE SPARKLES TRAIL SYSTEM
        // ==========================================
        if (!cometActive && currentTime > nextCometTime) {
          cometActive = true;
          cometProgress = 0;
          cometHeadGroup.visible = true;
          tailPoints.visible = true;
        }

        const tPosAttr = tailGeo.attributes.position as THREE.BufferAttribute;
        const tPosArr = tPosAttr.array as Float32Array;
        const tColAttr = tailGeo.attributes.color as THREE.BufferAttribute;
        const tColArr = tColAttr.array as Float32Array;

        if (cometActive) {
          cometProgress += delta / cometDuration;
          const tClamped = Math.min(cometProgress, 1);
          getCometPosition(tClamped, cometPos);
          getCometDirection(tClamped, cometDir);

          cometHeadGroup.position.copy(cometPos);

          // Head Starburst Twinkling & Subtle rotation
          const headPulse = Math.sin(currentTime * 0.018) * 0.15 + 0.95;
          cometSprite.scale.set(1.4 * headPulse, 1.4 * headPulse, 1);
          cometSprite.material.rotation += delta * 0.4;

          // Compute perpendicular vectors for conical tail spread
          tailRight.crossVectors(cometDir, tailUp).normalize();
          if (tailRight.lengthSq() < 0.1) tailRight.set(1, 0, 0);
          const tailPerpUp = new THREE.Vector3().crossVectors(tailRight, cometDir).normalize();

          // Construct Silky Continuous Gas Tail (Smooth particles tapering behind head)
          for (let k = 0; k < TAIL_PARTICLES; k++) {
            const k3 = k * 3;
            const u = k / TAIL_PARTICLES;
            const dist = u * 8.2; // Tail extends 8.2 units behind head
            const spread = Math.pow(u, 1.35) * 0.95; // Conical widening

            // Angle around the tail cylinder
            const angle = k * 2.39996; // Golden angle dispersion
            const rx = Math.cos(angle) * spread;
            const ry = Math.sin(angle) * spread;

            // Slight parabolic upward curvature of dust tail
            const curve = Math.pow(u, 1.9) * 0.55;

            tPosArr[k3] = cometPos.x - cometDir.x * dist + tailRight.x * rx + tailPerpUp.x * ry;
            tPosArr[k3 + 1] = cometPos.y - cometDir.y * dist + tailRight.y * rx + tailPerpUp.y * ry + curve;
            tPosArr[k3 + 2] = cometPos.z - cometDir.z * dist + tailRight.z * rx + tailPerpUp.z * ry;

            // Smooth luminous falloff
            const fade = Math.pow(1 - u, 1.1) * headPulse;

            if (u < 0.2) {
              // Brilliant white-cyan near the head
              tColArr[k3] = 1.0 * fade;
              tColArr[k3 + 1] = 0.95 * fade;
              tColArr[k3 + 2] = 1.0 * fade;
            } else if (u < 0.6) {
              // Electric blue mid-tail
              tColArr[k3] = 0.22 * fade;
              tColArr[k3 + 1] = 0.74 * fade;
              tColArr[k3 + 2] = 0.98 * fade;
            } else {
              // Deep sapphire fade
              tColArr[k3] = 0.05 * fade;
              tColArr[k3 + 1] = 0.35 * fade;
              tColArr[k3 + 2] = 0.85 * fade;
            }
          }
          tPosAttr.needsUpdate = true;
          tColAttr.needsUpdate = true;

          // Emit Sparkling Blue Diamond Dust ("Destellos Azules")
          const emitCount = Math.floor(Math.random() * 3) + 3;
          for (let e = 0; e < emitCount; e++) {
            const freeSparkle = sparkles.find((s) => !s.active);
            if (freeSparkle) {
              freeSparkle.active = true;
              freeSparkle.life = 0;
              freeSparkle.maxLife = 2.4 + Math.random() * 2.2;

              // Spawn inside the luminous wake
              const offsetDist = Math.random() * 1.5;
              const spread = (Math.random() - 0.5) * 0.4;
              freeSparkle.x = cometPos.x - cometDir.x * offsetDist + spread;
              freeSparkle.y = cometPos.y - cometDir.y * offsetDist + (Math.random() - 0.5) * 0.4;
              freeSparkle.z = cometPos.z - cometDir.z * offsetDist + (Math.random() - 0.5) * 0.4;

              // Gentle cosmic dispersion drift
              freeSparkle.vx = -cometDir.x * 0.6 + (Math.random() - 0.5) * 0.6;
              freeSparkle.vy = -cometDir.y * 0.6 + (Math.random() - 0.5) * 0.6;
              freeSparkle.vz = (Math.random() - 0.5) * 0.5;

              freeSparkle.color = blueSparklePalette[Math.floor(Math.random() * blueSparklePalette.length)];
              freeSparkle.twinkleSpeed = 16 + Math.random() * 18;
            }
          }

          if (cometProgress >= 1) {
            cometActive = false;
            cometHeadGroup.visible = false;
            tailPoints.visible = false;
            nextCometTime = currentTime + 8000 + Math.random() * 5000;
          }
        } else {
          // Zero out tail points when inactive
          for (let k = 0; k < TAIL_PARTICLES * 3; k++) {
            tPosArr[k] = 0;
            tColArr[k] = 0;
          }
          tPosAttr.needsUpdate = true;
          tColAttr.needsUpdate = true;
        }

        // Animate all active Blue Sparkles in space
        const sPosAttr = sparkleGeo.attributes.position as THREE.BufferAttribute;
        const sPosArr = sPosAttr.array as Float32Array;
        const sColAttr = sparkleGeo.attributes.color as THREE.BufferAttribute;
        const sColArr = sColAttr.array as Float32Array;

        for (let s = 0; s < MAX_SPARKLES; s++) {
          const sp = sparkles[s];
          const s3 = s * 3;

          if (sp.active) {
            sp.life += delta;
            sp.x += sp.vx * delta;
            sp.y += sp.vy * delta;
            sp.z += sp.vz * delta;

            sp.vx *= 0.985;
            sp.vy *= 0.985;

            const lifeRatio = sp.life / sp.maxLife;
            // High-frequency diamond star twinkle
            const twinkle = Math.sin(sp.life * sp.twinkleSpeed) * 0.35 + 0.65;
            const fade = Math.max(0, 1 - lifeRatio) * twinkle;

            sPosArr[s3] = sp.x;
            sPosArr[s3 + 1] = sp.y;
            sPosArr[s3 + 2] = sp.z;

            sColArr[s3] = sp.color.r * fade;
            sColArr[s3 + 1] = sp.color.g * fade;
            sColArr[s3 + 2] = sp.color.b * fade;

            if (sp.life >= sp.maxLife) {
              sp.active = false;
              sColArr[s3] = 0;
              sColArr[s3 + 1] = 0;
              sColArr[s3 + 2] = 0;
            }
          } else {
            sPosArr[s3] = 0;
            sPosArr[s3 + 1] = 0;
            sPosArr[s3 + 2] = 0;
            sColArr[s3] = 0;
            sColArr[s3 + 1] = 0;
            sColArr[s3 + 2] = 0;
          }
        }
        sPosAttr.needsUpdate = true;
        sColAttr.needsUpdate = true;
      }

      // Smooth Camera Parallax Lerp
      targetCamX = mouseX;
      targetCamY = mouseY;
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    // ==========================================
    // CLEANUP
    // ==========================================
    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);

      // Dispose Geometries
      starGeo.dispose();
      nebulaGeo.dispose();
      horizonGeo.dispose();
      photonRingGeo.dispose();
      diskGeo.dispose();
      lensGeo.dispose();
      saturnGeo.dispose();
      saturnAtmoGeo.dispose();
      saturnRingGeo.dispose();
      titanGeo.dispose();
      enceladusGeo.dispose();
      exoplanetGeo.dispose();
      exoAtmoGeo.dispose();
      galaxyGeo.dispose();
      nucleusGeo.dispose();
      tailGeo.dispose();
      sparkleGeo.dispose();

      // Dispose Materials & Textures
      starMat.dispose();
      nebulaMat.dispose();
      horizonMat.dispose();
      photonRingMat.dispose();
      diskMat.dispose();
      lensMat.dispose();
      saturnMat.dispose();
      saturnAtmoMat.dispose();
      saturnRingMat.dispose();
      titanMat.dispose();
      enceladusMat.dispose();
      exoplanetMat.dispose();
      exoAtmoMat.dispose();
      galaxyMat.dispose();
      cometSpriteMat.dispose();
      nucleusMat.dispose();
      tailMat.dispose();
      sparkleMat.dispose();

      starTexture.dispose();
      cometHeadTexture.dispose();
      sparkleTexture.dispose();
      nebulaCloudTexture.dispose();
      saturnTexture.dispose();
      saturnRingTexture.dispose();
      titanTexture.dispose();
      terrestrialTexture.dispose();

      renderer.dispose();
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
