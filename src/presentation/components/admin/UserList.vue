<template>
  <div class="card">
    <div class="card-header flex justify-between items-center">
      <h3 class="text-lg font-medium text-gray-900">Tüm Kullanıcılar</h3>
      <button @click="handleRefresh" class="btn btn-outline btn-sm">
        <svg
          v-if="isLoading"
          class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        ></svg>
        <svg
          v-else
          class="-ml-0.5 mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        ></svg>
        Yenile
      </button>
    </div>

    <div class="card-body">
      <div v-if="isLoading" class="text-center py-8 text-gray-500">
        <p>Kullanıcılar yükleniyor...</p>
      </div>

      <div v-else-if="error" class="text-center py-8 text-red-600">
        <p>{{ error }}</p>
        <button @click="handleRefresh" class="btn btn-secondary btn-sm mt-4">Tekrar Dene</button>
      </div>

      <div v-else-if="!users || users.length === 0" class="text-center py-8 text-gray-500">
        <p>Henüz kayıtlı kullanıcı bulunmamaktadır.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UserCard
          v-for="user in users"
          :key="user.userId"
          :user="user"
          :loading="isLoading"
          @approve="handleApprove(user.userId)"
          @suspend="handleSuspend(user.userId)"
          @make-admin="handleMakeAdmin(user.userId)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import UserCard from '@/presentation/components/admin/UserCard.vue';
import { useUserManagement } from '@/presentation/composables/admin/useUsers';

const { users, isLoading, error, handleRefresh, handleApprove, handleSuspend, handleMakeAdmin } =
  useUserManagement();
</script>
