import { formatScheduledBillDue } from '../calculations.js';
import { appState, getSettings, getYearData, getMonthData, getAllScheduledBills, getAllScheduledIncomes, getAllScheduledItems, months } from '../state.js';

export function renderBillsView(container) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const activeTab = months.includes(appState.activeTab) ? appState.activeTab : 'Jan';
  const allBills = getAllScheduledBills(activeTab, appState.currentYear);
  const allIncomes = getAllScheduledIncomes(activeTab, appState.currentYear);
  const allItems = getAllScheduledItems(activeTab, appState.currentYear);
  const globalEditMode = appState.globalEditMode;
  const activeFilter = appState.billsFilter || 'all';

  // Outgoings Breakdown
  const monthlyBills = allBills.filter(b => b.frequency === 'monthly');
  const weeklyBills = allBills.filter(b => b.frequency === 'weekly' || b.frequency === 'biweekly' || b.frequency === 'four_weekly' || b.frequency === 'custom_weeks');
  const annualBills = allBills.filter(b => b.frequency === 'yearly' || b.frequency === 'quarterly' || b.frequency === 'custom_months');

  const monthlyDDTotal = monthlyBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const weeklyAnnualizedBills = weeklyBills.reduce((sum, b) => {
    const amt = Number(b.amount) || 0;
    if (b.frequency === 'weekly') return sum + (amt * 52);
    if (b.frequency === 'biweekly') return sum + (amt * 26);
    if (b.frequency === 'four_weekly') return sum + (amt * 13);
    if (b.frequency === 'custom_weeks') return sum + (amt * (52 / (parseInt(b.interval_n, 10) || 1)));
    return sum + (amt * 12);
  }, 0);
  const annualBillsTotal = annualBills.reduce((sum, b) => {
    const amt = Number(b.amount) || 0;
    if (b.frequency === 'quarterly') return sum + (amt * 4);
    return sum + amt;
  }, 0);
  const totalAnnualCommitments = (monthlyDDTotal * 12) + weeklyAnnualizedBills + annualBillsTotal;
  const monthlyAverageBills = totalAnnualCommitments / 12;

  // Incomes Breakdown
  const monthlyIncomes = allIncomes.filter(i => i.frequency === 'monthly');
  const weeklyIncomes = allIncomes.filter(i => i.frequency === 'weekly' || i.frequency === 'biweekly' || i.frequency === 'four_weekly' || i.frequency === 'custom_weeks');
  const annualIncomes = allIncomes.filter(i => i.frequency === 'yearly' || i.frequency === 'quarterly' || i.frequency === 'custom_months');

  const monthlyIncomesTotal = monthlyIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const weeklyAnnualizedIncomes = weeklyIncomes.reduce((sum, i) => {
    const amt = Number(i.amount) || 0;
    if (i.frequency === 'weekly') return sum + (amt * 52);
    if (i.frequency === 'biweekly') return sum + (amt * 26);
    if (i.frequency === 'four_weekly') return sum + (amt * 13);
    if (i.frequency === 'custom_weeks') return sum + (amt * (52 / (parseInt(i.interval_n, 10) || 1)));
    return sum + (amt * 12);
  }, 0);
  const annualIncomesTotal = annualIncomes.reduce((sum, i) => {
    const amt = Number(i.amount) || 0;
    if (i.frequency === 'quarterly') return sum + (amt * 4);
    return sum + amt;
  }, 0);
  const totalAnnualIncomes = (monthlyIncomesTotal * 12) + weeklyAnnualizedIncomes + annualIncomesTotal;
  const monthlyAverageIncomes = totalAnnualIncomes / 12;

  const netMonthlyScheduled = monthlyIncomesTotal - monthlyDDTotal;
  const netAnnualScheduled = totalAnnualIncomes - totalAnnualCommitments;

  // Filter items
  const filteredItems = allItems.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'incomes') return !!item.is_income;
    if (activeFilter === 'outgoings') return !item.is_income;
    if (activeFilter === 'monthly') return item.frequency === 'monthly';
    if (activeFilter === 'weekly') return item.frequency === 'weekly' || item.frequency === 'biweekly' || item.frequency === 'four_weekly' || item.frequency === 'custom_weeks';
    if (activeFilter === 'yearly') return item.frequency === 'yearly' || item.frequency === 'quarterly' || item.frequency === 'custom_months';
    return true;
  });

  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  container.innerHTML = `
    <!-- TOP HEADER -->
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin:0; font-size:20px;">📅 Scheduled Bills & Payments In (${appState.currentYear})</h2>
          <p style="color:var(--text-muted); font-size:12px; margin:4px 0 0 0;">
            Manage all recurring outgoings (Direct Debits, bills) and recurring inflows (Salaries, side income, pensions, benefits) with custom weekend/holiday rules.
          </p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" style="background:#0284c7; color:#fff;" onclick="window.budgetApp.propagateScheduledBills('${activeTab}')" title="Copy active Direct Debits and Payments In to all future months in ${appState.currentYear}">
            🚀 Propagate to Future Months
          </button>
          <button class="btn green" onclick="window.budgetApp.scrollToAddScheduledItem('income')">
            + Add Payment In
          </button>
          <button class="btn secondary" style="border:1px solid var(--border);" onclick="window.budgetApp.scrollToAddScheduledItem('outgoing')">
            + Add Bill / DD
          </button>
        </div>
      </div>
    </div>

    <!-- KPI METRICS SUMMARY -->
    <div class="kpi-grid" style="margin-bottom:16px;">
      <div class="kpi-card">
        <div class="kpi-title">📅 Monthly Direct Debits</div>
        <div class="kpi-val" style="color:var(--red);">${curr}${monthlyDDTotal.toFixed(2)} / mo</div>
        <div class="kpi-sub">${monthlyBills.length} Active Direct Debits (${activeTab})</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">💰 Monthly Payments In</div>
        <div class="kpi-val" style="color:var(--green);">${curr}${monthlyIncomesTotal.toFixed(2)} / mo</div>
        <div class="kpi-sub">${monthlyIncomes.length} Scheduled Inflows (${activeTab})</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">⚖️ Net Scheduled Cashflow</div>
        <div class="kpi-val" style="color:${netMonthlyScheduled >= 0 ? 'var(--green)' : 'var(--red)'};">
          ${netMonthlyScheduled >= 0 ? '+' : ''}${curr}${netMonthlyScheduled.toFixed(2)} / mo
        </div>
        <div class="kpi-sub">Net Annual: <strong>${netAnnualScheduled >= 0 ? '+' : ''}${curr}${netAnnualScheduled.toFixed(2)} / yr</strong></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">💳 Total Annual Outgoings</div>
        <div class="kpi-val" style="color:var(--heading);">${curr}${totalAnnualCommitments.toFixed(2)} / yr</div>
        <div class="kpi-sub">Annual Inflows: <strong style="color:var(--green);">${curr}${totalAnnualIncomes.toFixed(2)} / yr</strong></div>
      </div>
    </div>

    <!-- SCHEDULED ITEMS TABLE PANEL -->
    <div class="panel" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <!-- FILTER BUTTONS -->
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn ${activeFilter === 'all' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('all')">
            All Items (${allItems.length})
          </button>
          <button class="btn ${activeFilter === 'incomes' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('incomes')">
            💰 Payments In (${allIncomes.length})
          </button>
          <button class="btn ${activeFilter === 'outgoings' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('outgoings')">
            💸 Bills & DDs (${allBills.length})
          </button>
          <button class="btn ${activeFilter === 'monthly' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('monthly')">
            📅 Monthly (${monthlyBills.length + monthlyIncomes.length})
          </button>
          <button class="btn ${activeFilter === 'weekly' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('weekly')">
            🔄 Multi-Week (${weeklyBills.length + weeklyIncomes.length})
          </button>
          <button class="btn ${activeFilter === 'yearly' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('yearly')">
            🎉 Annual & Periodic (${annualBills.length + annualIncomes.length})
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; color:var(--text-muted);">Active Month Context: <strong>${activeTab} ${appState.currentYear}</strong></span>
        </div>
      </div>

      <!-- TABLE -->
      <div class="table-responsive">
        <table class="table" style="width:100%; margin:0;">
          <thead>
            <tr>
              <th style="min-width:200px;">Description</th>
              <th style="min-width:130px;">Flow & Cadence</th>
              <th style="min-width:110px;">Due Date</th>
              <th class="text-right" style="min-width:110px;">Amount (${curr})</th>
              <th style="min-width:140px;">Account</th>
              <th style="min-width:140px;">Weekend / Holiday Rule</th>
              <th style="min-width:130px;">Transfer To</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.length === 0 ? `
              <tr>
                <td colspan="8" style="padding:24px; text-align:center; color:var(--text-muted); font-style:italic;">
                  No scheduled items found in this view. Use the form below to add a bill or payment in.
                </td>
              </tr>
            ` : filteredItems.map((b) => {
              const isInc = !!b.is_income;
              let flowBadge = isInc 
                ? '<span class="badge" style="background:#10b981; color:#fff; font-size:10px; margin-right:4px;">💰 Inflow</span>'
                : '<span class="badge" style="background:#ef4444; color:#fff; font-size:10px; margin-right:4px;">💸 Outgoing</span>';

              let cadenceBadge = '';
              if (b.frequency === 'monthly') cadenceBadge = `<span class="badge" style="background:#0284c7; color:#fff; font-size:11px;">📅 Monthly</span>`;
              else if (b.frequency === 'weekly') cadenceBadge = `<span class="badge" style="background:#14b8a6; color:#fff; font-size:11px;">🔄 Weekly</span>`;
              else if (b.frequency === 'biweekly') cadenceBadge = `<span class="badge" style="background:#f59e0b; color:#000; font-size:11px;">🔄 Bi-Weekly</span>`;
              else if (b.frequency === 'four_weekly') cadenceBadge = `<span class="badge" style="background:#d97706; color:#fff; font-size:11px;">🗓️ 4-Weekly</span>`;
              else if (b.frequency === 'quarterly') cadenceBadge = `<span class="badge" style="background:#8b5cf6; color:#fff; font-size:11px;">🗓️ Quarterly</span>`;
              else if (b.frequency === 'yearly') cadenceBadge = `<span class="badge" style="background:#ec4899; color:#fff; font-size:11px;">🎉 Annual</span>`;
              else if (b.frequency === 'custom_weeks') cadenceBadge = `<span class="badge" style="background:#64748b; color:#fff; font-size:11px;">⚙️ Every ${b.interval_n} Wks</span>`;
              else if (b.frequency === 'custom_months') cadenceBadge = `<span class="badge" style="background:#64748b; color:#fff; font-size:11px;">⚙️ Every ${b.interval_n} Mos</span>`;

              let dueStr = (typeof formatScheduledBillDue === 'function') ? formatScheduledBillDue(b, null, appState.currentYear) : (b.frequency === 'yearly' ? `${b.month || 'Jan'} ${b.due_day || 1}` : `Day ${b.due_day || 1}`);

              const holidayRule = b.holiday_rule || (isInc ? 'previous' : 'following');
              let holidayBadge = '';
              if (holidayRule === 'previous') holidayBadge = '<span class="badge" style="background:rgba(16,185,129,0.15); color:var(--green); border:1px solid rgba(16,185,129,0.3); font-size:10px;">⬅️ Prev Workday</span>';
              else if (holidayRule === 'following') holidayBadge = '<span class="badge" style="background:rgba(56,189,248,0.15); color:var(--curr-border); border:1px solid rgba(56,189,248,0.3); font-size:10px;">➡️ Next Workday</span>';
              else holidayBadge = '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted); border:1px solid rgba(148,163,184,0.3); font-size:10px;">⏸️ Exact Date</span>';

              return `
                <tr style="${isInc ? 'background:rgba(16,185,129,0.02);' : ''}">
                  <td>
                    ${globalEditMode ? `
                      <input class="table-input" type="text" value="${b.desc}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'desc', this.value)" style="font-weight:600;">
                    ` : `
                      <strong style="color:var(--heading); font-size:13px;">${isInc ? '📥 ' : ''}${b.desc}</strong>
                    `}
                  </td>
                  <td>
                    <div style="display:flex; align-items:center; gap:2px; flex-wrap:wrap;">
                      ${flowBadge} ${cadenceBadge}
                    </div>
                  </td>
                  <td>
                    ${globalEditMode ? (
                      b.frequency === 'monthly' ? `
                        <input class="table-input" type="number" min="1" max="31" value="${b.due_day || 1}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'due_day', parseInt(this.value, 10))" style="width:70px;">
                      ` : b.frequency === 'yearly' ? `
                        <div style="display:flex; gap:4px; align-items:center;">
                          <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'month', this.value)" style="width:65px;">
                            ${months.map(m => `<option value="${m}" ${m === (b.month || 'Jan') ? 'selected' : ''}>${m}</option>`).join('')}
                          </select>
                          <input class="table-input" type="number" min="1" max="31" value="${b.due_day || 1}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'due_day', parseInt(this.value, 10))" style="width:50px;">
                        </div>
                      ` : (b.source_type === 'recurring_payment' || b.source_type === 'recurring_income') ? `
                        <input class="table-input" type="date" value="${b.start_date || ''}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'start_date', this.value)" style="width:125px; font-size:11px;">
                      ` : `<span style="font-size:12px; color:var(--text-muted);">${dueStr}</span>`
                    ) : `
                      <span style="font-size:12px; color:var(--text-muted); font-weight:500;">${dueStr}</span>
                    `}
                  </td>
                  <td class="text-right">
                    ${globalEditMode ? `
                      <input class="table-input text-right" type="number" step="0.01" value="${b.amount}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'amount', parseFloat(this.value))" style="width:95px; font-weight:bold; color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">
                    ` : `
                      <strong style="color:${isInc ? 'var(--green)' : 'var(--curr-border)'}; font-size:13px;">${isInc ? '+' : '-'}${curr}${Number(b.amount || 0).toFixed(2)}</strong>
                    `}
                  </td>
                  <td>
                    ${globalEditMode ? `
                      <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'account', this.value)">
                        <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${b.account === a ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
                        ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${b.account === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
                        ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
                      </select>
                    ` : `
                      <span style="font-size:12px;">${b.account || cfg.current_accounts[0]}</span>
                    `}
                  </td>
                  <td>
                    ${globalEditMode ? `
                      <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'holiday_rule', this.value)" style="font-size:11px;">
                        <option value="previous" ${holidayRule === 'previous' ? 'selected' : ''}>⬅️ Previous Workday (Friday)</option>
                        <option value="following" ${holidayRule === 'following' ? 'selected' : ''}>➡️ Following Workday (Monday)</option>
                        <option value="exact" ${holidayRule === 'exact' ? 'selected' : ''}>⏸️ Exact Date (No Shift)</option>
                      </select>
                    ` : holidayBadge}
                  </td>
                  <td>
                    ${!isInc ? (
                      globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'transfer_to', this.value)">
                          <option value="none" ${(!b.transfer_to || b.transfer_to === 'none') ? 'selected' : ''}>None (Expense)</option>
                          ${(cfg.savings_accounts || []).map(s => `<option value="${s}" ${b.transfer_to === s ? 'selected' : ''}>📈 ${s}</option>`).join('')}
                        </select>
                      ` : (b.transfer_to && b.transfer_to !== 'none' ? `
                        <span style="color:var(--purple); font-weight:600; font-size:12px;">📈 ${b.transfer_to}</span>
                      ` : `
                        <span style="color:var(--text-muted); font-size:11px;">-</span>
                      `)
                    ) : `<span style="color:var(--text-muted); font-size:11px;">-</span>`}
                  </td>
                  <td class="text-right">
                    <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteUnifiedScheduledBill('${b.source_type}', ${b.source_idx}, '${activeFilter}')" title="Delete">&times;</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD NEW SCHEDULED ITEM PANEL -->
    <div id="add-bill-panel" class="panel">
      <div style="margin-bottom:12px;">
        <h3 id="add-panel-title" style="margin:0; font-size:16px; color:var(--curr-border);">+ Add Scheduled Bill or Payment In</h3>
        <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">Create recurring outgoings (Direct Debits, bills) or incoming payments (Salaries, side income, pensions) with automatic weekend and holiday adjustments.</p>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
        <!-- TYPE: OUTGOING vs INCOME -->
        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Flow Type</label>
          <select id="new-sched-type" onchange="window.budgetApp.onScheduledTypeChange(this.value)" style="width:100%; margin-top:3px; font-weight:600;">
            <option value="outgoing" selected>💸 Scheduled Outgoing (Bill / Direct Debit)</option>
            <option value="income">💰 Scheduled Inflow (Payment In / Income)</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Description / Payer</label>
          <input type="text" id="new-sched-desc" placeholder="e.g. Salary, Rent, Child Benefit, Cleaner, Gym" style="width:100%; margin-top:3px;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Amount (${curr})</label>
          <input type="number" step="0.01" id="new-sched-amt" placeholder="100.00" style="width:100%; margin-top:3px;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Frequency</label>
          <select id="new-sched-freq" onchange="window.budgetApp.onFullScheduledFreqChange(this.value)" style="width:100%; margin-top:3px;">
            <option value="monthly" selected>📅 Monthly</option>
            <option value="weekly">🔄 Weekly</option>
            <option value="biweekly">🔄 Bi-Weekly (Every 2 Weeks)</option>
            <option value="four_weekly">🗓️ 4-Weekly (Every 4 Weeks)</option>
            <option value="quarterly">🗓️ Quarterly (Every 3 Months)</option>
            <option value="yearly">🎉 Annual</option>
            <option value="custom_weeks">⚙️ Custom (Every N Weeks)</option>
            <option value="custom_months">⚙️ Custom (Every N Months)</option>
          </select>
        </div>

        <div id="new-sched-day-box">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Due Day of Month (1-31)</label>
          <input type="number" min="1" max="31" id="new-sched-due-day" value="1" style="width:100%; margin-top:3px;">
        </div>

        <div id="new-sched-start-box" style="display:none;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Start From Date</label>
          <input type="date" id="new-sched-start-date" value="${todayIso}" min="${appState.currentYear}-01-01" max="${Number(appState.currentYear) + 5}-12-31" style="width:100%; margin-top:3px;">
        </div>

        <div id="new-sched-month-box" style="display:none;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Target Month</label>
          <select id="new-sched-month" style="width:100%; margin-top:3px;">
            ${months.map(m => `<option value="${m}" ${m === activeTab ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>

        <div id="new-sched-interval-box" style="display:none;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Interval Step (N)</label>
          <input type="number" min="1" max="52" id="new-sched-interval" value="2" style="width:100%; margin-top:3px;">
        </div>

        <div>
          <label id="new-sched-acc-label" style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Account</label>
          <select id="new-sched-acc" style="width:100%; margin-top:3px;">
            <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
            ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
            ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
          </select>
        </div>

        <!-- WEEKEND / HOLIDAY RULE -->
        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Weekend / Bank Holiday Rule</label>
          <select id="new-sched-holiday-rule" style="width:100%; margin-top:3px;">
            <option value="previous">⬅️ Move to Previous Workday (Friday before)</option>
            <option value="following" selected>➡️ Move to Following Workday (Monday after)</option>
            <option value="exact">⏸️ Exact Date (No adjustment)</option>
          </select>
        </div>

        <!-- TRANSFER DESTINATION (FOR OUTGOINGS) -->
        <div id="new-sched-transfer-box">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Transfer Destination (Optional)</label>
          <select id="new-sched-transfer" style="width:100%; margin-top:3px;">
            <option value="none">None (Expense)</option>
            ${(cfg.savings_accounts || []).map(s => `<option value="${s}">📈 ${s} (Savings Transfer)</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn green" style="padding:6px 20px;" onclick="window.budgetApp.confirmAddFullScheduledBill()">Save Scheduled Item</button>
      </div>
    </div>
  `;
}
