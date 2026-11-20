<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthBackdrop from './AuthBackdrop.vue';

/**
 * 登录 / 注册（单栏）。
 * 与入口页共用 AuthBackdrop 的同一张道路实景图背景。
 * 纯前端演示：图形验证码在本地生成并校验，没有后端接口。
 */

type Mode = 'login' | 'register';

const route = useRoute();
const router = useRouter();
// 支持 #/login?mode=register 直接深链到注册页
const mode = ref<Mode>(route.query.mode === 'register' ? 'register' : 'login');
const account = ref('');
const password = ref('');
const captchaInput = ref('');
const errorText = ref('');
const hintText = ref('');
const submitting = ref(false);
const captchaCanvas = ref<HTMLCanvasElement | null>(null);
const captchaCode = ref('');
const captchaSpinning = ref(false);

const isRegister = computed(() => mode.value === 'register');
const submitLabel = computed(() => (submitting.value ? '处理中…' : isRegister.value ? '注 册' : '登 录'));

// 同一路由内切换 ?mode=register 时组件不会重建，需要跟着 query 走
watch(
  () => route.query.mode,
  (value) => {
    const next: Mode = value === 'register' ? 'register' : 'login';
    if (next === mode.value) return;
    mode.value = next;
    refreshCaptcha();
  },
);

/* ---------------- 图形验证码 ---------------- */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXY3456789';
const INK = ['#192D4B', '#289E94', '#3E6E9E', '#5F6E82'];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function makeCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i += 1) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

function drawCaptcha() {
  const canvas = captchaCanvas.value;
  if (!canvas) return;
  const width = 126;
  const height = 52;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#F8FAFC');
  bg.addColorStop(1, '#EDF3FA');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 噪点
  for (let i = 0; i < 60; i += 1) {
    ctx.fillStyle = `rgba(25,45,75,${0.04 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 干扰曲线
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = `rgba(68,201,190,${0.16 + Math.random() * 0.14})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, Math.random() * height);
    ctx.bezierCurveTo(
      width * 0.3, Math.random() * height,
      width * 0.7, Math.random() * height,
      width + 8, Math.random() * height,
    );
    ctx.stroke();
  }

  // 扭曲字符：逐字错位 + 旋转 + 倾斜 + 正弦位移
  const text = captchaCode.value;
  const step = (width - 20) / Math.max(text.length, 1);
  for (let i = 0; i < text.length; i += 1) {
    ctx.save();
    ctx.translate(10 + step * i + step / 2, height / 2 + Math.sin(i * 1.15) * 3.2);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.transform(1, 0, (Math.random() - 0.5) * 0.24, 1, 0, 0);
    ctx.font = `600 ${19 + Math.random() * 2.5}px "Microsoft YaHei UI", "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pick(INK);
    ctx.fillText(text[i]!, 0, (Math.random() - 0.5) * 2.4);
    ctx.restore();
  }
}

function refreshCaptcha(rotate = false) {
  captchaCode.value = makeCode();
  captchaInput.value = '';
  errorText.value = '';
  if (rotate) {
    captchaSpinning.value = false;
    nextTick(() => {
      captchaSpinning.value = true;
      window.setTimeout(() => (captchaSpinning.value = false), 520);
    });
  }
  drawCaptcha();
}

// 登录/注册切换时 form 会重新挂载，画布换新后要重绘
watch(captchaCanvas, (el) => {
  if (el) drawCaptcha();
});

/* ---------------- 表单交互 ---------------- */

function switchMode(next: Mode) {
  if (mode.value === next) return;
  mode.value = next;
  account.value = '';
  password.value = '';
  errorText.value = '';
  hintText.value = '';
  refreshCaptcha();
}

async function submit() {
  if (submitting.value) return;
  errorText.value = '';
  hintText.value = '';
  if (!account.value.trim()) {
    errorText.value = '请输入账号';
    return;
  }
  if (password.value.length < 6) {
    errorText.value = '密码至少 6 位';
    return;
  }
  if (!captchaInput.value.trim()) {
    errorText.value = '请输入图形验证码';
    return;
  }
  if (captchaInput.value.trim().toUpperCase() !== captchaCode.value.toUpperCase()) {
    refreshCaptcha(true);
    errorText.value = '验证码不正确，已为你换一张';
    return;
  }
  submitting.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 680));
  submitting.value = false;
  hintText.value = isRegister.value
    ? '注册信息已通过校验（演示界面，未连接后端）'
    : '登录成功，正在进入驾驶舱…';
  window.setTimeout(() => router.push('/cockpit'), 780);
  refreshCaptcha();
}

onMounted(() => {
  refreshCaptcha();
});
onBeforeUnmount(() => {});
</script>

<template>
  <AuthBackdrop scrim="center">
    <header class="login-head">
      <button type="button" class="login-back" @click="router.push('/welcome')">
        <span aria-hidden="true">←</span> 返回首页
      </button>
      <span class="login-brand">SENTINEL</span>
    </header>

    <main class="login-main">
      <!-- 上方放大主题 -->
      <div class="login-theme">
        <p class="login-kicker">基于多模态数据融合</p>
        <h1 class="login-title">实时目标检测与<br />风险感知中枢</h1>
      </div>

      <section class="login-card">
        <div class="login-tabs" role="tablist" aria-label="登录或注册">
          <button
            id="tab-login"
            type="button"
            role="tab"
            :aria-selected="!isRegister"
            :class="{ active: !isRegister }"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            id="tab-register"
            type="button"
            role="tab"
            :aria-selected="isRegister"
            :class="{ active: isRegister }"
            @click="switchMode('register')"
          >
            注册
          </button>
          <span class="login-tabs__ink" :class="{ 'is-right': isRegister }" aria-hidden="true" />
        </div>

        <p class="login-lead">{{ isRegister ? '创建账号后即可进入驾驶舱' : '登录以进入实时感知驾驶舱' }}</p>

        <form :key="mode" class="login-form" novalidate @submit.prevent="submit">
          <label class="field">
            <input
              v-model="account"
              class="field__input"
              type="text"
              name="account"
              placeholder=" "
              autocomplete="username"
              autofocus
              spellcheck="false"
            />
            <span class="field__label">账号</span>
          </label>

          <label class="field">
            <input
              v-model="password"
              class="field__input"
              type="password"
              name="password"
              placeholder=" "
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
            />
            <span class="field__label">密码</span>
          </label>

          <div class="field-row">
            <label class="field field--captcha">
              <input
                v-model="captchaInput"
                class="field__input"
                type="text"
                name="captcha"
                placeholder=" "
                maxlength="4"
                autocomplete="off"
                spellcheck="false"
              />
              <span class="field__label">图形验证码</span>
            </label>
            <button
              type="button"
              class="captcha"
              :class="{ 'captcha--spin': captchaSpinning }"
              aria-label="点击刷新图形验证码"
              title="点击刷新"
              @click="refreshCaptcha(true)"
            >
              <canvas ref="captchaCanvas" class="captcha__canvas" />
            </button>
          </div>

          <div class="login-actions">
            <button type="button" class="link-btn" @click="refreshCaptcha(true)">看不清楚？获取验证码</button>
            <button type="button" class="link-btn" @click="switchMode(isRegister ? 'login' : 'register')">
              {{ isRegister ? '已有账号，去登录' : '还没有账号？去注册' }}
            </button>
          </div>

          <p v-if="errorText" class="login-msg login-msg--error" role="alert">{{ errorText }}</p>
          <p v-else-if="hintText" class="login-msg login-msg--ok" role="status">{{ hintText }}</p>

          <button type="submit" class="submit-btn" :disabled="submitting">
            <span class="submit-btn__label">{{ submitLabel }}</span>
            <span class="submit-btn__shine" aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>

    <footer class="login-foot">© 2026 SENTINEL · 仅用于本机演示，请勿部署到公网</footer>
  </AuthBackdrop>
</template>

<style scoped>
.login-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 40px;
}

.login-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgba(150, 215, 245, 0.26);
  border-radius: 999px;
  background: rgba(10, 26, 38, 0.42);
  font-family: inherit;
  font-size: 12px;
  color: rgba(226, 240, 250, 0.84);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.login-back:hover {
  border-color: rgba(120, 210, 250, 0.6);
  background: rgba(18, 44, 62, 0.62);
}

.login-brand {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.34em;
  color: rgba(196, 220, 234, 0.55);
}

/* 居中单栏：主题在上，表单在下 */
.login-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  width: min(460px, 100%);
  margin: 0 auto;
  padding: 8px 0 32px;
}

.login-theme {
  margin-bottom: 20px;
  text-align: center;
}

.login-kicker {
  margin: 0 0 10px;
  font-size: 13px;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: rgba(180, 228, 248, 0.9);
}

.login-title {
  margin: 0;
  font-size: clamp(23px, 2.4vw, 34px);
  font-weight: 700;
  line-height: 1.46;
  letter-spacing: 0.02em;
  color: #f2fbff;
  text-shadow: 0 2px 24px rgba(4, 16, 26, 0.8);
}

.login-card {
  width: 100%;
  padding: 20px 22px 22px;
  border: 1px solid rgba(150, 210, 240, 0.18);
  border-radius: 18px;
  background: rgba(8, 20, 31, 0.56);
  box-shadow:
    0 24px 60px -24px rgba(2, 10, 18, 0.9),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(22px) saturate(120%);
  -webkit-backdrop-filter: blur(22px) saturate(120%);
}

.login-tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid rgba(150, 205, 235, 0.16);
}

.login-tabs button {
  padding: 6px 0 13px;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  color: #8ea6b9;
  cursor: pointer;
  transition: color 0.22s ease;
}

.login-tabs button:hover {
  color: #d7e7f2;
}

.login-tabs button.active {
  color: #eaf5fc;
}

.login-tabs__ink {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 50%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #6cc6ef, #3489cc);
  transition: transform 0.32s cubic-bezier(0.4, 0.8, 0.2, 1);
}

.login-tabs__ink.is-right {
  transform: translateX(100%);
}

.login-lead {
  margin: 14px 0 2px;
  font-size: 12px;
  color: #93aab9;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin-top: 14px;
  animation: login-in 0.3s cubic-bezier(0.4, 0.8, 0.2, 1) both;
}

@keyframes login-in {
  from {
    opacity: 0;
    transform: translateY(9px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 聚焦上浮发光 */
.field {
  position: relative;
  display: block;
  transition: transform 0.24s cubic-bezier(0.4, 0.8, 0.2, 1);
}

.field__input {
  width: 100%;
  min-width: 0;
  height: 50px;
  padding: 19px 14px 6px;
  border: 1px solid rgba(160, 205, 230, 0.22);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.055);
  font-family: inherit;
  font-size: 14px;
  color: #eef7fc;
  outline: none;
  transition:
    border-color 0.24s ease,
    box-shadow 0.28s ease,
    background 0.24s ease;
}

.field__input:hover {
  border-color: rgba(180, 220, 240, 0.38);
}

.field__input:focus {
  border-color: rgba(116, 200, 238, 0.9);
  background: rgba(255, 255, 255, 0.09);
  box-shadow:
    0 0 0 4px rgba(110, 195, 235, 0.18),
    0 8px 22px -12px rgba(80, 175, 225, 0.9);
}

.field:focus-within {
  transform: translateY(-2px);
}

.field__label {
  position: absolute;
  left: 15px;
  top: 15px;
  font-size: 13px;
  color: #9db4c6;
  pointer-events: none;
  transform-origin: left top;
  transition:
    transform 0.22s cubic-bezier(0.4, 0.8, 0.2, 1),
    color 0.22s ease,
    letter-spacing 0.22s ease;
}

.field__input:focus + .field__label,
.field__input:not(:placeholder-shown) + .field__label {
  transform: translateY(-9px) scale(0.84);
  color: #7ed3f2;
  letter-spacing: 0.04em;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 126px;
  gap: 10px;
  align-items: start;
}

.captcha {
  position: relative;
  height: 50px;
  padding: 0;
  border: 1px solid rgba(160, 205, 230, 0.28);
  border-radius: 12px;
  background: #f2f7fb;
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.24s ease,
    box-shadow 0.24s ease;
}

.captcha:hover {
  border-color: rgba(126, 211, 242, 0.8);
  box-shadow: 0 8px 18px -10px rgba(110, 195, 235, 0.9);
}

.captcha:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(110, 195, 235, 0.2);
}

.captcha__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.captcha--spin .captcha__canvas {
  animation: captcha-rotate 0.52s cubic-bezier(0.35, 0.9, 0.3, 1);
}

@keyframes captcha-rotate {
  from {
    transform: rotate(0deg) scale(1);
    opacity: 0.35;
  }
  to {
    transform: rotate(360deg) scale(1);
    opacity: 1;
  }
}

.login-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: -1px;
}

.link-btn {
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 12px;
  color: #93aab9;
  cursor: pointer;
  transition: color 0.2s ease;
}

.link-btn:hover {
  color: #7ed3f2;
}

.login-msg {
  margin: 0;
  padding: 9px 12px;
  border-radius: 9px;
  font-size: 12px;
  line-height: 1.5;
}

.login-msg--error {
  color: #ffb9b9;
  background: rgba(190, 60, 60, 0.18);
  border: 1px solid rgba(230, 110, 110, 0.28);
}

.login-msg--ok {
  color: #8fe6c4;
  background: rgba(24, 130, 96, 0.18);
  border: 1px solid rgba(80, 200, 160, 0.26);
}

/* 按钮：hover 缩放 + 渐变流动 */
.submit-btn {
  position: relative;
  height: 50px;
  margin-top: 3px;
  border: 0;
  border-radius: 12px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #f4fbff;
  cursor: pointer;
  overflow: hidden;
  background-image: linear-gradient(100deg, #58b0e8 0%, #3489cc 40%, #6cc6ef 70%, #4ea3e2 100%);
  background-size: 230% 100%;
  background-position: 0% 50%;
  box-shadow: 0 12px 28px -14px rgba(58, 150, 214, 0.95);
  transition:
    transform 0.22s cubic-bezier(0.4, 0.8, 0.2, 1),
    box-shadow 0.22s ease,
    background-position 0.65s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: scale(1.02);
  background-position: 100% 50%;
  box-shadow: 0 16px 34px -14px rgba(70, 170, 232, 1);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.99);
}

.submit-btn:disabled {
  cursor: progress;
  opacity: 0.82;
}

.submit-btn__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 36%, rgba(255, 255, 255, 0.4) 50%, transparent 64%);
  transform: translateX(-120%);
  pointer-events: none;
}

.submit-btn:hover:not(:disabled) .submit-btn__shine {
  animation: login-shine 1.15s ease;
}

@keyframes login-shine {
  to {
    transform: translateX(120%);
  }
}

.login-foot {
  padding: 0 40px 20px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgba(196, 218, 232, 0.42);
}

@media (max-width: 720px) {
  .login-head {
    padding: 16px 18px;
  }

  .login-main {
    width: 100%;
    margin: 0 auto;
    padding: 0 18px 24px;
    justify-content: center;
  }

  .login-theme {
    margin: 8px 0 18px;
  }

  .login-foot {
    padding: 0 18px 16px;
  }

  .field-row {
    grid-template-columns: minmax(0, 1fr) 116px;
  }

  .login-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-form,
  .captcha--spin .captcha__canvas,
  .submit-btn__shine {
    animation: none !important;
  }
}
</style>
