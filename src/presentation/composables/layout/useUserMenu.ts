import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Kullanıcı menüsü açılır/kapanır mantığını yöneten composable.
 * @param buttonSelector Menüyü açan düğmenin CSS seçicisi (selector)
 * @param dropdownSelector Açılır menünün CSS seçicisi (selector)
 */
export function useUserMenu(buttonSelector: string, dropdownSelector: string) {
  const router = useRouter();
  const showUserMenu = ref(false);

  const toggleUserMenu = () => {
    showUserMenu.value = !showUserMenu.value;
  };

  const closeMenu = () => {
    showUserMenu.value = false;
  };

  const handleClickOutside = (event: MouseEvent) => {
    const dropdown = document.querySelector(dropdownSelector);
    const button = document.querySelector(buttonSelector);

    if (dropdown && button && event.target) {
      if (!dropdown.contains(event.target as Node) && !button.contains(event.target as Node)) {
        closeMenu();
      }
    }
  };

  watch(
    () => router.currentRoute.value.fullPath,
    () => {
      closeMenu();
    }
  );

  onMounted(() => document.addEventListener('click', handleClickOutside));
  onUnmounted(() => document.removeEventListener('click', handleClickOutside));

  return {
    showUserMenu,
    toggleUserMenu,
    closeMenu,
  };
}
