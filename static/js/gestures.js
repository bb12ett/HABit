import { appState, months, getPrimarySection, getSlidingWindowMonths, getYearData, getCurrentPeriodMonthAndYear } from './state.js';

let startX = 0;
let startY = 0;
let startTime = 0;
let isPulling = false;
let pullDistance = 0;
let isSwiping = false;

export function initMobileGestures() {
  const appBody = document.getElementById('appBody');
  const bottomNav = document.getElementById('mobileBottomNav');
  const pullContainer = document.getElementById('pullToRefreshContainer');
  const pullIcon = pullContainer ? pullContainer.querySelector('.pull-refresh-icon') : null;
  const pullText = pullContainer ? pullContainer.querySelector('.pull-refresh-text') : null;

  if (!appBody) return;

  // 1. TOUCH START ON MAIN BODY
  appBody.addEventListener('touchstart', (e) => {
    if (appState.globalEditMode) {
      isPulling = false;
      isSwiping = false;
      return;
    }
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = Date.now();
    isPulling = false;
    isSwiping = false;
    pullDistance = 0;

    // Exclude touches starting inside interactive or horizontally scrollable elements
    const target = e.target;
    if (target.closest('.month-pills-bar, pre, table, .data-table, canvas, input, textarea, select, .calc-widget, #genericModal, #sideDrawer, .dropdown-content, .tile-drag-handle, .widget-reorder-card')) {
      return;
    }
    isSwiping = true;
  }, { passive: true });

  // 2. TOUCH MOVE ON MAIN BODY
  appBody.addEventListener('touchmove', (e) => {
    if (appState.globalEditMode) {
      isPulling = false;
      isSwiping = false;
      return;
    }
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const diffX = t.clientX - startX;
    const diffY = t.clientY - startY;

    // Handle Pull to Refresh when scrolled to the very top
    if (appBody.scrollTop <= 0 && diffY > 10 && Math.abs(diffY) > Math.abs(diffX) * 1.3) {
      isPulling = true;
      pullDistance = Math.min(85, Math.max(0, diffY * 0.45));
      if (pullContainer) {
        pullContainer.classList.add('visible');
        pullContainer.style.transform = 'translateY(' + (pullDistance - 50) + 'px)';
        if (pullDistance >= 60) {
          if (pullIcon) pullIcon.style.transform = 'rotate(180deg)';
          if (pullText) pullText.innerText = 'Release to sync';
        } else {
          if (pullIcon) pullIcon.style.transform = 'rotate(' + Math.min(180, (pullDistance / 60) * 180) + 'deg)';
          if (pullText) pullText.innerText = 'Pull to refresh';
        }
      }
    }
  }, { passive: true });

  // 3. TOUCH END ON MAIN BODY
  appBody.addEventListener('touchend', (e) => {
    if (appState.globalEditMode) {
      isPulling = false;
      isSwiping = false;
      if (pullContainer) {
        pullContainer.classList.remove('visible');
        pullContainer.style.transform = 'translateY(-60px)';
      }
      return;
    }
    const elapsed = Date.now() - startTime;

    // A. Handle Pull-to-Refresh Release
    if (isPulling) {
      if (pullDistance >= 60) {
        if (pullContainer) {
          pullContainer.style.transform = 'translateY(15px)';
          if (pullIcon) {
            pullIcon.innerText = '🔄';
            pullIcon.classList.add('spinning');
          }
          if (pullText) pullText.innerText = 'Syncing...';
        }
        
        // Execute sync
        const syncPromise = (window.budgetApp && typeof window.budgetApp.triggerOpenBankingSync === 'function')
          ? window.budgetApp.triggerOpenBankingSync()
          : Promise.resolve();

        Promise.resolve(syncPromise).finally(() => {
          setTimeout(() => {
            if (pullContainer) {
              pullContainer.style.transform = 'translateY(-60px)';
              pullContainer.classList.remove('visible');
              if (pullIcon) {
                pullIcon.innerText = '⬇️';
                pullIcon.classList.remove('spinning');
                pullIcon.style.transform = 'rotate(0deg)';
              }
              if (pullText) pullText.innerText = 'Pull to refresh';
            }
          }, 600);
        });
      } else {
        if (pullContainer) {
          pullContainer.style.transform = 'translateY(-60px)';
          pullContainer.classList.remove('visible');
          if (pullIcon) pullIcon.style.transform = 'rotate(0deg)';
        }
      }
      isPulling = false;
      return;
    }

    if (!isSwiping) return;

    const t = e.changedTouches ? e.changedTouches[0] : null;
    if (!t) return;
    const diffX = t.clientX - startX;
    const diffY = t.clientY - startY;

    // B. Edge Swipe In from Left (Open Side Drawer)
    if (startX <= 30 && diffX >= 55 && Math.abs(diffX) > Math.abs(diffY) * 1.2 && elapsed < 500) {
      if (window.budgetApp && typeof window.budgetApp.openDrawer === 'function') {
        window.budgetApp.openDrawer();
      }
      return;
    }

    // C. Tab-to-Tab Swiping within current active section (e.g. Dec 26 -> Jan 27, Overview -> Month 1)
    if (Math.abs(diffX) >= 40 && Math.abs(diffX) > Math.abs(diffY) * 1.25 && elapsed < 650) {
      if (diffX < 0) {
        navigateTab('next');
      } else if (diffX > 0) {
        navigateTab('prev');
      }
    }
  }, { passive: true });

  // 4. BOTTOM NAV BAR SWIPING
  if (bottomNav) {
    let navStartX = 0;
    let navStartY = 0;
    let navStartTime = 0;

    bottomNav.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      navStartX = e.touches[0].clientX;
      navStartY = e.touches[0].clientY;
      navStartTime = Date.now();
    }, { passive: true });

    bottomNav.addEventListener('touchend', (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : null;
      if (!t) return;
      const diffX = t.clientX - navStartX;
      const diffY = t.clientY - navStartY;
      const elapsed = Date.now() - navStartTime;

      if (Math.abs(diffX) >= 45 && Math.abs(diffX) > Math.abs(diffY) * 1.5 && elapsed < 450) {
        const sections = ['monthly', 'budgets', 'analytics'];
        let activeSec = 'monthly';
        if (appState.activeTab === 'Budgets' || appState.activeTab === 'Bills') activeSec = 'budgets';
        else if (appState.activeTab === 'Spend' || appState.activeTab === 'Year') activeSec = 'analytics';

        const curIdx = sections.indexOf(activeSec);
        if (curIdx !== -1) {
          if (diffX < 0 && curIdx < sections.length - 1) {
            // Swipe Left -> Next Section
            if (window.budgetApp && typeof window.budgetApp.setPrimarySection === 'function') {
              window.budgetApp.setPrimarySection(sections[curIdx + 1]);
            }
          } else if (diffX > 0 && curIdx > 0) {
            // Swipe Right -> Prev Section
            if (window.budgetApp && typeof window.budgetApp.setPrimarySection === 'function') {
              window.budgetApp.setPrimarySection(sections[curIdx - 1]);
            }
          }
        }
      }
    }, { passive: true });
  }

  // 5. SWIPE TO CLOSE SIDE DRAWER
  const drawer = document.getElementById('sideDrawer');
  if (drawer) {
    let dStartX = 0;
    let dStartY = 0;
    drawer.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      dStartX = e.touches[0].clientX;
      dStartY = e.touches[0].clientY;
    }, { passive: true });

    drawer.addEventListener('touchend', (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : null;
      if (!t) return;
      const diffX = t.clientX - dStartX;
      const diffY = t.clientY - dStartY;
      if (diffX < -45 && Math.abs(diffX) > Math.abs(diffY)) {
        if (window.budgetApp && typeof window.budgetApp.closeDrawer === 'function') {
          window.budgetApp.closeDrawer();
        }
      }
    }, { passive: true });
  }
}

if (typeof window !== 'undefined') {
  window.initMobileGestures = initMobileGestures;
}

export function getNavigableTabs() {
  const activeSec = (typeof getPrimarySection === 'function')
    ? getPrimarySection(appState.activeTab)
    : (months.includes(appState.activeTab) ? 'monthly' : 'other');

  let tabs = [];
  if (activeSec === 'monthly') {
    const curPeriod = (typeof getCurrentPeriodMonthAndYear === 'function')
      ? getCurrentPeriodMonthAndYear()
      : { year: new Date().getFullYear() };
    tabs.push({ tab: 'Overview', year: curPeriod.year });
    const windowMonths = (typeof getSlidingWindowMonths === 'function')
      ? getSlidingWindowMonths()
      : [];
    windowMonths.forEach(mObj => {
      const yData = (typeof getYearData === 'function') ? getYearData(mObj.year) : null;
      const md = (yData && yData.months && yData.months[mObj.month]) || {};
      if (!md.archived) {
        tabs.push({ tab: mObj.month, year: mObj.year });
      }
    });
  } else if (activeSec === 'budgets') {
    tabs = [
      { tab: 'Budgets', year: appState.currentYear },
      { tab: 'Bills', year: appState.currentYear }
    ];
  } else if (activeSec === 'analytics') {
    tabs = [
      { tab: 'Spend', year: appState.currentYear },
      { tab: 'Year', year: appState.currentYear }
    ];
  }
  return tabs;
}

export function navigateTab(direction) {
  if (appState.globalEditMode) return false;

  const tabs = getNavigableTabs();
  if (!tabs || tabs.length <= 1) return false;

  const curIdx = tabs.findIndex(t => {
    if (t.tab === 'Overview') return appState.activeTab === 'Overview';
    return t.tab === appState.activeTab && t.year === appState.currentYear;
  });

  if (curIdx === -1) return false;

  if (direction === 'next' || direction === 1) {
    if (curIdx < tabs.length - 1) {
      const nextTab = tabs[curIdx + 1];
      if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
        window.budgetApp.setTab(nextTab.tab, nextTab.year);
        return true;
      }
    }
  } else if (direction === 'prev' || direction === -1) {
    if (curIdx > 0) {
      const prevTab = tabs[curIdx - 1];
      if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
        window.budgetApp.setTab(prevTab.tab, prevTab.year);
        return true;
      }
    }
  }
  return false;
}

export function updateDesktopNavArrows() {
  if (typeof document === 'undefined') return;
  const prevBtn = document.getElementById('desktopPrevTabBtn');
  const nextBtn = document.getElementById('desktopNextTabBtn');
  if (!prevBtn && !nextBtn) return;

  const tabs = getNavigableTabs();
  if (!tabs || tabs.length <= 1) {
    if (prevBtn) {
      prevBtn.disabled = true;
      prevBtn.style.opacity = '0.35';
      prevBtn.style.pointerEvents = 'none';
      prevBtn.title = 'No previous tab';
    }
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.35';
      nextBtn.style.pointerEvents = 'none';
      nextBtn.title = 'No next tab';
    }
    return;
  }

  const curIdx = tabs.findIndex(t => {
    if (t.tab === 'Overview') return appState.activeTab === 'Overview';
    return t.tab === appState.activeTab && t.year === appState.currentYear;
  });

  if (prevBtn) {
    const hasPrev = curIdx > 0;
    prevBtn.disabled = !hasPrev;
    prevBtn.style.opacity = hasPrev ? '1' : '0.35';
    prevBtn.style.pointerEvents = hasPrev ? 'auto' : 'none';
    if (hasPrev) {
      const prevT = tabs[curIdx - 1];
      const prevLabel = prevT.tab === 'Overview' ? 'Overview' : (prevT.tab + (prevT.year ? ' ' + String(prevT.year).slice(2) : ''));
      prevBtn.title = `Previous: ${prevLabel} (Left Arrow)`;
    } else {
      prevBtn.title = 'No previous tab';
    }
  }

  if (nextBtn) {
    const hasNext = curIdx !== -1 && curIdx < tabs.length - 1;
    nextBtn.disabled = !hasNext;
    nextBtn.style.opacity = hasNext ? '1' : '0.35';
    nextBtn.style.pointerEvents = hasNext ? 'auto' : 'none';
    if (hasNext) {
      const nextT = tabs[curIdx + 1];
      const nextLabel = nextT.tab === 'Overview' ? 'Overview' : (nextT.tab + (nextT.year ? ' ' + String(nextT.year).slice(2) : ''));
      nextBtn.title = `Next: ${nextLabel} (Right Arrow)`;
    } else {
      nextBtn.title = 'No next tab';
    }
  }
}

export function initDesktopArrowNavigation() {
  if (typeof window === 'undefined') return;

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

    // Do not trigger if typing in an input, textarea, select, or contenteditable
    const activeEl = document.activeElement;
    if (activeEl) {
      const tag = activeEl.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeEl.isContentEditable) {
        return;
      }
      if (activeEl.closest && (activeEl.closest('#budgetCalculatorWidget') || activeEl.closest('.calc-widget'))) {
        return;
      }
    }

    // Do not trigger if a modal or drawer is open
    const modal = document.getElementById('genericModal');
    if (modal && (modal.style.display === 'flex' || modal.classList.contains('visible'))) {
      return;
    }
    const drawer = document.getElementById('sideDrawer');
    if (drawer && drawer.classList.contains('open')) {
      return;
    }
    const pinModal = document.getElementById('pinModal');
    if (pinModal && pinModal.style.display === 'flex') {
      return;
    }

    if (e.key === 'ArrowLeft') {
      const handled = navigateTab('prev');
      if (handled) e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      const handled = navigateTab('next');
      if (handled) e.preventDefault();
    }
  });
}

if (typeof window !== 'undefined') {
  window.getNavigableTabs = getNavigableTabs;
  window.navigateTab = navigateTab;
  window.updateDesktopNavArrows = updateDesktopNavArrows;
  window.initDesktopArrowNavigation = initDesktopArrowNavigation;
}