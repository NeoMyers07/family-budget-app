import { useState } from 'react';
import { usePayPeriod } from '../hooks/usePayPeriod';
import { useIncomeConfig } from '../hooks/useIncomeConfig';
import { useOneTimeIncome } from '../hooks/useOneTimeIncome';
import { formatCurrency, parseCurrency, DEFAULT_MORTGAGE_CARVEOUT } from '../utils/calculations';
import { formatDate, formatDateForInput, parseDateFromInput } from '../utils/dateHelpers';
import OneTimeIncomeManager from './OneTimeIncomeManager';

const EMPTY_FORM = {
  startDate: '',
  endDate: '',
  startingCheckingBalance: '',
  paycheckAmount: '',
  mortgageCarveout: DEFAULT_MORTGAGE_CARVEOUT.toString(),
  savingsAmount: '0'
};

export default function PayPeriodManager() {
  const {
    currentPayPeriod,
    payPeriods,
    isCreating,
    isUpdating,
    error,
    getNewPayPeriodDefaults,
    startNewPayPeriod,
    updateCurrentPayPeriod
  } = usePayPeriod();

  const { isConfigured } = useIncomeConfig();
  const { total: oneTimeIncomeTotal, hasItems: hasOneTimeIncome } = useOneTimeIncome();

  const [isEditing, setIsEditing] = useState(false);
  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openEditForm = () => {
    if (!currentPayPeriod) {
      return;
    }

    const startDate = currentPayPeriod.startDate?.toDate?.() || currentPayPeriod.startDate;
    const endDate = currentPayPeriod.endDate?.toDate?.() || currentPayPeriod.endDate;

    setFormData({
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
      startingCheckingBalance: currentPayPeriod.startingCheckingBalance?.toString() || '',
      paycheckAmount: currentPayPeriod.paycheckAmount?.toString() || '',
      mortgageCarveout: (currentPayPeriod.mortgageCarveout ?? DEFAULT_MORTGAGE_CARVEOUT).toString(),
      savingsAmount: (currentPayPeriod.savingsAmount || 0).toString()
    });
    setIsEditing(true);
  };

  const openNewPeriodForm = () => {
    const defaults = getNewPayPeriodDefaults();

    if (defaults) {
      setFormData({
        ...EMPTY_FORM,
        startingCheckingBalance: defaults.startingCheckingBalance?.toString() || '',
        paycheckAmount: defaults.paycheckAmount?.toString() || '',
        mortgageCarveout: defaults.mortgageCarveout.toString(),
        savingsAmount: defaults.savingsAmount.toString()
      });
    } else {
      setFormData(EMPTY_FORM);
    }

    setShowNewPeriodForm(true);
  };

  const handleStartNewPeriod = async () => {
    try {
      await startNewPayPeriod({
        startingCheckingBalance: parseCurrency(formData.startingCheckingBalance),
        paycheckAmount: parseCurrency(formData.paycheckAmount),
        mortgageCarveout: parseCurrency(formData.mortgageCarveout),
        savingsAmount: parseCurrency(formData.savingsAmount)
      });
      setShowNewPeriodForm(false);
      setFormData(EMPTY_FORM);
    } catch (err) {
      console.error('Failed to start new period:', err);
    }
  };

  const handleUpdatePeriod = async () => {
    try {
      await updateCurrentPayPeriod({
        startDate: parseDateFromInput(formData.startDate),
        endDate: parseDateFromInput(formData.endDate),
        startingCheckingBalance: parseCurrency(formData.startingCheckingBalance),
        paycheckAmount: parseCurrency(formData.paycheckAmount),
        mortgageCarveout: parseCurrency(formData.mortgageCarveout),
        savingsAmount: parseCurrency(formData.savingsAmount)
      });
      setIsEditing(false);
      setFormData(EMPTY_FORM);
    } catch (err) {
      console.error('Failed to update period:', err);
    }
  };

  if (!isConfigured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Income Configuration Required
        </h3>
        <p className="text-yellow-700">
          Please set up your income configuration before creating a pay period.
        </p>
      </div>
    );
  }

  if (showNewPeriodForm) {
    const defaults = getNewPayPeriodDefaults();

    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Start New Pay Period</h3>

        {defaults && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Next paycheck: <strong>{defaults.paycheckSource}</strong> on{' '}
              <strong>{formatDate(defaults.startDate)}</strong> - {formatDate(defaults.endDate)}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Starting Checking Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.startingCheckingBalance}
                onChange={(e) => handleInputChange('startingCheckingBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paycheck Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.paycheckAmount}
                onChange={(e) => handleInputChange('paycheckAmount', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mortgage Carveout
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.mortgageCarveout}
                onChange={(e) => handleInputChange('mortgageCarveout', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Savings
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.savingsAmount}
                onChange={(e) => handleInputChange('savingsAmount', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleStartNewPeriod}
            disabled={isCreating}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {isCreating ? 'Creating...' : 'Start Pay Period'}
          </button>
          <button
            onClick={() => {
              setShowNewPeriodForm(false);
              setFormData(EMPTY_FORM);
            }}
            className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (isEditing && currentPayPeriod) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Pay Period</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Starting Checking Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.startingCheckingBalance}
                onChange={(e) => handleInputChange('startingCheckingBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paycheck Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.paycheckAmount}
                onChange={(e) => handleInputChange('paycheckAmount', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mortgage Carveout
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.mortgageCarveout}
                onChange={(e) => handleInputChange('mortgageCarveout', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Savings
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.savingsAmount}
                onChange={(e) => handleInputChange('savingsAmount', e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleUpdatePeriod}
            disabled={isUpdating}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setFormData(EMPTY_FORM);
            }}
            className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Pay Period</h3>
        <div className="flex gap-2">
          {currentPayPeriod && (
            <button
              onClick={openEditForm}
              className="py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={openNewPeriodForm}
            className="py-2 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Start New Period
          </button>
        </div>
      </div>

      {currentPayPeriod ? (
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Period</span>
            <span className="font-medium text-gray-900">
              {formatDate(currentPayPeriod.startDate?.toDate?.() || currentPayPeriod.startDate)} -{' '}
              {formatDate(currentPayPeriod.endDate?.toDate?.() || currentPayPeriod.endDate)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Paycheck Source</span>
            <span className="font-medium text-gray-900">{currentPayPeriod.paycheckSource}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Paycheck Amount</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(currentPayPeriod.paycheckAmount)}
            </span>
          </div>
          {hasOneTimeIncome && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">One-Time Income</span>
              <span className="font-medium text-green-600">
                +{formatCurrency(oneTimeIncomeTotal)}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Starting Balance</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(currentPayPeriod.startingCheckingBalance)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Mortgage Carveout</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(currentPayPeriod.mortgageCarveout ?? DEFAULT_MORTGAGE_CARVEOUT)}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Savings</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(currentPayPeriod.savingsAmount || 0)}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No active pay period. Click "Start New Period" to begin.</p>
        </div>
      )}

      {currentPayPeriod && (
        <div className="mt-6">
          <OneTimeIncomeManager />
        </div>
      )}

      {payPeriods.length > 1 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Previous Periods</h4>
          <div className="space-y-2">
            {payPeriods.slice(1, 5).map((period) => (
              <div
                key={period.id}
                className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg text-sm"
              >
                <span className="text-gray-600">
                  {formatDate(period.startDate?.toDate?.() || period.startDate)}
                </span>
                <span className="font-medium text-gray-700">
                  {period.paycheckSource} - {formatCurrency(period.paycheckAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
