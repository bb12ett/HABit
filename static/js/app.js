import {
  appState,
  getSettings,
  getYearData,
  getMonthData,
  getWeekItems,
  getWeekActuals,
  getAccountTrackingSettings,
  months,
  applyTheme,
  getBirthdays,
  getRecurringPayments,
  isMultiUserEnabled,
  setPersonSalaryPrivacy,
  getAccountOwner,
  setAccountOwner,
  getPersonPin,
  setPersonPin,
  hasPersonPin,
  isUserUnlocked,
  unlockUser,
  lockAllUsers,
  getActiveUser,
  setActiveUser
} from './state.js';

import {
  fetchBudget,
  saveBudget,
  resetDatabase
} from './api.js';

import {
  calculateMonthSchedule,
  calculateAndSyncRollovers,
  detectCurrentMonthAndWeek
} from './calculations.js';

import {
  startOnboarding,
  nextObStep,
  obRenderLists,
  obAddPerson,
  obAddCurrent,
  obAddSavings,
  obAddCredit,
  obAddDeduction,
  obAddDD,
  obAddYearly,
  obAddWeekly,
  finishOnboarding,
  closeOnboarding
} from './views/wizard.js';

import {
  showModal,
  closeModal,
  openScheduledBillsModal,
  openAddBirthdayModal,
  openEditBirthdayModal,
  openAddBirthdaySpendModal,
  openQuickBirthdaySpendModal,
  openRecurringPaymentsModal,
  openDateOverrideModal,
  openMoveItemModal,
  updateMoveWeekOptions,
  openRescheduleRecurringModal,
  updateReschedWeekOptions,
  openAccountTrackingModal,
  openArchiveManagerModal,
  openQuickCheckInModal,
  openQuickWeeklyExpenseModal,
  openQuickBudgetTxModal,
  openPinUnlockModal,
  openSetPinModal
} from './views/modals.js';

import { renderOverviewView } from './views/overview.js';
import { renderAccountsView } from './views/accounts.js';
import { renderBudgetsView } from './views/budgets.js';
import { renderBillsView } from './views/bills.js';
import { renderYearOverviewView } from './views/year_overview.js';
import { renderSettingsView } from './views/settings.js';

import {
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
  initCalculator
} from './views/calculator.js';

﻿
















export function updateTopBarTitle() {
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
  } else if (appState.activeTab === 'Settings') {
    titleEl.innerText = 'Settings';
  } else if (appState.activeTab) {
    titleEl.innerText = `${appState.activeTab} ${yr}`;
  } else {
    titleEl.innerText = `Budget ${yr}`;
  }
}

export function renderYearMenu() {
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

export function renderUserProfileNav() {
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

export function showProfileSelectionScreen() {
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

export function hideProfileSelectionScreen() {
  const overlay = document.getElementById('profileSelectionOverlay');
  if (overlay) overlay.style.display = 'none';
}

export function selectUserProfile(person) {
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

export function renderNav() {
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
  html += `<button class="tab-btn special ${appState.activeTab === 'Year' ? 'active' : ''}" onclick="window.budgetApp.setTab('Year')">📊 Annual Trajectory</button>`;
  
  const navTabsEl = document.getElementById('navTabs');
  if (navTabsEl) navTabsEl.innerHTML = html;
}

export function renderContent() {
  try {
    updateTopBarTitle();
    renderUserProfileNav();
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

export function scrollToCurrentWeek(smooth = true) {
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

export async function init() {
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