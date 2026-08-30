import time
import json
import os
import copy
import re
import datetime
import urllib.request
import urllib.error
from flask import Flask, jsonify, request, send_from_directory, render_template, make_response

app = Flask(__name__, template_folder="templates", static_folder="static")

# 1. Total Cache Prevention in Flask
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.config["TEMPLATES_AUTO_RELOAD"] = True

# 2. Dynamic Startup Build ID & App Version (single source of truth: config.yaml)
def load_version():
    try:
        config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                for line in f:
                    line_clean = line.strip()
                    if line_clean.startswith("version:"):
                        ver = line_clean.split(":", 1)[1].strip().strip('"\'')
                        if ver:
                            return ver
    except Exception as e:
        print(f"Notice: Unable to parse version from config.yaml: {e}")
    return os.environ.get("APP_VERSION", "0.1.2a")

APP_VERSION = load_version()
BUILD_ID = str(int(time.time()))

@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    # Tells modern browsers & Android System WebView to purge stale cached responses
    response.headers["Clear-Site-Data"] = '"cache"'
    
    # Strip ETags and Last-Modified so 304 Not Modified is NEVER returned
    response.headers.pop("ETag", None)
    response.headers.pop("Last-Modified", None)
    return response

DATA_FILE = "/data/budget.json"

import base64
import hashlib
import hmac
import secrets

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False

def derive_key(pin: str, salt_b64: str) -> bytes:
    try:
        salt = base64.b64decode(salt_b64) if salt_b64 else b"default_salt_16b"
    except Exception:
        salt = b"default_salt_16b"
    if HAS_CRYPTOGRAPHY:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return kdf.derive(str(pin).encode("utf-8"))
    else:
        return hashlib.pbkdf2_hmac("sha256", str(pin).encode("utf-8"), salt, 100000, dklen=32)

def hash_pin_for_verification(pin: str, salt_b64: str) -> str:
    key = derive_key(pin, salt_b64)
    return hashlib.sha256(key).hexdigest()

def generate_salt_b64() -> str:
    return base64.b64encode(os.urandom(16)).decode("utf-8")

def generate_key_b64() -> str:
    return base64.b64encode(os.urandom(32)).decode("utf-8")

def encrypt_dict_payload(key: bytes, data_dict: dict) -> dict:
    plaintext = json.dumps(data_dict, ensure_ascii=False).encode("utf-8")
    if HAS_CRYPTOGRAPHY:
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ct = aesgcm.encrypt(nonce, plaintext, None)
        return {
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "ciphertext": base64.b64encode(ct).decode("utf-8"),
            "is_encrypted": True
        }
    else:
        nonce = os.urandom(16)
        keystream = hashlib.sha256(key + nonce).digest()
        while len(keystream) < len(plaintext):
            keystream += hashlib.sha256(key + keystream).digest()
        ct = bytes(a ^ b for a, b in zip(plaintext, keystream[:len(plaintext)]))
        tag = hmac.new(key, nonce + ct, hashlib.sha256).digest()
        return {
            "nonce": base64.b64encode(nonce).decode("utf-8"),
            "ciphertext": base64.b64encode(ct).decode("utf-8"),
            "tag": base64.b64encode(tag).decode("utf-8"),
            "is_encrypted": True
        }

def decrypt_dict_payload(key: bytes, enc_obj: dict) -> dict:
    if not enc_obj or not isinstance(enc_obj, dict):
        return {}
    nonce = base64.b64decode(enc_obj["nonce"])
    ct = base64.b64decode(enc_obj["ciphertext"])
    if HAS_CRYPTOGRAPHY and "tag" not in enc_obj:
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ct, None)
        return json.loads(plaintext.decode("utf-8"))
    elif "tag" in enc_obj:
        tag = base64.b64decode(enc_obj["tag"])
        expected_tag = hmac.new(key, nonce + ct, hashlib.sha256).digest()
        if not hmac.compare_digest(tag, expected_tag):
            raise ValueError("Integrity check failed / incorrect key")
        keystream = hashlib.sha256(key + nonce).digest()
        while len(keystream) < len(ct):
            keystream += hashlib.sha256(key + keystream).digest()
        plaintext = bytes(a ^ b for a, b in zip(ct, keystream[:len(ct)]))
        return json.loads(plaintext.decode("utf-8"))
    else:
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ct, None)
        return json.loads(plaintext.decode("utf-8"))

DEFAULT_SETTINGS = {
    "currency": "\u00a3",
    "theme": "grey_dark",
    "country_holidays": "uk_ew",
    "pay_frequency": "monthly",
    "payday_day": 26,
    "payday_weekday": 5,
    "payday_anchor_date": "2026-01-09",
    "payday_first_day": 15,
    "payday_second_day": "last_day",
    "payday_is_last_working_day": False,
    "track_savings": True,
    "enable_yearly_budgets": True,
    "enable_multi_user": False,
    "enable_ha_sensors": True,
    "security": {
        "master_pin_enabled": False,
        "master_salt": "",
        "master_pin_hash": "",
        "joint_salt": "",
        "joint_pin_hash": "",
        "joint_pin_enabled": False,
        "personas": {}
    },
    "people": ["Person 1", "Person 2"],
    "people_settings": {
        "Person 1": {"hide_salary": False, "pin": ""},
        "Person 2": {"hide_salary": False, "pin": ""}
    },
    "account_owners": {
        "Joint Account": "Joint",
        "Credit Card": "Joint"
    },
    "current_accounts": ["Joint Account"],
    "credit_accounts": [
        {
            "name": "Credit Card",
            "limit": 5000.00,
            "autopay_enabled": True,
            "autopay_from": "Joint Account",
            "autopay_when": "week_1",
            "autopay_type": "full",
            "autopay_fixed_amt": 0.00
        }
    ],
    "savings_accounts": ["Emergency Savings", "Stocks & Shares ISA"],
    "enabled_widgets": [
        "current_projected",
        "credit_projected",
        "savings_projected",
        "net_position",
        "total_outgoings"
    ],
    "default_weekly": [
        {"desc": "Food / Groceries", "amount": 0.00, "is_income": False, "account_name": "Credit Card", "account_type": "credit"},
        {"desc": "Fuel / Transport", "amount": 0.00, "is_income": False, "account_name": "Credit Card", "account_type": "credit"},
        {"desc": "Other / Misc", "amount": 0.00, "is_income": False, "account_name": "Credit Card", "account_type": "credit"},
        {"desc": "Cash", "amount": 0.00, "is_income": False, "account_name": "Joint Account", "account_type": "current"}
    ],
    "default_direct_debits": [
        {"desc": "Mortgage / Rent", "due_day": 1, "amount": 1000.00, "account": "Joint Account", "transfer_to": "none", "holiday_rule": "following"},
        {"desc": "Council Tax", "due_day": 1, "amount": 180.00, "account": "Joint Account", "transfer_to": "none", "holiday_rule": "following"},
        {"desc": "Energy", "due_day": 1, "amount": 150.00, "account": "Joint Account", "transfer_to": "none", "holiday_rule": "following"},
        {"desc": "L&G ISA DD", "due_day": 1, "amount": 880.00, "account": "Joint Account", "transfer_to": "Stocks & Shares ISA", "holiday_rule": "following"},
        {"desc": "Broadband", "due_day": 15, "amount": 35.00, "account": "Joint Account", "transfer_to": "none", "holiday_rule": "following"}
    ],
    "default_payments_in": [],
    "default_yearly_recurring": [
        {"desc": "Car Insurance", "month": "Mar", "due_day": 15, "amount": 450.00, "account": "Joint Account", "holiday_rule": "following"},
        {"desc": "TV Licence", "month": "Jul", "due_day": 1, "amount": 169.50, "account": "Joint Account", "holiday_rule": "following"}
    ],
    "default_yearly_income": [],
    "recurring_payments": [],
    "recurring_incomes": []
}

def load_data():
    data = {}
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                content = f.read()
                if content.strip():
                    data = json.loads(content)
        except Exception as e:
            print(f"Error reading JSON file: {e}")
    if not data and os.path.exists("budget_data.json"):
        try:
            with open("budget_data.json", "r", encoding="utf-8") as f:
                content = f.read()
                if content.strip():
                    data = json.loads(content)
                    save_data(data)
        except Exception as e:
            print(f"Error reading local budget_data.json: {e}")
    
    if not isinstance(data, dict):
        data = {}
        
    if "current_year" not in data:
        data["current_year"] = 2026
        
    if "settings" not in data or not isinstance(data["settings"], dict):
        data["settings"] = copy.deepcopy(DEFAULT_SETTINGS)
    else:
        for k, v in DEFAULT_SETTINGS.items():
            if k not in data["settings"]:
                data["settings"][k] = copy.deepcopy(v)
                
    if "years" not in data or not isinstance(data["years"], dict):
        data["years"] = {}
        
    year_str = str(data["current_year"])
    if year_str not in data["years"]:
        data["years"][year_str] = {
            "archived": False,
            "yearly_recurring": copy.deepcopy(data["settings"].get("default_yearly_recurring", [])),
            "yearly_income": copy.deepcopy(data["settings"].get("default_yearly_income", [])),
            "recurring_payments": copy.deepcopy(data["settings"].get("recurring_payments", [])),
            "recurring_incomes": copy.deepcopy(data["settings"].get("recurring_incomes", [])),
            "yearly_budgets": [],
            "months": {}
        }
    return data

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def compute_ha_sensors(budget_data):
    """Computes Home Assistant sensor payload dictionary from budget data."""
    if not budget_data or not isinstance(budget_data, dict):
        return {}
    
    settings = budget_data.get("settings", {})
    if not settings.get("enable_ha_sensors", True):
        return {}
    
    curr = settings.get("currency", "£")
    years = budget_data.get("years", {})
    
    today = datetime.date.today()
    current_year_str = str(today.year)
    if current_year_str not in years:
        current_year_str = list(years.keys())[0] if years else str(budget_data.get("current_year", 2026))
    
    year_data = years.get(current_year_str, {})
    
    # Identify current month
    month_idx = max(0, min(11, today.month - 1))
    current_month_name = MONTH_NAMES[month_idx]
    month_data = year_data.get("months", {}).get(current_month_name, {}) if "months" in year_data else year_data.get(current_month_name, {})
    
    # 1. Current Accounts
    current_accounts = settings.get("current_accounts", [])
    current_data = month_data.get("current_data", {})
    current_total = 0.0
    current_breakdown = {}
    for acc in current_accounts:
        acc_info = current_data.get(acc, {}) if isinstance(current_data, dict) else {}
        bal = float(acc_info.get("opening", 0.0) or 0.0)
        current_total += bal
        current_breakdown[acc] = round(bal, 2)
    
    # 2. Credit Cards
    credit_accounts = settings.get("credit_accounts", [])
    credit_data = month_data.get("credit_data", {})
    credit_debt_total = 0.0
    credit_breakdown = {}
    for c in credit_accounts:
        cname = c.get("name") if isinstance(c, dict) else str(c)
        cinfo = credit_data.get(cname, {}) if isinstance(credit_data, dict) else {}
        debt = float(cinfo.get("opening_spent", 0.0) or 0.0)
        limit = float(c.get("limit", 0.0) or 0.0) if isinstance(c, dict) else 0.0
        credit_debt_total += debt
        credit_breakdown[cname] = {
            "balance": round(debt, 2),
            "limit": round(limit, 2),
            "available": round(max(0.0, limit - debt), 2)
        }
    
    # 3. Savings Accounts
    savings_accounts = settings.get("savings_accounts", [])
    savings_data = month_data.get("savings_data", {})
    savings_total = 0.0
    savings_breakdown = {}
    if settings.get("track_savings", True):
        for s in savings_accounts:
            sinfo = savings_data.get(s, {}) if isinstance(savings_data, dict) else {}
            bal = float(sinfo.get("opening", 0.0) or 0.0)
            savings_total += bal
            savings_breakdown[s] = round(bal, 2)
    
    net_position = current_total + savings_total - credit_debt_total
    
    # 4. Payday Schedule & Days Until Payday
    pay_freq = settings.get("pay_frequency", "monthly")
    pday_day = int(settings.get("payday_day", 26) or 26)
    
    next_pday_date = None
    if pay_freq == "monthly":
        try:
            max_day = 31 if today.month in [1,3,5,7,8,10,12] else (30 if today.month in [4,6,9,11] else 28)
            pday_this_month = datetime.date(today.year, today.month, min(pday_day, max_day))
            if today <= pday_this_month:
                next_pday_date = pday_this_month
            else:
                next_m = today.month + 1
                next_y = today.year
                if next_m > 12:
                    next_m = 1
                    next_y += 1
                max_next_day = 31 if next_m in [1,3,5,7,8,10,12] else (30 if next_m in [4,6,9,11] else 28)
                next_pday_date = datetime.date(next_y, next_m, min(pday_day, max_next_day))
        except Exception:
            next_pday_date = today + datetime.timedelta(days=14)
    elif pay_freq in ["biweekly", "four_weekly"]:
        anchor_str = settings.get("payday_anchor_date", "2026-01-09")
        try:
            anchor_dt = datetime.date.fromisoformat(anchor_str)
            period_days = 14 if pay_freq == "biweekly" else 28
            diff = (today - anchor_dt).days
            cycles = diff // period_days
            cand = anchor_dt + datetime.timedelta(days=cycles * period_days)
            while cand < today:
                cand += datetime.timedelta(days=period_days)
            next_pday_date = cand
        except Exception:
            next_pday_date = today + datetime.timedelta(days=14)
    elif pay_freq == "weekly":
        target_weekday = int(settings.get("payday_weekday", 5))
        py_target = (target_weekday - 1) % 7
        days_ahead = (py_target - today.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        next_pday_date = today + datetime.timedelta(days=days_ahead)
    else: # semi_monthly
        pday1 = int(settings.get("payday_first_day", 15) or 15)
        p1 = datetime.date(today.year, today.month, min(pday1, 28))
        max_d = 31 if today.month in [1,3,5,7,8,10,12] else (30 if today.month in [4,6,9,11] else 28)
        p2 = datetime.date(today.year, today.month, max_d)
        if today <= p1:
            next_pday_date = p1
        elif today <= p2:
            next_pday_date = p2
        else:
            next_m = today.month + 1
            next_y = today.year
            if next_m > 12:
                next_m = 1
                next_y += 1
            next_pday_date = datetime.date(next_y, next_m, min(pday1, 28))

    days_until_pday = max(0, (next_pday_date - today).days) if next_pday_date else 0

    # 5. Weekly Living Allowance
    weeks = month_data.get("weeks", {})
    active_week_key = "w1"
    w_items = weeks.get(active_week_key, []) if isinstance(weeks, dict) else []
    w_actuals = month_data.get("week_actuals", {}).get(active_week_key, {})
    
    planned_week_living = sum(float(it.get("amount", 0.0) or 0.0) for it in w_items if not it.get("is_income"))
    actual_week_living = sum(float(act.get("amount", 0.0) or 0.0) for act in w_actuals.values()) if isinstance(w_actuals, dict) else 0.0
    week_remaining = max(0.0, planned_week_living - actual_week_living)

    # 6. Next Upcoming Bill
    all_bills = settings.get("default_direct_debits", [])
    next_bill = None
    if all_bills:
        sorted_bills = sorted(all_bills, key=lambda b: int(b.get("due_day", 1) or 1))
        for b in sorted_bills:
            if int(b.get("due_day", 1) or 1) >= today.day:
                next_bill = b
                break
        if not next_bill and sorted_bills:
            next_bill = sorted_bills[0]

    now_iso = datetime.datetime.now().isoformat()

    sensors = {
        "sensor.habit_net_position": {
            "state": f"{net_position:.2f}",
            "attributes": {
                "unit_of_measurement": curr,
                "friendly_name": "HABit Net Position",
                "icon": "mdi:wallet",
                "device_class": "monetary",
                "state_class": "total",
                "current_accounts_total": round(current_total, 2),
                "credit_debt_total": round(credit_debt_total, 2),
                "savings_total": round(savings_total, 2),
                "currency": curr,
                "current_cycle_month": current_month_name,
                "last_synced": now_iso
            }
        },
        "sensor.habit_current_balance": {
            "state": f"{current_total:.2f}",
            "attributes": {
                "unit_of_measurement": curr,
                "friendly_name": "HABit Current Accounts Total",
                "icon": "mdi:bank",
                "device_class": "monetary",
                "state_class": "total",
                "accounts": current_breakdown,
                "currency": curr,
                "last_synced": now_iso
            }
        },
        "sensor.habit_credit_debt": {
            "state": f"{credit_debt_total:.2f}",
            "attributes": {
                "unit_of_measurement": curr,
                "friendly_name": "HABit Credit Debt Total",
                "icon": "mdi:credit-card-outline",
                "device_class": "monetary",
                "state_class": "total",
                "cards": credit_breakdown,
                "currency": curr,
                "last_synced": now_iso
            }
        },
        "sensor.habit_savings_total": {
            "state": f"{savings_total:.2f}",
            "attributes": {
                "unit_of_measurement": curr,
                "friendly_name": "HABit Savings Total",
                "icon": "mdi:piggy-bank",
                "device_class": "monetary",
                "state_class": "total",
                "accounts": savings_breakdown,
                "currency": curr,
                "last_synced": now_iso
            }
        },
        "sensor.habit_days_until_payday": {
            "state": str(days_until_pday),
            "attributes": {
                "unit_of_measurement": "days",
                "friendly_name": "HABit Days Until Payday",
                "icon": "mdi:calendar-clock",
                "next_payday": next_pday_date.isoformat() if next_pday_date else "",
                "pay_frequency": pay_freq,
                "current_month": current_month_name,
                "last_synced": now_iso
            }
        },
        "sensor.habit_weekly_allowance_remaining": {
            "state": f"{week_remaining:.2f}",
            "attributes": {
                "unit_of_measurement": curr,
                "friendly_name": "HABit Weekly Allowance Remaining",
                "icon": "mdi:cash-fast",
                "device_class": "monetary",
                "planned_budget": round(planned_week_living, 2),
                "actual_spent": round(actual_week_living, 2),
                "currency": curr,
                "last_synced": now_iso
            }
        }
    }
    
    if next_bill:
        sensors["sensor.habit_next_upcoming_bill"] = {
            "state": str(next_bill.get("desc", "Bill")),
            "attributes": {
                "friendly_name": "HABit Next Upcoming Bill",
                "icon": "mdi:receipt",
                "amount": float(next_bill.get("amount", 0.0) or 0.0),
                "due_day": int(next_bill.get("due_day", 1) or 1),
                "account": str(next_bill.get("account", "")),
                "currency": curr,
                "last_synced": now_iso
            }
        }

    return sensors

def sync_ha_sensors(budget_data, token=None, supervisor_url=None):
    """Pushes computed sensors to Home Assistant via Supervisor Core API."""
    token = token or os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        return False
    
    url_base = supervisor_url or os.environ.get("SUPERVISOR_URL", "http://supervisor/core/api")
    sensors = compute_ha_sensors(budget_data)
    if not sensors:
        return False
    
    success_count = 0
    for entity_id, payload in sensors.items():
        try:
            req_url = f"{url_base}/states/{entity_id}"
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                req_url,
                data=req_data,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status in [200, 201]:
                    success_count += 1
        except Exception:
            pass
            
    return success_count > 0

def save_data(data):
    try:
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        try:
            sync_ha_sensors(data)
        except Exception as e:
            print(f"Notice: HA sensor sync: {e}")
        return True
    except Exception as e:
        print(f"Error saving JSON file: {e}")
        return False

def build_bundle():
    files_order = [
        "static/js/state.js",
        "static/js/api.js",
        "static/js/calculations.js",
        "static/js/charts.js",
        "static/js/views/modals.js",
        "static/js/views/wizard.js",
        "static/js/views/overview.js",
        "static/js/views/accounts.js",
        "static/js/views/budgets.js",
        "static/js/views/bills.js",
        "static/js/views/year_overview.js",
        "static/js/views/settings.js",
        "static/js/views/calculator.js",
        "static/js/app.js",
    ]
    bundle_parts = ["// Unified single-file app bundle\n"]
    for fp in files_order:
        if os.path.exists(fp):
            with open(fp, "r", encoding="utf-8") as f:
                content = f.read()
            content = re.sub(r"import\s+[\s\S]*?from\s+['\"][^'\"]+['\"];?", "", content)
            content = re.sub(r"export\s+default\s+", "", content)
            content = re.sub(r"export\s+(function|const|let|var|async\s+function|class)\s+", r"\1 ", content)
            content = re.sub(r"export\s+\{[^}]+\};?", "", content)
            bundle_parts.append(f"// --- {fp} ---")
            bundle_parts.append(content)

    # Safety patch: inject any settings functions that may be missing from an older
    # cached build of app.js.  These are appended AFTER window.budgetApp is defined
    # so they always win, regardless of what version of app.js was compiled in.
    settings_patch = r"""
// --- settings function safety patch ---
(function() {
  var app = window.budgetApp;
  if (!app) return;

  if (typeof app.addCurrentAccountInSettings !== 'function') {
    app.addCurrentAccountInSettings = async function() {
      var name = prompt('Enter current account name:');
      if (name && name.trim()) {
        getSettings().current_accounts.push(name.trim());
        calculateAndSyncRollovers();
        renderContent();
        if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
      }
    };
  }

  if (typeof app.addCreditAccountInSettings !== 'function') {
    app.addCreditAccountInSettings = async function() {
      var name = prompt('Enter credit card name:');
      if (name && name.trim()) {
        getSettings().credit_accounts.push({
          name: name.trim(),
          limit: 0,
          autopay_enabled: false,
          autopay_from: getSettings().current_accounts[0] || '',
          autopay_when: 'week_1',
          autopay_type: 'full',
          autopay_fixed_amt: 0.00
        });
        calculateAndSyncRollovers();
        renderContent();
        if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
      }
    };
  }

  if (typeof app.addSavingsAccountInSettings !== 'function') {
    app.addSavingsAccountInSettings = async function() {
      var name = prompt('Enter savings account name:');
      if (name && name.trim()) {
        getSettings().savings_accounts.push(name.trim());
        calculateAndSyncRollovers();
        renderContent();
        if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
      }
    };
  }

  if (typeof app.editCreditAccount !== 'function') {
    app.editCreditAccount = async function(idx, field, value) {
      var acc = getSettings().credit_accounts[idx];
      if (!acc) return;
      if (field === 'autopay_enabled') {
        acc[field] = (value === true || value === 'true');
      } else if (field === 'limit' || field === 'autopay_fixed_amt') {
        acc[field] = parseFloat(value) || 0;
      } else {
        acc[field] = value;
      }
      calculateAndSyncRollovers();
      renderContent();
      if (getSettings().onboarding_complete) { await saveBudget(appState.data); }
    };
  }
})();
"""
    bundle_parts.append(settings_patch)

    os.makedirs("static/js", exist_ok=True)
    with open("static/js/bundle.js", "w", encoding="utf-8") as f:
        f.write("\n".join(bundle_parts))
    print("App bundle generated successfully.")

try:
    build_bundle()
except Exception as e:
    print(f"Bundle build warning: {e}")

@app.route("/api/version", methods=["GET"])
def version_api():
    return jsonify({"build_id": BUILD_ID, "version": APP_VERSION})

@app.route("/api/auth/status", methods=["GET"])
def auth_status_api():
    data = load_data()
    settings = data.get("settings", {})
    sec = settings.get("security", {})
    is_multi = settings.get("enable_multi_user", False)
    
    personas_info = {}
    if is_multi:
        people = settings.get("people", [])
        sec_personas = sec.get("personas", {})
        people_settings = settings.get("people_settings", {})
        for p in people:
            p_sec = sec_personas.get(p, {}) if isinstance(sec_personas, dict) else {}
            p_sett = people_settings.get(p, {}) if isinstance(people_settings, dict) else {}
            pin_set = bool(p_sec.get("enabled") and p_sec.get("pin_hash")) or bool(p_sett.get("pin"))
            personas_info[p] = {
                "pin_required": pin_set,
                "hide_salary": bool(p_sett.get("hide_salary", False))
            }
        personas_info["Joint"] = {
            "pin_required": bool(sec.get("joint_pin_enabled") and sec.get("joint_pin_hash"))
        }

    return jsonify({
        "master_pin_enabled": bool(sec.get("master_pin_enabled") and sec.get("master_pin_hash")),
        "multi_user": is_multi,
        "personas": personas_info
    })

@app.route("/api/auth/unlock", methods=["POST"])
def auth_unlock_api():
    req = request.get_json(force=True) or {}
    persona = req.get("persona", "Master")
    pin = str(req.get("pin", "")).strip()
    
    data = load_data()
    settings = data.get("settings", {})
    sec = settings.get("security", {})
    
    if persona == "Master":
        salt = sec.get("master_salt", "")
        expected_hash = sec.get("master_pin_hash", "")
        if not expected_hash:
            return jsonify({"success": True, "persona": "Master"})
        calc_hash = hash_pin_for_verification(pin, salt)
        if calc_hash == expected_hash:
            return jsonify({"success": True, "persona": "Master"})
        return jsonify({"success": False, "error": "Incorrect PIN"}), 401
        
    elif persona == "Joint":
        salt = sec.get("joint_salt", "")
        expected_hash = sec.get("joint_pin_hash", "")
        if not expected_hash:
            return jsonify({"success": True, "persona": "Joint"})
        calc_hash = hash_pin_for_verification(pin, salt)
        if calc_hash == expected_hash:
            return jsonify({"success": True, "persona": "Joint"})
        return jsonify({"success": False, "error": "Incorrect PIN"}), 401
        
    else: # Specific Person
        sec_personas = sec.get("personas", {}) if isinstance(sec.get("personas"), dict) else {}
        p_sec = sec_personas.get(persona, {})
        p_sett = settings.get("people_settings", {}).get(persona, {}) if isinstance(settings.get("people_settings"), dict) else {}
        salt = p_sec.get("salt", "")
        expected_hash = p_sec.get("pin_hash", "")
        
        # Legacy fallback
        if not expected_hash and p_sett.get("pin"):
            if str(p_sett.get("pin")).strip() == pin:
                new_salt = generate_salt_b64()
                new_hash = hash_pin_for_verification(pin, new_salt)
                if "personas" not in sec or not isinstance(sec["personas"], dict):
                    sec["personas"] = {}
                sec["personas"][persona] = {"enabled": True, "salt": new_salt, "pin_hash": new_hash}
                p_sett["pin"] = ""
                save_data(data)
                return jsonify({"success": True, "persona": persona, "also_unlocked": ["Joint"]})
            else:
                return jsonify({"success": False, "error": "Incorrect PIN"}), 401
                
        if not expected_hash:
            return jsonify({"success": True, "persona": persona, "also_unlocked": ["Joint"]})
            
        calc_hash = hash_pin_for_verification(pin, salt)
        if calc_hash == expected_hash:
            return jsonify({
                "success": True,
                "persona": persona,
                "also_unlocked": ["Joint"]
            })
        return jsonify({"success": False, "error": "Incorrect PIN"}), 401

@app.route("/api/auth/set_pin", methods=["POST"])
def auth_set_pin_api():
    req = request.get_json(force=True) or {}
    persona = req.get("persona", "Master")
    new_pin = str(req.get("new_pin", "")).strip()
    old_pin = str(req.get("old_pin", "")).strip()
    enabled = req.get("enabled", True)
    
    data = load_data()
    settings = data.get("settings", {})
    if "security" not in settings or not isinstance(settings["security"], dict):
        settings["security"] = copy.deepcopy(DEFAULT_SETTINGS["security"])
    sec = settings["security"]
    
    if persona == "Master":
        if sec.get("master_pin_enabled") and sec.get("master_pin_hash"):
            curr_hash = hash_pin_for_verification(old_pin, sec.get("master_salt", ""))
            if curr_hash != sec.get("master_pin_hash"):
                return jsonify({"success": False, "error": "Current PIN is incorrect"}), 400
        
        if not enabled or not new_pin:
            sec["master_pin_enabled"] = False
            sec["master_pin_hash"] = ""
            sec["master_salt"] = ""
        else:
            new_salt = generate_salt_b64()
            new_hash = hash_pin_for_verification(new_pin, new_salt)
            sec["master_pin_enabled"] = True
            sec["master_salt"] = new_salt
            sec["master_pin_hash"] = new_hash
            
    elif persona == "Joint":
        if sec.get("joint_pin_enabled") and sec.get("joint_pin_hash"):
            curr_hash = hash_pin_for_verification(old_pin, sec.get("joint_salt", ""))
            if curr_hash != sec.get("joint_pin_hash"):
                return jsonify({"success": False, "error": "Current PIN is incorrect"}), 400
        
        if not enabled or not new_pin:
            sec["joint_pin_enabled"] = False
            sec["joint_pin_hash"] = ""
            sec["joint_salt"] = ""
        else:
            new_salt = generate_salt_b64()
            new_hash = hash_pin_for_verification(new_pin, new_salt)
            sec["joint_pin_enabled"] = True
            sec["joint_salt"] = new_salt
            sec["joint_pin_hash"] = new_hash
            
    else: # Specific Person
        if "personas" not in sec or not isinstance(sec["personas"], dict):
            sec["personas"] = {}
        p_sec = sec["personas"].get(persona, {})
        if p_sec.get("enabled") and p_sec.get("pin_hash"):
            curr_hash = hash_pin_for_verification(old_pin, p_sec.get("salt", ""))
            if curr_hash != p_sec.get("pin_hash"):
                return jsonify({"success": False, "error": "Current PIN is incorrect"}), 400
        
        if not enabled or not new_pin:
            sec["personas"][persona] = {"enabled": False, "salt": "", "pin_hash": ""}
            if "people_settings" in settings and persona in settings["people_settings"]:
                settings["people_settings"][persona]["pin"] = ""
        else:
            new_salt = generate_salt_b64()
            new_hash = hash_pin_for_verification(new_pin, new_salt)
            sec["personas"][persona] = {"enabled": True, "salt": new_salt, "pin_hash": new_hash}
            if "people_settings" in settings and persona in settings["people_settings"]:
                settings["people_settings"][persona]["pin"] = ""
                
    save_data(data)
    return jsonify({"success": True, "persona": persona, "enabled": enabled and bool(new_pin)})

@app.route("/api/budget", methods=["GET", "POST"])
def budget_api():
    if request.method == "POST":
        save_data(request.get_json(force=True))
        return jsonify({"status": "saved"})
    return jsonify(load_data())

@app.route("/api/ha/sensors", methods=["GET", "POST"])
def ha_sensors_api():
    data = load_data()
    if request.method == "POST":
        synced = sync_ha_sensors(data)
        return jsonify({"status": "synced" if synced else "skipped", "supervisor_available": bool(os.environ.get("SUPERVISOR_TOKEN"))})
    sensors = compute_ha_sensors(data)
    return jsonify({
        "enabled": data.get("settings", {}).get("enable_ha_sensors", True),
        "supervisor_available": bool(os.environ.get("SUPERVISOR_TOKEN")),
        "sensors": sensors
    })

@app.route("/", defaults={"path": ""}, methods=["GET", "POST"])
@app.route("/<path:path>", methods=["GET", "POST"])
def catch_all(path):
    if path.endswith("api/version"):
        return jsonify({"build_id": BUILD_ID, "version": APP_VERSION})

    if path.endswith("api/ha/sensors"):
        data = load_data()
        if request.method == "POST":
            synced = sync_ha_sensors(data)
            return jsonify({"status": "synced" if synced else "skipped", "supervisor_available": bool(os.environ.get("SUPERVISOR_TOKEN"))})
        sensors = compute_ha_sensors(data)
        return jsonify({
            "enabled": data.get("settings", {}).get("enable_ha_sensors", True),
            "supervisor_available": bool(os.environ.get("SUPERVISOR_TOKEN")),
            "sensors": sensors
        })

    if path.endswith("api/budget"):
        if request.method == "POST":
            save_data(request.get_json(force=True))
            return jsonify({"status": "saved"})
        return jsonify(load_data())
    
    if path.startswith("static/"):
        resp = make_response(send_from_directory("static", path[7:]))
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        resp.headers.pop("ETag", None)
        resp.headers.pop("Last-Modified", None)
        return resp
        
    resp = make_response(render_template("index.html", BUILD_ID=BUILD_ID, v=BUILD_ID, app_version=APP_VERSION))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    resp.headers.pop("ETag", None)
    resp.headers.pop("Last-Modified", None)
    return resp

# Initial Startup Sync
try:
    _init_data = load_data()
    sync_ha_sensors(_init_data)
except Exception as _e:
    print(f"Notice: Initial HA sensor sync: {_e}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8099)
