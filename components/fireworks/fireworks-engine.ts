/**
 * Framework-agnostic fireworks particle system.
 *
 * No React, no allocations in the hot loop beyond particle creation on burst.
 * The React wrapper owns the canvas + RAF; this owns the physics + drawing.
 */

export type RGB = [number, number, number];

export type Intensity = "low" | "medium" | "high";

export interface LaunchOptions {
  intensity?: Intensity;
  /** total ms over which new shells are launched */
  durationMs?: number;
  colors?: RGB[];
  /** 0 = top of canvas, 1 = bottom — where shells tend to explode */
  originYRatio?: number;
  /** horizontal bias, 0..1 (0.5 = centre) */
  originXRatio?: number;
  spread?: number;
}

export const DEFAULT_PALETTE: RGB[] = [
  [139, 92, 246], // violet
  [59, 130, 246], // blue
  [236, 72, 153], // pink
  [34, 197, 94], // green
  [249, 115, 22], // orange
  [250, 204, 21], // gold
  [56, 189, 248], // sky
];

const GRAVITY = 0.00028; // px / ms^2
const AIR_DRAG = 0.0012; // velocity damping per ms

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: RGB;
  size: number;
  glitter: boolean;
  drag: number;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuseAt: number; // absolute time to explode
  color: RGB;
  burst: number; // particle count
  power: number;
  spawnAt: number;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

export class FireworksEngine {
  private particles: Particle[] = [];
  private shells: Shell[] = [];
  private queue: Shell[] = [];
  private now = 0;
  private lastLaunchEnd = 0;
  width = 0;
  height = 0;

  get active(): boolean {
    return (
      this.particles.length > 0 ||
      this.shells.length > 0 ||
      this.queue.length > 0
    );
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clear() {
    this.particles.length = 0;
    this.shells.length = 0;
    this.queue.length = 0;
  }

  launch(opts: LaunchOptions = {}) {
    const {
      intensity = "medium",
      durationMs = 1600,
      colors = DEFAULT_PALETTE,
      originYRatio = 0.42,
      originXRatio = 0.5,
      spread = 0.7,
    } = opts;

    const shellCount =
      intensity === "low" ? 2 : intensity === "high" ? rand(6, 8) : rand(3, 5);

    const w = this.width || 1;
    const h = this.height || 1;
    const baseX = originXRatio * w;

    for (let i = 0; i < shellCount; i++) {
      const t = this.now + (i / shellCount) * durationMs + rand(0, durationMs * 0.25);
      const targetX = baseX + rand(-1, 1) * spread * w * 0.42;
      const targetY = originYRatio * h + rand(-1, 1) * h * 0.16;
      const big = Math.random() < (intensity === "high" ? 0.4 : 0.22);
      const burst = Math.round(
        (big ? rand(80, 130) : rand(42, 78)) * (intensity === "low" ? 0.7 : 1),
      );

      // Shell physics: launched upward from bottom, explodes near target.
      const startX = targetX + rand(-30, 30);
      const startY = h + 20;
      const riseMs = rand(520, 760);
      const vy = -((startY - targetY) / riseMs) - 0.5 * GRAVITY * riseMs;
      const vx = (targetX - startX) / riseMs;

      this.queue.push({
        x: startX,
        y: startY,
        vx,
        vy,
        fuseAt: t + riseMs,
        spawnAt: t,
        color: pick(colors),
        burst,
        power: big ? rand(0.42, 0.6) : rand(0.26, 0.42),
      });
    }
    this.lastLaunchEnd = this.now + durationMs + 900;
  }

  private explode(shell: Shell) {
    const rings = Math.random() < 0.5 ? 2 : 1;
    for (let r = 0; r < rings; r++) {
      const count = r === 0 ? shell.burst : Math.round(shell.burst * 0.5);
      const ringPower = shell.power * (r === 0 ? 1 : 0.55);
      const ringColor =
        r === 0 ? shell.color : pick(DEFAULT_PALETTE);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rand(-0.12, 0.12);
        const speed = ringPower * rand(0.35, 1) * (0.8 + Math.random() * 0.6);
        const maxLife = rand(700, 1500) * (r === 0 ? 1 : 0.8);
        this.particles.push({
          x: shell.x,
          y: shell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          color: ringColor,
          size: rand(1.3, 3.2),
          glitter: Math.random() < 0.22,
          drag: AIR_DRAG * rand(0.7, 1.5),
        });
      }
    }
    // central flash
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = shell.power * rand(0.05, 0.2);
      this.particles.push({
        x: shell.x,
        y: shell.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(180, 340),
        maxLife: 340,
        color: [255, 255, 245],
        size: rand(2, 4),
        glitter: false,
        drag: AIR_DRAG * 2,
      });
    }
  }

  tick(dtMs: number) {
    const dt = Math.min(dtMs, 48); // clamp big frame gaps (tab switch)
    this.now += dt;

    // Promote queued shells
    if (this.queue.length) {
      for (let i = this.queue.length - 1; i >= 0; i--) {
        if (this.queue[i].spawnAt <= this.now) {
          this.shells.push(this.queue[i]);
          this.queue.splice(i, 1);
        }
      }
    }

    // Shells
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.vy += GRAVITY * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (this.now >= s.fuseAt || s.vy >= 0) {
        this.explode(s);
        this.shells.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.vy += GRAVITY * 0.55 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Hard cap to protect perf
    if (this.particles.length > 1400) {
      this.particles.splice(0, this.particles.length - 1400);
    }
  }

  /** Draw one frame. Caller passes a context already sized to CSS pixels. */
  draw(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;

    // Fade previous frame -> glowing trails without storing history
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";

    for (const s of this.shells) {
      ctx.beginPath();
      ctx.fillStyle = `rgb(${s.color[0]},${s.color[1]},${s.color[2]})`;
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,220,0.7)";
      ctx.arc(s.x, s.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      let alpha = t < 0.2 ? t / 0.2 : Math.min(1, t * 1.4);
      if (p.glitter && Math.random() < 0.35) alpha *= 0.25;
      const [r, g, b] = p.color;
      const radius = p.size * (0.35 + t * 0.65);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(
        255,
        b + 60,
      )},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }
}
