"use client";

import { useEffect, useRef } from "react";

interface RainTextProps {
  fontSize: number;
  color: string;
  characters: string;
  fadeOpacity: number;
  speed: number;
}

interface RainStream {
  brightness: number;
  characters: string[];
  length: number;
  speed: number;
  x: number;
  y: number;
}

const FONT_FAMILY = 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace';
const ROWS_PER_SECOND = 8;

function randomInteger(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function streamLength() {
  const probability = Math.random();

  if (probability < 0.3) return randomInteger(5, 10);
  if (probability < 0.75) return randomInteger(10, 22);
  if (probability < 0.95) return randomInteger(22, 40);

  return randomInteger(40, 56);
}

/**
 * Binary Matrix rain with independent, seeded streams. Trails are drawn at
 * their intended opacity every frame, keeping the glyphs sharp at all DPIs.
 */
export function RainText({
  fontSize,
  color,
  characters,
  fadeOpacity,
  speed,
}: RainTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let height = 0;
    let streams: RainStream[] = [];
    let width = 0;
    let previousFrame = performance.now();
    const resolvedColor = color.startsWith("var(--")
      ? getComputedStyle(document.documentElement).getPropertyValue(
          color.slice(4, -1),
        ).trim()
      : color;
    const randomCharacter = () =>
      characters[Math.floor(Math.random() * characters.length)] ?? "0";

    const createStream = (x: number, initial = false): RainStream => {
      const length = streamLength();
      const trailHeight = length * fontSize;

      return {
        brightness: 0.52 + Math.random() * 0.48,
        characters: Array.from({ length }, randomCharacter),
        length,
        speed: 0.8 + Math.random() * 0.45,
        x,
        y: initial
          ? Math.random() * (height + trailHeight) - trailHeight
          : -trailHeight * (0.35 + Math.random() * 0.95),
      };
    };

    const resize = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.font = `${fontSize}px ${FONT_FAMILY}`;
      context.textBaseline = "top";
      context.shadowBlur = 0;

      const potentialColumns = Math.ceil(width / (fontSize * 1.15));
      const targetStreamCount = Math.min(55, Math.max(14, Math.round(width / 28)));
      const activationProbability = targetStreamCount / potentialColumns;

      streams = Array.from({ length: potentialColumns }, (_, index) => index)
        .filter(() => Math.random() < activationProbability)
        .map((index) => {
          const baseX = index * fontSize * 1.15;
          const jitter = (Math.random() - 0.5) * fontSize * 0.4;

          return createStream(baseX + jitter, true);
        });
    };

    const draw = (now: number) => {
      const elapsed = Math.min((now - previousFrame) / 1000, 0.1);
      previousFrame = now;
      context.clearRect(0, 0, width, height);
      context.fillStyle = resolvedColor;

      for (let streamIndex = 0; streamIndex < streams.length; streamIndex += 1) {
        let stream = streams[streamIndex];
        stream.y += elapsed * fontSize * ROWS_PER_SECOND * speed * stream.speed;

        if (stream.y - stream.length * fontSize > height) {
          stream = createStream(stream.x);
          streams[streamIndex] = stream;
        }

        for (let characterIndex = 0; characterIndex < stream.length; characterIndex += 1) {
          const progress = characterIndex / Math.max(1, stream.length - 1);
          const tailOpacity = fadeOpacity + (1 - fadeOpacity) * (1 - progress) ** 1.45;
          const y = stream.y - characterIndex * fontSize;

          if (y < -fontSize || y > height) continue;

          context.globalAlpha = Math.min(1, stream.brightness * tailOpacity);
          context.fillText(stream.characters[characterIndex], stream.x, y);
        }
      }

      context.globalAlpha = 1;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [characters, color, fadeOpacity, fontSize, speed]);

  return <canvas ref={canvasRef} className="matrix-code-canvas" aria-hidden="true" />;
}
