import { appState, getSettings, getAccountConfig, ALL_AVAILABLE_WIDGETS, isMultiUserEnabled, isPersonSalaryHidden, getPersonSettings, setPersonSalaryPrivacy, getAccountOwner, setAccountOwner } from '../state.js';

export function renderSettingsView(container) {
  const cfg = getSettings();
  const currentWidgets = cfg.enabled_widgets || [];
  let currentTheme = cfg.theme || 'grey_dark';
  if (currentTheme === 'ha_dark') currentTheme = 'grey_dark';
  if (currentTheme === 'dark') currentTheme = 'navy_dark';
  const isMulti = isMultiUserEnabled();

  container.innerHTML = `
    <div class="panel" style="max-width:800px;">
      <h2>⚙️ Global Budget Settings</h2>
      <p style="color:var(--text-muted); font-size:13px;">Configure household accounts, multi-user options, visual appearance, dashboard widgets, and regional preferences.</p>
      
      <div class="settings-form" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-top:14px;">
        <div class="form-group">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Appearance Theme</label>
          <select id="cfg-theme" onchange="changeTheme(this.value)">
            <option value="grey_dark" ${currentTheme === 'grey_dark' ? 'selected' : ''}>🌑 Dark Mode (Charcoal)</option>
            <option value="navy_dark" ${currentTheme === 'navy_dark' ? 'selected' : ''}>🌙 Navy Dark Mode (Deep Blue)</option>
            <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>☀️ Light Mode</option>
            <option value="contrast" ${currentTheme === 'contrast' ? 'selected' : ''}>⬛ High Contrast</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Currency Symbol</label>
          <input type="text" id="cfg-curr" value="${cfg.currency}" maxlength="4">
        </div>

        <div class="form-group">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Bank Holiday Region</label>
          <select id="cfg-holiday">
            <option value="uk_ew" ${cfg.country_holidays === 'uk_ew' ? 'selected' : ''}>UK - England & Wales</option>
            <option value="uk_scot" ${cfg.country_holidays === 'uk_scot' ? 'selected' : ''}>UK - Scotland</option>
            <option value="us" ${cfg.country_holidays === 'us' ? 'selected' : ''}>United States (Federal)</option>
            <option value="none" ${cfg.country_holidays === 'none' ? 'selected' : ''}>None (Weekends Only)</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Payday Day of Month</label>
          <input type="number" id="cfg-pday" value="${cfg.payday_day}" min="1" max="31">
        </div>
      </div>

      <!-- MULTI-USER & HOUSEHOLD TOGGLE -->
      <div style="margin:20px 0 14px 0; padding:14px; background:var(--panel-bg); border:1px solid var(--border); border-radius:8px;">
        <label style="font-size:13px; cursor:pointer; font-weight:700; display:flex; align-items:center; gap:8px; color:var(--curr-border);">
          <input type="checkbox" id="cfg-multiusers" ${isMulti ? 'checked' : ''} onchange="window.budgetApp.toggleMultiUserModeInSettings(this.checked)">
          👥 Enable Multi-User / Household Mode
        </label>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px; margin-left:24px; line-height:1.4;">
          Allows per-user salary privacy masking, individual persona switching, and tracking personal checking/credit accounts alongside joint finances.
        </div>
      </div>

      <h3 style="margin-top:24px;">Top Dashboard Widgets</h3>
      <p style="font-size:12px; color:var(--text-muted);">Choose which cards to display at the top of each month:</p>
      <div class="widget-select-grid">
        ${ALL_AVAILABLE_WIDGETS.map(w => `
          <div class="widget-checkbox-card">
            <input type="checkbox" id="w_chk_${w.id}" ${currentWidgets.includes(w.id) ? 'checked' : ''} onchange="window.budgetApp.toggleWidgetSelection('${w.id}', this.checked)">
            <div>
              <label for="w_chk_${w.id}" style="font-weight:bold; color:var(--heading); cursor:pointer;">${w.title}</label>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${w.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <h3 style="margin-top:24px;">Account Tracking & Net Position</h3>
      <div style="margin:10px 0 16px 0; padding:12px; background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <strong style="color:var(--curr-border); font-size:13px;">📊 Tracking Modes & Net Position Inclusion</strong>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Configure weekly tracking vs month-end check-in and toggle Net Position inclusion per account.</div>
        </div>
        <button class="btn green" onclick="window.budgetApp.openAccountTrackingModal()">⚙️ Configure Tracking & Net</button>
      </div>

      <h3 style="margin-top:24px;">Current Accounts</h3>
      <div id="currentAccountsList" style="display:flex; flex-direction:column; gap:8px; max-width:600px;">
        ${cfg.current_accounts.map((acc, idx) => `
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="text" value="${acc}" onchange="window.budgetApp.renameCurrentAccount(${idx}, this.value)" style="flex:1;">
            ${isMulti ? `
              <select onchange="window.budgetApp.updateAccountOwner('current', '${acc}', this.value)" style="width:130px; font-size:11px; padding:4px 6px;" title="Account Owner">
                <option value="Joint" ${getAccountOwner('current', acc) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('current', acc) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
              </select>
            ` : ''}
            ${cfg.current_accounts.length > 1 ? `<button class="del-btn" style="width:30px;" onclick="window.budgetApp.deleteCurrentAccountFromSettings(${idx})">&times;</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addCurrentAccountInSettings()">+ Add Current Account</button>

      <h3 style="margin-top:24px;">Credit Cards & Auto-Pay</h3>
      <div id="creditAccountsList" style="display:flex; flex-direction:column; gap:12px; max-width:700px;">
        ${cfg.credit_accounts.map((c, idx) => `
          <div class="card-settings-box" style="background:var(--panel-bg); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:8px;">
            <div style="display:grid; grid-template-columns: 1fr 120px ${isMulti ? '130px' : ''} 30px; gap:8px; margin-bottom:8px; align-items:center;">
              <input type="text" value="${c.name}" onchange="window.budgetApp.editCreditAccount(${idx}, 'name', this.value)" placeholder="Card Name">
              <input type="number" step="100" value="${c.limit}" onchange="window.budgetApp.editCreditAccount(${idx}, 'limit', this.value)" placeholder="Credit Limit">
              ${isMulti ? `
                <select onchange="window.budgetApp.updateAccountOwner('credit', '${c.name}', this.value)" style="font-size:11px; padding:4px 6px;" title="Card Owner">
                  <option value="Joint" ${getAccountOwner('credit', c.name) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                  ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('credit', c.name) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                </select>
              ` : ''}
              <button class="del-btn" onclick="window.budgetApp.deleteCreditAccountFromSettings(${idx})">&times;</button>
            </div>

            <div style="border-top:1px dashed var(--border); padding-top:8px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" id="autopay_en_${idx}" ${c.autopay_enabled ? 'checked' : ''} onchange="window.budgetApp.editCreditAccount(${idx}, 'autopay_enabled', this.checked)">
                <label for="autopay_en_${idx}" style="cursor:pointer; font-weight:600; font-size:12px; color:var(--curr-border);">Enable Auto-Pay Settlement</label>
              </div>

              ${c.autopay_enabled ? `
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-top:8px;">
                  <div>
                    <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Paid From Account:</label>
                    <select onchange="window.budgetApp.editCreditAccount(${idx}, 'autopay_from', this.value)">
                      ${cfg.current_accounts.map(acc => `<option value="${acc}" ${c.autopay_from === acc ? 'selected' : ''}>${acc}</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Settlement Week:</label>
                    <select onchange="window.budgetApp.editCreditAccount(${idx}, 'autopay_when', this.value)">
                      <option value="week_1" ${c.autopay_when === 'week_1' ? 'selected' : ''}>Week 1</option>
                      <option value="week_2" ${c.autopay_when === 'week_2' ? 'selected' : ''}>Week 2</option>
                      <option value="week_3" ${c.autopay_when === 'week_3' ? 'selected' : ''}>Week 3</option>
                      <option value="week_4" ${c.autopay_when === 'week_4' ? 'selected' : ''}>Week 4</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Payment Type:</label>
                    <select onchange="window.budgetApp.editCreditAccount(${idx}, 'autopay_type', this.value)">
                      <option value="full" ${c.autopay_type === 'full' ? 'selected' : ''}>Full Statement</option>
                      <option value="fixed" ${c.autopay_type === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
                    </select>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addCreditAccountInSettings()">+ Add Credit Card</button>

      <h3 style="margin-top:24px;">Savings Accounts</h3>
      <div style="margin-bottom:8px;">
        <label style="font-size:12px; cursor:pointer; font-weight:600;"><input type="checkbox" id="cfg-tracksavings" ${cfg.track_savings ? 'checked' : ''}> Enable Savings Accounts & Portfolio Tracking</label>
      </div>
      <div id="savingsList" style="display:flex; flex-direction:column; gap:8px; max-width:650px; margin-top:8px;">
        ${cfg.savings_accounts.map((acc, idx) => {
          const conf = (typeof getAccountConfig === 'function') ? getAccountConfig('savings', acc) : { savings_predict_mode: 'planned' };
          return `
            <div style="display:grid; grid-template-columns: 1fr 190px ${isMulti ? '130px' : ''} 30px; gap:6px; align-items:center;">
              <input type="text" value="${acc}" onchange="window.budgetApp.renameSavingsAccount(${idx}, this.value)">
              <select onchange="window.budgetApp.setSavingsPredictMode('${acc}', this.value)" style="font-size:11px; padding:4px 6px;" title="Choose whether future months predict pure planned payments in or roll forward from actuals">
                <option value="planned" ${conf.savings_predict_mode !== 'actual' ? 'selected' : ''}>📈 Planned Cashflow</option>
                <option value="actual" ${conf.savings_predict_mode === 'actual' ? 'selected' : ''}>🔄 Roll Forward from Actuals</option>
              </select>
              ${isMulti ? `
                <select onchange="window.budgetApp.updateAccountOwner('savings', '${acc}', this.value)" style="font-size:11px; padding:4px 6px;" title="Savings Account Owner">
                  <option value="Joint" ${getAccountOwner('savings', acc) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
                  ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('savings', acc) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
                </select>
              ` : ''}
              ${cfg.savings_accounts.length > 1 ? `<button class="del-btn" style="width:30px;" onclick="window.budgetApp.deleteSavingsAccountFromSettings(${idx})">&times;</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addSavingsAccountInSettings()">+ Add Savings Account</button>

      <h3 style="margin-top:24px;">Household Members & Privacy</h3>
      <p style="font-size:12px; color:var(--text-muted);">Manage household members and per-user salary visibility:</p>
      <div id="peopleList" style="display:flex; flex-direction:column; gap:8px; max-width:600px;">
        ${cfg.people.map((p, idx) => `
          <div style="display:flex; align-items:center; gap:8px; background:var(--card-bg); border:1px solid var(--border); padding:6px 10px; border-radius:6px;">
            <input type="text" value="${p}" onchange="window.budgetApp.updatePersonNameInSettings(${idx}, this.value)" style="flex:1;">
            ${isMulti ? `
              <label style="font-size:11.5px; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap; color:var(--text-muted); margin:0;">
                <input type="checkbox" ${isPersonSalaryHidden(p) ? 'checked' : ''} onchange="window.budgetApp.updatePersonSalaryPrivacy(${idx}, this.checked)"> 🔒 Hide Salary in Overview
              </label>
            ` : ''}
            ${cfg.people.length > 1 ? `<button class="del-btn" style="width:30px;" onclick="window.budgetApp.removePerson(${idx})">&times;</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn secondary" style="margin-top:8px;" onclick="window.budgetApp.addPerson()">+ Add Household Member</button>

      <div style="margin-top:28px; border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:flex-end;">
        <button class="btn green" onclick="window.budgetApp.saveSettingsForm()">Save Settings</button>
      </div>
    </div>
  `;
}
