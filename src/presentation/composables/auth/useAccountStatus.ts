import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { UserStatus } from '@/core/value-objects/UserStatus';

/**
 * AccountStatusView için gerekli state ve mantığı sağlar.
 */
export function useAccountStatus() {
  const authStore = useAuthStore();
  const user = computed(() => authStore.user);

  const displayStatus = computed(()_ => {
    if (user.value && user.value.status) {
        return user.value.status.toDisplayString();
    }
    
    return UserStatus.pending().toDisplayString(); 
  });

  return {
    displayStatus,
  };
}