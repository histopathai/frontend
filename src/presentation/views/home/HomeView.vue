<template>
  <div class="space-y-8">
    <div class="card shadow-lg rounded-xl">
      <div class="card-body p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-2">
          Hoş Geldiniz, {{ user?.displayName || 'Kullanıcı' }}!
        </h2>
        <p class="text-lg text-gray-600">HistopathAI platformunda bugün ne yapmak istersiniz?</p>
      </div>
    </div>

    <h3 class="text-xl font-semibold text-gray-900">Hızlı Erişim</h3>

    <div class="flex flex-wrap gap-6">
      <RouterLink
        :to="{ name: 'Annotator' }"
        class="card shadow-lg rounded-xl transition-all duration-200 hover:shadow-xl hover:border-indigo-500 border-2 border-transparent w-full sm:w-96"
      >
        <div class="card-body p-6 flex items-center space-x-5">
          <div
            class="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
              />
            </svg>
          </div>
          <div>
            <h4 class="text-xl font-bold text-gray-900">Veri Etiketleyici</h4>
            <p class="text-gray-600 mt-1">Görüntüleri açın, etiketleyin ve analiz edin.</p>
          </div>
        </div>
      </RouterLink>

      <RouterLink
        :to="{ name: 'WorkspaceList' }"
        class="card shadow-lg rounded-xl transition-all duration-200 hover:shadow-xl hover:border-indigo-500 border-2 border-transparent w-full sm:w-96"
      >
        <div class="card-body p-6 flex items-center space-x-5">
          <div
            class="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div>
            <h4 class="text-xl font-bold text-gray-900">Veri Seti Oluşturucu</h4>
            <p class="text-gray-600 mt-1">Mevcut etiketlerden özel veri setleri derleyin.</p>
          </div>
        </div>
      </RouterLink>

      <RouterLink
        :to="{ name: 'Statistics' }"
        class="card shadow-lg rounded-xl transition-all duration-200 hover:shadow-xl hover:border-indigo-500 border-2 border-transparent w-full sm:w-96"
      >
        <div class="card-body p-6 flex items-center space-x-5">
          <div
            class="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
              />
            </svg>
          </div>
          <div>
            <h4 class="text-xl font-bold text-gray-900">İstatistikler</h4>
            <p class="text-gray-600 mt-1">Veri seti ilerlemesi ve review güvenilirliği.</p>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { RouterLink } from 'vue-router';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
</script>
