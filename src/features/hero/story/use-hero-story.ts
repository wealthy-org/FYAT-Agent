
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
  element.style.transform =
    `translate3d(0, ${shift.toFixed(1)}px, 0) scale(${scale})`;
}

function setSize(element: HTMLElement | null, size: number): void {
  if (!element) return;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
}

export function useHeroStory(
  onStripActive?: (active: boolean) => void) {  
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const copy1Ref = useRef<HTMLDivElement>(null);
  const copy2Ref = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const darkOverlayRef = useRef<HTMLDivElement>(null);

  const stripCallback = useRef(onStripActive);

  useEffect(() => {
    stripCallback.current = onStripActive;
  }, [onStripActive]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!container || !canvas || !ctx) return;

    const size = {
      width: 0,
      height: 0,
      dpr: 1,
      radius: 0,
    };

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
        field = createParticleField(
          PARTICLES.count[nextTier],
          PARTICLES.seed,
        );
        renderer = createParticleRenderer(field);
      }

      setSize(logoRef.current, size.radius * SPHERE.logoScale);
      setSize(glowRef.current, size.radius * SPHERE.glowScale);
    };

    const readTarget = (): number => {
      const rect = container.getBoundingClientRect();
      const scrollable = rect.height - size.height;

      return scrollable > 0
        ? clamp(-rect.top / scrollable)
        : 0;
    };

    const render = (progress: number, time: number, dt: number) => {
      const { width, height, dpr, radius } = size;

      if (width === 0 || height === 0 || !renderer) return;

      const story = computeStoryFrame(progress);
      
      const statsTransition = clamp(
        (progress - PHASES.copy2In[0]) /
          (PHASES.strip[1] - PHASES.copy2In[0]),
      );

      const darkProgress =
        statsTransition * statsTransition *
        (3 - 2 * statsTransition);

      if (darkOverlayRef.current) {
        darkOverlayRef.current.style.opacity =
          (darkProgress * 0.72).toFixed(3);
      }

      const centerX = width / 2;
      const centerY = height * SPHERE.centerY;

      // Gerakan pointer yang halus.
      const pointerEase = 1 - Math.exp(-dt * 12);

      pointer.x += (pointer.targetX - pointer.x) * pointerEase;
      pointer.y += (pointer.targetY - pointer.y) * pointerEase;

      // Pointer aktif saat orbit terlihat maupun ketika bola masih utuh.
      const orbitStart = PHASES.nodesIn[0];

      const strengthTarget =
        pointer.active &&
        progress >= PHASES.nodesIn[0] &&
        progress < PHASES.copy2In[1]
          ? 1
          : 0;

      pointer.strength +=
        (strengthTarget - pointer.strength) *
        (1 - Math.exp(-dt * 6));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

      setLayer(
        introRef.current,
        story.intro.opacity,
        story.intro.shift,
      );

      setLayer(
        copy1Ref.current,
        story.copy1.opacity,
        story.copy1.shift,
      );

      setLayer(
        copy2Ref.current,
        story.copy2.opacity,
        story.copy2.shift,
      );

      setLayer(
        stripRef.current,
        story.strip.opacity,
        story.strip.shift,
      );

      const logo = logoRef.current;

      if (logo) {
        const half = (radius * SPHERE.logoScale) / 2;

        logo.style.opacity = story.logo.opacity.toFixed(3);

        logo.style.transform =
          `translate3d(${(centerX - half).toFixed(1)}px, ` +
          `${(centerY - half).toFixed(1)}px, 0) ` +
          `scale(${story.logo.scale.toFixed(3)})`;
      }

      const glow = glowRef.current;

      if (glow) {
        const half = (radius * SPHERE.glowScale) / 2;

        glow.style.opacity = (
          1 - clamp(story.disperse * 2.5)
        ).toFixed(3);

        glow.style.transform =
          `translate3d(${(centerX - half).toFixed(1)}px, ` +
          `${(centerY - half).toFixed(1)}px, 0)`;
      }

      // ==========================================
      // ORBIT NODE 2D
      // ==========================================

      const nodeElements = nodeRefs.current;

      // Radius X dan Y sama agar lintasan berbentuk lingkaran
      const orbitGroups = [
        { count: 8, radius: 0.24, speed: 0.12 },
        { count: 13, radius: 0.36, speed: -0.08 },
        { count: 16, radius: 0.48, speed: 0.05 },
      ];

      const orbitProgress = clamp(
        (progress - orbitStart) / 0.12,
      );

      const orbitEase =
        orbitProgress *
        orbitProgress *
        (3 - 2 * orbitProgress);

      const orbitCenterX = width / 2;
      const orbitCenterY = height * 0.49;

      let nodeIndex = 0;

      for (const group of orbitGroups) {
        for (let j = 0; j < group.count; j++) {
          const i = nodeIndex++;

          const element = nodeElements[i];
          const node = storyNodes[i];

          if (!element || !node) continue;

          const appear = nodeAppear(
            progress,
            i,
            storyNodes.length,
          );

          if (appear <= 0 || orbitEase <= 0) {
            element.style.opacity = "0";
            continue;
          }

          // Satu radius untuk sumbu X dan Y: orbit 2D berbentuk lingkaran.
          const angle =
            (j / group.count) * Math.PI * 2 +
            time * group.speed;
          
          const orbitRadius = Math.max(
            0,
            Math.min(
              width * group.radius,
              height * group.radius,
              width / 2 - node.size / 2 - 4,
              height / 2 - node.size / 2 - 4,
            ),
          );

          let x =
            orbitCenterX +
            Math.cos(angle) * orbitRadius;

          let y =
            orbitCenterY +
            Math.sin(angle) * orbitRadius;

          // Tolakan mouse tanpa efek perspektif 3D.
          const dx = x - pointer.x;
          const dy = y - pointer.y;

          const distance = Math.sqrt(dx * dx + dy * dy);
          const mouseRadius = 125;

          if (
            pointer.active &&
            pointer.strength > 0.01 &&
            distance < mouseRadius &&
            distance > 0.01
          ) {
            const force =
              Math.pow(1 - distance / mouseRadius, 2) *
              38 *
              pointer.strength;

            x += (dx / distance) * force;
            y += (dy / distance) * force;
          }

          // Node masuk dari pusat menuju lintasan orbit.
          const finalX =
            centerX + (x - centerX) * orbitEase;

          const finalY =
            centerY + (y - centerY) * orbitEase;

          const scale =
            (0.65 + 0.35 * appear) *
            (1 + darkProgress * 0.65);

          element.style.opacity = (
            appear *
            orbitEase *
            (1 - PHASES.nodeDim * story.nodesDim) *
            (1 - darkProgress)
          ).toFixed(3);

        // Node bergerak mendekati pusat sebelum menghilang.
        const inwardX =
          finalX + (orbitCenterX - finalX) * darkProgress * 0.55;

        const inwardY =
          finalY + (orbitCenterY - finalY) * darkProgress * 0.55;

        element.style.transform =
          `translate3d(${(inwardX - node.size / 2).toFixed(1)}px, ` +
          `${(inwardY - node.size / 2).toFixed(1)}px, 0) ` +
          `scale(${scale.toFixed(3)})`;
        }
      }

      if (story.stripActive !== stripActive) {
        stripActive = story.stripActive;
        stripCallback.current?.(stripActive);
      }
    };

    const frame = (now: number) => {
      frameId = requestAnimationFrame(frame);

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const target = readTarget();

      smoothed +=
        (target - smoothed) *
        (1 - Math.exp(-dt * STORY.smoothing));

      if (Math.abs(target - smoothed) < 0.0002) {
        smoothed = target;
      }

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
      pointer.targetX = -1e4;
      pointer.targetY = -1e4;
    };

    layout();
    smoothed = readTarget();

    resize.observe(canvas);
    visibility.observe(container);

    window.addEventListener(
      "pointermove",
      onPointerMove,
      { passive: true },
    );

    container.addEventListener(
      "pointerleave",
      onPointerLeave,
    );

    return () => {
      stop();
      visibility.disconnect();
      resize.disconnect();

      window.removeEventListener(
        "pointermove",
        onPointerMove,
      );

      container.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
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
    darkOverlayRef
  };
}
