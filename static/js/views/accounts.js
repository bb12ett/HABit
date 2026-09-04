import { appState, getSettings, getMonthData, getAccountConfig, isMultiUserEnabled, getAccountOwner, isAccountVisibleToActiveUser, getCurrentPeriodMonthAndYear, months } from '../state.js';

export function renderAccountsView(container) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const activeTab = appState.activeTab;
  const globalEditMode = appState.globalEditMode;
  const mData = getMonthData(activeTab);
  const isMulti = isMultiUserEnabled();
  const cur = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: new Date().getFullYear(), monthIdx: new Date().getMonth() };
  const curTotalM = cur.year * 12 + cur.monthIdx;
  const isFutureMonth = (appState.currentYear * 12 + months.indexOf(activeTab)) > curTotalM;

  const visibleCurrentAccounts = isMulti ? cfg.current_accounts.filter(a => isAccountVisibleToActiveUser('current', a)) : cfg.current_accounts;
  const visibleCreditAccounts = isMulti ? cfg.credit_accounts.filter(c => isAccountVisibleToActiveUser('credit', c.name)) : cfg.credit_accounts;
  const visibleSavingsAccounts = isMulti ? cfg.savings_accounts.filter(s => isAccountVisibleToActiveUser('savings', s)) : cfg.savings_accounts;

  let html = `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0;">⚙️ Accounts & Opening Balances (${activeTab} ${appState.currentYear})</h3>
          <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">${isFutureMonth ? 'Opening balances in future months roll forward automatically from preceding cashflow.' : 'Balances roll forward automatically unless an override is set (leave blank to auto-rollover):'}</p>
        </div>
        <div>
          ${!isFutureMonth ? `
            <button class="btn secondary" style="font-size:12px;" onclick="window.budgetApp.toggleGlobalEditMode()">
              ${globalEditMode ? '✓ Done Editing' : '✏️ Edit Opening Balances'}
            </button>
          ` : `
            <span style="font-size:11px; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px;">🔄 Projected from previous month</span>
          `}
        </div>
      </div>
      
      <h4 style="color:var(--curr-border); font-size:13px; margin:14px 0 8px 0; text-transform:uppercase; letter-spacing:0.5px;">Current Accounts</h4>
      <div class="accounts-grid">
        ${visibleCurrentAccounts.map(acc => {
          const isEdited = mData.current_data[acc] && mData.current_data[acc].user_edited;
          const bal = (mData.current_data[acc] && mData.current_data[acc].opening !== undefined) ? mData.current_data[acc].opening : '';
          const owner = getAccountOwner('current', acc);
          return `
            <div class="account-card">
              <div class="account-card-header">
                <div>
                  <strong style="color:var(--curr-border); font-size:14px;">🏦 ${acc}</strong>
                  ${isMulti && owner ? `<span class="badge" style="font-size:9px; background:rgba(255,255,255,0.08); color:var(--text-muted); margin-left:4px;">${owner === 'Joint' ? '👥 Joint' : '👤 ' + owner}</span>` : ''}
                </div>
                ${isEdited ? '<span class="badge" style="font-size:9px; background:var(--curr-border); color:#fff;">Override</span>' : '<span style="font-size:10px; color:var(--text-muted);">Auto-Rollover</span>'}
              </div>
              <div class="account-row" style="margin-top:8px;">
                <label style="font-size:12px;">Opening Balance:</label>
                ${globalEditMode && !isFutureMonth ? `
                  <input type="number" step="0.01" placeholder="${bal !== '' && bal !== null ? 'Auto (' + curr + Number(bal).toFixed(2) + ')' : 'Auto'}" value="${isEdited ? bal : ''}" onchange="window.budgetApp.updateCurrentOpening('${acc}', this.value)" style="width:145px; text-align:right; font-weight:bold;">
                ` : `
                  <strong style="color:var(--heading); font-size:14px;">${curr}${Number(bal || 0).toFixed(2)}</strong>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <h4 style="color:var(--amber); font-size:13px; margin:20px 0 8px 0; text-transform:uppercase; letter-spacing:0.5px;">Credit Cards</h4>
      <div class="accounts-grid">
        ${visibleCreditAccounts.map(c => {
          const spent = (mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent !== undefined) ? mData.credit_data[c.name].opening_spent : '';
          const isEdited = mData.credit_data[c.name] && mData.credit_data[c.name].user_edited;
          const owner = getAccountOwner('credit', c.name);
          return `
            <div class="account-card">
              <div class="account-card-header">
                <div>
                  <strong style="color:var(--amber); font-size:14px;">💳 ${c.name}</strong>
                  ${isMulti && owner ? `<span class="badge" style="font-size:9px; background:rgba(255,255,255,0.08); color:var(--text-muted); margin-left:4px;">${owner === 'Joint' ? '👥 Joint' : '👤 ' + owner}</span>` : ''}
                </div>
                <span style="font-size:11px; color:var(--text-muted);">Limit: ${curr}${c.limit}</span>
              </div>
              <div class="account-row" style="margin-top:8px;">
                <label style="font-size:12px;">Opening Debt:</label>
                ${globalEditMode && !isFutureMonth ? `
                  <input type="number" step="0.01" placeholder="${spent !== '' && spent !== null ? 'Auto (' + curr + Number(spent).toFixed(2) + ')' : 'Auto'}" value="${isEdited ? spent : ''}" onchange="window.budgetApp.updateCreditOpening('${c.name}', this.value)" style="width:145px; text-align:right; color:var(--red); font-weight:bold;">
                ` : `
                  <strong style="color:var(--red); font-size:14px;">-${curr}${Number(spent || 0).toFixed(2)}</strong>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${cfg.track_savings ? `
        <h4 style="color:var(--purple); font-size:13px; margin:20px 0 8px 0; text-transform:uppercase; letter-spacing:0.5px;">Savings Accounts</h4>
        <div class="accounts-grid">
          ${visibleSavingsAccounts.map(accName => {
            const isEdited = mData.savings_data[accName] && mData.savings_data[accName].user_edited;
            const bal = (mData.savings_data[accName] && mData.savings_data[accName].opening !== undefined) ? mData.savings_data[accName].opening : '';
            const conf = (typeof getAccountConfig === 'function') ? getAccountConfig('savings', accName) : { savings_predict_mode: 'planned' };
            const owner = getAccountOwner('savings', accName);
            return `
              <div class="account-card">
                <div class="account-card-header">
                  <div>
                    <strong style="color:var(--purple); font-size:14px;">📈 ${accName}</strong>
                    ${isMulti && owner ? `<span class="badge" style="font-size:9px; background:rgba(255,255,255,0.08); color:var(--text-muted); margin-left:4px;">${owner === 'Joint' ? '👥 Joint' : '👤 ' + owner}</span>` : ''}
                  </div>
                  ${isEdited ? '<span class="badge" style="font-size:9px; background:var(--purple); color:#fff;">Override</span>' : '<span style="font-size:10px; color:var(--text-muted);">Auto-Rollover</span>'}
                </div>
                <div class="account-row" style="margin:8px 0;">
                  <label style="font-size:12px;">Opening Balance:</label>
                  ${globalEditMode && !isFutureMonth ? `
                    <input type="number" step="0.01" placeholder="${bal !== '' && bal !== null ? 'Auto (' + curr + Number(bal).toFixed(2) + ')' : 'Auto'}" value="${isEdited ? bal : ''}" onchange="window.budgetApp.updateAccountSaving('${accName}', this.value)" style="width:145px; text-align:right; font-weight:bold;">
                  ` : `
                    <strong style="color:var(--purple); font-size:14px;">${curr}${Number(bal || 0).toFixed(2)}</strong>
                  `}
                </div>
                <div class="account-row" style="border-top:1px dashed var(--border); padding-top:6px; font-size:11px;">
                  <label style="color:var(--text-muted);">Forecast Mode:</label>
                  <select onchange="window.budgetApp.setSavingsPredictMode('${accName}', this.value)" style="font-size:11px; padding:3px 6px; max-width:200px;">
                    <option value="planned" ${conf.savings_predict_mode !== 'actual' ? 'selected' : ''}>📈 Planned Cashflow</option>
                    <option value="actual" ${conf.savings_predict_mode === 'actual' ? 'selected' : ''}>🔄 Roll Forward from Actuals</option>
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;
}
