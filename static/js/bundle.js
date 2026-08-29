// Unified single-file app bundle

// --- static/js/state.js ---
const DEFAULT_SETTINGS = {
  currency: "£",
  theme: "grey_dark",
  country_holidays: "uk_ew",
  payday_day: 26,
  track_savings: true,
  enable_yearly_budgets: true,
  enable_multi_user: false,
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
}

function hasPersonPin(personName) {
  return !!getPersonPin(personName);
}

function isUserUnlocked(personName) {
  if (!personName || personName === 'Joint') return true;
  if (!hasPersonPin(personName)) return true;
  return !!(appState.unlockedUsers && appState.unlockedUsers[personName]);
}

function unlockUser(personName, pin) {
  if (!hasPersonPin(personName)) {
    if (!appState.unlockedUsers) appState.unlockedUsers = {};
    appState.unlockedUsers[personName] = true;
    return true;
  }
  const expected = getPersonPin(personName);
  if (String(pin).trim() === expected) {
    if (!appState.unlockedUsers) appState.unlockedUsers = {};
    appState.unlockedUsers[personName] = true;
    return true;
  }
  return false;
}

function lockAllUsers() {
  appState.unlockedUsers = {};
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
function getApiUrl() {
  let p = window.location.pathname;
  if (p.endsWith('index.html')) p = p.slice(0, -10);
  if (!p.endsWith('/')) p += '/';
  return p + 'api/budget';
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
    const pDay = cfg.payday_day || 26;
    
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

    const startRef = (monthIdx === 0) ? new Date(year - 1, 11, pDay) : new Date(year, monthIdx - 1, pDay);
    const endRef = new Date(year, monthIdx, pDay);
    
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

  return {
    startDate,
    endDate,
    numWeeks,
    weeks,
    primaryMonthIdx: monthIdx,
    primaryYear: year,
    dateRangeStr: `${startDate.getDate()} ${months[startDate.getMonth()]} - ${endDate.getDate()} ${months[endDate.getMonth()]}`
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
            actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
            isDueThisWeek: true
          });
        }
      });
    }
  });

  return result;
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
      cfg.people.forEach(p => savingsInflowFromSalary[d.target_account] += Number(d.amounts && d.amounts[p]) || 0);
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
        if (d.target_account === acc) cfg.people.forEach(p => bal += Number(d.amounts && d.amounts[p]) || 0);
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

  budgets.forEach(b => {
    const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.total_budget) || 0) - spent);
    const strategy = b.deduction_strategy || 'none';

    // 1. Dated transactions strictly falling in this month's payday date range
    (b.transactions || []).forEach(t => {
      if (t.date) {
        const tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
        const tMs = tDate.getTime();
        if (tMs >= startMs && tMs <= endMs) {
          items.push({
            desc: `🎯 ${b.name}: ${t.desc}`,
            due_day: tDate.getDate(),
            exact_date: t.date,
            amount: Number(t.amount) || 0,
            account: t.account || b.account,
            is_budget_item: true
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
        items.push({
          desc: `🎯 ${b.name} (Monthly Spread)`,
          due_day: schedule.startDate.getDate(),
          exact_date: `${schedule.startDate.getFullYear()}-${String(schedule.startDate.getMonth() + 1).padStart(2, '0')}-${String(schedule.startDate.getDate()).padStart(2, '0')}`,
          amount: spreadAmt,
          account: b.account,
          is_budget_item: true
        });
      }
    } else if (strategy === 'target_date' && remaining > 0 && b.end_date) {
      const endDateObj = new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T12:00:00');
      const endMsTime = endDateObj.getTime();
      if (endMsTime >= startMs && endMsTime <= endMs) {
        items.push({
          desc: `🎯 ${b.name} (Target Date Balance)`,
          due_day: endDateObj.getDate(),
          exact_date: b.end_date,
          amount: remaining,
          account: b.account,
          is_budget_item: true
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
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
          actualDateStr: `${tDate.getDate()} ${months[tDate.getMonth()]}`
        });
      }
    });

    // 2. Planned remaining budget allocation if birthday falls in this month's payday date range
    if (bMs >= startMs && bMs <= endMs) {
      if (remaining > 0) {
        items.push({
          desc: `🎂 ${b.name}`,
          due_day: bDate.getDate(),
          exact_date: `${year}-${String(bMIdx + 1).padStart(2, '0')}-${String(b.day || 1).padStart(2, '0')}`,
          amount: remaining,
          account: b.account || cfg.current_accounts[0],
          isBirthday: true,
          is_budget_item: true,
          budgetTotal: Number(b.budget_amount) || 0,
          spentTotal: spent,
          remaining: remaining,
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
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
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
          due_day: day,
          account: b.account || cfg.current_accounts[0],
          amount: remaining,
          budgetTotal: Number(b.budget_amount) || 0,
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
          actualDateStr: `${weekObj.startDate.getDate()} ${months[weekObj.startDate.getMonth()]}`,
          occurrenceDate: weekObj.startDate
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
              actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
              occurrenceDate: actualPayDate
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
          actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
          occurrenceDate: actualPayDate
        });
      }
    }
  });

  return occurrences;
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

// --- static/js/views/modals.js ---




function showModal(opts) {
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

function closeModal() {
  const modal = document.getElementById('genericModal');
  if (modal) modal.style.display = 'none';
  window.pendingModalAction = null;
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

function openSetPinModal(person) {
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

function nextObStep(step) {
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

function obRenderLists() {
  const cfg = getSettings();
  const curr = cfg.currency || '£';
  const isMulti = !!cfg.enable_multi_user;

  // Step 2 People List
  const pList = document.getElementById('obPeopleList');
  if (pList) {
    pList.innerHTML = (cfg.people || []).map((p, idx) => `
      <div style="display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.12); padding:4px 6px; border-radius:6px; border:1px solid var(--border); flex-wrap:wrap;">
        <input type="text" value="${p}" onchange="window.budgetApp.obUpdatePerson(${idx}, this.value)" style="flex:1; min-width:110px;">
        ${isMulti ? `
          <input type="password" maxlength="6" inputmode="numeric" placeholder="PIN" value="${getPersonPin(p)}" onchange="window.budgetApp.obUpdatePersonPin(${idx}, this.value)" style="width:60px; font-size:11px; padding:3px 4px; text-align:center;" title="Optional PIN for ${p}">
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
  const activeTab = appState.activeTab;
  const currentYear = appState.currentYear;
  const globalEditMode = appState.globalEditMode;

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
      const amt = Number(d.amounts && d.amounts[p]) || 0;
      if (d.is_salary) personTotals[p].salary += amt;
      else {
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
    if (!d.is_salary && cfg.current_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amount = Number(d.amounts && d.amounts[p]) || 0;
        if (runningCurrentByAcc[d.target_account] !== undefined) {
          runningCurrentByAcc[d.target_account] += amount;
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
    if (!d.is_salary && cfg.savings_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amt = Number(d.amounts && d.amounts[p]) || 0;
        if (runningSavingsByAcc[d.target_account] !== undefined) runningSavingsByAcc[d.target_account] += amt;
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

    const allYearlyBills = getYearData().yearly_recurring || [];
    const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(activeTab, months.indexOf(activeTab), appState.currentYear) : [];
    const allScheduledBills = [...(mData.direct_debits || []), ...allYearlyBills, ...budgetBillsThisMonth];
    const baseDDs = getDDsForWeek(allScheduledBills, wObj, schedule);
    
    const allBirthdays = getYearData().birthdays || cfg.birthdays || [];
    const allRecurring = getYearData().recurring_payments || cfg.recurring_payments || [];
    const wBirthdays = (typeof getBirthdaysForWeek === 'function') ? getBirthdaysForWeek(allBirthdays, wObj, schedule, currentYear) : [];
    const wRecurring = (typeof getRecurringForWeek === 'function') ? getRecurringForWeek(allRecurring, wObj, schedule, currentYear) : [];
    
    const wDDs = [...baseDDs, ...wRecurring, ...wBirthdays];
    const wDDTotal = wDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // Scheduled Payments In / Inflows
    const allYearlyIncome = getYearData().yearly_income || [];
    const allScheduledIncomes = [...(mData.payments_in || []), ...allYearlyIncome];
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
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin:14px 0 20px 0;">
      <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <h4 style="color:var(--curr-border); margin-bottom:6px;">🏦 Current Accounts Cashflow</h4>
        <div style="font-size:12px; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between;"><span>Opening Balances:</span><strong>${curr}${totalCurrentOpening.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; color:var(--green);"><span>Salary / Deductions Inflow:</span><strong>+${curr}${totalCurrentInflow.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; color:var(--red);"><span>Direct Debits:</span><strong>-${curr}${totalDD.toFixed(2)}</strong></div>
          ${totalAutoPayMonth > 0 ? `<div style="display:flex; justify-content:space-between; color:var(--amber);"><span>Credit Auto-Pay Transfers:</span><strong>-${curr}${totalAutoPayMonth.toFixed(2)}</strong></div>` : ''}
          <div style="display:flex; justify-content:space-between;"><span>Weekly Current Expenses:</span><strong>-${curr}${totalWeeklyCurrentSpend.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:4px; font-weight:bold; font-size:13px;">
            <span>Projected Month-End:</span>
            <span style="color:${projectedMonthEndCurrent >= 0 ? 'var(--green)' : 'var(--red)'};">${curr}${projectedMonthEndCurrent.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <h4 style="color:var(--amber); margin-bottom:6px;">💳 Credit Cards Position</h4>
        <div style="font-size:12px; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between;"><span>Opening Debt:</span><strong style="color:var(--red);">-${curr}${totalCreditOpeningSpent.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; color:var(--green);"><span>Auto-Pay Settlements:</span><strong>+${curr}${totalAutoPayMonth.toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; color:var(--red);"><span>Planned Card Expenses:</span><strong>-${curr}${(totalWeeklySpend - totalWeeklyCurrentSpend).toFixed(2)}</strong></div>
          <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:4px; font-weight:bold; font-size:13px;">
            <span>Month-End Debt:</span>
            <span style="color:${projectedMonthEndCredit > 0 ? 'var(--red)' : 'var(--green)'};">-${curr}${projectedMonthEndCredit.toFixed(2)}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); text-align:right;">Available Credit Line: ${curr}${(totalCreditLimit - projectedMonthEndCredit).toFixed(2)}</div>
        </div>
      </div>

      ${cfg.track_savings ? `
        <div style="background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; padding:12px;">
          <h4 style="color:var(--purple); margin-bottom:6px;">📈 Savings Portfolio Growth</h4>
          <div style="font-size:12px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between;"><span>Opening Balance:</span><strong>${curr}${totalSavingsOpening.toFixed(2)}</strong></div>
            <div style="display:flex; justify-content:space-between; color:var(--purple);"><span>Salary Savings Inflow:</span><strong>+${curr}${totalSalarySavingsIn.toFixed(2)}</strong></div>
            <div style="display:flex; justify-content:space-between; color:var(--purple);"><span>Direct Debit Standing Orders:</span><strong>+${curr}${Object.values(autoSavingsFromDD).reduce((s, v) => s + v, 0).toFixed(2)}</strong></div>
            <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:4px; font-weight:bold; font-size:13px;">
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
        <h3>📅 Weekly Cashflow & Discretionary Expenses</h3>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn secondary" style="font-size:12px; padding:5px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="window.budgetApp.setTab('Bills')" title="Manage all scheduled direct debits, standing orders & recurring bills"><span style="font-size:13px;">📅</span> Scheduled Bills</button>
          <button class="btn secondary" style="font-size:12px; padding:5px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="window.budgetApp.openAccountTrackingModal()" title="Configure Baseline Balances, Weekly Column Tracking & Net Position"><span style="font-size:13px;">⚙️</span> Accounts & Tracking</button>
        </div>
      </div>

      ${isMulti ? `
        <div class="user-filter-bar" style="display:flex; align-items:center; gap:6px; margin:0 0 14px 0; padding:8px 12px; background:var(--panel-bg); border:1px solid var(--border); border-radius:8px; flex-wrap:wrap;">
          <span style="font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; margin-right:4px;">👤 Active Perspective:</span>
          <button class="btn ${appState.activeUser === 'Joint' ? 'green' : 'secondary'}" style="font-size:11px; padding:3px 10px;" onclick="window.budgetApp.switchActiveUser('Joint')">👥 Joint / Household</button>
          ${cfg.people.map(p => {
            const hasPin = hasPersonPin(p);
            const unlocked = isUserUnlocked(p);
            const isActive = appState.activeUser === p;
            return `
              <button class="btn ${isActive ? 'green' : 'secondary'}" style="font-size:11px; padding:3px 10px; display:inline-flex; align-items:center; gap:4px;" onclick="window.budgetApp.switchActiveUser('${p}')">
                <span>👤 ${p}</span>
                ${hasPin ? `<span style="font-size:9px;">${unlocked ? '🔓' : '🔒'}</span>` : ''}
              </button>
            `;
          }).join('')}
          ${appState.activeUser !== 'Joint' ? `
            <button class="btn secondary" style="font-size:10px; padding:3px 8px; margin-left:auto; color:var(--text-muted);" onclick="window.budgetApp.lockAllProfiles()" title="Lock session & return to Joint Shared view">🔒 Lock</button>
          ` : ''}
        </div>
      ` : ''}

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
            const matchesFilter = !isMulti || (activeUser === 'Joint' ? (owner === 'Joint') : (owner === 'Joint' || owner === activeUser));
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
            const matchesFilter = !isMulti || (activeUser === 'Joint' ? (owner === 'Joint') : (owner === 'Joint' || owner === activeUser));
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
              const matchesFilter = !isMulti || (activeUser === 'Joint' ? (owner === 'Joint') : (owner === 'Joint' || owner === activeUser));
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
                              ${colIncomes.map(i => {
                                const holidayBadge = i.holiday_rule === 'previous' ? '<span title="Previous working day (e.g. Friday)" style="font-size:9px; opacity:0.8;">⬅️</span>' : (i.holiday_rule === 'following' ? '<span title="Following working day (e.g. Monday)" style="font-size:9px; opacity:0.8;">➡️</span>' : '<span title="Exact date" style="font-size:9px; opacity:0.8;">⏸️</span>');
                                if (i.isMovable) {
                                  if (!globalEditMode) {
                                    return `<div class="col-scheduled-item recurring" style="cursor:pointer; background:rgba(16,185,129,0.08); border-left:3px solid var(--green);" onclick="window.budgetApp.openRescheduleRecurringModal(${i.source_idx}, '${activeTab}', '${w}', 'income')" title="Click to reschedule or bump forward"><span>📥 ${i.rawDesc || i.desc} (${i.actualDateStr}) ${holidayBadge} <span class="badge" style="font-size:9px; background:rgba(16,185,129,0.2); color:var(--green); padding:1px 4px; margin-left:4px;">↔ Move</span></span><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span></div>`;
                                  } else {
                                    return `<div class="col-scheduled-item recurring item-entry-sched" style="background:rgba(16,185,129,0.08); border-left:3px solid var(--green);" draggable="true" ondragstart="window.budgetApp.handleDragStartScheduled(event, ${i.source_idx}, '${activeTab}', '${w}', 'income')" ondragend="window.budgetApp.handleDragEnd(event)"><span><span class="drag-handle" title="Drag to move/bump to another week or account">⠿</span> 📥 ${i.rawDesc || i.desc} (${i.actualDateStr}) ${holidayBadge}</span><div style="display:flex; align-items:center; gap:4px;"><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span><button class="move-btn" style="height:18px; width:18px; font-size:9px; padding:0; display:inline-flex; align-items:center; justify-content:center;" title="Reschedule / Bump Forward" onclick="event.stopPropagation(); window.budgetApp.openRescheduleRecurringModal(${i.source_idx}, '${activeTab}', '${w}', 'income')">↔</button></div></div>`;
                                  }
                                } else {
                                  return `<div class="col-scheduled-item" style="background:rgba(16,185,129,0.08); border-left:3px solid var(--green);"><span>📥 ${i.desc} (${i.actualDateStr}) ${holidayBadge}</span><span style="color:var(--green); font-weight:600;">+${curr}${Number(i.amount).toFixed(2)}</span></div>`;
                                }
                              }).join('')}
                              ${colDDs.map(d => {
  if (d.isMovable) {
    if (!globalEditMode) {
      return `<div class="col-scheduled-item recurring" style="cursor:pointer;" onclick="window.budgetApp.openRescheduleRecurringModal(${d.source_idx}, '${activeTab}', '${w}')" title="Click to reschedule or bump forward"><span>${d.desc} (${d.actualDateStr}) <span class="badge" style="font-size:9px; background:rgba(56,189,248,0.2); color:var(--curr-border); padding:1px 4px; margin-left:4px;">↔ Move</span></span><span style="color:var(--red); font-weight:600;">-${curr}${Number(d.amount).toFixed(2)}</span></div>`;
    } else {
      return `<div class="col-scheduled-item recurring item-entry-sched" draggable="true" ondragstart="window.budgetApp.handleDragStartScheduled(event, ${d.source_idx}, '${activeTab}', '${w}')" ondragend="window.budgetApp.handleDragEnd(event)"><span><span class="drag-handle" title="Drag to move/bump to another week or account">⠿</span> ${d.desc} (${d.actualDateStr})</span><div style="display:flex; align-items:center; gap:4px;"><span style="color:var(--red); font-weight:600;">-${curr}${Number(d.amount).toFixed(2)}</span><button class="move-btn" style="height:18px; width:18px; font-size:9px; padding:0; display:inline-flex; align-items:center; justify-content:center;" title="Reschedule / Bump Forward" onclick="event.stopPropagation(); window.budgetApp.openRescheduleRecurringModal(${d.source_idx}, '${activeTab}', '${w}')">↔</button></div></div>`;
    }
  } else {
    return `<div class="col-scheduled-item"><span>${d.desc} (${d.actualDateStr})</span><span style="color:var(--red);">-${curr}${Number(d.amount).toFixed(2)}</span></div>`;
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
                              const tsHtml = (hasVal && ts) ? `
                                <div style="font-size:9px; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:3px;">
                                  <span>🕒</span><span>${formatCheckInTimestamp(ts)}</span>
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
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // SALARIES & DEDUCTIONS + SCHEDULED BILLS PANELS
  html += `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:16px;">
      <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
          <h3 style="margin:0;">Salaries & Deductions</h3>
          <button class="btn secondary" style="font-size:11px; padding:2px 8px;" onclick="window.budgetApp.propagateDeductions('${activeTab}')" title="Copy this month's salaries and deductions to all following months in ${appState.currentYear}">📋 Propagate to Future Months</button>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Transfer Destination</th>
              ${cfg.people.map(p => {
                const isUnlockedForUser = (appState.activeUser === p && isUserUnlocked(p));
                const isRevealed = isUnlockedForUser || (appState.unmaskedSalaries && appState.unmaskedSalaries[p]);
                return `
                  <th class="text-right">
                    <div style="display:inline-flex; align-items:center; justify-content:flex-end; gap:4px;">
                      <span>${p}</span>
                      ${isMulti && isPersonSalaryHidden(p) ? `
                        <button class="btn secondary" style="padding:1px 5px; font-size:10px; min-height:18px; line-height:1;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="${isRevealed ? 'Hide salary' : 'Unlock / Reveal salary'}">
                          ${isRevealed ? '🙈' : '👁️'}
                        </button>
                      ` : ''}
                    </div>
                  </th>
                `;
              }).join('')}
              ${globalEditMode ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${deducts.map((d, idx) => `
              <tr>
                <td>
                  ${globalEditMode ? `<input class="table-input" type="text" value="${d.name}" onchange="window.budgetApp.editDeductionName(${idx}, this.value)">` : `<strong>${d.name}</strong>`}
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
                  const val = (d.amounts && d.amounts[p]) || 0;
                  const isUnlockedForUser = (appState.activeUser === p && isUserUnlocked(p));
                  const isHidden = isMulti && d.is_salary && isPersonSalaryHidden(p) && !isUnlockedForUser && !(appState.unmaskedSalaries && appState.unmaskedSalaries[p]);
                  return `
                    <td class="text-right">
                      ${globalEditMode ? (
                        isHidden ? `
                          <div style="display:flex; align-items:center; justify-content:flex-end; gap:2px;">
                            <input class="table-input text-right" type="password" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${idx}, '${p}', this.value)" style="letter-spacing:2px; width:70px;">
                            <button class="btn secondary" style="padding:1px 3px; font-size:9px; min-height:18px;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="Unlock / Reveal">👁️</button>
                          </div>
                        ` : `
                          <input class="table-input text-right" type="number" step="0.01" value="${val}" onchange="window.budgetApp.updateSalaryDeduction(${idx}, '${p}', this.value)">
                        `
                      ) : (
                        isHidden ? `
                          <span style="font-family:monospace; letter-spacing:2px; color:var(--text-muted); cursor:pointer;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="Salary hidden for privacy (click to unlock/reveal)">••••••</span>
                        ` : `${curr}${Number(val).toFixed(2)}`
                      )}
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
                const isUnlockedForUser = (appState.activeUser === p && isUserUnlocked(p));
                const isHidden = isMulti && isPersonSalaryHidden(p) && !isUnlockedForUser && !(appState.unmaskedSalaries && appState.unmaskedSalaries[p]);
                if (isHidden) {
                  return `<td class="text-right" style="font-family:monospace; letter-spacing:2px; color:var(--text-muted); font-size:13px; cursor:pointer;" onclick="window.budgetApp.toggleSalaryReveal('${p}')" title="Click to unlock/reveal">••••••</td>`;
                }
                return `<td class="text-right" style="color:${bal >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:13px; font-weight:700;">${curr}${bal.toFixed(2)}</td>`;
              }).join('')}
              ${globalEditMode ? '<td></td>' : ''}
            </tr>
          </tfoot>
        </table>

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
        ` : ''}
      </div>

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
        
        <div style="overflow-x:auto;">
          <table class="table" style="margin:0;">
            <thead>
              <tr>
                <th>Description</th>
                <th style="width:110px;">Type & Cadence</th>
                <th style="width:80px;">Due Date</th>
                <th style="width:90px;" class="text-right">Amount</th>
                <th>Account</th>
                <th>Holiday Rule</th>
                <th>Transfer To</th>
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
                if (b.frequency === 'monthly') cadenceBadge = `<span class="badge" style="background:#0284c7; color:#fff; font-size:10px;">${isInc ? '💰 Monthly In' : '📅 Monthly DD'}</span>`;
                else if (b.frequency === 'weekly') cadenceBadge = `<span class="badge" style="background:#10b981; color:#fff; font-size:10px;">${isInc ? '💰 Weekly In' : '🔄 Weekly'}</span>`;
                else if (b.frequency === 'biweekly') cadenceBadge = `<span class="badge" style="background:#f59e0b; color:#000; font-size:10px;">${isInc ? '💰 Bi-Weekly In' : '🔄 Bi-Weekly'}</span>`;
                else if (b.frequency === 'four_weekly') cadenceBadge = `<span class="badge" style="background:#d97706; color:#fff; font-size:10px;">${isInc ? '💰 4-Weekly In' : '🗓️ 4-Weekly'}</span>`;
                else if (b.frequency === 'yearly') cadenceBadge = `<span class="badge" style="background:#ec4899; color:#fff; font-size:10px;">${isInc ? '💰 Annual In' : '🎉 Annual'}</span>`;
                else cadenceBadge = `<span class="badge" style="font-size:10px;">${isInc ? '💰 Recurring In' : '🔄 Recurring'}</span>`;

                let dueStr = (typeof formatScheduledBillDue === 'function') ? formatScheduledBillDue(b, activeTab, appState.currentYear) : (b.frequency === 'yearly' ? `${b.month || 'Jan'} ${b.due_day || 1}` : `Day ${b.due_day || 1}`);

                const holidayRule = b.holiday_rule || (isInc ? 'previous' : 'following');
                let holidayBadge = '';
                if (holidayRule === 'previous') holidayBadge = '<span class="badge" style="background:rgba(16,185,129,0.15); color:var(--green); font-size:9px;">⬅️ Prev Workday</span>';
                else if (holidayRule === 'following') holidayBadge = '<span class="badge" style="background:rgba(56,189,248,0.15); color:var(--curr-border); font-size:9px;">➡️ Next Workday</span>';
                else holidayBadge = '<span class="badge" style="background:rgba(148,163,184,0.15); color:var(--text-muted); font-size:9px;">⏸️ Exact</span>';

                return `
                  <tr style="${isInc ? 'background:rgba(16,185,129,0.02);' : ''}">
                    <td>
                      ${globalEditMode ? `
                        <input class="table-input" type="text" value="${b.desc}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'desc', this.value)">
                      ` : `<strong>${isInc ? '📥 ' : ''}${b.desc}</strong>`}
                    </td>
                    <td>${cadenceBadge}</td>
                    <td>
                      ${globalEditMode && b.frequency === 'monthly' ? `
                        <input class="table-input" type="number" min="1" max="31" value="${b.due_day || 1}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'due_day', parseInt(this.value, 10))" style="width:50px;">
                      ` : `<span style="font-size:11px; color:var(--text-muted);">${dueStr}</span>`}
                    </td>
                    <td class="text-right">
                      ${globalEditMode ? `
                        <input class="table-input text-right" type="number" step="0.01" value="${b.amount}" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'amount', parseFloat(this.value))" style="width:75px; color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">
                      ` : `<strong style="color:${isInc ? 'var(--green)' : 'var(--curr-border)'};">${isInc ? '+' : '-'}${curr}${Number(b.amount || 0).toFixed(2)}</strong>`}
                    </td>
                    <td>
                      ${globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'account', this.value)">
                          <optgroup label="Current Accounts">${cfg.current_accounts.map(acc => `<option value="${acc}" ${b.account === acc ? 'selected' : ''}>${acc}</option>`).join('')}</optgroup>
                          ${(cfg.credit_accounts || []).length > 0 ? `<optgroup label="Credit Cards">${cfg.credit_accounts.map(c => `<option value="${c.name}" ${b.account === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>` : ''}
                          ${(cfg.savings_accounts || []).length > 0 ? `<optgroup label="Savings Accounts">${cfg.savings_accounts.map(s => `<option value="${s}">${s}</option>`).join('')}</optgroup>` : ''}
                        </select>
                      ` : `<span style="font-size:11px;">${b.account || cfg.current_accounts[0]}</span>`}
                    </td>
                    <td>
                      ${globalEditMode ? `
                        <select class="table-input" onchange="window.budgetApp.editFullScheduledBill('${b.source_type}', ${b.source_idx}, 'holiday_rule', this.value)" style="font-size:10px;">
                          <option value="previous" ${holidayRule === 'previous' ? 'selected' : ''}>⬅️ Prev</option>
                          <option value="following" ${holidayRule === 'following' ? 'selected' : ''}>➡️ Next</option>
                          <option value="exact" ${holidayRule === 'exact' ? 'selected' : ''}>⏸️ Exact</option>
                        </select>
                      ` : holidayBadge}
                    </td>
                    <td>
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
        ${cfg.current_accounts.map(acc => {
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
        ${cfg.credit_accounts.map(c => {
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
          ${cfg.savings_accounts.map(accName => {
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
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:16px;">
        <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:10px;">
          <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:bold;">Total Gift Budget</div>
          <div style="font-size:18px; font-weight:bold; color:var(--heading); margin-top:2px;">${curr}${totalBirthdayBudget.toFixed(2)}</div>
          <div style="font-size:10px; color:var(--text-muted);">${birthdays.length} Annual Occasions</div>
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:10px;">
          <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:bold;">Total Gifts Spent</div>
          <div style="font-size:18px; font-weight:bold; color:var(--purple); margin-top:2px;">${curr}${totalBirthdaySpent.toFixed(2)}</div>
          <div style="font-size:10px; color:var(--text-muted);">${totalBirthdayBudget > 0 ? Math.round((totalBirthdaySpent / totalBirthdayBudget) * 100) : 0}% Allocated</div>
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:10px;">
          <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:bold;">Remaining Gift Fund</div>
          <div style="font-size:18px; font-weight:bold; color:${(totalBirthdayBudget - totalBirthdaySpent) >= 0 ? 'var(--green)' : 'var(--red)'}; margin-top:2px;">${curr}${(totalBirthdayBudget - totalBirthdaySpent).toFixed(2)}</div>
          <div style="font-size:10px; color:var(--text-muted);">Available to spend</div>
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:10px;">
          <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:bold;">Next 30 Days</div>
          <div style="font-size:18px; font-weight:bold; color:#f472b6; margin-top:2px;">${upcomingBirthdaysCount} Upcoming</div>
          <div style="font-size:10px; color:var(--text-muted);">Coming up soon</div>
        </div>
      </div>

      <!-- BIRTHDAYS GRID -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:12px;">
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
      <div style="overflow-x:auto;">
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
                    <div style="display:flex; align-items:center; gap:2px; flex-wrap:wrap;">
                      ${flowBadge} ${cadenceBadge}
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
        <div style="overflow-x:auto;">
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
      <div style="overflow-x:auto;">
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

// --- static/js/views/settings.js ---


function renderSettingsView(container) {
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

      <h3 style="margin-top:24px;">Household Members & Security</h3>
      <p style="font-size:12px; color:var(--text-muted);">Manage household members, per-user salary visibility, and security PINs:</p>
      <div id="peopleList" style="display:flex; flex-direction:column; gap:8px; max-width:650px;">
        ${cfg.people.map((p, idx) => `
          <div style="display:flex; align-items:center; gap:8px; background:var(--card-bg); border:1px solid var(--border); padding:6px 10px; border-radius:6px; flex-wrap:wrap;">
            <input type="text" value="${p}" onchange="window.budgetApp.updatePersonNameInSettings(${idx}, this.value)" style="flex:1; min-width:120px;">
            ${isMulti ? `
              <button class="btn secondary" style="font-size:11px; padding:3px 8px; white-space:nowrap;" onclick="window.budgetApp.openSetPinModal('${p}')" title="Configure 4-digit security PIN for ${p}">
                ${hasPersonPin(p) ? '🔒 PIN Active' : '🔑 Set PIN'}
              </button>
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
  if (months.includes(appState.activeTab)) {
    titleEl.innerText = `${appState.activeTab} ${appState.currentYear}`;
  } else if (appState.activeTab === 'Year') {
    titleEl.innerText = `Annual ${appState.currentYear}`;
  } else if (appState.activeTab === 'Budgets') {
    titleEl.innerText = `Budgets ${appState.currentYear}`;
  } else if (appState.activeTab === 'Bills') {
    titleEl.innerText = `Bills ${appState.currentYear}`;
  } else if (appState.activeTab === 'Settings') {
    titleEl.innerText = 'Settings';
  } else if (appState.activeTab) {
    titleEl.innerText = `${appState.activeTab} ${appState.currentYear}`;
  } else {
    titleEl.innerText = `Budget ${appState.currentYear}`;
  }
}

function renderYearMenu() {
  updateTopBarTitle();
  const disp = document.getElementById('currentYearDisplay');
  if (disp) disp.innerText = appState.currentYear;
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
    profileDropdown.style.display = 'none';
    return;
  }

  profileDropdown.style.display = 'inline-block';
  const activeUser = getActiveUser();
  if (userDisp) {
    userDisp.innerText = activeUser === 'Joint' ? 'Joint' : activeUser;
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
      <div style="border-top:1px solid var(--border); margin-top:4px;">
        <button onclick="window.budgetApp.lockAllProfiles()">🔒 Lock All Profiles / Switch to Joint</button>
      </div>
    `;
    optionsEl.innerHTML = optsHtml;
  }
}

function renderNav() {
  updateTopBarTitle();
  renderUserProfileNav();
  const yData = getYearData();
  const cfg = getSettings();
  let html = months.map(m => {
    const md = yData.months[m] || {};
    if (md.archived) return '';
    return `<button class="tab-btn ${m === appState.activeTab ? 'active' : ''}" onclick="window.budgetApp.setTab('${m}')">${m}</button>`;
  }).join('');

  html += `<button class="tab-btn special ${appState.activeTab === 'Budgets' ? 'active' : ''}" onclick="window.budgetApp.setTab('Budgets')">🎯 Budgets & Occasions</button>`;
  html += `<button class="tab-btn special ${appState.activeTab === 'Bills' ? 'active' : ''}" onclick="window.budgetApp.setTab('Bills')">📅 Scheduled Bills</button>`;
  html += `<button class="tab-btn special ${appState.activeTab === 'Year' ? 'active' : ''}" onclick="window.budgetApp.setTab('Year')">📊 Annual Trajectory</button>`;
  
  const navTabsEl = document.getElementById('navTabs');
  if (navTabsEl) navTabsEl.innerHTML = html;
}

function renderContent() {
  try {
    updateTopBarTitle();
    renderUserProfileNav();
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
      window.addEventListener('focus', async () => {
        try {
          let p = window.location.pathname;
          if (p.endsWith('index.html')) p = p.slice(0, -10);
          if (!p.endsWith('/')) p += '/';
          const r = await fetch(p + 'api/version', { cache: 'no-store' });
          if (r.ok) {
            const vData = await r.json();
            if (vData && vData.build_id && window.__BUILD_ID__ && vData.build_id !== window.__BUILD_ID__) {
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
    const cfg = getSettings();
    applyTheme(cfg.theme || 'grey_dark');

    bindGlobalEvents();
    initCalculator();

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

      calculateAndSyncRollovers();
      renderYearMenu();
      renderNav();
      renderContent();

      // Month is auto-selected, current week remains highlighted without auto-scroll
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

    cfg.current_accounts.forEach(acc => {
      const el = document.getElementById(`qchk_curr_${acc}`);
      if (el) {
        const val = el.value.trim();
        actuals[`curr_${acc}`] = val;
        if (val !== "") actuals._timestamps[`curr_${acc}`] = new Date().toISOString();
        else delete actuals._timestamps[`curr_${acc}`];
      }
    });

    (cfg.credit_accounts || []).forEach(c => {
      const el = document.getElementById(`qchk_c_avail_${c.name}`);
      if (el) {
        const val = el.value.trim();
        actuals[`c_avail_${c.name}`] = val;
        if (val !== "") actuals._timestamps[`c_avail_${c.name}`] = new Date().toISOString();
        else delete actuals._timestamps[`c_avail_${c.name}`];
      }
    });

    if (cfg.track_savings) {
      (cfg.savings_accounts || []).forEach(s => {
        const el = document.getElementById(`qchk_sav_${s}`);
        if (el) {
          const val = el.value.trim();
          actuals[`sav_${s}`] = val;
          if (val !== "") actuals._timestamps[`sav_${s}`] = new Date().toISOString();
          else delete actuals._timestamps[`sav_${s}`];
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
      d.amounts[person] = parseFloat(val) || 0;
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
    if (value !== "" && value !== null && value !== undefined) {
      actuals._timestamps[fieldName] = new Date().toISOString();
    } else {
      delete actuals._timestamps[fieldName];
    }
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

  // Settings Handlers
  toggleWidgetSelection(widgetId, isChecked) {
    const cfg = getSettings();
    if (!cfg.enabled_widgets) cfg.enabled_widgets = [];
    if (isChecked) {
      if (!cfg.enabled_widgets.includes(widgetId)) cfg.enabled_widgets.push(widgetId);
    } else {
      cfg.enabled_widgets = cfg.enabled_widgets.filter(id => id !== widgetId);
    }
  },

  async saveSettingsForm() {
    await this.saveSettings();
  },

  async saveSettings() {
    const cfg = getSettings();
    const currEl = document.getElementById('cfg-curr');
    const pdayEl = document.getElementById('cfg-pday');
    const holidayEl = document.getElementById('cfg-holiday');
    const themeEl = document.getElementById('cfg-theme');
    const trackSavEl = document.getElementById('cfg-tracksavings');
    const multiUsersEl = document.getElementById('cfg-multiusers');

    if (currEl) cfg.currency = currEl.value;
    if (pdayEl) cfg.payday_day = parseInt(pdayEl.value, 10) || 26;
    if (holidayEl) cfg.country_holidays = holidayEl.value;
    if (trackSavEl) cfg.track_savings = trackSavEl.checked;
    if (multiUsersEl) cfg.enable_multi_user = multiUsersEl.checked;
    if (themeEl) {
      cfg.theme = themeEl.value;
      applyTheme(themeEl.value);
    }

    const selectedWidgets = [];
    document.querySelectorAll('.widget-checkbox-card input[type="checkbox"]').forEach(chk => {
      if (chk.checked) {
        const id = chk.id.replace('w_chk_', '');
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

  submitPinUnlock(person) {
    const inp = document.getElementById('user-pin-input');
    const errEl = document.getElementById('pin-error-msg');
    const enteredPin = (inp ? inp.value : '').trim();

    if (!unlockUser(person, enteredPin)) {
      if (errEl) errEl.innerText = "Incorrect PIN. Please try again.";
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      return;
    }

    closeModal();
    if (typeof window.pendingPinCallback === 'function') {
      const cb = window.pendingPinCallback;
      window.pendingPinCallback = null;
      cb();
    } else {
      setActiveUser(person);
      renderUserProfileNav();
      renderContent();
    }
  },

  appendPinDigit(digit, person) {
    const inp = document.getElementById('user-pin-input');
    if (inp) {
      inp.value += digit;
      const expectedPin = getPersonPin(person);
      if (expectedPin && inp.value.length === expectedPin.length) {
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
    const newInp = document.getElementById('new-pin-input');
    const confInp = document.getElementById('confirm-pin-input');
    const errEl = document.getElementById('set-pin-error');
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

    setPersonPin(person, p1);
    closeModal();
    renderUserProfileNav();
    renderContent();
    if (getSettings().onboarding_complete) {
      await saveBudget(appState.data);
    }
    alert(`Security PIN set successfully for ${person}!`);
  },

  async removePersonPin(person) {
    if (confirm(`Remove security PIN for ${person}? Anyone will be able to switch to this profile without authentication.`)) {
      setPersonPin(person, '');
      closeModal();
      renderUserProfileNav();
      renderContent();
      if (getSettings().onboarding_complete) {
        await saveBudget(appState.data);
      }
      alert(`Security PIN removed for ${person}.`);
    }
  },

  lockAllProfiles() {
    lockAllUsers();
    renderUserProfileNav();
    renderContent();
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
      getSettings().current_accounts.push(name.trim());
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addCreditAccountInSettings() {
    const name = prompt("Enter credit card name:");
    if (name && name.trim()) {
      getSettings().credit_accounts.push({
        name: name.trim(),
        limit: 0,
        autopay_enabled: false,
        autopay_from: getSettings().current_accounts[0] || "",
        autopay_when: "week_1",
        autopay_type: "full",
        autopay_fixed_amt: 0.00
      });
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }
  },

  async addSavingsAccountInSettings() {
    const name = prompt("Enter savings account name:");
    if (name && name.trim()) {
      getSettings().savings_accounts.push(name.trim());
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
