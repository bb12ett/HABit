# Open Banking & Bank Synchronization Guide

HABit features a powerful, local-first **Open Banking & Automated Cashflow** engine that bridges your real-world bank transactions, credit card spend, and live balances directly into your payday budget.

Whether you prefer automated daily sync via Open Banking APIs or **100% offline statement drag-and-drop** without registering any developer accounts, HABit gives you full control with zero cloud middleware.

---

## 🧭 Why Open Banking in HABit?

Traditional budgeting apps upload your bank credentials and financial history to proprietary cloud databases. HABit takes a strictly **local-first approach**:

```
┌─────────────────────────────────────────────────────────────┐
│                    HOME ASSISTANT HOST                      │
│                                                             │
│   ┌────────────────┐      ┌─────────────────────────────┐   │
│   │  HABit Core    │◄────►│  Automated Reconciliation   │   │
│   │  (Local Flask) │      │  - Direct Debit Match (±4d) │   │
│   └───────┬────────┘      │  - Weekly Spend Drawer      │   │
│           │               │  - Sensor Sync Engine       │   │
│           ▼               └──────────────┬──────────────┘   │
│   Local SQLite / Encrypted Data          │                  │
└───────────┼──────────────────────────────┼──────────────────┘
            │ Direct HTTPS (Zero Cloud)    │
            ▼                              ▼
 ┌──────────────────────┐       ┌──────────────────────┐
 │  Open Banking APIs   │       │ Offline Statements   │
 │  (TrueLayer,         │       │ (.CSV, .OFX, .QIF)   │
 │   Enable Banking,    │       │ Drag & Drop          │
 │   SimpleFIN)         │       │                      │
 └──────────────────────┘       └──────────────────────┘
```

1. **Automated Direct Debit & Bill Clearing**: Automatically detects when scheduled bills (e.g. Council Tax, Energy, Broadband, Mortgage) post to your bank account and marks them `Paid` with a `⚡ Auto-Cleared` badge.
2. **Weekly Live Spend Drawer**: Inspect real transactions that took place during each specific payday week.
3. **Multi-User Privacy**: Assign synced bank accounts to specific household members or shared joint finances.
4. **Home Assistant Sensors**: Pushes updated balances to `sensor.habit_net_position` and `sensor.habit_current_balance` in real time.

---

## 🌍 Regional Provider Matrix: Choosing the Right Provider

> [!IMPORTANT]
> **Provider Support Status:**
> - **🇬🇧 TrueLayer**: **Supported & Verified** (Primary recommended provider for UK accounts, current accounts, savings, and credit cards).
> - **🧪 Enable Banking / GoCardless / SimpleFIN**: **Experimental** (Community-contributed integrations).
> - **📁 Direct Statement Importer**: **100% Free & Local** (Works offline with statements from any bank worldwide).

| Provider | Status & Region | Supported Banks | Access & Cost |
| :--- | :--- | :--- | :--- |
| **[TrueLayer](#1-truelayer-setup-recommended-for-uk-banks)** | 🟢 **Supported & Verified** *(UK)* | Monzo, Starling, Revolut, Barclays, HSBC, Lloyds, NatWest, Santander, Halifax, Nationwide, Amex, Tesco, Chase UK, etc. | **Free Developer Tier** |
| **[Enable Banking](#2-enable-banking-setup-recommended-for-european-banks)** | 🧪 **Experimental** *(UK & Europe)* | BNP Paribas, Crédit Agricole, Deutsche Bank, N26, ING, BBVA, Santander ES, CaixaBank, Intesa, etc. | **Free Developer Tier** |
| **[GoCardless](#3-gocardless-bank-account-data-setup)** | 🧪 **Experimental** *(UK & Europe)* | European & UK Banks (Existing accounts) | **Free Developer Tier** |
| **[SimpleFIN Bridge](#4-simplefin-bridge-us--canada)** | 🧪 **Experimental** *(US & Canada)* | Chase US, Bank of America, Wells Fargo, Citi, Capital One, Discover, etc. | **$1.50/mo or $15/yr** |
| **[Offline Statement Importer](#5-offline-bank-statement-import-100-free--local)** | 📁 **Supported** *(Worldwide)* | **Every Bank Worldwide** (.csv, .ofx, .qif exports) | **100% Free & Local** |

---

## 🌐 Redirect URIs & HTTPS Requirements (Crucial for Home Assistant)

> [!IMPORTANT]
> **Production banking APIs strictly mandate HTTPS for all Redirect URIs.**
> 
> Developer consoles (TrueLayer, Enable Banking) will reject plain `http://` addresses like `http://homeassistant.local` or `http://192.168.1.xxx` in production mode. Additionally, when you authorize on your phone via your bank's app, the phone requires a valid public HTTPS address to return to Home Assistant over 4G/5G mobile networks.

### Supported Redirect URI Formats:

| Home Assistant Setup | Recommended Redirect URI Format | Supported Providers |
| :--- | :--- | :--- |
| **Custom Domain / Reverse Proxy** *(e.g. Cloudflare / DuckDNS)* | `https://home.yourdomain.uk` or `https://yourhome.duckdns.org:8123/` | TrueLayer, Enable Banking, GoCardless |
| **Home Assistant Cloud (Nabu Casa)** | `https://[your-unique-id].ui.nabu.casa/` | TrueLayer, Enable Banking, GoCardless |
| **Tailscale / Wireguard (with HTTPS)** | `https://your-node.tailscale.net/` | TrueLayer, Enable Banking |
| **Strictly Local LAN (Plain HTTP only)** | *Use the [Offline Statement Importer](#5-offline-bank-statement-import-100-free--local) instead!* | **Zero URLs, Domains, or API Keys Needed** |

---

## 1. TrueLayer Setup (Recommended for UK Banks)

[TrueLayer](https://truelayer.com/) is London-based and is the UK's leading FCA-regulated Open Banking provider. It natively integrates with the UK CMA9 ecosystem and challenger banks.

### Step-by-Step Console Walkthrough:

```
┌─────────────────────────────────────────────────────────────┐
│  TrueLayer Developer Console (console.truelayer.com)        │
├─────────────────────────────────────────────────────────────┤
│  Top Environment Toggle:   [ Sandbox ]  [ LIVE  ◄ (Select) ]│
│                                                             │
│  App Settings:                                              │
│  • App Name:               HABit Budget                     │
│  • Products:               [✓] Data API (Account Information│
│  • Permissions:            [✓] info, accounts, balance, txns│
│  • Allowed Redirect URIs:  https://home.yourdomain.uk       │
│                                                             │
│  Credentials:                                               │
│  • Client ID:              habit-live-xxxxxxxx              │
│  • Client Secret:          ••••••••••••••••••••••••         │
└─────────────────────────────────────────────────────────────┘
```

1. **Register Developer Account**:
   - Go to the [TrueLayer Developer Console](https://console.truelayer.com/) and create a free account.

2. **Switch to LIVE Mode (Crucial!)**:
   - In the top banner of the TrueLayer Console, toggle the environment switch from **Sandbox** to **LIVE**.
   - *(Note: Sandbox mode only generates fake test bank data; Live mode enables real UK bank authentication).*

3. **Create an App & Enable Data API**:
   - Click **Create App** (e.g. Name: `HABit Home Assistant`).
   - Under **Products**, ensure **Data API (Account Information)** is enabled.
   - Under **Permissions / Scopes**, check `info`, `accounts`, `balance`, and `transactions`.

4. **Set Allowed Redirect URIs**:
   - Under **App Settings ➔ Allowed Redirect URIs**, enter your Home Assistant HTTPS URL (e.g. `https://home.yourdomain.uk` or your Nabu Casa URL).

5. **Copy Credentials**:
   - Copy your **Client ID** (e.g. `habit-app-live-94a21`).
   - Click **Generate Secret** and copy your **Client Secret**.

6. **Configure HABit**:
   - In HABit ➔ **Settings (⚙️)** ➔ **Open Banking & Automated Cashflow**:
   - Check **Enable Open Banking Integration**.
   - Set **Integration Provider**: `TrueLayer (UK Specialist - OAuth2 Bank Feeds)`.
   - Paste your **Client ID** into *Client ID*.
   - Paste your **Client Secret** into *Client Secret*.
   - Click **💾 Save API Keys**.

7. **Connect Your UK Bank**:
   - Click **+ Connect Bank Account**.
   - Select `🇬🇧 UK` and click your bank (e.g. *Monzo, Barclays, Starling, HSBC, Lloyds, NatWest, Santander, Halifax, Nationwide, Amex*).
   - If Multi-User mode is enabled, choose the **Account Owner** (`Joint` or specific persona).
   - Authorize via your bank's mobile app or website.

---

## 2. Enable Banking Setup (Recommended for European Banks)

[Enable Banking](https://enablebanking.com/) is regulated under the Finnish Financial Supervisory Authority (FIN-FSA) and provides free developer access to 2,500+ European (EU/EEA) banks.

### Step-by-Step Form Walkthrough:

```
┌─────────────────────────────────────────────────────────────┐
│  Add a new application                                      │
├─────────────────────────────────────────────────────────────┤
│  1. Choose your application's environment:                  │
│     [ Sandbox ]   [ Production  ◄ (Selected) ]              │
│                                                             │
│  2. Choose how to generate a private RSA key & certificate: │
│     (•) Generate in the browser (using SubtleCrypto)        │
│         and export private key                              │
│     ( ) Generate outside browser & import certificate       │
│                                                             │
│  3. Fill out information about your application:            │
│     • Application Name:   HABit                             │
│     • Redirect URL:       https://home.yourdomain.uk        │
│     • Developer/Company:  HABit                             │
│     • Email:              your-email@example.com            │
│     • Privacy URL:        (Optional - leave blank or repo)  │
│     • Terms URL:          (Optional - leave blank or repo)  │
│                                                             │
│     [ Register ]                                            │
└─────────────────────────────────────────────────────────────┘
```

1. **Step 1 — Environment**:
   - In **1. Choose your application's environment**, select **`Production`**.

2. **Step 2 — RSA Key Generation**:
   - Select **`Generate in the browser (using SubtleCrypto) and export private key`**.

3. **Step 3 — Application Information**:
   - **Application Name**: Enter `HABit` (or `HABit Budget`).
   - **Redirect URL / Domain**: Enter your public Home Assistant HTTPS URL (e.g. `https://home.yourdomain.uk` or your Nabu Casa URL).
   - **Company / Developer Name**: Enter `HABit`.
   - **Email**: Enter your contact email.
   - **Privacy / Terms URL**: *(Optional)* Leave blank or enter `https://github.com/bb12ett/HABit`.

4. **Step 4 — Register & Download Key**:
   - Click the green **`[ Register ]`** button.
   - Save the automatically downloaded **`private.key`** file.
   - Copy the **`Application ID`** (UUID string) shown in your dashboard.

5. **Step 5 — Enter Credentials in HABit**:
   - In HABit **Settings (⚙️)** ➔ select `Enable Banking (UK & Europe - Free PSD2 Developer Access)`.
   - Paste your **Application ID** and the text of your **`private.key`**.
   - Click **💾 Save API Keys** ➔ **+ Connect Bank Account**.

---

## 3. GoCardless Bank Account Data (Existing Accounts)

For users who already have an account on the GoCardless / Nordigen developer portal:

1. **Log in**: Go to [bankaccountdata.gocardless.com/overview/](https://bankaccountdata.gocardless.com/overview/).
2. **Environment**: Ensure you are in the **Live** portal.
3. **User Secrets**: Navigate to **User Secrets** ➔ click **+ Create new** ➔ copy **Secret ID** and **Secret Key**.
4. **Configure HABit**: In HABit **Settings (⚙️)** ➔ select `GoCardless (Existing Developer Accounts)`, paste keys, and save.

---

## 4. SimpleFIN Bridge (US & Canada)

For US, Canadian, or global users who prefer a single setup token:

1. **Sign Up**: Go to [bridge.simplefin.org](https://bridge.simplefin.org/) ($1.50/month or $15/year).
2. **Connect Banks**: Link your checking, savings, and credit cards in SimpleFIN.
3. **Generate Token**: Copy your **Access URL / Setup Token**.
4. **Configure HABit**: In HABit **Settings (⚙️)** ➔ select `SimpleFIN Bridge (US / Canada / International)`, paste the token, and save.

---

## 5. Offline Bank Statement Import (100% Free & Local)

If your Home Assistant is **strictly local HTTP only** or you do **not** wish to create developer accounts or configure external HTTPS URLs, you can export statements directly from your bank and drag & drop them into HABit with zero third parties:

```
┌─────────────────────────────────────────────────────────────┐
│  📁 Import Bank Statement (Offline CSV / OFX / QIF)         │
├─────────────────────────────────────────────────────────────┤
│  Target Account: [ Checking: Joint Checking      ▼ ]        │
│  Account Owner:  [ 👥 Joint / Shared             ▼ ]        │
│                                                             │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│                       📄                                    │
│       Click or Drag & Drop Bank Statement                   │
│       Supports .CSV, .OFX, .QFX, and .QIF files             │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
└─────────────────────────────────────────────────────────────┘
```

### How to Download Statements from Major Banks:

| Bank | Download Path in Online Banking / Mobile App | Recommended Format |
| :--- | :--- | :--- |
| **Monzo** | App ➔ Tap Account ➔ **Statement & History** ➔ **Export & Download** | `.CSV` or `.QIF` |
| **Starling** | App ➔ Account Details ➔ **Statements** ➔ **Statement of Transactions** ➔ Export | `.CSV` |
| **Barclays** | Web Portal ➔ **View Statements & Activity** ➔ **Export transactions** | `.CSV` or `.OFX` |
| **HSBC UK** | Web Portal ➔ Account Details ➔ **Manage** ➔ **Download Transactions** | `.CSV` or `.OFX` |
| **Lloyds / Halifax** | Web Portal ➔ Select Account ➔ **Download Transactions** ➔ Internet Banking Format | `.CSV` or `.OFX` |
| **NatWest / RBS** | Web Portal ➔ **Statements & Transactions** ➔ **Download Transactions** | `.CSV` or `.OFX` |
| **Chase UK** | App ➔ Profile Icon ➔ **Statements & Documents** ➔ Export Activity | `.CSV` |
| **American Express** | Web Portal ➔ **Statements & Activity** ➔ **Download Activity** | `.CSV` or `.OFX` |

### Uploading into HABit:
1. In HABit, click **📥 Import Statement** from the **Overview** dashboard or **Settings**.
2. Select your **Target Account** (e.g. *Main Checking* or *Barclaycard*).
3. If Multi-User mode is enabled, assign the **Owner** (`Joint` or specific member).
4. Drag and drop your file.
5. HABit parses every transaction locally, assigns it to the matching payday week, and automatically marks matching Direct Debits as `Paid`!

---

## ⚡ Automated Bill Reconciliation Engine

HABit eliminates the chore of checking off recurring bills:

1. **±4 Days Date Window**: Automatically detects when bills clear earlier or later due to weekends and bank holidays.
2. **Amount Matching**: Compares statement transaction amounts against scheduled bill amounts.
3. **Fuzzy Payee Detection**: Automatically matches variations in bank statement references (e.g. `COUNCIL TAX BKL` matches `Council Tax Direct Debit`).
4. **`⚡ Auto-Cleared` Status**: Matching bills flip to `Paid` with a green badge, and the transaction is linked in the weekly spend drawer.

---

## 🛒 Live Spend & Category Analytics

HABit features a dedicated **Live Spend & Category Analytics** page accessible directly from the top navigation bar:

```
┌────────────────────────────────────────────────────────────────────────┐
│  🛒 LIVE SPEND & CATEGORY ANALYTICS             [This Month ▾] [🔄 Sync]│
├────────────────────────────────────────────────────────────────────────┤
│  [ Total Outgoings: £1,280 ]  [ Daily Burn Rate: £41/day ]  [ 84 Txns ]│
├────────────────────────────────────┬───────────────────────────────────┤
│  📊 SPEND BY CATEGORY (DONUT)      │  🏆 CATEGORY RANKING              │
│         ╭─────────╮                │  🛒 Supermarkets   £450 (35%) ━━━ │
│       ╭─╯         ╰─╮              │  ⛽ Fuel/Transport £180 (14%) ━━  │
│       │   CHART   │                │  ☕ Dining/Cafes   £140 (11%) ━   │
│       ╰─╮         ╭─╯              │  🛍️ Retail/Amazon  £120 (9%)  ━   │
│         ╰─────────╯                │  🏡 Bills/Utilities £390 (31%) ━━━│
├────────────────────────────────────┴───────────────────────────────────┤
│  🏪 TOP MERCHANTS: 1. Tesco (£320)  2. Shell (£120)  3. Costa (£42)    │
├────────────────────────────────────────────────────────────────────────┤
│  🧾 CATEGORIZED TRANSACTIONS STREAM                                    │
│  • 31 Aug • Tesco Superstore • -£42.50   [🛒 Supermarket & Groceries ▾]│
│  • 30 Aug • Shell Petrol     • -£60.00   [⛽ Fuel & Transport       ▾]│
│  • 29 Aug • Costa Coffee     • -£4.20    [☕ Dining & Takeaways     ▾]│
└────────────────────────────────────────────────────────────────────────┘
```

### Key Features:
1. **Automated Merchant Classification**: Automatically categorizes UK and international merchants into 9 core categories:
   - 🛒 **Supermarket & Groceries** (Tesco, Sainsbury's, Asda, Aldi, Lidl, Waitrose, M&S, etc.)
   - ⛽ **Fuel & Transport** (Shell, BP, Esso, Trainline, TfL, Uber, Parking, etc.)
   - ☕ **Dining, Cafes & Takeaways** (Costa, Starbucks, Greggs, McDonald's, Deliveroo, Pubs)
   - 🛍️ **Shopping & Retail** (Amazon, eBay, Argos, Primark, Boots, TK Maxx, B&Q, Currys)
   - 🎮 **Entertainment & Media** (Netflix, Spotify, Disney+, PlayStation, Cinema)
   - 🏡 **Bills & Utilities** (Council Tax, British Gas, Octopus, Broadband, Water)
   - 🏥 **Health & Personal** (Gyms, PureGym, Pharmacy, Barber, Dentist)
   - ✈️ **Travel & Holidays** (Airlines, Airbnb, Hotels, Booking.com)
   - 🔄 **Transfers & Card Payments** (Credit Card payoff, internal transfers)
2. **Interactive Chart.js Donut & Progress Bars**: Proportional donut breakdown and ranked spending bars.
3. **Custom Categorization Rules**: Click any transaction category tag to reclassify it and check *"Always categorize future transactions from [Merchant]"* to save persistent custom rules.
4. **Timeframe & Account Filtering**: Filter instantly between This Week, This Month, Last Month, Last 30 Days, or Full Year, across all accounts or specific credit cards.

---

## 🔒 Security & Privacy Architecture

- **100% Local Storage**: Tokens, credentials, and transaction histories reside purely within Home Assistant (or encrypted SQLite).
- **Read-Only AIS**: Open Banking protocols only allow read access. HABit cannot move money or create transfers.
- **90-Day Renewal**: Due to PSD2 regulatory standards, Open Banking consents expire every 90 days. HABit warns you when renewal is approaching so you can re-authenticate with 1 click.
