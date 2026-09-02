# Annual Trajectory & Spend Analytics

The **Analysis** section in HABit combines high-level **Annual Cashflow Projections** with granular, real-time **Live Spend & Category Analytics** to give you 360-degree visibility over your household's financial trajectory.

---

## 🛍️ Live Spend & Category Analytics

Accessible via **Analysis** ➔ **Live Spend & Categories**, this dashboard analyzes every transaction synced via Open Banking or imported from bank statements:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LIVE SPEND & CATEGORIES DASHBOARD                                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [📅 Timeframe: This Month ▾]  [🏦 Account: All Accounts ▾]  [👤 User: Joint ▾]         │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ 🛒 Total Spend           │ 🧾 Transactions          │ ⚡ Avg Daily Spend               │
│ £1,428.50                │ 42                       │ £47.62 / day                     │
├──────────────────────────┴──────────────────────────┴──────────────────────────────────┤
│ 📊 Donut Chart Visualization     │ 🏆 Category Ranking (Ranked by Total Spend)        │
│ [ 🍩 Interactive Chart.js Donut ]│ 🛒 Groceries:      £540.20 (37.8%) [████████░░]    │
│                                  │ 🍔 Dining & Cafes: £285.00 (19.9%) [████░░░░░░]    │
│                                  │ ⛽ Transport:      £160.00 (11.2%) [██░░░░░░░░]    │
│                                  │ 🛍️ Shopping:       £145.30 (10.2%) [██░░░░░░░░]    │
├──────────────────────────────────┴─────────────────────────────────────────────────────┤
│ 🏪 Top Merchants in Period                                                             │
│ 1. Tesco (£320.50)  2. Sainsbury's (£180.20)  3. Shell (£110.00)  4. Amazon (£95.40)   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🧾 Categorized Transactions (Filter: [All Categories ▾] [🔍 Search merchant...])       │
│ • 2026-09-02 | TESCO STORES 1234      | Checking | [🛒 Groceries ▾]     | -£45.20      │
│ • 2026-09-01 | SHELL PETROL STATION   | Credit   | [⛽ Transport ▾]     | -£60.00      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Standard Category Taxonomies
HABit includes a comprehensive, color-coded spending category system:
- 🛒 **Groceries & Supermarket** (`#10b981`)
- 🍔 **Dining, Cafes & Takeaway** (`#f59e0b`)
- ⛽ **Fuel, Transit & Parking** (`#38bdf8`)
- 🧾 **Utilities, Rent & Recurring Bills** (`#6366f1`)
- 🛍️ **Shopping & Retail** (`#ec4899`)
- 🎬 **Entertainment & Leisure** (`#8b5cf6`)
- 💊 **Health, Fitness & Pharmacy** (`#14b8a6`)
- ✈️ **Travel & Holidays** (`#06b6d4`)
- 🔄 **Transfers, ATM & Cash** (`#64748b`)
- 🎓 **Education & Childcare** (`#3b82f6`)
- 💳 **General & Miscellaneous** (`#94a3b8`)

---

### 2. Instant Recategorization & Custom Merchant Rules

When reviewing transactions in the table or weekly ledger:
1. Click the **Category Badge** (e.g. `[🛍️ Shopping ▾]`) on any transaction row.
2. Select your desired category from the modal (e.g. `🛒 Groceries & Supermarket`).
3. Check **Save as permanent rule for this merchant** to automatically assign all past and future transactions containing this merchant name.
4. **Instant Synchronous Refresh**: The view updates immediately with zero lag, recalculating totals, rankings, and donut charts instantly.

---

### 3. Open-Source Merchant Directory & GitHub Sync

HABit incorporates a smart merchant recognition dictionary with hundreds of UK, European, and US merchants:
- **Local Rule Priority**: Your custom personal rules in `Settings` ➔ `Personal Merchant Rules` always take highest precedence.
- **🌐 Sync from GitHub**: In **Settings**, click **Sync from GitHub** to fetch the latest community-contributed merchant catalog.
- **Contribute Suggestions**: When recategorizing, check **Suggest this merchant categorization to the HABit community** to queue the mapping for upstream inclusion.

---

## 📈 12-Month Cashflow Projections & Net Worth

Accessible via **Analysis** ➔ **Annual Trajectory**, HABit computes real-time forecasts across your entire 12-month financial year:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        12-Month Trajectory Map                         │
├─────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│ Month   │ Total Income │ Total Bills  │ Discretionary│ End Cash Balance│
├─────────┼──────────────┼──────────────┼──────────────┼─────────────────┤
│ Jan     │ £3,800       │ £2,150       │ £1,200       │ £4,950 ↗        │
│ Feb     │ £3,800       │ £2,400 (Ins) │ £1,200       │ £5,150 ↗        │
│ Mar     │ £3,800       │ £2,150       │ £1,200       │ £5,600 ↗        │
│ ...     │ ...          │ ...          │ ...          │ ...             │
│ Dec     │ £4,200 (Bon) │ £3,100 (Xmas)│ £1,500       │ £7,800 🏆       │
└─────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
```

### Key Metrics:
1. **Net Worth & Liquidity Curves**: Visualizes the growth of your combined checking and savings balances vs. outstanding credit card debt over time.
2. **Planned vs. Actual Savings Curve**: Compares scheduled savings deposits against actual verified account balances.
3. **Savings Rate Metric**:
   $$\text{Savings Rate} = \left( \frac{\text{Total Monthly Savings Transfers}}{\text{Total Net Income}} \right) \times 100\%$$

---

## 🗄️ Multi-Year Archiving & Data Management

### Multi-Year Navigation
- Seamlessly switch between years using the **Year Selector** dropdown in the top navigation bar.
- Archive completed prior years (`Archive Year` toggle) to protect historical accounting from accidental edits while keeping all reports accessible.

### Full JSON Data Portability
- **Export Backup**: Download your complete financial dataset as an encrypted or standard JSON file with one click.
- **Restore Backup**: Migrate your budget between Home Assistant instances effortlessly.
- **Zero Lock-In**: You own 100% of your data at all times.

