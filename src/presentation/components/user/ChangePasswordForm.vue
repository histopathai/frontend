<template>
  <div class="card mt-6">
    <div class="card-header">
      <h3 class="text-lg font-medium leading-6 text-gray-900">Şifreyi Değiştir</h3>
      <p class="mt-1 text-sm text-gray-500">
        Güvenliğiniz için şifrenizi düzenli olarak güncelleyin.
      </p>
    </div>

    <div class="card-body">
      <form @submit.prevent="handleChangePassword" class="space-y-6">
        <div>
          <label for="newPassword" class="form-label">Yeni Şifre</label>
          <input
            id="newPassword"
            type="password"
            v-model="newPassword"
            class="form-input"
            required
            autocomplete="new-password"
            :class="{ 'border-red-500': errors.newPassword }"
          />
          <p v-if="errors.newPassword" class="mt-2 text-sm text-red-600">
            {{ errors.newPassword }}
          </p>
        </div>

        <div>
          <label for="confirmNewPassword" class="form-label">Yeni Şifre Tekrar</label>
          <input
            id="confirmNewPassword"
            type="password"
            v-model="confirmNewPassword"
            class="form-input"
            required
            autocomplete="new-password"
            :class="{ 'border-red-500': errors.confirmNewPassword }"
          />
          <p v-if="errors.confirmNewPassword" class="mt-2 text-sm text-red-600">
            {{ errors.confirmNewPassword }}
          </p>
        </div>

        <div>
          <button type="submit" class="btn btn-primary" :disabled="isLoading">
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
            Şifreyi Değiştir
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProfileForm } from '@/presentation/composables/user/useChangePassword';

const { newPassword, confirmNewPassword, errors, isLoading, handleChangePassword } =
  useProfileForm();
</script>
