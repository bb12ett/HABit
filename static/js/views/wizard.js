import { appState, getSettings, getYearData, getMonthData, months, applyTheme, isMultiUserEnabled, isPersonSalaryHidden, setPersonSalaryPrivacy, getAccountOwner, setAccountOwner } from '../state.js';
import { calculateAndSyncRollovers, detectCurrentMonthAndWeek } from '../calculations.js';
import { saveBudget } from '../api.js';

export function startOnboarding() {
  const stickyHeader = document.getElementById('appHeaderSticky');
  if (stickyHeader) stickyHeader.style.display = 'none';
  const appBody = document.getElementById('appBody');
  if (appBody) appBody.style.display = 'none';
  document.getElementById('sideDrawer')?.classList.remove('open');
  const wizardEl = document.getElementById('onboardingWizard');
  if (wizardEl) wizardEl.style.display = 'flex';
  
  const cfg = getSettings();
  let theme = cfg.theme || 'grey_dark';
  if (theme === 'ha_dark') theme = 'grey_dark';
  if (theme === 'dark') theme = 'navy_dark';

  const currEl = document.getElementById('ob-curr');
  if (currEl) currEl.value = cfg.currency || '£';
  const pdayEl = document.getElementById('ob-pday');
  if (pdayEl) pdayEl.value = cfg.payday_day || 26;
  const holidayEl = document.getElementById('ob-holiday');
  if (holidayEl) holidayEl.value = cfg.country_holidays || 'uk_ew';
  
  const obSel = document.getElementById('ob-theme');
  if (obSel) {
    obSel.value = theme;
    obSel.onchange = (e) => {
      const t = e.target.value;
      if (typeof window.changeTheme === 'function') {
        window.changeTheme(t);
      } else if (window.budgetApp && typeof window.budgetApp.changeTheme === 'function') {
        window.budgetApp.changeTheme(t);
      } else {
        applyTheme(t);
      }
    };
  }
  const trackSavEl = document.getElementById('ob-tracksavings');
  if (trackSavEl) trackSavEl.checked = !!cfg.track_savings;
  const multiUserEl = document.getElementById('ob-multiusers');
  if (multiUserEl) multiUserEl.checked = !!cfg.enable_multi_user;

  applyTheme(theme);
  nextObStep(1);
}

export function nextObStep(step) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`obStep${i}`);
    if (el) el.style.display = (i === step) ? 'block' : 'none';
  }
  if (step === 2) {
    const cfg = getSettings();
    const currEl = document.getElementById('ob-curr');
    if (currEl) cfg.currency = currEl.value.trim() || '£';
    const pdayEl = document.getElementById('ob-pday');
    if (pdayEl) cfg.payday_day = parseInt(pdayEl.value, 10) || 26;
    const holidayEl = document.getElementById('ob-holiday');
    if (holidayEl) cfg.country_holidays = holidayEl.value;
    const themeEl = document.getElementById('ob-theme');
    if (themeEl) cfg.theme = themeEl.value;
    const trackSavEl = document.getElementById('ob-tracksavings');
    if (trackSavEl) cfg.track_savings = trackSavEl.checked;
    const multiUserEl = document.getElementById('ob-multiusers');
    if (multiUserEl) cfg.enable_multi_user = multiUserEl.checked;
    
    applyTheme(cfg.theme || 'grey_dark');
    obRenderLists();
  } else if (step >= 3) {
    obRenderLists();
  }
}

export function obRenderLists() {
  const cfg = getSettings();
  const curr = cfg.currency || '£';
  const isMulti = !!cfg.enable_multi_user;

  // Step 2 People List
  const pList = document.getElementById('obPeopleList');
  if (pList) {
    pList.innerHTML = (cfg.people || []).map((p, idx) => `
      <div style="display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.12); padding:4px 6px; border-radius:6px; border:1px solid var(--border);">
        <input type="text" value="${p}" onchange="window.budgetApp.obUpdatePerson(${idx}, this.value)" style="flex:1;">
        ${isMulti ? `
          <label style="font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap; color:var(--text-muted); margin:0 4px;">
            <input type="checkbox" ${isPersonSalaryHidden(p) ? 'checked' : ''} onchange="window.budgetApp.obUpdatePersonPrivacy(${idx}, this.checked)"> 🔒 Hide Salary
          </label>
        ` : ''}
        ${(cfg.people || []).length > 1 ? `<button class="del-btn" style="width:28px;" onclick="window.budgetApp.obDelPerson(${idx})">&times;</button>` : ''}
      </div>
    `).join('');
  }

  // Step 2 Current List
  const cList = document.getElementById('obCurrentList');
  if (cList) {
    cList.innerHTML = (cfg.current_accounts || []).map((acc, idx) => `
      <div style="display:flex; align-items:center; gap:6px;">
        <input type="text" value="${acc}" onchange="window.budgetApp.obUpdateCurrent(${idx}, this.value)" style="flex:1;">
        ${isMulti ? `
          <select onchange="window.budgetApp.obUpdateAccountOwner('current', ${idx}, this.value)" style="width:120px; font-size:11px; padding:3px 6px;" title="Account Owner">
            <option value="Joint" ${getAccountOwner('current', acc) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
            ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('current', acc) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
          </select>
        ` : ''}
        ${(cfg.current_accounts || []).length > 1 ? `<button class="del-btn" style="width:28px;" onclick="window.budgetApp.obDelCurrent(${idx})">&times;</button>` : ''}
      </div>
    `).join('');
  }

  // Step 2 Savings List
  const sList = document.getElementById('obSavingsList');
  if (sList) {
    sList.innerHTML = (cfg.savings_accounts || []).map((acc, idx) => `
      <div style="display:flex; align-items:center; gap:6px;">
        <input type="text" value="${acc}" onchange="window.budgetApp.obUpdateSavings(${idx}, this.value)" style="flex:1;">
        ${isMulti ? `
          <select onchange="window.budgetApp.obUpdateAccountOwner('savings', ${idx}, this.value)" style="width:120px; font-size:11px; padding:3px 6px;" title="Account Owner">
            <option value="Joint" ${getAccountOwner('savings', acc) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
            ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('savings', acc) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
          </select>
        ` : ''}
        ${(cfg.savings_accounts || []).length > 1 ? `<button class="del-btn" style="width:28px;" onclick="window.budgetApp.obDelSavings(${idx})">&times;</button>` : ''}
      </div>
    `).join('');
  }

  // Step 2 Credit List
  const crList = document.getElementById('obCreditList');
  if (crList) {
    crList.innerHTML = (cfg.credit_accounts || []).map((c, idx) => `
      <div style="background:rgba(0,0,0,0.15); padding:8px; border-radius:8px; border:1px solid var(--border);">
        <div style="display:flex; gap:6px; margin-bottom:4px; align-items:center;">
          <input type="text" value="${c.name}" onchange="window.budgetApp.obUpdateCredit(${idx}, 'name', this.value)" placeholder="Card Name" style="flex:1;">
          <input type="number" value="${c.limit}" onchange="window.budgetApp.obUpdateCredit(${idx}, 'limit', this.value)" placeholder="Limit" style="width:90px;">
          ${isMulti ? `
            <select onchange="window.budgetApp.obUpdateAccountOwner('credit', ${idx}, this.value)" style="width:115px; font-size:11px; padding:3px 4px;" title="Card Owner">
              <option value="Joint" ${getAccountOwner('credit', c.name) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
              ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('credit', c.name) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
            </select>
          ` : ''}
          <button class="del-btn" style="width:28px;" onclick="window.budgetApp.obDelCredit(${idx})">&times;</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; font-size:11px;">
          <label><input type="checkbox" ${c.autopay_enabled ? 'checked' : ''} onchange="window.budgetApp.obUpdateCredit(${idx}, 'autopay_enabled', this.checked)"> Auto-Pay</label>
          ${c.autopay_enabled ? `
            <select onchange="window.budgetApp.obUpdateCredit(${idx}, 'autopay_from', this.value)" style="padding:2px 4px; font-size:11px;">
              ${(cfg.current_accounts || []).map(acc => `<option value="${acc}" ${c.autopay_from === acc ? 'selected' : ''}>${acc}</option>`).join('')}
            </select>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  // Step 3 Deductions
  const dTarget = document.getElementById('ob-deduct-target');
  if (dTarget) {
    dTarget.innerHTML = `<option value="none">None (Personal)</option>
      <optgroup label="Current Accounts">${(cfg.current_accounts || []).map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
      <optgroup label="Savings Accounts">${(cfg.savings_accounts || []).map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>
    `;
  }
  const dPeople = document.getElementById('obDeductPeopleInputs');
  if (dPeople) {
    dPeople.innerHTML = (cfg.people || []).map((p, idx) => `
      <div><label style="font-size:10px; color:var(--text-muted);">${p}:</label><input type="number" step="0.01" id="ob-deduct-p${idx}" placeholder="${curr}" style="width:100%;"></div>
    `).join('');
  }
  const dList = document.getElementById('obDeductList');
  if (dList) {
    dList.innerHTML = (cfg.default_deductions || []).map((d, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:6px; font-size:11px;">
        <span><strong>${d.name}</strong> ${d.is_salary ? '<span style="color:var(--green);">(Salary)</span>' : ''} ➔ ${d.target_account}</span>
        <button class="del-btn" style="height:18px; width:18px; line-height:16px;" onclick="window.budgetApp.obDelDeduct(${idx})">&times;</button>
      </div>
    `).join('');
  }

  // Step 4 Direct Debits
  const ddAcc = document.getElementById('ob-dd-acc');
  if (ddAcc) {
    ddAcc.innerHTML = `
      <optgroup label="Current Accounts">${(cfg.current_accounts || []).map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
      ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
    `;
  }
  const ddTrans = document.getElementById('ob-dd-transfer');
  if (ddTrans) {
    ddTrans.innerHTML = `
      <option value="none">None (Expense)</option>
      <optgroup label="Savings Accounts">${(cfg.savings_accounts || []).map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>
      <optgroup label="Credit Cards">${(cfg.credit_accounts || []).map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>
    `;
  }
  const ddList = document.getElementById('obDDList');
  if (ddList) {
    ddList.innerHTML = (cfg.default_direct_debits || []).map((d, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:6px; font-size:11px;">
        <span><strong>${d.desc}</strong> (Day ${d.due_day}) - ${curr}${d.amount} <span style="color:var(--text-muted); font-size:10px;">(${d.account || cfg.current_accounts[0]})</span></span>
        <button class="del-btn" style="height:18px; width:18px; line-height:16px;" onclick="window.budgetApp.obDelDD(${idx})">&times;</button>
      </div>
    `).join('');
  }

  // Step 4 Yearly Recurring
  const ybAcc = document.getElementById('ob-yb-acc');
  if (ybAcc) {
    ybAcc.innerHTML = `
      <optgroup label="Current Accounts">${(cfg.current_accounts || []).map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
      ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
      ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
    `;
  }
  const ybList = document.getElementById('obYearlyList');
  if (ybList) {
    ybList.innerHTML = (cfg.default_yearly_recurring || []).map((y, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:6px; font-size:11px;">
        <span><strong>${y.desc}</strong> (${y.month} ${y.due_day}) - ${curr}${y.amount} <span style="color:var(--text-muted); font-size:10px;">(${y.account || cfg.current_accounts[0]})</span></span>
        <button class="del-btn" style="height:18px; width:18px; line-height:16px;" onclick="window.budgetApp.obDelYearly(${idx})">&times;</button>
      </div>
    `).join('');
  }

  // Step 5 Weekly
  const wkAcc = document.getElementById('ob-wk-acc');
  if (wkAcc) {
    wkAcc.innerHTML = `
      <optgroup label="Credit Cards">${(cfg.credit_accounts || []).map(c => `<option value="credit:${c.name}">${c.name}</option>`).join('')}</optgroup>
      <optgroup label="Current Accounts">${(cfg.current_accounts || []).map(a => `<option value="current:${a}">${a}</option>`).join('')}</optgroup>
      ${cfg.track_savings ? `<optgroup label="Savings Accounts">${(cfg.savings_accounts || []).map(s => `<option value="savings:${s}">${s}</option>`).join('')}</optgroup>` : ''}
    `;
  }
  const wkList = document.getElementById('obWeeklyList');
  if (wkList) {
    wkList.innerHTML = (cfg.default_weekly || []).map((w, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:6px; font-size:11px;">
        <span>${w.is_income ? '+' : '-'} <strong>${w.desc}</strong>: ${curr}${w.amount} (${w.account_name})</span>
        <button class="del-btn" style="height:18px; width:18px; line-height:16px;" onclick="window.budgetApp.obDelWeekly(${idx})">&times;</button>
      </div>
    `).join('');
  }
}

export function obAddPerson() {
  if (!getSettings().people) getSettings().people = [];
  getSettings().people.push(`Person ${getSettings().people.length + 1}`);
  obRenderLists();
}

export function obAddCurrent() {
  if (!getSettings().current_accounts) getSettings().current_accounts = [];
  getSettings().current_accounts.push(`Current Account ${getSettings().current_accounts.length + 1}`);
  obRenderLists();
}

export function obAddSavings() {
  if (!getSettings().savings_accounts) getSettings().savings_accounts = [];
  getSettings().savings_accounts.push(`Savings Account ${getSettings().savings_accounts.length + 1}`);
  obRenderLists();
}

export function obAddCredit() {
  if (!getSettings().credit_accounts) getSettings().credit_accounts = [];
  getSettings().credit_accounts.push({
    name: `Card ${getSettings().credit_accounts.length + 1}`,
    limit: 5000.00,
    autopay_enabled: true,
    autopay_from: getSettings().current_accounts[0] || "",
    autopay_when: "week_1",
    autopay_type: "full",
    autopay_fixed_amt: 0.00
  });
  obRenderLists();
}

export function obAddDeduction() {
  const cfg = getSettings();
  const nameEl = document.getElementById('ob-deduct-name');
  const targetEl = document.getElementById('ob-deduct-target');
  const isSalaryEl = document.getElementById('ob-deduct-issalary');
  const name = nameEl ? nameEl.value.trim() : '';
  const target = targetEl ? targetEl.value : 'none';
  const isSalary = isSalaryEl ? isSalaryEl.checked : true;
  if (!name) return;
  
  const amounts = {};
  (cfg.people || []).forEach((p, i) => {
    const pInput = document.getElementById(`ob-deduct-p${i}`);
    amounts[p] = pInput ? (parseFloat(pInput.value) || 0) : 0;
  });
  if (!cfg.default_deductions) cfg.default_deductions = [];
  cfg.default_deductions.push({ name, target_account: target, amounts, is_salary: isSalary });
  
  if (nameEl) nameEl.value = '';
  (cfg.people || []).forEach((p, i) => {
    const pInput = document.getElementById(`ob-deduct-p${i}`);
    if (pInput) pInput.value = '';
  });
  obRenderLists();
}

export function obAddDD() {
  const cfg = getSettings();
  const descEl = document.getElementById('ob-dd-desc');
  const dayEl = document.getElementById('ob-dd-day');
  const amtEl = document.getElementById('ob-dd-amt');
  const accEl = document.getElementById('ob-dd-acc');
  const transEl = document.getElementById('ob-dd-transfer');

  const desc = descEl ? descEl.value.trim() : '';
  const day = dayEl ? (parseInt(dayEl.value, 10) || 1) : 1;
  const amt = amtEl ? parseFloat(amtEl.value) : NaN;
  const acc = accEl ? accEl.value : (cfg.current_accounts[0] || '');
  const trans = transEl ? transEl.value : 'none';

  if (!desc || isNaN(amt)) return;
  if (!cfg.default_direct_debits) cfg.default_direct_debits = [];
  cfg.default_direct_debits.push({ desc, due_day: day, amount: amt, account: acc, transfer_to: trans });
  if (descEl) descEl.value = '';
  if (amtEl) amtEl.value = '';
  obRenderLists();
}

export function obAddYearly() {
  const cfg = getSettings();
  const descEl = document.getElementById('ob-yb-desc');
  const monthEl = document.getElementById('ob-yb-m');
  const dayEl = document.getElementById('ob-yb-day');
  const amtEl = document.getElementById('ob-yb-amt');
  const accEl = document.getElementById('ob-yb-acc');

  const desc = descEl ? descEl.value.trim() : '';
  const month = monthEl ? monthEl.value : 'Jan';
  const day = dayEl ? (parseInt(dayEl.value, 10) || 1) : 1;
  const amt = amtEl ? parseFloat(amtEl.value) : NaN;
  const acc = accEl ? accEl.value : (cfg.current_accounts[0] || '');

  if (!desc || isNaN(amt)) return;
  if (!cfg.default_yearly_recurring) cfg.default_yearly_recurring = [];
  cfg.default_yearly_recurring.push({ desc, month, due_day: day, amount: amt, account: acc });
  if (descEl) descEl.value = '';
  if (amtEl) amtEl.value = '';
  obRenderLists();
}

export function obAddWeekly() {
  const cfg = getSettings();
  const typeEl = document.getElementById('ob-wk-type');
  const descEl = document.getElementById('ob-wk-desc');
  const amtEl = document.getElementById('ob-wk-amt');
  const accRawEl = document.getElementById('ob-wk-acc');

  const type = typeEl ? typeEl.value : 'expense';
  const desc = descEl ? descEl.value.trim() : '';
  const amt = amtEl ? parseFloat(amtEl.value) : NaN;
  const accRaw = accRawEl ? accRawEl.value : 'current:Joint Account';
  if (!desc || isNaN(amt)) return;
  
  const [accType, accName] = accRaw.split(':');
  if (!cfg.default_weekly) cfg.default_weekly = [];
  cfg.default_weekly.push({ desc, amount: amt, is_income: (type === 'income'), account_name: accName, account_type: accType });
  
  if (descEl) descEl.value = '';
  if (amtEl) amtEl.value = '';
  obRenderLists();
}

export function obDelWeekly(idx) {
  if (getSettings().default_weekly) {
    getSettings().default_weekly.splice(idx, 1);
  }
  obRenderLists();
}

export async function finishOnboarding(onComplete) {
  const cfg = getSettings();
  const trackSavEl = document.getElementById('ob-tracksavings');
  if (trackSavEl) cfg.track_savings = trackSavEl.checked;
  const themeEl = document.getElementById('ob-theme');
  if (themeEl) cfg.theme = themeEl.value;
  cfg.onboarding_complete = true;
  
  applyTheme(cfg.theme || 'grey_dark');

  const wizardEl = document.getElementById('onboardingWizard');
  if (wizardEl) wizardEl.style.display = 'none';
  const appBody = document.getElementById('appBody');
  if (appBody) appBody.style.display = 'block';
  const stickyHeader = document.getElementById('appHeaderSticky');
  if (stickyHeader) stickyHeader.style.display = 'block';
  
  // Push the new defaults down into the current year's months
  const currentYData = getYearData();
  months.forEach(m => {
    const md = getMonthData(m);
    md.deductions_list = JSON.parse(JSON.stringify(cfg.default_deductions || []));
    md.direct_debits = JSON.parse(JSON.stringify(cfg.default_direct_debits || []));
    currentYData.yearly_recurring = JSON.parse(JSON.stringify(cfg.default_yearly_recurring || []));
  });

  calculateAndSyncRollovers();
  await saveBudget(appState.data);

  if (typeof onComplete === 'function') {
    onComplete();
  }
}

export function closeOnboarding() {
  const wizardEl = document.getElementById('onboardingWizard');
  if (wizardEl) wizardEl.style.display = 'none';
  const appBody = document.getElementById('appBody');
  if (appBody) appBody.style.display = 'block';
  const stickyHeader = document.getElementById('appHeaderSticky');
  if (stickyHeader) stickyHeader.style.display = 'block';
  
  const cfg = getSettings();
  if (!cfg.onboarding_complete) {
    cfg.onboarding_complete = true;
    saveBudget(appState.data);
  }
  
  const now = new Date();
  if (!appState.data.years || !appState.data.years[appState.currentYear]) {
    appState.currentYear = now.getFullYear();
  }
  const detected = detectCurrentMonthAndWeek(appState.currentYear);
  if (detected && detected.month) {
    appState.activeTab = detected.month;
  }
  
  calculateAndSyncRollovers();
  if (typeof window.budgetApp !== 'undefined') {
    if (typeof window.budgetApp.renderYearMenu === 'function') window.budgetApp.renderYearMenu();
    if (typeof window.budgetApp.renderNav === 'function') window.budgetApp.renderNav();
    if (typeof window.budgetApp.renderContent === 'function') window.budgetApp.renderContent();
  }
}
