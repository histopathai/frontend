<template>
  <div class="w-full max-w-md space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
        Yeni hesap oluşturun
      </h2>
    </div>

    <div v-if="successMessage" class="rounded-md bg-green-50 p-4 border border-green-200">
      <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
    </div>

    <div v-if="error" class="rounded-md bg-red-50 p-4 border border-red-200">
      <p class="text-sm font-medium text-red-800">{{ error }}</p>
    </div>

    <form class="space-y-6" @submit.prevent="handleRegister" v-if="!successMessage">
      <div>
        <label for="displayName" class="form-label">Ad Soyad</label>
        <input
          id="displayName"
          v-model="displayName"
          name="displayName"
          type="text"
          autocomplete="name"
          required
          class="form-input"
          placeholder="Adınız Soyadınız"
        />
      </div>

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
          autocomplete="new-password"
          required
          class="form-input"
          placeholder="En az 8 karakter"
        />
      </div>

      <div>
        <label for="confirmPassword" class="form-label">Şifre Tekrar</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          name="confirmPassword"
          type="password"
          autocomplete="new-password"
          required
          class="form-input"
          placeholder="Şifrenizi doğrulayın"
        />
      </div>

      <div>
        <button type="submit" :disabled="loading" class="btn btn-primary w-full">
          {{ loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur' }}
        </button>
      </div>
    </form>

    <div class="text-center text-sm">
      <RouterLink :to="{ name: 'Login' }" class="font-medium text-indigo-600 hover:text-indigo-500">
        Zaten bir hesabınız var mı? Giriş yapın
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useRegistration } from '@/presentation/composables/auth/useRegistration';

// Yeni composable'ımızı kullanıyoruz
const {
  displayName,
  email,
  password,
  confirmPassword,
  loading,
  error,
  successMessage,
  handleRegister,
} = useRegistration();
</script>
