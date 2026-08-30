# Accounts & Credit Cards

HABit provides real-time cashflow and liquidity tracking across checking accounts, credit cards, savings pots, and cash wallets.

---

## 🏦 Supported Account Categories

```
┌────────────────────────────────────────────────────────────────────────┐
│                          HABit Account Engine                          │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Current / Checking│ Credit Cards      │ Savings & ISAs / Cash Pots     │
│ (Liquid Checking) │ (Debt & Autopay)  │ (Ringfenced Reserves)          │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

### 1. Current / Checking Accounts
- The primary transactional hub where income is deposited and Direct Debits / Standing Orders are deducted.
- Supports multiple current accounts (e.g. *Main Joint Checking*, *Personal Daily Spending*, *Bills Account*).

### 2. Credit Cards
- Tracks outstanding balances, credit limits, APR, and statement cycles.
- Features HABit's **Automatic Statement & Autopay Engine**.

### 3. Savings, ISAs & Emergency Pots
- Ringfenced reserve accounts excluded from daily discretionary allowances.
- Track interest growth, sinking funds, and monthly transfer targets.

### 4. Cash / Wallets
- Physical cash tracking for envelope spending or petty cash.

---

## 💳 Credit Card Autopay & Statement Calculation Engine

Managing credit card payments is one of HABit's most powerful features. Instead of treating credit cards as isolated debt, HABit integrates statement balances directly into your monthly cashflow timeline.

### Autopay Modes:

| Mode | Calculation Formula | Usage |
| :--- | :--- | :--- |
| **Full Statement Balance** | $	ext{Payment} = 	ext{Statement Balance}$ | For users who pay off their card in full every month to avoid interest. |
| **Minimum Payment** | $	ext{Payment} = \max(	ext{Fixed Min}, 	ext{Balance} 	imes 	ext{Min \%})$ | Minimum required payment to stay compliant with lender terms. |
| **Fixed Monthly Amount** | $	ext{Payment} = \min(	ext{Balance}, 	ext{Fixed Amount})$ | For structured debt payoff plans (e.g., paying £250/month until cleared). |

### Automatic Direct Debit Scheduling
When you configure a credit card with an autopay date (e.g. *Paid on the 10th of every month via Direct Debit from Main Checking*):
1. HABit automatically schedules the credit card payment as an upcoming bill in that month's cashflow calendar.
2. The payment amount is deducted from the checking account and credited against the credit card balance.
3. Your **Net Position** and **Safe-to-Spend Allowance** reflect the upcoming deduction so you are never caught off guard.

---

## 🔄 Multi-Account Transfers & Balance Check-Ins

### Instant Balance Check-In
Bank balances change throughout the week due to everyday debit card spending. With HABit's **Quick Check-In** (available via the `+` Floating Action Button):
1. Click **Balance Check-In**.
2. Enter your current online banking balance for your checking account(s).
3. HABit immediately reconciles the difference as discretionary weekly spend, adjusts your remaining allowance for the week, and updates your Home Assistant sensors in real time!

### Inter-Account Transfers
Easily log transfers between accounts (e.g., moving £300 from *Current Account* to *Emergency Savings*):
- Automatically records a debit from the source account and a credit to the destination account.
- Preserves accurate historical cashflow records across all months.
