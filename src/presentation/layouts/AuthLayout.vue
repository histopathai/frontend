<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center">
        <h1 class="text-3xl font-bold text-primary-600">{{ appName }}</h1>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <router-view />
      </div>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-500">
          © {{ new Date().getFullYear() }} {{ appName }}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const appName = import.meta.env.VITE_APP_NAME || 'HistopathAI';
</script>
