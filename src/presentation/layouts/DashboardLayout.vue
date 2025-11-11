<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div class="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <router-link to="/dashboard" class="text-xl font-semibold text-gray-900">
              {{ appName }}
            </router-link>
            <router-link
              to="/wsi-viewer"
              class="text-sm font-medium text-gray-600 hover:text-indigo-600 ml-6"
            >
              WSI Görüntüleyici
            </router-link>
            <router-link
              to="/dashboard/workspaces"
              class="text-sm font-medium text-gray-600 hover:text-indigo-600 ml-4"
            >
              Çalışma Alanlarım
            </router-link>
          </div>

          <div class="flex items-center space-x-4">
            <router-link
              v-if="authStore.isAdmin"
              to="/admin"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Admin Paneli
            </router-link>

            <div class="relative">
              <button
                @click="toggleUserMenu"
                class="user-menu-button flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <div
                  class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden"
                >
                  <span class="text-white text-sm font-medium">
                    {{ authStore.userInitials }}
                  </span>
                </div>
                <span class="text-gray-700 hidden sm:inline">
                  {{ authStore.user?.displayName || authStore.user?.email || 'Kullanıcı' }}
                </span>
              </button>

              <div
                v-if="showUserMenu"
                class="user-dropdown absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
              >
                <router-link
                  to="/dashboard/profile"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  @click="showUserMenu = false"
                >
                  Profilim
                </router-link>
                <div class="border-t border-gray-100"></div>
                <button
                  @click="handleLogout"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main :class="mainClasses">
      <div
        v-if="authStore.user?.status.isPending()"
        class="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4"
      >
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Hesabınız Onay Bekliyor</h3>
            <p class="mt-1 text-sm text-yellow-700">
              Hesabınız yönetici onayı bekliyor. Bazı özellikler kısıtlı olabilir.
            </p>
          </div>
        </div>
      </div>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { useUserMenu } from '@/presentation/composables/layout/useUserMenu';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();
const appName = import.meta.env.VITE_APP_NAME || 'HistopathAI';

const { showUserMenu, toggleUserMenu, closeMenu } = useUserMenu(
  '.user-menu-button',
  '.user-dropdown'
);

const handleLogout = () => {
  closeMenu();
  authStore.logout();
  toast.success('Başarıyla çıkış yapıldı.');
  router.push('/auth/login');
};

const mainClasses = computed(() => {
  if (route.meta.fullWidth) {
    return 'flex-1 w-full flex';
  }
  return 'flex-1 w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8';
});
</script>
