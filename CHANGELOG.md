# Changelog

All notable changes to the **HABit (Household Budget Planner)** add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Multi-Architecture Support**: Official compatibility for `aarch64`, `amd64`, `armhf`, `armv7`, and `i386`.
- **Ingress Cache Buster**: Built-in cache-busting headers, build stamping, and `Clear-Site-Data` response handling.
