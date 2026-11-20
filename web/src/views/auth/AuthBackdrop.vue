<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * 登录入口共用的背景层：同一张道路实景图 + 暮色调色 + 网格 + 缓慢浮动粒子。
 * 入口页与登录页都引用它，保证"同一张背景"。
 */

withDefaults(defineProps<{ scrim?: 'center' | 'left' | 'none' }>(), { scrim: 'center' });

const particleCanvas = ref<HTMLCanvasElement | null>(null);

let frameId = 0;
let particles: { x: number; y: number; r: number; vx: number; vy: number; a: number }[] = [];
let size = { w: 0, h: 0 };

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initParticles() {
  const canvas = particleCanvas.value;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = size.w * dpr;
  canvas.height = size.h * dpr;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.round(Math.min(110, (size.w * size.h) / 17000));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * size.w,
    y: Math.random() * size.h,
    r: 0.6 + Math.random() * 1.9,
    vx: (Math.random() - 0.5) * 0.13,
    vy: (Math.random() - 0.5) * 0.13,
    a: 0.1 + Math.random() * 0.24,
  }));
}

function tick() {
  const canvas = particleCanvas.value;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, size.w, size.h);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -6) p.x = size.w + 6;
    if (p.x > size.w + 6) p.x = -6;
    if (p.y < -6) p.y = size.h + 6;
    if (p.y > size.h + 6) p.y = -6;
    ctx.beginPath();
    ctx.fillStyle = `rgba(150,225,255,${p.a})`;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  frameId = window.requestAnimationFrame(tick);
}

function onResize() {
  initParticles();
}

onMounted(() => {
  initParticles();
  if (!reduceMotion) frameId = window.requestAnimationFrame(tick);
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  if (frameId) window.cancelAnimationFrame(frameId);
});
</script>

<template>
  <div class="backdrop">
    <div class="backdrop__photo" aria-hidden="true" />
    <div class="backdrop__grade" aria-hidden="true" />
    <div class="backdrop__grid" aria-hidden="true" />
    <div v-if="scrim !== 'none'" class="backdrop__scrim" :class="`backdrop__scrim--${scrim}`" aria-hidden="true" />
    <canvas ref="particleCanvas" class="backdrop__particles" aria-hidden="true" />
    <div class="backdrop__content"><slot /></div>
  </div>
</template>

<style scoped>
.backdrop {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #0a1622;
  font-family: var(--font);
}

/* 16:9 实景道路图（Pexels #16441659，Pexels License 可免费商用）
   替换背景只需覆盖 public/auth-hero.jpg */
.backdrop__photo {
  position: absolute;
  inset: 0;
  background-image: url('/auth-hero.jpg');
  background-size: cover;
  background-position: center 46%;
  filter: saturate(0.9) contrast(1.03) brightness(0.74);
  transform: scale(1.02);
}

/* 压暗与色调：顶部偏冷，右下留一点暖意，保证文字可读 */
.backdrop__grade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 80% 92%, rgba(198, 138, 92, 0.2), transparent 58%),
    radial-gradient(90% 70% at 10% 8%, rgba(38, 92, 140, 0.34), transparent 62%),
    linear-gradient(180deg, rgba(6, 14, 22, 0.52) 0%, rgba(7, 17, 27, 0.26) 38%, rgba(7, 16, 25, 0.62) 100%);
}

.backdrop__grid {  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(120, 200, 235, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120, 200, 235, 0.06) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(circle at 50% 40%, #000 20%, transparent 76%);
  -webkit-mask-image: radial-gradient(circle at 50% 40%, #000 20%, transparent 76%);
}

.backdrop__scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.backdrop__scrim--center {
  background: radial-gradient(70% 58% at 50% 52%, rgba(3, 10, 17, 0.7), transparent 76%);
}

.backdrop__scrim--left {
  background: linear-gradient(
    90deg,
    rgba(4, 12, 20, 0.72) 0%,
    rgba(4, 12, 20, 0.34) 44%,
    rgba(4, 12, 20, 0) 74%
  );
}

.backdrop__particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.backdrop__content {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

@media (prefers-reduced-motion: reduce) {
  .backdrop__photo {
    transform: none;
  }
}
</style>
