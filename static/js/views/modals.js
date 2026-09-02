import { appState, getSettings, getYearData, getMonthData, getWeekItems, getAccountConfig, months, isMultiUserEnabled, getAccountOwner, getPersonPin, hasPersonPin, setPersonPin, unlockUser, isUserUnlocked, setActiveUser, isAccountVisibleToActiveUser } from '../state.js';
import { calculateMonthSchedule, calculateAndSyncRollovers, detectCurrentMonthAndWeek } from '../calculations.js';
import { saveBudget } from '../api.js';

export function showModal(opts) {
  const fab = document.getElementById('fabContainer');
  if (fab) fab.classList.remove('open');

  const modal = document.getElementById('genericModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const actions = document.getElementById('modalActions');
  const calcBtn = document.getElementById('modalCalculatorBtn');
  if (!modal || !title || !body || !actions) return;

  title.innerText = opts.title || 'Modal';
  body.innerHTML = opts.body || '';
  actions.innerHTML = opts.actions || `<button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>`;
  if (calcBtn) {
    calcBtn.style.display = opts.hideCalc ? 'none' : 'inline-flex';
  }
  modal.style.display = 'flex';
}

export function closeModal() {
  const modal = document.getElementById('genericModal');
  if (modal) modal.style.display = 'none';
  window.pendingModalAction = null;
  if (window._pinKeydownHandler) {
    window.removeEventListener('keydown', window._pinKeydownHandler);
    window._pinKeydownHandler = null;
  }
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
  const isMulti = isMultiUserEnabled();
  const activeUser = appState.activeUser || 'Joint';

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
              if (!isAccountVisibleToActiveUser('current', a)) return '';
              const conf = getAccountConfig('current', a);
              const isEdited = mData.current_data[a] && mData.current_data[a].user_edited;
              const bal = (mData.current_data[a] && mData.current_data[a].opening !== undefined) ? mData.current_data[a].opening : '';
              const owner = getAccountOwner('current', a);
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
                            ${activeUser !== 'Joint' ? `
                              <option value="${activeUser}" ${owner === activeUser ? 'selected' : ''}>👤 ${activeUser}</option>
                            ` : (cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
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
              if (!isAccountVisibleToActiveUser('credit', c.name)) return '';
              const conf = getAccountConfig('credit', c.name);
              const spent = (mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent !== undefined) ? mData.credit_data[c.name].opening_spent : '';
              const isEdited = mData.credit_data[c.name] && mData.credit_data[c.name].user_edited;
              const owner = getAccountOwner('credit', c.name);
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
                            ${activeUser !== 'Joint' ? `
                              <option value="${activeUser}" ${owner === activeUser ? 'selected' : ''}>👤 ${activeUser}</option>
                            ` : (cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
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
                if (!isAccountVisibleToActiveUser('savings', s)) return '';
                const conf = getAccountConfig('savings', s);
                const isEdited = mData.savings_data[s] && mData.savings_data[s].user_edited;
                const bal = (mData.savings_data[s] && mData.savings_data[s].opening !== undefined) ? mData.savings_data[s].opening : '';
                const owner = getAccountOwner('savings', s);
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
                            ${activeUser !== 'Joint' ? `
                              <option value="${activeUser}" ${owner === activeUser ? 'selected' : ''}>👤 ${activeUser}</option>
                            ` : (cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
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

  const linkedAccounts = cfg.open_banking?.linked_accounts || [];

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
              const linkedItem = linkedAccounts.find(item => {
                const mapped = (item.mapped_habit_account_id || '').replace(/^(credit|current|savings):/i, '').trim().toLowerCase();
                return mapped === acc.toLowerCase();
              });
              const liveBal = linkedItem && linkedItem.last_balance !== undefined && linkedItem.last_balance !== null ? Number(linkedItem.last_balance) : null;
              return `
                <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <div>
                    <strong style="color:var(--heading); font-size:13px;">${acc}</strong>
                    ${liveBal !== null ? `
                      <div style="margin-top:2px;">
                        <button type="button" class="btn secondary" style="font-size:10px; padding:1px 6px; line-height:1.4;" onclick="document.getElementById('qchk_curr_${acc}').value = '${liveBal.toFixed(2)}'" title="Fill with latest Open Banking balance">⚡ Live: ${curr}${liveBal.toFixed(2)}</button>
                      </div>
                    ` : ''}
                  </div>
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
                const linkedItem = linkedAccounts.find(item => {
                  const mapped = (item.mapped_habit_account_id || '').replace(/^(credit|current|savings):/i, '').trim().toLowerCase();
                  return mapped === c.name.toLowerCase() || (item.mapped_habit_account_id || '').toLowerCase() === c.name.toLowerCase();
                });
                let liveAvail = null;
                if (linkedItem) {
                  if (linkedItem.last_available !== undefined && linkedItem.last_available !== null && Number(linkedItem.last_available) > 0) {
                    liveAvail = Number(linkedItem.last_available);
                  } else if (Number(c.limit || 0) > 0 && linkedItem.last_balance !== undefined) {
                    liveAvail = Math.max(0, Number(c.limit) - Math.abs(Number(linkedItem.last_balance)));
                  }
                }
                return `
                  <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <div>
                      <strong style="color:var(--heading); font-size:13px;">${c.name}</strong>
                      <span style="font-size:10px; color:var(--text-muted); margin-left:4px;">(Credit Limit: ${curr}${c.limit})</span>
                      ${liveAvail !== null ? `
                        <div style="margin-top:2px;">
                          <button type="button" class="btn secondary" style="font-size:10px; padding:1px 6px; line-height:1.4;" onclick="document.getElementById('qchk_c_avail_${c.name}').value = '${liveAvail.toFixed(2)}'" title="Fill with latest Open Banking available credit">⚡ Live Avail: ${curr}${liveAvail.toFixed(2)}</button>
                        </div>
                      ` : ''}
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
                const linkedItem = linkedAccounts.find(item => {
                  const mapped = (item.mapped_habit_account_id || '').replace(/^(credit|current|savings):/i, '').trim().toLowerCase();
                  return mapped === s.toLowerCase();
                });
                const liveBal = linkedItem && linkedItem.last_balance !== undefined && linkedItem.last_balance !== null ? Number(linkedItem.last_balance) : null;
                return `
                  <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <div>
                      <strong style="color:var(--heading); font-size:13px;">${s}</strong>
                      ${liveBal !== null ? `
                        <div style="margin-top:2px;">
                          <button type="button" class="btn secondary" style="font-size:10px; padding:1px 6px; line-height:1.4;" onclick="document.getElementById('qchk_sav_${s}').value = '${liveBal.toFixed(2)}'" title="Fill with latest Open Banking balance">⚡ Live: ${curr}${liveBal.toFixed(2)}</button>
                        </div>
                      ` : ''}
                    </div>
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
          <input type="text" id="rec-desc" placeholder="e.g. Window Cleaner, Gym, Streaming Service" style="flex:2;">
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

  if (window._pinKeydownHandler) {
    window.removeEventListener('keydown', window._pinKeydownHandler);
    window._pinKeydownHandler = null;
  }

  window._pinKeydownHandler = (e) => {
    if (!document.getElementById('user-pin-input')) {
      window.removeEventListener('keydown', window._pinKeydownHandler);
      window._pinKeydownHandler = null;
      return;
    }
    if (e.key >= '0' && e.key <= '9') {
      window.budgetApp.appendPinDigit(e.key, person);
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      window.budgetApp.backspacePinInput();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      window.budgetApp.submitPinUnlock(person);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      window.budgetApp.closeModal();
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', window._pinKeydownHandler);

  showModal({
    title: `🔒 Enter PIN: ${person}`,
    body: `
      <div style="text-align:center; padding:6px 0;">
        <p style="font-size:12.5px; color:var(--text-muted); margin:0 0 16px 0; line-height:1.4;">
          Enter the 4-digit PIN for <strong>${person}</strong> to unlock personal accounts and view private salary.
        </p>

        <div style="margin-bottom:14px;">
          <input type="password" id="user-pin-input" readonly inputmode="none" maxlength="6" placeholder="••••" style="font-size:26px; text-align:center; letter-spacing:10px; width:170px; padding:6px 12px; font-weight:bold; background:var(--panel-bg); cursor:default; user-select:none;">
          <div id="pin-error-msg" style="color:var(--red); font-size:11.5px; margin-top:6px; min-height:16px; font-weight:600;"></div>
        </div>

        <!-- ON-SCREEN NUMPAD -->
        <div style="display:grid; grid-template-columns:repeat(3, 58px); gap:8px; justify-content:center; margin-top:10px;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
            <button class="btn secondary" style="font-size:17px; height:46px; font-weight:bold; justify-content:center;" onclick="window.budgetApp.appendPinDigit('${n}', '${person}')">${n}</button>
          `).join('')}
          <button class="btn secondary" style="font-size:11.5px; height:46px; justify-content:center; color:var(--text-muted);" onclick="window.budgetApp.clearPinInput()">Clear</button>
          <button class="btn secondary" style="font-size:17px; height:46px; font-weight:bold; justify-content:center;" onclick="window.budgetApp.appendPinDigit('0', '${person}')">0</button>
          <button class="btn secondary" style="font-size:16px; height:46px; justify-content:center;" onclick="window.budgetApp.backspacePinInput()">⌫</button>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.submitPinUnlock('${person}')">Unlock 🔓</button>
    `,
    hideCalc: true
  });
}

export function openSetPinModal(person) {
  const cfg = getSettings();
  let hasPin = false;
  if (person === 'Master') {
    hasPin = !!(cfg.security && cfg.security.master_pin_enabled);
  } else if (person === 'Joint') {
    hasPin = !!(cfg.security && cfg.security.joint_pin_enabled);
  } else {
    hasPin = hasPersonPin(person);
  }

  let desc = `Setting a 4-to-6 digit PIN protects <strong>${person}</strong>'s personal bank accounts and salary details on shared dashboards.`;
  if (person === 'Master') {
    desc = 'Setting a 4-to-6 digit Master PIN locks your entire budget when opening HABit on your browser or Home Assistant dashboard.';
  } else if (person === 'Joint') {
    desc = 'Setting a 4-to-6 digit PIN protects the shared Joint household view on tablets or shared devices.';
  }

  showModal({
    title: `🔒 Configure Security PIN: ${person === 'Master' ? 'Master PIN' : (person === 'Joint' ? 'Joint Household' : person)}`,
    body: `
      <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
        <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">
          ${desc}
        </p>

        <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:10px; font-size:12px;">
          Status: <strong>${hasPin ? '🔒 PIN Protection Active' : '🔓 No PIN Configured (Open Access)'}</strong>
        </div>

        ${hasPin ? `
          <div>
            <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Current PIN</label>
            <input type="password" id="old-pin-input" maxlength="6" inputmode="numeric" placeholder="Enter current PIN" style="width:100%; margin-top:4px; font-size:14px;">
          </div>
        ` : ''}

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">${hasPin ? 'New PIN' : 'Enter 4-to-6 Digit PIN'}</label>
          <input type="password" id="new-pin-input" maxlength="6" inputmode="numeric" placeholder="Enter PIN code" style="width:100%; margin-top:4px; font-size:14px;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Confirm PIN</label>
          <input type="password" id="confirm-pin-input" maxlength="6" inputmode="numeric" placeholder="Confirm PIN code" style="width:100%; margin-top:4px; font-size:14px;">
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

// ---------------------------------------------------------
// OPEN BANKING MODALS
// ---------------------------------------------------------

export async function openBankLinkModal() {
  const cfg = getSettings();
  const isMulti = isMultiUserEnabled();
  const activeUser = appState.activeUser || 'Joint';

  showModal({
    title: '⚡ Connect Bank Account (Open Banking)',
    body: `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">
          Select your banking institution below to initiate a secure, read-only Open Banking connection. You will be redirected to your bank's official app or web portal to authorize access.
        </p>

        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="bankSearchInput" placeholder="🔍 Search banks (e.g. Monzo, Barclays, Chase, HSBC, Lloyds...)" style="flex:1; font-size:12px;" oninput="window.budgetApp.filterBankList(this.value)">
          <select id="bankCountrySelect" onchange="window.budgetApp.changeBankCountry(this.value)" style="width:90px; font-size:12px;">
            <option value="GB" selected>🇬🇧 UK</option>
            <option value="US">🇺🇸 US</option>
            <option value="IE">🇮🇪 Ireland</option>
            <option value="FR">🇫🇷 France</option>
            <option value="DE">🇩🇪 Germany</option>
            <option value="ES">🇪🇸 Spain</option>
          </select>
        </div>

        ${isMulti ? `
          <div style="display:flex; align-items:center; gap:8px; background:var(--panel-bg); border:1px solid var(--border); padding:8px 10px; border-radius:6px;">
            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase;">Account Owner:</label>
            <select id="bankLinkOwner" style="flex:1; font-size:12px;">
              <option value="Joint">👥 Joint / Shared Account</option>
              ${(cfg.people || []).map(p => `<option value="${p}" ${activeUser === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <div id="bankInstitutionsList" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px; max-height:260px; overflow-y:auto; padding:4px 2px;">
          <div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">Loading supported banks...</div>
        </div>

        <div style="background:rgba(0,0,0,0.15); border:1px solid var(--border); border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span style="font-size:11px; color:var(--text-muted);">📱 On mobile or redirected to browser?</span>
          <button type="button" class="btn secondary" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.openManualAuthCodeModal()">📋 Paste Return URL / Code</button>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
    `
  });

  window.budgetApp.loadBankInstitutions('GB');
}

export function openManualAuthCodeModal() {
  showModal({
    title: '📋 Complete Mobile Bank Authorization',
    body: `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">
          When authorizing on a mobile phone or external browser, your bank redirects to your browser (e.g. <code>https://home.bb12ett.uk/?code=...</code>).
        </p>
        <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">
          Copy the full URL from your browser's address bar (or just the <code>code</code> parameter) and paste it below:
        </p>
        <div>
          <label style="font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px;">Return URL or Authorization Code:</label>
          <textarea id="manualAuthUrlInput" rows="3" placeholder="https://home.bb12ett.uk/?code=...&state=..." style="width:100%; font-family:monospace; font-size:11.5px; padding:8px;"></textarea>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.submitManualAuthCode(document.getElementById('manualAuthUrlInput').value)">⚡ Complete Connection</button>
    `
  });
}

export function openTransactionLedgerModal(weekIndex = null, targetMonth = null) {
  const data = appState.data || {};
  const allTxns = data.open_banking_transactions || [];
  const curr = getSettings().currency || '£';
  const currentYear = appState.currentYear || new Date().getFullYear();
  const mName = targetMonth || appState.activeTab || 'Jan';
  const mIdx = months.indexOf(mName) !== -1 ? months.indexOf(mName) : 0;
  const schedule = calculateMonthSchedule(currentYear, mIdx);

  const selectedIdx = (weekIndex !== null && weekIndex !== undefined && weekIndex !== 'all') ? parseInt(weekIndex, 10) : 'all';

  let filteredTxns = allTxns;
  let weekLabel = "All Transactions";

  if (selectedIdx !== 'all' && schedule.weeks && schedule.weeks[selectedIdx]) {
    const wObj = schedule.weeks[selectedIdx];
    weekLabel = `${mName} - ${wObj.name || `Week ${selectedIdx + 1}`} (${wObj.label || ''})`;
    const wStart = new Date(wObj.startDate.getFullYear(), wObj.startDate.getMonth(), wObj.startDate.getDate(), 0, 0, 0).getTime();
    const wEnd = new Date(wObj.endDate.getFullYear(), wObj.endDate.getMonth(), wObj.endDate.getDate(), 23, 59, 59).getTime();

    filteredTxns = allTxns.filter(t => {
      if (!t.booking_date) return false;
      const cleanDate = t.booking_date.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const tTime = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).getTime();
        return tTime >= wStart && tTime <= wEnd;
      }
      return false;
    });
  } else if (selectedIdx === 'all' && targetMonth) {
    weekLabel = `${mName} (All Weeks)`;
    if (schedule.weeks && schedule.weeks.length > 0) {
      const firstW = schedule.weeks[0];
      const lastW = schedule.weeks[schedule.weeks.length - 1];
      const mStart = new Date(firstW.startDate.getFullYear(), firstW.startDate.getMonth(), firstW.startDate.getDate(), 0, 0, 0).getTime();
      const mEnd = new Date(lastW.endDate.getFullYear(), lastW.endDate.getMonth(), lastW.endDate.getDate(), 23, 59, 59).getTime();

      filteredTxns = allTxns.filter(t => {
        if (!t.booking_date) return false;
        const cleanDate = t.booking_date.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
          const tTime = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).getTime();
          return tTime >= mStart && tTime <= mEnd;
        }
        return false;
      });
    }
  }

  const totalInflow = filteredTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOutflow = filteredTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  showModal({
    title: `⚡ Live Bank Transactions: ${weekLabel}`,
    body: `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:6px;">
          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted); display:block; margin-bottom:2px;">Month:</label>
            <select id="txnLedgerMonthSelect" onchange="window.budgetApp.openTransactionLedgerModal(document.getElementById('txnLedgerWeekSelect')?.value || 'all', this.value)" style="width:100%; font-size:12px; font-weight:600;">
              ${months.map(m => `<option value="${m}" ${m === mName ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted); display:block; margin-bottom:2px;">Week Period:</label>
            <select id="txnLedgerWeekSelect" onchange="window.budgetApp.openTransactionLedgerModal(this.value, document.getElementById('txnLedgerMonthSelect')?.value || '${mName}')" style="width:100%; font-size:12px; font-weight:600;">
              <option value="all" ${selectedIdx === 'all' ? 'selected' : ''}>📅 Whole Month (${mName})</option>
              ${schedule.weeks.map((w, idx) => `
                <option value="${idx}" ${selectedIdx === idx ? 'selected' : ''}>${w.name || `Week ${idx + 1}`} (${w.label || ''})</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:8px 12px; font-size:11.5px;">
          <div>Outflows: <strong style="color:var(--red);">${curr}${totalOutflow.toFixed(2)}</strong></div>
          <div>Inflows: <strong style="color:var(--green);">${curr}${totalInflow.toFixed(2)}</strong></div>
          <div style="color:var(--text-muted);">Showing <strong>${filteredTxns.length}</strong> transactions</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <input type="text" placeholder="🔍 Filter transactions by payee, description, or amount..." id="txnSearchInput" style="flex:1; min-width:180px; font-size:12px;" oninput="window.budgetApp.filterTxnLedger(this.value)">
        </div>

        <div id="txnLedgerList" style="display:flex; flex-direction:column; gap:6px; max-height:340px; overflow-y:auto; padding-right:2px;">
          ${filteredTxns.length === 0 ? `
            <div style="text-align:center; padding:30px; color:var(--text-muted); font-size:12px;">
              No transactions found for ${weekLabel}.
            </div>
          ` : filteredTxns.slice().reverse().map(t => {
            const cfg = getSettings();
            const linkedAccounts = cfg.open_banking?.linked_accounts || [];
            const linkedAcc = linkedAccounts.find(la => String(la.account_id) === String(t.account_id));
            let dispAccountName = t.account_name || 'Checking';
            if (linkedAcc && linkedAcc.mapped_habit_account_id) {
              dispAccountName = linkedAcc.mapped_habit_account_id.replace(/^(credit|current|savings):/i, '').trim();
            }
            const matchBadge = t.matched_bill_id 
              ? `<span class="badge" style="background:rgba(16,185,129,0.2); color:var(--green); font-size:9.5px; padding:2px 6px; margin-left:4px; font-weight:600; border:1px solid rgba(16,185,129,0.35);">⚡ Matched: ${t.matched_bill_id}</span>`
              : (t.auto_cleared ? '<span class="badge" style="background:rgba(16,185,129,0.2); color:var(--green); font-size:9.5px; padding:2px 6px; margin-left:4px; font-weight:600; border:1px solid rgba(16,185,129,0.35);">⚡ Auto-Cleared Bill</span>' : '');

            return `
            <div class="txn-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; font-size:11.5px;">
              <div style="min-width:0; flex:1; margin-right:12px;">
                <div style="font-weight:600; color:var(--heading); word-break:break-word;">${t.payee_name || 'Transaction'}</div>
                <div style="font-size:10px; color:var(--text-muted); display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:2px;">
                  <span>${t.booking_date} • ${dispAccountName}</span>
                  ${matchBadge}
                </div>
              </div>
              <div style="font-weight:700; color:${t.amount < 0 ? 'var(--red)' : 'var(--green)'}; font-size:12.5px; white-space:nowrap;">
                ${t.amount < 0 ? '-' : '+'}${curr}${Math.abs(Number(t.amount || 0)).toFixed(2)}
              </div>
            </div>
          `;
          }).join('')}
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>
      <button class="btn green" onclick="window.budgetApp.triggerOpenBankingSync()">🔄 Sync Now</button>
    `
  });
}

export function openBankStatementUploadModal() {
  const cfg = getSettings();
  const isMulti = isMultiUserEnabled();
  const activeUser = appState.activeUser || 'Joint';

  showModal({
    title: '📁 Import Bank Statement (Offline CSV / OFX / QIF)',
    body: `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">
          Upload your bank statement export (.csv, .ofx, .qif) from Monzo, Barclays, Starling, HSBC, Lloyds, NatWest, Chase, Amex, or any other bank. Transactions are processed 100% locally and will auto-match scheduled bills!
        </p>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <div style="flex:1; min-width:180px;">
            <label style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px;">Target Account:</label>
            <select id="statementTargetAccount" style="width:100%; font-size:12px;">
              ${(cfg.current_accounts || []).map(ca => `<option value="${ca}">Checking: ${ca}</option>`).join('')}
              ${(cfg.credit_accounts || []).map(ca => `<option value="${ca.name}">Credit: ${ca.name}</option>`).join('')}
            </select>
          </div>

          ${isMulti ? `
            <div style="flex:1; min-width:140px;">
              <label style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px;">Owner:</label>
              <select id="statementOwner" style="width:100%; font-size:12px;">
                <option value="Joint">👥 Joint / Shared</option>
                ${(cfg.people || []).map(p => `<option value="${p}" ${activeUser === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
              </select>
            </div>
          ` : ''}
        </div>

        <div id="dropZone" style="border:2px dashed var(--border); border-radius:10px; padding:24px 16px; text-align:center; background:rgba(0,0,0,0.1); cursor:pointer; transition:border-color 0.2s;" onclick="document.getElementById('statementFileInput').click()">
          <div style="font-size:32px; margin-bottom:6px;">📄</div>
          <div style="font-weight:600; font-size:13px; color:var(--heading); margin-bottom:4px;">Click or Drag & Drop Bank Statement</div>
          <div style="font-size:11px; color:var(--text-muted);">Supports .CSV, .OFX, .QFX, and .QIF files</div>
          <input type="file" id="statementFileInput" accept=".csv,.ofx,.qfx,.qif,.tsv" style="display:none;" onchange="window.budgetApp.handleStatementFileSelected(event)">
        </div>

        <div id="statementUploadStatus" style="font-size:11.5px; text-align:center; display:none;"></div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
    `
  });
}

export async function openDebugLogModal() {
  showModal({
    title: '📄 Open Banking Debug Log',
    body: `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:11px; color:var(--text-muted);">Real-time log output from <code>open_banking_debug.txt</code></div>
          <button type="button" class="btn secondary" style="font-size:10.5px; padding:3px 8px;" onclick="window.budgetApp.openDebugLogModal()">🔄 Refresh</button>
        </div>
        <div id="debugLogContainer" style="background:#0c0d14; color:#00ff88; font-family:Consolas, Monaco, monospace; font-size:11px; padding:12px; border-radius:6px; max-height:400px; overflow-y:auto; white-space:pre-wrap; word-break:break-all; border:1px solid var(--border); line-height:1.4;">
          Loading log...
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.copyDebugLog()">📋 Copy Log</button>
      <button class="btn secondary" onclick="window.budgetApp.downloadDebugLog()">⬇️ Download .txt</button>
      <button class="btn secondary" onclick="window.budgetApp.clearDebugLog(); window.budgetApp.openDebugLogModal();">🗑️ Clear</button>
      <button class="btn green" onclick="window.budgetApp.closeModal()">Done</button>
    `
  });

  try {
    const basePath = (window.location.pathname.endsWith('index.html') ? window.location.pathname.slice(0, -10) : window.location.pathname).replace(/\/+$/, '');
    const url = (basePath ? basePath : '') + '/api/openbanking/debug/log';
    const r = await fetch(url, { cache: 'no-store' });
    const text = await r.text();
    const c = document.getElementById('debugLogContainer');
    if (c) {
      c.innerText = text;
      c.scrollTop = c.scrollHeight;
    }
  } catch (e) {
    const c = document.getElementById('debugLogContainer');
    if (c) c.innerText = 'Error loading log: ' + e.message;
  }
}

export function openRecategorizeModal(txnId, merchantName, currentCatId) {
  const allTxns = (window.appState && window.appState.data && window.appState.data.open_banking_transactions) || [];
  const foundTxn = allTxns.find(t => String(t.transaction_id) === String(txnId));
  const effectiveMerchant = merchantName || foundTxn?.merchant_name || foundTxn?.payee_name || foundTxn?.raw_info || foundTxn?.description || 'Transaction';

  const categories = window.SPEND_CATEGORIES || [];
  if (window.budgetApp) {
    window.budgetApp._pendingRecategorize = { txnId, merchantName: effectiveMerchant };
  }

  // Clean suggested merchant name
  const cleanMerchant = (effectiveMerchant || '')
    .replace(/[*\-_#/:.,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  showModal({
    title: '🏷️ Categorize Transaction',
    body: `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <p style="font-size:12.5px; color:var(--text-muted); margin:0;">
          Assign a spend category for <strong id="modalRecatMerchantName" style="color:var(--heading);">${effectiveMerchant}</strong>:
        </p>

        <div>
          <label style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px;">Merchant / Keyword Rule:</label>
          <input type="text" id="modalRecatMerchantInput" value="${cleanMerchant}" style="width:100%; font-size:12px; padding:6px 8px; border-radius:6px;" placeholder="Merchant name or pattern">
        </div>

        <div>
          <label style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px;">Spend Category:</label>
          <select id="modalRecategorizeSelect" style="width:100%; font-size:12.5px; font-weight:600; padding:6px 8px; border-radius:6px;">
            ${categories.map(c => `<option value="${c.id}" ${c.id === currentCatId ? 'selected' : ''}>${c.icon} ${c.label}</option>`).join('')}
          </select>
        </div>

        <div style="background:rgba(0,0,0,0.12); border:1px solid var(--border); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:10px;">
          <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--heading); cursor:pointer;">
            <input type="checkbox" id="modalSaveMerchantRule" checked style="margin-top:2px;">
            <div>
              <span style="font-weight:600;">Save to Personal Rules</span>
              <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Always categorize all past & future transactions matching this merchant keyword locally.</div>
            </div>
          </label>

          <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--heading); cursor:pointer; border-top:1px dashed var(--border); padding-top:8px;">
            <input type="checkbox" id="modalSuggestToGitHub" checked style="margin-top:2px;">
            <div>
              <span style="font-weight:600;">🌐 Suggest to GitHub Community Database (1-Click / Anonymous)</span>
              <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Share this merchant anonymously so all HABit users benefit in the next category sync. No GitHub account needed!</div>
            </div>
          </label>
        </div>
      </div>
    `,
    actions: `
      <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
      <button class="btn green" onclick="window.budgetApp.applyRecategorizationFromModal()">Save & Apply</button>
    `
  });

  setTimeout(() => {
    const el = document.getElementById('modalRecatMerchantName');
    if (el) el.innerText = merchantName || 'this transaction';
  }, 10);
}

export function openManualBillMatchModal(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr) {
  const mName = months.includes(monthName) ? monthName : (appState.activeTab || 'Jan');
  const yData = getYearData();
  const mData = getMonthData(mName);
  const cfg = getSettings();
  const curr = cfg.currency_symbol || '£';
  const desc = billDesc || 'Scheduled Bill';
  const amt = billAmount !== undefined ? Number(billAmount) : 0;

  // Locate the bill item using budgetApp.findScheduledItem if available, or full fallback
  let item = (window.budgetApp && typeof window.budgetApp.findScheduledItem === 'function')
    ? window.budgetApp.findScheduledItem(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr)
    : null;

  if (!item) {
    const isMatch = (cand) => cand && (!billDesc || cand.desc === billDesc || cand.name === billDesc || (cand.rawDesc && cand.rawDesc === billDesc));

    if (sourceType === 'direct_debit' && mData.direct_debits) {
      if (sourceIdx !== undefined && isMatch(mData.direct_debits[sourceIdx])) item = mData.direct_debits[sourceIdx];
    } else if ((sourceType === 'payments_in' || sourceType === 'monthly_payment_in') && mData.payments_in) {
      if (sourceIdx !== undefined && isMatch(mData.payments_in[sourceIdx])) item = mData.payments_in[sourceIdx];
    } else if (sourceType === 'scheduled_item' && mData.scheduled_items) {
      if (sourceIdx !== undefined && isMatch(mData.scheduled_items[sourceIdx])) item = mData.scheduled_items[sourceIdx];
    } else if (sourceType === 'yearly_recurring' && yData.yearly_recurring) {
      if (sourceIdx !== undefined && isMatch(yData.yearly_recurring[sourceIdx])) item = yData.yearly_recurring[sourceIdx];
    } else if (sourceType === 'yearly_income' && yData.yearly_income) {
      if (sourceIdx !== undefined && isMatch(yData.yearly_income[sourceIdx])) item = yData.yearly_income[sourceIdx];
    } else if (sourceType === 'recurring_payment') {
      const recurring = yData.recurring_payments || cfg.recurring_payments || [];
      if (sourceIdx !== undefined && isMatch(recurring[sourceIdx])) item = recurring[sourceIdx];
    } else if (sourceType === 'recurring_income') {
      const recurring = yData.recurring_incomes || cfg.recurring_incomes || [];
      if (sourceIdx !== undefined && isMatch(recurring[sourceIdx])) item = recurring[sourceIdx];
    }
  }

  if (!item && billDesc) {
    const cleanTarget = billDesc.replace(/^[🎯🎁📥]\s*/, '').trim().toLowerCase();

    item = (mData.direct_debits || []).find(d => (d.desc === billDesc || d.name === billDesc) && Math.abs((Number(d.amount)||0) - amt) < 0.05)
        || (mData.direct_debits || []).find(d => d.desc === billDesc || d.name === billDesc)
        || (mData.payments_in || []).find(d => d.desc === billDesc || d.name === billDesc)
        || (mData.scheduled_items || []).find(d => d.desc === billDesc || d.name === billDesc)
        || (yData.yearly_recurring || []).find(d => d.desc === billDesc || d.name === billDesc)
        || (yData.yearly_income || []).find(d => d.desc === billDesc || d.name === billDesc)
        || (yData.recurring_payments || []).find(d => d.desc === billDesc || d.name === billDesc)
        || (yData.recurring_incomes || []).find(d => d.desc === billDesc || d.name === billDesc);

    if (!item) {
      for (const b of (yData.yearly_budgets || [])) {
        const bNameLow = (b.name || '').toLowerCase();
        for (const t of (b.transactions || [])) {
          const tDescLow = (t.desc || '').toLowerCase();
          const combinedLow = `${bNameLow} ${tDescLow}`;
          if (combinedLow.includes(cleanTarget) || cleanTarget.includes(tDescLow) || cleanTarget.includes(bNameLow)) {
            item = t;
            break;
          }
        }
        if (item) break;
        if (bNameLow.includes(cleanTarget) || cleanTarget.includes(bNameLow)) {
          item = b;
          break;
        }
      }
    }
  }

  const isIncome = Boolean(item?.is_income || sourceType === 'recurring_income' || sourceType === 'monthly_payment_in' || sourceType === 'yearly_income');
  const isRecurring = Boolean(item?.isRecurring || sourceType === 'recurring_income' || sourceType === 'recurring_payment');

  let targetDateStr = dateStr || '';
  if (!targetDateStr && isRecurring && item?.cleared_dates && mName) {
    const mMatch = item.cleared_dates.find(d => {
      const dt = new Date(d);
      return months[dt.getMonth()] === mName && dt.getFullYear() === appState.currentYear;
    });
    if (mMatch) targetDateStr = mMatch;
  }

  const isCleared = isRecurring
    ? Boolean(targetDateStr ? (item?.cleared_dates && item.cleared_dates.includes(targetDateStr)) : (item?.cleared_dates && item.cleared_dates.some(d => months[new Date(d).getMonth()] === mName && new Date(d).getFullYear() === appState.currentYear)))
    : Boolean(item?.status === 'paid' || item?.auto_cleared || (targetDateStr && item?.cleared_dates && item.cleared_dates.includes(targetDateStr)));

  const cleanDesc = (desc || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const allTxns = (appState.data.open_banking_transactions || []).filter(t => {
    const rawAmt = Number(t.amount) || 0;
    if (Math.abs(rawAmt) < 0.01) return false;
    return isIncome ? (rawAmt > 0) : (rawAmt < 0);
  });

  const sortedTxns = [...allTxns].sort((a, b) => {
    const aAmt = Math.abs(Number(a.amount) || 0);
    const bAmt = Math.abs(Number(b.amount) || 0);
    const aAmtMatch = Math.abs(aAmt - amt) < 0.05;
    const bAmtMatch = Math.abs(bAmt - amt) < 0.05;

    const aPayee = (a.payee_name || a.merchant_name || a.description || '').toLowerCase();
    const bPayee = (b.payee_name || b.merchant_name || b.description || '').toLowerCase();
    const aNameMatch = cleanDesc && aPayee.replace(/[^a-z0-9]/g, '').includes(cleanDesc);
    const bNameMatch = cleanDesc && bPayee.replace(/[^a-z0-9]/g, '').includes(cleanDesc);

    const aExact = aAmtMatch && aNameMatch;
    const bExact = bAmtMatch && bNameMatch;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aEither = aAmtMatch || aNameMatch;
    const bEither = bAmtMatch || bNameMatch;
    if (aEither && !bEither) return -1;
    if (!aEither && bEither) return 1;

    if (targetDateStr && a.booking_date && b.booking_date) {
      const targetTime = new Date(targetDateStr).getTime();
      const aTimeDiff = Math.abs(new Date(a.booking_date).getTime() - targetTime);
      const bTimeDiff = Math.abs(new Date(b.booking_date).getTime() - targetTime);
      return aTimeDiff - bTimeDiff;
    }
    return new Date(b.booking_date || 0) - new Date(a.booking_date || 0);
  });

  const bodyHtml = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:var(--radius-card); padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-weight:700; font-size:13px; color:var(--heading);">
            ${desc} <span style="color:var(--curr-border); margin-left:4px;">${curr}${amt.toFixed(2)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
            Status: <strong style="color:${isCleared ? 'var(--green)' : 'var(--amber)'};">${isCleared ? '✓ Cleared / Paid' : '⚠️ Due'}</strong>
            ${(isCleared && item?.matched_payee) ? ` • Matched with <em>${item.matched_payee}</em> (${targetDateStr || item.matched_date || ''})` : ''}
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          ${isCleared ? `
            <button type="button" class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.toggleScheduledBillCleared('${sourceType}', ${sourceIdx}, '${mName}', '${desc.replace(/'/g, "\\'")}', ${amt}, '${targetDateStr || ''}'); window.budgetApp.closeModal();">❌ Set as Due / Un-match</button>
          ` : `
            <button type="button" class="btn green" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.toggleScheduledBillCleared('${sourceType}', ${sourceIdx}, '${mName}', '${desc.replace(/'/g, "\\'")}', ${amt}, '${targetDateStr || ''}'); window.budgetApp.closeModal();">⚡ Mark Cleared (Manual)</button>
          `}
        </div>
      </div>

      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Select Bank Transaction to Link / Match:</label>
          <input type="text" placeholder="🔍 Filter transactions..." style="font-size:11px; padding:3px 8px; width:160px;" oninput="window.budgetApp.filterBillMatchTxns(this.value)">
        </div>
        <div id="billMatchTxnList" style="max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; border:1px solid var(--border); border-radius:6px; padding:6px; background:#0c0d14;">
          ${sortedTxns.length === 0 ? `
            <div style="font-size:11px; color:var(--text-muted); text-align:center; padding:16px;">No matching Open Banking transactions available. Run a Sync in Settings first.</div>
          ` : sortedTxns.map(t => {
            const tAmt = Math.abs(Number(t.amount) || 0);
            const isAmtMatch = Math.abs(tAmt - amt) <= 0.05;
            const tPayee = t.payee_name || t.merchant_name || 'Debit Transaction';
            const isNameMatch = cleanDesc && tPayee.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanDesc);
            const isRecMatch = isAmtMatch || isNameMatch;
            const isCurrentMatch = (isRecurring || Boolean(targetDateStr))
              ? Boolean(targetDateStr && t.booking_date && t.booking_date.startsWith(targetDateStr) && (t.matched_bill_id === desc || item?.matched_txn_id === t.transaction_id))
              : (item?.matched_txn_id === t.transaction_id);

            return `
              <div class="bill-match-row" data-search="${tPayee.toLowerCase()} ${t.account_name || ''} ${tAmt}" style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 8px; border-radius:4px; background:${isCurrentMatch ? 'rgba(16,185,129,0.18)' : (isRecMatch ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.03)')}; border:1px solid ${isCurrentMatch ? 'var(--green)' : (isRecMatch ? 'rgba(56,189,248,0.3)' : 'transparent')};">
                <div style="min-width:0; flex:1;">
                  <div style="font-size:11.5px; font-weight:600; color:var(--heading); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${tPayee}
                    ${isRecMatch ? `<span class="badge" style="font-size:9px; background:rgba(56,189,248,0.25); color:var(--curr-border); padding:1px 4px; margin-left:4px;">✨ Suggested Match</span>` : ''}
                    ${isCurrentMatch ? `<span class="badge" style="font-size:9px; background:rgba(16,185,129,0.25); color:var(--green); padding:1px 4px; margin-left:4px;">✓ Current Match</span>` : ''}
                  </div>
                  <div style="font-size:10px; color:var(--text-muted);">
                    ${t.booking_date || ''} • ${t.account_name || 'Account'} ${t.matched_bill_id && !isCurrentMatch ? `• (Matched: ${t.matched_bill_id})` : ''}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                  <span style="font-weight:700; font-size:12px; color:${t.amount < 0 ? 'var(--red)' : 'var(--green)'};">
                    ${t.amount < 0 ? '-' : '+'}${curr}${tAmt.toFixed(2)}
                  </span>
                  <button type="button" class="btn ${isCurrentMatch ? 'secondary' : 'green'}" style="font-size:10.5px; padding:3px 8px;" onclick="window.budgetApp.linkBillToTransaction('${sourceType}', ${sourceIdx}, '${mName}', '${desc.replace(/'/g, "\\'")}', '${t.transaction_id}', '${targetDateStr || ''}')">
                    ${isCurrentMatch ? 'Re-link' : '🔗 Match & Clear'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  showModal({
    title: `🔗 Match Scheduled Bill: ${desc}`,
    body: bodyHtml,
    actions: `<button class="btn secondary" onclick="window.budgetApp.closeModal()">Close</button>`
  });
}

