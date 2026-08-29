import { appState, getSettings, getYearData, getMonthData, getWeekItems, getAccountConfig, months, isMultiUserEnabled, getAccountOwner, getPersonPin, hasPersonPin, setPersonPin, unlockUser, isUserUnlocked, setActiveUser } from '../state.js';
import { calculateMonthSchedule, calculateAndSyncRollovers, detectCurrentMonthAndWeek } from '../calculations.js';
import { saveBudget } from '../api.js';

export function showModal(opts) {
  const fab = document.getElementById('fabContainer');
  if (fab) fab.classList.remove('open');

  const modal = document.getElementById('genericModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const actions = document.getElementById('modalActions');
  if (!modal || !title || !body || !actions) return;

  title.innerText = opts.title || 'Modal';
  body.innerHTML = opts.body || '';
  actions.innerHTML = opts.actions || `<button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>`;
  modal.style.display = 'flex';
}

export function closeModal() {
  const modal = document.getElementById('genericModal');
  if (modal) modal.style.display = 'none';
  window.pendingModalAction = null;
}

export function openDateOverrideModal(mName, onComplete) {
  const mIdx = months.indexOf(mName);
  const sched = calculateMonthSchedule(appState.currentYear, mIdx);
  
  const formatDateIso = (d) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const startIso = formatDateIso(sched.startDate);
  const endIso = formatDateIso(sched.endDate);

  showModal({
    title: `📅 Override Payday Period (${mName})`,
    body: `
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Adjust period start & end dates (e.g. for early Christmas salary payments). Number of weeks will auto-calculate.</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Period Start Date:</label>
        <input type="date" id="periodStartInput" value="${startIso}">
        <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Period End Date:</label>
        <input type="date" id="periodEndInput" value="${endIso}">
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.resetDateOverride('${mName}')">Reset to Default</button>
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.saveDateOverride('${mName}')">Apply Override</button>
    `
  });
}



export function openMoveItemModal(sourceMonth, sourceWeek, itemIdx) {
  const items = getWeekItems(sourceMonth, sourceWeek);
  const item = items[itemIdx];
  if (!item) return;

  const cfg = getSettings();
  const curr = cfg.currency;

  showModal({
    title: `↔ Move Item: "${item.desc || 'Expense'}"`,
    body: `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
        Move <strong>${item.desc}</strong> (${curr}${Number(item.amount).toFixed(2)}) from <strong>${sourceMonth} - ${sourceWeek}</strong> to:
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Destination Month:</label>
          <select id="moveDestMonth" onchange="window.budgetApp.updateMoveWeekOptions(this.value, '${sourceWeek}')" style="width:100%; margin-top:3px;">
            ${months.map(m => `<option value="${m}" ${m === sourceMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Destination Week:</label>
          <select id="moveDestWeek" style="width:100%; margin-top:3px;"></select>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Destination Account:</label>
          <select id="moveDestAccount" style="width:100%; margin-top:3px;">
            <optgroup label="Current Accounts">
              ${cfg.current_accounts.map(a => `<option value="current:${a}" ${(item.account_type === 'current' && item.account_name === a) ? 'selected' : ''}>${a}</option>`).join('')}
            </optgroup>
            ${(cfg.credit_accounts || []).length > 0 ? `
              <optgroup label="Credit Cards">
                ${cfg.credit_accounts.map(c => `<option value="credit:${c.name}" ${(item.account_type === 'credit' && item.account_name === c.name) ? 'selected' : ''}>💳 ${c.name}</option>`).join('')}
              </optgroup>
            ` : ''}
            ${cfg.track_savings ? `
              <optgroup label="Savings Accounts">
                ${cfg.savings_accounts.map(s => `<option value="savings:${s}" ${(item.account_type === 'savings' && item.account_name === s) ? 'selected' : ''}>💰 ${s}</option>`).join('')}
              </optgroup>
            ` : ''}
          </select>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.confirmMoveItem('${sourceMonth}', '${sourceWeek}', ${itemIdx})">Move Item</button>
    `
  });

  updateMoveWeekOptions(sourceMonth, sourceWeek);
}

export function updateMoveWeekOptions(mName, selWeek) {
  const mIdx = months.indexOf(mName);
  const sched = calculateMonthSchedule(appState.currentYear, mIdx);
  const sel = document.getElementById('moveDestWeek');
  if (sel) {
    sel.innerHTML = sched.weeks.map(w => `
      <option value="${w.name}" ${w.name === selWeek ? 'selected' : ''}>${w.label}</option>
    `).join('');
  }
}

export function openRescheduleRecurringModal(recurringIdx, currentMonth, currentWeek, itemType = 'outgoing') {
  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;
  const isIncome = itemType === 'income';
  const list = isIncome ? (yData.recurring_incomes || cfg.recurring_incomes || []) : (yData.recurring_payments || []);
  const r = list[recurringIdx];
  if (!r) return;

  const freqLabels = {
    weekly: 'Every Week',
    biweekly: 'Every 2 Weeks',
    four_weekly: 'Every 4 Weeks',
    monthly: 'Every Month',
    quarterly: 'Quarterly (Every 3 Months)',
    yearly: 'Annually (Every Year)',
    custom_weeks: `Every ${r.interval_n || 1} Weeks`,
    custom_months: `Every ${r.interval_n || 1} Months`
  };
  const freqText = freqLabels[r.frequency] || r.frequency || 'Recurring';
  const holidayRule = r.holiday_rule || (isIncome ? 'previous' : 'following');

  showModal({
    title: `📅 Reschedule ${isIncome ? 'Scheduled Income' : 'Recurring Bill'}: "${r.desc}"`,
    body: `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
        <strong>${isIncome ? '📥 ' : ''}${r.desc}</strong> (${isIncome ? '+' : '-'}${curr}${Number(r.amount).toFixed(2)} &bull; ${freqText} &bull; ${isIncome ? 'Credited to' : 'Paid from'}: <em>${r.account || cfg.current_accounts[0]}</em>)
      </div>

      <!-- QUICK BUMP SECTION -->
      <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:12px;">
        <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--curr-border); display:block; margin-bottom:6px;">
          ⚡ Quick Bump / Shift:
        </label>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap:6px;">
          <button class="btn secondary" style="font-size:11px; padding:4px 6px;" onclick="window.budgetApp.bumpRecurringPayment(${recurringIdx}, 1, 0, document.getElementById('resched-shift-future').checked, '${currentMonth}', '${itemType}')">+1 Week</button>
          <button class="btn secondary" style="font-size:11px; padding:4px 6px;" onclick="window.budgetApp.bumpRecurringPayment(${recurringIdx}, 2, 0, document.getElementById('resched-shift-future').checked, '${currentMonth}', '${itemType}')">+2 Weeks</button>
          <button class="btn secondary" style="font-size:11px; padding:4px 6px;" onclick="window.budgetApp.bumpRecurringPayment(${recurringIdx}, 0, 1, document.getElementById('resched-shift-future').checked, '${currentMonth}', '${itemType}')">+1 Month</button>
          <button class="btn secondary" style="font-size:11px; padding:4px 6px;" onclick="window.budgetApp.bumpRecurringPayment(${recurringIdx}, 0, 2, document.getElementById('resched-shift-future').checked, '${currentMonth}', '${itemType}')">+2 Months</button>
          <button class="btn secondary" style="font-size:11px; padding:4px 6px;" onclick="window.budgetApp.bumpRecurringPayment(${recurringIdx}, 0, 3, document.getElementById('resched-shift-future').checked, '${currentMonth}', '${itemType}')">+3 Months</button>
          <button class="btn secondary" style="font-size:11px; padding:4px 6px;" onclick="window.budgetApp.bumpRecurringPayment(${recurringIdx}, 0, -1, document.getElementById('resched-shift-future').checked, '${currentMonth}', '${itemType}')">-1 Month</button>
        </div>
      </div>

      <!-- EXACT DESTINATION SELECTOR -->
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
        <div>
          <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Destination Month:</label>
          <select id="reschedDestMonth" onchange="window.budgetApp.updateReschedWeekOptions(this.value)">
            ${months.map(m => `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Destination Week:</label>
          <select id="reschedDestWeek"></select>
        </div>

        <div>
          <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">${isIncome ? 'Credited Account:' : 'Funding Account:'}</label>
          <select id="reschedDestAccount">
            <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${r.account === a ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
            ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${r.account === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
            ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
          </select>
        </div>

        <div>
          <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Weekend & Bank Holiday Rule:</label>
          <select id="reschedHolidayRule">
            <option value="previous" ${holidayRule === 'previous' ? 'selected' : ''}>⬅️ Move to Previous Working Day (e.g. Friday)</option>
            <option value="following" ${holidayRule === 'following' ? 'selected' : ''}>➡️ Move to Following Working Day (e.g. Monday)</option>
            <option value="exact" ${holidayRule === 'exact' ? 'selected' : ''}>⏸️ Exact Date (No Shifting)</option>
          </select>
        </div>
      </div>

      <!-- FUTURE CADENCE SHIFT TOGGLE -->
      <div style="background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.2); border-radius:6px; padding:8px 10px;">
        <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; cursor:pointer; color:var(--heading);">
          <input type="checkbox" id="resched-shift-future" checked style="margin-top:2px;">
          <span>
            <strong>Shift all future occurrences forward accordingly</strong>
            <span style="display:block; font-size:11px; color:var(--text-muted); margin-top:2px;">Preserves the ${freqText} interval by automatically shifting future occurrences from the new date.</span>
          </span>
        </label>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.confirmRescheduleRecurring(${recurringIdx}, '${currentMonth}', '${currentWeek}', '${itemType}')">Save Rescheduled Date</button>
    `
  });

  updateReschedWeekOptions(currentMonth, currentWeek);
}

export function updateReschedWeekOptions(mName, selWeek) {
  const mIdx = months.indexOf(mName);
  const sched = calculateMonthSchedule(appState.currentYear, mIdx);
  const sel = document.getElementById('reschedDestWeek');
  if (sel) {
    sel.innerHTML = sched.weeks.map(w => `
      <option value="${w.name}" ${w.name === selWeek ? 'selected' : ''}>${w.label}</option>
    `).join('');
  }
}
export function openAccountTrackingModal() {
  const cfg = getSettings();
  const curr = cfg.currency;
  const activeTab = appState.activeTab;
  const mData = getMonthData(activeTab);

  showModal({
    title: `⚙️ Accounts & Tracking Setup (${activeTab})`,
    body: `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px; line-height:1.4;">
        Manage baseline opening balances, weekly column simulation, and Net Position inclusion for <strong>${activeTab} ${appState.currentYear}</strong>:
      </div>

      <div style="max-height:60vh; overflow-y:auto; display:flex; flex-direction:column; gap:14px; padding-right:4px;">
        <!-- CURRENT ACCOUNTS -->
        <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
          <h5 style="color:var(--curr-border); margin:0 0 10px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">🏦 Current Accounts</h5>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${cfg.current_accounts.map((a, idx) => {
              const conf = getAccountConfig('current', a);
              const isEdited = mData.current_data[a] && mData.current_data[a].user_edited;
              const bal = (mData.current_data[a] && mData.current_data[a].opening !== undefined) ? mData.current_data[a].opening : '';
              const owner = getAccountOwner('current', a);
              const isMulti = isMultiUserEnabled();
              return `
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <strong style="color:var(--heading); font-size:13px;">🏦 ${a}</strong>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <label style="font-size:11px; color:var(--text-muted);">Opening Balance (${curr}):</label>
                      <input type="number" step="0.01" id="m_open_c_${idx}" placeholder="Auto" value="${bal !== 0 || isEdited ? bal : ''}" style="width:105px; padding:3px 6px; font-size:12px; text-align:right; font-weight:bold;">
                    </div>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px dashed var(--border); padding-top:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div style="display:flex; align-items:center; gap:4px;">
                        <label style="font-size:11px; color:var(--text-muted);">Tracking:</label>
                        <select id="m_trk_c_${idx}" style="padding:3px 6px; font-size:11px;">
                          <option value="weekly" ${conf.tracking === 'weekly' ? 'selected' : ''}>📅 Track Weekly</option>
                          <option value="monthly" ${conf.tracking === 'monthly' ? 'selected' : ''}>📊 Track Monthly</option>
                        </select>
                      </div>
                      ${isMulti ? `
                        <div style="display:flex; align-items:center; gap:4px;">
                          <label style="font-size:11px; color:var(--text-muted);">Owner:</label>
                          <select id="m_own_c_${idx}" style="padding:3px 6px; font-size:11px;">
                            <option value="Joint" ${owner === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                            ${(cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                          </select>
                        </div>
                      ` : ''}
                    </div>
                    <label style="font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; margin:0; font-weight:600; color:var(--text);">
                      <input type="checkbox" id="m_net_c_${idx}" ${conf.include_in_net ? 'checked' : ''}> Include in Net
                    </label>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- CREDIT CARDS -->
        <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
          <h5 style="color:var(--amber); margin:0 0 10px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">💳 Credit Cards</h5>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${cfg.credit_accounts.map((c, idx) => {
              const conf = getAccountConfig('credit', c.name);
              const spent = (mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent !== undefined) ? mData.credit_data[c.name].opening_spent : '';
              const isEdited = mData.credit_data[c.name] && mData.credit_data[c.name].user_edited;
              const owner = getAccountOwner('credit', c.name);
              const isMulti = isMultiUserEnabled();
              return `
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <div>
                      <strong style="color:var(--amber); font-size:13px;">💳 ${c.name}</strong>
                      <span style="font-size:10px; color:var(--text-muted); margin-left:4px;">(Credit Limit: ${curr}${c.limit})</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <label style="font-size:11px; color:var(--text-muted);">Opening Debt (${curr}):</label>
                      <input type="number" step="0.01" id="m_open_cr_${idx}" placeholder="Auto" value="${spent !== 0 || isEdited ? spent : ''}" style="width:105px; padding:3px 6px; font-size:12px; text-align:right; color:var(--red); font-weight:bold;">
                    </div>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px dashed var(--border); padding-top:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div style="display:flex; align-items:center; gap:4px;">
                        <label style="font-size:11px; color:var(--text-muted);">Tracking:</label>
                        <select id="m_trk_cr_${idx}" style="padding:3px 6px; font-size:11px;">
                          <option value="weekly" ${conf.tracking === 'weekly' ? 'selected' : ''}>📅 Track Weekly</option>
                          <option value="monthly" ${conf.tracking === 'monthly' ? 'selected' : ''}>📊 Track Monthly</option>
                        </select>
                      </div>
                      ${isMulti ? `
                        <div style="display:flex; align-items:center; gap:4px;">
                          <label style="font-size:11px; color:var(--text-muted);">Owner:</label>
                          <select id="m_own_cr_${idx}" style="padding:3px 6px; font-size:11px;">
                            <option value="Joint" ${owner === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                            ${(cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                          </select>
                        </div>
                      ` : ''}
                    </div>
                    <label style="font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; margin:0; font-weight:600; color:var(--text);">
                      <input type="checkbox" id="m_net_cr_${idx}" ${conf.include_in_net ? 'checked' : ''}> Include in Net
                    </label>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- SAVINGS ACCOUNTS -->
        ${cfg.track_savings ? `
          <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <h5 style="color:var(--purple); margin:0 0 10px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">📈 Savings Accounts</h5>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${cfg.savings_accounts.map((s, idx) => {
                const conf = getAccountConfig('savings', s);
                const isEdited = mData.savings_data[s] && mData.savings_data[s].user_edited;
                const bal = (mData.savings_data[s] && mData.savings_data[s].opening !== undefined) ? mData.savings_data[s].opening : '';
                const owner = getAccountOwner('savings', s);
                const isMulti = isMultiUserEnabled();
                return `
                  <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                      <strong style="color:var(--purple); font-size:13px;">📈 ${s}</strong>
                      <div style="display:flex; align-items:center; gap:6px;">
                        <label style="font-size:11px; color:var(--text-muted);">Opening Balance (${curr}):</label>
                        <input type="number" step="0.01" id="m_open_s_${idx}" placeholder="Auto" value="${bal !== 0 || isEdited ? bal : ''}" style="width:105px; padding:3px 6px; font-size:12px; text-align:right; font-weight:bold;">
                      </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px dashed var(--border); padding-top:6px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <label style="font-size:11px; color:var(--text-muted);">Forecast:</label>
                        <select id="m_pred_s_${idx}" style="padding:3px 6px; font-size:11px; max-width:140px;">
                          <option value="planned" ${conf.savings_predict_mode !== 'actual' ? 'selected' : ''}>📈 Planned</option>
                          <option value="actual" ${conf.savings_predict_mode === 'actual' ? 'selected' : ''}>🔄 Rollover</option>
                        </select>
                      </div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <select id="m_trk_s_${idx}" style="padding:3px 6px; font-size:11px;">
                          <option value="weekly" ${conf.tracking === 'weekly' ? 'selected' : ''}>📅 Weekly</option>
                          <option value="monthly" ${conf.tracking === 'monthly' ? 'selected' : ''}>📊 Monthly</option>
                        </select>
                        ${isMulti ? `
                          <select id="m_own_s_${idx}" style="padding:3px 6px; font-size:11px;">
                            <option value="Joint" ${owner === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                            ${(cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                          </select>
                        ` : ''}
                        <label style="font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; margin:0; font-weight:600; color:var(--text);">
                          <input type="checkbox" id="m_net_s_${idx}" ${conf.include_in_net ? 'checked' : ''}> Net
                        </label>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.saveGlobalAccountTracking()">Save Changes</button>
    `
  });
}

export function openYearOverviewAccountFilterModal() {
  const cfg = getSettings();
  const yData = getYearData();
  const sel = yData.yearly_overview_selection || {
    current: cfg.current_accounts,
    credit: cfg.credit_accounts.map(c => c.name),
    savings: cfg.savings_accounts
  };

  showModal({
    title: "📊 Filter Chart Accounts",
    body: `
      <p style="font-size:12px; color:var(--text-muted);">Toggle which accounts appear in the annual chart and summary table:</p>
      <h5 style="color:var(--curr-border); margin:8px 0 4px 0;">Current Accounts:</h5>
      ${cfg.current_accounts.map(a => `<div style="margin-bottom:4px;"><label><input type="checkbox" id="yr_c_${a}" ${sel.current.includes(a) ? 'checked' : ''}> ${a}</label></div>`).join('')}
      <h5 style="color:var(--amber); margin:12px 0 4px 0;">Credit Accounts:</h5>
      ${cfg.credit_accounts.map(c => `<div style="margin-bottom:4px;"><label><input type="checkbox" id="yr_cr_${c.name}" ${sel.credit.includes(c.name) ? 'checked' : ''}> ${c.name}</label></div>`).join('')}
      <h5 style="color:var(--purple); margin:12px 0 4px 0;">Savings Accounts:</h5>
      ${cfg.savings_accounts.map(s => `<div style="margin-bottom:4px;"><label><input type="checkbox" id="yr_s_${s}" ${sel.savings.includes(s) ? 'checked' : ''}> ${s}</label></div>`).join('')}
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.saveYearOverviewFilter()">Apply Filter</button>
    `
  });
}

export function openYearlyRecurringView() {
  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;
  const list = yData.yearly_recurring || [];

  showModal({
    title: `📅 Annual Recurring Bills (${appState.currentYear})`,
    body: `
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Bills scheduled for specific months throughout ${appState.currentYear}:</p>
      <div style="max-height:220px; overflow-y:auto;">
        ${list.length === 0 ? '<p style="font-size:12px; color:var(--text-muted);">No annual bills setup yet.</p>' : `
          <table class="table">
            <thead><tr><th>Bill / Description</th><th>Month</th><th>Due Date</th><th class="text-right">Amount</th><th>Paid From Account</th><th></th></tr></thead>
            <tbody>
              ${list.map((yb, idx) => `
                <tr>
                  <td><strong>${yb.desc}</strong></td>
                  <td>${yb.month}</td>
                  <td>Day ${yb.due_day}</td>
                  <td class="text-right">${curr}${Number(yb.amount).toFixed(2)}</td>
                  <td>${yb.account || cfg.current_accounts[0]}</td>
                  <td><button class="del-btn" style="height:18px; width:18px; line-height:16px;" onclick="window.budgetApp.deleteYearlyRecurring(${idx})">&times;</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      
        <div style="display:grid; grid-template-columns: 1fr 60px 50px 65px 70px 24px; gap:4px; margin-top:10px;">
          <input type="text" id="new-yb-desc" placeholder="Bill description">
          <select id="new-yb-m">${months.map(m => `<option value="${m}">${m}</option>`).join('')}</select>
          <input type="number" min="1" max="31" id="new-yb-day" placeholder="Day">
          <input type="number" step="0.01" id="new-yb-amt" placeholder="${curr}">
          <select id="new-yb-acct">
            <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
            ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
            ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
          </select>
          <button class="btn green" onclick="window.budgetApp.addYearlyRecurring()">+</button>
        </div>
    `,
    actions: `<button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>`
  });
}

export function openAddBudgetModal() {
  const cfg = getSettings();
  showModal({
    title: "🎯 Create Annual Budget",
    body: `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <label style="font-size:11px; text-transform:uppercase;">Budget Name:</label>
        <input type="text" id="bg-name" placeholder="e.g. Summer Holiday, House Extension">
        <label style="font-size:11px; text-transform:uppercase;">Total Budget Amount (${cfg.currency}):</label>
        <input type="number" step="0.01" id="bg-amt" placeholder="e.g. 2500.00">
        <label style="font-size:11px; text-transform:uppercase;">Funded From Account:</label>
        <select id="bg-acct">
          <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
          <optgroup label="Savings Accounts">${cfg.savings_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
        </select>
        <label style="font-size:11px; text-transform:uppercase;">Target Completion Date:</label>
        <input type="date" id="bg-date" value="${appState.currentYear}-12-31">
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.confirmAddBudget()">Save Annual Budget</button>
    `
  });
}


export function openArchiveManagerModal() {
  const yData = getYearData();
  const years = appState.data.years || {};
  const currentYear = appState.currentYear;

  showModal({
    title: "📦 Archive & History Manager",
    body: `
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
        Archiving hides completed months or past years from the top navigation bar while keeping all transactions, starting balances, and rollovers permanently saved in the database.
      </p>

      <div style="margin-bottom:18px;">
        <h4 style="font-size:13px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <span>Month Tabs (${currentYear})</span>
          <span style="font-size:11px; font-weight:normal; color:var(--text-muted);">Toggle tab visibility</span>
        </h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap:6px;">
          ${months.map(m => {
            const md = (yData.months && yData.months[m]) || {};
            const isArchived = !!md.archived;
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--border); padding:6px 8px; border-radius:6px;">
                <span style="font-weight:600; font-size:12px; ${isArchived ? 'color:var(--text-muted); text-decoration:line-through;' : 'color:var(--heading);'}">${m}</span>
                <button class="btn ${isArchived ? 'green' : 'secondary'}" style="padding:2px 8px; font-size:10px;" onclick="window.budgetApp.toggleArchiveMonth('${m}', true)">
                  ${isArchived ? 'Restore' : 'Archive'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="border-top:1px solid var(--border); padding-top:14px;">
        <h4 style="font-size:13px; margin-bottom:8px;">Year Archives</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:6px;">
          ${Object.keys(years).sort().map(y => {
            const yd = years[y] || {};
            const isArchived = !!yd.archived;
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--border); padding:6px 8px; border-radius:6px;">
                <span style="font-weight:600; font-size:12px; ${isArchived ? 'color:var(--text-muted);' : 'color:var(--heading);'}">${y} ${isArchived ? '(Archived)' : ''}</span>
                <button class="btn ${isArchived ? 'green' : 'secondary'}" style="padding:2px 8px; font-size:10px;" onclick="window.budgetApp.toggleArchiveYear('${y}', true)">
                  ${isArchived ? 'Restore' : 'Archive'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `,
    actions: `<button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>`
  });
}


export function openQuickCheckInModal(selectedWeek, selectedMonth) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const detected = detectCurrentMonthAndWeek(appState.currentYear);
  
  const targetMonth = selectedMonth || detected.month || appState.activeTab || 'Jan';
  const mIdx = months.indexOf(targetMonth);
  const schedule = calculateMonthSchedule(appState.currentYear, mIdx);

  let targetWeek = selectedWeek;
  if (!targetWeek) {
    if (detected && detected.month === targetMonth) {
      targetWeek = detected.week;
    } else {
      targetWeek = schedule.weeks[0]?.name || 'Week 1';
    }
  }

  const actuals = getWeekActuals(targetMonth, targetWeek);

  showModal({
    title: `📱 Quick Balance Check-In`,
    body: `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; background:rgba(0,0,0,0.25); padding:8px 12px; border-radius:6px; margin-bottom:14px;">
        <div>
          <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Budget Month</label>
          <select id="quick_chk_month_select" onchange="window.budgetApp.openQuickCheckInModal(null, this.value)" style="width:100%; margin-top:2px; font-weight:600;">
            ${months.map(m => `<option value="${m}" ${m === targetMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Check-In Week</label>
          <select id="quick_chk_week_select" onchange="window.budgetApp.openQuickCheckInModal(this.value, '${targetMonth}')" style="width:100%; margin-top:2px; font-weight:600;">
            ${schedule.weeks.map(w => `<option value="${w.name}" ${w.name === targetWeek ? 'selected' : ''}>${w.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px; max-height:60vh; overflow-y:auto; padding-right:4px;">
        <!-- CURRENT ACCOUNTS -->
        <div>
          <h4 style="color:var(--curr-border); font-size:12px; margin:0 0 6px 0; text-transform:uppercase;">Current Accounts</h4>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${cfg.current_accounts.map(acc => {
              const val = actuals[`curr_${acc}`] !== undefined ? actuals[`curr_${acc}`] : '';
              return `
                <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <strong style="color:var(--heading); font-size:13px;">${acc}</strong>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:12px; color:var(--text-muted);">${curr}</span>
                    <input type="number" step="0.01" id="qchk_curr_${acc}" value="${val}" placeholder="Actual balance" style="width:130px; text-align:right; font-weight:600; font-size:13px;">
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- CREDIT CARDS -->
        ${(cfg.credit_accounts || []).length > 0 ? `
          <div>
            <h4 style="color:var(--amber); font-size:12px; margin:0 0 6px 0; text-transform:uppercase;">Credit Cards (Available Credit Line)</h4>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${cfg.credit_accounts.map(c => {
                const val = actuals[`c_avail_${c.name}`] !== undefined ? actuals[`c_avail_${c.name}`] : '';
                return `
                  <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <div>
                      <strong style="color:var(--heading); font-size:13px;">${c.name}</strong>
                      <span style="font-size:10px; color:var(--text-muted); margin-left:4px;">(Credit Limit: ${curr}${c.limit})</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                      <span style="font-size:12px; color:var(--text-muted);">${curr}</span>
                      <input type="number" step="0.01" id="qchk_c_avail_${c.name}" value="${val}" placeholder="Available credit" style="width:130px; text-align:right; font-weight:600; font-size:13px;">
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- SAVINGS ACCOUNTS -->
        ${cfg.track_savings && (cfg.savings_accounts || []).length > 0 ? `
          <div>
            <h4 style="color:var(--purple); font-size:12px; margin:0 0 6px 0; text-transform:uppercase;">Savings Accounts (Total Balance)</h4>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${cfg.savings_accounts.map(s => {
                const val = actuals[`sav_${s}`] !== undefined ? actuals[`sav_${s}`] : '';
                return `
                  <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <strong style="color:var(--heading); font-size:13px;">${s}</strong>
                    <div style="display:flex; align-items:center; gap:4px;">
                      <span style="font-size:12px; color:var(--text-muted);">${curr}</span>
                      <input type="number" step="0.01" id="qchk_sav_${s}" value="${val}" placeholder="Total balance" style="width:130px; text-align:right; font-weight:600; font-size:13px;">
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.saveQuickCheckIn('${targetWeek}', '${targetMonth}')">Save Check-In</button>
    `
  });
}

export function openQuickWeeklyExpenseModal(selectedWeek, selectedMonth) {
  const cfg = getSettings();
  const detected = detectCurrentMonthAndWeek(appState.currentYear);
  const targetMonth = selectedMonth || detected.month || appState.activeTab || 'Jan';
  const mIdx = months.indexOf(targetMonth);
  const schedule = calculateMonthSchedule(appState.currentYear, mIdx);

  let targetWeek = selectedWeek;
  if (!targetWeek) {
    if (detected && detected.month === targetMonth) {
      targetWeek = detected.week;
    } else {
      targetWeek = schedule.weeks[0]?.name || 'Week 1';
    }
  }

  showModal({
    title: `💳 Add Weekly Expense`,
    body: `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <div>
            <label style="font-size:11px; text-transform:uppercase;">Month</label>
            <select id="qwe-month" onchange="window.budgetApp.switchQuickExpenseMonth(this.value)" style="width:100%;">
              ${months.map(m => `<option value="${m}" ${m === targetMonth ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px; text-transform:uppercase;">Target Week</label>
            <select id="qwe-week" style="width:100%;">
              ${schedule.weeks.map(w => `<option value="${w.name}" ${w.name === targetWeek ? 'selected' : ''}>${w.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Entry Type</label>
          <select id="qwe-type" style="width:100%; font-weight:bold;">
            <option value="expense" selected>- Expense</option>
            <option value="income">+ Income</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Description</label>
          <input type="text" id="qwe-desc" placeholder="e.g. Groceries, Dinner, Petrol, Bonus" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Amount (${cfg.currency})</label>
          <input type="number" step="0.01" id="qwe-amt" placeholder="45.00" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Paid From / Credited Account</label>
          <select id="qwe-acc" style="width:100%;">
            <optgroup label="Current Accounts">
              ${cfg.current_accounts.map(a => `<option value="current:${a}">${a}</option>`).join('')}
            </optgroup>
            ${(cfg.credit_accounts || []).length > 0 ? `
              <optgroup label="Credit Cards">
                ${cfg.credit_accounts.map(c => `<option value="credit:${c.name}">${c.name}</option>`).join('')}
              </optgroup>
            ` : ''}
            ${cfg.track_savings && (cfg.savings_accounts || []).length > 0 ? `
              <optgroup label="Savings Accounts">
                ${cfg.savings_accounts.map(s => `<option value="savings:${s}">${s}</option>`).join('')}
              </optgroup>
            ` : ''}
          </select>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.saveQuickWeeklyExpense()">Save Weekly Expense</button>
    `
  });
}

export function openQuickBudgetTxModal() {
  const yData = getYearData();
  const cfg = getSettings();
  const budgets = yData.yearly_budgets || [];
  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (budgets.length === 0) {
    showModal({
      title: "🎯 Add Budget Spend",
      body: `
        <div style="text-align:center; padding:16px 0;">
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">You haven't created any yearly budgets yet (e.g. Holidays, Home Renovation).</p>
          <button class="btn green" onclick="window.budgetApp.openAddBudgetModal()">+ Create Annual Budget</button>
        </div>
      `,
      actions: `<button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>`
    });
    return;
  }

  showModal({
    title: `🎯 Add Budget Spend`,
    body: `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <label style="font-size:11px; text-transform:uppercase;">Select Annual Budget</label>
          <select id="qbt-idx" style="width:100%;">
            ${budgets.map((b, idx) => {
              const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
              return `<option value="${idx}">🎯 ${b.name} (Spent: ${cfg.currency}${spent.toFixed(0)} / ${cfg.currency}${Number(b.total_budget).toFixed(0)})</option>`;
            }).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Spend Description</label>
          <input type="text" id="qbt-desc" placeholder="e.g. Flights, Hotel Deposit, Materials" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Amount (${cfg.currency})</label>
          <input type="number" step="0.01" id="qbt-amt" placeholder="150.00" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Date of Spend</label>
          <input type="date" id="qbt-date" value="${todayIso}" min="${appState.currentYear}-01-01" max="${Number(appState.currentYear) + 5}-12-31" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Paid From Account</label>
          <select id="qbt-acc" style="width:100%;">
            <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
            ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
            ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
          </select>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.saveQuickBudgetTx()">Record Spend</button>
    `
  });
}

export const openYearlyRecurringModal = openYearlyRecurringView;


// ==========================================
// BIRTHDAYS & ANNUAL OCCASIONS MODALS
// ==========================================
export function openAddBirthdayModal() {
  const cfg = getSettings();
  const curr = cfg.currency;

  showModal({
    title: "🎂 Add Birthday or Occasion",
    body: `
      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Person / Occasion Name</label>
      <input type="text" id="bday-name" placeholder="e.g. Mum's Birthday, Wedding Anniversary" style="margin-bottom:8px;">

      <div style="display:flex; gap:8px; margin-bottom:8px;">
        <div style="flex:1;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Month</label>
          <select id="bday-month" style="width:100%;">
            ${months.map(m => `<option value="${m}" ${m === appState.activeTab ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Day of Month</label>
          <input type="number" min="1" max="31" id="bday-day" value="1" style="width:100%;">
        </div>
      </div>

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Gift Budget Allocation (${curr})</label>
      <input type="number" step="0.01" id="bday-budget" placeholder="100.00" style="margin-bottom:8px;">

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Paid From Account</label>
      <select id="bday-account" style="margin-bottom:8px;">
        <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
        ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
        ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
      </select>

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Category</label>
      <select id="bday-cat" style="margin-bottom:8px;">
        <option value="Birthday">🎂 Birthday</option>
        <option value="Anniversary">💍 Anniversary</option>
        <option value="Holiday">🎄 Holiday</option>
        <option value="Celebration">🎉 Occasion</option>
      </select>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.confirmAddBirthday()">Add Birthday or Occasion</button>
    `
  });
}

export function openEditBirthdayModal(bIdx) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const birthdays = getBirthdays(appState.currentYear);
  const b = birthdays[bIdx];
  if (!b) return;

  showModal({
    title: `✏️ Edit: ${b.name}`,
    body: `
      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Person / Occasion Name</label>
      <input type="text" id="bday-name" value="${b.name}" style="margin-bottom:8px;">

      <div style="display:flex; gap:8px; margin-bottom:8px;">
        <div style="flex:1;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Month</label>
          <select id="bday-month" style="width:100%;">
            ${months.map(m => `<option value="${m}" ${m === b.month ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Day of Month</label>
          <input type="number" min="1" max="31" id="bday-day" value="${b.day || 1}" style="width:100%;">
        </div>
      </div>

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Gift Budget Allocation (${curr})</label>
      <input type="number" step="0.01" id="bday-budget" value="${b.budget_amount || 0}" style="margin-bottom:8px;">

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Paid From Account</label>
      <select id="bday-account" style="margin-bottom:8px;">
        <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${a === b.account ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
        ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${c.name === b.account ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
        ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}" ${s === b.account ? 'selected' : ''}>${s}</option>`).join('')}</optgroup>` : ''}
      </select>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.confirmEditBirthday(${bIdx})">Save Changes</button>
    `
  });
}

export function openAddBirthdaySpendModal(bIdx) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const birthdays = getBirthdays(appState.currentYear);
  const b = birthdays[bIdx];
  if (!b) return;

  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  showModal({
    title: `🎁 Log Gift Spend: ${b.name}`,
    body: `
      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Gift / Item Description</label>
      <input type="text" id="bsp-desc" placeholder="e.g. Perfume, Dinner out, Gift Card" style="margin-bottom:8px;">

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Amount Spent (${curr})</label>
      <input type="number" step="0.01" id="bsp-amt" placeholder="50.00" style="margin-bottom:8px;">

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Purchase Date</label>
      <input type="date" id="bsp-date" value="${todayIso}" style="margin-bottom:8px;">

      <label style="font-size:11px; text-transform:uppercase; font-weight:bold;">Paid From Account</label>
      <select id="bsp-acc" style="margin-bottom:8px;">
        <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${a === b.account ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
        ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${c.name === b.account ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
        ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}" ${s === b.account ? 'selected' : ''}>${s}</option>`).join('')}</optgroup>` : ''}
      </select>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.confirmAddBirthdaySpend(${bIdx})">Log Gift Spend</button>
    `
  });
}

export function openQuickBirthdaySpendModal() {
  const cfg = getSettings();
  const birthdays = getBirthdays(appState.currentYear);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (!birthdays || birthdays.length === 0) {
    showModal({
      title: "🎁 Log Gift Spend",
      body: `
        <div style="text-align:center; padding:16px 0;">
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">You haven't added any birthdays or annual occasions yet.</p>
          <button class="btn green" onclick="window.budgetApp.openAddBirthdayModal()">+ Add Birthday or Occasion</button>
        </div>
      `,
      actions: `<button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>`
    });
    return;
  }

  // Enrich birthdays with original index, dates, and diffDays relative to today
  const enriched = birthdays.map((b, originalIdx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) mIdx = 0;
    const day = parseInt(b.day || 1, 10) || 1;
    const bDate = new Date(appState.currentYear, mIdx, day, 0, 0, 0, 0);
    const diffDays = Math.round((bDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const budget = Number(b.budget_amount) || 0;

    return {
      ...b,
      originalIdx,
      dateObj: bDate,
      diffDays,
      spent,
      budget
    };
  });

  // Split into upcoming (diffDays >= 0) and past (diffDays < 0)
  const upcoming = enriched.filter(b => b.diffDays >= 0);
  const past = enriched.filter(b => b.diffDays < 0);

  // Sort upcoming chronologically ascending (next occurring first)
  upcoming.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Sort past chronologically by date in year
  past.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Default selected birthday is the next upcoming event, or first past event if all have passed
  const defaultSelected = upcoming.length > 0 ? upcoming[0] : past[0];
  const defaultSelectedIdx = defaultSelected ? defaultSelected.originalIdx : 0;
  const defaultAccount = defaultSelected ? defaultSelected.account : (cfg.current_accounts[0] || '');

  showModal({
    title: `🎁 Log Gift Spend`,
    body: `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <label style="font-size:11px; text-transform:uppercase;">Select Birthday / Occasion</label>
          <select id="qbday-idx" onchange="window.budgetApp.onQuickBirthdayChange(this.value)" style="width:100%;">
            ${upcoming.length > 0 ? `
              <optgroup label="🎉 Upcoming Occasions (${upcoming.length})">
                ${upcoming.map(b => {
                  let timeBadge = '';
                  if (b.diffDays === 0) timeBadge = 'Today!';
                  else if (b.diffDays === 1) timeBadge = 'Tomorrow';
                  else if (b.diffDays <= 30) timeBadge = `In ${b.diffDays} days`;
                  else timeBadge = `${b.month} ${b.day}`;
                  return `<option value="${b.originalIdx}" ${b.originalIdx === defaultSelectedIdx ? 'selected' : ''}>🎁 ${b.name} — ${b.month} ${b.day} (${timeBadge}) • Spent: ${cfg.currency}${b.spent.toFixed(0)} / ${cfg.currency}${b.budget.toFixed(0)}</option>`;
                }).join('')}
              </optgroup>
            ` : ''}
            ${past.length > 0 ? `
              <optgroup label="⏳ Past Occasions (${past.length})">
                ${past.map(b => {
                  return `<option value="${b.originalIdx}" ${b.originalIdx === defaultSelectedIdx ? 'selected' : ''}>🎁 ${b.name} — ${b.month} ${b.day} (Passed • ${Math.abs(b.diffDays)}d ago) • Spent: ${cfg.currency}${b.spent.toFixed(0)} / ${cfg.currency}${b.budget.toFixed(0)}</option>`;
                }).join('')}
              </optgroup>
            ` : ''}
          </select>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Gift / Item Description</label>
          <input type="text" id="qbday-desc" placeholder="e.g. Perfume, Dinner out, Gift Card" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Amount Spent (${cfg.currency})</label>
          <input type="number" step="0.01" id="qbday-amt" placeholder="50.00" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Purchase Date</label>
          <input type="date" id="qbday-date" value="${todayIso}" min="${appState.currentYear}-01-01" max="${Number(appState.currentYear) + 5}-12-31" style="width:100%;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase;">Paid From Account</label>
          <select id="qbday-acc" style="width:100%;">
            <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${a === defaultAccount ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
            ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${c.name === defaultAccount ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
            ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}" ${s === defaultAccount ? 'selected' : ''}>${s}</option>`).join('')}</optgroup>` : ''}
          </select>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.saveQuickBirthdaySpend()">Log Gift Spend</button>
    `
  });
}

// ==========================================
// FLEXIBLE RECURRING PAYMENTS MODAL
// ==========================================
export function openRecurringPaymentsModal() {
  const recurring = getRecurringPayments(appState.currentYear);
  const cfg = getSettings();
  const curr = cfg.currency;
  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  showModal({
    title: `📅 Scheduled & Recurring Bills (${appState.currentYear})`,
    body: `
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
        Manage recurring subscriptions, direct debits, and cadence payments (Weekly, Bi-Weekly, Monthly, Quarterly, or Annual):
      </p>

      <!-- EXISTING RECURRING LIST -->
      <div style="max-height:220px; overflow-y:auto; margin-bottom:16px; border:1px solid var(--border); border-radius:6px; background:var(--panel-bg);">
        ${recurring.length === 0 ? `
          <div style="padding:16px; text-align:center; color:var(--text-muted); font-size:12px; font-style:italic;">
            No recurring payments set up yet. Add one below to simulate weekly or monthly cashflow automatically.
          </div>
        ` : `
          <table class="table" style="margin:0;">
            <thead>
              <tr>
                <th>Bill / Description</th>
                <th>Frequency</th>
                <th class="text-right">Amount</th>
                <th>Paid From Account</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${recurring.map((r, idx) => {
                let cadenceLabel = r.frequency || 'monthly';
                if (cadenceLabel === 'weekly') cadenceLabel = 'Weekly';
                else if (cadenceLabel === 'biweekly') cadenceLabel = 'Every 2 Wks';
                else if (cadenceLabel === 'quarterly') cadenceLabel = 'Quarterly';
                else if (cadenceLabel === 'yearly') cadenceLabel = `Yearly (${r.month || 'Jan'})`;
                else if (cadenceLabel === 'custom_weeks') cadenceLabel = `Every ${r.interval_n} Wks`;
                else if (cadenceLabel === 'custom_months') cadenceLabel = `Every ${r.interval_n} Mos`;
                else cadenceLabel = 'Monthly';

                return `
                  <tr>
                    <td><strong>🔄 ${r.desc}</strong></td>
                    <td><span class="badge" style="font-size:10px;">${cadenceLabel}</span></td>
                    <td class="text-right"><strong>${curr}${Number(r.amount).toFixed(2)}</strong></td>
                    <td><span style="font-size:11px; color:var(--text-muted);">${r.account || 'Current Account'}</span></td>
                    <td><button class="del-btn" style="height:18px; width:18px; line-height:16px;" onclick="window.budgetApp.deleteRecurringPayment(${idx})">&times;</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- ADD NEW RECURRING FORM -->
      <div style="border-top:1px solid var(--border); padding-top:12px;">
        <h5 style="margin:0 0 10px 0; color:var(--curr-border); font-size:12px; text-transform:uppercase;">+ Add Scheduled Bill or Direct Debit</h5>
        
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <input type="text" id="rec-desc" placeholder="e.g. Window Cleaner, Gym, Netflix" style="flex:2;">
          <input type="number" step="0.01" id="rec-amt" placeholder="Amount (${curr})" style="flex:1;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Frequency</label>
            <select id="rec-freq" onchange="window.budgetApp.onRecurrenceFreqChange(this.value)" style="width:100%; font-size:11px; margin-top:2px;">
              <option value="weekly">🔄 Weekly</option>
              <option value="biweekly">🔄 Bi-Weekly (Every 2 Weeks)</option>
              <option value="monthly" selected>📅 Monthly Direct Debit</option>
              <option value="quarterly">🗓️ Quarterly (Every 3 Months)</option>
              <option value="yearly">🎉 Annual Bill (Once a year)</option>
              <option value="custom_weeks">⚙️ Custom (Every N Weeks)</option>
              <option value="custom_months">⚙️ Custom (Every N Months)</option>
            </select>
          </div>

          <div id="rec-interval-box" style="display:none;">
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Interval Step (N)</label>
            <input type="number" min="1" max="52" id="rec-interval" value="2" style="width:100%; font-size:11px; margin-top:2px;">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Start Date</label>
            <input type="date" id="rec-start" value="${todayIso}" style="width:100%; font-size:11px; margin-top:2px;">
          </div>
          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Paid From Account</label>
            <select id="rec-acc" style="width:100%; font-size:11px; margin-top:2px;">
              <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
              ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
              ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
            </select>
          </div>
        </div>

        <button class="btn green" style="width:100%; justify-content:center; margin-top:6px;" onclick="window.budgetApp.confirmAddRecurringPayment()">Save Scheduled Bill</button>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Done</button>
    `
  });
}


// ==========================================
// UNIFIED SCHEDULED & RECURRING BILLS MODAL
// ==========================================
export function openScheduledBillsModal(activeFilter = 'all') {
  const cfg = getSettings();
  const curr = cfg.currency;
  const activeTab = appState.activeTab;
  const allBills = getAllScheduledBills(activeTab, appState.currentYear);
  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const filteredBills = allBills.filter(b => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'monthly') return b.frequency === 'monthly';
    if (activeFilter === 'weekly') return b.frequency === 'weekly' || b.frequency === 'biweekly' || b.frequency === 'custom_weeks';
    if (activeFilter === 'yearly') return b.frequency === 'yearly' || b.frequency === 'quarterly';
    return true;
  });

  const totalMonthlyEquivalent = allBills.reduce((sum, b) => {
    const amt = Number(b.amount) || 0;
    if (b.frequency === 'weekly') return sum + (amt * 52 / 12);
    if (b.frequency === 'biweekly') return sum + (amt * 26 / 12);
    if (b.frequency === 'quarterly') return sum + (amt / 3);
    if (b.frequency === 'yearly') return sum + (amt / 12);
    return sum + amt;
  }, 0);

  showModal({
    title: `📅 Scheduled & Recurring Bills (${appState.currentYear})`,
    body: `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <span style="font-size:12px; color:var(--text-muted);">
          Unified manager for Direct Debits, recurring bills, and annual commitments.
        </span>
        <span class="badge" style="background:var(--panel-bg); border:1px solid var(--border); color:var(--heading); font-size:11px;">
          Monthly Avg Outgoings: <strong>${curr}${totalMonthlyEquivalent.toFixed(2)}</strong>
        </span>
      </div>

      <!-- FILTER PILLS -->
      <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;">
        <button class="btn ${activeFilter === 'all' ? 'green' : 'secondary'}" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.openScheduledBillsModal('all')">All Bills (${allBills.length})</button>
        <button class="btn ${activeFilter === 'monthly' ? 'green' : 'secondary'}" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.openScheduledBillsModal('monthly')">📅 Monthly Direct Debits (${allBills.filter(b => b.frequency === 'monthly').length})</button>
        <button class="btn ${activeFilter === 'weekly' ? 'green' : 'secondary'}" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.openScheduledBillsModal('weekly')">🔄 Weekly & Bi-Weekly (${allBills.filter(b => b.frequency === 'weekly' || b.frequency === 'biweekly' || b.frequency === 'custom_weeks').length})</button>
        <button class="btn ${activeFilter === 'yearly' ? 'green' : 'secondary'}" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.openScheduledBillsModal('yearly')">🎉 Annual & Quarterly (${allBills.filter(b => b.frequency === 'yearly' || b.frequency === 'quarterly').length})</button>
      </div>

      <!-- BILLS TABLE -->
      <div style="max-height:240px; overflow-y:auto; border:1px solid var(--border); border-radius:6px; background:var(--panel-bg); margin-bottom:16px;">
        ${filteredBills.length === 0 ? `
          <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px; font-style:italic;">
            No bills found in this category. Use the form below to add one.
          </div>
        ` : `
          <table class="table" style="margin:0;">
            <thead>
              <tr>
                <th>Bill / Description</th>
                <th>Frequency</th>
                <th class="text-right">Amount</th>
                <th>Paid From Account</th>
                <th>Transfer Destination</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filteredBills.map(b => {
                let cadenceStr = 'Monthly';
                if (b.frequency === 'monthly') cadenceStr = `Monthly (Day ${b.due_day || 1})`;
                else if (b.frequency === 'weekly') cadenceStr = 'Weekly';
                else if (b.frequency === 'biweekly') cadenceStr = 'Every 2 Wks';
                else if (b.frequency === 'quarterly') cadenceStr = `Quarterly (Day ${b.due_day || 1})`;
                else if (b.frequency === 'yearly') cadenceStr = `Yearly (${b.month || 'Jan'} ${b.due_day || 1})`;
                else if (b.frequency === 'custom_weeks') cadenceStr = `Every ${b.interval_n} Wks`;
                else if (b.frequency === 'custom_months') cadenceStr = `Every ${b.interval_n} Mos`;

                return `
                  <tr>
                    <td><strong>${b.desc}</strong></td>
                    <td><span class="badge" style="font-size:10px;">${cadenceStr}</span></td>
                    <td class="text-right"><strong>${curr}${Number(b.amount).toFixed(2)}</strong></td>
                    <td><span style="font-size:11px; color:var(--text-muted);">${b.account || 'Current Account'}</span></td>
                    <td><span style="font-size:11px; color:${b.transfer_to && b.transfer_to !== 'none' ? 'var(--purple)' : 'var(--text-muted)'};">${b.transfer_to && b.transfer_to !== 'none' ? `🏦 ${b.transfer_to}` : '-'}</span></td>
                    <td><button class="del-btn" style="height:18px; width:18px; line-height:16px;" onclick="window.budgetApp.deleteUnifiedScheduledBill('${b.source_type}', ${b.source_idx}, '${activeFilter}')">&times;</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- ADD NEW SCHEDULED BILL FORM -->
      <div style="border-top:1px solid var(--border); padding-top:12px;">
        <h5 style="margin:0 0 10px 0; color:var(--curr-border); font-size:12px; text-transform:uppercase;">+ Add Scheduled Bill or Direct Debit</h5>

        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <input type="text" id="sched-desc" placeholder="e.g. Mortgage, Council Tax, Cleaner, Gym, Car Insurance" style="flex:2;">
          <input type="number" step="0.01" id="sched-amt" placeholder="Amount (${curr})" style="flex:1;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Frequency</label>
            <select id="sched-freq" onchange="window.budgetApp.onScheduledFreqChange(this.value)" style="width:100%; font-size:11px; margin-top:2px;">
              <option value="monthly" selected>📅 Monthly Direct Debit</option>
              <option value="weekly">🔄 Weekly</option>
              <option value="biweekly">🔄 Bi-Weekly (Every 2 Weeks)</option>
              <option value="quarterly">🗓️ Quarterly (Every 3 Months)</option>
              <option value="yearly">🎉 Annual Bill (Once a year)</option>
              <option value="custom_weeks">⚙️ Custom (Every N Weeks)</option>
              <option value="custom_months">⚙️ Custom (Every N Months)</option>
            </select>
          </div>

          <div id="sched-day-box">
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Due Day of Month (1-31)</label>
            <input type="number" min="1" max="31" id="sched-due-day" value="1" style="width:100%; font-size:11px; margin-top:2px;">
          </div>

          <div id="sched-month-box" style="display:none;">
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Target Month</label>
            <select id="sched-month" style="width:100%; font-size:11px; margin-top:2px;">
              ${months.map(m => `<option value="${m}" ${m === activeTab ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>

          <div id="sched-interval-box" style="display:none;">
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Interval Step (N)</label>
            <input type="number" min="1" max="52" id="sched-interval" value="2" style="width:100%; font-size:11px; margin-top:2px;">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Paid From Account</label>
            <select id="sched-acc" style="width:100%; font-size:11px; margin-top:2px;">
              <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
              ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
              ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
            </select>
          </div>

          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Transfer Destination (Optional)</label>
            <select id="sched-transfer" style="width:100%; font-size:11px; margin-top:2px;">
              <option value="none">None (Expense)</option>
              ${(cfg.savings_accounts || []).map(s => `<option value="${s}">📈 ${s} (Savings)</option>`).join('')}
            </select>
          </div>
        </div>

        <button class="btn green" style="width:100%; justify-content:center; margin-top:6px;" onclick="window.budgetApp.confirmAddUnifiedScheduledBill('${activeFilter}')">Save Scheduled Bill</button>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Done</button>
    `
  });
}

export function openPinUnlockModal(person, callback) {
  window.pendingPinCallback = callback;
  showModal({
    title: `🔒 Enter PIN: ${person}`,
    body: `
      <div style="text-align:center; padding:10px 0;">
        <p style="font-size:12.5px; color:var(--text-muted); margin:0 0 16px 0; line-height:1.4;">
          Enter the 4-digit PIN for <strong>${person}</strong> to unlock personal accounts and view private salary.
        </p>

        <div style="margin-bottom:14px;">
          <input type="password" id="user-pin-input" maxlength="6" inputmode="numeric" placeholder="••••" style="font-size:24px; text-align:center; letter-spacing:8px; width:160px; padding:6px 12px; font-weight:bold;" autofocus onkeydown="if(event.key==='Enter') window.budgetApp.submitPinUnlock('${person}')">
          <div id="pin-error-msg" style="color:var(--red); font-size:11.5px; margin-top:6px; min-height:16px; font-weight:600;"></div>
        </div>

        <!-- ON-SCREEN NUMPAD -->
        <div style="display:grid; grid-template-columns:repeat(3, 56px); gap:8px; justify-content:center; margin-top:10px;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
            <button class="btn secondary" style="font-size:16px; height:44px; font-weight:bold; justify-content:center;" onclick="window.budgetApp.appendPinDigit('${n}', '${person}')">${n}</button>
          `).join('')}
          <button class="btn secondary" style="font-size:11px; height:44px; justify-content:center; color:var(--text-muted);" onclick="window.budgetApp.clearPinInput()">Clear</button>
          <button class="btn secondary" style="font-size:16px; height:44px; font-weight:bold; justify-content:center;" onclick="window.budgetApp.appendPinDigit('0', '${person}')">0</button>
          <button class="btn secondary" style="font-size:16px; height:44px; justify-content:center;" onclick="window.budgetApp.backspacePinInput()">⌫</button>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.submitPinUnlock('${person}')">Unlock 🔓</button>
    `
  });

  setTimeout(() => {
    const inp = document.getElementById('user-pin-input');
    if (inp) inp.focus();
  }, 100);
}

export function openSetPinModal(person) {
  const currentPin = getPersonPin(person);
  const hasPin = !!currentPin;

  showModal({
    title: `🔒 Configure Security PIN: ${person}`,
    body: `
      <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
        <p style="font-size:12px; color:var(--text-muted); margin:0;">
          Setting a 4-to-6 digit PIN protects <strong>${person}</strong>'s personal bank accounts and salary details on shared dashboards.
        </p>

        <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:10px; font-size:12px;">
          Status: <strong>${hasPin ? '🔒 PIN Protection Active' : '🔓 No PIN Configured (Open Access)'}</strong>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">New 4-to-6 Digit PIN</label>
          <input type="password" id="new-pin-input" maxlength="6" inputmode="numeric" placeholder="Enter new PIN" style="width:100%; margin-top:4px; font-size:14px;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Confirm PIN</label>
          <input type="password" id="confirm-pin-input" maxlength="6" inputmode="numeric" placeholder="Confirm new PIN" style="width:100%; margin-top:4px; font-size:14px;">
        </div>

        <div id="set-pin-error" style="color:var(--red); font-size:11px; font-weight:600; min-height:16px;"></div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      ${hasPin ? `<button class="btn red" onclick="window.budgetApp.removePersonPin('${person}')">Remove PIN</button>` : ''}
      <button class="btn green" onclick="window.budgetApp.savePersonPin('${person}')">Save PIN</button>
    `
  });
}

