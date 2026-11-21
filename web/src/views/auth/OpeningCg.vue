<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const emit = defineEmits<{ complete: [] }>();
const video = ref<HTMLVideoElement | null>(null);
const openingVideo = `${import.meta.env.BASE_URL}login-opening.mp4`;
const openingPoster = `${import.meta.env.BASE_URL}login-opening-poster.jpg`;
let finished = false;

function complete() {
  if (finished) return;
  finished = true;
  video.value?.pause();
  emit('complete');
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') complete();
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  video.value?.play().catch(complete);
});

onBeforeUnmount(() => {
  finished = true;
  window.removeEventListener('keydown', onKeyDown);
  video.value?.pause();
});
</script>

<template>
  <section class="opening-cg" aria-label="登录开场">
    <video
      ref="video"
      class="opening-cg__video"
      :src="openingVideo"
      :poster="openingPoster"
      preload="auto"
      muted
      playsinline
      aria-hidden="true"
      @ended="complete"
      @error="complete"
    />
    <button class="opening-cg__skip" type="button" @click="complete">跳过开场</button>
  </section>
</template>

<style scoped>
.opening-cg {
  position: fixed;
  z-index: 100;
  inset: 0;
  overflow: hidden;
  background: #0a1622;
}

.opening-cg__video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.opening-cg__skip {
  position: absolute;
  top: max(18px, env(safe-area-inset-top));
  right: max(20px, env(safe-area-inset-right));
  min-height: 44px;
  padding: 0 17px;
  border: 1px solid rgba(209, 240, 253, 0.56);
  border-radius: 999px;
  color: #f1faff;
  background: rgba(8, 24, 37, 0.8);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.opening-cg__skip:hover { background: #14364e; }
.opening-cg__skip:focus-visible { outline: 2px solid #b0ecff; outline-offset: 3px; }
</style>
