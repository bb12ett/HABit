import { appState, getSettings, isMultiUserEnabled } from '../state.js';
import { SPEND_CATEGORIES, calculateCategoryBreakdown } from '../calculations.js';
import { renderCategoryDonutChart } from '../charts.js';

export function renderSpendAnalyticsView(container) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const isMulti = isMultiUserEnabled();
  const allTxns = appState.data?.open_banking_transactions || [];
  const customRules = cfg.merchant_category_rules || {};

  const timeframe = appState.spendFilterTimeframe || 'this_month';
  const accountFilter = appState.spendFilterAccount || 'all';
  const categoryFilter = appState.spendFilterCategory || 'all';
  const searchQuery = (appState.spendSearchQuery || '').toLowerCase().trim();
  const activeUser = isMulti ? (appState.activeUser || 'Joint') : 'all';

  const breakdown = calculateCategoryBreakdown(allTxns, timeframe, accountFilter, activeUser, customRules);
  const { categoryList, topMerchants, grandTotal, transactionCount, startDate, endDate } = breakdown;

  let displayTxns = breakdown.filteredTransactions;
  if (categoryFilter !== 'all') {
    displayTxns = displayTxns.filter(t => t.assignedCategory?.id === categoryFilter);
  }
  if (searchQuery) {
    displayTxns = displayTxns.filter(t => {
      const p = (t.payee_name || '').toLowerCase();
      const r = (t.raw_info || '').toLowerCase();
      const a = (t.account_name || '').toLowerCase();
      const amt = String(Math.abs(Number(t.amount || 0)));
      return p.includes(searchQuery) || r.includes(searchQuery) || a.includes(searchQuery) || amt.includes(searchQuery);
    });
  }

  const now = new Date();
  const sDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const eDate = endDate || now;
  const dayCount = Math.max(1, Math.round((Math.min(now.getTime(), eDate.getTime()) - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailySpend = grandTotal / dayCount;

  const topCat = categoryList.length > 0 ? categoryList[0] : null;

  const linkedAccounts = cfg.open_banking?.linked_accounts || [];
  const distinctAccounts = Array.from(new Set([
    ...(cfg.current_accounts || []),
    ...(cfg.credit_accounts || []).map(ca => typeof ca === 'string' ? ca : ca.name),
    ...allTxns.map(t => t.account_name).filter(Boolean)
  ]));

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
          <!-- Timeframe selector -->
          <div style="display:flex; align-items:center; background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:2px;">
            <button class="btn ${timeframe === 'active_week' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 9px; border:none;" onclick="window.budgetApp.setSpendAnalyticsTimeframe('active_week')">This Week</button>
            <button class="btn ${timeframe === 'this_month' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 9px; border:none;" onclick="window.budgetApp.setSpendAnalyticsTimeframe('this_month')">This Month</button>
            <button class="btn ${timeframe === 'last_month' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 9px; border:none;" onclick="window.budgetApp.setSpendAnalyticsTimeframe('last_month')">Last Month</button>
            <button class="btn ${timeframe === 'last_30_days' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 9px; border:none;" onclick="window.budgetApp.setSpendAnalyticsTimeframe('last_30_days')">Last 30 Days</button>
            <button class="btn ${timeframe === 'year_to_date' ? 'green' : 'secondary'}" style="font-size:11px; padding:4px 9px; border:none;" onclick="window.budgetApp.setSpendAnalyticsTimeframe('year_to_date')">Full Year</button>
          </div>

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
    </div>

    <!-- KPI METRICS SUMMARY -->
    <div class="kpi-grid" style="margin-bottom:16px;">
      <div class="kpi-card">
        <div class="kpi-label">Total Outgoings (${timeframe === 'active_week' ? 'Week' : timeframe === 'last_30_days' ? '30 Days' : 'Month'})</div>
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
          <span style="font-size:11px; color:var(--text-muted);">Showing ${displayTxns.length} transactions</span>
        </div>

        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <!-- Category Filter -->
          <select onchange="window.budgetApp.setSpendCategoryFilter(this.value)" style="font-size:11.5px; padding:4px 8px; border-radius:6px;">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${SPEND_CATEGORIES.map(cat => `<option value="${cat.id}" ${categoryFilter === cat.id ? 'selected' : ''}>${cat.icon} ${cat.label}</option>`).join('')}
          </select>

          <!-- Search Input -->
          <div style="position:relative;">
            <input type="text" placeholder="🔍 Search merchant..." value="${appState.spendSearchQuery || ''}" oninput="window.budgetApp.setSpendSearchQuery(this.value)" style="font-size:11.5px; padding:4px 8px; width:160px; border-radius:6px;">
            ${appState.spendSearchQuery ? `<button style="position:absolute; right:4px; top:4px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:11px;" onclick="window.budgetApp.setSpendSearchQuery('')">&times;</button>` : ''}
          </div>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%; font-size:12px;">
          <thead>
            <tr>
              <th style="width:90px;">Date</th>
              <th>Payee / Merchant</th>
              <th>Account</th>
              ${isMulti ? '<th style="width:80px;">Owner</th>' : ''}
              <th style="width:170px;">Category</th>
              <th class="text-right" style="width:100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${displayTxns.length > 0 ? displayTxns.map(t => {
              const cat = t.assignedCategory || SPEND_CATEGORIES[SPEND_CATEGORIES.length - 1];
              const merchantDisp = t.merchant_name || t.payee_name || t.description || t.raw_info || 'Transaction';
              const cleanAttr = merchantDisp.replace(/"/g, '&quot;');
              return `
                <tr>
                  <td style="color:var(--text-muted); white-space:nowrap; font-size:11.5px;">${t.booking_date}</td>
                  <td>
                    <strong style="color:var(--heading); font-size:12.5px;">${merchantDisp}</strong>
                    ${t.raw_info && t.raw_info !== merchantDisp ? `<div style="font-size:10px; color:var(--text-muted); opacity:0.8;">${t.raw_info}</div>` : ''}
                  </td>
                  <td style="color:var(--text-muted); font-size:11.5px;">${t.account_name || 'Account'}</td>
                  ${isMulti ? `<td style="font-size:11px; color:var(--text-muted);">${t.owner || 'Joint'}</td>` : ''}
                  <td>
                    <button class="badge" style="background:rgba(255,255,255,0.06); border:1px solid ${cat.color}60; color:${cat.color}; font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600;" onclick="window.budgetApp.openRecategorizeModal(this.dataset.txnid, this.dataset.payee, this.dataset.catid)" data-txnid="${t.transaction_id}" data-payee="${cleanAttr}" data-catid="${cat.id}" title="Click to change category or create custom rule">
                      <span>${cat.icon}</span>
                      <span>${cat.label}</span>
                      <span style="font-size:9px; opacity:0.7;">▾</span>
                    </button>
                  </td>
                  <td class="text-right" style="font-weight:700; color:${t.amount < 0 ? 'var(--red)' : 'var(--green)'}; font-size:12.5px; white-space:nowrap;">
                    ${t.amount < 0 ? '-' : '+'}${curr}${Math.abs(Number(t.amount || 0)).toFixed(2)}
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="${isMulti ? 6 : 5}" style="text-align:center; padding:30px; color:var(--text-muted);">
                  No transactions found matching the selected filters.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    const canvas = document.getElementById('spendCategoryDonutCanvas');
    if (canvas) {
      renderCategoryDonutChart(canvas, categoryList, curr);
    }
  }, 50);
}

if (typeof window !== 'undefined') {
  window.renderSpendAnalyticsView = renderSpendAnalyticsView;
}
