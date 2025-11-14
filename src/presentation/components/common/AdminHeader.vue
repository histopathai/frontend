<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <nav class="px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex h-full">
          <div class="flex-shrink-0 flex items-center">
            <h1 class="text-xl font-bold text-indigo-600">
              HistoPathAI
              <span class="ml-2 text-sm font-medium text-gray-500">/ Admin</span>
            </h1>
          </div>

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
            :to="{ name: 'Home' }"
            class="text-sm font-medium text-indigo-600 hover:text-indigo-500 mr-6"
          >
            Ana Siteye Dön
          </RouterLink>
          <span class="text-sm text-gray-700 mr-4"> (Admin) {{ user?.displayName }} </span>
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

const navigation = [
  { name: 'Dashboard', routeName: 'AdminDashboard' },
  { name: 'Kullanıcı Yönetimi', routeName: 'UserManagement' },
];

async function handleLogout() {
  await authStore.logout();
  router.push({ name: 'Login' });
}
</script>
