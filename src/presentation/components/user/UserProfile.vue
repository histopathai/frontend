<template>
  <div v-if="isLoading" class="card text-center p-6">Yükleniyor...</div>
  <div v-else-if="user" class="card">
    <div class="card-header">
      <h3 class="text-lg font-medium leading-6 text-gray-900">Profil Bilgileri</h3>
      <p class="mt-1 text-sm text-gray-500">Hesap bilgilerinizi ve tercihlerinizi güncelleyin.</p>
    </div>
    <div class="card-body">
      <dl class="divide-y divide-gray-200">
        <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt class="text-sm font-medium text-gray-500">UID</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ user.uid || 'Bilinmiyor' }}
          </dd>
        </div>

        <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt class="text-sm font-medium text-gray-500">E-posta Adresi</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ user.email || 'Bilinmiyor' }}
          </dd>
        </div>

        <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt class="text-sm font-medium text-gray-500">Görünen Ad</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ user.displayName || 'Belirtilmemiş' }}
          </dd>
        </div>

        <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt class="text-sm font-medium text-gray-500">Hesap Durumu</dt>
          <dd class="mt-1 text-sm sm:col-span-2 sm:mt-0">
            <span :class="statusClass">
              {{ displayStatus }}
            </span>
          </dd>
        </div>

        <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt class="text-sm font-medium text-gray-500">Kullanıcı Rolü</dt>
          <dd class="mt-1 text-sm sm:col-span-2 sm:mt-0">
            <span :class="roleClass">
              {{ displayRole }}
            </span>
          </dd>
        </div>

        <div v-if="user.createdAt" class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt class="text-sm font-medium text-gray-500">Kayıt Tarihi</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ formattedCreatedAt }}
          </dd>
        </div>

        <div v-if="user.updatedAt" class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt class="text-sm font-medium text-gray-500">Son Güncelleme</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ formattedUpdatedAt }}
          </dd>
        </div>

        <div
          v-if="user.approvalDate && user.adminApproved"
          class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4"
        >
          <dt class="text-sm font-medium text-gray-500">Onay Tarihi</dt>
          <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
            {{ formattedApprovalDate }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProfile } from '@/presentation/composables/user/useProfile';

const {
  user,
  isLoading,
  displayStatus,
  statusClass,
  displayRole,
  roleClass,
  formattedCreatedAt,
  formattedUpdatedAt,
  formattedApprovalDate,
} = useProfile();
</script>
