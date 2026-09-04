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
    id: 'actual_variance',
    type: 'kpi',
    title: 'Check-in Variance',
    category: 'Variances & Health',
    icon: '⚖️',
    desc: 'Live net balance vs predicted net plan from your account check-in',
    explanation: 'Measures whether you have more or less money than predicted by your budget plan at the point of your latest check-in or bank balance sync.',
    formula: 'Actual Net Balance - Predicted Net Target',
    tip: 'A green surplus means you are ahead of your plan. A red deficit indicates discretionary spending or unbudgeted charges exceeded the forecast.',
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
    desc: 'Deep-dive into active week spend, bills clearing, and closing net',
    explanation: 'Detailed panel showing the active week budget, list of clearing direct debits, expected income, and closing balance.',
    formula: 'Active week forecast calculation',
    tip: 'Review clearing bills at the start of each week so there are no surprises.',
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
    allOrder = [...allOrder, ...missing];
  }

  let visibleTiles = cfg.overview_tiles;
  if (!visibleTiles || !Array.isArray(visibleTiles) || visibleTiles.length === 0) {
    try {
      const local = localStorage.getItem('habit_overview_tiles');
      if (local) visibleTiles = JSON.parse(local);
    } catch (e) {}
  }

  if (!visibleTiles || !Array.isArray(visibleTiles) || visibleTiles.length === 0) {
    visibleTiles = FORECAST_OVERVIEW_TILES.filter(t => t.defaultVisible).map(t => t.id);
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
// 3. MAIN RENDER FUNCTION
// =========================================================

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
  
  // Calculate total money in vs money out for monthly cashflow
  const totalInflows = totalCurrentInflow + forecast.totalMonthPaymentsIn;
  const totalCommittedBills = totalDD;
  const totalDiscretionaryBudget = totalWeeklySpend;
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

  if (livePacing && livePacing.isPacingActive) {
    daysRemainingInWeek = Math.max(1, livePacing.totalDays - livePacing.elapsedDays + 1);
    const unspentBudget = Math.max(0, activeWeekPred.wSpend - livePacing.pacedDiscretionarySpendToDate);
    safeDailySpend = unspentBudget / daysRemainingInWeek;

    if (livePacing.liveDailyVariance !== null) {
      if (livePacing.liveDailyVariance >= 15) {
        pacingStatusText = 'Ahead of Budget Pace';
      } else if (livePacing.liveDailyVariance < -25) {
        pacingStatusText = 'Over Budget Pace';
      } else {
        pacingStatusText = 'On Track';
      }
    }
  } else if (activeWeekObj) {
    if (activeWeekObj.startDate && activeWeekObj.endDate) {
      const nowMs = new Date().getTime();
      const sDate = new Date(activeWeekObj.startDate);
      const eDate = new Date(activeWeekObj.endDate);
      const startMid = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();
      const endMid = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59).getTime();
      if (nowMs >= startMid && nowMs <= endMid) {
        daysRemainingInWeek = Math.max(1, Math.ceil((endMid - nowMs) / (1000 * 60 * 60 * 24)));
      }
    }
    safeDailySpend = (activeWeekPred.wSpend || 0) / daysRemainingInWeek;
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
          totalOutgoings: f.totalOutgoings + f.totalAutoPayMonth
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
      sub: `Start: ${curr}${totalCurrentOpening.toFixed(0)} | Inflows: +${curr}${totalInflows.toFixed(0)}`,
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
    actual_variance: (() => {
      const actVar = (activeWeekPred && activeWeekPred.variance !== null) ? activeWeekPred.variance : latestVariance;
      const hasActVar = (actVar !== null && actVar !== undefined);
      const isSurplus = hasActVar ? actVar >= 0 : true;
      return {
        val: hasActVar ? `${isSurplus ? '+' : '-'}${curr}${Math.abs(actVar).toFixed(2)}` : 'Pending',
        sub: hasActVar ? (isSurplus ? '✨ Surplus vs planned net target' : '⚠️ Deficit vs planned net target') : 'Enter check-in to calculate variance',
        tag: 'CHECK-IN VARIANCE',
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
        sub: hasLiveVariance ? (isDailyAhead ? '✨ Ahead of today’s paced net' : '⚠️ Behind today’s paced budget') : (isDailyPacingOn ? 'Bank sync active' : 'Enable in Open Banking'),
        tag: 'LIVE DAILY VARIANCE',
        valClass: hasLiveVariance ? (isDailyAhead ? 'val-green' : 'val-red') : 'val-amber',
        cardClass: hasLiveVariance ? (isDailyAhead ? 'accent-green' : 'accent-red') : 'accent-amber'
      };
    })(),
    weekly_budget: {
      val: `${curr}${activeWeekPred.wSpend ? activeWeekPred.wSpend.toFixed(2) : '0.00'}`,
      sub: (livePacing && livePacing.isPacingActive && livePacing.pacedDiscretionarySpendToDate > 0)
        ? `Spent: ${curr}${livePacing.pacedDiscretionarySpendToDate.toFixed(0)} | Left: ${curr}${Math.max(0, activeWeekPred.wSpend - livePacing.pacedDiscretionarySpendToDate).toFixed(0)}`
        : `Planned flexible budget (${activeWeekObj?.name || 'Active Week'})`,
      tag: 'WEEKLY BUDGET',
      valClass: 'val-blue',
      cardClass: 'accent-blue'
    },
    monthly_burn_rate: (() => {
      const dailyBurn = totalCycleDays > 0 ? totalOutflows / totalCycleDays : totalOutflows / 30;
      return {
        val: `${curr}${dailyBurn.toFixed(2)}<span style="font-size:14px; font-weight:500; color:var(--text-muted);">/day</span>`,
        sub: `Total Outflows: ${curr}${totalOutflows.toFixed(0)} across ${totalCycleDays} days`,
        tag: 'DAILY BURN RATE',
        valClass: 'val-red',
        cardClass: 'accent-red'
      };
    })(),
    fixed_bills_ratio: (() => {
      const ratio = totalInflows > 0 ? Math.round((totalCommittedBills / totalInflows) * 100) : 0;
      return {
        val: `${ratio}%`,
        sub: `${curr}${totalCommittedBills.toFixed(0)} bills out of ${curr}${totalInflows.toFixed(0)} income`,
        tag: 'FIXED BILLS RATIO',
        valClass: ratio <= 50 ? 'val-green' : (ratio <= 65 ? 'val-amber' : 'val-red'),
        cardClass: ratio <= 50 ? 'accent-green' : (ratio <= 65 ? 'accent-amber' : 'accent-red')
      };
    })(),
    emergency_runway: (() => {
      const liquidReserves = Math.max(0, projectedMonthEndCurrent + (cfg.track_savings ? projectedMonthEndSavings : 0));
      const monthlyEssentialExpenses = totalCommittedBills + totalWeeklySpend;
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
      const hasDeficit = netMonthlySurplus < 0;
      const sRate = totalInflows > 0 ? Math.round((netMonthlySurplus / totalInflows) * 100) : 0;
      return {
        val: `${sRate}%`,
        sub: hasDeficit
          ? `Projected Deficit: -${curr}${Math.abs(netMonthlySurplus).toFixed(0)} of ${curr}${totalInflows.toFixed(0)}`
          : `Projected Surplus: +${curr}${netMonthlySurplus.toFixed(0)} of ${curr}${totalInflows.toFixed(0)}`,
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
            <span class="forecast-cycle-percent">${percentElapsed}% complete &bull; ${Math.max(0, totalCycleDays - elapsedCycleDays)} days until next payday cycle</span>
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
                        <span class="tile-nav-cue" title="Click to navigate">↗</span>
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
                  <button class="tile-info-chip" onclick="window.budgetApp.flipForecastTile('week_spotlight')" title="What is this section?">ⓘ</button>
                </div>
              </div>

              <div class="forecast-card-body">
                <div class="forecast-week-spotlight-metrics">
                  <div class="forecast-spotlight-item">
                    <span class="forecast-spotlight-label">Discretionary Budget</span>
                    <span class="forecast-spotlight-value">${curr}${(activeWeekPred.wSpend || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">Planned allowance</span>
                  </div>

                  <div class="forecast-spotlight-item">
                    <span class="forecast-spotlight-label">Bills Clearing</span>
                    <span class="forecast-spotlight-value text-red">-${curr}${(activeWeekPred.wDDTotal || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">${(activeWeekPred.wDDs || []).length} direct debits</span>
                  </div>

                  <div class="forecast-spotlight-item">
                    <span class="forecast-spotlight-label">Expected Inflow</span>
                    <span class="forecast-spotlight-value text-green">+${curr}${(activeWeekPred.wIncomeTotal || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">${(activeWeekPred.wIncomes || []).length} salary / incomes</span>
                  </div>

                  <div class="forecast-spotlight-item">
                    <span class="forecast-spotlight-label">Closing Net Position</span>
                    <span class="forecast-spotlight-value ${activeWeekPred.predictedNet >= 0 ? 'text-green' : 'text-red'}">${curr}${(activeWeekPred.predictedNet || 0).toFixed(2)}</span>
                    <span class="forecast-spotlight-sub">End of week target</span>
                  </div>
                </div>

                <!-- Bills clearing this week -->
                <div style="margin-top:14px;">
                  <h4 style="font-size:12.5px; font-weight:600; color:var(--heading); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span>Bills Clearing in ${activeWeekObj?.name || 'Active Week'}</span>
                    <span style="font-size:11px; color:var(--text-muted);">${(activeWeekPred.wDDs || []).length} items</span>
                  </h4>

                  <div class="forecast-chips-scroll">
                    ${(activeWeekPred.wDDs && activeWeekPred.wDDs.length > 0) ? activeWeekPred.wDDs.map(d => `
                      <div class="forecast-bill-chip">
                        <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                          <span class="forecast-bill-chip-icon">⚡</span>
                          <div class="forecast-bill-chip-info">
                            <span class="forecast-bill-chip-title">${d.desc || d.name}</span>
                            <span class="forecast-bill-chip-meta">Due Day ${d.due_day} &bull; ${d.account || 'Current'}</span>
                          </div>
                        </div>
                        <span class="forecast-bill-chip-amt">-${curr}${Number(d.amount).toFixed(2)}</span>
                      </div>
                    `).join('') : '<div class="forecast-empty-note">No scheduled bills clearing this week</div>'}
                  </div>
                </div>

                <div style="margin-top:14px; display:flex; justify-content:flex-end;">
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
                      <div class="forecast-week-runway-card ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}" onclick="window.budgetApp.setTab('${currentMonthName}')" title="Open ${wObj?.name} in ${currentMonthName}">
                        <div class="forecast-week-runway-top">
                          <div>
                            <strong class="forecast-week-runway-name">${wObj?.name}</strong>
                            <div class="forecast-week-runway-date">${wObj?.label ? wObj.label.replace(/^Week \d+ /, '') : ''}</div>
                          </div>
                          <span class="forecast-week-status-pill ${statusClass}">${statusLabel}</span>
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
                  <span class="md3-badge ${netMonthlySurplus >= 0 ? 'md3-badge-green' : 'md3-badge-red'}">
                    ${netMonthlySurplus >= 0 ? 'Surplus' : 'Deficit'} ${curr}${Math.abs(netMonthlySurplus).toFixed(0)}
                  </span>
                  <button class="tile-info-chip" onclick="window.budgetApp.flipForecastTile('cashflow_architecture')" title="What is this section?">ⓘ</button>
                </div>
              </div>

              <div class="forecast-card-body">
                <div class="forecast-cashflow-segments-bar">
                  <div class="forecast-segment-fill fill-bills" style="width: ${totalInflows > 0 ? Math.min(100, (totalCommittedBills / totalInflows) * 100) : 40}%;" title="Fixed Bills: ${curr}${totalCommittedBills.toFixed(2)}"></div>
                  <div class="forecast-segment-fill fill-discretionary" style="width: ${totalInflows > 0 ? Math.min(100, (totalDiscretionaryBudget / totalInflows) * 100) : 40}%;" title="Weekly Spend: ${curr}${totalDiscretionaryBudget.toFixed(2)}"></div>
                  <div class="forecast-segment-fill fill-surplus" style="width: ${totalInflows > 0 ? Math.max(0, (netMonthlySurplus / totalInflows) * 100) : 20}%;" title="Projected Surplus: ${curr}${Math.max(0, netMonthlySurplus).toFixed(2)}"></div>
                </div>

                <div class="forecast-cashflow-legend">
                  <div class="forecast-legend-item">
                    <span class="legend-dot dot-bills"></span>
                    <span class="legend-text">Fixed Bills: <strong>${curr}${totalCommittedBills.toFixed(2)}</strong> (${totalInflows > 0 ? Math.round((totalCommittedBills / totalInflows) * 100) : 0}%)</span>
                  </div>
                  <div class="forecast-legend-item">
                    <span class="legend-dot dot-discretionary"></span>
                    <span class="legend-text">Discretionary: <strong>${curr}${totalDiscretionaryBudget.toFixed(2)}</strong> (${totalInflows > 0 ? Math.round((totalDiscretionaryBudget / totalInflows) * 100) : 0}%)</span>
                  </div>
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
                    <span>Weekly Living Budget:</span>
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
  navigateForecastTile(tileId, target);
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
}
