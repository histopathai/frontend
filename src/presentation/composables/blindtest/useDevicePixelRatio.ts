import { onBeforeUnmount, ref } from 'vue';

/**
 * window.devicePixelRatio, kept current: it changes with browser zoom and when
 * the window moves to another screen. An image shown at naturalWidth / ratio
 * CSS pixels lands on exactly one screen pixel per image pixel — no resampling.
 */
export function useDevicePixelRatio() {
  const ratio = ref(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  let query: MediaQueryList | null = null;

  const watch = () => {
    query?.removeEventListener('change', update);
    query = window.matchMedia(`(resolution: ${ratio.value}dppx)`);
    query.addEventListener('change', update);
  };
  function update() {
    ratio.value = window.devicePixelRatio || 1;
    watch();
  }

  if (typeof window !== 'undefined' && 'matchMedia' in window) watch();
  onBeforeUnmount(() => query?.removeEventListener('change', update));
  return ratio;
}
