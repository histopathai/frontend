import { computed, onMounted, ref } from 'vue';
import { useAdminStore } from '@/stores/admin';
import { useWorkspaceStore } from '@/stores/workspace';
import { storeToRefs } from 'pinia';
import { repositories } from '@/services'; // YENİ

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
};

export function useAdminDashboard() {
  const adminStore = useAdminStore();
  const workspaceStore = useWorkspaceStore();

  const { users, loading: adminLoading } = storeToRefs(adminStore);
  const { workspaces, loading: workspaceLoading } = storeToRefs(workspaceStore);

  const totalPatients = ref(0);
  const totalImages = ref(0);

  onMounted(async () => {
    if (!users.value || users.value.length === 0) {
      adminStore.fetchAllUsers({ limit: 100, offset: 0 });
    }

    if (!workspaces.value || workspaces.value.length === 0) {
      workspaceStore.fetchWorkspaces({ limit: 100, offset: 0 });
    }

    try {
      const [pCount, iCount] = await Promise.all([
        repositories.patient.count(),
        repositories.image.count(),
      ]);
      totalPatients.value = pCount;
      totalImages.value = iCount;
    } catch (e) {
      console.error('İstatistikler yüklenemedi', e);
    }
  });

  const pendingUsersCount = computed(
    () => (users.value || []).filter((u) => u.status.isPending()).length
  );
  const activeUsersCount = computed(
    () => (users.value || []).filter((u) => u.status.isActive()).length
  );
  const totalWorkspaces = computed(() => (workspaces.value || []).length);
  const pendingUsersList = computed(() =>
    (users.value || [])
      .filter((u) => u.status.isPending())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
  );

  const userRegistrationChartData = computed(() => {
    const labels: string[] = [];
    const data: number[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(formatDate(date));

      const count = (users.value || []).filter((user) => {
        const createdAt = new Date(user.createdAt);
        createdAt.setHours(0, 0, 0, 0);
        return createdAt.getTime() === date.getTime();
      }).length;

      data.push(count);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Yeni Kullanıcılar',
          data,
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderColor: 'rgba(79, 70, 229, 1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

  return {
    loading: computed(() => adminLoading.value || workspaceLoading.value),

    pendingUsersCount,
    activeUsersCount,
    totalWorkspaces,
    totalPatients,
    totalImages,
    pendingUsersList,

    userRegistrationChartData,
  };
}
