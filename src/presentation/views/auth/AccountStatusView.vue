<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
        <h2 class="text-2xl font-bold text-gray-900">Hesap Durumu</h2>

        <div
          class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center space-x-3"
        >
          <svg
            class="h-6 w-6 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4.038c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p class="text-sm text-yellow-800">
            Hesap Durumu:
            <span class="font-semibold">{{ displayStatus }}</span
            >.
            <br />
            Lütfen bir yöneticiyle iletişime geçin.
          </p>
        </div>

        <div class="mt-6">
          <router-link to="/auth/login" class="btn btn-primary">Giriş Sayfasına Dön</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAccountStatus } from '@/presentation/composables/auth/useAccountStatus';
const { displayStatus } = useAccountStatus();
</script>
