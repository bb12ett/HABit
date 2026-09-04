import { appState, getSettings, getYearData, getMonthData, getAccountConfig, isAccountIncludedInNet, months, getSlidingWindowMonths } from '../state.js';
import {
  renderYearBalancesChart,
  updateYearBalancesChart,
  renderSavingsAccountChart,
  updateSavingsAccountChart,
  destroySavingsAccountChart
} from '../charts.js';

let currentTrajectoryWindowStart = null;
let lastRenderedContainer = null;
let selectedSavingsChartAccount = 'ALL';

export function getTrajectoryAvailableMonths() {
  const allMonths = (typeof getSlidingWindowMonths === 'function')
    ? getSlidingWindowMonths()
    : [];
  return allMonths.filter(mObj => {
    const yData = getYearData(mObj.year);
    const md = (yData && yData.months && yData.months[mObj.month]) || {};
    return !md.archived;
  });
}

export function getDefaultTrajectoryWindowStart(availableMonths) {
  if (!availableMonths || availableMonths.length === 0) return 0;
  const maxStart = Math.max(0, availableMonths.length - 12);
  const curIdx = availableMonths.findIndex(m => m.isCurrent);
  if (curIdx !== -1) {
    return Math.max(0, Math.min(curIdx, maxStart));
  }
  return 0;
}

export function computeTrajectoryMonthData(visibleMonths, sel, cfg) {
  return visibleMonths.map(mObj => {
    const md = getMonthData(mObj.month, mObj.year);
    
    let cTotal = 0, crTotal = 0, sTotal = 0;
    (sel.current || []).forEach(acc => cTotal += Number(md.current_data[acc] && md.current_data[acc].opening) || 0);
    cfg.credit_accounts.filter(c => (sel.credit || []).includes(c.name)).forEach(c => crTotal += Number(md.credit_data[c.name] && md.credit_data[c.name].opening_spent) || 0);
    (sel.savings || []).forEach(s => sTotal += Number(md.savings_data[s] && md.savings_data[s].opening) || 0);

    // Compute actual holdings for this month if recorded in weekly_actuals
    let hasActualSavings = false;
    let actualSavingsTotal = 0;
    let hasActualCurrent = false;
    let actualCurrentTotal = 0;

    (sel.savings || []).forEach(acc => {
      let actVal = null;
      for (let w = 5; w >= 1; w--) {
        const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`sav_${acc}`] !== "" && wAct[`sav_${acc}`] !== undefined && wAct[`sav_${acc}`] !== null) {
          actVal = parseFloat(wAct[`sav_${acc}`]);
          break;
        }
      }
      if (actVal !== null && !isNaN(actVal)) {
        hasActualSavings = true;
        actualSavingsTotal += actVal;
      } else {
        actualSavingsTotal += Number(md.savings_data[acc] && md.savings_data[acc].opening) || 0;
      }
    });

    (sel.current || []).forEach(acc => {
      let actVal = null;
      for (let w = 5; w >= 1; w--) {
        const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`curr_${acc}`] !== "" && wAct[`curr_${acc}`] !== undefined && wAct[`curr_${acc}`] !== null) {
          actVal = parseFloat(wAct[`curr_${acc}`]);
          break;
        }
      }
      if (actVal !== null && !isNaN(actVal)) {
        hasActualCurrent = true;
        actualCurrentTotal += actVal;
      } else {
        actualCurrentTotal += Number(md.current_data[acc] && md.current_data[acc].opening) || 0;
      }
    });

    const ddTotal = (md.direct_debits || []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    let wTotal = 0;
    Object.values(md.weekly_items || {}).forEach(wItems => (wItems || []).forEach(it => { if (!it.is_income) wTotal += Number(it.amount) || 0; }));

    return {
      month: mObj.month,
      year: mObj.year,
      label: mObj.label || `${mObj.month} '${String(mObj.year).slice(-2)}`,
      current: cTotal,
      credit: crTotal,
      savings: sTotal,
      actualSavings: hasActualSavings ? actualSavingsTotal : null,
      actualCurrent: hasActualCurrent ? actualCurrentTotal : null,
      net: cTotal + sTotal - crTotal,
      actualNet: (hasActualSavings || hasActualCurrent) ? (actualCurrentTotal + actualSavingsTotal - crTotal) : null,
      out: ddTotal + wTotal
    };
  });
}

export function computeTrajectorySavingsSummary(visibleMonths, cfg) {
  if (!visibleMonths || visibleMonths.length === 0) return [];
  const startM = visibleMonths[0];
  const endM = visibleMonths[visibleMonths.length - 1];

  return cfg.savings_accounts.map(acc => {
    const startMd = getMonthData(startM.month, startM.year);
    const endMd = getMonthData(endM.month, endM.year);

    const startVal = Number(startMd.savings_data[acc]?.opening) || 0;
    const endVal = Number(endMd.savings_data[acc]?.opening) || 0;
    const conf = (typeof getAccountConfig === 'function')
      ? getAccountConfig('savings', acc, startM.year)
      : { savings_predict_mode: 'planned' };
    
    // Find latest recorded actual check-in across the visible months
    let latestActual = null;
    let latestActualMonth = null;
    let latestPredictedAtThatMonth = startVal;

    for (let i = visibleMonths.length - 1; i >= 0; i--) {
      const curM = visibleMonths[i];
      const curMd = getMonthData(curM.month, curM.year);
      for (let w = 5; w >= 1; w--) {
        const wAct = curMd.weekly_actuals && curMd.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`sav_${acc}`] !== "" && wAct[`sav_${acc}`] !== undefined && wAct[`sav_${acc}`] !== null) {
          latestActual = parseFloat(wAct[`sav_${acc}`]);
          latestActualMonth = curM.label || `${curM.month} '${String(curM.year).slice(-2)}`;
          latestPredictedAtThatMonth = Number(curMd.savings_data[acc]?.opening) || 0;
          break;
        }
      }
      if (latestActual !== null) break;
    }

    const growthAmt = (latestActual !== null) ? (latestActual - latestPredictedAtThatMonth) : (endVal - startVal);
    const growthPct = (latestActual !== null && latestPredictedAtThatMonth > 0) 
      ? ((growthAmt / latestPredictedAtThatMonth) * 100) 
      : (startVal > 0 ? ((growthAmt / startVal) * 100) : 0);

    return {
      acc,
      startVal,
      endVal,
      startLabel: startM.label || startM.month,
      endLabel: endM.label || endM.month,
      conf,
      latestActual,
      latestActualMonth,
      growthAmt,
      growthPct
    };
  });
}

export function computeSavingsAccountChartData(visibleMonths, accountName, cfg) {
  const labels = visibleMonths.map(m => m.label);
  const planned = [];
  const actual = [];

  visibleMonths.forEach(mObj => {
    const md = getMonthData(mObj.month, mObj.year);

    if (accountName === 'ALL') {
      let pSum = 0;
      (cfg.savings_accounts || []).forEach(acc => {
        pSum += Number(md.savings_data[acc]?.opening) || 0;
      });
      planned.push(pSum);

      let aSum = 0;
      let hasAnyActual = false;
      (cfg.savings_accounts || []).forEach(acc => {
        let actVal = null;
        for (let w = 5; w >= 1; w--) {
          const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
          if (wAct && wAct[`sav_${acc}`] !== "" && wAct[`sav_${acc}`] !== undefined && wAct[`sav_${acc}`] !== null) {
            actVal = parseFloat(wAct[`sav_${acc}`]);
            break;
          }
        }
        if (actVal !== null && !isNaN(actVal)) {
          hasAnyActual = true;
          aSum += actVal;
        } else {
          aSum += Number(md.savings_data[acc]?.opening) || 0;
        }
      });
      actual.push(hasAnyActual ? aSum : null);
    } else {
      const pVal = Number(md.savings_data[accountName]?.opening) || 0;
      planned.push(pVal);

      let actVal = null;
      for (let w = 5; w >= 1; w--) {
        const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`sav_${accountName}`] !== "" && wAct[`sav_${accountName}`] !== undefined && wAct[`sav_${accountName}`] !== null) {
          actVal = parseFloat(wAct[`sav_${accountName}`]);
          break;
        }
      }
      actual.push((actVal !== null && !isNaN(actVal)) ? actVal : null);
    }
  });

  // Calculate growth trend extrapolation based on actuals
  const actualEntries = [];
  actual.forEach((val, idx) => {
    if (val !== null && val !== undefined) {
      actualEntries.push({ idx, val });
    }
  });

  const forecast = visibleMonths.map(() => null);

  if (actualEntries.length > 0) {
    const latest = actualEntries[actualEntries.length - 1];
    let monthlyRate = 0;

    if (actualEntries.length >= 2) {
      const first = actualEntries[0];
      const dMonths = latest.idx - first.idx;
      if (dMonths > 0 && first.val > 0) {
        monthlyRate = Math.pow(latest.val / first.val, 1 / dMonths) - 1;
        monthlyRate = Math.max(-0.25, Math.min(0.25, monthlyRate));
      } else if (dMonths > 0) {
        monthlyRate = (latest.val - first.val) / dMonths;
      }
    } else {
      const baseline = planned[0];
      if (latest.idx > 0 && baseline > 0) {
        monthlyRate = Math.pow(latest.val / baseline, 1 / latest.idx) - 1;
        monthlyRate = Math.max(-0.25, Math.min(0.25, monthlyRate));
      } else if (latest.idx > 0) {
        monthlyRate = (latest.val - baseline) / latest.idx;
      }
    }

    // Connect forecast line at the latest actual check-in and extrapolate forward
    forecast[latest.idx] = latest.val;
    for (let i = latest.idx + 1; i < visibleMonths.length; i++) {
      const steps = i - latest.idx;
      let projectedVal;
      if (Math.abs(monthlyRate) < 1) {
        projectedVal = latest.val * Math.pow(1 + monthlyRate, steps);
      } else {
        projectedVal = latest.val + (monthlyRate * steps);
      }
      forecast[i] = Math.max(0, Math.round(projectedVal * 100) / 100);
    }
  }

  return {
    labels,
    planned,
    actual,
    forecast
  };
}

function renderTrajectoryTablesHtml(visibleMonths, monthData, savingsSummary, curr, cfg) {
  if (!visibleMonths || visibleMonths.length === 0) return '';
  const startM = visibleMonths[0];
  const endM = visibleMonths[visibleMonths.length - 1];

  if (selectedSavingsChartAccount !== 'ALL' && (!cfg.savings_accounts || !cfg.savings_accounts.includes(selectedSavingsChartAccount))) {
    selectedSavingsChartAccount = 'ALL';
  }

  return `
    ${cfg.track_savings ? `
      <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <h3 style="margin:0;">📈 Savings Accounts: Target vs. Actual Growth (${startM.label} – ${endM.label})</h3>
            <p style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Comparing planned target cashflows with actual check-ins and trend extrapolation.</p>
          </div>

          <!-- ACCOUNT SWITCHER PILLS -->
          <div class="savings-chart-pill-bar md3-segmented-bar" style="height:32px;">
            <button class="md3-segment-btn savings-pill ${selectedSavingsChartAccount === 'ALL' ? 'active' : ''}" 
                    data-acc="ALL"
                    onclick="window.budgetApp.selectSavingsChartAccount(this.dataset.acc)">
              All Combined
            </button>
            ${(cfg.savings_accounts || []).map(acc => `
              <button class="md3-segment-btn savings-pill ${selectedSavingsChartAccount === acc ? 'active' : ''}" 
                      data-acc="${acc.replace(/"/g, '&quot;')}"
                      onclick="window.budgetApp.selectSavingsChartAccount(this.dataset.acc)">
                ${acc}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- DEDICATED SAVINGS CHART -->
        <div class="chart-container" style="height:260px; margin-top:6px; margin-bottom:18px;">
          <canvas id="savingsDetailChart"></canvas>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Savings Account</th>
                <th>${startM.label} Starting Balance</th>
                <th class="text-right">Projected ${endM.label} Target</th>
                <th class="text-right">Latest Actual Check-In</th>
                <th class="text-right">Growth vs Plan</th>
                <th style="font-size:11px;">Forecast Mode</th>
              </tr>
            </thead>
            <tbody>
              ${savingsSummary.map(s => `
                <tr>
                  <td><strong>${s.acc}</strong></td>
                  <td>${curr}${s.startVal.toFixed(2)}</td>
                  <td class="text-right" style="color:var(--purple); font-weight:bold;">${curr}${s.endVal.toFixed(2)}</td>
                  <td class="text-right font-semibold">
                    ${s.latestActual !== null ? `
                      <span style="color:var(--heading);">${curr}${s.latestActual.toFixed(2)}</span>
                      <span style="font-size:10px; color:var(--text-muted);">(${s.latestActualMonth})</span>
                    ` : '<span style="color:var(--text-muted);">-</span>'}
                  </td>
                  <td class="text-right" style="color:${s.growthAmt >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">
                    ${s.growthAmt >= 0 ? '+' : ''}${curr}${s.growthAmt.toFixed(2)} (${s.growthPct >= 0 ? '+' : ''}${s.growthPct.toFixed(2)}%)
                  </td>
                  <td style="font-size:11px; color:var(--text-muted);">
                    ${s.conf.savings_predict_mode === 'actual' ? '🔄 Roll Forward from Actuals' : '📈 Planned Cashflow'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <div class="panel">
      <h3>📅 12-Month Financial Summary (${startM.label} – ${endM.label})</h3>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Month</th>
              <th class="text-right">Current Accounts</th>
              <th class="text-right">Credit Card Debt</th>
              ${cfg.track_savings ? `
                <th class="text-right">Planned Savings</th>
                <th class="text-right">Actual Savings</th>
              ` : ''}
              <th class="text-right">Net Position</th>
              <th class="text-right">Total Outgoings</th>
            </tr>
          </thead>
          <tbody>
            ${monthData.map(d => `
              <tr>
                <td><strong>${d.label}</strong></td>
                <td class="text-right">${curr}${d.current.toFixed(2)}</td>
                <td class="text-right" style="color:var(--red);">-${curr}${d.credit.toFixed(2)}</td>
                ${cfg.track_savings ? `
                  <td class="text-right" style="color:var(--purple);">${curr}${d.savings.toFixed(2)}</td>
                  <td class="text-right" style="font-weight:600;">
                    ${d.actualSavings !== null ? `
                      <span style="color:var(--heading);">${curr}${d.actualSavings.toFixed(2)}</span>
                      ${(d.actualSavings - d.savings) !== 0 ? `
                        <span style="font-size:10px; color:${(d.actualSavings - d.savings) >= 0 ? 'var(--green)' : 'var(--red)'};">
                          (${(d.actualSavings - d.savings) >= 0 ? '+' : ''}${curr}${(d.actualSavings - d.savings).toFixed(0)})
                        </span>
                      ` : ''}
                    ` : '<span style="color:var(--text-muted);">-</span>'}
                  </td>
                ` : ''}
                <td class="text-right" style="color:${d.net >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">${curr}${d.net.toFixed(2)}</td>
                <td class="text-right">${curr}${d.out.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function updateTrajectoryViewData() {
  const availableMonths = getTrajectoryAvailableMonths();
  if (!availableMonths || availableMonths.length === 0) return;

  const maxStart = Math.max(0, availableMonths.length - 12);
  if (currentTrajectoryWindowStart === null) {
    currentTrajectoryWindowStart = getDefaultTrajectoryWindowStart(availableMonths);
  } else {
    currentTrajectoryWindowStart = Math.max(0, Math.min(currentTrajectoryWindowStart, maxStart));
  }

  const visibleMonths = availableMonths.slice(currentTrajectoryWindowStart, currentTrajectoryWindowStart + 12);
  if (visibleMonths.length === 0) return;

  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;

  if (!yData.yearly_overview_selection) {
    yData.yearly_overview_selection = {
      current: cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)),
      credit: cfg.credit_accounts.map(c => c.name).filter(cName => isAccountIncludedInNet('credit', cName)),
      savings: cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s))
    };
  }
  const sel = yData.yearly_overview_selection;

  const monthData = computeTrajectoryMonthData(visibleMonths, sel, cfg);
  const savingsSummary = computeTrajectorySavingsSummary(visibleMonths, cfg);

  const startM = visibleMonths[0];
  const endM = visibleMonths[visibleMonths.length - 1];
  const rangeStr = `${startM.label} – ${endM.label}`;

  // Update Header & Badge
  const rangeTextEl = document.getElementById('trajRangeText');
  if (rangeTextEl) rangeTextEl.innerText = rangeStr;

  const sliderEl = document.getElementById('trajWindowSlider');
  if (sliderEl) {
    sliderEl.max = String(maxStart);
    sliderEl.value = String(currentTrajectoryWindowStart);
    sliderEl.disabled = (maxStart === 0);
  }

  const prevBtn = document.getElementById('trajPrevBtn');
  if (prevBtn) {
    prevBtn.disabled = (currentTrajectoryWindowStart <= 0);
    prevBtn.style.opacity = (currentTrajectoryWindowStart <= 0) ? '0.35' : '1';
    prevBtn.style.cursor = (currentTrajectoryWindowStart <= 0) ? 'not-allowed' : 'pointer';
  }

  const nextBtn = document.getElementById('trajNextBtn');
  if (nextBtn) {
    nextBtn.disabled = (currentTrajectoryWindowStart >= maxStart);
    nextBtn.style.opacity = (currentTrajectoryWindowStart >= maxStart) ? '0.35' : '1';
    nextBtn.style.cursor = (currentTrajectoryWindowStart >= maxStart) ? 'not-allowed' : 'pointer';
  }

  // Update Chart
  const canvas = document.getElementById('yearBalancesChart');
  if (canvas) {
    const updated = updateYearBalancesChart(monthData, curr, sel, cfg);
    if (!updated) {
      renderYearBalancesChart(canvas, monthData, curr, sel, cfg);
    }
  }

  // Update Tables
  const tablesContainer = document.getElementById('trajectoryTablesContainer');
  if (tablesContainer) {
    tablesContainer.innerHTML = renderTrajectoryTablesHtml(visibleMonths, monthData, savingsSummary, curr, cfg);

    if (cfg.track_savings) {
      const sCanvas = document.getElementById('savingsDetailChart');
      if (sCanvas) {
        const sChartData = computeSavingsAccountChartData(visibleMonths, selectedSavingsChartAccount, cfg);
        renderSavingsAccountChart(sCanvas, sChartData, curr);
      }
    }
  }
}

export function shiftTrajectoryWindow(delta) {
  const availableMonths = getTrajectoryAvailableMonths();
  if (!availableMonths || availableMonths.length === 0) return;
  const maxStart = Math.max(0, availableMonths.length - 12);
  const cur = (currentTrajectoryWindowStart !== null) ? currentTrajectoryWindowStart : getDefaultTrajectoryWindowStart(availableMonths);
  const target = Math.max(0, Math.min(cur + delta, maxStart));
  if (target !== currentTrajectoryWindowStart) {
    currentTrajectoryWindowStart = target;
    updateTrajectoryViewData();
  }
}

export function setTrajectoryWindowStart(newIdx) {
  const availableMonths = getTrajectoryAvailableMonths();
  if (!availableMonths || availableMonths.length === 0) return;
  const maxStart = Math.max(0, availableMonths.length - 12);
  const target = Math.max(0, Math.min(newIdx, maxStart));
  if (target !== currentTrajectoryWindowStart) {
    currentTrajectoryWindowStart = target;
    updateTrajectoryViewData();
  }
}

export function resetTrajectoryWindow() {
  const availableMonths = getTrajectoryAvailableMonths();
  const def = getDefaultTrajectoryWindowStart(availableMonths);
  currentTrajectoryWindowStart = def;
  updateTrajectoryViewData();
}

export function renderYearOverviewView(container) {
  lastRenderedContainer = container;
  const availableMonths = getTrajectoryAvailableMonths();
  const maxStart = Math.max(0, availableMonths.length - 12);

  if (currentTrajectoryWindowStart === null) {
    currentTrajectoryWindowStart = getDefaultTrajectoryWindowStart(availableMonths);
  } else {
    currentTrajectoryWindowStart = Math.max(0, Math.min(currentTrajectoryWindowStart, maxStart));
  }

  const visibleMonths = availableMonths.slice(currentTrajectoryWindowStart, currentTrajectoryWindowStart + 12);
  const startM = visibleMonths[0] || { label: 'Start' };
  const endM = visibleMonths[visibleMonths.length - 1] || { label: 'End' };
  const earliestM = availableMonths[0] || startM;
  const latestM = availableMonths[availableMonths.length - 1] || endM;

  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;

  if (!yData.yearly_overview_selection) {
    yData.yearly_overview_selection = {
      current: cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)),
      credit: cfg.credit_accounts.map(c => c.name).filter(cName => isAccountIncludedInNet('credit', cName)),
      savings: cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s))
    };
  }
  const sel = yData.yearly_overview_selection;

  const monthData = computeTrajectoryMonthData(visibleMonths, sel, cfg);
  const savingsSummary = computeTrajectorySavingsSummary(visibleMonths, cfg);

  container.innerHTML = `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h2>📊 Annual Trajectory & Rolling 12 Months</h2>
          <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Scroll or swipe to view continuous rolling 12-month projections across years.</p>
        </div>
        <button class="btn secondary" onclick="window.budgetApp.openYearOverviewAccountFilterModal()">📊 Filter Chart Accounts</button>
      </div>

      <!-- TIMELINE CONTROLLER -->
      <div class="trajectory-window-controls">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button id="trajPrevBtn" class="btn secondary sm" onclick="window.budgetApp.shiftTrajectoryWindow(-1)" title="Step 1 Month Earlier" style="height:32px; padding:0 12px; font-weight:700;">
            ◀
          </button>
          <div class="trajectory-range-badge" id="trajWindowBadge">
            📅 <span id="trajRangeText">${startM.label} – ${endM.label}</span>
            <span style="font-size:11px; opacity:0.7; font-weight:500;">(12 mo)</span>
          </div>
          <button id="trajNextBtn" class="btn secondary sm" onclick="window.budgetApp.shiftTrajectoryWindow(1)" title="Step 1 Month Later" style="height:32px; padding:0 12px; font-weight:700;">
            ▶
          </button>
          <button id="trajResetBtn" class="btn secondary sm" onclick="window.budgetApp.resetTrajectoryWindow()" title="Reset to Current Month Rolling 12 Months" style="height:32px; font-size:11.5px; font-weight:600;">
            Today
          </button>
        </div>

        ${availableMonths.length > 12 ? `
          <div class="trajectory-slider-container">
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">${earliestM.label}</span>
            <input type="range" id="trajWindowSlider" min="0" max="${maxStart}" value="${currentTrajectoryWindowStart}" step="1"
                   oninput="window.budgetApp.setTrajectoryWindowStart(parseInt(this.value, 10))"
                   aria-label="Rolling 12-month timeline slider">
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">${latestM.label}</span>
          </div>
        ` : ''}
      </div>
      
      <div id="yearBalancesChartContainer" class="chart-container" style="height:320px; margin-top:12px; touch-action: pan-y; position: relative;">
        <canvas id="yearBalancesChart"></canvas>
      </div>
    </div>

    <!-- SYNCHRONIZED TABLES CONTAINER -->
    <div id="trajectoryTablesContainer">
      ${renderTrajectoryTablesHtml(visibleMonths, monthData, savingsSummary, curr, cfg)}
    </div>
  `;

  setTimeout(() => {
    const canvas = document.getElementById('yearBalancesChart');
    if (canvas) {
      renderYearBalancesChart(canvas, monthData, curr, sel, cfg);
    }

    if (cfg.track_savings) {
      const sCanvas = document.getElementById('savingsDetailChart');
      if (sCanvas) {
        const sChartData = computeSavingsAccountChartData(visibleMonths, selectedSavingsChartAccount, cfg);
        renderSavingsAccountChart(sCanvas, sChartData, curr);
      }
    }

    // Attach touch swipe & wheel scrolling to the chart container
    const chartContainer = document.getElementById('yearBalancesChartContainer');
    if (chartContainer) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;

      chartContainer.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        }
      }, { passive: true });

      chartContainer.addEventListener('touchend', (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const t = e.changedTouches[0];
        const diffX = t.clientX - touchStartX;
        const diffY = t.clientY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.2 && elapsed < 600) {
          if (diffX < 0) {
            shiftTrajectoryWindow(1); // Swipe left -> next month
          } else {
            shiftTrajectoryWindow(-1); // Swipe right -> prev month
          }
        }
      }, { passive: true });

      chartContainer.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 15) {
          e.preventDefault();
          if (e.deltaX > 0) {
            shiftTrajectoryWindow(1);
          } else {
            shiftTrajectoryWindow(-1);
          }
        }
      }, { passive: false });
    }
  }, 40);
}

export function selectSavingsChartAccount(accountName) {
  selectedSavingsChartAccount = accountName || 'ALL';

  // Update pill active classes
  const pillBtns = document.querySelectorAll('.savings-chart-pill-bar .savings-pill');
  pillBtns.forEach(btn => {
    if (btn.getAttribute('data-acc') === selectedSavingsChartAccount) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const availableMonths = getTrajectoryAvailableMonths();
  if (!availableMonths || availableMonths.length === 0) return;
  const maxStart = Math.max(0, availableMonths.length - 12);
  const curStart = (currentTrajectoryWindowStart !== null) ? currentTrajectoryWindowStart : getDefaultTrajectoryWindowStart(availableMonths);
  const visibleMonths = availableMonths.slice(curStart, curStart + 12);
  const cfg = getSettings();
  const curr = cfg.currency;

  const sChartData = computeSavingsAccountChartData(visibleMonths, selectedSavingsChartAccount, cfg);
  const sCanvas = document.getElementById('savingsDetailChart');
  if (sCanvas) {
    const updated = updateSavingsAccountChart(sChartData, curr);
    if (!updated) {
      renderSavingsAccountChart(sCanvas, sChartData, curr);
    }
  }
}

if (typeof window !== 'undefined') {
  window.shiftTrajectoryWindow = shiftTrajectoryWindow;
  window.setTrajectoryWindowStart = setTrajectoryWindowStart;
  window.resetTrajectoryWindow = resetTrajectoryWindow;
  window.updateTrajectoryViewData = updateTrajectoryViewData;
  window.selectSavingsChartAccount = selectSavingsChartAccount;
}
