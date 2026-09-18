"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  IntelligenceNode,
  NetworkGlobeData,
} from "./types";
import {
  DEMO_GLOBE_DATA,
  INITIAL_INTELLIGENCE_NODES,
  INITIAL_NETWORK_CONNECTIONS,
} from "./network-intelligence-data";
import {
  generateFibonacciGlobeDots,
  calculateCurvedArc3D,
  latLonToUnitVector3,
  GlobeDot,
} from "./globe-geo-data";
import { GlobeHud } from "./globe-hud";

interface NetworkGlobeProps {
  data?: NetworkGlobeData;
  className?: string;
}

interface ProjectedNode {
  node: IntelligenceNode;
  sx: number;
  sy: number;
  z: number;
  radius: number;
}

export function NetworkGlobe({
  data = DEMO_GLOBE_DATA,
  className = "",
}: NetworkGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<IntelligenceNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<IntelligenceNode | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return true;
  });

  // State refs for smooth animation loop access
  const isAutoRotatingRef = useRef<boolean>(true);
  const isUserInteractingRef = useRef<boolean>(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetCameraTriggerRef = useRef<boolean>(false);
  const hoveredNodeRef = useRef<IntelligenceNode | null>(null);
  const selectedNodeRef = useRef<IntelligenceNode | null>(null);

  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  const handleToggleRotation = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  const handleResetView = useCallback(() => {
    resetCameraTriggerRef.current = true;
  }, []);

  // Precompute 1,350 Fibonacci distributed dots
  const fibonacciDots = useMemo<GlobeDot[]>(() => {
    return generateFibonacciGlobeDots(1350);
  }, []);

  // Precompute node unit vectors
  const nodes = data.nodes || INITIAL_INTELLIGENCE_NODES;
  const connections = data.connections || INITIAL_NETWORK_CONNECTIONS;

  const nodeDataMap = useMemo(() => {
    const map = new Map<
      string,
      { node: IntelligenceNode; unit: [number, number, number] }
    >();
    nodes.forEach((n) => {
      map.set(n.id, {
        node: n,
        unit: latLonToUnitVector3(n.coordinates.lat, n.coordinates.lon),
      });
    });
    return map;
  }, [nodes]);

  // Precompute 3D curved arc points for each connection
  const arcCurves = useMemo(() => {
    return connections
      .map((conn) => {
        const source = nodeDataMap.get(conn.sourceId);
        const target = nodeDataMap.get(conn.targetId);
        if (!source || !target) return null;

        const points = calculateCurvedArc3D(source.unit, target.unit, 36);
        return {
          conn,
          source: source.node,
          target: target.node,
          points,
          speed: 0.0035 * (conn.flowSpeed || 1.0),
        };
      })
      .filter(Boolean) as {
      conn: (typeof connections)[0];
      source: IntelligenceNode;
      target: IntelligenceNode;
      points: [number, number, number][];
      speed: number;
    }[];
  }, [connections, nodeDataMap]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      isAutoRotatingRef.current = false;
    }

    // Globe orientation state (Default showing Europe, Middle East, Asia corridor)
    let yaw = -0.55;
    let pitch = 0.26;
    let targetYaw = yaw;
    let targetPitch = pitch;

    let zoom = 1.0;
    let targetZoom = 1.0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;

    let projectedNodes: ProjectedNode[] = [];

    // Pointer Interaction Handling
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      isDragging = true;
      isUserInteractingRef.current = true;
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }

      dragStartX = e.clientX;
      dragStartY = e.clientY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      container.setPointerCapture(e.pointerId);
      container.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDragging) {
        const deltaX = e.clientX - lastPointerX;
        const deltaY = e.clientY - lastPointerY;

        targetYaw += deltaX * 0.0055;
        targetPitch += deltaY * 0.0045;

        // Clamp pitch so sphere doesn't flip upside down
        targetPitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, targetPitch));

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      } else {
        // Check hover over front-facing nodes
        let foundHover: IntelligenceNode | null = null;
        for (const pn of projectedNodes) {
          if (pn.z > 0.05) {
            const dist = Math.hypot(mouseX - pn.sx, mouseY - pn.sy);
            if (dist <= Math.max(14, pn.radius * 3.5)) {
              foundHover = pn.node;
              break;
            }
          }
        }

        setHoveredNode(foundHover);
        container.style.cursor = foundHover ? "pointer" : "grab";
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      container.style.cursor = "grab";
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture release safety
      }

      // If clicked with minimal movement, handle node selection
      const dragDist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
      if (dragDist < 6) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let clickedNode: IntelligenceNode | null = null;
        for (const pn of projectedNodes) {
          if (pn.z > 0.05) {
            const dist = Math.hypot(mouseX - pn.sx, mouseY - pn.sy);
            if (dist <= Math.max(14, pn.radius * 3.5)) {
              clickedNode = pn.node;
              break;
            }
          }
        }

        setSelectedNode((prev) => (prev?.id === clickedNode?.id ? null : clickedNode));
      }

      // Resume auto-rotation after brief idle
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      interactionTimeoutRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 1500);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoom += e.deltaY * -0.001;
      targetZoom = Math.max(0.8, Math.min(1.35, targetZoom));

      isUserInteractingRef.current = true;
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      interactionTimeoutRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 1500);
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    // Handle high-resolution canvas sizing
    let width = 0;
    let height = 0;
    let dpr = 1;

    const updateDimensions = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || 500;
      height = container.clientHeight || 500;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    // Visibility observer to pause animation loop when scrolled away
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);

      if (!isVisible || width === 0 || height === 0) return;

      const elapsed = (now - startTime) * 0.001;

      // Handle Reset Camera Trigger
      if (resetCameraTriggerRef.current) {
        targetYaw = -0.55;
        targetPitch = 0.26;
        targetZoom = 1.0;
        resetCameraTriggerRef.current = false;
      }

      // Auto-rotation when idle
      if (
        isAutoRotatingRef.current &&
        !isUserInteractingRef.current &&
        !prefersReducedMotion
      ) {
        targetYaw += 0.0018;
      }

      // Smooth damping interpolation
      yaw += (targetYaw - yaw) * 0.08;
      pitch += (targetPitch - pitch) * 0.08;
      zoom += (targetZoom - zoom) * 0.08;

      // Clear Canvas (fully transparent)
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.42 * zoom;

      // Trigonometric cache for rotation
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      // Rotation helper: maps (x, y, z) on unit sphere to 3D view and 2D screen
      const project3D = (
        x: number,
        y: number,
        z: number,
        radiusScale: number = 1.0,
      ): [number, number, number] => {
        // Rotate around Y (Yaw)
        const x1 = x * cosYaw + z * sinYaw;
        const y1 = y;
        const z1 = -x * sinYaw + z * cosYaw;

        // Rotate around X (Pitch)
        const x2 = x1;
        const y2 = y1 * cosPitch - z1 * sinPitch;
        const z2 = y1 * sinPitch + z1 * cosPitch;

        // Perspective scale factor
        const persp = 1 + z2 * 0.16;
        const r = baseRadius * radiusScale;
        const sx = cx + x2 * r * persp;
        const sy = cy - y2 * r * persp;

        return [sx, sy, z2];
      };

      // 1. Subtle Outer Glow Ring & Atmosphere (transparent cyan)
      const glowGrad = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.7,
        cx,
        cy,
        baseRadius * 1.15,
      );
      glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.04)");
      glowGrad.addColorStop(0.75, "rgba(56, 189, 248, 0.02)");
      glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Render Fibonacci Dotted Sphere
      // Rear dots first, then front dots for correct depth
      for (const dot of fibonacciDots) {
        const [sx, sy, z] = project3D(dot.x, dot.y, dot.z);

        let alpha: number;
        let fillStyle: string;
        let radius: number;

        if (z > 0) {
          // Front hemisphere: crisp, vibrant NexusTrace blue/cyan
          if (dot.isLand) {
            alpha = 0.5 + 0.45 * z;
            fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
            radius = dot.baseRadius * (0.9 + 0.3 * z);
          } else {
            alpha = 0.08 + 0.12 * z;
            fillStyle = `rgba(37, 99, 160, ${alpha.toFixed(2)})`;
            radius = dot.baseRadius * (0.85 + 0.2 * z);
          }
        } else {
          // Back hemisphere: dim, subtle depth dots
          if (dot.isLand) {
            alpha = 0.06 + 0.14 * (z + 1);
            fillStyle = `rgba(30, 58, 95, ${alpha.toFixed(2)})`;
            radius = dot.baseRadius * 0.75;
          } else {
            alpha = 0.02 + 0.05 * (z + 1);
            fillStyle = `rgba(20, 40, 70, ${alpha.toFixed(2)})`;
            radius = dot.baseRadius * 0.65;
          }
        }

        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }

      // 3. Render Thin Curved Network Arcs & Traveling Light Particles
      for (const arc of arcCurves) {
        const projectedArcPoints: [number, number, number][] = [];
        let avgZ = 0;

        for (const pt of arc.points) {
          const [sx, sy, z] = project3D(pt[0], pt[1], pt[2]);
          projectedArcPoints.push([sx, sy, z]);
          avgZ += z;
        }
        avgZ /= arc.points.length;

        // Only draw arc if mostly front-facing
        if (avgZ > -0.3 && projectedArcPoints.length > 1) {
          const arcAlpha = Math.max(0.12, Math.min(0.55, 0.25 + 0.4 * (avgZ + 0.3)));

          ctx.beginPath();
          ctx.moveTo(projectedArcPoints[0][0], projectedArcPoints[0][1]);

          for (let i = 1; i < projectedArcPoints.length; i++) {
            ctx.lineTo(projectedArcPoints[i][0], projectedArcPoints[i][1]);
          }

          ctx.strokeStyle = `rgba(56, 189, 248, ${arcAlpha.toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Traveling Data Light Particle along arc
          if (arc.conn.activeTransmission && !prefersReducedMotion) {
            const particleProgress = (elapsed * arc.speed * 8 + (arc.conn.id.charCodeAt(5) || 0) * 0.2) % 1.0;
            const sampleIdx = Math.floor(particleProgress * (projectedArcPoints.length - 1));
            const ptA = projectedArcPoints[sampleIdx];
            const ptB = projectedArcPoints[Math.min(sampleIdx + 1, projectedArcPoints.length - 1)];

            const subT = particleProgress * (projectedArcPoints.length - 1) - sampleIdx;
            const px = ptA[0] + (ptB[0] - ptA[0]) * subT;
            const py = ptA[1] + (ptB[1] - ptA[1]) * subT;
            const pz = ptA[2] + (ptB[2] - ptA[2]) * subT;

            if (pz > 0.0) {
              // Glowing traveling packet
              ctx.beginPath();
              ctx.arc(px, py, 2.0, 0, Math.PI * 2);
              ctx.fillStyle = "#93c5fd";
              ctx.shadowColor = "#38bdf8";
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0; // Reset shadow
            }
          }
        }
      }

      // 4. Render Intelligence Nodes (Small, Elegant Points)
      const currentProjectedNodes: ProjectedNode[] = [];

      nodes.forEach((node, index) => {
        const item = nodeDataMap.get(node.id);
        if (!item) return;

        const [sx, sy, z] = project3D(item.unit[0], item.unit[1], item.unit[2], 1.01);

        const isHovered = hoveredNodeRef.current?.id === node.id;
        const isSelected = selectedNodeRef.current?.id === node.id;
        const isFocused = isHovered || isSelected;

        const nodeRadius = isFocused ? 4.5 : node.threatLevel === "critical" ? 3.4 : 2.8;

        currentProjectedNodes.push({
          node,
          sx,
          sy,
          z,
          radius: nodeRadius,
        });

        // Only draw front-facing nodes
        if (z > -0.05) {
          const nodeAlpha = Math.min(1, 0.45 + 0.65 * z);

          // Outer pulsing ring for front nodes
          if (!prefersReducedMotion) {
            const pulsePhase = (elapsed * 2.8 + index * 0.4) % Math.PI;
            const pulseRadius = nodeRadius + Math.sin(pulsePhase) * (isFocused ? 6 : 4);
            const pulseAlpha = (1 - Math.sin(pulsePhase)) * (isFocused ? 0.8 : 0.45);

            ctx.beginPath();
            ctx.arc(sx, sy, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha.toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Node core dot
          ctx.beginPath();
          ctx.arc(sx, sy, nodeRadius, 0, Math.PI * 2);

          if (isFocused) {
            ctx.fillStyle = "#60a5fa";
            ctx.shadowColor = "#38bdf8";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Small classification tag floating right next to node
            ctx.font = "600 9px monospace";
            ctx.fillStyle = "#93c5fd";
            ctx.fillText(node.classification.toUpperCase(), sx + 8, sy - 4);
          } else {
            // Subtle blue node with threat-based tinting
            if (node.threatLevel === "critical") {
              ctx.fillStyle = `rgba(248, 113, 113, ${nodeAlpha.toFixed(2)})`; // Red/crimson sparingly
            } else if (node.threatLevel === "high") {
              ctx.fillStyle = `rgba(251, 191, 36, ${nodeAlpha.toFixed(2)})`; // Amber
            } else {
              ctx.fillStyle = `rgba(56, 189, 248, ${nodeAlpha.toFixed(2)})`; // Bright cyan
            }
            ctx.fill();
          }
        }
      });

      projectedNodes = currentProjectedNodes;

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(render);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);

      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("wheel", onWheel);

      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [fibonacciDots, arcCurves, nodes, nodeDataMap]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full min-h-[360px] sm:min-h-[460px] lg:min-h-[560px] overflow-hidden select-none ${className}`}
      style={{ touchAction: "none" }}
      aria-label="Interactive 3D Dotted Criminal Network Globe"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full block outline-none"
        style={{ display: "block" }}
      />

      <GlobeHud
        totalNodes={nodes.length}
        totalConnections={connections.length}
        hoveredNode={hoveredNode}
        selectedNode={selectedNode}
        isAutoRotating={isAutoRotating}
        onToggleRotation={handleToggleRotation}
        onResetView={handleResetView}
      />
    </div>
  );
}
