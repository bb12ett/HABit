function formatCheckInTimestamp(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  if (isToday) {
    return `Today at ${hours}:${mins}`;
  }
  return `${d.getDate()} ${months[d.getMonth()]} ${hours}:${mins}`;
}

import { appState, getSettings, getYearData, getMonthData, getWeekItems, getWeekActuals, isAccountTrackedWeekly, isAccountIncludedInNet, getAllScheduledBills, getAllScheduledIncomes, getAllScheduledItems, months, isMultiUserEnabled, isPersonSalaryHidden, getAccountOwner, isUserUnlocked, hasPersonPin, getActiveUser, isAccountVisibleToActiveUser } from '../state.js';
import { calculateMonthSchedule, calculateLiveDailyPacing, getDDsForWeek, getIncomesForWeek, getYearlyBudgetItemsForMonth, getBirthdayItemsForMonth, getBirthdaysForWeek, getBirthdayOccasionsForWeek, getRecurringForWeek, isRecurringDueInMonth, formatScheduledBillDue, detectCurrentMonthAndWeek, getDeductionSalaryForMonth, getPaydaysForSchedule } from '../calculations.js';

export function renderOverviewView(container) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const activeTab = appState.activeTab;
  const currentYear = appState.currentYear;
  const globalEditMode = appState.globalEditMode;
  const isMulti = isMultiUserEnabled();

  const mIdx = months.indexOf(activeTab);
  const schedule = calculateMonthSchedule(currentYear, mIdx);
  const mData = getMonthData(activeTab);

  const deducts = mData.deductions_list || [];
  let totalCurrentInflow = 0;
  let totalSalarySavingsIn = 0;
  const personTotals = {};
  cfg.people.forEach(p => personTotals[p] = { salary: 0, out: 0, leftover: 0 });

  deducts.forEach(d => {
    cfg.people.forEach(p => {
      let amt = 0;
      if (d.is_salary) {
        amt = getDeductionSalaryForMonth(d, p, schedule).total;
        personTotals[p].salary += amt;
        if (cfg.current_accounts.includes(d.target_account)) totalCurrentInflow += amt;
        if (cfg.savings_accounts.includes(d.target_account)) totalSalarySavingsIn += amt;
      } else {
        if (d.amounts && typeof d.amounts[p] !== 'undefined') {
          amt = Number(d.amounts[p]) || 0;
        } else if (d.person) {
          amt = (d.person === p) ? (Number(d.amount) || 0) : 0;
        }
        personTotals[p].out += amt;
        if (cfg.current_accounts.includes(d.target_account)) totalCurrentInflow += amt;
        if (cfg.savings_accounts.includes(d.target_account)) totalSalarySavingsIn += amt;
      }
    });
  });

  cfg.people.forEach(p => personTotals[p].leftover = personTotals[p].salary - personTotals[p].out);

  const allYearlyBills = getYearData().yearly_recurring || [];
  const allYearlyIncome = getYearData().yearly_income || [];
  const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(activeTab, months.indexOf(activeTab), appState.currentYear) : [];
  const birthdayBillsThisMonth = (typeof getBirthdayItemsForMonth === 'function') ? getBirthdayItemsForMonth(activeTab, months.indexOf(activeTab), appState.currentYear) : [];
  const allBirthdays = getYearData().birthdays || cfg.birthdays || [];
  const allRecurring = getYearData().recurring_payments || cfg.recurring_payments || [];
  const allRecurringIncomes = getYearData().recurring_incomes || cfg.recurring_incomes || [];

  let totalDD = (mData.direct_debits || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  allYearlyBills.filter(yb => yb.month === activeTab).forEach(yb => totalDD += (Number(yb.amount) || 0));
  budgetBillsThisMonth.forEach(b => totalDD += (Number(b.amount) || 0));
  birthdayBillsThisMonth.forEach(b => totalDD += (Number(b.amount) || 0));

  let totalMonthPaymentsIn = (mData.payments_in || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  allYearlyIncome.filter(yi => yi.month === activeTab).forEach(yi => totalMonthPaymentsIn += (Number(yi.amount) || 0));
  
  let totalWeeklySpend = 0, totalWeeklyCurrentSpend = 0, totalWeeklyIncome = 0;
  schedule.weeks.forEach(wObj => {
    const items = getWeekItems(activeTab, wObj.name);
    items.forEach(i => {
      const amt = Number(i.amount) || 0;
      if (i.is_income) totalWeeklyIncome += amt;
      else {
        totalWeeklySpend += amt;
        const isCurrent = i.account_type === 'current' || (i.desc && i.desc.toLowerCase().includes('cash'));
        if (isCurrent) totalWeeklyCurrentSpend += amt;
      }
    });
  });

  let totalCurrentOpening = 0;
  const runningCurrentByAcc = {};
  cfg.current_accounts.forEach(acc => {
    const val = Number(mData.current_data[acc] && mData.current_data[acc].opening) || 0;
    totalCurrentOpening += val;
    runningCurrentByAcc[acc] = val;
  });

  deducts.forEach(d => {
    if (cfg.current_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amount = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        if (runningCurrentByAcc[d.target_account] !== undefined) {
          runningCurrentByAcc[d.target_account] += amount || 0;
        }
      });
    }
  });

  let totalCreditOpeningSpent = 0, totalCreditLimit = 0;
  const runningCreditByCard = {};
  cfg.credit_accounts.forEach(c => {
    const spent = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
    totalCreditLimit += Number(c.limit) || 0;
    totalCreditOpeningSpent += spent;
    runningCreditByCard[c.name] = spent;
  });

  const autoSavingsFromDD = {};
  cfg.savings_accounts.forEach(acc => autoSavingsFromDD[acc] = 0);
  (mData.direct_debits || []).forEach(dd => {
    if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
      autoSavingsFromDD[dd.transfer_to] += Number(dd.amount) || 0;
    }
  });

  let totalSavingsOpening = 0;
  const runningSavingsByAcc = {};
  cfg.savings_accounts.forEach(acc => {
    const val = Number(mData.savings_data[acc] && mData.savings_data[acc].opening) || 0;
    totalSavingsOpening += val;
    runningSavingsByAcc[acc] = val;
  });

  deducts.forEach(d => {
    if (cfg.savings_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        if (runningSavingsByAcc[d.target_account] !== undefined) runningSavingsByAcc[d.target_account] += amt || 0;
      });
    }
  });

  // Calculate week-by-week cashflow predictions
  const weeklyPredictions = [];
  schedule.weeks.forEach((wObj, wIdx) => {
    const isFinalWeek = (wIdx === schedule.weeks.length - 1);
    const items = getWeekItems(activeTab, wObj.name);
    const actuals = getWeekActuals(activeTab, wObj.name);

    let wExpenseSum = 0, wIncomeSum = 0;
    items.forEach(it => {
      const amt = Number(it.amount) || 0;
      if (it.is_income) wIncomeSum += amt;
      else wExpenseSum += amt;
    });

    const directDebitsWithMeta = (mData.direct_debits || []).map((b, idx) => ({ ...b, source_type: 'direct_debit', source_idx: idx }));
    const yearlyBillsWithMeta = (getYearData().yearly_recurring || []).map((b, idx) => ({ ...b, source_type: 'yearly_recurring', source_idx: idx }));
    const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(activeTab, months.indexOf(activeTab), appState.currentYear).map((b, idx) => ({ ...b, source_type: 'budget_bill', source_idx: idx })) : [];
    const allScheduledBills = [...directDebitsWithMeta, ...yearlyBillsWithMeta, ...budgetBillsThisMonth];
    const baseDDs = getDDsForWeek(allScheduledBills, wObj, schedule);
    
    const allBirthdays = getYearData().birthdays || cfg.birthdays || [];
    const allRecurring = getYearData().recurring_payments || cfg.recurring_payments || [];
    const wBirthdays = (typeof getBirthdaysForWeek === 'function') ? getBirthdaysForWeek(allBirthdays, wObj, schedule, currentYear) : [];
    const wRecurring = (typeof getRecurringForWeek === 'function') ? getRecurringForWeek(allRecurring, wObj, schedule, currentYear) : [];
    
    const wDDs = [...baseDDs, ...wRecurring, ...wBirthdays];
    const wDDTotal = wDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // Scheduled Payments In / Inflows
    const directIncomesWithMeta = (mData.payments_in || []).map((b, idx) => ({ ...b, source_type: 'payments_in', source_idx: idx }));
    const yearlyIncomesWithMeta = (getYearData().yearly_income || []).map((b, idx) => ({ ...b, source_type: 'yearly_income', source_idx: idx }));
    const allScheduledIncomes = [...directIncomesWithMeta, ...yearlyIncomesWithMeta];
    const baseIncomes = getIncomesForWeek(allScheduledIncomes, wObj, schedule, currentYear);
    const allRecurringIncomes = getYearData().recurring_incomes || cfg.recurring_incomes || [];
    const wRecurringIncomes = (typeof getRecurringForWeek === 'function') ? getRecurringForWeek(allRecurringIncomes, wObj, schedule, currentYear) : [];
    const wIncomes = [...baseIncomes, ...wRecurringIncomes];
    const wIncomeTotal = wIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    // 1. Process Outgoings
    wDDs.forEach(dd => {
      const paidFrom = dd.account || cfg.current_accounts[0];
      const amt = Number(dd.amount) || 0;
      if (runningCurrentByAcc[paidFrom] !== undefined) {
        runningCurrentByAcc[paidFrom] -= amt;
      }
      if (runningCreditByCard[paidFrom] !== undefined) {
        runningCreditByCard[paidFrom] += amt;
      }
      if (runningSavingsByAcc[paidFrom] !== undefined) {
        runningSavingsByAcc[paidFrom] -= amt;
      }
      if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
        if (runningSavingsByAcc[dd.transfer_to] !== undefined) {
          runningSavingsByAcc[dd.transfer_to] += amt;
        }
      }
    });

    // 2. Process Inflows
    wIncomes.forEach(pi => {
      const creditedTo = pi.account || cfg.current_accounts[0];
      const amt = Number(pi.amount) || 0;
      if (runningCurrentByAcc[creditedTo] !== undefined) {
        runningCurrentByAcc[creditedTo] += amt;
      }
      if (runningCreditByCard[creditedTo] !== undefined) {
        runningCreditByCard[creditedTo] = Math.max(0, runningCreditByCard[creditedTo] - amt);
      }
      if (runningSavingsByAcc[creditedTo] !== undefined) {
        runningSavingsByAcc[creditedTo] += amt;
      }
    });

    const autopaysDue = [];
    cfg.credit_accounts.forEach(c => {
      if (c.autopay_enabled) {
        let isDueThisWeek = (c.autopay_when === `week_${wIdx + 1}`);
        if (isDueThisWeek) {
          const openingDebt = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
          const payAmt = c.autopay_type === 'full' ? openingDebt : Math.min(openingDebt, Number(c.autopay_fixed_amt) || 0);
          if (payAmt > 0) {
            const fundingAcc = c.autopay_from || cfg.current_accounts[0];
            if (runningCurrentByAcc[fundingAcc] !== undefined) runningCurrentByAcc[fundingAcc] -= payAmt;
            runningCreditByCard[c.name] = Math.max(0, runningCreditByCard[c.name] - payAmt);
            autopaysDue.push({ card: c.name, from: fundingAcc, amount: payAmt });
          }
        }
      }
    });

    items.forEach(it => {
      const amt = Number(it.amount) || 0;
      if (it.account_type === 'current') {
        const acc = it.account_name || cfg.current_accounts[0];
        if (runningCurrentByAcc[acc] !== undefined) runningCurrentByAcc[acc] = it.is_income ? runningCurrentByAcc[acc] + amt : runningCurrentByAcc[acc] - amt;
      } else if (it.account_type === 'credit') {
        const cName = it.account_name || cfg.credit_accounts[0]?.name;
        if (cName && runningCreditByCard[cName] !== undefined) runningCreditByCard[cName] = it.is_income ? runningCreditByCard[cName] - amt : runningCreditByCard[cName] + amt;
      } else if (it.account_type === 'savings') {
        const sName = it.account_name || cfg.savings_accounts[0];
        if (sName && runningSavingsByAcc[sName] !== undefined) runningSavingsByAcc[sName] = it.is_income ? runningSavingsByAcc[sName] + amt : runningSavingsByAcc[sName] - amt;
      }
    });

    const weekCurrentSnap = { ...runningCurrentByAcc };
    const weekCreditSnap = { ...runningCreditByCard };
    const weekSavingsSnap = { ...runningSavingsByAcc };

    let sumWeekCurrent = 0, sumWeekCredit = 0, sumWeekSavings = 0;
    cfg.current_accounts.forEach(acc => sumWeekCurrent += (weekCurrentSnap[acc] || 0));
    cfg.credit_accounts.forEach(c => sumWeekCredit += (weekCreditSnap[c.name] || 0));
    if (cfg.track_savings) {
      cfg.savings_accounts.forEach(s => sumWeekSavings += (weekSavingsSnap[s] || 0));
    }

    let predictedNet = 0;
    if (isFinalWeek) {
      cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).forEach(a => predictedNet += (weekCurrentSnap[a] || 0));
      if (cfg.track_savings) {
        cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).forEach(s => predictedNet += (weekSavingsSnap[s] || 0));
      }
      cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).forEach(c => predictedNet -= (weekCreditSnap[c.name] || 0));
    } else {
      cfg.current_accounts.filter(a => isAccountTrackedWeekly('current', a) && isAccountIncludedInNet('current', a)).forEach(a => predictedNet += (weekCurrentSnap[a] || 0));
      if (cfg.track_savings) {
        cfg.savings_accounts.filter(s => isAccountTrackedWeekly('savings', s) && isAccountIncludedInNet('savings', s)).forEach(s => predictedNet += (weekSavingsSnap[s] || 0));
      }
      cfg.credit_accounts.filter(c => isAccountTrackedWeekly('credit', c.name) && isAccountIncludedInNet('credit', c.name)).forEach(c => predictedNet -= (weekCreditSnap[c.name] || 0));
    }

    const checkinCurrentAccounts = cfg.current_accounts.filter(acc => isFinalWeek || isAccountTrackedWeekly('current', acc));
    const checkinCreditAccounts = cfg.credit_accounts.filter(c => isFinalWeek || isAccountTrackedWeekly('credit', c.name));
    const checkinSavingsAccounts = cfg.track_savings ? cfg.savings_accounts.filter(s => isFinalWeek || isAccountTrackedWeekly('savings', s)) : [];

    let actCurrentSum = 0, actCreditSpentSum = 0, actSavingsSum = 0;
    let hasActualEntry = false;

    checkinCurrentAccounts.forEach(acc => {
      if (actuals[`curr_${acc}`] !== undefined && actuals[`curr_${acc}`] !== "" && actuals[`curr_${acc}`] !== null) {
        hasActualEntry = true;
        if (isAccountIncludedInNet('current', acc)) {
          actCurrentSum += parseFloat(actuals[`curr_${acc}`]) || 0;
        }
      } else if (isAccountIncludedInNet('current', acc)) {
        actCurrentSum += (weekCurrentSnap[acc] || 0);
      }
    });

    checkinCreditAccounts.forEach(c => {
      let cardSpent = 0;
      if (actuals[`c_avail_${c.name}`] !== undefined && actuals[`c_avail_${c.name}`] !== "") {
        cardSpent = (Number(c.limit) || 0) - (parseFloat(actuals[`c_avail_${c.name}`]) || 0);
        hasActualEntry = true;
      } else if (actuals[`c_spent_${c.name}`] !== undefined && actuals[`c_spent_${c.name}`] !== "") {
        cardSpent = parseFloat(actuals[`c_spent_${c.name}`]) || 0;
        hasActualEntry = true;
      } else {
        cardSpent = (weekCreditSnap[c.name] || 0);
      }
      if (isAccountIncludedInNet('credit', c.name)) {
        actCreditSpentSum += cardSpent;
      }
    });

    checkinSavingsAccounts.forEach(s => {
      if (actuals[`sav_${s}`] !== undefined && actuals[`sav_${s}`] !== "") {
        hasActualEntry = true;
        if (isAccountIncludedInNet('savings', s)) {
          actSavingsSum += parseFloat(actuals[`sav_${s}`]) || 0;
        }
      } else if (isAccountIncludedInNet('savings', s)) {
        actSavingsSum += (weekSavingsSnap[s] || 0);
      }
    });

    let actualNet = null, variance = null;
    if (hasActualEntry) {
      actualNet = actCurrentSum + actSavingsSum - actCreditSpentSum;
      variance = actualNet - predictedNet;
    }

    weeklyPredictions.push({
      wSpend: wExpenseSum,
      wIncomeSum: wIncomeSum,
      wDDs: wDDs,
      wDDTotal: wDDTotal,
      wIncomes: wIncomes,
      wIncomeTotal: wIncomeTotal,
      autopaysDue: autopaysDue,
      weekCurrentSnap: weekCurrentSnap,
      weekCreditSnap: weekCreditSnap,
      weekSavingsSnap: weekSavingsSnap,
      sumWeekCurrent: sumWeekCurrent,
      sumWeekCredit: sumWeekCredit,
      sumWeekSavings: sumWeekSavings,
      predictedNet: predictedNet,
      actualNet: actualNet,
      variance: variance
    });
  });

  const finalWeekPred = weeklyPredictions.length > 0 ? weeklyPredictions[weeklyPredictions.length - 1] : { sumWeekCurrent: 0, sumWeekCredit: 0, sumWeekSavings: 0, predictedNet: 0, weekCurrentSnap: {}, weekCreditSnap: {}, weekSavingsSnap: {} };
  const projectedMonthEndCurrent = finalWeekPred.sumWeekCurrent;
  const projectedMonthEndCredit = finalWeekPred.sumWeekCredit;
  const projectedMonthEndSavings = finalWeekPred.sumWeekSavings;

  let projectedMonthEndNet = 0;
  cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).forEach(a => projectedMonthEndNet += (finalWeekPred.weekCurrentSnap[a] || 0));
  if (cfg.track_savings) {
    cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).forEach(s => projectedMonthEndNet += (finalWeekPred.weekSavingsSnap[s] || 0));
  }
  cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).forEach(c => projectedMonthEndNet -= (finalWeekPred.weekCreditSnap[c.name] || 0));

  const totalOutgoings = totalDD + totalWeeklySpend;
  const weeklyAvg = schedule.numWeeks > 0 ? totalWeeklySpend / schedule.numWeeks : 0;

  const totalAutoPayMonth = cfg.credit_accounts.reduce((sum, c) => {
    if (c.autopay_enabled) {
      const debt = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
      return sum + (c.autopay_type === 'full' ? debt : Math.min(debt, Number(c.autopay_fixed_amt) || 0));
    }
    return sum;
  }, 0);

  let latestVariance = null;
  for (let i = weeklyPredictions.length - 1; i >= 0; i--) {
    if (weeklyPredictions[i].variance !== null) {
      latestVariance = weeklyPredictions[i].variance;
      break;
    }
  }

  const enabledWidgets = cfg.enabled_widgets || ["current_projected", "credit_projected", "savings_projected", "net_position", "total_outgoings"];
  const numInNet = cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).length +
                   (cfg.track_savings ? cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).length : 0) +
                   cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).length;

  const widgetHTMLMap = {
    current_projected: `
      <div class="kpi-card">
        <div class="kpi-title">🏦 Current Accounts (Month-End)</div>
        <div class="kpi-val ${projectedMonthEndCurrent >= 0 ? 'green' : 'red'}">${curr}${projectedMonthEndCurrent.toFixed(2)}</div>
        <div class="kpi-sub">Start: ${curr}${totalCurrentOpening.toFixed(2)} • In: +${curr}${totalCurrentInflow.toFixed(2)} • Out: -${curr}${(totalDD + totalWeeklyCurrentSpend + totalAutoPayMonth).toFixed(2)}</div>
      </div>
    `,
    current_opening: `
      <div class="kpi-card">
        <div class="kpi-title">🏦 Current Starting Balance</div>
        <div class="kpi-val">${curr}${totalCurrentOpening.toFixed(2)}</div>
        <div class="kpi-sub">+${curr}${totalCurrentInflow.toFixed(2)} Inflows</div>
      </div>
    `,
    credit_projected: `
      <div class="kpi-card">
        <div class="kpi-title">💳 Credit Cards (Month-End Debt)</div>
        <div class="kpi-val ${projectedMonthEndCredit > 0 ? 'red' : 'green'}">-${curr}${projectedMonthEndCredit.toFixed(2)}</div>
        <div class="kpi-sub">Avail: ${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(2)} / ${curr}${totalCreditLimit.toFixed(2)}</div>
      </div>
    `,
    credit_avail: `
      <div class="kpi-card">
        <div class="kpi-title">💳 Available Credit Line</div>
        <div class="kpi-val green">${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(2)}</div>
        <div class="kpi-sub">Total Line across ${cfg.credit_accounts.length} Cards</div>
      </div>
    `,
    savings_projected: `
      <div class="kpi-card">
        <div class="kpi-title">📈 Savings Portfolio (Month-End)</div>
        <div class="kpi-val purple">${curr}${projectedMonthEndSavings.toFixed(2)}</div>
        <div class="kpi-sub">Net Growth: +${curr}${(projectedMonthEndSavings - totalSavingsOpening).toFixed(2)} (${cfg.savings_accounts.length} Accounts)</div>
      </div>
    `,
    savings_growth: `
      <div class="kpi-card">
        <div class="kpi-title">📈 Savings Net Growth</div>
        <div class="kpi-val purple">+${curr}${(projectedMonthEndSavings - totalSavingsOpening).toFixed(2)}</div>
        <div class="kpi-sub">Transfers & automated deposits (${activeTab})</div>
      </div>
    `,
    net_position: `
      <div class="kpi-card">
        <div class="kpi-title">💎 Net Position (Month-End)</div>
        <div class="kpi-val ${projectedMonthEndNet >= 0 ? 'green' : 'red'}">${curr}${projectedMonthEndNet.toFixed(2)}</div>
        <div class="kpi-sub">${numInNet} Accounts in Net (${activeTab})</div>
      </div>
    `,
    total_outgoings: `
      <div class="kpi-card">
        <div class="kpi-title">📉 Total Month Outgoings</div>
        <div class="kpi-val">${curr}${totalOutgoings.toFixed(2)}</div>
        <div class="kpi-sub">Direct Debits: ${curr}${totalDD.toFixed(2)} • Weekly: ${curr}${totalWeeklySpend.toFixed(2)}</div>
      </div>
    `,
    weekly_avg: `
      <div class="kpi-card">
        <div class="kpi-title">📅 Weekly Expense Average</div>
        <div class="kpi-val">${curr}${weeklyAvg.toFixed(2)}</div>
        <div class="kpi-sub">Spread across ${schedule.numWeeks} Weeks</div>
      </div>
    `,
    actual_variance: `
      <div class="kpi-card">
        <div class="kpi-title">🎯 Latest Actual Variance</div>
        <div class="kpi-val ${latestVariance === null ? '' : (latestVariance >= 0 ? 'green' : 'red')}">
          ${latestVariance === null ? '-' : (latestVariance >= 0 ? '+' : '') + curr + latestVariance.toFixed(2)}
        </div>
        <div class="kpi-sub">${latestVariance === null ? 'No actuals entered' : (latestVariance >= 0 ? 'Surplus (Under Budget)' : 'Overspent vs Plan')}</div>
      </div>
    `
  };

  let html = `<div class="kpi-grid">${enabledWidgets.map(wId => widgetHTMLMap[wId] || '').join('')}</div>`;

  // Summary Cashflow boxes
  html += `
    <div class="summary-breakdown-grid">
      <div class="summary-breakdown-card">
        <h4 style="color:var(--curr-border);">🏦 Current Accounts Cashflow</h4>
        <div class="summary-breakdown-list">
          <div class="summary-breakdown-row"><span>Opening Balances:</span><strong>${curr}${totalCurrentOpening.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--green);"><span>Salary / Deductions Inflow:</span><strong>+${curr}${totalCurrentInflow.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--red);"><span>Direct Debits:</span><strong>-${curr}${totalDD.toFixed(2)}</strong></div>
          ${totalAutoPayMonth > 0 ? `<div class="summary-breakdown-row" style="color:var(--amber);"><span>Credit Auto-Pay Transfers:</span><strong>-${curr}${totalAutoPayMonth.toFixed(2)}</strong></div>` : ''}
          <div class="summary-breakdown-row"><span>Weekly Current Expenses:</span><strong>-${curr}${totalWeeklyCurrentSpend.toFixed(2)}</strong></div>
          <div class="summary-breakdown-total">
            <span>Projected Month-End:</span>
            <span style="color:${projectedMonthEndCurrent >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${projectedMonthEndCurrent.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="summary-breakdown-card">
        <h4 style="color:var(--amber);">💳 Credit Cards Position</h4>
        <div class="summary-breakdown-list">
          <div class="summary-breakdown-row"><span>Opening Debt:</span><strong style="color:var(--red);">-${curr}${totalCreditOpeningSpent.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--green);"><span>Auto-Pay Settlements:</span><strong>+${curr}${totalAutoPayMonth.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--red);"><span>Planned Card Expenses:</span><strong>-${curr}${(totalWeeklySpend - totalWeeklyCurrentSpend).toFixed(2)}</strong></div>
          <div class="summary-breakdown-total">
            <span>Month-End Debt:</span>
            <span style="color:${projectedMonthEndCredit > 0 ? 'var(--red)' : 'var(--green)'};">-${curr}${projectedMonthEndCredit.toFixed(2)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); text-align:right;">Available Credit Line: ${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(2)}</div>
        </div>
      </div>

      ${cfg.track_savings ? `
        <div class="summary-breakdown-card">
          <h4 style="color:var(--purple);">📈 Savings Portfolio Growth</h4>
          <div class="summary-breakdown-list">
            <div class="summary-breakdown-row"><span>Opening Balance:</span><strong>${curr}${totalSavingsOpening.toFixed(2)}</strong></div>
            <div class="summary-breakdown-row" style="color:var(--purple);"><span>Salary Savings Inflow:</span><strong>+${curr}${totalSalarySavingsIn.toFixed(2)}</strong></div>
            <div class="summary-breakdown-row" style="color:var(--purple);"><span>Direct Debit Standing Orders:</span><strong>+${curr}${Object.values(autoSavingsFromDD).reduce((s, v) => s + v, 0).toFixed(2)}</strong></div>
            <div class="summary-breakdown-total">
              <span>Projected Portfolio:</span>
              <span style="color:var(--purple);">${curr}${projectedMonthEndSavings.toFixed(2)}</span>
            </div>
            <div style="font-size:11px; color:var(--green); text-align:right; font-weight:bold;">Net Growth: +${curr}${(projectedMonthEndSavings - totalSavingsOpening).toFixed(2)}</div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // WEEKS BREAKDOWN
  const now = new Date();
  const detected = detectCurrentMonthAndWeek(currentYear);
  const isViewingCurrentMonth = (now.getFullYear() === currentYear && detected.month === activeTab);

  html += `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0;">📅 Weekly Cashflow & Discretionary Expenses</h3>
          <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Period: ${schedule.dateRangeStr} • ${schedule.numWeeks} Weeks${cfg.pay_frequency && cfg.pay_frequency !== 'monthly' ? ` • ${cfg.pay_frequency === 'biweekly' ? '🔄 Bi-Weekly Pay' : (cfg.pay_frequency === 'weekly' ? '⚡ Weekly Pay' : (cfg.pay_frequency === 'four_weekly' ? '🏥 4-Weekly Pay' : '🗓️ Semi-Monthly Pay'))}` : ''}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn secondary" style="font-size:12px; padding:5px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="window.budgetApp.setTab('Bills')" title="Manage all scheduled direct debits, standing orders & recurring bills"><span style="font-size:13px;">📅</span> Scheduled Bills</button>
          <button class="btn secondary" style="font-size:12px; padding:5px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="window.budgetApp.openAccountTrackingModal()" title="Configure Baseline Balances, Weekly Column Tracking & Net Position"><span style="font-size:13px;">⚙️</span> Accounts & Tracking</button>
        </div>
      </div>

      <div class="weeks-container">
        ${schedule.weeks.map((wObj, wIdx) => {
          const w = wObj.name;
          const p = weeklyPredictions[wIdx];
          const isFinalWeek = (wIdx === schedule.weeks.length - 1);
          const items = getWeekItems(activeTab, w);
          const actuals = getWeekActuals(activeTab, w);
          const activeUser = appState.activeUser || 'Joint';

          const wEndDateInclusive = new Date(wObj.endDate.getFullYear(), wObj.endDate.getMonth(), wObj.endDate.getDate(), 23, 59, 59);
          const isPast = isViewingCurrentMonth && (now.getTime() > wEndDateInclusive.getTime());
          const isCurrent = isViewingCurrentMonth && (wObj.name === detected.week || (now.getTime() >= wObj.startDate.getTime() && now.getTime() <= wEndDateInclusive.getTime()));

          const columns = [];
          cfg.current_accounts.forEach(acc => {
            const trkWeekly = isAccountTrackedWeekly('current', acc);
            const owner = getAccountOwner('current', acc);
            const matchesFilter = isAccountVisibleToActiveUser('current', acc);
            if ((trkWeekly || isFinalWeek) && matchesFilter) {
              columns.push({
                type: 'current',
                name: acc,
                label: `🏦 ${acc}`,
                owner: owner,
                isMonthlyOnly: !trkWeekly && isFinalWeek
              });
            }
          });

          cfg.credit_accounts.forEach(c => {
            const trkWeekly = isAccountTrackedWeekly('credit', c.name);
            const owner = getAccountOwner('credit', c.name);
            const matchesFilter = isAccountVisibleToActiveUser('credit', c.name);
            if ((trkWeekly || isFinalWeek) && matchesFilter) {
              columns.push({
                type: 'credit',
                name: c.name,
                label: `💳 ${c.name}`,
                limit: c.limit,
                owner: owner,
                isMonthlyOnly: !trkWeekly && isFinalWeek
              });
            }
          });

          if (cfg.track_savings) {
            cfg.savings_accounts.forEach(s => {
              const trkWeekly = isAccountTrackedWeekly('savings', s);
              const owner = getAccountOwner('savings', s);
              const matchesFilter = isAccountVisibleToActiveUser('savings', s);
              if ((trkWeekly || isFinalWeek) && matchesFilter) {
                columns.push({
                  type: 'savings',
                  name: s,
                  label: `📈 ${s}`,
                  owner: owner,
                  isMonthlyOnly: !trkWeekly && isFinalWeek
                });
              }
            });
          }

          return `
            <div id="week-card-${wIdx}" class="week-card ${isCurrent ? 'current-week' : ''} ${isPast ? 'past-week' : ''}">
              <div class="week-header">
                <div>
                  <strong style="font-size:14px; color:var(--heading);">${wObj.label}</strong>
                  ${isCurrent ? '<span class="badge" style="background:#0284c7; color:#fff; margin-left:6px;">Current Week</span>' : ''}
                </div>
                <div style="font-size:12px; color:var(--text-muted);">
                  Expenses: <strong style="color:var(--heading);">${curr}${p.wSpend.toFixed(2)}</strong>
                  ${p.wIncomeSum > 0 ? ` • Income: <strong style="color:var(--green);">+${curr}${p.wIncomeSum.toFixed(2)}</strong>` : ''}
                </div>
              </div>

              ${(typeof getBirthdayOccasionsForWeek === 'function' && getBirthdayOccasionsForWeek(getYearData().birthdays || cfg.birthdays, wObj, schedule, currentYear).length > 0) ? `
                <div style="display:flex; flex-direction:column; gap:6px; margin:6px 0 10px 0;">
                  ${getBirthdayOccasionsForWeek(getYearData().birthdays || cfg.birthdays, wObj, schedule, currentYear).map((b) => `
                    <div style="background:rgba(236, 72, 153, 0.12); border:1px solid rgba(236, 72, 153, 0.35); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:16px;">🎂</span>
                        <strong style="color:#f472b6; font-size:12px;">${b.name} (${b.actualDateStr})</strong>
                        <span style="font-size:11px; color:var(--text-muted);">
                          Budget: <strong>${curr}${b.budgetTotal.toFixed(2)}</strong> &bull; 
                          Spent: <strong>${curr}${b.spentTotal.toFixed(2)}</strong> &bull; 
                          <span style="color:${b.remaining >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:600;">
                            ${b.remaining >= 0 ? `Remaining: ${curr}${b.remaining.toFixed(2)}` : `Overspent by ${curr}${Math.abs(b.remaining).toFixed(2)}`}
                          </span>
                        </span>
                      </div>
                      <button class="btn secondary" style="font-size:10px; padding:2px 8px; border-color:#ec4899; color:#f472b6;" onclick="window.budgetApp.openAddBirthdaySpendModal(${b.originalIdx})">+ Log Gift Spend</button>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${columns.length === 0 ? `
                <div style="padding:16px; text-align:center; color:var(--text-muted); font-style:italic;">No accounts enabled for weekly tracking. Click "⚙️ Accounts & Tracking" to enable weekly columns.</div>
              ` : `
                <div class="week-columns-grid">
                  ${columns.map(col => {
                    const colDDs = (col.type === 'current') 
                      ? p.wDDs.filter(d => (d.account || cfg.current_accounts[0]) === col.name) 
                      : (col.type === 'credit' 
                          ? p.wDDs.filter(d => d.account === col.name) 
                          : p.wDDs.filter(d => d.account === col.name));
                    const colIncomes = (col.type === 'current')
                      ? (p.wIncomes || []).filter(i => (i.account || cfg.current_accounts[0]) === col.name)
                      : (col.type === 'credit'
                          ? (p.wIncomes || []).filter(i => i.account === col.name)
                          : (p.wIncomes || []).filter(i => i.account === col.name));
                    const colSavingsIn = (col.type === 'savings') ? p.wDDs.filter(d => d.transfer_to === col.name) : [];
                    const colAutoPaysOut = (col.type === 'current') ? p.autopaysDue.filter(a => a.from === col.name) : [];
                    const colAutoPaysIn = (col.type === 'credit') ? p.autopaysDue.filter(a => a.card === col.name) : [];

                    const hasScheduled = colDDs.length > 0 || colIncomes.length > 0 || colSavingsIn.length > 0 || colAutoPaysOut.length > 0 || colAutoPaysIn.length > 0;
                    const inNet = isAccountIncludedInNet(col.type, col.name);

                    const colItemsWithIdx = [];
                    items.forEach((it, idx) => {
                      if (it.account_type === col.type && it.account_name === col.name) {
                        colItemsWithIdx.push({ item: it, idx });
                      } else if (!it.account_type && col.type === 'current' && col.name === cfg.current_accounts[0] && it.desc && it.desc.toLowerCase().includes('cash')) {
                        colItemsWithIdx.push({ item: it, idx });
                      } else if (!it.account_type && col.type === 'credit' && col.name === cfg.credit_accounts[0]?.name && (!it.desc || !it.desc.toLowerCase().includes('cash'))) {
                        colItemsWithIdx.push({ item: it, idx });
                      }
                    });

                    let colDiscretionaryNet = 0;
                    colItemsWithIdx.forEach(e => {
                      const amt = Number(e.item.amount) || 0;
                      colDiscretionaryNet = e.item.is_income ? colDiscretionaryNet + amt : colDiscretionaryNet - amt;
                    });

                    let colScheduledNet = 0;
                    if (col.type === 'current') {
                      colDDs.forEach(d => colScheduledNet -= (Number(d.amount) || 0));
                      colIncomes.forEach(i => colScheduledNet += (Number(i.amount) || 0));
                      colAutoPaysOut.forEach(a => colScheduledNet -= (Number(a.amount) || 0));
                    } else if (col.type === 'credit') {
                      colDDs.forEach(d => colScheduledNet -= (Number(d.amount) || 0));
                      colIncomes.forEach(i => colScheduledNet += (Number(i.amount) || 0));
                      colAutoPaysIn.forEach(a => colScheduledNet += (Number(a.amount) || 0));
                    } else if (col.type === 'savings') {
                      colSavingsIn.forEach(d => colScheduledNet += (Number(d.amount) || 0));
                      colIncomes.forEach(i => colScheduledNet += (Number(i.amount) || 0));
                      colDDs.forEach(d => colScheduledNet -= (Number(d.amount) || 0));
                    }

                    const colTotalNet = colDiscretionaryNet + colScheduledNet;

                    return `
                      <div class="week-column" 
                           ondragover="window.budgetApp.handleDragOver(event, this)" 
                           ondragleave="window.budgetApp.handleDragLeave(event, this)" 
                           ondrop="window.budgetApp.handleDrop(event, '${w}', '${col.type}', '${col.name}', this)">
                        
                        <div>
                          <div class="week-column-header">
                            <span style="color:${col.type === 'current' ? 'var(--curr-border)' : (col.type === 'credit' ? 'var(--amber)' : 'var(--purple)')};">
                              ${col.label} ${col.isMonthlyOnly ? '<span style="font-size:9px; color:var(--text-muted); font-weight:normal;">(Monthly)</span>' : ''}
                              ${isMulti && col.owner ? `<span class="badge" style="font-size:9px; background:rgba(255,255,255,0.08); color:var(--text-muted); margin-left:3px;">${col.owner === 'Joint' ? '👥 Joint' : '👤 ' + col.owner}</span>` : ''}
                            </span>
                            <div style="text-align:right;">
                              <span style="color:${colTotalNet >= 0 ? 'var(--green)' : 'var(--text)'}; font-size:12px; font-weight:600;">
                                ${colTotalNet >= 0 ? '+' : ''}${curr}${colTotalNet.toFixed(2)}
                              </span>
                              ${hasScheduled ? `
                                <div style="font-size:9px; color:var(--text-muted);">
                                  Expenses: ${colDiscretionaryNet >= 0 ? '+' : ''}${curr}${colDiscretionaryNet.toFixed(2)} | Scheduled: ${colScheduledNet >= 0 ? '+' : ''}${curr}${colScheduledNet.toFixed(2)}
                                </div>
                              ` : ''}
                            </div>
                          </div>

                          ${hasScheduled ? `
                            <div class="col-scheduled-section">
                              <div style="font-size:10px; font-weight:bold; color:var(--curr-border); text-transform:uppercase; margin-bottom:3px;">📅 Scheduled Items:</div>
                              ${colIncomes.map((i, iIdx) => {
                                const holidayBadge = i.holiday_rule === 'previous' ? '<span title="Previous working day (e.g. Friday)" style="font-size:9px; opacity:0.8;">⬅️</span>' : (i.holiday_rule === 'following' ? '<span title="Following working day (e.g. Monday)" style="font-size:9px; opacity:0.8;">➡️</span>' : '<span title="Exact date" style="font-size:9px; opacity:0.8;">⏸️</span>');
                                const occDateStr = i.actualPaymentDate ? new Date(i.actualPaymentDate).toISOString().slice(0, 10) : '';
                                const isCleared = Boolean(i.auto_cleared || i.status === 'paid' || (i.cleared_dates && occDateStr && i.cleared_dates.includes(occDateStr)));
                                const pDate = i.actualPaymentDate ? new Date(i.actualPaymentDate) : null;
                                const isPastDate = pDate ? (pDate.getTime() <= new Date().setHours(23,59,59,999)) : false;
                                const cleanDesc = (i.rawDesc || i.desc || '').replace(/'/g, "\\'");
                                const sType = i.source_type || 'monthly_payment_in';
                                const sIdx = i.source_idx !== undefined ? i.source_idx : iIdx;
                                const statusBadge = isOpenBankingEnabled ? `<button type="button" class="badge" style="font-size:9px; background:${isCleared ? 'rgba(16,185,129,0.25)' : (isPastDate ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)')}; color:${isCleared ? 'var(--green)' : (isPastDate ? 'var(--amber)' : 'var(--text-muted)')}; border:1px solid ${isCleared ? 'rgba(16,185,129,0.4)' : (isPastDate ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.15)')}; padding:1px 5px; margin-left:3px; cursor:pointer;" onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${i.amount || 0}, '${occDateStr}')" title="${isCleared ? 'Cleared' + (i.matched_payee ? ' (' + i.matched_payee + ')' : '') + '. Click to mark Due' : 'Due. Click to mark Cleared'}">${isCleared ? '✓ Cleared' : (isPastDate ? '⚠️ Due' : '⏳ Upcoming')}</button>${globalEditMode ? `<button type="button" class="btn secondary" style="height:17px; width:17px; font-size:8.5px; padding:0; display:inline-flex; align-items:center; justify-content:center; margin-left:2px;" onclick="event.stopPropagation(); window.budgetApp.openManualBillMatchModal('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${i.amount || 0}, '${occDateStr}')" title="Match with Bank Transaction">🔗</button>` : ''}` : '';
                                if (i.isMovable) {
                                  if (!globalEditMode) {
                                    return `<div class="col-scheduled-item recurring" style="cursor:pointer; background:rgba(16,185,129,0.08); border-left:3px solid var(--green);" onclick="window.budgetApp.openRescheduleRecurringModal(${i.source_idx}, '${activeTab}', '${w}', 'income')" title="Click to reschedule or bump forward"><span>📥 ${i.rawDesc || i.desc} (${i.actualDateStr}) ${holidayBadge} ${statusBadge} <span class="badge" style="font-size:9px; background:rgba(16,185,129,0.2); color:var(--green); padding:1px 4px; margin-left:4px;">↔ Move</span></span><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span></div>`;
                                  } else {
                                    return `<div class="col-scheduled-item recurring item-entry-sched" style="background:rgba(16,185,129,0.08); border-left:3px solid var(--green);" draggable="true" ondragstart="window.budgetApp.handleDragStartScheduled(event, ${i.source_idx}, '${activeTab}', '${w}', 'income')" ondragend="window.budgetApp.handleDragEnd(event)"><span><span class="drag-handle" title="Drag to move/bump to another week or account">⠿</span> 📥 ${i.rawDesc || i.desc} (${i.actualDateStr}) ${holidayBadge} ${statusBadge}</span><div style="display:flex; align-items:center; gap:4px;"><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span><button class="move-btn" style="height:18px; width:18px; font-size:9px; padding:0; display:inline-flex; align-items:center; justify-content:center;" title="Reschedule / Bump Forward" onclick="event.stopPropagation(); window.budgetApp.openRescheduleRecurringModal(${i.source_idx}, '${activeTab}', '${w}', 'income')">↔</button></div></div>`;
                                  }
                                } else {
                                  return `<div class="col-scheduled-item" style="background:rgba(16,185,129,0.08); border-left:3px solid var(--green);"><span>📥 ${i.desc} (${i.actualDateStr}) ${holidayBadge} ${statusBadge}</span><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span></div>`;
                                }
                              }).join('')}
                              ${colDDs.map((d, dIdx) => {
                                const occDateStr = d.actualPaymentDate ? new Date(d.actualPaymentDate).toISOString().slice(0, 10) : '';
                                const isCleared = Boolean(d.auto_cleared || d.status === 'paid' || (d.cleared_dates && occDateStr && d.cleared_dates.includes(occDateStr)));
                                const pDate = d.actualPaymentDate ? new Date(d.actualPaymentDate) : null;
                                const isPastDate = pDate ? (pDate.getTime() <= new Date().setHours(23,59,59,999)) : false;
                                const cleanDesc = (d.rawDesc || d.desc || '').replace(/'/g, "\\'");
                                const sType = d.source_type || 'direct_debit';
                                const sIdx = d.source_idx !== undefined ? d.source_idx : dIdx;
                                const statusBadge = isOpenBankingEnabled ? `<button type="button" class="badge" style="font-size:9px; background:${isCleared ? 'rgba(16,185,129,0.25)' : (isPastDate ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)')}; color:${isCleared ? 'var(--green)' : (isPastDate ? 'var(--amber)' : 'var(--text-muted)')}; border:1px solid ${isCleared ? 'rgba(16,185,129,0.4)' : (isPastDate ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.15)')}; padding:1px 5px; margin-left:3px; cursor:pointer;" onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${d.amount || 0}, '${occDateStr}')" title="${isCleared ? 'Cleared' + (d.matched_payee ? ' (' + d.matched_payee + ')' : '') + '. Click to mark Due' : 'Due. Click to mark Cleared'}">${isCleared ? '✓ Cleared' : (isPastDate ? '⚠️ Due' : '⏳ Upcoming')}</button>${globalEditMode ? `<button type="button" class="btn secondary" style="height:17px; width:17px; font-size:8.5px; padding:0; display:inline-flex; align-items:center; justify-content:center; margin-left:2px;" onclick="event.stopPropagation(); window.budgetApp.openManualBillMatchModal('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${d.amount || 0}, '${occDateStr}')" title="Match with Bank Transaction">🔗</button>` : ''}` : '';
                                if (d.isMovable) {
                                  if (!globalEditMode) {
                                    return `<div class="col-scheduled-item recurring" style="cursor:pointer;" onclick="window.budgetApp.openRescheduleRecurringModal(${d.source_idx}, '${activeTab}', '${w}')" title="Click to reschedule or bump forward"><span>${d.desc} (${d.actualDateStr}) ${statusBadge} <span class="badge" style="font-size:9px; background:rgba(56,189,248,0.2); color:var(--curr-border); padding:1px 4px; margin-left:4px;">↔ Move</span></span><span style="color:var(--red); font-weight:600;">-${curr}${Number(d.amount).toFixed(2)}</span></div>`;
                                  } else {
                                    return `<div class="col-scheduled-item recurring item-entry-sched" draggable="true" ondragstart="window.budgetApp.handleDragStartScheduled(event, ${d.source_idx}, '${activeTab}', '${w}')" ondragend="window.budgetApp.handleDragEnd(event)"><span><span class="drag-handle" title="Drag to move/bump to another week or account">⠿</span> ${d.desc} (${d.actualDateStr}) ${statusBadge}</span><div style="display:flex; align-items:center; gap:4px;"><span style="color:var(--red); font-weight:600;">-${curr}${Number(d.amount).toFixed(2)}</span><button class="move-btn" style="height:18px; width:18px; font-size:9px; padding:0; display:inline-flex; align-items:center; justify-content:center;" title="Reschedule / Bump Forward" onclick="event.stopPropagation(); window.budgetApp.openRescheduleRecurringModal(${d.source_idx}, '${activeTab}', '${w}')">↔</button></div></div>`;
                                  }
                                } else {
                                  return `<div class="col-scheduled-item"><span>${d.desc} (${d.actualDateStr}) ${statusBadge}</span><span style="color:var(--red);">-${curr}${Number(d.amount).toFixed(2)}</span></div>`;
                                }
                              }).join('')}
                              ${colSavingsIn.map(d => `<div class="col-scheduled-item transfer"><span>➔ Transfer from ${d.desc}</span><span style="color:var(--purple); font-weight:bold;">+${curr}${Number(d.amount).toFixed(2)}</span></div>`).join('')}
                              ${colAutoPaysOut.map(a => `<div class="col-scheduled-item autopay-out"><span>💳 Auto-Pay to ${a.card}</span><span style="color:var(--red);">-${curr}${Number(a.amount).toFixed(2)}</span></div>`).join('')}
                              ${colAutoPaysIn.map(a => `<div class="col-scheduled-item autopay-in"><span>✓ Auto-Pay payment</span><span style="color:var(--green);">+${curr}${Number(a.amount).toFixed(2)}</span></div>`).join('')}
                            </div>
                          ` : ''}

                          <div class="item-list">
                            ${col.isMonthlyOnly && colItemsWithIdx.length === 0 ? `
                              <div style="font-size:11px; color:var(--text-muted); padding:4px 0; font-style:italic;">Monthly account (reconciliation)</div>
                            ` : colItemsWithIdx.length === 0 ? `
                              <div style="font-size:11px; color:var(--text-muted); padding:4px 0; font-style:italic;">No entries</div>
                            ` : colItemsWithIdx.map(entry => {
                              if (!globalEditMode) {
                                return `
                                  <div class="item-view-row ${entry.item.is_income ? 'income' : 'expense'}">
                                    <span class="item-view-desc">${entry.item.desc || 'Item'}</span>
                                    <span class="item-view-amt">${entry.item.is_income ? '+' : ''}${curr}${Number(entry.item.amount || 0).toFixed(2)}</span>
                                  </div>
                                `;
                              } else {
                                return `
                                  <div class="item-entry" draggable="true" ondragstart="window.budgetApp.handleDragStart(event, '${activeTab}', '${w}', ${entry.idx})" ondragend="window.budgetApp.handleDragEnd(event)">
                                    <span class="drag-handle" title="Drag to any week or column">⠿</span>
                                    <select onchange="window.budgetApp.editWeekItemType('${w}', ${entry.idx}, this.value)" style="padding:2px; font-size:11px; color:${entry.item.is_income ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">
                                      <option value="expense" ${!entry.item.is_income ? 'selected' : ''}>- Expense</option>
                                      <option value="income" ${entry.item.is_income ? 'selected' : ''}>+ Income</option>
                                    </select>
                                    <input type="text" value="${entry.item.desc}" onchange="window.budgetApp.editWeekItem('${w}', ${entry.idx}, 'desc', this.value)">
                                    <input type="number" step="0.01" value="${entry.item.amount}" onchange="window.budgetApp.editWeekItem('${w}', ${entry.idx}, 'amount', this.value)" style="text-align:right;">
                                    <button class="move-btn" title="Move item to another month or week" onclick="window.budgetApp.openMoveItemModal('${activeTab}', '${w}', ${entry.idx})">↔</button>
                                    <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteWeekItem('${w}', ${entry.idx})">&times;</button>
                                  </div>
                                `;
                              }
                            }).join('')}
                          </div>

                          ${globalEditMode && !col.isMonthlyOnly ? `
                            <div class="col-input-add">
                              <select id="type-${w}-${col.name}">
                                <option value="expense">- Expense</option>
                                <option value="income">+ Income</option>
                              </select>
                              <input type="text" id="desc-${w}-${col.name}" placeholder="Description...">
                              <input type="number" step="0.01" id="amt-${w}-${col.name}" placeholder="${curr}">
                              <button class="btn green" onclick="window.budgetApp.addWeekItemToColumn('${w}', '${col.type}', '${col.name}')">+</button>
                            </div>
                          ` : ''}
                        </div>

                        <div class="col-footer-box">
                          <div class="col-pred-box">
                            ${col.type === 'current' ? `
                              <span>Predicted Balance:</span>
                              <strong style="color:${(p.weekCurrentSnap[col.name] || 0) >= 0 ? 'var(--heading)' : 'var(--red)'};">${curr}${(p.weekCurrentSnap[col.name] || 0).toFixed(2)}</strong>
                            ` : col.type === 'credit' ? `
                              <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                                <span>Debt: <strong style="color:${(p.weekCreditSnap[col.name] || 0) > 0 ? 'var(--red)' : 'var(--green)'};">-${curr}${(p.weekCreditSnap[col.name] || 0).toFixed(2)}</strong></span>
                                <span style="color:var(--text-muted); font-size:10px;">Available: <strong style="color:var(--green);">${curr}${(Number(col.limit || 0) - (p.weekCreditSnap[col.name] || 0)).toFixed(2)}</strong></span>
                              </div>
                            ` : `
                              <span>Predicted Balance:</span>
                              <strong style="color:var(--purple);">${curr}${(p.weekSavingsSnap[col.name] || 0).toFixed(2)}</strong>
                            `}
                          </div>

                          <div class="col-actual-box">
                            <label>
                              <span>${col.type === 'credit' ? 'Actual Available Credit' : 'Actual Balance'}</span>
                              ${!inNet ? '<span style="font-size:9px; color:var(--text-muted);">(Excl. Net)</span>' : ''}
                            </label>
                            ${(() => {
                              const fieldKey = col.type === 'current' ? `curr_${col.name}` : (col.type === 'credit' ? `c_avail_${col.name}` : `sav_${col.name}`);
                              const val = actuals[fieldKey];
                              const hasVal = (val !== undefined && val !== "" && val !== null);
                              const ts = actuals._timestamps && actuals._timestamps[fieldKey];
                              const source = actuals._sources && actuals._sources[fieldKey];
                              const isAuto = source === 'open_banking';
                              const tsHtml = (hasVal && ts) ? `
                                <div style="font-size:9px; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:3px;">
                                  ${isAuto ? '<span style="color:#10b981; font-weight:700;">⚡ Live Sync</span> • ' : '<span>🕒</span>'}<span>${formatCheckInTimestamp(ts)}</span>
                                </div>
                              ` : '';

                              if (col.type === 'current') {
                                return `
                                  ${globalEditMode ? `
                                    <input type="number" step="0.01" placeholder="${curr}" value="${hasVal ? val : ''}" onchange="window.budgetApp.updateActualField('${w}', '${fieldKey}', this.value)">
                                  ` : `
                                    <div class="actual-field-view">${hasVal ? curr + Number(val).toFixed(2) : '<span style="color:var(--text-muted);">-</span>'}</div>
                                  `}
                                  ${tsHtml}
                                `;
                              } else if (col.type === 'credit') {
                                return `
                                  ${globalEditMode ? `
                                    <input type="number" step="0.01" placeholder="${curr}" value="${hasVal ? val : ''}" onchange="window.budgetApp.updateActualField('${w}', '${fieldKey}', this.value)">
                                  ` : `
                                    <div class="actual-field-view">${hasVal ? curr + Number(val).toFixed(2) : '<span style="color:var(--text-muted);">-</span>'}</div>
                                  `}
                                  ${tsHtml}
                                `;
                              } else {
                                const predVal = p.weekSavingsSnap[col.name] || 0;
                                const actVal = Number(val) || 0;
                                const diffVal = actVal - predVal;
                                const pctVal = predVal > 0 ? ((diffVal / predVal) * 100) : 0;
                                return `
                                  ${globalEditMode ? `
                                    <input type="number" step="0.01" placeholder="${curr}" value="${hasVal ? val : ''}" onchange="window.budgetApp.updateActualField('${w}', '${fieldKey}', this.value)">
                                  ` : `
                                    <div class="actual-field-view">${hasVal ? curr + Number(val).toFixed(2) : '<span style="color:var(--text-muted);">-</span>'}</div>
                                    ${hasVal ? `
                                      <div style="font-size:10px; margin-top:2px; font-weight:600; color:${diffVal >= 0 ? 'var(--green)' : 'var(--red)'};">
                                        Growth: ${diffVal >= 0 ? '+' : ''}${curr}${diffVal.toFixed(2)} (${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%)
                                      </div>
                                    ` : ''}
                                  `}
                                  ${tsHtml}
                                `;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}

              ${(() => {
                if (!isOpenBankingEnabled) return '';
                const txns = (appState.data && appState.data.open_banking_transactions) || [];
                if (!txns || txns.length === 0) return '';
                const wStart = wObj.startDate.getTime();
                const wEnd = new Date(wObj.endDate.getFullYear(), wObj.endDate.getMonth(), wObj.endDate.getDate(), 23, 59, 59).getTime();
                const weekTxns = txns.filter(t => {
                  if (!t.booking_date) return false;
                  const tTime = new Date(t.booking_date + (t.booking_date.includes('T') ? '' : 'T12:00:00')).getTime();
                  return tTime >= wStart && tTime <= wEnd;
                });
                if (weekTxns.length === 0) return '';
                const weekTotalSpent = weekTxns.reduce((acc, t) => acc + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
                return `
                  <div style="margin:8px 0 2px 0; background:rgba(0,0,0,0.12); border:1px solid var(--border); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <div style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                      <span>⚡ <strong>${weekTxns.length}</strong> Live Bank Transactions</span>
                      <span style="color:var(--heading); font-weight:600;">(${curr}${weekTotalSpent.toFixed(2)} tracked)</span>
                    </div>
                    <button class="btn secondary" style="font-size:10.5px; padding:2px 8px;" onclick="window.budgetApp.openTransactionLedgerModal(${wIdx}, '${activeTab}')">View Transactions</button>
                  </div>
                `;
              })()}

              ${(() => {
                const isDailyPacingOn = Boolean(isCurrent && cfg.open_banking?.enabled && cfg.open_banking?.live_daily_variance !== false);
                if (isDailyPacingOn) {
                  const pacing = calculateLiveDailyPacing(wObj, p, actuals, cfg);
                  return `
                    <div class="week-summary-bar" style="background:rgba(2,132,199,0.08); border-top:1px solid rgba(2,132,199,0.25); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                      <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                        <span title="Planned total outgoings for the full week">Week Outgoings: <strong style="color:var(--curr-border);">${curr}${(p.wDDTotal + p.autopaysDue.reduce((s, a) => s + a.amount, 0) + (p.wSpend - p.wIncomeSum)).toFixed(2)}</strong></span>
                        <span title="Predicted Net Cash Position for today (Day ${pacing.elapsedDays} of ${pacing.totalDays}) factoring in cleared bills and daily discretionary spending pace">
                          Predicted Net Today <span style="font-size:10px; color:var(--text-muted);">(Day ${pacing.elapsedDays}/${pacing.totalDays})</span>: 
                          <strong style="color:${pacing.pacedTargetNetToday >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${pacing.pacedTargetNetToday.toFixed(2)}</strong>
                        </span>
                        <span title="Predicted final closing Net Cash Position (Current + Savings - Credit Debt) at the end of this week">
                          Predicted Net (End of Week): <strong style="color:${p.predictedNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.predictedNet.toFixed(2)}</strong>
                        </span>
                        ${p.actualNet !== null ? `<span title="Current live actual Net Cash Position (Current + Savings - Credit Debt) from bank check-in">Live Net: <strong style="color:${p.actualNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.actualNet.toFixed(2)}</strong></span>` : ''}
                      </div>
                      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        ${pacing.liveDailyVariance !== null ? `
                          <div class="variance-badge ${pacing.liveDailyVariance >= 0 ? 'surplus' : 'overspent'}" style="display:inline-flex; align-items:center; gap:5px; padding:3px 8px; font-size:11.5px;" title="Live variance against today's day-by-day pace">
                            <span>${pacing.liveDailyVariance >= 0 ? `✨ +${curr}${pacing.liveDailyVariance.toFixed(2)}` : `⚠️ -${curr}${Math.abs(pacing.liveDailyVariance).toFixed(2)}`} Today</span>
                            <span style="font-size:9px; opacity:0.85; background:rgba(0,0,0,0.2); padding:1px 4px; border-radius:3px;">Day ${pacing.elapsedDays}/${pacing.totalDays}</span>
                          </div>
                        ` : ''}
                        ${p.variance !== null ? `
                          <div class="variance-badge ${p.variance >= 0 ? 'surplus' : 'overspent'}" style="display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:11.5px; opacity:0.9;" title="Variance of current live net balance compared against final end-of-week predicted net target">
                            <span>${p.variance >= 0 ? `+${curr}${p.variance.toFixed(2)}` : `-${curr}${Math.abs(p.variance).toFixed(2)}`} vs End-of-Week Net</span>
                          </div>
                        ` : (!pacing.liveDailyVariance ? '<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Sync bank account to calculate variance</span>' : '')}
                      </div>
                    </div>
                  `;
                }

                return `
                  <div class="week-summary-bar">
                    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                      <span>Week Outgoings: <strong style="color:var(--curr-border);">${curr}${(p.wDDTotal + p.autopaysDue.reduce((s, a) => s + a.amount, 0) + (p.wSpend - p.wIncomeSum)).toFixed(2)}</strong></span>
                      <span>Predicted Net: <strong style="color:${p.predictedNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.predictedNet.toFixed(2)}</strong></span>
                      ${p.actualNet !== null ? `<span>Actual Net: <strong style="color:${p.actualNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.actualNet.toFixed(2)}</strong></span>` : ''}
                    </div>
                    ${p.variance !== null ? `
                      <div class="variance-badge ${p.variance >= 0 ? 'surplus' : 'overspent'}">
                        ${p.variance >= 0 ? `✨ ${curr}${p.variance.toFixed(2)} Surplus (Under Budget)` : `⚠️ ${curr}${Math.abs(p.variance).toFixed(2)} Overspent`}
                      </div>
                    ` : '<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Enter actual check-in above to calculate variance</span>'}
                  </div>
                `;
              })()}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // SALARIES & DEDUCTIONS + SCHEDULED BILLS PANELS
  html += `
    <div style="display:flex; flex-direction:column; gap:16px; margin-top:4px;">
      ${isMulti ? `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
            <div>
              <h3 style="margin:0;">👥 Household Salaries & Personal Deductions</h3>
              <span style="font-size:11.5px; color:var(--text-muted);">Manage separate income and deduction items for each individual household member.</span>
            </div>
            <button class="btn secondary" style="font-size:11px; padding:2px 8px;" onclick="window.budgetApp.propagateDeductions('${activeTab}')" title="Copy this month's salaries and deductions to all following months in ${appState.currentYear}">📋 Propagate to Future Months</button>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:16px;">
            ${cfg.people.map(p => {
              const isUnlockedForUser = (appState.activeUser === p && isUserUnlocked(p));
              const isRevealed = isUnlockedForUser || (appState.unmaskedSalaries && appState.unmaskedSalaries[p]);
              const isHidden = isPersonSalaryHidden(p) && !isRevealed;
              const pTotals = personTotals[p] || { salary: 0, out: 0, leftover: 0 };

              const pItems = [];
              deducts.forEach((d, origIdx) => {
                let amt = 0;
                let belongs = false;
                if (d.person === p) {
                  amt = Number(d.amount) || 0;
                  belongs = true;
                } else if (d.amounts && typeof d.amounts[p] !== 'undefined') {
                  amt = Number(d.amounts[p]) || 0;
                  if (amt > 0 || d.is_salary || !d.person) belongs = true;
                }
                if (belongs) {
                  pItems.push({ d, origIdx, amt });
                }
              });

              return `
                <div style="background:var(--card-bg, rgba(255,255,255,0.03)); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between;">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border);">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:14px; font-weight:bold; color:var(--heading);">👤 ${p}'s Deductions</span>
                        ${isPersonSalaryHidden(p) ? `
                          <button class="btn secondary" style="padding:1px 6px; font-size:10px; min-height:20px; line-height:1;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="${isRevealed ? 'Hide salary' : 'Unlock / Reveal salary'}">
                            ${isRevealed ? '🙈' : '👁️'}
                          </button>
                        ` : ''}
                      </div>
                      <div>
                        <span style="font-size:11px; color:var(--text-muted);">Leftover: </span>
                        <strong style="color:${pTotals.leftover >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:12.5px;">
                          ${isHidden ? '••••••' : `${curr}${pTotals.leftover.toFixed(2)}`}
                        </strong>
                      </div>
                    </div>

                    <table class="table" style="font-size:11.5px; margin:0 0 10px 0;">
                      <thead>
                        <tr>
                          <th>Item / Category</th>
                          <th>Transfer To</th>
                          <th class="text-right">Amount</th>
                          ${globalEditMode ? '<th></th>' : ''}
                        </tr>
                      </thead>
                      <tbody>
                        ${pItems.length === 0 ? `
                          <tr>
                            <td colspan="${globalEditMode ? 4 : 3}" style="text-align:center; color:var(--text-muted); font-size:11px; padding:10px;">No salary or deduction items for ${p}.</td>
                          </tr>
                        ` : pItems.map(item => {
                          const d = item.d;
                          const origIdx = item.origIdx;
                          const val = item.amt;
                          const itemHidden = d.is_salary && isHidden;
                          const salInfo = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule) : null;
                          const isMultiPay = salInfo && salInfo.count > 1;
                          return `
                            <tr>
                              <td>
                                ${globalEditMode ? `
                                  <div style="display:flex; flex-direction:column; gap:2px;">
                                    <input class="table-input" type="text" value="${d.name}" onchange="window.budgetApp.editDeductionName(${origIdx}, this.value)">
                                    ${d.is_salary ? `
                                      <select class="table-input" style="font-size:9.5px; padding:1px 2px; color:var(--text-muted);" onchange="window.budgetApp.editDeductionFrequency(${origIdx}, this.value)">
                                        <option value="monthly" ${d.frequency === 'monthly' || !d.frequency ? 'selected' : ''}>📅 Monthly</option>
                                        <option value="biweekly" ${d.frequency === 'biweekly' ? 'selected' : ''}>🔄 Bi-Weekly</option>
                                        <option value="four_weekly" ${d.frequency === 'four_weekly' ? 'selected' : ''}>🏥 4-Weekly</option>
                                        <option value="weekly" ${d.frequency === 'weekly' ? 'selected' : ''}>⚡ Weekly</option>
                                        <option value="semi_monthly" ${d.frequency === 'semi_monthly' ? 'selected' : ''}>🗓️ Semi-Monthly</option>
                                      </select>
                                    ` : ''}
                                  </div>
                                ` : `
                                  <div style="display:flex; flex-direction:column; gap:1px;">
                                    <div style="display:flex; align-items:center; gap:4px;">
                                      <span>${d.is_salary ? '💰' : '📄'}</span>
                                      <strong>${d.name}</strong>
                                    </div>
                                    ${(d.is_salary && d.frequency && d.frequency !== 'monthly') ? `
                                      <span style="font-size:9.5px; color:var(--curr-border); font-weight:600;">
                                        ${d.frequency === 'biweekly' ? '🔄 Bi-Weekly' : (d.frequency === 'weekly' ? '⚡ Weekly' : (d.frequency === 'four_weekly' ? '🏥 4-Weekly' : '🗓️ Semi-Monthly'))} (${salInfo ? salInfo.count : 1}x this mo)
                                      </span>
                                    ` : ''}
                                  </div>
                                `}
                              </td>
                              <td>
                                ${globalEditMode ? `
                                  <select class="table-input" onchange="window.budgetApp.editDeductionTarget(${origIdx}, this.value)">
                                    <option value="none" ${d.target_account === 'none' ? 'selected' : ''}>None (Personal)</option>
                                    <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                                    <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                                  </select>
                                ` : (d.target_account !== 'none' ? `<span style="color:var(--curr-border); font-weight:600;">➔ ${d.target_account}</span>` : '<span style="color:var(--text-muted);">Personal</span>')}
                              </td>
                              <td class="text-right">
                                ${globalEditMode ? (
                                  itemHidden ? `
                                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:2px;">
                                      <input class="table-input text-right" type="password" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${origIdx}, '${p}', this.value)" style="letter-spacing:2px; width:65px;">
                                      <button class="btn secondary" style="padding:1px 3px; font-size:9px; min-height:18px;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="Reveal">👁️</button>
                                    </div>
                                  ` : `
                                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                      <input class="table-input text-right" type="number" step="0.01" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${origIdx}, '${p}', this.value)" style="width:70px;">
                                      ${(d.is_salary && isMultiPay) ? `<span style="font-size:9px; color:var(--text-muted);">${curr}${salInfo.total.toFixed(2)}/mo</span>` : ''}
                                    </div>
                                  `
                                ) : (
                                  itemHidden ? `
                                    <span style="font-family:monospace; letter-spacing:2px; color:var(--text-muted); cursor:pointer;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="Salary hidden (click to unlock/reveal)">••••••</span>
                                  ` : `
                                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                      <strong style="color:${d.is_salary ? 'var(--green)' : 'var(--text)'};">${curr}${Number(val).toFixed(2)}${d.is_salary && d.frequency && d.frequency !== 'monthly' ? `<span style="font-size:9.5px; font-weight:normal; color:var(--text-muted);">/paycheck</span>` : ''}</strong>
                                      ${(d.is_salary && isMultiPay) ? `<span style="font-size:9.5px; color:var(--text-muted); font-weight:600;">= ${curr}${salInfo.total.toFixed(2)} total</span>` : ''}
                                    </div>
                                  `
                                )}
                              </td>
                              ${globalEditMode ? `<td class="text-right"><button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteSalaryDeduction(${origIdx})">&times;</button></td>` : ''}
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>

                    ${globalEditMode ? `
                      <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:6px; padding:6px 8px; margin-top:6px;">
                        <div style="font-size:10.5px; font-weight:bold; color:var(--curr-border); margin-bottom:4px;">+ Add Item for ${p}</div>
                        <div style="display:grid; grid-template-columns: 1fr 100px 70px 26px; gap:4px; align-items:center;">
                          <input type="text" id="new-deduct-name-${p}" placeholder="Item (e.g. Salary, Loan)" style="font-size:11px;">
                          <select id="new-deduct-target-${p}" style="font-size:10.5px;">
                            <option value="none">None</option>
                            <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
                            <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
                          </select>
                          <input type="number" step="0.01" id="new-deduct-amt-${p}" placeholder="${curr}" style="font-size:11px; text-align:right;">
                          <button class="btn green" style="padding:0; height:24px; justify-content:center;" onclick="window.budgetApp.addSalaryDeductionForPerson('${p}')">+</button>
                        </div>
                        <div style="margin-top:3px;">
                          <label style="font-size:10px; cursor:pointer; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                            <input type="checkbox" id="new-deduct-issalary-${p}"> Is Salary / Income
                          </label>
                        </div>
                      </div>
                    ` : ''}
                  </div>

                  <div style="background:rgba(0,0,0,0.18); border-radius:6px; padding:6px 8px; margin-top:10px; font-size:11px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                    <div>
                      <span style="color:var(--text-muted);">Salary: </span>
                      <strong style="color:var(--green);">${isHidden ? '••••••' : `${curr}${pTotals.salary.toFixed(2)}`}</strong>
                      <span style="color:var(--text-muted); margin-left:6px;">Deductions: </span>
                      <strong>${curr}${pTotals.out.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style="color:var(--text-muted);">Leftover: </span>
                      <strong style="color:${pTotals.leftover >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:12px;">
                        ${isHidden ? '••••••' : `${curr}${pTotals.leftover.toFixed(2)}`}
                      </strong>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <h3 style="margin:0;">Salaries & Deductions</h3>
            <button class="btn secondary" style="font-size:11px; padding:2px 8px;" onclick="window.budgetApp.propagateDeductions('${activeTab}')" title="Copy this month's salaries and deductions to all following months in ${appState.currentYear}">📋 Propagate to Future Months</button>
          <div class="table-responsive">
            <table class="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Transfer Destination</th>
                ${cfg.people.map(p => `
                  <th class="text-right"><span>${p}</span></th>
                `).join('')}
                ${globalEditMode ? '<th></th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${deducts.map((d, idx) => `
                <tr>
                  <td>
                    ${globalEditMode ? `
                      <div style="display:flex; flex-direction:column; gap:2px;">
                        <input class="table-input" type="text" value="${d.name}" onchange="window.budgetApp.editDeductionName(${idx}, this.value)">
                        ${d.is_salary ? `
                          <select class="table-input" style="font-size:9.5px; padding:1px 2px; color:var(--text-muted);" onchange="window.budgetApp.editDeductionFrequency(${idx}, this.value)">
                            <option value="monthly" ${d.frequency === 'monthly' || !d.frequency ? 'selected' : ''}>📅 Monthly</option>
                            <option value="biweekly" ${d.frequency === 'biweekly' ? 'selected' : ''}>🔄 Bi-Weekly</option>
                            <option value="four_weekly" ${d.frequency === 'four_weekly' ? 'selected' : ''}>🏥 4-Weekly</option>
                            <option value="weekly" ${d.frequency === 'weekly' ? 'selected' : ''}>⚡ Weekly</option>
                            <option value="semi_monthly" ${d.frequency === 'semi_monthly' ? 'selected' : ''}>🗓️ Semi-Monthly</option>
                          </select>
                        ` : ''}
                      </div>
                    ` : `
                      <div style="display:flex; flex-direction:column; gap:1px;">
                        <div style="display:flex; align-items:center; gap:4px;">
                          <span>${d.is_salary ? '💰' : '📄'}</span>
                          <strong>${d.name}</strong>
                        </div>
                        ${(d.is_salary && d.frequency && d.frequency !== 'monthly') ? `
                          <span style="font-size:9.5px; color:var(--curr-border); font-weight:600;">
                            ${d.frequency === 'biweekly' ? '🔄 Bi-Weekly' : (d.frequency === 'weekly' ? '⚡ Weekly' : (d.frequency === 'four_weekly' ? '🏥 4-Weekly' : '🗓️ Semi-Monthly'))}
                          </span>
                        ` : ''}
                      </div>
                    `}
                  </td>
                  <td>
                    ${globalEditMode ? `
                      <select class="table-input" onchange="window.budgetApp.editDeductionTarget(${idx}, this.value)">
                        <option value="none" ${d.target_account === 'none' ? 'selected' : ''}>None (Personal)</option>
                        <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                        <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                      </select>
                    ` : (d.target_account !== 'none' ? `<span style="color:var(--curr-border); font-weight:600;">➔ ${d.target_account}</span>` : '<span style="color:var(--text-muted);">-</span>')}
                  </td>
                  ${cfg.people.map(p => {
                    const val = (d.amounts && d.amounts[p]) || (d.person === p ? d.amount : 0) || 0;
                    const salInfo = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule) : null;
                    const isMultiPay = salInfo && salInfo.count > 1;
                    return `
                      <td class="text-right">
                        ${globalEditMode ? `
                          <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <input class="table-input text-right" type="number" step="0.01" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${idx}, '${p}', this.value)">
                            ${(d.is_salary && isMultiPay) ? `<span style="font-size:9px; color:var(--text-muted);">${curr}${salInfo.total.toFixed(2)}/mo</span>` : ''}
                          </div>
                        ` : `
                          <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <span>${curr}${Number(val).toFixed(2)}${d.is_salary && d.frequency && d.frequency !== 'monthly' ? `<span style="font-size:9.5px; font-weight:normal; color:var(--text-muted);">/paycheck</span>` : ''}</span>
                            ${(d.is_salary && isMultiPay) ? `<span style="font-size:9.5px; color:var(--text-muted); font-weight:600;">= ${curr}${salInfo.total.toFixed(2)}</span>` : ''}
                          </div>
                        `}
                      </td>
                    `;
                  }).join('')}
                  ${globalEditMode ? `<td class="text-right"><button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteSalaryDeduction(${idx})">&times;</button></td>` : ''}
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border); font-weight:bold; background:rgba(255,255,255,0.02);">
                <td><strong style="color:var(--heading);">Personal Leftover</strong></td>
                <td style="font-size:11px; color:var(--text-muted);">(After Deductions)</td>
                ${cfg.people.map(p => {
                  const bal = personTotals[p] ? personTotals[p].leftover : 0;
                  return `<td class="text-right" style="color:${bal >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:13px; font-weight:700;">${curr}${bal.toFixed(2)}</td>`;
                }).join('')}
                ${globalEditMode ? '<td></td>' : ''}
              </tr>
            </tfoot>
          </table>
        </div>

          ${globalEditMode ? `
            <div style="display:grid; grid-template-columns: 1fr 110px ${cfg.people.map(() => '60px').join(' ')} 28px; gap:4px; margin-top:8px;">
              <input type="text" id="new-deduct-name" placeholder="Item Name (e.g. Salary, Phone Bill)">
              <select id="new-deduct-target">
                <option value="none">None</option>
                <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
                <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
              </select>
              ${cfg.people.map((p, idx) => `<input type="number" step="0.01" id="new-deduct-p${idx}" placeholder="${curr}">`).join('')}
              <button class="btn green" onclick="window.budgetApp.addSalaryDeduction()">+</button>
            </div>
            <div style="margin-top:4px;">
              <label style="font-size:11px; cursor:pointer; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                <input type="checkbox" id="new-deduct-issalary"> This item is Salary / Income
              </label>
            </div>
          ` : ''}
        </div>
      `}

      <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div>
            <h3 style="margin:0; font-size:16px; color:var(--curr-border);">📅 Scheduled Bills & Payments In (${activeTab})</h3>
            <span style="font-size:11px; color:var(--text-muted);">Active Direct Debits, recurring bills, and scheduled inflows for ${activeTab}.</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn" style="font-size:11px; padding:3px 8px; background:#0284c7; color:#fff;" onclick="window.budgetApp.propagateScheduledBills('${activeTab}')" title="Copy active monthly bills and payments in from ${activeTab} to all following months in ${appState.currentYear}">🚀 Propagate to Future Months</button>
            <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.setTab('Bills')" title="Open Scheduled Bills & Payments In dashboard">🔍 Scheduled Dashboard</button>
          </div>
        </div>
        
        <div class="table-responsive">
          <table class="table" style="margin:0;">
            <thead>
              <tr>
                <th style="white-space:nowrap;">Description</th>
                <th style="white-space:nowrap; min-width:120px;">Type & Cadence</th>
                <th style="white-space:nowrap; min-width:85px;">Due Date</th>
                <th style="white-space:nowrap; min-width:90px;" class="text-right">Amount</th>
                <th style="white-space:nowrap;">Account</th>
                <th style="white-space:nowrap; min-width:110px;">Holiday Rule</th>
                <th style="white-space:nowrap;">Transfer To</th>
                ${globalEditMode ? '<th style="width:30px;"></th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${getAllScheduledItems(activeTab, appState.currentYear).filter(b => {
                if (b.frequency === 'monthly') return true;
                if (b.frequency === 'yearly') return b.month === activeTab;
                if (b.source_type === 'recurring_payment' || b.source_type === 'recurring_income') {
                  return (typeof isRecurringDueInMonth === 'function') ? isRecurringDueInMonth(b, activeTab, appState.currentYear) : true;
                }
                return true;
              }).map((b) => {
                const isInc = !!b.is_income;
                let cadenceBadge = '';
                if (b.frequency === 'monthly') cadenceBadge = `<span class="badge" style="background:#0284c7; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Monthly In' : '📅 Monthly DD'}</span>`;
                else if (b.frequency === 'weekly') cadenceBadge = `<span class="badge" style="background:#10b981; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Weekly In' : '🔄 Weekly'}</span>`;
                else if (b.frequency === 'biweekly') cadenceBadge = `<span class="badge" style="background:#f59e0b; color:#000; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Bi-Weekly In' : '🔄 Bi-Weekly'}</span>`;
                else if (b.frequency === 'four_weekly') cadenceBadge = `<span class="badge" style="background:#d97706; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 4-Weekly In' : '🗓️ 4-Weekly'}</span>`;
                else if (b.frequency === 'yearly') cadenceBadge = `<span class="badge" style="background:#ec4899; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Annual In' : '🎉 Annual'}</span>`;
                else cadenceBadge = `<span class="badge" style="font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Recurring In' : '🔄 Recurring'}</span>`;

                let dueStr = (typeof formatScheduledBillDue === 'function') ? formatScheduledBillDue(b, activeTab, appState.currentYear) : (b.frequency === 'yearly' ? `${b.month || 'Jan'} ${b.due_day || 1}` : `Day ${b.due_day || 1}`);

                const holidayRule = b.holiday_rule || (isInc ? 'previous' : 'following');
                let holidayBadge = '';
                if (holidayRule === 'previous') holidayBadge = '<span class="badge" style="background:rgba(16,185,129,0.15); color:var(--green); font-size:9.5px; padding:2px 6px;">⬅️ Prev Workday</span>';
                else if (holidayRule === 'following') holidayBadge = '<span class="badge" style="background:rgba(56,189,248,0.15); color:var(--curr-border); font-size:9.5px; padding:2px 6px;">➡️ Next Workday</span>';
                else holidayBadge = '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted); font-size:9.5px; padding:2px 6px;">⏸️ Exact</span>';

                return `
                  <tr style="${isInc ? 'background:rgba(16,185,129,0.02);' : ''}">
                    <td>
                      ${globalEditMode ? `
                        <input class="table-input" type="text" value="${b.desc}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'desc', this.value)">
                      ` : `<strong>${isInc ? '📥 ' : ''}${b.desc}</strong>`}
                    </td>
                    <td style="white-space:nowrap;">${cadenceBadge}</td>
                    <td style="white-space:nowrap;">
                      ${globalEditMode && b.frequency === 'monthly' ? `
                        <input class="table-input" type="number" min="1" max="31" value="${b.due_day || 1}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'due_day', parseInt(this.value, 10))" style="width:50px;">
                      ` : `<span style="font-size:11px; color:var(--text-muted);">${dueStr}</span>`}
                    </td>
                    <td class="text-right" style="white-space:nowrap;">
                      ${globalEditMode ? `
                        <input class="table-input text-right" type="number" step="0.01" value="${b.amount}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'amount', parseFloat(this.value))" style="width:75px; color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">
                      ` : `<strong style="color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">${isInc ? '+' : '-'}${curr}${Number(b.amount || 0).toFixed(2)}</strong>`}
                    </td>
                    <td style="white-space:nowrap;">
                      ${globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'account', this.value)">
                          <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}" ${b.account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                          ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${b.account === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
                          ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
                        </select>
                      ` : `<span style="font-size:11px;">${b.account || cfg.current_accounts[0]}</span>`}
                    </td>
                    <td style="white-space:nowrap;">
                      ${globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'holiday_rule', this.value)" style="font-size:10px;">
                          <option value="previous" ${holidayRule === 'previous' ? 'selected' : ''}>⬅️ Prev</option>
                          <option value="following" ${holidayRule === 'following' ? 'selected' : ''}>➡️ Next</option>
                          <option value="exact" ${holidayRule === 'exact' ? 'selected' : ''}>⏸️ Exact</option>
                        </select>
                      ` : holidayBadge}
                    </td>
                    <td style="white-space:nowrap;">
                      ${!isInc ? (
                        globalEditMode ? `
                          <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'transfer_to', this.value)">
                            <option value="none" ${(!b.transfer_to || b.transfer_to === 'none') ? 'selected' : ''}>None</option>
                            ${(cfg.savings_accounts || []).map(s => `<option value="${s}" ${b.transfer_to === s ? 'selected' : ''}>📈 ${s}</option>`).join('')}
                          </select>
                        ` : (b.transfer_to && b.transfer_to !== 'none' ? `<span style="color:var(--purple); font-weight:600; font-size:11px;">📈 ${b.transfer_to}</span>` : '<span style="color:var(--text-muted); font-size:11px;">-</span>')
                      ) : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}
                    </td>
                    ${globalEditMode ? `
                      <td class="text-right">
                        <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteUnifiedScheduledBill('${b.source_type}', ${b.source_idx})">&times;</button>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border); font-weight:bold; background:rgba(255,255,255,0.02);">
                <td colspan="3"><strong style="color:var(--heading);">Total Scheduled Outgoings:</strong></td>
                <td class="text-right" style="color:var(--red); font-size:13px; font-weight:700;">-${curr}${totalDD.toFixed(2)}</td>
                <td colspan="${globalEditMode ? 4 : 3}">
                  <span style="font-size:11px; color:var(--text-muted);">
                    Scheduled Inflows: <strong style="color:var(--green);">+${curr}${totalMonthPaymentsIn.toFixed(2)}</strong> | Net: <strong style="color:${(totalMonthPaymentsIn - totalDD) >= 0 ? 'var(--green)' : 'var(--red)'};">${(totalMonthPaymentsIn - totalDD) >= 0 ? '+' : ''}${curr}${(totalMonthPaymentsIn - totalDD).toFixed(2)}</strong>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${globalEditMode ? `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; border-top:1px dashed var(--border); padding-top:8px;">
            <span style="font-size:11px; color:var(--text-muted);">Manage or add bills/incomes in Scheduled Dashboard:</span>
            <button class="btn green" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.setTab('Bills')">+ Manage Scheduled Items</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  container.innerHTML = html;
}
