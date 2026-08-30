# Changelog

All notable changes to the **HABit (Household Budget Planner)** add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
