/**
 * Date Helper Functions for Pay Period Management
 */

/**
 * Get the next occurrence of a biweekly pay date from a reference date
 */
export function getNextBiweeklyPayDate(referenceDate, fromDate = new Date()) {
  const ref = new Date(referenceDate);
  const from = new Date(fromDate);

  // Set times to midnight for accurate day comparison
  ref.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);

  // If reference is in the future, return it
  if (ref >= from) {
    return ref;
  }

  // Calculate days since reference date
  const daysDiff = Math.floor((from - ref) / (1000 * 60 * 60 * 24));

  // Calculate how many 14-day cycles have passed
  const cyclesPassed = Math.floor(daysDiff / 14);

  // Calculate next pay date
  const nextPayDate = new Date(ref);
  nextPayDate.setDate(ref.getDate() + (cyclesPassed + 1) * 14);

  // If the calculated date is still in the past or today, add another cycle
  if (nextPayDate <= from) {
    nextPayDate.setDate(nextPayDate.getDate() + 14);
  }

  return nextPayDate;
}

/**
 * Get the next occurrence of a monthly pay date from a reference date
 */
export function getNextMonthlyPayDate(referenceDate, fromDate = new Date()) {
  const ref = new Date(referenceDate);
  const from = new Date(fromDate);

  // Set times to midnight
  ref.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);

  // If reference is in the future, return it
  if (ref >= from) {
    return ref;
  }

  // Get the day of month from reference
  const dayOfMonth = ref.getDate();

  // Start with the current month
  let nextPayDate = new Date(from.getFullYear(), from.getMonth(), dayOfMonth);

  // If the day has passed this month, move to next month
  if (nextPayDate <= from) {
    nextPayDate.setMonth(nextPayDate.getMonth() + 1);
  }

  // Handle months with fewer days
  while (nextPayDate.getDate() !== dayOfMonth) {
    // If the month doesn't have this day, use last day of month
    nextPayDate = new Date(nextPayDate.getFullYear(), nextPayDate.getMonth() + 1, 0);
  }

  return nextPayDate;
}

/**
 * Get the next occurrence of a weekly pay date from a reference date
 */
export function getNextWeeklyPayDate(referenceDate, fromDate = new Date()) {
  const ref = new Date(referenceDate);
  const from = new Date(fromDate);

  // Set times to midnight for accurate day comparison
  ref.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);

  // If reference is in the future, return it
  if (ref >= from) {
    return ref;
  }

  // Calculate days since reference date
  const daysDiff = Math.floor((from - ref) / (1000 * 60 * 60 * 24));

  // Calculate how many 7-day cycles have passed
  const cyclesPassed = Math.floor(daysDiff / 7);

  // Calculate next pay date
  const nextPayDate = new Date(ref);
  nextPayDate.setDate(ref.getDate() + (cyclesPassed + 1) * 7);

  // If the calculated date is still in the past or today, add another cycle
  if (nextPayDate <= from) {
    nextPayDate.setDate(nextPayDate.getDate() + 7);
  }

  return nextPayDate;
}

/**
 * Get the next occurrence of a semimonthly pay date
 * @param {number[]} semimonthlyDays - Array of two days [e.g., [1, 15] or [15, 30]]
 * @param {Date} fromDate - Date to calculate from
 */
export function getNextSemimonthlyPayDate(semimonthlyDays, fromDate = new Date()) {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

  const [day1, day2] = semimonthlyDays.sort((a, b) => a - b);
  const year = from.getFullYear();
  const month = from.getMonth();

  // Helper to get valid day for a month (handles months with fewer days)
  const getValidDay = (targetYear, targetMonth, targetDay) => {
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    return Math.min(targetDay, lastDayOfMonth);
  };

  // Check day1 of current month
  const validDay1 = getValidDay(year, month, day1);
  const date1 = new Date(year, month, validDay1);
  if (date1 > from) {
    return date1;
  }

  // Check day2 of current month
  const validDay2 = getValidDay(year, month, day2);
  const date2 = new Date(year, month, validDay2);
  if (date2 > from) {
    return date2;
  }

  // Move to day1 of next month
  const nextMonth = month + 1;
  const nextYear = nextMonth > 11 ? year + 1 : year;
  const normalizedMonth = nextMonth % 12;
  const validNextDay1 = getValidDay(nextYear, normalizedMonth, day1);
  return new Date(nextYear, normalizedMonth, validNextDay1);
}

/**
 * Get the next pay date for an income source based on its cadence
 * @param {Object} incomeSource - Income source with cadence, nextPayDate, semimonthlyDays
 * @param {Date} fromDate - Date to calculate from
 */
export function getNextPayDateByCadence(incomeSource, fromDate = new Date()) {
  const { cadence, nextPayDate, semimonthlyDays } = incomeSource;

  switch (cadence) {
    case 'weekly':
      return getNextWeeklyPayDate(nextPayDate, fromDate);
    case 'biweekly':
      return getNextBiweeklyPayDate(nextPayDate, fromDate);
    case 'semimonthly':
      return getNextSemimonthlyPayDate(semimonthlyDays || [1, 15], fromDate);
    case 'monthly':
      return getNextMonthlyPayDate(nextPayDate, fromDate);
    default:
      throw new Error(`Unknown cadence: ${cadence}`);
  }
}

/**
 * Get the next paycheck from multiple income sources
 * @param {Object[]} incomeSources - Array of income source objects
 * @param {Date} fromDate - Date to calculate from
 */
export function getNextPaycheckFromSources(incomeSources, fromDate = new Date()) {
  // Filter to active sources only
  const activeSources = incomeSources.filter(s => s.isActive);

  if (activeSources.length === 0) {
    return null;
  }

  // Calculate next pay date for each source
  const sourcePayDates = activeSources.map(source => {
    const nextDate = getNextPayDateByCadence(source, fromDate);
    return {
      source,
      nextDate
    };
  });

  // Sort by date ascending
  sourcePayDates.sort((a, b) => a.nextDate - b.nextDate);

  // Get earliest date
  const earliest = sourcePayDates[0];

  // Find all sources within 7 days of earliest (same-week logic)
  const sameWeekSources = sourcePayDates.filter(s => {
    const daysDiff = Math.abs((s.nextDate - earliest.nextDate) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  });

  // Combine if multiple in same week
  if (sameWeekSources.length > 1) {
    return {
      sources: sameWeekSources.map(s => s.source),
      sourceNames: sameWeekSources.map(s => s.source.name).join(' + '),
      amount: sameWeekSources.reduce((sum, s) => sum + s.source.payAmount, 0),
      date: earliest.nextDate,
      isCombined: true
    };
  }

  return {
    sources: [earliest.source],
    sourceNames: earliest.source.name,
    amount: earliest.source.payAmount,
    date: earliest.nextDate,
    isCombined: false
  };
}

/**
 * Calculate the end date for a pay period using income sources
 * End date is the day before the next paycheck
 * @param {Date} startDate - Start date of the pay period
 * @param {Object[]} incomeSources - Array of income source objects
 */
export function getPayPeriodEndDateFromSources(startDate, incomeSources) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Get next paycheck after start date (add 1 day to start to skip same-day paycheck)
  const dayAfterStart = new Date(start.getTime() + 86400000);
  const nextPay = getNextPaycheckFromSources(incomeSources, dayAfterStart);

  if (!nextPay) {
    // No active income sources, default to 14 days
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 13);
    return {
      endDate,
      nextPaycheckInfo: null
    };
  }

  // End date is one day before the next pay date
  const endDate = new Date(nextPay.date);
  endDate.setDate(endDate.getDate() - 1);

  return {
    endDate,
    nextPaycheckInfo: nextPay
  };
}

/**
 * Determine which paycheck comes next and if both fall in the same week
 */
export function getNextPaycheck(ericNextPayDate, jessicaNextPayDate, ericAmount, jessicaAmount) {
  const ericDate = new Date(ericNextPayDate);
  const jessicaDate = new Date(jessicaNextPayDate);

  ericDate.setHours(0, 0, 0, 0);
  jessicaDate.setHours(0, 0, 0, 0);

  // Check if both fall within the same week (7 days of each other)
  const daysDiff = Math.abs((ericDate - jessicaDate) / (1000 * 60 * 60 * 24));
  const sameWeek = daysDiff <= 7;

  if (sameWeek) {
    // If same week, combine them
    const earlierDate = ericDate <= jessicaDate ? ericDate : jessicaDate;
    return {
      source: 'Both',
      amount: ericAmount + jessicaAmount,
      date: earlierDate,
      ericDate,
      jessicaDate
    };
  }

  // Otherwise, return whichever comes first
  if (ericDate <= jessicaDate) {
    return {
      source: 'Eric',
      amount: ericAmount,
      date: ericDate,
      ericDate,
      jessicaDate
    };
  } else {
    return {
      source: 'Jessica',
      amount: jessicaAmount,
      date: jessicaDate,
      ericDate,
      jessicaDate
    };
  }
}

/**
 * Calculate the end date for a pay period
 * End date is the day before the next paycheck
 */
export function getPayPeriodEndDate(startDate, incomeConfig) {
  const { ericNextPayDate, jessicaNextPayDate, ericPayAmount, jessicaPayAmount } = incomeConfig;

  // Get next Eric and Jessica pay dates after the start date
  const nextEricPay = getNextBiweeklyPayDate(ericNextPayDate, startDate);
  const nextJessicaPay = getNextMonthlyPayDate(jessicaNextPayDate, startDate);

  // Skip if the pay date is the start date itself
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  let ericPayAfterStart = nextEricPay;
  let jessicaPayAfterStart = nextJessicaPay;

  if (ericPayAfterStart.getTime() === start.getTime()) {
    ericPayAfterStart = getNextBiweeklyPayDate(ericNextPayDate, new Date(start.getTime() + 86400000));
  }
  if (jessicaPayAfterStart.getTime() === start.getTime()) {
    jessicaPayAfterStart = getNextMonthlyPayDate(jessicaNextPayDate, new Date(start.getTime() + 86400000));
  }

  // Determine which comes first
  const nextPay = getNextPaycheck(ericPayAfterStart, jessicaPayAfterStart, ericPayAmount, jessicaPayAmount);

  // End date is one day before the next pay date
  const endDate = new Date(nextPay.date);
  endDate.setDate(endDate.getDate() - 1);

  return {
    endDate,
    nextPaycheckInfo: nextPay
  };
}

/**
 * Get the current day within a pay period
 */
export function getPayPeriodProgress(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const currentDay = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;

  return {
    currentDay: Math.max(1, Math.min(currentDay, totalDays)),
    totalDays,
    daysRemaining: Math.max(0, totalDays - currentDay + 1)
  };
}

/**
 * Format a date for display
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string from input field (YYYY-MM-DD) as local time
 * This avoids the timezone shift that occurs with new Date("YYYY-MM-DD")
 */
export function parseDateFromInput(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if a date is today
 */
export function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Get relative date string (e.g., "in 3 days", "yesterday")
 */
export function getRelativeDateString(date) {
  const d = new Date(date);
  const today = new Date();

  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((d - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
