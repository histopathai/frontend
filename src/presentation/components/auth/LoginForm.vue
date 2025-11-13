<template>
  <div>
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Hesabına Giriş Yap</h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      Ya da
      <router-link to="/auth/register" class="font-medium text-primary-600 hover:text-primary-500">
        yeni hesap oluştur
      </router-link>
    </p>

    <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
      <div>
        <label for="email" class="form-label">E-posta Adresi</label>
        <input
          id="email"
          type="email"
          v-model.trim="email"
          required
          class="form-input"
          :class="{ 'border-red-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-2 text-sm text-red-600">{{ errors.email }}</p>
      </div>

      <div>
        <label for="password" class="form-label">Şifre</label>
        <input
          id="password"
          type="password"
          v-model="password"
          required
          class="form-input"
          :class="{ 'border-red-500': errors.password }"
        />
        <p v-if="errors.password" class="mt-2 text-sm text-red-600">{{ errors.password }}</p>
      </div>

      <div class="flex justify-end text-sm">
        <router-link
          to="/auth/password-reset"
          class="font-medium text-primary-600 hover:text-primary-500"
        >
          Şifreni mi unuttun?
        </router-link>
      </div>

      <div>
        <button type="submit" class="btn btn-primary w-full" :disabled="isLoading">
          <svg
            v-if="isLoading"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Giriş Yap
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useLoginForm } from '@/presentation/composables/auth/useLogin';

const { email, password, errors, isLoading, handleLogin } = useLoginForm();
</script>
