import { onMounted, onUnmounted } from 'vue';
import type { TissueMaskEditor } from './useTissueMaskEditor';

/**
 * Keyboard shortcuts of the tissue tab. The tissue viewer disables
 * OpenSeadragon's own keys (e.g. "f" flips the image), so these do not clash.
 */
export function useTissueShortcuts(editor: TissueMaskEditor, fitToSelection: () => void) {
  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      editor.undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      editor.save();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key) {
      case 'Escape':
        if (editor.draft.value.length) editor.cancelDraft();
        else editor.selectedIndex.value = -1;
        break;
      case 'Enter':
        if (editor.tool.value === 'draw') editor.finishDraft();
        break;
      case 'Delete':
      case 'Backspace':
        editor.deleteSelected();
        break;
      case 'v':
      case 'V':
        editor.cancelDraft();
        editor.tool.value = 'select';
        break;
      case 'x':
      case 'X':
        editor.cancelDraft();
        editor.tool.value = 'delete';
        break;
      case 'd':
      case 'D':
        editor.tool.value = 'draw';
        break;
      case 'f':
      case 'F':
        fitToSelection();
        break;
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown));
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
}
