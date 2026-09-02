# Budgets & Occasions

HABit combines structured **Category Budget Envelopes**, a real-time **Live Daily Pacing Engine**, and a dedicated **Birthdays & Occasions Manager** to ensure special events and weekly discretionary spending never derail your household's financial goals.

---

## 🎯 Category Budget Envelopes

Budget envelopes represent your ongoing living expenses, categorized for clear tracking:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Category Budget Envelopes                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 🛒 Groceries &    │ 🚗 Fuel &         │ 🍽️ Dining &                   │
│   Supermarket     │   Transportation  │   Entertainment                │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 🏠 Home Repairs & │ 🐾 Pet Care &     │ 🎁 Miscellaneous &             │
│   Maintenance     │   Veterinary      │   Discretionary                │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

### Safe-to-Spend Weekly Allowance Formula
Unlike traditional apps that give you a single unguided lump sum for the whole month, HABit divides your remaining discretionary pool evenly across the **active 4 or 5 weeks** in your payday cycle:

$$\text{Discretionary Pool} = \text{Starting Balance} + \text{Total Income} - \text{Total Bills} - \text{Target Savings}$$

$$\text{Weekly Safe-to-Spend} = \frac{\text{Discretionary Pool}}{\text{Number of Weeks in Month (4 or 5)}}$$

This ensures that whether a month has 4 weeks or 5 weeks, your weekly spending limit is mathematically calibrated to prevent cash shortfalls before payday.

---

## ⚡ Live Daily Pacing & Predicted Net Cash Position

When Open Banking or Daily Variance tracking is enabled, HABit computes your **Live Daily Pacing** for the active week:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ WEEK 2 SUMMARY BAR                                                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Week Outgoings: £485.00  │  Predicted Net Today (Day 3/7): £1,240.50 (🟢 On Track)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### How Daily Pacing Works:
1. **Elapsed Days Ratio**: Determines the exact progress through the 7-day week (e.g. `Day 3 of 7`).
2. **Paced Discretionary Target**: Allocates $( \text{Elapsed Days} / \text{Total Days} )$ of your weekly discretionary allowance up to today.
3. **Factoring Cleared Bills**: Combines actually cleared Direct Debits with your daily spending pace to predict exactly what your net cash position should be *today*.
4. **Instant Drift Detection**: If unexpected spending occurs, the indicator shifts to amber or red, alerting you before the week ends.

---

## 🎂 Birthdays & Occasions Manager

Special events—birthdays, anniversaries, weddings, Christmas, and summer holidays—are often the primary cause of budget overruns. 

HABit provides a dedicated **Occasions Manager** inside the **Budgets** section:

```
[ Occasion: Christmas 2026 ] ──> Total Budget: £1,200 | Spent: £450 | Remaining: £750
  ├── 🎁 Alex: Budget £150 | Spent £120 (Smart Watch) [Purchased ✅]
  ├── 🎁 Sam: Budget £150 | Spent £0 [] [Pending ⏳]
  ├── 🎁 Kids: Budget £500 | Spent £330 (Lego, Books) [Purchased ✅]
  └── 🎄 Food & Hosting: Budget £400 | Spent £0 [] [Pending ⏳]
```

### Key Features:
1. **Per-Person Gift Tracking**: Assign specific budget caps to individual recipients within an event.
2. **Purchase Status Tracking**: Mark gifts as `Planned`, `Purchased`, or `Wrapped` with item notes.
3. **Timeline Forecasting**: Occasion spending is distributed across the months leading up to the event so you don't absorb a massive spike in a single payday cycle.
4. **Occasion Speed Dial Entry**: Quickly log an occasion purchase directly from the mobile FAB button (`+`).

