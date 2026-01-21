import { useMemo } from 'react';
import { getBudgetPercentage, getBudgetStatus, formatCurrency } from '../utils/calculations';

export default function BudgetGauge({ remaining, available, isCheckingView = false }) {
  const percentage = useMemo(() => {
    return getBudgetPercentage(remaining, available);
  }, [remaining, available]);

  const status = useMemo(() => {
    return getBudgetStatus(remaining, available);
  }, [remaining, available]);

  const colorClasses = useMemo(() => {
    switch (status.color) {
      case 'green':
        return {
          bg: 'bg-green-500',
          text: 'text-green-600',
          ring: 'ring-green-500',
          light: 'bg-green-100'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-600',
          ring: 'ring-yellow-500',
          light: 'bg-yellow-100'
        };
      case 'red':
      default:
        return {
          bg: 'bg-red-500',
          text: 'text-red-600',
          ring: 'ring-red-500',
          light: 'bg-red-100'
        };
    }
  }, [status.color]);

  return (
    <div className="text-center">
      {/* Hero budget number */}
      <div className={`text-5xl md:text-6xl font-bold ${colorClasses.text} mb-2`}>
        {formatCurrency(remaining)}
      </div>

      <div className="text-gray-500 text-sm mb-4">
        {isCheckingView ? 'Projected Balance' : 'Remaining Budget'}
      </div>

      {/* Visual gauge */}
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute left-0 top-0 h-full ${colorClasses.bg} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${Math.max(0, percentage)}%` }}
        />
      </div>

      {/* Status indicator */}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colorClasses.light}`}>
        <span className={`w-2 h-2 rounded-full ${colorClasses.bg}`} />
        <span className={`text-sm font-medium ${colorClasses.text}`}>
          {status.label}
        </span>
        {!isCheckingView && (
          <span className="text-gray-500 text-sm">
            ({percentage.toFixed(0)}% remaining)
          </span>
        )}
      </div>

      {/* Warning message for over budget */}
      {remaining < 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">
            Over budget by {formatCurrency(Math.abs(remaining))}
          </p>
        </div>
      )}
    </div>
  );
}
