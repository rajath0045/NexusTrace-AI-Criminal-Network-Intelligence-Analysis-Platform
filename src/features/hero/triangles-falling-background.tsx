"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  baseXRatio: number;
  layer: 0 | 1 | 2; // 0 = background (slow/small), 1 = mid (normal), 2 = foreground (fast/large)
  size: number;
  speedY: number;
  driftAmp: number;
  driftFreq: number;
  driftPhase: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
  fillColor: string;
  strokeColor: string;
  opacity: number;
  hasGlow: boolean;
  shapeRatio: number; // vertex shape variation
}

// Curated Black + Blue palette (deep navy, electric blue, vibrant cyan)
const PALETTE_BG = [
  "rgba(30, 58, 138, ",  // #1E3A8A deep navy
  "rgba(29, 78, 216, ",  // #1D4ED8 deep blue
  "rgba(37, 99, 235, ",  // #2563EB royal blue
];

const PALETTE_MID = [
  "rgba(37, 99, 235, ",  // #2563EB electric blue
  "rgba(14, 165, 233, ", // #0EA5E9 bright cyan
  "rgba(59, 130, 246, ", // #3B82F6 pure blue
];

const PALETTE_FG = [
  "rgba(56, 189, 248, ", // #38BDF8 vibrant cyan-blue
  "rgba(96, 165, 250, ", // #60A5FA electric light blue
  "rgba(37, 99, 235, ",  // #2563EB rich blue
];

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function TrianglesFallingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const overscan = 80; // Render triangles outside viewport to eliminate edge gaps

    // Mouse parallax offsets
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    let particles: Particle[] = [];

    // Helper to create a single particle in a specific layer
    function createParticle(
      layer: 0 | 1 | 2,
      initY?: number,
      initX?: number,
    ): Particle {
      let size: number;
      let speedY: number;
      let opacity: number;
      let colorPrefix: string;
      let hasGlow = false;

      if (layer === 0) {
        // Background layer: small, low opacity, slow
        size = randomRange(9, 17);
        speedY = randomRange(22, 42); // ~18-26s travel time
        opacity = randomRange(0.2, 0.4);
        colorPrefix = PALETTE_BG[Math.floor(Math.random() * PALETTE_BG.length)]!;
      } else if (layer === 1) {
        // Mid layer: medium, moderate opacity, normal speed
        size = randomRange(18, 32);
        speedY = randomRange(50, 85); // ~10-16s travel time
        opacity = randomRange(0.4, 0.7);
        colorPrefix = PALETTE_MID[Math.floor(Math.random() * PALETTE_MID.length)]!;
        hasGlow = Math.random() > 0.65;
      } else {
        // Foreground layer: larger, higher opacity, faster
        size = randomRange(34, 52);
        speedY = randomRange(95, 140); // ~7-11s travel time
        opacity = randomRange(0.65, 0.88);
        colorPrefix = PALETTE_FG[Math.floor(Math.random() * PALETTE_FG.length)]!;
        hasGlow = true;
      }

      const spawnX =
        initX !== undefined
          ? initX
          : randomRange(-overscan, width + overscan);

      const spawnY =
        initY !== undefined
          ? initY
          : -overscan - randomRange(10, 120);

      return {
        x: spawnX,
        y: spawnY,
        baseXRatio: width > 0 ? spawnX / width : Math.random(),
        layer,
        size,
        speedY,
        driftAmp: randomRange(8, 26),
        driftFreq: randomRange(0.4, 1.2),
        driftPhase: randomRange(0, Math.PI * 2),
        rotX: randomRange(0, Math.PI * 2),
        rotY: randomRange(0, Math.PI * 2),
        rotZ: randomRange(0, Math.PI * 2),
        rotSpeedX: randomRange(-1.4, 1.4),
        rotSpeedY: randomRange(-1.6, 1.6),
        rotSpeedZ: randomRange(-0.9, 0.9),
        fillColor: `${colorPrefix}${opacity})`,
        strokeColor: `${colorPrefix}${Math.min(1, opacity + 0.2)})`,
        opacity,
        hasGlow,
        shapeRatio: randomRange(0.85, 1.25),
      };
    }

    // Determine target particle count based on viewport width
    function getParticleCount(w: number) {
      if (w > 1600) return 150; // Ultrawide / large screens
      if (w > 1024) return 125; // Standard desktop / laptop
      if (w > 640) return 95;   // Tablet
      return 65;                // Mobile
    }

    // Initialize or resize particle field with stratified full-screen pre-fill
    function initParticles() {
      const targetCount = getParticleCount(width);
      const totalYRange = height + 2 * overscan;
      const totalXRange = width + 2 * overscan;

      particles = [];

      // Stratified pre-seeding across vertical bands and horizontal columns
      // Guarantees zero blank sections at page load!
      for (let i = 0; i < targetCount; i++) {
        // Layer distribution: ~38% bg, ~44% mid, ~18% fg
        const layerRand = Math.random();
        const layer: 0 | 1 | 2 =
          layerRand < 0.38 ? 0 : layerRand < 0.82 ? 1 : 2;

        // Stratified vertical slot to cover top, middle, bottom, and overscans
        const normalizedY = (i + randomRange(-0.4, 0.4)) / targetCount;
        const initialY = -overscan + normalizedY * totalYRange;

        // Controlled horizontal spread to guarantee 0% -> 100% full coverage
        const colIndex = i % 12; // 12 horizontal sub-zones
        const initialX =
          -overscan +
          (colIndex / 12) * totalXRange +
          randomRange(0, totalXRange / 12);

        particles.push(createParticle(layer, initialY, initialX));
      }
    }

    // Handle viewport resize smoothly without particle jumping
    function handleResize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newWidth = rect.width;
      const newHeight = rect.height;

      if (newWidth === 0 || newHeight === 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(newWidth * dpr);
      canvas.height = Math.round(newHeight * dpr);

      const oldWidth = width;
      width = newWidth;
      height = newHeight;

      if (particles.length === 0 || oldWidth === 0) {
        initParticles();
      } else {
        // Rescale existing particles horizontally to avoid empty strips
        const scaleX = width / oldWidth;
        particles.forEach((p) => {
          p.x = p.x * scaleX;
        });

        // Add or trim particles if count changed significantly
        const targetCount = getParticleCount(width);
        while (particles.length < targetCount) {
          const l: 0 | 1 | 2 = Math.random() < 0.4 ? 0 : Math.random() < 0.8 ? 1 : 2;
          particles.push(
            createParticle(
              l,
              randomRange(-overscan, height + overscan),
              randomRange(-overscan, width + overscan),
            ),
          );
        }
        if (particles.length > targetCount + 15) {
          particles.length = targetCount;
        }
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });

    // Track mouse for subtle parallax
    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      targetMouseX = (e.clientX - halfW) / halfW;
      targetMouseY = (e.clientY - halfH) / halfH;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // 3D Euler rotation projection for dynamic tumbling
    function projectVertex(
      vx: number,
      vy: number,
      vz: number,
      rx: number,
      ry: number,
      rz: number,
    ): [number, number] {
      // Rotate around X (pitch)
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const y1 = vy * cosX - vz * sinX;
      const z1 = vy * sinX + vz * cosX;
      const x1 = vx;

      // Rotate around Y (yaw)
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const x2 = x1 * cosY + z1 * sinY;
      const y2 = y1;

      // Rotate around Z (roll)
      const cosZ = Math.cos(rz);
      const sinZ = Math.sin(rz);
      const x3 = x2 * cosZ - y2 * sinZ;
      const y3 = x2 * sinZ + y2 * cosZ;

      return [x3, y3];
    }

    let lastTime = performance.now();

    // Main animation loop
    function render(currentTime: number) {
      if (!ctx || width === 0 || height === 0) return;

      const elapsed = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Render each particle with 3D projection and continuous immediate recycling
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;

        if (!prefersReducedMotion) {
          // Continuous falling motion
          p.y += p.speedY * elapsed;

          // Organic horizontal sway
          p.x += Math.sin(currentTime * 0.001 * p.driftFreq + p.driftPhase) * p.driftAmp * elapsed;

          // 3D tumbling rotation
          p.rotX += p.rotSpeedX * elapsed;
          p.rotY += p.rotSpeedY * elapsed;
          p.rotZ += p.rotSpeedZ * elapsed;

          // IMMEDIATE RECYCLING:
          // As soon as particle exits below viewport + overscan,
          // instantly recycle it above the viewport with fresh X and rotations.
          // Zero batches, zero pauses, truly continuous!
          if (p.y > height + overscan) {
            p.y = -overscan - randomRange(10, 60);
            p.x = randomRange(-overscan, width + overscan);
            p.rotX = randomRange(0, Math.PI * 2);
            p.rotY = randomRange(0, Math.PI * 2);
            p.rotZ = randomRange(0, Math.PI * 2);
            p.driftPhase = randomRange(0, Math.PI * 2);
          }
        }

        // Parallax offset based on depth layer (foreground shifts more than background)
        const layerParallax = (p.layer + 1) * 12;
        const renderX = p.x + mouseX * layerParallax;
        const renderY = p.y + mouseY * (layerParallax * 0.6);

        // 3D Triangle Vertices in local coordinate space
        const r = p.size;
        const hRatio = p.shapeRatio;
        const v1: [number, number, number] = [0, -r * 0.9, 0];
        const v2: [number, number, number] = [r * 0.866 * hRatio, r * 0.5, 0];
        const v3: [number, number, number] = [-r * 0.866 * hRatio, r * 0.5, 0];

        const [p1x, p1y] = projectVertex(v1[0], v1[1], v1[2], p.rotX, p.rotY, p.rotZ);
        const [p2x, p2y] = projectVertex(v2[0], v2[1], v2[2], p.rotX, p.rotY, p.rotZ);
        const [p3x, p3y] = projectVertex(v3[0], v3[1], v3[2], p.rotX, p.rotY, p.rotZ);

        ctx.beginPath();
        ctx.moveTo(renderX + p1x, renderY + p1y);
        ctx.lineTo(renderX + p2x, renderY + p2y);
        ctx.lineTo(renderX + p3x, renderY + p3y);
        ctx.closePath();

        // Lighting & Glow
        if (p.hasGlow) {
          ctx.shadowColor = "rgba(56, 189, 248, 0.55)";
          ctx.shadowBlur = 10;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = p.fillColor;
        ctx.fill();

        ctx.strokeStyle = p.strokeColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      ctx.restore();

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    }

    // Start render loop immediately
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="triangles-falling-root pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Deep cosmic background with subtle electric blue center void */}
      <div className="triangles-background-vortex absolute inset-0" />

      {/* High-performance Continuous Falling Triangles Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
      />

      {/* Subtle outer vignette & soft center shield to maintain crisp text readability */}
      <div className="triangles-readability-overlay absolute inset-0 pointer-events-none" />
    </div>
  );
}
