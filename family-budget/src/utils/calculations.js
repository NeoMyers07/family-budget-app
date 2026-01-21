/**
 * Budget Calculation Functions
 *
 * Core Formula:
 * Available Budget = (Checking Balance - $4,700) + Total Income - Expenditures
 * Total Income = Paycheck Amount + One-Time Income (bonuses, refunds, etc.)
 */

export const PAYMENT_METHODS = ['Amex', 'Chase Amazon', 'Savor', 'Checking'];
export const DEFAULT_CHECKING_FLOOR = 4700;
export const DEFAULT_MORTGAGE_CARVEOUT = 566.67;

/**
 * Get the total for a card/account
 * If override is set, return override value
 * Otherwise, sum all transactions for that payment method
 */
export function getCardTotal(transactions, paymentMethod, override = null) {
  if (override !== null && override !== undefined) {
    return override;
  }
  return transactions
    .filter(t => t.paymentMethod === paymentMethod)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
}

/**
 * Get totals for all payment methods
 */
export function getAllCardTotals(transactions, overrides = {}) {
  const totals = {};
  for (const method of PAYMENT_METHODS) {
    totals[method] = getCardTotal(transactions, method, overrides[method]);
  }
  return totals;
}

/**
 * Calculate total spending across all payment methods
 */
export function getTotalSpending(transactions, overrides = {}) {
  const totals = getAllCardTotals(transactions, overrides);
  return Object.values(totals).reduce((sum, total) => sum + total, 0);
}

/**
 * Calculate Paycheck Budget View
 *
 * totalIncome = paycheckAmount + oneTimeIncome
 * availableBudget = (startingCheckingBalance - checkingFloor) + totalIncome
 * remainingBudget = availableBudget - mortgageCarveout - savingsAmount - totalSpending
 */
export function calculatePaycheckBudget({
  startingCheckingBalance,
  paycheckAmount,
  oneTimeIncome = 0,
  checkingFloor = DEFAULT_CHECKING_FLOOR,
  mortgageCarveout = DEFAULT_MORTGAGE_CARVEOUT,
  savingsAmount = 0,
  transactions = [],
  overrides = {}
}) {
  const totalSpending = getTotalSpending(transactions, overrides);
  const totalIncome = paycheckAmount + oneTimeIncome;
  const availableBudget = (startingCheckingBalance - checkingFloor) + totalIncome;
  const remainingBudget = availableBudget - mortgageCarveout - savingsAmount - totalSpending;

  return {
    availableBudget,
    remainingBudget,
    totalSpending,
    totalIncome,
    oneTimeIncome,
    mortgageCarveout,
    savingsAmount,
    cardTotals: getAllCardTotals(transactions, overrides)
  };
}

/**
 * Calculate Checking Budget View
 *
 * totalIncome = paycheckAmount + oneTimeIncome
 * projectedChecking = startingCheckingBalance + totalIncome - mortgageCarveout - savingsAmount - totalSpending
 */
export function calculateCheckingBudget({
  startingCheckingBalance,
  paycheckAmount,
  oneTimeIncome = 0,
  mortgageCarveout = DEFAULT_MORTGAGE_CARVEOUT,
  savingsAmount = 0,
  transactions = [],
  overrides = {}
}) {
  const totalSpending = getTotalSpending(transactions, overrides);
  const totalIncome = paycheckAmount + oneTimeIncome;
  const projectedChecking = startingCheckingBalance + totalIncome - mortgageCarveout - savingsAmount - totalSpending;

  return {
    projectedChecking,
    totalSpending,
    totalIncome,
    oneTimeIncome,
    mortgageCarveout,
    savingsAmount,
    cardTotals: getAllCardTotals(transactions, overrides)
  };
}

/**
 * Get the percentage remaining of available budget
 */
export function getBudgetPercentage(remaining, available) {
  if (available <= 0) return 0;
  const percentage = (remaining / available) * 100;
  return Math.max(0, Math.min(100, percentage));
}

/**
 * Get status color based on percentage remaining
 * green (>50%), yellow (20-50%), red (<20%), warning if negative
 */
export function getBudgetStatus(remaining, available) {
  if (remaining < 0) {
    return { color: 'red', status: 'warning', label: 'Over Budget' };
  }

  const percentage = getBudgetPercentage(remaining, available);

  if (percentage > 50) {
    return { color: 'green', status: 'good', label: 'On Track' };
  } else if (percentage > 20) {
    return { color: 'yellow', status: 'caution', label: 'Caution' };
  } else {
    return { color: 'red', status: 'low', label: 'Low Budget' };
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value) {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

// Test case verification
export function runTestCase() {
  const testData = {
    startingCheckingBalance: 6483.35,
    paycheckAmount: 5000,
    checkingFloor: 4700,
    mortgageCarveout: 566.67,
    savingsAmount: 1,
    transactions: [
      { paymentMethod: 'Amex', amount: 3861.34 },
      { paymentMethod: 'Chase Amazon', amount: 277.54 },
      { paymentMethod: 'Savor', amount: 1194.66 },
      { paymentMethod: 'Checking', amount: 0 }
    ],
    overrides: {}
  };

  const paycheckResult = calculatePaycheckBudget(testData);
  const checkingResult = calculateCheckingBudget(testData);

  console.log('Paycheck Budget Remaining:', paycheckResult.remainingBudget.toFixed(2));
  console.log('Expected: 882.14');
  console.log('Match:', Math.abs(paycheckResult.remainingBudget - 882.14) < 0.01);

  console.log('Checking Budget Projected:', checkingResult.projectedChecking.toFixed(2));
  console.log('Expected: 5582.14');
  console.log('Match:', Math.abs(checkingResult.projectedChecking - 5582.14) < 0.01);

  return {
    paycheckBudgetCorrect: Math.abs(paycheckResult.remainingBudget - 882.14) < 0.01,
    checkingBudgetCorrect: Math.abs(checkingResult.projectedChecking - 5582.14) < 0.01
  };
}

// Test case with one-time income
export function runTestCaseWithOneTimeIncome() {
  const testData = {
    startingCheckingBalance: 6483.35,
    paycheckAmount: 5000,
    oneTimeIncome: 500, // Bonus
    checkingFloor: 4700,
    mortgageCarveout: 566.67,
    savingsAmount: 1,
    transactions: [
      { paymentMethod: 'Amex', amount: 3861.34 },
      { paymentMethod: 'Chase Amazon', amount: 277.54 },
      { paymentMethod: 'Savor', amount: 1194.66 },
      { paymentMethod: 'Checking', amount: 0 }
    ],
    overrides: {}
  };

  const paycheckResult = calculatePaycheckBudget(testData);
  const checkingResult = calculateCheckingBudget(testData);

  // With $500 one-time income:
  // Available: (6483.35 - 4700) + 5000 + 500 = 7283.35
  // Remaining: 7283.35 - 566.67 - 1 - 5333.54 = 1382.14
  // Projected: 6483.35 + 5000 + 500 - 566.67 - 1 - 5333.54 = 6082.14

  console.log('With One-Time Income ($500 bonus):');
  console.log('Paycheck Budget Remaining:', paycheckResult.remainingBudget.toFixed(2));
  console.log('Expected: 1382.14');
  console.log('Match:', Math.abs(paycheckResult.remainingBudget - 1382.14) < 0.01);

  console.log('Checking Budget Projected:', checkingResult.projectedChecking.toFixed(2));
  console.log('Expected: 6082.14');
  console.log('Match:', Math.abs(checkingResult.projectedChecking - 6082.14) < 0.01);

  return {
    paycheckBudgetCorrect: Math.abs(paycheckResult.remainingBudget - 1382.14) < 0.01,
    checkingBudgetCorrect: Math.abs(checkingResult.projectedChecking - 6082.14) < 0.01
  };
}
