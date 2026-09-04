import { detectBudgetCategory } from '../calculations.js';
import { appState, getSettings, getYearData, getBirthdays, getMasterYearlyBudgets, months, getCurrentPeriodMonthAndYear } from '../state.js';

export function renderBudgetsView(container) {
  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;
  const budgets = (typeof getMasterYearlyBudgets === 'function') ? getMasterYearlyBudgets() : (yData.yearly_budgets || []);
  const birthdays = getBirthdays(appState.currentYear);
  const globalEditMode = appState.globalEditMode;
  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const curYear = now.getFullYear();
  const todayIso = `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calculate Birthday Stats & Counts across 365-day rolling horizon
  let totalBirthdayBudget = 0;
  let totalBirthdaySpent = 0;
  let soonBirthdaysCount = 0;
  let next90Count = 0;
  let next365Count = 0;
  let recentlyPassedCount = 0;

  const enrichedBirthdays = birthdays.map((b, idx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) mIdx = 0;
    const dayNum = parseInt(b.day || 1, 10);

    // Next occurrence within next 365 days
    const thisYearDate = new Date(curYear, mIdx, dayNum, 0, 0, 0);
    const nextDate = (thisYearDate >= todayZero) ? thisYearDate : new Date(curYear + 1, mIdx, dayNum, 0, 0, 0);
    const diffDays = Math.round((nextDate - todayZero) / (1000 * 60 * 60 * 24));

    // Previous occurrence for recently passed filter
    const prevDate = (thisYearDate < todayZero) ? thisYearDate : new Date(curYear - 1, mIdx, dayNum, 0, 0, 0);
    const daysAgo = Math.round((todayZero - prevDate) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 30) soonBirthdaysCount++;
    if (diffDays >= 0 && diffDays <= 90) next90Count++;
    if (diffDays >= 0 && diffDays <= 365) next365Count++;
    if (daysAgo >= 0 && daysAgo <= 30) recentlyPassedCount++;

    const bSpent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const bBudget = Number(b.budget_amount) || 0;
    totalBirthdayBudget += bBudget;
    totalBirthdaySpent += bSpent;

    return {
      ...b,
      originalIdx: idx,
      nextDate,
      diffDays,
      daysAgo,
      spent: bSpent,
      remaining: bBudget - bSpent,
      pct: Math.min(100, Math.round((bSpent / (bBudget || 1)) * 100))
    };
  });

  // Sort birthdays chronologically by diffDays (next occurrence first)
  enrichedBirthdays.sort((a, b) => a.diffDays - b.diffDays);

  // Filter birthdays by active filter (all, soon, 90days, 365days, past)
  const activeBirthdayFilter = appState.birthdayFilter || 'all';
  let filteredBirthdays = enrichedBirthdays;
  if (activeBirthdayFilter === 'soon') {
    filteredBirthdays = enrichedBirthdays.filter(b => b.diffDays >= 0 && b.diffDays <= 30);
  } else if (activeBirthdayFilter === '90days') {
    filteredBirthdays = enrichedBirthdays.filter(b => b.diffDays >= 0 && b.diffDays <= 90);
  } else if (activeBirthdayFilter === '365days') {
    filteredBirthdays = enrichedBirthdays.filter(b => b.diffDays >= 0 && b.diffDays <= 365);
  } else if (activeBirthdayFilter === 'past') {
    filteredBirthdays = enrichedBirthdays.filter(b => b.daysAgo >= 0 && b.daysAgo <= 30);
  }

  let html = `
    <!-- TOP HEADER -->
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin:0; font-size:20px;">🎯 Budgets & Occasions</h2>
          <p style="color:var(--text-muted); font-size:12px; margin:4px 0 0 0;">Track recurring birthdays and celebrations across a rolling 365-day horizon, plus cross-year sinking funds and milestone project budgets.</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn green" onclick="window.budgetApp.openAddBirthdayModal()">🎂 Add Birthday or Occasion</button>
          <button class="btn" style="background:#3b82f6;" onclick="window.budgetApp.openAddBudgetModal()">🎯 Create Milestone Budget</button>
        </div>
      </div>
    </div>

    <!-- BIRTHDAYS & OCCASIONS SECTION -->
    <div class="panel" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0; font-size:16px; color:#f472b6;">🎂 Birthdays & Annual Occasions</h3>
          <span style="font-size:11px; color:var(--text-muted);">Occasions count down chronologically across a 365-day rolling timeline. Gift allocations automatically appear in their scheduled payday week.</span>
        </div>
        <button class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.openAddBirthdayModal()">+ Add Birthday or Occasion</button>
      </div>

      <!-- BIRTHDAY KPI SUMMARY -->
      <div class="mini-kpi-grid">
        <div class="mini-kpi-card" style="cursor:pointer;" onclick="window.budgetApp.setBirthdayFilter('all')" title="Click to view All occasions">
          <div class="mini-kpi-title">Total Gift Budget</div>
          <div class="mini-kpi-val">${curr}${totalBirthdayBudget.toFixed(2)}</div>
          <div class="mini-kpi-sub">${birthdays.length} Annual Occasions</div>
        </div>

        <div class="mini-kpi-card">
          <div class="mini-kpi-title">Total Gifts Spent</div>
          <div class="mini-kpi-val" style="color:var(--purple);">${curr}${totalBirthdaySpent.toFixed(2)}</div>
          <div class="mini-kpi-sub">${totalBirthdayBudget > 0 ? Math.round((totalBirthdaySpent / totalBirthdayBudget) * 100) : 0}% Allocated</div>
        </div>

        <div class="mini-kpi-card">
          <div class="mini-kpi-title">Remaining Gift Fund</div>
          <div class="mini-kpi-val" style="color:${(totalBirthdayBudget - totalBirthdaySpent) >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${(totalBirthdayBudget - totalBirthdaySpent).toFixed(2)}</div>
          <div class="mini-kpi-sub">Available to spend</div>
        </div>

        <div class="mini-kpi-card" style="cursor:pointer;" onclick="window.budgetApp.setBirthdayFilter('soon')" title="Click to filter Soon (next 30 days)">
          <div class="mini-kpi-title">Next 30 Days</div>
          <div class="mini-kpi-val" style="color:#f472b6;">${soonBirthdaysCount} Soon</div>
          <div class="mini-kpi-sub">Coming up soon</div>
        </div>
      </div>

      <!-- BIRTHDAYS FILTER BAR -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin: 14px 0 12px 0;">
        <div style="display:inline-flex; align-items:center; background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:2px; flex-wrap:wrap; gap:2px;">
          <button class="btn ${activeBirthdayFilter === 'all' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 10px; border:none;" onclick="window.budgetApp.setBirthdayFilter('all')" title="Show all birthdays & occasions">
            All (${enrichedBirthdays.length})
          </button>
          <button class="btn ${activeBirthdayFilter === 'soon' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 10px; border:none;" onclick="window.budgetApp.setBirthdayFilter('soon')" title="Show occasions occurring within the next 30 days">
            ⏳ Next 30 Days (${soonBirthdaysCount})
          </button>
          <button class="btn ${activeBirthdayFilter === '90days' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 10px; border:none;" onclick="window.budgetApp.setBirthdayFilter('90days')" title="Show occasions occurring within the next 90 days">
            📅 Next 90 Days (${next90Count})
          </button>
          <button class="btn ${activeBirthdayFilter === '365days' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 10px; border:none;" onclick="window.budgetApp.setBirthdayFilter('365days')" title="Show all occasions across next 365 days">
            🗓️ Next 365 Days (${next365Count})
          </button>
          <button class="btn ${activeBirthdayFilter === 'past' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 10px; border:none;" onclick="window.budgetApp.setBirthdayFilter('past')" title="Show occasions that passed recently (last 30 days)">
            ⏪ Passed Recently (${recentlyPassedCount})
          </button>
        </div>
        ${activeBirthdayFilter !== 'all' ? `
          <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.setBirthdayFilter('all')">
            ✕ Show All (${enrichedBirthdays.length})
          </button>
        ` : ''}
      </div>

      <!-- BIRTHDAYS GRID -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap:12px;">
        ${filteredBirthdays.length === 0 ? `
          <div style="grid-column:1/-1; padding:30px 20px; text-align:center; color:var(--text-muted); background:rgba(0,0,0,0.1); border-radius:8px; border:1px dashed var(--border);">
            <div style="font-size:24px; margin-bottom:6px;">🎂</div>
            <div style="font-size:13px; font-weight:600; color:var(--heading);">No occasions found for filter: "${activeBirthdayFilter.charAt(0).toUpperCase() + activeBirthdayFilter.slice(1)}"</div>
            <p style="font-size:11px; margin:4px 0 10px 0;">${activeBirthdayFilter === 'past' ? 'No occasions have passed in the last 30 days.' : activeBirthdayFilter === 'soon' ? 'No birthdays or occasions coming up in the next 30 days.' : 'No birthdays or occasions found.'}</p>
            <button class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.setBirthdayFilter('all')">Show All Occasions</button>
          </div>
        ` : filteredBirthdays.map(b => {
          let countdownBadge = '';
          if (b.diffDays === 0) countdownBadge = `<span class="badge" style="background:#ec4899; color:#fff; font-size:10px;">🎉 Today!</span>`;
          else if (b.diffDays === 1) countdownBadge = `<span class="badge" style="background:#f43f5e; color:#fff; font-size:10px;">🎂 Tomorrow!</span>`;
          else if (b.diffDays > 1 && b.diffDays <= 7) countdownBadge = `<span class="badge" style="background:#f43f5e; color:#fff; font-size:10px;">⏳ In ${b.diffDays} days!</span>`;
          else if (b.diffDays > 7 && b.diffDays <= 30) countdownBadge = `<span class="badge" style="background:#eab308; color:#000; font-size:10px;">📅 In ${b.diffDays} days</span>`;
          else if (b.diffDays > 30 && b.diffDays <= 90) countdownBadge = `<span class="badge" style="background:rgba(2,132,199,0.15); color:var(--curr-border); font-size:10px;">In ${b.diffDays} days</span>`;
          else countdownBadge = `<span style="font-size:11px; color:var(--text-muted);">In ${b.diffDays} days (${b.month} '${String(b.nextDate.getFullYear()).slice(2)})</span>`;

          return `
            <div class="account-card" style="display:flex; flex-direction:column; justify-content:space-between; border-left:3px solid #ec4899;">
              <div>
                <div class="account-card-header" style="margin-bottom:6px;">
                  <div>
                    <strong style="color:var(--heading); font-size:14px;">🎂 ${b.name}</strong>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                      📅 <strong>${b.day} ${b.month}</strong> &bull; Next: <strong>${b.day} ${b.month} ${b.nextDate.getFullYear()}</strong> &bull; Paid: ${b.account || cfg.current_accounts[0]}
                    </div>
                  </div>
                  <div>${countdownBadge}</div>
                </div>

                <!-- PROGRESS BAR -->
                <div style="margin:8px 0;">
                  <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px;">
                    <span>Spent: <strong>${curr}${b.spent.toFixed(2)}</strong></span>
                    <span>Budget: <strong>${curr}${(Number(b.budget_amount) || 0).toFixed(2)}</strong></span>
                  </div>
                  <div class="progress-bar-bg" style="height:6px; background:var(--border); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${b.pct}%; background:${b.pct > 100 ? 'var(--red)' : '#ec4899'}; transition:width 0.3s ease;"></div>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:3px;">
                    <span>${b.pct}% Spent</span>
                    <span style="color:${b.remaining >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">Remaining: ${curr}${b.remaining.toFixed(2)}</span>
                  </div>
                </div>

                <!-- LOGGED GIFT SPENDS LIST -->
                ${(b.transactions && b.transactions.length > 0) ? `
                  <div style="margin-top:8px; border-top:1px dashed var(--border); padding-top:6px;">
                    <div style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted); margin-bottom:4px;">Logged Gift Purchases:</div>
                    <div style="display:flex; flex-direction:column; gap:4px; max-height:80px; overflow-y:auto;">
                      ${b.transactions.map((tx, txIdx) => `
                        <div style="display:flex; justify-content:space-between; font-size:11px; background:var(--panel-bg); padding:3px 6px; border-radius:4px;">
                          <span>🎁 ${tx.desc} <span style="font-size:9px; color:var(--text-muted);">(${tx.date || ''})</span></span>
                          <div style="display:flex; align-items:center; gap:6px;">
                            <strong>${curr}${Number(tx.amount).toFixed(2)}</strong>
                            <button class="del-btn" style="height:16px; width:16px; font-size:10px; line-height:14px;" onclick="event.stopPropagation(); window.budgetApp.deleteBirthdaySpend(${b.originalIdx}, ${txIdx})">&times;</button>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- ACTIONS -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; border-top:1px solid var(--border); padding-top:8px;">
                <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.openAddBirthdaySpendModal(${b.originalIdx})">+ Log Gift Spend</button>
                <div style="display:flex; gap:6px;">
                  <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.openEditBirthdayModal(${b.originalIdx})">✏️ Edit</button>
                  <button class="btn red" style="font-size:11px; padding:3px 6px;" onclick="event.stopPropagation(); window.budgetApp.deleteBirthday(${b.originalIdx})">🗑️</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- MAJOR ANNUAL BUDGETS SECTION -->
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0; font-size:16px; color:#38bdf8;">🎯 Milestone Budgets & Sinking Funds</h3>
          <span style="font-size:11px; color:var(--text-muted);">Holidays, renovations, and large discretionary projects with cross-year target dates and automated monthly pacing.</span>
        </div>
        <button class="btn green" onclick="window.budgetApp.openAddBudgetModal()">+ Create Milestone Budget</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px;">
        ${budgets.length === 0 ? '<p style="font-size:12px; color:var(--text-muted); font-style:italic;">No milestone budgets created yet. Click "+ Create Milestone Budget" above to get started.</p>' : budgets.map((b, bIdx) => {
          const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
          const remaining = (Number(b.total_budget) || 0) - spent;
          const pct = Math.min(100, Math.round((spent / (Number(b.total_budget) || 1)) * 100));
          const strategy = b.deduction_strategy || 'none';
          const bCatId = b.category || (typeof detectBudgetCategory === 'function' ? detectBudgetCategory(b.name) : null) || 'shopping';
          const spendCats = (window.SPEND_CATEGORIES || []);
          const catObj = spendCats.find(c => c.id === bCatId) || { label: 'Shopping', icon: '🛍️', color: '#ec4899' };

          // Cross-year monthly pacing calculation
          const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function') ? getCurrentPeriodMonthAndYear() : { year: now.getFullYear(), monthIdx: now.getMonth() };
          const curTotalM = Number(curPeriod.year) * 12 + curPeriod.monthIdx;
          const targetDate = b.end_date ? new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T00:00:00') : new Date(Number(curPeriod.year), 11, 31);
          const targetTotalM = targetDate.getFullYear() * 12 + targetDate.getMonth();
          const totalRemainingMonths = Math.max(1, targetTotalM - curTotalM + 1);
          const monthlyPace = (remaining > 0) ? (remaining / totalRemainingMonths) : 0;

          return `
            <div class="account-card" style="display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div class="account-card-header" style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                  ${globalEditMode ? `
                    <div style="display:flex; gap:6px; align-items:center; width:100%;">
                      <input type="text" value="${b.name}" onchange="window.budgetApp.editYearlyBudgetField(${bIdx}, 'name', this.value)" style="font-weight:bold; font-size:14px; flex:1;" placeholder="Budget Name">
                      <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteBudget(${bIdx})" title="Delete entire budget">&times;</button>
                    </div>
                  ` : `
                    <strong style="color:var(--heading); font-size:14px;">🎯 ${b.name}</strong>
                    <span class="badge" style="background:rgba(255,255,255,0.06); border:1px solid ${catObj.color}60; color:${catObj.color}; font-size:10px; padding:2px 7px; font-weight:600;">${catObj.icon} ${catObj.label}</span>
                  `}
                </div>

                <div class="account-row" style="margin-bottom:4px;">
                  <span>Spend Category:</span>
                  ${globalEditMode ? `
                    <select onchange="window.budgetApp.editYearlyBudgetField(${bIdx}, 'category', this.value)" style="font-size:11px; padding:2px 4px; max-width:180px;">
                      ${spendCats.filter(c => c.id !== 'general').map(c => `<option value="${c.id}" ${bCatId === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`).join('')}
                    </select>
                  ` : `
                    <span style="font-size:11px; color:${catObj.color}; font-weight:600;">${catObj.icon} ${catObj.label}</span>
                  `}
                </div>

                <div class="account-row" style="margin-bottom:4px;">
                  <span>Funding Account:</span>
                  ${globalEditMode ? `
                    <select onchange="window.budgetApp.editYearlyBudgetField(${bIdx}, 'account', this.value)" style="font-size:11px; padding:2px 4px; max-width:180px;">
                      <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${b.account === a ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
                      ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${b.account === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
                      ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
                    </select>
                  ` : `
                    <strong>${b.account || cfg.current_accounts[0]}</strong>
                  `}
                </div>

                <div class="account-row" style="margin-bottom:6px;">
                  <span>Target Date:</span>
                  ${globalEditMode ? `
                    <input type="date" value="${b.end_date || `${appState.currentYear}-12-31`}" min="${appState.currentYear}-01-01" max="${Number(appState.currentYear) + 5}-12-31" onchange="window.budgetApp.editYearlyBudgetField(${bIdx}, 'end_date', this.value)" style="font-size:11px; padding:2px 4px; width:130px;">
                  ` : `
                    <span style="font-size:12px; color:var(--text-muted); font-weight:600;">${b.end_date || 'Year-End'}</span>
                  `}
                </div>

                <!-- DYNAMIC PACING BADGE -->
                ${strategy === 'monthly_spread' ? `
                  <div class="account-row" style="margin-bottom:6px;">
                    <span>Monthly Pacing:</span>
                    <span class="badge" style="background:rgba(56,189,248,0.15); color:var(--curr-border); border:1px solid rgba(56,189,248,0.3); font-size:11px; font-weight:600;">
                      📊 ${curr}${monthlyPace.toFixed(2)} / mo (${totalRemainingMonths} mos remaining)
                    </span>
                  </div>
                ` : (strategy === 'target_date' ? `
                  <div class="account-row" style="margin-bottom:6px;">
                    <span>Lump-Sum Target:</span>
                    <span class="badge" style="background:rgba(168,85,247,0.15); color:var(--purple); border:1px solid rgba(168,85,247,0.3); font-size:11px;">
                      🎯 Deducted on ${b.end_date || 'Target Date'}
                    </span>
                  </div>
                ` : '')}

                <!-- PROGRESS BAR -->
                <div style="margin:10px 0;">
                  <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px;">
                    <span>Spent: <strong>${curr}${spent.toFixed(2)}</strong></span>
                    ${globalEditMode ? `
                      <span style="display:flex; align-items:center; gap:2px;">
                        Allocated: ${curr}<input type="number" step="0.01" value="${b.total_budget || 0}" onchange="window.budgetApp.editYearlyBudgetField(${bIdx}, 'total_budget', this.value)" style="width:75px; padding:1px 4px; font-size:11px; font-weight:bold; text-align:right;">
                      </span>
                    ` : `
                      <span>Allocated: <strong>${curr}${(Number(b.total_budget) || 0).toFixed(2)}</strong></span>
                    `}
                  </div>
                  <div class="progress-bar-bg" style="height:6px; background:var(--border); border-radius:4px; overflow:hidden;">
                    <div class="progress-bar-fill" style="height:100%; width:${pct}%; background:${pct > 100 ? 'var(--red)' : (pct > 80 ? 'var(--amber)' : 'var(--primary)')}; transition:width 0.3s ease;"></div>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:3px;">
                    <span>${pct}% Spent</span>
                    <span style="color:${remaining >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">Remaining: ${curr}${remaining.toFixed(2)}</span>
                  </div>
                </div>

                <!-- DEDUCTION STRATEGY -->
                <div class="account-row" style="margin-top:6px; border-top:1px dashed var(--border); padding-top:6px; font-size:11px;">
                  <label style="color:var(--text-muted);">Deduction Strategy:</label>
                  <select onchange="window.budgetApp.updateBudgetStrategy(${bIdx}, this.value)" style="font-size:11px; padding:2px 4px;">
                    <option value="none" ${strategy === 'none' ? 'selected' : ''}>Transactions Only</option>
                    <option value="monthly_spread" ${strategy === 'monthly_spread' ? 'selected' : ''}>Spread Monthly (Sinking Fund)</option>
                    <option value="target_date" ${strategy === 'target_date' ? 'selected' : ''}>Deduct on Target Date</option>
                  </select>
                </div>

                <!-- TRANSACTIONS LIST -->
                <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="font-size:11px; text-transform:uppercase; color:var(--text-muted);">Logged Spends (${(b.transactions || []).length}):</strong>
                    <button class="btn secondary" style="font-size:10px; padding:2px 6px;" onclick="window.budgetApp.addBudgetTransaction(${bIdx})">+ Add Spend</button>
                  </div>

                  <div style="max-height:120px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
                    ${(!b.transactions || b.transactions.length === 0) ? '<p style="font-size:11px; color:var(--text-muted); margin:0;">No spends recorded yet.</p>' : b.transactions.map((tx, txIdx) => `
                      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; background:var(--panel-bg); padding:4px 8px; border-radius:4px;">
                        <div>
                          <span>${tx.desc}</span>
                          <span style="font-size:9px; color:var(--text-muted); margin-left:4px;">(${tx.date || 'No Date'})</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                          <strong>${curr}${Number(tx.amount).toFixed(2)}</strong>
                          <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteBudgetTransaction(${bIdx}, ${txIdx})" style="height:16px; width:16px; font-size:10px; line-height:14px;">&times;</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}
