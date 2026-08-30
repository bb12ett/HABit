# Installation & Getting Started

This guide walks you through installing **HABit** on Home Assistant, setting up your environment, and completing the Onboarding Wizard.

---

## 📦 System Requirements & Architecture Support

HABit is distributed as an official Home Assistant Add-on container supporting standard architectures:
- **`aarch64`** (Raspberry Pi 4 / 5, ODROID, Home Assistant Yellow/Green, ARM64 servers)
- **`amd64`** (Intel / AMD x86_64 NUCs, Proxmox VMs, standard PC servers)

---

## 🛠️ Step 1: Adding the Add-on Repository to Home Assistant

1. Open your Home Assistant dashboard.
2. Navigate to **Settings** > **Add-ons** > **Add-on Store** (bottom-right button).
3. In the top-right corner, click the **Three Dots (⋮)** and select **Repositories**.
4. Paste the HABit GitHub URL into the repository input:
   ```text
   https://github.com/bb12ett/HABit
   ```
5. Click **Add**, then click **Close**.
6. Refresh your browser page. **HABit - Household Budget Planner** will appear in the repository list.

---

## 🚀 Step 2: Installing and Starting the Add-on

1. Click on the **HABit** card in the Add-on Store.
2. Click **Install** (the container will download and initialize).
3. Once installed, configure the toggle switches:
   - ✅ **Start on boot**: Enable so HABit runs automatically whenever Home Assistant starts.
   - ✅ **Watchdog**: Enable so Supervisor restarts HABit automatically if needed.
   - ✅ **Show in sidebar**: Enable to add a direct `Budget` icon (`mdi:cash-multiple`) to your Home Assistant sidebar.
4. Click **Start**.
5. Click **Open Web UI** to launch HABit inside Home Assistant Ingress.

---

## 🧙 Step 3: The Interactive Onboarding Wizard

When you launch HABit for the first time, you are greeted by the step-by-step Onboarding Wizard:

```
[ Step 1: Basics ] ──> [ Step 2: Pay Schedule ] ──> [ Step 3: Accounts ] ──> [ Step 4: Mode & Security ] ──> [ Ready! ]
```

### Step 1: Basic Preferences
- **Household Name**: Give your budget workspace a friendly name (e.g., *"The Miller Household"* or *"My Personal Budget"*).
- **Currency Symbol**: Select your currency (`£` GBP, `$` USD, `€` EUR, `CA$` CAD, `A$` AUD, `CHF` Swiss Franc, `¥` JPY, etc.).
- **Currency Formatting**: Select thousand separators and decimal displays.

### Step 2: Primary Pay Schedule & Bank Holidays
- **Pay Frequency**: Choose your income schedule:
  - `Monthly (Fixed Date)`: e.g. Paid on the 25th of every month.
  - `Monthly (Last Working Day)`: Automatically calculates the final business day of the month.
  - `Monthly (Specific Weekday)`: e.g. 4th Friday of the month.
  - `4-Weekly`: Paid every 28 days (13 paychecks per year).
  - `Bi-Weekly / Fortnightly`: Paid every 14 days (26 paychecks per year).
  - `Weekly`: Paid every 7 days (52 paychecks per year).
- **Bank Holiday Calendar**: Select your regional bank holiday rule:
  - `UK (England & Wales)`
  - `UK (Scotland)`
  - `US Federal`
  - `None / Custom`
- **Holiday Adjustment Rule**: If your payday falls on a weekend or bank holiday, specify whether pay arrives on the **Previous Working Day** (most common) or **Next Working Day**.

### Step 3: Accounts & Initial Balances
Enter your current financial accounts to establish your baseline cash position:
- **Current Accounts**: Main checking accounts used for income and direct debits.
- **Credit Cards**: Enter current balances, credit limits, APR, and statement payment rules.
- **Savings & ISAs**: Enter cash pots and emergency funds.

### Step 4: Household Mode & Security
- **Single-User Mode**: Simple, focused budget for a single person.
  - *Optional*: Set a **Master PIN** to encrypt your database at rest with AES-256-GCM.
- **Multi-User Household Mode**: Supports individual partners/roommates + shared joint finances.
  - Specify member names (e.g. `Alex` and `Sam`).
  - Configure individual PINs for privacy and masked salaries.

### Step 5: Finish & Launch
Click **Complete Setup**. HABit will automatically calculate all 12 monthly budget cycles, schedule your direct debits, and publish your live sensor entities into Home Assistant!

---

## 🔄 Standalone Docker Installation (Alternative)

If you are running HABit outside of Home Assistant (e.g. standard Docker or Docker Compose):

```yaml
version: "3.8"

services:
  habit:
    image: ghcr.io/bb12ett/habit:latest
    container_name: habit
    restart: unless-stopped
    ports:
      - "8099:8099"
    environment:
      - APP_PORT=8099
    volumes:
      - ./habit_data:/data
```
