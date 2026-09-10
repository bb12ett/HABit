# Changelog

All notable changes to the **HABit (Household Budget Planner)** add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.20] - 2026-09-10

### Fixed
- **🧹 Root Cause Elimination of Phantom Historical Years (2014–2025) & Clean Archive Manager**:
  - **Identified & Eliminated Definitive Root Cause**: Pinpointed the origin of phantom historical years to commit `0b6be9b` (Sept 9, 19:34). In that commit, cross-boundary annual bill queries evaluated `startY = schedule.startDate.getFullYear()`, which in January 2026 evaluated to December 2025 (`startY = 2025`). Because `getYearData(year)` silently instantiated `appState.data.years[year]` whenever any non-existent year was queried, querying 2025 created a blank 2025 record. When `calculateAndSyncRollovers()` iterated through `appState.data.years`, January 2025 evaluated `startY = 2024`, creating 2024. Each calculation cycle recursively cascaded backwards all the way to 2014. Furthermore, whenever 2025 was deleted, the next recalculation for 2026 immediately called `getYearData(2025)` and resurrected it.
  - **Sealed Auto-Creation at the Root**: Updated `getYearData(year, autoCreate = false)` and boundary lookups in `calculations.js` (`computeMonthClosing`, `getDDsForWeek`) to strictly prohibit auto-creating historical years (`< currentYear`) during read queries, breaking the backward cascade and permanently preventing phantom year resurrection.
  - **Removed Phantom UI Friction & Clutter**: Removed all symptomatic phantom year banners, "Clean Empty Years" buttons, and warning badges from the Archive Manager modal. Because root cause prevention is combined with silent startup auto-pruning, historical phantom years are cleaned automatically without requiring user intervention or cluttering the interface.
  - **Fixed Storage & Deletion Reliability**: Added `.del()` and `.delete()` aliases to `IndexedDBStore` ensuring IndexedDB storage deletes cleanly without errors. Prevented server `load_data` (in `app.py`) and client `LocalEngine.fetchBudget` (in `api.js`) from recreating missing historical years.
  - **Active Forecast Horizon Protection**: Ensured future projection years within the active sliding forecast window (e.g. 2028 when configured with `months_in_advance: 18` extending from September 2026 into March 2028) are strictly protected and never treated as empty or eligible for deletion.
  - **Foldable Year Accordions in Archive Manager**: Made year sections in the Archive & History Manager collapsible cards with interactive headers and toggle chevrons (`▼ / ▶`). The active year defaults to expanded while future and historical years default to collapsed, avoiding UI clutter. Added at-a-glance archived month count badges (`X of 12 archived`) and one-click `Expand All` / `Collapse All` header controls with state persistence across month archive actions.
  - **Clean Archive Manager Experience**: Archive Manager displays only the user's active and forecast window years in clean descending chronological order (`2028, 2027, 2026`) with month visibility toggles and a discreet `🗑️ Delete Year` action button only for obsolete historical years.

---

## [0.3.19] - 2026-09-09

### Added
- **💐 Movable Calendar Occasions & Computus Rules**:
  - Added support for dynamic, movable holidays in Birthdays & Occasions that move annually based on astronomical and liturgical calendars, including **UK Mother's Day (Mothering Sunday - 4th Sunday of Lent, Easter - 21 days)**, **Father's Day (3rd Sunday in June)**, **US / International Mother's Day (2nd Sunday in May)**, **Easter Sunday**, **Good Friday**, **Easter Monday**, **Black Friday**, **Cyber Monday**, and **Thanksgiving**.
  - Implemented `getOccasionDate(occasion, year)` helper in `calculations.js` which dynamically resolves movable date rules to their exact day and month for any budget year.
  - Added Date Schedule Type selector in the Add, Edit, and Convert Transaction modals with live multi-year date preview and automatic preset name/category detection.
  - Added full dynamic occasion support to the Convert Transaction modal (`confirmConvertItem` and `onConvertOccasionRuleChange`), saving `date_rule` and computing year-specific dates across all budget years.
  - Updated rolling 365-day timeline and countdown in `budgets.js` to accurately calculate next year's occurrence using next year's shifted date rather than repeating the current date.
  - Added contextual occasion icons (💐, 👔, 🐣, ✝️, 🛍️, 🎄, 💍, 🎂) in overview cards, budget cards, and spend dialogs.
  - Preserved complete backward compatibility for standard fixed calendar dates.
- **🔦 Active Week Spotlight Cleared Transactions & Live Status Badges**:
  - Added visual cleared indicators to the **Active Week Spotlight** on the Overview page, distinctly marking paid direct debits and cleared inflows with green left border accents, subtle background highlights, and checkmark icons (`✅`).
  - Added interactive status badges (`✓ Cleared`, `⚠️ Due`, and `⏳ Upcoming`) allowing users to toggle a bill or transaction's cleared state directly from the Overview page.
  - Displayed bank-matched payee names (`Matched: [payee]`) and manual match shortcuts (`🔗`) when bank transaction integration is active.
  - Updated the "Bills Clearing" and "Expected Inflow" metric cards to show real-time progress ratios (e.g. `2 of 5 cleared (£320)`).
  - Included all scheduled transactions (both bills and expected inflows) in the active week spotlight feed in chronological order.

### Fixed
- **📱 Modal Layout & Selection Box Mobile Responsiveness**:
  - Resolved an issue on mobile viewports (smartphones / narrow screens) where long selection box option text (e.g. occasion names and schedule descriptions) prevented native `<select>` dropdowns and modal cards from resizing, causing horizontal overflow off the screen.
  - Added strict `width: 100% !important`, `max-width: 100% !important`, `min-width: 0 !important`, `box-sizing: border-box !important`, and `text-overflow: ellipsis` constraints to all modal selects, inputs, and container grid cells.
  - Added `overflow-x: hidden !important` to `.modal-box` and `.modal-body` to prevent horizontal spillage on small devices.

---

## [0.3.18] - 2026-09-09

### Fixed
- **🎄 Annual Recurring Payments across Payday Budget Boundaries**:
  - Resolved an issue where annual recurring payments falling near holiday payday boundary shifts (such as Christmas payments on Dec 24/25 belonging to January budget Week 1) were excluded because of nominal month name checks.
  - Updated `isRecurringDueInMonth` and weekly calculation methods (`getDDsForWeek`, `getIncomesForWeek`, `calculateMonthForecast`) to evaluate actual payment dates across candidate boundary years (`startY - 1` through `endY + 1`).
- **🔄 Multi-Item Composite Key Integrity & Deduplication**:
  - Fixed an issue where multiple recurring bills sharing the same description and month (e.g. two separate "Christmas Extra" payments on Dec 17 and Dec 24) collided due to checking only `desc` and `month`.
  - Replaced blind array-index cross-year updating in `editFullScheduledBill` and `deleteUnifiedScheduledBill` with composite key matching `(desc, month, due_day)`, preventing edits from altering unrelated bills.
  - Added occurrence deduplication in `getDDsForWeek` and `getIncomesForWeek` to guard against duplicate entries on identical dates.
  - Added automated state reconciliation on load (`reconcileYearlyRecurringCommitments`) to heal existing data, clean up duplicate items, and remove accidental monthly direct debits duplicating annual bills.

---

## [0.3.17] - 2026-09-09

### Fixed
- **🗓️ Spend Analytics Calendar Day Count & Burn Rate Accuracy**:
  - Corrected an off-by-one error in `spend_analytics.js` where the end date's `23:59:59` timestamp compounded with a `+ 1` day difference offset, causing custom date ranges (e.g. 2 days) to display as 3 days (and single days as 2 days).
  - Normalized both start and end timestamps to calendar midnight before computing date differences, ensuring accurate day counts across all custom and preset timeframes.
  - Corrected the **Daily Average Burn Rate** calculation (`grandTotal / dayCount`) so pacing metrics are divided by the true active day count.
  - Standardized date string parsing to prevent UTC timezone boundary shifts.
  - Adjusted `last_7_days`, `last_30_days`, and `last_90_days` presets to span exact calendar intervals inclusive of the current date.
  - Stepping custom date ranges forward or backward now advances by the exact day span without duplicate overlapping days.

---

## [0.3.16] - 2026-09-08

### Added & Enhanced
- **💳 True Payment & Purchase Date Resolution for Card & Bank Feeds**:
  - **Multi-Tier Payment Date Resolution**: Prioritizes the true customer transaction/purchase date over the bank statement clearing date (`bookingDate`) across all budget tracking, pacing, and spend analytics.
    - **Tier 1 (Direct Open Banking API)**: Inspects provider-level `transactionDate` / `transactionDateTime` (when returned by financial institutions).
    - **Tier 2 (Narrative / Payee Embedded Date Extraction)**: UK credit card providers (including Halifax, Lloyds, Bank of Scotland, MBNA) intentionally embed the true card purchase date in the statement remittance narrative (e.g. `, Transaction Date: 2026-09-01`). HABit automatically extracts and standardizes this date using pattern parsing.
    - **Tier 3 (Value Date)**: Utilizes `valueDate` / `valueDateTime` when it precedes or equals statement posting.
    - **Tier 4 (Fallback)**: Defaults to `bookingDate` when no earlier transaction date is specified.
  - **🧹 Clean Merchant & Payee Displays**:
    - Automatically cleans ugly bank remittance strings by stripping embedded narrative tokens (e.g. `, Transaction Date: 2026-09-01`) from `payee_name` and `merchant_name` across the UI, while preserving raw statement text in `raw_info` for full audit trails.
    - Cleaned transaction descriptions improve dictionary keyword matching and custom rule evaluations.
  - **📋 Preserved Statement Clearing Date & Dual Display**:
    - Stores the bank statement settlement date as `cleared_date`, ensuring full accounting reconciliation while tracking actual purchase day spending.
    - In **Spend Analytics**, the Date column displays the true purchase date, and dynamically displays a subtle secondary indicator (`Cleared: YYYY-MM-DD`) when clearing occurs on a subsequent day or after a weekend.
  - **🔄 Retroactive Normalization**:
    - Automatically scans and normalizes existing stored transactions on startup/load and during bank sync passes, instantly correcting credit card purchases that cleared across weekend or month boundaries.
  - **📁 Statement File Upload Parser Enhancement**:
    - Updated CSV, OFX, and QIF statement import parsers in both frontend and backend to detect embedded transaction dates and clean merchant titles on upload.

---

## [0.3.15] - 2026-09-08

### Added & Enhanced
- **💾 Instance-Linked Automated Backups & Cloud Sync**:
  - **Local Host & File Editor Access**: Added `map: ["config:rw", "share:rw"]` to add-on permissions, enabling direct visibility of snapshots in Home Assistant File Editor and Samba (`/config/habit_backups/` and `/share/habit_backups/`).
  - **Multi-Instance Isolation**: Automatically links backup subfolders and snapshot filenames to the add-on instance (`local_habit`, `1a6a99a4_habit`, or user-specified custom name). Prevents local testing builds and Git production builds from overwriting each other.
  - **Isolated Retention Pruning**: Rolling retention policies now prune snapshots strictly within their own instance subfolder, protecting production backups from test environments.
  - **Unified Snapshot Browser**: Settings table detects and displays snapshots across current and sibling instances with clear instance identification badges, supporting 1-click restore and direct file download.
  - **☁️ Microsoft OneDrive Cloud Sync**: Integrated zero-config OAuth 2.0 Device Code login with automatic token refresh, uploading backups to `/Apps/HABit_Backups/{instance_id}/` with cloud retention management.
  - **📁 Google Drive Cloud Sync**: Added headless Google Cloud Service Account integration for scheduled automated cloud uploads.
  - **Modal Fix**: Standardized modal popup initialization for cloud authorization within Home Assistant Ingress.

---

## [0.3.14] - 2026-09-06

### Added & Enhanced
- **📱 Spend Analytics Responsive Mobile Layout**:
  - **Pinned Stepper Controls**: Unified `[ ◀ ]`, the payday range badge, and `[ ▶ ]` in a dedicated, no-wrap stepper row (`.spend-stepper-controls`). Prevents navigation arrows from breaking onto separate rows on mobile screens.
  - **Structured 3-Tier Toolbar**: Streamlined the date control toolbar from a 6-row wrapped layout into 3 balanced rows (Stepper row, Preset dropdown & quick actions, and full-width Date range pickers).
  - **Balanced Header Action Grid**: Aligned the account selector and action buttons (`🌐 Update Dictionary`, `🔄 Sync Bank`) into a symmetrical 2-column grid on mobile, removing orphaned button wraps.
  - **Standardized KPI Cards**: Switched metric cards to standard `.kpi-title` and `.kpi-val` classes with ellipsis protection to prevent multi-line category names from clipping subtitles.
  - **FAB & Scroll Clearance**: Halved the vertical footprint of top controls, moving KPI cards safely above the floating action button (`+`) upon initial page load and expanding bottom scroll padding.
- **⚙️ Relocated Danger Zone & Factory Reset**:
  - Moved **⚠️ Factory Reset** from the sidebar drawer to a dedicated **⚠️ Danger Zone** panel at the bottom of **Full Application Settings**.
  - Prevents accidental database wipes when browsing themes or navigation options in the sidebar, while providing clear warning guidance and backup recommendations.

---

## [0.3.13] - 2026-09-04

### Added & Enhanced
- **🔄 Period & Weekly Changeover Auto-Sync for Open Banking**:
  - Introduced automatic bank synchronization right before tracked period and weekly check-in changeovers.
  - Syncs at a configurable evening cutoff (defaults to **11:00 PM / 23:00** on Sunday nights and payday eve) to lock in the most accurate closing balances and transactions before rolling into the next week or payday period.
  - **Coexists with Timed Interval Sync**: Can run alongside periodic interval sync (e.g. every 6 hours), standalone, or disabled.
  - **Granular Scope Toggles**: Selectively enable changeover sync for:
    - `📅 Weekly Check-Ins`: Synchronize every Sunday evening prior to Monday morning check-in.
    - `🎯 Payday Period End`: Synchronize on the closing evening of the payday period prior to the next payday cycle starting.
  - **Configurable Cutoff Time**: Easily choose the changeover sync hour (20:00, 21:00, 22:00, 23:00, 23:30, 23:45) from Settings → Open Banking.
  - **Intelligent Duplicate Prevention**: Automatically tracks `last_changeover_sync_date` to ensure changeover sync fires exactly once per changeover date, even if server restarts or manual syncs occur.

---

## [0.3.12] - 2026-09-04

### Added & Enhanced
- **🔄 Convert Payment to Direct Debit / Scheduled Recurring or Birthday / Occasion**:
  - Added a dedicated **Convert** (`🔄`) button to every payment entry row in Edit Mode on monthly tabs.
  - Seamlessly convert ad-hoc weekly payments into:
    - **Direct Debit / Scheduled Recurring**: Supports ongoing Monthly Direct Debits, Weekly, Bi-Weekly, 4-Weekly, Quarterly, Annual/Yearly bills, or Custom intervals, complete with due day, holiday rule, and transfer destinations. Automatically handles Scheduled Payments In for income items.
    - **Birthday or Occasion**: Create a new Birthday/Occasion budget or attach the payment as logged gift spend to an existing occasion.
  - Includes a pre-checked option to safely remove the original weekly payment upon conversion, automatically recalibrating rolling balances and pacing with zero double counting.
- **📱 Responsive 2-Tier Card Layout for Payment Edit Rows**:
  - Moved action buttons (`🔄 Convert`, `↔ Move`, `✕ Delete`) onto their own dedicated row beneath the inputs.
  - Enlarged buttons to 32px height with touch-friendly tap targets and distinct role-tinted styling.
  - Expanded description edit boxes to take the full remaining card width, eliminating cramped inputs and awkward text wrapping.

---

## [0.3.11] - 2026-09-04
- **⚡ Master Scheduled Commitments Hub (`Scheduled Bills`)**:
  - Transformed the Bills view from a single calendar year into a consolidated, rolling Master Commitments Hub.
  - Added real-time Burn Rate KPI cards: Monthly Fixed Commitments, Monthly Scheduled Inflow, Net Regular Cashflow, and Total Annual Commitments.
  - Dynamic Next Due Date countdown badges (`🚨 Today!`, `⏳ Tomorrow`, `in 3d`, etc.) with holiday and weekend adjustment rules.
  - Contract & deal window tracking (`start_date` and `end_date`) with live timeline badges and automatic month filtering.
  - Horizon Synchronization: added `syncMasterBillsAcrossHorizon()` and a 1-click **🔄 Sync All Sliding Months** button to instantly propagate master bills across all active and future months in the multi-year sliding window.
- **🎉 Rolling 365-Day Budgets & Occasions Hub (`Budgets & Occasions`)**:
  - Re-architected Birthdays & Celebrations into a continuous 365-day rolling timeline. Dates that have passed in the current calendar year wrap seamlessly to the next year with live countdowns rather than showing "Passed this year".
  - Added smart filter pills: `All`, `⏳ Next 30 Days`, `📅 Next 90 Days`, `🗓️ Next 365 Days`, and `⏪ Passed Recently (Last 30 Days)`.
  - Multi-Year Milestone Budgets & Sinking Funds: dynamic calculation of `monthly_spread` across calendar year boundaries (e.g. Sep '26 to Jun '27 = 10 months) with live Pacing Allocation badges (`📊 Pace: £X/mo (Y mos remaining)`).
- **📅 Custom Timespans in Spend Analytics & Payday Cycle Alignment**:
  - Replaced the fixed button bar with a flexible Timespan Toolbar featuring period stepping (`◀` / `▶`), native date pickers, quick offset chip (`⚡ -12 Mo`), and dynamic date range badges.
  - "This Month", "Last Month", and stepping automatically align with monthly payday cycle boundaries rather than arbitrary calendar month boundaries.
- **📈 Rolling 12-Month Annual Trajectory & Dedicated Savings Forecast Chart**:
  - Annual Trajectory transformed into a rolling 12-month window with interactive timeline scrubber, stepping buttons, and gesture swipe/scroll controls.
  - Dedicated Savings Chart inside the Annual Trajectory view with planned target curves, recorded actual check-ins, and forward compound growth trend forecasts with account switcher pills.
- **⌨️ Desktop Arrow Navigation & Smooth Touch-Gesture Animations**:
  - Added keyboard arrow key support (`ArrowLeft` / `ArrowRight`) and on-screen desktop arrow buttons flanking month pills, matching mobile touch swipe slide animations.
- **🔄 Unarchived Month Navigation Restoration**:
  - Restoring an archived month immediately adds it back into the top navigation bar pills and prevents auto-archive from hiding it.
- **✨ Clean Dynamic Topbar Titles**:
  - Removed calendar year suffixes from Overview, Budgets & Occasions, Scheduled Bills, Annual Trajectory, and Live Spend & Categories for clean, multi-year dynamic views.

---

## [0.3.10] - 2026-09-04

### Added & Enhanced
- **🏖️ Holiday & Travel Windows ("Holiday Mode")**:
  - Introduced date-bounded Holiday Windows in Settings and Spend Analytics (e.g. *Cornwall: Sep 7 to Sep 14 on Credit Card*).
  - While active, transactions on the designated holiday card automatically categorize as **`✈️ Travel, Airlines, Hotels & Holidays`**, preserving clean regular monthly averages for dining, fuel, and groceries.
  - Transactions auto-categorized by a holiday window receive a clear visual badge: `🏖️ Cornwall Holiday`.
  - Internal debt payoffs, transfers, and salary remain fully protected and never miscategorize.
  - Includes visual status badges (`🟢 Active Now`, `⏳ Upcoming`, `Passed`, `⏸️ Disabled`) with quick toggles and delete controls.
- **⚡ Mass / Batch Recategorize Tool in Spend Analytics**:
  - Added multi-select checkboxes to the table header and all transaction rows in Spend Analytics.
  - Interactive Batch Toolbar displaying selected count, category dropdown, and one-click **Apply** button to update dozens of transactions in seconds.

---

## [0.3.9] - 2026-09-03

### Added & Enhanced
- **Dedicated `🎁 Gifts, Birthdays & Occasions` Category**:
  - Added a dedicated 12th spending category with rich keywords covering card shops (`Moonpig`, `Card Factory`, `Clintons`), florists (`Interflora`, `Bloom & Wild`), toys/games (`Smyths Toys`, `The Entertainer`, `Hamleys`), hampers, and gift experiences (`Virgin Experience Days`, `Buyagift`).
  - Integrated with the **Birthdays** tab: all transactions clearing birthday items automatically inherit and categorize under **`🎁 Gifts, Birthdays & Occasions`**.
- **Category Inheritance on Annual Budgets**:
  - Added a **Category** selector to Annual Budgets with real-time title auto-detection (e.g. *Holiday/Trip* ➔ `✈️ Travel`, *Christmas* ➔ `🎁 Gifts`, *Car MOT/Service* ➔ `⛽ Transport`, *Home DIY/Garden* ➔ `🛍️ Shopping`).
  - Transactions matched to annual budgets automatically inherit that budget's category rather than being misclassified as generic "Bills".
- **Reimbursements & Refunds Offsetting in Spend Analytics**:
  - Positive transactions assigned to a spending category (e.g. shared holiday reimbursements, store returns, or cashback) now intelligently offset category totals (e.g. £760 Airbnb minus £380 reimbursement = £380 net Travel spend).
  - Reimbursements display with green amounts and an informative `↩️ Refund / Offset` badge in the Categorized Transactions list.
  - Standard salary and general account transfers in remain excluded so regular income never distorts spending charts.
- **Spend Category on Scheduled Outgoings**:
  - Added Spend Category selector to the Scheduled Outgoings / Direct Debits creation form in the Bills view.
- **Precedence Hierarchy & Direct Debit Keyword Refinement**:
  - Removed generic `"direct debit"` keyword from `transfers.json` so regular contractual direct debits (e.g. Council Tax, utilities) aren't misidentified as internal transfers.
  - Refined precedence so genuine retail/travel merchants (e.g. Airbnb, Smyths Toys) always take priority over bill matching.

---

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
