<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-4xl font-bold tracking-tight text-gray-900">Admin Kontrol Paneli</h1>
      <p class="mt-2 text-lg text-gray-600">
        Uygulama verilerini ve kullanıcıları buradan yönetin.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div class="card">
        <div class="card-body">
          <div class="flex items-center space-x-3">
            <svg
              class="h-6 w-6 text-gray-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372m-1.066-2.599a5.25 5.25 0 1 0-11.313 0m11.313 0a5.25 5.25 0 1 0-11.313 0m0 0a2.25 2.25 0 0 0 5.625 2.25h1.063a2.25 2.25 0 0 0 5.625-2.25m-11.313 0a5.25 5.25 0 0 0-5.625 2.25c-.135 .44-.27.905-.406 1.368m11.115-3.64c-.135-.463-.27-.928-.406-1.368a5.25 5.25 0 0 0-11.313 0m11.313 0h.008v.008h-.008v-.008Zm-5.625 0a2.25 2.25 0 0 1 2.25 2.25h.008a2.25 2.25 0 0 1 2.25-2.25h.008a2.25 2.25 0 0 1 2.25 2.25h.008a2.25 2.25 0 0 1 2.25-2.25h.008a2.25 2.25 0 0 1 2.25 2.25h.008a2.25 2.25 0 0 1 2.25-2.25h.008a2.25 2.25 0 0 1 2.25 2.25h.008a2.25 2.25 0 0 1 2.25-2.25Z"
              />
            </svg>
            <h3 class="text-lg font-medium text-gray-900">Kullanıcı Yönetimi</h3>
          </div>
          <p class="mt-2 text-sm text-gray-500">
            Kullanıcıları görüntüleyin, onaylayın veya askıya alın.
          </p>
          <div class="mt-4">
            <router-link to="/admin/users" class="btn btn-primary">
              Kullanıcıları Yönet
            </router-link>
          </div>
        </div>
      </div>

      <div class="card bg-gray-50">
        <div class="card-body">
          <h3 class="text-lg font-medium text-gray-500">Uygulama Ayarları</h3>
          <p class="mt-2 text-sm text-gray-400">(Yakında)</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
