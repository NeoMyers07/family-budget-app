import { useBudget } from '../contexts/BudgetContext';
import { formatDate, getRelativeDateString } from '../utils/dateHelpers';
import { formatCurrency } from '../utils/calculations';
import { useOneTimeIncome } from '../hooks/useOneTimeIncome';
import BudgetGauge from './BudgetGauge';
import SpendingBreakdown from './SpendingBreakdown';
import AddTransaction from './AddTransaction';

export default function Dashboard() {
  const {
    currentPayPeriod,
    budget,
    budgetView,
    toggleBudgetView,
    progress,
    nextPaycheckInfo,
    loading
  } = useBudget();

  const { total: oneTimeIncomeTotal, hasItems: hasOneTimeIncome } = useOneTimeIncome();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!currentPayPeriod) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Welcome to Family Budget
        </h2>
        <p className="text-gray-600 mb-6">
          Get started by setting up your income configuration and creating your first pay period.
        </p>
      </div>
    );
  }

  const startDate = currentPayPeriod.startDate?.toDate?.() || currentPayPeriod.startDate;
  const endDate = currentPayPeriod.endDate?.toDate?.() || currentPayPeriod.endDate;

  return (
    <div className="space-y-6">
      {/* Budget View Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => budgetView !== 'paycheck' && toggleBudgetView()}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              budgetView === 'paycheck'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Paycheck Budget
          </button>
          <button
            onClick={() => budgetView !== 'checking' && toggleBudgetView()}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              budgetView === 'checking'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Checking Budget
          </button>
        </div>
      </div>

      {/* Main Budget Display */}
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <BudgetGauge
          remaining={budgetView === 'paycheck' ? budget.remainingBudget : budget.projectedChecking}
          available={budgetView === 'paycheck' ? budget.availableBudget : budget.projectedChecking + budget.totalSpending}
          isCheckingView={budgetView === 'checking'}
        />
      </div>

      {/* Pay Period Info */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Day</span>
            <span className="font-semibold text-gray-800">
              {progress.currentDay} of {progress.totalDays}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Period</span>
            <span className="font-semibold text-gray-800">
              {formatDate(startDate)} - {formatDate(endDate)}
            </span>
          </div>
          {nextPaycheckInfo && (
            <>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Next Paycheck</span>
                <span className="font-semibold text-gray-800">
                  {nextPaycheckInfo.source} ({getRelativeDateString(nextPaycheckInfo.date)})
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Budget Details Card */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <div className={`grid grid-cols-2 ${hasOneTimeIncome ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 text-center`}>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Starting Balance</div>
            <div className="font-semibold text-gray-800">
              {formatCurrency(currentPayPeriod.startingCheckingBalance)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Paycheck ({currentPayPeriod.paycheckSource})</div>
            <div className="font-semibold text-gray-800">
              {formatCurrency(currentPayPeriod.paycheckAmount)}
            </div>
          </div>
          {hasOneTimeIncome && (
            <div>
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">One-Time Income</div>
              <div className="font-semibold text-green-600">
                +{formatCurrency(oneTimeIncomeTotal)}
              </div>
            </div>
          )}
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Spending</div>
            <div className="font-semibold text-gray-800">
              {formatCurrency(budget.totalSpending)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">
              {budgetView === 'paycheck' ? 'Remaining' : 'Projected'}
            </div>
            <div className="font-semibold text-gray-800">
              {formatCurrency(budgetView === 'paycheck' ? budget.remainingBudget : budget.projectedChecking)}
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction */}
      <AddTransaction />

      {/* Spending Breakdown */}
      <SpendingBreakdown />
    </div>
  );
}
