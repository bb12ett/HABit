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
  resetDatabase,
  saveOpenBankingConfig,
  getOpenBankingStatus,
  getOpenBankingInstitutions,
  createOpenBankingRequisition,
  callbackOpenBankingRequisition,
  mapOpenBankingAccount,
  syncOpenBanking,
  unlinkOpenBanking,
  uploadBankStatement,
  fetchCategories,
  syncCategoriesFromGitHub,
  fetchAvailableYears,
  createBudgetYear,
  propagateScheduledBillsApi,
  exportFullBudgetBackupApi,
  importFullBudgetBackupApi
} from './api.js';

import {
  calculateMonthSchedule,
  calculateAndSyncRollovers,
  detectCurrentMonthAndWeek,
  setDynamicCategories
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
  openSetPinModal,
  openBankLinkModal,
  openTransactionLedgerModal,
  openBankStatementUploadModal,
  openDebugLogModal,
  openRecategorizeModal,
  openManualBillMatchModal
} from './views/modals.js';

import { renderOverviewView } from './views/overview.js';
import { renderAccountsView } from './views/accounts.js';
import { renderBudgetsView } from './views/budgets.js';
import { renderBillsView } from './views/bills.js';
import { renderYearOverviewView } from './views/year_overview.js';
import { renderSettingsView } from './views/settings.js';
import { renderSpendAnalyticsView } from './views/spend_analytics.js';
import { renderForecastOverviewView } from './views/forecast_overview.js';

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

import { initMobileGestures } from './gestures.js';

﻿
















const fullMonthNames = {
  Jan: 'January',
  Feb: 'February',
  Mar: 'March',
  Apr: 'April',
  May: 'May',
  Jun: 'June',
  Jul: 'July',
  Aug: 'August',
  Sep: 'September',
  Oct: 'October',
  Nov: 'November',
  Dec: 'December'
};

export function updateTopBarTitle() {
  const titleEl = document.getElementById('topBarMonthTitle');
  if (!titleEl) return;

  const yr = String(appState.currentYear);
  const shortYr = `'${yr.slice(-2)}`;

  let desktopTitle = 'Budget';
  let mobileTitle = 'Budget';

  if (appState.activeTab === 'Overview') {
    desktopTitle = `Forecast Overview ${yr}`;
    mobileTitle = `Overview ${shortYr}`;
  } else if (months.includes(appState.activeTab)) {
    const fullMonth = fullMonthNames[appState.activeTab] || appState.activeTab;
    desktopTitle = `${fullMonth} ${yr}`;
    mobileTitle = `${appState.activeTab} ${shortYr}`;
  } else if (appState.activeTab === 'Year') {
    desktopTitle = `Annual Trajectory ${yr}`;
    mobileTitle = `Annual ${shortYr}`;
  } else if (appState.activeTab === 'Budgets') {
    desktopTitle = `Budgets & Occasions ${yr}`;
    mobileTitle = `Budgets ${shortYr}`;
  } else if (appState.activeTab === 'Bills') {
    desktopTitle = `Scheduled Bills ${yr}`;
    mobileTitle = `Bills ${shortYr}`;
  } else if (appState.activeTab === 'Spend') {
    desktopTitle = `Live Spend & Categories ${yr}`;
    mobileTitle = `Live Spend ${shortYr}`;
  } else if (appState.activeTab === 'Settings') {
    desktopTitle = 'Settings & Tools';
    mobileTitle = 'Settings';
  } else if (appState.activeTab) {
    desktopTitle = `${appState.activeTab} ${yr}`;
    mobileTitle = `${appState.activeTab} ${shortYr}`;
  }

  titleEl.innerHTML = `<span class="topbar-title-desktop">${desktopTitle}</span><span class="topbar-title-mobile">${mobileTitle}</span>`;
}

export function renderYearMenu() {
  updateTopBarTitle();
  const disp = document.getElementById('currentYearDisplay');
  if (disp) {
    const fullYr = String(appState.currentYear);
    const shortYr = `'${fullYr.slice(-2)}`;
    disp.innerHTML = `<span class="year-full">${fullYr}</span><span class="year-short">${shortYr}</span>`;
  }
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

export function renderOpenBankingNavStatus() {
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

  const activeSec = (typeof getPrimarySection === 'function')
    ? getPrimarySection(appState.activeTab)
    : (months.includes(appState.activeTab) ? 'monthly' : (appState.activeTab === 'Budgets' || appState.activeTab === 'Bills' ? 'budgets' : 'analytics'));

  // 1. Update Active State on MD3 Bottom Nav & Desktop Rail
  if (typeof document !== 'undefined') {
    const navItems = document.querySelectorAll('.md3-nav-item, .md3-rail-item');
    navItems.forEach(el => {
      const sec = el.getAttribute('data-section');
      if (sec === activeSec) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // 2. Render Contextual Sub-Navigation in Header
  const navTabsEl = document.getElementById('navTabs');
  if (!navTabsEl) return;

  if (activeSec === 'monthly') {
    const yData = getYearData();
    let html = `<div class="month-pills-bar">`;
    html += `<button class="tab-btn month-pill ${appState.activeTab === 'Overview' ? 'active' : ''}" onclick="window.budgetApp.setTab('Overview')">⚡ Overview</button>`;
    months.forEach(m => {
      const md = yData.months[m] || {};
      if (md.archived) return;
      html += `<button class="tab-btn month-pill ${m === appState.activeTab ? 'active' : ''}" onclick="window.budgetApp.setTab('${m}')">${m}</button>`;
    });
    html += `</div>`;
    navTabsEl.innerHTML = html;
    scrollToActiveMonthPill(true);
  } else if (activeSec === 'budgets') {
    let html = `
      <div class="month-pills-bar">
        <button class="tab-btn month-pill ${appState.activeTab === 'Budgets' ? 'active' : ''}" onclick="window.budgetApp.setTab('Budgets')">
          🎯 Budgets & Occasions
        </button>
        <button class="tab-btn month-pill ${appState.activeTab === 'Bills' ? 'active' : ''}" onclick="window.budgetApp.setTab('Bills')">
          📅 Scheduled & Recurring Bills
        </button>
      </div>
    `;
    navTabsEl.innerHTML = html;
  } else if (activeSec === 'analytics') {
    let html = `
      <div class="month-pills-bar">
        <button class="tab-btn month-pill ${appState.activeTab === 'Spend' ? 'active' : ''}" onclick="window.budgetApp.setTab('Spend')">
          🛒 Live Spend & Categories
        </button>
        <button class="tab-btn month-pill ${appState.activeTab === 'Year' ? 'active' : ''}" onclick="window.budgetApp.setTab('Year')">
          📊 Annual Trajectory
        </button>
      </div>
    `;
    navTabsEl.innerHTML = html;
  } else if (activeSec === 'settings') {
    navTabsEl.innerHTML = `
      <div class="settings-subnav-title">
        <span style="font-size:12.5px; font-weight:700; color:var(--heading);">⚙️ Global Application & Household Settings</span>
      </div>
    `;
  }
}

export function renderContent() {
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
    if (!container) return;

    if (appState.activeTab === 'Settings') {
      renderSettingsView(container);
      return;
    }
    if (appState.activeTab === 'Budgets') {
      renderBudgetsView(container);
      return;
    }
    if (appState.activeTab === 'Bills') {
      renderBillsView(container);
      return;
    }
    if (appState.activeTab === 'Spend') {
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
      renderYearOverviewView(container);
      return;
    }
    if (appState.activeTab === 'Overview') {
      renderForecastOverviewView(container);
      return;
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

export function enableHomeAssistantKioskMode() {
  if (typeof window === 'undefined' || window.self === window.top) return;

  function injectKioskStyles() {
    try {
      const parentDoc = window.parent.document;
      if (!parentDoc) return;

      const styleId = 'habit-ha-ingress-fullscreen-style';
      const cssRules = `
        /* Hide Home Assistant Ingress Toolbar & Header */
        ha-panel-iframe,
        hass-ingress,
        ha-ingress {
          --app-header-height: 0px !important;
        }
        app-header,
        app-toolbar,
        ha-top-app-bar,
        .header,
        .toolbar,
        app-header-layout > app-header,
        ha-panel-iframe app-header,
        ha-panel-iframe app-toolbar,
        ha-panel-iframe ha-top-app-bar,
        ha-panel-iframe .header,
        ha-panel-iframe .toolbar,
        ha-panel-iframe,
        hass-ingress,
        ha-ingress,
        ha-panel-iframe app-header-layout,
        hass-ingress app-header-layout,
        ha-ingress app-header-layout {
          --app-header-height: 0px !important;
          padding: 0px !important;
          margin: 0px !important;
          height: 100% !important;
          min-height: 100% !important;
          max-height: 100% !important;
        }
        app-header,
        app-toolbar,
        ha-top-app-bar,
        .header,
        .toolbar,
        app-header-layout > app-header,
        ha-panel-iframe app-header,
        ha-panel-iframe app-toolbar,
        ha-panel-iframe ha-top-app-bar,
        ha-panel-iframe .header,
        ha-panel-iframe .toolbar,
        hass-ingress app-header,
        hass-ingress app-toolbar,
        hass-ingress ha-top-app-bar,
        hass-ingress .header,
        hass-ingress .toolbar {
          display: none !important;
          height: 0px !important;
          min-height: 0px !important;
          max-height: 0px !important;
          visibility: hidden !important;
          opacity: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          pointer-events: none !important;
        }
        ha-panel-iframe iframe,
        hass-ingress iframe,
        ha-ingress iframe,
        iframe {
          height: 100% !important;
          height: 100vh !important;
          height: 100dvh !important;
          max-height: 100% !important;
          max-height: 100vh !important;
          max-height: 100dvh !important;
          width: 100% !important;
          border: none !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          z-index: 100 !important;
        }
        app-header-layout, #contentContainer, .main-content, #view {
          padding-top: 0px !important;
          padding-bottom: 0px !important;
          margin-top: 0px !important;
          margin-bottom: 0px !important;
          height: 100% !important;
          min-height: 100% !important;
          max-height: 100% !important;
        }
      `;

      if (!parentDoc.getElementById(styleId)) {
        const style = parentDoc.createElement('style');
        style.id = styleId;
        style.textContent = cssRules;
        parentDoc.head.appendChild(style);
      }

      function patchShadow(node) {
        if (!node) return;
        try {
          if (node.shadowRoot) {
            if (!node.shadowRoot.getElementById(styleId)) {
              const srStyle = parentDoc.createElement('style');
              srStyle.id = styleId;
              srStyle.textContent = cssRules;
              node.shadowRoot.appendChild(srStyle);
            }
            node.shadowRoot.querySelectorAll('*').forEach(patchShadow);
          }
        } catch (e) {}
      }

      parentDoc.querySelectorAll('home-assistant, home-assistant-main, ha-panel-iframe, hass-ingress, ha-ingress, partial-panel-resolver').forEach(el => {
        patchShadow(el);
      });

      window.dispatchEvent(new Event('resize'));
    } catch (e) {
      // Ignored if cross-origin
    }
  }

  injectKioskStyles();
  setTimeout(injectKioskStyles, 50);
  setTimeout(injectKioskStyles, 200);
  setTimeout(injectKioskStyles, 600);
  setTimeout(injectKioskStyles, 1500);
  setTimeout(injectKioskStyles, 3000);
}

function bindGlobalEvents() {
  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('sideDrawer');
    if (drawer && drawer.classList.contains('open')) {
      if (!drawer.contains(e.target) && !e.target.closest('#openDrawerBtn, #desktopRailMenuBtn, [onclick*="openDrawer"]')) {
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
        block: 'start',
        inline: 'nearest'
      });
      currentWeekEl.classList.remove('week-highlight-pulse');
      void currentWeekEl.offsetWidth;
      currentWeekEl.classList.add('week-highlight-pulse');
      setTimeout(() => currentWeekEl.classList.remove('week-highlight-pulse'), 1500);
    }
  }, 120);
}

export function scrollToActiveMonthPill(smooth = true) {
  setTimeout(() => {
    const activePill = document.querySelector('.month-pills-bar .tab-btn.month-pill.active');
    if (activePill) {
      activePill.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, 80);
}

export function toggleDesktopRail(e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  const rail = document.getElementById('desktopNavRail');
  if (!rail) return;
  const isCollapsed = rail.classList.toggle('collapsed');
  try {
    localStorage.setItem('habit_rail_collapsed', isCollapsed ? '1' : '0');
  } catch (err) {}
}

export function initDesktopRail() {
  try {
    const isCollapsed = localStorage.getItem('habit_rail_collapsed') === '1';
    const rail = document.getElementById('desktopNavRail');
    if (rail && isCollapsed) {
      rail.classList.add('collapsed');
    }
  } catch (err) {}
}

export async function init() {
  try {
    // Automatically enable full-bleed kiosk mode when embedded in Home Assistant Ingress
    enableHomeAssistantKioskMode();
    initDesktopRail();

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
    initMobileGestures();

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
      appState.activeTab = 'Overview';
      appState.lastActiveMonth = 'Overview';

      if (window.budgetApp && typeof window.budgetApp.applyOpenBankingToCheckins === 'function') {
        window.budgetApp.applyOpenBankingToCheckins();
      }

      calculateAndSyncRollovers();
      renderYearMenu();
      renderNav();
      renderContent();
      scrollToActiveMonthPill(false);

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
  renderForecastOverviewView,
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

  setTab(tabName, shouldScrollToWeek = false) {
    const isSwitching = appState.activeTab !== tabName;
    appState.activeTab = tabName;
    if (months.includes(tabName) || tabName === 'Overview') {
      appState.lastActiveMonth = tabName;
    } else if (tabName === 'Budgets' || tabName === 'Bills') {
      appState.lastBudgetsTab = tabName;
    } else if (tabName === 'Spend' || tabName === 'Year') {
      appState.lastAnalyticsTab = tabName;
    }
    renderNav();
    renderContent();

    if (isSwitching) {
      const container = document.getElementById('appBody');
      if (container) container.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    if (shouldScrollToWeek) {
      scrollToCurrentWeek(true);
    }
  },

  setPrimarySection(section) {
    if (section === 'monthly') {
      const targetMonth = appState.lastActiveMonth || 'Overview';
      this.setTab(targetMonth);
    } else if (section === 'budgets') {
      const target = appState.lastBudgetsTab || 'Budgets';
      this.setTab(target);
    } else if (section === 'analytics') {
      const target = appState.lastAnalyticsTab || 'Spend';
      this.setTab(target);
    } else if (section === 'settings') {
      this.setTab('Settings');
    }
  },

  scrollToCurrentWeek,

  handleLogoClick(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const titleWrapper = document.querySelector('.topbar-title-wrapper');
    const logoBtn = document.querySelector('.logo-btn');
    [titleWrapper, logoBtn].forEach(el => {
      if (el) {
        el.classList.remove('title-pulse-active');
        void el.offsetWidth;
        el.classList.add('title-pulse-active');
        setTimeout(() => el.classList.remove('title-pulse-active'), 500);
      }
    });

    appState.lastActiveMonth = 'Overview';
    appState.activeTab = 'Overview';
    appState.activeSubTab = 'overview';
    renderNav();
    renderContent();
    const container = document.getElementById('appBody');
    if (container) container.scrollTop = 0;
    window.scrollTo(0, 0);
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
    if (!appState.spendColFilters) appState.spendColFilters = {};
    appState.spendColFilters.category = appState.spendFilterCategory;
    renderContent();
  },

  setSpendSearchQuery(query) {
    appState.spendSearchQuery = query;
    if (!appState.spendColFilters) appState.spendColFilters = {};
    appState.spendColFilters.payee = query;
    renderContent();
  },

  toggleSpendSort(colKey) {
    if (appState.spendSortColumn === colKey) {
      appState.spendSortDirection = appState.spendSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      appState.spendSortColumn = colKey;
      appState.spendSortDirection = (colKey === 'date' || colKey === 'amount') ? 'desc' : 'asc';
    }
    renderContent();
  },

  setSpendColFilter(colName, value) {
    if (!appState.spendColFilters) {
      appState.spendColFilters = { date: '', payee: '', account: 'all', owner: 'all', category: 'all', amount: '' };
    }
    appState.spendColFilters[colName] = value;
    if (colName === 'category') {
      appState.spendFilterCategory = value;
    }
    if (colName === 'payee') {
      appState.spendSearchQuery = value;
    }
    renderContent();
  },

  clearAllSpendFilters() {
    appState.spendFilterCategory = 'all';
    appState.spendSearchQuery = '';
    appState.spendColFilters = {
      date: '',
      payee: '',
      account: 'all',
      owner: 'all',
      category: 'all',
      amount: ''
    };
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

    const isRecurring = Boolean(item?.isRecurring || sourceType === 'recurring_income' || sourceType === 'recurring_payment');
    const occDateStr = dateStr || (item.actualPaymentDate ? new Date(item.actualPaymentDate).toISOString().slice(0, 10) : (item.matched_date || new Date().toISOString().slice(0, 10)));
    const isCleared = isRecurring
      ? Boolean(occDateStr && item.cleared_dates && item.cleared_dates.includes(occDateStr))
      : Boolean(item.auto_cleared || item.status === 'paid' || (occDateStr && item.cleared_dates && item.cleared_dates.includes(occDateStr)));

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
    const container = document.getElementById('appBody');
    if (container) container.scrollTop = 0;
    window.scrollTo(0, 0);
  },

  async switchYear(y) {
    const targetY = parseInt(y, 10);
    if (!targetY || isNaN(targetY)) return;
    document.querySelector('.dropdown')?.classList.remove('open');
    
    // If year data is not yet in client state, fetch it from backend
    if (!appState.data.years || !appState.data.years[String(targetY)]) {
      const fresh = await fetchBudget(targetY);
      if (fresh) {
        if (fresh.settings) appState.data.settings = fresh.settings;
        if (!appState.data.years) appState.data.years = {};
        if (fresh.years) Object.assign(appState.data.years, fresh.years);
        if (fresh.open_banking_transactions) appState.data.open_banking_transactions = fresh.open_banking_transactions;
        if (fresh.available_years) appState.data.available_years = fresh.available_years;
      }
    }

    appState.currentYear = targetY;
    renderYearMenu();
    renderNav();
    calculateAndSyncRollovers();
    renderContent();
    const container = document.getElementById('appBody');
    if (container) container.scrollTop = 0;
    window.scrollTo(0, 0);
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

  async exportData() {
    let payload = appState.data;
    try {
      const full = await exportFullBudgetBackupApi();
      if (full && full.years && full.settings) {
        payload = full;
      }
    } catch (e) {
      console.warn("Using active memory state for export fallback:", e);
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `habit_full_backup_${new Date().toISOString().split('T')[0]}.json`);
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
        if (confirm("Import this complete budget dataset? This will update your settings and budget years!")) {
          const res = await importFullBudgetBackupApi(imported);
          if (res && res.data) {
            appState.data = res.data;
          } else {
            appState.data = imported;
            await saveBudget(appState.data);
          }
          calculateAndSyncRollovers();
          renderYearMenu();
          renderNav();
          renderContent();
          alert("Complete multi-year budget data imported successfully!");
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

  openDrawer(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const d = document.getElementById('sideDrawer');
    const b = document.getElementById('drawerBackdrop');
    if (d) d.classList.add('open');
    if (b) b.classList.add('open');

    // Sync theme pills in side sheet
    const currentTheme = getSettings().theme || 'grey_dark';
    document.querySelectorAll('.md3-theme-pill').forEach(p => {
      if (p.getAttribute('data-theme') === currentTheme) p.classList.add('active');
      else p.classList.remove('active');
    });
  },

  closeDrawer() {
    const d = document.getElementById('sideDrawer');
    const b = document.getElementById('drawerBackdrop');
    if (d) d.classList.remove('open');
    if (b) b.classList.remove('open');
  },

  enableHomeAssistantKioskMode,
  toggleDesktopRail,
  initDesktopRail,


  // ==========================================
  // BIRTHDAYS & RECURRING PAYMENTS HANDLERS
  // ==========================================
  setBirthdayFilter(filter) {
    appState.birthdayFilter = filter;
    renderContent();
  },
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
    const availYears = (appState.data.available_years || []).filter(y => y > appState.currentYear);
    const futureYearsNote = availYears.length > 0 ? `\n• Future Years: ${availYears.join(', ')} (all 12 months)` : '';

    const confirmMsg = `🚀 Propagate Scheduled Bills & Inflows\n\nApply active ${fromMonth} ${appState.currentYear} items to:\n• ${appState.currentYear}: ${remainingMonths.length > 0 ? remainingMonths.join(', ') : 'Global Defaults'}${futureYearsNote}\n• Master Templates: Permanent defaults for any new years\n\nProceed?`;
    if (!confirm(confirmMsg)) return;

    // Call backend propagate endpoint for complete multi-year & master template sync
    const res = await propagateScheduledBillsApi(appState.currentYear, fromMonth);
    if (res && res.data) {
      if (res.data.settings) appState.data.settings = res.data.settings;
      if (res.data.years) Object.assign(appState.data.years, res.data.years);
      if (res.data.open_banking_transactions) appState.data.open_banking_transactions = res.data.open_banking_transactions;
      if (res.data.available_years) appState.data.available_years = res.data.available_years;
    } else {
      // Local fallback
      const yData = getYearData();
      for (let i = fromIdx + 1; i < months.length; i++) {
        const targetM = months[i];
        if (!yData.months[targetM]) yData.months[targetM] = {};
        yData.months[targetM].direct_debits = JSON.parse(JSON.stringify(curDDs));
        yData.months[targetM].payments_in = JSON.parse(JSON.stringify(curIncomes));
      }
      const cfg = getSettings();
      cfg.default_direct_debits = JSON.parse(JSON.stringify(curDDs));
      cfg.default_payments_in = JSON.parse(JSON.stringify(curIncomes));
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    }

    calculateAndSyncRollovers();
    renderContent();
    const updatedFut = res && res.updated_future_years && res.updated_future_years.length > 0 ? ` and future years (${res.updated_future_years.join(', ')})` : '';
    alert(`Successfully propagated ${curDDs.length} bills and ${curIncomes.length} payments in across ${appState.currentYear}${updatedFut}.`);
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
    if (appState.data.years && appState.data.years[newYear]) {
      alert(`Year ${newYear} already exists.`);
      return;
    }
    const cfg = getSettings();
    const prevYearNum = newYear - 1;
    const prevYearData = appState.data.years ? appState.data.years[String(prevYearNum)] : null;

    // Call backend endpoint to initialize new year
    const res = await createBudgetYear(newYear, prevYearNum);
    if (res && res.data) {
      if (res.data.settings) appState.data.settings = res.data.settings;
      if (!appState.data.years) appState.data.years = {};
      if (res.data.years) Object.assign(appState.data.years, res.data.years);
      if (res.data.open_banking_transactions) appState.data.open_banking_transactions = res.data.open_banking_transactions;
      if (res.data.available_years) appState.data.available_years = res.data.available_years;
    } else {
      // Local fallback initialization
      let initialBirthdays = (prevYearData && prevYearData.birthdays) ? prevYearData.birthdays.map(b => ({ ...b, transactions: [] })) : JSON.parse(JSON.stringify(cfg.birthdays || []));
      let initialRecurring = (prevYearData && prevYearData.recurring_payments) ? JSON.parse(JSON.stringify(prevYearData.recurring_payments)) : JSON.parse(JSON.stringify(cfg.recurring_payments || []));
      let initialRecurringIncomes = (prevYearData && prevYearData.recurring_incomes) ? JSON.parse(JSON.stringify(prevYearData.recurring_incomes)) : JSON.parse(JSON.stringify(cfg.recurring_incomes || []));
      let initialYearlyBills = (prevYearData && prevYearData.yearly_recurring) ? JSON.parse(JSON.stringify(prevYearData.yearly_recurring)) : JSON.parse(JSON.stringify(cfg.default_yearly_recurring || []));
      let initialYearlyIncomes = (prevYearData && prevYearData.yearly_income) ? JSON.parse(JSON.stringify(prevYearData.yearly_income)) : JSON.parse(JSON.stringify(cfg.default_yearly_income || []));

      const prevDecMonth = (prevYearData && prevYearData.months && prevYearData.months['Dec']) ? prevYearData.months['Dec'] : null;
      const inheritDDs = prevDecMonth ? prevDecMonth.direct_debits : cfg.default_direct_debits;
      const inheritPaymentsIn = prevDecMonth ? prevDecMonth.payments_in : cfg.default_payments_in;
      const inheritDeducts = prevDecMonth ? prevDecMonth.deductions_list : cfg.default_deductions;

      if (!appState.data.years) appState.data.years = {};
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
    }

    // Carry over December closing balances to January opening balances of new year
    if (prevYearData && typeof computeMonthClosing === 'function') {
      try {
        const decClosing = computeMonthClosing('Dec', 11, prevYearNum);
        if (appState.data.years[newYear] && appState.data.years[newYear].months && appState.data.years[newYear].months['Jan']) {
          const janM = appState.data.years[newYear].months['Jan'];
          if (!janM.current_data) janM.current_data = {};
          if (!janM.credit_data) janM.credit_data = {};
          if (!janM.savings_data) janM.savings_data = {};
          cfg.current_accounts.forEach(acc => {
            if (decClosing.current[acc] !== undefined) {
              janM.current_data[acc] = janM.current_data[acc] || {};
              janM.current_data[acc].opening = decClosing.current[acc];
            }
          });
          cfg.credit_accounts.forEach(c => {
            if (decClosing.credit[c.name] !== undefined) {
              janM.credit_data[c.name] = janM.credit_data[c.name] || {};
              janM.credit_data[c.name].opening_spent = decClosing.credit[c.name];
            }
          });
          cfg.savings_accounts.forEach(acc => {
            if (decClosing.savings[acc] !== undefined) {
              janM.savings_data[acc] = janM.savings_data[acc] || {};
              janM.savings_data[acc].opening = decClosing.savings[acc];
            }
          });
        }
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
    if (getSettings().onboarding_complete) { await saveBudget(appState.data, newYear); }
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
    document.querySelectorAll('.md3-theme-pill').forEach(p => {
      if (p.getAttribute('data-theme') === themeKey) p.classList.add('active');
      else p.classList.remove('active');
    });
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

    // 1. Direct match on the specific transaction by ID
    if (txnId && txnId !== 'undefined' && txnId !== 'null') {
      const match = allTxns.find(t => String(t.transaction_id) === String(txnId) || (t.id && String(t.id) === String(txnId)));
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

    // If the view was filtering by a specific category that the transaction just left, reset filter to 'all' so it remains visible
    if (appState.spendFilterCategory && appState.spendFilterCategory !== 'all' && appState.spendFilterCategory !== targetCatId) {
      appState.spendFilterCategory = 'all';
    }

    closeModal();
    this._pendingRecategorize = null;
    
    // Immediate synchronous UI re-render
    renderContent();

    // Persist changes to server
    if (getSettings().onboarding_complete) {
      saveBudget(appState.data).catch(err => console.error('Save error after recategorization:', err));
    }
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