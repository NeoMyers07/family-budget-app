# Family Budget App — Product Requirements Document

## Overview

A personal family budget web application that implements a unique budgeting methodology: tracking "available budget" as `(Checking Balance - $4,700 floor) + Next Paycheck`. The app replaces a manual Google Sheets workflow with a more streamlined experience for logging transactions, viewing budget status, and managing pay periods.

Designed as a **"living, breathing" budget** that adapts to fluctuating income and expenses in real life.

**Users**: Eric and Jessica (shared single login)
**Platform**: Responsive web app (mobile browser + desktop)
**Tech Stack**: React, Firebase (Auth + Firestore), hosted on Vercel

---

## User Flow & Navigation

### Information Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Family Budget                           [Settings ⚙️]  │
├─────────────────────────────────────────────────────────┤
│  [Dashboard]    [Pay Period]    [Income]                │
│      ↑                                                  │
│   PRIMARY                                               │
│   (90% of use)                                          │
└─────────────────────────────────────────────────────────┘
```

### User Journeys

**First-Time Setup**
1. Sign in with Google
2. Navigate to Income Settings → Add income sources (Eric, Jessica, etc.)
3. Navigate to Pay Period → Create first pay period
4. Return to Dashboard → Begin tracking

**Daily Use (Primary Flow)**
1. Open app → lands on Dashboard
2. View remaining budget at a glance
3. Add transaction (inline on Dashboard)
4. Repeat as needed throughout day

**Period Transition**
1. Pay period ends / paycheck received
2. Navigate to Pay Period → Start New Period
3. Verify/adjust pre-filled values
4. Return to Dashboard

**Mid-Period Adjustments**
1. From Dashboard → Edit pay period details
2. OR from Dashboard → Override card totals
3. OR from Pay Period → Add one-time income

### Interaction Frequency Matrix

| Action | Location | Frequency |
|--------|----------|-----------|
| View budget | Dashboard | Multiple daily |
| Add transaction | Dashboard | Multiple daily |
| Toggle budget view | Dashboard | Occasional |
| Override card total | Dashboard | As needed |
| Edit pay period | Pay Period | Per period |
| Add one-time income | Pay Period | Occasional |
| Start new period | Pay Period | Every 1-4 weeks |
| Manage income sources | Income Settings | Rare |

---

## Core Budgeting Concept

### The Formula
```
Available Budget = (Current Checking Balance - $4,700) + Next Paycheck Amount
```

- **$4,700** is a fixed floor — the minimum amount always kept in checking
- **Next Paycheck** is whichever paycheck arrives next chronologically (Eric's biweekly OR Jessica's monthly)
- Spending draws down from Available Budget throughout the pay period

### Two Budget Views

1. **Paycheck Budget** (primary operating view)
   - Shows: `(Checking - $4,700) + Next Paycheck - All Expenditures = Remaining Budget`
   - This is the "spendable" amount

2. **Checking Budget** (actual balance view)
   - Shows: `Checking Balance + Next Paycheck - All Expenditures = Projected Checking`
   - Used to verify actual account status
   - The ending value flows forward to seed the next pay period

---

## Data Model

### PayPeriod
```
{
  id: string,
  startDate: date,
  endDate: date,
  incomeSourceIds: string[],       // which sources apply to this period
  paycheckAmount: number,          // total expected income (editable per period)
  startingCheckingBalance: number,
  mortgageCarveout: number (default: 566.67),
  savingsAmount: number (default: 0),
  oneTimeIncome: number (default: 0),  // sum of one-time income for period
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Transaction
```
{
  id: string,
  payPeriodId: string,
  amount: number,
  paymentMethod: "Amex" | "Chase Amazon" | "Savor" | "Checking",
  createdAt: timestamp
}
```

### AccountOverride (for manual total adjustments)
```
{
  id: string,
  payPeriodId: string,
  accountType: "Amex" | "Chase Amazon" | "Savor" | "Checking" | "Savings",
  overrideTotal: number,
  updatedAt: timestamp
}
```

### IncomeSource (collection — supports multiple income sources)
```
{
  id: string,
  name: string,                    // "Eric", "Jessica", or custom
  payAmount: number,
  cadence: "weekly" | "biweekly" | "semimonthly" | "monthly",
  nextPayDate: date,
  semimonthlyDays: [number, number] | null,  // e.g., [1, 15] for semimonthly
  isActive: boolean,
  createdAt: timestamp
}
```

### OneTimeIncome (collection — for irregular income)
```
{
  id: string,
  payPeriodId: string,
  amount: number,
  description: string,             // "Bonus", "Tax refund", etc.
  date: date,
  createdAt: timestamp
}
```

### AppConfig (single document)
```
{
  checkingFloor: number (default: 4700)
}
```

### Pay Cadence Reference
| Cadence | Description | Date Calculation |
|---------|-------------|------------------|
| weekly | Every 7 days | nextPayDate + 7 days |
| biweekly | Every 14 days | nextPayDate + 14 days |
| semimonthly | Twice per month | Uses semimonthlyDays array (e.g., 1st & 15th) |
| monthly | Once per month | Same day each month |

---

## Features (MVP)

### 1. Dashboard / Home Screen
**Purpose**: At-a-glance budget status

**Display**:
- **Remaining Budget** (large, prominent number)
  - Visual indicator: thermometer/gauge showing % remaining
  - Color coding: green (>50%), yellow (20-50%), red (<20%), flashing/warning if negative
- **Spending breakdown** by payment method:
  - Amex: $X
  - Chase Amazon: $X
  - Savor: $X
  - Checking: $X
- **Carve-outs**:
  - Mortgage: $566.67
  - Savings: $X
- **Pay period info**: 
  - Current period dates
  - "Day X of Y" indicator
  - Next paycheck: [source] on [date]

**Toggle**: Switch between Paycheck Budget view and Checking Budget view

### 2. Add Transaction
**Purpose**: Quick entry of purchases

**Interface**: 
- Simple form or modal
- Fields:
  - Amount (number input, required)
  - Payment Method (dropdown: Amex, Chase Amazon, Savor, Checking — required)
- Submit adds to current pay period
- After submit, return to dashboard with updated totals

**UX Notes**:
- Should be fast — optimized for frequent use (multiple times daily)
- Consider large touch targets for mobile use

### 3. Manual Total Adjustment
**Purpose**: Override calculated totals when needed (refunds, corrections, syncing to actual balances)

**Interface**:
- Accessible from dashboard (edit icon next to each total)
- For each payment method + Savings:
  - Show current calculated total
  - Allow entering an override value
  - Override replaces calculated total until cleared or new transactions added

**Behavior**:
- When override is set, display shows override value
- New transactions ADD to the override value
- Option to "clear override" to revert to transaction-based calculation

### 4. Pay Period Management

#### Create New Pay Period
**Trigger**: Manual action (button: "Start New Pay Period")

**Flow**:
1. Auto-detect next paycheck (whichever of Eric/Jessica is sooner)
2. Pre-fill:
   - Paycheck source and amount (from income config)
   - Starting checking balance (from previous period's ending Checking Budget)
   - Mortgage carve-out (default $566.67)
   - Savings (default $0)
3. Allow editing all pre-filled values
4. Create period, navigate to dashboard

**Edge case**: When both Eric and Jessica are paid in the same week, allow combining paycheck amounts into a single period

#### View/Edit Current Period
- Edit paycheck amount (if it differs from usual)
- Edit starting checking balance
- Edit mortgage carve-out
- Edit savings amount

#### Period History
- List of past pay periods
- Tap to view summary (read-only for now)
- Low priority for MVP — can be minimal

### 5. Income Settings
**Purpose**: Configure recurring income sources and app settings

**Income Sources Management**:
- View list of all income sources (active and inactive)
- Add new income source with:
  - Name (e.g., "Eric", "Jessica", "Side Gig")
  - Pay amount
  - Cadence: weekly, biweekly, semimonthly, or monthly
  - Next pay date
  - For semimonthly: specify both pay days (e.g., 1st and 15th)
- Edit existing income sources
- Toggle sources active/inactive (inactive sources won't trigger new periods)
- Delete income sources (with confirmation)

**One-Time Income** (accessible from Pay Period detail):
- Add one-time income to current period
- Fields: Amount, Description (e.g., "Bonus", "Tax Refund", "Gift")
- Shows in period summary
- Included in budget calculations

**App Settings**:
- Checking floor amount (default $4,700, editable)

### 6. Authentication
- Google Sign-In only
- Single shared account for the family
- Minimal friction — stay logged in on device

---

## Calculations

### Per-Period Totals
```javascript
// For each payment method
cardTotal = sum(transactions where paymentMethod === card)
            OR accountOverride if set

totalSpending = amexTotal + chaseAmazonTotal + savorTotal + checkingTotal

// Total income = regular paycheck + one-time income
totalIncome = paycheckAmount + oneTimeIncome

// Paycheck Budget View
availableBudget = (startingCheckingBalance - checkingFloor) + totalIncome
remainingBudget = availableBudget - mortgageCarveout - savingsAmount - totalSpending

// Checking Budget View
projectedChecking = startingCheckingBalance + totalIncome - mortgageCarveout - savingsAmount - totalSpending
```

### Next Paycheck Detection
```javascript
// For each ACTIVE income source:
//   Calculate next pay date based on cadence:
//   - weekly: nextPayDate + 7 days (if past, keep adding until future)
//   - biweekly: nextPayDate + 14 days (if past, keep adding until future)
//   - semimonthly: find next occurrence from semimonthlyDays array
//   - monthly: same day next month

// Return the source(s) with soonest date
// If multiple sources within same week, flag for potential combining

function getNextPayDate(source) {
  const today = new Date();
  let nextDate = source.nextPayDate;

  switch(source.cadence) {
    case 'weekly':
      while (nextDate <= today) nextDate.addDays(7);
      break;
    case 'biweekly':
      while (nextDate <= today) nextDate.addDays(14);
      break;
    case 'semimonthly':
      // Find next occurrence from semimonthlyDays
      break;
    case 'monthly':
      while (nextDate <= today) nextDate.addMonths(1);
      break;
  }
  return nextDate;
}
```

---

## Flexibility & Customization

The app is designed as a "living, breathing" budget. Real-world income and expenses fluctuate, and the app must adapt.

### Per-Period Customization
Each pay period can be customized independently without affecting global settings:

| Field | Default Source | Editable? | Use Case |
|-------|---------------|-----------|----------|
| Paycheck Amount | Sum of applicable income sources | ✅ | Overtime, reduced hours |
| Income Sources | Auto-detected from schedule | ✅ | Add/remove sources for period |
| Starting Balance | Previous period ending | ✅ | Sync with actual bank balance |
| Mortgage Carveout | $566.67 | ✅ | Varies by month |
| Savings Amount | $0 | ✅ | Save more/less this period |
| One-Time Income | $0 | ✅ | Bonuses, refunds, gifts |

### One-Time Income Scenarios
- **Bonus**: Add to current pay period
- **Tax refund**: Add when received
- **Side job payment**: One-time gig income
- **Reimbursement**: Work expense repayment
- **Gift**: Birthday/holiday money

### Card Override Scenarios
- **Refund received**: Lower total without adding negative transaction
- **Statement sync**: Match to actual card balance
- **Untracked purchases**: Account for spending not logged

### Cadence Flexibility
Income sources can use any standard payroll cadence:
- **Weekly**: Service industry, hourly workers
- **Biweekly**: Most common (every other week)
- **Semimonthly**: Fixed dates like 1st and 15th
- **Monthly**: Salaried positions, contractors

---

## UI/UX Requirements

### Responsive Design
- **Mobile-first**: Primary use case is checking/updating on phone
- **Desktop-friendly**: Should work well in browser too
- Breakpoints: mobile (<768px), desktop (≥768px)

### Visual Design
- Clean, minimal interface
- Clear visual hierarchy — remaining budget is the hero
- Budget gauge/thermometer should be immediately readable
- Color coding for budget health (green/yellow/red)
- Warning state when budget goes negative

### Performance
- Fast load times
- Optimistic UI updates when adding transactions
- Offline support not required for MVP

---

## Technical Architecture

### Frontend
- **Framework**: React (Create React App or Vite)
- **Styling**: Tailwind CSS or CSS Modules
- **State Management**: React Context or Zustand (keep simple)
- **Routing**: React Router

### Backend / Database
- **Firebase Firestore**: Document database for all data
- **Firebase Auth**: Google Sign-In
- **No separate backend server needed** — Firestore handles persistence

### Hosting
- **Vercel**: Deploy from GitHub repo
- Environment variables for Firebase config

### Project Structure
```
/src
  /components
    Dashboard.jsx
    AddTransaction.jsx
    BudgetGauge.jsx
    SpendingBreakdown.jsx
    PayPeriodManager.jsx
    ManualOverride.jsx
  /contexts
    AuthContext.jsx
    BudgetContext.jsx
  /hooks
    usePayPeriod.js
    useTransactions.js
    useIncomeConfig.js
  /utils
    calculations.js
    dateHelpers.js
  /firebase
    config.js
    firestore.js
  App.jsx
  index.jsx
```

---

## Out of Scope (Future Phases)

These features are explicitly NOT part of MVP but may be added later:

1. **Spending categories** — tagging transactions by type (groceries, dining, etc.)
2. **Bank/card API integration** — Plaid or similar for automatic transaction import
3. **Receipt scanning** — photo/email receipt parsing
4. **Historical trends & analytics** — month-over-month comparisons, charts
5. **Data migration** — importing historical data from Google Sheets
6. **Multiple budgets/accounts** — only one family budget for now
7. **Notifications/alerts** — push notifications when budget is low

---

## Success Criteria

The MVP is successful if:

1. **Calculations are correct** — the budget math works accurately across all views
2. **Data persists reliably** — transactions and periods save correctly, survive refresh/reload
3. **Consistency across pages** — navigation between views maintains state correctly
4. **Usable on mobile** — can easily add transactions from phone browser
5. **Faster than spreadsheet** — less friction to log a purchase than opening Google Sheets

---

## Implementation Notes for Claude Code

### Priority Order
1. Set up Firebase project and authentication
2. Implement data model and Firestore operations (including new IncomeSource model)
3. Build calculation utilities with tests (including cadence calculations)
4. Create Dashboard with both budget views
5. Add Transaction flow
6. Pay Period creation and management (with one-time income support)
7. Manual override functionality
8. Income settings (with multiple sources and cadence options)
9. Visual polish (gauge, colors, responsive tweaks)

### Testing the Math
The calculation logic is critical. Test with these scenarios:

**Basic calculation:**
- Starting checking: $6,483.35, Paycheck: $5,000, Floor: $4,700
  - Available budget should be: ($6,483.35 - $4,700) + $5,000 = $6,783.35
- After spending $3,861.34 on Amex, $277.54 on Chase, $1,194.66 on Savor, $566.67 mortgage, $1 savings
  - Remaining should be: $6,783.35 - $3,861.34 - $277.54 - $1,194.66 - $566.67 - $1 = $882.14

**With one-time income:**
- Same as above + $500 bonus
  - Available budget: $6,783.35 + $500 = $7,283.35
  - Remaining: $882.14 + $500 = $1,382.14

**Cadence calculations:**
- Weekly: If nextPayDate is Jan 1 (Wed), next dates are Jan 8, Jan 15, etc.
- Biweekly: If nextPayDate is Jan 1, next dates are Jan 15, Jan 29, etc.
- Semimonthly [1, 15]: In January, pay dates are Jan 1 and Jan 15
- Monthly: If nextPayDate is Jan 15, next is Feb 15, Mar 15, etc.

### Common Pitfalls to Avoid
- Don't lose state on page navigation
- Don't break calculations when overrides are set then cleared
- Handle the case where there's no current pay period gracefully
- Make sure the "next paycheck" logic correctly handles ALL cadence types
- Don't mutate global IncomeSource when editing per-period paycheck amount
- Semimonthly edge case: Handle months with different day counts (28-31)
- Don't forget to include one-time income in budget calculations
- When combining multiple income sources in one period, sum all applicable amounts
