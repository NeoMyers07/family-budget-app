# Budget App Session History
**Last Updated:** January 20, 2026

---

## Project Overview
Family Budget App for Eric and Jessica. React + Firebase (Firestore) + Tailwind CSS. Replaces a Google Sheets workflow.

**Core Formula:**
```
Available Budget = (Checking Balance - $4,700) + Paycheck Amount
Remaining Budget = Available Budget - Mortgage - Savings - Total Spending
```

**Live URL:** https://family-budget-sand.vercel.app
**GitHub:** https://github.com/NeoMyers07/family-budget-app

---

## Completed This Session (January 20, 2026 - Evening)

### 1. GitHub Repository Setup
- Authenticated with GitHub CLI (`gh auth login`)
- Created public repo: `NeoMyers07/family-budget-app`
- Pushed all project files to `master` branch

### 2. Vercel Deployment
- Installed Vercel CLI and authenticated
- Initial deployment failed (404) due to project structure
- Fixed by deploying directly from `family-budget/` subdirectory
- Created `vercel.json` for build configuration
- Final project: `family-budget` on Vercel

### 3. Firebase Environment Variables
- Added all 6 Firebase env vars to Vercel production:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- Fixed newline character issue in env vars (was causing auth iframe errors)

### 4. Google Sign-In Configuration
- Added `family-budget-sand.vercel.app` to Firebase authorized domains
- Added authorized JavaScript origins and redirect URIs in Google Cloud Console
- Google Sign-In now working in production

### 5. Cleanup
- Deleted old Vercel project (`family-budget-app`)
- Updated `.gitignore` to exclude `.vercel` folders

### 6. Access Restriction
- Implemented email whitelist to restrict app access
- Only authorized users can sign in:
  - `eabruce@gmail.com` (Eric)
  - `jbfinger@gmail.com` (Jessica)
- Unauthorized users see "Access denied" message and are signed out
- Modified files:
  - `src/contexts/AuthContext.jsx` - Added `ALLOWED_EMAILS` whitelist and validation
  - `src/components/Login.jsx` - Display auth errors from context

---

## Previous Session (January 20, 2026 - Earlier)

### 1. Fixed Date Picker Timezone Bug
- **Problem:** When editing pay period dates, selecting 1/21/2026 would save as 1/20/2026
- **Cause:** `new Date("YYYY-MM-DD")` parses as UTC midnight, which shifts back a day in US timezones
- **Solution:**
  - Added `parseDateFromInput()` function to `src/utils/dateHelpers.js`
  - Updated `PayPeriodManager.jsx` to use this function instead of `new Date()`
  - The function splits the date string and creates a local-time Date object

### 2. Fixed Transaction Delete Reactivity
- **Problem:** Deleting a transaction didn't update the budget total on Dashboard in real-time
- **Cause:** React wasn't properly detecting dependency changes in the budget calculation
- **Solution:**
  - Changed `getBudget` from `useCallback` to `useMemo` in `BudgetContext.jsx`
  - Made dependencies explicit: `[currentPayPeriod, transactions, overrides, budgetView, oneTimeIncomeItems, appConfig, incomeConfig]`
  - Budget now recalculates immediately when transactions change

### 3. Git Repository Setup
- Initialized git repository in `Budget_App` folder
- Updated `.gitignore` to exclude `.env` files
- Created `.env.example` with Firebase configuration template
- Created initial commit with all project files
- Configured git identity (Eric Bruce, eabruce@gmail.com)
- Installed GitHub CLI for pushing to remote

---

## Outstanding Issues

None currently identified.

---

## Key Files Modified This Session

| File | Changes |
|------|---------|
| `src/utils/dateHelpers.js` | Added `parseDateFromInput()` function |
| `src/components/PayPeriodManager.jsx` | Fixed date parsing to use local time |
| `src/contexts/BudgetContext.jsx` | Changed budget calc to `useMemo` for proper reactivity |
| `family-budget/.gitignore` | Added `.env` file exclusions |
| `family-budget/.env.example` | NEW - Firebase config template |

---

## Next Steps

1. Test the production app at https://family-budget-sand.vercel.app
2. Monitor for any issues with Firebase/Firestore in production
3. Consider adding a custom domain if desired

---

## Dev Server
- Running on `http://localhost:5173`
- Start command: `cd family-budget && npm run dev`

---

## Previous Work (January 19, 2026)

### Transaction List Feature
- Created `src/components/TransactionList.jsx` - full CRUD interface
- Added `/transactions` route and navigation link
- Tabs for each payment method, inline edit, delete with confirmation

### Edit Pay Period Dates
- Updated `PayPeriodManager.jsx` to allow editing start and end dates

### Firestore Subscription Fixes
- Fixed composite index issues with fallback queries
- Fixed unsubscribe pattern for proper subscription tracking

### Override Handling for Transaction CRUD
- `remove()` subtracts from override, `update()` adjusts override

### Budget Calculation Verification
- Confirmed calculations match expected values

---

## Previous Work (Earlier Sessions)
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
