<template>
  <div class="card shadow-lg rounded-xl">
    <div class="card-body p-6">
      <div class="flex items-center space-x-4">
        <div
          class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium"
        >
          {{ user.initials }}
        </div>
        <div>
          <p class="text-lg font-semibold text-gray-900">{{ user.displayName || user.email }}</p>
          <p class="text-sm text-gray-500">{{ user.email }}</p>
        </div>
      </div>

      <div class="mt-4 space-y-2 border-t border-gray-100 pt-4">
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium text-gray-600">Durum:</span>
          <span :class="user.status.toCssClass()">
            {{ user.status.toDisplayString() }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium text-gray-600">Rol:</span>
          <span :class="user.role.toCssClass()">
            {{ user.role.toDisplayString() }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium text-gray-600">Admin Onaylı:</span>
          <span
            v-if="user.adminApproved"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
          >
            Evet
          </span>
          <span
            v-else
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
          >
            Hayır
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium text-gray-600" title="Defterlerden Firestore ve işlenmiş bucket'a salt-okunur erişim">
            Veri Erişimi:
          </span>
          <span
            v-if="user.dataAccess"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
            :title="user.dataAccessAt ? formatDate(user.dataAccessAt) + ' tarihinde verildi' : ''"
          >
            Var (salt-okunur)
          </span>
          <span
            v-else
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
          >
            Yok
          </span>
        </div>
        <div v-if="user.createdAt" class="flex justify-between items-center">
          <span class="text-sm font-medium text-gray-600">Kayıt Tarihi:</span>
          <span class="text-sm text-gray-900">{{ formatDate(user.createdAt) }}</span>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <button
          v-if="user.needsApproval()"
          @click="$emit('approve', user.userId)"
          :disabled="loading"
          class="btn btn-primary btn-sm"
        >
          Onayla
        </button>
        <button
          v-if="user.status.isSuspended()"
          @click="$emit('approve', user.userId)"
          :disabled="loading"
          class="btn btn-primary btn-sm"
        >
          Aktif Et
        </button>

        <button
          v-if="user.status.isActive()"
          @click="$emit('suspend', user.userId)"
          :disabled="loading"
          class="btn btn-outline btn-sm"
        >
          Askıya Al
        </button>

        <button
          v-if="!user.role.isAdmin() && user.status.isActive()"
          @click="$emit('makeAdmin', user.userId)"
          :disabled="loading"
          class="btn btn-primary btn-sm"
        >
          Admin Yap
        </button>

        <!-- Veri erişimi platform rolünden bağımsızdır: kullanıcıyı okuyucu
             grubuna ekler/çıkarır, IAM politikasına dokunmaz. -->
        <button
          v-if="user.status.isActive() && !user.dataAccess"
          @click="$emit('toggleDataAccess', user.userId, true)"
          :disabled="loading"
          class="btn btn-outline btn-sm"
        >
          Veri Erişimi Ver
        </button>
        <button
          v-if="user.dataAccess"
          @click="$emit('toggleDataAccess', user.userId, false)"
          :disabled="loading"
          class="btn btn-outline btn-sm"
        >
          Veri Erişimini Kaldır
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { User } from '@/core/entities/User';

defineProps({
  user: {
    type: Object as PropType<User>,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['approve', 'suspend', 'makeAdmin', 'toggleDataAccess']);

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
</script>
