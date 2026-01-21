# CLAUDE.md — Family Budget App

## What This Is
A family budget app for Eric and Jessica. Replaces a Google Sheets workflow with a web app. Designed as a "living, breathing" budget that adapts to fluctuating income and expenses.

---

## User Flow & Navigation

### Primary View: Dashboard
The Dashboard is the **primary view** users see after login. It provides at-a-glance budget status and quick transaction entry. Users should spend 90% of their time here.

### Navigation Structure
```
┌─────────────────────────────────────────────────────────┐
│  Header: Family Budget                    [Settings ⚙️] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Dashboard]  [Pay Period]  [Income]                    │
│      ↑                                                  │
│   Primary                                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### User Journey
1. **First-time setup**: Income Settings → Create First Pay Period → Dashboard
2. **Daily use**: Dashboard (view budget, add transactions)
3. **Period transitions**: Dashboard → Start New Pay Period → Dashboard
4. **Adjustments**: Edit pay period or override card totals as needed

### Key Interactions
| Action | Location | Frequency |
|--------|----------|-----------|
| View remaining budget | Dashboard | Multiple daily |
| Add transaction | Dashboard (inline) | Multiple daily |
| Toggle budget view | Dashboard | Occasional |
| Override card total | Dashboard → Edit icon | Occasional |
| Edit pay period | Pay Period page | Per period |
| Start new period | Pay Period page | Every 2 weeks |
| Update income config | Income Settings | Rare |

---

## The Core Formula
```
Available Budget = (Checking Balance - $4,700) + Next Paycheck - Expenditures
```
- $4,700 is a fixed floor always kept in checking
- "Next Paycheck" = whichever arrives next (Eric biweekly OR Jessica monthly)
- If both paychecks fall in same week, combine them

## Two Budget Views (Both Required)
1. **Paycheck Budget**: `(Checking - $4,700) + Paycheck - Spending = Remaining` ← primary operating view
2. **Checking Budget**: `Checking + Paycheck - Spending = Projected Balance` ← actual balance, flows to next period

## Tech Stack
- React (Vite)
- Tailwind CSS
- Firebase Auth (Google Sign-In only)
- Firebase Firestore
- Deploy to Vercel

## Data Models

### PayPeriod
```javascript
{
  id: string,
  startDate: timestamp,
  endDate: timestamp,
  incomeSourceIds: string[],       // which income sources apply to this period
  paycheckAmount: number,          // total expected income (can be edited)
  startingCheckingBalance: number,
  mortgageCarveout: number,        // default 566.67
  savingsAmount: number,           // default 0
  // One-time income stored as subcollection or array
  oneTimeIncome: number,           // sum of all one-time income for this period
}
```

### Transaction
```javascript
{
  id: string,
  payPeriodId: string,
  amount: number,
  paymentMethod: "Amex" | "Chase Amazon" | "Savor" | "Checking",
  createdAt: timestamp,
}
```

### AccountOverride
```javascript
{
  id: string,
  payPeriodId: string,
  account: "Amex" | "Chase Amazon" | "Savor" | "Checking" | "Savings",
  overrideTotal: number,
}
```

### IncomeSource (collection — supports multiple income sources)
```javascript
{
  id: string,
  name: string,                    // "Eric", "Jessica", or custom name
  payAmount: number,
  cadence: "weekly" | "biweekly" | "semimonthly" | "monthly",
  nextPayDate: timestamp,          // next expected pay date
  // For semimonthly: store both pay days (e.g., 1st and 15th)
  semimonthlyDays: [number, number] | null,  // e.g., [1, 15] or [15, 30]
  isActive: boolean,               // can disable without deleting
  createdAt: timestamp,
}
```

### OneTimeIncome (collection — for bonuses, refunds, side income)
```javascript
{
  id: string,
  payPeriodId: string,             // which period to apply to
  amount: number,
  description: string,             // "Bonus", "Tax refund", etc.
  date: timestamp,
  createdAt: timestamp,
}
```

### AppConfig (single document)
```javascript
{
  checkingFloor: number,           // default 4700
}
```

---

## Flexibility & Customization

The budget is designed to be a "living, breathing" system. Real-life income and expenses fluctuate, and the app must accommodate this.

### Pay Cadence Options
Income sources support standard payroll frequencies:

| Cadence | Description | Example |
|---------|-------------|---------|
| **Weekly** | Every 7 days | Every Friday |
| **Biweekly** | Every 14 days | Every other Friday |
| **Semimonthly** | Twice per month on fixed dates | 1st and 15th |
| **Monthly** | Once per month on a fixed date | Last day of month |

Each income source can have a different cadence. The system auto-detects the next paycheck across all active sources.

### Multiple Income Sources
- Add unlimited income sources (Eric, Jessica, side gig, rental income, etc.)
- Each source has its own cadence and amount
- Sources can be deactivated without deletion
- System combines sources when multiple fall in same pay period

### One-Time Income
For irregular income that doesn't fit a recurring pattern:
- Bonuses
- Tax refunds
- Side job payments
- Gifts
- Reimbursements

One-time income is added directly to a specific pay period without affecting recurring income settings.

### Per-Period Flexibility
Each pay period can be customized independently from the global income settings:

| Field | Source | Editable Per-Period? |
|-------|--------|---------------------|
| Paycheck Amount | Defaults from IncomeSource | ✅ Yes — overtime, bonuses, reduced hours |
| Paycheck Source | Auto-detected | ✅ Yes — can switch or combine |
| Starting Balance | Previous period ending | ✅ Yes — sync with actual bank balance |
| Mortgage Carveout | Default $566.67 | ✅ Yes — varies by month |
| Savings Amount | Default $0 | ✅ Yes — adjust per period |
| One-Time Income | None | ✅ Yes — add bonus/refund/etc. |

### Income Override Scenarios
- **Overtime/bonus**: Edit paycheck amount OR add as one-time income
- **Reduced hours**: Lower paycheck amount without changing global settings
- **Combined paychecks**: When multiple sources paid same week, system auto-combines
- **Irregular income**: Add as one-time income with description

### Card Balance Overrides
Override calculated totals when reality differs from tracked transactions:
- **Refund received**: Override to lower total
- **Statement sync**: Match card total to actual statement balance
- **Untracked spending**: Override to include purchases not logged

**Override Behavior**:
1. When override is SET: Displayed total = override value
2. New transactions ADD to the override value
3. "Clear Override" reverts to sum of transactions

### Adjusting Mid-Period
Users can edit any pay period value at any time:
- Starting balance (if bank balance was different)
- Paycheck amount (if actual deposit differed)
- Mortgage/savings amounts

Changes recalculate remaining budget immediately.

---

## Calculations

```javascript
// Card total = sum of transactions OR override if set
function getCardTotal(transactions, override) {
  if (override !== null) return override;
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// Total income for period (regular + one-time)
totalIncome = paycheckAmount + oneTimeIncome

// Total spending across all payment methods
totalSpending = amexTotal + chaseAmazonTotal + savorTotal + checkingTotal

// Paycheck Budget view
availableBudget = (startingCheckingBalance - checkingFloor) + totalIncome
remainingBudget = availableBudget - mortgageCarveout - savingsAmount - totalSpending

// Checking Budget view
projectedChecking = startingCheckingBalance + totalIncome - mortgageCarveout - savingsAmount - totalSpending

// Next paycheck detection (across all active income sources)
function getNextPaycheck(incomeSources) {
  // For each active source, calculate next pay date based on cadence
  // Return the source(s) with the soonest date
  // If multiple sources within same week, flag for combining
}
```

### Test Case
- startingCheckingBalance: $6,483.35
- paycheckAmount: $5,000
- checkingFloor: $4,700
- mortgageCarveout: $566.67
- savingsAmount: $1
- Amex: $3,861.34
- Chase Amazon: $277.54
- Savor: $1,194.66
- Checking spending: $0

**Expected Paycheck Budget remaining**: $882.14
**Expected Checking Budget projected**: $5,582.14

## MVP Features

### 1. Dashboard
- Large remaining budget number (hero element)
- Visual gauge/thermometer showing % remaining
- Color: green (>50%), yellow (20-50%), red (<20%), warning state if negative
- Breakdown by payment method (Amex, Chase Amazon, Savor, Checking)
- Show mortgage carveout and savings
- Toggle between Paycheck Budget / Checking Budget views
- Display: "Day X of Y" in pay period, next paycheck date/source

### 2. Add Transaction
- Quick form: Amount + Payment Method dropdown
- Optimized for speed (used multiple times daily)
- Large touch targets for mobile

### 3. Manual Override
- Edit icon next to each card/account total
- Set override value that replaces calculated total
- New transactions ADD to override value
- Option to clear override

### 4. Pay Period Management
- "Start New Pay Period" button
- Auto-detect next paycheck (compare Eric vs Jessica dates)
- Pre-fill from previous period's ending Checking Budget balance
- Edit: paycheck amount, starting balance, mortgage carveout, savings

### 5. Income Settings
**Income Sources** (manage recurring income):
- Add/edit/remove income sources
- Per source: name, amount, cadence (weekly/biweekly/semimonthly/monthly), next pay date
- For semimonthly: specify both pay days (e.g., 1st and 15th)
- Toggle sources active/inactive

**One-Time Income** (accessible from Pay Period view):
- Add bonus, refund, or irregular income to current period
- Description field for tracking

**App Settings**:
- Checking floor (default $4,700)

### 6. Auth
- Google Sign-In only
- Single shared family login
- Stay logged in

## Project Structure
```
/src
  /components
    Dashboard.jsx
    AddTransaction.jsx
    BudgetGauge.jsx
    SpendingBreakdown.jsx
    PayPeriodManager.jsx
    ManualOverride.jsx
    IncomeSettings.jsx
  /contexts
    AuthContext.jsx
    BudgetContext.jsx
  /hooks
    usePayPeriod.js
    useTransactions.js
    useIncomeConfig.js
  /utils
    calculations.js      // ALL budget math here, keep testable
    dateHelpers.js
  /firebase
    config.js
    firestore.js
  App.jsx
  index.jsx
```

## Critical Requirements

1. **Math must be correct** — use the test case above to verify
2. **State must persist across navigation** — don't lose data when switching views
3. **Overrides must work correctly** — when set, new transactions add to override; when cleared, revert to sum of transactions
4. **Responsive design** — mobile-first, must work well on phone browser
5. **Both budget views must work** — toggle between Paycheck Budget and Checking Budget
6. **Per-period customization** — paycheck amounts, carveouts, and savings must be editable per period without affecting global settings
7. **Dashboard-centric design** — Dashboard is primary view; all other views are secondary configuration screens

## Out of Scope (Do Not Build)
- Spending categories
- Bank API integration (Plaid)
- Receipt scanning
- Analytics/trends
- Data import from spreadsheet
- Push notifications

## Common Pitfalls to Avoid
- Losing state on page navigation
- Breaking calculations when overrides are set then cleared
- Incorrect date calculation for different cadences (especially semimonthly edge cases)
- Not handling empty state (no pay period yet)
- Mutating global income source settings when user edits per-period paycheck amount
- Overwriting previous period's data when starting new period
- Not allowing users to easily adjust values mid-period
- Forgetting to include one-time income in budget calculations
- Semimonthly edge case: months with 28-31 days need careful handling for "end of month" pay dates
