import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

// Shared across opted-in dialogs so switching login/register retains the page opener.
const activeDialogs = [];
let opener = null;
let openerId = '';
const focusableSelector = 'a[href], button, input, select, textarea, [tabindex]';
const focusableElements = (panel) => [...panel.querySelectorAll(focusableSelector)]
  .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0);

export function useDialogFocus({ show, enabled, panel, initialFocus }) {
  const entry = { panel };
  const focusInitial = () => {
    const target = panel.value?.querySelector(initialFocus.value || '[autofocus]');
    const focusable = focusableElements(panel.value);
    (focusable.includes(target) ? target : focusable[0] || panel.value)?.focus({ preventScroll: true });
  };
  const handleTab = (event) => {
    if (event.key !== 'Tab' || activeDialogs.at(-1) !== entry || !panel.value) return;
    const elements = focusableElements(panel.value);
    const first = elements[0];
    const last = elements.at(-1);
    const current = document.activeElement;
    if (!first) {
      event.preventDefault();
      panel.value.focus({ preventScroll: true });
    } else if (!panel.value.contains(current) || (event.shiftKey && current === first) || (!event.shiftKey && current === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
  };
  const activate = () => {
    if (!show.value || !enabled.value || !panel.value || activeDialogs.includes(entry)) return;
    if (!opener) {
      opener = document.activeElement;
      openerId = opener?.id || '';
    }
    activeDialogs.push(entry);
    document.addEventListener('keydown', handleTab, true);
    focusInitial();
  };
  const deactivate = () => {
    const index = activeDialogs.indexOf(entry);
    if (index < 0) return;
    activeDialogs.splice(index, 1);
    document.removeEventListener('keydown', handleTab, true);
    nextTick(() => {
      // Another auth dialog may have opened in this render; keep the original opener.
      const activePanel = activeDialogs.at(-1)?.panel.value;
      if (activePanel) {
        if (!activePanel.contains(document.activeElement)) {
          (focusableElements(activePanel)[0] || activePanel).focus({ preventScroll: true });
        }
        return;
      }
      const target = opener?.isConnected ? opener : openerId ? document.getElementById(openerId) : null;
      opener = null;
      openerId = '';
      target?.focus({ preventScroll: true });
    });
  };
  watch([show, enabled], ([visible, managed]) => {
    if (visible && managed) activate();
    else deactivate();
  }, { flush: 'post' });
  onMounted(activate);
  onBeforeUnmount(deactivate);
}
