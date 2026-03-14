/* eslint-disable react-refresh/only-export-components */
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
  const [incomeConfig, setIncomeConfig] = useState(null);
  const [incomeSources, setIncomeSources] = useState([]);
  const [oneTimeIncomeItems, setOneTimeIncomeItems] = useState([]);
  const [appConfig, setAppConfig] = useState(null);
  const [budgetView, setBudgetView] = useState('paycheck');
  const [loading, setLoading] = useState(true);
  const migrationAttempted = useRef(false);

  const migrateToIncomeSources = useCallback(async () => {
    if (migrationAttempted.current) return;
    migrationAttempted.current = true;

    try {
      const sources = await getIncomeSources();
      if (sources.length > 0) {
        return;
      }

      const oldConfig = await getIncomeConfig();
      if (!oldConfig) {
        return;
      }

      console.log('Migrating incomeConfig to incomeSources...');

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

      await saveAppConfigInDb({
        checkingFloor: oldConfig.checkingFloor || DEFAULT_CHECKING_FLOOR,
        migratedAt: new Date()
      });

      console.log('Migration complete');
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPayPeriods((periods) => {
      setPayPeriods(periods);
      setCurrentPayPeriod((prev) => prev ?? periods[0] ?? null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToIncomeConfig((config) => {
      setIncomeConfig(config);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToIncomeSources((sources) => {
      setIncomeSources(sources);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAppConfig((config) => {
      setAppConfig(config);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading) return;

    if (incomeSources.length === 0 && incomeConfig) {
      migrateToIncomeSources();
    }
  }, [loading, incomeSources.length, incomeConfig, migrateToIncomeSources]);

  useEffect(() => {
    if (!currentPayPeriod?.id) {
      return;
    }

    const unsubscribe = subscribeToTransactions(currentPayPeriod.id, (txns) => {
      setTransactions(txns);
    });

    return unsubscribe;
  }, [currentPayPeriod?.id]);

  useEffect(() => {
    if (!currentPayPeriod?.id) {
      return;
    }

    const unsubscribe = subscribeToAccountOverrides(currentPayPeriod.id, (ovr) => {
      setOverrides(ovr);
    });

    return unsubscribe;
  }, [currentPayPeriod?.id]);

  useEffect(() => {
    if (!currentPayPeriod?.id) {
      return;
    }

    const unsubscribe = subscribeToOneTimeIncome(currentPayPeriod.id, (items) => {
      setOneTimeIncomeItems(items);
    });

    return unsubscribe;
  }, [currentPayPeriod?.id]);

  const activeTransactions = useMemo(() => {
    return currentPayPeriod?.id ? transactions : [];
  }, [currentPayPeriod?.id, transactions]);

  const activeOverrides = useMemo(() => {
    return currentPayPeriod?.id ? overrides : {};
  }, [currentPayPeriod?.id, overrides]);

  const activeOneTimeIncomeItems = useMemo(() => {
    return currentPayPeriod?.id ? oneTimeIncomeItems : [];
  }, [currentPayPeriod?.id, oneTimeIncomeItems]);

  const getOneTimeIncomeTotal = useCallback(() => {
    return activeOneTimeIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [activeOneTimeIncomeItems]);

  const getCheckingFloor = useCallback(() => {
    return appConfig?.checkingFloor || incomeConfig?.checkingFloor || DEFAULT_CHECKING_FLOOR;
  }, [appConfig, incomeConfig]);

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

    const oneTimeTotal = activeOneTimeIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const checkingFloor = appConfig?.checkingFloor || incomeConfig?.checkingFloor || DEFAULT_CHECKING_FLOOR;

    const params = {
      startingCheckingBalance: currentPayPeriod.startingCheckingBalance || 0,
      paycheckAmount: currentPayPeriod.paycheckAmount || 0,
      oneTimeIncome: currentPayPeriod.oneTimeIncome || oneTimeTotal,
      checkingFloor,
      mortgageCarveout: currentPayPeriod.mortgageCarveout ?? DEFAULT_MORTGAGE_CARVEOUT,
      savingsAmount: currentPayPeriod.savingsAmount || 0,
      transactions: activeTransactions,
      overrides: activeOverrides
    };

    if (budgetView === 'paycheck') {
      return calculatePaycheckBudget(params);
    }

    return calculateCheckingBudget(params);
  }, [currentPayPeriod, activeTransactions, activeOverrides, budgetView, activeOneTimeIncomeItems, appConfig, incomeConfig]);

  const getNextPaycheckInfo = useCallback(() => {
    if (incomeSources.length > 0) {
      const sourcesWithDates = incomeSources.map(source => ({
        ...source,
        nextPayDate: source.nextPayDate?.toDate?.() || source.nextPayDate
      }));
      return getNextPaycheckFromSources(sourcesWithDates);
    }

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

  const getProgress = useCallback(() => {
    if (!currentPayPeriod) return { currentDay: 0, totalDays: 0, daysRemaining: 0 };

    const startDate = currentPayPeriod.startDate?.toDate?.() || currentPayPeriod.startDate;
    const endDate = currentPayPeriod.endDate?.toDate?.() || currentPayPeriod.endDate;

    return getPayPeriodProgress(startDate, endDate);
  }, [currentPayPeriod]);

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

  const saveIncomeConfig = async (config) => {
    await saveIncomeConfigInDb(config);
  };

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
    payPeriods,
    currentPayPeriod,
    transactions: activeTransactions,
    overrides: activeOverrides,
    incomeConfig,
    incomeSources,
    oneTimeIncomeItems: activeOneTimeIncomeItems,
    appConfig,
    budgetView,
    loading,

    budget,
    nextPaycheckInfo: getNextPaycheckInfo(),
    progress: getProgress(),
    oneTimeIncomeTotal: getOneTimeIncomeTotal(),
    checkingFloor: getCheckingFloor(),

    createPayPeriod,
    updatePayPeriod,
    selectPayPeriod,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setOverride,
    clearOverride,
    saveIncomeConfig,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    addOneTimeIncomeItem,
    deleteOneTimeIncomeItem,
    updateAppConfig,
    toggleBudgetView,
    setBudgetView
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
}
