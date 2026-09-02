export function getBaseApiUrl() {
  let p = window.location.pathname;
  if (p.endsWith('index.html')) p = p.slice(0, -10);
  if (!p.endsWith('/')) p += '/';
  return p;
}

export function getApiUrl() {
  return getBaseApiUrl() + 'api/budget';
}

export async function fetchBudget(year) {
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
    console.error("fetchBudget error:", e);
  }
  return null;
}

export async function saveBudget(state, year) {
  if (!state) return false;
  try {
    const targetY = year || state.current_year;
    const url = targetY ? `${getApiUrl()}?year=${encodeURIComponent(targetY)}` : getApiUrl();
    const r = await fetch(url, {
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

export async function fetchAvailableYears() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/years`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) {
      return await r.json();
    }
  } catch (e) {
    console.error("fetchAvailableYears error:", e);
  }
  return null;
}

export async function createBudgetYear(year, copyFromYear) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/create_year`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ year, copy_from_year: copyFromYear })
    });
    if (r.ok) {
      return await r.json();
    }
  } catch (e) {
    console.error("createBudgetYear error:", e);
  }
  return null;
}

export async function exportFullBudgetBackupApi() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/export`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) {
      return await r.json();
    }
  } catch (e) {
    console.error("exportFullBudgetBackupApi error:", e);
  }
  return null;
}

export async function importFullBudgetBackupApi(data) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/import`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(data)
    });
    if (r.ok) {
      return await r.json();
    }
  } catch (e) {
    console.error("importFullBudgetBackupApi error:", e);
  }
  return null;
}

export async function resetDatabase() {
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

export async function getAuthStatus() {
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

export async function unlockAuth(persona, pin) {
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

export async function setPinAuth(persona, newPin, oldPin = '', enabled = true) {
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

export async function getOpenBankingStatus() {
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

export async function saveOpenBankingConfig(cfg) {
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

export async function getOpenBankingInstitutions(country = 'GB') {
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
    console.error("createOpenBankingRequisition error:", e);
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
    console.error("callbackOpenBankingRequisition error:", e);
    return { success: false, error: e.message };
  }
}

export async function mapOpenBankingAccount(accountId, mappedHabitAccountId, owner) {
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

export async function syncOpenBanking() {
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
    console.error("unlinkOpenBanking error:", e);
    return { success: false, error: e.message };
  }
}

export async function uploadBankStatement(fileContent, filename = 'statement.csv', mappedAccount = '', owner = 'Joint') {
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

export async function fetchCategories() {
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

export async function syncCategoriesFromGitHub() {
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
    console.error("suggestCategoryMerchant error:", e);
  }
  return { success: false };
}
