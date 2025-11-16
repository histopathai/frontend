<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-4">Kullanıcı Yönetimi</h1>

    <div v-if="store.loading" class="text-center py-10">
      <p>Kullanıcılar yükleniyor...</p>
    </div>

    <div v-else-if="store.error" class="card bg-red-50 border-red-200 text-red-800 p-4">
      <p class="font-semibold">Bir hata oluştu:</p>
      <p>{{ store.error }}</p>
    </div>

    <div v-else class="card shadow-lg rounded-xl overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Ad Soyad
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              E-posta
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Statü
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Eylemler
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in store.users" :key="user.userId">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ user.displayName }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span :class="user.status.toCssClass()">
                {{ user.status.toDisplayString() }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button
                v-if="user.needsApproval()"
                @click="approveUser(user.userId)"
                class="btn btn-outline btn-sm"
              >
                Onayla
              </button>
              <button
                v-if="user.status.isActive()"
                @click="suspendUser(user.userId)"
                class="btn btn-ghost-danger btn-sm"
              >
                Askıya Al
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAdminStore } from '@/stores/admin';

const store = useAdminStore();

// Sayfa yüklendiğinde kullanıcıları çek
onMounted(() => {
  store.fetchAllUsers();
});

// Eylemler
async function approveUser(userId: string) {
  if (confirm('Bu kullanıcıyı onaylamak istediğinizden emin misiniz?')) {
    await store.approveUser(userId);
  }
}

async function suspendUser(userId: string) {
  if (confirm('Bu kullanıcıyı askıya almak istediğinizden emin misiniz?')) {
    await store.suspendUser(userId);
  }
}
</script>
