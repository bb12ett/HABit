import { DEFAULT_SETTINGS } from './state.js';

// =========================================================
// UNIVERSAL STORAGE ADAPTER (Home Assistant + Standalone Mobile)
// =========================================================

export function getBaseApiUrl() {
  let p = window.location.pathname;
  if (p.endsWith('index.html')) p = p.slice(0, -10);
  if (!p.endsWith('/')) p += '/';
  return p;
}

export function getApiUrl() {
  return getBaseApiUrl() + 'api/budget';
}

// ---------------------------------------------------------
// 1. INDEXEDDB LOCAL STORAGE BACKEND
// ---------------------------------------------------------
class IndexedDBStore {
  constructor(dbName = 'HABitDatabase', storeName = 'keyval') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbPromise = null;
  }

  async getDb() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => {
          console.warn('[IndexedDB] DB open error, fallback to localStorage:', e);
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
    return this.dbPromise;
  }

  async get(key) {
    const db = await this.getDb();
    if (!db) {
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
      } catch (e) { return null; }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async set(key, value) {
    const db = await this.getDb();
    if (!db) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) { return false; }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async remove(key) {
    const db = await this.getDb();
    if (!db) {
      try { localStorage.removeItem(key); return true; } catch (e) { return false; }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async keys() {
    const db = await this.getDb();
    if (!db) {
      try { return Object.keys(localStorage); } catch (e) { return []; }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }
}

const localStore = new IndexedDBStore();

// ---------------------------------------------------------
// 2. RUNTIME ENVIRONMENT DETECTION
// ---------------------------------------------------------
let _detectedMode = null; // 'ha' | 'local'

export function isCapacitorNative() {
  return Boolean(
    (typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.platform && window.Capacitor.platform !== 'web')
  );
}

export function isStandaloneMode() {
  if (isCapacitorNative()) return true;
  if (typeof window === 'undefined') return false;
  if (window.location.protocol === 'file:') return true;
  try {
    const saved = localStorage.getItem('habit_storage_mode');
    if (saved === 'local') return true;
  } catch (e) {}
  return false;
}

export function getStorageMode() {
  return _detectedMode || (isStandaloneMode() ? 'local' : 'ha');
}

export function setStorageMode(mode) {
  _detectedMode = mode;
  try {
    localStorage.setItem('habit_storage_mode', mode);
  } catch (e) {}
}

async function detectStorageEngine() {
  if (_detectedMode) return _detectedMode;

  if (isStandaloneMode()) {
    _detectedMode = 'local';
    console.log('[StorageAdapter] Running in Local / Standalone mode.');
    return _detectedMode;
  }

  // Fast probe to verify Home Assistant Flask API presence
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const r = await fetch(getBaseApiUrl() + 'api/auth/status', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (r.ok || r.status === 401) {
      _detectedMode = 'ha';
      console.log('[StorageAdapter] Connected to Home Assistant server.');
      return _detectedMode;
    }
  } catch (e) {
    // Timeout or network unreachable -> fallback to Local
  }

  _detectedMode = 'local';
  console.log('[StorageAdapter] Home Assistant backend unreachable. Running in Local Standalone mode.');
  return _detectedMode;
}

// ---------------------------------------------------------
// 3. LOCAL STORAGE ENGINE IMPLEMENTATION (PURE CLIENT-SIDE)
// ---------------------------------------------------------
async function hashPinLocal(pin, salt) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode((salt || '') + ':' + String(pin));
      const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {}
  }
  let h = 0;
  const str = (salt || '') + ':' + String(pin);
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

const LocalEngine = {
  async fetchBudget(year) {
    let settings = await localStore.get('habit_settings');
    if (!settings) {
      settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS || {}));
      await localStore.set('habit_settings', settings);
    }

    const curYr = year ? parseInt(year, 10) : (new Date().getFullYear());
    const yStr = String(curYr);

    let yearData = await localStore.get(`habit_year_${yStr}`);
    if (!yearData) {
      yearData = {
        archived: false,
        birthdays: JSON.parse(JSON.stringify(settings.birthdays || [])),
        recurring_payments: JSON.parse(JSON.stringify(settings.recurring_payments || [])),
        recurring_incomes: JSON.parse(JSON.stringify(settings.recurring_incomes || [])),
        yearly_recurring: JSON.parse(JSON.stringify(settings.default_yearly_recurring || [])),
        yearly_income: JSON.parse(JSON.stringify(settings.default_yearly_income || [])),
        yearly_budgets: [],
        months: {}
      };
      await localStore.set(`habit_year_${yStr}`, yearData);
    }

    let allYears = await localStore.get('habit_available_years');
    if (!allYears || !Array.isArray(allYears) || !allYears.includes(curYr)) {
      allYears = Array.from(new Set([...(allYears || []), curYr])).sort();
      await localStore.set('habit_available_years', allYears);
    }

    const txns = await localStore.get('habit_open_banking_txns') || [];

    return {
      settings,
      current_year: curYr,
      available_years: allYears,
      open_banking_transactions: txns,
      years: {
        [yStr]: yearData
      }
    };
  },

  async saveBudget(state, year) {
    if (!state) return false;
    try {
      if (state.settings) {
        await localStore.set('habit_settings', state.settings);
      }

      const curYr = year || state.current_year || (new Date().getFullYear());
      const yStr = String(curYr);

      if (state.years && state.years[yStr]) {
        await localStore.set(`habit_year_${yStr}`, state.years[yStr]);
      }

      if (Array.isArray(state.open_banking_transactions)) {
        await localStore.set('habit_open_banking_txns', state.open_banking_transactions);
      }

      let allYears = await localStore.get('habit_available_years');
      if (!allYears || !allYears.includes(parseInt(curYr, 10))) {
        allYears = Array.from(new Set([...(allYears || []), parseInt(curYr, 10)])).sort();
        await localStore.set('habit_available_years', allYears);
      }

      return true;
    } catch (e) {
      console.error('[LocalEngine] saveBudget error:', e);
      return false;
    }
  },

  async fetchAvailableYears() {
    const years = await localStore.get('habit_available_years') || [new Date().getFullYear()];
    return {
      years: years.sort(),
      current_year: new Date().getFullYear()
    };
  },

  async createBudgetYear(year, copyFromYear) {
    const yrNum = parseInt(year, 10);
    const yStr = String(yrNum);

    let baseYearData = null;
    if (copyFromYear) {
      baseYearData = await localStore.get(`habit_year_${copyFromYear}`);
    }

    const settings = await localStore.get('habit_settings') || DEFAULT_SETTINGS;
    let initialBirthdays = [];
    if (baseYearData && baseYearData.birthdays) {
      initialBirthdays = baseYearData.birthdays.map(b => ({ ...b, transactions: [] }));
    } else {
      initialBirthdays = JSON.parse(JSON.stringify(settings.birthdays || []));
    }

    const newYearData = {
      archived: false,
      birthdays: initialBirthdays,
      recurring_payments: baseYearData ? JSON.parse(JSON.stringify(baseYearData.recurring_payments || [])) : JSON.parse(JSON.stringify(settings.recurring_payments || [])),
      recurring_incomes: baseYearData ? JSON.parse(JSON.stringify(baseYearData.recurring_incomes || [])) : JSON.parse(JSON.stringify(settings.recurring_incomes || [])),
      yearly_recurring: baseYearData ? JSON.parse(JSON.stringify(baseYearData.yearly_recurring || [])) : JSON.parse(JSON.stringify(settings.default_yearly_recurring || [])),
      yearly_income: baseYearData ? JSON.parse(JSON.stringify(baseYearData.yearly_income || [])) : JSON.parse(JSON.stringify(settings.default_yearly_income || [])),
      yearly_budgets: [],
      months: {}
    };

    await localStore.set(`habit_year_${yStr}`, newYearData);

    let allYears = await localStore.get('habit_available_years') || [];
    allYears = Array.from(new Set([...allYears, yrNum])).sort();
    await localStore.set('habit_available_years', allYears);

    return { success: true, year: yrNum, years: allYears };
  },

  async exportFullBudgetBackupApi() {
    const settings = await localStore.get('habit_settings') || DEFAULT_SETTINGS;
    const allYears = await localStore.get('habit_available_years') || [new Date().getFullYear()];
    const txns = await localStore.get('habit_open_banking_txns') || [];

    const yearsObj = {};
    for (const yr of allYears) {
      const yData = await localStore.get(`habit_year_${yr}`);
      if (yData) yearsObj[String(yr)] = yData;
    }

    return {
      version: '0.3.1',
      exported_at: new Date().toISOString(),
      generator: 'HABit Universal Local Engine',
      settings,
      available_years: allYears,
      open_banking_transactions: txns,
      years: yearsObj
    };
  },

  async importFullBudgetBackupApi(data) {
    if (!data || typeof data !== 'object') return { success: false, error: 'Invalid backup' };

    if (data.settings) {
      await localStore.set('habit_settings', data.settings);
    }

    if (data.years && typeof data.years === 'object') {
      const yearsList = [];
      for (const [yStr, yData] of Object.entries(data.years)) {
        await localStore.set(`habit_year_${yStr}`, yData);
        yearsList.push(parseInt(yStr, 10));
      }
      await localStore.set('habit_available_years', Array.from(new Set(yearsList)).sort());
    }

    if (Array.isArray(data.open_banking_transactions)) {
      await localStore.set('habit_open_banking_txns', data.open_banking_transactions);
    }

    return { success: true };
  },

  async resetDatabase() {
    const allKeys = await localStore.keys();
    for (const k of allKeys) {
      if (String(k).startsWith('habit_')) {
        await localStore.remove(k);
      }
    }
    return true;
  },

  async getAuthStatus() {
    const settings = await localStore.get('habit_settings') || {};
    const sec = settings.security || {};
    return {
      master_pin_enabled: Boolean(sec.master_pin_enabled),
      joint_pin_enabled: Boolean(sec.joint_pin_enabled),
      multi_user: Boolean(settings.enable_multi_user),
      personas: sec.personas || {}
    };
  },

  async unlockAuth(persona, pin) {
    const settings = await localStore.get('habit_settings') || {};
    const sec = settings.security || {};

    let storedHash = '';
    let salt = '';

    if (persona === 'master') {
      storedHash = sec.master_pin_hash || '';
      salt = sec.master_salt || '';
    } else if (persona === 'Joint') {
      storedHash = sec.joint_pin_hash || '';
      salt = sec.joint_salt || '';
    } else if (sec.personas && sec.personas[persona]) {
      storedHash = sec.personas[persona].pin_hash || '';
      salt = sec.personas[persona].salt || '';
    }

    if (!storedHash) {
      return { ok: true, unlocked: true };
    }

    const testHash = await hashPinLocal(pin, salt);
    const isValid = (testHash === storedHash);
    return { ok: isValid, unlocked: isValid, error: isValid ? null : 'Incorrect PIN' };
  },

  async setPinAuth(persona, newPin, oldPin = '', enabled = true) {
    const settings = await localStore.get('habit_settings') || DEFAULT_SETTINGS;
    if (!settings.security) settings.security = {};
    const sec = settings.security;

    const salt = String(Date.now()) + Math.random().toString(36).substring(2, 8);
    const pinHash = await hashPinLocal(newPin, salt);

    if (persona === 'master') {
      sec.master_pin_enabled = !!enabled;
      sec.master_pin_hash = pinHash;
      sec.master_salt = salt;
    } else if (persona === 'Joint') {
      sec.joint_pin_enabled = !!enabled;
      sec.joint_pin_hash = pinHash;
      sec.joint_salt = salt;
    } else {
      if (!sec.personas) sec.personas = {};
      sec.personas[persona] = {
        enabled: !!enabled,
        pin_hash: pinHash,
        salt: salt
      };
    }

    await localStore.set('habit_settings', settings);
    return { ok: true, success: true };
  },

  async uploadBankStatement(fileContent, filename = 'statement.csv', mappedAccount = '', owner = 'Joint') {
    if (!fileContent) return { success: false, error: 'Empty statement file' };

    try {
      const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return { success: false, error: 'CSV statement requires at least a header and 1 row' };

      const sep = lines[0].includes(';') ? ';' : ',';
      const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

      let dateIdx = header.findIndex(h => h.includes('date'));
      let descIdx = header.findIndex(h => h.includes('desc') || h.includes('narrative') || h.includes('payee') || h.includes('merchant'));
      let amtIdx = header.findIndex(h => h.includes('amount') || h.includes('value'));

      if (dateIdx === -1) dateIdx = 0;
      if (descIdx === -1) descIdx = 1;
      if (amtIdx === -1) amtIdx = header.length - 1;

      const existingTxns = await localStore.get('habit_open_banking_txns') || [];
      const newTxns = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length <= Math.max(dateIdx, descIdx, amtIdx)) continue;

        const rawDate = parts[dateIdx];
        const rawDesc = parts[descIdx] || 'Bank Transaction';
        const rawAmt = parseFloat(parts[amtIdx].replace(/[^0-9.-]/g, ''));

        if (isNaN(rawAmt)) continue;

        const txnId = `local_${Date.now()}_${i}_${Math.abs(rawAmt).toFixed(2)}`;
        newTxns.push({
          transaction_id: txnId,
          booking_date: rawDate,
          amount: rawAmt,
          payee_name: rawDesc,
          description: rawDesc,
          raw_info: rawDesc,
          account_name: mappedAccount || 'Current Account',
          owner: owner || 'Joint'
        });
      }

      const combined = [...existingTxns, ...newTxns];
      await localStore.set('habit_open_banking_txns', combined);

      return { success: true, count: newTxns.length, total: combined.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

// ---------------------------------------------------------
// 4. UNIFIED PUBLIC API EXPORTS (AUTO-ROUTING)
// ---------------------------------------------------------

export async function fetchBudget(year) {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.fetchBudget(year);
  }
  try {
    const url = year ? `${getApiUrl()}?year=${encodeURIComponent(year)}` : getApiUrl();
    const r = await fetch(url, { 
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
    console.error('fetchBudget error, falling back to local storage:', e);
    return await LocalEngine.fetchBudget(year);
  }
  return null;
}

export async function saveBudget(state, year) {
  if (!state) return false;
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.saveBudget(state, year);
  }
  try {
    const targetY = year || state.current_year;
    const url = targetY ? `${getApiUrl()}?year=${encodeURIComponent(targetY)}` : getApiUrl();
    const r = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(state)
    });
    if (r.ok) return true;
  } catch (e) {
    console.error('saveBudget error, falling back to local save:', e);
  }
  // If HA call fails, mirror save to local storage to prevent data loss
  return await LocalEngine.saveBudget(state, year);
}

export async function fetchAvailableYears() {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.fetchAvailableYears();
  }
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/years`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('fetchAvailableYears error, falling back to local:', e);
    return await LocalEngine.fetchAvailableYears();
  }
  return null;
}

export async function createBudgetYear(year, copyFromYear) {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.createBudgetYear(year, copyFromYear);
  }
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/create_year`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ year, copy_from_year: copyFromYear })
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('createBudgetYear error, falling back to local:', e);
    return await LocalEngine.createBudgetYear(year, copyFromYear);
  }
  return null;
}

export async function exportFullBudgetBackupApi() {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.exportFullBudgetBackupApi();
  }
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/export`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('exportFullBudgetBackupApi error, falling back to local:', e);
    return await LocalEngine.exportFullBudgetBackupApi();
  }
  return null;
}

export async function importFullBudgetBackupApi(data) {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.importFullBudgetBackupApi(data);
  }
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/import`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(data)
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('importFullBudgetBackupApi error, falling back to local:', e);
    return await LocalEngine.importFullBudgetBackupApi(data);
  }
  return null;
}

export async function resetDatabase() {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.resetDatabase();
  }
  try {
    const r = await fetch(getApiUrl(), {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({})
    });
    if (r.ok) return true;
  } catch (e) {
    console.error('resetDatabase error:', e);
  }
  return await LocalEngine.resetDatabase();
}

export async function getAuthStatus() {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.getAuthStatus();
  }
  try {
    const r = await fetch(getBaseApiUrl() + 'api/auth/status', {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('getAuthStatus error, falling back to local:', e);
    return await LocalEngine.getAuthStatus();
  }
  return { master_pin_enabled: false, multi_user: false, personas: {} };
}

export async function unlockAuth(persona, pin) {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.unlockAuth(persona, pin);
  }
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
    console.error('unlockAuth error, falling back to local:', e);
    return await LocalEngine.unlockAuth(persona, pin);
  }
}

export async function setPinAuth(persona, newPin, oldPin = '', enabled = true) {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.setPinAuth(persona, newPin, oldPin, enabled);
  }
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
    console.error('setPinAuth error, falling back to local:', e);
    return await LocalEngine.setPinAuth(persona, newPin, oldPin, enabled);
  }
}

export async function getOpenBankingStatus() {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return { enabled: false, provider: 'local_statement', linked_accounts: [], transaction_count: 0, is_standalone: true };
  }
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/status', {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('getOpenBankingStatus error:', e);
  }
  return { enabled: false, provider: 'gocardless', linked_accounts: [], transaction_count: 0, is_standalone: true };
}

export async function saveOpenBankingConfig(cfg) {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    const settings = await localStore.get('habit_settings') || {};
    settings.open_banking = cfg;
    await localStore.set('habit_settings', settings);
    return true;
  }
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/config', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    return r.ok;
  } catch (e) {
    console.error('saveOpenBankingConfig error:', e);
    return false;
  }
}

export async function getOpenBankingInstitutions(country = 'GB') {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/institutions?country=' + encodeURIComponent(country), {
      cache: 'no-store'
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('getOpenBankingInstitutions error:', e);
  }
  return { success: false, institutions: [] };
}

export async function createOpenBankingRequisition(institutionId, redirectUri, institutionName = '', institutionLogo = '', owner = 'Joint') {
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
    console.error('createOpenBankingRequisition error:', e);
    return { success: false, error: e.message };
  }
}

export async function callbackOpenBankingRequisition(requisitionId = null, code = null, state = null, redirectUri = null) {
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
    console.error('callbackOpenBankingRequisition error:', e);
    return { success: false, error: e.message };
  }
}

export async function mapOpenBankingAccount(accountId, mappedHabitAccountId, owner, balanceType) {
  try {
    const payload = {
      account_id: accountId,
      mapped_habit_account_id: mappedHabitAccountId,
      owner
    };
    if (balanceType !== undefined) {
      payload.balance_type = balanceType;
    }
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/accounts/map', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await r.json();
  } catch (e) {
    console.error('mapOpenBankingAccount error:', e);
    return { success: false, error: e.message };
  }
}

export async function syncOpenBanking() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/sync', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('syncOpenBanking error:', e);
  }
  return { status: 'error' };
}

export async function unlinkOpenBanking(accountId = null, requisitionId = null) {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/openbanking/unlink', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, requisition_id: requisitionId })
    });
    return await r.json();
  } catch (e) {
    console.error('unlinkOpenBanking error:', e);
    return { success: false, error: e.message };
  }
}

export async function uploadBankStatement(fileContent, filename = 'statement.csv', mappedAccount = '', owner = 'Joint') {
  const mode = await detectStorageEngine();
  if (mode === 'local') {
    return await LocalEngine.uploadBankStatement(fileContent, filename, mappedAccount, owner);
  }
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
    console.error('uploadBankStatement error, falling back to local parse:', e);
    return await LocalEngine.uploadBankStatement(fileContent, filename, mappedAccount, owner);
  }
}

export async function fetchCategories() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/categories', {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {}

  // Fallback to GitHub raw or cached categories
  try {
    const ghRes = await fetch('https://raw.githubusercontent.com/bb12ett/HABit/main/categories/index.json', { cache: 'force-cache' });
    if (ghRes.ok) return await ghRes.json();
  } catch (e) {}

  return null;
}

export async function syncCategoriesFromGitHub() {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/categories/sync', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    if (r.ok) return await r.json();
  } catch (e) {}

  try {
    const ghRes = await fetch('https://raw.githubusercontent.com/bb12ett/HABit/main/categories/index.json');
    if (ghRes.ok) {
      const data = await ghRes.json();
      return { success: true, count: data.categories ? data.categories.length : 0 };
    }
  } catch (e) {
    console.error('syncCategoriesFromGitHub error:', e);
  }
  return { success: false };
}

export async function suggestCategoryMerchant(merchant, category, notes = '') {
  try {
    const r = await fetch(getBaseApiUrl() + 'api/categories/suggest', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant, category, notes })
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('suggestCategoryMerchant error:', e);
  }
  return { success: false };
}
