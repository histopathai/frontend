<template>
  <div class="harness">
    <div class="harness-bar">
      <strong>Deneme düzeneği</strong>
      <span>sentetik slaytlar · backend yok · hiçbir şey kaydedilmez</span>
    </div>
    <div class="harness-body">
      <aside class="harness-list">
        <p>Görüntüler</p>
        <button
          v-for="(img, i) in images"
          :key="img.id"
          :class="{ active: i === index }"
          @click="index = i"
        >
          <b>{{ img.name }}</b>
          <small
            >{{ img.width }} × {{ img.height }} ·
            {{ img.mpp ? `mpp ${img.mpp}` : 'mpp yok' }}</small
          >
        </button>
      </aside>
      <PatchGridWorkspace
        :image="images[index] ?? null"
        :can-go-prev="index > 0"
        :position="`${index + 1} / ${images.length}`"
        @prev="index = Math.max(0, index - 1)"
        @next="index = Math.min(images.length - 1, index + 1)"
        @open-image="
          (id: string) =>
            (index = Math.max(
              0,
              images.findIndex((img) => img.id === id)
            ))
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Image } from '@/core/entities/Image';
import PatchGridWorkspace from '@/presentation/components/patches/PatchGridWorkspace.vue';

defineProps<{ images: Image[] }>();
const index = ref(0);
</script>

<!-- Plain CSS: Tailwind only scans src/, so utility classes used only here would not exist. -->
<style scoped>
.harness {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.harness-bar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  height: 41px; /* the app header's height, which the real view subtracts */
  padding: 0 12px;
  border-bottom: 1px solid #fde68a;
  background: #fffbeb;
  color: #b45309;
  font-size: 11px;
}
.harness-bar strong {
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.harness-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.harness-list {
  flex-shrink: 0;
  width: 260px;
  padding: 8px;
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
  background: #fff;
}
.harness-list p {
  margin: 8px 8px 4px;
  color: #9ca3af;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.harness-list button {
  display: block;
  width: 100%;
  margin-bottom: 4px;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: left;
}
.harness-list button.active {
  border-color: #6366f1;
  background: #eef2ff;
}
.harness-list b {
  display: block;
  overflow: hidden;
  color: #374151;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.harness-list small {
  display: block;
  color: #9ca3af;
  font-size: 10px;
}
</style>
