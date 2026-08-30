# Home Assistant Sensors & Automations

One of HABit's premier superpowers is its deep, native integration with **Home Assistant**. 

HABit automatically publishes real-time sensor entities into Home Assistant via the Supervisor REST API (`homeassistant_api: true`), enabling rich Lovelace dashboards and proactive smart home automations.

---

## 📡 Live Sensor Registry

HABit publishes and updates the following sensors in Home Assistant:

| Sensor Entity | Friendly Name | Unit | Description |
| :--- | :--- | :--- | :--- |
| `sensor.habit_net_position` | HABit Net Position | `£` / `$` | Total net liquidity across all checking and savings accounts minus credit card debt. |
| `sensor.habit_days_until_payday` | HABit Days Until Payday | `days` | Integer countdown of days remaining until your next upcoming payday. |
| `sensor.habit_current_balance` | HABit Checking Balance | `£` / `$` | Combined liquid balance across all active current/checking accounts. |
| `sensor.habit_credit_debt` | HABit Credit Debt | `£` / `$` | Total outstanding balance across all credit cards. |
| `sensor.habit_savings_total` | HABit Savings Total | `£` / `$` | Total ringfenced savings and ISA balances. |
| `sensor.habit_weekly_allowance_remaining` | HABit Weekly Allowance | `£` / `$` | Safe-to-spend discretionary allowance remaining for the current week. |
| `sensor.habit_next_upcoming_bill` | HABit Next Bill | `£` / `$` | Name and amount of the next scheduled Direct Debit due. |

### Sensor Attributes
Each sensor includes rich JSON attributes:
- `sensor.habit_next_upcoming_bill` attributes:
  - `bill_name`: e.g., `"Council Tax"`
  - `amount`: `185.00`
  - `due_date`: `"2026-09-01"`
  - `days_until_due`: `2`
  - `account`: `"Main Checking"`

---

## 🎛️ Lovelace Dashboard Card Examples

### 1. Modern Mushroom / Tile Cashflow Card
```yaml
type: vertical-stack
cards:
  - type: custom:mushroom-title-card
    title: 💰 Household Cashflow
    subtitle: Payday in {{ states('sensor.habit_days_until_payday') }} days
  - type: horizontal-stack
    cards:
      - type: custom:mushroom-entity-card
        entity: sensor.habit_net_position
        name: Net Position
        icon: mdi:wallet
        icon_color: green
      - type: custom:mushroom-entity-card
        entity: sensor.habit_weekly_allowance_remaining
        name: Weekly Allowance
        icon: mdi:cash-fast
        icon_color: blue
  - type: custom:mushroom-template-card
    primary: "Next Bill: {{ state_attr('sensor.habit_next_upcoming_bill', 'bill_name') }}"
    secondary: "{{ state_attr('sensor.habit_next_upcoming_bill', 'due_date') }} ({{ states('sensor.habit_next_upcoming_bill') }})"
    icon: mdi:calendar-clock
    icon_color: amber
```

### 2. Net Worth Gauge Card
```yaml
type: gauge
entity: sensor.habit_net_position
name: Net Cash Position
min: 0
max: 10000
severity:
  green: 3000
  yellow: 1000
  red: 0
```

---

## 🤖 Smart Home Automation Blueprints

### Automation 1: Low Weekly Allowance Alert
Send a mobile notification when your weekly discretionary spending is nearly exhausted:

```yaml
alias: "HABit: Low Weekly Allowance Warning"
trigger:
  - platform: numeric_state
    entity_id: sensor.habit_weekly_allowance_remaining
    below: 25
condition:
  - condition: numeric_state
    entity_id: sensor.habit_days_until_payday
    above: 2
action:
  - service: notify.notify
    data:
      title: "⚠️ HABit Budget Alert"
      message: "Weekly allowance is down to {{ states('sensor.habit_weekly_allowance_remaining') }}. {{ states('sensor.habit_days_until_payday') }} days remaining until payday!"
```

### Automation 2: Upcoming Large Bill Notification
Notify the household 2 days before a major Direct Debit is collected:

```yaml
alias: "HABit: Upcoming Bill Reminder"
trigger:
  - platform: template
    value_template: "{{ state_attr('sensor.habit_next_upcoming_bill', 'days_until_due') | int <= 2 }}"
action:
  - service: notify.notify
    data:
      title: "📋 Upcoming Direct Debit"
      message: "{{ state_attr('sensor.habit_next_upcoming_bill', 'bill_name') }} of {{ states('sensor.habit_next_upcoming_bill') }} is due on {{ state_attr('sensor.habit_next_upcoming_bill', 'due_date') }}."
```
