import { appState, getSettings } from '../state.js';

// Calculator State
export const calcState = {
  isOpen: false,
  isMinimized: false,
  isHistoryOpen: false,
  isValuePickerActive: false,
  expression: '',
  currentInput: '0',
  lastResult: null,
  history: [],
  posX: null,
  posY: null
};

// Safe Math Evaluation Engine
function evaluateExpression(exprStr) {
  if (!exprStr || !exprStr.trim()) return 0;

  // Normalize operators
  let expr = exprStr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/,/g, '');

  // Handle percentages: e.g., "500 * 20%" -> "500 * 0.20", "500 + 20%" -> "500 + (500 * 0.20)"
  // First, convert simple percentage numbers like "20%" after * or / or ( to "(20/100)"
  expr = expr.replace(/([0-9.]+)\s*%/g, '($1/100)');

  // Validate allowed characters: numbers, ., +, -, *, /, (, ), spaces
  if (!/^[0-9.+\-*/()\s]+$/.test(expr)) {
    throw new Error('Invalid characters in expression');
  }

  // Tokenize
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const char = expr[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: parseFloat(numStr) });
      continue;
    }
    if ('+-*/()'.includes(char)) {
      // Check for unary minus: e.g. at start, or after another operator / open paren
      if (char === '-') {
        const prev = tokens[tokens.length - 1];
        if (!prev || prev.type === 'operator' || (prev.type === 'paren' && prev.value === '(')) {
          tokens.push({ type: 'operator', value: 'u-' });
          i++;
          continue;
        }
      }
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
      } else {
        tokens.push({ type: 'operator', value: char });
      }
      i++;
      continue;
    }
    i++;
  }

  // Shunting-yard algorithm to convert to Reverse Polish Notation (RPN)
  const outputQueue = [];
  const operatorStack = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, 'u-': 3 };

  for (const token of tokens) {
    if (token.type === 'number') {
      outputQueue.push(token);
    } else if (token.type === 'operator') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === 'operator' &&
        precedence[operatorStack[operatorStack.length - 1].value] >= precedence[token.value]
      ) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(token);
    } else if (token.type === 'paren' && token.value === '(') {
      operatorStack.push(token);
    } else if (token.type === 'paren' && token.value === ')') {
      while (operatorStack.length > 0 && !(operatorStack[operatorStack.length - 1].type === 'paren' && operatorStack[operatorStack.length - 1].value === '(')) {
        outputQueue.push(operatorStack.pop());
      }
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value === '(') {
        operatorStack.pop(); // remove '('
      }
    }
  }

  while (operatorStack.length > 0) {
    const op = operatorStack.pop();
    if (op.type === 'paren') throw new Error('Mismatched parentheses');
    outputQueue.push(op);
  }

  // Evaluate RPN
  const evalStack = [];
  for (const token of outputQueue) {
    if (token.type === 'number') {
      evalStack.push(token.value);
    } else if (token.type === 'operator') {
      if (token.value === 'u-') {
        const a = evalStack.pop() || 0;
        evalStack.push(-a);
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (a === undefined || b === undefined) throw new Error('Malformed expression');
        let res = 0;
        switch (token.value) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) throw new Error('Division by zero');
            res = a / b;
            break;
        }
        evalStack.push(res);
      }
    }
  }

  if (evalStack.length !== 1) throw new Error('Calculation error');
  const finalVal = evalStack[0];
  if (isNaN(finalVal) || !isFinite(finalVal)) throw new Error('Invalid result');
  return finalVal;
}

// Load / Save History from localStorage
function loadCalcHistory() {
  try {
    const saved = localStorage.getItem('budget_calc_history');
    if (saved) {
      calcState.history = JSON.parse(saved);
    }
  } catch (e) {}
}

function saveCalcHistory() {
  try {
    localStorage.setItem('budget_calc_history', JSON.stringify(calcState.history.slice(0, 30)));
  } catch (e) {}
}

// Update DOM Displays
export function updateCalcDisplay() {
  const exprEl = document.getElementById('calcExprDisplay');
  const mainEl = document.getElementById('calcMainDisplay');
  const minResultEl = document.getElementById('calcMinResult');

  if (exprEl) {
    exprEl.innerText = calcState.expression || '';
  }
  if (mainEl) {
    mainEl.innerText = calcState.currentInput || '0';
  }
  if (minResultEl) {
    minResultEl.innerText = calcState.currentInput || '0';
  }
}

// Keypad Actions
export function calcInputDigit(digit) {
  if (calcState.currentInput === '0' || calcState.currentInput === 'Error') {
    calcState.currentInput = String(digit);
  } else {
    calcState.currentInput += String(digit);
  }
  updateCalcDisplay();
}

export function calcInputDecimal() {
  if (calcState.currentInput === 'Error') calcState.currentInput = '0';
  if (!calcState.currentInput.includes('.')) {
    calcState.currentInput += '.';
  }
  updateCalcDisplay();
}

export function calcToggleSign() {
  if (calcState.currentInput === 'Error' || calcState.currentInput === '0') return;
  if (calcState.currentInput.startsWith('-')) {
    calcState.currentInput = calcState.currentInput.substring(1);
  } else {
    calcState.currentInput = '-' + calcState.currentInput;
  }
  updateCalcDisplay();
}

export function calcInputOperator(op) {
  if (calcState.currentInput === 'Error') calcState.currentInput = '0';

  if (calcState.expression && (calcState.currentInput === '' || calcState.currentInput === '0')) {
    const trimmed = calcState.expression.trim();
    if (/[+−×÷*/-]$/.test(trimmed)) {
      calcState.expression = trimmed.slice(0, -1) + ' ' + op + ' ';
      updateCalcDisplay();
      return;
    }
  }

  calcState.expression += ` ${calcState.currentInput} ${op} `;
  calcState.currentInput = '0';
  updateCalcDisplay();
}

export function calcInputParen(paren) {
  if (calcState.currentInput === 'Error') calcState.currentInput = '0';
  if (paren === '(') {
    if (calcState.currentInput !== '0' && calcState.currentInput !== '') {
      calcState.expression += ` ${calcState.currentInput} × ( `;
    } else {
      calcState.expression += ' ( ';
    }
    calcState.currentInput = '0';
  } else if (paren === ')') {
    calcState.expression += ` ${calcState.currentInput} ) `;
    calcState.currentInput = '0';
  }
  updateCalcDisplay();
}

export function calcInputPercent() {
  if (calcState.currentInput === 'Error') return;
  const val = parseFloat(calcState.currentInput) || 0;
  calcState.currentInput = (val / 100).toString();
  updateCalcDisplay();
}

export function calcClearEntry() {
  if (calcState.currentInput.length > 1 && calcState.currentInput !== 'Error') {
    calcState.currentInput = calcState.currentInput.slice(0, -1);
  } else {
    calcState.currentInput = '0';
  }
  updateCalcDisplay();
}

export function calcClearAll() {
  calcState.expression = '';
  calcState.currentInput = '0';
  calcState.lastResult = null;
  updateCalcDisplay();
}

export function calcEquals() {
  try {
    let fullExpr = (calcState.expression + ' ' + calcState.currentInput).trim();
    if (!fullExpr) return;

    const result = evaluateExpression(fullExpr);
    // Round to max 6 decimal places to prevent float precision oddities (e.g., 0.1 + 0.2 = 0.3)
    const rounded = Number(Math.round(result + 'e+6') + 'e-6');
    const resultStr = rounded.toString();

    // Add to history
    calcState.history.unshift({
      expression: fullExpr,
      result: resultStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (calcState.history.length > 30) calcState.history.pop();
    saveCalcHistory();
    renderCalcHistory();

    calcState.expression = '';
    calcState.currentInput = resultStr;
    calcState.lastResult = rounded;
    updateCalcDisplay();
  } catch (err) {
    console.error('Calculation error:', err);
    calcState.currentInput = 'Error';
    updateCalcDisplay();
  }
}

// Render History List
export function renderCalcHistory() {
  const listEl = document.getElementById('calcHistoryList');
  if (!listEl) return;
  if (!calcState.history || calcState.history.length === 0) {
    listEl.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:12px;">No calculation history yet</div>';
    return;
  }

  listEl.innerHTML = calcState.history.map((item, idx) => `
    <div class="calc-history-item" onclick="window.budgetApp.useHistoryResult(${idx})" title="Click to use this result">
      <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted);">
        <span>${item.timestamp || ''}</span>
        <span style="font-family:monospace; color:var(--text);">${item.expression}</span>
      </div>
      <div style="text-align:right; font-weight:700; font-size:14px; color:var(--primary, #38bdf8);">
        = ${item.result}
      </div>
    </div>
  `).join('');
}

export function toggleCalcHistory() {
  calcState.isHistoryOpen = !calcState.isHistoryOpen;
  const historyPanel = document.getElementById('calcHistoryPanel');
  if (historyPanel) {
    historyPanel.style.display = calcState.isHistoryOpen ? 'flex' : 'none';
    if (calcState.isHistoryOpen) renderCalcHistory();
  }
}

export function clearCalcHistory() {
  calcState.history = [];
  saveCalcHistory();
  renderCalcHistory();
}

export function useHistoryResult(idx) {
  const item = calcState.history[idx];
  if (!item) return;
  calcState.currentInput = item.result;
  updateCalcDisplay();
  toggleCalcHistory();
}

// Copy result to clipboard
export function copyCalcResult() {
  const val = calcState.currentInput;
  if (!val || val === 'Error') return;
  navigator.clipboard.writeText(val).then(() => {
    showCalcToast(`✓ Copied "${val}" to clipboard`);
  }).catch(() => {
    showCalcToast(`Result: ${val}`);
  });
}

// Toast notification helper
function showCalcToast(message) {
  let toast = document.getElementById('calcToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'calcToast';
    toast.className = 'calc-toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add('show');
  clearTimeout(window.__calcToastTimeout);
  window.__calcToastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// =========================================================
// INTERACTIVE "VALUE PICKER" MODE
// =========================================================

let activePickerHoverEl = null;
let pickerTooltipEl = null;

// Smart Numeric Value Extractor from DOM Element
export function extractNumericFromElement(el) {
  if (!el) return null;

  // 1. Form inputs
  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
    const rawVal = el.value;
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      const cleaned = String(rawVal).replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && isFinite(parsed)) return parsed;
    }
  }

  // 2. Data attributes (e.g. data-amount, data-value)
  if (el.dataset && el.dataset.amount) {
    const parsed = parseFloat(el.dataset.amount);
    if (!isNaN(parsed)) return parsed;
  }
  if (el.dataset && el.dataset.value) {
    const parsed = parseFloat(el.dataset.value);
    if (!isNaN(parsed)) return parsed;
  }

  // 3. Text content parsing
  let text = (el.innerText || el.textContent || '').trim();
  if (!text) return null;

  // Accountancy negative formatted with parentheses: e.g. "(£500.00)" or "($1,200)"
  const parenMatch = text.match(/\(\s*[$€£¥]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*\)/);
  if (parenMatch && parenMatch[1]) {
    const clean = parenMatch[1].replace(/,/g, '');
    const parsed = parseFloat(clean);
    if (!isNaN(parsed) && isFinite(parsed)) return -parsed;
  }

  // Standard match: optional sign, optional currency, numbers with commas (e.g. 1,234.56) or plain numbers (e.g. 7890 or 7890.00)
  const match = text.match(/([+-]?)\s*[$€£¥]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
  if (match && match[2]) {
    const sign = match[1] === '-' ? -1 : 1;
    const numPart = match[2].replace(/,/g, '');
    const parsed = parseFloat(numPart);
    if (!isNaN(parsed) && isFinite(parsed)) return sign * parsed;
  }

  return null;
}

// Find candidate target element
function findNumericCandidate(target) {
  if (!target || target === document.body || target === document.documentElement) return null;

  // Skip elements inside calculator or picker HUD
  if (target.closest('#budgetCalculatorWidget') || target.closest('#calculatorPickerHud') || target.closest('#calcToast')) {
    return null;
  }

  // Check target itself
  let num = extractNumericFromElement(target);
  if (num !== null) return { element: target, value: num };

  // Check closest number-bearing containers (e.g. .kpi-val, .item-amt-input, td, strong, span)
  let parent = target.parentElement;
  while (parent && parent !== document.body) {
    if (parent.closest('#budgetCalculatorWidget') || parent.closest('#calculatorPickerHud')) return null;
    num = extractNumericFromElement(parent);
    if (num !== null) return { element: parent, value: num };
    parent = parent.parentElement;
  }

  return null;
}

function handlePickerPointerMove(e) {
  if (!calcState.isValuePickerActive) return;

  const candidate = findNumericCandidate(e.target);
  if (candidate) {
    if (activePickerHoverEl !== candidate.element) {
      if (activePickerHoverEl) {
        activePickerHoverEl.classList.remove('val-picker-hover');
      }
      activePickerHoverEl = candidate.element;
      activePickerHoverEl.classList.add('val-picker-hover');
    }

    // Position or update tooltip
    if (!pickerTooltipEl) {
      pickerTooltipEl = document.createElement('div');
      pickerTooltipEl.id = 'valPickerTooltip';
      pickerTooltipEl.className = 'val-picker-tooltip';
      document.body.appendChild(pickerTooltipEl);
    }
    pickerTooltipEl.innerText = `🎯 Pick: ${candidate.value >= 0 ? '+' : ''}${candidate.value.toFixed(2)}`;
    pickerTooltipEl.style.display = 'block';
    pickerTooltipEl.style.left = `${Math.min(window.innerWidth - 120, e.clientX + 14)}px`;
    pickerTooltipEl.style.top = `${Math.max(10, e.clientY - 28)}px`;
  } else {
    if (activePickerHoverEl) {
      activePickerHoverEl.classList.remove('val-picker-hover');
      activePickerHoverEl = null;
    }
    if (pickerTooltipEl) {
      pickerTooltipEl.style.display = 'none';
    }
  }
}

function handlePickerClick(e) {
  if (!calcState.isValuePickerActive) return;

  // If user clicked HUD Cancel button
  if (e.target.closest('#cancelPickerBtn') || e.target.closest('.picker-cancel-btn')) {
    e.preventDefault();
    e.stopPropagation();
    cancelValuePicker();
    return;
  }

  // Allow tab switching and top navigation during picker mode so user can navigate to the number they need!
  if (
    e.target.closest('#navTabs') ||
    e.target.closest('.sub-nav') ||
    e.target.closest('.top-nav-bar') ||
    e.target.closest('.drawer') ||
    e.target.closest('#drawerBackdrop') ||
    e.target.closest('.modal-close-btn')
  ) {
    // Allow normal click to switch tab, but keep picker active
    return;
  }

  const candidate = findNumericCandidate(e.target);
  if (candidate) {
    e.preventDefault();
    e.stopPropagation();

    // Value picked successfully!
    const pickedVal = candidate.value;

    // Visual feedback on element
    candidate.element.classList.remove('val-picker-hover');
    candidate.element.classList.add('val-picker-picked');
    setTimeout(() => {
      candidate.element.classList.remove('val-picker-picked');
    }, 450);

    // Insert into calculator
    insertValueIntoCalc(pickedVal);

    showCalcToast(`✓ Picked ${pickedVal >= 0 ? '+' : ''}${pickedVal.toFixed(2)} into Calculator`);

    // End picker mode and restore calculator
    stopValuePicker();
  }
}

function handlePickerKeyDown(e) {
  if (!calcState.isValuePickerActive) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelValuePicker();
  }
}

export function startValuePicker() {
  calcState.isValuePickerActive = true;

  // Minimize calculator widget & show HUD
  const widget = document.getElementById('budgetCalculatorWidget');
  if (widget) widget.classList.add('calc-hidden-for-picker');

  const hud = document.getElementById('calculatorPickerHud');
  if (hud) {
    hud.style.display = 'flex';
    hud.classList.add('active');
  }

  document.body.classList.add('val-picker-mode');

  // Attach global capturing listeners
  document.addEventListener('pointermove', handlePickerPointerMove, true);
  document.addEventListener('click', handlePickerClick, true);
  document.addEventListener('keydown', handlePickerKeyDown, true);
}

export function stopValuePicker() {
  calcState.isValuePickerActive = false;

  document.removeEventListener('pointermove', handlePickerPointerMove, true);
  document.removeEventListener('click', handlePickerClick, true);
  document.removeEventListener('keydown', handlePickerKeyDown, true);

  if (activePickerHoverEl) {
    activePickerHoverEl.classList.remove('val-picker-hover');
    activePickerHoverEl = null;
  }
  if (pickerTooltipEl) {
    pickerTooltipEl.style.display = 'none';
  }

  document.body.classList.remove('val-picker-mode');

  const hud = document.getElementById('calculatorPickerHud');
  if (hud) {
    hud.style.display = 'none';
    hud.classList.remove('active');
  }

  // Restore calculator window
  const widget = document.getElementById('budgetCalculatorWidget');
  if (widget) {
    widget.classList.remove('calc-hidden-for-picker');
    widget.style.display = 'flex';
  }
}

export function cancelValuePicker() {
  stopValuePicker();
  showCalcToast('Value selection canceled');
}

export function insertValueIntoCalc(val) {
  let valStr = '';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      valStr = val.toString();
    } else {
      const rounded = Number(Math.round(val + 'e+6') + 'e-6');
      valStr = rounded.toString();
    }
  } else {
    valStr = String(val);
  }
  
  if (calcState.currentInput === '0' || calcState.currentInput === 'Error' || calcState.currentInput === '') {
    calcState.currentInput = valStr;
  } else {
    calcState.currentInput = valStr;
  }
  updateCalcDisplay();
}

// =========================================================
// WINDOW POSITIONING, DRAG & MINIMIZE CONTROLS
// =========================================================

export function openCalculator() {
  calcState.isOpen = true;
  calcState.isMinimized = false;

  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (badge) badge.style.display = 'none';
  if (widget) {
    widget.style.display = 'flex';
    widget.classList.remove('minimized');
    widget.classList.remove('calc-hidden-for-picker');
  }

  updateCalcDisplay();
}

export function closeCalculator() {
  calcState.isOpen = false;
  calcState.isMinimized = false;
  if (calcState.isValuePickerActive) {
    stopValuePicker();
  }

  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (widget) widget.style.display = 'none';
  if (badge) badge.style.display = 'none';
}

export function toggleCalculator() {
  if (calcState.isOpen && !calcState.isMinimized) {
    closeCalculator();
  } else {
    openCalculator();
  }
}

export function minimizeCalculator() {
  calcState.isMinimized = true;
  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (widget) widget.style.display = 'none';
  if (badge) {
    badge.style.display = 'flex';
    const minResultEl = document.getElementById('calcMinResult');
    if (minResultEl) minResultEl.innerText = calcState.currentInput || '0';
  }
}

export function restoreFromMinimized() {
  calcState.isMinimized = false;
  const widget = document.getElementById('budgetCalculatorWidget');
  const badge = document.getElementById('calcMinimizedBadge');

  if (badge) badge.style.display = 'none';
  if (widget) {
    widget.style.display = 'flex';
  }
  updateCalcDisplay();
}

// Drag Handlers for Desktop/Tablet
function initCalcDraggable() {
  const widget = document.getElementById('budgetCalculatorWidget');
  const header = document.getElementById('calcDragHeader');
  if (!widget || !header) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  function onPointerDown(e) {
    if (e.target.closest('.calc-win-btn') || e.target.closest('button')) return;
    
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const rect = widget.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left = `${initialLeft}px`;
    widget.style.top = `${initialTop}px`;
    widget.classList.add('is-dragging');

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // Bounds checking
    const maxLeft = window.innerWidth - widget.offsetWidth - 10;
    const maxTop = window.innerHeight - widget.offsetHeight - 10;

    newLeft = Math.max(10, Math.min(newLeft, maxLeft));
    newTop = Math.max(10, Math.min(newTop, maxTop));

    widget.style.left = `${newLeft}px`;
    widget.style.top = `${newTop}px`;
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    widget.classList.remove('is-dragging');
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }

  header.addEventListener('pointerdown', onPointerDown);
}

// Global Keyboard Handler
function initCalcKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      toggleCalculator();
      return;
    }

    if (!calcState.isOpen || calcState.isMinimized) return;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      if (!activeEl.closest('#budgetCalculatorWidget')) {
        return;
      }
    }

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      calcInputDigit(e.key);
    } else if (e.key === '.') {
      e.preventDefault();
      calcInputDecimal();
    } else if (e.key === '+') {
      e.preventDefault();
      calcInputOperator('+');
    } else if (e.key === '-') {
      e.preventDefault();
      calcInputOperator('−');
    } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      calcInputOperator('×');
    } else if (e.key === '/') {
      e.preventDefault();
      calcInputOperator('÷');
    } else if (e.key === '%') {
      e.preventDefault();
      calcInputPercent();
    } else if (e.key === '(' || e.key === ')') {
      e.preventDefault();
      calcInputParen(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      calcEquals();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      calcClearEntry();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCalculator();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      calcClearAll();
    }
  });
}

// Initializer
export function initCalculator() {
  loadCalcHistory();
  initCalcDraggable();
  initCalcKeyboard();
  updateCalcDisplay();
}
