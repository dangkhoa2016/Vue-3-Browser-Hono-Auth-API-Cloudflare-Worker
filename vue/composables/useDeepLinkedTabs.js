import { computed, onBeforeUnmount, ref, watch } from 'vue';

const { useRoute, useRouter } = VueRouter;

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export function useDeepLinkedTabs({ routeName, tabs, initialTab, storageKey = '', rememberSelection = false }) {
  const route = useRoute();
  const router = useRouter();

  const activeTab = ref(initialTab);
  const copiedTabKey = ref('');

  let copyTimer = null;

  const resolvedTabs = computed(() => {
    const value = typeof tabs === 'function' ? tabs() : tabs?.value || tabs || [];
    return Array.isArray(value) ? value : [];
  });

  const availableTabKeys = computed(() => (resolvedTabs?.value || []).map((tab) => tab.key || tab.id).filter(Boolean));

  const isValidTab = (tabKey) => (availableTabKeys?.value || []).includes(tabKey);

  const shouldRememberSelection = () => Boolean(
    typeof rememberSelection === 'function'
      ? rememberSelection()
      : rememberSelection?.value ?? rememberSelection
  );

  const readStoredTab = () => {
    if (!storageKey || !shouldRememberSelection() || typeof window === 'undefined' || !window.localStorage) {
      return '';
    }

    return normalizeText(window.localStorage.getItem(storageKey));
  };

  const writeStoredTab = (tabKey) => {
    if (!storageKey || typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    if (!shouldRememberSelection()) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, tabKey);
  };

  const readRouteTab = () => {
    const queryTab = normalizeText(route?.query?.tab);
    if (queryTab) {
      return queryTab;
    }

    return normalizeText(route?.hash).replace(/^#/, '');
  };

  const selectTab = (tabKey) => {
    if (!isValidTab(tabKey)) {
      return;
    }

    activeTab.value = tabKey;
  };

  const syncTabFromRoute = () => {
    const routeTab = readRouteTab();
    if (routeTab && isValidTab(routeTab)) {
      activeTab.value = routeTab;
      return;
    }

    const storedTab = readStoredTab();
    if (storedTab && isValidTab(storedTab)) {
      activeTab.value = storedTab;
    }
  };

  const syncRouteFromTab = async (tabKey) => {
    if ((routeName && route?.name !== routeName) || !isValidTab(tabKey)) {
      return;
    }

    if (route?.query?.tab === tabKey && route?.hash === `#${tabKey}`) {
      return;
    }

    await router.replace({
      query: {
        ...(route?.query || {}),
        tab: tabKey
      },
      hash: `#${tabKey}`
    });
  };

  const buildTabUrl = (tabKey = activeTab.value) => {
    if (!isValidTab(tabKey)) {
      return '';
    }

    const resolved = router.resolve({
      name: routeName || route?.name,
      query: {
        ...(route?.query || {}),
        tab: tabKey
      },
      hash: `#${tabKey}`
    });

    if (typeof window === 'undefined' || !window.location) {
      return resolved.href;
    }

    return new URL(resolved.href, window.location.href).toString();
  };

  const copyTabLink = async (tabKey = activeTab.value) => {
    const url = buildTabUrl(tabKey);
    if (!url) {
      return false;
    }

    await navigator.clipboard.writeText(url);

    copiedTabKey.value = tabKey;
    if (copyTimer) {
      clearTimeout(copyTimer);
    }
    copyTimer = setTimeout(() => {
      if (copiedTabKey.value === tabKey) {
        copiedTabKey.value = '';
      }
    }, 1400);

    return true;
  };

  watch(resolvedTabs, (nextTabs) => {
    const nextTabKeys = nextTabs.map((tab) => tab.key || tab.id).filter(Boolean);
    if (!nextTabKeys.includes(activeTab?.value)) {
      activeTab.value = nextTabKeys[0] || initialTab;
    }
  }, { immediate: true });

  watch(() => [route?.query?.tab, route?.hash], () => {
    syncTabFromRoute();
  }, { immediate: true });

  watch(activeTab, async (tabKey) => {
    writeStoredTab(tabKey);
    await syncRouteFromTab(tabKey);
  });

  watch(() => shouldRememberSelection(), (enabled) => {
    if (!enabled) {
      writeStoredTab('');
      return;
    }

    const routeTab = readRouteTab();
    if (!routeTab && isValidTab(activeTab.value)) {
      writeStoredTab(activeTab.value);
    }
  }, { immediate: true });

  onBeforeUnmount(() => {
    if (copyTimer) {
      clearTimeout(copyTimer);
      copyTimer = null;
    }
  });

  return {
    activeTab,
    copiedTabKey,
    copyTabLink,
    resolvedTabs,
    selectTab
  };
}