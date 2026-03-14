import { useState } from 'react';
import { parseCurrency } from '../utils/calculations';
import { formatDateForInput } from '../utils/dateHelpers';

const CADENCE_OPTIONS = [
  { value: 'weekly', label: 'Weekly', description: 'Every 7 days' },
  { value: 'biweekly', label: 'Biweekly', description: 'Every 14 days' },
  { value: 'semimonthly', label: 'Semimonthly', description: 'Twice per month (e.g., 1st and 15th)' },
  { value: 'monthly', label: 'Monthly', description: 'Same day each month' }
];

function getInitialFormData(source) {
  if (!source) {
    return {
      name: '',
      payAmount: '',
      cadence: 'biweekly',
      nextPayDate: formatDateForInput(new Date()),
      semimonthlyDay1: '1',
      semimonthlyDay2: '15',
      isActive: true
    };
  }

  return {
    name: source.name || '',
    payAmount: source.payAmount?.toString() || '',
    cadence: source.cadence || 'biweekly',
    nextPayDate: formatDateForInput(source.nextPayDate || new Date()),
    semimonthlyDay1: source.semimonthlyDays?.[0]?.toString() || '1',
    semimonthlyDay2: source.semimonthlyDays?.[1]?.toString() || '15',
    isActive: source.isActive ?? true
  };
}

export default function IncomeSourceForm({ source, onSave, onClose, isSaving }) {
  const [formData, setFormData] = useState(() => getInitialFormData(source));
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const amount = parseCurrency(formData.payAmount);
    if (!amount || amount <= 0) {
      newErrors.payAmount = 'Please enter a valid amount';
    }

    if (formData.cadence === 'semimonthly') {
      const day1 = parseInt(formData.semimonthlyDay1, 10);
      const day2 = parseInt(formData.semimonthlyDay2, 10);
      if (isNaN(day1) || day1 < 1 || day1 > 31) {
        newErrors.semimonthlyDay1 = 'Invalid day';
      }
      if (isNaN(day2) || day2 < 1 || day2 > 31) {
        newErrors.semimonthlyDay2 = 'Invalid day';
      }
      if (day1 === day2) {
        newErrors.semimonthlyDay2 = 'Days must be different';
      }
    } else if (!formData.nextPayDate) {
      newErrors.nextPayDate = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const sourceData = {
      name: formData.name.trim(),
      payAmount: parseCurrency(formData.payAmount),
      cadence: formData.cadence,
      isActive: formData.isActive
    };

    if (formData.cadence === 'semimonthly') {
      sourceData.semimonthlyDays = [
        parseInt(formData.semimonthlyDay1, 10),
        parseInt(formData.semimonthlyDay2, 10)
      ].sort((a, b) => a - b);
      sourceData.nextPayDate = new Date();
    } else {
      sourceData.nextPayDate = new Date(formData.nextPayDate);
      sourceData.semimonthlyDays = null;
    }

    await onSave(sourceData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {source ? 'Edit Income Source' : 'Add Income Source'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Eric, Jessica, Side Gig"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.payAmount}
                  onChange={(e) => handleInputChange('payAmount', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                    errors.payAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.payAmount && (
                <p className="mt-1 text-xs text-red-500">{errors.payAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Frequency
              </label>
              <select
                value={formData.cadence}
                onChange={(e) => handleInputChange('cadence', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {CADENCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {CADENCE_OPTIONS.find(o => o.value === formData.cadence)?.description}
              </p>
            </div>

            {formData.cadence === 'semimonthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Days of Month
                </label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <select
                      value={formData.semimonthlyDay1}
                      onChange={(e) => handleInputChange('semimonthlyDay1', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                        errors.semimonthlyDay1 ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-gray-500">and</span>
                  <div className="flex-1">
                    <select
                      value={formData.semimonthlyDay2}
                      onChange={(e) => handleInputChange('semimonthlyDay2', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                        errors.semimonthlyDay2 ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(errors.semimonthlyDay1 || errors.semimonthlyDay2) && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.semimonthlyDay1 || errors.semimonthlyDay2}
                  </p>
                )}
              </div>
            )}

            {formData.cadence !== 'semimonthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Pay Date
                </label>
                <input
                  type="date"
                  value={formData.nextPayDate}
                  onChange={(e) => handleInputChange('nextPayDate', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                    errors.nextPayDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.nextPayDate && (
                  <p className="mt-1 text-xs text-red-500">{errors.nextPayDate}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Future pay dates will be calculated automatically based on frequency
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-700">Active</span>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Inactive sources won't be included in pay period calculations
            </p>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : (source ? 'Update' : 'Add')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
