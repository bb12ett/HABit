# Interface, Navigation & Productivity Tools

HABit is built from the ground up to deliver a lightning-fast, tactile, and responsive user experience across desktop monitors, laptops, mobile phones, and wall-mounted touchscreens.

With **v0.2.x**, HABit adopts full **Material Design 3 (MD3)** guidelines, featuring an adaptive desktop navigation rail, a native mobile bottom navigation bar, horizontally scrollable sub-navigation pill chips, and animated feedback.

---

## 🧭 Material Design 3 (MD3) Adaptive Navigation

HABit dynamically adapts its layout to your viewport size:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DESKTOP VIEW (≥ 900px)                                                                 │
├───────────────┬────────────────────────────────────────────────────────────────────────┤
│ [☰] [HABit]   │ Top Bar: [ 🪙 December 2026 ▾ ]              [2026 ▾] [🔒] [⚙️]       │
│ ───────────── │ ────────────────────────────────────────────────────────────────────── │
│ 📅 Monthly    │ Sub-Nav Pills: ( Jan ) ( Feb ) ... [ Dec ★ ]                          │
│   • Overview  ├────────────────────────────────────────────────────────────────────────┤
│   • Breakdown │                                                                        │
│ 🎯 Budgets    │ MAIN APPLICATION VIEWPORT                                              │
│   • Envelopes │ (Scrollable Content, Week Cards, Analytics, Tables)                    │
│   • Occasions │                                                                        │
│   • Bills     │                                                                        │
│ 📈 Analysis   │                                                                        │
│   • Spend     │                                                                        │
│   • Year      │                                                                        │
└───────────────┴────────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MOBILE VIEW (< 900px)                                                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Header: [☰] [🪙 HABit] [Dec '26]                             ['26 ▾] [🔒] [⚙️]         │
│ Sub-Nav Pills: ◀ ( Oct '26 ) ( Nov '26 ) [ Dec '26 ★ ] ( Jan '27 ) ▶                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│ SCROLLABLE APP BODY                                                                    │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Mobile Bottom Nav:  [ 📅 Monthly ]       [ 🎯 Budgets ]       [ 📈 Analysis ]          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Desktop Left Navigation Rail & Fold-Away Mode

On desktop and tablet screens ($\ge 900\text{px}$), primary navigation lives in the **Material Design 3 Left Navigation Rail**:

- **Active Section Indicators**: Smooth pill-shaped background highlights indicate the currently active section (`Monthly`, `Budgets`, `Analysis`, `Settings`).
- **Fold-Away / Expand Hamburger Toggle (`☰` ⇄ `◀` / `▶`)**:
  - Clicking the hamburger button smoothly collapses the left rail into an ultra-compact **Icons-Only Rail** ($\approx 72\text{px}$ width), maximizing screen real estate for wide financial tables and multi-column dashboards.
  - In folded mode, navigation items display stacked icons with centered sub-labels.
  - The hamburger icon dynamically morphs between the standard menu icon (`☰`) and directional fold icons (`◀` / `▶`).
- **Sub-Navigation Links**: Quick nested links allow one-click jumping directly into sub-views (e.g. *Overview*, *Scheduled Bills*, *Budgets & Occasions*, *Live Spend Analytics*, *Annual Trajectory*).

---

### 2. Mobile Bottom Navigation Bar & Drawer

On mobile devices ($< 900\text{px}$), navigation automatically shifts to ergonomic thumb-friendly controls:

- **MD3 Bottom Navigation Bar**: Fixed at the bottom of the screen with active indicator containers for `Monthly`, `Budgets`, and `Analysis`.
- **Sliding Off-Canvas Drawer**: Tapping the hamburger button (`☰`) in the top header opens a full off-canvas navigation drawer with backdrop blur, allowing access to Settings, Multi-User Personas, and all sub-views.

---

### 3. Sub-Navigation Pill Chips Bar

Below the main top header, the **Sub-Navigation Pill Chips Bar** provides quick navigation between months and sub-sections:

- **Horizontal Touch Scrolling**: Swipe left or right smoothly across all 12 payday months.
- **Smart Startup Auto-Focus & Centering**: On app startup or tab change, HABit automatically calculates the exact scroll position and smoothly centers the active payday month pill in the viewport.
- **Current Payday Star Badge (`★`)**: The active calendar cycle is marked with a subtle gold star.

---

### 4. Responsive Desktop vs. Mobile Title & Date Formatting

HABit automatically tailors typography and date abbreviations based on available screen space:

| Viewport | Topbar Month Title | Topbar Year Button | Sub-Nav Month Pills |
| :--- | :--- | :--- | :--- |
| **Desktop ($\ge 900\text{px}$)** | Full Name: **`December 2026`** | 4-Digit: **`2026`** | 3-Letter: **`Dec`** |
| **Mobile ($< 900\text{px}$)** | Compact: **`Dec '26`** | 2-Digit: **`'26`** | Compact: **`Dec '26`** |

---

## 💫 Dual-Action Navigation & Elastic Spring Pulse Animation

The **HABit Logo and Month Title** in the top bar function as an interactive navigation trigger:

```
[ 🪙 HABit | December 2026 ] ──► Tap / Click Interaction
```

1. **Back / Return to Overview**:
   - When viewing **Settings**, **Scheduled Bills**, **Budgets & Occasions**, or **Live Spend Analytics**, clicking the title bar or logo acts as an instant **Back button**, returning you to your active month overview.
2. **Current Week Jump & Neon Glow Pulse (`weekHighlightPulse`)**:
   - When already viewing the monthly budget, clicking the title bar or logo instantly smooth-scrolls and centers the **Current Week Card**, triggering an animated neon pulse highlight (`.week-highlight-pulse`) around the active week.
3. **Interactive Spring Pulse Animation (`titlePulse`)**:
   - Clicking or tapping the title triggers an elastic spring pulse animation (`@keyframes titlePulse`) with hover elevation (`scale(1.02)`) and active press compression (`scale(0.95)`).

---

## 🧮 Floating Financial Calculator (`Alt+C`)

HABit includes a built-in, draggable financial calculator for quick math without leaving the app:

```
┌───────────────────────────┐
│ 🧮 Financial Calculator   │
├───────────────────────────┤
│ [  ( 1250 - 450 ) * 0.20 ]│
│ = 160.00                  │
├───────┬───────┬───────┬───┤
│   (   │   )   │   %   │ C │
│   7   │   8   │   9   │ / │
│   4   │   5   │   6   │ * │
│   1   │   2   │   3   │ - │
│   0   │   .   │   =   │ + │
└───────┴───────┴───────┴───┘
```

### Calculator Features:
- **Keyboard Shortcut**: Press `Alt+C` anywhere in the app to toggle the calculator.
- **Full Mathematical Precedence**: Nested parentheses `( )`, percentage `%`, addition, subtraction, multiplication, and division.
- **Calculation History Tape**: Stores recent expressions with one-click **Copy Result** and **Re-use Expression** buttons.
- **🎯 Interactive Value Picker HUD**: Click the **Value Picker** button, then click any financial number on the screen to inject it directly into your calculation without manual retyping!

---

## ⚡ Floating Action Button (FAB) Speed Dial

On mobile and desktop, the bottom-right `+` button opens rapid-entry speed dial actions:
- 💳 **Balance Check-In**: Update checking balances in seconds.
- 🛒 **Add Weekly Expense**: Log an expense against the current week.
- 🎁 **Log Occasion Purchase**: Record a gift or holiday expense.

---

## 🎨 Zero-Flash 4-Theme Engine

HABit includes 4 handcrafted themes with zero white-flash on page load:
1. 🌑 **Dark Mode Charcoal**: Modern dark slate theme optimized for OLED screens and low-light environments.
2. 🌊 **Navy Dark (Deep Blue)**: Rich navy blue aesthetic.
3. ☀️ **Light Mode**: Crisp, high-clarity daylight theme.
4. ⚡ **High Contrast**: Enhanced contrast theme designed for accessibility and wall-mounted touchscreens.
