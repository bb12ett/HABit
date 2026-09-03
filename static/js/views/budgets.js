import { detectBudgetCategory } from '../calculations.js';
import { appState, getSettings, getYearData, getBirthdays, months } from '../state.js';

export function renderBudgetsView(container) {
  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;
  const budgets = yData.yearly_budgets || [];
  const birthdays = getBirthdays(appState.currentYear);
  const globalEditMode = appState.globalEditMode;
  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calculate Birthday Stats & Counts
  let totalBirthdayBudget = 0;
  let totalBirthdaySpent = 0;
  let soonBirthdaysCount = 0;
  let upcomingBirthdaysCount = 0;
  let pastBirthdaysCount = 0;

  const nowTime = now.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const enrichedBirthdays = birthdays.map((b, idx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) mIdx = 0;
    const bDate = new Date(appState.currentYear, mIdx, parseInt(b.day || 1, 10));
    const bTime = bDate.getTime();
    const diffDays = Math.ceil((bTime - nowTime) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) soonBirthdaysCount++;
    if (diffDays >= 0) upcomingBirthdaysCount++;
    if (diffDays < 0) pastBirthdaysCount++;

    const bSpent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const bBudget = Number(b.budget_amount) || 0;
    totalBirthdayBudget += bBudget;
    totalBirthdaySpent += bSpent;

    return {
      ...b,
      originalIdx: idx,
      dateObj: bDate,
      diffDays,
      spent: bSpent,
      remaining: bBudget - bSpent,
      pct: Math.min(100, Math.round((bSpent / (bBudget || 1)) * 100))
    };
  });

  // Sort birthdays chronologically by date in year
  enrichedBirthdays.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Filter birthdays by active filter (all, soon, upcoming, past)
  const activeBirthdayFilter = appState.birthdayFilter || 'soon';
  let filteredBirthdays = enrichedBirthdays;
  if (activeBirthdayFilter === 'soon') {
    filteredBirthdays = enrichedBirthdays.filter(b => b.diffDays >= 0 && b.diffDays <= 30);
  } else if (activeBirthdayFilter === 'upcoming') {
    filteredBirthdays = enrichedBirthdays.filter(b => b.diffDays >= 0);
  } else if (activeBirthdayFilter === 'past') {
    filteredBirthdays = enrichedBirthdays.filter(b => b.diffDays < 0);
  }

  let html = `
    <!-- TOP HEADER -->
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin:0; font-size:20px;">🎯 Annual Budgets & Occasions (${appState.currentYear})</h2>
          <p style="color:var(--text-muted); font-size:12px; margin:4px 0 0 0;">Track major annual budget goals and recurring birthday & occasion gift funds with simulated cashflow.</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn green" onclick="window.budgetApp.openAddBirthdayModal()">🎂 Add Birthday or Occasion</button>
          <button class="btn" style="background:#3b82f6;" onclick="window.budgetApp.openAddBudgetModal()">🎯 Create Annual Budget</button>
        </div>
      </div>
    </div>

    <!-- BIRTHDAYS & OCCASIONS SECTION -->
    <div class="panel" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0; font-size:16px; color:#f472b6;">🎂 Birthdays & Annual Occasions</h3>
          <span style="font-size:11px; color:var(--text-muted);">Gift allocations automatically appear in their scheduled payday week.</span>
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
            ⏳ Soon (${soonBirthdaysCount})
          </button>
          <button class="btn ${activeBirthdayFilter === 'upcoming' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 10px; border:none;" onclick="window.budgetApp.setBirthdayFilter('upcoming')" title="Show all future occasions for this year">
            📅 Upcoming (${upcomingBirthdaysCount})
          </button>
          <button class="btn ${activeBirthdayFilter === 'past' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 10px; border:none;" onclick="window.budgetApp.setBirthdayFilter('past')" title="Show occasions that have already occurred this year">
            ⏪ Past (${pastBirthdaysCount})
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
            <p style="font-size:11px; margin:4px 0 10px 0;">${activeBirthdayFilter === 'past' ? 'No occasions have passed yet this year.' : activeBirthdayFilter === 'soon' ? 'No birthdays or occasions coming up in the next 30 days.' : 'No birthdays or occasions found.'}</p>
            <button class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.setBirthdayFilter('all')">Show All Occasions</button>
          </div>
        ` : filteredBirthdays.map(b => {
          let countdownBadge = '';
          if (b.diffDays === 0) countdownBadge = `<span class="badge" style="background:#ec4899; color:#fff; font-size:10px;">🎉 Today!</span>`;
          else if (b.diffDays > 0 && b.diffDays <= 7) countdownBadge = `<span class="badge" style="background:#f43f5e; color:#fff; font-size:10px;">⏳ In ${b.diffDays} days!</span>`;
          else if (b.diffDays > 7 && b.diffDays <= 30) countdownBadge = `<span class="badge" style="background:#eab308; color:#000; font-size:10px;">📅 In ${b.diffDays} days</span>`;
          else if (b.diffDays > 30) countdownBadge = `<span style="font-size:11px; color:var(--text-muted);">In ${b.diffDays} days</span>`;
          else countdownBadge = `<span style="font-size:10px; color:var(--text-muted);">Passed this year</span>`;

          return `
            <div class="account-card" style="display:flex; flex-direction:column; justify-content:space-between; border-left:3px solid #ec4899;">
              <div>
                <div class="account-card-header" style="margin-bottom:6px;">
                  <div>
                    <strong style="color:var(--heading); font-size:14px;">🎂 ${b.name}</strong>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">📅 <strong>${b.day} ${b.month}</strong> &bull; Paid From: ${b.account || cfg.current_accounts[0]}</div>
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
          <h3 style="margin:0; font-size:16px; color:#38bdf8;">🎯 Major Annual Budgets & Goals</h3>
          <span style="font-size:11px; color:var(--text-muted);">Holidays, renovations, and large discretionary projects.</span>
        </div>
        <button class="btn green" onclick="window.budgetApp.openAddBudgetModal()">+ Create Annual Budget</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px;">
        ${budgets.length === 0 ? '<p style="font-size:12px; color:var(--text-muted); font-style:italic;">No annual budgets created yet. Click "+ Create Annual Budget" above to get started.</p>' : budgets.map((b, bIdx) => {
          const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
          const remaining = (Number(b.total_budget) || 0) - spent;
          const pct = Math.min(100, Math.round((spent / (Number(b.total_budget) || 1)) * 100));
          const strategy = b.deduction_strategy || 'none';
          const bCatId = b.category || (typeof detectBudgetCategory === 'function' ? detectBudgetCategory(b.name) : null) || 'shopping';
          const spendCats = (window.SPEND_CATEGORIES || []);
          const catObj = spendCats.find(c => c.id === bCatId) || { label: 'Shopping', icon: '🛍️', color: '#ec4899' };

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
                    <span style="font-size:12px; color:var(--text-muted);">${b.end_date || 'Year-End'}</span>
                  `}
                </div>

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
                    <option value="monthly_spread" ${strategy === 'monthly_spread' ? 'selected' : ''}>Spread Monthly</option>
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
