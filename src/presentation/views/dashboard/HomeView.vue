<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-4xl font-bold tracking-tight text-gray-900">
        Hoş Geldiniz {{ welcomeMessage }}!
      </h1>
      <p class="mt-2 text-lg text-gray-600">
        Bu sizin kişisel kontrol paneliniz. Projelerinizi buradan yönetebilirsiniz.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div class="card">
        <div class="card-body">
          <h3 class="text-lg font-medium text-gray-900">Son Etkinlikler</h3>
          <p class="mt-2 text-sm text-gray-500">Henüz son etkinlik bulunmamaktadır.</p>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <h3 class="text-lg font-medium text-gray-900">Hızlı Bağlantılar</h3>
          <div class="mt-4">
            <router-link to="/dashboard/profile" class="btn btn-primary">
              Profilimi Yönet
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDashboard } from '@/presentation/composables/user/useDashboard';
const { welcomeMessage } = useDashboard();
</script>
