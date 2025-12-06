<template>
  <div class="card w-full max-w-md shadow-lg rounded-xl">
    <div class="card-body p-8 sm:p-10">
      <div>
        <h2 class="text-center text-2xl font-semibold tracking-tight text-gray-900">
          Hesabınıza giriş yapın
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          veya
          <RouterLink
            :to="{ name: 'Register' }"
            class="font-medium text-indigo-600 hover:text-indigo-500"
          >
            yeni hesap oluşturun
          </RouterLink>
        </p>
      </div>

      <div v-if="error" class="mt-6 rounded-md bg-red-50 p-4 border border-red-200">
        <p class="text-sm font-medium text-red-800">{{ error }}</p>
      </div>

      <form class="mt-6 space-y-6" @submit.prevent="handleLogin">
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
          <label for="password" class="form-label">Şifre</label>
          <input
            id="password"
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            class="form-input"
            placeholder="••••••••"
          />
        </div>

        <div class="flex items-center justify-end">
          <div class="text-sm">
            <RouterLink
              :to="{ name: 'ForgotPassword' }"
              class="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Şifremi unuttum
            </RouterLink>
          </div>
        </div>

        <div>
          <button type="submit" :disabled="loading" class="btn btn-primary w-full">
            {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useAuth } from '@/presentation/composables/auth/useAuth';

const { email, password, loading, error, handleLogin } = useAuth();
</script>
