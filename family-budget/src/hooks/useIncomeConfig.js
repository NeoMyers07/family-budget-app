import { useState, useCallback, useMemo } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { DEFAULT_CHECKING_FLOOR } from '../utils/calculations';

/**
 * Hook for managing income sources and app configuration
 * Supports the new flexible income sources model
 */
export function useIncomeConfig() {
  const {
    incomeSources,
    appConfig,
    incomeConfig, // Legacy
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    updateAppConfig,
    saveIncomeConfig // Legacy
  } = useBudget();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Get checking floor (prefer appConfig, fall back to legacy, then default)
  const checkingFloor = useMemo(() => {
    return appConfig?.checkingFloor || incomeConfig?.checkingFloor || DEFAULT_CHECKING_FLOOR;
  }, [appConfig, incomeConfig]);

  // Check if income is configured (either new or legacy)
  const isConfigured = useMemo(() => {
    return incomeSources.length > 0 || !!incomeConfig;
  }, [incomeSources.length, incomeConfig]);

  // Add a new income source
  const addSource = useCallback(async (sourceData) => {
    setIsSaving(true);
    setError(null);

    try {
      const id = await addIncomeSource(sourceData);
      return id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [addIncomeSource]);

  // Update an existing income source
  const updateSource = useCallback(async (id, updates) => {
    setIsSaving(true);
    setError(null);

    try {
      await updateIncomeSource(id, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [updateIncomeSource]);

  // Delete an income source
  const removeSource = useCallback(async (id) => {
    setIsSaving(true);
    setError(null);

    try {
      await deleteIncomeSource(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [deleteIncomeSource]);

  // Toggle income source active status
  const toggleSourceActive = useCallback(async (id) => {
    const source = incomeSources.find(s => s.id === id);
    if (source) {
      await updateSource(id, { isActive: !source.isActive });
    }
  }, [incomeSources, updateSource]);

  // Update app configuration (checking floor, etc.)
  const saveAppSettings = useCallback(async (settings) => {
    setIsSaving(true);
    setError(null);

    try {
      await updateAppConfig(settings);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [updateAppConfig]);

  // Legacy: Save old-style income config (for backward compatibility)
  const saveLegacyConfig = useCallback(async (config) => {
    setIsSaving(true);
    setError(null);

    try {
      await saveIncomeConfig(config);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [saveIncomeConfig]);

  // Get income source by ID
  const getSourceById = useCallback((id) => {
    return incomeSources.find(source => source.id === id);
  }, [incomeSources]);

  // Normalize income source dates (convert Firestore Timestamps to Date objects)
  const normalizedSources = useMemo(() => {
    return incomeSources.map(source => ({
      ...source,
      nextPayDate: source.nextPayDate?.toDate?.() || source.nextPayDate
    }));
  }, [incomeSources]);

  return {
    // Income sources (new model)
    incomeSources: normalizedSources,
    activeIncomeSources: normalizedSources.filter(s => s.isActive),

    // App config
    appConfig,
    checkingFloor,

    // Legacy (for backward compatibility)
    incomeConfig,

    // Status
    isConfigured,
    isSaving,
    error,

    // Income source actions
    addSource,
    updateSource,
    removeSource,
    toggleSourceActive,
    getSourceById,

    // App config actions
    saveAppSettings,

    // Legacy action
    saveLegacyConfig
  };
}
