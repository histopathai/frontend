<template>
  <div class="w-full max-w-md space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
        Şifrenizi mi unuttunuz?
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Hesabınıza kayıtlı e-posta adresini girin, size bir sıfırlama linki gönderelim.
      </p>
    </div>

    <div v-if="successMessage" class="rounded-md bg-green-50 p-4 border border-green-200">
      <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
    </div>

    <div v-if="error" class="rounded-md bg-red-50 p-4 border border-red-200">
      <p class="text-sm font-medium text-red-800">{{ error }}</p>
    </div>

    <form class="space-y-6" @submit.prevent="handlePasswordReset" v-if="!successMessage">
      <div>
        <label for="email" class="form-label">E-posta adresi</label>
        <input
          id="email"
          v-model="email"
          name="email"
          type="email"
          autocomplete="email"
          required
          class="form-input"
          placeholder="user@example.com"
        />
      </div>

      <div>
        <button type="submit" :disabled="loading" class="btn btn-primary w-full">
          {{ loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder' }}
        </button>
      </div>
    </form>

    <div class="text-center text-sm">
      <RouterLink :to="{ name: 'Login' }" class="font-medium text-indigo-600 hover:text-indigo-500">
        Giriş ekranına geri dön
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { usePasswordReset } from '@/presentation/composables/auth/usePasswordReset';

// Yeni composable'ımızı kullanıyoruz
const { email, loading, error, successMessage, handlePasswordReset } = usePasswordReset();
</script>
