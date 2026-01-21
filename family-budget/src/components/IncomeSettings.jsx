import { useState } from 'react';
import { useIncomeConfig } from '../hooks/useIncomeConfig';
import { parseCurrency, formatCurrency, DEFAULT_CHECKING_FLOOR } from '../utils/calculations';
import { formatDate } from '../utils/dateHelpers';
import IncomeSourceForm from './IncomeSourceForm';

const CADENCE_LABELS = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  semimonthly: 'Semimonthly',
  monthly: 'Monthly'
};

export default function IncomeSettings() {
  const {
    incomeSources,
    checkingFloor,
    isSaving,
    error,
    addSource,
    updateSource,
    removeSource,
    toggleSourceActive,
    saveAppSettings
  } = useIncomeConfig();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [checkingFloorValue, setCheckingFloorValue] = useState(checkingFloor.toString());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSaveCheckingFloor = async () => {
    setSuccess(false);
    try {
      await saveAppSettings({
        checkingFloor: parseCurrency(checkingFloorValue)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save checking floor:', err);
    }
  };

  const handleAddSource = async (sourceData) => {
    try {
      await addSource(sourceData);
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add income source:', err);
    }
  };

  const handleUpdateSource = async (sourceData) => {
    if (!editingSource) return;
    try {
      await updateSource(editingSource.id, sourceData);
      setEditingSource(null);
    } catch (err) {
      console.error('Failed to update income source:', err);
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      await removeSource(id);
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete income source:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Income Sources Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Income Sources</h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="py-2 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Add Income Source
          </button>
        </div>

        {incomeSources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No income sources configured.</p>
            <p className="text-sm">Add your income sources to start tracking your budget.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incomeSources.map((source) => (
              <div
                key={source.id}
                className={`border rounded-lg p-4 ${
                  source.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${source.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                        {source.name}
                      </h4>
                      {!source.isActive && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">{formatCurrency(source.payAmount)}</span>
                        {' · '}
                        {CADENCE_LABELS[source.cadence] || source.cadence}
                      </p>
                      {source.cadence === 'semimonthly' && source.semimonthlyDays ? (
                        <p className="text-gray-500">
                          Pay days: {source.semimonthlyDays[0]}th and {source.semimonthlyDays[1]}th
                        </p>
                      ) : (
                        <p className="text-gray-500">
                          Next: {formatDate(source.nextPayDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSourceActive(source.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        source.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={source.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {source.isActive ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditingSource(source)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(source.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === source.id && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 mb-3">
                      Are you sure you want to delete "{source.name}"?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        disabled={isSaving}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md transition-colors"
                      >
                        {isSaving ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* App Settings Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Settings</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Checking Floor
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={checkingFloorValue}
                onChange={(e) => setCheckingFloorValue(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              onClick={handleSaveCheckingFloor}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Minimum balance always kept in checking account (default: $4,700)
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">Settings saved successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Income Source Modal */}
      {(showAddForm || editingSource) && (
        <IncomeSourceForm
          source={editingSource}
          onSave={editingSource ? handleUpdateSource : handleAddSource}
          onClose={() => {
            setShowAddForm(false);
            setEditingSource(null);
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
