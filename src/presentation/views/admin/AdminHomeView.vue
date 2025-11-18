<template>
  <div class="space-y-8">
    <div v-if="loading && pendingUsersList.length === 0" class="text-center py-10">
      <p>Dashboard verileri yükleniyor...</p>
    </div>

    <div v-else class="space-y-8">
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900">Genel Bakış</h3>
        <div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            :to="{ name: 'UserManagement' }"
            class="card overflow-hidden shadow-lg rounded-xl transition-all hover:shadow-xl"
          >
            <div class="card-body p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg
                    class="h-6 w-6 text-yellow-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="truncate text-sm font-medium text-gray-500">
                      Onay Bekleyen Kullanıcı
                    </dt>
                    <dd class="text-3xl font-bold text-gray-900">{{ pendingUsersCount }}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div class="bg-yellow-50 px-5 py-3">
              <div class="text-sm"><span class="font-medium text-yellow-700">İncele</span></div>
            </div>
          </RouterLink>

          <div class="card overflow-hidden shadow-lg rounded-xl">
            <div class="card-body p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="yellowgreen"
                    class="size-6"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="truncate text-sm font-medium text-gray-500">Aktif Kullanıcılar</dt>
                    <dd class="text-3xl font-bold text-gray-900">{{ activeUsersCount }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <RouterLink
            :to="{ name: 'DatasetBuilder' }"
            class="card overflow-hidden shadow-lg rounded-xl transition-all hover:shadow-xl"
          >
            <div class="card-body p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="blue"
                    class="size-6"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="truncate text-sm font-medium text-gray-500">Toplam Veri Seti</dt>
                    <dd class="text-3xl font-bold text-gray-900">{{ totalWorkspaces }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900">Yapılacaklar Listesi</h3>
        <div class="mt-5 card shadow-lg rounded-xl overflow-hidden">
          <div class="card-body p-0">
            <ul v-if="pendingUsersList.length > 0" role="list" class="divide-y divide-gray-200">
              <li
                v-for="user in pendingUsersList"
                :key="user.userId"
                class="flex items-center justify-between p-4"
              >
                <div class="flex items-center space-x-3">
                  <div
                    class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium"
                  >
                    {{ user.initials }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ user.displayName }}</p>
                    <p class="text-sm text-gray-500">{{ user.email }}</p>
                  </div>
                </div>
                <div class="flex-shrink-0 space-x-2">
                  <button @click="approveUser(user.userId)" class="btn btn-primary btn-sm">
                    Onayla
                  </button>
                  <button @click="suspendUser(user.userId)" class="btn btn-outline btn-sm">
                    Reddet (Askıya Al)
                  </button>
                </div>
              </li>
            </ul>

            <div v-else class="p-6 text-center text-gray-500">
              <p>Onay bekleyen kullanıcı bulunmuyor. Harika iş!</p>
            </div>
          </div>
          <div class="bg-gray-50 px-5 py-3 text-right">
            <RouterLink
              :to="{ name: 'UserManagement' }"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Tüm Kullanıcıları Yönet →
            </RouterLink>
          </div>
        </div>
      </div>
      <div class="lg:col-span-2">
        <h3 class="text-lg font-medium leading-6 text-gray-900">Kayıt İstatistikleri</h3>
        <div class="mt-5">
          <UserRegistrationChart :chart-data="userRegistrationChartData" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useAdminDashboard } from '@/presentation/composables/admin/useAdminDashboard';
import { useAdminStore } from '@/stores/admin'; // Eylemler için store'u import et
import UserRegistrationChart from '@/presentation/components/admin/UserRegistrationChart.vue';

const {
  loading,
  pendingUsersCount,
  activeUsersCount,
  totalWorkspaces,
  pendingUsersList,
  userRegistrationChartData,
} = useAdminDashboard();

const adminStore = useAdminStore();

async function approveUser(userId: string) {
  if (confirm('Bu kullanıcıyı onaylamak istediğinizden emin misiniz?')) {
    await adminStore.approveUser(userId);
  }
}

async function suspendUser(userId: string) {
  if (confirm('Bu kullanıcıyı reddetmek (askıya almak) istediğinizden emin misiniz?')) {
    await adminStore.suspendUser(userId);
  }
}
</script>
