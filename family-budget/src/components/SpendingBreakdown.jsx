import { useBudget } from '../contexts/BudgetContext';
import { formatCurrency, PAYMENT_METHODS } from '../utils/calculations';
import ManualOverride from './ManualOverride';

export default function SpendingBreakdown() {
  const { budget, overrides } = useBudget();
  const { cardTotals, mortgageCarveout, savingsAmount, totalSpending } = budget;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending Breakdown</h3>

      {/* Payment methods */}
      <div className="space-y-3">
        {PAYMENT_METHODS.map((method) => (
          <div key={method} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-gray-700">{method}</span>
              {overrides[method] !== undefined && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Override
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {formatCurrency(cardTotals[method] || 0)}
              </span>
              <ManualOverride account={method} currentTotal={cardTotals[method] || 0} />
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-gray-200" />

      {/* Carveouts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600">Mortgage Carveout</span>
          <span className="font-medium text-gray-700">
            {formatCurrency(mortgageCarveout)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600">Savings</span>
          <span className="font-medium text-gray-700">
            {formatCurrency(savingsAmount)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-gray-200" />

      {/* Total */}
      <div className="flex items-center justify-between py-2">
        <span className="text-gray-800 font-semibold">Total Spending</span>
        <span className="text-xl font-bold text-gray-900">
          {formatCurrency(totalSpending + mortgageCarveout + savingsAmount)}
        </span>
      </div>
    </div>
  );
}
