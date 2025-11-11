<template>
  <div class="card">
    <div class="card-body">
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

      <div class="mt-4 space-y-2">
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
        <div v-if="user.createdAt" class="flex justify-between items-center">
          <span class="text-sm font-medium text-gray-600">Kayıt Tarihi:</span>
          <span class="text-sm text-gray-900">{{ formatDate(user.createdAt) }}</span>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <button
          v-if="user.status.isPending() || user.status.isSuspended()"
          @click="$emit('approve', user.userId)"
          :disabled="loading"
          class="btn btn-primary btn-sm"
        >
          {{ user.status.isPending() ? 'Onayla' : 'Aktif Et' }}
        </button>

        <button
          v-if="user.status.isActive()"
          @click="$emit('suspend', user.userId)"
          :disabled="loading"
          class="btn btn-secondary btn-sm"
        >
          Askıya Al
        </button>

        <button
          v-if="!user.role.isAdmin() && user.status.isActive()"
          @click="$emit('make-admin', user.userId)"
          :disabled="loading"
          class="btn btn-success btn-sm"
        >
          Admin Yap
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { User } from '@/core/entities/User';
import { formatDate } from '@/presentation/utils/formatters';

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

defineEmits(['approve', 'suspend', 'make-admin']);
</script>
