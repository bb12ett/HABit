<div align="center">

# 💰 HABit — Household Budget Planner

### *A private, payday-anchored household cashflow and budget manager for Home Assistant*

[![Home Assistant Add-on](https://img.shields.io/badge/Home%20Assistant-Add--on-blue.svg?logo=home-assistant&logoColor=white)](https://www.home-assistant.io/)
[![Beta Release](https://img.shields.io/badge/version-0.1.0--beta-yellow.svg)](https://github.com/bb12ett/HABit/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Ingress](https://img.shields.io/badge/ingress-supported-success.svg)](#)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20local-brightgreen.svg)](#)
[![Architectures](https://img.shields.io/badge/arch-aarch64%20%7C%20amd64%20%7C%20armhf%20%7C%20armv7%20%7C%20i386-orange.svg)](#)

<br/>

[![Open your Home Assistant instance and show the add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badge/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fbb12ett%2FHABit)

</div>

---

> [!NOTE]
> **HABit is currently in Public Beta (`v0.1.0-beta`)**. Feedback, feature suggestions, and bug reports are warmly welcomed on [GitHub Issues](https://github.com/bb12ett/HABit/issues)!

---

## 🌟 Why HABit?

Most traditional budgeting tools force you into rigid 1st-to-31st calendar months. But real life doesn't work that way — **most households budget from payday to payday**.

**HABit** is built from the ground up to reflect how you actually manage money:
- **Anchored to your Payday**: Every monthly cycle starts on the day your salary arrives.
- **Dynamic 4 or 5-Week Breakdown**: Accurately accounts for varying week counts per pay period with exact date ranges.
- **Multi-Account Projections**: Tracks Current Accounts, Credit Cards, and Savings/ISAs in real time.
- **Credit Card Autopay Intelligence**: Automatically computes scheduled card payoffs (full balance or fixed amounts) from your current account in designated weeks.
- **Bank Holiday Smart Shifts**: Direct debits and recurring bills automatically shift forward or backward when falling on weekends or public holidays (UK England & Wales, UK Scotland, US Federal).
- **Interactive Financial Calculator**: Press `Alt+C` for a floating on-screen calculator with an interactive **Value Picker** that lets you click any number on your budget to calculate with it!
- **100% Local & Private**: No cloud accounts, no subscription fees, no bank API scraping, and zero telemetry. All data stays strictly on your Home Assistant machine.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 📅 **Payday Schedules** | Automatically generates monthly cycles anchored to your custom payday day (e.g. the 26th) with dynamic 4/5 week splits. |
| 💳 **Multi-Account Tracking** | Live tracking of Current Accounts, Credit Cards (with credit limits and autopay rules), and Savings / Investment accounts. |
| 🧾 **Scheduled Bills & Direct Debits** | Manage recurring monthly and yearly bills with holiday shift rules (Previous/Following working day) and direct transfers to savings accounts. |
| 🛒 **Weekly Variable Envelopes** | Plan weekly allowances (Groceries, Fuel, Misc, Cash), log actual spends, and move items across weeks with ease. |
| 🎂 **Birthdays & Occasions** | Dedicated gift planner with per-person budgets, gift notes, and status tracking. |
| 📊 **Year Overview & Analytics** | Interactive Chart.js charts comparing annual income, fixed commitments, weekly spend, and savings growth. |
| 🧮 **Built-in Calculator (`Alt+C`)** | Draggable, minimizable calculator featuring parentheses, percentages, history log, and a click-to-pick **Value Picker**. |
| ⚡ **Speed-Dial Floating Action Button** | Bottom-corner FAB menu for instant balance check-ins, quick expense logging, and birthday purchases. |
| 🎨 **4 Elegant Themes** | Switch between Dark Charcoal, Navy Dark, Light, and High Contrast themes without reload flashes. |
| 🛡️ **Zero Ingress Caching Issues** | Strict cache-busting headers, build stamping, and `Clear-Site-Data` ensure your updates always display instantly on mobile and desktop. |

---

## 🚀 Installation

### Option 1: 1-Click Install via "My Home Assistant" (Recommended)
Click the button below to add this repository directly to your Home Assistant instance:

[![Add Repository to My Home Assistant](https://my.home-assistant.io/badge/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fbb12ett%2FHABit)

### Option 2: Manual Installation via Add-on Store
1. Open your Home Assistant dashboard.
2. Go to **Settings** > **Add-ons** > **Add-on Store**.
3. Click the three vertical dots (**⋮**) in the top-right corner and select **Repositories**.
4. Paste the repository URL into the field:
   ```text
   https://github.com/bb12ett/HABit
   ```
5. Click **Add**, then close the dialog.
6. Refresh the store page, locate **HABit - Household Budget Planner**, and click **Install**.
7. Enable **Show in sidebar**, then click **Start**.
8. Open the **Budget** item in your sidebar or click **Open Web UI**.

---

## 🧙 First-Time Setup Wizard

When you open HABit for the first time, a 5-step setup wizard will guide you through:
1. **Appearance & Regional Settings**: Choose your theme, currency symbol (`£`, `$`, `€`, etc.), payday date, and bank holiday calendar.
2. **Household & Accounts**: Add household members, current accounts, credit cards, and savings pots.
3. **Monthly Direct Debits**: Add regular monthly commitments (Rent, Utilities, Council Tax, Subscriptions).
4. **Annual / Yearly Bills**: Add recurring annual bills (Insurance, TV licence, Subscriptions).
5. **Weekly Allowances**: Set baseline living budgets for food, fuel, and discretionary spending.

You can relaunch the setup wizard anytime or adjust individual settings in **Settings (☰)**.

---

## 🧮 Interactive Calculator & Value Picker

HABit includes an integrated financial calculator designed for budgeting workflows:
- **Shortcut**: Press **`Alt + C`** anywhere to toggle the calculator.
- **Value Picker Mode**: Click **"Pick Value"** in the calculator header, then click any budget figure on the screen. The number will be instantly typed into the calculator!
- **Calculation History**: Review past expressions and re-use results with a single click.
- **Minimize to Badge**: Minimize the calculator to keep it ready while scrolling through weeks.

---

## 🔒 Privacy & Data Storage

- **Storage Location**: All configuration, account data, and budget history are saved to `/data/budget.json` inside the add-on container.
- **Persistent & Isolated**: The `/data` partition is managed by Home Assistant Supervisor and persists across add-on updates, container rebuilds, and system reboots.
- **Manual Backups**: You can export a standalone `.json` backup file anytime via **Settings (☰) > Export Data**, or restore an existing one with **Import Data**.
- **Home Assistant Backups**: Full and partial Home Assistant supervisor backups automatically include all your HABit data.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python 3.11, Flask, RESTful JSON API
- **Frontend**: Vanilla JavaScript (ES6+ modular architecture), CSS Grid & Flexbox, Chart.js
- **Container**: Lightweight Alpine Linux container with multi-arch support (`aarch64`, `amd64`, `armhf`, `armv7`, `i386`)
- **Integration**: Native Home Assistant Ingress with sidebar panel support

---

## 💻 Local Development / Standalone Execution

You can also run HABit locally outside of Home Assistant for development:

```bash
# 1. Clone the repository
git clone https://github.com/bb12ett/HABit.git
cd HABit

# 2. Install dependencies
pip install flask

# 3. Start the application
python app.py

# 4. Open in browser
# http://localhost:8099
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
- Feel free to check the [issues page](https://github.com/bb12ett/HABit/issues).
- Fork the repository, create your feature branch (`git checkout -b feature/amazing-feature`), and submit a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

<div align="center">
  <sub>Built with ❤️ for the Home Assistant Community by bb12ett</sub>
</div>
