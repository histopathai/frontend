<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Veri Seti Oluşturucu</h1>
        <p class="mt-1 text-gray-600">Mevcut veri setlerini yönetin veya yenisini oluşturun.</p>
      </div>
      <button @click="isModalOpen = true" class="btn btn-primary">+ Yeni Veri Seti</button>
    </div>

    <div v-if="store.loading && store.workspaces.length === 0" class="text-center py-10">
      <p>Veri setleri yükleniyor...</p>
    </div>

    <WorkspaceList v-else :workspaces="store.workspaces" />

    <CreateWorkspaceModal v-if="isModalOpen" @close="isModalOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import WorkspaceList from '@/presentation/components/app/DatasetList.vue';
import CreateWorkspaceModal from '@/presentation/components/app/CreateDatasetModal.vue';

const store = useWorkspaceStore();
const isModalOpen = ref(false);
onMounted(() => {
  store.fetchWorkspaces();
});
</script>
