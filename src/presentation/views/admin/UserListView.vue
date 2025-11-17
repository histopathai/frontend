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

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <UserCard
        v-for="user in store.users"
        :key="user.userId"
        :user="user"
        :loading="store.loading"
        @approve="approveUser"
        @suspend="suspendUser"
        @makeAdmin="makeAdmin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAdminStore } from '@/stores/admin';

import UserCard from '@/presentation/components/admin/UserCard.vue';

const store = useAdminStore();

onMounted(() => {
  store.fetchAllUsers();
});

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

async function makeAdmin(userId: string) {
  if (confirm('Bu kullanıcıyı Admin yapmak istediğinizden emin misiniz?')) {
    await store.makeAdmin(userId);
  }
}
</script>
