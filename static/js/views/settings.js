import { appState, getSettings, getAccountConfig, ALL_AVAILABLE_WIDGETS, isMultiUserEnabled, isPersonSalaryHidden, getPersonSettings, setPersonSalaryPrivacy, getAccountOwner, setAccountOwner, hasPersonPin, isAccountVisibleToActiveUser } from '../state.js';

export function renderSettingsView(container) {
  const cfg = getSettings();
  const currentWidgets = cfg.enabled_widgets || [];
  let currentTheme = cfg.theme || 'grey_dark';
  if (currentTheme === 'ha_dark') currentTheme = 'grey_dark';
  if (currentTheme === 'dark') currentTheme = 'navy_dark';
  const isMulti = isMultiUserEnabled();
  const activeUser = appState.activeUser || 'Joint';

  // Visible accounts and members for current user persona
  const visibleCurrentAccounts = isMulti ? cfg.current_accounts.filter(a => isAccountVisibleToActiveUser('current', a)) : cfg.current_accounts;
  const visibleCreditAccounts = isMulti ? cfg.credit_accounts.filter(c => isAccountVisibleToActiveUser('credit', c.name)) : cfg.credit_accounts;
  const visibleSavingsAccounts = isMulti ? cfg.savings_accounts.filter(s => isAccountVisibleToActiveUser('savings', s)) : cfg.savings_accounts;
  const visiblePeople = (isMulti && activeUser !== 'Joint') ? cfg.people.filter(p => p === activeUser) : cfg.people;

  // Widget order resolution
  let allOrder = cfg.all_widget_order;
  if (!allOrder || !Array.isArray(allOrder) || allOrder.length === 0) {
    const remaining = ALL_AVAILABLE_WIDGETS.map(w => w.id).filter(id => !currentWidgets.includes(id));
    allOrder = [...currentWidgets, ...remaining];
  } else {
    const missing = ALL_AVAILABLE_WIDGETS.map(w => w.id).filter(id => !allOrder.includes(id));
    allOrder = [...allOrder, ...missing];
  }
  const widgetMap = {};
  ALL_AVAILABLE_WIDGETS.forEach(w => { widgetMap[w.id] = w; });
  const orderedWidgets = allOrder.map(id => widgetMap[id]).filter(Boolean);

  container.innerHTML = `
    <div class="panel" style="max-width:820px; width:100%; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:4px;">
        <h2 style="margin:0;">⚙️ Global Budget Settings</h2>
        ${isMulti ? `
          <span style="font-size:12px; padding:3px 8px; border-radius:6px; background:var(--panel-bg); border:1px solid var(--curr-border); color:var(--curr-border); font-weight:700;">
            👤 Viewing as: ${activeUser}
          </span>
        ` : ''}
      </div>
      <p style="color:var(--text-muted); font-size:13px; margin:0 0 16px 0;">Configure household accounts, multi-user options, visual appearance, dashboard widgets, and regional preferences.</p>
      
      <div class="settings-form" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap:14px; margin-top:14px; width:100%; box-sizing:border-box;">
        <div class="form-group">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Appearance Theme</label>
          <select id="cfg-theme" onchange="changeTheme(this.value)" style="width:100%;">
            <option value="grey_dark" ${currentTheme === 'grey_dark' ? 'selected' : ''}>🌑 Dark Mode (Charcoal)</option>
            <option value="navy_dark" ${currentTheme === 'navy_dark' ? 'selected' : ''}>🌙 Navy Dark Mode (Deep Blue)</option>
            <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>☀️ Light Mode</option>
            <option value="contrast" ${currentTheme === 'contrast' ? 'selected' : ''}>⬛ High Contrast</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Currency Symbol</label>
          <input type="text" id="cfg-curr" value="${cfg.currency}" maxlength="4" style="width:100%;">
        </div>

        <div class="form-group">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Bank Holiday Region</label>
          <select id="cfg-holiday" style="width:100%;">
            <option value="uk_ew" ${cfg.country_holidays === 'uk_ew' ? 'selected' : ''}>UK - England & Wales</option>
            <option value="uk_scot" ${cfg.country_holidays === 'uk_scot' ? 'selected' : ''}>UK - Scotland</option>
            <option value="us" ${cfg.country_holidays === 'us' ? 'selected' : ''}>United States (Federal)</option>
            <option value="none" ${cfg.country_holidays === 'none' ? 'selected' : ''}>None (Weekends Only)</option>
          </select>
        </div>
      </div>

      <!-- PAYDAY & SCHEDULE ENGINE -->
      <div style="margin:20px 0 14px 0; padding:16px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); width:100%; box-sizing:border-box;">
        <h4 style="margin:0 0 6px 0; color:var(--curr-border); font-size:14px; display:flex; align-items:center; gap:6px;">
          📅 Household Payday Frequency & Schedule
        </h4>
        <p style="font-size:12px; color:var(--text-muted); margin:0 0 14px 0;">
          Select how your household is paid. HABit automatically aligns weekly cashflow columns, calculates exact payment occurrences, and handles 2 vs 3 paycheck months.
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap:14px; width:100%; box-sizing:border-box;">
          <div class="form-group">
            <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Pay Frequency</label>
            <select id="cfg-payfreq" onchange="window.budgetApp.onPayFrequencyChange(this.value)" style="width:100%;">
              <option value="monthly" ${cfg.pay_frequency === 'monthly' || !cfg.pay_frequency ? 'selected' : ''}>📅 Monthly (Once per Month)</option>
              <option value="semi_monthly" ${cfg.pay_frequency === 'semi_monthly' ? 'selected' : ''}>🗓️ Semi-Monthly (Twice per Month)</option>
              <option value="biweekly" ${cfg.pay_frequency === 'biweekly' ? 'selected' : ''}>🔄 Bi-Weekly (Every 2 Weeks / 26 Paychecks)</option>
              <option value="four_weekly" ${cfg.pay_frequency === 'four_weekly' ? 'selected' : ''}>🏥 4-Weekly (NHS / 28-day cycle / 13 Paychecks)</option>
              <option value="weekly" ${cfg.pay_frequency === 'weekly' ? 'selected' : ''}>⚡ Weekly (52 Paychecks)</option>
            </select>
          </div>

          <!-- DYNAMIC FIELDS -->
          <div id="cfg-payday-monthly-box" style="display:${(!cfg.pay_frequency || cfg.pay_frequency === 'monthly') ? 'block' : 'none'};">
            <div class="form-group">
              <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Payday Day of Month</label>
              <input type="number" id="cfg-pday" value="${cfg.payday_day || 26}" min="1" max="31" style="width:100%;">
            </div>
            <div style="margin-top:6px;">
              <label style="font-size:11px; cursor:pointer; color:var(--text-muted); display:inline-flex; align-items:center; gap:6px;">
                <input type="checkbox" id="cfg-pday-lastwork" ${cfg.payday_is_last_working_day ? 'checked' : ''}> Always use Last Working Day of Month
              </label>
            </div>
          </div>

          <div id="cfg-payday-semimonthly-box" style="display:${cfg.pay_frequency === 'semi_monthly' ? 'block' : 'none'};">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <div class="form-group" style="flex:1; min-width:100px;">
                <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">1st Payday (Day)</label>
                <input type="number" id="cfg-pday-first" value="${cfg.payday_first_day || 15}" min="1" max="31" style="width:100%;">
              </div>
              <div class="form-group" style="flex:1; min-width:110px;">
                <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">2nd Payday</label>
                <select id="cfg-pday-second" style="width:100%;">
                  <option value="last_day" ${cfg.payday_second_day === 'last_day' ? 'selected' : ''}>Last Day of Month</option>
                  <option value="1" ${cfg.payday_second_day === '1' ? 'selected' : ''}>1st of Month</option>
                  <option value="28" ${cfg.payday_second_day === '28' ? 'selected' : ''}>28th of Month</option>
                  <option value="30" ${cfg.payday_second_day === '30' ? 'selected' : ''}>30th of Month</option>
                </select>
              </div>
            </div>
          </div>

          <div id="cfg-payday-biweekly-box" style="display:${(cfg.pay_frequency === 'biweekly' || cfg.pay_frequency === 'four_weekly') ? 'block' : 'none'};">
            <div class="form-group">
              <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Anchor Reference Payday</label>
              <input type="date" id="cfg-pday-anchor" value="${cfg.payday_anchor_date || '2026-01-09'}" style="width:100%;">
              <span style="font-size:10px; color:var(--text-muted); display:block; margin-top:2px;">Enter any known payday date to align the cycle.</span>
            </div>
          </div>

          <div id="cfg-payday-weekly-box" style="display:${cfg.pay_frequency === 'weekly' ? 'block' : 'none'};">
            <div class="form-group">
              <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Weekly Payday</label>
              <select id="cfg-pday-weekday" style="width:100%;">
                <option value="5" ${cfg.payday_weekday === 5 ? 'selected' : ''}>Friday</option>
                <option value="4" ${cfg.payday_weekday === 4 ? 'selected' : ''}>Thursday</option>
                <option value="3" ${cfg.payday_weekday === 3 ? 'selected' : ''}>Wednesday</option>
                <option value="2" ${cfg.payday_weekday === 2 ? 'selected' : ''}>Tuesday</option>
                <option value="1" ${cfg.payday_weekday === 1 ? 'selected' : ''}>Monday</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- MULTI-USER & HOUSEHOLD TOGGLE -->
      <div style="margin:20px 0 14px 0; padding:14px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); width:100%; box-sizing:border-box;">
        <label style="font-size:13px; cursor:pointer; font-weight:700; display:flex; align-items:center; gap:8px; color:var(--curr-border);">
          <input type="checkbox" id="cfg-multiusers" ${isMulti ? 'checked' : ''} onchange="window.budgetApp.toggleMultiUserModeInSettings(this.checked)">
          👥 Enable Multi-User / Household Mode
        </label>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px; margin-left:24px; line-height:1.4;">
          Allows per-user salary privacy masking, individual persona switching, and tracking personal checking/credit accounts alongside joint finances.
        </div>
      </div>

      <!-- HOME ASSISTANT SENSORS TOGGLE -->
      <div style="margin:0 0 14px 0; padding:14px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); width:100%; box-sizing:border-box;">
        <label style="font-size:13px; cursor:pointer; font-weight:700; display:flex; align-items:center; gap:8px; color:var(--curr-border);">
          <input type="checkbox" id="cfg-hasensors" ${cfg.enable_ha_sensors !== false ? 'checked' : ''}>
          🏠 Publish Home Assistant Sensors
        </label>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px; margin-left:24px; line-height:1.4;">
          Publishes live entities (<code>sensor.habit_net_position</code>, <code>sensor.habit_days_until_payday</code>, <code>sensor.habit_current_balance</code>, and weekly allowances) directly into Home Assistant for dashboards and automations.
        </div>
      </div>

      <h3 style="margin-top:24px;">Top Dashboard Widgets & Card Order</h3>
      <p style="font-size:12px; color:var(--text-muted); margin:0 0 10px 0;">
        Toggle which cards appear at the top of each month and arrange their order with the ⬆️ ⬇️ buttons or by dragging. The forecast page will reflect this exact order.
      </p>
      
      <div id="settingsWidgetReorderList" style="display:flex; flex-direction:column; gap:6px; width:100%; max-width:700px; box-sizing:border-box;">
        ${orderedWidgets.map((w, idx) => {
          const isChecked = currentWidgets.includes(w.id);
          return `
            <div class="widget-reorder-card" data-widget-id="${w.id}" draggable="true" ondragstart="window.budgetApp.onWidgetDragStart(event, ${idx})" ondragover="window.budgetApp.onWidgetDragOver(event)" ondrop="window.budgetApp.onWidgetDrop(event, ${idx})" style="background:var(--panel-bg); border:1px solid ${isChecked ? 'var(--curr-border)' : 'var(--border)'}; border-radius:var(--radius-card); padding:8px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; box-sizing:border-box; width:100%; transition:border-color 0.2s ease;">
              
              <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                <span style="cursor:grab; color:var(--text-muted); font-size:14px; user-select:none; flex-shrink:0;" title="Drag to reorder">⠿</span>
                <input type="checkbox" id="w_chk_${w.id}" ${isChecked ? 'checked' : ''} onchange="window.budgetApp.toggleWidgetSelection('${w.id}', this.checked)" style="flex-shrink:0; cursor:pointer;">
                <div style="min-width:0; overflow:hidden;">
                  <label for="w_chk_${w.id}" style="font-weight:bold; color:var(--heading); cursor:pointer; font-size:13px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${w.title}
                  </label>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${w.desc}</div>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                <button type="button" class="btn secondary" style="padding:2px 6px; font-size:11px; height:26px; min-height:26px;" onclick="window.budgetApp.moveWidgetOrder(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">⬆️</button>
                <button type="button" class="btn secondary" style="padding:2px 6px; font-size:11px; height:26px; min-height:26px;" onclick="window.budgetApp.moveWidgetOrder(${idx}, 1)" ${idx === orderedWidgets.length - 1 ? 'disabled' : ''} title="Move Down">⬇️</button>
              </div>

            </div>
          `;
        }).join('')}
      </div>

      <h3 style="margin-top:24px;">Account Tracking & Net Position</h3>
      <div style="margin:10px 0 16px 0; padding:12px 14px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; width:100%; box-sizing:border-box;">
        <div style="flex:1; min-width:200px;">
          <strong style="color:var(--curr-border); font-size:13px;">📊 Tracking Modes & Net Position Inclusion</strong>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Configure weekly tracking vs month-end check-in and toggle Net Position inclusion per account.</div>
        </div>
        <button class="btn green" onclick="window.budgetApp.openAccountTrackingModal()" style="flex-shrink:0;">⚙️ Configure Tracking & Net</button>
      </div>

      <h3 style="margin-top:24px;">Current Accounts ${isMulti ? `<span style="font-size:13px; font-weight:normal; color:var(--text-muted);">(${activeUser === 'Joint' ? 'Joint / Shared' : `Joint & ${activeUser}`})</span>` : ''}</h3>
      <div id="currentAccountsList" style="display:flex; flex-direction:column; gap:8px; width:100%; max-width:700px; box-sizing:border-box;">
        ${visibleCurrentAccounts.map((acc) => {
          const realIdx = cfg.current_accounts.indexOf(acc);
          const owner = getAccountOwner('current', acc);
          return `
            <div style="display:flex; align-items:center; gap:8px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); padding:8px 10px; flex-wrap:wrap; box-sizing:border-box; width:100%;">
              <input type="text" value="${acc}" onchange="window.budgetApp.renameCurrentAccount(${realIdx}, this.value)" style="flex:1; min-width:140px;" placeholder="Account Name">
              ${isMulti ? `
                <select onchange="window.budgetApp.updateAccountOwner('current', '${acc}', this.value)" style="width:130px; font-size:11px;" title="Account Owner">
                  <option value="Joint" ${owner === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                  ${activeUser !== 'Joint' ? `
                    <option value="${activeUser}" ${owner === activeUser ? 'selected' : ''}>👤 ${activeUser}</option>
                  ` : (cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                </select>
              ` : ''}
              ${cfg.current_accounts.length > 1 ? `<button class="del-btn" style="width:28px; height:28px; border-radius:6px; flex-shrink:0;" onclick="window.budgetApp.deleteCurrentAccountFromSettings(${realIdx})">&times;</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addCurrentAccountInSettings()">+ Add Current Account</button>

      <h3 style="margin-top:24px;">Credit Cards & Auto-Pay ${isMulti ? `<span style="font-size:13px; font-weight:normal; color:var(--text-muted);">(${activeUser === 'Joint' ? 'Joint / Shared' : `Joint & ${activeUser}`})</span>` : ''}</h3>
      <div id="creditAccountsList" style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:700px; box-sizing:border-box;">
        ${visibleCreditAccounts.map((c) => {
          const realIdx = cfg.credit_accounts.findIndex(x => x.name === c.name);
          const owner = getAccountOwner('credit', c.name);
          return `
            <div class="card-settings-box" style="background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); padding:12px 14px; margin-bottom:4px; box-sizing:border-box; width:100%;">
              <div style="display:flex; gap:8px; margin-bottom:8px; align-items:center; flex-wrap:wrap;">
                <input type="text" value="${c.name}" onchange="window.budgetApp.editCreditAccount(${realIdx}, 'name', this.value)" placeholder="Card Name" style="flex:1; min-width:140px;">
                <div style="width:110px; flex-shrink:0;">
                  <input type="number" step="100" value="${c.limit}" onchange="window.budgetApp.editCreditAccount(${realIdx}, 'limit', this.value)" placeholder="Credit Limit" style="width:100%;">
                </div>
                ${isMulti ? `
                  <select onchange="window.budgetApp.updateAccountOwner('credit', '${c.name}', this.value)" style="width:120px; font-size:11px; flex-shrink:0;" title="Card Owner">
                    <option value="Joint" ${owner === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                    ${activeUser !== 'Joint' ? `
                      <option value="${activeUser}" ${owner === activeUser ? 'selected' : ''}>👤 ${activeUser}</option>
                    ` : (cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                  </select>
                ` : ''}
                <button class="del-btn" style="width:28px; height:28px; border-radius:6px; flex-shrink:0;" onclick="window.budgetApp.deleteCreditAccountFromSettings(${realIdx})">&times;</button>
              </div>

              <div style="border-top:1px dashed var(--border); padding-top:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="autopay_en_${realIdx}" ${c.autopay_enabled ? 'checked' : ''} onchange="window.budgetApp.editCreditAccount(${realIdx}, 'autopay_enabled', this.checked)">
                  <label for="autopay_en_${realIdx}" style="cursor:pointer; font-weight:600; font-size:12px; color:var(--curr-border);">Enable Auto-Pay Settlement</label>
                </div>

                ${c.autopay_enabled ? `
                  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap:8px; margin-top:8px;">
                    <div>
                      <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:2px;">Paid From Account:</label>
                      <select onchange="window.budgetApp.editCreditAccount(${realIdx}, 'autopay_from', this.value)" style="width:100%;">
                        ${visibleCurrentAccounts.map(acc => `<option value="${acc}" ${c.autopay_from === acc ? 'selected' : ''}>${acc}</option>`).join('')}
                      </select>
                    </div>
                    <div>
                      <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:2px;">Settlement Week:</label>
                      <select onchange="window.budgetApp.editCreditAccount(${realIdx}, 'autopay_when', this.value)" style="width:100%;">
                        <option value="week_1" ${c.autopay_when === 'week_1' ? 'selected' : ''}>Week 1</option>
                        <option value="week_2" ${c.autopay_when === 'week_2' ? 'selected' : ''}>Week 2</option>
                        <option value="week_3" ${c.autopay_when === 'week_3' ? 'selected' : ''}>Week 3</option>
                        <option value="week_4" ${c.autopay_when === 'week_4' ? 'selected' : ''}>Week 4</option>
                      </select>
                    </div>
                    <div>
                      <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:2px;">Payment Type:</label>
                      <select onchange="window.budgetApp.editCreditAccount(${realIdx}, 'autopay_type', this.value)" style="width:100%;">
                        <option value="full" ${c.autopay_type === 'full' ? 'selected' : ''}>Full Statement</option>
                        <option value="fixed" ${c.autopay_type === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
                      </select>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addCreditAccountInSettings()">+ Add Credit Card</button>

      <h3 style="margin-top:24px;">Savings Accounts ${isMulti ? `<span style="font-size:13px; font-weight:normal; color:var(--text-muted);">(${activeUser === 'Joint' ? 'Joint / Shared' : `Joint & ${activeUser}`})</span>` : ''}</h3>
      <div style="margin-bottom:8px;">
        <label style="font-size:12px; cursor:pointer; font-weight:600;"><input type="checkbox" id="cfg-tracksavings" ${cfg.track_savings ? 'checked' : ''}> Enable Savings Accounts & Portfolio Tracking</label>
      </div>
      <div id="savingsList" style="display:flex; flex-direction:column; gap:8px; width:100%; max-width:700px; margin-top:8px; box-sizing:border-box;">
        ${visibleSavingsAccounts.map((acc) => {
          const realIdx = cfg.savings_accounts.indexOf(acc);
          const conf = (typeof getAccountConfig === 'function') ? getAccountConfig('savings', acc) : { savings_predict_mode: 'planned' };
          const owner = getAccountOwner('savings', acc);
          return `
            <div style="display:flex; align-items:center; gap:8px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); padding:8px 10px; flex-wrap:wrap; box-sizing:border-box; width:100%;">
              <input type="text" value="${acc}" onchange="window.budgetApp.renameSavingsAccount(${realIdx}, this.value)" style="flex:1; min-width:140px;" placeholder="Savings Account Name">
              <select onchange="window.budgetApp.setSavingsPredictMode('${acc}', this.value)" style="flex:1; min-width:160px; font-size:11px;" title="Choose prediction mode">
                <option value="planned" ${conf.savings_predict_mode !== 'actual' ? 'selected' : ''}>📈 Planned Cashflow</option>
                <option value="actual" ${conf.savings_predict_mode === 'actual' ? 'selected' : ''}>🔄 Roll Forward from Actuals</option>
              </select>
              ${isMulti ? `
                <select onchange="window.budgetApp.updateAccountOwner('savings', '${acc}', this.value)" style="width:120px; font-size:11px; flex-shrink:0;" title="Savings Account Owner">
                  <option value="Joint" ${owner === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                  ${activeUser !== 'Joint' ? `
                    <option value="${activeUser}" ${owner === activeUser ? 'selected' : ''}>👤 ${activeUser}</option>
                  ` : (cfg.people || []).map(p => `<option value="${p}" ${owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                </select>
              ` : ''}
              ${cfg.savings_accounts.length > 1 ? `<button class="del-btn" style="width:28px; height:28px; border-radius:6px; flex-shrink:0;" onclick="window.budgetApp.deleteSavingsAccountFromSettings(${realIdx})">&times;</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addSavingsAccountInSettings()">+ Add Savings Account</button>

      ${!isMulti ? `
        <h3 style="margin-top:24px;">Security & Encryption</h3>
        <div style="margin:10px 0 16px 0; padding:14px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; width:100%; box-sizing:border-box;">
          <div style="flex:1; min-width:200px;">
            <div style="font-weight:700; font-size:13px; color:var(--heading); display:flex; align-items:center; gap:6px;">
              <span>🔒 Master PIN & Database Protection</span>
              ${cfg.security && cfg.security.master_pin_enabled ? '<span class="badge" style="background:#10b981; color:#fff; font-size:10px;">Active</span>' : '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted); font-size:10px;">Disabled</span>'}
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px; line-height:1.4;">
              Protects your budget with a 4-digit PIN lock when opening HABit on your browser or Home Assistant dashboard.
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn ${cfg.security && cfg.security.master_pin_enabled ? 'secondary' : 'green'}" onclick="window.budgetApp.openSetPinModal('Master')" style="font-size:11.5px; padding:6px 12px;">
              ${cfg.security && cfg.security.master_pin_enabled ? '🔑 Change Master PIN' : '🔒 Set Master PIN'}
            </button>
            ${cfg.security && cfg.security.master_pin_enabled ? `
              <button type="button" class="btn secondary" onclick="window.budgetApp.removeMasterPin()" style="font-size:11.5px; padding:6px 12px; color:#ef4444;">
                Remove PIN
              </button>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <h3 style="margin-top:24px;">Household Members & Security ${isMulti ? `<span style="font-size:13px; font-weight:normal; color:var(--text-muted);">(${activeUser === 'Joint' ? 'All Members' : activeUser})</span>` : ''}</h3>
      <p style="font-size:12px; color:var(--text-muted);">Manage household members, per-user salary visibility, and individual security PINs:</p>
      
      ${isMulti && activeUser === 'Joint' ? `
        <div style="margin:8px 0 12px 0; padding:10px 12px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; width:100%; box-sizing:border-box;">
          <div>
            <strong style="color:var(--curr-border); font-size:12.5px;">👥 Joint Household Lock (Optional)</strong>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Protect the shared Joint view with a household PIN.</div>
          </div>
          <button type="button" class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.openSetPinModal('Joint')">
            ${cfg.security && cfg.security.joint_pin_enabled ? '🔒 Joint PIN Active' : '🔑 Set Joint PIN'}
          </button>
        </div>
      ` : ''}

      <div id="peopleList" style="display:flex; flex-direction:column; gap:8px; width:100%; max-width:700px; box-sizing:border-box;">
        ${visiblePeople.map((p) => {
          const realIdx = cfg.people.indexOf(p);
          const hasPin = hasPersonPin(p);
          return `
            <div style="display:flex; align-items:center; gap:8px; background:var(--panel-bg); border:1px solid var(--border); padding:8px 10px; border-radius:var(--radius-card); flex-wrap:wrap; box-sizing:border-box; width:100%;">
              <input type="text" value="${p}" onchange="window.budgetApp.updatePersonNameInSettings(${realIdx}, this.value)" style="flex:1; min-width:120px;" placeholder="Member Name" ${isMulti && activeUser !== 'Joint' ? 'readonly' : ''}>
              ${isMulti ? `
                <button type="button" class="btn secondary" style="font-size:11px; padding:4px 8px; white-space:nowrap; flex-shrink:0;" onclick="window.budgetApp.openSetPinModal('${p}')" title="Configure 4-digit security PIN for ${p}">
                  ${hasPin ? '🔒 Personal PIN Active' : '🔑 Set PIN'}
                </button>
                <label style="font-size:11.5px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; color:var(--text-muted); margin:0;">
                  <input type="checkbox" ${isPersonSalaryHidden(p) ? 'checked' : ''} onchange="window.budgetApp.updatePersonSalaryPrivacy(${realIdx}, this.checked)"> 🔒 Hide Salary in Overview
                </label>
              ` : ''}
              ${(!isMulti || activeUser === 'Joint') && cfg.people.length > 1 ? `<button class="del-btn" style="width:28px; height:28px; border-radius:6px; flex-shrink:0;" onclick="window.budgetApp.removePerson(${realIdx})">&times;</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      ${(!isMulti || activeUser === 'Joint') ? `
        <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addPerson()">+ Add Household Member</button>
      ` : ''}

      <div style="margin-top:28px; border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:flex-end;">
        <button class="btn green" onclick="window.budgetApp.saveSettingsForm()">Save Settings</button>
      </div>
    </div>
  `;
}
