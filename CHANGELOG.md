# Changelog

All notable changes to the **HABit (Household Budget Planner)** add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.8] - 2026-09-03

### Security & Privacy Fixes
- **Disable Open Banking Debug Output to Home Assistant Logs & Sensitive Data Disclaimers**:
  - Removed stdout debug printing (`print(f"[OpenBankingDebug] {msg}")`) to ensure that sensitive financial details (including account IDs, balances, transaction payloads, and token references) are never written to Home Assistant Supervisor or add-on container logs.
  - Debug logging is strictly confined to the local debug log file (`open_banking_debug.txt`) when explicitly enabled by the user in Settings, accessible safely through the authenticated web UI.
  - Added a prominent, high-visibility warning banner to the **Open Banking Debug Log** window warning users not to share the log unredacted and requiring that all personal/financial information be cleared before sharing.
  - Added an unmissable security disclaimer header at the top of the debug log file (`open_banking_debug.txt`) upon generation, viewing, and clearing.
  - Added a redaction reminder alert when copying the log to clipboard and a caution note beneath the debug toggle in Settings.
  - Hardened debug logger to fail closed (suppress logging) if settings cannot be loaded.
  - Routed Open Banking network and scheduler notices to the internal debug log rather than stdout.
  - Removed temporary OAuth callback code logging from the browser console.
- **Financial Disclaimer & Limitation of Liability**:
  - Added a dedicated **⚖️ Financial Disclaimer & Terms of Use** modal clarifying that HABit is an informational estimation tool and not a provider of financial advice.
  - Added clear terms establishing that all calculations/pacing figures are estimates, requiring users to independently verify balances with their banks, and limiting liability for financial losses, overdraft fees, or banking charges.
  - Added accessible disclaimer triggers across the app: Settings footer button, side-drawer footer link, and the initial onboarding setup wizard.
  - Documented the full Financial Disclaimer & Limitation of Liability across `README.md` and the project Wiki (`wiki/Financial-Disclaimer.md`, `wiki/Home.md`, `wiki/_Sidebar.md`, and `wiki/_Footer.md`).

### Added & Enhanced
- **Comprehensive Spend Categorization Engine & 15,600+ Merchant Database**:
  - Massively expanded categorized dictionary to 15,640+ verified merchants, retailers, supermarkets, local pubs, farm parks, soft play centres, forecourts, and utilities.
  - Embedded full dictionary catalog directly into `calculations.js` and distribution bundles, ensuring instant offline/standalone categorization without network or API delays.
  - Added **📥 Export CSV** button to the Categorized Transactions list with filter awareness, RFC 4180 escaping, and Excel UTF-8 BOM encoding.
  - Added automatic UK bank truncation expansion (`filling stati` -> `filling station`, `service s` -> `service station`, `fish and chi` -> `fish and chips`, `convenience stor` -> `convenience store`, `halifax credit car` -> `halifax credit card`).
  - Fixed Amazon Marketplace (`AMZNMktplace*`), Shopify (`SP `), and multi-asterisk gateway (`SumUp **`, `CRV*`) preprocessing.
  - Added **Smart Transfer Auto-Identification**:
    - Unallocated movements to/from designated Savings accounts, pots, vaults, and ISAs now automatically default to **🔄 Transfers**.
    - Automatic household member and family surname matching for inter-account and family transfers.
    - Automatic inspection of Open Banking transaction categories (`t.transaction_category`), bank type codes (`TFR`, `INT`), and ISO 20022 codes (`PMNT-ICDT`).
    - Added direct keyword recognition for credit card payoffs (`Halifax Clarity`) and peer-to-peer personal transfers.
  - Upgraded PWA Service Worker to `habit-cache-v2` with Network-First strategy on script and HTML files to prevent browser stale-cache lock.

---

## [0.3.7] - 2026-09-03

### Added & Enhanced
- **Open Banking Balance Sync Mode (Available vs Current)**:
  - Added user-configurable **Balance Sync Mode** in Settings (`⚡ Available Balance (Include Pending - Recommended)`, `💳 Available for Credit Cards, Cleared for Bank Accounts`, and `🏛️ Current / Booked Balance (Cleared Transactions Only)`).
  - Fixed TrueLayer credit card balance response parsing to reliably capture both cleared booked debt and live available credit (`last_available`).
  - Added individual per-account balance mode overrides (`Mode: Global`, `⚡ Available (Pending)`, `🏛️ Current (Cleared)`) in Connected Bank Accounts.
  - Enhanced weekly check-in modal quick-fill buttons (`⚡ Live Avail (Pending)` / `⚡ Live Cleared`) with informative tooltips showing cleared debt, live available credit, and active sync mode.

---

## [0.3.6] - 2026-09-02

### Enhanced
- **User-Controlled Expandable KPI Cards in Edit Mode**:
  - Replaced automatic forced expansion of odd-numbered cards with user-controlled expand/contract toggles on every KPI tile in Edit Mode (`globalEditMode`).
  - Each tile's edit toolbar now features an **`↔️ Expand`** / **`⇤⇥ Shrink`** button allowing users to make any card full-width (`grid-column: 1 / -1`) or standard width.
  - Added full-width expansion toggles directly inside the "Customize Overview Tiles" modal for quick configuration.
  - Expansion settings persist across sessions in local storage (`habit_overview_expanded_tiles`) and budget configuration.

---

## [0.3.5] - 2026-09-02

### Enhanced
- **Overview Odd-Card Responsive Expansion**:
  - Automatically expands the final KPI card across the full row (`grid-column: 1 / -1`) on mobile and 2-column viewports whenever an odd number of tiles is displayed (e.g. 5 tiles, 3 tiles, 7 tiles).
  - Eliminates the awkward empty grid slot beside the last card, providing an expansive full-width presentation for that metric and its description.

---

## [0.3.4] - 2026-09-02

### Fixed & Enhanced
- **Projected Net Worth Calculation Consistency**:
  - Fixed an apples-to-oranges calculation bug on the `Projected Net Worth` overview tile where month-end net worth (which omitted accounts with `include_in_net: false`) was being compared against starting holdings that unconditionally added all savings, causing a phantom deficit equal to the entire savings portfolio.
  - Aligned Projected Net Worth and starting holdings to evaluate total household financial position across all holdings (Current + Savings - Credit) consistently, accurately reflecting real net worth and monthly net accumulation.
  - Updated 3-Month Forward Outlook cards to project consolidated net worth identically.
- **Account Tracking Modal Default Net Check**:
  - Fixed account tracking checkbox initialization in `openAccountTrackingModal` to use `include_in_net !== false` instead of truthy check, preventing unconfigured accounts from unintentionally saving as excluded from Net Position.
- **Overview Metric Tile Refinements**:
  - **Savings Growth**: Formatted negative savings movement cleanly with `-£X.XX` rather than `£-X.XX`.
  - **Safe-to-Spend Daily Pace**: Dynamically calculates calendar days remaining in the active week when intra-week live pacing is not active.
  - **Active Week Discretionary Budget**: Added spent and remaining budget breakdown in card subtitle when pacing/actuals are tracked.
  - **Emergency Runway**: Properly factors overdrafts into liquid reserves calculation and ensures infinite runway (`∞`) renders with positive green styling.
  - **Savings Rate**: Accurately displays `Projected Deficit: -£X` in red when outflows exceed inflows instead of clamping to zero.
  - **Upcoming 14-Day Bills**: Improved due-date calculation using calendar day midnight comparisons to prevent late-evening false omissions, and added deduplication.
- **Tile Customization & Gesture Safety**:
  - Integrated mobile touch and drag gesture isolation when Global Edit Mode is active.

---

## [0.3.3] - 2026-09-02

### Added & Enhanced
- **Forecast Overview Dashboard**:
  - Added a Material Design 3 Forecast Overview page highlighting key metrics from weekly and monthly cashflow forecasting.
  - Positioned as the first page on the monthly view (`⚡ Overview` pill).
  - Auto-selects this Overview dashboard upon launching the app or clicking the HABit logo.
  - Removed startup auto-scrolling to the current week card, presenting a clean top-level overview first.
  - Features a Payday Cycle Hero Banner with progress track, 5 elevated MD3 KPI cards (Projected Net Worth, Current Cash, Credit Runway & Utilization, Savings Portfolio & Growth, Safe-to-Spend Daily Pace), Active Week Spotlight, Weekly Cashflow Runway, Monthly Cashflow Inflows vs Outflows distribution, Upcoming 14-Day Bills countdown, and a 3-Month Forward Horizon outlook.
- **Mobile Responsive Enhancements**:
  - Implemented smooth horizontal swipe-snapping for the Multi-Week Runway and 3-Month Horizon cards on mobile devices.
  - Added robust null-safety guards and parameter validations in `calculateLiveDailyPacing` and bill date resolvers.
  - Optimized layouts with responsive 2x2 grids, word-wrapping, and text truncation to eliminate horizontal page overflow on small viewports.

---

## [0.3.2] - 2026-09-02

### Fixed & Enhanced
- **Current Week Auto-Scroll Alignment**: Updated `scrollToCurrentWeek` to align the scroll viewport with the top of the current week card and its first account (`block: 'start'`) instead of centering the card, ensuring the week header, scheduled items, and primary account are immediately visible without being cut off.

---

## [0.3.1] - 2026-09-02

### Added & Enhanced
- **Occasions & Birthday Filtering**: Added segmented filter controls (`All`, `Soon` [next 30 days], `Upcoming`, `Past`) with live count badges, defaulting to "Soon".
- **Live Spends Column Sorting & Filtering**: Added interactive column header click-to-sort (ascending/descending) and per-column filtering for Date, Payee / Merchant, Account, Owner, Category, and Amount expressions.

---

## [0.3.0] - 2026-09-02

### Added & Enhanced
- **Modular Per-Year Storage Engine**: Decoupled monolithic storage into a lightweight `settings.json` and isolated `budget_YYYY.json` year files. Automatically migrates existing datasets with zero manual intervention and loads historical or future years on-demand.
- **Multi-Year Cascade Propagation**: Propagating scheduled bills or recurring inflows from any active month automatically updates remaining months of the year, updates permanent Master Templates in `settings.json`, and cascades to all 12 months of existing future years with automatic cashflow rollover rebalancing.
- **Unified All-Years Backup & Restore**: "Export Full Backup" compiles all years, settings, and Open Banking transactions across your entire dataset into a single portable `.json` file; "Import Backup" automatically unpacks and restores them to modular storage.
- **Mobile Touch Navigation & Gestures**:
  - Horizontal swipe pagination for fast month-to-month flipping with directional slide transitions.
  - Left-edge swipe ($\le 30\text{px}$) for opening the Settings Side Sheet.
  - Pull-to-Refresh MD3 spinner at scroll top for bank and sensor sync.
  - Bottom navigation bar horizontal swipe to switch primary sections.
- **Material Design 3 Settings Side Sheet**: Redesigned side panel with 4-theme pill grid, elevation styling, direct link to full settings view, backup actions, and clean footer branding.

---

## [0.2.3] - 2026-09-02

### Fixed & Enhanced
- **Viewport Scroll Reset on Tab Switches**: Navigating between tabs (`Monthly`, `Budgets`, `Bills`, `Spend`, `Year`, `Settings`) and switching months or subtabs now cleanly resets viewport scroll to top (`scrollTop = 0`).
- **Clean Scheduled Bills Master Table**: Removed redundant month-specific `Due`/`Cleared` badges from the Scheduled & Recurring master schedule table while preserving execution badges on the Monthly Overview.

---

## [0.2.2] - 2026-09-02

### Fixed & Enhanced
- **Instant Spend Recategorization Refresh**: Re-renders spend analytics immediately and synchronously upon modal confirmation, ensuring zero latency when updating transaction categories and merchant rules.
- **Weekly Ledger Recategorization**: Added interactive category badges directly into the Weekly Bank Transactions modal.
- **Title Bar & Logo Elastic Click Animation**: Restored interactive hover scale, tap feedback, and the spring pulse animation (`titlePulse`) when clicking the title bar/logo to return to the active cycle.
- **Chart.js Canvas Collision Safeguard**: Ensured reliable canvas lifecycle management when re-rendering spend donut charts.

---

## [0.2.1] - 2026-09-02

### Fixed & Enhanced
- **Mobile Header Left-Alignment**: Fixed flex expansion on `.logo-btn` and grouped the logo, drawer button, and month title snugly to the left of the mobile header.
- **Auto-Navigation & Smooth Centering on Startup**: The active payday month chip is now automatically centered in the sub-navigation pills bar on load and tab switches, with initial scroll focused on the current week.
- **Desktop vs Mobile Date & Title Heading Formats**:
  - **Desktop**: Renders full month names and complete 4-digit years (e.g. `December 2026`, `Budgets & Occasions 2026`, `Scheduled Bills 2026`).
  - **Mobile**: Automatically condenses headings to compact, space-saving titles (e.g. `Dec '26`, `Budgets '26`) and abbreviates the year selector button on tight viewports.

---

## [0.2.0] - 2026-09-02

### Added & Redesigned
- **Material Design 3 Navigation Hierarchy**: Restructured the entire interface into 3 core Material Design 3 destinations:
  - **Monthly Views & Cashflow**: Direct payday cycle sheets with dynamic weekly cashflow ledgers.
  - **Budgets & Bills**: Dedicated management for Annual Budgets, Occasions/Birthdays, and Scheduled Recurring Bills.
  - **KPIs & Analysis**: Visualized Live Spend Analytics, Category Breakdowns, and Year-End Trajectory Forecasts.
- **Collapsible Material Design 3 Desktop Navigation Rail**:
  - Full-height left rail extending from the top to bottom of the viewport on desktop screens ($\ge 900\text{px}$).
  - Dynamic icon swapping on toggle: fold-away (`panel-left-close`) icon when expanded, hamburger (`menu`) icon when collapsed into icons-only mode.
  - Natural multi-line label text wrapping under indicator pills in collapsed mode per MD3 specifications.
  - Persistent rail state across browser reloads via `localStorage`.
- **Streamlined Mobile Bottom Navigation**:
  - Compact 56px bottom navigation bar with vertical centering and refined safe-area padding (`env(safe-area-inset-bottom)`), eliminating empty dead space on mobile.
  - Floating Action Button (FAB `+`) dynamically anchored directly above the bottom bar.
- **Unified Individual Sub-Navigation Pills**:
  - Standardized all sub-views (Monthly selector, Budgets vs Bills, Spend vs Trajectory) on individual rounded pill chips (`.tab-btn.month-pill`) for a clean, consistent design language.
- **Automatic Home Assistant Ingress Full-Bleed Kiosk Mode**:
  - Automatically suppresses Home Assistant top ingress bars and header toolbars on startup, expanding HABit into a native full-viewport app experience.
- **Left-Anchored Settings & Tools Drawer**:
  - Redesigned Settings & Tools drawer to slide out from the left edge with glassmorphic backdrop elevation.

### Fixed
- **Factory Reset & Danger Button Contrast**: Fixed text color cascade on `.btn.red` so button text displays in high-contrast solid white.
- **Top App Bar Title Decoupling**: Decoupled the active month/section title (`#topBarMonthTitle`) from the desktop logo to ensure titles remain visible across all screen sizes.
- **Logo Theme Swapping**: Fixed theme selector specificity ensuring single active logo rendering in the top bar.

---

## [0.1.8] - 2026-09-02

### Fixed
- **Bill Matching Modal & Income/Expense Transaction Isolation**: Filtered manual match transaction list strictly to Incomes for income items (and Expenses for debit items) so debit expenses never appear when matching an income like Child Benefit.
- **Match Status Consistency in Modal**: Fixed recurring item clearance resolution when opened from the Scheduled Bills tab and eliminated contradictory "Due • Matched with..." labels when an occurrence is not yet cleared.

---

## [0.1.7] - 2026-09-02

### Fixed
- **Direct Debit & Bill Clearance Evaluation**: Restored clearance display for standard monthly bills and direct debits while retaining date-isolated clearance for flexible recurring templates.

---

## [0.1.5] - 2026-09-02

### Fixed
- **Recurring Bill & Multi-Cadence Occurrence Isolation**: Resolved an issue where clearing a multi-cadence recurring item (such as 4-weekly Child Benefit) in a historical cycle marked future months as cleared in advance. Clearance is now tracked strictly per occurrence date (`cleared_dates`).
- **Date Proximity in Transaction Linking**: Scheduled bill manual matching modal now prioritizes bank transactions closest in date to the specific occurrence.

---

## [0.1.4] - 2026-09-02

### Added
- **Open Banking & Automated Cashflow Synchronization**: Direct, local-first integration with GoCardless Bank Account Data (read-only PSD2 Open Banking for 2,500+ banks across UK and Europe) with zero cloud middleware.
- **Automated Bill Matching & Direct Debit Auto-Clearing**: Automatically detects posted transactions matching scheduled bills in the active payday cycle ($\pm 4$ days) and marks them `Paid` with a `⚡ Auto-Cleared` badge.
- **Weekly Live Spend Drawer & Micro-Ledgers**: Week cards now display live bank transactions and total tracked spend for that payday period with interactive transaction search.
- **Manual Check-In Precedence & Overrides**: Manual check-ins and edits now strictly override Open Banking sync balances, with live shortcut buttons and optional revert capabilities.
- **Payday Cycle-Aware Sync**: Background and client-side sync now accurately respects custom payday schedules and bank holidays, strictly updating the active current week.
- **Extensive Institution Browser (55+ Major Banks)**: Searchable institution browser with instant alias filtering (e.g. Amex, RBS, BOS, BOA, Citi, Co-op) across UK, US, Ireland, and Europe.
- **Resilient Bank Logos & Vector Badges**: Vector SVG bank assets with an automatic fallback monogram badge system ensuring zero broken image icons.

---

## [0.1.2a] - 2026-08-30

### Enhanced
- **Interactive Topbar Logo Navigation**: Clicking the HABit logo / Month Title acts as an intelligent Back button when inside settings or subviews, and smooth-scrolls + pulse-highlights the Current Week card when viewing the budget overview.

---

## [0.1.2] - 2026-08-30

### Added
- **Home Assistant Sensors Integration**: Real-time sensor synchronization (`sensor.habit_net_position`, `sensor.habit_days_until_payday`, `sensor.habit_current_balance`, `sensor.habit_credit_debt`, `sensor.habit_savings_total`, `sensor.habit_weekly_allowance_remaining`, and `sensor.habit_next_upcoming_bill`) for native Home Assistant dashboard cards and automations.
- **Modular Database Encryption**: AES-256-GCM authenticated encryption at rest with PBKDF2-HMAC-SHA256 key derivation and per-user salt hashing (zero plaintext PINs).
- **Single-PIN Envelope Multi-User Security**: Unlock personal accounts and shared joint household finances simultaneously in 1 PIN action.
- **Master Lock PIN for Single-User Mode**: Dedicated lock screen protection configurable in settings.
- **Interactive Documentation Links**: Clickable HABit logos in the top navigation bar and settings drawer linking directly to GitHub Help.
- **License Protection**: Updated repository license to **GNU Affero General Public License v3.0 (AGPLv3)**.

### Fixed
- **Add-on Linter & Schema Compliance**: Cleaned configuration schema to satisfy strict Home Assistant Supervisor linter standards.
- **Dynamic Lock Button**: Navigation padlock button now strictly hides when PIN security is disabled.

---

## [0.1.1] - 2026-08-29

### Added
- **Multi-User / Household Mode**: Toggle multi-user mode in onboarding and global settings to support individual household members with assigned personal accounts.
- **Active User Profile Selector**: Top navigation bar dropdown switcher (`Joint / Household`, `Person 1`, `Person 2`) that customizes dashboard perspectives in real time.
- **PIN Code Authentication for Personal Profiles & Salaries**: Optional 4-to-6 digit PIN protection on per-member profiles with interactive on-screen numeric keypad unlock modal and quick session locking.
- **Per-User Salary Privacy & Masking**: Mask salary figures with `••••••` on shared dashboard screens with instant eye (`👁️` / `🙈`) reveal toggles, while preserving 100% calculation accuracy behind the scenes.
- **Personal Account & Credit Card Weekly Tracking**: Assign bank accounts and credit cards to specific household members or joint finances with interactive user filtering and visual owner tags in the weekly view.

---

## [0.1.0] - 2026-08-29 (Initial Beta Release)

### Added
- **Payday-Anchored Monthly Budgeting**: Real-life financial cycles structured from payday to payday with automatic 4 or 5-week splits and date range display.
- **Multi-Theme Engine**: 4 built-in themes (**Dark Mode Charcoal**, **Navy Dark Deep Blue**, **Light Mode**, and **High Contrast**) with local storage persistence and zero white-flash on load.
- **Interactive Financial Calculator (`Alt+C`)**: Floating, draggable calculator with math parsing, calculation history, parentheses, percentage operations, and an interactive **Value Picker** allowing users to click numbers on screen into calculations.
- **Floating Action Button (FAB) Speed Dial**: Quick-access actions for instant balance check-in, weekly expense entry, and occasion purchases.
- **Bank Holiday Scheduling Engine**: Automatic working day adjustments for UK (England & Wales), UK (Scotland), US Federal, and Custom calendars.
- **Multi-Account Cashflow Tracking**: Real-time balance and net liquidity tracking for Current Accounts, Credit Cards (with limits and automatic autopay calculation), and Savings/ISA accounts.
- **Birthdays & Occasions Manager**: Per-person occasion budgets and gift spend tracking.
- **Scheduled & Recurring Bills**: Monthly direct debits, transfers to savings, and annual bills.
- **Year Overview & Analytics**: Annual dashboard with interactive Chart.js charts and projections.
- **Data Management**: Full JSON data export/import, year archiving, and Home Assistant backup integration.
- **Multi-User / Household Mode**: Toggle multi-user mode in onboarding and global settings to support individual household members with assigned personal accounts.
- **Active User Profile Selector**: Top navigation bar dropdown switcher (`Joint / Household`, `Person 1`, `Person 2`) that customizes dashboard perspectives in real time.
- **PIN Code Authentication for Personal Profiles & Salaries**: Optional 4-to-6 digit PIN protection on per-member profiles with interactive on-screen numeric keypad unlock modal and quick session locking.
- **Per-User Salary Privacy & Masking**: Mask salary figures with `••••••` on shared dashboard screens with instant eye (`👁️` / `🙈`) reveal toggles, while preserving 100% calculation accuracy behind the scenes.
- **Personal Account & Credit Card Weekly Tracking**: Assign bank accounts and credit cards to specific household members or joint finances with interactive user filtering and visual owner tags in the weekly view.
- **Multi-Architecture Support**: Official compatibility for `aarch64`, `amd64`, `armhf`, `armv7`, and `i386`.
- **Ingress Cache Buster**: Built-in cache-busting headers, build stamping, and `Clear-Site-Data` response handling.
