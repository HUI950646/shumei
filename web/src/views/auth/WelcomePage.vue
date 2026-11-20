<script setup lang="ts">
import { useRouter } from 'vue-router';
import AuthBackdrop from './AuthBackdrop.vue';

/** 入口页：大图 + 主题 + START NOW，点击进入登录页 */
const router = useRouter();

function start() {
  router.push('/login');
}
</script>

<template>
  <AuthBackdrop>
    <header class="entry-head">
      <div class="entry-brand">
        <span class="entry-brand__mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="M16 3c5.6 3.4 9 9.2 9 15.4C25 24.4 20.9 29 16 29S7 24.4 7 18.4C7 12.2 10.4 6.4 16 3Z"
              stroke="currentColor"
              stroke-width="1.6"
            />
            <circle cx="16" cy="18.4" r="3" fill="currentColor" opacity=".85" />
          </svg>
        </span>
        <span class="entry-brand__text">问道智行</span>
        <span class="entry-brand__en">SENTINEL</span>
      </div>
      <button type="button" class="entry-login" @click="start">登录 / 注册</button>
    </header>

    <main class="entry-main">
      <div class="entry-copy">
        <p class="entry-kicker">多模融感 · 智析路险</p>
        <h1 class="entry-title">
          基于多模态数据融合的<br />实时目标检测与风险感知中枢
        </h1>
        <p class="entry-sub">
          毫米波雷达与视觉在 BEV 空间融合，把「检测框」升级为「连续空间风险分布」
        </p>
      </div>
      <button type="button" class="entry-cta" @click="start">
        <span class="entry-cta__label">进入系统</span>
        <span class="entry-cta__arrow" aria-hidden="true">→</span>
        <span class="entry-cta__shine" aria-hidden="true" />
      </button>
    </main>

    <footer class="entry-foot">
      <span>TCR300 毫米波雷达 · YOLO 视觉检测 · BEV 目标关联 · 各向异性风险场</span>
      <span class="entry-foot__right">v1.0 · 本机演示</span>
    </footer>
  </AuthBackdrop>
</template>

<style scoped>
.entry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 40px;
}

.entry-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(226, 240, 250, 0.9);
}

.entry-brand__mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(150, 215, 245, 0.34);
  background: rgba(12, 30, 44, 0.5);
}

.entry-brand__mark svg {
  width: 20px;
  height: 20px;
}

.entry-brand__text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgba(232, 244, 252, 0.94);
}

.entry-brand__en {
  margin-left: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.3em;
  color: rgba(190, 216, 232, 0.6);
}

.entry-login {
  padding: 8px 16px;
  border: 1px solid rgba(150, 215, 245, 0.3);
  border-radius: 999px;
  background: rgba(10, 26, 38, 0.42);
  font-family: inherit;
  font-size: 12px;
  color: rgba(226, 240, 250, 0.86);
  cursor: pointer;
  transition:
    border-color 0.22s ease,
    background 0.22s ease,
    transform 0.22s ease;
}

.entry-login:hover {
  border-color: rgba(120, 210, 250, 0.6);
  background: rgba(18, 44, 62, 0.6);
  transform: scale(1.03);
}

.entry-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px 40px;
  text-align: center;
}

.entry-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 文案区局部压暗，保证压在车流上也能读 */
.entry-copy::before {
  content: '';
  position: absolute;
  inset: -56px -90px -34px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(4, 12, 20, 0.72), rgba(4, 12, 20, 0.34) 62%, transparent 84%);
  filter: blur(10px);
  z-index: -1;
  pointer-events: none;
}

.entry-kicker {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: rgba(190, 232, 250, 0.95);
}

.entry-title {
  margin: 0;
  font-size: clamp(26px, 3.5vw, 46px);
  font-weight: 700;
  line-height: 1.42;
  letter-spacing: 0.03em;
  color: #f2fbff;
  text-shadow: 0 2px 28px rgba(4, 16, 26, 0.75);
}

.entry-sub {
  max-width: 56em;
  margin: 22px 0 0;
  font-size: clamp(13px, 1.05vw, 15px);
  line-height: 1.95;
  color: rgba(222, 238, 248, 0.86);
  text-shadow: 0 1px 14px rgba(3, 10, 17, 0.85);
}

/* 蓝色主按钮：hover 缩放 + 渐变流动 */
.entry-cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 40px;
  padding: 0 34px;
  height: 52px;
  border: 0;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: #f4fbff;
  cursor: pointer;
  overflow: hidden;
  background-image: linear-gradient(100deg, #58b0e8 0%, #3489cc 42%, #6cc6ef 72%, #4ea3e2 100%);
  background-size: 240% 100%;
  background-position: 0% 50%;
  box-shadow:
    0 14px 34px -14px rgba(58, 150, 214, 0.95),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition:
    transform 0.24s cubic-bezier(0.4, 0.8, 0.2, 1),
    box-shadow 0.24s ease,
    background-position 0.7s ease;
}

.entry-cta:hover {
  transform: scale(1.04);
  background-position: 100% 50%;
  box-shadow:
    0 18px 40px -14px rgba(70, 170, 232, 1),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
}

.entry-cta:active {
  transform: scale(0.99);
}

.entry-cta__arrow {
  font-size: 15px;
  transform: translateX(0);
  transition: transform 0.24s ease;
}

.entry-cta:hover .entry-cta__arrow {
  transform: translateX(4px);
}

.entry-cta__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 36%, rgba(255, 255, 255, 0.42) 50%, transparent 64%);
  transform: translateX(-120%);
  pointer-events: none;
}

.entry-cta:hover .entry-cta__shine {
  animation: entry-shine 1.2s ease;
}

@keyframes entry-shine {
  to {
    transform: translateX(120%);
  }
}

.entry-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px 24px;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: rgba(196, 218, 232, 0.5);
}

@media (max-width: 640px) {
  .entry-head {
    padding: 18px 18px;
  }

  .entry-foot {
    padding: 0 18px 18px;
    flex-direction: column;
    gap: 6px;
  }

  .entry-foot__right {
    display: none;
  }

  .entry-sub {
    max-width: 26em;
  }

  .entry-cta {
    margin-top: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .entry-cta__shine {
    animation: none !important;
  }
}
</style>
