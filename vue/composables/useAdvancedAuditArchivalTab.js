import { ref } from 'vue';
import { useAdvancedAuditStore } from '/assets/js/stores/advancedAuditStore.js';

export function useAdvancedAuditArchivalTab(emit) {
  const store = useAdvancedAuditStore();
  const isExtrasLoading = ref(false);
  const extendedData = ref(null);

  const showSetPolicyModal = ref(false);
  const policyForm = ref({
    audit_log_retention_days: 90,
    user_data_retention_days: 90
  });

  const showRunModal = ref(false);
  const runForm = ref({
    batchSize: 1000,
    dryRun: true,
    categoryFilter: '',
    forceArchival: false
  });

  const showRestoreModal = ref(false);
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const defaultStart = d.toISOString().split('T')[0];
  const defaultEnd = new Date().toISOString().split('T')[0];

  const restoreForm = ref({
    startDate: defaultStart,
    endDate: defaultEnd,
    action: 'restore',
    dryRun: true
  });

  const loadArchivePolicies = async () => {
    isExtrasLoading.value = true;
    try {
      const res = await store.getArchive(true);
      extendedData.value = { context: 'Review Storage Details', data: res };
    } catch (err) {
      extendedData.value = { error: err.message };
    } finally {
      isExtrasLoading.value = false;
    }
  };

  const manageRetention = async () => {
    isExtrasLoading.value = true;
    try {
      const res = await store.manageRetention({ action: 'get_policy', dryRun: true }, true);
      extendedData.value = { context: 'Retention Policies (Simulation)', data: res };
    } catch (err) {
      extendedData.value = { error: err.message };
    } finally {
      isExtrasLoading.value = false;
    }
  };

  const executeRunArchival = () => {
    showRunModal.value = false;
    emit('run-archival', { ...runForm.value });
  };

  const openSetPolicyModal = () => {
    if (extendedData.value?.context === 'Retention Policies (Simulation)' && extendedData.value?.data?.policy) {
      policyForm.value.audit_log_retention_days = extendedData.value.data.policy.audit_log_retention_days || 90;
      policyForm.value.user_data_retention_days = extendedData.value.data.policy.user_data_retention_days || 90;
    }
    showSetPolicyModal.value = true;
  };

  const executeSetPolicy = () => {
    showSetPolicyModal.value = false;
    emit('set-policy', {
      audit_log_retention_days: Number(policyForm.value.audit_log_retention_days),
      user_data_retention_days: Number(policyForm.value.user_data_retention_days)
    });
  };

  const executeRestoreProcess = () => {
    showRestoreModal.value = false;
    emit('restore-archive', { ...restoreForm.value });
  };

  return {
    isExtrasLoading,
    extendedData,
    loadArchivePolicies,
    manageRetention,
    showRunModal,
    runForm,
    showRestoreModal,
    restoreForm,
    executeRunArchival,
    executeRestoreProcess,
    showSetPolicyModal,
    policyForm,
    openSetPolicyModal,
    executeSetPolicy
  };
}
