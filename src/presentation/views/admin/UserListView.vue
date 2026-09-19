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
        :is-self="user.userId === authStore.user?.userId"
        @approve="approveUser"
        @suspend="suspendUser"
        @changeRole="changeRole"
        @toggleDataAccess="toggleDataAccess"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAdminStore } from '@/stores/admin';
import { useAuthStore } from '@/stores/auth';
import { UserRole, type UserRoleValue } from '@/core/value-objects/UserRole';

import UserCard from '@/presentation/components/admin/UserCard.vue';

const store = useAdminStore();
const authStore = useAuthStore();

onMounted(() => {
  store.fetchAllUsers();
});

// A new user arrives with the group picked on their card; reactivating a
// suspended one sends none and they keep the role they had.
async function approveUser(userId: string, role?: 'pathologist' | 'datascientist') {
  const message = role
    ? `Bu kullanıcı "${UserRole.fromString(role).toDisplayString()}" grubuyla onaylanacak. Emin misiniz?`
    : 'Bu kullanıcıyı yeniden aktif etmek istediğinizden emin misiniz?';
  if (confirm(message)) {
    await store.approveUser(userId, role);
  }
}

async function suspendUser(userId: string) {
  if (confirm('Bu kullanıcıyı askıya almak istediğinizden emin misiniz?')) {
    await store.suspendUser(userId);
  }
}

const ROLE_EFFECT: Record<Exclude<UserRoleValue, 'unassigned'>, string> = {
  admin: 'Her yerde okuma-yazma ve bu yönetim paneline erişim kazanır.',
  pathologist: 'Veri etiketleme, doku maskeleri ve patch ızgarasında okuma-yazma yapabilir.',
  datascientist:
    'Veri etiketlemede yalnızca görüntüleyebilir; doku maskeleri ve patch ızgarasında çalışabilir.',
};

async function changeRole(userId: string, role: Exclude<UserRoleValue, 'unassigned'>) {
  const name = UserRole.fromString(role).toDisplayString();
  if (confirm(`Kullanıcının grubu "${name}" olacak.\n\n${ROLE_EFFECT[role]}\n\nEmin misiniz?`)) {
    await store.setRole(userId, role);
  }
}

async function toggleDataAccess(userId: string, grant: boolean) {
  const message = grant
    ? 'Bu kullanıcıya araştırma verisine salt-okunur erişim verilecek. Emin misiniz?'
    : 'Bu kullanıcının araştırma verisine erişimi kaldırılacak. Emin misiniz?';
  if (confirm(message)) {
    await store.setDataAccess(userId, grant);
  }
}
</script>
