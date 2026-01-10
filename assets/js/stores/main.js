const { defineStore } = Pinia;

export const useMainStore = defineStore('main', {
  state: () => ({
    darkMode: localStorage.getItem('theme') === 'dark',
    mockApi: true,
  }),
  actions: {
    initTheme() {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.darkMode = stored === 'dark' || (!stored && prefersDark);

      document.documentElement.classList.toggle('dark', this.darkMode);
      document.body.classList.toggle('dark', this.darkMode);
      localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      document.documentElement.classList.toggle('dark', this.darkMode);
      document.body.classList.toggle('dark', this.darkMode);
      localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
    },
    setMockApi(value) {
      this.mockApi = value;
    }
  }
});
