import { useState, useCallback } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import {
  getNextPaycheck,
  getNextBiweeklyPayDate,
  getNextMonthlyPayDate,
  getPayPeriodEndDate,
  getNextPaycheckFromSources,
  getPayPeriodEndDateFromSources
} from '../utils/dateHelpers';
import { DEFAULT_MORTGAGE_CARVEOUT } from '../utils/calculations';

export function usePayPeriod() {
  const {
    payPeriods,
    currentPayPeriod,
    incomeConfig, // Legacy
    incomeSources,
    createPayPeriod,
    updatePayPeriod,
    selectPayPeriod,
    budget
  } = useBudget();

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Generate default values for a new pay period
  const getNewPayPeriodDefaults = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prefer new income sources model
    if (incomeSources.length > 0) {
      // Normalize dates
      const sourcesWithDates = incomeSources.map(source => ({
        ...source,
        nextPayDate: source.nextPayDate?.toDate?.() || source.nextPayDate
      }));

      const nextPaycheck = getNextPaycheckFromSources(sourcesWithDates);

      if (!nextPaycheck) {
        return null; // No active income sources
      }

      // Start date is today
      const startDate = today;

      // Calculate end date using income sources
      const { endDate } = getPayPeriodEndDateFromSources(startDate, sourcesWithDates);

      // Starting balance from previous period's projected checking, or 0 if no previous
      const startingCheckingBalance = currentPayPeriod
        ? budget.projectedChecking || currentPayPeriod.startingCheckingBalance
        : 0;

      return {
        startDate,
        endDate,
        paycheckSource: nextPaycheck.sourceNames,
        incomeSourceIds: nextPaycheck.sources.map(s => s.id),
        paycheckAmount: nextPaycheck.amount,
        startingCheckingBalance,
        mortgageCarveout: DEFAULT_MORTGAGE_CARVEOUT,
        savingsAmount: 0,
        oneTimeIncome: 0
      };
    }

    // Fall back to legacy incomeConfig
    if (!incomeConfig) {
      return null;
    }

    // Get next pay dates (legacy)
    const ericDate = getNextBiweeklyPayDate(
      incomeConfig.ericNextPayDate?.toDate?.() || incomeConfig.ericNextPayDate
    );
    const jessicaDate = getNextMonthlyPayDate(
      incomeConfig.jessicaNextPayDate?.toDate?.() || incomeConfig.jessicaNextPayDate
    );

    const nextPaycheck = getNextPaycheck(
      ericDate,
      jessicaDate,
      incomeConfig.ericPayAmount,
      incomeConfig.jessicaPayAmount
    );

    // Start date is today
    const startDate = today;

    // Calculate end date
    const { endDate } = getPayPeriodEndDate(startDate, {
      ericNextPayDate: ericDate,
      jessicaNextPayDate: jessicaDate,
      ericPayAmount: incomeConfig.ericPayAmount,
      jessicaPayAmount: incomeConfig.jessicaPayAmount
    });

    // Starting balance from previous period's projected checking, or 0 if no previous
    const startingCheckingBalance = currentPayPeriod
      ? budget.projectedChecking || currentPayPeriod.startingCheckingBalance
      : 0;

    return {
      startDate,
      endDate,
      paycheckSource: nextPaycheck.source,
      paycheckAmount: nextPaycheck.amount,
      startingCheckingBalance,
      mortgageCarveout: DEFAULT_MORTGAGE_CARVEOUT,
      savingsAmount: 0,
      oneTimeIncome: 0
    };
  }, [incomeConfig, incomeSources, currentPayPeriod, budget]);

  // Start a new pay period
  const startNewPayPeriod = useCallback(async (overrides = {}) => {
    setIsCreating(true);
    setError(null);

    try {
      const defaults = getNewPayPeriodDefaults();
      if (!defaults) {
        throw new Error('Income configuration is required to create a pay period');
      }

      const payPeriodData = {
        ...defaults,
        ...overrides
      };

      const id = await createPayPeriod(payPeriodData);
      return id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [getNewPayPeriodDefaults, createPayPeriod]);

  // Update current pay period
  const updateCurrentPayPeriod = useCallback(async (updates) => {
    if (!currentPayPeriod?.id) {
      throw new Error('No active pay period');
    }

    setIsUpdating(true);
    setError(null);

    try {
      await updatePayPeriod(currentPayPeriod.id, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [currentPayPeriod, updatePayPeriod]);

  return {
    payPeriods,
    currentPayPeriod,
    isCreating,
    isUpdating,
    error,
    getNewPayPeriodDefaults,
    startNewPayPeriod,
    updateCurrentPayPeriod,
    selectPayPeriod
  };
}
