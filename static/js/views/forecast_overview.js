import { appState, getSettings, getYearData, getMonthData, months, isMultiUserEnabled, getActiveUser, isAccountIncludedInNet, getCurrentPeriodMonthAndYear } from '../state.js';
import { calculateMonthSchedule, calculateLiveDailyPacing, detectCurrentMonthAndWeek, calculateMonthForecast } from '../calculations.js';
import { showModal, closeModal } from './modals.js';
import { saveBudget } from '../api.js';

// =========================================================
// 1. EXTENSIVE FORECAST OVERVIEW TILES CATALOGUE
// =========================================================

export const FORECAST_OVERVIEW_TILES = [
  {
    id: 'projected_net_worth',
    type: 'kpi',
    title: 'Projected Net Worth',
    category: 'Financial Position',
    icon: '💎',
    desc: 'Forecasted month-end net holdings (Current + Savings - Credit Debt)',
    explanation: 'Projected Net Worth represents your total estimated financial position at the end of the monthly pay cycle. It consolidates all funds in current operating accounts, plus all savings reserves, minus all outstanding credit card debt.',
    formula: 'Current Accounts + Savings Accounts - Credit Card Debt',
    tip: 'Compare this with your starting net worth. A positive increase confirms your household is accumulating wealth this month.',
    target: 'month',
    defaultVisible: true
  },
  {
    id: 'operating_cash',
    type: 'kpi',
    title: 'Current Operating Cash',
    category: 'Financial Position',
    icon: '🏦',
    desc: 'Forecasted month-end closing cash balance in current operating accounts',
    explanation: 'Operating cash measures liquidity in your day-to-day accounts. It factors in opening funds plus salary and incoming payments, minus all clearing direct debits, weekly living allowances, and credit card auto-pays.',
    formula: 'Opening Current + Inflows - Direct Debits - Weekly Spend - Auto-Pays',
    tip: 'Ensure this remains safely positive. If tight, consider bumping non-essential bills or trimming discretionary budgets.',
    target: 'month',
    defaultVisible: true
  },
  {
    id: 'credit_runway',
    type: 'kpi',
    title: 'Credit Runway & Debt',
    category: 'Credit & Debt',
    icon: '💳',
    desc: 'Month-end credit card liability, total limit, and utilization ratio',
    explanation: 'Monitors your total revolving credit card debt and shows what percentage of your credit limit is projected to be utilized by the end of the monthly pay cycle.',
    formula: '(Projected Credit Debt ÷ Total Credit Limit) × 100',
    tip: 'Aim to keep overall credit utilization below 30% to protect credit scores and avoid excessive interest burdens.',
    target: 'month',
    defaultVisible: true
  },
  {
    id: 'savings_portfolio',
    type: 'kpi',
    title: 'Savings Portfolio & Growth',
    category: 'Savings & Growth',
    icon: '📈',
    desc: 'Projected month-end savings total and net monthly savings accumulation',
    explanation: 'Tracks your total accumulated savings reserves and displays the net funds being deposited this cycle via scheduled savings transfers and salary deductions.',
    formula: 'Starting Savings + Monthly Savings Inflows + Salary Deductions to Savings',
    tip: 'Automate savings transfers on payday so they happen automatically before discretionary spending begins.',
    target: 'month',
    defaultVisible: true
  },
  {
    id: 'safe_to_spend',
    type: 'kpi',
    title: 'Safe-to-Spend Daily Pace',
    category: 'Pacing & Allowance',
    icon: '🎯',
    desc: 'Daily safe-to-spend allowance remaining for the active week',
    explanation: 'Safe-to-Spend calculates your daily discretionary spending limit for the remainder of the current week without compromising scheduled bills or month-end targets.',
    formula: 'Remaining Weekly Discretionary Budget ÷ Remaining Days in Week',
    tip: 'Keeping daily living spending under this number ensures you finish the week with a surplus.',
    target: 'active_week',
    defaultVisible: true
  },
  {
    id: 'spendable_cash_remaining',
    type: 'kpi',
    title: 'Spendable Cash Remaining',
    category: 'Pacing & Allowance',
    icon: '💳',
    desc: 'Spendable cash left this week after reserving funds for remaining bills',
    explanation: 'Calculates whether you are already overspent or still have cash left to spend before Sunday. It compares your live bank balance today to your Sunday closing target, after accounting for unpaid bills.',
    formula: '(Live Balance Today - Sunday Target) - Remaining Unpaid Bills + Remaining Inflows',
    tip: 'Switch between "Holding Today\'s Bills" (safest if today\'s direct debits haven\'t left your bank) and "Future Bills Only" (if your bank already deducted today\'s bills).',
    target: 'active_week',
    defaultVisible: true
  },
  {
    id: 'actual_variance',
    type: 'kpi',
    title: 'Sunday Target (Raw)',
    category: 'Variances & Health',
    icon: '🎯',
    desc: 'Live net balance vs closing target for Sunday (before unpaid bills)',
    explanation: 'Measures your current raw cash position against your Sunday closing target without deducting unpaid mid-week bills. For your true spendable cash after holding unpaid bills, see Spendable Cash Remaining.',
    formula: 'Actual Net Balance Today - Sunday Closing Target',
    tip: 'Review your Sunday Target to ensure you have enough funds to cover remaining weekend spending.',
    target: 'active_week',
    defaultVisible: true
  },
  {
    id: 'daily_variance',
    type: 'kpi',
    title: 'Live Daily Variance',
    category: 'Variances & Health',
    icon: '⚡',
    desc: 'Intra-week live variance against today’s paced spending target',
    explanation: 'Calculated in real-time when Open Banking is active. It breaks down the week day-by-day, adds back upcoming bills that have not yet cleared, and compares your live bank balance to where it should be today.',
    formula: 'Actual Net Today - Paced Target Net Today',
    tip: 'Provides an early alert if spending pace is running too fast before the week concludes.',
    target: 'active_week',
    defaultVisible: true
  },
  {
    id: 'weekly_budget',
    type: 'kpi',
    title: 'Active Week Discretionary',
    category: 'Pacing & Allowance',
    icon: '🛒',
    desc: 'Planned living & grocery budget for the active week with spent to date',
    explanation: 'Focuses on the active week’s flexible spending allowance (groceries, leisure, transport) separate from fixed bills and commitments.',
    formula: 'Total Weekly Discretionary Budget - Discretionary Spend to Date',
    tip: 'Focusing on your weekly allowance is the easiest way to keep your entire month on track.',
    target: 'active_week',
    defaultVisible: false
  },
  {
    id: 'monthly_burn_rate',
    type: 'kpi',
    title: 'Daily Cost / Burn Rate',
    category: 'Financial Health',
    icon: '🔥',
    desc: 'Average daily cost of living across all bills, spend, and debt payments',
    explanation: 'Indicates how much money flows out of your household per day on average to cover direct debits, planned weekly allowances, and auto-pays.',
    formula: '(Total Direct Debits + Total Monthly Discretionary + Auto-Pays) ÷ Total Cycle Days',
    tip: 'Knowing your daily burn rate helps you evaluate subscription services and major lifestyle changes.',
    target: 'month',
    defaultVisible: false
  },
  {
    id: 'fixed_bills_ratio',
    type: 'kpi',
    title: 'Fixed Bills Ratio',
    category: 'Financial Health',
    icon: '📊',
    desc: 'Committed direct debits & subscriptions as a percentage of total income',
    explanation: 'Shows what fraction of your total household income is committed to fixed bills (rent, mortgage, council tax, utilities, subscriptions) before flexible spending.',
    formula: '(Total Direct Debits ÷ Total Inflows) × 100',
    tip: 'Under the 50/30/20 guideline, keeping fixed essentials at or below 50% provides optimal flexibility.',
    target: 'bills',
    defaultVisible: false
  },
  {
    id: 'emergency_runway',
    type: 'kpi',
    title: 'Emergency Runway',
    category: 'Financial Health',
    icon: '🛡️',
    desc: 'Liquid reserves expressed in months of essential living expenses',
    explanation: 'Calculates how many months your household could survive on existing liquid current cash and savings reserves without any new income.',
    formula: '(Current Cash + Savings Reserves) ÷ (Monthly Bills + Monthly Living Spend)',
    tip: 'Financial experts recommend a runway of 3 to 6 months of living expenses for financial resilience.',
    target: 'month',
    defaultVisible: false
  },
  {
    id: 'autopay_impact',
    type: 'kpi',
    title: 'Credit Card Auto-Pay Impact',
    category: 'Credit & Debt',
    icon: '💳',
    desc: 'Total credit card debt scheduled to clear via automated bank transfers',
    explanation: 'Sums all automated credit card clearing payments scheduled to debit your current accounts during this pay cycle to pay down credit card balances.',
    formula: 'Sum of full and fixed credit card auto-pays scheduled this month',
    tip: 'Auto-paying credit cards in full avoids expensive APR interest charges.',
    target: 'month',
    defaultVisible: false
  },
  {
    id: 'savings_rate',
    type: 'kpi',
    title: 'Forecast Savings Rate',
    category: 'Savings & Growth',
    icon: '💰',
    desc: 'Projected monthly net surplus expressed as a percentage of income',
    explanation: 'Measures what percentage of your total income will remain unspent at the end of the monthly pay cycle to build wealth or savings.',
    formula: '(Projected Monthly Surplus ÷ Total Inflow) × 100',
    tip: 'Aiming for a 15% to 20% savings rate accelerates long-term financial independence.',
    target: 'year',
    defaultVisible: false
  },
  {
    id: 'cycle_velocity',
    type: 'kpi',
    title: 'Payday Cycle Velocity',
    category: 'Pacing & Allowance',
    icon: '⏳',
    desc: 'Comparison of days elapsed in cycle vs percentage of budget spent',
    explanation: 'Compares the passage of time against financial outflow. If 50% of days have elapsed but only 40% of budget is spent, your spending velocity is healthy.',
    formula: 'Elapsed Days % vs Estimated Discretionary Outflow %',
    tip: 'Keep your budget spend percentage lower than or equal to the elapsed days percentage.',
    target: 'active_week',
    defaultVisible: false
  },
  {
    id: 'week_spotlight',
    type: 'section',
    title: 'Active Week Spotlight',
    category: 'Detailed Breakdown',
    icon: '🔦',
    desc: 'Deep-dive into active week spend, planned bills, remaining bills, and closing net',
    explanation: 'Detailed panel showing the active week budget, total scheduled bills, remaining bills yet to clear, expected income, and closing balance.',
    formula: 'Remaining Bills = Total Scheduled Bills - Cleared Bills',
    tip: 'Monitor Remaining Bills throughout the week to see exactly how much cash is still committed to upcoming bills before Sunday.',
    target: 'active_week',
    defaultVisible: true
  },
  {
    id: 'week_runway',
    type: 'section',
    title: 'Weekly Cashflow Runway',
    category: 'Detailed Breakdown',
    icon: '📅',
    desc: 'Multi-week cards showing planned spend, scheduled bills, and closing net',
    explanation: 'Provides a week-by-week chronological overview of the entire monthly pay cycle with swipeable cards.',
    formula: 'Sequential weekly cashflow roll-forward model',
    tip: 'Swipe horizontally on mobile to review cash positions for upcoming weeks.',
    target: 'month',
    defaultVisible: true
  },
  {
    id: 'cashflow_architecture',
    type: 'section',
    title: 'Cashflow Architecture',
    category: 'Detailed Breakdown',
    icon: '🍰',
    desc: 'Multi-segment distribution: Fixed Bills vs Discretionary vs Surplus',
    explanation: 'Visual breakdown showing where every pound of monthly income is allocated between fixed commitments, living spend, and surplus.',
    formula: 'Inflows = Fixed Bills + Weekly Discretionary + Auto-Pay + Net Surplus',
    tip: 'A healthy cashflow architecture has a visible green surplus bar every month.',
    target: 'month',
    defaultVisible: true
  },
  {
    id: 'upcoming_bills',
    type: 'section',
    title: 'Upcoming 14-Day Bills',
    category: 'Detailed Breakdown',
    icon: '🔔',
    desc: 'Countdown list of upcoming scheduled direct debits and subscriptions',
    explanation: 'Chronological list of all direct debits and recurring subscriptions due to debit your accounts within the next 14 days.',
    formula: 'Bills filtered by payment due date between today and +14 days',
    tip: 'Ensure your current account has adequate funds before due dates to avoid overdrafts.',
    target: 'bills',
    defaultVisible: true
  },
  {
    id: 'forward_horizon',
    type: 'section',
    title: '3-Month Forward Outlook',
    category: 'Detailed Breakdown',
    icon: '🔭',
    desc: '3-Month comparison across current month and next two months',
    explanation: 'Projects cashflow into future months, helping you anticipate upcoming large bills, holiday expenses, or surplus accumulations.',
    formula: 'Forward month-by-month forecasting engine',
    tip: 'Click any month card to view its full details and prepare ahead of time.',
    target: 'year',
    defaultVisible: true
  }
];

// =========================================================
// 2. TILE CONFIGURATION RESOLUTION & PREFERENCES
// =========================================================

export function getOverviewTileConfig() {
  const cfg = getSettings();
  const allTileIds = FORECAST_OVERVIEW_TILES.map(t => t.id);

  let allOrder = cfg.all_overview_tile_order;
  if (!allOrder || !Array.isArray(allOrder) || allOrder.length === 0) {
    try {
      const local = localStorage.getItem('habit_overview_tile_order');
      if (local) allOrder = JSON.parse(local);
    } catch (e) {}
  }

  if (!allOrder || !Array.isArray(allOrder) || allOrder.length === 0) {
    allOrder = [...allTileIds];
  } else {
    const missing = allTileIds.filter(id => !allOrder.includes(id));
    if (missing.length > 0) {
      allOrder = [...allOrder, ...missing];
    }
  }

  let visibleTiles = cfg.overview_tiles;
  if (!visibleTiles || !Array.isArray(visibleTiles) || visibleTiles.length === 0) {
    try {
      const local = localStorage.getItem('habit_overview_tiles');
      if (local) visibleTiles = JSON.parse(local);
    } catch (e) {}
  }

  const missing = allTileIds.filter(id => !allOrder.includes(id));
  if (!visibleTiles || !Array.isArray(visibleTiles) || visibleTiles.length === 0) {
    visibleTiles = FORECAST_OVERVIEW_TILES.filter(t => t.defaultVisible).map(t => t.id);
  } else {
    // If a brand-new tile with defaultVisible: true was added to FORECAST_OVERVIEW_TILES, include it
    const newDefaultVis = allTileIds.filter(id => {
      const def = FORECAST_OVERVIEW_TILES.find(t => t.id === id);
      return def && def.defaultVisible && !visibleTiles.includes(id) && missing.includes(id);
    });
    if (newDefaultVis.length > 0) {
      visibleTiles = [...visibleTiles, ...newDefaultVis];
    }
  }

  let expandedTiles = cfg.expanded_overview_tiles;
  if (!expandedTiles || !Array.isArray(expandedTiles)) {
    try {
      const local = localStorage.getItem('habit_overview_expanded_tiles');
      if (local) expandedTiles = JSON.parse(local);
    } catch (e) {}
  }
  if (!expandedTiles || !Array.isArray(expandedTiles)) {
    expandedTiles = [];
  }

  return { allOrder, visibleTiles, expandedTiles };
}

export async function saveOverviewTilePreferences(cfg) {
  try {
    localStorage.setItem('habit_overview_tiles', JSON.stringify(cfg.overview_tiles));
    localStorage.setItem('habit_overview_tile_order', JSON.stringify(cfg.all_overview_tile_order));
    localStorage.setItem('habit_overview_expanded_tiles', JSON.stringify(cfg.expanded_overview_tiles || []));
  } catch (e) {}

  if (typeof saveBudget === 'function' && appState.data) {
    try {
      await saveBudget(appState.data);
    } catch (e) {
      console.warn("Error saving budget state:", e);
    }
  }
}

// Track flipped cards
const flippedTileIds = new Set();

// Long press variables
let longPressTimer = null;
let isLongPressTriggered = false;
let pointerStartX = 0;
let pointerStartY = 0;

// Drag and drop tracking
let draggedTileId = null;
let touchDragTileId = null;
let touchGhostEl = null;
let touchLastTargetTileId = null;

// =========================================================
// 3. MAIN RENDER FUNCTION & HELPERS
// =========================================================

export function resolveOccDateStr(item, monthName = '', year = 0) {
  if (item.actualPaymentDate) {
    if (typeof item.actualPaymentDate === 'string') return item.actualPaymentDate.slice(0, 10);
    if (item.actualPaymentDate instanceof Date && !isNaN(item.actualPaymentDate)) {
      const y = item.actualPaymentDate.getFullYear();
      const m = String(item.actualPaymentDate.getMonth() + 1).padStart(2, '0');
      const d = String(item.actualPaymentDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (item.exact_date) return String(item.exact_date).slice(0, 10);
  if (item.due_day && monthName) {
    const mIdx = months.indexOf(monthName);
    if (mIdx >= 0) {
      const y = year || new Date().getFullYear();
      const m = String(mIdx + 1).padStart(2, '0');
      const d = String(item.due_day).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return '';
}

export function renderForecastOverviewView(container) {
  const cfg = getSettings();
  const curr = cfg.currency || '£';
  const currentPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: new Date().getFullYear(), monthIdx: new Date().getMonth(), month: months[new Date().getMonth()] };
  const currentYear = currentPeriod.year;
  const currentMonthName = currentPeriod.month;
  appState.currentYear = currentYear;
  const isMulti = isMultiUserEnabled();
  const activeUser = isMulti ? getActiveUser() : 'Joint';
  const globalEditMode = Boolean(appState.globalEditMode);

  // Calculate full forecast for current month
  const forecast = (typeof calculateMonthForecast === 'function')
    ? calculateMonthForecast(currentMonthName, currentYear)
    : null;

  if (!forecast) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">Loading forecasting data...</div>';
    return;
  }

  const {
    schedule,
    weeklyPredictions,
    projectedMonthEndCurrent,
    projectedMonthEndCredit,
    projectedMonthEndSavings,
    projectedMonthEndNet,
    totalCurrentOpening,
    totalCurrentInflow,
    totalDD,
    totalWeeklySpend,
    totalWeeklyCurrentSpend,
    totalCreditOpeningSpent,
    totalCreditLimit,
    totalSavingsOpening,
    totalSalarySavingsIn,
    totalAutoPayMonth,
    autoSavingsFromDDTotal,
    totalSavingsTransfers,
    birthdayBillsTotal,
    budgetBillsTotal,
    contractualFixedBills,
    latestVariance,
    activeWeekIndex,
    cycleStart,
    cycleEnd,
    totalCycleDays,
    elapsedCycleDays,
    percentElapsed
  } = forecast;

  // Active week data and pacing
  const currentWeekIdx = activeWeekIndex >= 0 ? activeWeekIndex : 0;
  const activeWeekPred = weeklyPredictions[currentWeekIdx] || weeklyPredictions[0] || {};
  const activeWeekObj = schedule.weeks[currentWeekIdx] || schedule.weeks[0];
  
  // Active week actual spend vs planned
  const activeWeekActuals = (typeof getMonthData === 'function')
    ? (getMonthData(currentMonthName, currentYear).weekly_actuals?.[activeWeekObj?.name] || {})
    : {};

  let livePacing = null;
  if (typeof calculateLiveDailyPacing === 'function' && activeWeekObj && activeWeekPred) {
    livePacing = calculateLiveDailyPacing(activeWeekObj, activeWeekPred, activeWeekActuals, cfg);
  }

  const todayEndMs = new Date().setHours(23, 59, 59, 999);

  const activeWeekDDs = (activeWeekPred.wDDs || []).map(d => {
    const occDateStr = resolveOccDateStr(d, currentMonthName, currentYear);
    const isRecurring = Boolean(d.isRecurring || d.source_type === 'recurring_payment');
    const isCleared = isRecurring
      ? Boolean(d.cleared_dates && occDateStr && d.cleared_dates.includes(occDateStr))
      : Boolean(d.auto_cleared || d.status === 'paid' || (d.cleared_dates && occDateStr && d.cleared_dates.includes(occDateStr)));
    let pDate = null;
    if (d.actualPaymentDate) pDate = new Date(d.actualPaymentDate);
    else if (d.exact_date) pDate = new Date(d.exact_date);
    else if (d.due_day && currentMonthName) pDate = new Date(currentYear, months.indexOf(currentMonthName), d.due_day);
    const isPastDate = pDate ? (pDate.getTime() <= todayEndMs) : false;
    return {
      ...d,
      is_income: false,
      occDateStr,
      isCleared,
      isPastDate
    };
  });

  const activeWeekIncomes = (activeWeekPred.wIncomes || []).map(i => {
    const occDateStr = resolveOccDateStr(i, currentMonthName, currentYear);
    const isRecurring = Boolean(i.isRecurring || i.source_type === 'recurring_income');
    const isCleared = isRecurring
      ? Boolean(i.cleared_dates && occDateStr && i.cleared_dates.includes(occDateStr))
      : Boolean(i.auto_cleared || i.status === 'paid' || (i.cleared_dates && occDateStr && i.cleared_dates.includes(occDateStr)));
    let pDate = null;
    if (i.actualPaymentDate) pDate = new Date(i.actualPaymentDate);
    else if (i.exact_date) pDate = new Date(i.exact_date);
    else if (i.due_day && currentMonthName) pDate = new Date(currentYear, months.indexOf(currentMonthName), i.due_day);
    const isPastDate = pDate ? (pDate.getTime() <= todayEndMs) : false;
    return {
      ...i,
      is_income: true,
      occDateStr,
      isCleared,
      isPastDate
    };
  });

  const clearedBillsCount = activeWeekDDs.filter(d => d.isCleared).length;
  const clearedBillsTotal = activeWeekDDs.filter(d => d.isCleared).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const remainingBills = activeWeekDDs.filter(d => !d.isCleared);
  const remainingBillsCount = remainingBills.length;
  const remainingBillsTotal = remainingBills.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const clearedIncomesCount = activeWeekIncomes.filter(i => i.isCleared).length;
  const clearedIncomesTotal = activeWeekIncomes.filter(i => i.isCleared).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const remainingIncomes = activeWeekIncomes.filter(i => !i.isCleared);
  const remainingIncomesCount = remainingIncomes.length;
  const remainingIncomesTotal = remainingIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const activeWeekAllTransactions = [...activeWeekDDs, ...activeWeekIncomes];
  activeWeekAllTransactions.sort((a, b) => {
    const tA = a.actualPaymentDate ? new Date(a.actualPaymentDate).getTime() : (parseInt(a.due_day, 10) || 0);
    const tB = b.actualPaymentDate ? new Date(b.actualPaymentDate).getTime() : (parseInt(b.due_day, 10) || 0);
    return tA - tB;
  });
  const totalClearedTransactionsCount = activeWeekAllTransactions.filter(t => t.isCleared).length;

  // Split uncleared bills by due date (today/past vs future)
  const unclearedPastAndTodayBills = activeWeekDDs.filter(d => !d.isCleared && d.isPastDate);
  const unclearedPastAndTodayBillsTotal = unclearedPastAndTodayBills.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const unclearedFutureBills = activeWeekDDs.filter(d => !d.isCleared && !d.isPastDate);
  const unclearedFutureBillsTotal = unclearedFutureBills.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  // Split uncleared incomes by due date (today/past vs future)
  const unclearedPastAndTodayIncomes = activeWeekIncomes.filter(i => !i.isCleared && i.isPastDate);
  const unclearedPastAndTodayIncomesTotal = unclearedPastAndTodayIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const unclearedFutureIncomes = activeWeekIncomes.filter(i => !i.isCleared && !i.isPastDate);
  const unclearedFutureIncomesTotal = unclearedFutureIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const hasActual = (activeWeekPred && activeWeekPred.actualNet !== null && activeWeekPred.actualNet !== undefined);
  const rawSurplusAboveTarget = hasActual ? (activeWeekPred.actualNet - activeWeekPred.predictedNet) : 0;

  // Dual calculations for spendable cash remaining:
  // 1. Holding Today's Bills (Safest): Deducts all uncleared bills
  // 2. Future Bills Only (Bank Live): Deducts strictly future bills (assumes bank already processed today's direct debits)
  const spendableSafeFloor = hasActual ? (rawSurplusAboveTarget - remainingBillsTotal + remainingIncomesTotal) : 0;
  const spendableBankAdjusted = hasActual ? (rawSurplusAboveTarget - unclearedFutureBillsTotal + unclearedFutureIncomesTotal) : 0;

  let spendableMode = 'all_bills';
  try {
    const savedMode = localStorage.getItem('habit_spendable_cash_mode');
    if (savedMode === 'future_only' || savedMode === 'all_bills') spendableMode = savedMode;
  } catch (e) {}
  
  // Calculate total money in vs money out for monthly cashflow
  const totalInflows = totalCurrentInflow + (forecast.totalMonthPaymentsIn || 0);
  const totalCommittedBills = totalDD;
  // Discretionary budget from current accounts (to avoid double-counting credit card spend with credit auto-pay)
  const totalDiscretionaryBudget = totalWeeklyCurrentSpend;
  const totalWeeklyAllSpend = totalWeeklySpend;
  const totalOutflows = totalCommittedBills + totalDiscretionaryBudget + totalAutoPayMonth;
  const netMonthlySurplus = totalInflows - totalOutflows;

  // Credit utilization percentage
  const creditUtilPercent = totalCreditLimit > 0
    ? Math.min(100, Math.max(0, Math.round((projectedMonthEndCredit / totalCreditLimit) * 100)))
    : 0;

  // Savings growth
  const savingsGrowth = projectedMonthEndSavings - totalSavingsOpening;

  // Total Projected Net Worth across all holdings (Current + Savings - Credit Debt)
  const projectedTotalNet = projectedMonthEndCurrent + (cfg.track_savings ? projectedMonthEndSavings : 0) - projectedMonthEndCredit;
  const totalStartingNet = totalCurrentOpening + (cfg.track_savings ? totalSavingsOpening : 0) - totalCreditOpeningSpent;
  const netPositionDelta = projectedTotalNet - totalStartingNet;

  // Safe to spend today
  let safeDailySpend = 0;
  let pacingStatusText = 'On Track';
  let daysRemainingInWeek = 7;

  // 1. Calculate days remaining in active week (including today)
  if (livePacing && livePacing.isPacingActive) {
    const totalDays = Math.max(1, livePacing.totalDays || 7);
    daysRemainingInWeek = Math.max(1, totalDays - (livePacing.elapsedDays || 1) + 1);
  } else if (activeWeekObj && activeWeekObj.startDate && activeWeekObj.endDate) {
    const sDate = new Date(activeWeekObj.startDate);
    const eDate = new Date(activeWeekObj.endDate);
    const startMid = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();
    const endMid = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59).getTime();
    const weekTotalDays = Math.max(1, Math.round((endMid - startMid) / (1000 * 60 * 60 * 24)));
    daysRemainingInWeek = weekTotalDays;
    const nowMs = new Date().getTime();
    if (nowMs >= startMid && nowMs <= endMid) {
      daysRemainingInWeek = Math.max(1, Math.ceil((endMid - nowMs) / (1000 * 60 * 60 * 24)));
    }
  }

  // 2. Calculate Safe-to-Spend based on real available cash above target
  if (hasActual) {
    // True discretionary money remaining before Sunday without missing target:
    // (Actual Balance - Sunday Target) - Upcoming Bills + Upcoming Inflows
    const upcomingBills = livePacing ? (livePacing.upcomingDDTotal || 0) : 0;
    const upcomingInflow = livePacing ? (livePacing.upcomingIncomeTotal || 0) : 0;
    const actualSurplusAboveTarget = (activeWeekPred.actualNet - activeWeekPred.predictedNet);
    const remainingToSpend = actualSurplusAboveTarget - upcomingBills + upcomingInflow;

    safeDailySpend = Math.max(0, remainingToSpend / daysRemainingInWeek);

    if (livePacing && livePacing.liveDailyVariance !== null && livePacing.liveDailyVariance !== undefined) {
      if (livePacing.liveDailyVariance >= 15) {
        pacingStatusText = 'Ahead of Budget Pace';
      } else if (livePacing.liveDailyVariance < -25) {
        pacingStatusText = 'Over Budget Pace';
      } else {
        pacingStatusText = 'On Track';
      }
    } else {
      pacingStatusText = remainingToSpend <= 0 ? 'Over Budget Pace' : (remainingToSpend < (activeWeekPred.wSpend || 0) * (daysRemainingInWeek / 7) ? 'Tight Budget' : 'On Track');
    }
  } else {
    // No actual check-in balance entered: steady planned pace
    const weekTotalDays = livePacing?.totalDays || 7;
    safeDailySpend = (activeWeekPred.wSpend || 0) / Math.max(1, weekTotalDays);
    pacingStatusText = 'On Track';
  }

  // Upcoming scheduled bills in next 14 days
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const rawUpcomingBills = [];

  weeklyPredictions.forEach(wp => {
    (wp.wDDs || []).forEach(b => {
      let billDate = null;
      if (b.actualPaymentDate) {
        billDate = new Date(b.actualPaymentDate);
      } else {
        const dueDay = parseInt(b.due_day || 1, 10);
        const mIdx = months.indexOf(currentMonthName);
        billDate = new Date(currentYear, mIdx, dueDay);
      }
      
      if (billDate && !isNaN(billDate.getTime())) {
        const billMidnight = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate()).getTime();
        const diffDays = Math.round((billMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 14) {
          rawUpcomingBills.push({
            ...b,
            dueDay: billDate.getDate(),
            diffDays,
            billDate
          });
        }
      }
    });
  });

  rawUpcomingBills.sort((a, b) => a.diffDays - b.diffDays);
  const seenBillKeys = new Set();
  const upcomingBills = [];
  rawUpcomingBills.forEach(b => {
    const key = `${b.desc || b.name}_${b.dueDay}_${b.amount}`;
    if (!seenBillKeys.has(key)) {
      seenBillKeys.add(key);
      upcomingBills.push(b);
    }
  });

  // 3-Month forward trajectory
  const currentMonthIdx = months.indexOf(currentMonthName);
  const forwardMonths = [];
  for (let offset = 0; offset < 3; offset++) {
    const targetIdx = (currentMonthIdx + offset) % 12;
    const targetYear = currentMonthIdx + offset >= 12 ? currentYear + 1 : currentYear;
    const targetMName = months[targetIdx];
    try {
      const f = calculateMonthForecast(targetMName, targetYear);
      if (f) {
        const fNet = f.projectedMonthEndCurrent + (cfg.track_savings ? f.projectedMonthEndSavings : 0) - f.projectedMonthEndCredit;
        forwardMonths.push({
          month: targetMName,
          year: targetYear,
          isCurrent: offset === 0,
          projectedNet: fNet,
          projectedCurrent: f.projectedMonthEndCurrent,
          totalInflow: f.totalCurrentInflow + f.totalMonthPaymentsIn,
          totalOutgoings: f.totalDD + f.totalWeeklyCurrentSpend + f.totalAutoPayMonth
        });
      }
    } catch (e) {
      console.warn("Error calculating forward forecast for", targetMName, e);
    }
  }

  // Get tile order, visibility, and user expansion preferences
  const { allOrder, visibleTiles, expandedTiles } = getOverviewTileConfig();

  // Metrics Data Dictionary for rendering KPI cards
  const metricsData = {
    projected_net_worth: {
      val: `${curr}${projectedTotalNet.toFixed(2)}`,
      sub: `${netPositionDelta >= 0 ? '▲ +' : '▼ -'}${curr}${Math.abs(netPositionDelta).toFixed(2)} vs starting holdings`,
      tag: 'NET WORTH',
      valClass: projectedTotalNet >= 0 ? 'val-green' : 'val-red',
      cardClass: projectedTotalNet >= 0 ? 'accent-green' : 'accent-red'
    },
    operating_cash: {
      val: `${curr}${projectedMonthEndCurrent.toFixed(2)}`,
      sub: `Start: ${curr}${totalCurrentOpening.toFixed(0)} | Inflows: +${curr}${totalInflows.toFixed(0)} | Outflows: -${curr}${totalOutflows.toFixed(0)}`,
      tag: 'OPERATING CASH',
      valClass: projectedMonthEndCurrent >= 0 ? 'val-blue' : 'val-red',
      cardClass: projectedMonthEndCurrent >= 0 ? 'accent-blue' : 'accent-red'
    },
    credit_runway: {
      val: `${curr}${projectedMonthEndCredit.toFixed(2)}`,
      sub: `Available Line: ${curr}${Math.max(0, totalCreditLimit - projectedMonthEndCredit).toFixed(0)} (${creditUtilPercent}% limit)`,
      tag: 'CREDIT RUNWAY',
      valClass: creditUtilPercent > 50 ? 'val-red' : (creditUtilPercent > 25 ? 'val-amber' : 'val-green'),
      cardClass: creditUtilPercent > 50 ? 'accent-red' : (creditUtilPercent > 25 ? 'accent-amber' : 'accent-green'),
      extraHtml: `
        <div class="forecast-mini-progress">
          <div class="forecast-mini-bar" style="width:${creditUtilPercent}%;"></div>
        </div>
      `
    },
    savings_portfolio: {
      val: `${curr}${projectedMonthEndSavings.toFixed(2)}`,
      sub: `${savingsGrowth >= 0 ? '+' : '-'}${curr}${Math.abs(savingsGrowth).toFixed(2)} net monthly savings growth`,
      tag: 'SAVINGS GROWTH',
      valClass: 'val-purple',
      cardClass: 'accent-purple'
    },
    safe_to_spend: {
      val: `${curr}${safeDailySpend.toFixed(2)}<span style="font-size:14px; font-weight:500; color:var(--text-muted);">/day</span>`,
      sub: `${pacingStatusText} (${daysRemainingInWeek} days remaining)`,
      tag: 'SAFE-TO-SPEND',
      valClass: safeDailySpend >= 20 ? 'val-teal' : (safeDailySpend > 0 ? 'val-amber' : 'val-red'),
      cardClass: safeDailySpend >= 20 ? 'accent-teal' : (safeDailySpend > 0 ? 'accent-amber' : 'accent-red')
    },
    spendable_cash_remaining: (() => {
      if (!hasActual) {
        return {
          val: 'Pending',
          sub: 'Enter account check-in or sync Open Banking to calculate remaining cash',
          tag: 'SPENDABLE CASH',
          valClass: 'val-teal',
          cardClass: 'accent-teal'
        };
      }

      const activeSpendable = spendableMode === 'future_only' ? spendableBankAdjusted : spendableSafeFloor;
      const isPositive = activeSpendable >= 0;
      const otherSpendable = spendableMode === 'future_only' ? spendableSafeFloor : spendableBankAdjusted;
      const hasSplitBills = unclearedPastAndTodayBillsTotal > 0;

      let subText = '';
      if (spendableMode === 'all_bills') {
        if (hasSplitBills) {
          subText = isPositive
            ? `🛡️ Holding all unpaid bills • ${otherSpendable >= 0 ? '+' : '-'}${curr}${Math.abs(otherSpendable).toFixed(2)} if today's bills already left bank`
            : `⚠️ Overspent by ${curr}${Math.abs(activeSpendable).toFixed(2)} • (${otherSpendable >= 0 ? '+' : '-'}${curr}${Math.abs(otherSpendable).toFixed(2)} if today's bills already left bank)`;
        } else {
          subText = isPositive
            ? `🛡️ Holding all bills • ${curr}${activeSpendable.toFixed(2)} left before Sunday target (${curr}${activeWeekPred.predictedNet.toFixed(2)})`
            : `⚠️ Overspent by ${curr}${Math.abs(activeSpendable).toFixed(2)} against Sunday closing target`;
        }
      } else {
        if (hasSplitBills) {
          subText = isPositive
            ? `⚡ Future bills only • ${otherSpendable >= 0 ? '+' : '-'}${curr}${Math.abs(otherSpendable).toFixed(2)} if holding today's bills`
            : `⚠️ Overspent by ${curr}${Math.abs(activeSpendable).toFixed(2)} • (${otherSpendable >= 0 ? '+' : '-'}${curr}${Math.abs(otherSpendable).toFixed(2)} if holding today's bills)`;
        } else {
          subText = isPositive
            ? `⚡ Future bills only • ${curr}${activeSpendable.toFixed(2)} left before Sunday target (${curr}${activeWeekPred.predictedNet.toFixed(2)})`
            : `⚠️ Overspent by ${curr}${Math.abs(activeSpendable).toFixed(2)} against Sunday closing target`;
        }
      }

      const pillHtml = hasSplitBills ? `
        <div style="margin-top:6px; display:inline-flex; align-items:center; gap:2px; font-size:9.5px; background:rgba(0,0,0,0.22); padding:2px; border-radius:10px; width:fit-content;" onclick="event.stopPropagation();">
          <button type="button" 
            onclick="event.stopPropagation(); window.budgetApp.setSpendableCashMode('all_bills');" 
            style="border:none; cursor:pointer; padding:2px 7px; border-radius:8px; font-weight:700; font-size:9px; transition:all 0.15s ease; ${spendableMode === 'all_bills' ? 'background:var(--primary); color:#fff;' : 'background:transparent; color:var(--text-muted);'}" 
            title="Safest: Deducts all unpaid bills (including today's)">
            🛡️ Holding Today's Bills
          </button>
          <button type="button" 
            onclick="event.stopPropagation(); window.budgetApp.setSpendableCashMode('future_only');" 
            style="border:none; cursor:pointer; padding:2px 7px; border-radius:8px; font-weight:700; font-size:9px; transition:all 0.15s ease; ${spendableMode === 'future_only' ? 'background:var(--primary); color:#fff;' : 'background:transparent; color:var(--text-muted);'}" 
            title="Bank Live: Deducts future bills only (if bank already processed today's direct debits)">
            ⚡ Future Bills Only
          </button>
        </div>
      ` : `
        <div style="margin-top:4px; font-size:9.5px; color:var(--text-muted);">
          ✓ All bills up to today cleared
        </div>
      `;

      return {
        val: `${isPositive ? '+' : '-'}${curr}${Math.abs(activeSpendable).toFixed(2)}`,
        sub: subText,
        tag: 'SPENDABLE CASH',
        valClass: isPositive ? 'val-green' : 'val-red',
        cardClass: isPositive ? 'accent-green' : 'accent-red',
        extraHtml: pillHtml
      };
    })(),
    actual_variance: (() => {
      const actVar = (activeWeekPred && activeWeekPred.variance !== null) ? activeWeekPred.variance : latestVariance;
      const hasActVar = (actVar !== null && actVar !== undefined);
      const isSurplus = hasActVar ? actVar >= 0 : true;
      return {
        val: hasActVar ? `${isSurplus ? '+' : '-'}${curr}${Math.abs(actVar).toFixed(2)}` : 'Pending',
        sub: hasActVar
          ? (isSurplus
              ? `✨ +${curr}${Math.abs(actVar).toFixed(2)} above Sunday closing target (raw)`
              : `⚠️ -${curr}${Math.abs(actVar).toFixed(2)} below Sunday closing target (raw)`)
          : 'Enter check-in to calculate Sunday target position',
        tag: 'SUNDAY TARGET (RAW)',
        valClass: hasActVar ? (isSurplus ? 'val-green' : 'val-red') : 'val-teal',
        cardClass: hasActVar ? (isSurplus ? 'accent-green' : 'accent-red') : 'accent-teal'
      };
    })(),
    daily_variance: (() => {
      const isDailyPacingOn = Boolean(cfg.open_banking?.enabled && cfg.open_banking?.live_daily_variance !== false);
      const hasLiveVariance = Boolean(livePacing && livePacing.isPacingActive && livePacing.liveDailyVariance !== null && livePacing.liveDailyVariance !== undefined);
      const dailyVar = hasLiveVariance ? livePacing.liveDailyVariance : null;
      const isDailyAhead = hasLiveVariance ? dailyVar >= 0 : false;
      return {
        val: hasLiveVariance ? `${isDailyAhead ? '+' : '-'}${curr}${Math.abs(dailyVar).toFixed(2)}` : (isDailyPacingOn ? 'Syncing...' : 'Off'),
        sub: hasLiveVariance
          ? (isDailyAhead ? `✨ +${curr}${Math.abs(dailyVar).toFixed(2)} ahead of today’s pace` : `⚠️ -${curr}${Math.abs(dailyVar).toFixed(2)} behind today’s pace`)
          : (isDailyPacingOn ? 'Bank sync active' : 'Enable in Open Banking'),
        tag: 'LIVE DAILY VARIANCE',
        valClass: hasLiveVariance ? (isDailyAhead ? 'val-green' : 'val-red') : 'val-amber',
        cardClass: hasLiveVariance ? (isDailyAhead ? 'accent-green' : 'accent-red') : 'accent-amber'
      };
    })(),
    weekly_budget: {
      val: `${curr}${activeWeekPred.wSpend ? activeWeekPred.wSpend.toFixed(2) : '0.00'}`,
      sub: (() => {
        if (livePacing && livePacing.isPacingActive && (activeWeekPred.wSpend || 0) > 0) {
          const pacedSpent = (activeWeekPred.wSpend || 0) * livePacing.dayFraction;
          const pacedLeft = Math.max(0, (activeWeekPred.wSpend || 0) * (1 - livePacing.dayFraction));
          return `Paced: ${curr}${pacedSpent.toFixed(0)} spent | ${curr}${pacedLeft.toFixed(0)} left`;
        }
        return `Planned flexible budget (${activeWeekObj?.name || 'Active Week'})`;
      })(),
      tag: 'WEEKLY BUDGET',
      valClass: 'val-blue',
      cardClass: 'accent-blue'
    },
    monthly_burn_rate: (() => {
      const burnOutflows = Math.max(0, (totalCommittedBills - (autoSavingsFromDDTotal || 0)) + totalWeeklySpend);
      const dailyBurn = totalCycleDays > 0 ? burnOutflows / totalCycleDays : burnOutflows / 30;
      return {
        val: `${curr}${dailyBurn.toFixed(2)}<span style="font-size:14px; font-weight:500; color:var(--text-muted);">/day</span>`,
        sub: `Cost of living: ${curr}${burnOutflows.toFixed(0)} across ${totalCycleDays} days`,
        tag: 'DAILY BURN RATE',
        valClass: 'val-red',
        cardClass: 'accent-red'
      };
    })(),
    fixed_bills_ratio: (() => {
      const fixedBills = contractualFixedBills !== undefined
        ? contractualFixedBills
        : Math.max(0, totalCommittedBills - (autoSavingsFromDDTotal || 0) - (birthdayBillsTotal || 0) - (budgetBillsTotal || 0));
      const ratio = totalInflows > 0 ? Math.round((fixedBills / totalInflows) * 100) : 0;
      return {
        val: `${ratio}%`,
        sub: `${curr}${fixedBills.toFixed(0)} essential bills out of ${curr}${totalInflows.toFixed(0)} income`,
        tag: 'FIXED BILLS RATIO',
        valClass: ratio <= 50 ? 'val-green' : (ratio <= 65 ? 'val-amber' : 'val-red'),
        cardClass: ratio <= 50 ? 'accent-green' : (ratio <= 65 ? 'accent-amber' : 'accent-red')
      };
    })(),
    emergency_runway: (() => {
      const liquidReserves = Math.max(0, projectedMonthEndCurrent + (cfg.track_savings ? projectedMonthEndSavings : 0));
      const monthlyEssentialExpenses = Math.max(1, (totalCommittedBills - (autoSavingsFromDDTotal || 0)) + totalWeeklySpend);
      const runwayMonths = monthlyEssentialExpenses > 0 ? (liquidReserves / monthlyEssentialExpenses).toFixed(1) : '∞';
      const isHighRunway = (runwayMonths === '∞' || Number(runwayMonths) >= 3);
      return {
        val: `${runwayMonths} mo`,
        sub: `Liquid: ${curr}${liquidReserves.toFixed(0)} | Essentials: ${curr}${monthlyEssentialExpenses.toFixed(0)}/mo`,
        tag: 'EMERGENCY RUNWAY',
        valClass: isHighRunway ? 'val-green' : (Number(runwayMonths) >= 1 ? 'val-amber' : 'val-red'),
        cardClass: isHighRunway ? 'accent-green' : (Number(runwayMonths) >= 1 ? 'accent-amber' : 'accent-red')
      };
    })(),
    autopay_impact: {
      val: `${curr}${totalAutoPayMonth.toFixed(2)}`,
      sub: `Scheduled automated credit card settlements`,
      tag: 'AUTOPAY CLEARING',
      valClass: 'val-purple',
      cardClass: 'accent-purple'
    },
    savings_rate: (() => {
      const savingsTransfers = totalSavingsTransfers || 0;
      const actualSavingsAmount = Math.max(0, netMonthlySurplus) + savingsTransfers;
      const sRate = totalInflows > 0 ? Math.round((actualSavingsAmount / totalInflows) * 100) : 0;
      return {
        val: `${sRate}%`,
        sub: netMonthlySurplus < 0
          ? `Projected Deficit: -${curr}${Math.abs(netMonthlySurplus).toFixed(0)}${savingsTransfers > 0 ? ` (+${curr}${savingsTransfers.toFixed(0)} saved)` : ''}`
          : `Total Savings: ${curr}${actualSavingsAmount.toFixed(0)} of ${curr}${totalInflows.toFixed(0)}${savingsTransfers > 0 ? ` (${curr}${savingsTransfers.toFixed(0)} auto-saved)` : ''}`,
        tag: 'SAVINGS RATE',
        valClass: sRate >= 15 ? 'val-green' : (sRate > 0 ? 'val-blue' : 'val-red'),
        cardClass: sRate >= 15 ? 'accent-green' : (sRate > 0 ? 'accent-blue' : 'accent-red')
      };
    })(),
    cycle_velocity: {
      val: `${percentElapsed}% elapsed`,
      sub: `Day ${elapsedCycleDays} of ${totalCycleDays} (${cycleStart.toLocaleDateString('en-GB', {day:'numeric', month:'short'})} - ${cycleEnd.toLocaleDateString('en-GB', {day:'numeric', month:'short'})})`,
      tag: 'CYCLE VELOCITY',
      valClass: 'val-blue',
      cardClass: 'accent-blue'
    }
  };

  // Filter and sort ordered KPI tiles
  const orderedKpiTiles = allOrder
    .map(id => FORECAST_OVERVIEW_TILES.find(t => t.id === id && t.type === 'kpi'))
    .filter(Boolean);

  const visibleKpiTiles = orderedKpiTiles.filter(t => visibleTiles.includes(t.id));

  // Determine section visibility
  const isSectionVisible = (secId) => visibleTiles.includes(secId);

  // Render HTML Shell
  container.innerHTML = `
    <div class="forecast-overview-container">

      <!-- EDIT MODE BANNER (when active) -->
      ${globalEditMode ? `
        <div class="forecast-edit-banner">
          <div class="forecast-edit-banner-left">
            <strong>🎨 Customize Overview Dashboard</strong>
            <span>Drag tiles or use ⬆️ ⬇️ arrows to reorder. Toggle visibility or add more cards.</span>
          </div>
          <div class="forecast-edit-banner-actions">
            <button class="btn green" onclick="window.budgetApp.openOverviewTilesModal()" style="font-size:11.5px; padding:6px 12px;">
              ➕ Add / Remove Tiles (${visibleTiles.length}/${FORECAST_OVERVIEW_TILES.length})
            </button>
            <button class="btn secondary" onclick="window.budgetApp.resetOverviewTilesToDefault()" style="font-size:11.5px; padding:6px 10px;">
              ↺ Reset Default
            </button>
            <button class="btn primary" onclick="window.budgetApp.toggleGlobalEditMode()" style="font-size:11.5px; padding:6px 12px;">
              ✓ Done Editing
            </button>
          </div>
        </div>
      ` : ''}

      <!-- 1. HERO BANNER -->
      <div class="forecast-hero-card">
        <div class="forecast-hero-header">
          <div class="forecast-hero-title-group">
            <div class="forecast-hero-badge-row">
              <span class="md3-chip md3-chip-primary">📅 ${currentMonthName} ${currentYear} Payday Cycle</span>
              <span class="md3-chip md3-chip-tonal">Week ${currentWeekIdx + 1} of ${schedule.numWeeks}</span>
              ${isMulti ? `<span class="md3-chip md3-chip-user">👤 ${activeUser}</span>` : ''}
            </div>
            <h2 class="forecast-hero-title">Financial Forecast & Cashflow Overview</h2>
            <p class="forecast-hero-subtitle">
              Cycle: ${cycleStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} &ndash; ${cycleEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              &bull; ${elapsedCycleDays} of ${totalCycleDays} days elapsed (${percentElapsed}%)
            </p>
          </div>

          <div class="forecast-hero-actions">
            <button class="btn primary" onclick="window.budgetApp.setTab('${currentMonthName}')" title="Jump to detailed weekly spreadsheet for ${currentMonthName}">
              📅 View ${currentMonthName} Detail
            </button>
            <button class="btn secondary" onclick="window.budgetApp.setTab('Bills')" title="View Master Bills and Direct Debits">
              📋 Bills
            </button>
            <button class="btn secondary" onclick="window.budgetApp.setTab('Year')" title="View 12-Month Cashflow Trajectory">
              📊 Year
            </button>
          </div>
        </div>

        <!-- Payday Cycle Progress Track -->
        <div class="forecast-cycle-bar-wrap">
          <div class="forecast-cycle-bar-labels">
            <span>Cycle Progress</span>
            <span class="forecast-cycle-percent">${percentElapsed}% complete &bull; ${Math.max(1, totalCycleDays - elapsedCycleDays + 1)} days remaining in cycle (incl. today)</span>
          </div>
          <div class="forecast-cycle-track">
            <div class="forecast-cycle-fill" style="width: ${percentElapsed}%;"></div>
          </div>
        </div>
      </div>

      <!-- 2. CUSTOMIZABLE KPI TILES GRID -->
      <div class="forecast-kpi-grid" id="forecastKpiGrid">
        ${visibleKpiTiles.map((tile, idx) => {
          const m = metricsData[tile.id] || { val: '—', sub: '', tag: tile.title, valClass: '', cardClass: '' };
          const isFlipped = flippedTileIds.has(tile.id);
          const isExpanded = expandedTiles.includes(tile.id);

          return `
            <div class="forecast-tile-wrapper ${isExpanded ? 'tile-expanded' : ''}" 
                 id="tile-wrap-${tile.id}" 
                 data-tile-id="${tile.id}"
                 data-is-expanded="${isExpanded}"
                 ${globalEditMode ? `
                   draggable="true"
                   ondragstart="window.budgetApp.onForecastTileDragStart(event, '${tile.id}')"
                   ondragover="window.budgetApp.onForecastTileDragOver(event, '${tile.id}')"
                   ondragenter="window.budgetApp.onForecastTileDragEnter(event, '${tile.id}')"
                   ondragleave="window.budgetApp.onForecastTileDragLeave(event, '${tile.id}')"
                   ondrop="window.budgetApp.onForecastTileDrop(event, '${tile.id}')"
                   ondragend="window.budgetApp.onForecastTileDragEnd(event)"
                 ` : ''}>
              
              <div class="forecast-flip-card ${isFlipped ? 'flipped' : ''}" id="tile-flip-${tile.id}">
                
                <!-- FRONT FACE -->
                <div class="forecast-flip-face forecast-flip-front forecast-kpi-card ${m.cardClass} ${!globalEditMode ? 'clickable-tile' : ''}"
                     onclick="${!globalEditMode ? `window.budgetApp.handleForecastTileClick(event, '${tile.id}', '${tile.target}')` : ''}"
                     onpointerdown="${!globalEditMode ? `window.budgetApp.handleForecastTilePointerDown(event, '${tile.id}')` : ''}"
                     onpointermove="${!globalEditMode ? `window.budgetApp.handleForecastTilePointerMove(event)` : ''}"
                     onpointerup="${!globalEditMode ? `window.budgetApp.handleForecastTilePointerUp(event, '${tile.id}')` : ''}"
                     onpointercancel="${!globalEditMode ? `window.budgetApp.handleForecastTilePointerCancel(event, '${tile.id}')` : ''}"
                     title="${!globalEditMode ? 'Click to navigate • Long-press or click ⓘ to explain' : 'Drag or use buttons to reorder'}">
                  
                  <!-- EDIT MODE CONTROLS (only when active) -->
                  ${globalEditMode ? `
                    <div class="tile-edit-bar">
                      <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        <span class="tile-drag-handle" 
                              title="Drag to reorder" 
                              draggable="true"
                              ondragstart="event.stopPropagation(); window.budgetApp.onForecastTileDragStart(event, '${tile.id}')"
                              ontouchstart="event.stopPropagation(); window.budgetApp.onTouchDragStart(event, '${tile.id}')">
                          ⠿
                        </span>
                        <button type="button" class="tile-edit-btn" onclick="event.stopPropagation(); window.budgetApp.moveOverviewTileOrder('${tile.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Left / Up">⬅️</button>
                        <button type="button" class="tile-edit-btn" onclick="event.stopPropagation(); window.budgetApp.moveOverviewTileOrder('${tile.id}', 1)" ${idx === visibleKpiTiles.length - 1 ? 'disabled' : ''} title="Move Right / Down">➡️</button>
                        <button type="button" class="tile-edit-btn expand-btn ${isExpanded ? 'active' : ''}" onclick="event.stopPropagation(); window.budgetApp.toggleOverviewTileExpansion('${tile.id}')" title="${isExpanded ? 'Collapse to standard width' : 'Expand to full width'}">
                          ${isExpanded ? '⇤⇥ Shrink' : '↔️ Expand'}
                        </button>
                      </div>
                      <button type="button" class="tile-edit-btn hide-btn" onclick="event.stopPropagation(); window.budgetApp.toggleOverviewTileVisibility('${tile.id}', false)" title="Hide tile">👁️ Hide</button>
                    </div>
                  ` : ''}

                  <div class="forecast-kpi-top">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span class="forecast-kpi-icon">${tile.icon}</span>
                      <span class="forecast-kpi-tag">${m.tag}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                      ${!globalEditMode ? `
                        <button class="tile-info-chip" onclick="event.stopPropagation(); window.budgetApp.flipForecastTile('${tile.id}')" title="Learn what this metric means">ⓘ</button>
                        <button type="button" class="tile-nav-cue" style="background:none; border:none; padding:0; cursor:pointer; font-size:12px; color:var(--text-muted);" onclick="event.stopPropagation(); window.budgetApp.navigateForecastTile('${tile.id}', '${tile.target}')" title="Jump directly to ${tile.target === 'bills' ? 'Scheduled Bills' : (tile.target === 'year' ? 'Year View' : currentMonthName)}">↗</button>
                      ` : ''}
                    </div>
                  </div>

                  <div class="forecast-kpi-val ${m.valClass}">${m.val}</div>

                  <div class="forecast-kpi-footer">
                    <div class="forecast-kpi-sub">${m.sub}</div>
                    ${m.extraHtml || ''}
                  </div>
                </div>

                <!-- BACK FACE (EXPLANATION & FORMULA) -->
                <div class="forecast-flip-face forecast-flip-back" onclick="window.budgetApp.flipForecastTile('${tile.id}')">
                  <div class="forecast-flip-header">
                    <div class="forecast-flip-title">
                      <span>${tile.icon}</span> <strong>${tile.title}</strong>
                    </div>
                    <button class="forecast-flip-back-btn" onclick="event.stopPropagation(); window.budgetApp.flipForecastTile('${tile.id}')" title="Flip back to front">
                      ↺ Back
                    </button>
                  </div>
                  <div class="forecast-flip-body">
                    <div class="forecast-flip-section">
                      <div class="forecast-flip-label">WHAT IT MEANS</div>
                      <p>${tile.explanation}</p>
                    </div>
                    <div class="forecast-flip-section">
                      <div class="forecast-flip-label">CALCULATION FORMULA</div>
                      <code>${tile.formula}</code>
                    </div>
                    <div class="forecast-flip-section">
                      <div class="forecast-flip-label">ACTIONABLE TIP</div>
                      <p class="forecast-flip-tip">${tile.tip}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 3. DETAILED BREAKDOWN SECTIONS (Customizable Two-Column Layout) -->
      <div class="forecast-sections-grid">
        
        <!-- LEFT COLUMN -->
        <div class="forecast-column">
          
          <!-- ACTIVE WEEK SPOTLIGHT -->
          ${isSectionVisible('week_spotlight') ? `
            <div class="forecast-card" id="section-week-spotlight">
              ${globalEditMode ? `
                <div class="tile-edit-bar" style="margin-bottom:10px;">
                  <span class="tile-drag-handle">⠿ Section</span>
                  <button type="button" class="tile-edit-btn hide-btn" onclick="window.budgetApp.toggleOverviewTileVisibility('week_spotlight', false)">👁️ Hide Spotlight</button>
                </div>
              ` : ''}
              <div class="forecast-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:18px;">🔦</span>
                  <h3 class="forecast-card-title">Active Week Spotlight (${activeWeekObj?.name || 'Week 1'})</h3>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="due-pill due-today">${activeWeekObj?.label || ''}</span>
                  <button class="tile-info-chip" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})" title="View calculation formula & live breakdown">🧮</button>
                  <button class="tile-info-chip" onclick="window.budgetApp.flipForecastTile('week_spotlight')" title="What is this section?">ⓘ</button>
                </div>
              </div>

              <div class="forecast-card-body">
                <div class="forecast-week-spotlight-metrics">
                  <div class="forecast-spotlight-item" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})" style="cursor:pointer;" title="Click to view weekly budget calculation">
                    <span class="forecast-spotlight-label">Discretionary Budget</span>
                    <span class="forecast-spotlight-value">${curr}${(activeWeekPred.wSpend || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">Planned allowance</span>
                  </div>

                  <div class="forecast-spotlight-item" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})" style="cursor:pointer;" title="Click to view closing target calculation">
                    <span class="forecast-spotlight-label">Closing Net Position</span>
                    <span class="forecast-spotlight-value ${activeWeekPred.predictedNet >= 0 ? 'text-green' : 'text-red'}">${curr}${(activeWeekPred.predictedNet || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">End of week target</span>
                  </div>

                  <div class="forecast-spotlight-item" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})" style="cursor:pointer;" title="Click to view scheduled bills breakdown">
                    <span class="forecast-spotlight-label">Total Bills Planned</span>
                    <span class="forecast-spotlight-value text-red">-${curr}${(activeWeekPred.wDDTotal || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">${clearedBillsCount > 0 ? `<strong style="color:var(--green);">${clearedBillsCount}</strong> of ${activeWeekDDs.length} cleared (${curr}${clearedBillsTotal.toFixed(0)})` : `${activeWeekDDs.length} direct debits`}</span>
                  </div>

                  <div class="forecast-spotlight-item" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})" style="cursor:pointer; ${remainingBillsTotal > 0 ? 'border-color:rgba(245,158,11,0.35); background:rgba(245,158,11,0.04);' : 'border-color:rgba(16,185,129,0.3); background:rgba(16,185,129,0.04);'}" title="Click to view remaining unpaid bills">
                    <span class="forecast-spotlight-label" style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Remaining Bills</span>
                      ${remainingBillsTotal > 0 ? '<span style="font-size:9px; background:rgba(245,158,11,0.2); color:var(--amber); padding:1px 5px; border-radius:8px; font-weight:700;">DUE</span>' : '<span style="font-size:9px; background:rgba(16,185,129,0.2); color:var(--green); padding:1px 5px; border-radius:8px; font-weight:700;">PAID</span>'}
                    </span>
                    <span class="forecast-spotlight-value ${remainingBillsTotal > 0 ? 'text-amber' : 'text-green'}">
                      ${remainingBillsTotal > 0 ? `-${curr}${remainingBillsTotal.toFixed(2)}` : `✓ ${curr}0.00`}
                    </span>
                    <span class="forecast-spotlight-sub">
                      ${remainingBillsCount > 0 ? `<strong style="color:var(--amber);">${remainingBillsCount}</strong> not cleared (${curr}${clearedBillsTotal.toFixed(0)} cleared)` : '<strong style="color:var(--green);">All bills cleared this week</strong>'}
                    </span>
                  </div>

                  <div class="forecast-spotlight-item" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})" style="cursor:pointer;" title="Click to view expected income breakdown">
                    <span class="forecast-spotlight-label">Expected Inflow</span>
                    <span class="forecast-spotlight-value text-green">+${curr}${(activeWeekPred.wIncomeTotal || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">${clearedIncomesCount > 0 ? `<strong style="color:var(--green);">${clearedIncomesCount}</strong> of ${activeWeekIncomes.length} cleared (${curr}${clearedIncomesTotal.toFixed(0)})` : `${activeWeekIncomes.length} salary / incomes`}</span>
                  </div>

                  <div class="forecast-spotlight-item" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})" style="cursor:pointer;" title="Click to view remaining expected inflow">
                    <span class="forecast-spotlight-label">Remaining Inflow</span>
                    <span class="forecast-spotlight-value ${remainingIncomesTotal > 0 ? 'text-green' : ''}">
                      ${remainingIncomesTotal > 0 ? `+${curr}${remainingIncomesTotal.toFixed(2)}` : `${curr}0.00`}
                    </span>
                    <span class="forecast-spotlight-sub">
                      ${remainingIncomesCount > 0 ? `<strong style="color:var(--green);">${remainingIncomesCount}</strong> of ${activeWeekIncomes.length} pending` : (activeWeekIncomes.length > 0 ? '<strong style="color:var(--green);">All income received</strong>' : 'None scheduled')}
                    </span>
                  </div>
                </div>

                <!-- Transactions clearing this week -->
                <div style="margin-top:14px;">
                  <h4 style="font-size:12.5px; font-weight:600; color:var(--heading); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <span>${activeWeekIncomes.length > 0 ? 'Transactions' : 'Bills'} Clearing in ${activeWeekObj?.name || 'Active Week'}</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                      ${remainingBillsTotal > 0 ? `<span class="badge" style="font-size:10px; background:rgba(245,158,11,0.18); color:var(--amber); border:1px solid rgba(245,158,11,0.35); padding:2px 6px;">-${curr}${remainingBillsTotal.toFixed(2)} remaining</span>` : ''}
                      <span style="font-size:11px; color:var(--text-muted);">${totalClearedTransactionsCount > 0 ? `<strong style="color:var(--green);">${totalClearedTransactionsCount}</strong> of ` : ''}${activeWeekAllTransactions.length} items${totalClearedTransactionsCount > 0 ? ' cleared' : ''}</span>
                    </div>
                  </h4>

                  <div class="forecast-chips-scroll">
                    ${(activeWeekAllTransactions && activeWeekAllTransactions.length > 0) ? activeWeekAllTransactions.map(t => {
                      const isInc = Boolean(t.is_income);
                      const cleanDesc = (t.rawDesc || t.desc || t.name || '').replace(/'/g, "\\'");
                      const sType = t.source_type || (isInc ? 'payments_in' : 'direct_debit');
                      const sIdx = t.source_idx !== undefined ? t.source_idx : 0;
                      const amt = Number(t.amount) || 0;
                      const occStr = t.occDateStr || '';
                      const isClr = Boolean(t.isCleared);
                      const isPast = Boolean(t.isPastDate);

                      let badgeHtml = '';
                      if (isClr) {
                        badgeHtml = `
                          <button type="button" class="badge" 
                            style="font-size:9.5px; font-weight:700; background:rgba(16,185,129,0.22); color:var(--green); border:1px solid rgba(16,185,129,0.45); padding:2px 7px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; transition:all 0.15s ease;" 
                            onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${currentMonthName}', '${cleanDesc}', ${amt}, '${occStr}')" 
                            title="Cleared / Paid • Click to mark Due">
                            ✓ Cleared
                          </button>
                        `;
                      } else if (isPast) {
                        badgeHtml = `
                          <button type="button" class="badge" 
                            style="font-size:9.5px; font-weight:700; background:rgba(245,158,11,0.18); color:var(--amber); border:1px solid rgba(245,158,11,0.4); padding:2px 7px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; transition:all 0.15s ease;" 
                            onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${currentMonthName}', '${cleanDesc}', ${amt}, '${occStr}')" 
                            title="Payment Due • Click to mark Cleared">
                            ⚠️ Due
                          </button>
                        `;
                      } else {
                        badgeHtml = `
                          <button type="button" class="badge" 
                            style="font-size:9.5px; font-weight:500; background:rgba(255,255,255,0.06); color:var(--text-muted); border:1px solid rgba(255,255,255,0.12); padding:2px 7px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; transition:all 0.15s ease;" 
                            onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${currentMonthName}', '${cleanDesc}', ${amt}, '${occStr}')" 
                            title="Upcoming Payment • Click to mark Cleared">
                            ⏳ Upcoming
                          </button>
                        `;
                      }

                      const iconDisplay = isClr ? '✅' : (t.icon || (isInc ? '📥' : (t.transfer_to ? '➔' : (t.isRecurring ? '🔄' : '⚡'))));
                      const dateMeta = t.actualDateStr || (t.due_day ? `Day ${t.due_day}` : '');

                      return `
                        <div class="forecast-bill-chip ${isClr ? 'cleared' : (isPast ? 'past-due' : '')} ${isInc ? 'income' : ''}" 
                             style="${isClr ? 'border-left: 3.5px solid var(--green) !important; background: rgba(16, 185, 129, 0.05);' : (isPast ? 'border-left: 3.5px solid var(--amber) !important;' : '')} cursor:pointer;" 
                             onclick="window.budgetApp.setTab('${currentMonthName}')" 
                             title="Click to view ${activeWeekObj?.name || 'week'} in ${currentMonthName}">
                          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1 1 auto;">
                            <span class="forecast-bill-chip-icon" style="font-size:15px; flex-shrink:0;">${iconDisplay}</span>
                            <div class="forecast-bill-chip-info" style="min-width:0;">
                              <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                                <span class="forecast-bill-chip-title" style="font-size:12px; ${isClr ? 'opacity:0.95;' : ''}">${t.desc || t.name}</span>
                              </div>
                              <span class="forecast-bill-chip-meta" style="font-size:10.5px;">
                                ${dateMeta ? `Due ${dateMeta} &bull; ` : ''}${t.account || 'Current Account'}
                                ${t.matched_payee ? ` &bull; <span style="color:var(--green); font-weight:600;">Matched: ${t.matched_payee}</span>` : ''}
                              </span>
                            </div>
                          </div>
                          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0;">
                            <span class="forecast-bill-chip-amt" style="font-size:12px; font-weight:700; ${isInc ? 'color:var(--green);' : (isClr ? 'color:var(--green);' : 'color:var(--red);')}">
                              ${isInc ? '+' : '-'}${curr}${amt.toFixed(2)}
                            </span>
                            <div style="display:flex; align-items:center; gap:3px;">
                              ${badgeHtml}
                              ${(globalEditMode || (cfg.open_banking && cfg.open_banking.enabled)) ? `
                                <button type="button" class="btn secondary" 
                                  style="height:18px; width:18px; font-size:9px; padding:0; display:inline-flex; align-items:center; justify-content:center; border-radius:4px;" 
                                  onclick="event.stopPropagation(); window.budgetApp.openManualBillMatchModal('${sType}', ${sIdx}, '${currentMonthName}', '${cleanDesc}', ${amt}, '${occStr}')" 
                                  title="Match with Bank Transaction">🔗</button>
                              ` : ''}
                            </div>
                          </div>
                        </div>
                      `;
                    }).join('') : '<div class="forecast-empty-note">No scheduled transactions clearing this week</div>'}
                  </div>
                </div>

                <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
                  <button class="btn secondary" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.openWeekCalculationModal(${currentWeekIdx})">
                    🧮 View Calculation Formula &rarr;
                  </button>
                  <button class="btn secondary" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.setTab('${currentMonthName}')">
                    Inspect ${activeWeekObj?.name || 'Week'} Details &rarr;
                  </button>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- MULTI-WEEK CASHFLOW RUNWAY -->
          ${isSectionVisible('week_runway') ? `
            <div class="forecast-card" id="section-week-runway">
              ${globalEditMode ? `
                <div class="tile-edit-bar" style="margin-bottom:10px;">
                  <span class="tile-drag-handle">⠿ Section</span>
                  <button type="button" class="tile-edit-btn hide-btn" onclick="window.budgetApp.toggleOverviewTileVisibility('week_runway', false)">👁️ Hide Runway</button>
                </div>
              ` : ''}
              <div class="forecast-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:18px;">📅</span>
                  <h3 class="forecast-card-title">Weekly Cashflow Runway (${schedule.numWeeks} Weeks)</h3>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:11px; color:var(--text-muted);">Swipe or click week</span>
                  <button class="tile-info-chip" onclick="window.budgetApp.flipForecastTile('week_runway')" title="What is this section?">ⓘ</button>
                </div>
              </div>

              <div class="forecast-card-body">
                <div class="forecast-week-runway-grid">
                  ${weeklyPredictions.map((wp, idx) => {
                    const wObj = wp.wObj;
                    const isCurrent = (idx === currentWeekIdx);
                    const isPast = (idx < currentWeekIdx);
                    const statusLabel = isCurrent ? 'Active' : (isPast ? 'Completed' : 'Upcoming');
                    const statusClass = isCurrent ? 'status-active' : (isPast ? 'status-past' : 'status-upcoming');

                    return `
                      <div class="forecast-week-runway-card ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}" onclick="window.budgetApp.openWeekCalculationModal(${idx})" title="Click to view live calculation breakdown & clearing transactions">
                        <div class="forecast-week-runway-top">
                          <div>
                            <strong class="forecast-week-runway-name">${wObj?.name}</strong>
                            <div class="forecast-week-runway-date">${wObj?.label ? wObj.label.replace(/^Week \d+ /, '') : ''}</div>
                          </div>
                          <div style="display:flex; align-items:center; gap:6px;">
                            <span class="forecast-week-status-pill ${statusClass}">${statusLabel}</span>
                            <button type="button" class="week-nav-shortcut" style="background:none; border:none; padding:0 2px; cursor:pointer; font-size:12px; color:var(--text-muted); line-height:1;" onclick="event.stopPropagation(); window.budgetApp.setTab('${currentMonthName}'); setTimeout(() => { const el = document.querySelectorAll('.week-card')[${idx}]; if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 120);" title="Jump directly to ${wObj?.name} in spreadsheet">↗</button>
                          </div>
                        </div>

                        <div class="forecast-week-runway-rows">
                          <div class="forecast-week-runway-row">
                            <span>Budget:</span>
                            <strong>${curr}${wp.wSpend.toFixed(2)}</strong>
                          </div>
                          <div class="forecast-week-runway-row">
                            <span>Scheduled:</span>
                            <strong class="text-red">-${curr}${wp.wDDTotal.toFixed(2)}</strong>
                          </div>
                          ${wp.wIncomeTotal > 0 ? `
                            <div class="forecast-week-runway-row">
                              <span>Inflows:</span>
                              <strong class="text-green">+${curr}${wp.wIncomeTotal.toFixed(2)}</strong>
                            </div>
                          ` : ''}
                        </div>

                        <div class="forecast-week-runway-closing">
                          <span>Net Pos:</span>
                          <strong class="${wp.predictedNet >= 0 ? 'text-green' : 'text-red'}">${curr}${wp.predictedNet.toFixed(2)}</strong>
                        </div>

                        ${wp.variance !== null ? `
                          <div class="forecast-week-variance-tag ${wp.variance >= 0 ? 'tag-green' : 'tag-red'}">
                            ${wp.variance >= 0 ? '▲ +' : '▼ -'}${curr}${Math.abs(wp.variance).toFixed(2)} vs plan
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- RIGHT COLUMN -->
        <div class="forecast-column">
          
          <!-- MONTHLY CASHFLOW ARCHITECTURE -->
          ${isSectionVisible('cashflow_architecture') ? `
            <div class="forecast-card" id="section-cashflow-architecture">
              ${globalEditMode ? `
                <div class="tile-edit-bar" style="margin-bottom:10px;">
                  <span class="tile-drag-handle">⠿ Section</span>
                  <button type="button" class="tile-edit-btn hide-btn" onclick="window.budgetApp.toggleOverviewTileVisibility('cashflow_architecture', false)">👁️ Hide Cashflow</button>
                </div>
              ` : ''}
              <div class="forecast-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:18px;">🍰</span>
                  <h3 class="forecast-card-title">${currentMonthName} Cashflow Architecture</h3>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="md3-badge ${netMonthlySurplus >= 0 ? 'md3-badge-green' : 'md3-badge-red'}" style="cursor:pointer;" onclick="window.budgetApp.openTileCalculationModal('cashflow_architecture')" title="Inspect calculation breakdown">
                    ${netMonthlySurplus >= 0 ? 'Surplus' : 'Deficit'} ${curr}${Math.abs(netMonthlySurplus).toFixed(0)}
                  </span>
                  <button class="tile-info-chip" onclick="window.budgetApp.openTileCalculationModal('cashflow_architecture')" title="Calculation breakdown">ⓘ</button>
                  <button type="button" class="tile-nav-cue" style="background:none; border:none; padding:0; cursor:pointer; font-size:12px; color:var(--text-muted);" onclick="window.budgetApp.openTileCalculationModal('cashflow_architecture')" title="Inspect calculation breakdown">↗</button>
                </div>
              </div>

              <div class="forecast-card-body">
                <div class="forecast-cashflow-segments-bar" style="cursor:pointer;" onclick="window.budgetApp.openTileCalculationModal('cashflow_architecture')" title="Click to view Cashflow Architecture breakdown">
                  <div class="forecast-segment-fill fill-bills" style="width: ${totalInflows > 0 ? Math.min(100, (totalCommittedBills / totalInflows) * 100) : 35}%;" title="Fixed Bills: ${curr}${totalCommittedBills.toFixed(2)}"></div>
                  <div class="forecast-segment-fill fill-discretionary" style="width: ${totalInflows > 0 ? Math.min(100, (totalDiscretionaryBudget / totalInflows) * 100) : 35}%;" title="Weekly Spend: ${curr}${totalDiscretionaryBudget.toFixed(2)}"></div>
                  ${totalAutoPayMonth > 0 ? `
                    <div class="forecast-segment-fill fill-autopay" style="width: ${totalInflows > 0 ? Math.min(100, (totalAutoPayMonth / totalInflows) * 100) : 10}%; background:var(--purple); opacity:0.85;" title="Credit Auto-Pay: ${curr}${totalAutoPayMonth.toFixed(2)}"></div>
                  ` : ''}
                  <div class="forecast-segment-fill fill-surplus" style="width: ${totalInflows > 0 ? Math.max(0, (netMonthlySurplus / totalInflows) * 100) : 20}%;" title="Projected Surplus: ${curr}${Math.max(0, netMonthlySurplus).toFixed(2)}"></div>
                </div>

                <div class="forecast-cashflow-legend">
                  <div class="forecast-legend-item">
                    <span class="legend-dot dot-bills"></span>
                    <span class="legend-text">Fixed Bills: <strong>${curr}${totalCommittedBills.toFixed(2)}</strong> (${totalInflows > 0 ? Math.round((totalCommittedBills / totalInflows) * 100) : 0}%)</span>
                  </div>
                  <div class="forecast-legend-item">
                    <span class="legend-dot dot-discretionary"></span>
                    <span class="legend-text">Weekly Spend (Cash): <strong>${curr}${totalDiscretionaryBudget.toFixed(2)}</strong> (${totalInflows > 0 ? Math.round((totalDiscretionaryBudget / totalInflows) * 100) : 0}%)</span>
                  </div>
                  ${totalAutoPayMonth > 0 ? `
                    <div class="forecast-legend-item">
                      <span class="legend-dot" style="background:var(--purple);"></span>
                      <span class="legend-text">Credit Auto-Pay: <strong>${curr}${totalAutoPayMonth.toFixed(2)}</strong> (${totalInflows > 0 ? Math.round((totalAutoPayMonth / totalInflows) * 100) : 0}%)</span>
                    </div>
                  ` : ''}
                  <div class="forecast-legend-item">
                    <span class="legend-dot dot-surplus"></span>
                    <span class="legend-text">Surplus: <strong>${curr}${Math.max(0, netMonthlySurplus).toFixed(2)}</strong></span>
                  </div>
                </div>

                <div class="forecast-cashflow-breakdown-list">
                  <div class="forecast-cashflow-row">
                    <span>Expected Inflow (Salary & In):</span>
                    <strong class="text-green">+${curr}${totalInflows.toFixed(2)}</strong>
                  </div>
                  <div class="forecast-cashflow-row">
                    <span>Direct Debits & Subscriptions:</span>
                    <strong class="text-red">-${curr}${totalCommittedBills.toFixed(2)}</strong>
                  </div>
                  <div class="forecast-cashflow-row">
                    <span>Weekly Living Budget (Cash):</span>
                    <strong class="text-red">-${curr}${totalDiscretionaryBudget.toFixed(2)}</strong>
                  </div>
                  ${totalAutoPayMonth > 0 ? `
                    <div class="forecast-cashflow-row">
                      <span>Credit Auto-Pay Transfers:</span>
                      <strong class="text-amber">-${curr}${totalAutoPayMonth.toFixed(2)}</strong>
                    </div>
                  ` : ''}
                  <div class="forecast-cashflow-row forecast-cashflow-total">
                    <span>Projected Month-End Surplus:</span>
                    <strong class="${netMonthlySurplus >= 0 ? 'text-green' : 'text-red'}">
                      ${netMonthlySurplus >= 0 ? '+' : ''}${curr}${netMonthlySurplus.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- UPCOMING BILLS (NEXT 14 DAYS) -->
          ${isSectionVisible('upcoming_bills') ? `
            <div class="forecast-card" id="section-upcoming-bills">
              ${globalEditMode ? `
                <div class="tile-edit-bar" style="margin-bottom:10px;">
                  <span class="tile-drag-handle">⠿ Section</span>
                  <button type="button" class="tile-edit-btn hide-btn" onclick="window.budgetApp.toggleOverviewTileVisibility('upcoming_bills', false)">👁️ Hide Bills</button>
                </div>
              ` : ''}
              <div class="forecast-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:18px;">🔔</span>
                  <h3 class="forecast-card-title">Upcoming Bills (Next 14 Days)</h3>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="md3-chip md3-chip-tonal">${upcomingBills.length} Due</span>
                  <button class="tile-info-chip" onclick="window.budgetApp.flipForecastTile('upcoming_bills')" title="What is this section?">ⓘ</button>
                </div>
              </div>

              <div class="forecast-card-body">
                ${upcomingBills.length === 0 ? `
                  <div class="forecast-empty-note">No scheduled bills or direct debits due in the next 14 days</div>
                ` : `
                  <div class="forecast-upcoming-list">
                    ${upcomingBills.slice(0, 7).map(b => {
                      let dueTag = `<span class="due-pill">${b.diffDays === 0 ? 'Due Today' : (b.diffDays === 1 ? 'Due Tomorrow' : `In ${b.diffDays} days`)}</span>`;
                      if (b.diffDays === 0) dueTag = `<span class="due-pill due-today">Today</span>`;
                      if (b.diffDays === 1) dueTag = `<span class="due-pill due-tomorrow">Tomorrow</span>`;

                      return `
                        <div class="forecast-upcoming-item" onclick="window.budgetApp.setTab('Bills')" title="View in Scheduled Bills">
                          <div class="forecast-upcoming-left">
                            <span class="forecast-upcoming-icon">${b.source_type === 'yearly_recurring' ? '🗓️' : '⚡'}</span>
                            <div>
                              <div class="forecast-upcoming-title">${b.desc || b.name || 'Direct Debit'}</div>
                              <div class="forecast-upcoming-meta">Due Day ${b.dueDay} &bull; ${b.account || 'Current'}</div>
                            </div>
                          </div>

                          <div class="forecast-upcoming-right">
                            <span class="forecast-upcoming-amount">-${curr}${Number(b.amount || 0).toFixed(2)}</span>
                            ${dueTag}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                  ${upcomingBills.length > 7 ? `
                    <div style="text-align:center; margin-top:10px;">
                      <button class="btn secondary" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.setTab('Bills')">
                        + View all ${upcomingBills.length} upcoming bills
                      </button>
                    </div>
                  ` : ''}
                `}
              </div>
            </div>
          ` : ''}

          <!-- 3-MONTH HORIZON OUTLOOK -->
          ${isSectionVisible('forward_horizon') ? `
            <div class="forecast-card" id="section-forward-horizon">
              ${globalEditMode ? `
                <div class="tile-edit-bar" style="margin-bottom:10px;">
                  <span class="tile-drag-handle">⠿ Section</span>
                  <button type="button" class="tile-edit-btn hide-btn" onclick="window.budgetApp.toggleOverviewTileVisibility('forward_horizon', false)">👁️ Hide Outlook</button>
                </div>
              ` : ''}
              <div class="forecast-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:18px;">🔭</span>
                  <h3 class="forecast-card-title">3-Month Forecast Runway</h3>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.setTab('Year')">
                    Full Year &rarr;
                  </button>
                  <button class="tile-info-chip" onclick="window.budgetApp.flipForecastTile('forward_horizon')" title="What is this section?">ⓘ</button>
                </div>
              </div>

              <div class="forecast-card-body">
                <div class="forecast-forward-months-grid">
                  ${forwardMonths.map(fm => `
                    <div class="forecast-forward-month-card ${fm.isCurrent ? 'current' : ''}">
                      <div class="forecast-forward-month-header">
                        <strong>${fm.month} ${fm.year}</strong>
                        ${fm.isCurrent ? '<span class="forecast-current-mini-tag">Current</span>' : ''}
                      </div>

                      <div class="forecast-forward-month-stats">
                        <div class="forecast-forward-stat">
                          <span>Projected Net:</span>
                          <strong class="${fm.projectedNet >= 0 ? 'text-green' : 'text-red'}">${curr}${fm.projectedNet.toFixed(0)}</strong>
                        </div>
                        <div class="forecast-forward-stat">
                          <span>Cash Balance:</span>
                          <strong>${curr}${fm.projectedCurrent.toFixed(0)}</strong>
                        </div>
                        <div class="forecast-forward-stat">
                          <span>Expected Inflow:</span>
                          <strong class="text-green">+${curr}${fm.totalInflow.toFixed(0)}</strong>
                        </div>
                        <div class="forecast-forward-stat">
                          <span>Outgoings:</span>
                          <strong class="text-red">-${curr}${fm.totalOutgoings.toFixed(0)}</strong>
                        </div>
                      </div>

                      <button class="btn secondary forecast-forward-btn" onclick="window.budgetApp.setTab('${fm.month}')">
                        Open ${fm.month}
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}

        </div>

      </div>

    </div>
  `;
}

// =========================================================
// 4. INTERACTION METHODS & MODALS
// =========================================================

export function flipForecastTile(tileId) {
  const card = document.getElementById(`tile-flip-${tileId}`);
  if (card) {
    card.classList.toggle('flipped');
    if (card.classList.contains('flipped')) {
      flippedTileIds.add(tileId);
    } else {
      flippedTileIds.delete(tileId);
    }
  } else {
    // If it's a section tile, show a lightweight info modal
    const tile = FORECAST_OVERVIEW_TILES.find(t => t.id === tileId);
    if (tile) {
      showModal({
        title: `${tile.icon} ${tile.title}`,
        body: `
          <div style="font-size:13px; line-height:1.5;">
            <div style="margin-bottom:12px;">
              <strong style="color:var(--heading); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">What It Means</strong>
              <p style="margin:0; color:var(--text);">${tile.explanation}</p>
            </div>
            <div style="margin-bottom:12px; background:var(--card-bg); padding:8px 10px; border-radius:8px; border:1px solid var(--border);">
              <strong style="color:var(--heading); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">Calculation Formula</strong>
              <code style="color:var(--curr-border);">${tile.formula}</code>
            </div>
            <div>
              <strong style="color:var(--green); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">💡 Actionable Tip</strong>
              <p style="margin:0; color:var(--text-muted);">${tile.tip}</p>
            </div>
          </div>
        `
      });
    }
  }
}

export function handleForecastTilePointerDown(event, tileId) {
  if (appState.globalEditMode) return;
  isLongPressTriggered = false;
  pointerStartX = event.clientX || (event.touches && event.touches[0].clientX) || 0;
  pointerStartY = event.clientY || (event.touches && event.touches[0].clientY) || 0;
  
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    isLongPressTriggered = true;
    if (navigator.vibrate) {
      try { navigator.vibrate(40); } catch (e) {}
    }
    flipForecastTile(tileId);
  }, 500);
}

export function handleForecastTilePointerMove(event) {
  if (!longPressTimer) return;
  const curX = event.clientX || (event.touches && event.touches[0].clientX) || 0;
  const curY = event.clientY || (event.touches && event.touches[0].clientY) || 0;
  if (Math.abs(curX - pointerStartX) > 10 || Math.abs(curY - pointerStartY) > 10) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

export function handleForecastTilePointerUp(event, tileId) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

export function handleForecastTilePointerCancel(event, tileId) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

export function handleForecastTileClick(event, tileId, target) {
  if (appState.globalEditMode) return;
  if (isLongPressTriggered) {
    isLongPressTriggered = false;
    return;
  }
  const flipEl = document.getElementById(`tile-flip-${tileId}`);
  if (flipEl && flipEl.classList.contains('flipped')) {
    flipForecastTile(tileId);
    return;
  }
  openTileCalculationModal(tileId, target);
}

export function openTileCalculationModal(tileId, target = 'month') {
  const cfg = getSettings();
  const curr = cfg.currency || '£';
  const currentPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: appState.currentYear, month: appState.currentTab || 'Jan' };
  const currentYear = currentPeriod.year;
  const currentMonthName = currentPeriod.month;
  const mIdx = months.indexOf(currentMonthName);

  const forecast = (typeof calculateMonthForecast === 'function')
    ? calculateMonthForecast(currentMonthName, currentYear)
    : null;
  if (!forecast) return;

  const yData = getYearData(currentYear) || {};
  const mData = (typeof getMonthData === 'function')
    ? (getMonthData(currentMonthName, currentYear) || {})
    : ((yData.months && yData.months[currentMonthName]) ? yData.months[currentMonthName] : {});
  const schedule = forecast.schedule || calculateMonthSchedule(currentYear, mIdx);
  const tile = FORECAST_OVERVIEW_TILES.find(t => t.id === tileId) || { id: tileId, title: 'Calculation Breakdown', icon: '📊' };

  let modalTitle = `${tile.icon} ${tile.title} Breakdown`;
  let liveBadge = '';
  let formulaHtml = '';
  let sectionsHtml = '';
  let navTarget = target || tile.target || 'month';
  let navBtnLabel = `📅 View ${currentMonthName} Detail &rarr;`;
  if (navTarget === 'bills') navBtnLabel = '📋 View Bills &rarr;';
  if (navTarget === 'year') navBtnLabel = '📊 View Year &rarr;';

  const renderRow = (label, amt, color = 'var(--text)', sub = '') => `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
      <div style="padding-right:8px;">
        <span style="color:var(--text);">${label}</span>
        ${sub ? `<div style="font-size:10px; color:var(--text-muted); margin-top:1px;">${sub}</div>` : ''}
      </div>
      <strong style="color:${color}; white-space:nowrap; margin-left:10px;">${amt}</strong>
    </div>
  `;

  const renderSectionHeader = (title, total = '') => `
    <div style="font-size:11px; font-weight:700; color:var(--curr-border); text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px 0; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--border); padding-bottom:4px;">
      <span>${title}</span>
      ${total ? `<span style="font-size:11.5px; font-weight:700; color:var(--heading);">${total}</span>` : ''}
    </div>
  `;

  if (tileId === 'operating_cash') {
    const openAmt = forecast.totalCurrentOpening;
    const inAmt = forecast.totalCurrentInflow + forecast.totalMonthPaymentsIn;
    const ddAmt = forecast.totalDD;
    const autoPayAmt = forecast.totalAutoPayMonth;
    const cashAmt = forecast.totalWeeklyCurrentSpend;
    const endAmt = forecast.projectedMonthEndCurrent;
    liveBadge = `<span style="background:${endAmt >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${endAmt >= 0 ? 'var(--green)' : 'var(--red)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${curr}${endAmt.toFixed(2)}</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Starting Cash:</strong> ${curr}${openAmt.toFixed(2)}</div>
        <div style="color:var(--green);"><strong>+ Inflows (Salary & Scheduled):</strong> +${curr}${inAmt.toFixed(2)}</div>
        <div style="color:var(--red);"><strong>- Direct Debits from Current:</strong> -${curr}${ddAmt.toFixed(2)}</div>
        ${autoPayAmt > 0 ? `<div style="color:var(--amber);"><strong>- Credit Auto-Pay Settlements:</strong> -${curr}${autoPayAmt.toFixed(2)}</div>` : ''}
        <div style="color:var(--red);"><strong>- Weekly Cash Spending:</strong> -${curr}${cashAmt.toFixed(2)}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${endAmt >= 0 ? 'var(--green)' : 'var(--red)'};">
          = Projected Month-End Cash: ${curr}${endAmt.toFixed(2)}
        </div>
      </div>
    `;

    let accList = '';
    (cfg.current_accounts || []).forEach(acc => {
      const val = Number(mData.current_data?.[acc]?.opening) || 0;
      accList += renderRow(acc, `${curr}${val.toFixed(2)}`);
    });

    let infList = '';
    (mData.deductions_list || []).forEach(d => {
      if (cfg.current_accounts.includes(d.target_account)) {
        cfg.people.forEach(p => {
          const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
          if (amt > 0) infList += renderRow(`${d.name} (${p}) &rarr; ${d.target_account}`, `+${curr}${amt.toFixed(2)}`, 'var(--green)');
        });
      }
    });
    (yData.recurring_incomes || []).forEach(ri => {
      const occs = (typeof getRecurringForWeek === 'function') ? schedule.weeks.flatMap(w => getRecurringForWeek([ri], w, schedule, currentYear)) : [];
      if (occs.length > 0) {
        const sum = occs.reduce((s, o) => s + (Number(o.amount) || 0), 0);
        infList += renderRow(`${ri.name || ri.desc || 'Scheduled Inflow'} (${occs.length}x)`, `+${curr}${sum.toFixed(2)}`, 'var(--green)');
      }
    });

    let ddList = '';
    (mData.direct_debits || []).forEach(d => {
      ddList += renderRow(d.name || d.desc, `-${curr}${Number(d.amount || 0).toFixed(2)}`, 'var(--red)', `${d.account || 'Joint Account'} &bull; Day ${d.due_day || '-'}`);
    });

    sectionsHtml = `
      ${renderSectionHeader('1. Opening Balances by Account', `${curr}${openAmt.toFixed(2)}`)}
      ${accList || '<div style="color:var(--text-muted); font-size:12px;">No current accounts.</div>'}

      ${renderSectionHeader('2. Salary & Scheduled Inflows', `+${curr}${inAmt.toFixed(2)}`)}
      ${infList || '<div style="color:var(--text-muted); font-size:12px;">No inflows.</div>'}

      ${renderSectionHeader('3. Direct Debits from Current Accounts', `-${curr}${ddAmt.toFixed(2)}`)}
      <div style="max-height:150px; overflow-y:auto; padding-right:4px;">${ddList || '<div style="color:var(--text-muted); font-size:12px;">No direct debits.</div>'}</div>

      ${autoPayAmt > 0 ? `
        ${renderSectionHeader('4. Credit Auto-Pay Settlements', `-${curr}${autoPayAmt.toFixed(2)}`)}
        ${(cfg.credit_accounts || []).filter(c => c.autopay_enabled).map(c => {
          const debt = Number(mData.credit_data?.[c.name]?.opening_spent) || 0;
          return renderRow(`${c.name} Settlement (Auto-Pay)`, `-${curr}${debt.toFixed(2)}`, 'var(--amber)', `Paid from ${c.autopay_from || 'Joint Account'}`);
        }).join('')}
      ` : ''}

      ${renderSectionHeader('5. Weekly Cash Allowance (4 Weeks)', `-${curr}${cashAmt.toFixed(2)}`)}
      ${renderRow('Cash allowance for flexible expenses', `-${curr}${cashAmt.toFixed(2)}`, 'var(--red)', `Total planned living cash across cycle weeks`)}
    `;
  } else if (tileId === 'fixed_bills_ratio') {
    const fixedBills = forecast.contractualFixedBills !== undefined
      ? forecast.contractualFixedBills
      : Math.max(0, forecast.totalDD - (forecast.autoSavingsFromDDTotal || 0) - (forecast.birthdayBillsTotal || 0) - (forecast.budgetBillsTotal || 0));
    const totalInflow = forecast.totalCurrentInflow + forecast.totalMonthPaymentsIn;
    const ratio = totalInflow > 0 ? Math.round((fixedBills / totalInflow) * 100) : 0;
    liveBadge = `<span style="background:${ratio <= 50 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; color:${ratio <= 50 ? 'var(--green)' : 'var(--amber)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${ratio}%</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Contractual Essential Bills:</strong> ${curr}${fixedBills.toFixed(2)}</div>
        <div style="color:var(--green);"><strong>Total Inflow (Salary & Scheduled):</strong> ${curr}${totalInflow.toFixed(2)}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${ratio <= 50 ? 'var(--green)' : 'var(--amber)'};">
          = (${curr}${fixedBills.toFixed(0)} &divide; ${curr}${totalInflow.toFixed(0)}) &times; 100 = ${ratio}%
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
          ${ratio <= 50 ? '✅ Healthy: Within the recommended 50% guideline for essential fixed commitments.' : '⚠️ Above 50%: Fixed bills take up over half your income.'}
        </div>
      </div>
    `;

    let billsList = '';
    (mData.direct_debits || []).forEach(d => {
      const isSaving = d.transfer_to && (cfg.savings_accounts || []).includes(d.transfer_to);
      if (!isSaving) {
        billsList += renderRow(d.name || d.desc, `${curr}${Number(d.amount || 0).toFixed(2)}`, 'var(--red)', `${d.account || 'Joint Account'} &bull; Due Day ${d.due_day || '-'}`);
      }
    });

    let excludedList = '';
    (mData.direct_debits || []).forEach(d => {
      const isSaving = d.transfer_to && (cfg.savings_accounts || []).includes(d.transfer_to);
      if (isSaving) {
        excludedList += renderRow(d.name || d.desc, `${curr}${Number(d.amount || 0).toFixed(2)}`, 'var(--purple)', `Excluded: Internal transfer to ${d.transfer_to}`);
      }
    });

    sectionsHtml = `
      ${renderSectionHeader('Contractual Essential Bills Included', `${curr}${fixedBills.toFixed(2)}`)}
      <div style="max-height:180px; overflow-y:auto; padding-right:4px;">${billsList || '<div style="color:var(--text-muted); font-size:12px;">No contractual bills.</div>'}</div>

      ${excludedList ? `
        ${renderSectionHeader('Excluded Items (Savings Transfers & Non-Contractual)', `${curr}${(forecast.autoSavingsFromDDTotal || 0).toFixed(2)}`)}
        ${excludedList}
      ` : ''}
    `;
  } else if (tileId === 'monthly_burn_rate') {
    const autoSavings = forecast.autoSavingsFromDDTotal || 0;
    const essentialBills = Math.max(0, forecast.totalDD - autoSavings);
    const weeklySpend = forecast.totalWeeklySpend;
    const burnOutflows = essentialBills + weeklySpend;
    const days = forecast.totalCycleDays || 28;
    const dailyBurn = days > 0 ? burnOutflows / days : burnOutflows / 30;
    liveBadge = `<span style="background:rgba(239,68,68,0.15); color:var(--red); padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${curr}${dailyBurn.toFixed(2)}/day</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Essential Living Outflows:</strong> ${curr}${essentialBills.toFixed(2)} (Bills) + ${curr}${weeklySpend.toFixed(2)} (Weekly Living) = ${curr}${burnOutflows.toFixed(2)}</div>
        <div><strong>Payday Cycle Duration:</strong> ${days} days</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:var(--red);">
          = ${curr}${burnOutflows.toFixed(2)} &divide; ${days} days = ${curr}${dailyBurn.toFixed(2)} per day
        </div>
      </div>
    `;

    const catMap = {};
    (schedule.weeks || []).forEach(w => {
      const items = (typeof getWeekItems === 'function') ? getWeekItems(currentMonthName, w.name, currentYear) : [];
      items.forEach(it => {
        if (!it.is_income) {
          const cat = it.desc || 'General';
          catMap[cat] = (catMap[cat] || 0) + (Number(it.amount) || 0);
        }
      });
    });

    sectionsHtml = `
      ${renderSectionHeader('1. Fixed Essential Bills', `${curr}${essentialBills.toFixed(2)}`)}
      ${renderRow('Contractual Bills (Mortgage, Utilities, Tax, etc.)', `${curr}${essentialBills.toFixed(2)}`, 'var(--red)', `${curr}${(essentialBills / days).toFixed(2)} / day`)}

      ${renderSectionHeader('2. Weekly Living Expenses by Category', `${curr}${weeklySpend.toFixed(2)}`)}
      ${Object.entries(catMap).map(([cat, amt]) => renderRow(cat, `${curr}${amt.toFixed(2)}`, 'var(--text)', `${curr}${(amt / days).toFixed(2)} / day`)).join('')}
    `;
  } else if (tileId === 'emergency_runway') {
    const autoSavings = forecast.autoSavingsFromDDTotal || 0;
    const essentialBills = Math.max(0, forecast.totalDD - autoSavings);
    const weeklySpend = forecast.totalWeeklySpend;
    const monthlyEssentials = essentialBills + weeklySpend;
    const liquidReserves = Math.max(0, forecast.projectedMonthEndCurrent + (cfg.track_savings ? forecast.projectedMonthEndSavings : 0));
    const runwayMonths = monthlyEssentials > 0 ? (liquidReserves / monthlyEssentials).toFixed(1) : '∞';
    liveBadge = `<span style="background:rgba(16,185,129,0.15); color:var(--green); padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${runwayMonths} months</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Total Liquid Reserves:</strong> ${curr}${liquidReserves.toFixed(2)} (Current + Savings)</div>
        <div><strong>Monthly Living Essentials:</strong> ${curr}${monthlyEssentials.toFixed(2)} / month</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:var(--green);">
          = ${curr}${liquidReserves.toFixed(0)} &divide; ${curr}${monthlyEssentials.toFixed(0)} = ${runwayMonths} months of survival runway
        </div>
      </div>
    `;

    sectionsHtml = `
      ${renderSectionHeader('Liquid Reserves Breakdown', `${curr}${liquidReserves.toFixed(2)}`)}
      ${renderRow('Projected Current Cash', `${curr}${forecast.projectedMonthEndCurrent.toFixed(2)}`, 'var(--green)')}
      ${cfg.track_savings ? renderRow('Projected Savings Portfolio', `${curr}${forecast.projectedMonthEndSavings.toFixed(2)}`, 'var(--purple)') : ''}

      ${renderSectionHeader('Monthly Essentials Breakdown', `${curr}${monthlyEssentials.toFixed(2)} / mo`)}
      ${renderRow('Contractual Fixed Bills', `${curr}${essentialBills.toFixed(2)}`, 'var(--red)')}
      ${renderRow('Planned Living Spend (Groceries, Fuel, etc.)', `${curr}${weeklySpend.toFixed(2)}`, 'var(--red)')}
    `;
  } else if (tileId === 'projected_net_worth') {
    const curEnd = forecast.projectedMonthEndCurrent;
    const savEnd = cfg.track_savings ? forecast.projectedMonthEndSavings : 0;
    const credEnd = forecast.projectedMonthEndCredit;
    const netEnd = curEnd + savEnd - credEnd;
    liveBadge = `<span style="background:${netEnd >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${netEnd >= 0 ? 'var(--green)' : 'var(--red)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${curr}${netEnd.toFixed(2)}</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div style="color:var(--green);"><strong>Current Accounts:</strong> +${curr}${curEnd.toFixed(2)}</div>
        <div style="color:var(--purple);"><strong>+ Savings Portfolio:</strong> +${curr}${savEnd.toFixed(2)}</div>
        <div style="color:var(--red);"><strong>- Credit Card Debt:</strong> -${curr}${credEnd.toFixed(2)}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${netEnd >= 0 ? 'var(--green)' : 'var(--red)'};">
          = Projected Net Worth: ${curr}${netEnd.toFixed(2)}
        </div>
      </div>
    `;

    sectionsHtml = `
      ${renderSectionHeader('Current Operating Accounts', `${curr}${curEnd.toFixed(2)}`)}
      ${(cfg.current_accounts || []).map(acc => renderRow(acc, `${curr}${(forecast.weeklyPredictions?.[schedule.numWeeks - 1]?.weekCurrentSnap?.[acc] || 0).toFixed(2)}`)).join('')}

      ${cfg.track_savings ? `
        ${renderSectionHeader('Savings Accounts', `${curr}${savEnd.toFixed(2)}`)}
        ${(cfg.savings_accounts || []).map(s => renderRow(s, `${curr}${(forecast.weeklyPredictions?.[schedule.numWeeks - 1]?.weekSavingsSnap?.[s] || 0).toFixed(2)}`, 'var(--purple)')).join('')}
      ` : ''}

      ${renderSectionHeader('Credit Card Debt', `-${curr}${credEnd.toFixed(2)}`)}
      ${(cfg.credit_accounts || []).map(c => renderRow(c.name, `-${curr}${(forecast.weeklyPredictions?.[schedule.numWeeks - 1]?.weekCreditSnap?.[c.name] || 0).toFixed(2)}`, 'var(--red)')).join('')}
    `;
  } else if (tileId === 'credit_runway' || tileId === 'autopay_impact') {
    const debt = forecast.projectedMonthEndCredit;
    const limit = forecast.totalCreditLimit;
    const autoPay = forecast.totalAutoPayMonth;
    liveBadge = `<span style="background:rgba(239,68,68,0.15); color:var(--red); padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${curr}${debt.toFixed(2)} Debt</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Opening Credit Debt:</strong> -${curr}${forecast.totalCreditOpeningSpent.toFixed(2)}</div>
        <div style="color:var(--green);"><strong>+ Auto-Pay Settlements:</strong> +${curr}${autoPay.toFixed(2)}</div>
        <div style="color:var(--red);"><strong>- Planned Card Spending:</strong> -${curr}${(forecast.totalWeeklySpend - forecast.totalWeeklyCurrentSpend).toFixed(2)}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:var(--red);">
          = Month-End Credit Debt: -${curr}${debt.toFixed(2)} (Available Line: ${curr}${(limit - debt).toFixed(2)})
        </div>
      </div>
    `;

    sectionsHtml = `
      ${renderSectionHeader('Credit Cards Position', `-${curr}${debt.toFixed(2)}`)}
      ${(cfg.credit_accounts || []).map(c => {
        const spent = Number(mData.credit_data?.[c.name]?.opening_spent) || 0;
        const lim = Number(c.limit) || 0;
        return renderRow(c.name, `-${curr}${spent.toFixed(2)}`, 'var(--red)', `Limit: ${curr}${lim.toFixed(0)} &bull; Auto-Pay: ${c.autopay_enabled ? 'Yes (' + c.autopay_type + ')' : 'No'}`);
      }).join('')}
    `;
  } else if (tileId === 'savings_portfolio' || tileId === 'savings_rate') {
    const savGrowth = forecast.totalSavingsTransfers || 0;
    const savOpen = forecast.totalSavingsOpening;
    const savEnd = forecast.projectedMonthEndSavings;
    liveBadge = `<span style="background:rgba(168,85,247,0.15); color:var(--purple); padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">+${curr}${savGrowth.toFixed(2)} / mo</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Starting Savings:</strong> ${curr}${savOpen.toFixed(2)}</div>
        <div style="color:var(--purple);"><strong>+ Monthly Net Contributions:</strong> +${curr}${savGrowth.toFixed(2)}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:var(--purple);">
          = Projected Month-End Savings: ${curr}${savEnd.toFixed(2)}
        </div>
      </div>
    `;

    let savItems = '';
    (mData.deductions_list || []).forEach(d => {
      if ((cfg.savings_accounts || []).includes(d.target_account)) {
        cfg.people.forEach(p => {
          const amt = (d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0);
          if (amt > 0) savItems += renderRow(`Salary Transfer (${p}) &rarr; ${d.target_account}`, `+${curr}${amt.toFixed(2)}`, 'var(--purple)');
        });
      }
    });
    (mData.direct_debits || []).forEach(d => {
      if (d.transfer_to && (cfg.savings_accounts || []).includes(d.transfer_to)) {
        savItems += renderRow(`Direct Debit Transfer &rarr; ${d.transfer_to} (${d.name || d.desc})`, `+${curr}${Number(d.amount || 0).toFixed(2)}`, 'var(--purple)');
      }
    });

    sectionsHtml = `
      ${renderSectionHeader('Monthly Savings Contributions', `+${curr}${savGrowth.toFixed(2)}`)}
      ${savItems || '<div style="color:var(--text-muted); font-size:12px;">No savings transfers scheduled.</div>'}
    `;
  } else if (tileId === 'weekly_budget') {
    const activeWIdx = forecast.activeWeekIndex >= 0 ? forecast.activeWeekIndex : 0;
    const activeW = schedule.weeks[activeWIdx] || schedule.weeks[0];
    const items = (typeof getWeekItems === 'function') ? getWeekItems(currentMonthName, activeW?.name, currentYear) : [];
    const totalW = items.filter(i => !i.is_income).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    liveBadge = `<span style="background:rgba(56,189,248,0.15); color:var(--curr-border); padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${curr}${totalW.toFixed(2)}</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Active Week:</strong> ${activeW?.name} (${activeW?.label || ''})</div>
        <div><strong>Total Discretionary Living Allowance:</strong> ${curr}${totalW.toFixed(2)}</div>
      </div>
    `;

    sectionsHtml = `
      ${renderSectionHeader('Weekly Allowance Breakdown by Category', `${curr}${totalW.toFixed(2)}`)}
      ${items.filter(i => !i.is_income).map(it => renderRow(it.desc, `${curr}${Number(it.amount || 0).toFixed(2)}`, 'var(--text)', `Account: ${it.account_name || 'Credit Card'}`)).join('')}
    `;
  } else if (tileId === 'safe_to_spend') {
    const activeWIdx = forecast.activeWeekIndex >= 0 ? forecast.activeWeekIndex : 0;
    const activeW = schedule.weeks[activeWIdx] || schedule.weeks[0];
    const activeWPred = forecast.weeklyPredictions[activeWIdx] || {};
    const activeWActuals = (typeof getMonthData === 'function')
      ? (getMonthData(currentMonthName, currentYear)?.weekly_actuals?.[activeW?.name] || {})
      : (mData.weekly_actuals?.[activeW?.name] || {});
    const livePacing = (typeof calculateLiveDailyPacing === 'function' && activeW && activeWPred)
      ? calculateLiveDailyPacing(activeW, activeWPred, activeWActuals, cfg)
      : null;

    let daysRemainingInWeek = 7;
    if (livePacing && livePacing.isPacingActive) {
      const totalDays = Math.max(1, livePacing.totalDays || 7);
      daysRemainingInWeek = Math.max(1, totalDays - (livePacing.elapsedDays || 1) + 1);
    } else if (activeW && activeW.startDate && activeW.endDate) {
      const sDate = new Date(activeW.startDate);
      const eDate = new Date(activeW.endDate);
      const startMid = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();
      const endMid = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59).getTime();
      const weekTotalDays = Math.max(1, Math.round((endMid - startMid) / (1000 * 60 * 60 * 24)));
      daysRemainingInWeek = weekTotalDays;
      const nowMs = new Date().getTime();
      if (nowMs >= startMid && nowMs <= endMid) {
        daysRemainingInWeek = Math.max(1, Math.ceil((endMid - nowMs) / (1000 * 60 * 60 * 24)));
      }
    }

    const hasActual = (activeWPred && activeWPred.actualNet !== null && activeWPred.actualNet !== undefined);
    const weekSpendTotal = activeWPred.wSpend || 0;
    let safeDailySpend = 0;
    let pacingStatusText = 'On Track';
    let remainingToSpend = 0;
    let actualSurplusAboveTarget = 0;
    let upcomingBills = 0;
    let upcomingInflow = 0;

    if (hasActual) {
      upcomingBills = livePacing ? (livePacing.upcomingDDTotal || 0) : 0;
      upcomingInflow = livePacing ? (livePacing.upcomingIncomeTotal || 0) : 0;
      actualSurplusAboveTarget = (activeWPred.actualNet - activeWPred.predictedNet);
      remainingToSpend = actualSurplusAboveTarget - upcomingBills + upcomingInflow;
      safeDailySpend = Math.max(0, remainingToSpend / daysRemainingInWeek);

      if (livePacing && livePacing.liveDailyVariance !== null && livePacing.liveDailyVariance !== undefined) {
        if (livePacing.liveDailyVariance >= 15) {
          pacingStatusText = 'Ahead of Budget Pace';
        } else if (livePacing.liveDailyVariance < -25) {
          pacingStatusText = 'Over Budget Pace';
        } else {
          pacingStatusText = 'On Track';
        }
      } else {
        pacingStatusText = remainingToSpend <= 0 ? 'Over Budget Pace' : (remainingToSpend < (weekSpendTotal) * (daysRemainingInWeek / 7) ? 'Tight Budget' : 'On Track');
      }
    } else {
      const weekTotalDays = livePacing?.totalDays || 7;
      safeDailySpend = (activeWPred.wSpend || 0) / Math.max(1, weekTotalDays);
      pacingStatusText = 'On Track';
    }

    liveBadge = `<span style="background:${safeDailySpend >= 20 ? 'rgba(16,185,129,0.15)' : (safeDailySpend > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)')}; color:${safeDailySpend >= 20 ? 'var(--green)' : (safeDailySpend > 0 ? 'var(--amber)' : 'var(--red)')}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${curr}${safeDailySpend.toFixed(2)} / day</span>`;

    if (hasActual) {
      formulaHtml = `
        <div style="font-size:12px; line-height:1.6; color:var(--heading);">
          <div><strong>Actual Net Check-in Today:</strong> ${curr}${activeWPred.actualNet.toFixed(2)}</div>
          <div><strong>Sunday Closing Target:</strong> ${curr}${activeWPred.predictedNet.toFixed(2)}</div>
          <div style="color:${actualSurplusAboveTarget >= 0 ? 'var(--green)' : 'var(--red)'};">
            <strong>Cushion Above Sunday Target:</strong> ${actualSurplusAboveTarget >= 0 ? '+' : ''}${curr}${actualSurplusAboveTarget.toFixed(2)}
          </div>
          ${upcomingBills > 0 ? `<div style="color:var(--red);"><strong>- Upcoming Bills Before Sunday:</strong> -${curr}${upcomingBills.toFixed(2)}</div>` : ''}
          ${upcomingInflow > 0 ? `<div style="color:var(--green);"><strong>+ Upcoming Inflows Before Sunday:</strong> +${curr}${upcomingInflow.toFixed(2)}</div>` : ''}
          <div style="border-top:1px dashed var(--border); margin-top:4px; padding-top:4px;">
            <strong>True Discretionary Cash Remaining:</strong> ${curr}${Math.max(0, remainingToSpend).toFixed(2)}
          </div>
          <div><strong>Days Remaining in Week:</strong> ${daysRemainingInWeek} days (including today)</div>
          <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${safeDailySpend >= 20 ? 'var(--green)' : (safeDailySpend > 0 ? 'var(--amber)' : 'var(--red)')};">
            = Safe-to-Spend Daily Pace: ${curr}${Math.max(0, remainingToSpend).toFixed(2)} &divide; ${daysRemainingInWeek} days = ${curr}${safeDailySpend.toFixed(2)} / day
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
            ${pacingStatusText}: ${remainingToSpend <= 0 ? '⚠️ No safe spending allowance remaining without missing your Sunday target.' : (safeDailySpend < 10 ? '⚠️ Discretionary allowance is running very tight to protect your Sunday target.' : '✅ Healthy daily pace to finish the week on or ahead of target.')}
          </div>
        </div>
      `;
    } else {
      formulaHtml = `
        <div style="font-size:12px; line-height:1.6; color:var(--heading);">
          <div><strong>Weekly Planned Budget:</strong> ${curr}${weekSpendTotal.toFixed(2)}</div>
          <div><strong>Days in Week:</strong> ${daysRemainingInWeek} days</div>
          <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:var(--curr-border);">
            = Planned Daily Pace: ${curr}${weekSpendTotal.toFixed(2)} &divide; ${daysRemainingInWeek} days = ${curr}${safeDailySpend.toFixed(2)} / day
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
            💡 Enter an account check-in to see your live pacing based on actual bank balances.
          </div>
        </div>
      `;
    }

    const weekItems = (typeof getWeekItems === 'function')
      ? getWeekItems(currentMonthName, activeW?.name, currentYear)
      : (mData.weekly_items?.[activeW?.name] || []);

    sectionsHtml = `
      ${renderSectionHeader('Active Week Pacing Parameters', pacingStatusText)}
      ${renderRow('Sunday Closing Target', `${curr}${activeWPred.predictedNet.toFixed(2)}`)}
      ${hasActual ? renderRow('Live Net Check-in', `${curr}${activeWPred.actualNet.toFixed(2)}`, activeWPred.actualNet >= activeWPred.predictedNet ? 'var(--green)' : 'var(--red)') : ''}
      ${renderRow('Planned Week Allowance', `${curr}${weekSpendTotal.toFixed(2)}`)}
      ${renderRow('Days Remaining (incl. Today)', `${daysRemainingInWeek} days`)}

      ${renderSectionHeader('Active Week Discretionary Budget Categories', `${curr}${weekSpendTotal.toFixed(2)}`)}
      <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
        ${(weekItems || []).filter(i => !i.is_income).map(it => renderRow(it.desc || 'General', `${curr}${Number(it.amount || 0).toFixed(2)}`, 'var(--text)', `Account: ${it.account_name || 'Credit Card'}`)).join('') || '<div style="color:var(--text-muted); font-size:12px;">No budget items.</div>'}
      </div>
    `;
  } else if (tileId === 'spendable_cash_remaining') {
    const activeWIdx = forecast.activeWeekIndex >= 0 ? forecast.activeWeekIndex : 0;
    const activeW = schedule.weeks[activeWIdx] || schedule.weeks[0];
    const activeWPred = forecast.weeklyPredictions[activeWIdx] || {};
    const hasActual = (activeWPred.actualNet !== null && activeWPred.actualNet !== undefined);

    let spendableMode = 'all_bills';
    try {
      const savedMode = localStorage.getItem('habit_spendable_cash_mode');
      if (savedMode === 'future_only' || savedMode === 'all_bills') spendableMode = savedMode;
    } catch (e) {}

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndMs = todayEnd.getTime();

    const weekDDsWithCleared = (activeWPred.wDDs || []).map(b => {
      const occDateStr = resolveOccDateStr(b, currentMonthName, currentYear);
      const isRecurring = Boolean(b.isRecurring || b.source_type === 'recurring_payment');
      const isCleared = isRecurring
        ? Boolean(b.cleared_dates && occDateStr && b.cleared_dates.includes(occDateStr))
        : Boolean(b.auto_cleared || b.status === 'paid' || (b.cleared_dates && occDateStr && b.cleared_dates.includes(occDateStr)));
      let pDate = null;
      if (b.actualPaymentDate) pDate = new Date(b.actualPaymentDate);
      else if (b.exact_date) pDate = new Date(b.exact_date);
      else if (b.due_day && currentMonthName) pDate = new Date(currentYear, months.indexOf(currentMonthName), b.due_day);
      const isPastDate = pDate ? (pDate.getTime() <= todayEndMs) : false;
      return { ...b, occDateStr, isCleared, isPastDate, pDate };
    });

    const weekIncomesWithCleared = (activeWPred.wIncomes || []).map(inc => {
      const occDateStr = resolveOccDateStr(inc, currentMonthName, currentYear);
      const isRecurring = Boolean(inc.isRecurring || inc.source_type === 'recurring_income');
      const isCleared = isRecurring
        ? Boolean(inc.cleared_dates && occDateStr && inc.cleared_dates.includes(occDateStr))
        : Boolean(inc.auto_cleared || inc.status === 'paid' || (inc.cleared_dates && occDateStr && inc.cleared_dates.includes(occDateStr)));
      let pDate = null;
      if (inc.actualPaymentDate) pDate = new Date(inc.actualPaymentDate);
      else if (inc.exact_date) pDate = new Date(inc.exact_date);
      else if (inc.due_day && currentMonthName) pDate = new Date(currentYear, months.indexOf(currentMonthName), inc.due_day);
      const isPastDate = pDate ? (pDate.getTime() <= todayEndMs) : false;
      return { ...inc, occDateStr, isCleared, isPastDate, pDate };
    });

    const unclearedPastAndTodayBills = weekDDsWithCleared.filter(b => !b.isCleared && b.isPastDate);
    const unclearedPastAndTodayBillsTotal = unclearedPastAndTodayBills.reduce((s, b) => s + (Number(b.amount) || 0), 0);

    const unclearedFutureBills = weekDDsWithCleared.filter(b => !b.isCleared && !b.isPastDate);
    const unclearedFutureBillsTotal = unclearedFutureBills.reduce((s, b) => s + (Number(b.amount) || 0), 0);

    const clearedBills = weekDDsWithCleared.filter(b => b.isCleared);
    const clearedBillsTotal = clearedBills.reduce((s, b) => s + (Number(b.amount) || 0), 0);

    const unclearedPastAndTodayIncomes = weekIncomesWithCleared.filter(i => !i.isCleared && i.isPastDate);
    const unclearedPastAndTodayIncomesTotal = unclearedPastAndTodayIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const unclearedFutureIncomes = weekIncomesWithCleared.filter(i => !i.isCleared && !i.isPastDate);
    const unclearedFutureIncomesTotal = unclearedFutureIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const allUnclearedBillsTotal = unclearedPastAndTodayBillsTotal + unclearedFutureBillsTotal;
    const allUnclearedIncomesTotal = unclearedPastAndTodayIncomesTotal + unclearedFutureIncomesTotal;

    const rawSurplus = hasActual ? (activeWPred.actualNet - activeWPred.predictedNet) : 0;
    const spendableSafeFloor = hasActual
      ? (rawSurplus - allUnclearedBillsTotal + allUnclearedIncomesTotal)
      : 0;
    const spendableBankAdjusted = hasActual
      ? (rawSurplus - unclearedFutureBillsTotal + unclearedFutureIncomesTotal)
      : 0;

    const activeSpendable = spendableMode === 'future_only' ? spendableBankAdjusted : spendableSafeFloor;
    const isSurplus = activeSpendable >= 0;

    modalTitle = `💳 Spendable Cash Remaining Breakdown`;
    liveBadge = hasActual
      ? `<span style="background:${isSurplus ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isSurplus ? 'var(--green)' : 'var(--red)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${isSurplus ? '+' : '-'}${curr}${Math.abs(activeSpendable).toFixed(2)} (${spendableMode === 'future_only' ? 'Future Bills Only' : "Holding Today's Bills"})</span>`
      : `<span style="background:rgba(20,184,166,0.15); color:#14b8a6; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">Pending Check-in</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <!-- Side-by-Side Comparison Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-bottom:12px;">
          <div style="background:rgba(255,255,255,0.03); border:1.5px solid ${spendableMode === 'all_bills' ? 'var(--primary)' : 'var(--border)'}; border-radius:8px; padding:10px 12px; cursor:pointer;" onclick="window.budgetApp.setSpendableCashMode('all_bills'); window.budgetApp.openTileCalculationModal('spendable_cash_remaining');">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:11px; font-weight:700; color:var(--heading);">🛡️ Holding Today's Bills (Safest)</span>
              ${spendableMode === 'all_bills' ? '<span class="badge green" style="font-size:8.5px; padding:1px 5px;">ACTIVE</span>' : ''}
            </div>
            <div style="font-size:18px; font-weight:700; color:${spendableSafeFloor >= 0 ? 'var(--green)' : 'var(--red)'}; margin-bottom:2px;">
              ${spendableSafeFloor >= 0 ? '+' : '-'}${curr}${Math.abs(spendableSafeFloor).toFixed(2)}
            </div>
            <div style="font-size:10.5px; color:var(--text-muted); line-height:1.35;">
              Holds money for all unpaid bills. Safe if today's direct debits haven't left your bank yet.
            </div>
          </div>

          <div style="background:rgba(255,255,255,0.03); border:1.5px solid ${spendableMode === 'future_only' ? 'var(--primary)' : 'var(--border)'}; border-radius:8px; padding:10px 12px; cursor:pointer;" onclick="window.budgetApp.setSpendableCashMode('future_only'); window.budgetApp.openTileCalculationModal('spendable_cash_remaining');">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:11px; font-weight:700; color:var(--heading);">⚡ Future Bills Only (Bank Live)</span>
              ${spendableMode === 'future_only' ? '<span class="badge green" style="font-size:8.5px; padding:1px 5px;">ACTIVE</span>' : ''}
            </div>
            <div style="font-size:18px; font-weight:700; color:${spendableBankAdjusted >= 0 ? 'var(--green)' : 'var(--red)'}; margin-bottom:2px;">
              ${spendableBankAdjusted >= 0 ? '+' : '-'}${curr}${Math.abs(spendableBankAdjusted).toFixed(2)}
            </div>
            <div style="font-size:10.5px; color:var(--text-muted); line-height:1.35;">
              Deducts future bills only. Use if your bank balance already deducted today's bills.
            </div>
          </div>
        </div>

        <!-- Step-by-Step Waterfall Formula -->
        <div style="background:rgba(0,0,0,0.15); border-radius:6px; padding:8px 10px; font-size:11.5px;">
          <div style="display:flex; justify-content:space-between; padding:2px 0;">
            <span>Actual Net Bank Balance Today:</span>
            <strong>${hasActual ? curr + activeWPred.actualNet.toFixed(2) : 'No check-in'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:2px 0; color:var(--text-muted);">
            <span>- Sunday Closing Target Goal:</span>
            <strong>-${curr}${activeWPred.predictedNet.toFixed(2)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:3px 0; border-top:1px dashed var(--border); margin-top:2px; color:${rawSurplus >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:600;">
            <span>= Raw Cushion Above Sunday Target:</span>
            <span>${rawSurplus >= 0 ? '+' : '-'}${curr}${Math.abs(rawSurplus).toFixed(2)}</span>
          </div>
          ${unclearedPastAndTodayBillsTotal > 0 ? `
            <div style="display:flex; justify-content:space-between; padding:2px 0; color:var(--amber);">
              <span>- Bills Due Today or Earlier (Unpaid):</span>
              <strong>-${curr}${unclearedPastAndTodayBillsTotal.toFixed(2)}</strong>
            </div>
          ` : ''}
          ${unclearedFutureBillsTotal > 0 ? `
            <div style="display:flex; justify-content:space-between; padding:2px 0; color:var(--red);">
              <span>- Bills Due Later This Week:</span>
              <strong>-${curr}${unclearedFutureBillsTotal.toFixed(2)}</strong>
            </div>
          ` : ''}
          ${allUnclearedIncomesTotal > 0 ? `
            <div style="display:flex; justify-content:space-between; padding:2px 0; color:var(--green);">
              <span>+ Remaining Incomes Clearing:</span>
              <strong>+${curr}${allUnclearedIncomesTotal.toFixed(2)}</strong>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; padding:4px 0 2px 0; border-top:1.5px dashed var(--border); margin-top:4px; font-size:12.5px; font-weight:700; color:${spendableSafeFloor >= 0 ? 'var(--green)' : 'var(--red)'};">
            <span>= Spendable Cash (Holding Today's Bills):</span>
            <span>${spendableSafeFloor >= 0 ? '+' : '-'}${curr}${Math.abs(spendableSafeFloor).toFixed(2)}</span>
          </div>
          ${unclearedPastAndTodayBillsTotal > 0 ? `
            <div style="display:flex; justify-content:space-between; padding:2px 0; font-size:12px; font-weight:700; color:${spendableBankAdjusted >= 0 ? 'var(--green)' : 'var(--red)'};">
              <span>= Spendable Cash (Future Bills Only):</span>
              <span>${spendableBankAdjusted >= 0 ? '+' : '-'}${curr}${Math.abs(spendableBankAdjusted).toFixed(2)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    let pastBillsList = '';
    unclearedPastAndTodayBills.forEach(b => {
      const cleanDesc = (b.rawDesc || b.desc || b.name || '').replace(/'/g, "\\'");
      const sType = b.source_type || 'direct_debit';
      const sIdx = b.source_idx !== undefined ? b.source_idx : 0;
      const amt = Number(b.amount) || 0;
      const occStr = b.occDateStr || '';
      const actionBtn = `
        <button type="button" class="btn green" style="font-size:9.5px; padding:2px 8px; border-radius:10px; height:auto;"
          onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${currentMonthName}', '${cleanDesc}', ${amt}, '${occStr}'); window.budgetApp.closeModal(); setTimeout(() => window.budgetApp.openTileCalculationModal('spendable_cash_remaining'), 200);">
          ✓ Mark Cleared
        </button>
      `;
      pastBillsList += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
          <div>
            <div style="font-weight:600; color:var(--heading);">${b.desc || b.name}</div>
            <div style="font-size:10.5px; color:var(--text-muted);">${b.account || 'Joint Account'} &bull; Due ${b.actualDateStr || ('Day ' + b.due_day)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:var(--amber);">-${curr}${amt.toFixed(2)}</strong>
            ${actionBtn}
          </div>
        </div>
      `;
    });

    let futureBillsList = '';
    unclearedFutureBills.forEach(b => {
      futureBillsList += renderRow(
        (b.desc || b.name),
        `-${curr}${Number(b.amount || 0).toFixed(2)}`,
        'var(--red)',
        `${b.account || 'Joint Account'} &bull; Due ${b.actualDateStr || ('Day ' + b.due_day)}`
      );
    });

    let clearedBillsList = '';
    clearedBills.forEach(b => {
      clearedBillsList += renderRow(
        (b.desc || b.name) + ` <span class="badge green" style="font-size:9px; padding:1px 5px; margin-left:4px;">✓ Cleared</span>`,
        `-${curr}${Number(b.amount || 0).toFixed(2)}`,
        'var(--green)',
        `${b.account || 'Joint Account'} &bull; ${b.actualDateStr || ('Day ' + b.due_day)}`
      );
    });

    sectionsHtml = `
      ${unclearedPastAndTodayBillsTotal > 0 ? `
        ${renderSectionHeader("1. Bills Due Today or Earlier (Unpaid)", `-${curr}${unclearedPastAndTodayBillsTotal.toFixed(2)}`)}
        <div style="font-size:11px; color:var(--text-muted); background:rgba(245,158,11,0.08); border-left:3px solid var(--amber); padding:6px 8px; border-radius:0 6px 6px 0; margin-bottom:8px; line-height:1.4;">
          ⚠️ <strong>Difference between calculations:</strong> If these ${unclearedPastAndTodayBills.length} bill${unclearedPastAndTodayBills.length === 1 ? '' : 's'} have already left your bank account, you have <strong>${spendableBankAdjusted >= 0 ? '+' : '-'}${curr}${Math.abs(spendableBankAdjusted).toFixed(2)}</strong> left to spend. Click "Mark Cleared" once they show on your bank statement.
        </div>
        <div style="max-height:150px; overflow-y:auto; padding-right:4px; margin-bottom:12px;">
          ${pastBillsList}
        </div>
      ` : ''}

      ${renderSectionHeader(`2. Bills Due Later This Week (${unclearedFutureBills.length})`, `-${curr}${unclearedFutureBillsTotal.toFixed(2)}`)}
      <div style="max-height:140px; overflow-y:auto; padding-right:4px; margin-bottom:12px;">
        ${futureBillsList || '<div style="color:var(--text-muted); font-size:12px;">No future bills remaining this week.</div>'}
      </div>

      ${clearedBills.length > 0 ? `
        ${renderSectionHeader(`3. Bills Already Cleared (${clearedBills.length})`, `-${curr}${clearedBillsTotal.toFixed(2)}`)}
        <div style="max-height:130px; overflow-y:auto; padding-right:4px;">
          ${clearedBillsList}
        </div>
      ` : ''}
    `;
  } else if (tileId === 'actual_variance') {
    const activeWIdx = forecast.activeWeekIndex >= 0 ? forecast.activeWeekIndex : 0;
    const activeWPred = forecast.weeklyPredictions[activeWIdx] || {};
    const hasActual = (activeWPred.actualNet !== null && activeWPred.actualNet !== undefined);
    const variance = hasActual ? (activeWPred.actualNet - activeWPred.predictedNet) : 0;
    modalTitle = `🎯 Sunday Target (Raw) Breakdown`;
    liveBadge = `<span style="background:${variance >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${variance >= 0 ? 'var(--green)' : 'var(--red)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${variance >= 0 ? '+' : ''}${curr}${variance.toFixed(2)}</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Actual Net Check-in Today:</strong> ${hasActual ? curr + activeWPred.actualNet.toFixed(2) : 'No check-in entered yet'}</div>
        <div><strong>Sunday Closing Target:</strong> ${curr}${activeWPred.predictedNet.toFixed(2)}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${variance >= 0 ? 'var(--green)' : 'var(--red)'};">
          = Raw Variance vs Sunday Target: ${variance >= 0 ? '+' : ''}${curr}${variance.toFixed(2)} ${variance >= 0 ? '(Raw Surplus)' : '(Raw Shortfall)'}
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
          ℹ️ Note: This is the raw cash comparison directly against Sunday closing. It does not deduct unpaid bills due this week. See Spendable Cash Remaining for true spendable funds.
        </div>
      </div>
    `;

    sectionsHtml = `
      ${renderSectionHeader('Sunday Closing Target Breakdown', `${curr}${activeWPred.predictedNet.toFixed(2)}`)}
      ${renderRow('Week Starting Net Balance', `${curr}${(activeWPred.startNet || 0).toFixed(2)}`)}
      ${renderRow('Inflows Clearing This Week', `+${curr}${(activeWPred.wIncomeTotal || 0).toFixed(2)}`, 'var(--green)')}
      ${renderRow('Scheduled Bills Clearing This Week', `-${curr}${(activeWPred.wDDTotal || 0).toFixed(2)}`, 'var(--red)')}
      ${renderRow('Weekly Living Budget Allowance', `-${curr}${(activeWPred.wSpend || 0).toFixed(2)}`, 'var(--red)')}
    `;
  } else if (tileId === 'daily_variance') {
    const activeWIdx = forecast.activeWeekIndex >= 0 ? forecast.activeWeekIndex : 0;
    const activeW = schedule.weeks[activeWIdx] || schedule.weeks[0];
    const activeWPred = forecast.weeklyPredictions[activeWIdx] || {};
    const activeWActuals = (mData.weekly_actuals && activeW?.name && mData.weekly_actuals[activeW.name]) || {};
    const livePacing = (typeof calculateLiveDailyPacing === 'function' && activeW && activeWPred)
      ? calculateLiveDailyPacing(activeW, activeWPred, activeWActuals, cfg)
      : null;
    const hasActual = (activeWPred.actualNet !== null && activeWPred.actualNet !== undefined);
    const variance = (hasActual && livePacing && livePacing.liveDailyVariance !== null && livePacing.liveDailyVariance !== undefined)
      ? livePacing.liveDailyVariance
      : (hasActual ? (activeWPred.actualNet - activeWPred.predictedNet) : 0);
    const pacedTarget = (livePacing && livePacing.pacedTargetNetToday !== null && livePacing.pacedTargetNetToday !== undefined)
      ? livePacing.pacedTargetNetToday
      : (activeWPred.predictedNet || 0);
    const elapsed = (livePacing && typeof livePacing.elapsedDays === 'number') ? livePacing.elapsedDays : 1;
    const totalDays = (livePacing && typeof livePacing.totalDays === 'number') ? livePacing.totalDays : 7;
    const daysRemaining = Math.max(0, totalDays - elapsed);
    const now = new Date();
    liveBadge = `<span style="background:${variance >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${variance >= 0 ? 'var(--green)' : 'var(--red)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${variance >= 0 ? '+' : ''}${curr}${variance.toFixed(2)}</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Actual Net Check-in:</strong> ${hasActual ? curr + activeWPred.actualNet.toFixed(2) : 'No check-in entered'}</div>
        <div><strong>Paced Target Net Today:</strong> ${curr}${pacedTarget.toFixed(2)}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${variance >= 0 ? 'var(--green)' : 'var(--red)'};">
          = Live Daily Variance: ${variance >= 0 ? '+' : ''}${curr}${variance.toFixed(2)} ${variance >= 0 ? '(Pacing Surplus)' : '(Pacing Deficit)'}
        </div>
      </div>
    `;

    sectionsHtml = `
      ${renderSectionHeader('Intra-Week Pacing Parameters', '')}
      ${renderRow('Day of Week', `${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`)}
      ${renderRow('Elapsed Days in Week', `${elapsed} of ${totalDays} days`)}
      ${renderRow('Days Remaining in Week', `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`)}
      ${renderRow('Planned Week Spend', `${curr}${(activeWPred.wSpend || 0).toFixed(2)}`)}
    `;
  } else if (tileId === 'cashflow_architecture') {
    const totalInflow = forecast.totalCurrentInflow + forecast.totalMonthPaymentsIn;
    const fixedBills = forecast.contractualFixedBills !== undefined
      ? forecast.contractualFixedBills
      : Math.max(0, forecast.totalDD - (forecast.autoSavingsFromDDTotal || 0));
    const weeklySpend = forecast.totalWeeklyCurrentSpend;
    const autoPay = forecast.totalAutoPayMonth;
    const surplus = totalInflow - fixedBills - weeklySpend - autoPay;

    modalTitle = `🍰 Cashflow Architecture Breakdown`;
    liveBadge = `<span style="background:${surplus >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${surplus >= 0 ? 'var(--green)' : 'var(--red)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">Surplus: ${curr}${surplus.toFixed(2)}</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div style="color:var(--green);"><strong>Total Expected Inflows:</strong> +${curr}${totalInflow.toFixed(2)}</div>
        <div style="color:var(--red);"><strong>- Fixed Essential Bills:</strong> -${curr}${fixedBills.toFixed(2)} (${totalInflow > 0 ? Math.round((fixedBills / totalInflow) * 100) : 0}%)</div>
        <div style="color:var(--red);"><strong>- Weekly Living Budget (Cash):</strong> -${curr}${weeklySpend.toFixed(2)} (${totalInflow > 0 ? Math.round((weeklySpend / totalInflow) * 100) : 0}%)</div>
        ${autoPay > 0 ? `<div style="color:var(--amber);"><strong>- Credit Auto-Pay Settlements:</strong> -${curr}${autoPay.toFixed(2)} (${totalInflow > 0 ? Math.round((autoPay / totalInflow) * 100) : 0}%)</div>` : ''}
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${surplus >= 0 ? 'var(--green)' : 'var(--red)'};">
          = Projected Net Monthly Surplus: ${curr}${surplus.toFixed(2)}
        </div>
      </div>
    `;

    sectionsHtml = `
      ${renderSectionHeader('1. Inflows (Salary & Scheduled)', `+${curr}${totalInflow.toFixed(2)}`)}
      ${renderRow('Primary Inflows', `+${curr}${totalInflow.toFixed(2)}`, 'var(--green)')}

      ${renderSectionHeader('2. Committed Contractual Bills', `-${curr}${fixedBills.toFixed(2)}`)}
      ${renderRow('Fixed Direct Debits & Regular Bills', `-${curr}${fixedBills.toFixed(2)}`, 'var(--red)')}

      ${renderSectionHeader('3. Planned Weekly Living Spend', `-${curr}${weeklySpend.toFixed(2)}`)}
      ${renderRow('Discretionary Cash Allowances', `-${curr}${weeklySpend.toFixed(2)}`, 'var(--red)')}

      ${autoPay > 0 ? `
        ${renderSectionHeader('4. Credit Card Settlements', `-${curr}${autoPay.toFixed(2)}`)}
        ${renderRow('Auto-Pay Deductions from Current', `-${curr}${autoPay.toFixed(2)}`, 'var(--amber)')}
      ` : ''}
    `;
  } else if (tileId === 'cycle_velocity') {
    const days = forecast.totalCycleDays || 28;
    const elapsed = forecast.elapsedCycleDays || 0;
    const pct = forecast.percentElapsed || 0;
    liveBadge = `<span style="background:rgba(56,189,248,0.15); color:var(--curr-border); padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">${pct}% elapsed</span>`;

    formulaHtml = `
      <div style="font-size:12px; line-height:1.6; color:var(--heading);">
        <div><strong>Cycle Start Date:</strong> ${forecast.cycleStart?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
        <div><strong>Cycle End Date:</strong> ${forecast.cycleEnd?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:var(--curr-border);">
          = ${elapsed} of ${days} days elapsed (${pct}% of payday cycle)
        </div>
      </div>
    `;
  } else {
    formulaHtml = `
      <div style="font-size:12px; color:var(--heading);">
        <p>${tile.explanation || ''}</p>
        <div style="background:var(--card-bg); padding:8px 10px; border-radius:6px; border:1px solid var(--border); margin-top:6px;">
          <code>${tile.formula || ''}</code>
        </div>
      </div>
    `;
  }

  const modalBody = `
    <div style="font-size:13px; line-height:1.5;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Live Calculated Metric</span>
        ${liveBadge}
      </div>

      <div style="background:var(--card-bg, #1e293b); border:1.5px solid var(--border, #334155); border-radius:8px; padding:12px 14px; margin-bottom:12px;">
        <div style="font-size:10.5px; font-weight:700; color:var(--curr-border); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Calculation Formula & Live Figures</div>
        ${formulaHtml}
      </div>

      ${sectionsHtml}
    </div>
  `;

  showModal({
    title: modalTitle,
    body: modalBody,
    actions: `
      <button class="btn primary" onclick="window.budgetApp.navigateForecastTile('${tile.id}', '${navTarget}'); window.budgetApp.closeModal();">
        ${navBtnLabel}
      </button>
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>
    `
  });
}

export function openWeekCalculationModal(weekIdx = 0) {
  const cfg = getSettings();
  const curr = cfg.currency || '£';
  const currentPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: appState.currentYear, month: appState.currentTab || 'Jan' };
  const currentYear = currentPeriod.year;
  const currentMonthName = currentPeriod.month;

  const forecast = (typeof calculateMonthForecast === 'function')
    ? calculateMonthForecast(currentMonthName, currentYear)
    : null;
  if (!forecast || !forecast.weeklyPredictions || !forecast.weeklyPredictions[weekIdx]) return;

  const wp = forecast.weeklyPredictions[weekIdx];
  const wObj = wp.wObj || { name: `Week ${weekIdx + 1}`, label: '' };
  const yData = getYearData(currentYear) || {};
  const mData = (yData.months && yData.months[currentMonthName]) ? yData.months[currentMonthName] : {};

  const startNet = (wp.startNet !== undefined && wp.startNet !== null) ? wp.startNet : 0;
  const inAmt = wp.wIncomeTotal || 0;
  const ddAmt = wp.wDDTotal || 0;
  const spendAmt = wp.wSpend || 0;
  const closeNet = wp.predictedNet || 0;

  const weekDDsWithCleared = (wp.wDDs || []).map(b => {
    const occDateStr = resolveOccDateStr(b, currentMonthName, currentYear);
    const isRecurring = Boolean(b.isRecurring || b.source_type === 'recurring_payment');
    const isCleared = isRecurring
      ? Boolean(b.cleared_dates && occDateStr && b.cleared_dates.includes(occDateStr))
      : Boolean(b.auto_cleared || b.status === 'paid' || (b.cleared_dates && occDateStr && b.cleared_dates.includes(occDateStr)));
    return { ...b, isCleared, occDateStr };
  });

  const clearedDDTotal = weekDDsWithCleared.filter(b => b.isCleared).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const remainingDDTotal = weekDDsWithCleared.filter(b => !b.isCleared).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const clearedDDCount = weekDDsWithCleared.filter(b => b.isCleared).length;
  const remainingDDCount = weekDDsWithCleared.filter(b => !b.isCleared).length;

  const weekIncomesWithCleared = (wp.wIncomes || []).map(inc => {
    const occDateStr = resolveOccDateStr(inc, currentMonthName, currentYear);
    const isRecurring = Boolean(inc.isRecurring || inc.source_type === 'recurring_income');
    const isCleared = isRecurring
      ? Boolean(inc.cleared_dates && occDateStr && inc.cleared_dates.includes(occDateStr))
      : Boolean(inc.auto_cleared || inc.status === 'paid' || (inc.cleared_dates && occDateStr && inc.cleared_dates.includes(occDateStr)));
    return { ...inc, isCleared, occDateStr };
  });

  const clearedIncomeTotal = weekIncomesWithCleared.filter(i => i.isCleared).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const remainingIncomeTotal = weekIncomesWithCleared.filter(i => !i.isCleared).reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const renderRow = (label, amt, color = 'var(--text)', sub = '') => `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
      <div style="padding-right:8px;">
        <span style="color:var(--text);">${label}</span>
        ${sub ? `<div style="font-size:10px; color:var(--text-muted); margin-top:1px;">${sub}</div>` : ''}
      </div>
      <strong style="color:${color}; white-space:nowrap; margin-left:10px;">${amt}</strong>
    </div>
  `;

  const renderSectionHeader = (title, total = '') => `
    <div style="font-size:11px; font-weight:700; color:var(--curr-border); text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px 0; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--border); padding-bottom:4px;">
      <span>${title}</span>
      ${total ? `<span style="font-size:11.5px; font-weight:700; color:var(--heading);">${total}</span>` : ''}
    </div>
  `;

  const liveBadge = `<span style="background:${closeNet >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${closeNet >= 0 ? 'var(--green)' : 'var(--red)'}; padding:4px 10px; border-radius:12px; font-weight:700; font-size:13px;">Target: ${curr}${closeNet.toFixed(2)}</span>`;

  const formulaHtml = `
    <div style="font-size:12px; line-height:1.6; color:var(--heading);">
      <div><strong>Week Starting Net Position:</strong> ${curr}${startNet.toFixed(2)}</div>
      <div style="color:var(--green);"><strong>+ Inflows Clearing (Total Planned):</strong> +${curr}${inAmt.toFixed(2)}</div>
      ${inAmt > 0 ? `
        <div style="font-size:11px; padding:3px 8px; margin:2px 0 4px 12px; background:rgba(255,255,255,0.03); border-left:2.5px solid var(--green); border-radius:0 4px 4px 0; color:var(--text-muted); line-height:1.5;">
          <span>✓ Received: <strong style="color:var(--green);">+${curr}${clearedIncomeTotal.toFixed(2)}</strong> (${weekIncomesWithCleared.filter(i => i.isCleared).length} items)</span><br>
          <span>⏳ Pending: <strong style="color:var(--curr-border);">+${curr}${remainingIncomeTotal.toFixed(2)}</strong> (${weekIncomesWithCleared.filter(i => !i.isCleared).length} items)</span>
        </div>
      ` : ''}
      <div style="color:var(--red);"><strong>- Scheduled Bills Clearing (Total Planned):</strong> -${curr}${ddAmt.toFixed(2)}</div>
      <div style="font-size:11px; padding:3px 8px; margin:2px 0 4px 12px; background:rgba(255,255,255,0.03); border-left:2.5px solid var(--amber); border-radius:0 4px 4px 0; color:var(--text-muted); line-height:1.5;">
        <span>✓ Already Cleared: <strong style="color:var(--green);">-${curr}${clearedDDTotal.toFixed(2)}</strong> (${clearedDDCount} bills)</span><br>
        <span>⚠️ Remaining to Clear: <strong style="color:${remainingDDTotal > 0 ? 'var(--amber)' : 'var(--green)'};">-${curr}${remainingDDTotal.toFixed(2)}</strong> (${remainingDDCount} bills)</span>
      </div>
      <div style="color:var(--red);"><strong>- Weekly Living Budget:</strong> -${curr}${spendAmt.toFixed(2)}</div>
      <div style="border-top:1.5px dashed var(--border); margin-top:6px; padding-top:6px; font-size:13.5px; font-weight:700; color:${closeNet >= 0 ? 'var(--green)' : 'var(--red)'};">
        = Sunday Closing Net Target: ${curr}${closeNet.toFixed(2)}
      </div>
    </div>
  `;

  let infList = '';
  weekIncomesWithCleared.forEach(inc => {
    const isClr = Boolean(inc.isCleared);
    const statusBadge = isClr
      ? `<span class="badge" style="font-size:9.5px; font-weight:700; background:rgba(16,185,129,0.18); color:var(--green); border:1px solid rgba(16,185,129,0.35); padding:1px 6px; border-radius:10px; margin-left:6px;">✓ Received</span>`
      : `<span class="badge" style="font-size:9.5px; font-weight:700; background:rgba(56,189,248,0.18); color:var(--curr-border); border:1px solid rgba(56,189,248,0.35); padding:1px 6px; border-radius:10px; margin-left:6px;">⏳ Pending</span>`;
    infList += renderRow((inc.desc || inc.name || inc.rawDesc) + statusBadge, `+${curr}${Number(inc.amount || 0).toFixed(2)}`, 'var(--green)', `${inc.account || 'Joint Account'} &bull; ${inc.actualDateStr || ''}`);
  });

  let ddList = '';
  weekDDsWithCleared.forEach(b => {
    const isClr = Boolean(b.isCleared);
    const statusBadge = isClr
      ? `<span class="badge" style="font-size:9.5px; font-weight:700; background:rgba(16,185,129,0.18); color:var(--green); border:1px solid rgba(16,185,129,0.35); padding:1px 6px; border-radius:10px; margin-left:6px;">✓ Cleared</span>`
      : `<span class="badge" style="font-size:9.5px; font-weight:700; background:rgba(245,158,11,0.18); color:var(--amber); border:1px solid rgba(245,158,11,0.35); padding:1px 6px; border-radius:10px; margin-left:6px;">⚠️ Remaining</span>`;
    ddList += renderRow((b.desc || b.name) + statusBadge, `-${curr}${Number(b.amount || 0).toFixed(2)}`, isClr ? 'var(--green)' : 'var(--red)', `${b.account || 'Joint Account'} &bull; ${b.actualDateStr || ('Day ' + b.due_day)}`);
  });

  let spendList = '';
  const weekItems = (typeof getWeekItems === 'function')
    ? getWeekItems(currentMonthName, wObj.name, currentYear)
    : (mData.weekly_items?.[wObj.name] || []);
  (weekItems || []).filter(i => !i.is_income).forEach(it => {
    spendList += renderRow(it.desc || 'General', `-${curr}${Number(it.amount || 0).toFixed(2)}`, 'var(--text)', `Account: ${it.account_name || 'Credit Card'}`);
  });

  const sectionsHtml = `
    ${inAmt > 0 ? `
      ${renderSectionHeader('1. Inflows Clearing This Week', `+${curr}${inAmt.toFixed(2)}`)}
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px; padding:6px 10px; margin-bottom:8px; font-size:11.5px; flex-wrap:wrap; gap:6px;">
        <span>✓ Received: <strong style="color:var(--green);">${curr}${clearedIncomeTotal.toFixed(2)}</strong> (${weekIncomesWithCleared.filter(i => i.isCleared).length})</span>
        <span>⏳ Pending: <strong style="color:var(--curr-border);">${curr}${remainingIncomeTotal.toFixed(2)}</strong> (${weekIncomesWithCleared.filter(i => !i.isCleared).length})</span>
      </div>
      <div style="max-height:140px; overflow-y:auto; padding-right:4px;">
        ${infList || '<div style="color:var(--text-muted); font-size:12px;">None</div>'}
      </div>
    ` : ''}

    ${renderSectionHeader('2. Scheduled Direct Debits & Bills Clearing', `-${curr}${ddAmt.toFixed(2)}`)}
    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px; padding:6px 10px; margin-bottom:8px; font-size:11.5px; flex-wrap:wrap; gap:6px;">
      <span>✓ Cleared: <strong style="color:var(--green);">${curr}${clearedDDTotal.toFixed(2)}</strong> (${clearedDDCount})</span>
      <span>⚠️ Remaining (Not Cleared): <strong style="color:${remainingDDTotal > 0 ? 'var(--amber)' : 'var(--green)'};">${curr}${remainingDDTotal.toFixed(2)}</strong> (${remainingDDCount})</span>
    </div>
    <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
      ${ddList || '<div style="color:var(--text-muted); font-size:12px;">No bills clearing this week.</div>'}
    </div>

    ${renderSectionHeader('3. Discretionary Living Budget Categories', `-${curr}${spendAmt.toFixed(2)}`)}
    <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
      ${spendList || '<div style="color:var(--text-muted); font-size:12px;">No discretionary spending planned.</div>'}
    </div>
  `;

  const modalBody = `
    <div style="font-size:13px; line-height:1.5;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${wObj.label || wObj.name}</span>
        ${liveBadge}
      </div>

      <div style="background:var(--card-bg, #1e293b); border:1.5px solid var(--border, #334155); border-radius:8px; padding:12px 14px; margin-bottom:12px;">
        <div style="font-size:10.5px; font-weight:700; color:var(--curr-border); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Week Calculation Formula</div>
        ${formulaHtml}
      </div>

      ${sectionsHtml}
    </div>
  `;

  showModal({
    title: `📅 ${wObj.name} Cashflow Breakdown`,
    body: modalBody,
    actions: `
      <button class="btn primary" onclick="window.budgetApp.setTab('${currentMonthName}'); setTimeout(() => { const el = document.querySelectorAll('.week-card')[${weekIdx}]; if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 120); window.budgetApp.closeModal();">
        📅 Open ${wObj.name} in Spreadsheet &rarr;
      </button>
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>
    `
  });
}


export function navigateForecastTile(tileId, target) {
  const currentPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: new Date().getFullYear(), month: 'Jan' };
  const currentYear = currentPeriod.year;
  const currentMonthName = currentPeriod.month;

  if (target === 'bills') {
    if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
      window.budgetApp.setTab('Bills');
    }
  } else if (target === 'year') {
    if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
      window.budgetApp.setTab('Year');
    }
  } else if (target === 'active_week') {
    if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
      window.budgetApp.setTab(currentMonthName);
      setTimeout(() => {
        const activeCard = document.querySelector('.week-card.current-week') || document.querySelector('.week-card');
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    }
  } else {
    if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
      window.budgetApp.setTab(currentMonthName);
    }
  }
}

// Reorder logic for both drag-and-drop and arrow buttons
export function reorderOverviewTiles(sourceTileId, targetTileId) {
  if (!sourceTileId || !targetTileId || sourceTileId === targetTileId) return;

  const cfg = getSettings();
  const { allOrder, visibleTiles } = getOverviewTileConfig();
  
  // Reorder in allOrder
  const fromIdx = allOrder.indexOf(sourceTileId);
  const toIdx = allOrder.indexOf(targetTileId);
  if (fromIdx !== -1 && toIdx !== -1) {
    allOrder.splice(fromIdx, 1);
    allOrder.splice(toIdx, 0, sourceTileId);
  }

  // Reorder in visibleTiles
  const vFromIdx = visibleTiles.indexOf(sourceTileId);
  const vToIdx = visibleTiles.indexOf(targetTileId);
  if (vFromIdx !== -1 && vToIdx !== -1) {
    visibleTiles.splice(vFromIdx, 1);
    visibleTiles.splice(vToIdx, 0, sourceTileId);
  }

  cfg.all_overview_tile_order = allOrder;
  cfg.overview_tiles = visibleTiles;
  saveOverviewTilePreferences(cfg);
  
  const container = document.getElementById('appBody');
  if (container) renderForecastOverviewView(container);
}

// 1. Desktop HTML5 Drag & Drop handlers
export function onForecastTileDragStart(event, tileId) {
  draggedTileId = tileId;
  const sourceEl = document.getElementById(`tile-wrap-${tileId}`);
  const frontFace = sourceEl ? (sourceEl.querySelector('.forecast-flip-front') || sourceEl) : null;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tileId);

    // Set clean drag image so browser doesn't render hidden back-face text into a giant/tall image
    if (frontFace && event.dataTransfer.setDragImage) {
      try {
        const rect = frontFace.getBoundingClientRect();
        const offsetX = Math.max(10, Math.min((event.clientX || 50) - rect.left, rect.width - 10));
        const offsetY = Math.max(10, Math.min((event.clientY || 50) - rect.top, rect.height - 10));
        event.dataTransfer.setDragImage(frontFace, offsetX, offsetY);
      } catch (e) {}
    }
  }

  if (sourceEl) {
    setTimeout(() => {
      sourceEl.classList.add('tile-dragging');
    }, 0);
  }
}

export function onForecastTileDragOver(event, tileId) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

export function onForecastTileDragEnter(event, tileId) {
  event.preventDefault();
  if (draggedTileId && draggedTileId !== tileId) {
    const el = document.getElementById(`tile-wrap-${tileId}`);
    if (el) el.classList.add('tile-drag-over');
  }
}

export function onForecastTileDragLeave(event, tileId) {
  const el = document.getElementById(`tile-wrap-${tileId}`);
  if (el && (!event.relatedTarget || !el.contains(event.relatedTarget))) {
    el.classList.remove('tile-drag-over');
  }
}

export function onForecastTileDrop(event, targetTileId) {
  event.preventDefault();
  event.stopPropagation();
  
  const sourceTileId = draggedTileId || (event.dataTransfer && event.dataTransfer.getData('text/plain'));
  draggedTileId = null;

  document.querySelectorAll('.tile-drag-over').forEach(el => el.classList.remove('tile-drag-over'));
  document.querySelectorAll('.tile-dragging').forEach(el => el.classList.remove('tile-dragging'));

  if (!sourceTileId || sourceTileId === targetTileId) return;
  reorderOverviewTiles(sourceTileId, targetTileId);
}

export function onForecastTileDragEnd(event) {
  draggedTileId = null;
  document.querySelectorAll('.tile-drag-over').forEach(el => el.classList.remove('tile-drag-over'));
  document.querySelectorAll('.tile-dragging').forEach(el => el.classList.remove('tile-dragging'));
}

// 2. Mobile Touch Drag & Drop handlers (for touchscreens)
export function onTouchDragStart(event, tileId) {
  if (!event.touches || event.touches.length !== 1) return;
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();

  touchDragTileId = tileId;
  const touch = event.touches[0];
  const sourceEl = document.getElementById(`tile-wrap-${tileId}`);
  if (!sourceEl) return;

  // Clean up any old ghost
  if (touchGhostEl) {
    touchGhostEl.remove();
    touchGhostEl = null;
  }

  // Find the visible front face card
  const frontFace = sourceEl.querySelector('.forecast-flip-front') || sourceEl;
  const rect = frontFace.getBoundingClientRect();

  // Clone ONLY the front card face so hidden 3D back-face elements don't bloat the height
  touchGhostEl = frontFace.cloneNode(true);
  touchGhostEl.id = 'touch-drag-ghost';
  touchGhostEl.style.position = 'fixed';
  touchGhostEl.style.zIndex = '99999';
  touchGhostEl.style.pointerEvents = 'none';
  touchGhostEl.style.width = `${rect.width}px`;
  touchGhostEl.style.height = `${rect.height}px`;
  touchGhostEl.style.maxHeight = `${rect.height}px`;
  touchGhostEl.style.boxSizing = 'border-box';
  touchGhostEl.style.margin = '0';
  touchGhostEl.style.opacity = '0.92';
  touchGhostEl.style.transform = 'scale(1.02)';
  touchGhostEl.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.45)';
  touchGhostEl.style.border = '2px solid var(--primary)';
  touchGhostEl.style.borderRadius = 'var(--radius-card, 14px)';
  touchGhostEl.style.overflow = 'hidden';

  // Position centered under finger
  touchGhostEl.style.left = `${touch.clientX - rect.width / 2}px`;
  touchGhostEl.style.top = `${touch.clientY - rect.height / 2}px`;

  document.body.appendChild(touchGhostEl);
  sourceEl.classList.add('tile-dragging');

  // Prevent pull-to-refresh & page scroll during drag gesture
  document.body.style.overscrollBehavior = 'none';
  document.body.style.touchAction = 'none';

  if (navigator.vibrate) {
    try { navigator.vibrate(30); } catch (e) {}
  }
}

export function onTouchDragMove(event) {
  if (!touchDragTileId || !touchGhostEl) return;
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();

  const touch = event.touches[0];
  const w = parseFloat(touchGhostEl.style.width) || 200;
  const h = parseFloat(touchGhostEl.style.height) || 120;
  touchGhostEl.style.left = `${touch.clientX - w / 2}px`;
  touchGhostEl.style.top = `${touch.clientY - h / 2}px`;

  touchGhostEl.style.display = 'none';
  const elemUnder = document.elementFromPoint(touch.clientX, touch.clientY);
  touchGhostEl.style.display = 'block';

  if (elemUnder) {
    const targetWrap = elemUnder.closest('.forecast-tile-wrapper');
    const targetId = targetWrap ? targetWrap.getAttribute('data-tile-id') : null;

    if (targetId !== touchLastTargetTileId) {
      document.querySelectorAll('.tile-drag-over').forEach(el => el.classList.remove('tile-drag-over'));
      if (targetWrap && targetId && targetId !== touchDragTileId) {
        targetWrap.classList.add('tile-drag-over');
        touchLastTargetTileId = targetId;
      } else {
        touchLastTargetTileId = null;
      }
    }
  }
}

export function onTouchDragEnd(event) {
  if (!touchDragTileId) return;
  if (event && event.cancelable) event.preventDefault();

  if (touchGhostEl) {
    touchGhostEl.remove();
    touchGhostEl = null;
  }

  // Restore overscroll behavior
  document.body.style.overscrollBehavior = '';
  document.body.style.touchAction = '';

  const sourceTileId = touchDragTileId;
  const targetTileId = touchLastTargetTileId;
  touchDragTileId = null;
  touchLastTargetTileId = null;

  document.querySelectorAll('.tile-drag-over').forEach(el => el.classList.remove('tile-drag-over'));
  document.querySelectorAll('.tile-dragging').forEach(el => el.classList.remove('tile-dragging'));

  if (targetTileId && sourceTileId !== targetTileId) {
    if (navigator.vibrate) {
      try { navigator.vibrate([20, 20]); } catch (e) {}
    }
    reorderOverviewTiles(sourceTileId, targetTileId);
  }
}

// 3. Arrow button re-ordering
export function moveOverviewTileOrder(tileId, direction) {
  const { visibleTiles } = getOverviewTileConfig();
  
  const vIdx = visibleTiles.indexOf(tileId);
  if (vIdx === -1) return;
  const targetVIdx = vIdx + direction;
  if (targetVIdx < 0 || targetVIdx >= visibleTiles.length) return;

  const targetTileId = visibleTiles[targetVIdx];
  reorderOverviewTiles(tileId, targetTileId);
}

export function toggleOverviewTileVisibility(tileId, isVisible) {
  const cfg = getSettings();
  const { allOrder, visibleTiles } = getOverviewTileConfig();

  let newVisible = [...visibleTiles];
  if (isVisible) {
    if (!newVisible.includes(tileId)) {
      newVisible = allOrder.filter(id => id === tileId || newVisible.includes(id));
    }
  } else {
    newVisible = newVisible.filter(id => id !== tileId);
  }

  cfg.all_overview_tile_order = allOrder;
  cfg.overview_tiles = newVisible;
  saveOverviewTilePreferences(cfg);

  const container = document.getElementById('appBody');
  if (container) renderForecastOverviewView(container);
}

export function toggleOverviewTileExpansion(tileId) {
  const cfg = getSettings();
  const { expandedTiles } = getOverviewTileConfig();

  let newExpanded = [...expandedTiles];
  if (newExpanded.includes(tileId)) {
    newExpanded = newExpanded.filter(id => id !== tileId);
  } else {
    newExpanded.push(tileId);
  }

  cfg.expanded_overview_tiles = newExpanded;
  saveOverviewTilePreferences(cfg);

  const container = document.getElementById('appBody');
  if (container) renderForecastOverviewView(container);
}

export function resetOverviewTilesToDefault() {
  const cfg = getSettings();
  const allTileIds = FORECAST_OVERVIEW_TILES.map(t => t.id);
  const defaultVisible = FORECAST_OVERVIEW_TILES.filter(t => t.defaultVisible).map(t => t.id);

  cfg.all_overview_tile_order = [...allTileIds];
  cfg.overview_tiles = [...defaultVisible];
  cfg.expanded_overview_tiles = [];
  saveOverviewTilePreferences(cfg);

  const container = document.getElementById('appBody');
  if (container) renderForecastOverviewView(container);
}

export function openOverviewTilesModal() {
  const { allOrder, visibleTiles, expandedTiles } = getOverviewTileConfig();

  const bodyHtml = `
    <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:12px; line-height:1.4;">
      Customize which tiles and sections appear on your Forecast Overview dashboard. Toggle any card on or off, or expand KPI cards to full-width:
    </div>

    <div style="margin-bottom:10px;">
      <input type="text" id="overviewTileSearch" placeholder="🔍 Search tiles..." oninput="window.budgetApp.filterOverviewTilesModal(this.value)" style="width:100%; box-sizing:border-box; padding:8px 12px; font-size:12px; border-radius:8px; border:1px solid var(--border); background:var(--card-bg); color:var(--text);">
    </div>

    <div id="overviewTilesModalList" style="max-height:55vh; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;">
      ${allOrder.map(tileId => {
        const tile = FORECAST_OVERVIEW_TILES.find(t => t.id === tileId);
        if (!tile) return '';
        const isChecked = visibleTiles.includes(tileId);
        const isExpanded = expandedTiles.includes(tileId);

        return `
          <div class="overview-modal-tile-row" data-search="${tile.title.toLowerCase()} ${tile.desc.toLowerCase()}" style="background:var(--card-bg); border:1px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}; border-radius:10px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; box-sizing:border-box;">
            <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
              <input type="checkbox" id="chk_tile_${tile.id}" ${isChecked ? 'checked' : ''} onchange="window.budgetApp.toggleOverviewTileVisibility('${tile.id}', this.checked)" style="cursor:pointer; width:16px; height:16px; flex-shrink:0;">
              <span style="font-size:18px; flex-shrink:0;">${tile.icon}</span>
              <div style="min-width:0; flex:1;">
                <label for="chk_tile_${tile.id}" style="font-size:13px; font-weight:700; color:var(--heading); cursor:pointer; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${tile.title}
                </label>
                <div style="font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${tile.desc}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              ${tile.type === 'kpi' ? `
                <button type="button" class="tile-edit-btn expand-btn ${isExpanded ? 'active' : ''}" onclick="window.budgetApp.toggleOverviewTileExpansion('${tile.id}'); const btn = this; const exp = btn.classList.toggle('active'); btn.textContent = exp ? '⇤⇥ Full' : '↔️ Half'; btn.title = exp ? 'Collapse to standard width' : 'Expand to full width';" title="${isExpanded ? 'Collapse to standard width' : 'Expand to full width'}" style="height:22px; font-size:10px;">
                  ${isExpanded ? '⇤⇥ Full' : '↔️ Half'}
                </button>
              ` : ''}
              <span class="md3-chip md3-chip-tonal" style="font-size:9.5px; flex-shrink:0;">${tile.category}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px solid var(--border); padding-top:12px; flex-wrap:wrap; gap:8px;">
      <button class="btn secondary" onclick="window.budgetApp.resetOverviewTilesToDefault(); window.budgetApp.closeModal();" style="font-size:11.5px; padding:5px 12px;">↺ Reset Defaults</button>
      <button class="btn primary" onclick="window.budgetApp.closeModal();" style="font-size:11.5px; padding:5px 16px;">✓ Done</button>
    </div>
  `;

  showModal({
    title: '⚙️ Customize Overview Tiles',
    body: bodyHtml
  });
}

export function filterOverviewTilesModal(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('.overview-modal-tile-row').forEach(el => {
    const s = el.getAttribute('data-search') || '';
    el.style.display = (!q || s.includes(q)) ? 'flex' : 'none';
  });
}

// Initialize touch listeners once on window for mobile drag
if (typeof window !== 'undefined' && !window.__habitTouchDragInit) {
  window.__habitTouchDragInit = true;
  window.addEventListener('touchmove', (e) => {
    if (touchDragTileId) onTouchDragMove(e);
  }, { passive: false });
  window.addEventListener('touchend', (e) => {
    if (touchDragTileId) onTouchDragEnd(e);
  });
  window.addEventListener('touchcancel', (e) => {
    if (touchDragTileId) onTouchDragEnd(e);
  });
}

export function setSpendableCashMode(mode) {
  try {
    localStorage.setItem('habit_spendable_cash_mode', mode);
  } catch (e) {}
  const container = document.getElementById('appBody');
  if (container) renderForecastOverviewView(container);
}

// Attach to window for easy direct and external access
if (typeof window !== 'undefined') {
  window.FORECAST_OVERVIEW_TILES = FORECAST_OVERVIEW_TILES;
  window.renderForecastOverviewView = renderForecastOverviewView;
  window.flipForecastTile = flipForecastTile;
  window.navigateForecastTile = navigateForecastTile;
  window.handleForecastTileClick = handleForecastTileClick;
  window.handleForecastTilePointerDown = handleForecastTilePointerDown;
  window.handleForecastTilePointerMove = handleForecastTilePointerMove;
  window.handleForecastTilePointerUp = handleForecastTilePointerUp;
  window.handleForecastTilePointerCancel = handleForecastTilePointerCancel;
  window.onForecastTileDragStart = onForecastTileDragStart;
  window.onForecastTileDragOver = onForecastTileDragOver;
  window.onForecastTileDragEnter = onForecastTileDragEnter;
  window.onForecastTileDragLeave = onForecastTileDragLeave;
  window.onForecastTileDrop = onForecastTileDrop;
  window.onForecastTileDragEnd = onForecastTileDragEnd;
  window.onTouchDragStart = onTouchDragStart;
  window.onTouchDragMove = onTouchDragMove;
  window.onTouchDragEnd = onTouchDragEnd;
  window.reorderOverviewTiles = reorderOverviewTiles;
  window.moveOverviewTileOrder = moveOverviewTileOrder;
  window.toggleOverviewTileVisibility = toggleOverviewTileVisibility;
  window.toggleOverviewTileExpansion = toggleOverviewTileExpansion;
  window.resetOverviewTilesToDefault = resetOverviewTilesToDefault;
  window.openOverviewTilesModal = openOverviewTilesModal;
  window.filterOverviewTilesModal = filterOverviewTilesModal;
  window.openTileCalculationModal = openTileCalculationModal;
  window.openWeekCalculationModal = openWeekCalculationModal;
  window.setSpendableCashMode = setSpendableCashMode;
  if (window.budgetApp) {
    window.budgetApp.setSpendableCashMode = setSpendableCashMode;
  }
}

