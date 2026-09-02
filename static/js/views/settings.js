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

      <h3 style="margin-top:24px;">⚡ Open Banking & Automated Sync</h3>
      <div style="margin:10px 0 16px 0; padding:14px; background:var(--panel-bg); border:1px solid var(--border); border-radius:var(--radius-card); width:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
          <div style="flex:1; min-width:200px;">
            <div style="font-weight:700; font-size:13px; color:var(--heading); display:flex; align-items:center; gap:6px;">
              <span>⚡ Live Bank Connection & Feed</span>
              ${cfg.open_banking && cfg.open_banking.enabled ? '<span class="badge" style="background:#10b981; color:#fff; font-size:10px;">Active</span>' : '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted); font-size:10px;">Disabled</span>'}
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px; line-height:1.4;">
              Automatically synchronize bank balances, auto-clear scheduled Direct Debits, and track daily spending.
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:12px; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
              <input type="checkbox" id="cfg-openbanking-enabled" ${cfg.open_banking && cfg.open_banking.enabled ? 'checked' : ''} onchange="window.budgetApp.toggleOpenBankingEnabled(this.checked)"> Enable Open Banking
            </label>
          </div>
        </div>

        ${cfg.open_banking && cfg.open_banking.enabled ? `
          <div style="border-top:1px dashed var(--border); padding-top:12px; margin-top:8px;">
            <div style="margin-bottom:12px;">
              <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">Integration Provider:</label>
              <select id="cfg-openbanking-provider" onchange="window.budgetApp.updateOpenBankingProvider(this.value)" style="width:100%; font-weight:600; font-size:12.5px;">
                <option value="truelayer" ${(!cfg.open_banking.provider || cfg.open_banking.provider === 'truelayer') ? 'selected' : ''}>🟢 TrueLayer (UK - Supported & Verified)</option>
                <option value="enablebanking" ${cfg.open_banking.provider === 'enablebanking' ? 'selected' : ''}>🧪 Enable Banking (UK & Europe - Experimental)</option>
                <option value="gocardless" ${cfg.open_banking.provider === 'gocardless' ? 'selected' : ''}>🧪 GoCardless (UK & Europe - Experimental)</option>
                <option value="simplefin" ${cfg.open_banking.provider === 'simplefin' ? 'selected' : ''}>🧪 SimpleFIN Bridge (US & Canada - Experimental)</option>
                <option value="file_import" ${cfg.open_banking.provider === 'file_import' ? 'selected' : ''}>📁 Direct Statement Import (Offline CSV / OFX / QIF)</option>
              </select>
            </div>

            ${(cfg.open_banking.provider === 'file_import') ? `
              <div style="background:rgba(0,0,0,0.12); border:1px solid var(--border); border-radius:var(--radius-card); padding:12px; margin-bottom:12px;">
                <div style="font-weight:600; font-size:12px; color:var(--heading); margin-bottom:4px;">📁 Offline Bank Statement Importer</div>
                <div style="font-size:11px; color:var(--text-muted); line-height:1.4; margin-bottom:10px;">
                  Import your downloaded bank statements (.CSV, .OFX, .QIF) from any bank without registering any API credentials.
                </div>
                <button type="button" class="btn green" style="font-size:11.5px; padding:6px 14px;" onclick="window.budgetApp.openBankStatementUploadModal()">📥 Upload Bank Statement</button>
              </div>
            ` : `
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">
                ${(!cfg.open_banking.provider || cfg.open_banking.provider === 'truelayer') ? `
                  Get free developer credentials from <a href="https://truelayer.com/" target="_blank" rel="noopener" style="color:var(--curr-border); text-decoration:underline; font-weight:600;">truelayer.com ↗</a> (Fully supported & verified for UK banks and credit cards).
                ` : cfg.open_banking.provider === 'enablebanking' ? `
                  <span class="badge" style="background:rgba(245,158,11,0.2); color:var(--amber); font-size:9.5px; margin-right:4px;">🧪 Experimental</span> Get free developer credentials from <a href="https://enablebanking.com/" target="_blank" rel="noopener" style="color:var(--curr-border); text-decoration:underline; font-weight:600;">enablebanking.com ↗</a> (Community tested).
                ` : cfg.open_banking.provider === 'simplefin' ? `
                  <span class="badge" style="background:rgba(245,158,11,0.2); color:var(--amber); font-size:9.5px; margin-right:4px;">🧪 Experimental</span> Claim a token from <a href="https://bridge.simplefin.org/" target="_blank" rel="noopener" style="color:var(--curr-border); text-decoration:underline; font-weight:600;">bridge.simplefin.org ↗</a> (\$1.50/month for US/Canada).
                ` : `
                  <span class="badge" style="background:rgba(245,158,11,0.2); color:var(--amber); font-size:9.5px; margin-right:4px;">🧪 Experimental</span> For existing developer accounts on <a href="https://bankaccountdata.gocardless.com/overview/" target="_blank" rel="noopener" style="color:var(--curr-border); text-decoration:underline; font-weight:600;">bankaccountdata.gocardless.com ↗</a>.
                `}
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap:10px; margin-bottom:12px;">
                <div>
                  <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:3px;">
                    ${cfg.open_banking.provider === 'simplefin' ? 'Access URL or Setup Token:' : cfg.open_banking.provider === 'enablebanking' ? 'Application ID:' : cfg.open_banking.provider === 'truelayer' ? 'Client ID:' : 'Secret ID (Client ID):'}
                  </label>
                  <input type="password" id="cfg-openbanking-secret-id" value="${cfg.open_banking.secret_id || ''}" placeholder="${cfg.open_banking.provider === 'simplefin' ? 'https://bridge.simplefin.org/...' : 'e.g. 7a8b9c...'}" style="width:100%;">
                </div>
                ${cfg.open_banking.provider !== 'simplefin' ? `
                  <div>
                    <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:3px;">
                      ${cfg.open_banking.provider === 'enablebanking' ? 'Application Key / Secret:' : cfg.open_banking.provider === 'truelayer' ? 'Client Secret:' : 'Secret Key:'}
                    </label>
                    <input type="password" id="cfg-openbanking-secret-key" value="${cfg.open_banking.secret_key || ''}" placeholder="••••••••••••••••" style="width:100%;">
                  </div>
                ` : ''}
                ${(cfg.open_banking.provider === 'truelayer' || cfg.open_banking.provider === 'enablebanking') ? `
                  <div>
                    <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:3px;">
                      Environment:
                    </label>
                    <select id="cfg-openbanking-env" style="width:100%; font-size:12px;">
                      <option value="live" ${cfg.open_banking.environment !== 'sandbox' ? 'selected' : ''}>🟢 Live (Real Bank Accounts)</option>
                      <option value="sandbox" ${cfg.open_banking.environment === 'sandbox' ? 'selected' : ''}>🟡 Sandbox (Test Mock Banks)</option>
                    </select>
                  </div>
                ` : ''}
                <div>
                  <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:3px;">
                    Auto-Sync Frequency:
                  </label>
                  <select id="cfg-openbanking-interval" style="width:100%; font-size:12px;">
                    <option value="2" ${Number(cfg.open_banking.auto_sync_interval_hours) === 2 ? 'selected' : ''}>Every 2 Hours</option>
                    <option value="4" ${Number(cfg.open_banking.auto_sync_interval_hours) === 4 ? 'selected' : ''}>Every 4 Hours</option>
                    <option value="6" ${(!cfg.open_banking.auto_sync_interval_hours || Number(cfg.open_banking.auto_sync_interval_hours) === 6) ? 'selected' : ''}>Every 6 Hours (Recommended)</option>
                    <option value="12" ${Number(cfg.open_banking.auto_sync_interval_hours) === 12 ? 'selected' : ''}>Every 12 Hours</option>
                    <option value="24" ${Number(cfg.open_banking.auto_sync_interval_hours) === 24 ? 'selected' : ''}>Once a Day (24 Hours)</option>
                    <option value="0" ${Number(cfg.open_banking.auto_sync_interval_hours) === 0 ? 'selected' : ''}>Manual Only (Disabled)</option>
                  </select>
                </div>
                <div style="grid-column:1/-1;">
                  <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:3px;">
                    Registered Redirect URI (Must match developer console exactly):
                  </label>
                  <input type="text" id="cfg-openbanking-redirect-uri" value="${cfg.open_banking.redirect_uri || ''}" placeholder="e.g. https://home.bb12ett.uk/ or leave blank for auto-detect" style="width:100%;">
                </div>
                <div style="grid-column:1/-1;">
                  <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--heading); cursor:pointer; margin-top:4px;">
                    <input type="checkbox" id="cfg-openbanking-auto-checkins" ${cfg.open_banking.auto_update_checkins !== false ? 'checked' : ''} onchange="window.budgetApp.toggleOpenBankingAutoCheckins(this.checked)">
                    <span>⚡ <strong>Auto-Update Weekly Check-Ins:</strong> Automatically populate current week's actual balances from live bank accounts</span>
                  </label>
                </div>
                <div style="grid-column:1/-1;">
                  <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--heading); cursor:pointer; margin-top:4px;">
                    <input type="checkbox" id="cfg-openbanking-live-daily-variance" ${cfg.open_banking.live_daily_variance !== false ? 'checked' : ''} onchange="window.budgetApp.toggleOpenBankingLiveDailyVariance(this.checked)">
                    <span>📊 <strong>Live Intra-Week Daily Variance:</strong> Calculate budget pace to the day and factor in cleared vs upcoming scheduled bills for a true live-to-the-day variance</span>
                  </label>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
                <button type="button" class="btn secondary" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.saveOpenBankingKeys()">💾 Save API Keys</button>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <button type="button" class="btn green" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.openBankLinkModal()">+ Connect Bank Account</button>
                  <button type="button" class="btn secondary" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.openManualAuthCodeModal()">📋 Enter Return Code</button>
                  <button type="button" class="btn secondary" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.openBankStatementUploadModal()">📥 Import Statement</button>
                  <button type="button" class="btn secondary" style="font-size:11.5px; padding:5px 12px;" onclick="window.budgetApp.triggerOpenBankingSync()">🔄 Sync Now</button>
                </div>
              </div>
            `}

            ${(cfg.open_banking && (cfg.open_banking.last_sync_status === 'error' || cfg.open_banking.last_sync_status === 'partial_error' || cfg.open_banking.last_sync_error)) ? `
              <div id="openBankingErrorBanner" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.4); border-radius:var(--radius-card); padding:10px 14px; margin:12px 0; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:18px;">⚠️</span>
                  <div>
                    <div style="font-weight:700; font-size:12.5px; color:var(--red, #ef4444);">
                      ${cfg.open_banking.last_sync_status === 'partial_error' ? 'Open Banking Partial Sync Notice' : 'Open Banking Sync Error'}
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">
                      ${cfg.open_banking.last_sync_error || 'A sync attempt failed. Check your bank connection or view the real-time debug log.'}
                    </div>
                  </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button type="button" class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.openDebugLogModal()">📋 View Log</button>
                  <button type="button" class="btn green" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.triggerOpenBankingSync()">🔄 Retry Sync</button>
                </div>
              </div>
            ` : ''}

            <h4 style="font-size:12px; color:var(--heading); margin:12px 0 6px 0;">Connected Bank Accounts (${(cfg.open_banking.linked_accounts || []).length})</h4>
            <div id="linkedAccountsList" style="display:flex; flex-direction:column; gap:8px;">
              ${(cfg.open_banking.linked_accounts || []).length === 0 ? `
                <div style="font-size:11px; color:var(--text-muted); font-style:italic; padding:6px 0;">No bank accounts connected yet. Click "+ Connect Bank Account" above to link your first account.</div>
              ` : (cfg.open_banking.linked_accounts || []).map((acc) => `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:rgba(0,0,0,0.15); border:1px solid var(--border); border-radius:var(--radius-card); padding:8px 12px; flex-wrap:wrap;">
                  <div style="display:flex; align-items:center; gap:8px; min-width:180px;">
                    <div style="width:24px; height:24px; border-radius:4px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:rgba(255,255,255,0.08);">
                      ${acc.institution_logo ? `
                        <img src="${acc.institution_logo}" style="width:20px; height:20px; border-radius:3px; object-fit:contain;" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" loading="lazy">
                        <span style="display:none; font-size:12px;">🏛️</span>
                      ` : `<span style="font-size:12px;">🏛️</span>`}
                    </div>
                    <div>
                      <div style="font-weight:600; font-size:12px; color:var(--heading);">
                        ${(() => {
                          const mappedClean = (acc.mapped_habit_account_id || '').replace(/^(credit|current|savings):/i, '').trim();
                          const rawName = `${acc.institution_name || 'Bank'} - ${acc.account_name || 'Account'}`;
                          if (mappedClean) {
                            return `${mappedClean} <span style="font-weight:normal; font-size:10.5px; color:var(--text-muted);">(${rawName})</span>`;
                          }
                          return rawName;
                        })()}
                      </div>
                      <div style="font-size:10px; color:var(--text-muted);">
                        ${acc.iban_or_masked_num || ''} • 
                        ${(() => {
                          const mappedClean = (acc.mapped_habit_account_id || '').replace(/^(credit|current|savings):/i, '').trim();
                          const cardObj = (cfg.credit_accounts || []).find(ca => {
                            const caName = typeof ca === 'string' ? ca : (ca.name || '');
                            return caName.toLowerCase() === mappedClean.toLowerCase() || caName.toLowerCase() === (acc.mapped_habit_account_id || '').toLowerCase();
                          });
                          const isCard = Boolean(cardObj || acc.account_type === 'CARD' || acc.last_available !== undefined || (acc.account_name && acc.account_name.toLowerCase().includes('card')));
                          if (isCard) {
                            const debt = Number(acc.last_balance || 0);
                            const cardLimit = Number(typeof cardObj === 'object' ? (cardObj.limit || acc.credit_limit || 0) : (acc.credit_limit || 0));
                            const avail = acc.last_available !== undefined && Number(acc.last_available) > 0 ? Number(acc.last_available) : Math.max(0, cardLimit - debt);
                            return `Debt: ${cfg.currency || '£'}${Math.abs(debt).toFixed(2)} (Available: ${cfg.currency || '£'}${avail.toFixed(2)})`;
                          }
                          return `Last Balance: ${cfg.currency || '£'}${Number(acc.last_balance || 0).toFixed(2)}`;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <select onchange="window.budgetApp.updateLinkedAccountMapping('${acc.account_id}', this.value)" style="font-size:11px; padding:3px 6px;" title="Mapped HABit Account">
                      <option value="">-- Map to HABit Account --</option>
                      ${(cfg.current_accounts || []).map(ca => {
                        const caName = typeof ca === 'string' ? ca : (ca.name || '');
                        const isSel = acc.mapped_habit_account_id && (acc.mapped_habit_account_id === caName || acc.mapped_habit_account_id === `current:${caName}`);
                        return `<option value="${caName}" ${isSel ? 'selected' : ''}>Checking: ${caName}</option>`;
                      }).join('')}
                      ${(cfg.credit_accounts || []).map(ca => {
                        const caName = typeof ca === 'string' ? ca : (ca.name || '');
                        const isSel = acc.mapped_habit_account_id && (acc.mapped_habit_account_id === caName || acc.mapped_habit_account_id === `credit:${caName}`);
                        return `<option value="${caName}" ${isSel ? 'selected' : ''}>Credit: ${caName}</option>`;
                      }).join('')}
                      ${(cfg.savings_accounts || []).map(sa => {
                        const saName = typeof sa === 'string' ? sa : (sa.name || '');
                        const isSel = acc.mapped_habit_account_id && (acc.mapped_habit_account_id === saName || acc.mapped_habit_account_id === `savings:${saName}`);
                        return `<option value="${saName}" ${isSel ? 'selected' : ''}>Savings: ${saName}</option>`;
                      }).join('')}
                    </select>

                    ${isMulti ? `
                      <select onchange="window.budgetApp.updateLinkedAccountOwner('${acc.account_id}', this.value)" style="font-size:11px; padding:3px 6px;" title="Account Owner">
                        <option value="Joint" ${acc.owner === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                        ${(cfg.people || []).map(p => `<option value="${p}" ${acc.owner === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                      </select>
                    ` : ''}

                    <button type="button" class="del-btn" style="width:24px; height:24px; border-radius:4px;" onclick="window.budgetApp.unlinkAccount('${acc.account_id}')" title="Unlink Bank Account">&times;</button>
                  </div>
                </div>
              `).join('')}

              <div style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--heading); cursor:pointer;">
                    <input type="checkbox" id="cfg-openbanking-debug-logging" ${cfg.open_banking.debug_logging ? 'checked' : ''} onchange="window.budgetApp.toggleOpenBankingDebugLogging(this.checked)">
                    <span>🛠️ <strong>Enable Open Banking Debug Logging:</strong> Log detailed API requests, responses, and sync calculations to <code>open_banking_debug.txt</code></span>
                  </label>
                </div>
                <div style="display:flex; gap:6px;">
                  <button type="button" class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.openDebugLogModal()">📄 View Debug Log</button>
                  <button type="button" class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.clearDebugLog()">🗑️ Clear Log</button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- SPEND CATEGORIES & CUSTOM RULES PANEL -->
        <div class="panel" style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
            <div>
              <h3 style="margin:0; font-size:15px; color:var(--heading); display:flex; align-items:center; gap:8px;">
                <span>🛒</span> Spend Categories & Community Merchant Database
              </h3>
              <p style="margin:4px 0 0 0; font-size:11.5px; color:var(--text-muted);">
                HABit uses an open-source merchant dictionary to automatically categorize bank transactions.
              </p>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.exportMerchantCategoryRules()">
                📋 Export Custom Rules
              </button>
              <button type="button" class="btn green" style="font-size:11px; padding:4px 12px;" onclick="window.budgetApp.syncCategoriesGitHub()">
                🌐 Sync from GitHub
              </button>
            </div>
          </div>

          <!-- Custom Merchant Rules List -->
          <div style="background:rgba(0,0,0,0.12); border:1px solid var(--border); border-radius:var(--radius-card); padding:12px;">
            <div style="font-size:12px; font-weight:600; color:var(--heading); margin-bottom:8px;">
              Your Personal Merchant Rules (${Object.keys(cfg.merchant_category_rules || {}).length} saved)
            </div>
            ${Object.keys(cfg.merchant_category_rules || {}).length === 0 ? `
              <div style="font-size:11px; color:var(--text-muted); font-style:italic; padding:6px 0;">
                No custom merchant rules saved yet. When you recategorize an unrecognized transaction in Live Spend, you can save custom rules here.
              </div>
            ` : `
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:6px; max-height:220px; overflow-y:auto; padding-right:4px;">
                ${Object.entries(cfg.merchant_category_rules || {}).map(([pattern, catId]) => `
                  <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="min-width:0; margin-right:8px;">
                      <div style="font-size:12px; font-weight:600; color:var(--heading); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pattern}</div>
                      <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Category: ${catId}</div>
                    </div>
                    <button type="button" class="del-btn" style="width:22px; height:22px; border-radius:4px; font-size:12px;" onclick="window.budgetApp.deleteMerchantCategoryRule(this.dataset.rule)" data-rule="${pattern}" title="Delete Rule">&times;</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>

      <div style="margin-top:28px; border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:flex-end;">
        <button class="btn green" onclick="window.budgetApp.saveSettingsForm()">Save Settings</button>
      </div>
    </div>
  `;
}
