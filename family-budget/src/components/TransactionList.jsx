import { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency, parseCurrency, PAYMENT_METHODS } from '../utils/calculations';

export default function TransactionList() {
  const { currentPayPeriod, loading: budgetLoading } = useBudget();
  const {
    transactions,
    isLoading,
    error,
    add,
    update,
    remove,
    getByPaymentMethod,
    paymentMethods
  } = useTransactions();

  const [selectedAccount, setSelectedAccount] = useState(paymentMethods[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Add form state
  const [addAmount, setAddAmount] = useState('');
  const [addError, setAddError] = useState(null);

  // Edit form state
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editError, setEditError] = useState(null);

  const accountTransactions = getByPaymentMethod(selectedAccount);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError(null);

    const amount = parseCurrency(addAmount);
    if (!amount || amount <= 0) {
      setAddError('Please enter a valid amount');
      return;
    }

    try {
      await add(amount, selectedAccount);
      setAddAmount('');
      setShowAddForm(false);
    } catch (err) {
      setAddError(err.message);
    }
  };

  const startEdit = (transaction) => {
    setEditingTransaction(transaction.id);
    setEditAmount(transaction.amount.toString());
    setEditPaymentMethod(transaction.paymentMethod);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingTransaction(null);
    setEditAmount('');
    setEditPaymentMethod('');
    setEditError(null);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError(null);

    const amount = parseCurrency(editAmount);
    if (!amount || amount <= 0) {
      setEditError('Please enter a valid amount');
      return;
    }

    try {
      await update(editingTransaction, {
        amount,
        paymentMethod: editPaymentMethod
      });
      cancelEdit();
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleDelete = async (transactionId) => {
    try {
      await remove(transactionId);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const formatDate = (timestamp) => {
    const date = timestamp?.toDate?.() || timestamp;
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Show loading state
  if (budgetLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  // Show message if no active pay period
  if (!currentPayPeriod) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          No Active Pay Period
        </h3>
        <p className="text-yellow-700">
          Please create a pay period first to manage transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Transactions</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Transaction'}
        </button>
      </div>

      {/* Account Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {paymentMethods.map((method) => {
          const count = getByPaymentMethod(method).length;
          return (
            <button
              key={method}
              onClick={() => setSelectedAccount(method)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedAccount === method
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {method}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  selectedAccount === method
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount for {selectedAccount}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {isLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
          {addError && (
            <p className="mt-2 text-sm text-red-600">{addError}</p>
          )}
        </form>
      )}

      {/* Debug info */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
        Pay Period: {currentPayPeriod?.id?.slice(0, 8)}... | Total Transactions: {transactions.length}
      </div>

      {/* Transaction List */}
      {accountTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No transactions for {selectedAccount}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accountTransactions.map((transaction) => (
            <div key={transaction.id}>
              {editingTransaction === transaction.id ? (
                /* Edit Form */
                <form onSubmit={handleEdit} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => setEditPaymentMethod(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {editError && (
                    <p className="mt-2 text-sm text-red-600">{editError}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : deleteConfirm === transaction.id ? (
                /* Delete Confirmation */
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-3">
                    Delete transaction of {formatCurrency(transaction.amount)}?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-md transition-colors"
                    >
                      {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Display */
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <span className="ml-3 text-sm text-gray-500">
                      {formatDate(transaction.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(transaction)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(transaction.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Account Total */}
      {accountTransactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-gray-600 font-medium">Total for {selectedAccount}</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(accountTransactions.reduce((sum, t) => sum + t.amount, 0))}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
