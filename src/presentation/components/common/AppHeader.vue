<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <nav class="px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex h-full">
          <RouterLink
            :to="{ name: 'Home' }"
            class="flex-shrink-0 flex items-center transition-opacity hover:opacity-80"
          >
            <h1 class="text-xl font-bold text-indigo-600">HistopathAI</h1>
          </RouterLink>
          <div class="hidden sm:ml-10 sm:flex sm:space-x-8 h-full">
            <RouterLink
              v-for="item in navigation"
              :key="item.name"
              :to="{ name: item.routeName }"
              v-slot="{ href, navigate, isExactActive }"
            >
              <a
                :href="href"
                @click="navigate"
                :class="[
                  isExactActive
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'inline-flex items-center h-full px-3 border-b-2 text-sm font-medium transition-colors',
                ]"
              >
                {{ item.name }}
              </a>
            </RouterLink>
          </div>
        </div>

        <div class="flex items-center">
          <RouterLink
            v-if="isAdmin"
            :to="{ name: 'AdminDashboard' }"
            class="btn btn-ghost btn-sm mr-4"
          >
            <svg
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
              />
            </svg>
            <span class="hidden md:inline ml-2">Admin Paneli</span>
          </RouterLink>
          <span class="text-sm text-gray-700 mr-4">
            Merhaba, {{ user?.displayName || user?.email }}
          </span>
          <button @click="handleLogout" class="btn btn-outline btn-sm">Çıkış Yap</button>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const user = computed(() => authStore.user);
const isAdmin = computed(() => authStore.isAdmin);

const navigation = [
  { name: 'Veri Etiketleyici', routeName: 'Annotator' },
  { name: 'Veri Seti Oluşturucu', routeName: 'DatasetBuilder' },
];

async function handleLogout() {
  await authStore.logout();
  router.push({ name: 'Login' });
}
</script>
