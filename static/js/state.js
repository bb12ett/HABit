export const DEFAULT_SETTINGS = {
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
  months_in_advance: 12,
  months_in_arrears: 3,
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

export const ALL_AVAILABLE_WIDGETS = [
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

export const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const appState = {
  data: {},
  currentYear: 2026,
  activeTab: "Overview",
  activeSubTab: "overview",
  lastActiveMonth: "Overview",
  lastBudgetsTab: "Budgets",
  lastAnalyticsTab: "Spend",
  globalEditMode: false,
  draggedItemInfo: null,
  activeChart: null,
  activeUser: 'Joint',
  unlockedUsers: {},
  isMasterUnlocked: false,
  unmaskedSalaries: {},
  birthdayFilter: 'soon',
  spendSortColumn: 'date',
  spendSortDirection: 'desc',
  spendColFilters: {
    date: '',
    payee: '',
    account: 'all',
    owner: 'all',
    category: 'all',
    amount: ''
  }
};

export function getPrimarySection(tabName = appState.activeTab) {
  if (tabName === 'Overview' || months.includes(tabName)) return 'monthly';
  if (tabName === 'Budgets' || tabName === 'Bills') return 'budgets';
  if (tabName === 'Spend' || tabName === 'Year') return 'analytics';
  if (tabName === 'Settings') return 'settings';
  return 'monthly';
}

export function getCurrentPeriodMonthAndYear() {
  if (typeof window !== 'undefined' && typeof window.detectCurrentMonthAndWeek === 'function') {
    const curY = new Date().getFullYear();
    try {
      const detected = window.detectCurrentMonthAndWeek(curY);
      if (detected && detected.monthIdx !== undefined) {
        return { year: curY, monthIdx: detected.monthIdx, month: months[detected.monthIdx] };
      }
    } catch (e) {}
  }
  const now = new Date();
  const m = now.getMonth();
  return { year: now.getFullYear(), monthIdx: m, month: months[m] };
}

export function getSlidingWindowMonths() {
  const cfg = getSettings();
  const adv = parseInt(cfg.months_in_advance !== undefined ? cfg.months_in_advance : 12, 10);
  const arr = parseInt(cfg.months_in_arrears !== undefined ? cfg.months_in_arrears : 3, 10);
  const current = getCurrentPeriodMonthAndYear();

  const totalCurrent = current.year * 12 + current.monthIdx;
  const list = [];
  const yearsSet = new Set();
  const addedKeys = new Set();

  for (let k = -arr; k <= adv; k++) {
    const t = totalCurrent + k;
    const y = Math.floor(t / 12);
    const mIdx = ((t % 12) + 12) % 12;
    const mName = months[mIdx];
    yearsSet.add(y);
    addedKeys.add(`${y}_${mName}`);
    list.push({
      year: y,
      monthIdx: mIdx,
      month: mName,
      offset: k,
      isCurrent: (k === 0),
      totalM: t
    });
  }

  // Also include any explicitly unarchived months in appState.data.years
  if (appState.data && appState.data.years) {
    Object.keys(appState.data.years).forEach(yStr => {
      const y = parseInt(yStr, 10);
      if (isNaN(y)) return;
      const yData = appState.data.years[yStr];
      if (!yData || !yData.months) return;

      months.forEach((mName, mIdx) => {
        const key = `${y}_${mName}`;
        if (addedKeys.has(key)) return;
        const md = yData.months[mName];
        if (md && md.archived === false) {
          const t = y * 12 + mIdx;
          yearsSet.add(y);
          addedKeys.add(key);
          list.push({
            year: y,
            monthIdx: mIdx,
            month: mName,
            offset: t - totalCurrent,
            isCurrent: (t === totalCurrent),
            totalM: t
          });
        }
      });
    });
  }

  list.sort((a, b) => a.totalM - b.totalM);

  const multiYear = yearsSet.size > 1;
  list.forEach(item => {
    item.label = multiYear ? `${item.month} '${String(item.year).slice(-2)}` : item.month;
  });

  return list;
}

if (typeof window !== 'undefined') {
  window.__budgetAppState = appState;
  window.getPrimarySection = getPrimarySection;
  window.getCurrentPeriodMonthAndYear = getCurrentPeriodMonthAndYear;
  window.getSlidingWindowMonths = getSlidingWindowMonths;
}

export function applyTheme(theme) {
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

export function getSettings() {
  if (!appState.data || typeof appState.data !== 'object') {
    appState.data = { settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), years: {} };
  }
  if (!appState.data.settings) {
    appState.data.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
  return appState.data.settings;
}

export function getYearData(year = appState.currentYear) {
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

export function getMonthData(mName, year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.months) yData.months = {};
  const cfg = getSettings();
  if (!yData.months[mName]) {
    yData.months[mName] = {};
  }
  const md = yData.months[mName];
  if (!md.current_data) md.current_data = {};
  if (!md.credit_data) md.credit_data = {};
  if (!md.savings_data) md.savings_data = {};
  if (!md.weekly_items) md.weekly_items = {};
  if (!md.weekly_actuals) md.weekly_actuals = {};
  if (!md.direct_debits) md.direct_debits = JSON.parse(JSON.stringify(cfg.default_direct_debits || []));
  if (!md.payments_in) md.payments_in = JSON.parse(JSON.stringify(cfg.default_payments_in || []));
  if (!md.deductions_list) md.deductions_list = JSON.parse(JSON.stringify(cfg.default_deductions || []));
  return md;
}

export function getWeekItems(mName, wName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  if (!md.weekly_items) md.weekly_items = {};
  if (!md.weekly_items[wName]) {
    md.weekly_items[wName] = JSON.parse(JSON.stringify(getSettings().default_weekly || []));
  }
  return md.weekly_items[wName];
}

export function getWeekActuals(mName, wName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  if (!md.weekly_actuals) md.weekly_actuals = {};
  if (!md.weekly_actuals[wName]) {
    md.weekly_actuals[wName] = {};
  }
  return md.weekly_actuals[wName];
}

export function getAccountTrackingSettings(year = appState.currentYear) {
  const cfg = getSettings();
  if (!cfg.account_configs) {
    cfg.account_configs = {
      current: {},
      credit: {},
      savings: {}
    };
  }

  // Inherit master configs from active base year (e.g. 2026) or first configured year
  const baseYear = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear().year
    : 2026;
  const baseConfigs = (appState.data?.years?.[String(baseYear)]?.account_configs)
    || (appState.data?.years?.[String(appState.currentYear)]?.account_configs)
    || (appState.data?.years?.['2026']?.account_configs)
    || (appState.data?.years?.['2027']?.account_configs);

  if (baseConfigs) {
    ['current', 'credit', 'savings'].forEach(type => {
      if (!cfg.account_configs[type]) cfg.account_configs[type] = {};
      if (baseConfigs[type]) {
        Object.keys(baseConfigs[type]).forEach(acc => {
          if (!cfg.account_configs[type][acc]) {
            cfg.account_configs[type][acc] = JSON.parse(JSON.stringify(baseConfigs[type][acc]));
          }
        });
      }
    });
  }

  cfg.current_accounts.forEach(acc => {
    if (!cfg.account_configs.current[acc]) {
      cfg.account_configs.current[acc] = {
        tracking: 'weekly',
        include_in_net: true
      };
    }
  });

  cfg.credit_accounts.forEach(c => {
    const cName = c && c.name ? c.name : c;
    if (!cfg.account_configs.credit[cName]) {
      cfg.account_configs.credit[cName] = {
        tracking: 'weekly',
        include_in_net: true
      };
    }
  });

  if (cfg.track_savings) {
    cfg.savings_accounts.forEach(s => {
      if (!cfg.account_configs.savings[s]) {
        cfg.account_configs.savings[s] = {
          tracking: 'monthly',
          include_in_net: false
        };
      }
    });
  }

  // Keep target year and memory synchronized with master cfg.account_configs
  if (appState.data && appState.data.years) {
    const yData = getYearData(year);
    if (yData) {
      yData.account_configs = cfg.account_configs;
    }
  }

  return cfg.account_configs;
}

export function getAccountConfig(accType, accName, year = appState.currentYear) {
  const configs = getAccountTrackingSettings(year);
  return (configs[accType] && configs[accType][accName]) || { tracking: 'weekly', include_in_net: true };
}

export function isAccountTrackedWeekly(accType, accName, year = appState.currentYear) {
  return getAccountConfig(accType, accName, year).tracking !== 'monthly';
}

export function isAccountTrackedMonthly(accType, accName, year = appState.currentYear) {
  return getAccountConfig(accType, accName, year).tracking === 'monthly';
}

export function isAccountIncludedInNet(accType, accName, year = appState.currentYear) {
  return getAccountConfig(accType, accName, year).include_in_net !== false;
}

export function isMultiUserEnabled() {
  const cfg = getSettings();
  return !!cfg.enable_multi_user;
}

export function getPersonSettings(personName) {
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

export function isPersonSalaryHidden(personName) {
  if (!isMultiUserEnabled()) return false;
  const pConf = getPersonSettings(personName);
  return !!pConf.hide_salary;
}

export function getPersonPin(personName) {
  const pConf = getPersonSettings(personName);
  return (pConf && pConf.pin) ? String(pConf.pin).trim() : "";
}

export function setPersonPin(personName, pin) {
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

export function hasPersonPin(personName) {
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

export function isUserUnlocked(personName) {
  if (!personName) return true;
  if (!hasPersonPin(personName)) return true;
  return !!(appState.unlockedUsers && appState.unlockedUsers[personName]);
}

export function isMasterLocked() {
  const cfg = getSettings();
  if (cfg.enable_multi_user) return false;
  return !!(cfg.security && cfg.security.master_pin_enabled && !appState.isMasterUnlocked);
}

export function unlockUser(personName, pin) {
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

export function lockAllUsers() {
  appState.unlockedUsers = {};
  appState.isMasterUnlocked = false;
  appState.activeUser = 'Joint';
}

export function getActiveUser() {
  return appState.activeUser || 'Joint';
}

export function setActiveUser(user) {
  appState.activeUser = user || 'Joint';
}

export function getAccountOwner(accType, accName) {
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

export function setAccountOwner(accType, accName, owner) {
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

export function setPersonSalaryPrivacy(personName, hide) {
  const pConf = getPersonSettings(personName);
  pConf.hide_salary = !!hide;
}

export function isAccountVisibleToActiveUser(accType, accName) {
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
  window.getCurrentPeriodMonthAndYear = getCurrentPeriodMonthAndYear;
  window.getSlidingWindowMonths = getSlidingWindowMonths;
  window.applyTheme = applyTheme;
}

export function getMasterYearlyBudgets() {
  const cfg = getSettings();
  const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: appState.currentYear, monthIdx: new Date().getMonth() };
  const yData = getYearData(curPeriod.year);

  if (yData && yData.yearly_budgets && yData.yearly_budgets.length > 0) {
    return yData.yearly_budgets;
  }
  if (cfg.yearly_budgets && cfg.yearly_budgets.length > 0) {
    return cfg.yearly_budgets;
  }
  if (!yData.yearly_budgets) yData.yearly_budgets = [];
  return yData.yearly_budgets;
}

export function getBirthdays(year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.birthdays) {
    const cfg = getSettings();
    yData.birthdays = JSON.parse(JSON.stringify(cfg.birthdays || []));
  }
  return yData.birthdays;
}

export function getRecurringPayments(year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.recurring_payments) {
    const cfg = getSettings();
    yData.recurring_payments = JSON.parse(JSON.stringify(cfg.recurring_payments || []));
  }
  return yData.recurring_payments;
}

export function getRecurringIncomes(year = appState.currentYear) {
  const yData = getYearData(year);
  if (!yData.recurring_incomes) {
    const cfg = getSettings();
    yData.recurring_incomes = JSON.parse(JSON.stringify(cfg.recurring_incomes || []));
  }
  return yData.recurring_incomes;
}

export function isItemActiveInMonth(item, mName, year) {
  if (!item) return false;
  if (!item.start_date && !item.end_date) return true;
  const mIdx = months.indexOf(mName);
  if (mIdx === -1) return true;

  if (item.start_date) {
    const sParts = String(item.start_date).split('T')[0].split('-');
    if (sParts.length >= 2) {
      const sTotalM = parseInt(sParts[0], 10) * 12 + (parseInt(sParts[1], 10) - 1);
      const curTotalM = parseInt(year, 10) * 12 + mIdx;
      if (curTotalM < sTotalM) return false;
    }
  }
  if (item.end_date) {
    const eParts = String(item.end_date).split('T')[0].split('-');
    if (eParts.length >= 2) {
      const eTotalM = parseInt(eParts[0], 10) * 12 + (parseInt(eParts[1], 10) - 1);
      const curTotalM = parseInt(year, 10) * 12 + mIdx;
      if (curTotalM > eTotalM) return false;
    }
  }
  return true;
}

export function getAllScheduledBills(mName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  const yData = getYearData(year);
  const cfg = getSettings();

  const list = [];

  // 1. Monthly Direct Debits for this month
  (md.direct_debits || []).forEach((dd, idx) => {
    if (!isItemActiveInMonth(dd, mName, year)) return;
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
    if (!isItemActiveInMonth(yb, mName, year)) return;
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
    if (!isItemActiveInMonth(r, mName, year)) return;
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

export function getAllScheduledIncomes(mName, year = appState.currentYear) {
  const md = getMonthData(mName, year);
  const yData = getYearData(year);
  const cfg = getSettings();

  const list = [];

  // 1. Monthly Payments In for this month
  (md.payments_in || []).forEach((pi, idx) => {
    if (!isItemActiveInMonth(pi, mName, year)) return;
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
    if (!isItemActiveInMonth(yi, mName, year)) return;
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
    if (!isItemActiveInMonth(r, mName, year)) return;
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

export function getAllScheduledItems(mName, year = appState.currentYear) {
  const bills = getAllScheduledBills(mName, year);
  const incomes = getAllScheduledIncomes(mName, year);
  return [...bills, ...incomes];
}

export function getMasterScheduledCommitments() {
  const cfg = getSettings();
  const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
    ? getCurrentPeriodMonthAndYear()
    : { year: appState.currentYear, monthIdx: new Date().getMonth(), month: months[new Date().getMonth()] };
  const yData = getYearData(curPeriod.year);
  const curMD = (yData && yData.months && yData.months[curPeriod.month]) ? yData.months[curPeriod.month] : null;

  // Sync fallback if settings arrays are empty
  if ((!cfg.default_direct_debits || cfg.default_direct_debits.length === 0) && curMD && curMD.direct_debits && curMD.direct_debits.length > 0) {
    cfg.default_direct_debits = JSON.parse(JSON.stringify(curMD.direct_debits));
  }
  if ((!cfg.default_payments_in || cfg.default_payments_in.length === 0) && curMD && curMD.payments_in && curMD.payments_in.length > 0) {
    cfg.default_payments_in = JSON.parse(JSON.stringify(curMD.payments_in));
  }

  // 1. Ongoing Monthly Direct Debits
  const directDebits = (cfg.default_direct_debits || curMD?.direct_debits || []).map((dd, idx) => ({
    ...dd,
    is_income: false,
    source_type: 'direct_debit',
    source_idx: idx,
    frequency: dd.frequency || 'monthly',
    account: dd.account || cfg.current_accounts[0],
    transfer_to: dd.transfer_to || 'none',
    holiday_rule: dd.holiday_rule || 'following'
  }));

  // 2. Flexible Multi-Cadence Recurring Payments
  const recPayments = (yData.recurring_payments || cfg.recurring_payments || []).map((r, idx) => ({
    ...r,
    is_income: false,
    source_type: 'recurring_payment',
    source_idx: idx,
    frequency: r.frequency || 'monthly',
    account: r.account || cfg.current_accounts[0],
    transfer_to: r.transfer_to || 'none',
    holiday_rule: r.holiday_rule || 'following'
  }));

  // 3. Annual Recurring Bills
  const yearlyRecurring = (yData.yearly_recurring || cfg.default_yearly_recurring || []).map((yb, idx) => ({
    ...yb,
    is_income: false,
    source_type: 'yearly_recurring',
    source_idx: idx,
    frequency: 'yearly',
    account: yb.account || cfg.current_accounts[0],
    transfer_to: yb.transfer_to || 'none',
    holiday_rule: yb.holiday_rule || 'following'
  }));

  // 4. Monthly Scheduled Incomes
  const monthlyIncomes = (cfg.default_payments_in || curMD?.payments_in || []).map((pi, idx) => ({
    ...pi,
    is_income: true,
    source_type: 'monthly_payment_in',
    source_idx: idx,
    frequency: pi.frequency || 'monthly',
    account: pi.account || cfg.current_accounts[0],
    holiday_rule: pi.holiday_rule || 'previous'
  }));

  // 5. Flexible Recurring Incomes
  const recIncomes = (yData.recurring_incomes || cfg.recurring_incomes || []).map((r, idx) => ({
    ...r,
    is_income: true,
    source_type: 'recurring_income',
    source_idx: idx,
    frequency: r.frequency || 'monthly',
    account: r.account || cfg.current_accounts[0],
    holiday_rule: r.holiday_rule || 'previous'
  }));

  // 6. Annual Recurring Incomes
  const yearlyIncomes = (yData.yearly_income || cfg.default_yearly_income || []).map((yi, idx) => ({
    ...yi,
    is_income: true,
    source_type: 'yearly_income',
    source_idx: idx,
    frequency: 'yearly',
    account: yi.account || cfg.current_accounts[0],
    holiday_rule: yi.holiday_rule || 'previous'
  }));

  const allBills = [...directDebits, ...recPayments, ...yearlyRecurring];
  const allIncomes = [...monthlyIncomes, ...recIncomes, ...yearlyIncomes];
  return { allBills, allIncomes, allItems: [...allBills, ...allIncomes], curPeriod };
}

if (typeof window !== 'undefined') {
  window.getRecurringIncomes = getRecurringIncomes;
  window.isItemActiveInMonth = isItemActiveInMonth;
  window.getAllScheduledBills = getAllScheduledBills;
  window.getAllScheduledIncomes = getAllScheduledIncomes;
  window.getAllScheduledItems = getAllScheduledItems;
  window.getMasterScheduledCommitments = getMasterScheduledCommitments;
  window.getMasterYearlyBudgets = getMasterYearlyBudgets;
}

