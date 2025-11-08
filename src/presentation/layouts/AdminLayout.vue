<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-8">
            <router-link to="/admin" class="text-xl font-semibold text-gray-900">
              {{ appName }} Admin
            </router-link>
            <div class="hidden md:flex space-x-8">
              <router-link
                to="/admin/dashboard"
                class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                :class="{
                  'text-primary-600 bg-primary-50': route.path.endsWith('/admin/dashboard'),
                }"
              >
                Dashboard
              </router-link>
              <router-link
                to="/admin/users"
                class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                :class="{ 'text-primary-600 bg-primary-50': route.path.startsWith('/admin/users') }"
              >
                Kullanıcılar
              </router-link>
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <router-link
              to="/dashboard"
              class="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Dashboard'a Geri Dön
            </router-link>

            <div class="relative">
              <button
                @click="toggleUserMenu"
                class="admin-menu-button flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <div class="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center">
                  <span class="text-white text-sm font-medium">
                    {{ authStore.userInitials }}
                  </span>
                </div>
                <span class="text-gray-700">{{
                  authStore.user?.displayName || authStore.user?.email || 'Admin'
                }}</span>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                >
                  Admin
                </span>
              </button>

              <div
                v-if="showUserMenu"
                class="admin-dropdown absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
              >
                <router-link
                  to="/dashboard/profile"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  @click="closeMenu"
                >
                  Profil
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

    <div class="md:hidden bg-white border-b border-gray-200">
      <div class="px-2 pt-2 pb-3 space-y-1">
        <router-link
          to="/admin/dashboard"
          class="text-gray-500 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
          :class="{ 'text-primary-600 bg-primary-50': route.path.endsWith('/admin/dashboard') }"
        >
          Dashboard
        </router-link>
        <router-link
          to="/admin/users"
          class="text-gray-500 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium"
          :class="{ 'text-primary-600 bg-primary-50': route.path.startsWith('/admin/users') }"
        >
          Kullanıcılar
        </router-link>
      </div>
    </div>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { useUserMenu } from '@/presentation/composables/useUserMenu';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const appName = import.meta.env.VITE_APP_NAME || 'HistopathAI';

// --- Use Case Logic (Çıkış Yapma) ---
const handleLogout = async () => {
  try {
    closeMenu(); // Menüyü kapat
    await authStore.logout();
    toast.success('Başarıyla çıkış yapıldı.');
    router.push('/auth/login');
  } catch (error) {
    toast.error('Çıkış yaparken hata oluştu.');
    console.error(error);
  }
};

// --- View Logic (Composable'dan geliyor) ---
const { showUserMenu, toggleUserMenu, closeMenu } = useUserMenu(
  '.admin-menu-button',
  '.admin-dropdown'
);
</script>
