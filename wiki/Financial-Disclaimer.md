# ⚖️ Financial Disclaimer & Limitation of Liability

**HABit (Household Budget Planner)** is a free, open-source, and self-hosted personal cashflow estimation and budgeting application designed for Home Assistant and local-first environments.

Please read this disclaimer carefully before using the software. By downloading, installing, accessing, or using HABit, you acknowledge and agree to the terms below.

---

## 1. Informational & Estimation Purposes Only

HABit is provided solely as a personal budgeting and cashflow estimation tool.
- All figures, daily safe-to-spend pace metrics, month-end projections, emergency runway calculations, credit card auto-pay estimates, and scheduled bill shifts are **mathematical approximations**.
- Projections are based on user-entered parameters, calendar formulas, and historical or imported transactions. They may contain calculation errors, rounding variances, or timing discrepancies.
- **HABit is NOT an accounting system, an audited financial ledger, or an official bank statement.**

---

## 2. Not Professional Financial or Legal Advice

Nothing contained within this software, its source code, documentation, or wiki constitutes financial, investment, accounting, tax, credit management, or legal advice.
- The author, contributors, and maintainers are not registered financial advisors, certified public accountants (CPAs), or certified financial planners.
- You should consult an independent, qualified professional financial adviser before making significant financial commitments or investment decisions.

---

## 3. User Responsibility & Independent Bank Verification

**You are solely responsible for independently verifying all account balances, credit limits, scheduled direct debits, standing orders, and transaction records directly with your official financial institutions.**
- You must never rely solely on HABit's safe-to-spend figures or projected balances to prevent bank overdrafts or missed payments.
- When scheduling bill payoffs or budgeting discretionary expenses, always confirm actual cleared funds in your official banking portal or mobile app.

---

## 4. Limitation of Liability

To the maximum extent permitted by applicable law:
- **"AS IS" Warranty Disclaimer**: HABit is provided on an "AS IS" and "AS AVAILABLE" basis, without warranty of any kind, express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.
- **No Liability for Damages**: Under no circumstances shall the author, contributors, maintainers, or copyright holders be held liable for any direct, indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, overdraft fees, bank charges, missed payment penalties, interest charges, credit score impacts, loss of funds, or data inaccuracies) arising in any way out of the use of or inability to use this software.
- The entire risk as to the quality, accuracy, and performance of calculations rests with the user.

---

## 5. Open Banking, Bank Feeds & Third-Party APIs

If you utilize Open Banking (e.g. TrueLayer, GoCardless, Enable Banking, SimpleFIN) or statement upload capabilities:
- Integration features are provided strictly for user convenience.
- Third-party bank connections may experience latency, downtime, missing pending transactions, or authentication token expiration.
- The authors bear no responsibility for third-party service availability, API changes, or bank transmission discrepancies.

---

## 6. Debug Logs & Sensitive Data Privacy

- **Debug Logs Contain Confidential Financial Data**: When Open Banking debug logging is enabled, raw API responses, account identifiers, balances, and transaction descriptions are recorded in the local debug log file (`open_banking_debug.txt`).
- **Do Not Share Unredacted Logs**: Debug logs must never be posted publicly (e.g., on GitHub issues, community forums, or Discord) without first inspecting and redacting all personal information, account IDs, merchant details, and monetary amounts.
- Debug logging should be disabled in **Settings → Open Banking** during normal daily operation.

---

*This disclaimer supplements the [GNU Affero General Public License v3.0 (AGPLv3)](https://www.gnu.org/licenses/agpl-3.0.html) under which HABit is licensed.*
