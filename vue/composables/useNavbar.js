import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from '/assets/js/stores/mainStore.js';
import { useAuthStore } from '/assets/js/stores/authStore.js';
import { useModalStore } from '/assets/js/stores/modalStore.js';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LANGUAGES, loadLanguageAsync } from '/assets/js/i18n.js';

export function useNavbar() {
  const store = useMainStore();
  const route = useRoute();
  const { t, locale } = useI18n({ useScope: 'global' });

  const showLanguageDropdown = ref(false);
  const showMobileMenu = ref(false);
  const showLogoutConfirm = ref(false);
  const showUserDropdown = ref(false);
  const languageDropdownRef = ref(null);
  const userDropdownRef = ref(null);
  const currentLanguage = computed(() => locale.value);
  const languages = SUPPORTED_LANGUAGES;

  const authStore = useAuthStore();
  const modalStore = useModalStore();

  authStore.init();

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const user = computed(() => authStore.user);

  const showLoginModal = computed(() => modalStore.showLoginModal);
  const showRegisterModal = computed(() => modalStore.showRegisterModal);
  const userDisplayName = computed(() => user.value?.full_name || user.value?.email || t('message.navbar.profile'));
  const userRoleLabel = computed(() => user.value?.role?.replace(/_/g, ' ') || 'user');
  const userInitials = computed(() => {
    const source = String(userDisplayName.value || '').trim();

    if (!source) {
      return 'U';
    }

    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  });

  const menuItems = computed(() => {
    const items = [
      { name: t('message.navbar.home'), path: '/' }
    ];

    if (!isAuthenticated.value) {
      items.push({ name: t('message.navbar.settings') || 'Settings', path: '/settings' });
    }

    if (isAuthenticated.value) {
      items.push({ name: t('message.navbar.profile'), path: '/profile' });
    }

    return items;
  });

  const showAboutDropdown = ref(false);
  const showMobileAboutMenu = ref(false);
  const aboutDropdownRef = ref(null);
  let aboutDropdownTimer = null;

  const showAdminDropdown = ref(false);
  const showMobileAdminMenu = ref(false);
  const adminDropdownRef = ref(null);
  let adminDropdownTimer = null;

  const isAdmin = computed(() => {
    const userRole = user.value?.role?.toLowerCase();
    return userRole === 'admin' || userRole === 'super_admin';
  });

  const isSuperAdmin = computed(() => {
    const userRole = user.value?.role?.toLowerCase();
    return userRole === 'super_admin';
  });

  const isAdminRouteActive = computed(() => route.path.startsWith('/admin'));
  const isAboutRouteActive = computed(() => ['/about', '/api-info', '/health', '/version', '/language'].includes(route.path));

  const aboutMenuItems = computed(() => [
    { key: 'about', name: t('message.navbar.about'), path: '/about' },
    { key: 'api-explorer', name: t('message.navbar.api_explorer'), path: '/api-info', loginRequired: true },
    { key: 'api-health', name: t('message.navbar.api_health'), path: '/health' },
    { key: 'api-version', name: t('message.navbar.api_version'), path: '/version' },
    { key: 'api-language', name: t('message.navbar.api_language'), path: '/language' }
  ]);

  const adminMenuItems = computed(() => [
    { name: t('message.navbar.admin_dashboard'), path: '/admin/dashboard', icon: 'bi-speedometer2' },
    { name: t('message.navbar.user_management'), path: '/admin/users', icon: 'bi-people' },
    { name: t('message.navbar.system_stats'), path: '/admin/stats', icon: 'bi-graph-up' },
    { name: t('message.navbar.system_health'), path: '/admin/system-health', icon: 'bi-heart-pulse' },
    { name: t('message.navbar.audit_logs'), path: '/admin/audit-logs', icon: 'bi-journal-text' },
    { name: t('message.navbar.advanced_audit'), path: '/admin/advanced-audit', icon: 'bi-shield-lock' },
    { name: t('message.navbar.security_incidents'), path: '/admin/security-incidents', icon: 'bi-shield-exclamation' },
    { name: t('message.navbar.realtime_monitoring'), path: '/admin/monitoring', icon: 'bi-activity' },
    ...(isSuperAdmin.value ? [
      { name: t('message.navbar.kv_admin'), path: '/admin/kv', icon: 'bi-database' },
      { name: t('message.navbar.kv_admin_audit') || 'KV Audit Configs', path: '/admin/kv/audit', icon: 'bi-shield-check' },
      { name: t('message.navbar.kv_admin_env') || 'KV Env Compare', path: '/admin/kv/env-comparison', icon: 'bi-arrow-left-right' },
      { name: t('message.navbar.kv_admin_rate_limits') || 'KV Rate Limits', path: '/admin/kv/rate-limits', icon: 'bi-speedometer' },
      { name: t('message.navbar.admin_token_blacklist'), path: '/admin/token-blacklist', icon: 'bi-ban' },
      { name: t('message.navbar.admin_token_audit'), path: '/admin/token-audit', icon: 'bi-list-columns-reverse' }
    ] : [])
  ]);

  const topMenuBaseClass =
    'inline-flex items-center px-2 min-[1100px]:px-2.5 2xl:px-3 py-2 rounded-lg text-[13px] 2xl:text-sm font-medium transition-colors duration-200 whitespace-nowrap';
  const topMenuActiveClass = 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
  const topMenuInactiveClass =
    'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-300';

  const dropdownItemBaseClass = 'px-4 py-2 text-sm whitespace-nowrap';
  const dropdownItemActiveClass = 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
  const dropdownItemInactiveClass = 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600';

  const mobilePrimaryBaseClass = 'block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200';
  const mobileGroupBaseClass =
    'w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors duration-200';
  const mobileSubBaseClass = 'pl-6 pr-3 py-2 rounded-md text-base font-medium transition-colors duration-200';
  const mobileActiveClass = 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  const mobileInactiveClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700';
  const mobileSubInactiveClass = 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700';

  const desktopProfileLinkClass =
    'flex items-center min-w-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 group';
  const desktopLogoutButtonClass =
    'flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors';
  const desktopUserToggleButtonClass =
    'hidden min-[1100px]:flex items-center gap-2 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 px-2.5 py-1.5 text-left shadow-sm transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50/70 dark:hover:border-blue-800 dark:hover:bg-gray-700/80';
  const desktopLoginButtonClass =
    'hidden min-[1100px]:flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30';
  const desktopRegisterButtonClass =
    'hidden min-[1100px]:flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm border border-transparent bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600';
  const languageToggleButtonClass =
    'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';

  const iconCircleButtonClass =
    'h-9 w-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none transition-transform duration-200 hover:scale-110 active:scale-95';
  const mobileMenuButtonClass = `min-[1100px]:hidden ${iconCircleButtonClass}`;

  const mobileAuthButtonBaseClass =
    'w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm transition-all duration-200 shadow-sm border';
  const mobileProfileButtonClass =
    `${mobileAuthButtonBaseClass} font-medium border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400`;
  const mobileLogoutButtonClass =
    `${mobileAuthButtonBaseClass} font-medium border-red-200 dark:border-red-800 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400`;
  const mobileLoginButtonClass =
    `${mobileAuthButtonBaseClass} font-medium border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400`;
  const mobileRegisterButtonClass =
    `${mobileAuthButtonBaseClass} font-bold border-transparent bg-blue-600 dark:bg-blue-500 text-white`;
  const mobileApiToggleBaseClass =
    'w-full flex items-center justify-center px-3 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-sm border';

  const languageOptionBaseClass = 'w-full text-left px-4 py-2 text-sm transition-colors duration-150';
  const languageOptionActiveClass = 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium';
  const languageOptionInactiveClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600';

  const desktopApiToggleBaseClass =
    'hidden min-[1100px]:flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-200 2xl:h-auto 2xl:w-auto 2xl:justify-start 2xl:px-3 2xl:py-2 2xl:text-xs';
  const desktopApiToggleMockClass = 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20';
  const desktopApiToggleRealClass = 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20';

  const mobileApiToggleMockClass =
    'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300';
  const mobileApiToggleRealClass =
    'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300';

  const getTopMenuClass = (isActive) => [topMenuBaseClass, isActive ? topMenuActiveClass : topMenuInactiveClass];

  const getDropdownItemClass = (isActive, withIcon = false) => [
    withIcon ? `flex items-center ${dropdownItemBaseClass}` : `block ${dropdownItemBaseClass}`,
    isActive ? dropdownItemActiveClass : dropdownItemInactiveClass
  ];

  const getMobilePrimaryClass = (isActive) => [mobilePrimaryBaseClass, isActive ? mobileActiveClass : mobileInactiveClass];
  const getMobileGroupClass = (isActive) => [mobileGroupBaseClass, isActive ? mobileActiveClass : mobileInactiveClass];
  const getMobileSubLinkClass = (isActive, withIcon = false) => [
    withIcon ? `flex items-center ${mobileSubBaseClass}` : `block ${mobileSubBaseClass}`,
    isActive ? mobileActiveClass : mobileSubInactiveClass
  ];

  const getLanguageOptionClass = (langCode) => [
    languageOptionBaseClass,
    currentLanguage.value === langCode ? languageOptionActiveClass : languageOptionInactiveClass
  ];

  const getDesktopApiToggleClass = () => [
    desktopApiToggleBaseClass,
    store.mockApi ? desktopApiToggleMockClass : desktopApiToggleRealClass
  ];

  const getMobileApiToggleClass = () => [
    mobileApiToggleBaseClass,
    store.mockApi ? mobileApiToggleMockClass : mobileApiToggleRealClass
  ];

  const toggleLanguageDropdown = () => {
    showLanguageDropdown.value = !showLanguageDropdown.value;
  };

  const toggleMobileMenu = () => {
    showMobileMenu.value = !showMobileMenu.value;
  };

  const toggleMobileAboutMenu = () => {
    showMobileAboutMenu.value = !showMobileAboutMenu.value;
  };

  const changeLanguage = async (langCode) => {
    await loadLanguageAsync(langCode);
    showLanguageDropdown.value = false;
  };

  const handleClickOutside = (event) => {
    if (languageDropdownRef.value && !languageDropdownRef.value.contains(event.target)) {
      showLanguageDropdown.value = false;
    }
    if (aboutDropdownRef.value && !aboutDropdownRef.value.contains(event.target)) {
      showAboutDropdown.value = false;
    }
    if (adminDropdownRef.value && !adminDropdownRef.value.contains(event.target)) {
      showAdminDropdown.value = false;
    }
    if (userDropdownRef.value && !userDropdownRef.value.contains(event.target)) {
      showUserDropdown.value = false;
    }
  };

  const openAboutDropdown = () => {
    if (aboutDropdownTimer) {
      clearTimeout(aboutDropdownTimer);
      aboutDropdownTimer = null;
    }
    showAboutDropdown.value = true;
  };

  const closeAboutDropdown = () => {
    if (aboutDropdownTimer) {
      clearTimeout(aboutDropdownTimer);
    }
    aboutDropdownTimer = setTimeout(() => {
      showAboutDropdown.value = false;
    }, 120);
  };

  const toggleAboutDropdown = () => {
    if (showAboutDropdown.value) {
      if (aboutDropdownTimer) {
        clearTimeout(aboutDropdownTimer);
      }
      showAboutDropdown.value = false;
    } else {
      openAboutDropdown();
    }
  };

  const openAdminDropdown = () => {
    if (adminDropdownTimer) {
      clearTimeout(adminDropdownTimer);
      adminDropdownTimer = null;
    }
    showAdminDropdown.value = true;
  };

  const closeAdminDropdown = () => {
    if (adminDropdownTimer) {
      clearTimeout(adminDropdownTimer);
    }
    adminDropdownTimer = setTimeout(() => {
      showAdminDropdown.value = false;
    }, 120);
  };

  const toggleAdminDropdown = () => {
    if (showAdminDropdown.value) {
      if (adminDropdownTimer) {
        clearTimeout(adminDropdownTimer);
      }
      showAdminDropdown.value = false;
    } else {
      openAdminDropdown();
    }
  };

  const toggleMobileAdminMenu = () => {
    showMobileAdminMenu.value = !showMobileAdminMenu.value;
  };

  const toggleUserDropdown = () => {
    showUserDropdown.value = !showUserDropdown.value;
  };

  const handleLoginSuccess = async (response) => {
    if (response.data) {
      const { user, access_token, refresh_token, expires_at, refresh_expires_at } = response.data;

      authStore.login(user, access_token, refresh_token, expires_at, refresh_expires_at);

      sessionStorage.removeItem('authRequired');
      sessionStorage.removeItem('intendedRoute');
      showUserDropdown.value = false;

      modalStore.handleLoginSuccess(response);
    }
  };

  const handleLogout = () => {
    showUserDropdown.value = false;
    showLogoutConfirm.value = true;
  };

  const confirmLogout = () => {
    authStore.logout();
    showUserDropdown.value = false;
    showLogoutConfirm.value = false;
    showMobileMenu.value = false;
  };

  const openLoginModal = () => {
    modalStore.openLogin();
    showMobileMenu.value = false;
    showUserDropdown.value = false;
  };

  const openRegisterModal = () => {
    modalStore.openRegister();
    showMobileMenu.value = false;
    showUserDropdown.value = false;
  };

  const closeModals = () => {
    modalStore.closeAll();
  };

  const switchToRegister = () => {
    modalStore.switchToRegister();
  };

  const switchToLogin = () => {
    modalStore.switchToLogin();
  };

  onMounted(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    if (aboutDropdownTimer) {
      clearTimeout(aboutDropdownTimer);
    }
    if (adminDropdownTimer) {
      clearTimeout(adminDropdownTimer);
    }
  });

  return {
    store,
    menuItems,
    showLanguageDropdown,
    showMobileMenu,
    showLogoutConfirm,
    showUserDropdown,
    showAboutDropdown,
    showMobileAboutMenu,
    showAdminDropdown,
    showMobileAdminMenu,
    showLoginModal,
    showRegisterModal,
    languageDropdownRef,
    userDropdownRef,
    aboutDropdownRef,
    adminDropdownRef,
    currentLanguage,
    languages,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    isAdminRouteActive,
    isAboutRouteActive,
    aboutMenuItems,
    user,
    userDisplayName,
    userRoleLabel,
    userInitials,
    adminMenuItems,
    getTopMenuClass,
    getDropdownItemClass,
    getMobilePrimaryClass,
    getMobileGroupClass,
    getMobileSubLinkClass,
    desktopProfileLinkClass,
    desktopLogoutButtonClass,
    desktopUserToggleButtonClass,
    desktopLoginButtonClass,
    desktopRegisterButtonClass,
    languageToggleButtonClass,
    iconCircleButtonClass,
    mobileMenuButtonClass,
    mobileProfileButtonClass,
    mobileLogoutButtonClass,
    mobileLoginButtonClass,
    mobileRegisterButtonClass,
    mobileApiToggleBaseClass,
    getLanguageOptionClass,
    getDesktopApiToggleClass,
    getMobileApiToggleClass,
    toggleLanguageDropdown,
    toggleMobileMenu,
    toggleMobileAboutMenu,
    toggleMobileAdminMenu,
    toggleUserDropdown,
    changeLanguage,
    openAboutDropdown,
    closeAboutDropdown,
    toggleAboutDropdown,
    openAdminDropdown,
    closeAdminDropdown,
    toggleAdminDropdown,
    handleLoginSuccess,
    handleLogout,
    confirmLogout,
    openLoginModal,
    openRegisterModal,
    closeModals,
    switchToRegister,
    switchToLogin
  };
}
