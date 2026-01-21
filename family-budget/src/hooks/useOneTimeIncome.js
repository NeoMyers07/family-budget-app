import { useState, useCallback, useMemo } from 'react';
import { useBudget } from '../contexts/BudgetContext';

/**
 * Hook for managing one-time income items (bonuses, refunds, etc.)
 */
export function useOneTimeIncome() {
  const {
    oneTimeIncomeItems,
    currentPayPeriod,
    addOneTimeIncomeItem,
    deleteOneTimeIncomeItem
  } = useBudget();

  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Calculate total one-time income
  const total = useMemo(() => {
    return oneTimeIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [oneTimeIncomeItems]);

  // Normalize dates in items
  const items = useMemo(() => {
    return oneTimeIncomeItems.map(item => ({
      ...item,
      date: item.date?.toDate?.() || item.date
    }));
  }, [oneTimeIncomeItems]);

  // Add a one-time income item
  const addItem = useCallback(async ({ amount, description, date }) => {
    if (!currentPayPeriod?.id) {
      throw new Error('No active pay period');
    }

    setIsAdding(true);
    setError(null);

    try {
      const id = await addOneTimeIncomeItem({
        amount,
        description,
        date: date || new Date()
      });
      return id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [currentPayPeriod?.id, addOneTimeIncomeItem]);

  // Delete a one-time income item
  const deleteItem = useCallback(async (itemId) => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteOneTimeIncomeItem(itemId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [deleteOneTimeIncomeItem]);

  // Check if there are any one-time income items
  const hasItems = items.length > 0;

  return {
    items,
    total,
    hasItems,
    isAdding,
    isDeleting,
    isLoading: isAdding || isDeleting,
    error,
    addItem,
    deleteItem
  };
}
