"use client";

import { useEffect, useRef } from "react";

import { PARTICLES, PHASES, SPHERE, STORY } from "./config";
import { storyNodes } from "./data";
import { clamp } from "./math";
import { createParticleField, type ParticleField } from "./particles";
import { computeStoryFrame, nodeAppear } from "./phases";
import {
  createParticleRenderer,
  type ParticleRenderer,
} from "./render-particles";

type Tier = "mobile" | "desktop";

function setLayer(
  element: HTMLElement | null,
  opacity: number,
  shift: number,
  scale = 1,
): void {
  if (!element) return;
  element.style.opacity = opacity.toFixed(3);
  element.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) scale(${scale})`;
}

function setSize(element: HTMLElement | null, size: number): void {
  if (!element) return;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
}

export function useHeroStory(onStripActive: (active: boolean) => void) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const copy1Ref = useRef<HTMLDivElement>(null);
  const copy2Ref = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Callback terbaru disimpan di ref supaya efek di bawah tidak perlu dijalankan ulang.
  const stripCallback = useRef(onStripActive);
  useEffect(() => {
    stripCallback.current = onStripActive;
  }, [onStripActive]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!container || !canvas || !ctx) return;

    const size = { width: 0, height: 0, dpr: 1, radius: 0 };
    let field: ParticleField | null = null;
    let renderer: ParticleRenderer | null = null;
    let tier: Tier | null = null;

    const pointer = {
      x: -1e4,
      y: -1e4,
      targetX: -1e4,
      targetY: -1e4,
      strength: 0,
      active: false,
    };

    let stripActive = false;
    let smoothed = 0;
    let lastTime = 0;
    let frameId = 0;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      size.width = rect.width;
      size.height = rect.height;
      size.dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.radius = clamp(
        rect.height * SPHERE.radiusRatio,
        SPHERE.minRadius,
        SPHERE.maxRadius,
      );

      canvas.width = Math.round(rect.width * size.dpr);
      canvas.height = Math.round(rect.height * size.dpr);

      const nextTier: Tier =
        rect.width < STORY.mobileBreakpoint ? "mobile" : "desktop";
      if (nextTier !== tier) {
        tier = nextTier;
        field = createParticleField(PARTICLES.count[nextTier], PARTICLES.seed);
        renderer = createParticleRenderer(field);
      }

      setSize(logoRef.current, size.radius * SPHERE.logoScale);
      setSize(glowRef.current, size.radius * SPHERE.glowScale);
    };

    /** Progres 0..1 di sepanjang section tinggi ini. */
    const readTarget = (): number => {
      const rect = container.getBoundingClientRect();
      const scrollable = rect.height - size.height;
      return scrollable > 0 ? clamp(-rect.top / scrollable) : 0;
    };

    const render = (progress: number, time: number, dt: number) => {
      const { width, height, dpr, radius } = size;
      if (width === 0 || height === 0 || !renderer) return;

      const story = computeStoryFrame(progress);
      const centerX = width / 2;
      const centerY = height * SPHERE.centerY;

      // Kursor: tolakan hanya aktif selama bola masih utuh.
      const pointerEase = 1 - Math.exp(-dt * 12);
      pointer.x += (pointer.targetX - pointer.x) * pointerEase;
      pointer.y += (pointer.targetY - pointer.y) * pointerEase;
      const strengthTarget = pointer.active && story.disperse < 0.2 ? 1 : 0;
      pointer.strength += (strengthTarget - pointer.strength) * (1 - Math.exp(-dt * 6));

      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      renderer.draw(ctx, {
        width,
        height,
        time,
        radius,
        centerX,
        centerY,
        disperse: story.disperse,
        pointer,
      });
      void dpr;

      setLayer(introRef.current, story.intro.opacity, story.intro.shift);
      setLayer(copy1Ref.current, story.copy1.opacity, story.copy1.shift);
      setLayer(copy2Ref.current, story.copy2.opacity, story.copy2.shift);
      setLayer(stripRef.current, story.strip.opacity, story.strip.shift);

      const logo = logoRef.current;
      if (logo) {
        const half = (radius * SPHERE.logoScale) / 2;
        logo.style.opacity = story.logo.opacity.toFixed(3);
        logo.style.transform = `translate3d(${(centerX - half).toFixed(1)}px, ${(centerY - half).toFixed(1)}px, 0) scale(${story.logo.scale.toFixed(3)})`;
      }

      const glow = glowRef.current;
      if (glow) {
        const half = (radius * SPHERE.glowScale) / 2;
        glow.style.opacity = (1 - clamp(story.disperse * 2.5)).toFixed(3);
        glow.style.transform = `translate3d(${(centerX - half).toFixed(1)}px, ${(centerY - half).toFixed(1)}px, 0)`;
      }

      const mobile = width < STORY.mobileBreakpoint;
      const nodeElements = nodeRefs.current;

      for (let i = 0; i < storyNodes.length; i++) {
        const element = nodeElements[i];
        const node = storyNodes[i];
        if (!element || !node) continue;

        const appear = mobile && !node.mobile ? 0 : nodeAppear(progress, i, storyNodes.length);
        if (appear === 0) {
          element.style.opacity = "0";
          continue;
        }

        const phase = i * 1.7;
        const x =
          width / 2 + ((node.x * width) / 2) * 0.94 + Math.sin(time * 0.6 + phase) * 5;
        const y =
          height / 2 +
          ((node.y * height) / 2) * 0.9 -
          (progress - PHASES.nodesIn[0]) * node.depth * height * PHASES.nodeParallax +
          Math.cos(time * 0.5 + phase * 1.3) * 5;
        const scale = (0.55 + 0.45 * appear) * (1 - 0.12 * story.nodesDim);

        element.style.opacity = (appear * (1 - PHASES.nodeDim * story.nodesDim)).toFixed(3);
        element.style.transform = `translate3d(${(x - node.size / 2).toFixed(1)}px, ${(y - node.size / 2).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      }

      if (story.stripActive !== stripActive) {
        stripActive = story.stripActive;
        stripCallback.current(stripActive);
      }
    };

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Mengejar posisi scroll dengan inersia: ini yang membuat gerakan terasa mengalir.
      const target = readTarget();
      smoothed += (target - smoothed) * (1 - Math.exp(-dt * STORY.smoothing));
      if (Math.abs(target - smoothed) < 0.0002) smoothed = target;

      render(smoothed, now / 1000, dt);
    };

    const start = () => {
      if (frameId !== 0) return;
      lastTime = performance.now();
      frameId = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    // Loop hanya berjalan saat section terlihat: hemat baterai.
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else stop();
    });

    const resize = new ResizeObserver(layout);

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      const rect = canvas.getBoundingClientRect();
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;

      if (!pointer.active) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
        pointer.active = true;
      }
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    layout();
    smoothed = readTarget();

    resize.observe(canvas);
    visibility.observe(container);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      stop();
      visibility.disconnect();
      resize.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return {
    containerRef,
    canvasRef,
    introRef,
    logoRef,
    glowRef,
    copy1Ref,
    copy2Ref,
    stripRef,
    nodeRefs,
  };
}