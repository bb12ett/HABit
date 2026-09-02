// Unified single-file app bundle

// --- static/js/state.js ---
const DEFAULT_SETTINGS = {
  currency: "£",
  theme: "grey_dark",
  country_holidays: "uk_ew",
  pay_frequency: "monthly",
  payday_day: 26,
  payday_weekday: 5,
  payday_anchor_date: "2026-01-09",
  payday_first_day: 15,
  payday_second_day: "last_day",
  payday_is_last_working_day: false,
  track_savings: true,
  enable_yearly_budgets: true,
  enable_multi_user: false,
  enable_ha_sensors: true,
  open_banking: {
    enabled: false,
    provider: "gocardless",
    secret_id: "",
    secret_key: "",
    auto_sync_interval_hours: 6,
    last_sync_timestamp: null,
    last_sync_status: "idle",
    linked_accounts: []
  },
  security: {
    master_pin_enabled: false,
    master_salt: "",
    master_pin_hash: "",
    joint_salt: "",
    joint_pin_hash: "",
    joint_pin_enabled: false,
    personas: {}
  },
  people: ["Person 1", "Person 2"],
  people_settings: {
    "Person 1": { hide_salary: false, pin: "" },
    "Person 2": { hide_salary: false, pin: "" }
  },
  account_owners: {
    "Joint Account": "Joint",
    "Credit Card": "Joint"
  },
  current_accounts: ["Joint Account"],
  credit_accounts: [
    {
      name: "Credit Card",
      limit: 5000.00,
      autopay_enabled: true,
      autopay_from: "Joint Account",
      autopay_when: "week_1",
      autopay_type: "full",
      autopay_fixed_amt: 0.00
    }
  ],
  savings_accounts: ["Emergency Savings", "Stocks & Shares ISA"],
  enabled_widgets: [
    "current_projected",
    "credit_projected",
    "savings_projected",
    "net_position",
    "total_outgoings"
  ],
  default_weekly: [
    { desc: "Food / Groceries", amount: 0.00, is_income: false, account_name: "Credit Card", account_type: "credit" },
    { desc: "Fuel / Transport", amount: 0.00, is_income: false, account_name: "Credit Card", account_type: "credit" },
    { desc: "Other / Misc", amount: 0.00, is_income: false, account_name: "Credit Card", account_type: "credit" },
    { desc: "Cash", amount: 0.00, is_income: false, account_name: "Joint Account", account_type: "current" }
  ],
  default_direct_debits: [
    { desc: "Mortgage / Rent", due_day: 1, amount: 1000.00, account: "Joint Account", transfer_to: "none", holiday_rule: "following" },
    { desc: "Council Tax", due_day: 1, amount: 180.00, account: "Joint Account", transfer_to: "none", holiday_rule: "following" },
    { desc: "Energy", due_day: 1, amount: 150.00, account: "Joint Account", transfer_to: "none", holiday_rule: "following" },
    { desc: "L&G ISA DD", due_day: 1, amount: 880.00, account: "Joint Account", transfer_to: "Stocks & Shares ISA", holiday_rule: "following" },
    { desc: "Broadband", due_day: 15, amount: 35.00, account: "Joint Account", transfer_to: "none", holiday_rule: "following" }
  ],
  default_payments_in: [],
  birthdays: [
    { name: "Mum's Birthday", month: "Apr", day: 14, budget_amount: 100.00, account: "Joint Account", category: "Birthday", transactions: [] }
  ],
  recurring_payments: [],
  recurring_incomes: [],
  default_yearly_recurring: [
    { desc: "Car Insurance", month: "Mar", due_day: 15, amount: 450.00, account: "Joint Account", holiday_rule: "following" },
    { desc: "TV Licence", month: "Jul", due_day: 1, amount: 169.50, account: "Joint Account", holiday_rule: "following" }
  ],
  default_yearly_income: [],
  default_deductions: [
    { name: "Take Home Salary", target_account: "Joint Account", amounts: { "Person 1": 2500, "Person 2": 2200 }, is_salary: true },
    { name: "Phone Bill", target_account: "none", amounts: { "Person 1": 35, "Person 2": 40 }, is_salary: false }
  ]
};

const ALL_AVAILABLE_WIDGETS = [
  { id: "current_projected", title: "🏦 Current Accounts (Month-End)", desc: "Projected month-end balance across all current accounts." },
  { id: "current_opening", title: "🏦 Current Starting Balance", desc: "Total starting balance and salary inflows for current accounts." },
  { id: "credit_projected", title: "💳 Credit Cards (Month-End Debt)", desc: "Projected debt owed on all credit cards after spending & auto-pay." },
  { id: "credit_avail", title: "💳 Available Credit Line", desc: "Remaining available credit across all cards." },
  { id: "savings_projected", title: "📈 Savings Portfolio (Month-End)", desc: "Total projected balance across all savings accounts & ISAs." },
  { id: "savings_growth", title: "📈 Savings Net Growth", desc: "Net wealth accumulated in savings this month via transfers." },
  { id: "net_position", title: "💎 Net Position (Month-End)", desc: "Overall net worth (Current + Savings - Credit Card Debt)." },
  { id: "total_outgoings", title: "📉 Total Month Outgoings", desc: "Sum of all Direct Debits and planned weekly expenses." },
  { id: "weekly_avg", title: "📅 Weekly Expense Average", desc: "Average discretionary spend budgeted per week." },
  { id: "actual_variance", title: "🎯 Latest Actual Variance", desc: "Live surplus or deficit based on your weekly check-ins." }
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const appState = {
  data: {},
  currentYear: 2026,
  activeTab: "Jan",
  activeSubTab: "overview",
  globalEditMode: false,
  draggedItemInfo: null,
  activeChart: null,
  activeUser: 'Joint',
  unlockedUsers: {},
  isMasterUnlocked: false,
  selectedUserFilter: 'all',
  unmaskedSalaries: {}
};

if (typeof window !== 'undefined') {
  window.__budgetAppState = appState;
}

function applyTheme(theme) {
  if (typeof window !== 'undefined' && typeof window.changeTheme === 'function') {
    window.changeTheme(theme);
  } else {
    if (!theme || theme === 'ha_dark' || theme === 'grey_dark') theme = 'grey_dark';
    else if (theme === 'dark' || theme === 'navy_dark') theme = 'navy_dark';
    else if (theme === 'light') theme = 'light';
    else if (theme === 'contrast') theme = 'contrast';

    try {
      localStorage.setItem('budget_theme', theme);
    } catch (e) {}

    if (typeof document !== 'undefined') {
      const targetClass = 'theme-' + theme.replace('_', '-');
      if (document.documentElement) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.className = targetClass;
      }
      if (document.body) {
        document.body.setAttribute('data-theme', theme);
        document.body.className = targetClass;
      }
    }
  }
}

function getSettings() {
  if (!appState.data || typeof appState.data !== 'object') {
    appState.data = { settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), years: {} };
  }
  if (!appState.data.settings) {
    appState.data.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
  return appState.data.settings;
}

function getYearData(year = appState.currentYear) {
  const yStr = String(year);
  if (!appState.data || typeof appState.data !== 'object') {
    appState.data = { settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), years: {} };
  }
  if (!appState.data.years) appState.data.years = {};
  if (!appState.data.years[yStr]) {
    const prevYearNum = parseInt(year, 10) - 1;
    const prevYearData = appState.data.years ? appState.data.years[String(prevYearNum)] : null;
    const cfg = getSettings();

    // 1. Carry over Birthdays from previous year (fresh empty transactions for the new year)
    let initialBirthdays = [];
    if (prevYearData && prevYearData.birthdays && prevYearData.birthdays.length > 0) {
      initialBirthdays = prevYearData.birthdays.map(b => ({
        ...b,
        transactions: []
      }));
    } else {
      initialBirthdays = JSON.parse(JSON.stringify(cfg.birthdays || []));
    }

    // 2. Carry over Multi-Cadence Recurring Payments from previous year
    let initialRecurring = [];
    if (prevYearData && prevYearData.recurring_payments && prevYearData.recurring_payments.length > 0) {
      initialRecurring = JSON.parse(JSON.stringify(prevYearData.recurring_payments));
    } else {
      initialRecurring = JSON.parse(JSON.stringify(cfg.recurring_payments || []));
    }

    // 3. Carry over Multi-Cadence Recurring Incomes from previous year
    let initialRecurringIncomes = [];
    if (prevYearData && prevYearData.recurring_incomes && prevYearData.recurring_incomes.length > 0) {
      initialRecurringIncomes = JSON.parse(JSON.stringify(prevYearData.recurring_incomes));
    } else {
      initialRecurringIncomes = JSON.parse(JSON.stringify(cfg.recurring_incomes || []));
    }

    // 4. Carry over Annual Bills
    let initialYearlyRecurring = [];
    if (prevYearData && prevYearData.yearly_recurring && prevYearData.yearly_recurring.length > 0) {
      initialYearlyRecurring = JSON.parse(JSON.stringify(prevYearData.yearly_recurring));
    } else {
      initialYearlyRecurring = JSON.parse(JSON.stringify(cfg.default_yearly_recurring || []));
    }

    // 5. Carry over Annual Income
    let initialYearlyIncome = [];
    if (prevYearData && prevYearData.yearly_income && prevYearData.yearly_income.length > 0) {
      initialYearlyIncome = JSON.parse(JSON.stringify(prevYearData.yearly_income));
    } else {
      initialYearlyIncome = JSON.parse(JSON.stringify(cfg.default_yearly_income || []));
    }

    appState.data.years[yStr] = {
      archived: false,
      birthdays: initialBirthdays,
      recurring_payments: initialRecurring,
      recurring_incomes: initialRecurringIncomes,
      yearly_recurring: initialYearlyRecurring,
      yearly_income: initialYearlyIncome,
      yearly_budgets: [],
      months: {}
    };
  }
  return appState.data.years[yStr];
}

function getMonthData(mName, year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.months) yData.months = {};
  if (!yData.months[mName]) {
    const cfg = getSettings();
    yData.months[mName] = {
      current_data: {},
      credit_data: {},
      savings_data: {},
      weekly_items: {},
      weekly_actuals: {},
      direct_debits: JSON.parse(JSON.stringify(cfg.default_direct_debits || [])),
      payments_in: JSON.parse(JSON.stringify(cfg.default_payments_in || [])),
      deductions_list: JSON.parse(JSON.stringify(cfg.default_deductions || []))
    };
  }
  return yData.months[mName];
}

function getWeekItems(mName, wName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  if (!md.weekly_items) md.weekly_items = {};
  if (!md.weekly_items[wName]) {
    md.weekly_items[wName] = JSON.parse(JSON.stringify(getSettings().default_weekly || []));
  }
  return md.weekly_items[wName];
}

function getWeekActuals(mName, wName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  if (!md.weekly_actuals) md.weekly_actuals = {};
  if (!md.weekly_actuals[wName]) {
    md.weekly_actuals[wName] = {};
  }
  return md.weekly_actuals[wName];
}

function getAccountTrackingSettings(year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.account_configs) {
    yData.account_configs = {
      current: {},
      credit: {},
      savings: {}
    };
  }
  const cfg = getSettings();

  cfg.current_accounts.forEach(acc => {
    if (!yData.account_configs.current[acc]) {
      yData.account_configs.current[acc] = {
        tracking: 'weekly',
        include_in_net: true
      };
    }
  });

  cfg.credit_accounts.forEach(c => {
    if (!yData.account_configs.credit[c.name]) {
      yData.account_configs.credit[c.name] = {
        tracking: 'weekly',
        include_in_net: true
      };
    }
  });

  cfg.savings_accounts.forEach(s => {
    if (!yData.account_configs.savings[s]) {
      yData.account_configs.savings[s] = {
        tracking: 'monthly',
        include_in_net: true
      };
    }
  });

  return yData.account_configs;
}

function getAccountConfig(accType, accName, year = appState.currentYear) {
  const configs = getAccountTrackingSettings(year);
  return (configs[accType] && configs[accType][accName]) || { tracking: 'weekly', include_in_net: true };
}

function isAccountTrackedWeekly(accType, accName, year = appState.currentYear) {
  return getAccountConfig(accType, accName, year).tracking !== 'monthly';
}

function isAccountTrackedMonthly(accType, accName, year = appState.currentYear) {
  return getAccountConfig(accType, accName, year).tracking === 'monthly';
}

function isAccountIncludedInNet(accType, accName, year = appState.currentYear) {
  return getAccountConfig(accType, accName, year).include_in_net !== false;
}

function isMultiUserEnabled() {
  const cfg = getSettings();
  return !!cfg.enable_multi_user;
}

function getPersonSettings(personName) {
  const cfg = getSettings();
  if (!cfg.people_settings) cfg.people_settings = {};
  if (!cfg.people_settings[personName]) {
    cfg.people_settings[personName] = {
      hide_salary: false,
      pin: ""
    };
  }
  return cfg.people_settings[personName];
}

function isPersonSalaryHidden(personName) {
  if (!isMultiUserEnabled()) return false;
  const pConf = getPersonSettings(personName);
  return !!pConf.hide_salary;
}

function getPersonPin(personName) {
  const pConf = getPersonSettings(personName);
  return (pConf && pConf.pin) ? String(pConf.pin).trim() : "";
}

function setPersonPin(personName, pin) {
  const pConf = getPersonSettings(personName);
  pConf.pin = pin ? String(pin).trim() : "";
  const cfg = getSettings();
  if (!cfg.security) cfg.security = { personas: {} };
  if (!cfg.security.personas) cfg.security.personas = {};
  if (pin) {
    cfg.security.personas[personName] = { enabled: true };
  } else {
    cfg.security.personas[personName] = { enabled: false };
  }
}

function hasPersonPin(personName) {
  if (personName === 'Master') {
    const cfg = getSettings();
    return !!(cfg.security && cfg.security.master_pin_enabled);
  }
  if (personName === 'Joint') {
    const cfg = getSettings();
    return !!(cfg.security && cfg.security.joint_pin_enabled);
  }
  const cfg = getSettings();
  const secP = cfg.security && cfg.security.personas && cfg.security.personas[personName];
  if (secP && secP.enabled) return true;
  return !!getPersonPin(personName);
}

function isUserUnlocked(personName) {
  if (!personName) return true;
  if (!hasPersonPin(personName)) return true;
  return !!(appState.unlockedUsers && appState.unlockedUsers[personName]);
}

function isMasterLocked() {
  const cfg = getSettings();
  if (cfg.enable_multi_user) return false;
  return !!(cfg.security && cfg.security.master_pin_enabled && !appState.isMasterUnlocked);
}

function unlockUser(personName, pin) {
  if (!hasPersonPin(personName)) {
    if (!appState.unlockedUsers) appState.unlockedUsers = {};
    appState.unlockedUsers[personName] = true;
    return true;
  }
  const expected = getPersonPin(personName);
  if (!expected || String(pin).trim() === expected) {
    if (!appState.unlockedUsers) appState.unlockedUsers = {};
    appState.unlockedUsers[personName] = true;
    return true;
  }
  return false;
}

function lockAllUsers() {
  appState.unlockedUsers = {};
  appState.isMasterUnlocked = false;
  appState.activeUser = 'Joint';
}

function getActiveUser() {
  return appState.activeUser || 'Joint';
}

function setActiveUser(user) {
  appState.activeUser = user || 'Joint';
}

function getAccountOwner(accType, accName) {
  const cfg = getSettings();
  if (!cfg.account_owners) cfg.account_owners = {};
  const key = `${accType}:${accName}`;
  if (cfg.account_owners[key]) return cfg.account_owners[key];
  if (cfg.account_owners[accName]) return cfg.account_owners[accName];
  if (accType === 'credit' && Array.isArray(cfg.credit_accounts)) {
    const cObj = cfg.credit_accounts.find(c => (typeof c === 'object' && c.name === accName));
    if (cObj && cObj.owner) return cObj.owner;
  }
  return "Joint";
}

function setAccountOwner(accType, accName, owner) {
  const cfg = getSettings();
  if (!cfg.account_owners) cfg.account_owners = {};
  const key = `${accType}:${accName}`;
  cfg.account_owners[key] = owner || "Joint";
  cfg.account_owners[accName] = owner || "Joint";
  if (accType === 'credit' && Array.isArray(cfg.credit_accounts)) {
    const cObj = cfg.credit_accounts.find(c => (typeof c === 'object' && c.name === accName));
    if (cObj) cObj.owner = owner || "Joint";
  }
}

function setPersonSalaryPrivacy(personName, hide) {
  const pConf = getPersonSettings(personName);
  pConf.hide_salary = !!hide;
}

function isAccountVisibleToActiveUser(accType, accName) {
  if (!isMultiUserEnabled()) return true;
  const activeUser = appState.activeUser || 'Joint';
  const owner = getAccountOwner(accType, accName);
  if (activeUser === 'Joint') {
    return owner === 'Joint';
  }
  return owner === 'Joint' || owner === activeUser;
}

if (typeof window !== 'undefined') {
  window.__budgetAppState = appState;
  window.appState = appState;
  window.getSettings = getSettings;
  window.getYearData = getYearData;
  window.getMonthData = getMonthData;
  window.getWeekItems = getWeekItems;
  window.getWeekActuals = getWeekActuals;
  window.getAccountTrackingSettings = getAccountTrackingSettings;
  window.isAccountTrackedWeekly = isAccountTrackedWeekly;
  window.isAccountIncludedInNet = isAccountIncludedInNet;
  window.isMultiUserEnabled = isMultiUserEnabled;
  window.getPersonSettings = getPersonSettings;
  window.isPersonSalaryHidden = isPersonSalaryHidden;
  window.getPersonPin = getPersonPin;
  window.setPersonPin = setPersonPin;
  window.hasPersonPin = hasPersonPin;
  window.isUserUnlocked = isUserUnlocked;
  window.unlockUser = unlockUser;
  window.lockAllUsers = lockAllUsers;
  window.getActiveUser = getActiveUser;
  window.setActiveUser = setActiveUser;
  window.getAccountOwner = getAccountOwner;
  window.setAccountOwner = setAccountOwner;
  window.isAccountVisibleToActiveUser = isAccountVisibleToActiveUser;
  window.setPersonSalaryPrivacy = setPersonSalaryPrivacy;
  window.months = months;
  window.applyTheme = applyTheme;
}

function getBirthdays(year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.birthdays) {
    const cfg = getSettings();
    yData.birthdays = JSON.parse(JSON.stringify(cfg.birthdays || []));
  }
  return yData.birthdays;
}

function getRecurringPayments(year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.recurring_payments) {
    const cfg = getSettings();
    yData.recurring_payments = JSON.parse(JSON.stringify(cfg.recurring_payments || []));
  }
  return yData.recurring_payments;
}

function getRecurringIncomes(year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.recurring_incomes) {
    const cfg = getSettings();
    yData.recurring_incomes = JSON.parse(JSON.stringify(cfg.recurring_incomes || []));
  }
  return yData.recurring_incomes;
}

function getAllScheduledBills(mName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  const yData = getYearData(year);
  const cfg = getSettings();

  const list = [];

  // 1. Monthly Direct Debits for this month
  (md.direct_debits || []).forEach((dd, idx) => {
    list.push({
      ...dd,
      is_income: false,
      source_type: 'direct_debit',
      source_idx: idx,
      frequency: dd.frequency || 'monthly',
      account: dd.account || cfg.current_accounts[0],
      transfer_to: dd.transfer_to || 'none',
      holiday_rule: dd.holiday_rule || 'following'
    });
  });

  // 2. Annual Recurring Bills
  (yData.yearly_recurring || []).forEach((yb, idx) => {
    list.push({
      ...yb,
      is_income: false,
      source_type: 'yearly_recurring',
      source_idx: idx,
      frequency: 'yearly',
      account: yb.account || cfg.current_accounts[0],
      transfer_to: yb.transfer_to || 'none',
      holiday_rule: yb.holiday_rule || 'following'
    });
  });

  // 3. Flexible Recurring Payments
  (yData.recurring_payments || []).forEach((r, idx) => {
    list.push({
      ...r,
      is_income: false,
      source_type: 'recurring_payment',
      source_idx: idx,
      frequency: r.frequency || 'monthly',
      account: r.account || cfg.current_accounts[0],
      transfer_to: r.transfer_to || 'none',
      holiday_rule: r.holiday_rule || 'following'
    });
  });

  return list;
}

function getAllScheduledIncomes(mName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  const yData = getYearData(year);
  const cfg = getSettings();

  const list = [];

  // 1. Monthly Payments In for this month
  (md.payments_in || []).forEach((pi, idx) => {
    list.push({
      ...pi,
      is_income: true,
      source_type: 'monthly_payment_in',
      source_idx: idx,
      frequency: pi.frequency || 'monthly',
      account: pi.account || cfg.current_accounts[0],
      holiday_rule: pi.holiday_rule || 'previous'
    });
  });

  // 2. Annual Recurring Income
  (yData.yearly_income || []).forEach((yi, idx) => {
    list.push({
      ...yi,
      is_income: true,
      source_type: 'yearly_income',
      source_idx: idx,
      frequency: 'yearly',
      account: yi.account || cfg.current_accounts[0],
      holiday_rule: yi.holiday_rule || 'previous'
    });
  });

  // 3. Multi-Cadence Recurring Incomes
  (yData.recurring_incomes || []).forEach((r, idx) => {
    list.push({
      ...r,
      is_income: true,
      source_type: 'recurring_income',
      source_idx: idx,
      frequency: r.frequency || 'monthly',
      account: r.account || cfg.current_accounts[0],
      holiday_rule: r.holiday_rule || 'previous'
    });
  });

  return list;
}

function getAllScheduledItems(mName, year = appState.currentYear) {
  const bills = getAllScheduledBills(mName, year);
  const incomes = getAllScheduledIncomes(mName, year);
  return [...bills, ...incomes];
}

if (typeof window !== 'undefined') {
  window.getRecurringIncomes = getRecurringIncomes;
  window.getAllScheduledBills = getAllScheduledBills;
  window.getAllScheduledIncomes = getAllScheduledIncomes;
  window.getAllScheduledItems = getAllScheduledItems;
}


// --- static/js/api.js ---
function getBaseApiUrl() {
  let p = window.location.pathname;
  if (p.endsWith('index.html')) p = p.slice(0, -10);
  if (!p.endsWith('/')) p += '/';
  return p;
}

function getApiUrl() {
  return getBaseApiUrl() + 'api/budget';
}

async function fetchBudget() {
  try {
    const r = await fetch(getApiUrl(), { 
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) {
      const content = await r.json();
      if (content && typeof content === 'object' && Object.keys(content).length > 0) {
        return content;
      }
    }
  } catch (e) {
    console.error("fetchBudget error:", e);
  }
  return null;
}

async function saveBudget(state) {
  if (!state) return false;
  try {
    const r = await fetch(getApiUrl(), {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(state)
    });
    return r.ok;
  } catch (e) {
    console.error("saveBudget error:", e);
    return false;
  }
}

async function resetDatabase() {
  try {
    const r = await fetch(getApiUrl(), {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({})
    });
    return r.ok;
  } catch (e) {
    console.error("resetDatabase error:", e);
    return false;
  }
}

async function getAuthStatus() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/auth/status', {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error("getAuthStatus error:", e);
  }
  return { master_pin_enabled: false, multi_user: false, personas: {} };
}

async function unlockAuth(persona, pin) {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/auth/unlock', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona, pin })
    });
    const res = await r.json();
    return { ok: r.ok, ...res };
  } catch (e) {
    console.error("unlockAuth error:", e);
    return { ok: false, error: e.message };
  }
}

async function setPinAuth(persona, newPin, oldPin = '', enabled = true) {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/auth/set_pin', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona, new_pin: newPin, old_pin: oldPin, enabled })
    });
    const res = await r.json();
    return { ok: r.ok, ...res };
  } catch (e) {
    console.error("setPinAuth error:", e);
    return { ok: false, error: e.message };
  }
}

// ---------------------------------------------------------
// OPEN BANKING API
// ---------------------------------------------------------

async function getOpenBankingStatus() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/status', {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error("getOpenBankingStatus error:", e);
  }
  return { enabled: false, provider: "gocardless", linked_accounts: [], transaction_count: 0 };
}

async function saveOpenBankingConfig(cfg) {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/config', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    return r.ok;
  } catch (e) {
    console.error("saveOpenBankingConfig error:", e);
    return false;
  }
}

async function getOpenBankingInstitutions(country = 'GB') {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/institutions?country=' + encodeURIComponent(country), {
      cache: 'no-store'
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error("getOpenBankingInstitutions error:", e);
  }
  return { success: false, institutions: [] };
}

async function createOpenBankingRequisition(institutionId, redirectUri, institutionName = '', institutionLogo = '', owner = 'Joint') {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/requisition/create', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: institutionId,
        redirect_uri: redirectUri,
        institution_name: institutionName,
        institution_logo: institutionLogo,
        owner
      })
    });
    return await r.json();
  } catch (e) {
    console.error("createOpenBankingRequisition error:", e);
    return { success: false, error: e.message };
  }
}

async function callbackOpenBankingRequisition(requisitionId = null, code = null, state = null, redirectUri = null) {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/requisition/callback', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requisition_id: requisitionId,
        code: code,
        state: state,
        redirect_uri: redirectUri
      })
    });
    return await r.json();
  } catch (e) {
    console.error("callbackOpenBankingRequisition error:", e);
    return { success: false, error: e.message };
  }
}

async function mapOpenBankingAccount(accountId, mappedHabitAccountId, owner) {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/accounts/map', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        mapped_habit_account_id: mappedHabitAccountId,
        owner
      })
    });
    return await r.json();
  } catch (e) {
    console.error("mapOpenBankingAccount error:", e);
    return { success: false, error: e.message };
  }
}

async function syncOpenBanking() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/sync', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error("syncOpenBanking error:", e);
  }
  return { status: "error" };
}

async function unlinkOpenBanking(accountId = null, requisitionId = null) {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/unlink', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, requisition_id: requisitionId })
    });
    return await r.json();
  } catch (e) {
    console.error("unlinkOpenBanking error:", e);
    return { success: false, error: e.message };
  }
}

async function uploadBankStatement(fileContent, filename = 'statement.csv', mappedAccount = '', owner = 'Joint') {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/statement/upload', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_content: fileContent,
        filename,
        mapped_account: mappedAccount,
        owner
      })
    });
    return await r.json();
  } catch (e) {
    console.error("uploadBankStatement error:", e);
    return { success: false, error: e.message };
  }
}

async function fetchCategories() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/categories', {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error("fetchCategories error:", e);
  }
  return null;
}

async function syncCategoriesFromGitHub() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/categories/sync', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error("syncCategoriesFromGitHub error:", e);
  }
  return { success: false };
}

async function suggestCategoryMerchant(merchant, category, notes = '') {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/categories/suggest', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant, category, notes })
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error("suggestCategoryMerchant error:", e);
  }
  return { success: false };
}

// --- static/js/calculations.js ---


function getEaster(year) {
  const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function getBankHolidays(year, countryCode) {
  if (countryCode === 'none') return [];
  const holidays = [];
  const addH = (d) => holidays.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());

  if (countryCode === 'us') {
    let d = new Date(year, 0, 1);
    if (d.getDay() === 0) d.setDate(2); else if (d.getDay() === 6) d.setDate(31);
    addH(d);
    
    d = new Date(year, 0, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 14); addH(d);
    d = new Date(year, 1, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 14); addH(d);
    d = new Date(year, 4, 31); while (d.getDay() !== 1) d.setDate(d.getDate() - 1); addH(d);
    addH(new Date(year, 5, 19));
    addH(new Date(year, 6, 4));
    d = new Date(year, 8, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); addH(d);
    d = new Date(year, 9, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7); addH(d);
    addH(new Date(year, 10, 11));
    d = new Date(year, 10, 1); while (d.getDay() !== 4) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 21); addH(d);
    addH(new Date(year, 11, 25));
    return holidays;
  }

  // UK Holidays (England & Wales, Scotland)
  addH(new Date(year, 0, 1));
  const easter = getEaster(year);
  const gf = new Date(easter); gf.setDate(easter.getDate() - 2); addH(gf);
  const em = new Date(easter); em.setDate(easter.getDate() + 1); addH(em);
  let d = new Date(year, 4, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); addH(d);
  d = new Date(year, 4, 31); while (d.getDay() !== 1) d.setDate(d.getDate() - 1); addH(d);
  d = new Date(year, 7, 31); while (d.getDay() !== 1) d.setDate(d.getDate() - 1); addH(d);
  addH(new Date(year, 11, 25)); addH(new Date(year, 11, 26));
  return holidays;
}

function getAdjustedWorkingDay(dateObj, rule = 'following') {
  if (rule === 'exact') {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  }
  const cfg = getSettings();
  const holidays = getBankHolidays(dateObj.getFullYear(), cfg.country_holidays)
    .concat(getBankHolidays(dateObj.getFullYear() + 1, cfg.country_holidays))
    .concat(getBankHolidays(dateObj.getFullYear() - 1, cfg.country_holidays));
  let curr = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  if (rule === 'previous') {
    while (curr.getDay() === 0 || curr.getDay() === 6 || holidays.includes(curr.getTime())) {
      curr.setDate(curr.getDate() - 1);
    }
  } else { // 'following' (default)
    while (curr.getDay() === 0 || curr.getDay() === 6 || holidays.includes(curr.getTime())) {
      curr.setDate(curr.getDate() + 1);
    }
  }
  return curr;
}

function getNextWorkingDay(dateObj) {
  return getAdjustedWorkingDay(dateObj, 'following');
}

function getPreviousWorkingDay(dateObj) {
  return getAdjustedWorkingDay(dateObj, 'previous');
}

function calculateMonthSchedule(year = appState.currentYear, monthIdx) {
  const cfg = getSettings();
  const mName = months[monthIdx];
  const md = getMonthData(mName, year);

  let startDate, endDate, nextStartDate;
  const overrideStart = md.override_start_date || (md.date_overrides && md.date_overrides.start_date);
  const overrideEnd = md.override_end_date || (md.date_overrides && md.date_overrides.end_date);

  if (overrideStart && overrideEnd) {
    const sParts = overrideStart.split('-').map(Number);
    const eParts = overrideEnd.split('-').map(Number);
    startDate = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0);
    endDate = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59);
    nextStartDate = new Date(eParts[0], eParts[1] - 1, eParts[2] + 1, 0, 0, 0);
  } else {
    function getPaydayMonday(d) {
      const day = d.getDay();
      const res = new Date(d);
      if (day === 0) {
        res.setDate(d.getDate() + 1); // Sunday -> Monday
      } else if (day === 6) {
        res.setDate(d.getDate() + 2); // Saturday -> Monday
      } else {
        res.setDate(d.getDate() - (day - 1)); // Pull back to its Monday
      }
      res.setHours(0, 0, 0, 0);
      return res;
    }

    function getTargetPayDate(y, m) {
      if (cfg.payday_is_last_working_day || cfg.payday_day === 'last_working_day') {
        const lastDay = new Date(y, m + 1, 0);
        return getAdjustedWorkingDay(lastDay, 'previous');
      } else if (cfg.payday_day === 'last_day') {
        return new Date(y, m + 1, 0);
      } else {
        const pDay = parseInt(cfg.payday_day || 26, 10);
        const maxD = new Date(y, m + 1, 0).getDate();
        const rawDate = new Date(y, m, Math.min(pDay, maxD));
        return getAdjustedWorkingDay(rawDate, cfg.payday_rule || 'previous');
      }
    }

    const startRef = (monthIdx === 0) ? getTargetPayDate(year - 1, 11) : getTargetPayDate(year, monthIdx - 1);
    const endRef = getTargetPayDate(year, monthIdx);
    
    startDate = getPaydayMonday(startRef);
    nextStartDate = getPaydayMonday(endRef);
    endDate = new Date(nextStartDate.getTime());
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59);
  }

  const diffTime = nextStartDate.getTime() - startDate.getTime();
  const numWeeks = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)));

  const weeks = [];
  for (let i = 0; i < numWeeks; i++) {
    const wStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (i * 7), 0, 0, 0);
    let wEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (i * 7) + 6, 23, 59, 59);
    if (i === numWeeks - 1 && overrideStart && overrideEnd) {
      wEnd = new Date(endDate.getTime());
    }

    const dayStr = wStart.getDate().toString().padStart(2, '0');
    const monthShort = months[wStart.getMonth()];
    weeks.push({ 
      name: `Week ${i + 1}`, 
      label: `Week ${i + 1} (${dayStr} ${monthShort})`,
      startDate: wStart,
      endDate: wEnd
    });
  }

  const schedObj = {
    startDate,
    endDate,
    numWeeks,
    weeks,
    primaryMonthIdx: monthIdx,
    primaryYear: year,
    dateRangeStr: `${startDate.getDate()} ${months[startDate.getMonth()]} - ${endDate.getDate()} ${months[endDate.getMonth()]}`
  };

  return schedObj;
}

function getPaydaysForSchedule(schedule, freq = 'monthly', options = {}) {
  const cfg = getSettings();
  const frequency = freq || cfg.pay_frequency || 'monthly';
  const startMs = schedule.startDate.getTime();
  const endMs = schedule.endDate.getTime();
  const paydays = [];

  if (frequency === 'weekly') {
    schedule.weeks.forEach(w => {
      paydays.push({
        date: w.startDate,
        weekName: w.name,
        label: `Weekly Pay (${w.startDate.getDate()} ${months[w.startDate.getMonth()]})`
      });
    });
  } else if (frequency === 'biweekly' || frequency === 'four_weekly') {
    const stepDays = frequency === 'biweekly' ? 14 : 28;
    const anchorStr = options.anchorDate || cfg.payday_anchor_date || '2026-01-09';
    const anchor = new Date(anchorStr.includes('T') ? anchorStr : anchorStr + 'T12:00:00');
    
    let cur = new Date(anchor.getTime());
    while (cur.getTime() > startMs - (35 * 86400000)) {
      cur.setDate(cur.getDate() - stepDays);
    }
    while (cur.getTime() <= endMs + (14 * 86400000)) {
      const pTime = cur.getTime();
      if (pTime >= startMs && pTime <= endMs) {
        const week = schedule.weeks.find(w => pTime >= w.startDate.getTime() && pTime <= w.endDate.getTime()) || schedule.weeks[0];
        paydays.push({
          date: new Date(cur.getTime()),
          weekName: week ? week.name : 'Week 1',
          label: `${frequency === 'biweekly' ? 'Bi-Weekly' : '4-Weekly'} Pay (${cur.getDate()} ${months[cur.getMonth()]})`
        });
      }
      cur.setDate(cur.getDate() + stepDays);
    }
  } else if (frequency === 'semi_monthly') {
    const d1 = parseInt(options.firstDay || cfg.payday_first_day || 15, 10);
    const d2Opt = options.secondDay || cfg.payday_second_day || 'last_day';
    
    const m1 = schedule.startDate.getMonth();
    const m2 = schedule.endDate.getMonth();
    const y1 = schedule.startDate.getFullYear();
    const y2 = schedule.endDate.getFullYear();
    
    const candidateMonths = [{ y: y1, m: m1 }];
    if (m1 !== m2 || y1 !== y2) candidateMonths.push({ y: y2, m: m2 });

    candidateMonths.forEach(cm => {
      const dt1 = new Date(cm.y, cm.m, d1, 12, 0, 0);
      const lastDayOfMonth = new Date(cm.y, cm.m + 1, 0).getDate();
      const d2Val = d2Opt === 'last_day' ? lastDayOfMonth : Math.min(parseInt(d2Opt, 10), lastDayOfMonth);
      const dt2 = new Date(cm.y, cm.m, d2Val, 12, 0, 0);

      [dt1, dt2].forEach(dt => {
        const adj = getAdjustedWorkingDay(dt, 'following');
        const pTime = adj.getTime();
        if (pTime >= startMs && pTime <= endMs) {
          const week = schedule.weeks.find(w => pTime >= w.startDate.getTime() && pTime <= w.endDate.getTime()) || schedule.weeks[0];
          paydays.push({
            date: adj,
            weekName: week ? week.name : 'Week 1',
            label: `Semi-Monthly Pay (${adj.getDate()} ${months[adj.getMonth()]})`
          });
        }
      });
    });
  } else {
    paydays.push({
      date: schedule.startDate,
      weekName: 'Week 1',
      label: `Monthly Payday (${schedule.startDate.getDate()} ${months[schedule.startDate.getMonth()]})`
    });
  }

  return paydays;
}

function getDeductionSalaryForMonth(d, person, schedule) {
  const baseAmt = (d.amounts && typeof d.amounts[person] !== 'undefined') ? Number(d.amounts[person]) : (d.person === person ? Number(d.amount) : 0);
  if (baseAmt <= 0) return { total: 0, count: 0, paydays: [] };
  if (!d.is_salary) return { total: baseAmt, count: 1, paydays: [] };

  const freq = d.frequency || getSettings().pay_frequency || 'monthly';
  if (freq === 'monthly') {
    return { total: baseAmt, count: 1, paydays: [] };
  }

  const paydays = getPaydaysForSchedule(schedule, freq, {
    anchorDate: d.anchor_date || getSettings().payday_anchor_date,
    firstDay: d.first_day || getSettings().payday_first_day,
    secondDay: d.second_day || getSettings().payday_second_day
  });

  const count = Math.max(1, paydays.length);
  return {
    total: baseAmt * count,
    count,
    paydays
  };
}

function getCandidateDatesForDueDay(dueDay, startDate, endDate) {
  const dates = [];
  let curY = startDate.getFullYear();
  let curM = startDate.getMonth();
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth();

  const startDayZero = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0).getTime();
  const endDayZero = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).getTime();

  while (curY < endY || (curY === endY && curM <= endM)) {
    const maxDay = new Date(curY, curM + 1, 0).getDate();
    const day = Math.min(Math.max(1, parseInt(dueDay || 1, 10)), maxDay);
    const targetDate = new Date(curY, curM, day);
    const targetDayZero = new Date(curY, curM, day, 0, 0, 0).getTime();

    if (targetDayZero >= startDayZero && targetDayZero <= endDayZero) {
      dates.push(targetDate);
    }

    curM++;
    if (curM > 11) {
      curM = 0;
      curY++;
    }
  }
  return dates;
}

function getDDsForWeek(directDebits, weekObj, monthSchedule) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const schedStart = monthSchedule ? monthSchedule.startDate : weekObj.startDate;
  const schedEnd = monthSchedule ? monthSchedule.endDate : weekObj.endDate;
  const isLastWeek = monthSchedule && monthSchedule.weeks && weekObj.name === monthSchedule.weeks[monthSchedule.weeks.length - 1].name;
  const primaryMonthIdx = (monthSchedule && monthSchedule.primaryMonthIdx !== undefined) ? monthSchedule.primaryMonthIdx : (appState.activeTab ? months.indexOf(appState.activeTab) : 0);
  const primaryYear = (monthSchedule && monthSchedule.primaryYear !== undefined) ? monthSchedule.primaryYear : appState.currentYear;

  const result = [];
  (directDebits || []).forEach(dd => {
    const rule = dd.holiday_rule || 'following';

    if (dd.exact_date) {
      const targetDate = new Date(dd.exact_date.includes('T') ? dd.exact_date : dd.exact_date + 'T12:00:00');
      const payTime = targetDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...dd,
          is_income: false,
          actualPaymentDate: targetDate,
          actualDateStr: `${targetDate.getDate()} ${months[targetDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else if (dd.month) {
      const dueDay = parseInt(dd.due_day || 1, 10);
      let targetMIdx = months.indexOf(dd.month);
      if (targetMIdx === -1) {
        targetMIdx = months.findIndex(m => m.toLowerCase().startsWith(dd.month.toLowerCase().substring(0, 3)));
      }
      if (targetMIdx === -1) targetMIdx = primaryMonthIdx;
      
      const targetDate = new Date(primaryYear, targetMIdx, dueDay);
      const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
      const payTime = actualPaymentDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...dd,
          is_income: false,
          actualPaymentDate: actualPaymentDate,
          actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else {
      const dueDay = parseInt(dd.due_day || 1, 10);
      const candidateDates = getCandidateDatesForDueDay(dueDay, schedStart, schedEnd);
      candidateDates.forEach(targetDate => {
        const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
        const payTime = actualPaymentDate.getTime();
        const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
        if (isDueThisWeek) {
          result.push({
            ...dd,
            is_income: false,
            actualPaymentDate: actualPaymentDate,
            actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
            isDueThisWeek: true
          });
        }
      });
    }
  });

  return result;
}

function getIncomesForWeek(paymentsIn, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const schedStart = monthSchedule ? monthSchedule.startDate : weekObj.startDate;
  const schedEnd = monthSchedule ? monthSchedule.endDate : weekObj.endDate;
  const isLastWeek = monthSchedule && monthSchedule.weeks && weekObj.name === monthSchedule.weeks[monthSchedule.weeks.length - 1].name;
  const primaryMonthIdx = (monthSchedule && monthSchedule.primaryMonthIdx !== undefined) ? monthSchedule.primaryMonthIdx : (appState.activeTab ? months.indexOf(appState.activeTab) : 0);
  const primaryYear = (monthSchedule && monthSchedule.primaryYear !== undefined) ? monthSchedule.primaryYear : year;

  const result = [];
  (paymentsIn || []).forEach(pi => {
    const rule = pi.holiday_rule || 'previous';

    if (pi.exact_date) {
      const targetDate = new Date(pi.exact_date.includes('T') ? pi.exact_date : pi.exact_date + 'T12:00:00');
      const payTime = targetDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...pi,
          is_income: true,
          actualPaymentDate: targetDate,
          actualDateStr: `${targetDate.getDate()} ${months[targetDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else if (pi.month) {
      const dueDay = parseInt(pi.due_day || 1, 10);
      let targetMIdx = months.indexOf(pi.month);
      if (targetMIdx === -1) {
        targetMIdx = months.findIndex(m => m.toLowerCase().startsWith(pi.month.toLowerCase().substring(0, 3)));
      }
      if (targetMIdx === -1) targetMIdx = primaryMonthIdx;
      
      const targetDate = new Date(primaryYear, targetMIdx, dueDay);
      const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
      const payTime = actualPaymentDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...pi,
          is_income: true,
          actualPaymentDate: actualPaymentDate,
          actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else {
      const dueDay = parseInt(pi.due_day || 1, 10);
      const candidateDates = getCandidateDatesForDueDay(dueDay, schedStart, schedEnd);
      candidateDates.forEach(targetDate => {
        const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
        const payTime = actualPaymentDate.getTime();
        const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
        if (isDueThisWeek) {
          result.push({
            ...pi,
            is_income: true,
            actualPaymentDate: actualPaymentDate,
            actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
            isDueThisWeek: true
          });
        }
      });
    }
  });

  return result;
}

function calculateLiveDailyPacing(wObj, p, actuals, cfg) {
  const now = new Date();
  const wStart = new Date(wObj.startDate.getFullYear(), wObj.startDate.getMonth(), wObj.startDate.getDate(), 0, 0, 0);
  const wEnd = new Date(wObj.endDate.getFullYear(), wObj.endDate.getMonth(), wObj.endDate.getDate(), 23, 59, 59);

  const oneDayMs = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((wEnd.getTime() - wStart.getTime()) / oneDayMs));
  let elapsedDays = Math.floor((now.getTime() - wStart.getTime()) / oneDayMs) + 1;
  elapsedDays = Math.max(1, Math.min(totalDays, elapsedDays));
  const dayFraction = elapsedDays / totalDays;

  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const clearedDDs = [];
  const upcomingDDs = [];
  const pastDueDDs = [];

  (p.wDDs || []).forEach(d => {
    const isCleared = Boolean(d.auto_cleared || d.status === 'paid');
    const pDate = d.actualPaymentDate ? new Date(d.actualPaymentDate) : null;
    const isPastDate = pDate ? (pDate.getTime() <= todayEnd.getTime()) : false;

    if (isCleared) {
      clearedDDs.push(d);
    } else if (isPastDate) {
      pastDueDDs.push(d);
    } else {
      upcomingDDs.push(d);
    }
  });

  const clearedIncomes = [];
  const upcomingIncomes = [];
  const pastDueIncomes = [];

  (p.wIncomes || []).forEach(i => {
    const isCleared = Boolean(i.auto_cleared || i.status === 'paid');
    const pDate = i.actualPaymentDate ? new Date(i.actualPaymentDate) : null;
    const isPastDate = pDate ? (pDate.getTime() <= todayEnd.getTime()) : false;

    if (isCleared) {
      clearedIncomes.push(i);
    } else if (isPastDate) {
      pastDueIncomes.push(i);
    } else {
      upcomingIncomes.push(i);
    }
  });

  const clearedDDTotal = clearedDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const upcomingDDTotal = upcomingDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const clearedIncomeTotal = clearedIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const upcomingIncomeTotal = upcomingIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const plannedWeeklyNetSpend = (p.wSpend || 0) - (p.wIncomeSum || 0);
  const pacedDiscretionarySpendToDate = plannedWeeklyNetSpend * dayFraction;

  // Paced target today adds back upcoming bills that haven't cleared yet and only expects spending for elapsed days
  const pacedTargetNetToday = p.predictedNet + upcomingDDTotal - upcomingIncomeTotal + (plannedWeeklyNetSpend * (1 - dayFraction));

  let liveDailyVariance = null;
  if (p.actualNet !== null && p.actualNet !== undefined) {
    liveDailyVariance = p.actualNet - pacedTargetNetToday;
  }

  return {
    isPacingActive: true,
    elapsedDays,
    totalDays,
    dayFraction,
    clearedDDs,
    upcomingDDs,
    pastDueDDs,
    clearedDDTotal,
    upcomingDDTotal,
    clearedIncomes,
    upcomingIncomes,
    pastDueIncomes,
    clearedIncomeTotal,
    upcomingIncomeTotal,
    pacedDiscretionarySpendToDate,
    pacedTargetNetToday,
    liveDailyVariance
  };
}

function isRecurringDueInMonth(r, mName, year = appState.currentYear) {
  if (!r) return false;
  if (r.frequency === 'monthly') return true;
  if (r.frequency === 'yearly') return r.month === mName;
  const mIdx = months.indexOf(mName);
  if (mIdx === -1) return false;
  const sched = calculateMonthSchedule(year, mIdx);
  for (const w of sched.weeks) {
    const occs = getRecurringForWeek([r], w, sched, year);
    if (occs && occs.length > 0) return true;
  }
  return false;
}

function getNextOccurrenceDate(r, fromDate = new Date(), year = appState.currentYear) {
  if (!r) return null;
  const start = r.start_date ? new Date(r.start_date.includes('T') ? r.start_date : r.start_date + 'T00:00:00') : new Date(year, 0, 1);
  const end = r.end_date ? new Date(r.end_date.includes('T') ? r.end_date : r.end_date + 'T23:59:59') : null;

  const freq = r.frequency || 'monthly';
  const intervalN = Math.max(1, parseInt(r.interval_n || 1, 10));
  const fromDateZero = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0);
  const holidayRule = r.holiday_rule || (r.is_income ? 'previous' : 'following');

  if (freq === 'weekly' || freq === 'biweekly' || freq === 'custom_weeks' || freq === 'four_weekly') {
    const stepWeeks = freq === 'weekly' ? 1 : (freq === 'biweekly' ? 2 : (freq === 'four_weekly' ? 4 : intervalN));
    let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
    const limitDate = new Date(Number(year) + 5, 11, 31);
    while (cur < fromDateZero && cur <= limitDate) {
      cur.setDate(cur.getDate() + (stepWeeks * 7));
    }
    if (end && cur > end) return null;
    return cur;
  }

  if (freq === 'monthly' || freq === 'quarterly' || freq === 'custom_months') {
    const stepMonths = freq === 'monthly' ? 1 : (freq === 'quarterly' ? 3 : intervalN);
    const dueDay = parseInt(r.day_of_month || start.getDate() || 1, 10);
    let curYear = start.getFullYear();
    let curMonth = start.getMonth();

    for (let count = 0; count < 120; count++) {
      const candidate = new Date(curYear, curMonth, dueDay);
      const payDate = getAdjustedWorkingDay(candidate, holidayRule);
      const payDateZero = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate(), 0, 0, 0);

      if (payDateZero >= fromDateZero) {
        if (end && payDateZero > end) return null;
        return payDate;
      }
      curMonth += stepMonths;
      while (curMonth >= 12) {
        curMonth -= 12;
        curYear += 1;
      }
    }
  }

  if (freq === 'yearly') {
    const mIdx = r.month ? months.indexOf(r.month) : start.getMonth();
    const dueDay = parseInt(r.due_day || r.day_of_month || start.getDate() || 1, 10);
    const candThisYear = getAdjustedWorkingDay(new Date(year, mIdx >= 0 ? mIdx : 0, dueDay), holidayRule);
    const candZero = new Date(candThisYear.getFullYear(), candThisYear.getMonth(), candThisYear.getDate(), 0, 0, 0);

    if (candZero >= fromDateZero) return candThisYear;
    return getAdjustedWorkingDay(new Date(Number(year) + 1, mIdx >= 0 ? mIdx : 0, dueDay), holidayRule);
  }

  return start;
}

function formatScheduledBillDue(b, contextMonth = null, year = appState.currentYear) {
  if (!b) return '';
  if (b.frequency === 'monthly' || b.source_type === 'direct_debit' || b.source_type === 'monthly_payment_in') {
    return contextMonth ? `Day ${b.due_day || 1}` : `Day ${b.due_day || 1} each month`;
  }
  if (b.frequency === 'yearly' || b.source_type === 'yearly_recurring' || b.source_type === 'yearly_income') {
    return `${b.due_day || 1} ${b.month || 'Jan'}`;
  }

  // Multi-cadence recurring item in month overview context
  if (contextMonth) {
    const mIdx = months.indexOf(contextMonth);
    if (mIdx >= 0) {
      const sched = calculateMonthSchedule(year, mIdx);
      for (const w of sched.weeks) {
        const occs = getRecurringForWeek([b], w, sched, year);
        if (occs && occs.length > 0) {
          return occs[0].actualDateStr;
        }
      }
    }
  }

  // In Bills Manager: compute next upcoming occurrence from today
  const now = new Date();
  const nextDate = getNextOccurrenceDate(b, now, year);
  if (nextDate) {
    const isDifferentYear = nextDate.getFullYear() !== now.getFullYear();
    const dayStr = nextDate.getDate();
    const monthStr = months[nextDate.getMonth()];
    const yearStr = isDifferentYear ? ` ${nextDate.getFullYear()}` : '';
    return `${dayStr} ${monthStr}${yearStr}`;
  }
  return b.start_date ? b.start_date : 'Scheduled';
}

function computeMonthClosing(mName, mIdx, year = appState.currentYear) {
  const cfg = getSettings();
  const yData = getYearData(year);
  const md = getMonthData(mName, year);
  const schedule = calculateMonthSchedule(year, mIdx);

  const closingCurrent = {};
  const closingCredit = {};
  const closingSavings = {};

  const numWeeks = schedule.weeks.length;
  const lastWeekName = `Week ${numWeeks}`;
  const lastActuals = (md.weekly_actuals && md.weekly_actuals[lastWeekName]) ? md.weekly_actuals[lastWeekName] : {};

  const savingsInflowFromSalary = {};
  const savingsInflowFromDD = {};
  cfg.savings_accounts.forEach(acc => {
    savingsInflowFromSalary[acc] = 0;
    savingsInflowFromDD[acc] = 0;
  });

  (md.deductions_list || []).forEach(d => {
    if (cfg.savings_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        savingsInflowFromSalary[d.target_account] += amt || 0;
      });
    }
  });
  (md.direct_debits || []).forEach(dd => {
    if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
      savingsInflowFromDD[dd.transfer_to] += Number(dd.amount) || 0;
    }
  });

  const cardAutoPayments = {};
  cfg.credit_accounts.forEach(c => {
    if (c.autopay_enabled) {
      const openingDebt = Number(md.credit_data[c.name] && md.credit_data[c.name].opening_spent) || 0;
      let payAmt = c.autopay_type === 'full' ? openingDebt : Math.min(openingDebt, Number(c.autopay_fixed_amt) || 0);
      cardAutoPayments[c.name] = { payAmt, from: c.autopay_from || cfg.current_accounts[0] };
    }
  });

  const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(mName, mIdx, year) : [];
  const startMs = new Date(schedule.startDate.getFullYear(), schedule.startDate.getMonth(), schedule.startDate.getDate(), 0, 0, 0).getTime();
  const endMs = new Date(schedule.endDate.getFullYear(), schedule.endDate.getMonth(), schedule.endDate.getDate(), 23, 59, 59).getTime();

  const yearlyBillsThisMonth = (yData.yearly_recurring || []).filter(yb => {
    const dueDay = parseInt(yb.due_day || 1, 10);
    let targetMIdx = months.indexOf(yb.month);
    if (targetMIdx === -1) targetMIdx = months.findIndex(m => m.toLowerCase().startsWith((yb.month || '').toLowerCase().substring(0, 3)));
    if (targetMIdx === -1) return false;
    const targetDate = new Date(year, targetMIdx, dueDay);
    const actualPaymentDate = getAdjustedWorkingDay(targetDate, yb.holiday_rule || 'following');
    const pTime = actualPaymentDate.getTime();
    return pTime >= startMs && pTime <= endMs;
  });

  const yearlyIncomeThisMonth = (yData.yearly_income || []).filter(yi => {
    const dueDay = parseInt(yi.due_day || 1, 10);
    let targetMIdx = months.indexOf(yi.month);
    if (targetMIdx === -1) targetMIdx = months.findIndex(m => m.toLowerCase().startsWith((yi.month || '').toLowerCase().substring(0, 3)));
    if (targetMIdx === -1) return false;
    const targetDate = new Date(year, targetMIdx, dueDay);
    const actualPaymentDate = getAdjustedWorkingDay(targetDate, yi.holiday_rule || 'previous');
    const pTime = actualPaymentDate.getTime();
    return pTime >= startMs && pTime <= endMs;
  });

  const birthdaysThisMonth = (typeof getBirthdayItemsForMonth === 'function') ? getBirthdayItemsForMonth(mName, mIdx, year) : [];

  const allRecurring = yData.recurring_payments || cfg.recurring_payments || [];
  const recurringBillsThisMonth = [];
  schedule.weeks.forEach(wObj => {
    const wRec = getRecurringForWeek(allRecurring, wObj, schedule, year);
    (wRec || []).forEach(r => recurringBillsThisMonth.push(r));
  });

  const allRecurringIncomes = yData.recurring_incomes || cfg.recurring_incomes || [];
  const recurringIncomesThisMonth = [];
  schedule.weeks.forEach(wObj => {
    const wRecIn = getRecurringForWeek(allRecurringIncomes, wObj, schedule, year);
    (wRecIn || []).forEach(r => recurringIncomesThisMonth.push(r));
  });

  const monthlyPaymentsInThisMonth = [];
  schedule.weeks.forEach(wObj => {
    const wIn = getIncomesForWeek(md.payments_in || [], wObj, schedule, year);
    (wIn || []).forEach(pi => monthlyPaymentsInThisMonth.push(pi));
  });

  cfg.current_accounts.forEach(acc => {
    let actVal = lastActuals[`curr_${acc}`];
    if (actVal !== "" && actVal !== null && actVal !== undefined) {
      closingCurrent[acc] = parseFloat(actVal) || 0;
    } else {
      let bal = md.current_data[acc] ? (Number(md.current_data[acc].opening) || 0) : 0;
      (md.deductions_list || []).forEach(d => {
        if (d.target_account === acc) {
          cfg.people.forEach(p => {
            const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
            bal += amt || 0;
          });
        }
      });
      (md.direct_debits || []).forEach(dd => {
        if (dd.account === acc || (!dd.account && acc === cfg.current_accounts[0])) bal -= Number(dd.amount) || 0;
      });
      monthlyPaymentsInThisMonth.forEach(pi => {
        if (pi.account === acc || (!pi.account && acc === cfg.current_accounts[0])) bal += Number(pi.amount) || 0;
      });
      yearlyBillsThisMonth.forEach(yb => {
        if (yb.account === acc) bal -= Number(yb.amount) || 0;
      });
      yearlyIncomeThisMonth.forEach(yi => {
        if (yi.account === acc) bal += Number(yi.amount) || 0;
      });
      budgetBillsThisMonth.forEach(b => {
        if (b.account === acc) bal -= Number(b.amount) || 0;
      });
      birthdaysThisMonth.forEach(b => {
        if (b.account === acc) bal -= Number(b.amount) || 0;
      });
      recurringBillsThisMonth.forEach(r => {
        if (r.account === acc) bal -= Number(r.amount) || 0;
      });
      recurringIncomesThisMonth.forEach(r => {
        if (r.account === acc) bal += Number(r.amount) || 0;
      });
      cfg.credit_accounts.forEach(c => {
        if (cardAutoPayments[c.name] && cardAutoPayments[c.name].from === acc) bal -= cardAutoPayments[c.name].payAmt;
      });
      schedule.weeks.forEach(wObj => {
        const items = md.weekly_items[wObj.name] || [];
        items.forEach(it => {
          const targetAcct = it.account_name || cfg.current_accounts[0];
          const isCurrent = it.account_type === 'current' || (it.desc && it.desc.toLowerCase().includes('cash'));
          if (isCurrent && targetAcct === acc) {
            const amt = Number(it.amount) || 0;
            bal = it.is_income ? bal + amt : bal - amt;
          }
        });
      });
      closingCurrent[acc] = bal;
    }
  });

  cfg.credit_accounts.forEach(c => {
    let actAvail = lastActuals[`c_avail_${c.name}`];
    let actSpent = lastActuals[`c_spent_${c.name}`];
    if (actAvail !== "" && actAvail !== null && actAvail !== undefined) {
      closingCredit[c.name] = (Number(c.limit) || 0) - (parseFloat(actAvail) || 0);
    } else if (actSpent !== "" && actSpent !== null && actSpent !== undefined) {
      closingCredit[c.name] = parseFloat(actSpent) || 0;
    } else {
      let spent = md.credit_data[c.name] ? (Number(md.credit_data[c.name].opening_spent) || 0) : 0;
      (md.direct_debits || []).forEach(dd => {
        if (dd.account === c.name) spent += Number(dd.amount) || 0;
      });
      monthlyPaymentsInThisMonth.forEach(pi => {
        if (pi.account === c.name) spent -= Number(pi.amount) || 0;
      });
      yearlyBillsThisMonth.forEach(yb => {
        if (yb.account === c.name) spent += Number(yb.amount) || 0;
      });
      yearlyIncomeThisMonth.forEach(yi => {
        if (yi.account === c.name) spent -= Number(yi.amount) || 0;
      });
      budgetBillsThisMonth.forEach(b => {
        if (b.account === c.name) spent += Number(b.amount) || 0;
      });
      birthdaysThisMonth.forEach(b => {
        if (b.account === c.name) spent += Number(b.amount) || 0;
      });
      recurringBillsThisMonth.forEach(r => {
        if (r.account === c.name) spent += Number(r.amount) || 0;
      });
      recurringIncomesThisMonth.forEach(r => {
        if (r.account === c.name) spent -= Number(r.amount) || 0;
      });
      if (cardAutoPayments[c.name]) spent -= cardAutoPayments[c.name].payAmt;
      schedule.weeks.forEach(wObj => {
        const items = md.weekly_items[wObj.name] || [];
        items.forEach(it => {
          const targetAcct = it.account_name || cfg.credit_accounts[0]?.name;
          const isCredit = it.account_type === 'credit' || (!it.desc || !it.desc.toLowerCase().includes('cash'));
          if (isCredit && targetAcct === c.name) {
            const amt = Number(it.amount) || 0;
            spent = it.is_income ? spent - amt : spent + amt;
          }
        });
      });
      closingCredit[c.name] = Math.max(0, spent);
    }
  });

  cfg.savings_accounts.forEach(acc => {
    const s = md.savings_data[acc] ? md.savings_data[acc] : { opening: 0 };
    const autoInflow = (savingsInflowFromSalary[acc] || 0) + (savingsInflowFromDD[acc] || 0);
    let directDebitOutflow = 0;
    (md.direct_debits || []).forEach(dd => {
      if (dd.account === acc) directDebitOutflow += Number(dd.amount) || 0;
    });
    let paymentsInInflow = 0;
    monthlyPaymentsInThisMonth.forEach(pi => {
      if (pi.account === acc) paymentsInInflow += Number(pi.amount) || 0;
    });
    let yearlyBillOutflow = 0;
    yearlyBillsThisMonth.forEach(yb => {
      if (yb.account === acc) yearlyBillOutflow += Number(yb.amount) || 0;
    });
    let yearlyIncomeInflow = 0;
    yearlyIncomeThisMonth.forEach(yi => {
      if (yi.account === acc) yearlyIncomeInflow += Number(yi.amount) || 0;
    });
    let recurringBillOutflow = 0;
    recurringBillsThisMonth.forEach(r => {
      if (r.account === acc) recurringBillOutflow += Number(r.amount) || 0;
    });
    let recurringIncomeInflow = 0;
    recurringIncomesThisMonth.forEach(r => {
      if (r.account === acc) recurringIncomeInflow += Number(r.amount) || 0;
    });
    let weeklySavingsNet = 0;
    schedule.weeks.forEach(wObj => {
      const items = md.weekly_items[wObj.name] || [];
      items.forEach(it => {
        if (it.account_type === 'savings' && it.account_name === acc) {
          const amt = Number(it.amount) || 0;
          weeklySavingsNet = it.is_income ? weeklySavingsNet + amt : weeklySavingsNet - amt;
        }
      });
    });

    let budgetOutflow = 0;
    budgetBillsThisMonth.forEach(b => {
      if (b.account === acc) budgetOutflow += Number(b.amount) || 0;
    });
    let birthdayOutflow = 0;
    birthdaysThisMonth.forEach(b => {
      if (b.account === acc) birthdayOutflow += Number(b.amount) || 0;
    });

    const plannedClosing = (Number(s.opening) || 0) + autoInflow + paymentsInInflow + yearlyIncomeInflow + recurringIncomeInflow - directDebitOutflow - yearlyBillOutflow - recurringBillOutflow - budgetOutflow - birthdayOutflow + weeklySavingsNet;
    const conf = (typeof getAccountConfig === 'function') ? getAccountConfig('savings', acc, year) : { savings_predict_mode: 'planned' };
    let actVal = lastActuals[`sav_${acc}`];
    let hasActual = (actVal !== "" && actVal !== null && actVal !== undefined);

    if (conf.savings_predict_mode === 'actual' && hasActual) {
      closingSavings[acc] = parseFloat(actVal) || 0;
    } else {
      // Default: Pure Planned cashflow rollover (excludes actual check-ins from future predictions)
      closingSavings[acc] = plannedClosing;
    }
  });

  return { current: closingCurrent, credit: closingCredit, savings: closingSavings };
}

function calculateAndSyncRollovers(year = appState.currentYear) {
  const cfg = getSettings();
  for (let i = 0; i < months.length - 1; i++) {
    const curMonthName = months[i];
    const nextMonthName = months[i + 1];
    const closing = computeMonthClosing(curMonthName, i, year);
    const nextMonthData = getMonthData(nextMonthName, year);

    cfg.current_accounts.forEach(acc => {
      if (!nextMonthData.current_data[acc]) nextMonthData.current_data[acc] = {};
      if (!nextMonthData.current_data[acc].user_edited) {
        nextMonthData.current_data[acc].opening = closing.current[acc] !== undefined ? closing.current[acc] : 0;
      }
    });

    cfg.credit_accounts.forEach(c => {
      if (!nextMonthData.credit_data[c.name]) nextMonthData.credit_data[c.name] = {};
      if (!nextMonthData.credit_data[c.name].user_edited) {
        nextMonthData.credit_data[c.name].opening_spent = closing.credit[c.name] !== undefined ? closing.credit[c.name] : 0;
      }
    });

    cfg.savings_accounts.forEach(acc => {
      if (!nextMonthData.savings_data[acc]) nextMonthData.savings_data[acc] = {};
      if (!nextMonthData.savings_data[acc].user_edited) {
        nextMonthData.savings_data[acc].opening = closing.savings[acc] !== undefined ? closing.savings[acc] : 0;
      }
    });
  }

  // December -> Next Year January Rollover (if next year exists)
  const nextYearNum = parseInt(year, 10) + 1;
  const nextYearStr = String(nextYearNum);
  if (appState.data && appState.data.years && appState.data.years[nextYearStr]) {
    const decClosing = computeMonthClosing('Dec', 11, year);
    const janNextData = getMonthData('Jan', nextYearNum);

    cfg.current_accounts.forEach(acc => {
      if (!janNextData.current_data[acc]) janNextData.current_data[acc] = {};
      if (!janNextData.current_data[acc].user_edited) {
        janNextData.current_data[acc].opening = decClosing.current[acc] !== undefined ? decClosing.current[acc] : 0;
      }
    });

    cfg.credit_accounts.forEach(c => {
      if (!janNextData.credit_data[c.name]) janNextData.credit_data[c.name] = {};
      if (!janNextData.credit_data[c.name].user_edited) {
        janNextData.credit_data[c.name].opening_spent = decClosing.credit[c.name] !== undefined ? decClosing.credit[c.name] : 0;
      }
    });

    cfg.savings_accounts.forEach(acc => {
      if (!janNextData.savings_data[acc]) janNextData.savings_data[acc] = {};
      if (!janNextData.savings_data[acc].user_edited) {
        janNextData.savings_data[acc].opening = decClosing.savings[acc] !== undefined ? decClosing.savings[acc] : 0;
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.calculateMonthSchedule = calculateMonthSchedule;
  window.getDDsForWeek = getDDsForWeek;
  window.getIncomesForWeek = getIncomesForWeek;
  window.calculateAndSyncRollovers = calculateAndSyncRollovers;
  window.getAdjustedWorkingDay = getAdjustedWorkingDay;
  window.getNextWorkingDay = getNextWorkingDay;
  window.getPreviousWorkingDay = getPreviousWorkingDay;
  window.getBankHolidays = getBankHolidays;
  window.getEaster = getEaster;
  window.getYearlyBudgetItemsForMonth = getYearlyBudgetItemsForMonth;
  window.getBirthdayItemsForMonth = getBirthdayItemsForMonth;
  window.getBirthdaysForWeek = getBirthdaysForWeek;
  window.getBirthdayOccasionsForWeek = getBirthdayOccasionsForWeek;
  window.getRecurringForWeek = getRecurringForWeek;
}


function getYearlyBudgetItemsForMonth(mName, mIdx, year = appState.currentYear) {
  const yData = getYearData(year);
  const budgets = yData.yearly_budgets || [];
  const schedule = calculateMonthSchedule(year, mIdx);
  const items = [];
  const startMs = new Date(schedule.startDate.getFullYear(), schedule.startDate.getMonth(), schedule.startDate.getDate(), 0, 0, 0).getTime();
  const endMs = new Date(schedule.endDate.getFullYear(), schedule.endDate.getMonth(), schedule.endDate.getDate(), 23, 59, 59).getTime();

  budgets.forEach((b, bIdx) => {
    const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.total_budget) || 0) - spent);
    const strategy = b.deduction_strategy || 'none';

    // 1. Dated transactions strictly falling in this month's payday date range
    (b.transactions || []).forEach((t, tIdx) => {
      if (t.date) {
        const tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
        const tMs = tDate.getTime();
        if (tMs >= startMs && tMs <= endMs) {
          const occDateStr = t.date || '';
          items.push({
            desc: `🎯 ${b.name}${t.desc ? ': ' + t.desc : ''}`,
            rawDesc: `🎯 ${b.name}${t.desc ? ': ' + t.desc : ''}`,
            due_day: tDate.getDate(),
            exact_date: t.date,
            actualPaymentDate: t.date,
            amount: Number(t.amount) || 0,
            account: t.account || b.account,
            is_budget_item: true,
            status: t.status || (t.auto_cleared ? 'paid' : 'due'),
            auto_cleared: Boolean(t.auto_cleared),
            manually_cleared: Boolean(t.manually_cleared),
            cleared_dates: t.cleared_dates || (t.auto_cleared && occDateStr ? [occDateStr] : []),
            matched_txn_id: t.matched_txn_id,
            matched_date: t.matched_date,
            matched_payee: t.matched_payee,
            source_type: 'budget_bill',
            budget_idx: bIdx,
            txn_idx: tIdx,
            raw_target: t
          });
        }
      }
    });

    // 2. Planned remaining deductions
    if (strategy === 'monthly_spread' && remaining > 0) {
      const endMIdx = b.end_date ? new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T12:00:00').getMonth() : 11;
      if (mIdx <= endMIdx) {
        const numMonths = Math.max(1, endMIdx + 1);
        const spreadAmt = remaining / numMonths;
        const exactDate = `${schedule.startDate.getFullYear()}-${String(schedule.startDate.getMonth() + 1).padStart(2, '0')}-${String(schedule.startDate.getDate()).padStart(2, '0')}`;
        items.push({
          desc: `🎯 ${b.name} (Monthly Spread)`,
          rawDesc: `🎯 ${b.name} (Monthly Spread)`,
          due_day: schedule.startDate.getDate(),
          exact_date: exactDate,
          actualPaymentDate: exactDate,
          amount: spreadAmt,
          account: b.account,
          is_budget_item: true,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'budget_bill',
          budget_idx: bIdx,
          raw_target: b
        });
      }
    } else if (strategy === 'target_date' && remaining > 0 && b.end_date) {
      const endDateObj = new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T12:00:00');
      const endMsTime = endDateObj.getTime();
      if (endMsTime >= startMs && endMsTime <= endMs) {
        items.push({
          desc: `🎯 ${b.name} (Target Date Balance)`,
          rawDesc: `🎯 ${b.name} (Target Date Balance)`,
          due_day: endDateObj.getDate(),
          exact_date: b.end_date,
          actualPaymentDate: b.end_date,
          amount: remaining,
          account: b.account,
          is_budget_item: true,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'budget_bill',
          budget_idx: bIdx,
          raw_target: b
        });
      }
    }
  });

  return items;
}


function detectCurrentMonthAndWeek(year = appState.currentYear) {
  const now = new Date();
  const nowMs = now.getTime();
  const cfg = getSettings();
  const pDay = cfg.payday_day || 26;
  const country = cfg.bank_holiday_country || 'uk_ew';

  for (let m = 0; m < 12; m++) {
    const sched = calculateMonthSchedule(year, m, pDay, country);
    const sTime = new Date(sched.startDate.getFullYear(), sched.startDate.getMonth(), sched.startDate.getDate(), 0, 0, 0).getTime();
    const eTime = new Date(sched.endDate.getFullYear(), sched.endDate.getMonth(), sched.endDate.getDate(), 23, 59, 59).getTime();

    if (nowMs >= sTime && nowMs <= eTime) {
      let matchedWeek = sched.weeks[0]?.name || 'Week 1';
      for (let w of sched.weeks) {
        const ws = new Date(w.startDate.getFullYear(), w.startDate.getMonth(), w.startDate.getDate(), 0, 0, 0).getTime();
        const we = new Date(w.endDate.getFullYear(), w.endDate.getMonth(), w.endDate.getDate(), 23, 59, 59).getTime();
        if (nowMs >= ws && nowMs <= we) {
          matchedWeek = w.name;
          break;
        }
      }
      return { month: months[m], monthIdx: m, week: matchedWeek, schedule: sched };
    }
  }

  const curMonthIdx = now.getMonth();
  const sched = calculateMonthSchedule(year, curMonthIdx, pDay, country);
  return { month: months[curMonthIdx], monthIdx: curMonthIdx, week: 'Week 1', schedule: sched };
}


function getBirthdayItemsForMonth(mName, mIdx, year = appState.currentYear) {
  const yData = getYearData(year);
  const birthdays = yData.birthdays || getSettings().birthdays || [];
  const schedule = calculateMonthSchedule(year, mIdx);
  const cfg = getSettings();
  const items = [];
  const startMs = new Date(schedule.startDate.getFullYear(), schedule.startDate.getMonth(), schedule.startDate.getDate(), 0, 0, 0).getTime();
  const endMs = new Date(schedule.endDate.getFullYear(), schedule.endDate.getMonth(), schedule.endDate.getDate(), 23, 59, 59).getTime();

  birthdays.forEach((b, bIdx) => {
    let bMIdx = months.indexOf(b.month);
    if (bMIdx === -1) bMIdx = months.findIndex(m => m.toLowerCase().startsWith(String(b.month || '').toLowerCase().substring(0, 3)));
    if (bMIdx === -1) bMIdx = 0;
    const bDate = new Date(year, bMIdx, parseInt(b.day || 1, 10));
    const bMs = bDate.getTime();

    const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.budget_amount) || 0) - spent);

    // 1. Dated transactions strictly falling in this month's payday date range
    (b.transactions || []).forEach((t, tIdx) => {
      let tDate;
      if (t.date) {
        tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
      } else {
        tDate = bDate;
      }
      const tMs = tDate.getTime();
      if (tMs >= startMs && tMs <= endMs) {
        const occDateStr = t.date || '';
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          rawDesc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          actualPaymentDate: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
          status: t.status || (t.auto_cleared ? 'paid' : 'due'),
          auto_cleared: Boolean(t.auto_cleared),
          manually_cleared: Boolean(t.manually_cleared),
          cleared_dates: t.cleared_dates || (t.auto_cleared && occDateStr ? [occDateStr] : []),
          matched_txn_id: t.matched_txn_id,
          matched_date: t.matched_date,
          matched_payee: t.matched_payee,
          source_type: 'birthday',
          raw_target: t,
          actualDateStr: `${tDate.getDate()} ${months[tDate.getMonth()]}`
        });
      }
    });

    // 2. Planned remaining budget allocation if birthday falls in this month's payday date range
    if (bMs >= startMs && bMs <= endMs) {
      if (remaining > 0) {
        items.push({
          desc: `🎂 ${b.name}`,
          rawDesc: `🎂 ${b.name}`,
          due_day: bDate.getDate(),
          exact_date: `${year}-${String(bMIdx + 1).padStart(2, '0')}-${String(b.day || 1).padStart(2, '0')}`,
          actualPaymentDate: `${year}-${String(bMIdx + 1).padStart(2, '0')}-${String(b.day || 1).padStart(2, '0')}`,
          amount: remaining,
          account: b.account || cfg.current_accounts[0],
          isBirthday: true,
          is_budget_item: true,
          budgetTotal: Number(b.budget_amount) || 0,
          spentTotal: spent,
          remaining: remaining,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'birthday',
          raw_target: b,
          actualDateStr: `${bDate.getDate()} ${months[bMIdx]}`
        });
      }
    }
  });

  return items;
}

function getBirthdaysForWeek(birthdays, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const cfg = getSettings();
  const items = [];

  (birthdays || []).forEach((b, bIdx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) {
      mIdx = months.findIndex(m => m.toLowerCase().startsWith(String(b.month).toLowerCase().substring(0, 3)));
    }
    if (mIdx === -1) mIdx = 0;
    const day = parseInt(b.day || 1, 10);
    const targetDate = new Date(year, mIdx, day);
    const bTime = targetDate.getTime();

    const spent = (b.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.budget_amount) || 0) - spent);

    // 1. Dated transactions strictly falling in this week's date range
    (b.transactions || []).forEach((t, tIdx) => {
      let tDate;
      if (t.date) {
        tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
      } else {
        tDate = targetDate;
      }
      const tMs = tDate.getTime();
      if (tMs >= wStartTime && tMs <= wEndTime) {
        const occDateStr = t.date || '';
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          rawDesc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          actualPaymentDate: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
          status: t.status || (t.auto_cleared ? 'paid' : 'due'),
          auto_cleared: Boolean(t.auto_cleared),
          manually_cleared: Boolean(t.manually_cleared),
          cleared_dates: t.cleared_dates || (t.auto_cleared && occDateStr ? [occDateStr] : []),
          matched_txn_id: t.matched_txn_id,
          matched_date: t.matched_date,
          matched_payee: t.matched_payee,
          source_type: 'birthday',
          raw_target: t,
          actualDateStr: `${tDate.getDate()} ${months[tDate.getMonth()]}`
        });
      }
    });

    // 2. Planned remaining budget allocation on the birthday's date
    if (bTime >= wStartTime && bTime <= wEndTime) {
      if (remaining > 0) {
        items.push({
          ...b,
          originalIdx: bIdx,
          isBirthday: true,
          is_budget_item: true,
          desc: `🎂 ${b.name}`,
          rawDesc: `🎂 ${b.name}`,
          due_day: day,
          exact_date: `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          actualPaymentDate: `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          account: b.account || cfg.current_accounts[0],
          amount: remaining,
          budgetTotal: Number(b.budget_amount) || 0,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'birthday',
          raw_target: b,
          spentTotal: spent,
          remaining: remaining,
          actualDateStr: `${day} ${months[mIdx]}`
        });
      }
    }
  });

  return items;
}

function getBirthdayOccasionsForWeek(birthdays, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const cfg = getSettings();
  const occasions = [];

  (birthdays || []).forEach((b, bIdx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) {
      mIdx = months.findIndex(m => m.toLowerCase().startsWith(String(b.month).toLowerCase().substring(0, 3)));
    }
    if (mIdx === -1) mIdx = 0;
    const day = parseInt(b.day || 1, 10);
    const targetDate = new Date(year, mIdx, day);
    const bTime = targetDate.getTime();

    if (bTime >= wStartTime && bTime <= wEndTime) {
      const spent = (b.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const remaining = (Number(b.budget_amount) || 0) - spent;
      occasions.push({
        ...b,
        originalIdx: bIdx,
        isBirthday: true,
        due_day: day,
        account: b.account || cfg.current_accounts[0],
        amount: Math.max(0, remaining),
        budgetTotal: Number(b.budget_amount) || 0,
        spentTotal: spent,
        remaining: remaining,
        actualDateStr: `${day} ${months[mIdx]}`
      });
    }
  });

  return occasions;
}

function getRecurringForWeek(recurringItems, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();

  const occurrences = [];

  (recurringItems || []).forEach((r, rIdx) => {
    const amount = Number(r.amount) || 0;
    if (amount <= 0) return;
    const startDate = r.start_date ? new Date(r.start_date.includes('T') ? r.start_date : r.start_date + 'T00:00:00') : new Date(year, 0, 1);
    const endDate = r.end_date ? new Date(r.end_date.includes('T') ? r.end_date : r.end_date + 'T23:59:59') : null;

    if (wStartTime < startDate.getTime() && wEndTime < startDate.getTime()) return;
    if (endDate && wStartTime > endDate.getTime()) return;

    const freq = r.frequency || 'monthly';
    const intervalN = Math.max(1, parseInt(r.interval_n || 1, 10));
    const isIncome = !!r.is_income;
    const holidayRule = r.holiday_rule || (isIncome ? 'previous' : 'following');

    if (freq === 'weekly' || freq === 'biweekly' || freq === 'custom_weeks' || freq === 'four_weekly') {
      const stepWeeks = freq === 'weekly' ? 1 : (freq === 'biweekly' ? 2 : (freq === 'four_weekly' ? 4 : intervalN));
      const diffMs = weekObj.startDate.getTime() - startDate.getTime();
      const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
      
      if (diffWeeks >= 0 && diffWeeks % stepWeeks === 0) {
        const occDate = weekObj.startDate;
        const occIso = occDate.toISOString().slice(0, 10);
        const isOccCleared = Boolean(r.cleared_dates && r.cleared_dates.includes(occIso));
        occurrences.push({
          ...r,
          isRecurring: true,
          isMovable: true,
          is_income: isIncome,
          source_type: r.source_type || (isIncome ? 'recurring_income' : 'recurring_payment'),
          source_idx: rIdx,
          rawDesc: r.desc,
          desc: isIncome ? `📥 ${r.desc}` : `🔄 ${r.desc}`,
          amount,
          account: r.account,
          holiday_rule: holidayRule,
          actualPaymentDate: occDate,
          actualDateStr: `${occDate.getDate()} ${months[occDate.getMonth()]}`,
          occurrenceDate: occDate,
          status: isOccCleared ? 'paid' : 'due',
          auto_cleared: isOccCleared,
          manually_cleared: Boolean(r.manually_cleared)
        });
      }
    } else if (freq === 'monthly' || freq === 'quarterly' || freq === 'custom_months') {
      const stepMonths = freq === 'monthly' ? 1 : (freq === 'quarterly' ? 3 : intervalN);
      const dueDay = parseInt(r.day_of_month || startDate.getDate() || 1, 10);
      
      // Test month of week start and week end
      const testMonths = [weekObj.startDate.getMonth(), weekObj.endDate.getMonth()];
      const uniqueMonths = [...new Set(testMonths)];

      uniqueMonths.forEach(m => {
        const testDate = new Date(year, m, dueDay);
        const actualPayDate = getAdjustedWorkingDay(testDate, holidayRule);
        const payTime = actualPayDate.getTime();

        if (payTime >= wStartTime && payTime <= wEndTime) {
          const diffMonths = (year - startDate.getFullYear()) * 12 + (m - startDate.getMonth());
          if (diffMonths >= 0 && diffMonths % stepMonths === 0) {
            const occIso = actualPayDate.toISOString().slice(0, 10);
            const isOccCleared = Boolean(r.cleared_dates && r.cleared_dates.includes(occIso));
            occurrences.push({
              ...r,
              isRecurring: true,
              isMovable: true,
              is_income: isIncome,
              source_type: r.source_type || (isIncome ? 'recurring_income' : 'recurring_payment'),
              source_idx: rIdx,
              rawDesc: r.desc,
              desc: isIncome ? `📥 ${r.desc}` : `🔄 ${r.desc}`,
              amount,
              account: r.account,
              holiday_rule: holidayRule,
              actualPaymentDate: actualPayDate,
              actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
              occurrenceDate: actualPayDate,
              status: isOccCleared ? 'paid' : 'due',
              auto_cleared: isOccCleared,
              manually_cleared: Boolean(r.manually_cleared)
            });
          }
        }
      });
    } else if (freq === 'yearly') {
      const dueMonth = r.month ? months.indexOf(r.month) : startDate.getMonth();
      const dueDay = parseInt(r.day_of_month || startDate.getDate() || 1, 10);
      const testDate = new Date(year, dueMonth, dueDay);
      const actualPayDate = getAdjustedWorkingDay(testDate, holidayRule);
      const payTime = actualPayDate.getTime();

      if (payTime >= wStartTime && payTime <= wEndTime) {
        const occIso = actualPayDate.toISOString().slice(0, 10);
        const isOccCleared = Boolean(r.status === 'paid' || r.auto_cleared || (r.cleared_dates && r.cleared_dates.includes(occIso)));
        occurrences.push({
          ...r,
          isRecurring: true,
          isMovable: true,
          is_income: isIncome,
          source_type: r.source_type || (isIncome ? 'yearly_income' : 'recurring_payment'),
          source_idx: rIdx,
          rawDesc: r.desc,
          desc: isIncome ? `📥 ${r.desc}` : `🔄 ${r.desc}`,
          amount,
          account: r.account,
          holiday_rule: holidayRule,
          actualPaymentDate: actualPayDate,
          actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
          occurrenceDate: actualPayDate,
          status: isOccCleared ? 'paid' : 'due',
          auto_cleared: isOccCleared,
          manually_cleared: Boolean(r.manually_cleared)
        });
      }
    }
  });

  return occurrences;
}

function reconcileTransactionsWithScheduledBills(data) {
  if (!data || !data.open_banking_transactions || !Array.isArray(data.open_banking_transactions)) return 0;
  const txns = data.open_banking_transactions;
  if (txns.length === 0) return 0;

  const cfg = data.settings || {};
  const pdayDay = parseInt(cfg.payday_day || 26, 10);
  const payFreq = cfg.pay_frequency || "monthly";
  const stopWords = new Set(["direct", "debit", "dd", "payment", "pymt", "transfer", "standing", "order", "so", "faster", "fps", "card", "purchase", "pos", "the", "ltd", "limited", "uk", "plc", "co", "bill", "auth", "recurring"]);

  function tokenize(str) {
    if (!str) return new Set();
    const clean = str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    return new Set(clean.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w)));
  }

  const RETAIL_STOP_MERCHANTS = new Set([
    "schuh", "zara", "primark", "h&m", "hm", "next", "boots", "superdrug", "clarks", "jd sports", "sports direct",
    "greggs", "costa", "starbucks", "mcdonald", "kfc", "subway", "burger king", "nandos", "pret", "caffe nero",
    "tesco", "sainsbury", "asda", "morrison", "aldi", "lidl", "co-op", "coop", "waitrose", "iceland", "marks & spencer", "m&s",
    "b&m", "home bargains", "wilko", "poundland", "savers", "tk maxx", "argos", "currys", "ikea", "b&q", "wickes", "screwfix", "toolstation",
    "pub", "inn", "bar", "tavern", "arms", "restaurant", "bistro", "bakery", "cafe", "coffee", "cinema", "vue", "odeon", "cineworld",
    "deliveroo", "just eat", "uber eats", "amazon", "ebay", "etsy", "shein", "temu"
  ]);

  const BILL_DOMAIN_ALIASES = {
    "council": ["council", "district", "borough", "lincolnshire", "yorkshire", "lancashire", "cheshire", "derbyshire", "nottinghamshire", "staffordshire", "warwickshire", "leicestershire", "northamptonshire", "gloucestershire", "somerset", "devon", "cornwall", "dorset", "wiltshire", "hampshire", "surrey", "sussex", "kent", "essex", "hertfordshire", "bedfordshire", "buckinghamshire", "oxfordshire", "berkshire", "norfolk", "suffolk", "cambridgeshire", "city of", "metropolitan", "unitary", "local authority", "civic", "ctax", "c tax"],
    "tax": ["council", "district", "borough", "lincolnshire", "yorkshire", "hmrc", "revenue", "customs", "dvla"],
    "tv": ["tv licensing", "tv licence", "tvl", "bbc", "television licence", "tvlicense"],
    "licence": ["tv licensing", "tv licence", "tvl", "bbc", "dvla"],
    "energy": ["british gas", "bg energy", "scottish power", "e.on", "eon", "octopus", "ovo", "edf", "bulb", "utilita", "shell energy", "sse", "so energy"],
    "gas": ["british gas", "bg energy", "scottish power", "e.on", "eon", "octopus", "ovo", "edf", "bulb", "utilita"],
    "water": ["water", "severn trent", "thames water", "anglian water", "united utilities", "yorkshire water", "southern water", "wessex water", "south west water", "northumbrian water", "welsh water", "hafra drenau"],
    "broadband": ["bt", "bt group", "virgin media", "virginmedia", "sky", "talktalk", "plusnet", "vodafone", "hyperoptic", "community fibre", "ee"],
    "phone": ["ee", "o2", "three", "vodafone", "giffgaff", "tesco mobile", "sky mobile", "id mobile", "smarty", "voxi", "lebara", "lyca"],
    "internet": ["bt", "virgin media", "virginmedia", "sky", "talktalk", "plusnet", "vodafone", "hyperoptic", "ee"],
    "mortgage": ["nationwide", "santander", "halifax", "barclays", "hsbc", "lloyds", "natwest", "tsb", "yorkshire building", "coventry building", "skipton"],
    "rent": ["property", "estate", "lettings", "landlord", "housing", "residential", "homes", "tenancy"],
    "insurance": ["admiral", "aviva", "direct line", "hastings", "churchill", "lv=", "liverpool victoria", "axa", "more than", "sheilas wheels", "esure", "privilege", "aig", "vitality", "bupa", "axa ppp"],
    "breakdown": ["rac", "the aa", "aa breakdown", "green flag", "autoaid"]
  };

  function isValidBillMatch(bName, bAmt, bDueDay, tPayee, tAmt, tDay, isSameMonth) {
    if (Math.abs(tAmt - bAmt) > 0.05) return false;

    const pClean = tPayee.toLowerCase();
    const bClean = bName.toLowerCase();
    
    let isRetail = false;
    RETAIL_STOP_MERCHANTS.forEach(m => {
      if (pClean.includes(m)) isRetail = true;
    });

    const tTokens = tokenize(tPayee);
    const bTokens = tokenize(bName);
    let nameOverlap = false;
    bTokens.forEach(tok => { if (tTokens.has(tok)) nameOverlap = true; });

    const bAlnum = bClean.replace(/[^a-z0-9]/g, '');
    const pAlnum = pClean.replace(/[^a-z0-9]/g, '');
    const substringMatch = Boolean(bAlnum && (bAlnum.includes(pAlnum) || pAlnum.includes(bAlnum)));
    let partialTokenMatch = false;
    bTokens.forEach(tok => {
      if (tok.length >= 3 && (pAlnum.includes(tok) || pClean.includes(tok))) {
        partialTokenMatch = true;
      }
    });

    if (nameOverlap || substringMatch || partialTokenMatch) return true;

    let aliasMatch = false;
    bTokens.forEach(tok => {
      if (BILL_DOMAIN_ALIASES[tok]) {
        const aliasList = BILL_DOMAIN_ALIASES[tok];
        aliasList.forEach(alias => {
          if (pClean.includes(alias)) aliasMatch = true;
        });
      }
    });
    if (aliasMatch) return true;

    // Retail shopping without explicit name overlap must never match bills
    if (isRetail) return false;

    // Strict non-name fallback for non-round/distinct amounts aligned with expected due date
    const isRoundSmall = (tAmt <= 50.0 && (tAmt % 5 === 0 || (tAmt % 1 === 0 && tAmt <= 25.0)));
    if (!isRoundSmall && isSameMonth) {
      const dayDiff = Math.abs(tDay - (bDueDay || 1));
      if (dayDiff <= 4 || dayDiff >= 27) return true;
    }

    return false;
  }

  const matchedBillKeys = new Set();
  let matchCount = 0;
  const sortedTxns = [...txns].sort((a, b) => (a.booking_date || '').localeCompare(b.booking_date || ''));

  sortedTxns.forEach(t => {
    const rawAmt = Number(t.amount || 0);
    const tAmt = Math.abs(rawAmt);
    if (tAmt < 0.01) return;
    const tIsIncome = (rawAmt > 0);

    const tPayee = `${t.payee_name || ''} ${t.raw_info || ''} ${t.merchant_name || ''}`.trim();
    const tDateStr = t.booking_date || '';

    let targetMName = null;
    let targetYearStr = String(new Date().getFullYear());
    let tDay = 15;

    if (tDateStr) {
      try {
        const dt = new Date(tDateStr.includes('T') ? tDateStr : tDateStr + 'T12:00:00');
        targetYearStr = String(dt.getFullYear());
        tDay = dt.getDate();
        if (payFreq === "monthly" && pdayDay >= 20 && tDay >= (pdayDay - 4)) {
          let budgetMIdx = dt.getMonth() + 1;
          if (budgetMIdx > 11) {
            budgetMIdx = 0;
            targetYearStr = String(dt.getFullYear() + 1);
          }
          targetMName = months[budgetMIdx];
        } else {
          targetMName = months[dt.getMonth()];
        }
      } catch (e) {}
    }

    const yearData = (data.years && data.years[targetYearStr]) || (data.years && data.years[String(new Date().getFullYear())]) || {};
    const monthsMap = yearData.months || {};

    const searchMonths = [];
    if (targetMName && monthsMap[targetMName]) {
      searchMonths.push(targetMName);
      const mIdx = months.indexOf(targetMName);
      if (mIdx > 0 && monthsMap[months[mIdx - 1]]) searchMonths.push(months[mIdx - 1]);
      if (mIdx < 11 && monthsMap[months[mIdx + 1]]) searchMonths.push(months[mIdx + 1]);
    } else {
      searchMonths.push(...Object.keys(monthsMap));
    }

    let matchedThisTxn = false;

    for (const mName of searchMonths) {
      if (matchedThisTxn) break;
      const mData = monthsMap[mName] || {};

      const budgetItems = [];
      (yearData.yearly_budgets || []).forEach((bObj, bIdx) => {
        (bObj.transactions || []).forEach((bTxn, tIdx) => {
          budgetItems.push({
            id: bTxn.id || `budget_${bIdx}_${tIdx}`,
            desc: `🎯 ${bObj.name || ''}: ${bTxn.desc || ''}`.trim(),
            name: bTxn.desc || bObj.name,
            amount: bTxn.amount || 0,
            due_day: bTxn.date ? parseInt(bTxn.date.slice(8, 10), 10) : 1,
            raw_target: bTxn,
            status: bTxn.status || 'due',
            auto_cleared: Boolean(bTxn.auto_cleared),
            manually_cleared: Boolean(bTxn.manually_cleared),
            cleared_dates: bTxn.cleared_dates || []
          });
        });
      });

      const birthdayItems = [];
      (yearData.birthdays || cfg.birthdays || []).forEach((bObj, bIdx) => {
        (bObj.transactions || []).forEach((bTxn, tIdx) => {
          birthdayItems.push({
            id: bTxn.id || `bday_${bIdx}_${tIdx}`,
            desc: `🎁 ${bObj.name || ''}: ${bTxn.desc || ''}`.trim(),
            name: bTxn.desc || bObj.name,
            amount: bTxn.amount || 0,
            due_day: bTxn.date ? parseInt(bTxn.date.slice(8, 10), 10) : 1,
            raw_target: bTxn,
            status: bTxn.status || 'due',
            auto_cleared: Boolean(bTxn.auto_cleared),
            manually_cleared: Boolean(bTxn.manually_cleared),
            cleared_dates: bTxn.cleared_dates || []
          });
        });
      });

      const billCollections = [
        { type: 'direct_debit', isIncome: false, list: mData.direct_debits || [] },
        { type: 'payments_in', isIncome: true, list: mData.payments_in || [] },
        { type: 'scheduled_item', isIncome: false, list: mData.scheduled_items || [] },
        { type: 'yearly_recurring', isIncome: false, list: (yearData.yearly_recurring || []).filter(b => !b.month || b.month === mName) },
        { type: 'yearly_income', isIncome: true, list: (yearData.yearly_income || []).filter(b => !b.month || b.month === mName) },
        { type: 'recurring_payment', isIncome: false, list: yearData.recurring_payments || cfg.recurring_payments || [] },
        { type: 'recurring_income', isIncome: true, list: yearData.recurring_incomes || cfg.recurring_incomes || [] },
        { type: 'budget_bill', isIncome: false, list: budgetItems },
        { type: 'birthday', isIncome: false, list: birthdayItems }
      ];

      for (const coll of billCollections) {
        if (matchedThisTxn) break;
        if (tIsIncome !== coll.isIncome) continue;

        for (let idx = 0; idx < coll.list.length; idx++) {
          const b = coll.list[idx];
          const bId = b.id || `${targetYearStr}_${mName}_${coll.type}_${idx}`;
          if (matchedBillKeys.has(bId)) continue;
          if (b.manually_cleared) {
            matchedBillKeys.add(bId);
            continue;
          }

          const bAmt = Math.abs(Number(b.amount || 0));
          const bName = b.desc || b.name || '';
          const bDueDay = parseInt(b.due_day || b.day_of_month || 1, 10);
          const isSameMonth = (targetMName === mName);

          if (isValidBillMatch(bName, bAmt, bDueDay, tPayee, tAmt, tDay, isSameMonth)) {
            b.status = 'paid';
            b.auto_cleared = true;
            b.matched_txn_id = t.transaction_id;
            b.matched_date = tDateStr;
            b.matched_amount = tAmt;
            b.matched_payee = t.payee_name || t.merchant_name;
            if (tDateStr) {
              const occIso = tDateStr.slice(0, 10);
              b.cleared_dates = b.cleared_dates || [];
              if (!b.cleared_dates.includes(occIso)) b.cleared_dates.push(occIso);
            }

            if (b.raw_target) {
              b.raw_target.status = 'paid';
              b.raw_target.auto_cleared = true;
              b.raw_target.matched_txn_id = t.transaction_id;
              b.raw_target.matched_date = tDateStr;
              b.raw_target.matched_amount = tAmt;
              b.raw_target.matched_payee = t.payee_name || t.merchant_name;
              if (tDateStr) {
                const occIso = tDateStr.slice(0, 10);
                b.raw_target.cleared_dates = b.raw_target.cleared_dates || [];
                if (!b.raw_target.cleared_dates.includes(occIso)) b.raw_target.cleared_dates.push(occIso);
              }
            }

            t.matched_bill_id = bName;
            t.auto_cleared = true;
            matchedBillKeys.add(bId);
            matchedThisTxn = true;
            matchCount++;
            break;
          }
        }
      }
    }
  });

  return matchCount;
}

if (typeof window !== 'undefined') {
  window.reconcileTransactionsWithScheduledBills = reconcileTransactionsWithScheduledBills;
}

let SPEND_CATEGORIES = [
  {
    id: 'groceries',
    label: 'Supermarket & Groceries',
    icon: '🛒',
    color: '#10b981',
    keywords: [
      'tesco', 'sainsbury', 'asda', 'morrison', 'aldi', 'lidl', 'waitrose', 'marks & spencer', 'marks and spencer', 'marks spencer', 'marks&spencer', 'm&s food', 'm&s simply food', 'm&s', 'm & s',
      'co-op', 'coop', 'iceland foods', 'iceland', 'ocado', 'booths', 'whole foods', 'farmfoods', 'spar', 'nisa', 'londis', 'premier stores',
      'premier', 'costcutter', 'budgens', 'one stop', 'best-one', 'happy shopper', 'day-today', 'keystore', 'family shopper', 'roys',
      'hellofresh', 'gousto', 'abel & cole', 'riverford', 'mindful chef', 'musclefood', 'pasta evangelists', 'allplants', 'costco', 'makro',
      'booker', 'wing yip', 'h mart', 'oriental supermarket', 'asian supermarket', 'halal butcher', 'butcher', 'fishmonger', 'greengrocer',
      'farm shop', 'delicatessen', 'bakery', 'milk & more', 'modern milkman', 'heron foods', 'star bargains', 'approved food', 'majestic wine',
      'bargain booze', 'oddbins', 'laithwaites', 'virgin wines', 'the wine society', 'beer hawk', 'bottle club', 'distillers', 'off licence',
      'supermarket', 'grocery', 'grocer', 'provision'
    ]
  },
  {
    id: 'transport',
    label: 'Fuel, Travel & Vehicles',
    icon: '⛽',
    color: '#0284c7',
    keywords: [
      'tesco pay at pump', 'tesco pay at pum', 'tesco petrol', 'tesco fuel', 'tesco pfs', 'tesco forecourt', 'tesco service station',
      'sainsburys pay at pump', 'sainsbury\'s pay at pump', 'sainsburys petrol', 'sainsbury\'s petrol', 'sainsburys fuel', 'sainsbury\'s fuel', 'sainsburys pfs', 'sainsbury\'s pfs',
      'asda pay at pump', 'asda pay at pum', 'asda petrol', 'asda fuel', 'asda pfs', 'asda forecourt',
      'morrisons pay at pump', 'morrisons petrol', 'morrisons fuel', 'morrisons pfs',
      'pay at pump', 'pay at pum', 'pfs forecourt', 'pfs fuel', 'pfs', 'supermarket petrol', 'supermarket fuel',
      'shell', 'bp oil', 'bp pulse', 'bp connect', 'esso', 'texaco', 'applegreen', 'jet petrol', 'jet service', 'murco', 'gulf oil', 'total petrol',
      'pace fuel', 'harvest energy', 'moto hospitality', 'welcome break', 'roadchef', 'extra services', 'rontec', 'mfg', 'motor fuel', 'euro garages',
      'eg group', 'certas energy', 'petrol', 'fuel', 'diesel', 'oil', 'filling station', 'service station', 'forecourt', 'tesla supercharger', 'tesla',
      'gridserve', 'pod point', 'ionity', 'instavolt', 'osprey', 'shell recharge', 'geniepoint', 'fastned', 'esb energy', 'source london', 'evgo',
      'tfl', 'transport for london', 'tfl travel', 'tfl auto topup', 'oyster', 'trainline', 'national rail', 'lner', 'avanti west coast', 'avanti',
      'gwr', 'great western', 'crosscountry', 'thameslink', 'scotrail', 'transport for wales', 'tfw', 'southern railway', 'south western railway',
      'swr', 'chiltern railways', 'northern rail', 'merseyrail', 'transpennine express', 'c2c rail', 'greater anglia', 'east midlands railway',
      'emr', 'southeastern railway', 'grand central', 'hull trains', 'lumo', 'eurostar', 'railway', 'train', 'underground', 'metro', 'tram',
      'stagecoach', 'arriva', 'first bus', 'first group', 'national express', 'megabus', 'flixbus', 'go-ahead', 'transdev', 'lothian buses',
      'uber', 'uber trip', 'uber bv', 'bolt.eu', 'bolt', 'free now', 'gett', 'cabify', 'addison lee', 'taxi', 'minicab', 'radio cars', 'cab',
      'ringgo', 'paybyphone', 'justpark', 'ncp', 'q-park', 'apcoa', 'parkopedia', 'parkme', 'saba parking', 'euro car parks', 'horizon parking',
      'dart charge', 'merseyflow', 'm6 toll', 'clean air zone', 'caz', 'ulez', 'congestion charge', 'tyne tunnel', 'parking', 'toll',
      'dvla', 'mot', 'halfords autocentre', 'kwik fit', 'kwik-fit', 'national tyres', 'ats euromaster', 'f1 autocentres', 'formula one', 'protyre',
      'mr clutch', 'in n out autocentre', 'rac', 'aa breakdown', 'green flag', 'auto glass', 'autoglass', 'national windscreens', 'car wash',
      'imo car wash', 'waves car wash', 'euro car parts', 'gsf car parts', 'demon tweeks', 'tyres', 'garage', 'auto repair', 'mechanic',
      'zipcar', 'enterprise rent', 'enterprise rent-a-car', 'hertz', 'europcar', 'avis', 'sixt', 'budget rent', 'alamo', 'green motion', 'turo'
    ]
  },
  {
    id: 'dining',
    label: 'Dining, Cafes, Bars & Takeaways',
    icon: '☕',
    color: '#f59e0b',
    keywords: [
      'costa coffee', 'costa', 'starbucks', 'caffe nero', 'caffe', 'pret a manger', 'pret', 'leon', 'gail\'s bakery', 'gails', 'joe & the juice',
      'boston tea party', 'coffee#1', 'black sheep coffee', '200 degrees', 'watchhouse', 'grind', 'ole & steen', 'greggs', 'cooplands', 'wenzel\'s',
      'paul bakery', 'patisserie valerie', 'millie\'s cookies', 'krispy kreme', 'dunkin', 'tim hortons', 'coffee', 'cafe', 'tea room', 'bakery',
      'mcdonald\'s', 'mcdonalds', 'mcdonald', 'kfc', 'burger king', 'subway', 'nando\'s', 'nandos', 'five guys', 'taco bell', 'wendy\'s', 'popeyes',
      'wingstop', 'shake shack', 'jollibee', 'chopstix', 'wimpy', 'roosters piri piri', 'pepe\'s piri piri', 'german doner kebab', 'gdk', 'tortilla',
      'domino\'s pizza', 'dominos', 'papa john\'s', 'papa johns', 'pizza hut', 'pizza express', 'franco manca', 'pizza pilgrims', 'homeslice',
      'honest burgers', 'patty & bun', 'meatliquor', 'byron burger', 'gbk', 'gourmet burger', 'zizzi', 'ask italian', 'prezzo', 'bella italia',
      'carluccio\'s', 'piccolino', 'san carlo', 'wildwood', 'strada', 'cafe rouge', 'cote brasserie', 'cote', 'bill\'s', 'bills restaurant',
      'the ivy', 'wagamama', 'yo! sushi', 'yo sushi', 'itsu', 'wasabi', 'kokoro', 'pho', 'rosa\'s thai', 'banana tree', 'dishoom', 'mowgli',
      'wahaca', 'las iguanas', 'turtle bay', 'chiquito', 'barburrito', 'deliveroo', 'just eat', 'justeat', 'uber eats', 'ubereats', 'foodhub',
      'wetherspoon', 'j d wetherspoon', 'greene king', 'marston\'s', 'marstons', 'mitchells & butlers', 'stonegate', 'fullers', 'young\'s',
      'shepherd neame', 'samuel smith', 'brewdog', 'all bar one', 'slug & lettuce', 'beefeater', 'harvester', 'toby carvery', 'chef & brewer',
      'hungry horse', 'sizzling pubs', 'miller & carter', 'ember inns', 'vintage inns', 'revolution bars', 'revolucion de cuba', 'o\'neill\'s',
      'walkabout', 'pub', 'bar', 'tavern', 'inn', 'brewery', 'taproom', 'cocktail', 'lounge', 'bistro', 'restaurant', 'diner', 'grill',
      'eatery', 'takeaway', 'kebab', 'chippy', 'fish and chips', 'chinese takeaway', 'indian takeaway', 'pizzeria', 'curry house',
      'catering', 'caterer', 'caterers', 'cater', 'buffet', 'food truck', 'street food', 'canteen', 'sandwich shop', 'sandwich bar', 'steakhouse', 'carvery'
    ]
  },
  {
    id: 'shopping',
    label: 'Shopping, Retail, Tech & Home',
    icon: '🛍️',
    color: '#ec4899',
    keywords: [
      'amazon', 'amzn', 'amazon eu', 'amazon marketplace', 'ebay', 'argos', 'very.co.uk', 'very', 'littlewoods', 'etsy', 'temu',
      'aliexpress', 'wish.com', 'vinted', 'depop', 'tiktok shop', 'john lewis', 'marks & spencer', 'm&s', 'debenhams', 'house of fraser',
      'selfridges', 'harrods', 'harvey nichols', 'fenwick', 'liberty', 'oliver bonas', 'flying tiger', 'miniso',
      'b&q', 'screwfix', 'toolstation', 'wickes', 'homebase', 'travis perkins', 'selco', 'jewson', 'magnet', 'city plumbing', 'dobbies garden centre',
      'dobbies', 'notcutts', 'british garden centres', 'rhs', 'gardening', 'plants', 'hardware', 'diy',
      'ikea', 'dunelm', 'the range', 'b&m', 'bm retail', 'home bargains', 'wilko', 'poundland', 'savers', 'dfs', 'sofology', 'scs', 'oak furnitureland',
      'furniture village', 'wayfair', 'habitat', 'made.com', 'loaf', 'dreams', 'bensons for beds', 'tapi carpets', 'carpetright', 'procook',
      'lakeland', 'robert dyas', 'furniture', 'homeware',
      'primark', 'next retail', 'next', 'zara', 'h&m', 'tk maxx', 'tkmaxx', 'homesense', 'asos', 'boohoo', 'prettylittlething', 'shein', 'mango',
      'river island', 'new look', 'urban outfitters', 'uniqlo', 'matalan', 'fatface', 'white stuff', 'seasalt', 'joules', 'superdry', 'levi\'s',
      'hollister', 'abercrombie', 'allsaints', 'reiss', 'ted baker', 'cos', '& other stories', 'monki', 'weekday', 'clothing', 'fashion', 'apparel',
      'jd sports', 'sports direct', 'decathlon', 'mountain warehouse', 'go outdoors', 'blacks', 'millets', 'cotswold outdoor', 'foot locker',
      'schuh', 'clarks', 'deichmann', 'office shoes', 'kurt geiger', 'skechers', 'shoes', 'footwear', 'trainer',
      'currys', 'pc world', 'ao.com', 'appliances direct', 'richer sounds', 'apple store', 'apple.com', 'apple', 'samsung', 'dyson', 'shark ninja',
      'cex', 'game stores', 'sonos', 'bose', 'maplin', 'scan.co.uk', 'overclockers', 'box.co.uk', 'ebuyer', 'electronics',
      'pandora', 'ernest jones', 'h.samuel', 'beaverbrooks', 'goldsmiths', 'watches of switzerland', 'f.hinds', 'warren james', 'swarovski',
      'astrid & miyu', 'monica vinader', 'jewellery', 'watch',
      'waterstones', 'whsmith', 'w h smith', 'blackwell\'s', 'foyles', 'the works', 'card factory', 'clintons', 'paperchase', 'ryman', 'cass art',
      'hobbycraft', 'stationery', 'books',
      'pets at home', 'zooplus', 'pets corner', 'jollyes', 'vet', 'vets4pets', 'medivet', 'pdsa', 'rspca', 'animed direct', 'monster pet',
      'hotel chocolat', 'lindt', 'thorntons', 'interflora', 'bloom & wild', 'moonpig', 'funky pigeon', 'lush', 'the body shop', 'space nk',
      'sephora', 'boots', 'superdrug', 'cult beauty', 'lookfantastic', 'charlotte tilbury', 'mac cosmetics', 'jo malone', 'molton brown',
      'penhaligon\'s', 'cosmetics', 'perfume', 'beauty', 'gift'
    ]
  },
  {
    id: 'entertainment',
    label: 'Entertainment, Gaming, Leisure & Media',
    icon: '🎮',
    color: '#8b5cf6',
    keywords: [
      'amazon prime', 'apple.com/bill', 'itunes.com/bill', 'google play', 'google *play',
      'netflix', 'spotify', 'disney+', 'disney plus', 'disney', 'prime video', 'apple tv', 'youtube premium', 'youtube', 'now tv', 'paramount+',
      'discovery+', 'britbox', 'crunchyroll', 'mubi', 'dazn', 'streaming', 'stream', 'deezer', 'tidal', 'amazon music', 'apple music', 'audible',
      'pocket casts', 'soundcloud', 'bandcamp', 'patreon', 'playstation', 'psn', 'sony interactive', 'xbox', 'microsoft*xbox', 'nintendo eShop',
      'nintendo', 'steam', 'valve', 'epic games', 'blizzard', 'battle.net', 'riot games', 'ea games', 'electronic arts', 'ubisoft', 'rockstar games',
      'roblox', 'twitch', 'discord', 'gog.com', 'gaming', 'video game', 'arcade',
      'odeon cinemas', 'odeon', 'vue cinemas', 'vue', 'cineworld', 'showcase cinemas', 'everyman cinema', 'everyman', 'picturehouse', 'curzon',
      'cinema', 'theatre', 'atg tickets', 'london theatre', 'national theatre', 'royal opera house', 'ticketmaster', 'see tickets', 'eventbrite',
      'axs', 'skiddle', 'dice.fm', 'resident advisor', 'gigantic', 'concert', 'festival', 'gig',
      'alton towers', 'thorpe park', 'chessington', 'legoland', 'madame tussauds', 'london eye', 'sea life', 'warwick castle', 'merlin entertainments',
      'national trust', 'english heritage', 'historic royal palaces', 'kew gardens', 'eden project', 'london zoo', 'chester zoo', 'marwell zoo',
      'longleat', 'zoo', 'safari park', 'aquarium', 'museum', 'exhibition', 'gallery', 'hollywood bowl', 'tenpin', 'lane7', 'flight club',
      'boom battle bar', 'swingers', 'junkyard golf', 'topgolf', 'escape room', 'go ape', 'bowling', 'mini golf',
      'the guardian', 'the times', 'telegraph', 'financial times', 'economist', 'new york times', 'washington post', 'medium', 'substack', 'newspaper'
    ]
  },
  {
    id: 'bills',
    label: 'Bills, Utilities, Telecoms & Housing',
    icon: '🏡',
    color: '#6366f1',
    keywords: [
      'british gas', 'octopus energy', 'octopus', 'ovo energy', 'ovo', 'e.on next', 'eon next', 'e.on', 'eon', 'edf energy', 'edf', 'scottish power',
      'shell energy', 'utilita', 'so energy', 'good energy', 'outfox the market', 'bulb energy', 'co-op energy', 'energy', 'gas bill', 'electric bill',
      'thames water', 'severn trent water', 'severn trent', 'anglian water', 'united utilities', 'yorkshire water', 'southern water', 'south west water',
      'northumbrian water', 'welsh water', 'dwr cymru', 'wessex water', 'affinity water', 'bristol water', 'south east water', 'ses water', 'water bill',
      'bt group', 'bt bill', 'bt broadband', 'ee limited', 'ee', 'o2 uk', 'o2', 'telefonica', 'vodafone', 'three uk', 'three', '3 uk', 'virgin media',
      'sky digital', 'sky uk', 'sky', 'talktalk', 'plusnet', 'now broadband', 'hyperoptic', 'community fibre', 'gigaclear', 'zen internet', 'kcom',
      'giffgaff', 'smarty', 'voxi', 'lebara', 'lycamobile', 'id mobile', 'tesco mobile', 'asda mobile', 'sainsburys energy', 'sainsbury\'s energy',
      'tesco insurance', 'sainsburys insurance', 'sainsbury\'s insurance', 'broadband', 'telecom', 'mobile phone',
      'council tax', 'city council', 'borough council', 'district council', 'county council', 'hmrc', 'self assessment', 'tv licensing', 'tv licence',
      'aviva', 'direct line', 'admiral insurance', 'admiral', 'hastings direct', 'hastings', 'churchill insurance', 'churchill', 'privilege insurance',
      'more than', 'legal & general', 'lv=', 'liverpool victoria', 'axa insurance', 'axa', 'allianz', 'zurich insurance', 'royal london', 'sunlife',
      'vitality life', 'vitality health', 'bupa insurance', 'petplan', 'bought by many', 'manypets', 'policy expert', 'insurance', 'premium',
      'nationwide mortgage', 'santander mortgage', 'halifax mortgage', 'barclays mortgage', 'hsbc mortgage', 'natwest mortgage', 'lloyds mortgage',
      'yorkshire building society', 'coventry building society', 'skipton building society', 'leeds building society', 'virgin money mortgage',
      'rent payment', 'mortgage payment', 'estate agent', 'letting agent', 'ground rent', 'service charge', 'landlord', 'mortgage', 'rent'
    ]
  },
  {
    id: 'health',
    label: 'Health, Fitness, Medical & Beauty',
    icon: '🏥',
    color: '#14b8a6',
    keywords: [
      'puregym', 'the gym group', 'the gym', 'david lloyd', 'nuffield health', 'nuffield', 'virgin active', 'anytime fitness', 'fitness first',
      'gymbox', 'better gym', 'bannatyne', 'everlast gyms', 'jd gyms', 'snap fitness', 'f45', 'crossfit', 'classpass', 'leisure centre', 'swimming pool',
      'gym', 'fitness', 'workout', 'pilates', 'yoga',
      'boots pharmacy', 'lloydspharmacy', 'well pharmacy', 'rowlands pharmacy', 'superdrug pharmacy', 'pharmacy2u', 'chemist4u', 'nhs prescription',
      'pharmacy', 'chemist', 'prescription', 'spex4less', 'specsavers', 'vision express', 'boots opticians', 'scrivens', 'optical express',
      'optician', 'eyecare', 'glasses', 'contact lenses',
      'nhs dental', 'bupa dental', 'mydentist', 'dental surgery', 'dental practice', 'dentist', 'dental', 'orthodontist',
      'doctor', 'gp surgery', 'hospital', 'private clinic', 'physiotherapy', 'physio', 'chiropractor', 'osteopath', 'podiatry', 'acupuncture',
      'psychotherapy', 'counselling', 'betterhelp', 'mind', 'health clinic', 'blood test', 'mri scan', 'medical', 'clinic',
      'barber', 'hairdressing', 'hair salon', 'toni & guy', 'rush hair', 'supercuts', 'beauty salon', 'nail bar', 'nail salon', 'waxing',
      'tanning', 'sunbed', 'spa day', 'massage', 'aesthetic clinic', 'tattoo studio', 'tattoo', 'piercing', 'hair', 'salon'
    ]
  },
  {
    id: 'travel',
    label: 'Travel, Airlines, Hotels & Holidays',
    icon: '✈️',
    color: '#06b6d4',
    keywords: [
      'ryanair', 'easyjet', 'british airways', 'ba.com', 'jet2', 'tui', 'virgin atlantic', 'wizz air', 'emirates', 'qatar airways', 'klm',
      'air france', 'lufthansa', 'aer lingus', 'vueling', 'norwegian air', 'turkish airlines', 'singapore airlines', 'etihad', 'iberia', 'sas',
      'airline', 'flight', 'airport', 'airways', 'duty free',
      'booking.com', 'airbnb', 'hotels.com', 'expedia', 'tripadvisor', 'agoda', 'trivago', 'kayak', 'skyscanner', 'lastminute.com', 'on the beach',
      'loveholidays', 'trailfinders', 'hays travel', 'kuoni', 'travel agent', 'holiday',
      'premier inn', 'travelodge', 'holiday inn', 'crowne plaza', 'marriott', 'hilton', 'doubletree', 'ibis', 'novotel', 'mercure', 'accor hotels',
      'best western', 'radisson', 'jurys inn', 'leonardo hotels', 'malmaison', 'hotel du vin', 'britannia hotels', 'center parcs', 'butlin\'s',
      'haven holidays', 'parkdean resorts', 'forest holidays', 'youth hostel', 'yha', 'hostelworld', 'hotel', 'motel', 'resort', 'hostel',
      'p&o ferries', 'dfds seaways', 'dfds', 'stena line', 'brittany ferries', 'irish ferries', 'red funnel', 'wightlink', 'caledonian macbrayne',
      'calmac', 'condor ferries', 'royal caribbean', 'p&o cruises', 'princess cruises', 'msc cruises', 'norwegian cruise', 'ferry', 'cruise'
    ]
  },
  {
    id: 'education',
    label: 'Education, Courses & Childcare',
    icon: '📚',
    color: '#3b82f6',
    keywords: [
      'nursery', 'childcare', 'daycare', 'babysitter', 'nanny', 'pre-school', 'kindergarten', 'playgroup', 'tuition', 'school fees', 'school',
      'college', 'university', 'ucas', 'student finance', 'student loans', 'school uniform', 'parentpay', 'parentmail', 'arbor', 'scopay',
      'schoolmoney', 'udemy', 'coursera', 'skillshare', 'linkedin learning', 'masterclass', 'duolingo', 'codecademy', 'tutor', 'kumon',
      'music lessons', 'driving lessons', 'bsm', 'red driving school', 'passmefast', 'theory test', 'driving test', 'course', 'training'
    ]
  },
  {
    id: 'transfers',
    label: 'Transfers, Savings, Investments & Wallets',
    icon: '🔄',
    color: '#64748b',
    keywords: [
      'tesco bank', 'tesco credit card', 'tesco creditcard', 'tesco cc', 'tesco personal finance', 'tesco loans',
      'sainsburys bank', 'sainsbury\'s bank', 'sainsbury bank', 'sainsburys credit card', 'sainsbury\'s credit card', 'sainsburys cc',
      'asda money', 'asda credit card', 'asda creditcard',
      'm&s bank', 'marks and spencer bank', 'marks & spencer bank', 'm&s credit card',
      'john lewis finance', 'partnership card',
      'faster payment', 'bank transfer', 'direct debit', 'standing order', 'transfer to', 'transfer from', 'card payment', 'credit card payment',
      'bill payment', 'autopay', 'internal transfer', 'cash withdrawal', 'atm', 'cash deposit', 'cheque', 'payment received',
      'paypal', 'revolut', 'monzo', 'starling', 'wise', 'transferwise', 'curve', 'monese', 'cash app', 'venmo', 'skrill', 'neteller',
      'chip savings', 'chip', 'moneybox', 'plum', 'vanguard', 'hargreaves lansdown', 'aj bell', 'interactive investor', 'freetrade', 'trading 212',
      'etoro', 'nutmeg', 'wealthify', 'moneyfarm', 'ns&i', 'premium bonds', 'pension', 'scottish widows', 'aviva pension', 'nest pensions',
      'standard life', 'coinbase', 'binance', 'kraken', 'crypto.com', 'gemini', 'bitstamp', 'coinjar', 'crypto', 'savings', 'investment'
    ]
  },
  {
    id: 'general',
    label: 'General & Miscellaneous',
    icon: '📦',
    color: '#94a3b8',
    keywords: []
  }
];

function getCategoryById(catId) {
  return SPEND_CATEGORIES.find(c => c.id === catId) || SPEND_CATEGORIES[SPEND_CATEGORIES.length - 1];
}

function setDynamicCategories(cats) {
  if (Array.isArray(cats) && cats.length > 0) {
    SPEND_CATEGORIES = cats;
    _CACHED_CATEGORY_INDEX = null;
  }
}

// Pre-index keywords sorted descending by length for optimal precision
let _CACHED_CATEGORY_INDEX = null;
function getCategorySearchIndex() {
  if (_CACHED_CATEGORY_INDEX) return _CACHED_CATEGORY_INDEX;

  const allKeywords = [];

  SPEND_CATEGORIES.forEach(cat => {
    if (cat.id === 'general') return;
    (cat.keywords || []).forEach(kw => {
      if (kw) {
        allKeywords.push({
          keyword: kw.toLowerCase().trim(),
          category: cat,
          length: kw.trim().length
        });
      }
    });
  });

  allKeywords.sort((a, b) => b.length - a.length);

  _CACHED_CATEGORY_INDEX = allKeywords;
  return _CACHED_CATEGORY_INDEX;
}

function categorizeTransaction(t, customRules = {}) {
  if (t.category && SPEND_CATEGORIES.some(c => c.id === t.category)) {
    return getCategoryById(t.category);
  }

  const payee = (t.payee_name || '').toLowerCase();
  const rawInfo = (t.raw_info || '').toLowerCase();
  const creditor = (t.creditor_name || '').toLowerCase();
  const merchant = (t.merchant_name || '').toLowerCase();
  const fullText = `${payee} ${rawInfo} ${creditor} ${merchant}`;

  // 1. User custom merchant rules (highest priority after manual assignment)
  for (const [pattern, catId] of Object.entries(customRules || {})) {
    if (pattern && fullText.includes(pattern.toLowerCase())) {
      return getCategoryById(catId);
    }
  }

  // 2. Open Banking provider classification / meta tags (e.g. TrueLayer / Plaid category arrays)
  const classifications = Array.isArray(t.classification) ? t.classification : (Array.isArray(t.transaction_classification) ? t.transaction_classification : []);
  const classText = classifications.join(' ').toLowerCase();
  if (classText.includes('grocer') || classText.includes('supermarket')) return getCategoryById('groceries');
  if (classText.includes('fuel') || classText.includes('gas station') || classText.includes('transport') || classText.includes('automotive') || classText.includes('transit') || classText.includes('taxi')) return getCategoryById('transport');
  if (classText.includes('restaurant') || classText.includes('dining') || classText.includes('cafe') || classText.includes('food and drink') || classText.includes('fast food') || classText.includes('bar') || classText.includes('pub') || classText.includes('cater')) return getCategoryById('dining');
  if (classText.includes('shopping') || classText.includes('retail') || classText.includes('clothing') || classText.includes('electronics') || classText.includes('department store')) return getCategoryById('shopping');
  if (classText.includes('entertainment') || classText.includes('media') || classText.includes('gaming') || classText.includes('streaming') || classText.includes('movies') || classText.includes('music')) return getCategoryById('entertainment');
  if (classText.includes('utilities') || classText.includes('bills') || classText.includes('insurance') || classText.includes('telecom') || classText.includes('tax') || classText.includes('rent') || classText.includes('mortgage')) return getCategoryById('bills');
  if (classText.includes('health') || classText.includes('medical') || classText.includes('fitness') || classText.includes('pharmacy') || classText.includes('dental') || classText.includes('gym')) return getCategoryById('health');
  if (classText.includes('travel') || classText.includes('airline') || classText.includes('flight') || classText.includes('hotel') || classText.includes('lodging') || classText.includes('vacation')) return getCategoryById('travel');
  if (classText.includes('education') || classText.includes('school') || classText.includes('tuition') || classText.includes('childcare')) return getCategoryById('education');
  if (classText.includes('transfer') || classText.includes('deposit') || classText.includes('withdrawal') || classText.includes('atm') || classText.includes('investment') || classText.includes('savings')) return getCategoryById('transfers');

  // 3. Auto-cleared direct debits / recurring bills
  if (t.auto_cleared || t.matched_bill_id) {
    return getCategoryById('bills');
  }

  // 4. Normalized string matching: strip punctuation, extra spaces, transaction codes
  const cleanNorm = ' ' + fullText
    .replace(/[*\-_#/:.,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() + ' ';
  const fullPadded = ' ' + fullText + ' ';

  const allKeywords = getCategorySearchIndex();

  // 5. Keyword search matching: match longest specific merchant phrases first
  for (const item of allKeywords) {
    if (item.length <= 4) {
      if (cleanNorm.includes(` ${item.keyword} `) || fullPadded.includes(` ${item.keyword} `)) {
        return item.category;
      }
    } else {
      if (cleanNorm.includes(item.keyword) || fullText.includes(item.keyword)) {
        return item.category;
      }
    }
  }

  return getCategoryById('general');
}

function calculateCategoryBreakdown(transactions, timeframe = 'this_month', accountFilter = 'all', activeUser = 'all', customRules = {}) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  let startDate = null;
  let endDate = new Date(curYear, curMonth, now.getDate(), 23, 59, 59);

  if (timeframe === 'active_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
  } else if (timeframe === 'this_month') {
    startDate = new Date(curYear, curMonth, 1, 0, 0, 0);
  } else if (timeframe === 'last_month') {
    startDate = new Date(curYear, curMonth - 1, 1, 0, 0, 0);
    endDate = new Date(curYear, curMonth, 0, 23, 59, 59);
  } else if (timeframe === 'last_30_days') {
    startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  } else if (timeframe === 'year_to_date') {
    startDate = new Date(curYear, 0, 1, 0, 0, 0);
  } else {
    startDate = new Date(curYear, curMonth, 1, 0, 0, 0);
  }

  const filtered = (transactions || []).filter(t => {
    const amt = Number(t.amount || 0);
    if (amt >= 0) return false;

    if (t.booking_date) {
      const tDate = new Date(t.booking_date);
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
    }

    if (accountFilter && accountFilter !== 'all') {
      const tAcc = String(t.account_name || '').toLowerCase();
      const fAcc = String(accountFilter).toLowerCase();
      if (!tAcc.includes(fAcc) && fAcc !== tAcc) return false;
    }

    if (activeUser && activeUser !== 'all' && activeUser !== 'Joint') {
      if (t.owner && t.owner !== 'Joint' && t.owner !== activeUser) return false;
    }

    return true;
  });

  const totalsByCategory = {};
  SPEND_CATEGORIES.forEach(c => {
    totalsByCategory[c.id] = {
      category: c,
      totalAmount: 0,
      count: 0,
      transactions: []
    };
  });

  const merchantTotals = {};
  let grandTotal = 0;

  filtered.forEach(t => {
    const cat = categorizeTransaction(t, customRules);
    const absAmt = Math.abs(Number(t.amount || 0));

    totalsByCategory[cat.id].totalAmount += absAmt;
    totalsByCategory[cat.id].count += 1;
    totalsByCategory[cat.id].transactions.push({ ...t, assignedCategory: cat });

    const mName = t.payee_name || 'Unknown Merchant';
    merchantTotals[mName] = (merchantTotals[mName] || 0) + absAmt;

    if (cat.id !== 'transfers') {
      grandTotal += absAmt;
    }
  });

  const categoryList = Object.values(totalsByCategory)
    .filter(c => c.totalAmount > 0)
    .map(c => ({
      ...c,
      percentage: grandTotal > 0 ? (c.totalAmount / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const topMerchants = Object.entries(merchantTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    filteredTransactions: filtered.map(t => ({ ...t, assignedCategory: categorizeTransaction(t, customRules) })),
    categoryList,
    topMerchants,
    grandTotal,
    transactionCount: filtered.length,
    startDate,
    endDate
  };
}

if (typeof window !== 'undefined') {
  window.calculateLiveDailyPacing = calculateLiveDailyPacing;
  window.SPEND_CATEGORIES = SPEND_CATEGORIES;
  window.getCategoryById = getCategoryById;
  window.categorizeTransaction = categorizeTransaction;
  window.calculateCategoryBreakdown = calculateCategoryBreakdown;
}

// --- static/js/charts.js ---


let yearChartInstance = null;

function destroyYearChart() {
  if (yearChartInstance) {
    try {
      yearChartInstance.destroy();
    } catch (e) {
      console.warn("Chart destroy error:", e);
    }
    yearChartInstance = null;
  }
}

function renderYearBalancesChart(canvasEl, monthData, curr, sel, cfg) {
  if (!canvasEl) return;
  destroyYearChart();

  if (typeof Chart === 'undefined') {
    canvasEl.parentElement.innerHTML = '<div style="padding:20px; color:var(--amber); text-align:center;">⚠️ Chart engine blocked by browser tracking prevention. Unblock jsdelivr.net to view charts.</div>';
    return;
  }

  const ctx = canvasEl.getContext('2d');
  const datasets = [];

  if (sel.current && sel.current.length > 0) {
    datasets.push({
      label: '🏦 Current Accounts',
      data: monthData.map(d => d.current),
      borderColor: '#38bdf8',
      backgroundColor: '#38bdf8',
      borderWidth: 2,
      tension: 0.3,
      fill: false
    });
  }

  if (sel.credit && sel.credit.length > 0) {
    datasets.push({
      label: '💳 Credit Card Debt',
      data: monthData.map(d => d.credit),
      borderColor: '#f87171',
      backgroundColor: '#f87171',
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.3,
      fill: false
    });
  }

  if (cfg.track_savings && sel.savings && sel.savings.length > 0) {
    // 1. Planned Savings Curve (Dashed line across all 12 months)
    datasets.push({
      label: '📈 Planned Savings',
      data: monthData.map(d => d.savings),
      borderColor: '#c084fc',
      backgroundColor: '#c084fc',
      borderWidth: 2,
      borderDash: [4, 4],
      tension: 0.3,
      fill: false
    });

    // 2. Actual Savings Curve (Solid line with distinct points for recorded months)
    const actualSavingsPoints = monthData.map(d => d.actualSavings);
    if (actualSavingsPoints.some(v => v !== null)) {
      datasets.push({
        label: '📈 Actual Savings Balance',
        data: actualSavingsPoints,
        borderColor: '#a855f7',
        backgroundColor: '#a855f7',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.2,
        fill: false
      });
    }
  }

  // Net Position
  datasets.push({
    label: '💎 Net Position',
    data: monthData.map(d => d.net),
    borderColor: '#34d399',
    backgroundColor: '#34d399',
    borderWidth: 2.5,
    tension: 0.3,
    fill: false
  });

  yearChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#cbd5e1', boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += curr + Number(context.parsed.y).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
        y: {
          grid: { color: '#334155' },
          ticks: {
            color: '#94a3b8',
            callback: v => curr + Number(v).toLocaleString()
          }
        }
      }
    }
  });
}

let categoryChartInstance = null;

function destroyCategoryChart() {
  if (categoryChartInstance) {
    try {
      categoryChartInstance.destroy();
    } catch (e) {
      console.warn("Category chart destroy error:", e);
    }
    categoryChartInstance = null;
  }
}

function renderCategoryDonutChart(canvasEl, categoryList, curr) {
  if (!canvasEl) return;
  destroyCategoryChart();

  if (typeof Chart === 'undefined') {
    canvasEl.parentElement.innerHTML = '<div style="padding:20px; color:var(--amber); text-align:center;">⚠️ Chart engine blocked by browser tracking prevention.</div>';
    return;
  }

  const validCategories = (categoryList || []).filter(c => c.totalAmount > 0 && c.category.id !== 'transfers');

  if (!validCategories.length) {
    const parent = canvasEl.parentElement;
    parent.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-size:12.5px; text-align:center; padding:30px;">
        <span style="font-size:32px; margin-bottom:8px;">📊</span>
        <span>No categorized spend found for this period.</span>
      </div>
    `;
    return;
  }

  const ctx = canvasEl.getContext('2d');
  const labels = validCategories.map(c => `${c.category.icon} ${c.category.label}`);
  const data = validCategories.map(c => Number(c.totalAmount.toFixed(2)));
  const backgroundColors = validCategories.map(c => c.category.color);

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#0f172a',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#cbd5e1',
            boxWidth: 12,
            font: { size: 11, family: 'Inter, -apple-system, sans-serif' },
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#475569',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const val = Number(context.raw || 0);
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.renderCategoryDonutChart = renderCategoryDonutChart;
  window.destroyCategoryChart = destroyCategoryChart;
}

// --- static/js/views/modals.js ---




function showModal(opts) {
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

function closeModal() {
  const modal = document.getElementById('genericModal');
  if (modal) modal.style.display = 'none';
  window.pendingModalAction = null;
  if (window._pinKeydownHandler) {
    window.removeEventListener('keydown', window._pinKeydownHandler);
    window._pinKeydownHandler = null;
  }
}

function openDateOverrideModal(mName, onComplete) {
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



function openMoveItemModal(sourceMonth, sourceWeek, itemIdx) {
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

function updateMoveWeekOptions(mName, selWeek) {
  const mIdx = months.indexOf(mName);
  const sched = calculateMonthSchedule(appState.currentYear, mIdx);
  const sel = document.getElementById('moveDestWeek');
  if (sel) {
    sel.innerHTML = sched.weeks.map(w => `
      <option value="${w.name}" ${w.name === selWeek ? 'selected' : ''}>${w.label}</option>
    `).join('');
  }
}

function openRescheduleRecurringModal(recurringIdx, currentMonth, currentWeek, itemType = 'outgoing') {
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

function updateReschedWeekOptions(mName, selWeek) {
  const mIdx = months.indexOf(mName);
  const sched = calculateMonthSchedule(appState.currentYear, mIdx);
  const sel = document.getElementById('reschedDestWeek');
  if (sel) {
    sel.innerHTML = sched.weeks.map(w => `
      <option value="${w.name}" ${w.name === selWeek ? 'selected' : ''}>${w.label}</option>
    `).join('');
  }
}
function openAccountTrackingModal() {
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

function openYearOverviewAccountFilterModal() {
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

function openYearlyRecurringView() {
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

function openAddBudgetModal() {
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


function openArchiveManagerModal() {
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


function openQuickCheckInModal(selectedWeek, selectedMonth) {
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

function openQuickWeeklyExpenseModal(selectedWeek, selectedMonth) {
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

function openQuickBudgetTxModal() {
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

const openYearlyRecurringModal = openYearlyRecurringView;


// ==========================================
// BIRTHDAYS & ANNUAL OCCASIONS MODALS
// ==========================================
function openAddBirthdayModal() {
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

function openEditBirthdayModal(bIdx) {
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

function openAddBirthdaySpendModal(bIdx) {
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

function openQuickBirthdaySpendModal() {
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
function openRecurringPaymentsModal() {
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
function openScheduledBillsModal(activeFilter = 'all') {
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

function openPinUnlockModal(person, callback) {
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

function openSetPinModal(person) {
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

async function openBankLinkModal() {
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

function openManualAuthCodeModal() {
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

function openTransactionLedgerModal(weekIndex = null, targetMonth = null) {
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

function openBankStatementUploadModal() {
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

async function openDebugLogModal() {
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

function openRecategorizeModal(txnId, merchantName, currentCatId) {
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

function openManualBillMatchModal(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr) {
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

  const isCleared = (sourceType === 'recurring_income' || sourceType === 'recurring_payment' || Boolean(dateStr))
    ? Boolean(dateStr && item?.cleared_dates && item.cleared_dates.includes(dateStr))
    : Boolean(item?.status === 'paid' || item?.auto_cleared);

  const allTxns = appState.data.open_banking_transactions || [];
  const cleanDesc = (desc || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const sortedTxns = [...allTxns].sort((a, b) => {
    if (dateStr && a.booking_date && b.booking_date) {
      const targetTime = new Date(dateStr).getTime();
      const aTimeDiff = Math.abs(new Date(a.booking_date).getTime() - targetTime);
      const bTimeDiff = Math.abs(new Date(b.booking_date).getTime() - targetTime);
      const aNear = aTimeDiff <= (14 * 86400000);
      const bNear = bTimeDiff <= (14 * 86400000);
      if (aNear && !bNear) return -1;
      if (!aNear && bNear) return 1;
      if (aNear && bNear) return aTimeDiff - bTimeDiff;
    }
    const aAmtDiff = Math.abs(Math.abs(Number(a.amount) || 0) - amt);
    const bAmtDiff = Math.abs(Math.abs(Number(b.amount) || 0) - amt);
    if (aAmtDiff < 0.05 && bAmtDiff >= 0.05) return -1;
    if (bAmtDiff < 0.05 && aAmtDiff >= 0.05) return 1;
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
            ${item?.matched_payee ? ` • Matched with <em>${item.matched_payee}</em> (${item.matched_date || ''})` : ''}
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          ${isCleared ? `
            <button type="button" class="btn secondary" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.toggleScheduledBillCleared('${sourceType}', ${sourceIdx}, '${mName}', '${desc.replace(/'/g, "\\'")}', ${amt}, '${dateStr || ''}'); window.budgetApp.closeModal();">❌ Set as Due / Un-match</button>
          ` : `
            <button type="button" class="btn green" style="font-size:11px; padding:4px 10px;" onclick="window.budgetApp.toggleScheduledBillCleared('${sourceType}', ${sourceIdx}, '${mName}', '${desc.replace(/'/g, "\\'")}', ${amt}, '${dateStr || ''}'); window.budgetApp.closeModal();">⚡ Mark Cleared (Manual)</button>
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
            <div style="font-size:11px; color:var(--text-muted); text-align:center; padding:16px;">No Open Banking transactions available. Run a Sync in Settings first.</div>
          ` : sortedTxns.map(t => {
            const tAmt = Math.abs(Number(t.amount) || 0);
            const isAmtMatch = Math.abs(tAmt - amt) <= 0.05;
            const tPayee = t.payee_name || t.merchant_name || 'Debit Transaction';
            const isNameMatch = cleanDesc && tPayee.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanDesc);
            const isRecMatch = isAmtMatch || isNameMatch;
            const isCurrentMatch = (sourceType === 'recurring_income' || sourceType === 'recurring_payment' || Boolean(dateStr))
              ? Boolean(dateStr && t.booking_date && t.booking_date.startsWith(dateStr) && (t.matched_bill_id === desc || item?.matched_txn_id === t.transaction_id))
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
                  <button type="button" class="btn ${isCurrentMatch ? 'secondary' : 'green'}" style="font-size:10.5px; padding:3px 8px;" onclick="window.budgetApp.linkBillToTransaction('${sourceType}', ${sourceIdx}, '${mName}', '${desc.replace(/'/g, "\\'")}', '${t.transaction_id}', '${dateStr || ''}')">
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


// --- static/js/views/wizard.js ---




function startOnboarding() {
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
  const payfreqEl = document.getElementById('ob-payfreq');
  if (payfreqEl) payfreqEl.value = cfg.pay_frequency || 'monthly';
  const pdayEl = document.getElementById('ob-pday');
  if (pdayEl) pdayEl.value = cfg.payday_day || 26;
  const pdayAnchorEl = document.getElementById('ob-pday-anchor');
  if (pdayAnchorEl) pdayAnchorEl.value = cfg.payday_anchor_date || '2026-01-09';
  const holidayEl = document.getElementById('ob-holiday');
  if (holidayEl) holidayEl.value = cfg.country_holidays || 'uk_ew';

  const freq = cfg.pay_frequency || 'monthly';
  const mBox = document.getElementById('ob-pday-monthly-box');
  const bwBox = document.getElementById('ob-pday-biweekly-box');
  if (mBox) mBox.style.display = (freq === 'monthly' || freq === 'semi_monthly') ? 'block' : 'none';
  if (bwBox) bwBox.style.display = (freq === 'biweekly' || freq === 'four_weekly' || freq === 'weekly') ? 'block' : 'none';
  
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

function nextObStep(step) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`obStep${i}`);
    if (el) el.style.display = (i === step) ? 'block' : 'none';
    const pill = document.getElementById(`obStepPill${i}`);
    if (pill) {
      pill.classList.remove('active', 'completed');
      if (i === step) pill.classList.add('active');
      else if (i < step) pill.classList.add('completed');
    }
  }
  if (step === 2) {
    const cfg = getSettings();
    const currEl = document.getElementById('ob-curr');
    if (currEl) cfg.currency = currEl.value.trim() || '£';
    const payfreqEl = document.getElementById('ob-payfreq');
    if (payfreqEl) cfg.pay_frequency = payfreqEl.value || 'monthly';
    const pdayEl = document.getElementById('ob-pday');
    if (pdayEl) cfg.payday_day = parseInt(pdayEl.value, 10) || 26;
    const pdayAnchorEl = document.getElementById('ob-pday-anchor');
    if (pdayAnchorEl) cfg.payday_anchor_date = pdayAnchorEl.value || '2026-01-09';
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

function obRenderLists() {
  const cfg = getSettings();
  const curr = cfg.currency || '£';
  const isMulti = !!cfg.enable_multi_user;

  // Step 2 People List
  const pList = document.getElementById('obPeopleList');
  if (pList) {
    pList.innerHTML = (cfg.people || []).map((p, idx) => `
      <div style="display:flex; align-items:center; gap:8px; background:var(--panel-bg); padding:6px 10px; border-radius:8px; border:1px solid var(--border); margin-bottom:6px; flex-wrap:wrap;">
        <input type="text" value="${p}" onchange="window.budgetApp.obUpdatePerson(${idx}, this.value)" style="flex:1; min-width:120px;" placeholder="Member Name">
        ${isMulti ? `
          <input type="password" maxlength="6" inputmode="numeric" placeholder="PIN" value="${getPersonPin(p)}" onchange="window.budgetApp.obUpdatePersonPin(${idx}, this.value)" style="width:65px; font-size:11px; padding:6px 8px; text-align:center;" title="Optional 4-digit PIN for ${p}">
          <label style="font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; color:var(--text-muted);">
            <input type="checkbox" ${isPersonSalaryHidden(p) ? 'checked' : ''} onchange="window.budgetApp.obUpdatePersonPrivacy(${idx}, this.checked)"> 🔒 Hide
          </label>
        ` : ''}
        ${(cfg.people || []).length > 1 ? `<button class="del-btn" style="width:28px; height:28px; border-radius:6px;" onclick="window.budgetApp.obDelPerson(${idx})">&times;</button>` : ''}
      </div>
    `).join('');
  }

  // Step 2 Current List
  const cList = document.getElementById('obCurrentList');
  if (cList) {
    cList.innerHTML = (cfg.current_accounts || []).map((acc, idx) => `
      <div style="display:flex; align-items:center; gap:8px; background:var(--panel-bg); padding:6px 10px; border-radius:8px; border:1px solid var(--border); margin-bottom:6px; flex-wrap:wrap;">
        <input type="text" value="${acc}" onchange="window.budgetApp.obUpdateCurrent(${idx}, this.value)" style="flex:1; min-width:140px;" placeholder="Account Name">
        ${isMulti ? `
          <select onchange="window.budgetApp.obUpdateAccountOwner('current', ${idx}, this.value)" style="width:120px; font-size:11px;" title="Account Owner">
            <option value="Joint" ${getAccountOwner('current', acc) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
            ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('current', acc) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
          </select>
        ` : ''}
        ${(cfg.current_accounts || []).length > 1 ? `<button class="del-btn" style="width:28px; height:28px; border-radius:6px;" onclick="window.budgetApp.obDelCurrent(${idx})">&times;</button>` : ''}
      </div>
    `).join('');
  }

  // Step 2 Savings List
  const sList = document.getElementById('obSavingsList');
  if (sList) {
    sList.innerHTML = (cfg.savings_accounts || []).map((acc, idx) => `
      <div style="display:flex; align-items:center; gap:8px; background:var(--panel-bg); padding:6px 10px; border-radius:8px; border:1px solid var(--border); margin-bottom:6px; flex-wrap:wrap;">
        <input type="text" value="${acc}" onchange="window.budgetApp.obUpdateSavings(${idx}, this.value)" style="flex:1; min-width:140px;" placeholder="Account Name">
        ${isMulti ? `
          <select onchange="window.budgetApp.obUpdateAccountOwner('savings', ${idx}, this.value)" style="width:120px; font-size:11px;" title="Account Owner">
            <option value="Joint" ${getAccountOwner('savings', acc) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
            ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('savings', acc) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
          </select>
        ` : ''}
        ${(cfg.savings_accounts || []).length > 1 ? `<button class="del-btn" style="width:28px; height:28px; border-radius:6px;" onclick="window.budgetApp.obDelSavings(${idx})">&times;</button>` : ''}
      </div>
    `).join('');
  }

  // Step 2 Credit List
  const crList = document.getElementById('obCreditList');
  if (crList) {
    crList.innerHTML = (cfg.credit_accounts || []).map((c, idx) => `
      <div style="background:var(--panel-bg); padding:10px 12px; border-radius:8px; border:1px solid var(--border); margin-bottom:8px;">
        <div style="display:flex; gap:8px; margin-bottom:6px; align-items:center; flex-wrap:wrap;">
          <input type="text" value="${c.name}" onchange="window.budgetApp.obUpdateCredit(${idx}, 'name', this.value)" placeholder="Card Name" style="flex:1; min-width:130px;">
          <input type="number" value="${c.limit}" onchange="window.budgetApp.obUpdateCredit(${idx}, 'limit', this.value)" placeholder="Credit Limit" style="width:95px;">
          ${isMulti ? `
            <select onchange="window.budgetApp.obUpdateAccountOwner('credit', ${idx}, this.value)" style="width:120px; font-size:11px;" title="Card Owner">
              <option value="Joint" ${getAccountOwner('credit', c.name) === 'Joint' ? 'selected' : ''}>👥 Joint</option>
              ${(cfg.people || []).map(p => `<option value="${p}" ${getAccountOwner('credit', c.name) === p ? 'selected' : ''}>👤 ${p}</option>`).join('')}
            </select>
          ` : ''}
          <button class="del-btn" style="width:28px; height:28px; border-radius:6px;" onclick="window.budgetApp.obDelCredit(${idx})">&times;</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; font-size:11px; flex-wrap:wrap; border-top:1px dashed var(--border); padding-top:6px;">
          <label style="display:inline-flex; align-items:center; gap:4px; font-weight:600; color:var(--curr-border);"><input type="checkbox" ${c.autopay_enabled ? 'checked' : ''} onchange="window.budgetApp.obUpdateCredit(${idx}, 'autopay_enabled', this.checked)"> Auto-Pay Settlement</label>
          ${c.autopay_enabled ? `
            <select onchange="window.budgetApp.obUpdateCredit(${idx}, 'autopay_from', this.value)" style="padding:4px 6px; font-size:11px;">
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
      <div style="display:flex; flex-direction:column; gap:2px;">
        <label style="font-size:10.5px; font-weight:600; color:var(--text-muted);">${p}:</label>
        <input type="number" step="0.01" id="ob-deduct-p${idx}" placeholder="${curr} 0.00" style="width:100%;">
      </div>
    `).join('');
  }
  const dList = document.getElementById('obDeductList');
  if (dList) {
    dList.innerHTML = (cfg.default_deductions || []).map((d, idx) => {
      const ownerStr = d.person ? `[👤 ${d.person}] ` : '';
      return `
        <div class="wizard-item-row">
          <span class="wizard-item-text"><strong>${ownerStr}${d.name}</strong> ${d.is_salary ? '<span style="color:var(--green); font-weight:600;">(Salary)</span>' : ''} ➔ ${d.target_account}</span>
          <button class="del-btn wizard-item-del" onclick="window.budgetApp.obDelDeduct(${idx})">&times;</button>
        </div>
      `;
    }).join('');
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
      <option value="none">None (Outgoing Bill)</option>
      <optgroup label="Savings Accounts">${(cfg.savings_accounts || []).map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>
      <optgroup label="Credit Cards">${(cfg.credit_accounts || []).map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>
    `;
  }
  const ddList = document.getElementById('obDDList');
  if (ddList) {
    ddList.innerHTML = (cfg.default_direct_debits || []).map((d, idx) => `
      <div class="wizard-item-row">
        <span class="wizard-item-text"><strong>${d.desc}</strong> (Day ${d.due_day}) • <span style="color:var(--red); font-weight:600;">-${curr}${d.amount}</span> <span style="color:var(--text-muted); font-size:10px;">(${d.account || cfg.current_accounts[0]})</span></span>
        <button class="del-btn wizard-item-del" onclick="window.budgetApp.obDelDD(${idx})">&times;</button>
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
      <div class="wizard-item-row">
        <span class="wizard-item-text"><strong>${y.desc}</strong> (${y.month} ${y.due_day}) • <span style="color:var(--red); font-weight:600;">-${curr}${y.amount}</span> <span style="color:var(--text-muted); font-size:10px;">(${y.account || cfg.current_accounts[0]})</span></span>
        <button class="del-btn wizard-item-del" onclick="window.budgetApp.obDelYearly(${idx})">&times;</button>
      </div>
    `).join('');
  }

  // Step 5 Weekly
  const wkAcc = document.getElementById('ob-wk-acc');
  if (wkAcc) {
    wkAcc.innerHTML = `
      <optgroup label="Current Accounts">${(cfg.current_accounts || []).map(a => `<option value="current:${a}">${a}</option>`).join('')}</optgroup>
      ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="credit:${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
      ${cfg.track_savings ? `<optgroup label="Savings Accounts">${(cfg.savings_accounts || []).map(s => `<option value="savings:${s}">${s}</option>`).join('')}</optgroup>` : ''}
    `;
  }
  const wkList = document.getElementById('obWeeklyList');
  if (wkList) {
    wkList.innerHTML = (cfg.default_weekly || []).map((w, idx) => `
      <div class="wizard-item-row">
        <span class="wizard-item-text"><strong style="color:${w.is_income ? 'var(--green)' : 'var(--heading)'};">${w.is_income ? '+' : '-'} ${w.desc}</strong>: ${curr}${w.amount} <span style="color:var(--text-muted); font-size:10px;">(${w.account_name})</span></span>
        <button class="del-btn wizard-item-del" onclick="window.budgetApp.obDelWeekly(${idx})">&times;</button>
      </div>
    `).join('');
  }
}

function obAddPerson() {
  if (!getSettings().people) getSettings().people = [];
  getSettings().people.push(`Person ${getSettings().people.length + 1}`);
  obRenderLists();
}

function obAddCurrent() {
  if (!getSettings().current_accounts) getSettings().current_accounts = [];
  getSettings().current_accounts.push(`Current Account ${getSettings().current_accounts.length + 1}`);
  obRenderLists();
}

function obAddSavings() {
  if (!getSettings().savings_accounts) getSettings().savings_accounts = [];
  getSettings().savings_accounts.push(`Savings Account ${getSettings().savings_accounts.length + 1}`);
  obRenderLists();
}

function obAddCredit() {
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

function obAddDeduction() {
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

function obAddDD() {
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

function obAddYearly() {
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

function obAddWeekly() {
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

function obDelWeekly(idx) {
  if (getSettings().default_weekly) {
    getSettings().default_weekly.splice(idx, 1);
  }
  obRenderLists();
}

async function finishOnboarding(onComplete) {
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

function closeOnboarding() {
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

// --- static/js/views/overview.js ---
function formatCheckInTimestamp(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  if (isToday) {
    return `Today at ${hours}:${mins}`;
  }
  return `${d.getDate()} ${months[d.getMonth()]} ${hours}:${mins}`;
}




function renderOverviewView(container) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const isOpenBankingEnabled = Boolean(cfg.open_banking?.enabled);
  const activeTab = appState.activeTab;
  const currentYear = appState.currentYear;
  const globalEditMode = appState.globalEditMode;
  const isMulti = isMultiUserEnabled();

  const mIdx = months.indexOf(activeTab);
  const schedule = calculateMonthSchedule(currentYear, mIdx);
  const mData = getMonthData(activeTab);

  const deducts = mData.deductions_list || [];
  let totalCurrentInflow = 0;
  let totalSalarySavingsIn = 0;
  const personTotals = {};
  cfg.people.forEach(p => personTotals[p] = { salary: 0, out: 0, leftover: 0 });

  deducts.forEach(d => {
    cfg.people.forEach(p => {
      let amt = 0;
      if (d.is_salary) {
        amt = getDeductionSalaryForMonth(d, p, schedule).total;
        personTotals[p].salary += amt;
        if (cfg.current_accounts.includes(d.target_account)) totalCurrentInflow += amt;
        if (cfg.savings_accounts.includes(d.target_account)) totalSalarySavingsIn += amt;
      } else {
        if (d.amounts && typeof d.amounts[p] !== 'undefined') {
          amt = Number(d.amounts[p]) || 0;
        } else if (d.person) {
          amt = (d.person === p) ? (Number(d.amount) || 0) : 0;
        }
        personTotals[p].out += amt;
        if (cfg.current_accounts.includes(d.target_account)) totalCurrentInflow += amt;
        if (cfg.savings_accounts.includes(d.target_account)) totalSalarySavingsIn += amt;
      }
    });
  });

  cfg.people.forEach(p => personTotals[p].leftover = personTotals[p].salary - personTotals[p].out);

  const allYearlyBills = getYearData().yearly_recurring || [];
  const allYearlyIncome = getYearData().yearly_income || [];
  const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(activeTab, months.indexOf(activeTab), appState.currentYear) : [];
  const birthdayBillsThisMonth = (typeof getBirthdayItemsForMonth === 'function') ? getBirthdayItemsForMonth(activeTab, months.indexOf(activeTab), appState.currentYear) : [];
  const allBirthdays = getYearData().birthdays || cfg.birthdays || [];
  const allRecurring = getYearData().recurring_payments || cfg.recurring_payments || [];
  const allRecurringIncomes = getYearData().recurring_incomes || cfg.recurring_incomes || [];

  let totalDD = (mData.direct_debits || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  allYearlyBills.filter(yb => yb.month === activeTab).forEach(yb => totalDD += (Number(yb.amount) || 0));
  budgetBillsThisMonth.forEach(b => totalDD += (Number(b.amount) || 0));
  birthdayBillsThisMonth.forEach(b => totalDD += (Number(b.amount) || 0));

  let totalMonthPaymentsIn = (mData.payments_in || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  allYearlyIncome.filter(yi => yi.month === activeTab).forEach(yi => totalMonthPaymentsIn += (Number(yi.amount) || 0));
  
  let totalWeeklySpend = 0, totalWeeklyCurrentSpend = 0, totalWeeklyIncome = 0;
  schedule.weeks.forEach(wObj => {
    const items = getWeekItems(activeTab, wObj.name);
    items.forEach(i => {
      const amt = Number(i.amount) || 0;
      if (i.is_income) totalWeeklyIncome += amt;
      else {
        totalWeeklySpend += amt;
        const isCurrent = i.account_type === 'current' || (i.desc && i.desc.toLowerCase().includes('cash'));
        if (isCurrent) totalWeeklyCurrentSpend += amt;
      }
    });
  });

  let totalCurrentOpening = 0;
  const runningCurrentByAcc = {};
  cfg.current_accounts.forEach(acc => {
    const val = Number(mData.current_data[acc] && mData.current_data[acc].opening) || 0;
    totalCurrentOpening += val;
    runningCurrentByAcc[acc] = val;
  });

  deducts.forEach(d => {
    if (cfg.current_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amount = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        if (runningCurrentByAcc[d.target_account] !== undefined) {
          runningCurrentByAcc[d.target_account] += amount || 0;
        }
      });
    }
  });

  let totalCreditOpeningSpent = 0, totalCreditLimit = 0;
  const runningCreditByCard = {};
  cfg.credit_accounts.forEach(c => {
    const spent = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
    totalCreditLimit += Number(c.limit) || 0;
    totalCreditOpeningSpent += spent;
    runningCreditByCard[c.name] = spent;
  });

  const autoSavingsFromDD = {};
  cfg.savings_accounts.forEach(acc => autoSavingsFromDD[acc] = 0);
  (mData.direct_debits || []).forEach(dd => {
    if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
      autoSavingsFromDD[dd.transfer_to] += Number(dd.amount) || 0;
    }
  });

  let totalSavingsOpening = 0;
  const runningSavingsByAcc = {};
  cfg.savings_accounts.forEach(acc => {
    const val = Number(mData.savings_data[acc] && mData.savings_data[acc].opening) || 0;
    totalSavingsOpening += val;
    runningSavingsByAcc[acc] = val;
  });

  deducts.forEach(d => {
    if (cfg.savings_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        if (runningSavingsByAcc[d.target_account] !== undefined) runningSavingsByAcc[d.target_account] += amt || 0;
      });
    }
  });

  // Calculate week-by-week cashflow predictions
  const weeklyPredictions = [];
  schedule.weeks.forEach((wObj, wIdx) => {
    const isFinalWeek = (wIdx === schedule.weeks.length - 1);
    const items = getWeekItems(activeTab, wObj.name);
    const actuals = getWeekActuals(activeTab, wObj.name);

    let wExpenseSum = 0, wIncomeSum = 0;
    items.forEach(it => {
      const amt = Number(it.amount) || 0;
      if (it.is_income) wIncomeSum += amt;
      else wExpenseSum += amt;
    });

    const directDebitsWithMeta = (mData.direct_debits || []).map((b, idx) => ({ ...b, source_type: 'direct_debit', source_idx: idx }));
    const yearlyBillsWithMeta = (getYearData().yearly_recurring || []).map((b, idx) => ({ ...b, source_type: 'yearly_recurring', source_idx: idx }));
    const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(activeTab, months.indexOf(activeTab), appState.currentYear).map((b, idx) => ({ ...b, source_type: 'budget_bill', source_idx: idx })) : [];
    const allScheduledBills = [...directDebitsWithMeta, ...yearlyBillsWithMeta, ...budgetBillsThisMonth];
    const baseDDs = getDDsForWeek(allScheduledBills, wObj, schedule);
    
    const allBirthdays = getYearData().birthdays || cfg.birthdays || [];
    const allRecurring = getYearData().recurring_payments || cfg.recurring_payments || [];
    const wBirthdays = (typeof getBirthdaysForWeek === 'function') ? getBirthdaysForWeek(allBirthdays, wObj, schedule, currentYear) : [];
    const wRecurring = (typeof getRecurringForWeek === 'function') ? getRecurringForWeek(allRecurring, wObj, schedule, currentYear) : [];
    
    const wDDs = [...baseDDs, ...wRecurring, ...wBirthdays];
    const wDDTotal = wDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // Scheduled Payments In / Inflows
    const directIncomesWithMeta = (mData.payments_in || []).map((b, idx) => ({ ...b, source_type: 'payments_in', source_idx: idx }));
    const yearlyIncomesWithMeta = (getYearData().yearly_income || []).map((b, idx) => ({ ...b, source_type: 'yearly_income', source_idx: idx }));
    const allScheduledIncomes = [...directIncomesWithMeta, ...yearlyIncomesWithMeta];
    const baseIncomes = getIncomesForWeek(allScheduledIncomes, wObj, schedule, currentYear);
    const allRecurringIncomes = getYearData().recurring_incomes || cfg.recurring_incomes || [];
    const wRecurringIncomes = (typeof getRecurringForWeek === 'function') ? getRecurringForWeek(allRecurringIncomes, wObj, schedule, currentYear) : [];
    const wIncomes = [...baseIncomes, ...wRecurringIncomes];
    const wIncomeTotal = wIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    // 1. Process Outgoings
    wDDs.forEach(dd => {
      const paidFrom = dd.account || cfg.current_accounts[0];
      const amt = Number(dd.amount) || 0;
      if (runningCurrentByAcc[paidFrom] !== undefined) {
        runningCurrentByAcc[paidFrom] -= amt;
      }
      if (runningCreditByCard[paidFrom] !== undefined) {
        runningCreditByCard[paidFrom] += amt;
      }
      if (runningSavingsByAcc[paidFrom] !== undefined) {
        runningSavingsByAcc[paidFrom] -= amt;
      }
      if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
        if (runningSavingsByAcc[dd.transfer_to] !== undefined) {
          runningSavingsByAcc[dd.transfer_to] += amt;
        }
      }
    });

    // 2. Process Inflows
    wIncomes.forEach(pi => {
      const creditedTo = pi.account || cfg.current_accounts[0];
      const amt = Number(pi.amount) || 0;
      if (runningCurrentByAcc[creditedTo] !== undefined) {
        runningCurrentByAcc[creditedTo] += amt;
      }
      if (runningCreditByCard[creditedTo] !== undefined) {
        runningCreditByCard[creditedTo] = Math.max(0, runningCreditByCard[creditedTo] - amt);
      }
      if (runningSavingsByAcc[creditedTo] !== undefined) {
        runningSavingsByAcc[creditedTo] += amt;
      }
    });

    const autopaysDue = [];
    cfg.credit_accounts.forEach(c => {
      if (c.autopay_enabled) {
        let isDueThisWeek = (c.autopay_when === `week_${wIdx + 1}`);
        if (isDueThisWeek) {
          const openingDebt = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
          const payAmt = c.autopay_type === 'full' ? openingDebt : Math.min(openingDebt, Number(c.autopay_fixed_amt) || 0);
          if (payAmt > 0) {
            const fundingAcc = c.autopay_from || cfg.current_accounts[0];
            if (runningCurrentByAcc[fundingAcc] !== undefined) runningCurrentByAcc[fundingAcc] -= payAmt;
            runningCreditByCard[c.name] = Math.max(0, runningCreditByCard[c.name] - payAmt);
            autopaysDue.push({ card: c.name, from: fundingAcc, amount: payAmt });
          }
        }
      }
    });

    items.forEach(it => {
      const amt = Number(it.amount) || 0;
      if (it.account_type === 'current') {
        const acc = it.account_name || cfg.current_accounts[0];
        if (runningCurrentByAcc[acc] !== undefined) runningCurrentByAcc[acc] = it.is_income ? runningCurrentByAcc[acc] + amt : runningCurrentByAcc[acc] - amt;
      } else if (it.account_type === 'credit') {
        const cName = it.account_name || cfg.credit_accounts[0]?.name;
        if (cName && runningCreditByCard[cName] !== undefined) runningCreditByCard[cName] = it.is_income ? runningCreditByCard[cName] - amt : runningCreditByCard[cName] + amt;
      } else if (it.account_type === 'savings') {
        const sName = it.account_name || cfg.savings_accounts[0];
        if (sName && runningSavingsByAcc[sName] !== undefined) runningSavingsByAcc[sName] = it.is_income ? runningSavingsByAcc[sName] + amt : runningSavingsByAcc[sName] - amt;
      }
    });

    const weekCurrentSnap = { ...runningCurrentByAcc };
    const weekCreditSnap = { ...runningCreditByCard };
    const weekSavingsSnap = { ...runningSavingsByAcc };

    let sumWeekCurrent = 0, sumWeekCredit = 0, sumWeekSavings = 0;
    cfg.current_accounts.forEach(acc => sumWeekCurrent += (weekCurrentSnap[acc] || 0));
    cfg.credit_accounts.forEach(c => sumWeekCredit += (weekCreditSnap[c.name] || 0));
    if (cfg.track_savings) {
      cfg.savings_accounts.forEach(s => sumWeekSavings += (weekSavingsSnap[s] || 0));
    }

    let predictedNet = 0;
    if (isFinalWeek) {
      cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).forEach(a => predictedNet += (weekCurrentSnap[a] || 0));
      if (cfg.track_savings) {
        cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).forEach(s => predictedNet += (weekSavingsSnap[s] || 0));
      }
      cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).forEach(c => predictedNet -= (weekCreditSnap[c.name] || 0));
    } else {
      cfg.current_accounts.filter(a => isAccountTrackedWeekly('current', a) && isAccountIncludedInNet('current', a)).forEach(a => predictedNet += (weekCurrentSnap[a] || 0));
      if (cfg.track_savings) {
        cfg.savings_accounts.filter(s => isAccountTrackedWeekly('savings', s) && isAccountIncludedInNet('savings', s)).forEach(s => predictedNet += (weekSavingsSnap[s] || 0));
      }
      cfg.credit_accounts.filter(c => isAccountTrackedWeekly('credit', c.name) && isAccountIncludedInNet('credit', c.name)).forEach(c => predictedNet -= (weekCreditSnap[c.name] || 0));
    }

    const checkinCurrentAccounts = cfg.current_accounts.filter(acc => isFinalWeek || isAccountTrackedWeekly('current', acc));
    const checkinCreditAccounts = cfg.credit_accounts.filter(c => isFinalWeek || isAccountTrackedWeekly('credit', c.name));
    const checkinSavingsAccounts = cfg.track_savings ? cfg.savings_accounts.filter(s => isFinalWeek || isAccountTrackedWeekly('savings', s)) : [];

    let actCurrentSum = 0, actCreditSpentSum = 0, actSavingsSum = 0;
    let hasActualEntry = false;

    checkinCurrentAccounts.forEach(acc => {
      if (actuals[`curr_${acc}`] !== undefined && actuals[`curr_${acc}`] !== "" && actuals[`curr_${acc}`] !== null) {
        hasActualEntry = true;
        if (isAccountIncludedInNet('current', acc)) {
          actCurrentSum += parseFloat(actuals[`curr_${acc}`]) || 0;
        }
      } else if (isAccountIncludedInNet('current', acc)) {
        actCurrentSum += (weekCurrentSnap[acc] || 0);
      }
    });

    checkinCreditAccounts.forEach(c => {
      let cardSpent = 0;
      if (actuals[`c_avail_${c.name}`] !== undefined && actuals[`c_avail_${c.name}`] !== "") {
        cardSpent = (Number(c.limit) || 0) - (parseFloat(actuals[`c_avail_${c.name}`]) || 0);
        hasActualEntry = true;
      } else if (actuals[`c_spent_${c.name}`] !== undefined && actuals[`c_spent_${c.name}`] !== "") {
        cardSpent = parseFloat(actuals[`c_spent_${c.name}`]) || 0;
        hasActualEntry = true;
      } else {
        cardSpent = (weekCreditSnap[c.name] || 0);
      }
      if (isAccountIncludedInNet('credit', c.name)) {
        actCreditSpentSum += cardSpent;
      }
    });

    checkinSavingsAccounts.forEach(s => {
      if (actuals[`sav_${s}`] !== undefined && actuals[`sav_${s}`] !== "") {
        hasActualEntry = true;
        if (isAccountIncludedInNet('savings', s)) {
          actSavingsSum += parseFloat(actuals[`sav_${s}`]) || 0;
        }
      } else if (isAccountIncludedInNet('savings', s)) {
        actSavingsSum += (weekSavingsSnap[s] || 0);
      }
    });

    let actualNet = null, variance = null;
    if (hasActualEntry) {
      actualNet = actCurrentSum + actSavingsSum - actCreditSpentSum;
      variance = actualNet - predictedNet;
    }

    weeklyPredictions.push({
      wSpend: wExpenseSum,
      wIncomeSum: wIncomeSum,
      wDDs: wDDs,
      wDDTotal: wDDTotal,
      wIncomes: wIncomes,
      wIncomeTotal: wIncomeTotal,
      autopaysDue: autopaysDue,
      weekCurrentSnap: weekCurrentSnap,
      weekCreditSnap: weekCreditSnap,
      weekSavingsSnap: weekSavingsSnap,
      sumWeekCurrent: sumWeekCurrent,
      sumWeekCredit: sumWeekCredit,
      sumWeekSavings: sumWeekSavings,
      predictedNet: predictedNet,
      actualNet: actualNet,
      variance: variance
    });
  });

  const finalWeekPred = weeklyPredictions.length > 0 ? weeklyPredictions[weeklyPredictions.length - 1] : { sumWeekCurrent: 0, sumWeekCredit: 0, sumWeekSavings: 0, predictedNet: 0, weekCurrentSnap: {}, weekCreditSnap: {}, weekSavingsSnap: {} };
  const projectedMonthEndCurrent = finalWeekPred.sumWeekCurrent;
  const projectedMonthEndCredit = finalWeekPred.sumWeekCredit;
  const projectedMonthEndSavings = finalWeekPred.sumWeekSavings;

  let projectedMonthEndNet = 0;
  cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).forEach(a => projectedMonthEndNet += (finalWeekPred.weekCurrentSnap[a] || 0));
  if (cfg.track_savings) {
    cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).forEach(s => projectedMonthEndNet += (finalWeekPred.weekSavingsSnap[s] || 0));
  }
  cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).forEach(c => projectedMonthEndNet -= (finalWeekPred.weekCreditSnap[c.name] || 0));

  const totalOutgoings = totalDD + totalWeeklySpend;
  const weeklyAvg = schedule.numWeeks > 0 ? totalWeeklySpend / schedule.numWeeks : 0;

  const totalAutoPayMonth = cfg.credit_accounts.reduce((sum, c) => {
    if (c.autopay_enabled) {
      const debt = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
      return sum + (c.autopay_type === 'full' ? debt : Math.min(debt, Number(c.autopay_fixed_amt) || 0));
    }
    return sum;
  }, 0);

  let latestVariance = null;
  for (let i = weeklyPredictions.length - 1; i >= 0; i--) {
    if (weeklyPredictions[i].variance !== null) {
      latestVariance = weeklyPredictions[i].variance;
      break;
    }
  }

  const enabledWidgets = cfg.enabled_widgets || ["current_projected", "credit_projected", "savings_projected", "net_position", "total_outgoings"];
  const numInNet = cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).length +
                   (cfg.track_savings ? cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).length : 0) +
                   cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).length;

  const widgetHTMLMap = {
    current_projected: `
      <div class="kpi-card">
        <div class="kpi-title">🏦 Current Accounts (Month-End)</div>
        <div class="kpi-val ${projectedMonthEndCurrent >= 0 ? 'green' : 'red'}">${curr}${projectedMonthEndCurrent.toFixed(2)}</div>
        <div class="kpi-sub">Start: ${curr}${totalCurrentOpening.toFixed(2)} • In: +${curr}${totalCurrentInflow.toFixed(2)} • Out: -${curr}${(totalDD + totalWeeklyCurrentSpend + totalAutoPayMonth).toFixed(2)}</div>
      </div>
    `,
    current_opening: `
      <div class="kpi-card">
        <div class="kpi-title">🏦 Current Starting Balance</div>
        <div class="kpi-val">${curr}${totalCurrentOpening.toFixed(2)}</div>
        <div class="kpi-sub">+${curr}${totalCurrentInflow.toFixed(2)} Inflows</div>
      </div>
    `,
    credit_projected: `
      <div class="kpi-card">
        <div class="kpi-title">💳 Credit Cards (Month-End Debt)</div>
        <div class="kpi-val ${projectedMonthEndCredit > 0 ? 'red' : 'green'}">-${curr}${projectedMonthEndCredit.toFixed(2)}</div>
        <div class="kpi-sub">Avail: ${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(2)} / ${curr}${totalCreditLimit.toFixed(2)}</div>
      </div>
    `,
    credit_avail: `
      <div class="kpi-card">
        <div class="kpi-title">💳 Available Credit Line</div>
        <div class="kpi-val green">${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(2)}</div>
        <div class="kpi-sub">Total Line across ${cfg.credit_accounts.length} Cards</div>
      </div>
    `,
    savings_projected: `
      <div class="kpi-card">
        <div class="kpi-title">📈 Savings Portfolio (Month-End)</div>
        <div class="kpi-val purple">${curr}${projectedMonthEndSavings.toFixed(2)}</div>
        <div class="kpi-sub">Net Growth: +${curr}${(projectedMonthEndSavings - totalSavingsOpening).toFixed(2)} (${cfg.savings_accounts.length} Accounts)</div>
      </div>
    `,
    savings_growth: `
      <div class="kpi-card">
        <div class="kpi-title">📈 Savings Net Growth</div>
        <div class="kpi-val purple">+${curr}${(projectedMonthEndSavings - totalSavingsOpening).toFixed(2)}</div>
        <div class="kpi-sub">Transfers & automated deposits (${activeTab})</div>
      </div>
    `,
    net_position: `
      <div class="kpi-card">
        <div class="kpi-title">💎 Net Position (Month-End)</div>
        <div class="kpi-val ${projectedMonthEndNet >= 0 ? 'green' : 'red'}">${curr}${projectedMonthEndNet.toFixed(2)}</div>
        <div class="kpi-sub">${numInNet} Accounts in Net (${activeTab})</div>
      </div>
    `,
    total_outgoings: `
      <div class="kpi-card">
        <div class="kpi-title">📉 Total Month Outgoings</div>
        <div class="kpi-val">${curr}${totalOutgoings.toFixed(2)}</div>
        <div class="kpi-sub">Direct Debits: ${curr}${totalDD.toFixed(2)} • Weekly: ${curr}${totalWeeklySpend.toFixed(2)}</div>
      </div>
    `,
    weekly_avg: `
      <div class="kpi-card">
        <div class="kpi-title">📅 Weekly Expense Average</div>
        <div class="kpi-val">${curr}${weeklyAvg.toFixed(2)}</div>
        <div class="kpi-sub">Spread across ${schedule.numWeeks} Weeks</div>
      </div>
    `,
    actual_variance: `
      <div class="kpi-card">
        <div class="kpi-title">🎯 Latest Actual Variance</div>
        <div class="kpi-val ${latestVariance === null ? '' : (latestVariance >= 0 ? 'green' : 'red')}">
          ${latestVariance === null ? '-' : (latestVariance >= 0 ? '+' : '') + curr + latestVariance.toFixed(2)}
        </div>
        <div class="kpi-sub">${latestVariance === null ? 'No actuals entered' : (latestVariance >= 0 ? 'Surplus (Under Budget)' : 'Overspent vs Plan')}</div>
      </div>
    `
  };

  let html = `<div class="kpi-grid">${enabledWidgets.map(wId => widgetHTMLMap[wId] || '').join('')}</div>`;

  // Summary Cashflow boxes
  html += `
    <div class="summary-breakdown-grid">
      <div class="summary-breakdown-card">
        <h4 style="color:var(--curr-border);">🏦 Current Accounts Cashflow</h4>
        <div class="summary-breakdown-list">
          <div class="summary-breakdown-row"><span>Opening Balances:</span><strong>${curr}${totalCurrentOpening.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--green);"><span>Salary / Deductions Inflow:</span><strong>+${curr}${totalCurrentInflow.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--red);"><span>Direct Debits:</span><strong>-${curr}${totalDD.toFixed(2)}</strong></div>
          ${totalAutoPayMonth > 0 ? `<div class="summary-breakdown-row" style="color:var(--amber);"><span>Credit Auto-Pay Transfers:</span><strong>-${curr}${totalAutoPayMonth.toFixed(2)}</strong></div>` : ''}
          <div class="summary-breakdown-row"><span>Weekly Current Expenses:</span><strong>-${curr}${totalWeeklyCurrentSpend.toFixed(2)}</strong></div>
          <div class="summary-breakdown-total">
            <span>Projected Month-End:</span>
            <span style="color:${projectedMonthEndCurrent >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${projectedMonthEndCurrent.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="summary-breakdown-card">
        <h4 style="color:var(--amber);">💳 Credit Cards Position</h4>
        <div class="summary-breakdown-list">
          <div class="summary-breakdown-row"><span>Opening Debt:</span><strong style="color:var(--red);">-${curr}${totalCreditOpeningSpent.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--green);"><span>Auto-Pay Settlements:</span><strong>+${curr}${totalAutoPayMonth.toFixed(2)}</strong></div>
          <div class="summary-breakdown-row" style="color:var(--red);"><span>Planned Card Expenses:</span><strong>-${curr}${(totalWeeklySpend - totalWeeklyCurrentSpend).toFixed(2)}</strong></div>
          <div class="summary-breakdown-total">
            <span>Month-End Debt:</span>
            <span style="color:${projectedMonthEndCredit > 0 ? 'var(--red)' : 'var(--green)'};">-${curr}${projectedMonthEndCredit.toFixed(2)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); text-align:right;">Available Credit Line: ${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(2)}</div>
        </div>
      </div>

      ${cfg.track_savings ? `
        <div class="summary-breakdown-card">
          <h4 style="color:var(--purple);">📈 Savings Portfolio Growth</h4>
          <div class="summary-breakdown-list">
            <div class="summary-breakdown-row"><span>Opening Balance:</span><strong>${curr}${totalSavingsOpening.toFixed(2)}</strong></div>
            <div class="summary-breakdown-row" style="color:var(--purple);"><span>Salary Savings Inflow:</span><strong>+${curr}${totalSalarySavingsIn.toFixed(2)}</strong></div>
            <div class="summary-breakdown-row" style="color:var(--purple);"><span>Direct Debit Standing Orders:</span><strong>+${curr}${Object.values(autoSavingsFromDD).reduce((s, v) => s + v, 0).toFixed(2)}</strong></div>
            <div class="summary-breakdown-total">
              <span>Projected Portfolio:</span>
              <span style="color:var(--purple);">${curr}${projectedMonthEndSavings.toFixed(2)}</span>
            </div>
            <div style="font-size:11px; color:var(--green); text-align:right; font-weight:bold;">Net Growth: +${curr}${(projectedMonthEndSavings - totalSavingsOpening).toFixed(2)}</div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // WEEKS BREAKDOWN
  const now = new Date();
  const detected = detectCurrentMonthAndWeek(currentYear);
  const isViewingCurrentMonth = (now.getFullYear() === currentYear && detected.month === activeTab);

  html += `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0;">📅 Weekly Cashflow & Discretionary Expenses</h3>
          <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Period: ${schedule.dateRangeStr} • ${schedule.numWeeks} Weeks${cfg.pay_frequency && cfg.pay_frequency !== 'monthly' ? ` • ${cfg.pay_frequency === 'biweekly' ? '🔄 Bi-Weekly Pay' : (cfg.pay_frequency === 'weekly' ? '⚡ Weekly Pay' : (cfg.pay_frequency === 'four_weekly' ? '🏥 4-Weekly Pay' : '🗓️ Semi-Monthly Pay'))}` : ''}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn secondary" style="font-size:12px; padding:5px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="window.budgetApp.setTab('Bills')" title="Manage all scheduled direct debits, standing orders & recurring bills"><span style="font-size:13px;">📅</span> Scheduled Bills</button>
          <button class="btn secondary" style="font-size:12px; padding:5px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="window.budgetApp.openAccountTrackingModal()" title="Configure Baseline Balances, Weekly Column Tracking & Net Position"><span style="font-size:13px;">⚙️</span> Accounts & Tracking</button>
        </div>
      </div>

      <div class="weeks-container">
        ${schedule.weeks.map((wObj, wIdx) => {
          const w = wObj.name;
          const p = weeklyPredictions[wIdx];
          const isFinalWeek = (wIdx === schedule.weeks.length - 1);
          const items = getWeekItems(activeTab, w);
          const actuals = getWeekActuals(activeTab, w);
          const activeUser = appState.activeUser || 'Joint';

          const wEndDateInclusive = new Date(wObj.endDate.getFullYear(), wObj.endDate.getMonth(), wObj.endDate.getDate(), 23, 59, 59);
          const isPast = isViewingCurrentMonth && (now.getTime() > wEndDateInclusive.getTime());
          const isCurrent = isViewingCurrentMonth && (wObj.name === detected.week || (now.getTime() >= wObj.startDate.getTime() && now.getTime() <= wEndDateInclusive.getTime()));

          const columns = [];
          cfg.current_accounts.forEach(acc => {
            const trkWeekly = isAccountTrackedWeekly('current', acc);
            const owner = getAccountOwner('current', acc);
            const matchesFilter = isAccountVisibleToActiveUser('current', acc);
            if ((trkWeekly || isFinalWeek) && matchesFilter) {
              columns.push({
                type: 'current',
                name: acc,
                label: `🏦 ${acc}`,
                owner: owner,
                isMonthlyOnly: !trkWeekly && isFinalWeek
              });
            }
          });

          cfg.credit_accounts.forEach(c => {
            const trkWeekly = isAccountTrackedWeekly('credit', c.name);
            const owner = getAccountOwner('credit', c.name);
            const matchesFilter = isAccountVisibleToActiveUser('credit', c.name);
            if ((trkWeekly || isFinalWeek) && matchesFilter) {
              columns.push({
                type: 'credit',
                name: c.name,
                label: `💳 ${c.name}`,
                limit: c.limit,
                owner: owner,
                isMonthlyOnly: !trkWeekly && isFinalWeek
              });
            }
          });

          if (cfg.track_savings) {
            cfg.savings_accounts.forEach(s => {
              const trkWeekly = isAccountTrackedWeekly('savings', s);
              const owner = getAccountOwner('savings', s);
              const matchesFilter = isAccountVisibleToActiveUser('savings', s);
              if ((trkWeekly || isFinalWeek) && matchesFilter) {
                columns.push({
                  type: 'savings',
                  name: s,
                  label: `📈 ${s}`,
                  owner: owner,
                  isMonthlyOnly: !trkWeekly && isFinalWeek
                });
              }
            });
          }

          return `
            <div id="week-card-${wIdx}" class="week-card ${isCurrent ? 'current-week' : ''} ${isPast ? 'past-week' : ''}">
              <div class="week-header">
                <div>
                  <strong style="font-size:14px; color:var(--heading);">${wObj.label}</strong>
                  ${isCurrent ? '<span class="badge" style="background:#0284c7; color:#fff; margin-left:6px;">Current Week</span>' : ''}
                </div>
                <div style="font-size:12px; color:var(--text-muted);">
                  Expenses: <strong style="color:var(--heading);">${curr}${p.wSpend.toFixed(2)}</strong>
                  ${p.wIncomeSum > 0 ? ` • Income: <strong style="color:var(--green);">+${curr}${p.wIncomeSum.toFixed(2)}</strong>` : ''}
                </div>
              </div>

              ${(typeof getBirthdayOccasionsForWeek === 'function' && getBirthdayOccasionsForWeek(getYearData().birthdays || cfg.birthdays, wObj, schedule, currentYear).length > 0) ? `
                <div style="display:flex; flex-direction:column; gap:6px; margin:6px 0 10px 0;">
                  ${getBirthdayOccasionsForWeek(getYearData().birthdays || cfg.birthdays, wObj, schedule, currentYear).map((b) => `
                    <div style="background:rgba(236, 72, 153, 0.12); border:1px solid rgba(236, 72, 153, 0.35); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:16px;">🎂</span>
                        <strong style="color:#f472b6; font-size:12px;">${b.name} (${b.actualDateStr})</strong>
                        <span style="font-size:11px; color:var(--text-muted);">
                          Budget: <strong>${curr}${b.budgetTotal.toFixed(2)}</strong> &bull; 
                          Spent: <strong>${curr}${b.spentTotal.toFixed(2)}</strong> &bull; 
                          <span style="color:${b.remaining >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:600;">
                            ${b.remaining >= 0 ? `Remaining: ${curr}${b.remaining.toFixed(2)}` : `Overspent by ${curr}${Math.abs(b.remaining).toFixed(2)}`}
                          </span>
                        </span>
                      </div>
                      <button class="btn secondary" style="font-size:10px; padding:2px 8px; border-color:#ec4899; color:#f472b6;" onclick="window.budgetApp.openAddBirthdaySpendModal(${b.originalIdx})">+ Log Gift Spend</button>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${columns.length === 0 ? `
                <div style="padding:16px; text-align:center; color:var(--text-muted); font-style:italic;">No accounts enabled for weekly tracking. Click "⚙️ Accounts & Tracking" to enable weekly columns.</div>
              ` : `
                <div class="week-columns-grid">
                  ${columns.map(col => {
                    const colDDs = (col.type === 'current') 
                      ? p.wDDs.filter(d => (d.account || cfg.current_accounts[0]) === col.name) 
                      : (col.type === 'credit' 
                          ? p.wDDs.filter(d => d.account === col.name) 
                          : p.wDDs.filter(d => d.account === col.name));
                    const colIncomes = (col.type === 'current')
                      ? (p.wIncomes || []).filter(i => (i.account || cfg.current_accounts[0]) === col.name)
                      : (col.type === 'credit'
                          ? (p.wIncomes || []).filter(i => i.account === col.name)
                          : (p.wIncomes || []).filter(i => i.account === col.name));
                    const colSavingsIn = (col.type === 'savings') ? p.wDDs.filter(d => d.transfer_to === col.name) : [];
                    const colAutoPaysOut = (col.type === 'current') ? p.autopaysDue.filter(a => a.from === col.name) : [];
                    const colAutoPaysIn = (col.type === 'credit') ? p.autopaysDue.filter(a => a.card === col.name) : [];

                    const hasScheduled = colDDs.length > 0 || colIncomes.length > 0 || colSavingsIn.length > 0 || colAutoPaysOut.length > 0 || colAutoPaysIn.length > 0;
                    const inNet = isAccountIncludedInNet(col.type, col.name);

                    const colItemsWithIdx = [];
                    items.forEach((it, idx) => {
                      if (it.account_type === col.type && it.account_name === col.name) {
                        colItemsWithIdx.push({ item: it, idx });
                      } else if (!it.account_type && col.type === 'current' && col.name === cfg.current_accounts[0] && it.desc && it.desc.toLowerCase().includes('cash')) {
                        colItemsWithIdx.push({ item: it, idx });
                      } else if (!it.account_type && col.type === 'credit' && col.name === cfg.credit_accounts[0]?.name && (!it.desc || !it.desc.toLowerCase().includes('cash'))) {
                        colItemsWithIdx.push({ item: it, idx });
                      }
                    });

                    let colDiscretionaryNet = 0;
                    colItemsWithIdx.forEach(e => {
                      const amt = Number(e.item.amount) || 0;
                      colDiscretionaryNet = e.item.is_income ? colDiscretionaryNet + amt : colDiscretionaryNet - amt;
                    });

                    let colScheduledNet = 0;
                    if (col.type === 'current') {
                      colDDs.forEach(d => colScheduledNet -= (Number(d.amount) || 0));
                      colIncomes.forEach(i => colScheduledNet += (Number(i.amount) || 0));
                      colAutoPaysOut.forEach(a => colScheduledNet -= (Number(a.amount) || 0));
                    } else if (col.type === 'credit') {
                      colDDs.forEach(d => colScheduledNet -= (Number(d.amount) || 0));
                      colIncomes.forEach(i => colScheduledNet += (Number(i.amount) || 0));
                      colAutoPaysIn.forEach(a => colScheduledNet += (Number(a.amount) || 0));
                    } else if (col.type === 'savings') {
                      colSavingsIn.forEach(d => colScheduledNet += (Number(d.amount) || 0));
                      colIncomes.forEach(i => colScheduledNet += (Number(i.amount) || 0));
                      colDDs.forEach(d => colScheduledNet -= (Number(d.amount) || 0));
                    }

                    const colTotalNet = colDiscretionaryNet + colScheduledNet;

                    return `
                      <div class="week-column" 
                           ondragover="window.budgetApp.handleDragOver(event, this)" 
                           ondragleave="window.budgetApp.handleDragLeave(event, this)" 
                           ondrop="window.budgetApp.handleDrop(event, '${w}', '${col.type}', '${col.name}', this)">
                        
                        <div>
                          <div class="week-column-header">
                            <span style="color:${col.type === 'current' ? 'var(--curr-border)' : (col.type === 'credit' ? 'var(--amber)' : 'var(--purple)')};">
                              ${col.label} ${col.isMonthlyOnly ? '<span style="font-size:9px; color:var(--text-muted); font-weight:normal;">(Monthly)</span>' : ''}
                              ${isMulti && col.owner ? `<span class="badge" style="font-size:9px; background:rgba(255,255,255,0.08); color:var(--text-muted); margin-left:3px;">${col.owner === 'Joint' ? '👥 Joint' : '👤 ' + col.owner}</span>` : ''}
                            </span>
                            <div style="text-align:right;">
                              <span style="color:${colTotalNet >= 0 ? 'var(--green)' : 'var(--text)'}; font-size:12px; font-weight:600;">
                                ${colTotalNet >= 0 ? '+' : ''}${curr}${colTotalNet.toFixed(2)}
                              </span>
                              ${hasScheduled ? `
                                <div style="font-size:9px; color:var(--text-muted);">
                                  Expenses: ${colDiscretionaryNet >= 0 ? '+' : ''}${curr}${colDiscretionaryNet.toFixed(2)} | Scheduled: ${colScheduledNet >= 0 ? '+' : ''}${curr}${colScheduledNet.toFixed(2)}
                                </div>
                              ` : ''}
                            </div>
                          </div>

                          ${hasScheduled ? `
                            <div class="col-scheduled-section">
                              <div style="font-size:10px; font-weight:bold; color:var(--curr-border); text-transform:uppercase; margin-bottom:3px;">📅 Scheduled Items:</div>
                              ${colIncomes.map((i, iIdx) => {
                                const holidayBadge = i.holiday_rule === 'previous' ? '<span title="Previous working day (e.g. Friday)" style="font-size:9px; opacity:0.8;">⬅️</span>' : (i.holiday_rule === 'following' ? '<span title="Following working day (e.g. Monday)" style="font-size:9px; opacity:0.8;">➡️</span>' : '<span title="Exact date" style="font-size:9px; opacity:0.8;">⏸️</span>');
                                const occDateStr = i.actualPaymentDate ? new Date(i.actualPaymentDate).toISOString().slice(0, 10) : '';
                                const isCleared = (i.isRecurring || occDateStr) ? Boolean(i.cleared_dates && occDateStr && i.cleared_dates.includes(occDateStr)) : Boolean(i.auto_cleared || i.status === 'paid');
                                const pDate = i.actualPaymentDate ? new Date(i.actualPaymentDate) : null;
                                const isPastDate = pDate ? (pDate.getTime() <= new Date().setHours(23,59,59,999)) : false;
                                const cleanDesc = (i.rawDesc || i.desc || '').replace(/'/g, "\\'");
                                const sType = i.source_type || 'monthly_payment_in';
                                const sIdx = i.source_idx !== undefined ? i.source_idx : iIdx;
                                const statusBadge = isOpenBankingEnabled ? `<button type="button" class="badge" style="font-size:9px; background:${isCleared ? 'rgba(16,185,129,0.25)' : (isPastDate ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)')}; color:${isCleared ? 'var(--green)' : (isPastDate ? 'var(--amber)' : 'var(--text-muted)')}; border:1px solid ${isCleared ? 'rgba(16,185,129,0.4)' : (isPastDate ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.15)')}; padding:1px 5px; margin-left:3px; cursor:${globalEditMode ? 'pointer' : 'default'};" ${globalEditMode ? `onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${i.amount || 0}, '${occDateStr}')"` : ''} title="${isCleared ? 'Cleared' + (i.matched_payee ? ' (' + i.matched_payee + ')' : '') + (globalEditMode ? '. Click to mark Due' : '') : (isPastDate ? 'Due' : 'Upcoming') + (globalEditMode ? '. Click to mark Cleared' : '')}">${isCleared ? '✓ Cleared' : (isPastDate ? '⚠️ Due' : '⏳ Upcoming')}</button>${globalEditMode ? `<button type="button" class="btn secondary" style="height:17px; width:17px; font-size:8.5px; padding:0; display:inline-flex; align-items:center; justify-content:center; margin-left:2px;" onclick="event.stopPropagation(); window.budgetApp.openManualBillMatchModal('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${i.amount || 0}, '${occDateStr}')" title="Match with Bank Transaction">🔗</button>` : ''}` : '';
                                if (i.isMovable) {
                                  if (!globalEditMode) {
                                    return `<div class="col-scheduled-item recurring" style="cursor:pointer; background:rgba(16,185,129,0.08); border-left:3px solid var(--green);" onclick="window.budgetApp.openRescheduleRecurringModal(${i.source_idx}, '${activeTab}', '${w}', 'income')" title="Click to reschedule or bump forward"><span>📥 ${i.rawDesc || i.desc} (${i.actualDateStr}) ${holidayBadge} ${statusBadge} <span class="badge" style="font-size:9px; background:rgba(16,185,129,0.2); color:var(--green); padding:1px 4px; margin-left:4px;">↔ Move</span></span><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span></div>`;
                                  } else {
                                    return `<div class="col-scheduled-item recurring item-entry-sched" style="background:rgba(16,185,129,0.08); border-left:3px solid var(--green);" draggable="true" ondragstart="window.budgetApp.handleDragStartScheduled(event, ${i.source_idx}, '${activeTab}', '${w}', 'income')" ondragend="window.budgetApp.handleDragEnd(event)"><span><span class="drag-handle" title="Drag to move/bump to another week or account">⠿</span> 📥 ${i.rawDesc || i.desc} (${i.actualDateStr}) ${holidayBadge} ${statusBadge}</span><div style="display:flex; align-items:center; gap:4px;"><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span><button class="move-btn" style="height:18px; width:18px; font-size:9px; padding:0; display:inline-flex; align-items:center; justify-content:center;" title="Reschedule / Bump Forward" onclick="event.stopPropagation(); window.budgetApp.openRescheduleRecurringModal(${i.source_idx}, '${activeTab}', '${w}', 'income')">↔</button></div></div>`;
                                  }
                                } else {
                                  return `<div class="col-scheduled-item" style="background:rgba(16,185,129,0.08); border-left:3px solid var(--green);"><span>📥 ${i.desc} (${i.actualDateStr}) ${holidayBadge} ${statusBadge}</span><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span></div>`;
                                }
                              }).join('')}
                              ${colDDs.map((d, dIdx) => {
                                const occDateStr = d.actualPaymentDate ? new Date(d.actualPaymentDate).toISOString().slice(0, 10) : '';
                                const isCleared = (d.isRecurring || occDateStr) ? Boolean(d.cleared_dates && occDateStr && d.cleared_dates.includes(occDateStr)) : Boolean(d.auto_cleared || d.status === 'paid');
                                const pDate = d.actualPaymentDate ? new Date(d.actualPaymentDate) : null;
                                const isPastDate = pDate ? (pDate.getTime() <= new Date().setHours(23,59,59,999)) : false;
                                const cleanDesc = (d.rawDesc || d.desc || '').replace(/'/g, "\\'");
                                const sType = d.source_type || 'direct_debit';
                                const sIdx = d.source_idx !== undefined ? d.source_idx : dIdx;
                                const statusBadge = isOpenBankingEnabled ? `<button type="button" class="badge" style="font-size:9px; background:${isCleared ? 'rgba(16,185,129,0.25)' : (isPastDate ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)')}; color:${isCleared ? 'var(--green)' : (isPastDate ? 'var(--amber)' : 'var(--text-muted)')}; border:1px solid ${isCleared ? 'rgba(16,185,129,0.4)' : (isPastDate ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.15)')}; padding:1px 5px; margin-left:3px; cursor:${globalEditMode ? 'pointer' : 'default'};" ${globalEditMode ? `onclick="event.stopPropagation(); window.budgetApp.toggleScheduledBillCleared('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${d.amount || 0}, '${occDateStr}')"` : ''} title="${isCleared ? 'Cleared' + (d.matched_payee ? ' (' + d.matched_payee + ')' : '') + (globalEditMode ? '. Click to mark Due' : '') : (isPastDate ? 'Due' : 'Upcoming') + (globalEditMode ? '. Click to mark Cleared' : '')}">${isCleared ? '✓ Cleared' : (isPastDate ? '⚠️ Due' : '⏳ Upcoming')}</button>${globalEditMode ? `<button type="button" class="btn secondary" style="height:17px; width:17px; font-size:8.5px; padding:0; display:inline-flex; align-items:center; justify-content:center; margin-left:2px;" onclick="event.stopPropagation(); window.budgetApp.openManualBillMatchModal('${sType}', ${sIdx}, '${activeTab}', '${cleanDesc}', ${d.amount || 0}, '${occDateStr}')" title="Match with Bank Transaction">🔗</button>` : ''}` : '';
                                if (d.isMovable) {
                                  if (!globalEditMode) {
                                    return `<div class="col-scheduled-item recurring" style="cursor:pointer;" onclick="window.budgetApp.openRescheduleRecurringModal(${d.source_idx}, '${activeTab}', '${w}')" title="Click to reschedule or bump forward"><span>${d.desc} (${d.actualDateStr}) ${statusBadge} <span class="badge" style="font-size:9px; background:rgba(56,189,248,0.2); color:var(--curr-border); padding:1px 4px; margin-left:4px;">↔ Move</span></span><span style="color:var(--red); font-weight:600;">-${curr}${Number(d.amount).toFixed(2)}</span></div>`;
                                  } else {
                                    return `<div class="col-scheduled-item recurring item-entry-sched" draggable="true" ondragstart="window.budgetApp.handleDragStartScheduled(event, ${d.source_idx}, '${activeTab}', '${w}')" ondragend="window.budgetApp.handleDragEnd(event)"><span><span class="drag-handle" title="Drag to move/bump to another week or account">⠿</span> ${d.desc} (${d.actualDateStr}) ${statusBadge}</span><div style="display:flex; align-items:center; gap:4px;"><span style="color:var(--red); font-weight:600;">-${curr}${Number(d.amount).toFixed(2)}</span><button class="move-btn" style="height:18px; width:18px; font-size:9px; padding:0; display:inline-flex; align-items:center; justify-content:center;" title="Reschedule / Bump Forward" onclick="event.stopPropagation(); window.budgetApp.openRescheduleRecurringModal(${d.source_idx}, '${activeTab}', '${w}')">↔</button></div></div>`;
                                  }
                                } else {
                                  return `<div class="col-scheduled-item"><span>${d.desc} (${d.actualDateStr}) ${statusBadge}</span><span style="color:var(--red);">-${curr}${Number(d.amount).toFixed(2)}</span></div>`;
                                }
                              }).join('')}
                              ${colSavingsIn.map(d => `<div class="col-scheduled-item transfer"><span>➔ Transfer from ${d.desc}</span><span style="color:var(--purple); font-weight:bold;">+${curr}${Number(d.amount).toFixed(2)}</span></div>`).join('')}
                              ${colAutoPaysOut.map(a => `<div class="col-scheduled-item autopay-out"><span>💳 Auto-Pay to ${a.card}</span><span style="color:var(--red);">-${curr}${Number(a.amount).toFixed(2)}</span></div>`).join('')}
                              ${colAutoPaysIn.map(a => `<div class="col-scheduled-item autopay-in"><span>✓ Auto-Pay payment</span><span style="color:var(--green);">+${curr}${Number(a.amount).toFixed(2)}</span></div>`).join('')}
                            </div>
                          ` : ''}

                          <div class="item-list">
                            ${col.isMonthlyOnly && colItemsWithIdx.length === 0 ? `
                              <div style="font-size:11px; color:var(--text-muted); padding:4px 0; font-style:italic;">Monthly account (reconciliation)</div>
                            ` : colItemsWithIdx.length === 0 ? `
                              <div style="font-size:11px; color:var(--text-muted); padding:4px 0; font-style:italic;">No entries</div>
                            ` : colItemsWithIdx.map(entry => {
                              if (!globalEditMode) {
                                return `
                                  <div class="item-view-row ${entry.item.is_income ? 'income' : 'expense'}">
                                    <span class="item-view-desc">${entry.item.desc || 'Item'}</span>
                                    <span class="item-view-amt">${entry.item.is_income ? '+' : ''}${curr}${Number(entry.item.amount || 0).toFixed(2)}</span>
                                  </div>
                                `;
                              } else {
                                return `
                                  <div class="item-entry" draggable="true" ondragstart="window.budgetApp.handleDragStart(event, '${activeTab}', '${w}', ${entry.idx})" ondragend="window.budgetApp.handleDragEnd(event)">
                                    <span class="drag-handle" title="Drag to any week or column">⠿</span>
                                    <select onchange="window.budgetApp.editWeekItemType('${w}', ${entry.idx}, this.value)" style="padding:2px; font-size:11px; color:${entry.item.is_income ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">
                                      <option value="expense" ${!entry.item.is_income ? 'selected' : ''}>- Expense</option>
                                      <option value="income" ${entry.item.is_income ? 'selected' : ''}>+ Income</option>
                                    </select>
                                    <input type="text" value="${entry.item.desc}" onchange="window.budgetApp.editWeekItem('${w}', ${entry.idx}, 'desc', this.value)">
                                    <input type="number" step="0.01" value="${entry.item.amount}" onchange="window.budgetApp.editWeekItem('${w}', ${entry.idx}, 'amount', this.value)" style="text-align:right;">
                                    <button class="move-btn" title="Move item to another month or week" onclick="window.budgetApp.openMoveItemModal('${activeTab}', '${w}', ${entry.idx})">↔</button>
                                    <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteWeekItem('${w}', ${entry.idx})">&times;</button>
                                  </div>
                                `;
                              }
                            }).join('')}
                          </div>

                          ${globalEditMode && !col.isMonthlyOnly ? `
                            <div class="col-input-add">
                              <select id="type-${w}-${col.name}">
                                <option value="expense">- Expense</option>
                                <option value="income">+ Income</option>
                              </select>
                              <input type="text" id="desc-${w}-${col.name}" placeholder="Description...">
                              <input type="number" step="0.01" id="amt-${w}-${col.name}" placeholder="${curr}">
                              <button class="btn green" onclick="window.budgetApp.addWeekItemToColumn('${w}', '${col.type}', '${col.name}')">+</button>
                            </div>
                          ` : ''}
                        </div>

                        <div class="col-footer-box">
                          <div class="col-pred-box">
                            ${col.type === 'current' ? `
                              <span>Predicted Balance:</span>
                              <strong style="color:${(p.weekCurrentSnap[col.name] || 0) >= 0 ? 'var(--heading)' : 'var(--red)'};">${curr}${(p.weekCurrentSnap[col.name] || 0).toFixed(2)}</strong>
                            ` : col.type === 'credit' ? `
                              <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                                <span>Debt: <strong style="color:${(p.weekCreditSnap[col.name] || 0) > 0 ? 'var(--red)' : 'var(--green)'};">-${curr}${(p.weekCreditSnap[col.name] || 0).toFixed(2)}</strong></span>
                                <span style="color:var(--text-muted); font-size:10px;">Available: <strong style="color:var(--green);">${curr}${(Number(col.limit || 0) - (p.weekCreditSnap[col.name] || 0)).toFixed(2)}</strong></span>
                              </div>
                            ` : `
                              <span>Predicted Balance:</span>
                              <strong style="color:var(--purple);">${curr}${(p.weekSavingsSnap[col.name] || 0).toFixed(2)}</strong>
                            `}
                          </div>

                          <div class="col-actual-box">
                            <label>
                              <span>${col.type === 'credit' ? 'Actual Available Credit' : 'Actual Balance'}</span>
                              ${!inNet ? '<span style="font-size:9px; color:var(--text-muted);">(Excl. Net)</span>' : ''}
                            </label>
                            ${(() => {
                              const fieldKey = col.type === 'current' ? `curr_${col.name}` : (col.type === 'credit' ? `c_avail_${col.name}` : `sav_${col.name}`);
                              const val = actuals[fieldKey];
                              const hasVal = (val !== undefined && val !== "" && val !== null);
                              const ts = actuals._timestamps && actuals._timestamps[fieldKey];
                              const source = actuals._sources && actuals._sources[fieldKey];
                              const isAuto = source === 'open_banking';
                              const isManual = source === 'manual';
                              const tsHtml = (hasVal && ts) ? `
                                <div style="font-size:9px; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; justify-content:space-between; gap:3px;">
                                  <div style="display:flex; align-items:center; gap:3px;">
                                    ${isAuto ? '<span style="color:#10b981; font-weight:700;">⚡ Live Sync</span> • ' : (isManual ? '<span style="color:#38bdf8; font-weight:700;">✍️ Manual</span> • ' : '<span>🕒</span>')}<span>${formatCheckInTimestamp(ts)}</span>
                                  </div>
                                  ${isManual && isOpenBankingEnabled && globalEditMode ? `
                                    <button type="button" class="btn secondary" style="height:15px; font-size:8px; padding:0 4px; line-height:1;" onclick="event.stopPropagation(); window.budgetApp.revertActualFieldToBankSync('${w}', '${fieldKey}')" title="Revert to live Open Banking balance">↺ Live</button>
                                  ` : ''}
                                </div>
                              ` : '';

                              if (col.type === 'current') {
                                return `
                                  ${globalEditMode ? `
                                    <input type="number" step="0.01" placeholder="${curr}" value="${hasVal ? val : ''}" onchange="window.budgetApp.updateActualField('${w}', '${fieldKey}', this.value)">
                                  ` : `
                                    <div class="actual-field-view">${hasVal ? curr + Number(val).toFixed(2) : '<span style="color:var(--text-muted);">-</span>'}</div>
                                  `}
                                  ${tsHtml}
                                `;
                              } else if (col.type === 'credit') {
                                return `
                                  ${globalEditMode ? `
                                    <input type="number" step="0.01" placeholder="${curr}" value="${hasVal ? val : ''}" onchange="window.budgetApp.updateActualField('${w}', '${fieldKey}', this.value)">
                                  ` : `
                                    <div class="actual-field-view">${hasVal ? curr + Number(val).toFixed(2) : '<span style="color:var(--text-muted);">-</span>'}</div>
                                  `}
                                  ${tsHtml}
                                `;
                              } else {
                                const predVal = p.weekSavingsSnap[col.name] || 0;
                                const actVal = Number(val) || 0;
                                const diffVal = actVal - predVal;
                                const pctVal = predVal > 0 ? ((diffVal / predVal) * 100) : 0;
                                return `
                                  ${globalEditMode ? `
                                    <input type="number" step="0.01" placeholder="${curr}" value="${hasVal ? val : ''}" onchange="window.budgetApp.updateActualField('${w}', '${fieldKey}', this.value)">
                                  ` : `
                                    <div class="actual-field-view">${hasVal ? curr + Number(val).toFixed(2) : '<span style="color:var(--text-muted);">-</span>'}</div>
                                    ${hasVal ? `
                                      <div style="font-size:10px; margin-top:2px; font-weight:600; color:${diffVal >= 0 ? 'var(--green)' : 'var(--red)'};">
                                        Growth: ${diffVal >= 0 ? '+' : ''}${curr}${diffVal.toFixed(2)} (${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%)
                                      </div>
                                    ` : ''}
                                  `}
                                  ${tsHtml}
                                `;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}

              ${(() => {
                if (!isOpenBankingEnabled) return '';
                const txns = (appState.data && appState.data.open_banking_transactions) || [];
                if (!txns || txns.length === 0) return '';
                const wStart = wObj.startDate.getTime();
                const wEnd = new Date(wObj.endDate.getFullYear(), wObj.endDate.getMonth(), wObj.endDate.getDate(), 23, 59, 59).getTime();
                const weekTxns = txns.filter(t => {
                  if (!t.booking_date) return false;
                  const tTime = new Date(t.booking_date + (t.booking_date.includes('T') ? '' : 'T12:00:00')).getTime();
                  return tTime >= wStart && tTime <= wEnd;
                });
                if (weekTxns.length === 0) return '';
                const weekTotalSpent = weekTxns.reduce((acc, t) => acc + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
                return `
                  <div style="margin:8px 0 2px 0; background:rgba(0,0,0,0.12); border:1px solid var(--border); border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <div style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                      <span>⚡ <strong>${weekTxns.length}</strong> Live Bank Transactions</span>
                      <span style="color:var(--heading); font-weight:600;">(${curr}${weekTotalSpent.toFixed(2)} tracked)</span>
                    </div>
                    <button class="btn secondary" style="font-size:10.5px; padding:2px 8px;" onclick="window.budgetApp.openTransactionLedgerModal(${wIdx}, '${activeTab}')">View Transactions</button>
                  </div>
                `;
              })()}

              ${(() => {
                const isDailyPacingOn = Boolean(isCurrent && cfg.open_banking?.enabled && cfg.open_banking?.live_daily_variance !== false);
                if (isDailyPacingOn) {
                  const pacing = calculateLiveDailyPacing(wObj, p, actuals, cfg);
                  return `
                    <div class="week-summary-bar" style="background:rgba(2,132,199,0.08); border-top:1px solid rgba(2,132,199,0.25); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                      <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                        <span title="Planned total outgoings for the full week">Week Outgoings: <strong style="color:var(--curr-border);">${curr}${(p.wDDTotal + p.autopaysDue.reduce((s, a) => s + a.amount, 0) + (p.wSpend - p.wIncomeSum)).toFixed(2)}</strong></span>
                        <span title="Predicted Net Cash Position for today (Day ${pacing.elapsedDays} of ${pacing.totalDays}) factoring in cleared bills and daily discretionary spending pace">
                          Predicted Net Today <span style="font-size:10px; color:var(--text-muted);">(Day ${pacing.elapsedDays}/${pacing.totalDays})</span>: 
                          <strong style="color:${pacing.pacedTargetNetToday >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${pacing.pacedTargetNetToday.toFixed(2)}</strong>
                        </span>
                        <span title="Predicted final closing Net Cash Position (Current + Savings - Credit Debt) at the end of this week">
                          Predicted Net (End of Week): <strong style="color:${p.predictedNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.predictedNet.toFixed(2)}</strong>
                        </span>
                        ${p.actualNet !== null ? `<span title="Current live actual Net Cash Position (Current + Savings - Credit Debt) from bank check-in">Live Net: <strong style="color:${p.actualNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.actualNet.toFixed(2)}</strong></span>` : ''}
                      </div>
                      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        ${pacing.liveDailyVariance !== null ? `
                          <div class="variance-badge ${pacing.liveDailyVariance >= 0 ? 'surplus' : 'overspent'}" style="display:inline-flex; align-items:center; gap:5px; padding:3px 8px; font-size:11.5px;" title="Live variance against today's day-by-day pace">
                            <span>${pacing.liveDailyVariance >= 0 ? `✨ +${curr}${pacing.liveDailyVariance.toFixed(2)}` : `⚠️ -${curr}${Math.abs(pacing.liveDailyVariance).toFixed(2)}`} Today</span>
                            <span style="font-size:9px; opacity:0.85; background:rgba(0,0,0,0.2); padding:1px 4px; border-radius:3px;">Day ${pacing.elapsedDays}/${pacing.totalDays}</span>
                          </div>
                        ` : ''}
                        ${p.variance !== null ? `
                          <div class="variance-badge ${p.variance >= 0 ? 'surplus' : 'overspent'}" style="display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:11.5px; opacity:0.9;" title="Variance of current live net balance compared against final end-of-week predicted net target">
                            <span>${p.variance >= 0 ? `+${curr}${p.variance.toFixed(2)}` : `-${curr}${Math.abs(p.variance).toFixed(2)}`} vs End-of-Week Net</span>
                          </div>
                        ` : (!pacing.liveDailyVariance ? '<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Sync bank account to calculate variance</span>' : '')}
                      </div>
                    </div>
                  `;
                }

                return `
                  <div class="week-summary-bar">
                    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                      <span>Week Outgoings: <strong style="color:var(--curr-border);">${curr}${(p.wDDTotal + p.autopaysDue.reduce((s, a) => s + a.amount, 0) + (p.wSpend - p.wIncomeSum)).toFixed(2)}</strong></span>
                      <span>Predicted Net: <strong style="color:${p.predictedNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.predictedNet.toFixed(2)}</strong></span>
                      ${p.actualNet !== null ? `<span>Actual Net: <strong style="color:${p.actualNet >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${p.actualNet.toFixed(2)}</strong></span>` : ''}
                    </div>
                    ${p.variance !== null ? `
                      <div class="variance-badge ${p.variance >= 0 ? 'surplus' : 'overspent'}">
                        ${p.variance >= 0 ? `✨ ${curr}${p.variance.toFixed(2)} Surplus (Under Budget)` : `⚠️ ${curr}${Math.abs(p.variance).toFixed(2)} Overspent`}
                      </div>
                    ` : '<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Enter actual check-in above to calculate variance</span>'}
                  </div>
                `;
              })()}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // SALARIES & DEDUCTIONS + SCHEDULED BILLS PANELS
  html += `
    <div style="display:flex; flex-direction:column; gap:16px; margin-top:4px;">
      ${isMulti ? `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
            <div>
              <h3 style="margin:0;">👥 Household Salaries & Personal Deductions</h3>
              <span style="font-size:11.5px; color:var(--text-muted);">Manage separate income and deduction items for each individual household member.</span>
            </div>
            <button class="btn secondary" style="font-size:11px; padding:2px 8px;" onclick="window.budgetApp.propagateDeductions('${activeTab}')" title="Copy this month's salaries and deductions to all following months in ${appState.currentYear}">📋 Propagate to Future Months</button>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:16px;">
            ${cfg.people.map(p => {
              const isUnlockedForUser = (appState.activeUser === p && isUserUnlocked(p));
              const isRevealed = isUnlockedForUser || (appState.unmaskedSalaries && appState.unmaskedSalaries[p]);
              const isHidden = isPersonSalaryHidden(p) && !isRevealed;
              const pTotals = personTotals[p] || { salary: 0, out: 0, leftover: 0 };

              const pItems = [];
              deducts.forEach((d, origIdx) => {
                let amt = 0;
                let belongs = false;
                if (d.person === p) {
                  amt = Number(d.amount) || 0;
                  belongs = true;
                } else if (d.amounts && typeof d.amounts[p] !== 'undefined') {
                  amt = Number(d.amounts[p]) || 0;
                  if (amt > 0 || d.is_salary || !d.person) belongs = true;
                }
                if (belongs) {
                  pItems.push({ d, origIdx, amt });
                }
              });

              return `
                <div style="background:var(--card-bg, rgba(255,255,255,0.03)); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between;">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border);">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:14px; font-weight:bold; color:var(--heading);">👤 ${p}'s Deductions</span>
                        ${isPersonSalaryHidden(p) ? `
                          <button class="btn secondary" style="padding:1px 6px; font-size:10px; min-height:20px; line-height:1;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="${isRevealed ? 'Hide salary' : 'Unlock / Reveal salary'}">
                            ${isRevealed ? '🙈' : '👁️'}
                          </button>
                        ` : ''}
                      </div>
                      <div>
                        <span style="font-size:11px; color:var(--text-muted);">Leftover: </span>
                        <strong style="color:${pTotals.leftover >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:12.5px;">
                          ${isHidden ? '••••••' : `${curr}${pTotals.leftover.toFixed(2)}`}
                        </strong>
                      </div>
                    </div>

                    <table class="table" style="font-size:11.5px; margin:0 0 10px 0;">
                      <thead>
                        <tr>
                          <th>Item / Category</th>
                          <th>Transfer To</th>
                          <th class="text-right">Amount</th>
                          ${globalEditMode ? '<th></th>' : ''}
                        </tr>
                      </thead>
                      <tbody>
                        ${pItems.length === 0 ? `
                          <tr>
                            <td colspan="${globalEditMode ? 4 : 3}" style="text-align:center; color:var(--text-muted); font-size:11px; padding:10px;">No salary or deduction items for ${p}.</td>
                          </tr>
                        ` : pItems.map(item => {
                          const d = item.d;
                          const origIdx = item.origIdx;
                          const val = item.amt;
                          const itemHidden = d.is_salary && isHidden;
                          const salInfo = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule) : null;
                          const isMultiPay = salInfo && salInfo.count > 1;
                          return `
                            <tr>
                              <td>
                                ${globalEditMode ? `
                                  <div style="display:flex; flex-direction:column; gap:2px;">
                                    <input class="table-input" type="text" value="${d.name}" onchange="window.budgetApp.editDeductionName(${origIdx}, this.value)">
                                    ${d.is_salary ? `
                                      <select class="table-input" style="font-size:9.5px; padding:1px 2px; color:var(--text-muted);" onchange="window.budgetApp.editDeductionFrequency(${origIdx}, this.value)">
                                        <option value="monthly" ${d.frequency === 'monthly' || !d.frequency ? 'selected' : ''}>📅 Monthly</option>
                                        <option value="biweekly" ${d.frequency === 'biweekly' ? 'selected' : ''}>🔄 Bi-Weekly</option>
                                        <option value="four_weekly" ${d.frequency === 'four_weekly' ? 'selected' : ''}>🏥 4-Weekly</option>
                                        <option value="weekly" ${d.frequency === 'weekly' ? 'selected' : ''}>⚡ Weekly</option>
                                        <option value="semi_monthly" ${d.frequency === 'semi_monthly' ? 'selected' : ''}>🗓️ Semi-Monthly</option>
                                      </select>
                                    ` : ''}
                                  </div>
                                ` : `
                                  <div style="display:flex; flex-direction:column; gap:1px;">
                                    <div style="display:flex; align-items:center; gap:4px;">
                                      <span>${d.is_salary ? '💰' : '📄'}</span>
                                      <strong>${d.name}</strong>
                                    </div>
                                    ${(d.is_salary && d.frequency && d.frequency !== 'monthly') ? `
                                      <span style="font-size:9.5px; color:var(--curr-border); font-weight:600;">
                                        ${d.frequency === 'biweekly' ? '🔄 Bi-Weekly' : (d.frequency === 'weekly' ? '⚡ Weekly' : (d.frequency === 'four_weekly' ? '🏥 4-Weekly' : '🗓️ Semi-Monthly'))} (${salInfo ? salInfo.count : 1}x this mo)
                                      </span>
                                    ` : ''}
                                  </div>
                                `}
                              </td>
                              <td>
                                ${globalEditMode ? `
                                  <select class="table-input" onchange="window.budgetApp.editDeductionTarget(${origIdx}, this.value)">
                                    <option value="none" ${d.target_account === 'none' ? 'selected' : ''}>None (Personal)</option>
                                    <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                                    <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                                  </select>
                                ` : (d.target_account !== 'none' ? `<span style="color:var(--curr-border); font-weight:600;">➔ ${d.target_account}</span>` : '<span style="color:var(--text-muted);">Personal</span>')}
                              </td>
                              <td class="text-right">
                                ${globalEditMode ? (
                                  itemHidden ? `
                                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:2px;">
                                      <input class="table-input text-right" type="password" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${origIdx}, '${p}', this.value)" style="letter-spacing:2px; width:65px;">
                                      <button class="btn secondary" style="padding:1px 3px; font-size:9px; min-height:18px;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="Reveal">👁️</button>
                                    </div>
                                  ` : `
                                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                      <input class="table-input text-right" type="number" step="0.01" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${origIdx}, '${p}', this.value)" style="width:70px;">
                                      ${(d.is_salary && isMultiPay) ? `<span style="font-size:9px; color:var(--text-muted);">${curr}${salInfo.total.toFixed(2)}/mo</span>` : ''}
                                    </div>
                                  `
                                ) : (
                                  itemHidden ? `
                                    <span style="font-family:monospace; letter-spacing:2px; color:var(--text-muted); cursor:pointer;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="Salary hidden (click to unlock/reveal)">••••••</span>
                                  ` : `
                                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                      <strong style="color:${d.is_salary ? 'var(--green)' : 'var(--text)'};">${curr}${Number(val).toFixed(2)}${d.is_salary && d.frequency && d.frequency !== 'monthly' ? `<span style="font-size:9.5px; font-weight:normal; color:var(--text-muted);">/paycheck</span>` : ''}</strong>
                                      ${(d.is_salary && isMultiPay) ? `<span style="font-size:9.5px; color:var(--text-muted); font-weight:600;">= ${curr}${salInfo.total.toFixed(2)} total</span>` : ''}
                                    </div>
                                  `
                                )}
                              </td>
                              ${globalEditMode ? `<td class="text-right"><button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteSalaryDeduction(${origIdx})">&times;</button></td>` : ''}
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>

                    ${globalEditMode ? `
                      <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:6px; padding:6px 8px; margin-top:6px;">
                        <div style="font-size:10.5px; font-weight:bold; color:var(--curr-border); margin-bottom:4px;">+ Add Item for ${p}</div>
                        <div style="display:grid; grid-template-columns: 1fr 100px 70px 26px; gap:4px; align-items:center;">
                          <input type="text" id="new-deduct-name-${p}" placeholder="Item (e.g. Salary, Loan)" style="font-size:11px;">
                          <select id="new-deduct-target-${p}" style="font-size:10.5px;">
                            <option value="none">None</option>
                            <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
                            <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
                          </select>
                          <input type="number" step="0.01" id="new-deduct-amt-${p}" placeholder="${curr}" style="font-size:11px; text-align:right;">
                          <button class="btn green" style="padding:0; height:24px; justify-content:center;" onclick="window.budgetApp.addSalaryDeductionForPerson('${p}')">+</button>
                        </div>
                        <div style="margin-top:3px;">
                          <label style="font-size:10px; cursor:pointer; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                            <input type="checkbox" id="new-deduct-issalary-${p}"> Is Salary / Income
                          </label>
                        </div>
                      </div>
                    ` : ''}
                  </div>

                  <div style="background:rgba(0,0,0,0.18); border-radius:6px; padding:6px 8px; margin-top:10px; font-size:11px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                    <div>
                      <span style="color:var(--text-muted);">Salary: </span>
                      <strong style="color:var(--green);">${isHidden ? '••••••' : `${curr}${pTotals.salary.toFixed(2)}`}</strong>
                      <span style="color:var(--text-muted); margin-left:6px;">Deductions: </span>
                      <strong>${curr}${pTotals.out.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style="color:var(--text-muted);">Leftover: </span>
                      <strong style="color:${pTotals.leftover >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:12px;">
                        ${isHidden ? '••••••' : `${curr}${pTotals.leftover.toFixed(2)}`}
                      </strong>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <h3 style="margin:0;">Salaries & Deductions</h3>
            <button class="btn secondary" style="font-size:11px; padding:2px 8px;" onclick="window.budgetApp.propagateDeductions('${activeTab}')" title="Copy this month's salaries and deductions to all following months in ${appState.currentYear}">📋 Propagate to Future Months</button>
          <div class="table-responsive">
            <table class="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Transfer Destination</th>
                ${cfg.people.map(p => `
                  <th class="text-right"><span>${p}</span></th>
                `).join('')}
                ${globalEditMode ? '<th></th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${deducts.map((d, idx) => `
                <tr>
                  <td>
                    ${globalEditMode ? `
                      <div style="display:flex; flex-direction:column; gap:2px;">
                        <input class="table-input" type="text" value="${d.name}" onchange="window.budgetApp.editDeductionName(${idx}, this.value)">
                        ${d.is_salary ? `
                          <select class="table-input" style="font-size:9.5px; padding:1px 2px; color:var(--text-muted);" onchange="window.budgetApp.editDeductionFrequency(${idx}, this.value)">
                            <option value="monthly" ${d.frequency === 'monthly' || !d.frequency ? 'selected' : ''}>📅 Monthly</option>
                            <option value="biweekly" ${d.frequency === 'biweekly' ? 'selected' : ''}>🔄 Bi-Weekly</option>
                            <option value="four_weekly" ${d.frequency === 'four_weekly' ? 'selected' : ''}>🏥 4-Weekly</option>
                            <option value="weekly" ${d.frequency === 'weekly' ? 'selected' : ''}>⚡ Weekly</option>
                            <option value="semi_monthly" ${d.frequency === 'semi_monthly' ? 'selected' : ''}>🗓️ Semi-Monthly</option>
                          </select>
                        ` : ''}
                      </div>
                    ` : `
                      <div style="display:flex; flex-direction:column; gap:1px;">
                        <div style="display:flex; align-items:center; gap:4px;">
                          <span>${d.is_salary ? '💰' : '📄'}</span>
                          <strong>${d.name}</strong>
                        </div>
                        ${(d.is_salary && d.frequency && d.frequency !== 'monthly') ? `
                          <span style="font-size:9.5px; color:var(--curr-border); font-weight:600;">
                            ${d.frequency === 'biweekly' ? '🔄 Bi-Weekly' : (d.frequency === 'weekly' ? '⚡ Weekly' : (d.frequency === 'four_weekly' ? '🏥 4-Weekly' : '🗓️ Semi-Monthly'))}
                          </span>
                        ` : ''}
                      </div>
                    `}
                  </td>
                  <td>
                    ${globalEditMode ? `
                      <select class="table-input" onchange="window.budgetApp.editDeductionTarget(${idx}, this.value)">
                        <option value="none" ${d.target_account === 'none' ? 'selected' : ''}>None (Personal)</option>
                        <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                        <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}" ${d.target_account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                      </select>
                    ` : (d.target_account !== 'none' ? `<span style="color:var(--curr-border); font-weight:600;">➔ ${d.target_account}</span>` : '<span style="color:var(--text-muted);">-</span>')}
                  </td>
                  ${cfg.people.map(p => {
                    const val = (d.amounts && d.amounts[p]) || (d.person === p ? d.amount : 0) || 0;
                    const salInfo = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule) : null;
                    const isMultiPay = salInfo && salInfo.count > 1;
                    return `
                      <td class="text-right">
                        ${globalEditMode ? `
                          <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <input class="table-input text-right" type="number" step="0.01" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${idx}, '${p}', this.value)">
                            ${(d.is_salary && isMultiPay) ? `<span style="font-size:9px; color:var(--text-muted);">${curr}${salInfo.total.toFixed(2)}/mo</span>` : ''}
                          </div>
                        ` : `
                          <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <span>${curr}${Number(val).toFixed(2)}${d.is_salary && d.frequency && d.frequency !== 'monthly' ? `<span style="font-size:9.5px; font-weight:normal; color:var(--text-muted);">/paycheck</span>` : ''}</span>
                            ${(d.is_salary && isMultiPay) ? `<span style="font-size:9.5px; color:var(--text-muted); font-weight:600;">= ${curr}${salInfo.total.toFixed(2)}</span>` : ''}
                          </div>
                        `}
                      </td>
                    `;
                  }).join('')}
                  ${globalEditMode ? `<td class="text-right"><button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteSalaryDeduction(${idx})">&times;</button></td>` : ''}
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border); font-weight:bold; background:rgba(255,255,255,0.02);">
                <td><strong style="color:var(--heading);">Personal Leftover</strong></td>
                <td style="font-size:11px; color:var(--text-muted);">(After Deductions)</td>
                ${cfg.people.map(p => {
                  const bal = personTotals[p] ? personTotals[p].leftover : 0;
                  return `<td class="text-right" style="color:${bal >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:13px; font-weight:700;">${curr}${bal.toFixed(2)}</td>`;
                }).join('')}
                ${globalEditMode ? '<td></td>' : ''}
              </tr>
            </tfoot>
          </table>
        </div>

          ${globalEditMode ? `
            <div style="display:grid; grid-template-columns: 1fr 110px ${cfg.people.map(() => '60px').join(' ')} 28px; gap:4px; margin-top:8px;">
              <input type="text" id="new-deduct-name" placeholder="Item Name (e.g. Salary, Phone Bill)">
              <select id="new-deduct-target">
                <option value="none">None</option>
                <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
                <optgroup label="Savings Accounts">${cfg.savings_accounts.map(acc => `<option value="${acc}">${acc}</option>`).join('')}</optgroup>
              </select>
              ${cfg.people.map((p, idx) => `<input type="number" step="0.01" id="new-deduct-p${idx}" placeholder="${curr}">`).join('')}
              <button class="btn green" onclick="window.budgetApp.addSalaryDeduction()">+</button>
            </div>
            <div style="margin-top:4px;">
              <label style="font-size:11px; cursor:pointer; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                <input type="checkbox" id="new-deduct-issalary"> This item is Salary / Income
              </label>
            </div>
          ` : ''}
        </div>
      `}

      <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div>
            <h3 style="margin:0; font-size:16px; color:var(--curr-border);">📅 Scheduled Bills & Payments In (${activeTab})</h3>
            <span style="font-size:11px; color:var(--text-muted);">Active Direct Debits, recurring bills, and scheduled inflows for ${activeTab}.</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn" style="font-size:11px; padding:3px 8px; background:#0284c7; color:#fff;" onclick="window.budgetApp.propagateScheduledBills('${activeTab}')" title="Copy active monthly bills and payments in from ${activeTab} to all following months in ${appState.currentYear}">🚀 Propagate to Future Months</button>
            <button class="btn secondary" style="font-size:11px; padding:3px 8px;" onclick="window.budgetApp.setTab('Bills')" title="Open Scheduled Bills & Payments In dashboard">🔍 Scheduled Dashboard</button>
          </div>
        </div>
        
        <div class="table-responsive">
          <table class="table" style="margin:0;">
            <thead>
              <tr>
                <th style="white-space:nowrap;">Description</th>
                <th style="white-space:nowrap; min-width:120px;">Type & Cadence</th>
                <th style="white-space:nowrap; min-width:85px;">Due Date</th>
                <th style="white-space:nowrap; min-width:90px;" class="text-right">Amount</th>
                <th style="white-space:nowrap;">Account</th>
                <th style="white-space:nowrap; min-width:110px;">Holiday Rule</th>
                <th style="white-space:nowrap;">Transfer To</th>
                ${globalEditMode ? '<th style="width:30px;"></th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${getAllScheduledItems(activeTab, appState.currentYear).filter(b => {
                if (b.frequency === 'monthly') return true;
                if (b.frequency === 'yearly') return b.month === activeTab;
                if (b.source_type === 'recurring_payment' || b.source_type === 'recurring_income') {
                  return (typeof isRecurringDueInMonth === 'function') ? isRecurringDueInMonth(b, activeTab, appState.currentYear) : true;
                }
                return true;
              }).map((b) => {
                const isInc = !!b.is_income;
                let cadenceBadge = '';
                if (b.frequency === 'monthly') cadenceBadge = `<span class="badge" style="background:#0284c7; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Monthly In' : '📅 Monthly DD'}</span>`;
                else if (b.frequency === 'weekly') cadenceBadge = `<span class="badge" style="background:#10b981; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Weekly In' : '🔄 Weekly'}</span>`;
                else if (b.frequency === 'biweekly') cadenceBadge = `<span class="badge" style="background:#f59e0b; color:#000; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Bi-Weekly In' : '🔄 Bi-Weekly'}</span>`;
                else if (b.frequency === 'four_weekly') cadenceBadge = `<span class="badge" style="background:#d97706; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 4-Weekly In' : '🗓️ 4-Weekly'}</span>`;
                else if (b.frequency === 'yearly') cadenceBadge = `<span class="badge" style="background:#ec4899; color:#fff; font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Annual In' : '🎉 Annual'}</span>`;
                else cadenceBadge = `<span class="badge" style="font-size:10.5px; padding:2px 7px;">${isInc ? '💰 Recurring In' : '🔄 Recurring'}</span>`;

                let dueStr = (typeof formatScheduledBillDue === 'function') ? formatScheduledBillDue(b, activeTab, appState.currentYear) : (b.frequency === 'yearly' ? `${b.month || 'Jan'} ${b.due_day || 1}` : `Day ${b.due_day || 1}`);

                const holidayRule = b.holiday_rule || (isInc ? 'previous' : 'following');
                let holidayBadge = '';
                if (holidayRule === 'previous') holidayBadge = '<span class="badge" style="background:rgba(16,185,129,0.15); color:var(--green); font-size:9.5px; padding:2px 6px;">⬅️ Prev Workday</span>';
                else if (holidayRule === 'following') holidayBadge = '<span class="badge" style="background:rgba(56,189,248,0.15); color:var(--curr-border); font-size:9.5px; padding:2px 6px;">➡️ Next Workday</span>';
                else holidayBadge = '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted); font-size:9.5px; padding:2px 6px;">⏸️ Exact</span>';

                return `
                  <tr style="${isInc ? 'background:rgba(16,185,129,0.02);' : ''}">
                    <td>
                      ${globalEditMode ? `
                        <input class="table-input" type="text" value="${b.desc}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'desc', this.value)">
                      ` : `<strong>${isInc ? '📥 ' : ''}${b.desc}</strong>`}
                    </td>
                    <td style="white-space:nowrap;">${cadenceBadge}</td>
                    <td style="white-space:nowrap;">
                      ${globalEditMode && b.frequency === 'monthly' ? `
                        <input class="table-input" type="number" min="1" max="31" value="${b.due_day || 1}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'due_day', parseInt(this.value, 10))" style="width:50px;">
                      ` : `<span style="font-size:11px; color:var(--text-muted);">${dueStr}</span>`}
                    </td>
                    <td class="text-right" style="white-space:nowrap;">
                      ${globalEditMode ? `
                        <input class="table-input text-right" type="number" step="0.01" value="${b.amount}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'amount', parseFloat(this.value))" style="width:75px; color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">
                      ` : `<strong style="color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">${isInc ? '+' : '-'}${curr}${Number(b.amount || 0).toFixed(2)}</strong>`}
                    </td>
                    <td style="white-space:nowrap;">
                      ${globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'account', this.value)">
                          <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}" ${b.account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                          ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${b.account === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
                          ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
                        </select>
                      ` : `<span style="font-size:11px;">${b.account || cfg.current_accounts[0]}</span>`}
                    </td>
                    <td style="white-space:nowrap;">
                      ${globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'holiday_rule', this.value)" style="font-size:10px;">
                          <option value="previous" ${holidayRule === 'previous' ? 'selected' : ''}>⬅️ Prev</option>
                          <option value="following" ${holidayRule === 'following' ? 'selected' : ''}>➡️ Next</option>
                          <option value="exact" ${holidayRule === 'exact' ? 'selected' : ''}>⏸️ Exact</option>
                        </select>
                      ` : holidayBadge}
                    </td>
                    <td style="white-space:nowrap;">
                      ${!isInc ? (
                        globalEditMode ? `
                          <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'transfer_to', this.value)">
                            <option value="none" ${(!b.transfer_to || b.transfer_to === 'none') ? 'selected' : ''}>None</option>
                            ${(cfg.savings_accounts || []).map(s => `<option value="${s}" ${b.transfer_to === s ? 'selected' : ''}>📈 ${s}</option>`).join('')}
                          </select>
                        ` : (b.transfer_to && b.transfer_to !== 'none' ? `<span style="color:var(--purple); font-weight:600; font-size:11px;">📈 ${b.transfer_to}</span>` : '<span style="color:var(--text-muted); font-size:11px;">-</span>')
                      ) : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}
                    </td>
                    ${globalEditMode ? `
                      <td class="text-right">
                        <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteUnifiedScheduledBill('${b.source_type}', ${b.source_idx})">&times;</button>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border); font-weight:bold; background:rgba(255,255,255,0.02);">
                <td colspan="3"><strong style="color:var(--heading);">Total Scheduled Outgoings:</strong></td>
                <td class="text-right" style="color:var(--red); font-size:13px; font-weight:700;">-${curr}${totalDD.toFixed(2)}</td>
                <td colspan="${globalEditMode ? 4 : 3}">
                  <span style="font-size:11px; color:var(--text-muted);">
                    Scheduled Inflows: <strong style="color:var(--green);">+${curr}${totalMonthPaymentsIn.toFixed(2)}</strong> | Net: <strong style="color:${(totalMonthPaymentsIn - totalDD) >= 0 ? 'var(--green)' : 'var(--red)'};">${(totalMonthPaymentsIn - totalDD) >= 0 ? '+' : ''}${curr}${(totalMonthPaymentsIn - totalDD).toFixed(2)}</strong>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${globalEditMode ? `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; border-top:1px dashed var(--border); padding-top:8px;">
            <span style="font-size:11px; color:var(--text-muted);">Manage or add bills/incomes in Scheduled Dashboard:</span>
            <button class="btn green" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.setTab('Bills')">+ Manage Scheduled Items</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// --- static/js/views/accounts.js ---


function renderAccountsView(container) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const activeTab = appState.activeTab;
  const globalEditMode = appState.globalEditMode;
  const mData = getMonthData(activeTab);
  const isMulti = isMultiUserEnabled();

  const visibleCurrentAccounts = isMulti ? cfg.current_accounts.filter(a => isAccountVisibleToActiveUser('current', a)) : cfg.current_accounts;
  const visibleCreditAccounts = isMulti ? cfg.credit_accounts.filter(c => isAccountVisibleToActiveUser('credit', c.name)) : cfg.credit_accounts;
  const visibleSavingsAccounts = isMulti ? cfg.savings_accounts.filter(s => isAccountVisibleToActiveUser('savings', s)) : cfg.savings_accounts;

  let html = `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="margin:0;">⚙️ Accounts & Opening Balances (${activeTab})</h3>
          <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">Balances roll forward automatically unless an override is set (leave blank to auto-rollover):</p>
        </div>
        <div>
          <button class="btn secondary" style="font-size:12px;" onclick="window.budgetApp.toggleGlobalEditMode()">
            ${globalEditMode ? '✓ Done Editing' : '✏️ Edit Opening Balances'}
          </button>
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
                ${globalEditMode ? `
                  <input type="number" step="0.01" placeholder="Auto" value="${bal !== 0 || isEdited ? bal : ''}" onchange="window.budgetApp.updateCurrentOpening('${acc}', this.value)" style="width:130px; text-align:right; font-weight:bold;">
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
                ${globalEditMode ? `
                  <input type="number" step="0.01" placeholder="Auto" value="${spent !== 0 || isEdited ? spent : ''}" onchange="window.budgetApp.updateCreditOpening('${c.name}', this.value)" style="width:130px; text-align:right; color:var(--red); font-weight:bold;">
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
                  ${globalEditMode ? `
                    <input type="number" step="0.01" placeholder="Auto" value="${bal !== 0 || isEdited ? bal : ''}" onchange="window.budgetApp.updateAccountSaving('${accName}', this.value)" style="width:130px; text-align:right; font-weight:bold;">
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

// --- static/js/views/budgets.js ---


function renderBudgetsView(container) {
  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;
  const budgets = yData.yearly_budgets || [];
  const birthdays = getBirthdays(appState.currentYear);
  const globalEditMode = appState.globalEditMode;
  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calculate Birthday Stats
  let totalBirthdayBudget = 0;
  let totalBirthdaySpent = 0;
  let upcomingBirthdaysCount = 0;

  const nowTime = now.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const enrichedBirthdays = birthdays.map((b, idx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) mIdx = 0;
    const bDate = new Date(appState.currentYear, mIdx, parseInt(b.day || 1, 10));
    const bTime = bDate.getTime();
    const diffDays = Math.ceil((bTime - nowTime) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) upcomingBirthdaysCount++;

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
        <div class="mini-kpi-card">
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

        <div class="mini-kpi-card">
          <div class="mini-kpi-title">Next 30 Days</div>
          <div class="mini-kpi-val" style="color:#f472b6;">${upcomingBirthdaysCount} Upcoming</div>
          <div class="mini-kpi-sub">Coming up soon</div>
        </div>
      </div>

      <!-- BIRTHDAYS GRID -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap:12px;">
        ${enrichedBirthdays.length === 0 ? `
          <div style="grid-column:1/-1; padding:20px; text-align:center; color:var(--text-muted); font-style:italic;">
            No birthdays or occasions added yet. Click "+ Add Birthday or Occasion" to set gift budgets for family and friends.
          </div>
        ` : enrichedBirthdays.map(b => {
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

          return `
            <div class="account-card" style="display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div class="account-card-header" style="margin-bottom:8px;">
                  ${globalEditMode ? `
                    <div style="display:flex; gap:6px; align-items:center; width:100%;">
                      <input type="text" value="${b.name}" onchange="window.budgetApp.editYearlyBudgetField(${bIdx}, 'name', this.value)" style="font-weight:bold; font-size:14px; flex:1;" placeholder="Budget Name">
                      <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteBudget(${bIdx})" title="Delete entire budget">&times;</button>
                    </div>
                  ` : `
                    <strong style="color:var(--heading); font-size:14px;">🎯 ${b.name}</strong>
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

// --- static/js/views/bills.js ---



function renderBillsView(container) {
  const cfg = getSettings();
  const curr = cfg.currency;
  const activeTab = months.includes(appState.activeTab) ? appState.activeTab : 'Jan';
  const isOpenBankingEnabled = Boolean(cfg.open_banking?.enabled);
  const allBills = getAllScheduledBills(activeTab, appState.currentYear);
  const allIncomes = getAllScheduledIncomes(activeTab, appState.currentYear);
  const allItems = getAllScheduledItems(activeTab, appState.currentYear);
  const globalEditMode = appState.globalEditMode;
  const activeFilter = appState.billsFilter || 'all';

  // Outgoings Breakdown
  const monthlyBills = allBills.filter(b => b.frequency === 'monthly');
  const weeklyBills = allBills.filter(b => b.frequency === 'weekly' || b.frequency === 'biweekly' || b.frequency === 'four_weekly' || b.frequency === 'custom_weeks');
  const annualBills = allBills.filter(b => b.frequency === 'yearly' || b.frequency === 'quarterly' || b.frequency === 'custom_months');

  const monthlyDDTotal = monthlyBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const weeklyAnnualizedBills = weeklyBills.reduce((sum, b) => {
    const amt = Number(b.amount) || 0;
    if (b.frequency === 'weekly') return sum + (amt * 52);
    if (b.frequency === 'biweekly') return sum + (amt * 26);
    if (b.frequency === 'four_weekly') return sum + (amt * 13);
    if (b.frequency === 'custom_weeks') return sum + (amt * (52 / (parseInt(b.interval_n, 10) || 1)));
    return sum + (amt * 12);
  }, 0);
  const annualBillsTotal = annualBills.reduce((sum, b) => {
    const amt = Number(b.amount) || 0;
    if (b.frequency === 'quarterly') return sum + (amt * 4);
    return sum + amt;
  }, 0);
  const totalAnnualCommitments = (monthlyDDTotal * 12) + weeklyAnnualizedBills + annualBillsTotal;
  const monthlyAverageBills = totalAnnualCommitments / 12;

  // Incomes Breakdown
  const monthlyIncomes = allIncomes.filter(i => i.frequency === 'monthly');
  const weeklyIncomes = allIncomes.filter(i => i.frequency === 'weekly' || i.frequency === 'biweekly' || i.frequency === 'four_weekly' || i.frequency === 'custom_weeks');
  const annualIncomes = allIncomes.filter(i => i.frequency === 'yearly' || i.frequency === 'quarterly' || i.frequency === 'custom_months');

  const monthlyIncomesTotal = monthlyIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const weeklyAnnualizedIncomes = weeklyIncomes.reduce((sum, i) => {
    const amt = Number(i.amount) || 0;
    if (i.frequency === 'weekly') return sum + (amt * 52);
    if (i.frequency === 'biweekly') return sum + (amt * 26);
    if (i.frequency === 'four_weekly') return sum + (amt * 13);
    if (i.frequency === 'custom_weeks') return sum + (amt * (52 / (parseInt(i.interval_n, 10) || 1)));
    return sum + (amt * 12);
  }, 0);
  const annualIncomesTotal = annualIncomes.reduce((sum, i) => {
    const amt = Number(i.amount) || 0;
    if (i.frequency === 'quarterly') return sum + (amt * 4);
    return sum + amt;
  }, 0);
  const totalAnnualIncomes = (monthlyIncomesTotal * 12) + weeklyAnnualizedIncomes + annualIncomesTotal;
  const monthlyAverageIncomes = totalAnnualIncomes / 12;

  const netMonthlyScheduled = monthlyIncomesTotal - monthlyDDTotal;
  const netAnnualScheduled = totalAnnualIncomes - totalAnnualCommitments;

  // Filter items
  const filteredItems = allItems.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'incomes') return !!item.is_income;
    if (activeFilter === 'outgoings') return !item.is_income;
    if (activeFilter === 'monthly') return item.frequency === 'monthly';
    if (activeFilter === 'weekly') return item.frequency === 'weekly' || item.frequency === 'biweekly' || item.frequency === 'four_weekly' || item.frequency === 'custom_weeks';
    if (activeFilter === 'yearly') return item.frequency === 'yearly' || item.frequency === 'quarterly' || item.frequency === 'custom_months';
    return true;
  });

  const now = new Date();
  const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  container.innerHTML = `
    <!-- TOP HEADER -->
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin:0; font-size:20px;">📅 Scheduled Bills & Payments In (${appState.currentYear})</h2>
          <p style="color:var(--text-muted); font-size:12px; margin:4px 0 0 0;">
            Manage all recurring outgoings (Direct Debits, bills) and recurring inflows (Salaries, side income, pensions, benefits) with custom weekend/holiday rules.
          </p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" style="background:#0284c7; color:#fff;" onclick="window.budgetApp.propagateScheduledBills('${activeTab}')" title="Copy active Direct Debits and Payments In to all future months in ${appState.currentYear}">
            🚀 Propagate to Future Months
          </button>
          <button class="btn green" onclick="window.budgetApp.scrollToAddScheduledItem('income')">
            + Add Payment In
          </button>
          <button class="btn secondary" style="border:1px solid var(--border);" onclick="window.budgetApp.scrollToAddScheduledItem('outgoing')">
            + Add Bill / DD
          </button>
        </div>
      </div>
    </div>

    <!-- KPI METRICS SUMMARY -->
    <div class="kpi-grid" style="margin-bottom:16px;">
      <div class="kpi-card">
        <div class="kpi-title">📅 Monthly Direct Debits</div>
        <div class="kpi-val" style="color:var(--red);">${curr}${monthlyDDTotal.toFixed(2)} / mo</div>
        <div class="kpi-sub">${monthlyBills.length} Active Direct Debits (${activeTab})</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">💰 Monthly Payments In</div>
        <div class="kpi-val" style="color:var(--green);">${curr}${monthlyIncomesTotal.toFixed(2)} / mo</div>
        <div class="kpi-sub">${monthlyIncomes.length} Scheduled Inflows (${activeTab})</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">⚖️ Net Scheduled Cashflow</div>
        <div class="kpi-val" style="color:${netMonthlyScheduled >= 0 ? 'var(--green)' : 'var(--red)'};">
          ${netMonthlyScheduled >= 0 ? '+' : ''}${curr}${netMonthlyScheduled.toFixed(2)} / mo
        </div>
        <div class="kpi-sub">Net Annual: <strong>${netAnnualScheduled >= 0 ? '+' : ''}${curr}${netAnnualScheduled.toFixed(2)} / yr</strong></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">💳 Total Annual Outgoings</div>
        <div class="kpi-val" style="color:var(--heading);">${curr}${totalAnnualCommitments.toFixed(2)} / yr</div>
        <div class="kpi-sub">Annual Inflows: <strong style="color:var(--green);">${curr}${totalAnnualIncomes.toFixed(2)} / yr</strong></div>
      </div>
    </div>

    <!-- SCHEDULED ITEMS TABLE PANEL -->
    <div class="panel" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <!-- FILTER BUTTONS -->
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn ${activeFilter === 'all' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('all')">
            All Items (${allItems.length})
          </button>
          <button class="btn ${activeFilter === 'incomes' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('incomes')">
            💰 Payments In (${allIncomes.length})
          </button>
          <button class="btn ${activeFilter === 'outgoings' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('outgoings')">
            💸 Bills & DDs (${allBills.length})
          </button>
          <button class="btn ${activeFilter === 'monthly' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('monthly')">
            📅 Monthly (${monthlyBills.length + monthlyIncomes.length})
          </button>
          <button class="btn ${activeFilter === 'weekly' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('weekly')">
            🔄 Multi-Week (${weeklyBills.length + weeklyIncomes.length})
          </button>
          <button class="btn ${activeFilter === 'yearly' ? 'green' : 'secondary'}" style="font-size:12px; padding:4px 12px;" onclick="window.budgetApp.setBillsFilter('yearly')">
            🎉 Annual & Periodic (${annualBills.length + annualIncomes.length})
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; color:var(--text-muted);">Active Month Context: <strong>${activeTab} ${appState.currentYear}</strong></span>
        </div>
      </div>

      <!-- TABLE -->
      <div class="table-responsive">
        <table class="table" style="width:100%; margin:0;">
          <thead>
            <tr>
              <th style="min-width:200px;">Description</th>
              <th style="min-width:130px;">Flow & Cadence</th>
              <th style="min-width:110px;">Due Date</th>
              <th class="text-right" style="min-width:110px;">Amount (${curr})</th>
              <th style="min-width:140px;">Account</th>
              <th style="min-width:140px;">Weekend / Holiday Rule</th>
              <th style="min-width:130px;">Transfer To</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.length === 0 ? `
              <tr>
                <td colspan="8" style="padding:24px; text-align:center; color:var(--text-muted); font-style:italic;">
                  No scheduled items found in this view. Use the form below to add a bill or payment in.
                </td>
              </tr>
            ` : filteredItems.map((b) => {
              const isInc = !!b.is_income;
              let flowBadge = isInc 
                ? '<span class="badge" style="background:#10b981; color:#fff; font-size:10px; margin-right:4px;">💰 Inflow</span>'
                : '<span class="badge" style="background:#ef4444; color:#fff; font-size:10px; margin-right:4px;">💸 Outgoing</span>';

              let cadenceBadge = '';
              if (b.frequency === 'monthly') cadenceBadge = `<span class="badge" style="background:#0284c7; color:#fff; font-size:11px;">📅 Monthly</span>`;
              else if (b.frequency === 'weekly') cadenceBadge = `<span class="badge" style="background:#14b8a6; color:#fff; font-size:11px;">🔄 Weekly</span>`;
              else if (b.frequency === 'biweekly') cadenceBadge = `<span class="badge" style="background:#f59e0b; color:#000; font-size:11px;">🔄 Bi-Weekly</span>`;
              else if (b.frequency === 'four_weekly') cadenceBadge = `<span class="badge" style="background:#d97706; color:#fff; font-size:11px;">🗓️ 4-Weekly</span>`;
              else if (b.frequency === 'quarterly') cadenceBadge = `<span class="badge" style="background:#8b5cf6; color:#fff; font-size:11px;">🗓️ Quarterly</span>`;
              else if (b.frequency === 'yearly') cadenceBadge = `<span class="badge" style="background:#ec4899; color:#fff; font-size:11px;">🎉 Annual</span>`;
              else if (b.frequency === 'custom_weeks') cadenceBadge = `<span class="badge" style="background:#64748b; color:#fff; font-size:11px;">⚙️ Every ${b.interval_n} Wks</span>`;
              else if (b.frequency === 'custom_months') cadenceBadge = `<span class="badge" style="background:#64748b; color:#fff; font-size:11px;">⚙️ Every ${b.interval_n} Mos</span>`;

              let dueStr = (typeof formatScheduledBillDue === 'function') ? formatScheduledBillDue(b, null, appState.currentYear) : (b.frequency === 'yearly' ? `${b.month || 'Jan'} ${b.due_day || 1}` : `Day ${b.due_day || 1}`);

              const holidayRule = b.holiday_rule || (isInc ? 'previous' : 'following');
              let holidayBadge = '';
              if (holidayRule === 'previous') holidayBadge = '<span class="badge" style="background:rgba(16,185,129,0.15); color:var(--green); border:1px solid rgba(16,185,129,0.3); font-size:10px;">⬅️ Prev Workday</span>';
              else if (holidayRule === 'following') holidayBadge = '<span class="badge" style="background:rgba(56,189,248,0.15); color:var(--curr-border); border:1px solid rgba(56,189,248,0.3); font-size:10px;">➡️ Next Workday</span>';
              else holidayBadge = '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted); border:1px solid rgba(148,163,184,0.3); font-size:10px;">⏸️ Exact Date</span>';

              return `
                <tr style="${isInc ? 'background:rgba(16,185,129,0.02);' : ''}">
                  <td>
                    ${globalEditMode ? `
                      <input class="table-input" type="text" value="${b.desc}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'desc', this.value)" style="font-weight:600;">
                    ` : `
                      <strong style="color:var(--heading); font-size:13px;">${isInc ? '📥 ' : ''}${b.desc}</strong>
                    `}
                  </td>
                  <td>
                    <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                       ${flowBadge} ${cadenceBadge}
                      ${isOpenBankingEnabled ? (() => {
                        const isRecurring = (b.source_type === 'recurring_income' || b.source_type === 'recurring_payment');
                        const isCleared = isRecurring
                          ? Boolean(b.cleared_dates && b.cleared_dates.some(d => { const dt = new Date(d); return months[dt.getMonth()] === appState.activeTab && dt.getFullYear() === appState.currentYear; }))
                          : Boolean(b.auto_cleared || b.status === 'paid');
                        return `
                          <button type="button" class="badge" style="background:${isCleared ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)'}; color:${isCleared ? 'var(--green)' : 'var(--amber)'}; font-size:9.5px; padding:2px 6px; font-weight:600; border:1px solid ${isCleared ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}; cursor:${globalEditMode ? 'pointer' : 'default'};" ${globalEditMode ? `onclick="window.budgetApp.toggleScheduledBillCleared('${b.source_type}', ${b.source_idx}, '${appState.activeTab}', '${(b.desc || '').replace(/'/g, "\\'")}', ${b.amount || 0})"` : ''} title="${isCleared ? 'Cleared' + (b.matched_payee ? ' (' + b.matched_payee + ')' : '') + (globalEditMode ? '. Click to mark Due' : '') : 'Due' + (globalEditMode ? '. Click to mark Cleared' : '')}">
                            ${isCleared ? '⚡ Cleared' : '⚠️ Due'}
                          </button>
                          ${globalEditMode ? `
                            <button type="button" class="btn secondary" style="font-size:9px; padding:1px 5px;" onclick="window.budgetApp.openManualBillMatchModal('${b.source_type}', ${b.source_idx}, '${appState.activeTab}', '${(b.desc || '').replace(/'/g, "\\'")}', ${b.amount || 0})" title="Match with Bank Transaction">🔗 Match</button>
                          ` : ''}
                        `;
                      })() : ''}
                    </div>
                  </td>
                  <td>
                    ${globalEditMode ? (
                      b.frequency === 'monthly' ? `
                        <input class="table-input" type="number" min="1" max="31" value="${b.due_day || 1}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'due_day', parseInt(this.value, 10))" style="width:70px;">
                      ` : b.frequency === 'yearly' ? `
                        <div style="display:flex; gap:4px; align-items:center;">
                          <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'month', this.value)" style="width:65px;">
                            ${months.map(m => `<option value="${m}" ${m === (b.month || 'Jan') ? 'selected' : ''}>${m}</option>`).join('')}
                          </select>
                          <input class="table-input" type="number" min="1" max="31" value="${b.due_day || 1}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'due_day', parseInt(this.value, 10))" style="width:50px;">
                        </div>
                      ` : (b.source_type === 'recurring_payment' || b.source_type === 'recurring_income') ? `
                        <input class="table-input" type="date" value="${b.start_date || ''}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'start_date', this.value)" style="width:125px; font-size:11px;">
                      ` : `<span style="font-size:12px; color:var(--text-muted);">${dueStr}</span>`
                    ) : `
                      <span style="font-size:12px; color:var(--text-muted); font-weight:500;">${dueStr}</span>
                    `}
                  </td>
                  <td class="text-right">
                    ${globalEditMode ? `
                      <input class="table-input text-right" type="number" step="0.01" value="${b.amount}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'amount', parseFloat(this.value))" style="width:95px; font-weight:bold; color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">
                    ` : `
                      <strong style="color:${isInc ? 'var(--green)' : 'var(--curr-border)'}; font-size:13px;">${isInc ? '+' : '-'}${curr}${Number(b.amount || 0).toFixed(2)}</strong>
                    `}
                  </td>
                  <td>
                    ${globalEditMode ? `
                      <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'account', this.value)">
                        <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${b.account === a ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
                        ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${b.account === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
                        ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
                      </select>
                    ` : `
                      <span style="font-size:12px;">${b.account || cfg.current_accounts[0]}</span>
                    `}
                  </td>
                  <td>
                    ${globalEditMode ? `
                      <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'holiday_rule', this.value)" style="font-size:11px;">
                        <option value="previous" ${holidayRule === 'previous' ? 'selected' : ''}>⬅️ Previous Workday (Friday)</option>
                        <option value="following" ${holidayRule === 'following' ? 'selected' : ''}>➡️ Following Workday (Monday)</option>
                        <option value="exact" ${holidayRule === 'exact' ? 'selected' : ''}>⏸️ Exact Date (No Shift)</option>
                      </select>
                    ` : holidayBadge}
                  </td>
                  <td>
                    ${!isInc ? (
                      globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'transfer_to', this.value)">
                          <option value="none" ${(!b.transfer_to || b.transfer_to === 'none') ? 'selected' : ''}>None (Expense)</option>
                          ${(cfg.savings_accounts || []).map(s => `<option value="${s}" ${b.transfer_to === s ? 'selected' : ''}>📈 ${s}</option>`).join('')}
                        </select>
                      ` : (b.transfer_to && b.transfer_to !== 'none' ? `
                        <span style="color:var(--purple); font-weight:600; font-size:12px;">📈 ${b.transfer_to}</span>
                      ` : `
                        <span style="color:var(--text-muted); font-size:11px;">-</span>
                      `)
                    ) : `<span style="color:var(--text-muted); font-size:11px;">-</span>`}
                  </td>
                  <td class="text-right">
                    <button class="del-btn" onclick="event.stopPropagation(); window.budgetApp.deleteUnifiedScheduledBill('${b.source_type}', ${b.source_idx}, '${activeFilter}')" title="Delete">&times;</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD NEW SCHEDULED ITEM PANEL -->
    <div id="add-bill-panel" class="panel">
      <div style="margin-bottom:12px;">
        <h3 id="add-panel-title" style="margin:0; font-size:16px; color:var(--curr-border);">+ Add Scheduled Bill or Payment In</h3>
        <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">Create recurring outgoings (Direct Debits, bills) or incoming payments (Salaries, side income, pensions) with automatic weekend and holiday adjustments.</p>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
        <!-- TYPE: OUTGOING vs INCOME -->
        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Flow Type</label>
          <select id="new-sched-type" onchange="window.budgetApp.onScheduledTypeChange(this.value)" style="width:100%; margin-top:3px; font-weight:600;">
            <option value="outgoing" selected>💸 Scheduled Outgoing (Bill / Direct Debit)</option>
            <option value="income">💰 Scheduled Inflow (Payment In / Income)</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Description / Payer</label>
          <input type="text" id="new-sched-desc" placeholder="e.g. Salary, Rent, Child Benefit, Cleaner, Gym" style="width:100%; margin-top:3px;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Amount (${curr})</label>
          <input type="number" step="0.01" id="new-sched-amt" placeholder="100.00" style="width:100%; margin-top:3px;">
        </div>

        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Frequency</label>
          <select id="new-sched-freq" onchange="window.budgetApp.onFullScheduledFreqChange(this.value)" style="width:100%; margin-top:3px;">
            <option value="monthly" selected>📅 Monthly</option>
            <option value="weekly">🔄 Weekly</option>
            <option value="biweekly">🔄 Bi-Weekly (Every 2 Weeks)</option>
            <option value="four_weekly">🗓️ 4-Weekly (Every 4 Weeks)</option>
            <option value="quarterly">🗓️ Quarterly (Every 3 Months)</option>
            <option value="yearly">🎉 Annual</option>
            <option value="custom_weeks">⚙️ Custom (Every N Weeks)</option>
            <option value="custom_months">⚙️ Custom (Every N Months)</option>
          </select>
        </div>

        <div id="new-sched-day-box">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Due Day of Month (1-31)</label>
          <input type="number" min="1" max="31" id="new-sched-due-day" value="1" style="width:100%; margin-top:3px;">
        </div>

        <div id="new-sched-start-box" style="display:none;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Start From Date</label>
          <input type="date" id="new-sched-start-date" value="${todayIso}" min="${appState.currentYear}-01-01" max="${Number(appState.currentYear) + 5}-12-31" style="width:100%; margin-top:3px;">
        </div>

        <div id="new-sched-month-box" style="display:none;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Target Month</label>
          <select id="new-sched-month" style="width:100%; margin-top:3px;">
            ${months.map(m => `<option value="${m}" ${m === activeTab ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>

        <div id="new-sched-interval-box" style="display:none;">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Interval Step (N)</label>
          <input type="number" min="1" max="52" id="new-sched-interval" value="2" style="width:100%; margin-top:3px;">
        </div>

        <div>
          <label id="new-sched-acc-label" style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Account</label>
          <select id="new-sched-acc" style="width:100%; margin-top:3px;">
            <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
            ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
            ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
          </select>
        </div>

        <!-- WEEKEND / HOLIDAY RULE -->
        <div>
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Weekend / Bank Holiday Rule</label>
          <select id="new-sched-holiday-rule" style="width:100%; margin-top:3px;">
            <option value="previous">⬅️ Move to Previous Workday (Friday before)</option>
            <option value="following" selected>➡️ Move to Following Workday (Monday after)</option>
            <option value="exact">⏸️ Exact Date (No adjustment)</option>
          </select>
        </div>

        <!-- TRANSFER DESTINATION (FOR OUTGOINGS) -->
        <div id="new-sched-transfer-box">
          <label style="font-size:11px; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">Transfer Destination (Optional)</label>
          <select id="new-sched-transfer" style="width:100%; margin-top:3px;">
            <option value="none">None (Expense)</option>
            ${(cfg.savings_accounts || []).map(s => `<option value="${s}">📈 ${s} (Savings Transfer)</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn green" style="padding:6px 20px;" onclick="window.budgetApp.confirmAddFullScheduledBill()">Save Scheduled Item</button>
      </div>
    </div>
  `;
}

// --- static/js/views/year_overview.js ---



function renderYearOverviewView(container) {
  const yData = getYearData();
  const cfg = getSettings();
  const curr = cfg.currency;

  if (!yData.yearly_overview_selection) {
    yData.yearly_overview_selection = {
      current: cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)),
      credit: cfg.credit_accounts.map(c => c.name).filter(cName => isAccountIncludedInNet('credit', cName)),
      savings: cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s))
    };
  }
  const sel = yData.yearly_overview_selection;

  const monthData = months.map((m, idx) => {
    const md = getMonthData(m);
    
    let cTotal = 0, crTotal = 0, sTotal = 0;
    (sel.current || []).forEach(acc => cTotal += Number(md.current_data[acc] && md.current_data[acc].opening) || 0);
    cfg.credit_accounts.filter(c => (sel.credit || []).includes(c.name)).forEach(c => crTotal += Number(md.credit_data[c.name] && md.credit_data[c.name].opening_spent) || 0);
    (sel.savings || []).forEach(s => sTotal += Number(md.savings_data[s] && md.savings_data[s].opening) || 0);

    // Compute actual holdings for this month if recorded in weekly_actuals
    let hasActualSavings = false;
    let actualSavingsTotal = 0;
    let hasActualCurrent = false;
    let actualCurrentTotal = 0;

    (sel.savings || []).forEach(acc => {
      let actVal = null;
      for (let w = 5; w >= 1; w--) {
        const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`sav_${acc}`] !== "" && wAct[`sav_${acc}`] !== undefined && wAct[`sav_${acc}`] !== null) {
          actVal = parseFloat(wAct[`sav_${acc}`]);
          break;
        }
      }
      if (actVal !== null && !isNaN(actVal)) {
        hasActualSavings = true;
        actualSavingsTotal += actVal;
      } else {
        actualSavingsTotal += Number(md.savings_data[acc] && md.savings_data[acc].opening) || 0;
      }
    });

    (sel.current || []).forEach(acc => {
      let actVal = null;
      for (let w = 5; w >= 1; w--) {
        const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`curr_${acc}`] !== "" && wAct[`curr_${acc}`] !== undefined && wAct[`curr_${acc}`] !== null) {
          actVal = parseFloat(wAct[`curr_${acc}`]);
          break;
        }
      }
      if (actVal !== null && !isNaN(actVal)) {
        hasActualCurrent = true;
        actualCurrentTotal += actVal;
      } else {
        actualCurrentTotal += Number(md.current_data[acc] && md.current_data[acc].opening) || 0;
      }
    });

    const ddTotal = (md.direct_debits || []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    let wTotal = 0;
    Object.values(md.weekly_items || {}).forEach(wItems => (wItems || []).forEach(it => { if (!it.is_income) wTotal += Number(it.amount) || 0; }));

    return {
      month: m,
      current: cTotal,
      credit: crTotal,
      savings: sTotal,
      actualSavings: hasActualSavings ? actualSavingsTotal : null,
      actualCurrent: hasActualCurrent ? actualCurrentTotal : null,
      net: cTotal + sTotal - crTotal,
      actualNet: (hasActualSavings || hasActualCurrent) ? (actualCurrentTotal + actualSavingsTotal - crTotal) : null,
      out: ddTotal + wTotal
    };
  });

  // Calculate account-by-account savings summary
  const savingsSummary = cfg.savings_accounts.map(acc => {
    const janVal = Number(getMonthData('Jan').savings_data[acc]?.opening) || 0;
    const decVal = Number(getMonthData('Dec').savings_data[acc]?.opening) || 0;
    const conf = (typeof getAccountConfig === 'function') ? getAccountConfig('savings', acc) : { savings_predict_mode: 'planned' };
    
    // Find latest recorded actual check-in across the months
    let latestActual = null;
    let latestActualMonth = null;
    let latestPredictedAtThatMonth = janVal;

    for (let i = months.length - 1; i >= 0; i--) {
      const mName = months[i];
      const md = getMonthData(mName);
      for (let w = 5; w >= 1; w--) {
        const wAct = md.weekly_actuals && md.weekly_actuals[`Week ${w}`];
        if (wAct && wAct[`sav_${acc}`] !== "" && wAct[`sav_${acc}`] !== undefined && wAct[`sav_${acc}`] !== null) {
          latestActual = parseFloat(wAct[`sav_${acc}`]);
          latestActualMonth = mName;
          latestPredictedAtThatMonth = Number(md.savings_data[acc]?.opening) || 0;
          break;
        }
      }
      if (latestActual !== null) break;
    }

    const growthAmt = (latestActual !== null) ? (latestActual - latestPredictedAtThatMonth) : (decVal - janVal);
    const growthPct = (latestActual !== null && latestPredictedAtThatMonth > 0) 
      ? ((growthAmt / latestPredictedAtThatMonth) * 100) 
      : (janVal > 0 ? ((growthAmt / janVal) * 100) : 0);

    return {
      acc,
      janVal,
      decVal,
      conf,
      latestActual,
      latestActualMonth,
      growthAmt,
      growthPct
    };
  });

  container.innerHTML = `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h2>📊 Annual Trajectory & Year Overview (${appState.currentYear})</h2>
          <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Comparing predicted contributions and balances with actual check-ins across the year.</p>
        </div>
        <button class="btn secondary" onclick="window.budgetApp.openYearOverviewAccountFilterModal()">📊 Filter Chart Accounts</button>
      </div>
      
      <div class="chart-container" style="height:320px; margin-top:12px;">
        <canvas id="yearBalancesChart"></canvas>
      </div>
    </div>

    ${cfg.track_savings ? `
      <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
          <h3 style="margin:0;">📈 Savings Accounts: Planned Target vs. Actual Growth</h3>
          <span style="font-size:11px; color:var(--purple); font-weight:600;">Planned Cashflow Tracking</span>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Savings Account</th>
                <th>Jan Starting Balance</th>
                <th class="text-right">Projected Dec Target</th>
                <th class="text-right">Latest Actual Check-In</th>
                <th class="text-right">Growth vs Plan</th>
                <th style="font-size:11px;">Forecast Mode</th>
              </tr>
            </thead>
            <tbody>
              ${savingsSummary.map(s => `
                <tr>
                  <td><strong>${s.acc}</strong></td>
                  <td>${curr}${s.janVal.toFixed(2)}</td>
                  <td class="text-right" style="color:var(--purple); font-weight:bold;">${curr}${s.decVal.toFixed(2)}</td>
                  <td class="text-right font-semibold">
                    ${s.latestActual !== null ? `
                      <span style="color:var(--heading);">${curr}${s.latestActual.toFixed(2)}</span>
                      <span style="font-size:10px; color:var(--text-muted);">(${s.latestActualMonth})</span>
                    ` : '<span style="color:var(--text-muted);">-</span>'}
                  </td>
                  <td class="text-right" style="color:${s.growthAmt >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">
                    ${s.growthAmt >= 0 ? '+' : ''}${curr}${s.growthAmt.toFixed(2)} (${s.growthPct >= 0 ? '+' : ''}${s.growthPct.toFixed(2)}%)
                  </td>
                  <td style="font-size:11px; color:var(--text-muted);">
                    ${s.conf.savings_predict_mode === 'actual' ? '🔄 Roll Forward from Actuals' : '📈 Planned Cashflow'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <div class="panel">
      <h3>📅 12-Month Financial Summary</h3>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Month</th>
              <th class="text-right">Current Accounts</th>
              <th class="text-right">Credit Card Debt</th>
              ${cfg.track_savings ? `
                <th class="text-right">Planned Savings</th>
                <th class="text-right">Actual Savings</th>
              ` : ''}
              <th class="text-right">Net Position</th>
              <th class="text-right">Total Outgoings</th>
            </tr>
          </thead>
          <tbody>
            ${monthData.map(d => `
              <tr>
                <td><strong>${d.month}</strong></td>
                <td class="text-right">${curr}${d.current.toFixed(2)}</td>
                <td class="text-right" style="color:var(--red);">-${curr}${d.credit.toFixed(2)}</td>
                ${cfg.track_savings ? `
                  <td class="text-right" style="color:var(--purple);">${curr}${d.savings.toFixed(2)}</td>
                  <td class="text-right" style="font-weight:600;">
                    ${d.actualSavings !== null ? `
                      <span style="color:var(--heading);">${curr}${d.actualSavings.toFixed(2)}</span>
                      ${(d.actualSavings - d.savings) !== 0 ? `
                        <span style="font-size:10px; color:${(d.actualSavings - d.savings) >= 0 ? 'var(--green)' : 'var(--red)'};">
                          (${(d.actualSavings - d.savings) >= 0 ? '+' : ''}${curr}${(d.actualSavings - d.savings).toFixed(0)})
                        </span>
                      ` : ''}
                    ` : '<span style="color:var(--text-muted);">-</span>'}
                  </td>
                ` : ''}
                <td class="text-right" style="color:${d.net >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">${curr}${d.net.toFixed(2)}</td>
                <td class="text-right">${curr}${d.out.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    const canvas = document.getElementById('yearBalancesChart');
    if (canvas) {
      renderYearBalancesChart(canvas, monthData, curr, sel, cfg);
    }
  }, 40);
}

// --- static/js/views/spend_analytics.js ---




function renderSpendAnalyticsView(container) {
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
              return `
                <tr>
                  <td style="color:var(--text-muted); white-space:nowrap; font-size:11.5px;">${t.booking_date}</td>
                  <td>
                    <strong style="color:var(--heading); font-size:12.5px;">${t.payee_name || 'Transaction'}</strong>
                    ${t.raw_info && t.raw_info !== t.payee_name ? `<div style="font-size:10px; color:var(--text-muted); opacity:0.8;">${t.raw_info}</div>` : ''}
                  </td>
                  <td style="color:var(--text-muted); font-size:11.5px;">${t.account_name || 'Account'}</td>
                  ${isMulti ? `<td style="font-size:11px; color:var(--text-muted);">${t.owner || 'Joint'}</td>` : ''}
                  <td>
                    <button class="badge" style="background:rgba(255,255,255,0.06); border:1px solid ${cat.color}60; color:${cat.color}; font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600;" onclick="window.budgetApp.openRecategorizeModal(this.dataset.txnid, this.dataset.payee, this.dataset.catid)" data-txnid="${t.transaction_id}" data-payee="${t.payee_name || ''}" data-catid="${cat.id}" title="Click to change category or create custom rule">
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

// --- static/js/views/settings.js ---


function renderSettingsView(container) {
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

// --- static/js/views/calculator.js ---


// Calculator State
const calcState = {
  isOpen: false,
  isMinimized: false,
  isHistoryOpen: false,
  isValuePickerActive: false,
  expression: '',
  currentInput: '0',
  lastResult: null,
  history: [],
  posX: null,
  posY: null
};

// Safe Math Evaluation Engine
function evaluateExpression(exprStr) {
  if (!exprStr || !exprStr.trim()) return 0;

  // Normalize operators
  let expr = exprStr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/,/g, '');

  // Handle percentages: e.g., "500 * 20%" -> "500 * 0.20", "500 + 20%" -> "500 + (500 * 0.20)"
  // First, convert simple percentage numbers like "20%" after * or / or ( to "(20/100)"
  expr = expr.replace(/([0-9.]+)\s*%/g, '($1/100)');

  // Validate allowed characters: numbers, ., +, -, *, /, (, ), spaces
  if (!/^[0-9.+\-*/()\s]+$/.test(expr)) {
    throw new Error('Invalid characters in expression');
  }

  // Tokenize
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const char = expr[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: parseFloat(numStr) });
      continue;
    }
    if ('+-*/()'.includes(char)) {
      // Check for unary minus: e.g. at start, or after another operator / open paren
      if (char === '-') {
        const prev = tokens[tokens.length - 1];
        if (!prev || prev.type === 'operator' || (prev.type === 'paren' && prev.value === '(')) {
          tokens.push({ type: 'operator', value: 'u-' });
          i++;
          continue;
        }
      }
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
      } else {
        tokens.push({ type: 'operator', value: char });
      }
      i++;
      continue;
    }
    i++;
  }

  // Shunting-yard algorithm to convert to Reverse Polish Notation (RPN)
  const outputQueue = [];
  const operatorStack = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, 'u-': 3 };

  for (const token of tokens) {
    if (token.type === 'number') {
      outputQueue.push(token);
    } else if (token.type === 'operator') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === 'operator' &&
        precedence[operatorStack[operatorStack.length - 1].value] >= precedence[token.value]
      ) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(token);
    } else if (token.type === 'paren' && token.value === '(') {
      operatorStack.push(token);
    } else if (token.type === 'paren' && token.value === ')') {
      while (operatorStack.length > 0 && !(operatorStack[operatorStack.length - 1].type === 'paren' && operatorStack[operatorStack.length - 1].value === '(')) {
        outputQueue.push(operatorStack.pop());
      }
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value === '(') {
        operatorStack.pop(); // remove '('
      }
    }
  }

  while (operatorStack.length > 0) {
    const op = operatorStack.pop();
    if (op.type === 'paren') throw new Error('Mismatched parentheses');
    outputQueue.push(op);
  }

  // Evaluate RPN
  const evalStack = [];
  for (const token of outputQueue) {
    if (token.type === 'number') {
      evalStack.push(token.value);
    } else if (token.type === 'operator') {
      if (token.value === 'u-') {
        const a = evalStack.pop() || 0;
        evalStack.push(-a);
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (a === undefined || b === undefined) throw new Error('Malformed expression');
        let res = 0;
        switch (token.value) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) throw new Error('Division by zero');
            res = a / b;
            break;
        }
        evalStack.push(res);
      }
    }
  }

  if (evalStack.length !== 1) throw new Error('Calculation error');
  const finalVal = evalStack[0];
  if (isNaN(finalVal) || !isFinite(finalVal)) throw new Error('Invalid result');
  return finalVal;
}

// Load / Save History from localStorage
function loadCalcHistory() {
  try {
    const saved = localStorage.getItem('budget_calc_history');
    if (saved) {
      calcState.history = JSON.parse(saved);
    }
  } catch (e) {}
}

function saveCalcHistory() {
  try {
    localStorage.setItem('budget_calc_history', JSON.stringify(calcState.history.slice(0, 30)));
  } catch (e) {}
}

// Update DOM Displays
function updateCalcDisplay() {
  const exprEl = document.getElementById('calcExprDisplay');
  const mainEl = document.getElementById('calcMainDisplay');
  const minResultEl = document.getElementById('calcMinResult');

  if (exprEl) {
    exprEl.innerText = calcState.expression || '';
  }
  if (mainEl) {
    mainEl.innerText = calcState.currentInput || '0';
  }
  if (minResultEl) {
    minResultEl.innerText = calcState.currentInput || '0';
  }
}

// Keypad Actions
function calcInputDigit(digit) {
  if (calcState.currentInput === '0' || calcState.currentInput === 'Error') {
    calcState.currentInput = String(digit);
  } else {
    calcState.currentInput += String(digit);
  }
  updateCalcDisplay();
}

function calcInputDecimal() {
  if (calcState.currentInput === 'Error') calcState.currentInput = '0';
  if (!calcState.currentInput.includes('.')) {
    calcState.currentInput += '.';
  }
  updateCalcDisplay();
}

function calcToggleSign() {
  if (calcState.currentInput === 'Error' || calcState.currentInput === '0') return;
  if (calcState.currentInput.startsWith('-')) {
    calcState.currentInput = calcState.currentInput.substring(1);
  } else {
    calcState.currentInput = '-' + calcState.currentInput;
  }
  updateCalcDisplay();
}

function calcInputOperator(op) {
  if (calcState.currentInput === 'Error') calcState.currentInput = '0';

  if (calcState.expression && (calcState.currentInput === '' || calcState.currentInput === '0')) {
    const trimmed = calcState.expression.trim();
    if (/[+−×÷*/-]$/.test(trimmed)) {
      calcState.expression = trimmed.slice(0, -1) + ' ' + op + ' ';
      updateCalcDisplay();
      return;
    }
  }

  calcState.expression += ` ${calcState.currentInput} ${op} `;
  calcState.currentInput = '0';
  updateCalcDisplay();
}

function calcInputParen(paren) {
  if (calcState.currentInput === 'Error') calcState.currentInput = '0';
  if (paren === '(') {
    if (calcState.currentInput !== '0' && calcState.currentInput !== '') {
      calcState.expression += ` ${calcState.currentInput} × ( `;
    } else {
      calcState.expression += ' ( ';
    }
    calcState.currentInput = '0';
  } else if (paren === ')') {
    calcState.expression += ` ${calcState.currentInput} ) `;
    calcState.currentInput = '0';
  }
  updateCalcDisplay();
}

function calcInputPercent() {
  if (calcState.currentInput === 'Error') return;
  const val = parseFloat(calcState.currentInput) || 0;
  calcState.currentInput = (val / 100).toString();
  updateCalcDisplay();
}

function calcClearEntry() {
  if (calcState.currentInput.length > 1 && calcState.currentInput !== 'Error') {
    calcState.currentInput = calcState.currentInput.slice(0, -1);
  } else {
    calcState.currentInput = '0';
  }
  updateCalcDisplay();
}

function calcClearAll() {
  calcState.expression = '';
  calcState.currentInput = '0';
  calcState.lastResult = null;
  updateCalcDisplay();
}

function calcEquals() {
  try {
    let fullExpr = (calcState.expression + ' ' + calcState.currentInput).trim();
    if (!fullExpr) return;

    const result = evaluateExpression(fullExpr);
    // Round to max 6 decimal places to prevent float precision oddities (e.g., 0.1 + 0.2 = 0.3)
    const rounded = Number(Math.round(result + 'e+6') + 'e-6');
    const resultStr = rounded.toString();

    // Add to history
    calcState.history.unshift({
      expression: fullExpr,
      result: resultStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (calcState.history.length > 30) calcState.history.pop();
    saveCalcHistory();
    renderCalcHistory();

    calcState.expression = '';
    calcState.currentInput = resultStr;
    calcState.lastResult = rounded;
    updateCalcDisplay();
  } catch (err) {
    console.error('Calculation error:', err);
    calcState.currentInput = 'Error';
    updateCalcDisplay();
  }
}

// Render History List
function renderCalcHistory() {
  const listEl = document.getElementById('calcHistoryList');
  if (!listEl) return;
  if (!calcState.history || calcState.history.length === 0) {
    listEl.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:12px;">No calculation history yet</div>';
    return;
  }

  listEl.innerHTML = calcState.history.map((item, idx) => `
    <div class="calc-history-item" onclick="window.budgetApp.useHistoryResult(${idx})" title="Click to use this result">
      <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted);">
        <span>${item.timestamp || ''}</span>
        <span style="font-family:monospace; color:var(--text);">${item.expression}</span>
      </div>
      <div style="text-align:right; font-weight:700; font-size:14px; color:var(--primary, #38bdf8);">
        = ${item.result}
      </div>
    </div>
  `).join('');
}

function toggleCalcHistory() {
  calcState.isHistoryOpen = !calcState.isHistoryOpen;
  const historyPanel = document.getElementById('calcHistoryPanel');
  if (historyPanel) {
    historyPanel.style.display = calcState.isHistoryOpen ? 'flex' : 'none';
    if (calcState.isHistoryOpen) renderCalcHistory();
  }
}

function clearCalcHistory() {
  calcState.history = [];
  saveCalcHistory();
  renderCalcHistory();
}

function useHistoryResult(idx) {
  const item = calcState.history[idx];
  if (!item) return;
  calcState.currentInput = item.result;
  updateCalcDisplay();
  toggleCalcHistory();
}

// Copy result to clipboard
function copyCalcResult() {
  const val = calcState.currentInput;
  if (!val || val === 'Error') return;
  navigator.clipboard.writeText(val).then(() => {
    showCalcToast(`✓ Copied "${val}" to clipboard`);
  }).catch(() => {
    showCalcToast(`Result: ${val}`);
  });
}

// Toast notification helper
function showCalcToast(message) {
  let toast = document.getElementById('calcToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'calcToast';
    toast.className = 'calc-toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add('show');
  clearTimeout(window.__calcToastTimeout);
  window.__calcToastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// =========================================================
// INTERACTIVE "VALUE PICKER" MODE
// =========================================================

let activePickerHoverEl = null;
let pickerTooltipEl = null;

// Smart Numeric Value Extractor from DOM Element
function extractNumericFromElement(el) {
  if (!el) return null;

  // 1. Form inputs
  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
    const rawVal = el.value;
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      const cleaned = String(rawVal).replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && isFinite(parsed)) return parsed;
    }
  }

  // 2. Data attributes (e.g. data-amount, data-value)
  if (el.dataset && el.dataset.amount) {
    const parsed = parseFloat(el.dataset.amount);
    if (!isNaN(parsed)) return parsed;
  }
  if (el.dataset && el.dataset.value) {
    const parsed = parseFloat(el.dataset.value);
    if (!isNaN(parsed)) return parsed;
  }

  // 3. Text content parsing
  let text = (el.innerText || el.textContent || '').trim();
  if (!text) return null;

  // Accountancy negative formatted with parentheses: e.g. "(£500.00)" or "($1,200)"
  const parenMatch = text.match(/\(\s*[$€£¥]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*\)/);
  if (parenMatch && parenMatch[1]) {
    const clean = parenMatch[1].replace(/,/g, '');
    const parsed = parseFloat(clean);
    if (!isNaN(parsed) && isFinite(parsed)) return -parsed;
  }

  // Standard match: optional sign, optional currency, numbers with commas (e.g. 1,234.56) or plain numbers (e.g. 7890 or 7890.00)
  const match = text.match(/([+-]?)\s*[$€£¥]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
  if (match && match[2]) {
    const sign = match[1] === '-' ? -1 : 1;
    const numPart = match[2].replace(/,/g, '');
    const parsed = parseFloat(numPart);
    if (!isNaN(parsed) && isFinite(parsed)) return sign * parsed;
  }

  return null;
}

// Find candidate target element
function findNumericCandidate(target) {
  if (!target || target === document.body || target === document.documentElement) return null;

  // Skip elements inside calculator or picker HUD
  if (target.closest('#budgetCalculatorWidget') || target.closest('#calculatorPickerHud') || target.closest('#calcToast')) {
    return null;
  }

  // Check target itself
  let num = extractNumericFromElement(target);
  if (num !== null) return { element: target, value: num };

  // Check closest number-bearing containers (e.g. .kpi-val, .item-amt-input, td, strong, span)
  let parent = target.parentElement;
  while (parent && parent !== document.body) {
    if (parent.closest('#budgetCalculatorWidget') || parent.closest('#calculatorPickerHud')) return null;
    num = extractNumericFromElement(parent);
    if (num !== null) return { element: parent, value: num };
    parent = parent.parentElement;
  }

  return null;
}

function handlePickerPointerMove(e) {
  if (!calcState.isValuePickerActive) return;

  const candidate = findNumericCandidate(e.target);
  if (candidate) {
    if (activePickerHoverEl !== candidate.element) {
      if (activePickerHoverEl) {
        activePickerHoverEl.classList.remove('val-picker-hover');
      }
      activePickerHoverEl = candidate.element;
      activePickerHoverEl.classList.add('val-picker-hover');
    }

    // Position or update tooltip
    if (!pickerTooltipEl) {
      pickerTooltipEl = document.createElement('div');
      pickerTooltipEl.id = 'valPickerTooltip';
      pickerTooltipEl.className = 'val-picker-tooltip';
      document.body.appendChild(pickerTooltipEl);
    }
    pickerTooltipEl.innerText = `🎯 Pick: ${candidate.value >= 0 ? '+' : ''}${candidate.value.toFixed(2)}`;
    pickerTooltipEl.style.display = 'block';
    pickerTooltipEl.style.left = `${Math.min(window.innerWidth - 120, e.clientX + 14)}px`;
    pickerTooltipEl.style.top = `${Math.max(10, e.clientY - 28)}px`;
  } else {
    if (activePickerHoverEl) {
      activePickerHoverEl.classList.remove('val-picker-hover');
      activePickerHoverEl = null;
    }
    if (pickerTooltipEl) {
      pickerTooltipEl.style.display = 'none';
    }
  }
}

function handlePickerClick(e) {
  if (!calcState.isValuePickerActive) return;

  // If user clicked HUD Cancel button
  if (e.target.closest('#cancelPickerBtn') || e.target.closest('.picker-cancel-btn')) {
    e.preventDefault();
    e.stopPropagation();
    cancelValuePicker();
    return;
  }

  // Allow tab switching and top navigation during picker mode so user can navigate to the number they need!
  if (
    e.target.closest('#navTabs') ||
    e.target.closest('.sub-nav') ||
    e.target.closest('.top-nav-bar') ||
    e.target.closest('.drawer') ||
    e.target.closest('#drawerBackdrop') ||
    e.target.closest('.modal-close-btn')
  ) {
    // Allow normal click to switch tab, but keep picker active
    return;
  }

  const candidate = findNumericCandidate(e.target);
  if (candidate) {
    e.preventDefault();
    e.stopPropagation();

    // Value picked successfully!
    const pickedVal = candidate.value;

    // Visual feedback on element
    candidate.element.classList.remove('val-picker-hover');
    candidate.element.classList.add('val-picker-picked');
    setTimeout(() => {
      candidate.element.classList.remove('val-picker-picked');
    }, 450);

    // Insert into calculator
    insertValueIntoCalc(pickedVal);

    showCalcToast(`✓ Picked ${pickedVal >= 0 ? '+' : ''}${pickedVal.toFixed(2)} into Calculator`);

    // End picker mode and restore calculator
    stopValuePicker();
  }
}

function handlePickerKeyDown(e) {
  if (!calcState.isValuePickerActive) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelValuePicker();
  }
}

function startValuePicker() {
  calcState.isValuePickerActive = true;

  // Minimize calculator widget & show HUD
  const widget = document.getElementById('budgetCalculatorWidget');
  if (widget) widget.classList.add('calc-hidden-for-picker');

  const hud = document.getElementById('calculatorPickerHud');
  if (hud) {
    hud.style.display = 'flex';
    hud.classList.add('active');
  }

  document.body.classList.add('val-picker-mode');

  // Attach global capturing listeners
  document.addEventListener('pointermove', handlePickerPointerMove, true);
  document.addEventListener('click', handlePickerClick, true);
  document.addEventListener('keydown', handlePickerKeyDown, true);
}

function stopValuePicker() {
  calcState.isValuePickerActive = false;

  document.removeEventListener('pointermove', handlePickerPointerMove, true);
  document.removeEventListener('click', handlePickerClick, true);
  document.removeEventListener('keydown', handlePickerKeyDown, true);

  if (activePickerHoverEl) {
    activePickerHoverEl.classList.remove('val-picker-hover');
    activePickerHoverEl = null;
  }
  if (pickerTooltipEl) {
    pickerTooltipEl.style.display = 'none';
  }

  document.body.classList.remove('val-picker-mode');

  const hud = document.getElementById('calculatorPickerHud');
  if (hud) {
    hud.style.display = 'none';
    hud.classList.remove('active');
  }

  // Restore calculator window
  const widget = document.getElementById('budgetCalculatorWidget');
  if (widget) {
    widget.classList.remove('calc-hidden-for-picker');
    widget.style.display = 'flex';
  }
}

function cancelValuePicker() {
  stopValuePicker();
  showCalcToast('Value selection canceled');
}

function insertValueIntoCalc(val) {
  let valStr = '';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      valStr = val.toString();
    } else {
      const rounded = Number(Math.round(val + 'e+6') + 'e-6');
      valStr = rounded.toString();
    }
  } else {
    valStr = String(val);
  }
  
  if (calcState.currentInput === '0' || calcState.currentInput === 'Error' || calcState.currentInput === '') {
    calcState.currentInput = valStr;
  } else {
    calcState.currentInput = valStr;
  }
  updateCalcDisplay();
}

// =========================================================
// WINDOW POSITIONING, DRAG & MINIMIZE CONTROLS
// =========================================================

function openCalculator() {
  calcState.isOpen = true;
  calcState.isMinimized = false;

  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (badge) badge.style.display = 'none';
  if (widget) {
    widget.style.display = 'flex';
    widget.classList.remove('minimized');
    widget.classList.remove('calc-hidden-for-picker');
  }

  updateCalcDisplay();
}

function closeCalculator() {
  calcState.isOpen = false;
  calcState.isMinimized = false;
  if (calcState.isValuePickerActive) {
    stopValuePicker();
  }

  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (widget) widget.style.display = 'none';
  if (badge) badge.style.display = 'none';
}

function toggleCalculator() {
  if (calcState.isOpen && !calcState.isMinimized) {
    closeCalculator();
  } else {
    openCalculator();
  }
}

function minimizeCalculator() {
  calcState.isMinimized = true;
  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (widget) widget.style.display = 'none';
  if (badge) {
    badge.style.display = 'flex';
    const minResultEl = document.getElementById('calcMinResult');
    if (minResultEl) minResultEl.innerText = calcState.currentInput || '0';
  }
}

function restoreFromMinimized() {
  calcState.isMinimized = false;
  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (badge) badge.style.display = 'none';
  if (widget) {
    widget.style.display = 'flex';
  }
  updateCalcDisplay();
}

// Drag Handlers for Desktop/Tablet
function initCalcDraggable() {
  const widget = document.getElementById('budgetCalculatorWidget');
  const header = document.getElementById('calcDragHeader');
  if (!widget || !header) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  function onPointerDown(e) {
    if (e.target.closest('.calc-win-btn') || e.target.closest('button')) return;
    
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const rect = widget.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left = `${initialLeft}px`;
    widget.style.top = `${initialTop}px`;
    widget.classList.add('is-dragging');

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // Bounds checking
    const maxLeft = window.innerWidth - widget.offsetWidth - 10;
    const maxTop = window.innerHeight - widget.offsetHeight - 10;

    newLeft = Math.max(10, Math.min(newLeft, maxLeft));
    newTop = Math.max(10, Math.min(newTop, maxTop));

    widget.style.left = `${newLeft}px`;
    widget.style.top = `${newTop}px`;
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    widget.classList.remove('is-dragging');
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }

  header.addEventListener('pointerdown', onPointerDown);
}

// Global Keyboard Handler
function initCalcKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      toggleCalculator();
      return;
    }

    if (!calcState.isOpen || calcState.isMinimized) return;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      if (!activeEl.closest('#budgetCalculatorWidget')) {
        return;
      }
    }

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      calcInputDigit(e.key);
    } else if (e.key === '.') {
      e.preventDefault();
      calcInputDecimal();
    } else if (e.key === '+') {
      e.preventDefault();
      calcInputOperator('+');
    } else if (e.key === '-') {
      e.preventDefault();
      calcInputOperator('−');
    } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      calcInputOperator('×');
    } else if (e.key === '/') {
      e.preventDefault();
      calcInputOperator('÷');
    } else if (e.key === '%') {
      e.preventDefault();
      calcInputPercent();
    } else if (e.key === '(' || e.key === ')') {
      e.preventDefault();
      calcInputParen(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      calcEquals();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      calcClearEntry();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCalculator();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      calcClearAll();
    }
  });
}

// Initializer
function initCalculator() {
  loadCalcHistory();
  initCalcDraggable();
  initCalcKeyboard();
  updateCalcDisplay();
}

// --- static/js/app.js ---




















﻿
















function updateTopBarTitle() {
  const titleEl = document.getElementById('topBarMonthTitle');
  if (!titleEl) return;
  const yr = `'${String(appState.currentYear).slice(-2)}`;
  if (months.includes(appState.activeTab)) {
    titleEl.innerText = `${appState.activeTab} ${yr}`;
  } else if (appState.activeTab === 'Year') {
    titleEl.innerText = `Annual ${yr}`;
  } else if (appState.activeTab === 'Budgets') {
    titleEl.innerText = `Budgets ${yr}`;
  } else if (appState.activeTab === 'Bills') {
    titleEl.innerText = `Bills ${yr}`;
  } else if (appState.activeTab === 'Spend') {
    titleEl.innerText = `Live Spend ${yr}`;
  } else if (appState.activeTab === 'Settings') {
    titleEl.innerText = 'Settings';
  } else if (appState.activeTab) {
    titleEl.innerText = `${appState.activeTab} ${yr}`;
  } else {
    titleEl.innerText = `Budget ${yr}`;
  }
}

function renderYearMenu() {
  updateTopBarTitle();
  const disp = document.getElementById('currentYearDisplay');
  if (disp) disp.innerText = `'${String(appState.currentYear).slice(-2)}`;
  const yData = getYearData();
  const archiveBtn = document.getElementById('archiveYearActionBtn');
  if (archiveBtn) {
    archiveBtn.innerText = yData.archived ? '📦 Unarchive Year' : '📦 Archive Year';
  }
  
  const unarchivedYears = Object.keys(appState.data.years || {}).filter(y => !appState.data.years[y].archived).sort((a, b) => a - b);
  if (!unarchivedYears.includes(String(appState.currentYear))) unarchivedYears.push(String(appState.currentYear));
  
  const yearListEl = document.getElementById('yearListOptions');
  if (yearListEl) {
    yearListEl.innerHTML = unarchivedYears.map(y => `
      <button onclick="window.budgetApp.switchYear(${y})">${y == appState.currentYear ? '✓ ' : ''}${y}</button>
    `).join('');
  }
}

function renderUserProfileNav() {
  const profileDropdown = document.getElementById('userProfileDropdown');
  const userDisp = document.getElementById('currentUserDisplay');
  if (!profileDropdown) return;

  if (!isMultiUserEnabled()) {
    profileDropdown.style.setProperty('display', 'none', 'important');
    profileDropdown.classList.add('hidden');
    return;
  }

  profileDropdown.style.removeProperty('display');
  profileDropdown.classList.remove('hidden');
  profileDropdown.style.display = 'inline-block';
  const activeUser = getActiveUser();
  if (userDisp) {
    const displayName = activeUser === 'Joint' ? 'Joint' : activeUser;
    userDisp.innerText = displayName;
    userDisp.title = `Active Profile: ${displayName}`;
  }

  const optionsEl = document.getElementById('userProfileDropdownOptions');
  if (optionsEl) {
    const cfg = getSettings();
    let optsHtml = `
      <button onclick="window.budgetApp.switchActiveUser('Joint')">
        ${activeUser === 'Joint' ? '✓ ' : ''}👥 Joint / Household (Shared)
      </button>
    `;
    (cfg.people || []).forEach(p => {
      const pinActive = hasPersonPin(p);
      const unlocked = isUserUnlocked(p);
      const isSelected = activeUser === p;
      optsHtml += `
        <button onclick="window.budgetApp.switchActiveUser('${p}')">
          ${isSelected ? '✓ ' : ''}👤 ${p} ${pinActive ? (unlocked ? '🔓' : '🔒') : ''}
        </button>
      `;
    });
    optsHtml += `
      <div style="border-top:1px solid var(--border); margin-top:4px; padding-top:4px;">
        <button onclick="window.budgetApp.showProfileSelectionScreen()" style="color:var(--curr-border); font-weight:600;">👤 Switch User Profile</button>
        <button onclick="window.budgetApp.lockAllProfiles()">🔒 Lock All Profiles / Switch to Joint</button>
      </div>
    `;
    optionsEl.innerHTML = optsHtml;
  }
}

function renderOpenBankingNavStatus() {
  const btn = document.getElementById('openBankingSyncErrorBtn');
  if (!btn) return;
  const cfg = getSettings();
  const obCfg = cfg.open_banking || {};
  const status = obCfg.last_sync_status;
  const hasError = obCfg.enabled && (status === 'error' || status === 'partial_error' || Boolean(obCfg.last_sync_error));

  if (hasError) {
    btn.style.display = 'inline-flex';
    const errText = obCfg.last_sync_error || 'Open Banking Sync Error';
    btn.title = `⚠️ Open Banking Sync Issue: ${errText}\nClick to open Settings & view debug logs.`;
    const textSpan = btn.querySelector('.btn-text');
    if (textSpan) {
      textSpan.innerText = status === 'partial_error' ? ' Partial Sync' : ' Sync Error';
    }
  } else {
    btn.style.display = 'none';
  }
}

function showProfileSelectionScreen() {
  const overlay = document.getElementById('profileSelectionOverlay');
  const grid = document.getElementById('profileAvatarGrid');
  if (!overlay || !grid) return;

  const cfg = getSettings();
  const palettes = [
    { bg: 'linear-gradient(135deg, #059669, #0d9488)', icon: '👥' }, // Joint
    { bg: 'linear-gradient(135deg, #2563eb, #4f46e5)', icon: '👤' }, // Person 1
    { bg: 'linear-gradient(135deg, #e11d48, #db2777)', icon: '👤' }, // Person 2
    { bg: 'linear-gradient(135deg, #d97706, #b45309)', icon: '👤' }, // Person 3
    { bg: 'linear-gradient(135deg, #0891b2, #0284c7)', icon: '👤' }, // Person 4
    { bg: 'linear-gradient(135deg, #7c3aed, #9333ea)', icon: '👤' }  // Person 5
  ];

  let cardsHtml = '';

  // 1. Joint Household Profile Card
  cardsHtml += `
    <button class="profile-card" onclick="window.budgetApp.selectUserProfile('Joint')">
      <div class="profile-avatar-box" style="background: ${palettes[0].bg};">
        <span class="profile-avatar-icon">${palettes[0].icon}</span>
      </div>
      <span class="profile-card-name">Joint Household</span>
    </button>
  `;

  // 2. Member Profile Cards
  (cfg.people || []).forEach((p, idx) => {
    const pal = palettes[((idx % (palettes.length - 1)) + 1)];
    const pinSet = hasPersonPin(p);
    const unlocked = isUserUnlocked(p);
    cardsHtml += `
      <button class="profile-card" onclick="window.budgetApp.selectUserProfile('${p}')">
        <div class="profile-avatar-box" style="background: ${pal.bg};">
          <span class="profile-avatar-icon">${pal.icon}</span>
          ${pinSet ? `
            <div class="profile-lock-badge" title="${unlocked ? 'Unlocked for this session' : 'PIN Protected'}">
              ${unlocked ? '🔓' : '🔒'}
            </div>
          ` : ''}
        </div>
        <span class="profile-card-name">${p}</span>
      </button>
    `;
  });

  grid.innerHTML = cardsHtml;
  overlay.style.display = 'flex';
}

function hideProfileSelectionScreen() {
  const overlay = document.getElementById('profileSelectionOverlay');
  if (overlay) overlay.style.display = 'none';
}

function selectUserProfile(person) {
  if (person === 'Joint') {
    setActiveUser('Joint');
    hideProfileSelectionScreen();
    renderUserProfileNav();
    renderContent();
    return;
  }

  if (hasPersonPin(person) && !isUserUnlocked(person)) {
    openPinUnlockModal(person, () => {
      setActiveUser(person);
      hideProfileSelectionScreen();
      renderUserProfileNav();
      renderContent();
    });
    return;
  }

  setActiveUser(person);
  hideProfileSelectionScreen();
  renderUserProfileNav();
  renderContent();
}

function renderNav() {
  updateTopBarTitle();
  renderUserProfileNav();
  if (window.budgetApp && typeof window.budgetApp.updateLockNavBtn === 'function') {
    window.budgetApp.updateLockNavBtn();
  }
  const yData = getYearData();
  const cfg = getSettings();
  let html = months.map(m => {
    const md = yData.months[m] || {};
    if (md.archived) return '';
    return `<button class="tab-btn ${m === appState.activeTab ? 'active' : ''}" onclick="window.budgetApp.setTab('${m}')">${m}</button>`;
  }).join('');

  html += `<button class="tab-btn special ${appState.activeTab === 'Budgets' ? 'active' : ''}" onclick="window.budgetApp.setTab('Budgets')">🎯 Budgets & Occasions</button>`;
  html += `<button class="tab-btn special ${appState.activeTab === 'Bills' ? 'active' : ''}" onclick="window.budgetApp.setTab('Bills')">📅 Scheduled Bills</button>`;
  html += `<button class="tab-btn special ${appState.activeTab === 'Spend' ? 'active' : ''}" onclick="window.budgetApp.setTab('Spend')">🛒 Live Spend</button>`;
  html += `<button class="tab-btn special ${appState.activeTab === 'Year' ? 'active' : ''}" onclick="window.budgetApp.setTab('Year')">📊 Annual Trajectory</button>`;
  
  const navTabsEl = document.getElementById('navTabs');
  if (navTabsEl) navTabsEl.innerHTML = html;
}

function renderContent() {
  try {
    if (typeof reconcileTransactionsWithScheduledBills === 'function' && appState.data) {
      reconcileTransactionsWithScheduledBills(appState.data);
    }
    updateTopBarTitle();
    renderUserProfileNav();
    renderOpenBankingNavStatus();
    if (window.budgetApp && typeof window.budgetApp.updateLockNavBtn === 'function') {
      window.budgetApp.updateLockNavBtn();
    }
    const container = document.getElementById('appBody');
    const metaBar = document.getElementById('monthMetaBar');
    if (!container) return;

    if (appState.activeTab === 'Settings') {
      if (metaBar) {
        metaBar.style.display = 'flex';
        metaBar.innerHTML = `<span style="font-size:12px; font-weight:600; color:var(--text-muted);">⚙️ Global Settings & Household Setup</span>`;
      }
      renderSettingsView(container);
      return;
    }
    if (appState.activeTab === 'Budgets') {
      if (metaBar) {
        metaBar.style.display = 'flex';
        metaBar.innerHTML = `<span style="font-size:12px; font-weight:600; color:var(--text-muted);">🎯 Annual Budgets & Occasions (${appState.currentYear})</span>`;
      }
      renderBudgetsView(container);
      return;
    }
    if (appState.activeTab === 'Bills') {
      if (metaBar) {
        metaBar.style.display = 'flex';
        metaBar.innerHTML = `<span style="font-size:12px; font-weight:600; color:var(--text-muted);">📅 Scheduled & Recurring Bills (${appState.currentYear})</span>`;
      }
      renderBillsView(container);
      return;
    }
    if (appState.activeTab === 'Spend') {
      if (metaBar) {
        metaBar.style.display = 'flex';
        metaBar.innerHTML = `<span style="font-size:12px; font-weight:600; color:var(--text-muted);">🛒 Live Spend & Category Analytics</span>`;
      }
      try {
        if (typeof renderSpendAnalyticsView === 'function') {
          renderSpendAnalyticsView(container);
        } else if (typeof window !== 'undefined' && typeof window.renderSpendAnalyticsView === 'function') {
          window.renderSpendAnalyticsView(container);
        } else if (window.budgetApp && typeof window.budgetApp.renderSpendAnalyticsView === 'function') {
          window.budgetApp.renderSpendAnalyticsView(container);
        } else {
          container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--red);">⚠️ Live Spend module loading... Please hard refresh (Ctrl + F5).</div>';
        }
      } catch (err) {
        console.error("Error rendering Live Spend:", err);
        container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--red);">⚠️ Error rendering Live Spend: ${err.message}</div>`;
      }
      return;
    }
    if (appState.activeTab === 'Year') {
      if (metaBar) {
        metaBar.style.display = 'flex';
        metaBar.innerHTML = `<span style="font-size:12px; font-weight:600; color:var(--text-muted);">📊 Annual Trajectory & Year Overview (${appState.currentYear})</span>`;
      }
      renderYearOverviewView(container);
      return;
    }

    const mIdx = months.indexOf(appState.activeTab);
    const schedule = calculateMonthSchedule(appState.currentYear, mIdx);
    const yData = getYearData();
    const isArchived = !!(yData.months[appState.activeTab] && yData.months[appState.activeTab].archived);

    if (metaBar) {
      metaBar.style.display = 'flex';
      metaBar.innerHTML = `
        <div class="payday-period-text" style="display:flex; align-items:center; gap:6px; cursor:pointer; min-width:0;" onclick="window.budgetApp.openDateOverrideModal('${appState.activeTab}')" title="Click to override payday period">
          <span style="font-size:12px; color:var(--heading); font-weight:500;">📅 Payday: <strong style="color:var(--curr-border); font-weight:700;">${schedule.dateRangeStr}</strong> (${schedule.numWeeks} Wks) ✏️</span>
        </div>
        <button class="btn secondary payday-archive-btn" onclick="window.budgetApp.toggleArchiveMonth('${appState.activeTab}')" title="${isArchived ? 'Restore this month to navigation tabs' : 'Hide this completed month from top bar'}">
          <span class="btn-icon">📦</span><span class="btn-text"> ${isArchived ? 'Unarchive Month' : 'Archive Month'}</span>
        </button>
      `;
    }

    renderOverviewView(container);
  } catch(e) {
    console.error("Render Error:", e);
    const errBanner = document.getElementById('errorBanner');
    if (errBanner) {
      errBanner.style.display = 'block';
      errBanner.innerText = `Render Error: ${e.message}\n${e.stack}`;
    }
  }
}

function bindGlobalEvents() {
  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('sideDrawer');
    const openBtn = document.getElementById('openDrawerBtn');
    if (drawer && drawer.classList.contains('open')) {
      if (!drawer.contains(e.target) && !openBtn?.contains(e.target)) {
        window.budgetApp.closeDrawer();
      }
    }
    if (!e.target.closest('.dropdown')) {
      document.querySelector('.dropdown')?.classList.remove('open');
    }
  });

  const modalClose = document.getElementById('modalCloseBtn');
  if (modalClose) {
    modalClose.onclick = () => window.budgetApp.closeModal();
  }

  const genericModal = document.getElementById('genericModal');
  if (genericModal) {
    genericModal.onclick = (e) => {
      if (e.target === genericModal) window.budgetApp.closeModal();
    };
  }
}

function scrollToCurrentWeek(smooth = true) {
  setTimeout(() => {
    const currentWeekEl = document.querySelector('.week-card.current-week');
    if (currentWeekEl) {
      currentWeekEl.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center',
        inline: 'nearest'
      });
      currentWeekEl.classList.remove('week-highlight-pulse');
      void currentWeekEl.offsetWidth;
      currentWeekEl.classList.add('week-highlight-pulse');
      setTimeout(() => currentWeekEl.classList.remove('week-highlight-pulse'), 1500);
    }
  }, 120);
}

async function init() {
  try {
    // Build ID check & storage cache purge
    const currentBuild = window.__BUILD_ID__ || '';
    const storedBuild = localStorage.getItem('budget_app_build_id');
    if (storedBuild && currentBuild && storedBuild !== currentBuild) {
      console.log('[BudgetApp] Rebuild detected (' + storedBuild + ' -> ' + currentBuild + '). Purging stale storage.');
      const savedTheme = localStorage.getItem('budget_theme');
      localStorage.clear();
      sessionStorage.clear();
      if (savedTheme) localStorage.setItem('budget_theme', savedTheme);
      localStorage.setItem('budget_app_build_id', currentBuild);
    } else if (currentBuild) {
      localStorage.setItem('budget_app_build_id', currentBuild);
    }

    // Setup background auto-reload on focus if container was rebuilt
    if (!window.__hasVersionFocusListener) {
      window.__hasVersionFocusListener = true;
      let lastVersionCheck = Date.now();
      window.addEventListener('focus', async () => {
        try {
          const now = Date.now();
          if (now - lastVersionCheck < 60000) return; // At most once a minute
          lastVersionCheck = now;
          let p = window.location.pathname;
          if (p.endsWith('index.html')) p = p.slice(0, -10);
          if (!p.endsWith('/')) p += '/';
          const r = await fetch(p + 'api/version', { cache: 'no-store' });
          if (r.ok) {
            const vData = await r.json();
            if (vData && vData.build_id && window.__BUILD_ID__ && String(vData.build_id) !== String(window.__BUILD_ID__)) {
              console.log('[BudgetApp] New version detected on server (' + vData.build_id + '). Auto-reloading...');
              window.location.reload(true);
            }
          }
        } catch (e) {}
      });
    }
    const data = await fetchBudget();
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      appState.data = data;
    }

    // Check for Open Banking redirect callback (OAuth code, req_id, state)
    try {
      let searchStr = window.location.search;
      try {
        if ((!searchStr || searchStr.length <= 1) && window.top && window.top !== window && window.top.location && window.top.location.search) {
          searchStr = window.top.location.search;
        }
      } catch (topErr) {}

      if (searchStr && searchStr.length > 1) {
        const urlParams = new URLSearchParams(searchStr);
        const reqId = urlParams.get('req_id') || urlParams.get('ref');
        const code = urlParams.get('code');
        const state = urlParams.get('state') || urlParams.get('session_id');

        if (code || reqId || state) {
          console.log('[OpenBanking] Handling return callback:', { reqId, code, state });
          const explicitRedirect = (appState.data?.settings?.open_banking?.redirect_uri || '').trim();
          const redirectUri = explicitRedirect || (window.location.protocol + "//" + window.location.host + window.location.pathname);
          const cbRes = await callbackOpenBankingRequisition(reqId || state, code, state, redirectUri);
          if (cbRes && cbRes.success) {
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            try {
              window.history.replaceState({path: cleanUrl}, '', cleanUrl);
              if (window.top && window.top !== window) {
                const topClean = window.top.location.protocol + "//" + window.top.location.host + window.top.location.pathname;
                window.top.history.replaceState({path: topClean}, '', topClean);
              }
            } catch (histErr) {}
            const freshData = await fetchBudget();
            if (freshData) appState.data = freshData;
          }
        }
      }
    } catch (e) {
      console.error('[OpenBanking] Callback handling error:', e);
    }

    const cfg = getSettings();
    applyTheme(cfg.theme || 'grey_dark');

    bindGlobalEvents();
    initCalculator();

    // Fetch and initialize dynamic categories from API/cache
    try {
      const catRes = await fetchCategories();
      if (catRes && catRes.categories && typeof setDynamicCategories === 'function') {
        setDynamicCategories(catRes.categories);
      }
    } catch (catErr) {
      console.warn('[Categories] Init categories notice:', catErr);
    }

    if (!cfg.onboarding_complete) {
      startOnboarding();
    } else {
      const now = new Date();
      if (!appState.data.years || !appState.data.years[appState.currentYear]) {
        appState.currentYear = now.getFullYear();
      }
      const detected = detectCurrentMonthAndWeek(appState.currentYear);
      if (detected && detected.month) {
        appState.activeTab = detected.month;
      }

      if (window.budgetApp && typeof window.budgetApp.applyOpenBankingToCheckins === 'function') {
        window.budgetApp.applyOpenBankingToCheckins();
      }

      calculateAndSyncRollovers();
      renderYearMenu();
      renderNav();
      renderContent();

      if (typeof window.budgetApp.updateLockNavBtn === 'function') {
        window.budgetApp.updateLockNavBtn();
      }

      if (!cfg.enable_multi_user && hasPersonPin('Master') && !appState.isMasterUnlocked) {
        openPinUnlockModal('Master', () => {
          appState.isMasterUnlocked = true;
          if (typeof window.budgetApp.updateLockNavBtn === 'function') {
            window.budgetApp.updateLockNavBtn();
          }
          renderNav();
          renderContent();
        });
        return;
      }

      if (isMultiUserEnabled()) {
        showProfileSelectionScreen();
      }
    }
  } catch (err) {
    console.error("Initialization error:", err);
    const errBanner = document.getElementById('errorBanner');
    if (errBanner) {
      errBanner.style.display = 'block';
      errBanner.innerText = `Init Error: ${err.message}\n${err.stack}`;
    }
  }
}

// Attach all functions to window.budgetApp
window.budgetApp = {
  init,
  renderContent,
  renderSpendAnalyticsView,
  renderNav,
  renderYearMenu,
  updateTopBarTitle,
  showModal,
  closeModal,
  openDateOverrideModal,
  openMoveItemModal,
  updateMoveWeekOptions,
  openRescheduleRecurringModal,
  updateReschedWeekOptions,
  openAccountTrackingModal,
  openYearlyRecurringModal() { this.setTab('Bills'); },
  openYearlyRecurringView() { this.setTab('Bills'); },
  openArchiveManagerModal,

  // Calculator & Value Picker Methods
  openCalculator,
  closeCalculator,
  toggleCalculator,
  minimizeCalculator,
  restoreFromMinimized,
  startValuePicker,
  stopValuePicker,
  cancelValuePicker,
  insertValueIntoCalc,
  calcInputDigit,
  calcInputDecimal,
  calcToggleSign,
  calcInputOperator,
  calcInputParen,
  calcInputPercent,
  calcClearEntry,
  calcClearAll,
  calcEquals,
  toggleCalcHistory,
  clearCalcHistory,
  useHistoryResult,
  copyCalcResult,
  initCalculator,

  setTab(tabName) {
    appState.activeTab = tabName;
    renderNav();
    renderContent();
  },

  scrollToCurrentWeek,

  handleLogoClick() {
    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek(appState.currentYear) : null;
    const targetMonth = (detected && detected.month) ? detected.month : (months.includes(appState.activeTab) ? appState.activeTab : 'Jan');
    const isMainMonthTab = months.includes(appState.activeTab);

    if (!isMainMonthTab || appState.activeTab === 'Settings' || appState.activeSubTab !== 'overview') {
      appState.activeTab = targetMonth;
      appState.activeSubTab = 'overview';
      renderNav();
      renderContent();
      scrollToCurrentWeek(true);
    } else {
      if (appState.activeTab !== targetMonth) {
        appState.activeTab = targetMonth;
        appState.activeSubTab = 'overview';
        renderNav();
        renderContent();
      }
      scrollToCurrentWeek(true);
    }
  },

  openBankLinkModal,
  openTransactionLedgerModal,

  toggleOpenBankingEnabled(enabled) {
    const cfg = getSettings();
    cfg.open_banking = cfg.open_banking || {};
    cfg.open_banking.enabled = !!enabled;
    saveOpenBankingConfig({ enabled: !!enabled });
    saveBudget(appState.data);
    renderContent();
  },

  updateOpenBankingProvider(provider) {
    const cfg = getSettings();
    cfg.open_banking = cfg.open_banking || {};
    cfg.open_banking.provider = provider;
    saveOpenBankingConfig({ provider });
    saveBudget(appState.data);
    renderContent();
  },

  async saveOpenBankingKeys() {
    const provider = document.getElementById('cfg-openbanking-provider')?.value || 'enablebanking';
    const env = document.getElementById('cfg-openbanking-env')?.value || 'live';
    const secId = document.getElementById('cfg-openbanking-secret-id')?.value || '';
    const secKey = document.getElementById('cfg-openbanking-secret-key')?.value || '';
    const redirectUri = document.getElementById('cfg-openbanking-redirect-uri')?.value || '';
    const intervalVal = parseInt(document.getElementById('cfg-openbanking-interval')?.value || '6', 10);
    const cfg = getSettings();
    cfg.open_banking = cfg.open_banking || {};
    cfg.open_banking.provider = provider;
    cfg.open_banking.environment = env;
    cfg.open_banking.secret_id = secId.trim();
    cfg.open_banking.secret_key = secKey.trim();
    cfg.open_banking.redirect_uri = redirectUri.trim();
    cfg.open_banking.auto_sync_interval_hours = isNaN(intervalVal) ? 6 : intervalVal;

    await saveOpenBankingConfig({
      secret_id: secId.trim(),
      secret_key: secKey.trim(),
      provider: provider,
      environment: env,
      redirect_uri: redirectUri.trim(),
      auto_sync_interval_hours: isNaN(intervalVal) ? 6 : intervalVal,
      enabled: true
    });
    cfg.open_banking.enabled = true;
    saveBudget(appState.data);
    alert('✅ Provider API credentials and auto-sync settings saved successfully!');
    renderContent();
  },

  openBankStatementUploadModal() {
    openBankStatementUploadModal();
  },

  openManualAuthCodeModal() {
    openManualAuthCodeModal();
  },

  async submitManualAuthCode(rawInput) {
    if (!rawInput || !rawInput.trim()) {
      alert('Please enter or paste the return URL or authorization code.');
      return;
    }
    const txt = rawInput.trim();

    // Check if the user accidentally pasted the initial auth link instead of the return URL
    if (txt.includes('auth.truelayer.com') || (txt.includes('response_type=code') && !txt.includes('code='))) {
      alert('⚠️ Notice: It looks like you pasted the initial bank authorization link instead of the return URL.\n\nPlease complete the bank login in your browser first. Once approved, your bank redirects to a URL containing "?code=...". Copy and paste that return URL here.');
      return;
    }

    let code = null;
    let state = null;
    let reqId = null;
    let extractedRedirectUri = null;

    if (txt.includes('?') || txt.includes('&') || txt.includes('http')) {
      try {
        const urlObj = txt.startsWith('http') ? new URL(txt) : new URL('https://dummy.local/?' + txt.replace(/^\?/, ''));
        code = urlObj.searchParams.get('code');
        state = urlObj.searchParams.get('state') || urlObj.searchParams.get('session_id');
        reqId = urlObj.searchParams.get('req_id') || urlObj.searchParams.get('ref');
        if (txt.startsWith('http')) {
          extractedRedirectUri = urlObj.origin + urlObj.pathname;
        }
      } catch (e) {
        const codeMatch = txt.match(/[?&]code=([^&\s]+)/);
        if (codeMatch) code = decodeURIComponent(codeMatch[1]);
        const stateMatch = txt.match(/[?&]state=([^&\s]+)/);
        if (stateMatch) state = decodeURIComponent(stateMatch[1]);
      }
    } else {
      code = txt;
    }

    if (!code) {
      alert('⚠️ No valid authorization code found in the pasted URL. Please make sure the return URL contains "?code=..."');
      return;
    }

    const cfg = getSettings();
    const explicitRedirect = cfg.open_banking?.redirect_uri?.trim();
    const redirectUri = extractedRedirectUri || explicitRedirect || (window.location.protocol + "//" + window.location.host + window.location.pathname);

    const res = await callbackOpenBankingRequisition(reqId || state, code, state, redirectUri);
    if (res && res.success) {
      const freshData = await fetchBudget();
      if (freshData) appState.data = freshData;
      calculateAndSyncRollovers();
      closeModal();
      renderContent();
      const count = (res.linked_accounts || []).length;
      alert(`🎉 Successfully connected and linked ${count} bank account${count === 1 ? '' : 's'}!`);
    } else {
      alert(`⚠️ Could not register bank account:\n${res?.error || 'Unknown error'}\n\nPlease verify that your Client ID and Client Secret in Settings match your TrueLayer Console.`);
    }
  },

  async handleStatementFileSelected(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('statementUploadStatus');
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--text-muted)';
      statusEl.textContent = '⏳ Reading and processing statement file...';
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const targetAcc = document.getElementById('statementTargetAccount')?.value || 'Checking';
      const owner = document.getElementById('statementOwner')?.value || 'Joint';

      const res = await uploadBankStatement(content, file.name, targetAcc, owner);
      if (res && res.success) {
        if (statusEl) {
          statusEl.style.color = 'var(--green)';
          statusEl.textContent = `✅ Successfully imported ${res.imported_count} transactions (${res.auto_cleared_count} bills auto-cleared)!`;
        }
        await loadRemoteBudget();
        renderContent();
        setTimeout(() => {
          window.budgetApp.closeModal();
          alert(`✅ Successfully imported ${res.imported_count} transactions!\n⚡ ${res.auto_cleared_count} scheduled Direct Debits were automatically matched & marked Paid.`);
        }, 800);
      } else {
        if (statusEl) {
          statusEl.style.color = 'var(--red)';
          statusEl.textContent = `❌ Import failed: ${res.error || 'Invalid file format'}`;
        }
      }
    };
    reader.readAsText(file);
  },

  _institutionsCache: [],

  async loadBankInstitutions(country = 'GB') {
    const listEl = document.getElementById('bankInstitutionsList');
    if (!listEl) return;
    listEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--text-muted); font-size:12px;">Loading supported banks...</div>`;

    const res = await getOpenBankingInstitutions(country);
    if (res && res.success && res.institutions) {
      window.budgetApp._institutionsCache = res.institutions;
      window.budgetApp.renderInstitutionsGrid(res.institutions);
    } else {
      listEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--red); font-size:12px;">Failed to load institutions: ${res.error || 'Check API keys in Settings'}</div>`;
    }
  },

  renderInstitutionsGrid(insts) {
    const listEl = document.getElementById('bankInstitutionsList');
    if (!listEl) return;
    if (!insts || insts.length === 0) {
      listEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--text-muted); font-size:12px;">No institutions found matching search.</div>`;
      return;
    }

    listEl.innerHTML = insts.map(inst => {
      const initial = (inst.name || 'B').replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || 'B';
      const brandColor = inst.color || '#0284c7';

      const logoHtml = inst.logo ? `
        <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center; margin-bottom:6px;">
          <img src="${inst.logo}" alt="" style="width:38px; height:38px; border-radius:8px; object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy">
          <div style="display:none; width:38px; height:38px; border-radius:8px; background:${brandColor}; color:#fff; align-items:center; justify-content:center; font-weight:800; font-size:16px; box-shadow:0 2px 5px rgba(0,0,0,0.25);">
            ${initial}
          </div>
        </div>
      ` : `
        <div style="width:38px; height:38px; border-radius:8px; background:${brandColor}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px; margin-bottom:6px; box-shadow:0 2px 5px rgba(0,0,0,0.25);">
          ${initial}
        </div>
      `;

      return `
        <button type="button" class="btn secondary" onclick="window.budgetApp.selectBankInstitution(this.dataset.instid, this.dataset.instname, this.dataset.instlogo)" data-instid="${inst.id}" data-instname="${inst.name || 'Bank'}" data-instlogo="${inst.logo || ''}" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 6px; border-radius:10px; border:1px solid var(--border); text-align:center; min-height:92px; cursor:pointer; background:var(--panel-bg); transition:transform 0.1s, border-color 0.15s;" onmouseover="this.style.borderColor='var(--curr-border)'" onmouseout="this.style.borderColor='var(--border)'">
          ${logoHtml}
          <span style="font-size:11px; font-weight:600; line-height:1.2; color:var(--heading);">${inst.name || 'Bank'}</span>
        </button>
      `;
    }).join('');
  },

  filterBankList(query) {
    const q = (query || '').toLowerCase().trim();
    const all = window.budgetApp._institutionsCache || [];
    if (!q) {
      window.budgetApp.renderInstitutionsGrid(all);
    } else {
      const filtered = all.filter(i => {
        const name = (i.name || '').toLowerCase();
        const id = (i.id || '').toLowerCase();
        const bic = (i.bic || '').toLowerCase();
        if (name.includes(q) || id.includes(q) || bic.includes(q)) return true;
        // Nickname / alias matching
        if (q === 'amex' && (name.includes('american express') || id.includes('amex'))) return true;
        if (q.includes('barclay') && (name.includes('barclay') || id.includes('barclay'))) return true;
        if (q.includes('capital') && (name.includes('capital') || id.includes('capital'))) return true;
        if (q === 'mbna' && (name.includes('mbna') || id.includes('mbna'))) return true;
        if (q === 'rbs' && (name.includes('royal bank of scotland') || id.includes('rbos'))) return true;
        if (q === 'bos' && name.includes('bank of scotland')) return true;
        if (q === 'boa' && name.includes('bank of america')) return true;
        if (q === 'citi' && (name.includes('citibank') || name.includes('citi'))) return true;
        if (q === 'coop' && name.includes('co-operative')) return true;
        if (q === 'bnp' && name.includes('bnp')) return true;
        if (q === 'td' && name.includes('td bank')) return true;
        if (q === 'aib' && name.includes('allied irish')) return true;
        if (q === 'boi' && name.includes('bank of ireland')) return true;
        return false;
      });
      window.budgetApp.renderInstitutionsGrid(filtered);
    }
  },

  changeBankCountry(country) {
    window.budgetApp.loadBankInstitutions(country);
  },

  async selectBankInstitution(institutionId, institutionName, institutionLogo) {
    const owner = document.getElementById('bankLinkOwner')?.value || 'Joint';
    const cfg = getSettings();
    const explicitRedirect = cfg.open_banking?.redirect_uri?.trim();
    const redirectUri = explicitRedirect || (window.location.protocol + "//" + window.location.host + window.location.pathname);

    const res = await createOpenBankingRequisition(institutionId, redirectUri, institutionName, institutionLogo, owner);
    if (res && res.success && res.link) {
      // Break out of Home Assistant Ingress iframe so X-Frame-Options does not block the bank login page
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = res.link;
          return;
        }
      } catch (e) {
        console.warn('Cross-origin iframe navigation notice:', e);
      }
      try {
        window.location.href = res.link;
      } catch (e) {
        window.open(res.link, '_blank');
      }
    } else {
      alert('⚠️ Could not initiate bank authorization: ' + (res.error || 'Unknown error'));
    }
  },

  toggleOpenBankingAutoCheckins(enabled) {
    const cfg = getSettings();
    cfg.open_banking = cfg.open_banking || {};
    cfg.open_banking.auto_update_checkins = !!enabled;
    saveOpenBankingConfig({ auto_update_checkins: !!enabled });
    if (enabled) {
      this.applyOpenBankingToCheckins();
    }
    saveBudget(appState.data);
    renderContent();
  },

  toggleOpenBankingLiveDailyVariance(enabled) {
    const cfg = getSettings();
    cfg.open_banking = cfg.open_banking || {};
    cfg.open_banking.live_daily_variance = !!enabled;
    saveOpenBankingConfig({ live_daily_variance: !!enabled });
    saveBudget(appState.data);
    renderContent();
  },

  toggleOpenBankingDebugLogging(enabled) {
    const cfg = getSettings();
    cfg.open_banking = cfg.open_banking || {};
    cfg.open_banking.debug_logging = !!enabled;
    saveOpenBankingConfig({ debug_logging: !!enabled });
    saveBudget(appState.data);
    renderContent();
  },

  setSpendAnalyticsTimeframe(timeframe) {
    appState.spendFilterTimeframe = timeframe;
    renderContent();
  },

  setSpendAnalyticsAccount(account) {
    appState.spendFilterAccount = account;
    renderContent();
  },

  setSpendCategoryFilter(catId) {
    appState.spendFilterCategory = (appState.spendFilterCategory === catId) ? 'all' : catId;
    renderContent();
  },

  setSpendSearchQuery(query) {
    appState.spendSearchQuery = query;
    renderContent();
  },

  openRecategorizeModal(txnId, merchantName, currentCatId) {
    openRecategorizeModal(txnId, merchantName, currentCatId);
  },

  applyOpenBankingToCheckins() {
    const cfg = getSettings();
    const obCfg = cfg.open_banking || {};
    if (!obCfg.enabled || obCfg.auto_update_checkins === false) return false;

    const linked = obCfg.linked_accounts || [];
    if (!linked.length) return false;

    const currentInfo = detectCurrentMonthAndWeek(appState.currentYear);
    if (!currentInfo || !currentInfo.month || !currentInfo.week) return false;

    const curMonth = currentInfo.month;
    const curWeek = currentInfo.week;
    const actuals = getWeekActuals(curMonth, curWeek);
    if (!actuals._timestamps) actuals._timestamps = {};
    if (!actuals._sources) actuals._sources = {};

    let updated = false;
    const currAccounts = cfg.current_accounts || [];
    const creditAccounts = cfg.credit_accounts || [];
    const savingsAccounts = cfg.savings_accounts || [];

    for (const item of linked) {
      const mappedRaw = item.mapped_habit_account_id || '';
      const mapped = mappedRaw.replace(/^(credit|current|savings):/i, '').trim();
      const liveBal = item.last_balance;
      if (!mapped) continue;

      // 1. Current Account
      const isCurrent = currAccounts.some(a => {
        const name = typeof a === 'string' ? a : (a.name || '');
        return name.toLowerCase() === mapped.toLowerCase();
      });
      if (isCurrent) {
        const cObj = currAccounts.find(a => (typeof a === 'string' ? a : (a.name || '')).toLowerCase() === mapped.toLowerCase());
        const cName = typeof cObj === 'string' ? cObj : (cObj.name || mapped);
        const fieldKey = `curr_${cName}`;
        if (actuals._sources && actuals._sources[fieldKey] === 'manual') {
          // Manual check-in overrides Open Banking
        } else {
          actuals[fieldKey] = Number(liveBal || 0);
          actuals._timestamps[fieldKey] = item.last_sync_timestamp || new Date().toISOString();
          actuals._sources[fieldKey] = 'open_banking';
          updated = true;
        }
      }

      // 2. Savings Account
      const isSavings = savingsAccounts.some(s => {
        const name = typeof s === 'string' ? s : (s.name || '');
        return name.toLowerCase() === mapped.toLowerCase();
      });
      if (isSavings) {
        const sObj = savingsAccounts.find(s => (typeof s === 'string' ? s : (s.name || '')).toLowerCase() === mapped.toLowerCase());
        const sName = typeof sObj === 'string' ? sObj : (sObj.name || mapped);
        const fieldKey = `sav_${sName}`;
        if (actuals._sources && actuals._sources[fieldKey] === 'manual') {
          // Manual check-in overrides Open Banking
        } else {
          actuals[fieldKey] = Number(liveBal || 0);
          actuals._timestamps[fieldKey] = item.last_sync_timestamp || new Date().toISOString();
          actuals._sources[fieldKey] = 'open_banking';
          updated = true;
        }
      }

      // 3. Credit Card
      const cObj = creditAccounts.find(c => {
        const name = typeof c === 'string' ? c : (c.name || '');
        return name.toLowerCase() === mapped.toLowerCase() || name.toLowerCase() === mappedRaw.toLowerCase();
      });
      if (cObj) {
        const cName = typeof cObj === 'string' ? cObj : (cObj.name || mapped);
        const fieldKey = `c_avail_${cName}`;
        if (actuals._sources && actuals._sources[fieldKey] === 'manual') {
          // Manual check-in overrides Open Banking
        } else {
          let limit = Number(typeof cObj === 'object' ? (cObj.limit || 0) : 0);
          if (limit <= 0 && item.credit_limit) {
            limit = Number(item.credit_limit);
            if (typeof cObj === 'object') cObj.limit = limit;
          }

          let debt = Math.abs(Number(liveBal || 0));
          if (debt === 0 && (!item.last_available || Number(item.last_available) === 0)) {
            const allTxns = appState.data?.open_banking_transactions || [];
            const cardTxns = allTxns.filter(t => String(t.account_id) === String(item.account_id));
            if (cardTxns.length > 0) {
              let spentSum = 0;
              for (const t of cardTxns) {
                const amt = Number(t.amount || 0);
                if (amt < 0) spentSum += Math.abs(amt);
                else if (amt > 0) spentSum -= amt;
              }
              if (spentSum > 0) {
                debt = Math.round(spentSum * 100) / 100;
                item.last_balance = debt;
              }
            }
          }

          let avail = 0;
          if (item.last_available !== undefined && item.last_available !== null && Number(item.last_available) > 0) {
            avail = Number(item.last_available);
          } else if (limit > 0) {
            avail = Math.max(0, limit - debt);
          }

          actuals[fieldKey] = avail;
          actuals._timestamps[fieldKey] = item.last_sync_timestamp || new Date().toISOString();
          actuals._sources[fieldKey] = 'open_banking';
          updated = true;
        }
      }
    }

    if (updated) {
      calculateAndSyncRollovers();
      return true;
    }
    return false;
  },

  async updateLinkedAccountMapping(accountId, mappedHabitAccountId) {
    const cfg = getSettings();
    if (!cfg.open_banking) cfg.open_banking = {};
    if (!cfg.open_banking.linked_accounts) cfg.open_banking.linked_accounts = [];

    const acc = cfg.open_banking.linked_accounts.find(a => String(a.account_id) === String(accountId) || a.account_name === accountId);
    if (acc) {
      acc.mapped_habit_account_id = mappedHabitAccountId || null;
      const cleanName = (mappedHabitAccountId || '').replace(/^(credit|current|savings):/i, '').trim();

      if (appState.data && appState.data.open_banking_transactions) {
        for (const t of appState.data.open_banking_transactions) {
          if (String(t.account_id) === String(acc.account_id) || t.account_id === acc.account_name) {
            t.account_name = cleanName || acc.account_name;
          }
        }
      }

      renderContent();
      try {
        await mapOpenBankingAccount(acc.account_id || accountId, mappedHabitAccountId || null, acc.owner || 'Joint');
      } catch (e) {
        console.warn("mapOpenBankingAccount error:", e);
      }
      this.applyOpenBankingToCheckins();
      await saveBudget(appState.data);
      renderContent();
    }
  },

  async updateLinkedAccountOwner(accountId, newOwner) {
    const cfg = getSettings();
    if (!cfg.open_banking) cfg.open_banking = {};
    if (!cfg.open_banking.linked_accounts) cfg.open_banking.linked_accounts = [];

    const acc = cfg.open_banking.linked_accounts.find(a => String(a.account_id) === String(accountId) || a.account_name === accountId);
    if (acc) {
      acc.owner = newOwner;
      renderContent();
      try {
        await mapOpenBankingAccount(acc.account_id || accountId, acc.mapped_habit_account_id || null, newOwner);
      } catch (e) {
        console.warn("mapOpenBankingAccount error:", e);
      }
      await saveBudget(appState.data);
      renderContent();
    }
  },

  async unlinkAccount(accountId) {
    if (!confirm('Are you sure you want to disconnect this bank account feed?')) return;
    await unlinkOpenBanking(accountId);
    const cfg = getSettings();
    if (cfg.open_banking && cfg.open_banking.linked_accounts) {
      cfg.open_banking.linked_accounts = cfg.open_banking.linked_accounts.filter(a => {
        if (!a.account_id && (!accountId || String(accountId) === 'None' || String(accountId) === 'null')) return false;
        return String(a.account_id) !== String(accountId);
      });
    }
    await saveBudget(appState.data);
    renderContent();
  },

  handleOpenBankingSyncErrorClick() {
    this.openDrawer('settings');
    setTimeout(() => {
      const el = document.getElementById('openBankingErrorBanner') || document.getElementById('linkedAccountsList') || document.getElementById('cfg-openbanking-provider');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  },

  async triggerOpenBankingSync() {
    const res = await syncOpenBanking();
    const freshData = await fetchBudget();
    if (freshData) appState.data = freshData;
    this.applyOpenBankingToCheckins();
    calculateAndSyncRollovers();
    renderContent();

    if (res && res.status === 'success') {
      alert(`✅ Synchronized ${res.synced_accounts || 0} accounts (${res.transactions_added || 0} new transactions).\n⚡ Live check-in balances have been updated for this week!`);
    } else if (res && res.status === 'partial_error') {
      alert(`⚠️ Partial Sync Notice:\nSynchronized ${res.synced_accounts || 0} of ${res.total_accounts || 0} accounts.\n${res.error || ''}`);
    } else if (res && res.status === 'error') {
      alert(`❌ Open Banking Sync Failed:\n${res.error || 'Unable to communicate with provider API.'}\n\nPlease check your bank authorization or view the debug log in Settings.`);
    } else if (res && res.status === 'disabled') {
      alert('Notice: Open Banking is currently disabled in Settings.');
    } else {
      alert('Notice: ' + (res?.status || 'Sync completed'));
    }
  },

  findScheduledItem(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr) {
    const mName = months.includes(monthName) ? monthName : (appState.activeTab || 'Jan');
    const yData = getYearData();
    const mData = getMonthData(mName);
    const cfg = getSettings();
    const amt = Number(billAmount) || 0;

    const isMatch = (cand) => cand && (!billDesc || cand.desc === billDesc || cand.name === billDesc || (cand.rawDesc && cand.rawDesc === billDesc));

    if (sourceType === 'direct_debit' && mData.direct_debits) {
      if (sourceIdx !== undefined && isMatch(mData.direct_debits[sourceIdx])) return mData.direct_debits[sourceIdx];
    } else if ((sourceType === 'payments_in' || sourceType === 'monthly_payment_in') && mData.payments_in) {
      if (sourceIdx !== undefined && isMatch(mData.payments_in[sourceIdx])) return mData.payments_in[sourceIdx];
    } else if (sourceType === 'scheduled_item' && mData.scheduled_items) {
      if (sourceIdx !== undefined && isMatch(mData.scheduled_items[sourceIdx])) return mData.scheduled_items[sourceIdx];
    } else if (sourceType === 'yearly_recurring' && yData.yearly_recurring) {
      if (sourceIdx !== undefined && isMatch(yData.yearly_recurring[sourceIdx])) return yData.yearly_recurring[sourceIdx];
    } else if (sourceType === 'yearly_income' && yData.yearly_income) {
      if (sourceIdx !== undefined && isMatch(yData.yearly_income[sourceIdx])) return yData.yearly_income[sourceIdx];
    } else if (sourceType === 'recurring_payment') {
      const recurring = yData.recurring_payments || cfg.recurring_payments || [];
      if (sourceIdx !== undefined && isMatch(recurring[sourceIdx])) return recurring[sourceIdx];
    } else if (sourceType === 'recurring_income') {
      const recurring = yData.recurring_incomes || cfg.recurring_incomes || [];
      if (sourceIdx !== undefined && isMatch(recurring[sourceIdx])) return recurring[sourceIdx];
    } else if (sourceType === 'budget_bill' || sourceType === 'budget') {
      for (const b of (yData.yearly_budgets || [])) {
        for (const t of (b.transactions || [])) {
          const combined = `🎯 ${b.name}: ${t.desc || ''}`.trim();
          if (t.desc === billDesc || combined === billDesc || (dateStr && t.date === dateStr) || Math.abs((Number(t.amount)||0) - amt) < 0.05) {
            return t;
          }
        }
        if (b.name && billDesc && billDesc.includes(b.name)) return b;
      }
    } else if (sourceType === 'birthday' || sourceType === 'birthdays') {
      for (const b of (yData.birthdays || cfg.birthdays || [])) {
        for (const t of (b.transactions || [])) {
          if (t.desc === billDesc || (dateStr && t.date === dateStr)) {
            return t;
          }
        }
        if (b.name && billDesc && billDesc.includes(b.name)) return b;
      }
    }

    if (billDesc) {
      const cleanTarget = billDesc.replace(/^[🎯🎁📥]\s*/, '').trim().toLowerCase();

      let item = (mData.direct_debits || []).find(d => (d.desc === billDesc || d.name === billDesc) && Math.abs((Number(d.amount)||0) - amt) < 0.05)
          || (mData.direct_debits || []).find(d => d.desc === billDesc || d.name === billDesc)
          || (mData.payments_in || []).find(d => d.desc === billDesc || d.name === billDesc)
          || (mData.scheduled_items || []).find(d => d.desc === billDesc || d.name === billDesc)
          || (yData.yearly_recurring || []).find(d => d.desc === billDesc || d.name === billDesc)
          || (yData.yearly_income || []).find(d => d.desc === billDesc || d.name === billDesc)
          || (yData.recurring_payments || []).find(d => d.desc === billDesc || d.name === billDesc)
          || (yData.recurring_incomes || []).find(d => d.desc === billDesc || d.name === billDesc);
      if (item) return item;

      for (const b of (yData.yearly_budgets || [])) {
        const bNameLow = (b.name || '').toLowerCase();
        for (const t of (b.transactions || [])) {
          const tDescLow = (t.desc || '').toLowerCase();
          const combinedLow = `${bNameLow} ${tDescLow}`;
          if (combinedLow.includes(cleanTarget) || cleanTarget.includes(tDescLow) || cleanTarget.includes(bNameLow)) {
            return t;
          }
        }
        if (bNameLow.includes(cleanTarget) || cleanTarget.includes(bNameLow)) {
          return b;
        }
      }

      for (const b of (yData.birthdays || cfg.birthdays || [])) {
        const bNameLow = (b.name || '').toLowerCase();
        for (const t of (b.transactions || [])) {
          const tDescLow = (t.desc || '').toLowerCase();
          if (tDescLow && cleanTarget.includes(tDescLow)) {
            return t;
          }
        }
        if (bNameLow.includes(cleanTarget) || cleanTarget.includes(bNameLow)) {
          return b;
        }
      }
    }

    return null;
  },

  toggleScheduledBillCleared(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr) {
    const item = this.findScheduledItem(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr);

    if (!item) {
      alert('Could not find scheduled item.');
      return;
    }

    const isRecurring = (sourceType === 'recurring_income' || sourceType === 'recurring_payment' || Boolean(dateStr));
    const occDateStr = dateStr || (item.actualPaymentDate ? new Date(item.actualPaymentDate).toISOString().slice(0, 10) : (item.matched_date || new Date().toISOString().slice(0, 10)));
    const isCleared = isRecurring
      ? Boolean(occDateStr && item.cleared_dates && item.cleared_dates.includes(occDateStr))
      : Boolean(item.auto_cleared || item.status === 'paid');

    if (isCleared) {
      if (isRecurring) {
        if (occDateStr && item.cleared_dates) {
          item.cleared_dates = item.cleared_dates.filter(d => d !== occDateStr);
        }
      } else {
        item.status = 'due';
        item.auto_cleared = false;
        item.manually_cleared = false;
        item.matched_txn_id = null;
        item.matched_date = null;
        item.matched_payee = null;
        if (occDateStr && item.cleared_dates) {
          item.cleared_dates = item.cleared_dates.filter(d => d !== occDateStr);
        }
      }
      const allTxns = appState.data.open_banking_transactions || [];
      allTxns.forEach(t => {
        if (t.matched_bill_id === (item.desc || billDesc) && (!occDateStr || !t.booking_date || t.booking_date.startsWith(occDateStr))) {
          t.matched_bill_id = null;
          t.auto_cleared = false;
        }
      });
    } else {
      if (isRecurring) {
        if (occDateStr) {
          item.cleared_dates = item.cleared_dates || [];
          if (!item.cleared_dates.includes(occDateStr)) item.cleared_dates.push(occDateStr);
        }
        item.manually_cleared = true;
      } else {
        item.status = 'paid';
        item.auto_cleared = true;
        item.manually_cleared = true;
        item.matched_date = occDateStr;
        if (occDateStr) {
          item.cleared_dates = item.cleared_dates || [];
          if (!item.cleared_dates.includes(occDateStr)) item.cleared_dates.push(occDateStr);
        }
      }
    }

    calculateAndSyncRollovers();
    renderContent();
    saveBudget(appState.data);
  },

  openManualBillMatchModal(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr) {
    return openManualBillMatchModal(sourceType, sourceIdx, monthName, billDesc, billAmount, dateStr);
  },

  linkBillToTransaction(sourceType, sourceIdx, monthName, billDesc, transactionId, dateStr) {
    const item = this.findScheduledItem(sourceType, sourceIdx, monthName, billDesc, null, dateStr);
    const allTxns = appState.data.open_banking_transactions || [];
    const txn = allTxns.find(t => String(t.transaction_id) === String(transactionId));

    if (item && txn) {
      const isRecurring = (sourceType === 'recurring_income' || sourceType === 'recurring_payment' || Boolean(dateStr));
      if (!isRecurring) {
        item.status = 'paid';
        item.auto_cleared = true;
      }
      item.manually_cleared = true;
      item.matched_txn_id = txn.transaction_id;
      item.matched_date = txn.booking_date;
      item.matched_amount = Math.abs(txn.amount);
      item.matched_payee = txn.payee_name || txn.merchant_name;
      const targetDate = dateStr || (txn.booking_date ? txn.booking_date.slice(0, 10) : null);
      if (targetDate) {
        item.cleared_dates = item.cleared_dates || [];
        if (!item.cleared_dates.includes(targetDate)) item.cleared_dates.push(targetDate);
      }
      txn.matched_bill_id = item.desc || billDesc;
      txn.auto_cleared = true;
      txn.manually_linked = true;
    }

    calculateAndSyncRollovers();
    closeModal();
    renderContent();
    saveBudget(appState.data);
  },

  filterBillMatchTxns(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#billMatchTxnList .bill-match-row');
    rows.forEach(r => {
      const searchData = (r.getAttribute('data-search') || '').toLowerCase();
      r.style.display = (!q || searchData.includes(q)) ? 'flex' : 'none';
    });
  },

  async clearDebugLog() {
    if (!confirm('Clear the Open Banking debug log file?')) return;
    try {
      const r = await fetch(getBaseApiUrl() + 'api/openbanking/debug/clear', { method: 'POST' });
      const res = await r.json();
      if (res && res.success) {
        alert('Debug log cleared.');
      }
    } catch (e) {
      alert('Error clearing debug log: ' + e.message);
    }
  },

  async openDebugLogModal() {
    return openDebugLogModal();
  },

  async copyDebugLog() {
    const c = document.getElementById('debugLogContainer');
    if (c && c.innerText) {
      try {
        await navigator.clipboard.writeText(c.innerText);
        alert('Copied debug log to clipboard!');
      } catch (e) {
        // Fallback selection
        const range = document.createRange();
        range.selectNodeContents(c);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        alert('Copied debug log to clipboard!');
      }
    }
  },

  async downloadDebugLog() {
    try {
      const url = getBaseApiUrl() + 'api/openbanking/debug/log';
      const r = await fetch(url, { cache: 'no-store' });
      const text = await r.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'open_banking_debug.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Error downloading debug log: ' + e.message);
    }
  },

  filterTxnLedger(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#txnLedgerList .txn-row');
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
    });
  },

  setSubTab(subTabName) {
    appState.activeSubTab = subTabName;
    renderContent();
  },

  switchYear(y) {
    appState.currentYear = parseInt(y, 10);
    document.querySelector('.dropdown')?.classList.remove('open');
    renderYearMenu();
    renderNav();
    calculateAndSyncRollovers();
    renderContent();
  },

  toggleArchiveYear() {
    document.querySelector('.dropdown')?.classList.remove('open');
    const yData = getYearData();
    yData.archived = !yData.archived;
    calculateAndSyncRollovers();
    renderYearMenu();
    renderNav();
    renderContent();
    if (getSettings().onboarding_complete) { saveBudget(appState.data); }
  },

  promptCreateNewYear() {
    document.querySelector('.dropdown')?.classList.remove('open');
    const nextYear = appState.currentYear + 1;
    const yr = prompt(`Enter new 4-digit Year to initialize:`, String(nextYear));
    if (yr) this.createNewBudgetYear(yr);
  },

  startOnboarding() {
    startOnboarding();
  },

  exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `budget_backup_${appState.currentYear}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  },

  importData(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || !imported.settings) {
          alert("Invalid budget backup file format.");
          return;
        }
        if (confirm("Import this budget dataset? This will overwrite your current budget data!")) {
          appState.data = imported;
          calculateAndSyncRollovers();
          renderYearMenu();
          renderNav();
          renderContent();
          await saveBudget(appState.data);
          alert("Budget data imported successfully!");
        }
      } catch (err) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  },

  toggleYearDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.querySelector('.dropdown');
    if (dd) dd.classList.toggle('open');
  },

  toggleGlobalEditMode() {
    appState.globalEditMode = !appState.globalEditMode;
    const btn = document.getElementById('globalModeBtn');
    if (btn) {
      const btnIcon = btn.querySelector('.btn-icon');
      const btnText = btn.querySelector('.btn-text');
      if (appState.globalEditMode) {
        btn.classList.add('active');
        btn.style.background = 'var(--curr-border)';
        btn.style.color = '#fff';
        if (btnIcon) btnIcon.innerText = '✓';
        if (btnText) btnText.innerText = ' Done Editing';
      } else {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
        if (btnIcon) btnIcon.innerText = '👁️';
        if (btnText) btnText.innerText = ' View Mode';
      }
    }
    renderContent();
  },

  openDrawer() {
    const d = document.getElementById('sideDrawer');
    const b = document.getElementById('drawerBackdrop');
    if (d) d.classList.add('open');
    if (b) b.classList.add('open');
  },

  closeDrawer() {
    const d = document.getElementById('sideDrawer');
    const b = document.getElementById('drawerBackdrop');
    if (d) d.classList.remove('open');
    if (b) b.classList.remove('open');
  },


  // ==========================================
  // BIRTHDAYS & RECURRING PAYMENTS HANDLERS
  // ==========================================
  openAddBirthdayModal() { this.closeFabMenu(); openAddBirthdayModal(); },
  openEditBirthdayModal(bIdx) { this.closeFabMenu(); openEditBirthdayModal(bIdx); },
  openAddBirthdaySpendModal(bIdx) {
    this.closeFabMenu();
    if (bIdx === undefined || bIdx === null) {
      openQuickBirthdaySpendModal();
    } else {
      openAddBirthdaySpendModal(bIdx);
    }
  },
  openQuickBirthdaySpendModal() {
    this.closeFabMenu();
    openQuickBirthdaySpendModal();
  },
  openRecurringPaymentsModal() { this.closeFabMenu(); openRecurringPaymentsModal(); },

  async confirmAddBirthday() {
    const nameEl = document.getElementById('bday-name');
    const monthEl = document.getElementById('bday-month');
    const dayEl = document.getElementById('bday-day');
    const budgetEl = document.getElementById('bday-budget');
    const accEl = document.getElementById('bday-account');
    const catEl = document.getElementById('bday-cat');

    if (!nameEl || !budgetEl) return;
    const name = nameEl.value.trim();
    const month = monthEl ? monthEl.value : 'Jan';
    const day = parseInt(dayEl ? dayEl.value : 1, 10) || 1;
    const budget = parseFloat(budgetEl.value) || 0;
    const acc = accEl ? accEl.value : getSettings().current_accounts[0];
    const cat = catEl ? catEl.value : 'Birthday';

    if (!name) {
      alert("Please enter a name for the birthday or celebration.");
      return;
    }

    const birthdays = getBirthdays(appState.currentYear);
    birthdays.push({
      name,
      month,
      day,
      budget_amount: budget,
      account: acc,
      category: cat,
      transactions: []
    });

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async confirmEditBirthday(bIdx) {
    const nameEl = document.getElementById('bday-name');
    const monthEl = document.getElementById('bday-month');
    const dayEl = document.getElementById('bday-day');
    const budgetEl = document.getElementById('bday-budget');
    const accEl = document.getElementById('bday-account');

    if (!nameEl) return;
    const birthdays = getBirthdays(appState.currentYear);
    const b = birthdays[bIdx];
    if (b) {
      b.name = nameEl.value.trim() || b.name;
      if (monthEl) b.month = monthEl.value;
      if (dayEl) b.day = parseInt(dayEl.value, 10) || 1;
      if (budgetEl) b.budget_amount = parseFloat(budgetEl.value) || 0;
      if (accEl) b.account = accEl.value;

      closeModal();
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async deleteBirthday(bIdx) {
    if (!confirm("Are you sure you want to delete this birthday?")) return;
    const birthdays = getBirthdays(appState.currentYear);
    birthdays.splice(bIdx, 1);
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async confirmAddBirthdaySpend(bIdx) {
    const descEl = document.getElementById('bsp-desc');
    const amtEl = document.getElementById('bsp-amt');
    const dateEl = document.getElementById('bsp-date');
    const accEl = document.getElementById('bsp-acc');

    if (!descEl || !amtEl) return;
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const date = dateEl ? dateEl.value : '';
    const acc = accEl ? accEl.value : '';

    if (!desc || isNaN(amt)) {
      alert("Please enter a gift description and amount.");
      return;
    }

    const birthdays = getBirthdays(appState.currentYear);
    const b = birthdays[bIdx];
    if (b) {
      if (!b.transactions) b.transactions = [];
      const account = acc || b.account || getSettings().current_accounts[0];
      b.transactions.push({ desc, amount: amt, date, account });

      closeModal();
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async deleteBirthdaySpend(bIdx, txIdx) {
    const birthdays = getBirthdays(appState.currentYear);
    const b = birthdays[bIdx];
    if (b && b.transactions) {
      b.transactions.splice(txIdx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  onRecurrenceFreqChange(freqVal) {
    const box = document.getElementById('rec-interval-box');
    if (box) {
      box.style.display = (freqVal === 'custom_weeks' || freqVal === 'custom_months') ? 'block' : 'none';
    }
  },

  async confirmAddRecurringPayment() {
    const descEl = document.getElementById('rec-desc');
    const amtEl = document.getElementById('rec-amt');
    const freqEl = document.getElementById('rec-freq');
    const intervalEl = document.getElementById('rec-interval');
    const startEl = document.getElementById('rec-start');
    const accEl = document.getElementById('rec-acc');

    if (!descEl || !amtEl) return;
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const freq = freqEl ? freqEl.value : 'monthly';
    const interval = intervalEl ? parseInt(intervalEl.value, 10) || 1 : 1;
    const start = startEl ? startEl.value : '';
    const acc = accEl ? accEl.value : getSettings().current_accounts[0];

    if (!desc || isNaN(amt) || amt <= 0) {
      alert("Please enter a description and valid amount.");
      return;
    }

    const recurring = getRecurringPayments(appState.currentYear);
    recurring.push({
      desc,
      amount: amt,
      frequency: freq,
      interval_n: interval,
      start_date: start,
      account: acc
    });

    
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async deleteRecurringPayment(idx) {
    const recurring = getRecurringPayments(appState.currentYear);
    recurring.splice(idx, 1);
    
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },


  // ==========================================
  // UNIFIED SCHEDULED & RECURRING BILLS
  // ==========================================
  openScheduledBillsModal(activeFilter) {  },

  onScheduledFreqChange(freqVal) {
    const dayBox = document.getElementById('sched-day-box');
    const monthBox = document.getElementById('sched-month-box');
    const intBox = document.getElementById('sched-interval-box');

    if (dayBox) dayBox.style.display = (freqVal === 'monthly' || freqVal === 'quarterly' || freqVal === 'yearly') ? 'block' : 'none';
    if (monthBox) monthBox.style.display = (freqVal === 'yearly') ? 'block' : 'none';
    if (intBox) intBox.style.display = (freqVal === 'custom_weeks' || freqVal === 'custom_months') ? 'block' : 'none';
  },

  async confirmAddUnifiedScheduledBill(activeFilter = 'all') {
    const descEl = document.getElementById('sched-desc');
    const amtEl = document.getElementById('sched-amt');
    const freqEl = document.getElementById('sched-freq');
    const dayEl = document.getElementById('sched-due-day');
    const monthEl = document.getElementById('sched-month');
    const intEl = document.getElementById('sched-interval');
    const accEl = document.getElementById('sched-acc');
    const transEl = document.getElementById('sched-transfer');

    if (!descEl || !amtEl) return;
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const freq = freqEl ? freqEl.value : 'monthly';
    const dueDay = dayEl ? parseInt(dayEl.value, 10) || 1 : 1;
    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek() : { month: 'Jan' };
    const currentActiveMonth = months.includes(appState.activeTab) ? appState.activeTab : (detected.month || 'Jan');
    const month = monthEl ? monthEl.value : currentActiveMonth;
    const interval = intEl ? parseInt(intEl.value, 10) || 1 : 1;
    const acc = accEl ? accEl.value : getSettings().current_accounts[0];
    const transferTo = transEl ? transEl.value : 'none';

    if (!desc || isNaN(amt) || amt <= 0) {
      alert("Please enter a description and valid positive amount.");
      return;
    }

    const yData = getYearData(appState.currentYear);
    const cfg = getSettings();

    if (freq === 'monthly') {
      const newDD = { desc, due_day: dueDay, amount: amt, account: acc, transfer_to: transferTo };
      if (!cfg.default_direct_debits) cfg.default_direct_debits = [];
      cfg.default_direct_debits.push(newDD);

      const mIdx = months.indexOf(currentActiveMonth);
      for (let i = Math.max(0, mIdx); i < 12; i++) {
        const mName = months[i];
        if (yData.months && yData.months[mName]) {
          if (!yData.months[mName].direct_debits) yData.months[mName].direct_debits = [];
          yData.months[mName].direct_debits.push({ ...newDD });
        }
      }
      const mData = getMonthData(currentActiveMonth);
      if (!mData.direct_debits.some(d => d.desc === desc && d.due_day === dueDay && d.amount === amt)) {
        mData.direct_debits.push({ ...newDD });
      }
    } else if (freq === 'yearly') {
      if (!yData.yearly_recurring) yData.yearly_recurring = [];
      yData.yearly_recurring.push({ desc, month, due_day: dueDay, amount: amt, account: acc, transfer_to: transferTo });
    } else {
      // Weekly, Bi-Weekly, Quarterly, Custom
      const recurring = getRecurringPayments(appState.currentYear);
      recurring.push({
        desc,
        amount: amt,
        frequency: freq,
        interval_n: interval,
        day_of_month: dueDay,
        account: acc,
        transfer_to: transferTo
      });
    }

    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async deleteUnifiedScheduledBill(sourceType, sourceIdx, activeFilter = 'all') {
    if (!confirm("Are you sure you want to delete this scheduled outgoing?")) return;

    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek() : { month: 'Jan' };
    const currentActiveMonth = months.includes(appState.activeTab) ? appState.activeTab : (detected.month || 'Jan');

    if (sourceType === 'direct_debit') {
      const mData = getMonthData(currentActiveMonth);
      if (mData.direct_debits) mData.direct_debits.splice(sourceIdx, 1);
    } else if (sourceType === 'yearly_recurring') {
      const yData = getYearData();
      if (yData.yearly_recurring) yData.yearly_recurring.splice(sourceIdx, 1);
    } else if (sourceType === 'recurring_payment') {
      const recurring = getRecurringPayments(appState.currentYear);
      recurring.splice(sourceIdx, 1);
    }

    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },


  setBillsFilter(filter) {
    appState.billsFilter = filter;
    renderContent();
  },

  scrollToAddScheduledItem(flowType) {
    const typeEl = document.getElementById('new-sched-type');
    if (typeEl && flowType) {
      typeEl.value = flowType;
      this.onScheduledTypeChange(flowType);
    }
    const addPanel = document.getElementById('add-bill-panel');
    if (addPanel) {
      addPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const descEl = document.getElementById('new-sched-desc');
      if (descEl) descEl.focus();
    }
  },

  onScheduledTypeChange(typeVal) {
    const isIncome = (typeVal === 'income');
    const titleEl = document.getElementById('add-panel-title');
    const transBox = document.getElementById('new-sched-transfer-box');
    const accLabel = document.getElementById('new-sched-acc-label');
    const holidayRuleEl = document.getElementById('new-sched-holiday-rule');

    if (titleEl) {
      titleEl.innerText = isIncome ? '💰 Add Scheduled Payment In (Inflow)' : '💸 Add Scheduled Bill or Direct Debit';
      titleEl.style.color = isIncome ? 'var(--green)' : 'var(--curr-border)';
    }
    if (transBox) transBox.style.display = isIncome ? 'none' : 'block';
    if (accLabel) accLabel.innerText = isIncome ? 'Credited Account' : 'Paid From Account';
    if (holidayRuleEl) {
      holidayRuleEl.value = isIncome ? 'previous' : 'following';
    }
  },

  onFullScheduledFreqChange(freqVal) {
    const dayBox = document.getElementById('new-sched-day-box');
    const startBox = document.getElementById('new-sched-start-box');
    const monthBox = document.getElementById('new-sched-month-box');
    const intBox = document.getElementById('new-sched-interval-box');

    if (dayBox) dayBox.style.display = (freqVal === 'monthly' || freqVal === 'yearly') ? 'block' : 'none';
    if (startBox) startBox.style.display = (freqVal === 'quarterly' || freqVal === 'weekly' || freqVal === 'biweekly' || freqVal === 'four_weekly' || freqVal === 'custom_weeks' || freqVal === 'custom_months') ? 'block' : 'none';
    if (monthBox) monthBox.style.display = (freqVal === 'yearly') ? 'block' : 'none';
    if (intBox) intBox.style.display = (freqVal === 'custom_weeks' || freqVal === 'custom_months') ? 'block' : 'none';
  },

  async confirmAddFullScheduledBill() {
    const typeEl = document.getElementById('new-sched-type');
    const descEl = document.getElementById('new-sched-desc');
    const amtEl = document.getElementById('new-sched-amt');
    const freqEl = document.getElementById('new-sched-freq');
    const dayEl = document.getElementById('new-sched-due-day');
    const startDateEl = document.getElementById('new-sched-start-date');
    const monthEl = document.getElementById('new-sched-month');
    const intEl = document.getElementById('new-sched-interval');
    const accEl = document.getElementById('new-sched-acc');
    const transEl = document.getElementById('new-sched-transfer');
    const holidayRuleEl = document.getElementById('new-sched-holiday-rule');

    if (!descEl || !amtEl) return;
    const isIncome = typeEl ? (typeEl.value === 'income') : false;
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const freq = freqEl ? freqEl.value : 'monthly';
    const dueDay = dayEl ? parseInt(dayEl.value, 10) || 1 : 1;
    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek() : { month: 'Jan' };
    const currentActiveMonth = months.includes(appState.activeTab) ? appState.activeTab : (detected.month || 'Jan');
    const month = monthEl ? monthEl.value : currentActiveMonth;
    const interval = intEl ? parseInt(intEl.value, 10) || 1 : 1;
    const acc = accEl ? accEl.value : getSettings().current_accounts[0];
    const transferTo = (transEl && !isIncome) ? transEl.value : 'none';
    const holidayRule = holidayRuleEl ? holidayRuleEl.value : (isIncome ? 'previous' : 'following');

    if (!desc || isNaN(amt) || amt <= 0) {
      alert("Please enter a description and valid positive amount.");
      return;
    }

    const yData = getYearData(appState.currentYear);
    const cfg = getSettings();
    const mIdx = months.indexOf(currentActiveMonth);

    if (isIncome) {
      if (freq === 'monthly') {
        const newPI = { desc, due_day: dueDay, amount: amt, account: acc, holiday_rule: holidayRule };
        if (!cfg.default_payments_in) cfg.default_payments_in = [];
        cfg.default_payments_in.push(newPI);

        for (let i = Math.max(0, mIdx); i < 12; i++) {
          const mName = months[i];
          if (yData.months && yData.months[mName]) {
            if (!yData.months[mName].payments_in) yData.months[mName].payments_in = [];
            yData.months[mName].payments_in.push({ ...newPI });
          }
        }
        const mData = getMonthData(currentActiveMonth);
        if (!mData.payments_in.some(p => p.desc === desc && p.due_day === dueDay && p.amount === amt)) {
          mData.payments_in.push({ ...newPI });
        }
      } else if (freq === 'yearly') {
        if (!yData.yearly_income) yData.yearly_income = [];
        yData.yearly_income.push({ desc, month, due_day: dueDay, amount: amt, account: acc, holiday_rule: holidayRule });
      } else {
        const startDateVal = (startDateEl && startDateEl.value) ? startDateEl.value : `${appState.currentYear}-01-01`;
        const parsedStartDate = new Date(startDateVal.includes('T') ? startDateVal : startDateVal + 'T00:00:00');
        const startDay = !isNaN(parsedStartDate.getDate()) ? parsedStartDate.getDate() : dueDay;

        const recurringIncomes = (typeof getRecurringIncomes === 'function') ? getRecurringIncomes(appState.currentYear) : (getYearData().recurring_incomes || []);
        recurringIncomes.push({
          desc,
          amount: amt,
          frequency: freq,
          interval_n: interval,
          day_of_month: startDay,
          start_date: startDateVal,
          account: acc,
          is_income: true,
          holiday_rule: holidayRule
        });
      }
    } else {
      if (freq === 'monthly') {
        const newDD = { desc, due_day: dueDay, amount: amt, account: acc, transfer_to: transferTo, holiday_rule: holidayRule };
        if (!cfg.default_direct_debits) cfg.default_direct_debits = [];
        cfg.default_direct_debits.push(newDD);

        for (let i = Math.max(0, mIdx); i < 12; i++) {
          const mName = months[i];
          if (yData.months && yData.months[mName]) {
            if (!yData.months[mName].direct_debits) yData.months[mName].direct_debits = [];
            yData.months[mName].direct_debits.push({ ...newDD });
          }
        }
        const mData = getMonthData(currentActiveMonth);
        if (!mData.direct_debits.some(d => d.desc === desc && d.due_day === dueDay && d.amount === amt)) {
          mData.direct_debits.push({ ...newDD });
        }
      } else if (freq === 'yearly') {
        if (!yData.yearly_recurring) yData.yearly_recurring = [];
        yData.yearly_recurring.push({ desc, month, due_day: dueDay, amount: amt, account: acc, transfer_to: transferTo, holiday_rule: holidayRule });
      } else {
        const startDateVal = (startDateEl && startDateEl.value) ? startDateEl.value : `${appState.currentYear}-01-01`;
        const parsedStartDate = new Date(startDateVal.includes('T') ? startDateVal : startDateVal + 'T00:00:00');
        const startDay = !isNaN(parsedStartDate.getDate()) ? parsedStartDate.getDate() : dueDay;

        const recurring = getRecurringPayments(appState.currentYear);
        recurring.push({
          desc,
          amount: amt,
          frequency: freq,
          interval_n: interval,
          day_of_month: startDay,
          start_date: startDateVal,
          account: acc,
          transfer_to: transferTo,
          holiday_rule: holidayRule
        });
      }
    }

    descEl.value = '';
    amtEl.value = '';
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async editFullScheduledBill(sourceType, sourceIdx, field, value) {
    const activeTab = months.includes(appState.activeTab) ? appState.activeTab : 'Jan';
    if (sourceType === 'direct_debit') {
      const mData = getMonthData(activeTab);
      if (mData.direct_debits && mData.direct_debits[sourceIdx]) {
        mData.direct_debits[sourceIdx][field] = value;
      }
    } else if (sourceType === 'monthly_payment_in') {
      const mData = getMonthData(activeTab);
      if (mData.payments_in && mData.payments_in[sourceIdx]) {
        mData.payments_in[sourceIdx][field] = value;
      }
    } else if (sourceType === 'yearly_recurring') {
      const yData = getYearData();
      if (yData.yearly_recurring && yData.yearly_recurring[sourceIdx]) {
        yData.yearly_recurring[sourceIdx][field] = value;
      }
    } else if (sourceType === 'yearly_income') {
      const yData = getYearData();
      if (yData.yearly_income && yData.yearly_income[sourceIdx]) {
        yData.yearly_income[sourceIdx][field] = value;
      }
    } else if (sourceType === 'recurring_payment') {
      const recurring = getRecurringPayments(appState.currentYear);
      if (recurring && recurring[sourceIdx]) {
        recurring[sourceIdx][field] = value;
      }
    } else if (sourceType === 'recurring_income') {
      const recurring = (typeof getRecurringIncomes === 'function') ? getRecurringIncomes(appState.currentYear) : (getYearData().recurring_incomes || []);
      if (recurring && recurring[sourceIdx]) {
        recurring[sourceIdx][field] = value;
      }
    }

    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async deleteUnifiedScheduledBill(sourceType, sourceIdx, activeFilter = 'all') {
    if (!confirm("Are you sure you want to delete this scheduled item?")) return;

    if (sourceType === 'direct_debit') {
      const mData = getMonthData(appState.activeTab);
      if (mData.direct_debits) mData.direct_debits.splice(sourceIdx, 1);
    } else if (sourceType === 'monthly_payment_in') {
      const mData = getMonthData(appState.activeTab);
      if (mData.payments_in) mData.payments_in.splice(sourceIdx, 1);
    } else if (sourceType === 'yearly_recurring') {
      const yData = getYearData();
      if (yData.yearly_recurring) yData.yearly_recurring.splice(sourceIdx, 1);
    } else if (sourceType === 'yearly_income') {
      const yData = getYearData();
      if (yData.yearly_income) yData.yearly_income.splice(sourceIdx, 1);
    } else if (sourceType === 'recurring_payment') {
      const recurring = getRecurringPayments(appState.currentYear);
      recurring.splice(sourceIdx, 1);
    } else if (sourceType === 'recurring_income') {
      const recurring = (typeof getRecurringIncomes === 'function') ? getRecurringIncomes(appState.currentYear) : (getYearData().recurring_incomes || []);
      recurring.splice(sourceIdx, 1);
    }

    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async propagateScheduledBills(fromMonth) {
    if (!fromMonth || !months.includes(fromMonth)) fromMonth = 'Jan';
    const mData = getMonthData(fromMonth);
    const curDDs = mData.direct_debits || [];
    const curIncomes = mData.payments_in || [];
    if (curDDs.length === 0 && curIncomes.length === 0) {
      alert("No active scheduled direct debits or payments in to propagate from " + fromMonth);
      return;
    }
    const fromIdx = months.indexOf(fromMonth);
    if (fromIdx === -1) return;

    const remainingMonths = months.slice(fromIdx + 1);
    if (remainingMonths.length === 0) {
      alert(`${fromMonth} is the last month of the year. Updating global defaults for future years.`);
      const cfg = getSettings();
      cfg.default_direct_debits = JSON.parse(JSON.stringify(curDDs));
      cfg.default_payments_in = JSON.parse(JSON.stringify(curIncomes));
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
      return;
    }

    const confirmed = confirm(`Propagate ${curDDs.length} scheduled bills and ${curIncomes.length} payments in from ${fromMonth} to all following months (${remainingMonths.join(', ')}) in ${appState.currentYear}?`);
    if (!confirmed) return;

    const yData = getYearData();
    for (let i = fromIdx + 1; i < months.length; i++) {
      const targetM = months[i];
      if (!yData.months[targetM]) yData.months[targetM] = {};
      yData.months[targetM].direct_debits = JSON.parse(JSON.stringify(curDDs));
      yData.months[targetM].payments_in = JSON.parse(JSON.stringify(curIncomes));
    }

    // Update global defaults so new years inherit them
    const cfg = getSettings();
    cfg.default_direct_debits = JSON.parse(JSON.stringify(curDDs));
    cfg.default_payments_in = JSON.parse(JSON.stringify(curIncomes));

    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    alert(`Successfully propagated ${curDDs.length} bills and ${curIncomes.length} payments in across the rest of ${appState.currentYear}.`);
  },

  // FAB Speed Dial Methods
  toggleFabMenu() {
    const container = document.getElementById('fabContainer');
    if (container) container.classList.toggle('open');
  },
  closeFabMenu() {
    const container = document.getElementById('fabContainer');
    if (container) container.classList.remove('open');
  },
  openQuickCheckInModal(selectedWeek, selectedMonth) {
    this.closeFabMenu();
    openQuickCheckInModal(selectedWeek, selectedMonth);
  },
  async saveQuickCheckIn(targetWeek, targetMonth) {
    const cfg = getSettings();
    const month = targetMonth || appState.activeTab;
    const actuals = getWeekActuals(month, targetWeek);
    if (!actuals._timestamps) actuals._timestamps = {};
    if (!actuals._sources) actuals._sources = {};

    cfg.current_accounts.forEach(acc => {
      const el = document.getElementById(`qchk_curr_${acc}`);
      if (el) {
        const val = el.value.trim();
        actuals[`curr_${acc}`] = val;
        if (val !== "") {
          actuals._timestamps[`curr_${acc}`] = new Date().toISOString();
          actuals._sources[`curr_${acc}`] = 'manual';
        } else {
          delete actuals._timestamps[`curr_${acc}`];
          delete actuals._sources[`curr_${acc}`];
        }
      }
    });

    (cfg.credit_accounts || []).forEach(c => {
      const el = document.getElementById(`qchk_c_avail_${c.name}`);
      if (el) {
        const val = el.value.trim();
        actuals[`c_avail_${c.name}`] = val;
        if (val !== "") {
          actuals._timestamps[`c_avail_${c.name}`] = new Date().toISOString();
          actuals._sources[`c_avail_${c.name}`] = 'manual';
        } else {
          delete actuals._timestamps[`c_avail_${c.name}`];
          delete actuals._sources[`c_avail_${c.name}`];
        }
      }
    });

    if (cfg.track_savings) {
      (cfg.savings_accounts || []).forEach(s => {
        const el = document.getElementById(`qchk_sav_${s}`);
        if (el) {
          const val = el.value.trim();
          actuals[`sav_${s}`] = val;
          if (val !== "") {
            actuals._timestamps[`sav_${s}`] = new Date().toISOString();
            actuals._sources[`sav_${s}`] = 'manual';
          } else {
            delete actuals._timestamps[`sav_${s}`];
            delete actuals._sources[`sav_${s}`];
          }
        }
      });
    }

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },
  openQuickWeeklyExpenseModal(selectedWeek, selectedMonth) {
    this.closeFabMenu();
    openQuickWeeklyExpenseModal(selectedWeek, selectedMonth);
  },
  switchQuickExpenseMonth(newMonth) {
    openQuickWeeklyExpenseModal(null, newMonth);
  },
  async saveQuickWeeklyExpense() {
    const monthEl = document.getElementById('qwe-month');
    const weekEl = document.getElementById('qwe-week');
    const typeEl = document.getElementById('qwe-type');
    const descEl = document.getElementById('qwe-desc');
    const amtEl = document.getElementById('qwe-amt');
    const accEl = document.getElementById('qwe-acc');

    if (!descEl || !amtEl || !accEl) return;
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const targetMonth = monthEl ? monthEl.value : appState.activeTab;
    const targetWeek = weekEl ? weekEl.value : 'Week 1';
    const isIncome = typeEl ? (typeEl.value === 'income') : false;
    const [accType, accName] = accEl.value.split(':');

    if (!desc || isNaN(amt)) {
      alert("Please enter a description and valid amount.");
      return;
    }

    const items = getWeekItems(targetMonth, targetWeek);
    items.push({
      desc,
      amount: amt,
      is_income: isIncome,
      account_type: accType,
      account_name: accName
    });

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },
  openQuickBudgetTxModal() {
    this.closeFabMenu();
    openQuickBudgetTxModal();
  },
  openQuickBirthdaySpendModal() {
    this.closeFabMenu();
    openQuickBirthdaySpendModal();
  },
  onQuickBirthdayChange(bIdx) {
    const birthdays = getBirthdays(appState.currentYear);
    const b = birthdays[bIdx];
    const accEl = document.getElementById('qbday-acc');
    if (b && b.account && accEl) {
      accEl.value = b.account;
    }
  },
  async saveQuickBirthdaySpend() {
    const bIdxEl = document.getElementById('qbday-idx');
    const descEl = document.getElementById('qbday-desc');
    const amtEl = document.getElementById('qbday-amt');
    const dateEl = document.getElementById('qbday-date');
    const accEl = document.getElementById('qbday-acc');

    if (!bIdxEl || !descEl || !amtEl || !dateEl) return;
    const bIdx = parseInt(bIdxEl.value, 10);
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const date = dateEl.value;
    const account = accEl ? accEl.value : 'Joint Account';

    if (!desc || isNaN(amt)) {
      alert("Please enter a description and valid amount.");
      return;
    }

    const birthdays = getBirthdays(appState.currentYear);
    const b = birthdays[bIdx];
    if (b) {
      if (!b.transactions) b.transactions = [];
      b.transactions.push({ desc, amount: amt, date, account });
      closeModal();
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },
  async saveQuickBudgetTx() {
    const bIdxEl = document.getElementById('qbt-idx');
    const descEl = document.getElementById('qbt-desc');
    const amtEl = document.getElementById('qbt-amt');
    const dateEl = document.getElementById('qbt-date');
    const accEl = document.getElementById('qbt-acc');

    if (!bIdxEl || !descEl || !amtEl || !dateEl) return;
    const bIdx = parseInt(bIdxEl.value, 10);
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const date = dateEl.value;
    const acct = accEl ? accEl.value : '';

    if (!desc || isNaN(amt)) {
      alert("Please enter a description and valid amount.");
      return;
    }

    const b = getYearData().yearly_budgets[bIdx];
    if (b) {
      if (!b.transactions) b.transactions = [];
      b.transactions.push({ desc, amount: amt, date, account: acct });
      closeModal();
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async setSavingsPredictMode(accName, mode) {
    const configs = getAccountTrackingSettings();
    if (!configs.savings[accName]) {
      configs.savings[accName] = { tracking: 'weekly', include_in_net: true, savings_predict_mode: mode };
    } else {
      configs.savings[accName].savings_predict_mode = mode;
    }
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
  },

  async saveGlobalAccountTracking() {
    const cfg = getSettings();
    const configs = getAccountTrackingSettings();
    const md = getMonthData(appState.activeTab);

    cfg.current_accounts.forEach((acc, idx) => {
      const trk = document.getElementById(`m_trk_c_${idx}`)?.value || 'weekly';
      const net = document.getElementById(`m_net_c_${idx}`)?.checked !== false;
      configs.current[acc] = { tracking: trk, include_in_net: net };
      const own = document.getElementById(`m_own_c_${idx}`)?.value;
      if (own) setAccountOwner('current', acc, own);

      const openVal = document.getElementById(`m_open_c_${idx}`)?.value;
      if (!md.current_data[acc]) md.current_data[acc] = {};
      if (openVal === "" || openVal === null || openVal === undefined) {
        delete md.current_data[acc].opening;
        delete md.current_data[acc].user_edited;
      } else {
        md.current_data[acc].opening = parseFloat(openVal) || 0;
        md.current_data[acc].user_edited = true;
      }
    });

    cfg.credit_accounts.forEach((c, idx) => {
      const trk = document.getElementById(`m_trk_cr_${idx}`)?.value || 'weekly';
      const net = document.getElementById(`m_net_cr_${idx}`)?.checked !== false;
      configs.credit[c.name] = { tracking: trk, include_in_net: net };
      const own = document.getElementById(`m_own_cr_${idx}`)?.value;
      if (own) setAccountOwner('credit', c.name, own);

      const spentVal = document.getElementById(`m_open_cr_${idx}`)?.value;
      if (!md.credit_data[c.name]) md.credit_data[c.name] = {};
      if (spentVal === "" || spentVal === null || spentVal === undefined) {
        delete md.credit_data[c.name].opening_spent;
        delete md.credit_data[c.name].user_edited;
      } else {
        md.credit_data[c.name].opening_spent = parseFloat(spentVal) || 0;
        md.credit_data[c.name].user_edited = true;
      }
    });

    if (cfg.track_savings) {
      cfg.savings_accounts.forEach((s, idx) => {
        const trk = document.getElementById(`m_trk_s_${idx}`)?.value || 'monthly';
        const net = document.getElementById(`m_net_s_${idx}`)?.checked !== false;
        const predMode = document.getElementById(`m_pred_s_${idx}`)?.value || 'planned';
        configs.savings[s] = { tracking: trk, include_in_net: net, savings_predict_mode: predMode };
        const own = document.getElementById(`m_own_s_${idx}`)?.value;
        if (own) setAccountOwner('savings', s, own);

        const savVal = document.getElementById(`m_open_s_${idx}`)?.value;
        if (!md.savings_data[s]) md.savings_data[s] = {};
        if (savVal === "" || savVal === null || savVal === undefined) {
          delete md.savings_data[s].opening;
          delete md.savings_data[s].user_edited;
        } else {
          md.savings_data[s].opening = parseFloat(savVal) || 0;
          md.savings_data[s].user_edited = true;
        }
      });
    }

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
  },

    async saveDateOverride(mName) {
    return this.confirmDateOverride(mName);
  },

  async confirmDateOverride(mName) {
    const startVal = document.getElementById('periodStartInput').value;
    const endVal = document.getElementById('periodEndInput').value;
    if (!startVal || !endVal) return;

    const md = getMonthData(mName);
    md.date_overrides = {
      start_date: startVal,
      end_date: endVal
    };

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
  },

  async resetDateOverride(mName) {
    const md = getMonthData(mName);
    delete md.override_start_date;
    delete md.override_end_date;
    delete md.date_overrides;
    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
  },

    async confirmMoveItem(sourceMonth, sourceWeek, itemIdx) {
    if (typeof itemIdx === 'undefined') {
      itemIdx = sourceWeek;
      sourceWeek = sourceMonth;
      sourceMonth = appState.activeTab;
    }

    const monthEl = document.getElementById('moveDestMonth') || document.getElementById('moveTargetMonth');
    const weekEl = document.getElementById('moveDestWeek') || document.getElementById('moveTargetWeek');
    const accEl = document.getElementById('moveDestAccount');

    const targetMonth = monthEl ? monthEl.value : appState.activeTab;
    const targetWeek = weekEl ? weekEl.value : sourceWeek;

    if (!targetMonth || !targetWeek) return;

    const srcMonth = sourceMonth || appState.activeTab;
    const sourceItems = getWeekItems(srcMonth, sourceWeek);
    const numIdx = parseInt(itemIdx, 10);
    if (!sourceItems || isNaN(numIdx) || numIdx < 0 || numIdx >= sourceItems.length) return;

    const [moved] = sourceItems.splice(numIdx, 1);
    if (moved) {
      if (accEl && accEl.value) {
        const parts = accEl.value.split(':');
        if (parts.length === 2) {
          moved.account_type = parts[0];
          moved.account_name = parts[1];
        }
      }
      const targetItems = getWeekItems(targetMonth, targetWeek);
      if (targetItems) {
        targetItems.push(moved);
      }
    }

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
  },

  // Onboarding Wizard
  startOnboarding() { startOnboarding(); },
  closeOnboarding() { closeOnboarding(); },
  nextObStep(step) { nextObStep(step); },
  obNext(step) { nextObStep(step); },
  obAddPerson() { obAddPerson(); },
  obUpdatePerson(idx, val) {
    if (!getSettings().people) getSettings().people = [];
    const oldName = getSettings().people[idx];
    const newName = (val || '').trim();
    getSettings().people[idx] = newName;
    if (oldName && oldName !== newName) {
      if (!getSettings().people_settings) getSettings().people_settings = {};
      getSettings().people_settings[newName] = getSettings().people_settings[oldName] || { hide_salary: false };
      delete getSettings().people_settings[oldName];
    }
    obRenderLists();
  },
  obUpdatePersonPrivacy(idx, hide) {
    if (!getSettings().people) getSettings().people = [];
    const p = getSettings().people[idx];
    if (p) {
      setPersonSalaryPrivacy(p, hide);
    }
  },
  obUpdatePersonPin(idx, val) {
    if (!getSettings().people) getSettings().people = [];
    const p = getSettings().people[idx];
    if (p) {
      setPersonPin(p, val);
    }
  },
  obDelPerson(idx) {
    if (getSettings().people) getSettings().people.splice(idx, 1);
    obRenderLists();
  },
  obAddCurrent() { obAddCurrent(); },
  obUpdateCurrent(idx, val) {
    if (!getSettings().current_accounts) getSettings().current_accounts = [];
    const oldName = getSettings().current_accounts[idx];
    const newName = (val || '').trim();
    getSettings().current_accounts[idx] = newName;
    if (oldName && oldName !== newName) {
      const owner = getAccountOwner('current', oldName);
      setAccountOwner('current', newName, owner);
    }
    obRenderLists();
  },
  obUpdateAccountOwner(accType, idx, owner) {
    let accName = '';
    if (accType === 'current' && getSettings().current_accounts) {
      accName = getSettings().current_accounts[idx];
    } else if (accType === 'credit' && getSettings().credit_accounts) {
      accName = getSettings().credit_accounts[idx]?.name;
    } else if (accType === 'savings' && getSettings().savings_accounts) {
      accName = getSettings().savings_accounts[idx];
    }
    if (accName) {
      setAccountOwner(accType, accName, owner);
    }
  },
  obDelCurrent(idx) {
    if (getSettings().current_accounts) getSettings().current_accounts.splice(idx, 1);
    obRenderLists();
  },
  obAddSavings() { obAddSavings(); },
  obUpdateSavings(idx, val) {
    if (!getSettings().savings_accounts) getSettings().savings_accounts = [];
    getSettings().savings_accounts[idx] = val;
    obRenderLists();
  },
  obDelSavings(idx) {
    if (getSettings().savings_accounts) getSettings().savings_accounts.splice(idx, 1);
    obRenderLists();
  },
  obAddCredit() { obAddCredit(); },
  obDelCredit(idx) {
    if (getSettings().credit_accounts) getSettings().credit_accounts.splice(idx, 1);
    obRenderLists();
  },
  obUpdateCredit(idx, field, val) {
    if (getSettings().credit_accounts) {
      const card = getSettings().credit_accounts[idx];
      if (card) {
        card[field] = val;
        obRenderLists();
      }
    }
  },
  obAddDeduction() { obAddDeduction(); },
  obDelDeduct(idx) {
    if (getSettings().default_deductions) getSettings().default_deductions.splice(idx, 1);
    obRenderLists();
  },
  obAddDD() { obAddDD(); },
  obDelDD(idx) {
    if (getSettings().default_direct_debits) getSettings().default_direct_debits.splice(idx, 1);
    obRenderLists();
  },
  obAddYearly() { obAddYearly(); },
  obDelYearly(idx) {
    if (getSettings().default_yearly_recurring) getSettings().default_yearly_recurring.splice(idx, 1);
    obRenderLists();
  },
  obAddWeekly() { obAddWeekly(); },
  obDelWeekly(idx) {
    if (getSettings().default_weekly) getSettings().default_weekly.splice(idx, 1);
    obRenderLists();
  },
  async obFinish() {
    await finishOnboarding(() => {
      const now = new Date();
      appState.currentYear = now.getFullYear();
      const detected = detectCurrentMonthAndWeek(appState.currentYear);
      if (detected && detected.month) {
        appState.activeTab = detected.month;
      }
      renderYearMenu();
      renderNav();
      renderContent();
    });
  },

  // Annual Recurring Bills in Modal
  async addYearlyRecurringBill() {
    const desc = document.getElementById('m-yr-desc').value.trim();
    const month = document.getElementById('m-yr-m').value;
    const day = parseInt(document.getElementById('m-yr-day').value, 10) || 1;
    const amt = parseFloat(document.getElementById('m-yr-amt').value);
    const acc = document.getElementById('m-yr-acc').value;

    if (!desc || isNaN(amt)) return;
    const yData = getYearData();
    if (!yData.yearly_recurring) yData.yearly_recurring = [];
    yData.yearly_recurring.push({ desc, month, due_day: day, amount: amt, account: acc });

    openYearlyRecurringView();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async deleteYearlyRecurringBill(idx) {
    const yData = getYearData();
    if (yData.yearly_recurring) {
      yData.yearly_recurring.splice(idx, 1);
      openYearlyRecurringView();
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  // Archive Manager
  async toggleArchiveMonth(mName, fromModal = false) {
    const md = getMonthData(mName);
    md.archived = !md.archived;
    if (fromModal) {
      openArchiveManagerModal();
    }
    renderNav();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async createNewBudgetYear(newYear) {
    newYear = parseInt(newYear, 10);
    if (!newYear || isNaN(newYear)) return;
    if (appState.data.years[newYear]) {
      alert(`Year ${newYear} already exists.`);
      return;
    }
    const cfg = getSettings();
    const prevYearNum = newYear - 1;
    const prevYearData = appState.data.years ? appState.data.years[String(prevYearNum)] : null;

    // 1. Inherit Birthdays (fresh transactions for new year)
    let initialBirthdays = [];
    if (prevYearData && prevYearData.birthdays && prevYearData.birthdays.length > 0) {
      initialBirthdays = prevYearData.birthdays.map(b => ({ ...b, transactions: [] }));
    } else {
      initialBirthdays = JSON.parse(JSON.stringify(cfg.birthdays || []));
    }

    // 2. Inherit Recurring Payments & Incomes
    let initialRecurring = [];
    if (prevYearData && prevYearData.recurring_payments && prevYearData.recurring_payments.length > 0) {
      initialRecurring = JSON.parse(JSON.stringify(prevYearData.recurring_payments));
    } else {
      initialRecurring = JSON.parse(JSON.stringify(cfg.recurring_payments || []));
    }

    let initialRecurringIncomes = [];
    if (prevYearData && prevYearData.recurring_incomes && prevYearData.recurring_incomes.length > 0) {
      initialRecurringIncomes = JSON.parse(JSON.stringify(prevYearData.recurring_incomes));
    } else {
      initialRecurringIncomes = JSON.parse(JSON.stringify(cfg.recurring_incomes || []));
    }

    // 3. Inherit Annual Bills & Incomes
    let initialYearlyBills = [];
    if (prevYearData && prevYearData.yearly_recurring && prevYearData.yearly_recurring.length > 0) {
      initialYearlyBills = JSON.parse(JSON.stringify(prevYearData.yearly_recurring));
    } else {
      initialYearlyBills = JSON.parse(JSON.stringify(cfg.default_yearly_recurring || []));
    }

    let initialYearlyIncomes = [];
    if (prevYearData && prevYearData.yearly_income && prevYearData.yearly_income.length > 0) {
      initialYearlyIncomes = JSON.parse(JSON.stringify(prevYearData.yearly_income));
    } else {
      initialYearlyIncomes = JSON.parse(JSON.stringify(cfg.default_yearly_income || []));
    }

    // 4. Inherit active Direct Debits, Payments In, and Deductions from previous year December (or defaults)
    const prevDecMonth = (prevYearData && prevYearData.months && prevYearData.months['Dec']) ? prevYearData.months['Dec'] : null;
    const inheritDDs = prevDecMonth ? prevDecMonth.direct_debits : cfg.default_direct_debits;
    const inheritPaymentsIn = prevDecMonth ? prevDecMonth.payments_in : cfg.default_payments_in;
    const inheritDeducts = prevDecMonth ? prevDecMonth.deductions_list : cfg.default_deductions;

    appState.data.years[newYear] = {
      archived: false,
      birthdays: initialBirthdays,
      recurring_payments: initialRecurring,
      recurring_incomes: initialRecurringIncomes,
      yearly_recurring: initialYearlyBills,
      yearly_income: initialYearlyIncomes,
      yearly_budgets: [],
      months: {}
    };

    months.forEach(mName => {
      appState.data.years[newYear].months[mName] = {
        current_data: {},
        savings_data: {},
        credit_data: {},
        deductions_list: JSON.parse(JSON.stringify(inheritDeducts || cfg.default_deductions || [])),
        direct_debits: JSON.parse(JSON.stringify(inheritDDs || cfg.default_direct_debits || [])),
        payments_in: JSON.parse(JSON.stringify(inheritPaymentsIn || cfg.default_payments_in || [])),
        weekly_items: {},
        weekly_actuals: {},
        archived: false
      };
      cfg.current_accounts.forEach(acc => { appState.data.years[newYear].months[mName].current_data[acc] = { opening: 0 }; });
      cfg.savings_accounts.forEach(acc => { appState.data.years[newYear].months[mName].savings_data[acc] = { opening: 0 }; });
      cfg.credit_accounts.forEach(c => { appState.data.years[newYear].months[mName].credit_data[c.name] = { opening_spent: 0 }; });
    });

    // 5. Carry over December closing balances to January opening balances of new year
    if (prevYearData && typeof computeMonthClosing === 'function') {
      try {
        const decClosing = computeMonthClosing('Dec', 11, prevYearNum);
        cfg.current_accounts.forEach(acc => {
          if (decClosing.current[acc] !== undefined) {
            appState.data.years[newYear].months['Jan'].current_data[acc].opening = decClosing.current[acc];
          }
        });
        cfg.credit_accounts.forEach(c => {
          if (decClosing.credit[c.name] !== undefined) {
            appState.data.years[newYear].months['Jan'].credit_data[c.name].opening_spent = decClosing.credit[c.name];
          }
        });
        cfg.savings_accounts.forEach(acc => {
          if (decClosing.savings[acc] !== undefined) {
            appState.data.years[newYear].months['Jan'].savings_data[acc].opening = decClosing.savings[acc];
          }
        });
      } catch(e) {
        console.warn("Could not roll over December closing balances:", e);
      }
    }

    appState.currentYear = newYear;
    closeModal();
    calculateAndSyncRollovers();
    renderYearMenu();
    renderNav();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  // Yearly Budgets View Handlers
  openAddBudgetModal() {
    const cfg = getSettings();
    showModal({
      title: "🎯 Create Annual Budget & Goal",
      body: `
        <label style="font-size:11px; text-transform:uppercase;">Budget / Goal Name</label>
        <input type="text" id="bg-name" placeholder="e.g. Summer Holiday, House Renovation" style="margin-bottom:8px;">
        
        <label style="font-size:11px; text-transform:uppercase;">Total Budget Allocation (${cfg.currency})</label>
        <input type="number" step="0.01" id="bg-total" placeholder="1500.00" style="margin-bottom:8px;">
        
        <label style="font-size:11px; text-transform:uppercase;">Target Account (Funding Source)</label>
        <select id="bg-acc" style="margin-bottom:8px;">
          <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}">${a}</option>`).join('')}</optgroup>
          ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</optgroup>` : ''}
          ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
        </select>
        
        <label style="font-size:11px; text-transform:uppercase;">Target End Date</label>
        <input type="date" id="bg-date" value="${appState.currentYear}-12-31" min="${appState.currentYear}-01-01" max="${Number(appState.currentYear) + 5}-12-31" style="margin-bottom:8px;">

        <label style="font-size:11px; text-transform:uppercase;">Remaining Balance Deduction Strategy</label>
        <select id="bg-strategy" style="margin-bottom:8px;">
          <option value="none" selected>None (Transactions Only)</option>
          <option value="monthly_spread">Spread Remaining Monthly</option>
          <option value="target_date">Deduct on Target Date</option>
        </select>
      `,
      actions: `
        <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
        <button class="btn green" onclick="window.budgetApp.confirmAddBudget()">Create Budget</button>
      `
    });
  },

  async confirmAddBudget() {
    const name = document.getElementById('bg-name').value.trim();
    const total = parseFloat(document.getElementById('bg-total').value);
    const acc = document.getElementById('bg-acc').value;
    const endDate = document.getElementById('bg-date').value;
    const strategy = document.getElementById('bg-strategy').value;

    if (!name || isNaN(total)) return;
    const yData = getYearData();
    if (!yData.yearly_budgets) yData.yearly_budgets = [];
    yData.yearly_budgets.push({
      name,
      total_budget: total,
      account: acc,
      end_date: endDate,
      deduction_strategy: strategy,
      transactions: []
    });

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async deleteBudget(bIdx) {
    if (!confirm("Are you sure you want to delete this annual budget?")) return;
    const yData = getYearData();
    if (yData.yearly_budgets) {
      yData.yearly_budgets.splice(bIdx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  addBudgetTransaction(bIdx) {
    const cfg = getSettings();
    const b = getYearData().yearly_budgets[bIdx];
    if (!b) return;
    const now = new Date();
    const todayIso = `${appState.currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    showModal({
      title: `🎯 Add Spend: ${b.name}`,
      body: `
        <label style="font-size:11px; text-transform:uppercase;">Description</label>
        <input type="text" id="tx-desc" placeholder="e.g. Flights deposit, Materials" style="margin-bottom:8px;">
        
        <label style="font-size:11px; text-transform:uppercase;">Amount (${cfg.currency})</label>
        <input type="number" step="0.01" id="tx-amt" placeholder="100.00" style="margin-bottom:8px;">

        <label style="font-size:11px; text-transform:uppercase;">Date of Spend</label>
        <input type="date" id="tx-date" value="${todayIso}" min="${appState.currentYear}-01-01" max="${Number(appState.currentYear) + 5}-12-31" style="margin-bottom:8px;">

        <label style="font-size:11px; text-transform:uppercase;">Charged Account</label>
        <select id="tx-acc" style="margin-bottom:8px;">
          <optgroup label="Current Accounts">${cfg.current_accounts.map(a => `<option value="${a}" ${a === b.account ? 'selected' : ''}>${a}</option>`).join('')}</optgroup>
          ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${c.name === b.account ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
          ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
        </select>
      `,
      actions: `
        <button class="btn secondary" onclick="window.budgetApp.closeModal()">Cancel</button>
        <button class="btn green" onclick="window.budgetApp.confirmAddBudgetTransaction(${bIdx})">Add Spend</button>
      `
    });
  },

  async confirmAddBudgetTransaction(bIdx) {
    const desc = document.getElementById('tx-desc').value.trim();
    const amt = parseFloat(document.getElementById('tx-amt').value);
    const date = document.getElementById('tx-date').value;
    const acc = document.getElementById('tx-acc').value;

    if (!desc || isNaN(amt)) return;
    const b = getYearData().yearly_budgets[bIdx];
    if (b) {
      if (!b.transactions) b.transactions = [];
      b.transactions.push({ desc, amount: amt, date, account: acc });
      closeModal();
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editYearlyBudgetField(bIdx, field, value) {
    const b = getYearData().yearly_budgets[bIdx];
    if (b) {
      if (field === 'end_date') {
        if (!value || value.length < 10) return;
        b.end_date = value;
      } else if (field === 'total_budget') {
        b.total_budget = parseFloat(value) || 0;
      } else {
        b[field] = value;
      }
      calculateAndSyncRollovers();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editBudgetTxField(bIdx, tIdx, field, value) {
    const b = getYearData().yearly_budgets[bIdx];
    if (b && b.transactions && b.transactions[tIdx]) {
      if (field === 'date') {
        if (!value || value.length < 10) return;
        b.transactions[tIdx].date = value;
      } else if (field === 'amount') {
        b.transactions[tIdx].amount = parseFloat(value) || 0;
      } else {
        b.transactions[tIdx][field] = value;
      }
      calculateAndSyncRollovers();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addInlineBudgetTx(bIdx) {
    const descEl = document.getElementById(`inline-tx-desc-${bIdx}`);
    const amtEl = document.getElementById(`inline-tx-amt-${bIdx}`);
    const dateEl = document.getElementById(`inline-tx-date-${bIdx}`);
    const acctEl = document.getElementById(`inline-tx-acct-${bIdx}`);

    const desc = descEl ? descEl.value.trim() : '';
    const amt = amtEl ? parseFloat(amtEl.value) : 0;
    const date = dateEl ? dateEl.value : '';
    const b = getYearData().yearly_budgets[bIdx];
    const acct = acctEl ? acctEl.value : (b ? b.account : getSettings().current_accounts[0]);

    if (!desc || isNaN(amt)) return;
    if (b) {
      if (!b.transactions) b.transactions = [];
      b.transactions.push({ desc, amount: amt, date, account: acct });
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async deleteBudgetTransaction(bIdx, tIdx) {
    const b = getYearData().yearly_budgets[bIdx];
    if (b && b.transactions) {
      b.transactions.splice(tIdx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async updateBudgetStrategy(bIdx, strategy) {
    const b = getYearData().yearly_budgets[bIdx];
    if (b) {
      b.deduction_strategy = strategy;
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  // Accounts Opening Updates
  async updateCurrentOpening(acc, val) {
    const md = getMonthData(appState.activeTab);
    if (!md.current_data[acc]) md.current_data[acc] = {};
    if (val === "" || val === null || val === undefined) {
      delete md.current_data[acc].opening;
      delete md.current_data[acc].user_edited;
    } else {
      md.current_data[acc].opening = parseFloat(val) || 0;
      md.current_data[acc].user_edited = true;
    }
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async updateCreditOpening(cardName, val) {
    const md = getMonthData(appState.activeTab);
    if (!md.credit_data[cardName]) md.credit_data[cardName] = {};
    if (val === "" || val === null || val === undefined) {
      delete md.credit_data[cardName].opening_spent;
      delete md.credit_data[cardName].user_edited;
    } else {
      md.credit_data[cardName].opening_spent = parseFloat(val) || 0;
      md.credit_data[cardName].user_edited = true;
    }
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async updateAccountSaving(accName, val) {
    const md = getMonthData(appState.activeTab);
    if (!md.savings_data[accName]) md.savings_data[accName] = {};
    if (val === "" || val === null || val === undefined) {
      delete md.savings_data[accName].opening;
      delete md.savings_data[accName].user_edited;
    } else {
      md.savings_data[accName].opening = parseFloat(val) || 0;
      md.savings_data[accName].user_edited = true;
    }
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async updateOpeningBalance(type, name, val) {
    const md = getMonthData(appState.activeTab);
    const parsed = parseFloat(val) || 0;
    if (type === 'current') {
      if (!md.current_data[name]) md.current_data[name] = {};
      md.current_data[name].opening = parsed;
    } else if (type === 'credit') {
      if (!md.credit_data[name]) md.credit_data[name] = {};
      md.credit_data[name].opening_spent = parsed;
    } else if (type === 'savings') {
      if (!md.savings_data[name]) md.savings_data[name] = {};
      md.savings_data[name].opening = parsed;
    }
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  handleItemEditWithModal(type, idx, fieldOrPerson, val) {
    if (type === 'deduction_name') {
      this.editDeductionName(idx, val);
    } else if (type === 'deduction_field' && fieldOrPerson === 'target_account') {
      this.editDeductionTarget(idx, val);
    } else if (type === 'deduction_person') {
      this.updateSalaryDeduction(idx, fieldOrPerson, val);
    }
  },

  handleItemDeleteWithModal(type, idx) {
    if (type === 'deduction') {
      this.deleteSalaryDeduction(idx);
    }
  },

  handleAddWithModal(type) {
    if (type === 'deduction') {
      this.addSalaryDeduction();
    }
  },

  async updateSalaryDeduction(dIdx, person, val) {
    const md = getMonthData(appState.activeTab);
    const d = md.deductions_list[dIdx];
    if (d) {
      if (!d.amounts) d.amounts = {};
      const num = parseFloat(val) || 0;
      d.amounts[person] = num;
      if (d.person === person || !d.person) {
        d.amount = num;
      }
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editDeductionName(dIdx, newName) {
    const md = getMonthData(appState.activeTab);
    const d = md.deductions_list[dIdx];
    if (d) {
      d.name = newName;
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editDeductionTarget(dIdx, newTarget) {
    const md = getMonthData(appState.activeTab);
    const d = md.deductions_list[dIdx];
    if (d) {
      d.target_account = newTarget;
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editDeductionFrequency(dIdx, newFreq) {
    const md = getMonthData(appState.activeTab);
    const d = md.deductions_list[dIdx];
    if (d) {
      d.frequency = newFreq;
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editDeductionAnchorDate(dIdx, newDate) {
    const md = getMonthData(appState.activeTab);
    const d = md.deductions_list[dIdx];
    if (d) {
      d.anchor_date = newDate;
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addSalaryDeductionForPerson(person) {
    const nameEl = document.getElementById(`new-deduct-name-${person}`);
    const targetEl = document.getElementById(`new-deduct-target-${person}`);
    const amtEl = document.getElementById(`new-deduct-amt-${person}`);
    const isSalaryEl = document.getElementById(`new-deduct-issalary-${person}`);
    const isSalary = isSalaryEl ? isSalaryEl.checked : false;

    if (!nameEl || !amtEl) return;
    const name = nameEl.value.trim();
    const amt = parseFloat(amtEl.value) || 0;
    const target = targetEl ? targetEl.value : 'none';
    if (!name) return;

    const md = getMonthData(appState.activeTab);
    if (!md.deductions_list) md.deductions_list = [];

    const amounts = {};
    amounts[person] = amt;

    md.deductions_list.push({
      name,
      target_account: target,
      person,
      amount: amt,
      amounts,
      is_salary: isSalary
    });

    nameEl.value = '';
    amtEl.value = '';
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async addSalaryDeduction() {
    const nameEl = document.getElementById('new-deduct-name');
    const targetEl = document.getElementById('new-deduct-target');
    const isSalaryEl = document.getElementById('new-deduct-issalary');
    const isSalary = isSalaryEl ? isSalaryEl.checked : false;

    if (!nameEl) return;
    const name = nameEl.value.trim();
    const target = targetEl ? targetEl.value : 'none';
    if (!name) return;

    const md = getMonthData(appState.activeTab);
    if (!md.deductions_list) md.deductions_list = [];

    const amounts = {};
    getSettings().people.forEach((p, idx) => {
      const amtEl = document.getElementById(`new-deduct-p${idx}`);
      amounts[p] = amtEl ? parseFloat(amtEl.value) || 0 : 0;
    });

    md.deductions_list.push({ name, target_account: target, amounts, is_salary: isSalary });
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async deleteSalaryDeduction(idx) {
    const md = getMonthData(appState.activeTab);
    if (md.deductions_list) {
      md.deductions_list.splice(idx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async propagateDeductions() {
    const currentMonth = appState.activeTab;
    const currentYear = appState.currentYear;
    const yData = getYearData(currentYear);
    const mIdx = months.indexOf(currentMonth);
    const currentDeducts = JSON.parse(JSON.stringify(getMonthData(currentMonth).deductions_list || []));

    if (!confirm(`Propagate current Salaries & Deductions to all following months (${months.slice(mIdx + 1).join(', ')})?`)) return;

    for (let i = mIdx + 1; i < 12; i++) {
      const targetMName = months[i];
      if (yData.months[targetMName]) {
        yData.months[targetMName].deductions_list = JSON.parse(JSON.stringify(currentDeducts));
      }
    }

    const cfg = getSettings();
    cfg.default_deductions = JSON.parse(JSON.stringify(currentDeducts));

    calculateAndSyncRollovers();
    renderContent();
    if (cfg.onboarding_complete) { await saveBudget(appState.data); }
  },

  async editDirectDebit(ddIdx, field, val) {
    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek() : { month: 'Jan' };
    const currentActiveMonth = months.includes(appState.activeTab) ? appState.activeTab : (detected.month || 'Jan');
    const md = getMonthData(currentActiveMonth);
    const dd = md.direct_debits ? md.direct_debits[ddIdx] : null;
    if (dd) {
      if (field === 'due_day') dd.due_day = parseInt(val, 10) || 1;
      else if (field === 'amount') dd.amount = parseFloat(val) || 0;
      else dd[field] = val;
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addDirectDebit() {
    const descEl = document.getElementById('new-dd-desc');
    const dayEl = document.getElementById('new-dd-day');
    const amtEl = document.getElementById('new-dd-amt');
    const accEl = document.getElementById('new-dd-acc');
    const transEl = document.getElementById('new-dd-transfer');

    if (!descEl || !amtEl) return;
    const desc = descEl.value.trim();
    const day = dayEl ? parseInt(dayEl.value, 10) || 1 : 1;
    const amt = parseFloat(amtEl.value);
    const acc = accEl ? accEl.value : getSettings().current_accounts[0];
    const trans = transEl ? transEl.value : 'none';

    if (!desc || isNaN(amt) || amt <= 0) return;
    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek() : { month: 'Jan' };
    const currentActiveMonth = months.includes(appState.activeTab) ? appState.activeTab : (detected.month || 'Jan');
    const yData = getYearData(appState.currentYear);
    const cfg = getSettings();

    const newDD = { desc, due_day: day, amount: amt, account: acc, transfer_to: trans, holiday_rule: 'following' };
    if (!cfg.default_direct_debits) cfg.default_direct_debits = [];
    cfg.default_direct_debits.push(newDD);

    const mIdx = months.indexOf(currentActiveMonth);
    for (let i = Math.max(0, mIdx); i < 12; i++) {
      const mName = months[i];
      if (yData.months && yData.months[mName]) {
        if (!yData.months[mName].direct_debits) yData.months[mName].direct_debits = [];
        yData.months[mName].direct_debits.push({ ...newDD });
      }
    }
    const md = getMonthData(currentActiveMonth);
    if (!md.direct_debits.some(d => d.desc === desc && d.due_day === day && d.amount === amt)) {
      md.direct_debits.push({ ...newDD });
    }

    descEl.value = '';
    amtEl.value = '';
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async deleteDirectDebit(idx) {
    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek() : { month: 'Jan' };
    const currentActiveMonth = months.includes(appState.activeTab) ? appState.activeTab : (detected.month || 'Jan');
    const md = getMonthData(currentActiveMonth);
    if (md.direct_debits) {
      md.direct_debits.splice(idx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async propagateDirectDebits() {
    const currentMonth = appState.activeTab;
    const currentYear = appState.currentYear;
    const yData = getYearData(currentYear);
    const mIdx = months.indexOf(currentMonth);
    const currentDDs = JSON.parse(JSON.stringify(getMonthData(currentMonth).direct_debits || []));

    if (!confirm(`Propagate current Direct Debits to all following months (${months.slice(mIdx + 1).join(', ')})?`)) return;

    for (let i = mIdx + 1; i < 12; i++) {
      const targetMName = months[i];
      if (yData.months[targetMName]) {
        yData.months[targetMName].direct_debits = JSON.parse(JSON.stringify(currentDDs));
      }
    }

    const cfg = getSettings();
    cfg.default_direct_debits = JSON.parse(JSON.stringify(currentDDs));

    calculateAndSyncRollovers();
    renderContent();
    if (cfg.onboarding_complete) { await saveBudget(appState.data); }
  },

  async updateActualField(weekName, fieldName, value) {
    const actuals = getWeekActuals(appState.activeTab, weekName);
    actuals[fieldName] = value;
    if (!actuals._timestamps) actuals._timestamps = {};
    if (!actuals._sources) actuals._sources = {};
    if (value !== "" && value !== null && value !== undefined) {
      actuals._timestamps[fieldName] = new Date().toISOString();
      actuals._sources[fieldName] = 'manual';
    } else {
      delete actuals._timestamps[fieldName];
      delete actuals._sources[fieldName];
    }
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async revertActualFieldToBankSync(weekName, fieldKey) {
    const actuals = getWeekActuals(appState.activeTab, weekName);
    if (actuals._sources) delete actuals._sources[fieldKey];
    if (actuals._timestamps) delete actuals._timestamps[fieldKey];
    delete actuals[fieldKey];
    this.applyOpenBankingToCheckins();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async addWeekItemToColumn(weekName, colType, colName) {
    const descEl = document.getElementById(`desc-${weekName}-${colName}`);
    const amtEl = document.getElementById(`amt-${weekName}-${colName}`);
    const typeEl = document.getElementById(`type-${weekName}-${colName}`);
    if (!descEl || !amtEl) return;
    const desc = descEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const isIncome = typeEl ? (typeEl.value === 'income') : false;
    if (!desc || isNaN(amt)) return;

    const items = getWeekItems(appState.activeTab, weekName);
    items.push({
      desc,
      amount: amt,
      is_income: isIncome,
      account_type: colType,
      account_name: colName
    });

    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async editWeekItem(weekName, itemIdx, field, value) {
    const items = getWeekItems(appState.activeTab, weekName);
    const item = items[itemIdx];
    if (item) {
      if (field === 'amount') item.amount = parseFloat(value) || 0;
      else if (field === 'desc') item.desc = value;
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editWeekItemType(weekName, itemIdx, typeValue) {
    const items = getWeekItems(appState.activeTab, weekName);
    const item = items[itemIdx];
    if (item) {
      item.is_income = (typeValue === 'income');
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async deleteWeekItem(weekName, itemIdx) {
    const items = getWeekItems(appState.activeTab, weekName);
    items.splice(itemIdx, 1);
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

    openRescheduleRecurringModal(recurringIdx, currentMonth, currentWeek, itemType = 'outgoing') {
    openRescheduleRecurringModal(recurringIdx, currentMonth, currentWeek, itemType);
  },

  updateReschedWeekOptions(mName, selWeek) {
    updateReschedWeekOptions(mName, selWeek);
  },

  async bumpRecurringPayment(rIdx, offsetWeeks, offsetMonths, shiftFuture, currentMonth, itemType = 'outgoing') {
    const yData = getYearData();
    const isIncome = (itemType === 'income');
    const list = isIncome ? (yData.recurring_incomes || getSettings().recurring_incomes || []) : (yData.recurring_payments || []);
    const r = list[rIdx];
    if (!r) return;

    const baseDate = r.start_date ? new Date(r.start_date.includes('T') ? r.start_date : r.start_date + 'T00:00:00') : new Date(appState.currentYear, 0, 1);
    
    if (offsetWeeks) {
      baseDate.setDate(baseDate.getDate() + (offsetWeeks * 7));
    }
    if (offsetMonths) {
      baseDate.setMonth(baseDate.getMonth() + offsetMonths);
    }

    const yr = baseDate.getFullYear();
    const mo = String(baseDate.getMonth() + 1).padStart(2, '0');
    const da = String(baseDate.getDate()).padStart(2, '0');
    r.start_date = `${yr}-${mo}-${da}`;
    r.day_of_month = baseDate.getDate();

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
  },

  async confirmRescheduleRecurring(rIdx, currentMonth, currentWeek, itemType = 'outgoing') {
    const yData = getYearData();
    const isIncome = (itemType === 'income');
    const list = isIncome ? (yData.recurring_incomes || getSettings().recurring_incomes || []) : (yData.recurring_payments || []);
    const r = list[rIdx];
    if (!r) return;

    const destMonthEl = document.getElementById('reschedDestMonth');
    const destWeekEl = document.getElementById('reschedDestWeek');
    const destAccEl = document.getElementById('reschedDestAccount');
    const destHolidayEl = document.getElementById('reschedHolidayRule');

    const destMonth = destMonthEl ? destMonthEl.value : currentMonth;
    const destWeek = destWeekEl ? destWeekEl.value : currentWeek;
    const destAcc = destAccEl ? destAccEl.value : r.account;

    const mIdx = months.indexOf(destMonth);
    const sched = calculateMonthSchedule(appState.currentYear, mIdx >= 0 ? mIdx : 0);
    const targetWeekObj = sched.weeks.find(w => w.name === destWeek) || sched.weeks[0];

    if (targetWeekObj) {
      const targetDate = targetWeekObj.startDate;
      const yr = targetDate.getFullYear();
      const mo = String(targetDate.getMonth() + 1).padStart(2, '0');
      const da = String(targetDate.getDate()).padStart(2, '0');
      r.start_date = `${yr}-${mo}-${da}`;
      r.day_of_month = targetDate.getDate();
    }

    if (destAcc) {
      r.account = destAcc;
    }
    if (destHolidayEl) {
      r.holiday_rule = destHolidayEl.value;
    }

    closeModal();
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
  },

  handleDragStartScheduled(event, rIdx, sourceMonth, sourceWeek, itemType = 'outgoing') {
    const payload = {
      isScheduledRecurring: true,
      rIdx: parseInt(rIdx, 10),
      itemType: itemType || 'outgoing',
      sourceMonth: sourceMonth || appState.activeTab,
      sourceWeek: sourceWeek
    };
    event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
    if (event.currentTarget) {
      event.currentTarget.classList.add('dragging');
    }
  },

  // Drag and drop handlers
  handleDragStart(event, sourceMonth, sourceWeek, itemIdx) {
    if (typeof itemIdx === 'undefined') {
      itemIdx = sourceWeek;
      sourceWeek = sourceMonth;
      sourceMonth = appState.activeTab;
    }
    const payload = {
      sourceMonth: sourceMonth || appState.activeTab,
      sourceWeek: sourceWeek,
      itemIdx: parseInt(itemIdx, 10)
    };
    event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
    if (event.currentTarget) {
      event.currentTarget.classList.add('dragging');
    }
  },

  handleDragOver(event, el) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (el) {
      el.classList.add('drag-over');
    }
  },

  handleDragLeave(event, el) {
    if (el) {
      el.classList.remove('drag-over');
    }
  },

  handleDragEnd(event) {
    document.querySelectorAll('.week-column.drag-over').forEach(c => c.classList.remove('drag-over'));
    document.querySelectorAll('.item-entry.dragging').forEach(e => e.classList.remove('dragging'));
  },

  async handleDrop(event, targetWeek, targetColType, targetColName, el) {
    event.preventDefault();
    if (el) el.classList.remove('drag-over');
    this.handleDragEnd(event);

    const dataStr = event.dataTransfer.getData('text/plain');
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);

      if (data.isScheduledRecurring) {
        const yData = getYearData();
        const isIncome = (data.itemType === 'income');
        const list = isIncome ? (yData.recurring_incomes || getSettings().recurring_incomes || []) : (yData.recurring_payments || []);
        const r = list[data.rIdx];
        if (r) {
          const mIdx = months.indexOf(appState.activeTab);
          const sched = calculateMonthSchedule(appState.currentYear, mIdx >= 0 ? mIdx : 0);
          const targetWeekObj = sched.weeks.find(w => w.name === targetWeek);
          if (targetWeekObj) {
            const targetDate = targetWeekObj.startDate;
            const yr = targetDate.getFullYear();
            const mo = String(targetDate.getMonth() + 1).padStart(2, '0');
            const da = String(targetDate.getDate()).padStart(2, '0');
            r.start_date = `${yr}-${mo}-${da}`;
            r.day_of_month = targetDate.getDate();
          }
          if (targetColName) {
            r.account = targetColName;
          }
          calculateAndSyncRollovers();
          renderContent();
          if (getSettings().onboarding_complete) {
            await saveBudget(appState.data);
          }
        }
        return;
      }

      const srcMonth = data.sourceMonth || appState.activeTab;
      const srcWeek = data.sourceWeek;
      const itemIdx = parseInt(data.itemIdx, 10);

      const sourceItems = getWeekItems(srcMonth, srcWeek);
      if (!sourceItems || isNaN(itemIdx) || itemIdx < 0 || itemIdx >= sourceItems.length) return;

      const [item] = sourceItems.splice(itemIdx, 1);
      if (item) {
        if (targetColType) item.account_type = targetColType;
        if (targetColName) item.account_name = targetColName;

        const targetItems = getWeekItems(appState.activeTab, targetWeek);
        if (targetItems) {
          targetItems.push(item);
        }
        calculateAndSyncRollovers();
        renderContent();
        if (getSettings().onboarding_complete) {
          await saveBudget(appState.data);
        }
      }
    } catch (e) {
      console.error("Drop error:", e);
    }
  },

  // Settings Handlers & Widget Ordering
  getAllWidgetOrder() {
    const cfg = getSettings();
    const currentWidgets = cfg.enabled_widgets || ["current_projected", "credit_projected", "savings_projected", "net_position", "total_outgoings"];
    let order = cfg.all_widget_order;
    if (!order || !Array.isArray(order) || order.length === 0) {
      const remaining = ALL_AVAILABLE_WIDGETS.map(w => w.id).filter(id => !currentWidgets.includes(id));
      order = [...currentWidgets, ...remaining];
    } else {
      const missing = ALL_AVAILABLE_WIDGETS.map(w => w.id).filter(id => !order.includes(id));
      order = [...order, ...missing];
    }
    cfg.all_widget_order = order;
    return order;
  },

  moveWidgetOrder(idx, direction) {
    const cfg = getSettings();
    const allIds = this.getAllWidgetOrder();
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= allIds.length) return;

    const temp = allIds[idx];
    allIds[idx] = allIds[targetIdx];
    allIds[targetIdx] = temp;
    cfg.all_widget_order = allIds;

    // Synchronize enabled_widgets order with current checkboxes
    const enabled = [];
    allIds.forEach(id => {
      const chk = document.getElementById(`w_chk_${id}`);
      if (chk) {
        if (chk.checked) enabled.push(id);
      } else if (cfg.enabled_widgets && cfg.enabled_widgets.includes(id)) {
        enabled.push(id);
      }
    });
    cfg.enabled_widgets = enabled;

    renderContent();
  },

  onWidgetDragStart(e, idx) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
    }
  },

  onWidgetDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  },

  onWidgetDrop(e, targetIdx) {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(fromIdx) || fromIdx === targetIdx) return;
    const cfg = getSettings();
    const allIds = this.getAllWidgetOrder();
    const [moved] = allIds.splice(fromIdx, 1);
    allIds.splice(targetIdx, 0, moved);
    cfg.all_widget_order = allIds;

    const enabled = [];
    allIds.forEach(id => {
      const chk = document.getElementById(`w_chk_${id}`);
      if (chk) {
        if (chk.checked) enabled.push(id);
      } else if (cfg.enabled_widgets && cfg.enabled_widgets.includes(id)) {
        enabled.push(id);
      }
    });
    cfg.enabled_widgets = enabled;

    renderContent();
  },

  toggleWidgetSelection(widgetId, isChecked) {
    const cfg = getSettings();
    const allOrder = this.getAllWidgetOrder();
    if (!cfg.enabled_widgets) cfg.enabled_widgets = [];
    
    if (isChecked) {
      if (!cfg.enabled_widgets.includes(widgetId)) {
        cfg.enabled_widgets = allOrder.filter(id => id === widgetId || cfg.enabled_widgets.includes(id));
      }
    } else {
      cfg.enabled_widgets = cfg.enabled_widgets.filter(id => id !== widgetId);
    }
    renderContent();
  },

  async saveSettingsForm() {
    await this.saveSettings();
  },

  onPayFrequencyChange(freq) {
    const mBox = document.getElementById('cfg-payday-monthly-box');
    const smBox = document.getElementById('cfg-payday-semimonthly-box');
    const bwBox = document.getElementById('cfg-payday-biweekly-box');
    const wBox = document.getElementById('cfg-payday-weekly-box');

    if (mBox) mBox.style.display = (freq === 'monthly') ? 'block' : 'none';
    if (smBox) smBox.style.display = (freq === 'semi_monthly') ? 'block' : 'none';
    if (bwBox) bwBox.style.display = (freq === 'biweekly' || freq === 'four_weekly') ? 'block' : 'none';
    if (wBox) wBox.style.display = (freq === 'weekly') ? 'block' : 'none';
  },

  onObPayFrequencyChange(freq) {
    const mBox = document.getElementById('ob-pday-monthly-box');
    const bwBox = document.getElementById('ob-pday-biweekly-box');

    if (mBox) mBox.style.display = (freq === 'monthly' || freq === 'semi_monthly') ? 'block' : 'none';
    if (bwBox) bwBox.style.display = (freq === 'biweekly' || freq === 'four_weekly' || freq === 'weekly') ? 'block' : 'none';
  },

  async saveSettings() {
    const cfg = getSettings();
    const currEl = document.getElementById('cfg-curr');
    const payfreqEl = document.getElementById('cfg-payfreq');
    const pdayEl = document.getElementById('cfg-pday');
    const pdayLastWorkEl = document.getElementById('cfg-pday-lastwork');
    const pdayFirstEl = document.getElementById('cfg-pday-first');
    const pdaySecondEl = document.getElementById('cfg-pday-second');
    const pdayAnchorEl = document.getElementById('cfg-pday-anchor');
    const pdayWeekdayEl = document.getElementById('cfg-pday-weekday');
    const holidayEl = document.getElementById('cfg-holiday');
    const themeEl = document.getElementById('cfg-theme');
    const trackSavEl = document.getElementById('cfg-tracksavings');
    const multiUsersEl = document.getElementById('cfg-multiusers');
    const haSensorsEl = document.getElementById('cfg-hasensors');

    if (currEl) cfg.currency = currEl.value;
    if (payfreqEl) cfg.pay_frequency = payfreqEl.value;
    if (pdayEl) cfg.payday_day = parseInt(pdayEl.value, 10) || 26;
    if (pdayLastWorkEl) cfg.payday_is_last_working_day = pdayLastWorkEl.checked;
    if (pdayFirstEl) cfg.payday_first_day = parseInt(pdayFirstEl.value, 10) || 15;
    if (pdaySecondEl) cfg.payday_second_day = pdaySecondEl.value;
    if (pdayAnchorEl) cfg.payday_anchor_date = pdayAnchorEl.value;
    if (pdayWeekdayEl) cfg.payday_weekday = parseInt(pdayWeekdayEl.value, 10) || 5;

    if (holidayEl) cfg.country_holidays = holidayEl.value;
    if (trackSavEl) cfg.track_savings = trackSavEl.checked;
    if (multiUsersEl) cfg.enable_multi_user = multiUsersEl.checked;
    if (haSensorsEl) cfg.enable_ha_sensors = haSensorsEl.checked;
    if (themeEl) {
      cfg.theme = themeEl.value;
      applyTheme(themeEl.value);
    }

    const allOrder = this.getAllWidgetOrder();
    const selectedWidgets = [];
    allOrder.forEach(id => {
      const chk = document.getElementById(`w_chk_${id}`);
      if (chk) {
        if (chk.checked) selectedWidgets.push(id);
      } else if (cfg.enabled_widgets && cfg.enabled_widgets.includes(id)) {
        selectedWidgets.push(id);
      }
    });
    cfg.enabled_widgets = selectedWidgets;

    calculateAndSyncRollovers();
    renderContent();
    await saveBudget(appState.data);
    alert("Settings saved successfully!");
  },

  async toggleMultiUserModeInSettings(enabled) {
    getSettings().enable_multi_user = !!enabled;
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async updatePersonSalaryPrivacy(idx, hide) {
    const p = getSettings().people[idx];
    if (p) {
      setPersonSalaryPrivacy(p, hide);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async updateAccountOwner(accType, accName, owner) {
    setAccountOwner(accType, accName, owner);
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const drop = document.getElementById('userProfileDropdown');
    if (drop) {
      drop.classList.toggle('open');
    }
  },

  switchActiveUser(targetUser) {
    document.getElementById('userProfileDropdown')?.classList.remove('open');
    if (!targetUser || targetUser === 'Joint') {
      setActiveUser('Joint');
      renderUserProfileNav();
      renderContent();
      return;
    }

    if (hasPersonPin(targetUser) && !isUserUnlocked(targetUser)) {
      openPinUnlockModal(targetUser, () => {
        setActiveUser(targetUser);
        renderUserProfileNav();
        renderContent();
      });
      return;
    }

    setActiveUser(targetUser);
    renderUserProfileNav();
    renderContent();
  },

  async submitPinUnlock(person) {
    const inp = document.getElementById('user-pin-input');
    const errEl = document.getElementById('pin-error-msg');
    const enteredPin = (inp ? inp.value : '').trim();

    const res = await unlockAuth(person, enteredPin);
    if (!res.ok && !res.success) {
      if (errEl) errEl.innerText = res.error || "Incorrect PIN. Please try again.";
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      return;
    }

    if (!appState.unlockedUsers) appState.unlockedUsers = {};
    appState.unlockedUsers[person] = true;
    if (person === 'Master') {
      appState.isMasterUnlocked = true;
    } else if (person !== 'Joint') {
      // Envelope unlock: Single-PIN unlocks Person + Joint
      appState.unlockedUsers['Joint'] = true;
    }

    closeModal();
    this.updateLockNavBtn();

    if (typeof window.pendingPinCallback === 'function') {
      const cb = window.pendingPinCallback;
      window.pendingPinCallback = null;
      cb();
    } else {
      if (person !== 'Master') {
        setActiveUser(person);
      }
      renderUserProfileNav();
      renderContent();
    }
  },

  appendPinDigit(digit, person) {
    const inp = document.getElementById('user-pin-input');
    if (inp) {
      inp.value += digit;
      if (inp.value.length >= 4) {
        this.submitPinUnlock(person);
      }
    }
  },

  clearPinInput() {
    const inp = document.getElementById('user-pin-input');
    if (inp) inp.value = '';
    const errEl = document.getElementById('pin-error-msg');
    if (errEl) errEl.innerText = '';
  },

  backspacePinInput() {
    const inp = document.getElementById('user-pin-input');
    if (inp && inp.value.length > 0) {
      inp.value = inp.value.slice(0, -1);
    }
  },

  openSetPinModal(person) {
    openSetPinModal(person);
  },

  async savePersonPin(person) {
    const oldInp = document.getElementById('old-pin-input');
    const newInp = document.getElementById('new-pin-input');
    const confInp = document.getElementById('confirm-pin-input');
    const errEl = document.getElementById('set-pin-error');
    const oldPin = (oldInp ? oldInp.value : '').trim();
    const p1 = (newInp ? newInp.value : '').trim();
    const p2 = (confInp ? confInp.value : '').trim();

    if (!p1) {
      if (errEl) errEl.innerText = "Please enter a PIN code (4-6 digits).";
      return;
    }
    if (p1.length < 4 || p1.length > 6 || isNaN(p1)) {
      if (errEl) errEl.innerText = "PIN must be between 4 and 6 numeric digits.";
      return;
    }
    if (p1 !== p2) {
      if (errEl) errEl.innerText = "PINs do not match. Please check and try again.";
      return;
    }

    const res = await setPinAuth(person, p1, oldPin, true);
    if (!res.ok && !res.success) {
      if (errEl) errEl.innerText = res.error || "Failed to set PIN. Check current PIN.";
      return;
    }

    setPersonPin(person, p1);
    if (!appState.unlockedUsers) appState.unlockedUsers = {};
    appState.unlockedUsers[person] = true;
    if (person === 'Master') appState.isMasterUnlocked = true;

    closeModal();
    this.updateLockNavBtn();
    renderUserProfileNav();
    renderContent();
    alert(`Security PIN set successfully for ${person === 'Master' ? 'Master Lock' : (person === 'Joint' ? 'Joint Household' : person)}!`);
  },

  async removePersonPin(person) {
    if (confirm(`Remove security PIN for ${person}? Anyone will be able to access this profile without authentication.`)) {
      const oldPin = prompt(`Enter current PIN for ${person} to confirm removal:`);
      if (oldPin === null) return;
      const res = await setPinAuth(person, '', oldPin.trim(), false);
      if (!res.ok && !res.success) {
        alert(res.error || "Incorrect current PIN.");
        return;
      }
      setPersonPin(person, '');
      closeModal();
      this.updateLockNavBtn();
      renderUserProfileNav();
      renderContent();
      alert(`Security PIN removed for ${person}.`);
    }
  },

  async removeMasterPin() {
    if (confirm("Disable Master PIN protection? Your budget will open without a PIN prompt.")) {
      const oldPin = prompt("Enter current Master PIN to confirm removal:");
      if (oldPin === null) return;
      const res = await setPinAuth('Master', '', oldPin.trim(), false);
      if (!res.ok && !res.success) {
        alert(res.error || "Incorrect current PIN.");
        return;
      }
      const cfg = getSettings();
      if (cfg.security) {
        cfg.security.master_pin_enabled = false;
        cfg.security.master_pin_hash = "";
      }
      appState.isMasterUnlocked = true;
      this.updateLockNavBtn();
      renderContent();
      alert("Master PIN protection disabled.");
    }
  },

  updateLockNavBtn() {
    const lockBtn = document.getElementById('lockSessionNavBtn');
    if (!lockBtn) return;
    const cfg = getSettings();
    const isMulti = cfg.enable_multi_user;
    let anyPinActive = false;
    if (isMulti) {
      anyPinActive = (cfg.people || []).some(p => hasPersonPin(p)) || hasPersonPin('Joint');
    } else {
      anyPinActive = hasPersonPin('Master');
    }
    if (anyPinActive) {
      lockBtn.style.setProperty('display', 'inline-flex', 'important');
      lockBtn.classList.remove('hidden');
    } else {
      lockBtn.style.setProperty('display', 'none', 'important');
      lockBtn.classList.add('hidden');
    }
  },

  lockActiveSession() {
    lockAllUsers();
    this.updateLockNavBtn();
    const cfg = getSettings();
    if (!cfg.enable_multi_user && hasPersonPin('Master')) {
      openPinUnlockModal('Master', () => {
        appState.isMasterUnlocked = true;
        renderContent();
      });
      return;
    }
    renderUserProfileNav();
    renderContent();
    if (cfg.enable_multi_user) {
      this.showProfileSelectionScreen();
    }
  },

  showProfileSelectionScreen() {
    const overlay = document.getElementById('profileSelectionOverlay');
    const grid = document.getElementById('profileAvatarGrid');
    if (!overlay || !grid) return;

    const cfg = getSettings();
    const palettes = [
      { bg: 'linear-gradient(135deg, #059669, #0d9488)', icon: '👥' }, // Joint
      { bg: 'linear-gradient(135deg, #2563eb, #4f46e5)', icon: '👤' }, // Person 1
      { bg: 'linear-gradient(135deg, #e11d48, #db2777)', icon: '👤' }, // Person 2
      { bg: 'linear-gradient(135deg, #d97706, #b45309)', icon: '👤' }, // Person 3
      { bg: 'linear-gradient(135deg, #0891b2, #0284c7)', icon: '👤' }, // Person 4
      { bg: 'linear-gradient(135deg, #7c3aed, #9333ea)', icon: '👤' }  // Person 5
    ];

    let cardsHtml = '';

    // 1. Joint Household Profile Card
    cardsHtml += `
      <button class="profile-card" onclick="window.budgetApp.selectUserProfile('Joint')">
        <div class="profile-avatar-box" style="background: ${palettes[0].bg};">
          <span class="profile-avatar-icon">${palettes[0].icon}</span>
        </div>
        <span class="profile-card-name">Joint Household</span>
      </button>
    `;

    // 2. Member Profile Cards
    (cfg.people || []).forEach((p, idx) => {
      const pal = palettes[((idx % (palettes.length - 1)) + 1)];
      const pinSet = hasPersonPin(p);
      const unlocked = isUserUnlocked(p);
      cardsHtml += `
        <button class="profile-card" onclick="window.budgetApp.selectUserProfile('${p}')">
          <div class="profile-avatar-box" style="background: ${pal.bg};">
            <span class="profile-avatar-icon">${pal.icon}</span>
            ${pinSet ? `
              <div class="profile-lock-badge" title="${unlocked ? 'Unlocked for this session' : 'PIN Protected'}">
                ${unlocked ? '🔓' : '🔒'}
              </div>
            ` : ''}
          </div>
          <span class="profile-card-name">${p}</span>
        </button>
      `;
    });

    grid.innerHTML = cardsHtml;
    overlay.style.display = 'flex';
  },

  hideProfileSelectionScreen() {
    const overlay = document.getElementById('profileSelectionOverlay');
    if (overlay) overlay.style.display = 'none';
  },

  selectUserProfile(person) {
    if (person === 'Joint') {
      setActiveUser('Joint');
      this.hideProfileSelectionScreen();
      renderUserProfileNav();
      renderContent();
      return;
    }

    if (hasPersonPin(person) && !isUserUnlocked(person)) {
      openPinUnlockModal(person, () => {
        setActiveUser(person);
        this.hideProfileSelectionScreen();
        renderUserProfileNav();
        renderContent();
      });
      return;
    }

    setActiveUser(person);
    this.hideProfileSelectionScreen();
    renderUserProfileNav();
    renderContent();
  },

  lockAllProfiles() {
    lockAllUsers();
    renderUserProfileNav();
    renderContent();
    this.showProfileSelectionScreen();
  },

  toggleSalaryReveal(person) {
    const isHidden = isPersonSalaryHidden(person);
    const isUnlocked = isUserUnlocked(person);
    if (!appState.unmaskedSalaries) appState.unmaskedSalaries = {};

    if (isHidden && hasPersonPin(person) && !isUnlocked && !appState.unmaskedSalaries[person]) {
      openPinUnlockModal(person, () => {
        appState.unmaskedSalaries[person] = true;
        renderContent();
      });
      return;
    }

    appState.unmaskedSalaries[person] = !appState.unmaskedSalaries[person];
    renderContent();
  },

  async renameCurrentAccount(idx, newName) {
    if (newName && newName.trim()) {
      const oldName = getSettings().current_accounts[idx];
      const name = newName.trim();
      getSettings().current_accounts[idx] = name;
      if (oldName && oldName !== name) {
        const owner = getAccountOwner('current', oldName);
        setAccountOwner('current', name, owner);
      }
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async deleteCurrentAccountFromSettings(idx) {
    if (confirm("Delete this Current Account?")) {
      getSettings().current_accounts.splice(idx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async renameSavingsAccount(idx, newName) {
    if (newName) {
      getSettings().savings_accounts[idx] = newName.trim();
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async deleteSavingsAccountFromSettings(idx) {
    if (confirm("Delete this Savings Account?")) {
      getSettings().savings_accounts.splice(idx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async deleteCreditAccountFromSettings(idx) {
    if (confirm("Delete this Credit Card?")) {
      getSettings().credit_accounts.splice(idx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addCurrentAccountInSettings() {
    const name = prompt("Enter current account name:");
    if (name && name.trim()) {
      const trimmed = name.trim();
      getSettings().current_accounts.push(trimmed);
      if (isMultiUserEnabled() && appState.activeUser && appState.activeUser !== 'Joint') {
        setAccountOwner('current', trimmed, appState.activeUser);
      }
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addCreditAccountInSettings() {
    const name = prompt("Enter credit card name:");
    if (name && name.trim()) {
      const trimmed = name.trim();
      const owner = (isMultiUserEnabled() && appState.activeUser && appState.activeUser !== 'Joint') ? appState.activeUser : 'Joint';
      getSettings().credit_accounts.push({
        name: trimmed,
        limit: 0,
        owner: owner,
        autopay_enabled: false,
        autopay_from: getSettings().current_accounts[0] || "",
        autopay_when: "week_1",
        autopay_type: "full",
        autopay_fixed_amt: 0.00
      });
      setAccountOwner('credit', trimmed, owner);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addSavingsAccountInSettings() {
    const name = prompt("Enter savings account name:");
    if (name && name.trim()) {
      const trimmed = name.trim();
      getSettings().savings_accounts.push(trimmed);
      if (isMultiUserEnabled() && appState.activeUser && appState.activeUser !== 'Joint') {
        setAccountOwner('savings', trimmed, appState.activeUser);
      }
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async editCreditAccount(idx, field, value) {
    const acc = getSettings().credit_accounts[idx];
    if (!acc) return;
    if (field === 'autopay_enabled') {
      acc[field] = (value === true || value === 'true');
    } else if (field === 'limit' || field === 'autopay_fixed_amt') {
      acc[field] = parseFloat(value) || 0;
    } else {
      acc[field] = value;
    }
    calculateAndSyncRollovers();
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async updatePersonNameInSettings(idx, val) {
    if (val && val.trim()) {
      const oldName = getSettings().people[idx];
      const newName = val.trim();
      getSettings().people[idx] = newName;
      if (oldName && oldName !== newName) {
        if (!getSettings().people_settings) getSettings().people_settings = {};
        getSettings().people_settings[newName] = getSettings().people_settings[oldName] || { hide_salary: false };
        delete getSettings().people_settings[oldName];
      }
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async removePerson(idx) {
    if (confirm("Delete this household member?")) {
      getSettings().people.splice(idx, 1);
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addPerson() {
    const name = prompt("Enter household member name:");
    if (name) {
      getSettings().people.push(name.trim());
      calculateAndSyncRollovers();
      renderContent();
      await saveBudget(appState.data);
    }
  },

  async changeTheme(themeKey) {
    getSettings().theme = themeKey;
    applyTheme(themeKey);
    renderContent();
    if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
  },

  async resetAllData() {
    if (confirm("Are you sure you want to completely RESET all data to default? This cannot be undone!")) {
      await resetDatabase();
      window.location.reload();
    }
  },

  async applyRecategorizationFromModal() {
    const pending = this._pendingRecategorize || {};
    const txnId = pending.txnId;
    const originalMerchant = pending.merchantName || '';
    const selEl = document.getElementById('modalRecategorizeSelect');
    const inputEl = document.getElementById('modalRecatMerchantInput');
    const saveRuleEl = document.getElementById('modalSaveMerchantRule');
    const suggestEl = document.getElementById('modalSuggestToGitHub');

    if (!selEl) return;
    const targetCatId = selEl.value;
    const pattern = (inputEl ? inputEl.value : originalMerchant).toLowerCase().trim();
    const shouldSaveRule = saveRuleEl ? saveRuleEl.checked : true;
    const shouldSuggest = suggestEl ? suggestEl.checked : false;

    const allTxns = appState.data?.open_banking_transactions || [];

    // 1. Direct match on the specific transaction
    if (txnId) {
      const match = allTxns.find(t => String(t.transaction_id) === String(txnId));
      if (match) {
        match.category = targetCatId;
      }
    }

    // 2. Save rule and update all matching transactions (checking payee_name, raw_info, merchant_name, creditor_name, description)
    if (shouldSaveRule && pattern) {
      if (!appState.data.settings) appState.data.settings = {};
      if (!appState.data.settings.merchant_category_rules) {
        appState.data.settings.merchant_category_rules = {};
      }
      appState.data.settings.merchant_category_rules[pattern] = targetCatId;

      // Retroactively update matching transactions across all possible descriptor fields
      allTxns.forEach(t => {
        const full = `${t.payee_name || ''} ${t.raw_info || ''} ${t.merchant_name || ''} ${t.creditor_name || ''} ${t.description || ''}`.toLowerCase();
        if (full.includes(pattern)) {
          t.category = targetCatId;
        }
      });
    }

    if (shouldSuggest && pattern) {
      try {
        if (typeof suggestCategoryMerchant === 'function') {
          suggestCategoryMerchant(pattern, targetCatId).catch(() => {});
        }
      } catch (e) {}
    }

    closeModal();
    this._pendingRecategorize = null;
    await saveBudget(appState.data);
    renderContent();
  },

  async syncCategoriesGitHub() {
    try {
      const res = await syncCategoriesFromGitHub();
      if (res && res.success) {
        if (res.categories && typeof setDynamicCategories === 'function') {
          setDynamicCategories(res.categories);
        }
        alert(`✅ Successfully synced ${res.count || 'latest'} categories and merchants from GitHub!`);
      } else {
        alert("Notice: Could not reach GitHub to sync categories. Using current local cache.");
      }
    } catch (e) {
      alert("Notice: GitHub sync failed: " + e.message);
    }
    renderContent();
  },

  async deleteMerchantCategoryRule(merchantKey) {
    if (confirm(`Delete custom rule for "${merchantKey}"?`)) {
      if (appState.data?.settings?.merchant_category_rules) {
        delete appState.data.settings.merchant_category_rules[merchantKey];
        renderContent();
        if (getSettings().onboarding_complete) {
          await saveBudget(appState.data);
        }
      }
    }
  },

  async exportMerchantCategoryRules() {
    const rules = appState.data?.settings?.merchant_category_rules || {};
    const jsonStr = JSON.stringify(rules, null, 2);
    try {
      await navigator.clipboard.writeText(jsonStr);
      alert("📋 Custom merchant category rules copied to clipboard in JSON format!");
    } catch (e) {
      prompt("Copy your custom rules JSON:", jsonStr);
    }
  }
};

// Immediate or Deferred Execution
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.budgetApp.init();
  });
} else {
  window.budgetApp.init();
}

// --- settings function safety patch ---
(function() {
  var app = window.budgetApp;
  if (!app) return;

  if (typeof app.addCurrentAccountInSettings !== 'function') {
    app.addCurrentAccountInSettings = async function() {
      var name = prompt('Enter current account name:');
      if (name && name.trim()) {
        getSettings().current_accounts.push(name.trim());
        calculateAndSyncRollovers();
        renderContent();
        if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
      }
    };
  }

  if (typeof app.addCreditAccountInSettings !== 'function') {
    app.addCreditAccountInSettings = async function() {
      var name = prompt('Enter credit card name:');
      if (name && name.trim()) {
        getSettings().credit_accounts.push({
          name: name.trim(),
          limit: 0,
          autopay_enabled: false,
          autopay_from: getSettings().current_accounts[0] || '',
          autopay_when: 'week_1',
          autopay_type: 'full',
          autopay_fixed_amt: 0.00
        });
        calculateAndSyncRollovers();
        renderContent();
        if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
      }
    };
  }

  if (typeof app.addSavingsAccountInSettings !== 'function') {
    app.addSavingsAccountInSettings = async function() {
      var name = prompt('Enter savings account name:');
      if (name && name.trim()) {
        getSettings().savings_accounts.push(name.trim());
        calculateAndSyncRollovers();
        renderContent();
        if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
      }
    };
  }

  if (typeof app.editCreditAccount !== 'function') {
    app.editCreditAccount = async function(idx, field, value) {
      var acc = getSettings().credit_accounts[idx];
      if (!acc) return;
      if (field === 'autopay_enabled') {
        acc[field] = (value === true || value === 'true');
      } else if (field === 'limit' || field === 'autopay_fixed_amt') {
        acc[field] = parseFloat(value) || 0;
      } else {
        acc[field] = value;
      }
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    };
  }
})();
