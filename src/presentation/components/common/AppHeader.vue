<template>
  <header class="bg-white shadow-sm border-b border-gray-200 relative z-40">
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

        <div class="flex items-center space-x-4">
          <RouterLink
            v-if="isAdmin"
            :to="{ name: 'AdminDashboard' }"
            class="btn btn-ghost btn-sm hidden md:inline-flex"
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
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
              />
            </svg>

            Admin Paneli
          </RouterLink>

          <div class="relative ml-3">
            <div>
              <button
                @click="toggleDropdown"
                class="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:bg-gray-100 pr-2 pl-1 py-1"
                id="user-menu-button"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <span class="sr-only">Kullanıcı menüsünü aç</span>
                <div
                  class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200"
                >
                  {{ userInitials }}
                </div>
                <span class="ml-2 font-medium text-gray-700 hidden md:block truncate max-w-[150px]">
                  {{ user?.displayName || user?.email }}
                </span>
                <svg
                  class="w-4 h-4 ml-1 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div
              v-if="isDropdownOpen"
              class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-in-down"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
              tabindex="-1"
            >
              <div class="px-4 py-2 border-b border-gray-100 md:hidden">
                <p class="text-sm font-medium text-gray-900 truncate">{{ user?.displayName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ user?.email }}</p>
              </div>

              <RouterLink
                :to="{ name: 'UserProfile' }"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                role="menuitem"
                tabindex="-1"
                @click="closeDropdown"
              >
                <svg
                  class="w-4 h-4 mr-2 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
                Profilim & Ayarlar
              </RouterLink>

              <button
                @click="handleLogout"
                class="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                role="menuitem"
                tabindex="-1"
              >
                <svg
                  class="w-4 h-4 mr-2 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                  />
                </svg>
                Çıkış Yap
              </button>
            </div>
          </div>

          <div
            v-if="isDropdownOpen"
            @click="closeDropdown"
            class="fixed inset-0 z-40 bg-transparent cursor-default"
          ></div>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const user = computed(() => authStore.user);
const isAdmin = computed(() => authStore.isAdmin);
const userInitials = computed(() => authStore.userInitials);

const isDropdownOpen = ref(false);

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function closeDropdown() {
  isDropdownOpen.value = false;
}

const navigation = [
  { name: 'Veri Etiketleyici', routeName: 'Annotator' },
  { name: 'Veri Seti Oluşturucu', routeName: 'WorkspaceList' },
];

async function handleLogout() {
  closeDropdown();
  await authStore.logout();
  router.push({ name: 'Login' });
}
</script>

<style scoped>
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.animate-fade-in-down {
  animation: fadeInDown 0.15s ease-out forwards;
}
</style>
