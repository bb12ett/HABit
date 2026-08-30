# Annual Trajectory & Analytics

The **Year** tab in HABit provides bird's-eye visibility into your household's annual financial trajectory, net worth growth, and cashflow projections across all 12 budget cycles.

---

## 📈 12-Month Cashflow Projections

HABit computes real-time forecasts across your entire financial year:

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

---

## 📊 Interactive Visual Analytics (Chart.js)

HABit includes embedded interactive data visualizations:

1. **Net Worth & Liquidity Trend**: Visualizes the growth of your combined checking and savings balances vs. outstanding credit card debt.
2. **Monthly Expense Breakdown**: Visual donut and bar charts breaking down your fixed bills, living costs, and savings transfers.
3. **Savings Rate Indicator**: Calculates your percentage of income saved per month:
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
