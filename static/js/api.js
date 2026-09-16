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

export async function deleteBudgetYear(year) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/year/${encodeURIComponent(year)}`, {
      method: 'DELETE',
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();

    const rPost = await fetch(`${getBaseApiUrl()}api/budget/year/delete`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ year })
    });
    if (rPost.ok) return await rPost.json();
  } catch (e) {
    console.error("deleteBudgetYear error:", e);
  }
  return null;
}

export async function propagateScheduledBillsApi(year, month) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/budget/propagate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_year: year, source_month: month })
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.warn('propagateScheduledBillsApi error:', e);
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
    const resetUrl = getBaseApiUrl() + 'api/budget/reset';
    let r = await fetch(resetUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ action: 'reset' })
    });
    if (!r.ok) {
      // Fallback to primary budget endpoint with explicit reset action
      r = await fetch(getApiUrl(), {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ action: 'reset' })
      });
    }
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

// ---------------------------------------------------------
// BACKUP & CLOUD API CLIENT
// ---------------------------------------------------------

export async function fetchBackupsListApi() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/backups`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('fetchBackupsListApi error:', e);
  }
  return { backups: [], auto_backup: {} };
}

export async function createManualBackupApi(destinations = null) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/backups/create`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinations })
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('createManualBackupApi error:', e);
  }
  return { success: false, error: 'Request failed' };
}

export async function restoreBackupApi(filename) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/backups/restore`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('restoreBackupApi error:', e);
  }
  return { error: 'Restore request failed' };
}

export async function deleteBackupApi(filename) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/backups/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      cache: 'no-store'
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('deleteBackupApi error:', e);
  }
  return { error: 'Delete request failed' };
}

export async function saveBackupSettingsApi(payload) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/backup/settings`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.ok) return await r.json();
  } catch (e) {
    console.error('saveBackupSettingsApi error:', e);
  }
  return { error: 'Save failed' };
}

export async function initOneDriveDeviceCodeApi(clientId = '') {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/cloud/onedrive/devicecode`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    return { error: data.error || `HTTP ${r.status}: Failed to initiate OneDrive device login` };
  } catch (e) {
    console.error('initOneDriveDeviceCodeApi error:', e);
    return { error: e.message || 'Failed to connect to backend' };
  }
}

export async function pollOneDriveDeviceCodeApi(deviceCode, clientId = '') {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/cloud/onedrive/poll`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code: deviceCode, client_id: clientId })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    return { status: 'error', error: data.error || `HTTP ${r.status}` };
  } catch (e) {
    console.error('pollOneDriveDeviceCodeApi error:', e);
    return { status: 'error', error: e.message || 'Poll failed' };
  }
}

export async function testOneDriveUploadApi() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/cloud/onedrive/test`, {
      method: 'POST',
      cache: 'no-store'
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    return { status: 'error', error: data.error || `HTTP ${r.status}` };
  } catch (e) {
    console.error('testOneDriveUploadApi error:', e);
    return { status: 'error', error: e.message || 'Test upload failed' };
  }
}

export async function disconnectOneDriveApi() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/cloud/onedrive/disconnect`, {
      method: 'POST',
      cache: 'no-store'
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    return { status: 'error', error: data.error || `HTTP ${r.status}` };
  } catch (e) {
    console.error('disconnectOneDriveApi error:', e);
    return { status: 'error', error: e.message };
  }
}

export async function saveGoogleDriveApi(serviceAccountJson, folderId) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/cloud/gdrive/save`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_account_json: serviceAccountJson, folder_id: folderId })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    return { error: data.error || `HTTP ${r.status}: Failed to save Google Drive configuration` };
  } catch (e) {
    console.error('saveGoogleDriveApi error:', e);
    return { error: e.message || 'Network error' };
  }
}

export async function testGoogleDriveUploadApi() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/cloud/gdrive/test`, {
      method: 'POST',
      cache: 'no-store'
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    return { status: 'error', error: data.error || `HTTP ${r.status}` };
  } catch (e) {
    console.error('testGoogleDriveUploadApi error:', e);
    return { status: 'error', error: e.message || 'Test upload failed' };
  }
}

export async function disconnectGoogleDriveApi() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/cloud/gdrive/disconnect`, {
      method: 'POST',
      cache: 'no-store'
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    return { status: 'error', error: data.error || `HTTP ${r.status}` };
  } catch (e) {
    console.error('disconnectGoogleDriveApi error:', e);
    return { status: 'error', error: e.message };
  }
}

export async function checkTermsStatusApi() {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/terms/status`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    const contentType = r.headers.get('content-type') || '';
    if (r.ok) {
      if (contentType.includes('application/json')) {
        return await r.json();
      }
      const txt = await r.text();
      try {
        return JSON.parse(txt);
      } catch (_) {
        console.warn('[Terms] /api/terms/status returned non-JSON. The add-on may need a restart.');
        return null;
      }
    }
  } catch (e) {
    console.error('checkTermsStatusApi error:', e);
  }
  return null;
}

export async function acceptTermsApi(version) {
  try {
    const r = await fetch(`${getBaseApiUrl()}api/terms/accept`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ version: String(version || '1.0.0').trim() })
    });
    const contentType = r.headers.get('content-type') || '';
    let data = {};
    if (contentType.includes('application/json')) {
      data = await r.json().catch(() => ({}));
    } else {
      const txt = await r.text().catch(() => '');
      try {
        data = JSON.parse(txt);
      } catch (_) {
        return { ok: false, error: 'Server returned a non-JSON response (' + r.status + '). Please restart the HABit add-on in Home Assistant to apply backend updates.' };
      }
    }
    return { ok: r.ok, data };
  } catch (e) {
    console.error('acceptTermsApi error:', e);
    return { ok: false, error: e.message };
  }
}

