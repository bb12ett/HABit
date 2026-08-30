# Payday Cycles & Calendar Engine

The core foundation of **HABit** is its dynamic **Payday-Anchored Scheduling Engine**. 

Traditional personal finance tools force all income and spending into arbitrary calendar months (1st to 30th/31st). However, real household cashflow does not follow calendar months—it flows from **one payday to the next**.

---

## 🧮 How Payday Cycles Work

In HABit, each budget month is defined not by calendar dates, but by the period between **Payday \( N \)** and **Payday \( N+1 \)**.

```
Month Cycle: [ Payday N ] ──────────────────────────────────────────> [ Payday N+1 (Exclusive) ]
              │                                                        │
              ├── Week 1: Day 1 to 7                                  ├── Next Month Begins!
              ├── Week 2: Day 8 to 14
              ├── Week 3: Day 15 to 21
              ├── Week 4: Day 22 to 28
              └── Week 5: Day 29 to Payday N+1 (if cycle > 28 days)
```

---

## ⚙️ Supported Pay Frequencies

HABit includes exact mathematical formulas for every major payroll structure:

### 1. Monthly on a Fixed Date (e.g. 25th of the Month)
- **Definition**: Salary is paid on a specific day of the month (e.g. the 25th).
- **Rule**: If the 25th falls on a Saturday, Sunday, or Bank Holiday, HABit automatically shifts the payday to the **previous working day** (or next working day, per settings).
- **Cycle Duration**: Usually 28 to 31 days (can span 4 or 5 full budget weeks).

### 2. Monthly on the Last Working Day
- **Definition**: Salary arrives on the final business day of the calendar month.
- **Rule**: HABit scans backward from the last calendar day, skipping weekends and regional bank holidays to identify the exact working day.

### 3. Monthly on a Specific Weekday of the Month (e.g. 4th Friday)
- **Definition**: Paid on a relative day such as the *last Thursday*, *4th Friday*, or *2nd Wednesday*.
- **Rule**: Computes the exact calendar date dynamically across leap years and changing month lengths.

### 4. 4-Weekly (28-Day Cadence)
- **Definition**: Paid every 28 days (13 paychecks per calendar year).
- **Rule**: Generates exactly 4 weeks (7 days each) per budget cycle. In the 13th cycle ("Bonus Paycheck Cycle"), HABit allocates a dedicated 13th budget block.

### 5. Bi-Weekly / Fortnightly (14-Day Cadence)
- **Definition**: Paid every 14 days (26 paychecks per calendar year).
- **Rule**: Groups paychecks into 2-paycheck monthly envelopes or 14-day tracking blocks.

### 6. Weekly (7-Day Cadence)
- **Definition**: Paid every 7 days (52 paychecks per calendar year).
- **Rule**: Aligns each week card directly with individual weekly pay slips.

---

## 🏖️ Regional Bank Holiday Engine

HABit includes built-in holiday rules that automatically adjust paydays and scheduled Direct Debits:

| Calendar Option | Included Holidays |
| :--- | :--- |
| **UK (England & Wales)** | New Year's Day, Good Friday, Easter Monday, Early May Bank Holiday, Spring Bank Holiday, Summer Bank Holiday, Christmas Day, Boxing Day (+ substitute observed days). |
| **UK (Scotland)** | Includes 2nd January and St Andrew's Day adjustments. |
| **US Federal** | New Year's Day, MLK Jr. Day, Washington's Birthday, Memorial Day, Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas Day. |
| **Custom / None** | Define manual custom holiday dates in settings. |

### Working Day Adjustment Algorithm
When a payday or direct debit lands on a non-banking day:
$$	ext{Adjusted Date} = egin{cases} 	ext{Previous Business Day} & 	ext{if Rule} = 	ext{PREVIOUS} \ 	ext{Next Business Day} & 	ext{if Rule} = 	ext{NEXT} \end{cases}$$

---

## 📊 Dynamic 4-Week vs. 5-Week Month Splitting

Because calendar months have varying lengths (28 to 31 days) and paydays shift around weekends, budget cycles span either **4 weeks** or **5 weeks**:

- **4-Week Month (28–29 days)**:
  - Week 1: Days 1–7
  - Week 2: Days 8–14
  - Week 3: Days 15–21
  - Week 4: Days 22–End of Cycle
- **5-Week Month (30–35 days)**:
  - Week 1: Days 1–7
  - Week 2: Days 8–14
  - Week 3: Days 15–21
  - Week 4: Days 22–28
  - Week 5: Days 29–End of Cycle

HABit recalculates your **weekly safe-to-spend allowance** according to the exact number of weeks in that specific cycle, preventing the common "fifth-week budget shortfall" trap!

---

## 🔄 End-of-Month Rollover Mathematics

At the end of each budget month, HABit reconciles all income, scheduled direct debits, and actual weekly spending:

$$	ext{End Balance} = 	ext{Starting Balance} + \sum 	ext{Incomes} - \sum 	ext{Cleared Bills} - \sum 	ext{Actual Weekly Expenses} - \sum 	ext{Transfers to Savings}$$

The calculated $	ext{End Balance}$ of Month $M$ automatically becomes the **$	ext{Starting Balance}$ of Month $M+1$**. This ensures multi-year financial continuity with zero manual spreadsheet carryovers!
