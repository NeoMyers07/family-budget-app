import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  subscribeToPayPeriods,
  subscribeToTransactions,
  subscribeToAccountOverrides,
  subscribeToIncomeConfig,
  subscribeToIncomeSources,
  subscribeToOneTimeIncome,
  subscribeToAppConfig,
  createPayPeriod as createPayPeriodInDb,
  updatePayPeriod as updatePayPeriodInDb,
  addTransaction as addTransactionInDb,
  updateTransaction as updateTransactionInDb,
  deleteTransaction as deleteTransactionInDb,
  setAccountOverride as setAccountOverrideInDb,
  clearAccountOverride as clearAccountOverrideInDb,
  saveIncomeConfig as saveIncomeConfigInDb,
  createIncomeSource as createIncomeSourceInDb,
  updateIncomeSource as updateIncomeSourceInDb,
  deleteIncomeSource as deleteIncomeSourceInDb,
  addOneTimeIncome as addOneTimeIncomeInDb,
  deleteOneTimeIncome as deleteOneTimeIncomeInDb,
  saveAppConfig as saveAppConfigInDb,
  getIncomeSources,
  getIncomeConfig
} from '../firebase/firestore';
import {
  calculatePaycheckBudget,
  calculateCheckingBudget,
  DEFAULT_CHECKING_FLOOR,
  DEFAULT_MORTGAGE_CARVEOUT
} from '../utils/calculations';
import {
  getNextPaycheck,
  getNextBiweeklyPayDate,
  getNextMonthlyPayDate,
  getPayPeriodProgress,
  getNextPaycheckFromSources
} from '../utils/dateHelpers';

const BudgetContext = createContext();

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}

export function BudgetProvider({ children }) {
  const [payPeriods, setPayPeriods] = useState([]);
  const [currentPayPeriod, setCurrentPayPeriod] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [incomeConfig, setIncomeConfig] = useState(null); // Legacy - kept for backward compatibility
  const [incomeSources, setIncomeSources] = useState([]);
  const [oneTimeIncomeItems, setOneTimeIncomeItems] = useState([]);
  const [appConfig, setAppConfig] = useState(null);
  const [budgetView, setBudgetView] = useState('paycheck'); // 'paycheck' or 'checking'
  const [loading, setLoading] = useState(true);
  const migrationAttempted = useRef(false);

  // Migration: Convert old incomeConfig to new incomeSources format
  const migrateToIncomeSources = useCallback(async () => {
    if (migrationAttempted.current) return;
    migrationAttempted.current = true;

    try {
      const sources = await getIncomeSources();
      if (sources.length > 0) {
        // Already migrated
        return;
      }

      const oldConfig = await getIncomeConfig();
      if (!oldConfig) {
        // No old config to migrate
        return;
      }

      console.log('Migrating incomeConfig to incomeSources...');

      // Create Eric's income source
      if (oldConfig.ericPayAmount && oldConfig.ericNextPayDate) {
        await createIncomeSourceInDb({
          name: 'Eric',
          payAmount: oldConfig.ericPayAmount,
          cadence: 'biweekly',
          nextPayDate: oldConfig.ericNextPayDate?.toDate?.() || oldConfig.ericNextPayDate,
          semimonthlyDays: null,
          isActive: true
        });
      }

      // Create Jessica's income source
      if (oldConfig.jessicaPayAmount && oldConfig.jessicaNextPayDate) {
        await createIncomeSourceInDb({
          name: 'Jessica',
          payAmount: oldConfig.jessicaPayAmount,
          cadence: 'monthly',
          nextPayDate: oldConfig.jessicaNextPayDate?.toDate?.() || oldConfig.jessicaNextPayDate,
          semimonthlyDays: null,
          isActive: true
        });
      }

      // Create app config with checking floor
      await saveAppConfigInDb({
        checkingFloor: oldConfig.checkingFloor || DEFAULT_CHECKING_FLOOR,
        migratedAt: new Date()
      });

      console.log('Migration complete');
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }, []);

  // Subscribe to pay periods
  useEffect(() => {
    const unsubscribe = subscribeToPayPeriods((periods) => {
      setPayPeriods(periods);
      // Set current pay period to the most recent one
      if (periods.length > 0 && !currentPayPeriod) {
        setCurrentPayPeriod(periods[0]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Subscribe to income config (legacy)
  useEffect(() => {
    const unsubscribe = subscribeToIncomeConfig((config) => {
      setIncomeConfig(config);
    });

    return unsubscribe;
  }, []);

  // Subscribe to income sources (new)
  useEffect(() => {
    const unsubscribe = subscribeToIncomeSources((sources) => {
      setIncomeSources(sources);
    });

    return unsubscribe;
  }, []);

  // Subscribe to app config
  useEffect(() => {
    const unsubscribe = subscribeToAppConfig((config) => {
      setAppConfig(config);
    });

    return unsubscribe;
  }, []);

  // Run migration after initial subscriptions are set up
  useEffect(() => {
    // Wait for initial load
    if (loading) return;

    // Check if migration is needed (no income sources but has old config)
    if (incomeSources.length === 0 && incomeConfig) {
      migrateToIncomeSources();
    }
  }, [loading, incomeSources.length, incomeConfig, migrateToIncomeSources]);

  // Subscribe to transactions for current pay period
  useEffect(() => {
    if (!currentPayPeriod?.id) {
      setTransactions([]);
      return;
    }

    const unsubscribe = subscribeToTransactions(currentPayPeriod.id, (txns) => {
      setTransactions(txns);
    });

    return unsubscribe;
  }, [currentPayPeriod?.id]);

  // Subscribe to account overrides for current pay period
  useEffect(() => {
    if (!currentPayPeriod?.id) {
      setOverrides({});
      return;
    }

    const unsubscribe = subscribeToAccountOverrides(currentPayPeriod.id, (ovr) => {
      setOverrides(ovr);
    });

    return unsubscribe;
  }, [currentPayPeriod?.id]);

  // Subscribe to one-time income for current pay period
  useEffect(() => {
    if (!currentPayPeriod?.id) {
      setOneTimeIncomeItems([]);
      return;
    }

    const unsubscribe = subscribeToOneTimeIncome(currentPayPeriod.id, (items) => {
      setOneTimeIncomeItems(items);
    });

    return unsubscribe;
  }, [currentPayPeriod?.id]);

  // Calculate one-time income total
  const getOneTimeIncomeTotal = useCallback(() => {
    return oneTimeIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [oneTimeIncomeItems]);

  // Get checking floor (prefer appConfig, fall back to incomeConfig, then default)
  const getCheckingFloor = useCallback(() => {
    return appConfig?.checkingFloor || incomeConfig?.checkingFloor || DEFAULT_CHECKING_FLOOR;
  }, [appConfig, incomeConfig]);

  // Calculate budget based on current view - using useMemo for explicit reactivity
  const budget = useMemo(() => {
    if (!currentPayPeriod) {
      return {
        remainingBudget: 0,
        availableBudget: 0,
        projectedChecking: 0,
        totalSpending: 0,
        totalIncome: 0,
        oneTimeIncome: 0,
        mortgageCarveout: DEFAULT_MORTGAGE_CARVEOUT,
        savingsAmount: 0,
        cardTotals: {}
      };
    }

    const oneTimeTotal = oneTimeIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const checkingFloor = appConfig?.checkingFloor || incomeConfig?.checkingFloor || DEFAULT_CHECKING_FLOOR;

    const params = {
      startingCheckingBalance: currentPayPeriod.startingCheckingBalance || 0,
      paycheckAmount: currentPayPeriod.paycheckAmount || 0,
      oneTimeIncome: currentPayPeriod.oneTimeIncome || oneTimeTotal,
      checkingFloor,
      mortgageCarveout: currentPayPeriod.mortgageCarveout ?? DEFAULT_MORTGAGE_CARVEOUT,
      savingsAmount: currentPayPeriod.savingsAmount || 0,
      transactions,
      overrides
    };

    if (budgetView === 'paycheck') {
      return calculatePaycheckBudget(params);
    } else {
      return calculateCheckingBudget(params);
    }
  }, [currentPayPeriod, transactions, overrides, budgetView, oneTimeIncomeItems, appConfig, incomeConfig]);

  // Get next paycheck info - use new sources if available, fall back to legacy
  const getNextPaycheckInfo = useCallback(() => {
    // Prefer new income sources
    if (incomeSources.length > 0) {
      const sourcesWithDates = incomeSources.map(source => ({
        ...source,
        nextPayDate: source.nextPayDate?.toDate?.() || source.nextPayDate
      }));
      return getNextPaycheckFromSources(sourcesWithDates);
    }

    // Fall back to legacy incomeConfig
    if (!incomeConfig) return null;

    const ericDate = getNextBiweeklyPayDate(
      incomeConfig.ericNextPayDate?.toDate?.() || incomeConfig.ericNextPayDate
    );
    const jessicaDate = getNextMonthlyPayDate(
      incomeConfig.jessicaNextPayDate?.toDate?.() || incomeConfig.jessicaNextPayDate
    );

    return getNextPaycheck(
      ericDate,
      jessicaDate,
      incomeConfig.ericPayAmount,
      incomeConfig.jessicaPayAmount
    );
  }, [incomeSources, incomeConfig]);

  // Get pay period progress
  const getProgress = useCallback(() => {
    if (!currentPayPeriod) return { currentDay: 0, totalDays: 0, daysRemaining: 0 };

    const startDate = currentPayPeriod.startDate?.toDate?.() || currentPayPeriod.startDate;
    const endDate = currentPayPeriod.endDate?.toDate?.() || currentPayPeriod.endDate;

    return getPayPeriodProgress(startDate, endDate);
  }, [currentPayPeriod]);

  // ============================================
  // Actions
  // ============================================

  const createPayPeriod = async (payPeriodData) => {
    const id = await createPayPeriodInDb(payPeriodData);
    return id;
  };

  const updatePayPeriod = async (id, updates) => {
    await updatePayPeriodInDb(id, updates);
  };

  const addTransaction = async (transactionData) => {
    if (!currentPayPeriod?.id) {
      throw new Error('No active pay period');
    }
    const id = await addTransactionInDb({
      ...transactionData,
      payPeriodId: currentPayPeriod.id
    });
    return id;
  };

  const updateTransaction = async (transactionId, updates) => {
    await updateTransactionInDb(transactionId, updates);
  };

  const deleteTransaction = async (transactionId) => {
    await deleteTransactionInDb(transactionId);
  };

  const setOverride = async (account, amount) => {
    if (!currentPayPeriod?.id) {
      throw new Error('No active pay period');
    }
    await setAccountOverrideInDb(currentPayPeriod.id, account, amount);
  };

  const clearOverride = async (account) => {
    if (!currentPayPeriod?.id) {
      throw new Error('No active pay period');
    }
    await clearAccountOverrideInDb(currentPayPeriod.id, account);
  };

  // Legacy - kept for backward compatibility
  const saveIncomeConfig = async (config) => {
    await saveIncomeConfigInDb(config);
  };

  // ============================================
  // New Income Source Actions
  // ============================================

  const addIncomeSource = async (sourceData) => {
    const id = await createIncomeSourceInDb(sourceData);
    return id;
  };

  const updateIncomeSource = async (id, updates) => {
    await updateIncomeSourceInDb(id, updates);
  };

  const deleteIncomeSource = async (id) => {
    await deleteIncomeSourceInDb(id);
  };

  // ============================================
  // One-Time Income Actions
  // ============================================

  const addOneTimeIncomeItem = async (itemData) => {
    if (!currentPayPeriod?.id) {
      throw new Error('No active pay period');
    }
    const id = await addOneTimeIncomeInDb({
      ...itemData,
      payPeriodId: currentPayPeriod.id
    });
    return id;
  };

  const deleteOneTimeIncomeItem = async (itemId) => {
    await deleteOneTimeIncomeInDb(itemId);
  };

  // ============================================
  // App Config Actions
  // ============================================

  const updateAppConfig = async (config) => {
    await saveAppConfigInDb(config);
  };

  const selectPayPeriod = (payPeriod) => {
    setCurrentPayPeriod(payPeriod);
  };

  const toggleBudgetView = () => {
    setBudgetView(prev => prev === 'paycheck' ? 'checking' : 'paycheck');
  };

  const value = {
    // State
    payPeriods,
    currentPayPeriod,
    transactions,
    overrides,
    incomeConfig, // Legacy
    incomeSources,
    oneTimeIncomeItems,
    appConfig,
    budgetView,
    loading,

    // Computed
    budget,
    nextPaycheckInfo: getNextPaycheckInfo(),
    progress: getProgress(),
    oneTimeIncomeTotal: getOneTimeIncomeTotal(),
    checkingFloor: getCheckingFloor(),

    // Pay Period Actions
    createPayPeriod,
    updatePayPeriod,
    selectPayPeriod,

    // Transaction Actions
    addTransaction,
    updateTransaction,
    deleteTransaction,

    // Override Actions
    setOverride,
    clearOverride,

    // Income Config Actions (Legacy)
    saveIncomeConfig,

    // Income Source Actions (New)
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,

    // One-Time Income Actions
    addOneTimeIncomeItem,
    deleteOneTimeIncomeItem,

    // App Config Actions
    updateAppConfig,

    // View Actions
    toggleBudgetView,
    setBudgetView
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
}
