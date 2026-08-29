# Home Assistant Add-on: HABit (Household Budget Planner)

**HABit** is a powerful, privacy-first household budget and cashflow planner designed specifically for Home Assistant. Unlike standard calendar-month budget apps, HABit anchors your financial cycles around your **real payday**, splitting every month into structured weekly budget periods, tracking multi-account projected cashflows, automating credit card autopay settlements, and managing recurring bills with bank holiday shift intelligence.

---

## Table of Contents

1. [Installation & Quick Start](#installation--quick-start)
2. [First-Time Setup (Wizard)](#first-time-setup-wizard)
3. [Core Concepts & Features](#core-concepts--features)
   - [Payday Cycles & Dynamic Weekly Splits](#1-payday-cycles--dynamic-weekly-splits)
   - [Account Tracking & Credit Autopay](#2-account-tracking--credit-autopay)
   - [Weekly Envelopes & Actual Spend](#3-weekly-envelopes--actual-spend)
   - [Scheduled Bills & Direct Debits](#4-scheduled-bills--direct-debits)
   - [Birthdays & Occasions Manager](#5-birthdays--occasions-manager)
   - [Year Overview & Cashflow Analytics](#6-year-overview--cashflow-analytics)
   - [Interactive Calculator & Value Picker](#7-interactive-calculator--value-picker)
   - [Floating Action Button (FAB) Speed Dial](#8-floating-action-button-fab-speed-dial)
4. [Data Storage, Backup & Privacy](#data-storage-backup--privacy)
5. [Appearance & Themes](#appearance--themes)
6. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Installation & Quick Start

1. In your Home Assistant instance, navigate to **Settings** > **Add-ons** > **Add-on Store**.
2. Click the three-dot menu (**⋮**) in the top right corner and select **Repositories**.
3. Add the repository URL: `https://github.com/bb12ett/HABit` and click **Add**.
4. Find **HABit - Household Budget Planner** in the add-on store and click **Install**.
5. Once installed, enable **Show in sidebar** and click **Start**.
6. Open **Budget** from your Home Assistant sidebar (or click **Open Web UI**).

---

## First-Time Setup (Wizard)

When you open HABit for the first time, the **Setup Wizard** will guide you through setting up your household budget in 5 easy steps:

### Step 1: Regional & Appearance Preferences
- **Theme**: Select your preferred interface theme (*Dark Mode Charcoal*, *Navy Dark*, *Light Mode*, or *High Contrast*).
- **Currency Symbol**: Enter your local currency symbol (e.g., `£`, `$`, `€`, `kr`, `¥`).
- **Payday Day of Month**: The calendar day your salary is paid (e.g. `26`). HABit uses this to structure your monthly cycles.
- **Bank Holiday Region**: Choose your holiday calendar (*UK England & Wales*, *UK Scotland*, *US Federal*, or *None*) so bill due dates automatically shift if they land on a weekend or bank holiday.
- **Track Savings & Investments**: Toggle savings and ISA portfolio tracking on or off.

### Step 2: Household & Accounts
- **Household Members**: Add the people in your home (e.g. *Person 1*, *Person 2*).
- **Current Accounts**: Add your main transactional bank accounts (e.g. *Joint Account*, *Personal Checking*).
- **Credit Cards**: Configure credit accounts with limits and optional **Autopay Rules** (automatic full balance payoff or fixed sum from a selected current account in week 1, 2, 3, 4, or 5).
- **Savings Accounts**: Add emergency funds, savings pots, or investment ISAs.

### Step 3: Fixed Bills & Direct Debits
- Enter your regular monthly commitments (Rent/Mortgage, Utilities, Broadband, Council Tax, Insurance, Savings transfers).

### Step 4: Annual & Periodic Bills
- Configure bills that occur once or twice a year (Car Insurance, TV Licence, Road Tax, Subscriptions) and assign them to specific calendar months.

### Step 5: Weekly Living Budgets
- Set baseline weekly allowances for living expenses (Food/Groceries, Fuel/Transport, Cash, Miscellaneous) and assign which account they are paid from.

---

## Core Concepts & Features

### 1. Payday Cycles & Dynamic Weekly Splits
Most households get paid on a specific day of the month (e.g. the 26th), making standard calendar-month budgets awkward. HABit structures every budget month from **Payday to the day before the next Payday**.

Each monthly cycle is dynamically divided into **4 or 5 full calendar weeks** (Week 1 through Week 4 or 5) with exact date ranges shown in the top meta-bar:
- Direct debits and standing orders automatically drop into their corresponding week based on their due date and bank holiday rollover rules.
- Income is credited in Week 1 to fund the cycle.

### 2. Account Tracking & Credit Autopay
HABit provides real-time cashflow projection across all your accounts:
- **Current Accounts**: Starting balance, incoming salary, outgoing weekly spending, direct debits, and credit card autopay settlements.
- **Credit Accounts**: Tracks weekly spending on cards, running balance against your credit limit, and schedules autopay debits.
- **Savings Accounts**: Tracks monthly contributions, manual top-ups, and portfolio growth.
- **Net Position**: Instant summary of your total household liquidity (Current + Savings - Credit Card Debt).

### 3. Weekly Envelopes & Actual Spend
Every week features an interactive table:
- **Planned vs. Actual**: Enter your planned budget and record actual spend as receipts come in.
- **Account Assignment**: Specify whether an expense was paid via Credit Card, Debit Card, or Cash.
- **Move Items**: Seamlessly move expenses between weeks if plans change.

### 4. Scheduled Bills & Direct Debits
- Manage monthly direct debits and standing orders.
- Transfer rules: Set a direct debit to transfer money directly into a savings/ISA account.
- **Bank Holiday Rules**: Choose whether payments due on a weekend or public holiday shift to the *Following Working Day* or *Previous Working Day*.

### 5. Birthdays & Occasions Manager
- Keep track of family birthdays, anniversaries, and holiday gift budgets.
- Set budget allocations per person, track gift ideas, and record actual spending against the budget.

### 6. Year Overview & Cashflow Analytics
- Annual dashboard showing all 12 payday cycles at a glance.
- Visual charts powered by Chart.js comparing monthly income, fixed outgoings, weekly variable spend, and savings growth.
- Year-end net savings projections.

### 7. Interactive Calculator & Value Picker
Press **`Alt + C`** (or click the 🧮 Calculator button in the top bar) to open the built-in financial calculator:
- Supports arithmetic expressions, parentheses, percentages, and sign toggles.
- **Value Picker Mode**: Click "Pick Value", then click any number anywhere on your budget screen to pull it directly into your calculation!
- **History Log**: Review recent calculations and re-insert results with one click.
- **Draggable & Minimizable**: Move the calculator anywhere on your screen or minimize it to a floating badge.

### 8. Floating Action Button (FAB) Speed Dial
On both mobile and desktop, click the floating **`+`** button in the bottom right corner for quick-action shortcuts:
- **Quick Balance Check-In**: Rapidly update current account balances.
- **Quick Weekly Expense**: Log a purchase immediately into the current week.
- **Quick Birthday Spend**: Record a gift purchase.
- **Quick Budget Transaction**: Add a custom transaction envelope.

---

## Data Storage, Backup & Privacy

- **100% Local**: HABit runs entirely within your Home Assistant environment. No data is sent to external servers, cloud services, or telemetry endpoints.
- **Persistent Location**: Your budget database is stored safely at `/data/budget.json` on your Home Assistant disk, persisting across add-on updates and restarts.
- **Export / Import**:
  - Open **Settings (☰)** > **Export Data** to download a complete `.json` backup file anytime.
  - Use **Import Data** to restore or migrate your budget between Home Assistant instances.
- **Home Assistant Backups**: HABit data is fully included in standard Home Assistant supervisor backups.
- **Year Archiving**: At the start of a new calendar year, click **Archive Year** to lock past year records and generate clean templates for the new year.

---

## Appearance & Themes

HABit includes 4 custom-crafted themes with high readability:
- 🌘 **Dark Mode (Charcoal)**: Refined dark theme with slate and blue accents.
- 🌌 **Navy Dark (Deep Blue)**: Deep midnight blue palette.
- ☀️ **Light Mode**: Clean, high-clarity daylight theme.
- ⬛ **High Contrast**: Maximum contrast accessibility theme.

Switch themes anytime via the **Settings (☰)** side drawer or in the Setup Wizard. Themes are saved locally in your browser and will never flash white on reload.

---

## Troubleshooting & FAQ

### Q: Changes don't appear after updating the add-on
**A:** HABit includes automated build-stamping and cache-busting headers. If your browser or Home Assistant Companion App is holding onto an older cached version:
1. Hard-refresh the page (`Ctrl + F5` on Windows/Linux or `Cmd + Shift + R` on Mac).
2. On mobile, pull down to refresh or clear the Home Assistant Companion App cache.

### Q: How do I change my payday or currency after initial setup?
**A:** Click the **Settings (☰)** button in the top right, navigate to **Global Settings**, and update your Payday date, Currency symbol, or Holiday region. Click **Save Settings**.

### Q: Can I run HABit on Raspberry Pi (ARM) and x86_64 systems?
**A:** Yes! HABit is packaged with multi-architecture support for `aarch64` (Raspberry Pi 3/4/5 64-bit, Home Assistant Green/Yellow), `amd64` (Intel/AMD NUC, Proxmox, x86_64 VMs), `armhf`, `armv7`, and `i386`.

### Q: How do I perform a complete reset?
**A:** Open **Settings (☰)** > Scroll to the bottom > Click **⚠️ Factory Reset**. This will erase existing data and relaunch the Onboarding Wizard. (Always export a backup first!).

---

## Support & Contributing

- **Issues & Bug Reports**: Submit tickets on [GitHub Issues](https://github.com/bb12ett/HABit/issues).
- **Feature Suggestions**: Open an idea in [GitHub Discussions](https://github.com/bb12ett/HABit/discussions).
- **License**: Released under the [MIT License](https://opensource.org/licenses/MIT).
