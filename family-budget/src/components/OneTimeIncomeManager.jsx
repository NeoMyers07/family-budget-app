import { useState } from 'react';
import { useOneTimeIncome } from '../hooks/useOneTimeIncome';
import { formatCurrency, parseCurrency } from '../utils/calculations';
import { formatDate, formatDateForInput } from '../utils/dateHelpers';

export default function OneTimeIncomeManager() {
  const {
    items,
    total,
    hasItems,
    isAdding,
    isDeleting,
    error,
    addItem,
    deleteItem
  } = useOneTimeIncome();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: formatDateForInput(new Date())
  });
  const [formError, setFormError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const amount = parseCurrency(formData.amount);
    if (!amount || amount === 0) {
      setFormError('Please enter a valid amount');
      return;
    }

    if (!formData.description.trim()) {
      setFormError('Please enter a description');
      return;
    }

    try {
      await addItem({
        amount,
        description: formData.description.trim(),
        date: new Date(formData.date)
      });
      setFormData({
        amount: '',
        description: '',
        date: formatDateForInput(new Date())
      });
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteItem(id);
    } catch (err) {
      console.error('Failed to delete one-time income:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">One-Time Income</h3>
          {hasItems && (
            <p className="text-sm text-green-600 font-medium">
              Total: {formatCurrency(total)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2 px-4 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Income'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="e.g., Bonus, Tax Refund, Gift"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <button
              type="submit"
              disabled={isAdding}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
            >
              {isAdding ? 'Adding...' : 'Add One-Time Income'}
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      {hasItems ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="text-gray-600">{item.description}</span>
                </div>
                <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={isDeleting}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : !showAddForm ? (
        <p className="text-center text-gray-500 text-sm py-4">
          No one-time income added for this period.
        </p>
      ) : null}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
