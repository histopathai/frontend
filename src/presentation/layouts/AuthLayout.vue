<template>
  <div
    class="flex min-h-screen flex-col items-center justify-center space-y-8 bg-gray-100 px-4 py-12 sm:px-6 lg:px-8"
  >
    <div>
      <h1 class="text-center text-4xl font-bold text-indigo-600">HistoPathAI</h1>
    </div>

    <RouterView />

    <div>
      <p class="text-center text-sm text-gray-500">© 2025 HistopathAI. All rights reserved.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>
