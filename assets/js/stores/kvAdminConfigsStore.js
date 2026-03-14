const { defineStore } = Pinia;
import { apiClient, API_ENDPOINTS } from '../api.js';

const formatValue = (value) => {
  if (value === undefined) return '-';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
};

const buildRows = ({ configs = {}, defaults = {}, allowedKeys: allowedKeyList = [] } = {}) => {
  const configKeys = Object.keys(configs || {});
  const defaultKeys = Object.keys(defaults || {});
  const baseKeys = allowedKeyList && allowedKeyList.length
    ? allowedKeyList
    : Array.from(new Set([...configKeys, ...defaultKeys])).sort();

  const rows = baseKeys.map((key) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(configs, key);
    const value = hasOverride ? configs[key] : defaults[key];
    const defaultValue = defaults[key];
    const valueLabel = formatValue(value);
    const defaultLabel = formatValue(defaultValue);
    const isOverride = hasOverride && valueLabel !== defaultLabel;

    return {
      key,
      value,
      defaultValue,
      valueLabel,
      defaultLabel,
      source: hasOverride ? 'kv' : (defaultValue !== undefined ? 'default' : 'unknown'),
      isOverride
    };
  });

  return {
    rows,
    allowedKeys: [...baseKeys],
    allowedCount: baseKeys.length
  };
};

export const useKvAdminConfigsStore = defineStore('kvAdminConfigs', {
  state: () => ({
    isLoading: false,
    errorMessage: null,
    rows: [],
    allowedKeys: [],
    allowedCount: 0,
    lastUpdated: null
  }),

  actions: {
    resetState() {
      this.isLoading = false;
      this.errorMessage = null;
      this.rows = [];
      this.allowedKeys = [];
      this.allowedCount = 0;
      this.lastUpdated = null;
    },

    hydrateAllowedKeys(data) {
      if (!data || typeof data !== 'object') return;

      const nextAllowed = Array.isArray(data.allowedKeys) ? data.allowedKeys : [];
      const configKeys = Object.keys(data.configs || {});
      const defaultKeys = Object.keys(data.defaults || {});
      const merged = Array.from(new Set([...this.allowedKeys, ...nextAllowed, ...configKeys, ...defaultKeys]));

      if (merged.length > 0) {
        this.allowedKeys = merged.sort((first, second) => first.localeCompare(second));
        this.allowedCount = this.allowedKeys.length;
      }
    },

    applyLocalUpsert(key, value) {
      const existingIndex = this.rows.findIndex((row) => row.key === key);
      const defaultValue = existingIndex >= 0 ? this.rows[existingIndex].defaultValue : undefined;
      const valueLabel = formatValue(value);
      const defaultLabel = formatValue(defaultValue);
      const isOverride = valueLabel !== defaultLabel;
      const source = isOverride ? 'kv' : (defaultValue !== undefined ? 'default' : 'unknown');
      const nextRow = {
        key,
        value,
        defaultValue,
        valueLabel,
        defaultLabel,
        source,
        isOverride
      };

      if (existingIndex >= 0) {
        const nextRows = [...this.rows];
        nextRows[existingIndex] = nextRow;
        this.rows = nextRows;
        return;
      }

      this.rows = [nextRow, ...this.rows];
      this.allowedCount += 1;
      if (!this.allowedKeys.includes(key)) {
        this.allowedKeys = [...this.allowedKeys, key].sort((first, second) => first.localeCompare(second));
      }
    },

    removeLocalKey(key) {
      this.rows = this.rows.filter((row) => row.key !== key);
      this.allowedKeys = this.allowedKeys.filter((item) => item !== key);
      this.allowedCount = this.allowedKeys.length;
    },

    async loadConfigs({ token, mockApi }) {
      this.isLoading = true;
      this.errorMessage = null;

      try {
        let payload;

        if (mockApi) {
          const res = await fetch('/assets/data/kv-admin/configs.json', { cache: 'no-store' });
          if (!res.ok) {
            throw new Error(res.statusText || 'Failed to load KV configs');
          }
          payload = await res.json();
        } else {
          const response = await apiClient.get(API_ENDPOINTS.KV_ADMIN_CONFIGS, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          payload = response.data;
        }

        if (!payload || payload.success === false) {
          const message = payload && (payload.error || payload.message);
          throw new Error(message || 'Failed to load KV configs');
        }

        const data = payload.data || payload;
        const normalized = buildRows({
          configs: data.configs || {},
          defaults: data.defaults || {},
          allowedKeys: Array.isArray(data.allowedKeys) ? data.allowedKeys : []
        });

        this.rows = normalized.rows;
        this.allowedKeys = normalized.allowedKeys;
        this.allowedCount = normalized.allowedCount;
        this.lastUpdated = new Date().toISOString();

        return {
          success: true,
          data
        };
      } catch (error) {
        this.errorMessage = (error && error.message) || 'Failed to load KV configs';
        return {
          success: false,
          error: this.errorMessage,
          status: error?.response?.status
        };
      } finally {
        this.isLoading = false;
      }
    }
  }
});