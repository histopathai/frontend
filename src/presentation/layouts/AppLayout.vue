<template>
  <div class="min-h-screen bg-gray-100">
    <AppHeader />

    <main>
      <div class="py-6 px-4 sm:px-6 lg:px-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from '@/presentation/components/common/AppHeader.vue';
</script>
