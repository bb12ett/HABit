import { appState, months } from './state.js';

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
    if (target.closest('.month-pills-bar, pre, table, .data-table, canvas, input, textarea, select, .calc-widget, #genericModal, #sideDrawer, .dropdown-content')) {
      return;
    }
    isSwiping = true;
  }, { passive: true });

  // 2. TOUCH MOVE ON MAIN BODY
  appBody.addEventListener('touchmove', (e) => {
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

    // C. Month-to-Month Swiping
    const isMonthView = months.includes(appState.activeTab);
    if (isMonthView && Math.abs(diffX) >= 55 && Math.abs(diffX) > Math.abs(diffY) * 1.7 && elapsed < 450) {
      const curIdx = months.indexOf(appState.activeTab);
      if (curIdx !== -1) {
        if (diffX < 0) {
          // Swipe Left -> Next Month
          const nextIdx = (curIdx + 1) % 12;
          appBody.classList.remove('month-slide-left', 'month-slide-right');
          void appBody.offsetWidth;
          appBody.classList.add('month-slide-right');
          if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
            window.budgetApp.setTab(months[nextIdx]);
          }
        } else {
          // Swipe Right -> Prev Month
          const prevIdx = (curIdx - 1 + 12) % 12;
          appBody.classList.remove('month-slide-left', 'month-slide-right');
          void appBody.offsetWidth;
          appBody.classList.add('month-slide-left');
          if (window.budgetApp && typeof window.budgetApp.setTab === 'function') {
            window.budgetApp.setTab(months[prevIdx]);
          }
        }
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