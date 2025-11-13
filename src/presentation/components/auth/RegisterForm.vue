<template>
  <div>
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Yeni Hesap Oluştur</h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      Ya da
      <router-link to="/auth/login" class="font-medium text-primary-600 hover:text-primary-500">
        hesabına giriş yap
      </router-link>
    </p>

    <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
      <div>
        <label for="email" class="form-label">E-posta Adresi</label>
        <input
          id="email"
          type="email"
          v-model.trim="email"
          class="form-input"
          required
          :class="{ 'border-red-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-2 text-sm text-red-600">{{ errors.email }}</p>
      </div>

      <div>
        <label for="displayName" class="form-label">Görünen Ad (isteğe bağlı)</label>
        <input id="displayName" type="text" v-model.trim="displayName" class="form-input" />
      </div>

      <div>
        <label for="password" class="form-label">Şifre</label>
        <input
          id="password"
          type="password"
          v-model="password"
          class="form-input"
          required
          autocomplete="new-password"
          :class="{ 'border-red-500': errors.password }"
        />
        <p v-if="errors.password" class="mt-2 text-sm text-red-600">{{ errors.password }}</p>
      </div>

      <div>
        <label for="confirmPassword" class="form-label">Şifre Tekrar</label>
        <input
          id="confirmPassword"
          type="password"
          v-model="confirmPassword"
          class="form-input"
          required
          autocomplete="new-password"
          :class="{ 'border-red-500': errors.confirmPassword }"
        />
        <p v-if="errors.confirmPassword" class="mt-2 text-sm text-red-600">
          {{ errors.confirmPassword }}
        </p>
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
          Kaydol
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useRegistrationForm } from '@/presentation/composables/auth/useRegister';

const { email, password, confirmPassword, displayName, errors, isLoading, handleRegister } =
  useRegistrationForm();
</script>
