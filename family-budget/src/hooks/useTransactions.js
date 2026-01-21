import { useState, useCallback } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { PAYMENT_METHODS } from '../utils/calculations';

export function useTransactions() {
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    overrides,
    setOverride
  } = useBudget();

  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Add a new transaction
  const add = useCallback(async (amount, paymentMethod) => {
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    setIsAdding(true);
    setError(null);

    try {
      // If there's an override for this payment method, add to the override
      if (overrides[paymentMethod] !== undefined) {
        const newOverride = overrides[paymentMethod] + amount;
        await setOverride(paymentMethod, newOverride);
      }

      // Always add the transaction
      const id = await addTransaction({
        amount,
        paymentMethod
      });

      return id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [addTransaction, overrides, setOverride]);

  // Update an existing transaction
  const update = useCallback(async (transactionId, updates) => {
    if (updates.amount !== undefined && (typeof updates.amount !== 'number' || updates.amount <= 0)) {
      throw new Error('Amount must be a positive number');
    }

    if (updates.paymentMethod !== undefined && !PAYMENT_METHODS.includes(updates.paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    setIsUpdating(true);
    setError(null);

    try {
      // Find the existing transaction
      const existingTransaction = transactions.find(t => t.id === transactionId);

      if (existingTransaction) {
        const oldPaymentMethod = existingTransaction.paymentMethod;
        const newPaymentMethod = updates.paymentMethod || oldPaymentMethod;
        const oldAmount = existingTransaction.amount;
        const newAmount = updates.amount !== undefined ? updates.amount : oldAmount;

        // Handle override adjustments
        if (oldPaymentMethod === newPaymentMethod) {
          // Same payment method - adjust override by the difference
          if (overrides[oldPaymentMethod] !== undefined && updates.amount !== undefined) {
            const difference = newAmount - oldAmount;
            const newOverride = overrides[oldPaymentMethod] + difference;
            await setOverride(oldPaymentMethod, Math.max(0, newOverride));
          }
        } else {
          // Payment method changed - subtract from old, add to new
          if (overrides[oldPaymentMethod] !== undefined) {
            const newOldOverride = overrides[oldPaymentMethod] - oldAmount;
            await setOverride(oldPaymentMethod, Math.max(0, newOldOverride));
          }
          if (overrides[newPaymentMethod] !== undefined) {
            const newNewOverride = overrides[newPaymentMethod] + newAmount;
            await setOverride(newPaymentMethod, newNewOverride);
          }
        }
      }

      await updateTransaction(transactionId, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [updateTransaction, transactions, overrides, setOverride]);

  // Delete a transaction
  const remove = useCallback(async (transactionId) => {
    setIsDeleting(true);
    setError(null);

    try {
      // Find the transaction to get its amount and payment method
      const transaction = transactions.find(t => t.id === transactionId);

      if (transaction) {
        // If there's an override for this payment method, subtract the amount
        if (overrides[transaction.paymentMethod] !== undefined) {
          const newOverride = overrides[transaction.paymentMethod] - transaction.amount;
          await setOverride(transaction.paymentMethod, Math.max(0, newOverride));
        }
      }

      await deleteTransaction(transactionId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTransaction, transactions, overrides, setOverride]);

  // Get transactions by payment method
  const getByPaymentMethod = useCallback((paymentMethod) => {
    return transactions.filter(t => t.paymentMethod === paymentMethod);
  }, [transactions]);

  // Get transaction by ID
  const getById = useCallback((transactionId) => {
    return transactions.find(t => t.id === transactionId);
  }, [transactions]);

  return {
    transactions,
    isAdding,
    isUpdating,
    isDeleting,
    isLoading: isAdding || isUpdating || isDeleting,
    error,
    add,
    update,
    remove,
    getByPaymentMethod,
    getById,
    paymentMethods: PAYMENT_METHODS
  };
}
