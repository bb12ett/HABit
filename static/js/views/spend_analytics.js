import { appState, getSettings, isMultiUserEnabled, months, getCurrentPeriodMonthAndYear } from '../state.js';
import { SPEND_CATEGORIES, calculateCategoryBreakdown, calculateMonthSchedule, detectCurrentMonthAndWeek } from '../calculations.js';
import { renderCategoryDonutChart } from '../charts.js';

function matchesAmountFilter(amountNum, filterStr) {
  if (!filterStr || !filterStr.trim()) return true;
  const s = filterStr.trim();
  const absAmt = Math.abs(amountNum);

  if (s.startsWith('>=')) {
    const val = parseFloat(s.slice(2).trim());
    return !isNaN(val) ? absAmt >= val : true;
  }
  if (s.startsWith('<=')) {
    const val = parseFloat(s.slice(2).trim());
    return !isNaN(val) ? absAmt <= val : true;
  }
  if (s.startsWith('>')) {
    const val = parseFloat(s.slice(1).trim());
    return !isNaN(val) ? absAmt > val : true;
  }
  if (s.startsWith('<')) {
    const val = parseFloat(s.slice(1).trim());
    return !isNaN(val) ? absAmt < val : true;
  }
  if (s.includes('-') && !s.startsWith('-')) {
    const parts = s.split('-').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const min = Math.min(parts[0], parts[1]);
      const max = Math.max(parts[0], parts[1]);
      return absAmt >= min && absAmt <= max;
    }
  }
  const cleanFilter = s.replace(/[^0-9.]/g, '');
  if (!cleanFilter) return true;
  const exact = parseFloat(cleanFilter);
  if (!isNaN(exact) && Math.abs(absAmt - exact) < 0.001) return true;
  return absAmt.toFixed(2).includes(cleanFilter) || String(amountNum).includes(cleanFilter);
}

function formatDateIso(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const day = d.getDate();
  const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = mNames[d.getMonth()] || '';
  const yr = String(d.getFullYear()).slice(-2);
  return `${day} ${month} '${yr}`;
}

export function getActiveSpendTimeframeRange() {
  const timeframe = appState.spendFilterTimeframe || 'this_month';
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  let startIso = '';
  let endIso = '';
  let label = '';
  let monthName = null;

  if (timeframe === 'custom' && appState.spendCustomStartDate && appState.spendCustomEndDate) {
    startIso = appState.spendCustomStartDate;
    endIso = appState.spendCustomEndDate;
    if (appState.spendMonthTotalM !== undefined && appState.spendMonthTotalM !== null) {
      const targetY = Math.floor(appState.spendMonthTotalM / 12);
      const targetM = ((appState.spendMonthTotalM % 12) + 12) % 12;
      const sched = calculateMonthSchedule(targetY, targetM);
      label = `Payday: ${sched.dateRangeStr} (${sched.numWeeks} Wks)`;
      monthName = months[targetM];
    } else {
      label = appState.spendCustomLabel || 'Custom Range';
    }
  } else if (timeframe === 'active_week') {
    let weekFound = false;
    try {
      const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
        ? getCurrentPeriodMonthAndYear()
        : { year: curYear, monthIdx: curMonth, month: months[curMonth] };
      const detected = (typeof detectCurrentMonthAndWeek === 'function')
        ? detectCurrentMonthAndWeek(curPeriod.year)
        : null;
      if (detected && detected.schedule && detected.schedule.weeks) {
        const activeWeekObj = detected.schedule.weeks.find(w => w.name === detected.week) || detected.schedule.weeks[0];
        if (activeWeekObj) {
          startIso = formatDateIso(activeWeekObj.startDate);
          endIso = formatDateIso(activeWeekObj.endDate);
          label = `${detected.week} (${formatShortDate(activeWeekObj.startDate)} – ${formatShortDate(activeWeekObj.endDate)})`;
          weekFound = true;
          monthName = detected.month;
        }
      }
    } catch (e) {}
    if (!weekFound) {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const s = new Date(now.getFullYear(), now.getMonth(), diff);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
      startIso = formatDateIso(s);
      endIso = formatDateIso(e);
      label = 'This Week';
    }
  } else if (timeframe === 'this_month') {
    const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
      ? getCurrentPeriodMonthAndYear()
      : { year: curYear, monthIdx: curMonth, month: months[curMonth] };
    const sched = calculateMonthSchedule(curPeriod.year, curPeriod.monthIdx);
    startIso = formatDateIso(sched.startDate);
    endIso = formatDateIso(sched.endDate);
    label = `Payday: ${sched.dateRangeStr} (${sched.numWeeks} Wks)`;
    monthName = curPeriod.month || months[curPeriod.monthIdx];
  } else if (timeframe === 'last_month') {
    const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
      ? getCurrentPeriodMonthAndYear()
      : { year: curYear, monthIdx: curMonth, month: months[curMonth] };
    const prevTotal = curPeriod.year * 12 + curPeriod.monthIdx - 1;
    const prevY = Math.floor(prevTotal / 12);
    const prevM = ((prevTotal % 12) + 12) % 12;
    const sched = calculateMonthSchedule(prevY, prevM);
    startIso = formatDateIso(sched.startDate);
    endIso = formatDateIso(sched.endDate);
    label = `Payday: ${sched.dateRangeStr} (${sched.numWeeks} Wks)`;
    monthName = months[prevM];
  } else if (timeframe === 'last_7_days') {
    const s = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    startIso = formatDateIso(s);
    endIso = formatDateIso(now);
    label = 'Last 7 Days';
  } else if (timeframe === 'last_30_days') {
    const s = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    startIso = formatDateIso(s);
    endIso = formatDateIso(now);
    label = 'Last 30 Days';
  } else if (timeframe === 'last_90_days') {
    const s = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    startIso = formatDateIso(s);
    endIso = formatDateIso(now);
    label = 'Last 90 Days';
  } else if (timeframe === 'rolling_12_months') {
    const s = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    startIso = formatDateIso(s);
    endIso = formatDateIso(now);
    label = 'Rolling 12 Months';
  } else if (timeframe === 'year_to_date') {
    const s = new Date(curYear, 0, 1);
    startIso = formatDateIso(s);
    endIso = formatDateIso(now);
    label = `YTD ${curYear}`;
  } else if (timeframe === 'all_time') {
    startIso = '';
    endIso = '';
    label = 'All Time';
  } else {
    const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
      ? getCurrentPeriodMonthAndYear()
      : { year: curYear, monthIdx: curMonth, month: months[curMonth] };
    const sched = calculateMonthSchedule(curPeriod.year, curPeriod.monthIdx);
    startIso = formatDateIso(sched.startDate);
    endIso = formatDateIso(sched.endDate);
    label = `Payday: ${sched.dateRangeStr} (${sched.numWeeks} Wks)`;
    monthName = curPeriod.month || months[curPeriod.monthIdx];
  }

  return { timeframe, startIso, endIso, label, monthName };
}

export function setSpendAnalyticsTimeframe(timeframe) {
  appState.spendFilterTimeframe = timeframe;
  appState.spendMonthTotalM = null;
  appState.spendCustomLabel = null;
  if (timeframe !== 'custom') {
    appState.spendCustomStartDate = null;
    appState.spendCustomEndDate = null;
  }
  if (typeof window !== 'undefined' && window.budgetApp && typeof window.budgetApp.renderContent === 'function') {
    window.budgetApp.renderContent();
  }
}

export function setSpendCustomDateRange(startDate, endDate) {
  if (!startDate || !endDate) return;
  appState.spendFilterTimeframe = 'custom';
  appState.spendCustomStartDate = startDate;
  appState.spendCustomEndDate = endDate;
  appState.spendMonthTotalM = null;
  appState.spendCustomLabel = null;
  if (typeof window !== 'undefined' && window.budgetApp && typeof window.budgetApp.renderContent === 'function') {
    window.budgetApp.renderContent();
  }
}

export function shiftSpendTimeframe(direction) {
  const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: new Date().getFullYear(), monthIdx: new Date().getMonth() };

  if (appState.spendMonthTotalM !== undefined && appState.spendMonthTotalM !== null) {
    appState.spendMonthTotalM += direction;
    const targetY = Math.floor(appState.spendMonthTotalM / 12);
    const targetM = ((appState.spendMonthTotalM % 12) + 12) % 12;
    const sched = calculateMonthSchedule(targetY, targetM);
    appState.spendFilterTimeframe = 'custom';
    appState.spendCustomStartDate = formatDateIso(sched.startDate);
    appState.spendCustomEndDate = formatDateIso(sched.endDate);
    appState.spendCustomLabel = `Payday: ${sched.dateRangeStr} (${sched.numWeeks} Wks)`;
  } else if (appState.spendFilterTimeframe === 'this_month' || !appState.spendFilterTimeframe) {
    const baseTotalM = curPeriod.year * 12 + curPeriod.monthIdx;
    appState.spendMonthTotalM = baseTotalM + direction;
    const targetY = Math.floor(appState.spendMonthTotalM / 12);
    const targetM = ((appState.spendMonthTotalM % 12) + 12) % 12;
    const sched = calculateMonthSchedule(targetY, targetM);
    appState.spendFilterTimeframe = 'custom';
    appState.spendCustomStartDate = formatDateIso(sched.startDate);
    appState.spendCustomEndDate = formatDateIso(sched.endDate);
    appState.spendCustomLabel = `Payday: ${sched.dateRangeStr} (${sched.numWeeks} Wks)`;
  } else if (appState.spendFilterTimeframe === 'last_month') {
    const baseTotalM = curPeriod.year * 12 + curPeriod.monthIdx - 1;
    appState.spendMonthTotalM = baseTotalM + direction;
    const targetY = Math.floor(appState.spendMonthTotalM / 12);
    const targetM = ((appState.spendMonthTotalM % 12) + 12) % 12;
    const sched = calculateMonthSchedule(targetY, targetM);
    appState.spendFilterTimeframe = 'custom';
    appState.spendCustomStartDate = formatDateIso(sched.startDate);
    appState.spendCustomEndDate = formatDateIso(sched.endDate);
    appState.spendCustomLabel = `Payday: ${sched.dateRangeStr} (${sched.numWeeks} Wks)`;
  } else {
    const currentRange = getActiveSpendTimeframeRange();
    const parseParts = str => {
      if (!str) return null;
      const parts = str.split('-');
      if (parts.length < 3) return null;
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    };

    const sDate = parseParts(currentRange.startIso) || new Date();
    const eDate = parseParts(currentRange.endIso) || new Date();

    const spanMs = Math.max(24 * 60 * 60 * 1000, eDate.getTime() - sDate.getTime());
    const shiftMs = spanMs * direction;
    const newS = new Date(sDate.getTime() + shiftMs);
    const newE = new Date(eDate.getTime() + shiftMs);
    appState.spendFilterTimeframe = 'custom';
    appState.spendCustomStartDate = formatDateIso(newS);
    appState.spendCustomEndDate = formatDateIso(newE);
    appState.spendMonthTotalM = null;
    appState.spendCustomLabel = null;
  }

  if (typeof window !== 'undefined' && window.budgetApp && typeof window.budgetApp.renderContent === 'function') {
    window.budgetApp.renderContent();
  }
}

export function resetSpendTimeframe() {
  appState.spendFilterTimeframe = 'this_month';
  appState.spendCustomStartDate = null;
  appState.spendCustomEndDate = null;
  appState.spendMonthTotalM = null;
  appState.spendCustomLabel = null;
  if (typeof window !== 'undefined' && window.budgetApp && typeof window.budgetApp.renderContent === 'function') {
    window.budgetApp.renderContent();
  }
}

export function setSpendQuickOffset(offsetType) {
  const currentRange = getActiveSpendTimeframeRange();
  const parseParts = str => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length < 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  let endDate = parseParts(currentRange.endIso) || new Date();

  if (offsetType === 'minus_12_months') {
    const s = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
    appState.spendFilterTimeframe = 'custom';
    appState.spendCustomStartDate = formatDateIso(s);
    appState.spendCustomEndDate = formatDateIso(endDate);
    appState.spendMonthTotalM = null;
    appState.spendCustomLabel = null;
    if (typeof window !== 'undefined' && window.budgetApp && typeof window.budgetApp.renderContent === 'function') {
      window.budgetApp.renderContent();
    }
  }
}

export function renderSpendAnalyticsView(container) {
  const activeEl = document.activeElement;
  const focusedId = (activeEl && (activeEl.id === 'spendFilterDate' || activeEl.id === 'spendFilterPayee' || activeEl.id === 'spendFilterAmount' || activeEl.id === 'spendSearchInputTop' || activeEl.id === 'spendRangeStart' || activeEl.id === 'spendRangeEnd')) ? activeEl.id : null;
  const cursorStart = focusedId && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
  const cursorEnd = focusedId && typeof activeEl.selectionEnd === 'number' ? activeEl.selectionEnd : null;

  const cfg = getSettings();
  const curr = cfg.currency;
  const isMulti = isMultiUserEnabled();
  const allTxns = appState.data?.open_banking_transactions || [];
  const customRules = cfg.merchant_category_rules || {};

  const timeframe = appState.spendFilterTimeframe || 'this_month';
  const rangeInfo = getActiveSpendTimeframeRange();
  const customRange = (timeframe === 'custom' || rangeInfo.startIso) ? {
    startDate: rangeInfo.startIso,
    endDate: rangeInfo.endIso
  } : null;

  const accountFilter = appState.spendFilterAccount || 'all';
  const categoryFilter = appState.spendFilterCategory || 'all';
  const searchQuery = (appState.spendSearchQuery || '').toLowerCase().trim();
  const activeUser = isMulti ? (appState.activeUser || 'Joint') : 'all';

  const colFilters = appState.spendColFilters || {
    date: '',
    payee: '',
    account: 'all',
    owner: 'all',
    category: 'all',
    amount: ''
  };

  const sortCol = appState.spendSortColumn || 'date';
  const sortDir = appState.spendSortDirection || 'desc';

  const breakdown = calculateCategoryBreakdown(allTxns, timeframe, accountFilter, activeUser, customRules, customRange);
  const { categoryList, topMerchants, grandTotal, transactionCount, startDate, endDate } = breakdown;

  const availableAccounts = Array.from(new Set(breakdown.filteredTransactions.map(t => t.account_name).filter(Boolean))).sort();
  const availableOwners = Array.from(new Set(breakdown.filteredTransactions.map(t => t.owner || 'Joint').filter(Boolean))).sort();

  let displayTxns = [...breakdown.filteredTransactions];

  // 1. Top Category Filter
  if (categoryFilter !== 'all') {
    displayTxns = displayTxns.filter(t => t.assignedCategory?.id === categoryFilter);
  }

  // 2. Top Global Search Query
  if (searchQuery) {
    displayTxns = displayTxns.filter(t => {
      const p = (t.payee_name || '').toLowerCase();
      const r = (t.raw_info || '').toLowerCase();
      const a = (t.account_name || '').toLowerCase();
      const m = (t.merchant_name || '').toLowerCase();
      const d = (t.description || '').toLowerCase();
      const amt = String(Math.abs(Number(t.amount || 0)));
      return p.includes(searchQuery) || r.includes(searchQuery) || a.includes(searchQuery) || m.includes(searchQuery) || d.includes(searchQuery) || amt.includes(searchQuery);
    });
  }

  // 3. Column Specific Filters
  if (colFilters.date && colFilters.date.trim()) {
    const dQuery = colFilters.date.toLowerCase().trim();
    displayTxns = displayTxns.filter(t => (t.booking_date || '').toLowerCase().includes(dQuery));
  }

  if (colFilters.payee && colFilters.payee.trim()) {
    const pQuery = colFilters.payee.toLowerCase().trim();
    displayTxns = displayTxns.filter(t => {
      const p = (t.payee_name || '').toLowerCase();
      const r = (t.raw_info || '').toLowerCase();
      const m = (t.merchant_name || '').toLowerCase();
      const d = (t.description || '').toLowerCase();
      return p.includes(pQuery) || r.includes(pQuery) || m.includes(pQuery) || d.includes(pQuery);
    });
  }

  if (colFilters.account && colFilters.account !== 'all') {
    displayTxns = displayTxns.filter(t => (t.account_name || '') === colFilters.account);
  }

  if (isMulti && colFilters.owner && colFilters.owner !== 'all') {
    displayTxns = displayTxns.filter(t => (t.owner || 'Joint') === colFilters.owner);
  }

  if (colFilters.category && colFilters.category !== 'all') {
    displayTxns = displayTxns.filter(t => (t.assignedCategory?.id || '') === colFilters.category);
  }

  if (colFilters.amount && colFilters.amount.trim()) {
    displayTxns = displayTxns.filter(t => matchesAmountFilter(Number(t.amount || 0), colFilters.amount));
  }

  // 4. Column Sorting
  displayTxns.sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'date') {
      const dA = a.booking_date || '';
      const dB = b.booking_date || '';
      cmp = dA.localeCompare(dB);
    } else if (sortCol === 'payee') {
      const pA = (a.merchant_name || a.payee_name || a.description || a.raw_info || '').toLowerCase();
      const pB = (b.merchant_name || b.payee_name || b.description || b.raw_info || '').toLowerCase();
      cmp = pA.localeCompare(pB);
    } else if (sortCol === 'account') {
      const aA = (a.account_name || '').toLowerCase();
      const aB = (b.account_name || '').toLowerCase();
      cmp = aA.localeCompare(aB);
    } else if (sortCol === 'owner') {
      const oA = (a.owner || 'Joint').toLowerCase();
      const oB = (b.owner || 'Joint').toLowerCase();
      cmp = oA.localeCompare(oB);
    } else if (sortCol === 'category') {
      const cA = (a.assignedCategory?.label || '').toLowerCase();
      const cB = (b.assignedCategory?.label || '').toLowerCase();
      cmp = cA.localeCompare(cB);
    } else if (sortCol === 'amount') {
      const amtA = Number(a.amount || 0);
      const amtB = Number(b.amount || 0);
      cmp = Math.abs(amtA) - Math.abs(amtB);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const hasActiveFilters = Boolean(
    (colFilters.date && colFilters.date.trim()) ||
    (colFilters.payee && colFilters.payee.trim()) ||
    (colFilters.account && colFilters.account !== 'all') ||
    (colFilters.owner && colFilters.owner !== 'all') ||
    (colFilters.category && colFilters.category !== 'all') ||
    (colFilters.amount && colFilters.amount.trim()) ||
    searchQuery ||
    (categoryFilter && categoryFilter !== 'all')
  );

  const now = new Date();
  const sDate = breakdown.startDate || (rangeInfo.startIso ? new Date(rangeInfo.startIso) : new Date(now.getFullYear(), now.getMonth(), 1));
  const eDate = breakdown.endDate || (rangeInfo.endIso ? new Date(rangeInfo.endIso) : now);
  const dayCount = Math.max(1, Math.round((Math.abs(eDate.getTime() - sDate.getTime())) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailySpend = grandTotal / dayCount;

  let isPaydayCycle = false;
  let rangeBadgeText = '';
  if (rangeInfo.label && rangeInfo.label.startsWith('Payday:')) {
    isPaydayCycle = true;
    rangeBadgeText = rangeInfo.label;
  } else if (timeframe === 'this_month' || timeframe === 'last_month') {
    isPaydayCycle = true;
    rangeBadgeText = rangeInfo.label;
  } else if (timeframe === 'active_week') {
    rangeBadgeText = rangeInfo.label || `This Week (${formatShortDate(sDate)} – ${formatShortDate(eDate)})`;
  } else if (timeframe === 'last_7_days') {
    rangeBadgeText = `Last 7 Days (${formatShortDate(sDate)} – ${formatShortDate(eDate)})`;
  } else if (timeframe === 'last_30_days') {
    rangeBadgeText = `Last 30 Days (${formatShortDate(sDate)} – ${formatShortDate(eDate)})`;
  } else if (timeframe === 'last_90_days') {
    rangeBadgeText = `Last 90 Days (${formatShortDate(sDate)} – ${formatShortDate(eDate)})`;
  } else if (timeframe === 'rolling_12_months') {
    rangeBadgeText = `Rolling 12 Mo (${formatShortDate(sDate)} – ${formatShortDate(eDate)})`;
  } else if (timeframe === 'year_to_date') {
    rangeBadgeText = `YTD (${formatShortDate(sDate)} – ${formatShortDate(eDate)})`;
  } else if (timeframe === 'all_time') {
    rangeBadgeText = `All Time (${formatShortDate(sDate)} – ${formatShortDate(eDate)})`;
  } else {
    rangeBadgeText = rangeInfo.label || `${formatShortDate(sDate)} – ${formatShortDate(eDate)}`;
  }

  const topCat = categoryList.length > 0 ? categoryList[0] : null;

  const linkedAccounts = cfg.open_banking?.linked_accounts || [];
  const distinctAccounts = Array.from(new Set([
    ...(cfg.current_accounts || []),
    ...(cfg.credit_accounts || []).map(ca => typeof ca === 'string' ? ca : ca.name),
    ...allTxns.map(t => t.account_name).filter(Boolean)
  ]));

  if (window.budgetApp) {
    window.budgetApp._currentSpendDisplayTxns = displayTxns;
    window.budgetApp._currentSpendAllTxns = breakdown.filteredTransactions;
    window.budgetApp._currentSpendTimeframe = timeframe;
  }

  container.innerHTML = `
    <!-- HEADER PANEL -->
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="margin:0; font-size:20px; display:flex; align-items:center; gap:8px;">
            <span>🛒</span> Live Spend & Category Analytics
          </h2>
          <p style="color:var(--text-muted); font-size:12px; margin:4px 0 0 0;">
            Real-time categorization and breakdown of your bank card purchases, fuel, groceries, and living expenses.
          </p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <!-- Account selector -->
          <select onchange="window.budgetApp.setSpendAnalyticsAccount(this.value)" style="font-size:11.5px; padding:5px 8px; border-radius:6px; font-weight:600;">
            <option value="all" ${accountFilter === 'all' ? 'selected' : ''}>💳 All Accounts Combined</option>
            ${distinctAccounts.map(acc => `<option value="${acc}" ${accountFilter === acc ? 'selected' : ''}>${acc}</option>`).join('')}
          </select>

          <button class="btn secondary" style="font-size:11.5px; padding:5px 10px;" onclick="window.budgetApp.syncCategoriesGitHub()" title="Pull latest merchant categories database from GitHub">
            🌐 Update Dictionary
          </button>

          <button class="btn green" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.triggerOpenBankingSync()" title="Fetch latest live transactions">
            🔄 Sync Bank
          </button>
        </div>
      </div>

      <!-- TIMESPAN CONTROL TOOLBAR -->
      <div class="spend-timespan-bar" style="margin-top:14px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:var(--bg-card, rgba(30, 41, 59, 0.5)); border:1px solid var(--border, rgba(255, 255, 255, 0.08)); border-radius:12px; padding:8px 12px; box-sizing:border-box;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn secondary sm" onclick="window.budgetApp.shiftSpendTimeframe(-1)" title="Step 1 Period Earlier in History" style="height:32px; padding:0 12px; font-weight:700;">
            ◀
          </button>
          <div class="spend-range-badge" ${isPaydayCycle && rangeInfo.monthName ? `onclick="window.budgetApp.openDateOverrideModal('${rangeInfo.monthName}')" title="Click to override payday period for ${rangeInfo.monthName}" style="cursor:pointer; background:var(--card-bg, #1e293b); border:1px solid var(--border, #334155); border-radius:9999px; padding:4px 14px; font-size:12.5px; font-weight:700; color:var(--heading, #f8fafc); display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 4px rgba(0,0,0,0.15); user-select:none;"` : `style="background:var(--card-bg, #1e293b); border:1px solid var(--border, #334155); border-radius:9999px; padding:4px 14px; font-size:12.5px; font-weight:700; color:var(--heading, #f8fafc); display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 4px rgba(0,0,0,0.15); user-select:none;"`}>
            <span>📅 ${rangeBadgeText} ${isPaydayCycle && rangeInfo.monthName ? '✏️' : ''}</span>
            <span style="font-size:11px; opacity:0.75; font-weight:500;">(${dayCount} ${dayCount === 1 ? 'day' : 'days'})</span>
          </div>
          <button class="btn secondary sm" onclick="window.budgetApp.shiftSpendTimeframe(1)" title="Step 1 Period Later in History" style="height:32px; padding:0 12px; font-weight:700;">
            ▶
          </button>
          <button class="btn secondary sm" onclick="window.budgetApp.resetSpendTimeframe()" title="Reset to This Month" style="height:32px; font-size:11.5px; font-weight:600;">
            This Month
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <label style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Preset:</label>
          <select id="spendPresetSelect" onchange="window.budgetApp.setSpendAnalyticsTimeframe(this.value)" style="height:32px; font-size:12px; padding:0 8px; border-radius:6px; font-weight:600;">
            <option value="this_month" ${timeframe === 'this_month' ? 'selected' : ''}>📅 This Month</option>
            <option value="last_month" ${timeframe === 'last_month' ? 'selected' : ''}>📅 Last Month</option>
            <option value="active_week" ${timeframe === 'active_week' ? 'selected' : ''}>⚡ This Week</option>
            <option value="last_7_days" ${timeframe === 'last_7_days' ? 'selected' : ''}>⚡ Last 7 Days</option>
            <option value="last_30_days" ${timeframe === 'last_30_days' ? 'selected' : ''}>⚡ Last 30 Days</option>
            <option value="last_90_days" ${timeframe === 'last_90_days' ? 'selected' : ''}>⚡ Last 90 Days</option>
            <option value="rolling_12_months" ${timeframe === 'rolling_12_months' ? 'selected' : ''}>📈 Rolling 12 Months</option>
            <option value="year_to_date" ${timeframe === 'year_to_date' ? 'selected' : ''}>📈 Year to Date</option>
            <option value="all_time" ${timeframe === 'all_time' ? 'selected' : ''}>🌐 All Time</option>
            <option value="custom" ${timeframe === 'custom' ? 'selected' : ''}>🗓️ Custom Range</option>
          </select>

          <div style="display:inline-flex; align-items:center; gap:6px; background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:2px 8px;">
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">From:</span>
            <input type="date" id="spendRangeStart" value="${rangeInfo.startIso}" style="height:28px; font-size:11.5px; padding:0 4px; border:none; background:transparent; color:var(--heading);" onchange="window.budgetApp.setSpendCustomDateRange(this.value, document.getElementById('spendRangeEnd').value)">
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">To:</span>
            <input type="date" id="spendRangeEnd" value="${rangeInfo.endIso}" style="height:28px; font-size:11.5px; padding:0 4px; border:none; background:transparent; color:var(--heading);" onchange="window.budgetApp.setSpendCustomDateRange(document.getElementById('spendRangeStart').value, this.value)">
          </div>

          <button class="btn secondary sm" onclick="window.budgetApp.setSpendQuickOffset('minus_12_months')" title="Set Start Date to End Date minus 12 Months" style="height:32px; font-size:11px; font-weight:600; padding:0 10px;">
            ⚡ -12 Mo
          </button>
        </div>
      </div>
    </div>

    <!-- KPI METRICS SUMMARY -->
    <div class="kpi-grid" style="margin-bottom:16px;">
      <div class="kpi-card">
        <div class="kpi-label">Total Outgoings (${dayCount} ${dayCount === 1 ? 'Day' : 'Days'})</div>
        <div class="kpi-value" style="color:var(--curr-border);">${curr}${grandTotal.toFixed(2)}</div>
        <div class="kpi-sub">${transactionCount} transactions analyzed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Daily Average Burn Rate</div>
        <div class="kpi-value" style="color:var(--heading);">${curr}${avgDailySpend.toFixed(2)} <span style="font-size:12px; font-weight:normal; color:var(--text-muted);">/ day</span></div>
        <div class="kpi-sub">Calculated over ${dayCount} active days</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Top Spending Category</div>
        <div class="kpi-value" style="color:${topCat ? topCat.category.color : 'var(--heading)'}; font-size:18px;">
          ${topCat ? `${topCat.category.icon} ${topCat.category.label}` : 'None'}
        </div>
        <div class="kpi-sub">${topCat ? `${curr}${topCat.totalAmount.toFixed(2)} (${topCat.percentage.toFixed(1)}% of total)` : 'No transactions recorded'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Bank Accounts</div>
        <div class="kpi-value" style="color:var(--green);">${linkedAccounts.length > 0 ? linkedAccounts.length : distinctAccounts.length} Linked</div>
        <div class="kpi-sub">${cfg.open_banking?.enabled ? '🟢 Auto-Syncing live feeds' : 'Offline / Manual mode'}</div>
      </div>
    </div>

    <!-- MAIN VISUAL DASHBOARD (DONUT CHART & CATEGORY BARS) -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap:16px; margin-bottom:16px;">
      <!-- DONUT CHART PANEL -->
      <div class="panel" style="display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:15px; color:var(--heading);">📊 Spend by Category</h3>
          <span style="font-size:11px; color:var(--text-muted);">${categoryList.length} Active Categories</span>
        </div>
        <div style="position:relative; flex:1; min-height:280px; max-height:340px; display:flex; align-items:center; justify-content:center;">
          <canvas id="spendCategoryDonutCanvas"></canvas>
        </div>
      </div>

      <!-- RANKED CATEGORY PROGRESS BARS -->
      <div class="panel" style="display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:15px; color:var(--heading);">🏆 Category Ranking</h3>
          <span style="font-size:11px; color:var(--text-muted);">Ranked by Total Spend</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; max-height:340px; padding-right:4px;">
          ${categoryList.length > 0 ? categoryList.map(c => `
            <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px; cursor:pointer;" onclick="window.budgetApp.setSpendCategoryFilter('${c.category.id}')" title="Click to filter transactions for ${c.category.label}">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:5px;">
                <span style="font-weight:600; color:var(--heading); display:flex; align-items:center; gap:6px;">
                  <span>${c.category.icon}</span>
                  <span>${c.category.label}</span>
                  <span style="font-size:10px; color:var(--text-muted); font-weight:normal;">(${c.count} txns)</span>
                </span>
                <span style="font-weight:700; color:var(--heading);">
                  ${curr}${c.totalAmount.toFixed(2)}
                  <span style="font-size:10.5px; color:var(--text-muted); font-weight:normal; margin-left:2px;">(${c.percentage.toFixed(1)}%)</span>
                </span>
              </div>
              <div style="width:100%; height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                <div style="width:${Math.min(100, Math.max(2, c.percentage))}%; height:100%; background:${c.category.color}; border-radius:3px;"></div>
              </div>
            </div>
          `).join('') : `
            <div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px 0;">No spending categories recorded for this period.</div>
          `}
        </div>
      </div>
    </div>

    <!-- TOP MERCHANTS ROW -->
    ${topMerchants.length > 0 ? `
      <div class="panel" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h3 style="margin:0; font-size:14px; color:var(--heading);">🏪 Top Merchants in Period</h3>
          <span style="font-size:11px; color:var(--text-muted);">Highest spending destinations</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap:8px;">
          ${topMerchants.map((m, idx) => `
            <div style="background:rgba(0,0,0,0.12); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="window.budgetApp.setSpendSearchQuery(this.dataset.merchant)" data-merchant="${m.name}" title="Filter transactions for ${m.name}">
              <div style="min-width:0; margin-right:8px;">
                <div style="font-size:10px; color:var(--text-muted); font-weight:700;">#${idx + 1}</div>
                <div style="font-size:12px; font-weight:600; color:var(--heading); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</div>
              </div>
              <div style="font-weight:700; color:var(--curr-border); font-size:12px; white-space:nowrap;">
                ${curr}${m.amount.toFixed(2)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- CATEGORIZED TRANSACTIONS TABLE PANEL -->
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
        <div>
          <h3 style="margin:0; font-size:15px; color:var(--heading);">🧾 Categorized Transactions</h3>
          <span style="font-size:11px; color:var(--text-muted);">
            Showing ${displayTxns.length} of ${breakdown.filteredTransactions.length} transactions
            ${hasActiveFilters ? '<span style="color:var(--amber, #f59e0b); font-weight:600;">(Filters active)</span>' : ''}
          </span>
        </div>

        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${hasActiveFilters ? `
            <button class="btn secondary" style="font-size:11px; padding:4px 10px; display:inline-flex; align-items:center; gap:4px;" onclick="window.budgetApp.clearAllSpendFilters()" title="Reset all column filters and search queries">
              ✕ Clear Filters
            </button>
          ` : ''}

          <!-- Category Filter -->
          <select onchange="window.budgetApp.setSpendCategoryFilter(this.value)" style="font-size:11.5px; padding:4px 8px; border-radius:6px;">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${SPEND_CATEGORIES.map(cat => `<option value="${cat.id}" ${categoryFilter === cat.id ? 'selected' : ''}>${cat.icon} ${cat.label}</option>`).join('')}
          </select>

          <!-- Search Input -->
          <div style="position:relative;">
            <input type="text" id="spendSearchInputTop" placeholder="🔍 Search merchant..." value="${appState.spendSearchQuery || ''}" oninput="window.budgetApp.setSpendSearchQuery(this.value)" style="font-size:11.5px; padding:4px 8px; width:160px; border-radius:6px;">
            ${appState.spendSearchQuery ? `<button style="position:absolute; right:4px; top:4px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:11px;" onclick="window.budgetApp.setSpendSearchQuery('')">&times;</button>` : ''}
          </div>

          <!-- Holiday Mode Button -->
          <button class="btn secondary" style="font-size:11.5px; padding:4px 10px; display:inline-flex; align-items:center; gap:5px;" onclick="window.budgetApp.openHolidayWindowsModal()" title="Configure Holiday / Travel Windows for automatic card categorization">
            <span>🏖️</span> Holiday Mode
          </button>

          <!-- Export CSV Button -->
          <button class="btn secondary" style="font-size:11.5px; padding:4px 10px; display:inline-flex; align-items:center; gap:5px;" onclick="window.budgetApp.exportCategorizedTransactionsCsv()" title="Export ${displayTxns.length} categorized transactions to CSV">
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      ${(() => {
        const nowIso = new Date().toISOString().slice(0, 10);
        const activeWindows = (cfg.holiday_windows || []).filter(w => w.enabled && nowIso >= w.start_date && nowIso <= w.end_date);
        if (activeWindows.length === 0) return '';
        return activeWindows.map(w => `
          <div style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); border-radius:6px; padding:8px 12px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">🏖️</span>
              <div>
                <strong style="color:var(--heading); font-size:12.5px;">Holiday Mode Active: ${w.name}</strong>
                <div style="font-size:11px; color:var(--text-muted);">
                  Transactions on <strong>${w.account || 'All Accounts'}</strong> between ${w.start_date} and ${w.end_date} automatically route to <strong>Travel</strong>.
                </div>
              </div>
            </div>
            <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.openHolidayWindowsModal()">Manage</button>
          </div>
        `).join('');
      })()}

      <!-- BATCH ACTIONS TOOLBAR -->
      <div id="spendBatchBar" style="background:var(--panel-bg, #1e293b); border:1px solid var(--primary, #38bdf8); border-radius:6px; padding:8px 12px; margin-bottom:10px; display:none; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
        <div style="font-weight:600; font-size:12.5px; color:var(--heading);">
          <span id="spendBatchCount">0</span> transactions selected
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:11.5px; color:var(--text-muted);">Set Category to:</span>
          <select id="spendBatchCatSelect" style="font-size:11.5px; padding:3px 6px; border-radius:4px;">
            ${SPEND_CATEGORIES.map(c => `<option value="${c.id}" ${c.id === 'travel' ? 'selected' : ''}>${c.icon} ${c.label}</option>`).join('')}
          </select>
          <button class="btn green" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.applyBatchRecategorize()">Apply</button>
          <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.clearSpendSelection()">Clear</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%; font-size:12px; border-collapse:collapse;">
          <thead>
            <!-- SORTABLE HEADERS -->
            <tr style="border-bottom:1px solid var(--border);">
              <th style="width:30px; text-align:center; padding:8px 4px;">
                <input type="checkbox" id="spendSelectAll" onchange="window.budgetApp.toggleSpendSelectAll(this.checked)" title="Select all filtered transactions">
              </th>
              <th onclick="window.budgetApp.toggleSpendSort('date')" style="width:100px; cursor:pointer; user-select:none; padding:8px;" title="Click to sort by Date">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
                  <span style="${sortCol === 'date' ? 'color:var(--heading); font-weight:700;' : ''}">Date</span>
                  <span style="font-size:11px; color:${sortCol === 'date' ? 'var(--primary, #38bdf8)' : 'var(--text-muted)'}; opacity:${sortCol === 'date' ? 1 : 0.4};">
                    ${sortCol === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </div>
              </th>

              <th onclick="window.budgetApp.toggleSpendSort('payee')" style="cursor:pointer; user-select:none; padding:8px;" title="Click to sort by Payee / Merchant">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
                  <span style="${sortCol === 'payee' ? 'color:var(--heading); font-weight:700;' : ''}">Payee / Merchant</span>
                  <span style="font-size:11px; color:${sortCol === 'payee' ? 'var(--primary, #38bdf8)' : 'var(--text-muted)'}; opacity:${sortCol === 'payee' ? 1 : 0.4};">
                    ${sortCol === 'payee' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </div>
              </th>

              <th onclick="window.budgetApp.toggleSpendSort('account')" style="min-width:130px; cursor:pointer; user-select:none; padding:8px;" title="Click to sort by Account">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
                  <span style="${sortCol === 'account' ? 'color:var(--heading); font-weight:700;' : ''}">Account</span>
                  <span style="font-size:11px; color:${sortCol === 'account' ? 'var(--primary, #38bdf8)' : 'var(--text-muted)'}; opacity:${sortCol === 'account' ? 1 : 0.4};">
                    ${sortCol === 'account' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </div>
              </th>

              ${isMulti ? `
                <th onclick="window.budgetApp.toggleSpendSort('owner')" style="width:90px; cursor:pointer; user-select:none; padding:8px;" title="Click to sort by Owner">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
                    <span style="${sortCol === 'owner' ? 'color:var(--heading); font-weight:700;' : ''}">Owner</span>
                    <span style="font-size:11px; color:${sortCol === 'owner' ? 'var(--primary, #38bdf8)' : 'var(--text-muted)'}; opacity:${sortCol === 'owner' ? 1 : 0.4};">
                      ${sortCol === 'owner' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
              ` : ''}

              <th onclick="window.budgetApp.toggleSpendSort('category')" style="width:170px; cursor:pointer; user-select:none; padding:8px;" title="Click to sort by Category">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
                  <span style="${sortCol === 'category' ? 'color:var(--heading); font-weight:700;' : ''}">Category</span>
                  <span style="font-size:11px; color:${sortCol === 'category' ? 'var(--primary, #38bdf8)' : 'var(--text-muted)'}; opacity:${sortCol === 'category' ? 1 : 0.4};">
                    ${sortCol === 'category' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </div>
              </th>

              <th onclick="window.budgetApp.toggleSpendSort('amount')" class="text-right" style="width:110px; cursor:pointer; user-select:none; padding:8px;" title="Click to sort by Amount">
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                  <span style="${sortCol === 'amount' ? 'color:var(--heading); font-weight:700;' : ''}">Amount</span>
                  <span style="font-size:11px; color:${sortCol === 'amount' ? 'var(--primary, #38bdf8)' : 'var(--text-muted)'}; opacity:${sortCol === 'amount' ? 1 : 0.4};">
                    ${sortCol === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </div>
              </th>
            </tr>

            <!-- INLINE COLUMN FILTER ROW -->
            <tr style="background:rgba(0,0,0,0.12); border-bottom:1px solid var(--border);">
              <th style="padding:4px 4px; text-align:center;"></th>
              <th style="padding:4px 6px;">
                <input type="text" id="spendFilterDate" placeholder="📅 YYYY-MM..." value="${colFilters.date || ''}" oninput="window.budgetApp.setSpendColFilter('date', this.value)" style="width:100%; font-size:11px; padding:3px 6px; border-radius:4px; border:1px solid var(--border); background:var(--panel-bg); color:var(--text); box-sizing:border-box;">
              </th>

              <th style="padding:4px 6px;">
                <input type="text" id="spendFilterPayee" placeholder="🔍 Merchant name..." value="${colFilters.payee || ''}" oninput="window.budgetApp.setSpendColFilter('payee', this.value)" style="width:100%; font-size:11px; padding:3px 6px; border-radius:4px; border:1px solid var(--border); background:var(--panel-bg); color:var(--text); box-sizing:border-box;">
              </th>

              <th style="padding:4px 6px;">
                <select id="spendFilterAccount" onchange="window.budgetApp.setSpendColFilter('account', this.value)" style="width:100%; font-size:11px; padding:3px 4px; border-radius:4px; border:1px solid var(--border); background:var(--panel-bg); color:var(--text); box-sizing:border-box;">
                  <option value="all">All Accounts</option>
                  ${availableAccounts.map(a => `<option value="${a}" ${colFilters.account === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </th>

              ${isMulti ? `
                <th style="padding:4px 6px;">
                  <select id="spendFilterOwner" onchange="window.budgetApp.setSpendColFilter('owner', this.value)" style="width:100%; font-size:11px; padding:3px 4px; border-radius:4px; border:1px solid var(--border); background:var(--panel-bg); color:var(--text); box-sizing:border-box;">
                    <option value="all">All Owners</option>
                    ${availableOwners.map(o => `<option value="${o}" ${colFilters.owner === o ? 'selected' : ''}>${o}</option>`).join('')}
                  </select>
                </th>
              ` : ''}

              <th style="padding:4px 6px;">
                <select id="spendFilterCategory" onchange="window.budgetApp.setSpendColFilter('category', this.value)" style="width:100%; font-size:11px; padding:3px 4px; border-radius:4px; border:1px solid var(--border); background:var(--panel-bg); color:var(--text); box-sizing:border-box;">
                  <option value="all">All Categories</option>
                  ${SPEND_CATEGORIES.map(cat => `<option value="${cat.id}" ${(colFilters.category === cat.id || (categoryFilter !== 'all' && categoryFilter === cat.id)) ? 'selected' : ''}>${cat.icon} ${cat.label}</option>`).join('')}
                </select>
              </th>

              <th style="padding:4px 6px;">
                <input type="text" id="spendFilterAmount" placeholder="e.g. >50, 20" value="${colFilters.amount || ''}" oninput="window.budgetApp.setSpendColFilter('amount', this.value)" style="width:100%; font-size:11px; padding:3px 6px; border-radius:4px; border:1px solid var(--border); background:var(--panel-bg); color:var(--text); text-align:right; box-sizing:border-box;">
              </th>
            </tr>
          </thead>

          <tbody>
            ${displayTxns.length > 0 ? displayTxns.map(t => {
              const cat = t.assignedCategory || SPEND_CATEGORIES[SPEND_CATEGORIES.length - 1];
              const merchantDisp = t.merchant_name || t.payee_name || t.description || t.raw_info || 'Transaction';
              const cleanAttr = merchantDisp.replace(/"/g, '&quot;');
              return `
                <tr>
                  <td style="text-align:center; padding:8px 4px;">
                    <input type="checkbox" class="spend-row-select" data-txnid="${t.transaction_id}" onchange="window.budgetApp.toggleSpendRowSelect('${t.transaction_id}', this.checked)">
                  </td>
                  <td style="color:var(--text-muted); white-space:nowrap; font-size:11.5px; padding:8px;">${t.booking_date}</td>
                  <td style="padding:8px;">
                    <strong style="color:var(--heading); font-size:12.5px;">${merchantDisp}</strong>
                    ${t.holiday_window_name ? `<span class="badge" style="background:rgba(56,189,248,0.15); color:var(--primary, #38bdf8); font-size:9.5px; padding:1px 5px; margin-left:4px; font-weight:600;" title="Auto-categorized by Holiday Window">🏖️ ${t.holiday_window_name}</span>` : ''}
                    ${t.raw_info && t.raw_info !== merchantDisp ? `<div style="font-size:10px; color:var(--text-muted); opacity:0.8;">${t.raw_info}</div>` : ''}
                  </td>
                  <td style="color:var(--text-muted); font-size:11.5px; padding:8px;">${t.account_name || 'Account'}</td>
                  ${isMulti ? `<td style="font-size:11px; color:var(--text-muted); padding:8px;">${t.owner || 'Joint'}</td>` : ''}
                  <td style="padding:8px;">
                    <button class="badge" style="background:rgba(255,255,255,0.06); border:1px solid ${cat.color}60; color:${cat.color}; font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600;" onclick="window.budgetApp.openRecategorizeModal(this.dataset.txnid, this.dataset.payee, this.dataset.catid)" data-txnid="${t.transaction_id}" data-payee="${cleanAttr}" data-catid="${cat.id}" title="Click to change category or create custom rule">
                      <span>${cat.icon}</span>
                      <span>${cat.label}</span>
                      <span style="font-size:9px; opacity:0.7;">▾</span>
                    </button>
                  </td>
                  <td class="text-right" style="font-weight:700; color:${t.amount < 0 ? 'var(--red)' : 'var(--green)'}; font-size:12.5px; white-space:nowrap; padding:8px;">
                    ${t.amount < 0 ? '-' : '+'}${curr}${Math.abs(Number(t.amount || 0)).toFixed(2)}
                    ${t.amount > 0 ? `<div style="font-size:9.5px; font-weight:600; color:var(--green); opacity:0.9;">↩️ Refund / Offset</div>` : ''}
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="${isMulti ? 7 : 6}" style="text-align:center; padding:35px 20px; color:var(--text-muted);">
                  <div style="font-size:22px; margin-bottom:6px;">🧾</div>
                  <div style="font-size:13px; font-weight:600; color:var(--heading); margin-bottom:4px;">No transactions match the selected filters.</div>
                  ${hasActiveFilters ? `
                    <button class="btn secondary" style="font-size:11px; padding:4px 10px; margin-top:8px;" onclick="window.budgetApp.clearAllSpendFilters()">
                      ✕ Reset All Filters
                    </button>
                  ` : ''}
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (focusedId) {
    const elToFocus = document.getElementById(focusedId);
    if (elToFocus) {
      elToFocus.focus();
      if (cursorStart !== null && typeof elToFocus.setSelectionRange === 'function') {
        try {
          elToFocus.setSelectionRange(cursorStart, cursorEnd);
        } catch (e) {}
      }
    }
  }

  setTimeout(() => {
    const canvas = document.getElementById('spendCategoryDonutCanvas');
    if (canvas) {
      renderCategoryDonutChart(canvas, categoryList, curr);
    }
  }, 50);
}

if (typeof window !== 'undefined') {
  window.renderSpendAnalyticsView = renderSpendAnalyticsView;
  window.setSpendAnalyticsTimeframe = setSpendAnalyticsTimeframe;
  window.setSpendCustomDateRange = setSpendCustomDateRange;
  window.shiftSpendTimeframe = shiftSpendTimeframe;
  window.resetSpendTimeframe = resetSpendTimeframe;
  window.setSpendQuickOffset = setSpendQuickOffset;
}

