import { appState, getSettings, getYearData, getMonthData, months, isMultiUserEnabled, getActiveUser, isAccountIncludedInNet } from '../state.js';
import { calculateMonthSchedule, calculateLiveDailyPacing, detectCurrentMonthAndWeek, calculateMonthForecast } from '../calculations.js';

export function renderForecastOverviewView(container) {
  const cfg = getSettings();
  const curr = cfg.currency || '£';
  const currentYear = appState.currentYear || new Date().getFullYear();
  const isMulti = isMultiUserEnabled();
  const activeUser = isMulti ? getActiveUser() : 'Joint';

  // 1. Determine active month to anchor the forecast overview
  const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek(currentYear) : null;
  const currentMonthName = (detected && detected.month) ? detected.month : 'Jan';
  
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

  // Net position delta from starting
  const totalStartingNet = totalCurrentOpening + totalSavingsOpening - totalCreditOpeningSpent;
  const netPositionDelta = projectedMonthEndNet - totalStartingNet;

  // Safe to spend today
  let safeDailySpend = 0;
  let pacingStatusText = 'On Track';
  let pacingStatusClass = 'badge-green';

  if (livePacing && livePacing.isPacingActive) {
    const daysRemainingInWeek = Math.max(1, livePacing.totalDays - livePacing.elapsedDays + 1);
    const unspentBudget = Math.max(0, activeWeekPred.wSpend - livePacing.pacedDiscretionarySpendToDate);
    safeDailySpend = unspentBudget / daysRemainingInWeek;

    if (livePacing.liveDailyVariance !== null) {
      if (livePacing.liveDailyVariance >= 15) {
        pacingStatusText = 'Ahead of Budget';
        pacingStatusClass = 'badge-green';
      } else if (livePacing.liveDailyVariance < -25) {
        pacingStatusText = 'Over Budget Pace';
        pacingStatusClass = 'badge-red';
      } else {
        pacingStatusText = 'On Track';
        pacingStatusClass = 'badge-blue';
      }
    }
  } else if (activeWeekObj) {
    safeDailySpend = (activeWeekPred.wSpend || 0) / 7;
  }

  // Upcoming scheduled bills in next 14 days
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingBills = [];

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
        const diffDays = Math.ceil((billDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 14) {
          upcomingBills.push({
            ...b,
            dueDay: billDate.getDate(),
            diffDays,
            billDate
          });
        }
      }
    });
  });

  upcomingBills.sort((a, b) => a.diffDays - b.diffDays);

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
        forwardMonths.push({
          month: targetMName,
          year: targetYear,
          isCurrent: offset === 0,
          projectedNet: f.projectedMonthEndNet,
          projectedCurrent: f.projectedMonthEndCurrent,
          totalInflow: f.totalCurrentInflow + f.totalMonthPaymentsIn,
          totalOutgoings: f.totalOutgoings + f.totalAutoPayMonth
        });
      }
    } catch (e) {
      console.warn("Error calculating forward forecast for", targetMName, e);
    }
  }

  // Render HTML with MD3 surface elevation & styling
  let html = `
    <div class="forecast-overview-container">
      
      <!-- HERO PAYDAY CYCLE & FORECAST BANNER -->
      <div class="forecast-hero-card">
        <div class="forecast-hero-content">
          <div class="forecast-hero-header">
            <div class="forecast-hero-title-group">
              <div class="forecast-hero-badge-row">
                <span class="md3-chip md3-chip-primary">⚡ Forecasting Overview</span>
                <span class="md3-chip md3-chip-tonal">📅 ${currentMonthName} ${currentYear}</span>
                ${isMulti ? `<span class="md3-chip md3-chip-user">👤 ${activeUser}</span>` : ''}
              </div>
              <h2 class="forecast-hero-title">Financial Runway & Projections</h2>
              <p class="forecast-hero-subtitle">
                Pay Cycle: <strong>${schedule.dateRangeStr}</strong> &bull; Week <strong>${currentWeekIdx + 1}</strong> of <strong>${schedule.numWeeks}</strong> &bull; Day <strong>${elapsedCycleDays}</strong> of <strong>${totalCycleDays}</strong>
              </p>
            </div>
            
            <div class="forecast-hero-actions">
              <button class="btn primary" onclick="window.budgetApp.setTab('${currentMonthName}')" title="Jump to detailed weekly spreadsheet for ${currentMonthName}">
                📅 View ${currentMonthName} Detail
              </button>
              <button class="btn secondary" onclick="window.budgetApp.setTab('Bills')" title="View recurring direct debits and standing orders">
                📋 Scheduled Bills
              </button>
              <button class="btn secondary" onclick="window.budgetApp.setTab('Year')" title="View 12-month annual trajectory and net worth chart">
                📊 Annual Trajectory
              </button>
            </div>
          </div>

          <!-- CYCLE PROGRESS BAR -->
          <div class="forecast-cycle-bar-wrap">
            <div class="forecast-cycle-bar-labels">
              <span>Payday Cycle Progress</span>
              <span class="forecast-cycle-percent">${percentElapsed}% elapsed (${totalCycleDays - elapsedCycleDays} days remaining)</span>
            </div>
            <div class="forecast-cycle-track">
              <div class="forecast-cycle-fill" style="width: ${percentElapsed}%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- KEY METRIC KPI CARDS (MATERIAL DESIGN 3 ELEVATED SURFACES) -->
      <div class="forecast-kpi-grid">
        
        <!-- 1. PROJECTED NET POSITION -->
        <div class="forecast-kpi-card ${projectedMonthEndNet >= 0 ? 'accent-green' : 'accent-red'}">
          <div class="forecast-kpi-top">
            <span class="forecast-kpi-icon">💎</span>
            <span class="forecast-kpi-tag">Month-End Position</span>
          </div>
          <div class="forecast-kpi-label">Projected Net Worth</div>
          <div class="forecast-kpi-val ${projectedMonthEndNet >= 0 ? 'val-green' : 'val-red'}">
            ${curr}${projectedMonthEndNet.toFixed(2)}
          </div>
          <div class="forecast-kpi-footer">
            <span class="forecast-kpi-change ${netPositionDelta >= 0 ? 'text-green' : 'text-red'}">
              ${netPositionDelta >= 0 ? '▲ +' : '▼ -'}${curr}${Math.abs(netPositionDelta).toFixed(2)}
            </span>
            <span class="forecast-kpi-sub">vs starting balances</span>
          </div>
        </div>

        <!-- 2. CURRENT ACCOUNTS FORECAST -->
        <div class="forecast-kpi-card accent-blue">
          <div class="forecast-kpi-top">
            <span class="forecast-kpi-icon">🏦</span>
            <span class="forecast-kpi-tag">Current Accounts</span>
          </div>
          <div class="forecast-kpi-label">Month-End Cash Balance</div>
          <div class="forecast-kpi-val ${projectedMonthEndCurrent >= 0 ? 'val-blue' : 'val-red'}">
            ${curr}${projectedMonthEndCurrent.toFixed(2)}
          </div>
          <div class="forecast-kpi-footer">
            <span class="forecast-kpi-sub">
              Start: <strong>${curr}${totalCurrentOpening.toFixed(0)}</strong> &bull; In: <strong class="text-green">+${curr}${totalCurrentInflow.toFixed(0)}</strong> &bull; Out: <strong class="text-red">-${curr}${(totalDD + totalWeeklyCurrentSpend + totalAutoPayMonth).toFixed(0)}</strong>
            </span>
          </div>
        </div>

        <!-- 3. CREDIT CARDS RUNWAY -->
        <div class="forecast-kpi-card accent-amber">
          <div class="forecast-kpi-top">
            <span class="forecast-kpi-icon">💳</span>
            <span class="forecast-kpi-tag">Credit Cards</span>
          </div>
          <div class="forecast-kpi-label">Projected Month-End Debt</div>
          <div class="forecast-kpi-val ${projectedMonthEndCredit > 0 ? 'val-amber' : 'val-green'}">
            -${curr}${projectedMonthEndCredit.toFixed(2)}
          </div>
          <div class="forecast-kpi-footer">
            <div class="forecast-mini-progress">
              <div class="forecast-mini-bar" style="width:${creditUtilPercent}%;"></div>
            </div>
            <span class="forecast-kpi-sub">
              ${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(0)} avail of ${curr}${totalCreditLimit.toFixed(0)} line (${creditUtilPercent}% utilized)
            </span>
          </div>
        </div>

        <!-- 4. SAVINGS PORTFOLIO & GROWTH -->
        <div class="forecast-kpi-card accent-purple">
          <div class="forecast-kpi-top">
            <span class="forecast-kpi-icon">📈</span>
            <span class="forecast-kpi-tag">Savings Portfolio</span>
          </div>
          <div class="forecast-kpi-label">Projected Total Savings</div>
          <div class="forecast-kpi-val val-purple">
            ${curr}${projectedMonthEndSavings.toFixed(2)}
          </div>
          <div class="forecast-kpi-footer">
            <span class="forecast-kpi-change text-purple">
              +${curr}${savingsGrowth.toFixed(2)}
            </span>
            <span class="forecast-kpi-sub">net wealth growth this month</span>
          </div>
        </div>

        <!-- 5. WEEKLY PACING & VARIANCE -->
        <div class="forecast-kpi-card accent-teal">
          <div class="forecast-kpi-top">
            <span class="forecast-kpi-icon">🎯</span>
            <span class="forecast-kpi-tag">${pacingStatusText}</span>
          </div>
          <div class="forecast-kpi-label">Safe-To-Spend Daily Pace</div>
          <div class="forecast-kpi-val val-teal">
            ${curr}${safeDailySpend.toFixed(2)}<span style="font-size:14px; font-weight:500; color:var(--text-muted);">/day</span>
          </div>
          <div class="forecast-kpi-footer">
            <span class="forecast-kpi-sub">
              Week ${currentWeekIdx + 1} pace &bull; ${latestVariance !== null ? `<strong class="${latestVariance >= 0 ? 'text-green' : 'text-red'}">${latestVariance >= 0 ? '+' : ''}${curr}${latestVariance.toFixed(2)}</strong> actual variance` : 'No actuals entered'}
            </span>
          </div>
        </div>

      </div>

      <!-- MAIN FORECASTING SECTIONS GRID -->
      <div class="forecast-sections-grid">
        
        <!-- LEFT COLUMN: WEEKLY FORECASTING FOCUS -->
        <div class="forecast-column">
          
          <!-- ACTIVE WEEK SPOTLIGHT CARD -->
          <div class="forecast-card">
            <div class="forecast-card-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">⚡</span>
                <h3 class="forecast-card-title">Active Week Spotlight: ${activeWeekObj?.label || 'Current Week'}</h3>
              </div>
              <span class="md3-badge md3-badge-active">Active Week</span>
            </div>

            <div class="forecast-card-body">
              <div class="forecast-week-spotlight-metrics">
                <div class="forecast-spotlight-item">
                  <span class="forecast-spotlight-label">Discretionary Budget</span>
                  <span class="forecast-spotlight-value">${curr}${(activeWeekPred.wSpend || 0).toFixed(2)}</span>
                  <span class="forecast-spotlight-sub">Planned living & grocery allowance</span>
                </div>

                <div class="forecast-spotlight-item">
                  <span class="forecast-spotlight-label">Bills Due This Week</span>
                  <span class="forecast-spotlight-value text-amber">${curr}${(activeWeekPred.wDDTotal || 0).toFixed(2)}</span>
                  <span class="forecast-spotlight-sub">${(activeWeekPred.wDDs || []).length} scheduled items</span>
                </div>

                <div class="forecast-spotlight-item">
                  <span class="forecast-spotlight-label">Expected Inflow</span>
                  <span class="forecast-spotlight-value text-green">+${curr}${(activeWeekPred.wIncomeTotal || 0).toFixed(2)}</span>
                  <span class="forecast-spotlight-sub">Income & paydays</span>
                </div>

                <div class="forecast-spotlight-item">
                  <span class="forecast-spotlight-label">Projected Week-End Net</span>
                  <span class="forecast-spotlight-value ${(activeWeekPred.predictedNet || 0) >= 0 ? 'text-green' : 'text-red'}">${curr}${(activeWeekPred.predictedNet || 0).toFixed(2)}</span>
                  <span class="forecast-spotlight-sub">Closing cash position</span>
                </div>
              </div>

              <!-- Scheduled Bills Clearing This Week -->
              <div style="margin-top:16px;">
                <h4 style="font-size:13px; font-weight:600; color:var(--heading); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                  <span>Direct Debits Clearing in ${activeWeekObj?.name || 'This Week'}:</span>
                  <span style="font-size:11.5px; color:var(--text-muted);">${(activeWeekPred.wDDs || []).length} items</span>
                </h4>

                ${(activeWeekPred.wDDs || []).length === 0 ? `
                  <div class="forecast-empty-note">No scheduled direct debits clearing during this week.</div>
                ` : `
                  <div class="forecast-chips-scroll">
                    ${(activeWeekPred.wDDs || []).map(d => `
                      <div class="forecast-bill-chip">
                        <span class="forecast-bill-chip-icon">${d.source_type === 'yearly_recurring' ? '🗓️' : '⚡'}</span>
                        <div class="forecast-bill-chip-info">
                          <span class="forecast-bill-chip-title">${d.desc || d.name || 'Direct Debit'}</span>
                          <span class="forecast-bill-chip-meta">Due ${d.due_day ? `Day ${d.due_day}` : 'this week'} &bull; ${d.account || cfg.current_accounts[0]}</span>
                        </div>
                        <span class="forecast-bill-chip-amt">-${curr}${Number(d.amount || 0).toFixed(2)}</span>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

              <div style="margin-top:16px; display:flex; justify-content:flex-end;">
                <button class="btn secondary" style="font-size:12px; padding:5px 12px;" onclick="window.budgetApp.setTab('${currentMonthName}')">
                  🔍 View Detailed Week Table &rarr;
                </button>
              </div>
            </div>
          </div>

          <!-- MULTI-WEEK CASHFLOW RUNWAY -->
          <div class="forecast-card">
            <div class="forecast-card-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">📅</span>
                <h3 class="forecast-card-title">Weekly Cashflow Runway (${schedule.numWeeks} Weeks)</h3>
              </div>
              <span style="font-size:11.5px; color:var(--text-muted);">Swipe or click a week</span>
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

        </div>

        <!-- RIGHT COLUMN: MONTHLY CASHFLOW & UPCOMING BILLS -->
        <div class="forecast-column">
          
          <!-- MONTHLY CASHFLOW ARCHITECTURE (INFLOWS VS OUTFLOWS) -->
          <div class="forecast-card">
            <div class="forecast-card-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">⚖️</span>
                <h3 class="forecast-card-title">${currentMonthName} Cashflow Architecture</h3>
              </div>
              <span class="md3-badge ${netMonthlySurplus >= 0 ? 'md3-badge-green' : 'md3-badge-red'}">
                ${netMonthlySurplus >= 0 ? 'Surplus' : 'Deficit'} ${curr}${Math.abs(netMonthlySurplus).toFixed(0)}
              </span>
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

              <div class="forecast-cashflow-breakdown-list" style="margin-top:16px;">
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

          <!-- UPCOMING BILLS (NEXT 14 DAYS) -->
          <div class="forecast-card">
            <div class="forecast-card-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">🔔</span>
                <h3 class="forecast-card-title">Upcoming Bills (Next 14 Days)</h3>
              </div>
              <span class="md3-badge md3-badge-neutral">${upcomingBills.length} Due Soon</span>
            </div>

            <div class="forecast-card-body">
              ${upcomingBills.length === 0 ? `
                <div class="forecast-empty-note">🎉 No upcoming bills due in the next 14 days!</div>
              ` : `
                <div class="forecast-upcoming-list">
                  ${upcomingBills.slice(0, 7).map(b => {
                    let dueTag = '';
                    if (b.diffDays === 0) dueTag = '<span class="due-pill due-today">Today</span>';
                    else if (b.diffDays === 1) dueTag = '<span class="due-pill due-tomorrow">Tomorrow</span>';
                    else dueTag = `<span class="due-pill">In ${b.diffDays} days</span>`;

                    return `
                      <div class="forecast-upcoming-item">
                        <div class="forecast-upcoming-left">
                          <span class="forecast-upcoming-icon">${b.source_type === 'yearly_recurring' ? '🗓️' : '⚡'}</span>
                          <div>
                            <div class="forecast-upcoming-title">${b.desc || b.name || 'Direct Debit'}</div>
                            <div class="forecast-upcoming-meta">Due Day ${b.dueDay} &bull; ${b.account || cfg.current_accounts[0]}</div>
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

          <!-- 3-MONTH HORIZON OUTLOOK -->
          <div class="forecast-card">
            <div class="forecast-card-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">🔭</span>
                <h3 class="forecast-card-title">3-Month Forecast Runway</h3>
              </div>
              <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.setTab('Year')">
                View Full Year &rarr;
              </button>
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
                        <span>Month Cash:</span>
                        <strong>${curr}${fm.projectedCurrent.toFixed(0)}</strong>
                      </div>
                      <div class="forecast-forward-stat">
                        <span>Total Inflow:</span>
                        <strong class="text-green">+${curr}${fm.totalInflow.toFixed(0)}</strong>
                      </div>
                      <div class="forecast-forward-stat">
                        <span>Total Out:</span>
                        <strong class="text-red">-${curr}${fm.totalOutgoings.toFixed(0)}</strong>
                      </div>
                    </div>

                    <button class="btn secondary forecast-forward-btn" onclick="window.budgetApp.setTab('${fm.month}')">
                      Explore ${fm.month}
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;

  container.innerHTML = html;
}
