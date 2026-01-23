import { describe, it, expect } from 'vitest';
import {
  PAYMENT_METHODS,
  DEFAULT_CHECKING_FLOOR,
  DEFAULT_MORTGAGE_CARVEOUT,
  getCardTotal,
  getAllCardTotals,
  getTotalSpending,
  calculatePaycheckBudget,
  calculateCheckingBudget,
  getBudgetPercentage,
  getBudgetStatus,
  formatCurrency,
  parseCurrency
} from './calculations';

describe('calculations.js', () => {
  describe('getCardTotal', () => {
    const transactions = [
      { paymentMethod: 'Amex', amount: 100 },
      { paymentMethod: 'Amex', amount: 50 },
      { paymentMethod: 'Chase Amazon', amount: 75 },
      { paymentMethod: 'Savor', amount: 25 }
    ];

    it('should sum transactions for a specific payment method', () => {
      expect(getCardTotal(transactions, 'Amex')).toBe(150);
      expect(getCardTotal(transactions, 'Chase Amazon')).toBe(75);
      expect(getCardTotal(transactions, 'Savor')).toBe(25);
    });

    it('should return 0 for payment method with no transactions', () => {
      expect(getCardTotal(transactions, 'Checking')).toBe(0);
    });

    it('should return override value when override is set', () => {
      expect(getCardTotal(transactions, 'Amex', 200)).toBe(200);
      expect(getCardTotal(transactions, 'Amex', 0)).toBe(0);
    });

    it('should ignore override when null or undefined', () => {
      expect(getCardTotal(transactions, 'Amex', null)).toBe(150);
      expect(getCardTotal(transactions, 'Amex', undefined)).toBe(150);
    });

    it('should handle empty transactions array', () => {
      expect(getCardTotal([], 'Amex')).toBe(0);
    });

    it('should handle transactions with missing amounts', () => {
      const badTransactions = [
        { paymentMethod: 'Amex', amount: 100 },
        { paymentMethod: 'Amex' } // Missing amount
      ];
      expect(getCardTotal(badTransactions, 'Amex')).toBe(100);
    });
  });

  describe('getAllCardTotals', () => {
    const transactions = [
      { paymentMethod: 'Amex', amount: 100 },
      { paymentMethod: 'Chase Amazon', amount: 75 },
      { paymentMethod: 'Savor', amount: 50 },
      { paymentMethod: 'Checking', amount: 25 }
    ];

    it('should return totals for all payment methods', () => {
      const totals = getAllCardTotals(transactions);
      expect(totals).toEqual({
        'Amex': 100,
        'Chase Amazon': 75,
        'Savor': 50,
        'Checking': 25
      });
    });

    it('should apply overrides to specific cards', () => {
      const overrides = {
        'Amex': 200,
        'Savor': 0
      };
      const totals = getAllCardTotals(transactions, overrides);
      expect(totals).toEqual({
        'Amex': 200,
        'Chase Amazon': 75,
        'Savor': 0,
        'Checking': 25
      });
    });

    it('should handle empty transactions', () => {
      const totals = getAllCardTotals([]);
      expect(totals).toEqual({
        'Amex': 0,
        'Chase Amazon': 0,
        'Savor': 0,
        'Checking': 0
      });
    });
  });

  describe('getTotalSpending', () => {
    const transactions = [
      { paymentMethod: 'Amex', amount: 100 },
      { paymentMethod: 'Chase Amazon', amount: 75 },
      { paymentMethod: 'Savor', amount: 50 },
      { paymentMethod: 'Checking', amount: 25 }
    ];

    it('should sum all spending across payment methods', () => {
      expect(getTotalSpending(transactions)).toBe(250);
    });

    it('should include overrides in total', () => {
      const overrides = {
        'Amex': 200, // Override increases total by 100
        'Savor': 0   // Override decreases total by 50
      };
      // 200 + 75 + 0 + 25 = 300
      expect(getTotalSpending(transactions, overrides)).toBe(300);
    });

    it('should return 0 for empty transactions', () => {
      expect(getTotalSpending([])).toBe(0);
    });
  });

  describe('calculatePaycheckBudget', () => {
    it('should calculate budget correctly with standard case', () => {
      const params = {
        startingCheckingBalance: 6483.35,
        paycheckAmount: 5000,
        checkingFloor: 4700,
        mortgageCarveout: 566.67,
        savingsAmount: 1,
        transactions: [
          { paymentMethod: 'Amex', amount: 3861.34 },
          { paymentMethod: 'Chase Amazon', amount: 277.54 },
          { paymentMethod: 'Savor', amount: 1194.66 }
        ]
      };

      const result = calculatePaycheckBudget(params);

      expect(result.totalSpending).toBe(5333.54);
      expect(result.totalIncome).toBe(5000);
      expect(result.availableBudget).toBe(6783.35); // (6483.35 - 4700) + 5000
      expect(result.remainingBudget).toBeCloseTo(882.14, 2);
    });

    it('should include one-time income in calculations', () => {
      const params = {
        startingCheckingBalance: 6483.35,
        paycheckAmount: 5000,
        oneTimeIncome: 500,
        checkingFloor: 4700,
        mortgageCarveout: 566.67,
        savingsAmount: 1,
        transactions: [
          { paymentMethod: 'Amex', amount: 3861.34 },
          { paymentMethod: 'Chase Amazon', amount: 277.54 },
          { paymentMethod: 'Savor', amount: 1194.66 }
        ]
      };

      const result = calculatePaycheckBudget(params);

      expect(result.totalIncome).toBe(5500);
      expect(result.oneTimeIncome).toBe(500);
      expect(result.availableBudget).toBe(7283.35); // (6483.35 - 4700) + 5500
      expect(result.remainingBudget).toBeCloseTo(1382.14, 2);
    });

    it('should handle zero values', () => {
      const params = {
        startingCheckingBalance: 4700,
        paycheckAmount: 0,
        checkingFloor: 4700,
        mortgageCarveout: 0,
        savingsAmount: 0,
        transactions: []
      };

      const result = calculatePaycheckBudget(params);

      expect(result.availableBudget).toBe(0);
      expect(result.remainingBudget).toBe(0);
      expect(result.totalSpending).toBe(0);
    });

    it('should handle negative remaining budget (overspending)', () => {
      const params = {
        startingCheckingBalance: 4700,
        paycheckAmount: 1000,
        checkingFloor: 4700,
        mortgageCarveout: 500,
        savingsAmount: 0,
        transactions: [
          { paymentMethod: 'Amex', amount: 1000 }
        ]
      };

      const result = calculatePaycheckBudget(params);

      expect(result.availableBudget).toBe(1000);
      expect(result.remainingBudget).toBe(-500);
    });

    it('should apply overrides to card totals', () => {
      const params = {
        startingCheckingBalance: 6483.35,
        paycheckAmount: 5000,
        checkingFloor: 4700,
        mortgageCarveout: 566.67,
        savingsAmount: 1,
        transactions: [
          { paymentMethod: 'Amex', amount: 100 }
        ],
        overrides: {
          'Amex': 3861.34
        }
      };

      const result = calculatePaycheckBudget(params);

      expect(result.cardTotals['Amex']).toBe(3861.34);
      expect(result.totalSpending).toBe(3861.34);
    });

    it('should handle large numbers without overflow', () => {
      const params = {
        startingCheckingBalance: 999999.99,
        paycheckAmount: 999999.99,
        checkingFloor: 4700,
        mortgageCarveout: 566.67,
        savingsAmount: 1000,
        transactions: [
          { paymentMethod: 'Amex', amount: 500000 }
        ]
      };

      const result = calculatePaycheckBudget(params);

      expect(result.availableBudget).toBe(1995299.98);
      // Correct calculation: 1995299.98 - 566.67 - 1000 - 500000 = 1493733.31
      expect(result.remainingBudget).toBeCloseTo(1493733.31, 2);
    });

    it('should use default values when not provided', () => {
      const params = {
        startingCheckingBalance: 6483.35,
        paycheckAmount: 5000
      };

      const result = calculatePaycheckBudget(params);

      expect(result.mortgageCarveout).toBe(DEFAULT_MORTGAGE_CARVEOUT);
      expect(result.savingsAmount).toBe(0);
      expect(result.oneTimeIncome).toBe(0);
    });
  });

  describe('calculateCheckingBudget', () => {
    it('should calculate projected checking correctly', () => {
      const params = {
        startingCheckingBalance: 6483.35,
        paycheckAmount: 5000,
        mortgageCarveout: 566.67,
        savingsAmount: 1,
        transactions: [
          { paymentMethod: 'Amex', amount: 3861.34 },
          { paymentMethod: 'Chase Amazon', amount: 277.54 },
          { paymentMethod: 'Savor', amount: 1194.66 }
        ]
      };

      const result = calculateCheckingBudget(params);

      // 6483.35 + 5000 - 566.67 - 1 - 5333.54 = 5582.14
      expect(result.projectedChecking).toBeCloseTo(5582.14, 2);
    });

    it('should include one-time income', () => {
      const params = {
        startingCheckingBalance: 6483.35,
        paycheckAmount: 5000,
        oneTimeIncome: 500,
        mortgageCarveout: 566.67,
        savingsAmount: 1,
        transactions: [
          { paymentMethod: 'Amex', amount: 3861.34 },
          { paymentMethod: 'Chase Amazon', amount: 277.54 },
          { paymentMethod: 'Savor', amount: 1194.66 }
        ]
      };

      const result = calculateCheckingBudget(params);

      // 6483.35 + 5500 - 566.67 - 1 - 5333.54 = 6082.14
      expect(result.projectedChecking).toBeCloseTo(6082.14, 2);
    });

    it('should handle negative projected checking (overdraft scenario)', () => {
      const params = {
        startingCheckingBalance: 1000,
        paycheckAmount: 1000,
        mortgageCarveout: 500,
        savingsAmount: 100,
        transactions: [
          { paymentMethod: 'Checking', amount: 2000 }
        ]
      };

      const result = calculateCheckingBudget(params);

      // 1000 + 1000 - 500 - 100 - 2000 = -600
      expect(result.projectedChecking).toBe(-600);
    });

    it('should not use checking floor in calculation', () => {
      const params = {
        startingCheckingBalance: 6483.35,
        paycheckAmount: 5000,
        checkingFloor: 10000, // Should not affect checking budget
        mortgageCarveout: 0,
        savingsAmount: 0,
        transactions: []
      };

      const result = calculateCheckingBudget(params);

      // 6483.35 + 5000 = 11483.35 (checkingFloor not used)
      expect(result.projectedChecking).toBe(11483.35);
    });
  });

  describe('getBudgetPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(getBudgetPercentage(500, 1000)).toBe(50);
      expect(getBudgetPercentage(250, 1000)).toBe(25);
      expect(getBudgetPercentage(750, 1000)).toBe(75);
    });

    it('should return 0 when available is 0 or negative', () => {
      expect(getBudgetPercentage(100, 0)).toBe(0);
      expect(getBudgetPercentage(100, -100)).toBe(0);
    });

    it('should cap at 100% maximum', () => {
      expect(getBudgetPercentage(1500, 1000)).toBe(100);
    });

    it('should floor at 0% minimum', () => {
      expect(getBudgetPercentage(-500, 1000)).toBe(0);
    });

    it('should handle decimal percentages', () => {
      expect(getBudgetPercentage(333, 1000)).toBeCloseTo(33.3, 1);
    });
  });

  describe('getBudgetStatus', () => {
    it('should return warning for negative remaining', () => {
      const status = getBudgetStatus(-100, 1000);
      expect(status.color).toBe('red');
      expect(status.status).toBe('warning');
      expect(status.label).toBe('Over Budget');
    });

    it('should return green for >50% remaining', () => {
      const status = getBudgetStatus(600, 1000);
      expect(status.color).toBe('green');
      expect(status.status).toBe('good');
      expect(status.label).toBe('On Track');
    });

    it('should return yellow for 20-50% remaining', () => {
      const status = getBudgetStatus(400, 1000);
      expect(status.color).toBe('yellow');
      expect(status.status).toBe('caution');
      expect(status.label).toBe('Caution');
    });

    it('should return red for <20% remaining', () => {
      const status = getBudgetStatus(150, 1000);
      expect(status.color).toBe('red');
      expect(status.status).toBe('low');
      expect(status.label).toBe('Low Budget');
    });

    it('should handle boundary cases', () => {
      // Exactly 50%
      let status = getBudgetStatus(500, 1000);
      expect(status.color).toBe('yellow');

      // Exactly 20% - should be red because threshold is >20, not >=20
      status = getBudgetStatus(200, 1000);
      expect(status.color).toBe('red');

      // Just over 50%
      status = getBudgetStatus(501, 1000);
      expect(status.color).toBe('green');

      // Just under 20%
      status = getBudgetStatus(199, 1000);
      expect(status.color).toBe('red');
    });
  });

  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-100)).toBe('-$100.00');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(1234.567)).toBe('$1,234.57');
      expect(formatCurrency(1234.564)).toBe('$1,234.56');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(9999999.99)).toBe('$9,999,999.99');
    });
  });

  describe('parseCurrency', () => {
    it('should parse currency strings correctly', () => {
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
      expect(parseCurrency('$100.00')).toBe(100);
      expect(parseCurrency('$0.99')).toBe(0.99);
    });

    it('should handle negative values', () => {
      expect(parseCurrency('-$1,234.56')).toBe(-1234.56);
      expect(parseCurrency('-100')).toBe(-100);
    });

    it('should handle numbers without formatting', () => {
      expect(parseCurrency('1234.56')).toBe(1234.56);
      expect(parseCurrency('100')).toBe(100);
    });

    it('should return number as-is if already a number', () => {
      expect(parseCurrency(1234.56)).toBe(1234.56);
      expect(parseCurrency(0)).toBe(0);
    });

    it('should return 0 for invalid input', () => {
      expect(parseCurrency('invalid')).toBe(0);
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('abc')).toBe(0);
    });

    it('should handle various formats', () => {
      expect(parseCurrency('$1,234')).toBe(1234);
      expect(parseCurrency('1,234.56')).toBe(1234.56);
      expect(parseCurrency('$1234.56')).toBe(1234.56);
    });
  });

  describe('PAYMENT_METHODS constant', () => {
    it('should have all required payment methods', () => {
      expect(PAYMENT_METHODS).toEqual(['Amex', 'Chase Amazon', 'Savor', 'Checking']);
      expect(PAYMENT_METHODS).toHaveLength(4);
    });
  });

  describe('Integration: Full Budget Calculation Flow', () => {
    it('should match the documented test case exactly', () => {
      const params = {
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

      const paycheckResult = calculatePaycheckBudget(params);
      const checkingResult = calculateCheckingBudget(params);

      // Paycheck Budget: 882.14
      expect(paycheckResult.remainingBudget).toBeCloseTo(882.14, 2);

      // Checking Budget: 5582.14
      expect(checkingResult.projectedChecking).toBeCloseTo(5582.14, 2);
    });

    it('should handle override affecting both budget views', () => {
      const baseTransactions = [
        { paymentMethod: 'Amex', amount: 100 }
      ];

      const params = {
        startingCheckingBalance: 6000,
        paycheckAmount: 5000,
        checkingFloor: 4700,
        mortgageCarveout: 500,
        savingsAmount: 0,
        transactions: baseTransactions
      };

      // Without override
      const paycheck1 = calculatePaycheckBudget(params);
      const checking1 = calculateCheckingBudget(params);

      // With override
      const paramsWithOverride = {
        ...params,
        overrides: { 'Amex': 500 }
      };
      const paycheck2 = calculatePaycheckBudget(paramsWithOverride);
      const checking2 = calculateCheckingBudget(paramsWithOverride);

      // Override should decrease remaining by 400 (500 - 100)
      expect(paycheck2.remainingBudget).toBe(paycheck1.remainingBudget - 400);
      expect(checking2.projectedChecking).toBe(checking1.projectedChecking - 400);
    });
  });
});
