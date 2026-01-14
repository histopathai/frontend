<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">Hesap Ayarları</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-1">
        <div class="card bg-white shadow-lg rounded-xl overflow-hidden">
          <div class="p-6 text-center border-b border-gray-100">
            <div
              class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100 text-indigo-600 text-3xl font-bold mb-4"
            >
              {{ user?.initials }}
            </div>
            <h2 class="text-xl font-semibold text-gray-900">
              {{ user?.displayName || 'İsimsiz Kullanıcı' }}
            </h2>
            <p class="text-sm text-gray-500">{{ user?.email }}</p>

            <div class="mt-4">
              <span :class="user?.role.toCssClass()">
                {{ user?.role.toDisplayString() }}
              </span>
            </div>
          </div>

          <div class="p-6">
            <h3 class="text-sm font-medium text-gray-500 mb-3">Hesap Bilgileri</h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Durum:</span>
                <span class="font-medium text-green-600" v-if="user?.status.isActive()">Aktif</span>
                <span class="font-medium text-red-600" v-else>Pasif</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Kayıt Tarihi:</span>
                <span class="font-medium">{{ formatDate(user?.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="md:col-span-2">
        <div class="card bg-white shadow-lg rounded-xl">
          <div class="card-header px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Şifre Değiştir</h3>
          </div>
          <div class="card-body p-6">
            <form @submit.prevent="handlePasswordChange">
              <div class="space-y-4">
                <div>
                  <label class="form-label">Mevcut Şifre</label>
                  <div class="relative">
                    <input
                      :type="showCurrentPassword ? 'text' : 'password'"
                      v-model="currentPassword"
                      class="form-input pr-10"
                      required
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      @click="showCurrentPassword = !showCurrentPassword"
                      class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabindex="-1"
                    >
                      <svg
                        v-if="showCurrentPassword"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="w-5 h-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                      <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="w-5 h-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">Yeni Şifre</label>
                    <div class="relative">
                      <input
                        :type="showNewPassword ? 'text' : 'password'"
                        v-model="newPassword"
                        class="form-input pr-10"
                        required
                        placeholder="En az 8 karakter"
                      />
                      <button
                        type="button"
                        @click="showNewPassword = !showNewPassword"
                        class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabindex="-1"
                      >
                        <svg
                          v-if="showNewPassword"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-5 h-5"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                        <svg
                          v-else
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-5 h-5"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="form-label">Yeni Şifre (Tekrar)</label>
                    <div class="relative">
                      <input
                        :type="showConfirmNewPassword ? 'text' : 'password'"
                        v-model="confirmNewPassword"
                        class="form-input pr-10"
                        required
                        placeholder="Şifreyi doğrulayın"
                      />
                      <button
                        type="button"
                        @click="showConfirmNewPassword = !showConfirmNewPassword"
                        class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabindex="-1"
                      >
                        <svg
                          v-if="showConfirmNewPassword"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-5 h-5"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                        <svg
                          v-else
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="1.5"
                          stroke="currentColor"
                          class="w-5 h-5"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="error" class="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {{ error }}
                </div>

                <div class="flex justify-end pt-2">
                  <button type="submit" class="btn btn-primary" :disabled="loading">
                    <span v-if="loading" class="mr-2">Checking...</span>
                    Şifreyi Güncelle
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { usePasswordChange } from '@/presentation/composables/auth/userPasswordChange';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmNewPassword = ref(false);

const { currentPassword, newPassword, confirmNewPassword, loading, error, handlePasswordChange } =
  usePasswordChange();

function formatDate(date?: Date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
</script>
