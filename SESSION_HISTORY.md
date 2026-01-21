# Budget App Session History
**Last Updated:** January 19, 2026

---

## Project Overview
Family Budget App for Eric and Jessica. React + Firebase (Firestore) + Tailwind CSS. Replaces a Google Sheets workflow.

**Core Formula:**
```
Available Budget = (Checking Balance - $4,700) + Paycheck Amount
Remaining Budget = Available Budget - Mortgage - Savings - Total Spending
```

---

## Completed This Session

### 1. Transaction List Feature (NEW)
- Created `src/components/TransactionList.jsx` - full CRUD interface for transactions
- Added `/transactions` route to `App.jsx`
- Added "Transactions" link to navigation in `Layout.jsx`
- Features:
  - Tabs for each payment method (Amex, Chase Amazon, Savor, Checking)
  - Add transaction form
  - Inline edit with amount and payment method change
  - Delete with confirmation
  - Shows transaction count per account

### 2. Edit Pay Period Dates
- Updated `PayPeriodManager.jsx` to allow editing start and end dates
- Added `startDate` and `endDate` fields to the edit form

### 3. Firestore Subscription Fixes
- Fixed composite index issues in `src/firebase/firestore.js`
- `subscribeToTransactions` and `subscribeToOneTimeIncome` now have fallback queries
- When Firestore index is missing, falls back to query without `orderBy` and sorts client-side
- Fixed unsubscribe pattern to properly track which subscription is active

### 4. Override Handling for Transaction CRUD
- Updated `src/hooks/useTransactions.js`:
  - `remove()` now subtracts transaction amount from override (if set)
  - `update()` now adjusts override when amount or payment method changes
  - `add()` already added to override (was working)

### 5. Budget Calculation Verification
- Verified the calculation logic is correct
- User had a data entry discrepancy (Savor was $774.59 in app vs $705.03 in sheet)
- Once corrected, app matched expected $3,361.79

---

## Outstanding Issues

### Transaction Delete Not Updating Budget in Real-Time
- **Symptom:** When deleting a transaction, the budget total doesn't immediately recalculate
- **Status:** Partially addressed with subscription fixes, but may still have issues
- **Possible causes:**
  1. Firestore subscription not firing on delete
  2. React state not triggering re-render
  3. Override not being updated (fixed in useTransactions.js)
- **Next steps:** Add debug logging to trace the data flow, or test after a page refresh

---

## Key Files Modified

| File | Changes |
|------|---------|
| `src/firebase/firestore.js` | Fixed subscription fallback pattern for missing indexes |
| `src/hooks/useTransactions.js` | Added override handling for update/delete |
| `src/components/TransactionList.jsx` | NEW - Transaction list with CRUD |
| `src/components/PayPeriodManager.jsx` | Added date editing capability |
| `src/contexts/BudgetContext.jsx` | Added `updateTransaction` action |
| `src/App.jsx` | Added `/transactions` route |
| `src/components/Layout.jsx` | Added Transactions to navigation |

---

## Current App Values (as of session end)
- Checking Balance: $10,860.03
- Paycheck: $4,179.40
- Checking Floor: $4,700
- Mortgage Carveout: $566.67 (user's sheet uses $567)
- Savings: $850
- Amex: $4,705
- Chase Amazon: $150.61
- Savor: $705.03 (corrected from $774.59)
- **Remaining Budget:** $3,361.79

---

## Dev Server
- Running on `http://localhost:5173`
- Start command: `cd family-budget && npm run dev`
- Background task ID: `bd3a9e0`

---

## Previous Work (from earlier sessions)
- Flexible income sources (weekly, biweekly, semimonthly, monthly cadences)
- One-time income entries
- Income source CRUD in Settings
- Migration from hardcoded Eric/Jessica to flexible income sources
- `OneTimeIncomeManager` component
- Updated `dateHelpers.js` with cadence calculation functions

---

## Architecture Notes

### Payment Methods
`['Amex', 'Chase Amazon', 'Savor', 'Checking']`

### Firestore Collections
- `payPeriods` - Pay period documents
- `transactions` - Individual transactions (linked to payPeriod by `payPeriodId`)
- `accountOverrides` - Manual override values (replaces calculated totals)
- `incomeSources` - Flexible income sources (new model)
- `oneTimeIncome` - One-time income items per pay period
- `appConfig` - Global settings (checkingFloor)
- `incomeConfig` - Legacy income config (Eric/Jessica hardcoded)

### Override Behavior
- When an override is set for a payment method, it **replaces** the sum of transactions
- New transactions **add** to the override value
- Editing transactions should **adjust** the override
- Deleting transactions should **subtract** from the override
- Clearing override reverts to sum of transactions
