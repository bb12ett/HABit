import { appState, getSettings, getYearData, getMonthData, getAccountConfig, isAccountIncludedInNet, months } from '../state.js';
import { renderYearBalancesChart } from '../charts.js';

export function renderYearOverviewView(container) {
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

  const monthData = months.map((m, idx) => {
    const md = getMonthData(m);
    
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
      month: m,
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

  // Calculate account-by-account savings summary
  const savingsSummary = cfg.savings_accounts.map(acc => {
    const janVal = Number(getMonthData('Jan').savings_data[acc]?.opening) || 0;
    const decVal = Number(getMonthData('Dec').savings_data[acc]?.opening) || 0;
    const conf = (typeof getAccountConfig === 'function') ? getAccountConfig('savings', acc) : { savings_predict_mode: 'planned' };
    
    // Find latest recorded actual check-in across the months
    let latestActual = null;
    let latestActualMonth = null;
    let latestPredictedAtThatMonth = janVal;

    for (let i = months.length - 1; i >= 0; i--) {
      const mName = months[i];
      const md = getMonthData(mName);
      for (let w = 5; w >= 1; w--) {
        const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`sav_${acc}`] !== "" && wAct[`sav_${acc}`] !== undefined && wAct[`sav_${acc}`] !== null) {
          latestActual = parseFloat(wAct[`sav_${acc}`]);
          latestActualMonth = mName;
          latestPredictedAtThatMonth = Number(md.savings_data[acc]?.opening) || 0;
          break;
        }
      }
      if (latestActual !== null) break;
    }

    const growthAmt = (latestActual !== null) ? (latestActual - latestPredictedAtThatMonth) : (decVal - janVal);
    const growthPct = (latestActual !== null && latestPredictedAtThatMonth > 0) 
      ? ((growthAmt / latestPredictedAtThatMonth) * 100) 
      : (janVal > 0 ? ((growthAmt / janVal) * 100) : 0);

    return {
      acc,
      janVal,
      decVal,
      conf,
      latestActual,
      latestActualMonth,
      growthAmt,
      growthPct
    };
  });

  container.innerHTML = `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h2>📊 Annual Trajectory & Year Overview (${appState.currentYear})</h2>
          <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Comparing predicted contributions and balances with actual check-ins across the year.</p>
        </div>
        <button class="btn secondary" onclick="window.budgetApp.openYearOverviewAccountFilterModal()">📊 Filter Chart Accounts</button>
      </div>
      
      <div class="chart-container" style="height:320px; margin-top:12px;">
        <canvas id="yearBalancesChart"></canvas>
      </div>
    </div>

    ${cfg.track_savings ? `
      <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
          <h3 style="margin:0;">📈 Savings Accounts: Planned Target vs. Actual Growth</h3>
          <span style="font-size:11px; color:var(--purple); font-weight:600;">Planned Cashflow Tracking</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Savings Account</th>
                <th>Jan Starting Balance</th>
                <th class="text-right">Projected Dec Target</th>
                <th class="text-right">Latest Actual Check-In</th>
                <th class="text-right">Growth vs Plan</th>
                <th style="font-size:11px;">Forecast Mode</th>
              </tr>
            </thead>
            <tbody>
              ${savingsSummary.map(s => `
                <tr>
                  <td><strong>${s.acc}</strong></td>
                  <td>${curr}${s.janVal.toFixed(2)}</td>
                  <td class="text-right" style="color:var(--purple); font-weight:bold;">${curr}${s.decVal.toFixed(2)}</td>
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
      <h3>📅 12-Month Financial Summary</h3>
      <div style="overflow-x:auto;">
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
                <td><strong>${d.month}</strong></td>
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

  setTimeout(() => {
    const canvas = document.getElementById('yearBalancesChart');
    if (canvas) {
      renderYearBalancesChart(canvas, monthData, curr, sel, cfg);
    }
  }, 40);
}
