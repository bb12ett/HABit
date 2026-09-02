import time
import json
import os
import copy
import re
import uuid
import datetime
import csv
import io
import threading
import urllib.request
import urllib.error
import urllib.parse
from flask import Flask, jsonify, request, send_from_directory, render_template, make_response, Response

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
    return os.environ.get("APP_VERSION", "0.1.7")

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

def get_easter_py(year: int) -> datetime.date:
    G = year % 19
    C = year // 100
    H = (C - C // 4 - (8 * C + 13) // 25 + 19 * G + 15) % 30
    I = H - (H // 28) * (1 - (29 // (H + 1)) * ((21 - G) // 11))
    J = (year + year // 4 + I + 2 - C + C // 4) % 7
    L = I - J
    month = 3 + (L + 40) // 44
    day = L + 28 - 31 * (month // 4)
    return datetime.date(year, month, day)

def get_bank_holidays_py(year: int, country: str = 'uk_ew') -> list:
    if country == 'none':
        return []
    hols = [datetime.date(year, 1, 1)]
    easter = get_easter_py(year)
    gf = easter - datetime.timedelta(days=2)
    em = easter + datetime.timedelta(days=1)
    hols.append(gf)
    hols.append(em)
    d = datetime.date(year, 5, 1)
    while d.weekday() != 0:
        d += datetime.timedelta(days=1)
    hols.append(d)
    d = datetime.date(year, 5, 31)
    while d.weekday() != 0:
        d -= datetime.timedelta(days=1)
    hols.append(d)
    d = datetime.date(year, 8, 31)
    while d.weekday() != 0:
        d -= datetime.timedelta(days=1)
    hols.append(d)
    hols.append(datetime.date(year, 12, 25))
    hols.append(datetime.date(year, 12, 26))
    return hols

def get_adjusted_working_day_py(date_obj: datetime.date, rule: str = 'previous', holidays: list = None) -> datetime.date:
    if rule == 'exact':
        return date_obj
    curr = date_obj
    hols = holidays or []
    if rule == 'previous':
        while curr.weekday() in [5, 6] or curr in hols:
            curr -= datetime.timedelta(days=1)
    else:
        while curr.weekday() in [5, 6] or curr in hols:
            curr += datetime.timedelta(days=1)
    return curr

def get_target_pay_date_py(year: int, month: int, settings: dict, holidays: list = None) -> datetime.date:
    if month < 1:
        year -= 1
        month = 12
    elif month > 12:
        year += 1
        month = 1
    
    p_last_work = settings.get('payday_is_last_working_day') or settings.get('payday_day') == 'last_working_day'
    p_last_day = settings.get('payday_day') == 'last_day'
    
    if month in [1,3,5,7,8,10,12]: max_d = 31
    elif month in [4,6,9,11]: max_d = 30
    else: max_d = 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28
    
    if p_last_work:
        last_day = datetime.date(year, month, max_d)
        return get_adjusted_working_day_py(last_day, 'previous', holidays)
    elif p_last_day:
        return datetime.date(year, month, max_d)
    else:
        try:
            p_day = int(settings.get('payday_day', 26) or 26)
        except Exception:
            p_day = 26
        raw_date = datetime.date(year, month, min(p_day, max_d))
        rule = settings.get('payday_rule', 'previous')
        return get_adjusted_working_day_py(raw_date, rule, holidays)

def get_payday_monday_py(d: datetime.date) -> datetime.date:
    wd = d.weekday()
    if wd == 6:
        return d + datetime.timedelta(days=1)
    elif wd == 5:
        return d + datetime.timedelta(days=2)
    else:
        return d - datetime.timedelta(days=wd)

def calculate_month_schedule_py(year: int, month_idx: int, settings: dict, month_data: dict = None) -> dict:
    md = month_data or {}
    override_start = md.get('override_start_date') or md.get('date_overrides', {}).get('start_date')
    override_end = md.get('override_end_date') or md.get('date_overrides', {}).get('end_date')
    
    if override_start and override_end:
        try:
            start_date = datetime.date.fromisoformat(override_start)
            end_date = datetime.date.fromisoformat(override_end)
            next_start_date = end_date + datetime.timedelta(days=1)
        except Exception:
            override_start = None
            override_end = None
            
    if not (override_start and override_end):
        country = settings.get('bank_holiday_country', 'uk_ew')
        hols = get_bank_holidays_py(year, country) + get_bank_holidays_py(year - 1, country) + get_bank_holidays_py(year + 1, country)
        m = month_idx + 1
        start_ref = get_target_pay_date_py(year, m - 1, settings, hols)
        end_ref = get_target_pay_date_py(year, m, settings, hols)
        
        start_date = get_payday_monday_py(start_ref)
        next_start_date = get_payday_monday_py(end_ref)
        end_date = next_start_date - datetime.timedelta(days=1)
    
    diff_days = (next_start_date - start_date).days
    num_weeks = max(1, round(diff_days / 7))
    
    weeks = []
    for i in range(num_weeks):
        w_start = start_date + datetime.timedelta(days=i * 7)
        w_end = w_start + datetime.timedelta(days=6)
        if i == num_weeks - 1 and override_start and override_end:
            w_end = end_date
        weeks.append({
            'name': f'Week {i + 1}',
            'start_date': w_start,
            'end_date': w_end
        })
        
    return {
        'start_date': start_date,
        'end_date': end_date,
        'num_weeks': num_weeks,
        'weeks': weeks,
        'month_name': MONTH_NAMES[month_idx]
    }

def detect_current_month_and_week_py(data: dict, today: datetime.date = None) -> tuple:
    if today is None:
        today = datetime.date.today()
    
    year = today.year
    settings = data.get('settings', {})
    year_data = data.get('years', {}).get(str(year), {})
    
    for m_idx in range(12):
        m_name = MONTH_NAMES[m_idx]
        m_data = year_data.get('months', {}).get(m_name, {})
        sched = calculate_month_schedule_py(year, m_idx, settings, m_data)
        if sched['start_date'] <= today <= sched['end_date']:
            for w in sched['weeks']:
                if w['start_date'] <= today <= w['end_date']:
                    return m_name, w['name']
            return m_name, sched['weeks'][0]['name']
            
    cur_m_name = MONTH_NAMES[today.month - 1]
    return cur_m_name, 'Week 1'


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
    
    # Identify current month & active week
    current_month_name, active_week_name = detect_current_month_and_week_py(budget_data, today)
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
    active_week_key = "w" + active_week_name.replace("Week ", "").strip()
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
        "static/js/views/spend_analytics.js",
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

# ---------------------------------------------------------
# CATEGORIES CATALOG & GITHUB SYNC ENGINE
# ---------------------------------------------------------
DATA_DIR = "/data" if os.path.exists("/data") else os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CATEGORIES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "categories")
CATEGORIES_CACHE_DIR = os.path.join(DATA_DIR, "categories_cache")
GITHUB_CATEGORIES_BASE = "https://raw.githubusercontent.com/bb12ett/HABit/main/categories"

_IN_MEMORY_CATEGORIES = []
_LAST_CATEGORIES_SYNC = None

def load_categories_catalog():
    global _IN_MEMORY_CATEGORIES
    cats = []
    
    # Check cache dir first, then fallback to local categories/ folder
    source_dir = CATEGORIES_CACHE_DIR if (os.path.exists(CATEGORIES_CACHE_DIR) and os.path.exists(os.path.join(CATEGORIES_CACHE_DIR, "index.json"))) else CATEGORIES_DIR
    index_file = os.path.join(source_dir, "index.json")
    
    if os.path.exists(index_file):
        try:
            with open(index_file, "r", encoding="utf-8") as f:
                index_data = json.load(f)
            for item in index_data:
                file_name = item.get("file") or f"{item.get('id')}.json"
                cat_file = os.path.join(source_dir, file_name)
                if not os.path.exists(cat_file):
                    cat_file = os.path.join(CATEGORIES_DIR, file_name)
                if os.path.exists(cat_file):
                    with open(cat_file, "r", encoding="utf-8") as cf:
                        cat_content = json.load(cf)
                        cats.append(cat_content)
                else:
                    cats.append({
                        "id": item.get("id"),
                        "label": item.get("label"),
                        "icon": item.get("icon"),
                        "color": item.get("color"),
                        "keywords": []
                    })
        except Exception as e:
            print(f"Notice: Loading categories index error: {e}")
            
    _IN_MEMORY_CATEGORIES = cats
    return _IN_MEMORY_CATEGORIES

def sync_categories_from_github():
    global _LAST_CATEGORIES_SYNC, _IN_MEMORY_CATEGORIES
    try:
        os.makedirs(CATEGORIES_CACHE_DIR, exist_ok=True)
        index_url = f"{GITHUB_CATEGORIES_BASE}/index.json?t={int(time.time())}"
        req = urllib.request.Request(index_url, headers={"User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            index_data = json.loads(resp.read().decode("utf-8"))
            
        with open(os.path.join(CATEGORIES_CACHE_DIR, "index.json"), "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2)
            
        synced_cats = []
        for item in index_data:
            file_name = item.get("file") or f"{item.get('id')}.json"
            cat_url = f"{GITHUB_CATEGORIES_BASE}/{file_name}?t={int(time.time())}"
            req_c = urllib.request.Request(cat_url, headers={"User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"})
            try:
                with urllib.request.urlopen(req_c, timeout=10) as c_resp:
                    cat_json = json.loads(c_resp.read().decode("utf-8"))
                    with open(os.path.join(CATEGORIES_CACHE_DIR, file_name), "w", encoding="utf-8") as cf:
                        json.dump(cat_json, cf, indent=2)
                    synced_cats.append(cat_json)
            except Exception as e_c:
                print(f"Notice: Category file sync ({file_name}): {e_c}")
                
        if synced_cats:
            _IN_MEMORY_CATEGORIES = synced_cats
            _LAST_CATEGORIES_SYNC = datetime.datetime.now(datetime.timezone.utc).isoformat()
            print(f"[Categories] Successfully synced {len(synced_cats)} categories from GitHub.")
            return True, len(synced_cats)
    except Exception as e:
        print(f"[Categories] GitHub sync notice: {e}")
        return False, str(e)
    return False, "Unknown error"

@app.route("/api/categories", methods=["GET"])
def get_categories_api():
    cats = load_categories_catalog()
    data = load_data()
    custom_rules = data.get("settings", {}).get("merchant_category_rules", {})
    return jsonify({
        "success": True,
        "categories": cats,
        "custom_rules": custom_rules,
        "last_sync": _LAST_CATEGORIES_SYNC,
        "source": "cache" if os.path.exists(CATEGORIES_CACHE_DIR) else "bundled"
    })

@app.route("/api/categories/sync", methods=["POST"])
def sync_categories_api():
    ok, count_or_err = sync_categories_from_github()
    cats = load_categories_catalog()
    return jsonify({
        "success": ok,
        "count": count_or_err if ok else 0,
        "error": None if ok else str(count_or_err),
        "last_sync": _LAST_CATEGORIES_SYNC,
        "categories": cats
    })

@app.route("/api/categories/suggest", methods=["POST"])
def suggest_category_merchant_api():
    payload = request.get_json(force=True) if request.is_json else {}
    merchant = (payload.get("merchant") or "").strip()
    category = (payload.get("category") or "").strip()
    notes = (payload.get("notes") or "").strip()
    
    if not merchant or not category:
        return jsonify({"success": False, "error": "Merchant and category are required."}), 400
        
    suggestion_file = os.path.join(DATA_DIR, "suggested_merchants.json")
    suggestions = []
    if os.path.exists(suggestion_file):
        try:
            with open(suggestion_file, "r", encoding="utf-8") as f:
                suggestions = json.load(f)
        except Exception:
            suggestions = []
            
    new_entry = {
        "id": str(uuid.uuid4()),
        "merchant": merchant,
        "category": category,
        "notes": notes,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    suggestions.append(new_entry)
    
    try:
        with open(suggestion_file, "w", encoding="utf-8") as f:
            json.dump(suggestions, f, indent=2)
    except Exception as e:
        print(f"Notice: Error saving suggestion queue: {e}")
        
    return jsonify({
        "success": True,
        "message": f"Merchant '{merchant}' suggested for category '{category}'. Thank you for contributing!",
        "entry": new_entry
    })

@app.route("/api/categories/export_rules", methods=["GET"])
def export_category_rules_api():
    data = load_data()
    custom_rules = data.get("settings", {}).get("merchant_category_rules", {})
    return jsonify({
        "success": True,
        "merchant_rules": custom_rules,
        "count": len(custom_rules)
    })

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

# ---------------------------------------------------------
# OPEN BANKING CLIENTS & AUTOMATED CASHFLOW ENGINE
# ---------------------------------------------------------

DEBUG_LOG_FILE = "/data/open_banking_debug.txt" if os.path.exists("/data") else "open_banking_debug.txt"

def log_open_banking_debug(msg, force=False):
    try:
        data = load_data()
        ob_cfg = data.get("settings", {}).get("open_banking", {})
        if not ob_cfg.get("debug_logging", False) and not force:
            return
    except Exception:
        pass

    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    line = f"[{now_str}] {msg}\n"
    print(f"[OpenBankingDebug] {msg}")
    for p in [DEBUG_LOG_FILE, "open_banking_debug.txt", "/data/open_banking_debug.txt"]:
        try:
            with open(p, "a", encoding="utf-8") as f:
                f.write(line)
        except Exception:
            pass

class GoCardlessClient:
    BASE_URL = "https://bankaccountdata.gocardless.com/api/v2"

    def __init__(self, secret_id, secret_key):
        self.secret_id = secret_id
        self.secret_key = secret_key
        self._access_token = None
        self._token_expires_at = 0

    def _get_token(self):
        now = datetime.datetime.now(datetime.timezone.utc).timestamp()
        if self._access_token and now < (self._token_expires_at - 60):
            return self._access_token

        url = f"{self.BASE_URL}/token/new/"
        payload = json.dumps({
            "secret_id": self.secret_id,
            "secret_key": self.secret_key
        }).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
        })

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self._access_token = data.get("access")
                access_valid_for = data.get("access_expires", 86400)
                self._token_expires_at = now + access_valid_for
                return self._access_token
        except Exception as e:
            raise RuntimeError(f"GoCardless authentication failed: {e}")

    def _api_request(self, endpoint, method="GET", data=None):
        token = self._get_token()
        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
        }
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_institutions(self, country="GB"):
        return self._api_request(f"/institutions/?country={country.upper()}")

    def create_requisition(self, institution_id, redirect_uri, reference=None):
        if not reference:
            reference = str(uuid.uuid4())
        payload = {
            "redirect": redirect_uri,
            "institution_id": institution_id,
            "reference": reference,
            "user_language": "EN"
        }
        return self._api_request("/requisitions/", method="POST", data=payload)

    def get_requisition(self, requisition_id):
        return self._api_request(f"/requisitions/{requisition_id}/")

    def get_account_details(self, account_id):
        return self._api_request(f"/accounts/{account_id}/")

    def get_account_balances(self, account_id):
        return self._api_request(f"/accounts/{account_id}/balances/")

    def get_account_transactions(self, account_id, date_from=None):
        endpoint = f"/accounts/{account_id}/transactions/"
        if date_from:
            endpoint += f"?date_from={date_from}"
        return self._api_request(endpoint)

    def delete_requisition(self, requisition_id):
        try:
            return self._api_request(f"/requisitions/{requisition_id}/", method="DELETE")
        except Exception:
            return {"status": "deleted"}


# ---------------------------------------------------------
# STATEMENT FILE PARSER (CSV / OFX / QIF)
# ---------------------------------------------------------

class StatementFileParser:
    @staticmethod
    def parse_statement(content_str, filename=""):
        ext = filename.lower().split('.')[-1] if '.' in filename else ""
        if ext in ["ofx", "qfx"]:
            return StatementFileParser.parse_ofx(content_str)
        elif ext in ["qif"]:
            return StatementFileParser.parse_qif(content_str)
        else:
            return StatementFileParser.parse_csv(content_str)

    @staticmethod
    def parse_csv(content_str):
        txns = []
        lines = [line for line in content_str.strip().splitlines() if line.strip()]
        if not lines:
            return txns

        sample = "\n".join(lines[:10])
        delimiter = ','
        if '\t' in sample and ',' not in sample:
            delimiter = '\t'
        elif ';' in sample and ',' not in sample:
            delimiter = ';'

        reader = csv.reader(io.StringIO(content_str), delimiter=delimiter)
        rows = list(reader)
        if not rows:
            return txns

        headers = [h.strip().lower() for h in rows[0]]
        
        date_idx = -1
        desc_idx = -1
        amt_idx = -1
        debit_idx = -1
        credit_idx = -1

        for i, h in enumerate(headers):
            h_clean = re.sub(r'[^a-z0-9]', '', h)
            if 'date' in h_clean and date_idx == -1:
                date_idx = i
            elif any(k in h_clean for k in ['desc', 'payee', 'name', 'memo', 'counterparty', 'reference']) and desc_idx == -1:
                desc_idx = i
            elif any(k in h_clean for k in ['amount', 'value', 'localamount']) and 'balance' not in h_clean and amt_idx == -1:
                amt_idx = i
            elif any(k in h_clean for k in ['debit', 'paidout', 'moneyout', 'out']) and debit_idx == -1:
                debit_idx = i
            elif any(k in h_clean for k in ['credit', 'paidin', 'moneyin', 'in']) and credit_idx == -1:
                credit_idx = i

        if date_idx == -1:
            date_idx = 0
        if desc_idx == -1:
            desc_idx = 1 if len(headers) > 1 else 0

        for row in rows[1:]:
            if len(row) <= max(date_idx, desc_idx):
                continue

            raw_date = row[date_idx].strip()
            raw_desc = row[desc_idx].strip()
            if not raw_date or not raw_desc:
                continue

            iso_date = StatementFileParser.normalize_date(raw_date)
            if not iso_date:
                continue

            amount_float = 0.0
            if amt_idx != -1 and len(row) > amt_idx and row[amt_idx].strip():
                amount_float = StatementFileParser.clean_amount(row[amt_idx])
            elif debit_idx != -1 and len(row) > debit_idx and row[debit_idx].strip():
                d_val = StatementFileParser.clean_amount(row[debit_idx])
                amount_float = -abs(d_val) if d_val != 0 else 0.0
                if credit_idx != -1 and len(row) > credit_idx and row[credit_idx].strip():
                    c_val = StatementFileParser.clean_amount(row[credit_idx])
                    if c_val > 0:
                        amount_float = c_val
            elif credit_idx != -1 and len(row) > credit_idx and row[credit_idx].strip():
                amount_float = abs(StatementFileParser.clean_amount(row[credit_idx]))

            if amount_float == 0.0:
                continue

            tid = f"csv-{iso_date}-{abs(amount_float):.2f}-{re.sub(r'[^a-zA-Z0-9]', '', raw_desc)[:12]}"
            txns.append({
                "transaction_id": tid,
                "booking_date": iso_date,
                "amount": amount_float,
                "payee_name": raw_desc,
                "currency": "GBP",
                "raw_info": raw_desc,
                "source": "statement_upload",
                "auto_cleared": False
            })

        return txns

    @staticmethod
    def parse_ofx(content_str):
        txns = []
        stmt_blocks = re.findall(r'<STMTTRN>(.*?)</STMTTRN>', content_str, re.DOTALL | re.IGNORECASE)
        if not stmt_blocks:
            stmt_blocks = re.split(r'<STMTTRN>', content_str, flags=re.IGNORECASE)[1:]

        for block in stmt_blocks:
            amt_match = re.search(r'<TRNAMT>([+-]?\d+(?:\.\d+)?)', block, re.IGNORECASE)
            date_match = re.search(r'<DTPOSTED>(\d{8})', block, re.IGNORECASE)
            name_match = re.search(r'<NAME>(.*?)(?:<|\r|\n|$)', block, re.IGNORECASE)
            memo_match = re.search(r'<MEMO>(.*?)(?:<|\r|\n|$)', block, re.IGNORECASE)
            id_match = re.search(r'<FITID>(.*?)(?:<|\r|\n|$)', block, re.IGNORECASE)

            if amt_match and date_match:
                amount_float = float(amt_match.group(1))
                d_str = date_match.group(1)
                iso_date = f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]}"
                payee = (name_match.group(1).strip() if name_match else (memo_match.group(1).strip() if memo_match else "Bank Transaction"))
                tid = id_match.group(1).strip() if id_match else f"ofx-{iso_date}-{abs(amount_float):.2f}-{re.sub(r'[^a-zA-Z0-9]', '', payee)[:12]}"
                txns.append({
                    "transaction_id": tid,
                    "booking_date": iso_date,
                    "amount": amount_float,
                    "payee_name": payee,
                    "currency": "GBP",
                    "raw_info": block[:80],
                    "source": "statement_upload",
                    "auto_cleared": False
                })
        return txns

    @staticmethod
    def parse_qif(content_str):
        txns = []
        current = {}
        for line in content_str.splitlines():
            line = line.strip()
            if not line:
                continue
            code = line[0]
            val = line[1:].strip()
            if code == 'D':
                current['date'] = StatementFileParser.normalize_date(val)
            elif code in ['T', 'U']:
                current['amount'] = StatementFileParser.clean_amount(val)
            elif code in ['P', 'M']:
                current['payee'] = val
            elif code == '^':
                if 'date' in current and 'amount' in current:
                    payee = current.get('payee', 'Bank Transaction')
                    tid = f"qif-{current['date']}-{abs(current['amount']):.2f}-{re.sub(r'[^a-zA-Z0-9]', '', payee)[:12]}"
                    txns.append({
                        "transaction_id": tid,
                        "booking_date": current['date'],
                        "amount": current['amount'],
                        "payee_name": payee,
                        "currency": "GBP",
                        "raw_info": payee,
                        "source": "statement_upload",
                        "auto_cleared": False
                    })
                current = {}
        return txns

    @staticmethod
    def clean_amount(val_str):
        clean = re.sub(r'[^\d.-]', '', str(val_str).replace(',', ''))
        try:
            return float(clean)
        except Exception:
            return 0.0

    @staticmethod
    def normalize_date(d_str):
        d_str = d_str.strip()
        if re.match(r'^\d{4}-\d{2}-\d{2}$', d_str):
            return d_str
        m1 = re.match(r'^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$', d_str)
        if m1:
            return f"{m1.group(3)}-{int(m1.group(2)):02d}-{int(m1.group(1)):02d}"
        m2 = re.match(r'^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$', d_str)
        if m2:
            yr = int(m2.group(3))
            full_yr = 2000 + yr if yr < 70 else 1900 + yr
            return f"{full_yr}-{int(m2.group(2)):02d}-{int(m2.group(1)):02d}"
        if re.match(r'^\d{8}$', d_str):
            return f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]}"
        return None


# ---------------------------------------------------------
# ENABLE BANKING CLIENT (https://api.enablebanking.com)
# ---------------------------------------------------------

class EnableBankingClient:
    BASE_URL = "https://api.enablebanking.com"

    def __init__(self, app_id, app_key):
        self.app_id = app_id
        self.app_key = app_key

    def _api_request(self, endpoint, method="GET", data=None):
        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.app_key}",
            "X-Application-Id": self.app_id,
            "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
        }
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_institutions(self, country="GB"):
        return self._api_request(f"/aspsps?country={country.upper()}")

    def create_requisition(self, institution_id, redirect_uri, reference=None):
        payload = {
            "aspsp": {"name": institution_id, "country": "GB"},
            "redirect_url": redirect_uri,
            "state": reference or str(uuid.uuid4()),
            "access": {"valid_until": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=90)).isoformat()}
        }
        res = self._api_request("/auth", method="POST", data=payload)
        return {
            "id": res.get("session_id") or res.get("state") or reference,
            "link": res.get("url"),
            "redirect": res.get("url"),
            "status": "CR"
        }

    def get_requisition(self, requisition_id):
        return self._api_request(f"/sessions/{requisition_id}")

    def get_account_details(self, account_id):
        return self._api_request(f"/accounts/{account_id}/details")

    def get_account_balances(self, account_id):
        return self._api_request(f"/accounts/{account_id}/balances")

    def get_account_transactions(self, account_id, date_from=None):
        endpoint = f"/accounts/{account_id}/transactions"
        if date_from:
            endpoint += f"?date_from={date_from}"
        return self._api_request(endpoint)

    def delete_requisition(self, requisition_id):
        try:
            return self._api_request(f"/sessions/{requisition_id}", method="DELETE")
        except Exception:
            return {"status": "deleted"}


# ---------------------------------------------------------
# TRUELAYER CLIENT (https://api.truelayer.com)
# ---------------------------------------------------------

class TrueLayerClient:
    AUTH_BASE = "https://auth.truelayer.com"
    API_BASE = "https://api.truelayer.com"

    TRUELAYER_PROVIDER_MAP = {
        "MONZO_MONZGB2L": "uk-ob-monzo",
        "STARLING_SRLGGB2L": "uk-ob-starling",
        "REVOLUT_REVOGB21": "uk-ob-revolut",
        "BARCLAYS_BUKBGB22": "uk-ob-barclays",
        "BARCLAYCARD_BUKBGB22": "uk-ob-barclaycard",
        "CAPITALONE_COUKGB21": "uk-ob-capital-one",
        "MBNA_BOFSGB21": "uk-ob-mbna",
        "CHASE_CHASGB2L": "uk-ob-chase",
        "HSBC_HBUKGB41": "uk-ob-hsbc",
        "LLOYDS_LOYDGB21": "uk-ob-lloyds",
        "NATWEST_NWBKGB2L": "uk-ob-natwest",
        "SANTANDER_ABBYGB2L": "uk-ob-santander",
        "HALIFAX_HLFXGB21": "uk-ob-halifax",
        "NATIONWIDE_NACOGB21": "uk-ob-nationwide",
        "FIRSTDIRECT_FRESGB21": "uk-ob-first-direct",
        "BANKOFSCOTLAND_BOFSGB21": "uk-ob-bank-of-scotland",
        "VIRGINMONEY_NORTGB21": "uk-ob-virgin-money",
        "TSB_TSBCGB21": "uk-ob-tsb",
        "METROBANK_MYMBGB2L": "uk-ob-metro",
        "AMEX_AMEXGB2L": "uk-ob-amex",
        "RBS_RBOSGB2L": "uk-ob-rbs",
        "ULSTER_ULSBGB2B": "uk-ob-ulster",
        "TESCO_TPBKGB21": "uk-ob-tesco",
        "SAINSBURYS_SAINBERR": "uk-ob-sainsburys",
        "COOP_CPBKGB22": "uk-ob-coop",
        "WISE_TRANSGB2L": "uk-ob-wise"
    }

    def __init__(self, client_id, client_secret, is_sandbox=False):
        self.client_id = (client_id or "").strip()
        self.client_secret = (client_secret or "").strip()
        self.is_sandbox = bool(is_sandbox)
        if self.is_sandbox:
            self.AUTH_BASE = "https://auth.truelayer-sandbox.com"
            self.API_BASE = "https://api.truelayer-sandbox.com"
        else:
            self.AUTH_BASE = "https://auth.truelayer.com"
            self.API_BASE = "https://api.truelayer.com"

    def get_institutions(self, country="GB"):
        return CURATED_INSTITUTIONS.get(country.upper(), CURATED_INSTITUTIONS["GB"])

    def create_requisition(self, institution_id, redirect_uri, reference=None):
        state = reference or str(uuid.uuid4())
        params = {
            "response_type": "code",
            "client_id": self.client_id.strip(),
            "scope": "info accounts balance cards transactions offline_access",
            "redirect_uri": redirect_uri.strip(),
            "state": state
        }
        provider_id = self.TRUELAYER_PROVIDER_MAP.get(institution_id)
        if provider_id:
            params["providers"] = f"uk-cs-mock {provider_id}" if self.is_sandbox else provider_id

        query_string = urllib.parse.urlencode(params)
        link = f"{self.AUTH_BASE}/?{query_string}"
        return {
            "id": state,
            "link": link,
            "redirect": link,
            "status": "CR"
        }

    def exchange_code_for_token(self, code, redirect_uri):
        endpoints = []
        if self.is_sandbox:
            endpoints = [
                ("https://auth.truelayer-sandbox.com/connect/token", "https://api.truelayer-sandbox.com", True),
                ("https://auth.truelayer.com/connect/token", "https://api.truelayer.com", False)
            ]
        else:
            endpoints = [
                ("https://auth.truelayer.com/connect/token", "https://api.truelayer.com", False),
                ("https://auth.truelayer-sandbox.com/connect/token", "https://api.truelayer-sandbox.com", True)
            ]

        clean_redirect = redirect_uri.strip()
        redirect_candidates = [clean_redirect]
        if clean_redirect.endswith('/'):
            redirect_candidates.append(clean_redirect.rstrip('/'))
        else:
            redirect_candidates.append(clean_redirect + '/')

        last_error = None
        for token_url, api_base, sandbox_flag in endpoints:
            for r_uri in redirect_candidates:
                payload = urllib.parse.urlencode({
                    "grant_type": "authorization_code",
                    "client_id": self.client_id.strip(),
                    "client_secret": self.client_secret.strip(),
                    "redirect_uri": r_uri,
                    "code": code.strip()
                }).encode("utf-8")

                req = urllib.request.Request(token_url, data=payload, headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
                })
                try:
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        self.API_BASE = api_base
                        self.AUTH_BASE = token_url.rsplit('/', 1)[0]
                        self.is_sandbox = sandbox_flag
                        return data
                except urllib.error.HTTPError as e:
                    raw = e.read().decode("utf-8", errors="ignore")
                    try:
                        err_json = json.loads(raw)
                        err_msg = err_json.get("error_description") or err_json.get("error") or raw
                    except Exception:
                        err_msg = raw
                    last_error = f"TrueLayer Error ({e.code}): {err_msg}"
                    # If invalid_client, move to next endpoint (live vs sandbox)
                    if "invalid_client" in raw or "invalid_client" in err_msg:
                        break
                except Exception as e:
                    last_error = str(e)

        raise RuntimeError(last_error or "Failed to exchange token with TrueLayer")

    def refresh_access_token(self, refresh_token):
        endpoints = []
        if self.is_sandbox:
            endpoints = [
                ("https://auth.truelayer-sandbox.com/connect/token", "https://api.truelayer-sandbox.com", True),
                ("https://auth.truelayer.com/connect/token", "https://api.truelayer.com", False)
            ]
        else:
            endpoints = [
                ("https://auth.truelayer.com/connect/token", "https://api.truelayer.com", False),
                ("https://auth.truelayer-sandbox.com/connect/token", "https://api.truelayer-sandbox.com", True)
            ]

        for token_url, api_base, sandbox_flag in endpoints:
            payload = urllib.parse.urlencode({
                "grant_type": "refresh_token",
                "client_id": self.client_id.strip(),
                "client_secret": self.client_secret.strip(),
                "refresh_token": refresh_token.strip()
            }).encode("utf-8")

            req = urllib.request.Request(token_url, data=payload, headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
            })
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    self.API_BASE = api_base
                    self.AUTH_BASE = token_url.rsplit('/', 1)[0]
                    self.is_sandbox = sandbox_flag
                    log_open_banking_debug(f"[TrueLayer] Successfully refreshed access token via {token_url}")
                    return data
            except urllib.error.HTTPError as e:
                raw = e.read().decode("utf-8", errors="ignore")
                log_open_banking_debug(f"[TrueLayer] refresh_token HTTPError ({e.code}) from {token_url}: {raw}")
                continue
            except Exception as e:
                log_open_banking_debug(f"[TrueLayer] refresh_token error from {token_url}: {e}")
                continue
        return None

    def get_accounts(self, access_token):
        accounts = []
        log_open_banking_debug(f"[TrueLayer] Starting get_accounts with token ({str(access_token)[:12]}...)")
        auth_error = None
        # 1. Bank Accounts (Current / Checking / Savings)
        try:
            url = f"{self.API_BASE}/data/v1/accounts"
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                acc_results = data.get("results", [])
                log_open_banking_debug(f"[TrueLayer] /data/v1/accounts results ({len(acc_results)}): {json.dumps(acc_results)}")
                accounts.extend(acc_results)
        except urllib.error.HTTPError as e:
            log_open_banking_debug(f"[TrueLayer] /data/v1/accounts HTTPError: {e}")
            if e.code == 401:
                auth_error = e
        except Exception as e:
            log_open_banking_debug(f"[TrueLayer] /data/v1/accounts error: {e}")

        # 2. Credit Cards / Payment Cards
        try:
            url = f"{self.API_BASE}/data/v1/cards"
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                cards = data.get("results", [])
                log_open_banking_debug(f"[TrueLayer] /data/v1/cards results ({len(cards)}): {json.dumps(cards)}")
                for c in cards:
                    card_num = c.get("partial_card_number") or "****"
                    card_acc = {
                        "account_id": c.get("account_id") or c.get("card_id") or c.get("id"),
                        "display_name": c.get("display_name") or f"{c.get('card_network', 'Credit Card')} (..{card_num})",
                        "currency": c.get("currency", "GBP"),
                        "account_type": "CARD",
                        "account_number": {
                            "number": f"**** **** **** {card_num}"
                        }
                    }
                    accounts.append(card_acc)
        except urllib.error.HTTPError as e:
            log_open_banking_debug(f"[TrueLayer] /data/v1/cards HTTPError: {e}")
            if e.code == 401:
                auth_error = e
        except Exception as e:
            log_open_banking_debug(f"[TrueLayer] /data/v1/cards error: {e}")

        if not accounts and auth_error is not None:
            raise auth_error

        log_open_banking_debug(f"[TrueLayer] Total accounts discovered: {len(accounts)}")
        return accounts

    def get_account_balances(self, access_token_or_id, account_id=None):
        if account_id:
            token = access_token_or_id
            aid = account_id
        else:
            token = self.client_secret
            aid = access_token_or_id

        log_open_banking_debug(f"[TrueLayer] get_account_balances for account_id={aid}")
        auth_error = None
        for resource in ["cards", "accounts"]:
            url = f"{self.API_BASE}/data/v1/{resource}/{aid}/balance"
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
            })
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    results = data.get("results", [])
                    log_open_banking_debug(f"[TrueLayer] Raw balance response from {resource}/{aid}: {json.dumps(data)}")
                    balances = []
                    for r in results:
                        curr = r.get("currency", "GBP")
                        avail_raw = r.get("available")
                        limit_raw = r.get("credit_limit")
                        curr_raw = r.get("current")

                        avail_val = float(avail_raw) if avail_raw is not None else None
                        limit_val = float(limit_raw) if limit_raw is not None else None
                        curr_val = float(curr_raw) if curr_raw is not None else None

                        if resource == "cards" or limit_val is not None:
                            # It's a credit card account
                            if curr_val is not None and curr_val != 0:
                                debt_val = abs(curr_val)
                            elif limit_val is not None and avail_val is not None and avail_val > 0:
                                debt_val = max(0.0, limit_val - avail_val)
                            elif avail_val is not None and avail_val > 0:
                                debt_val = 0.0
                            else:
                                debt_val = 0.0

                            bal_entry = {
                                "balanceAmount": {"amount": str(debt_val), "currency": curr},
                                "availableAmount": {"amount": str(avail_val) if avail_val is not None else (str(limit_val - debt_val) if limit_val else str(debt_val))},
                                "is_card": True
                            }
                            if limit_val is not None:
                                bal_entry["creditLimit"] = {"amount": str(limit_val), "currency": curr}
                        else:
                            # Standard bank account (Current/Savings)
                            amt = curr_val if curr_val is not None else (avail_val if avail_val is not None else 0.0)
                            bal_entry = {
                                "balanceAmount": {"amount": str(amt), "currency": curr},
                                "availableAmount": {"amount": str(avail_val if avail_val is not None else amt), "currency": curr},
                                "is_card": False
                            }
                        balances.append(bal_entry)

                    if balances:
                        log_open_banking_debug(f"[TrueLayer] Parsed balances for {aid}: {json.dumps(balances)}")
                        return {"balances": balances}
            except urllib.error.HTTPError as e:
                log_open_banking_debug(f"[TrueLayer] Balance error for {resource}/{aid}: {e}")
                if e.code == 401:
                    auth_error = e
                continue
            except Exception as e:
                log_open_banking_debug(f"[TrueLayer] Balance error for {resource}/{aid}: {e}")
                continue

        if auth_error is not None:
            raise auth_error

        log_open_banking_debug(f"[TrueLayer] Returning empty balances for {aid}")
        return {"balances": []}

    def get_account_transactions(self, access_token_or_id, account_id=None, date_from=None):
        if account_id:
            token = access_token_or_id
            aid = account_id
        else:
            token = self.client_secret
            aid = access_token_or_id

        log_open_banking_debug(f"[TrueLayer] get_account_transactions for account_id={aid} from {date_from}")
        auth_error = None
        for resource in ["cards", "accounts"]:
            url = f"{self.API_BASE}/data/v1/{resource}/{aid}/transactions"
            if date_from:
                url += f"?from={date_from}T00:00:00Z"
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": f"HABit-HouseholdBudgetPlanner/{APP_VERSION}"
            })
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    results = data.get("results", [])
                    log_open_banking_debug(f"[TrueLayer] Raw transactions response for {resource}/{aid}: found {len(results)} items (sample: {json.dumps(results[:3]) if results else '[]'})")
                    booked = []
                    for r in results:
                        raw_amt = float(r.get("amount", 0.0))
                        t_type = (r.get("transaction_type") or "").upper()
                        
                        # In TrueLayer /data/v1/cards/{aid}/transactions:
                        # Purchases have transaction_type="DEBIT" and positive amount (+25.00)
                        # Repayments/refunds have transaction_type="CREDIT" and negative amount (-100.00)
                        # In budget ledger:
                        # Outflows/spending MUST be negative (-25.00)
                        # Inflows/repayments MUST be positive (+100.00)
                        if resource == "cards":
                            if t_type == "DEBIT" and raw_amt > 0:
                                raw_amt = -raw_amt
                            elif t_type == "CREDIT" and raw_amt < 0:
                                raw_amt = abs(raw_amt)
                            elif raw_amt > 0 and not t_type:
                                raw_amt = -raw_amt

                        booked.append({
                            "transactionId": r.get("transaction_id"),
                            "bookingDate": (r.get("timestamp") or "")[:10],
                            "transactionAmount": {"amount": str(raw_amt), "currency": r.get("currency", "GBP")},
                            "creditorName": r.get("merchant_name") or r.get("description", "Transaction"),
                            "merchantName": r.get("merchant_name"),
                            "remittanceInformationUnstructured": r.get("description", ""),
                            "transactionClassification": r.get("transaction_classification", []),
                            "transactionCategory": r.get("transaction_category")
                        })
                    if booked:
                        return {"transactions": {"booked": booked, "pending": []}}
            except urllib.error.HTTPError as e:
                log_open_banking_debug(f"[TrueLayer] Transactions error for {resource}/{aid}: {e}")
                if e.code == 401:
                    auth_error = e
                continue
            except Exception as e:
                log_open_banking_debug(f"[TrueLayer] Transactions error for {resource}/{aid}: {e}")
                continue

        if auth_error is not None:
            raise auth_error

        log_open_banking_debug(f"[TrueLayer] Returning empty transactions for {aid}")
        return {"transactions": {"booked": [], "pending": []}}

    def delete_requisition(self, requisition_id):
        return {"status": "deleted"}


# ---------------------------------------------------------
# SIMPLEFIN BRIDGE CLIENT (https://bridge.simplefin.org)
# ---------------------------------------------------------

class SimpleFinClient:
    def __init__(self, access_url_or_token):
        self.access_url = access_url_or_token.strip()

    def get_institutions(self, country="US"):
        return CURATED_INSTITUTIONS.get("US", [])

    def create_requisition(self, institution_id, redirect_uri, reference=None):
        return {"id": "simplefin", "link": redirect_uri, "status": "LN"}

    def get_requisition(self, requisition_id):
        return {"id": requisition_id, "status": "LN", "accounts": []}

    def get_account_details(self, account_id):
        return {"id": account_id, "name": "Account", "currency": "USD"}

    def get_account_balances(self, account_id):
        return {"balances": [{"balanceAmount": {"amount": "0.00", "currency": "USD"}}]}

    def get_account_transactions(self, account_id, date_from=None):
        return {"transactions": {"booked": [], "pending": []}}

    def delete_requisition(self, requisition_id):
        return {"status": "deleted"}


# Curated catalog of major banking institutions with brand colors and icons
CURATED_INSTITUTIONS = {
    "GB": [
        {"id": "MONZO_MONZGB2L", "name": "Monzo", "bic": "MONZGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/monzo.svg", "color": "#FF4D4D"},
        {"id": "STARLING_SRLGGB2L", "name": "Starling Bank", "bic": "SRLGGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/starlingbank.svg", "color": "#6935FF"},
        {"id": "REVOLUT_REVOGB21", "name": "Revolut", "bic": "REVOGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/revolut.svg", "color": "#0075EB"},
        {"id": "BARCLAYS_BUKBGB22", "name": "Barclays", "bic": "BUKBGB22", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/barclays.svg", "color": "#00AEEF"},
        {"id": "BARCLAYCARD_BUKBGB22", "name": "Barclaycard", "bic": "BUKBGB22", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/barclays.svg", "color": "#00AEEF"},
        {"id": "CHASE_CHASGB2L", "name": "Chase UK", "bic": "CHASGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/chase.svg", "color": "#117ACA"},
        {"id": "HSBC_HBUKGB41", "name": "HSBC UK", "bic": "HBUKGB41", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/hsbc.svg", "color": "#DB0011"},
        {"id": "LLOYDS_LOYDGB21", "name": "Lloyds Bank", "bic": "LOYDGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/lloydsbank.svg", "color": "#006A4E"},
        {"id": "NATWEST_NWBKGB2L", "name": "NatWest", "bic": "NWBKGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/natwest.svg", "color": "#4F1964"},
        {"id": "SANTANDER_ABBYGB2L", "name": "Santander UK", "bic": "ABBYGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/santander.svg", "color": "#EC0000"},
        {"id": "HALIFAX_HLFXGB21", "name": "Halifax", "bic": "HLFXGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/halifax.svg", "color": "#005EB8"},
        {"id": "NATIONWIDE_NACOGB21", "name": "Nationwide Building Society", "bic": "NACOGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/nationwide.svg", "color": "#002B49"},
        {"id": "FIRSTDIRECT_FRESGB21", "name": "First Direct", "bic": "FRESGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/firstdirect.svg", "color": "#1A1A1A"},
        {"id": "BANKOFSCOTLAND_BOFSGB21", "name": "Bank of Scotland", "bic": "BOFSGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bankofscotland.svg", "color": "#002D62"},
        {"id": "VIRGINMONEY_NORTGB21", "name": "Virgin Money", "bic": "NORTGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/virginmoney.svg", "color": "#E10A0A"},
        {"id": "TSB_TSBCGB21", "name": "TSB Bank", "bic": "TSBCGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tsbbank.svg", "color": "#001E62"},
        {"id": "METROBANK_MYMBGB2L", "name": "Metro Bank", "bic": "MYMBGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/metrobank.svg", "color": "#E31837"},
        {"id": "AMEX_AMEXGB2L", "name": "American Express", "bic": "AMEXGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/americanexpress.svg", "color": "#006FCF"},
        {"id": "CAPITALONE_COUKGB21", "name": "Capital One (UK)", "bic": "COUKGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/capitalone.svg", "color": "#004879"},
        {"id": "MBNA_BOFSGB21", "name": "MBNA", "bic": "BOFSGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/lloydsbank.svg", "color": "#006A4E"},
        {"id": "RBS_RBOSGB2L", "name": "Royal Bank of Scotland (RBS)", "bic": "RBOSGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/royalbankofscotland.svg", "color": "#0A2540"},
        {"id": "ULSTER_ULSBGB2B", "name": "Ulster Bank", "bic": "ULSBGB2B", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/natwest.svg", "color": "#002A54"},
        {"id": "TESCO_TPBKGB21", "name": "Tesco Bank", "bic": "TPBKGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tesco.svg", "color": "#EE1C2E"},
        {"id": "SAINSBURYS_SAINBERR", "name": "Sainsbury's Bank", "bic": "SAINBERR", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/sainsburys.svg", "color": "#F05A22"},
        {"id": "WISE_TRANSGB2L", "name": "Wise", "bic": "TRANSGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/wise.svg", "color": "#9FE870"},
        {"id": "COOP_CPBKGB22", "name": "The Co-operative Bank", "bic": "CPBKGB22", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/coop.svg", "color": "#0072CE"},
        {"id": "MSBANK_MSBKGB21", "name": "M&S Bank", "bic": "MSBKGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/marksandspencer.svg", "color": "#111111"},
        {"id": "YORKSHIRE_YORKGB21", "name": "Yorkshire Bank", "bic": "YORKGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/virginmoney.svg", "color": "#005C29"},
        {"id": "CLYDESDALE_CLYDGB2L", "name": "Clydesdale Bank", "bic": "CLYDGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/virginmoney.svg", "color": "#C41230"},
        {"id": "ATOM_ATOMGB21", "name": "Atom Bank", "bic": "ATOMGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/atombank.svg", "color": "#E6007E"},
        {"id": "ZOPA_ZOPAGB21", "name": "Zopa Bank", "bic": "ZOPAGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zopa.svg", "color": "#00B074"},
        {"id": "TIDE_TIDEGB2L", "name": "Tide Business", "bic": "TIDEGB2L", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tide.svg", "color": "#1A202C"}
    ],
    "US": [
        {"id": "CHASE_US_CHASUS33", "name": "Chase Bank (JPMorgan)", "bic": "CHASUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/chase.svg", "color": "#117ACA"},
        {"id": "BOA_US_BOFAUS3N", "name": "Bank of America", "bic": "BOFAUS3N", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bankofamerica.svg", "color": "#E31837"},
        {"id": "WELLSFARGO_WFBIUS6S", "name": "Wells Fargo", "bic": "WFBIUS6S", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/wellsfargo.svg", "color": "#CD1409"},
        {"id": "CITI_US_CITIUS33", "name": "Citibank (Citi)", "bic": "CITIUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/citibank.svg", "color": "#003B70"},
        {"id": "CAPITALONE_US_HIBKUS44", "name": "Capital One", "bic": "HIBKUS44", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/capitalone.svg", "color": "#004879"},
        {"id": "AMEX_US_AMEXUS33", "name": "American Express (US)", "bic": "AMEXUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/americanexpress.svg", "color": "#006FCF"},
        {"id": "DISCOVER_US_DISCUS33", "name": "Discover Bank", "bic": "DISCUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discover.svg", "color": "#FF6600"},
        {"id": "USBANK_US_USBKUS44", "name": "U.S. Bank", "bic": "USBKUS44", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/usbank.svg", "color": "#0C2340"},
        {"id": "PNC_US_PNCCUS33", "name": "PNC Bank", "bic": "PNCCUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/pnc.svg", "color": "#F47E20"},
        {"id": "TDBANK_US_NRTHUS33", "name": "TD Bank", "bic": "NRTHUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tdbank.svg", "color": "#54B848"},
        {"id": "SCHWAB_US_SCHWUS33", "name": "Charles Schwab", "bic": "SCHWUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/charlesschwab.svg", "color": "#00A0DF"},
        {"id": "FIDELITY_US_FIDTUS33", "name": "Fidelity", "bic": "FIDTUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/fidelity.svg", "color": "#448833"},
        {"id": "ALLY_US_ALLYUS33", "name": "Ally Bank", "bic": "ALLYUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/ally.svg", "color": "#742C8B"},
        {"id": "CHIME_US_CHMEUS33", "name": "Chime Bank", "bic": "CHMEUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/chime.svg", "color": "#25C974"},
        {"id": "SOFI_US_SOFIUS33", "name": "SoFi Bank", "bic": "SOFIUS33", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/sofi.svg", "color": "#00C2D6"}
    ],
    "IE": [
        {"id": "AIB_AIBKIE2D", "name": "AIB (Allied Irish Banks)", "bic": "AIBKIE2D", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/alliedirishbanks.svg", "color": "#7C2582"},
        {"id": "BOI_BOFIIE2D", "name": "Bank of Ireland", "bic": "BOFIIE2D", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bankofireland.svg", "color": "#003366"},
        {"id": "PTSB_PTSBIE2D", "name": "Permanent TSB", "bic": "PTSBIE2D", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/permanenttsb.svg", "color": "#005BA6"},
        {"id": "REVOLUT_IE_REVOGB21", "name": "Revolut Ireland", "bic": "REVOGB21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/revolut.svg", "color": "#0075EB"},
        {"id": "ANPOST_POSTIE2D", "name": "An Post Money", "bic": "POSTIE2D", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/anpost.svg", "color": "#008559"}
    ],
    "EU": [
        {"id": "BNPPARIBAS_BNPAFR21", "name": "BNP Paribas", "bic": "BNPAFR21", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bnpparibas.svg", "color": "#00965E"},
        {"id": "CREDITAGRICOLE_AGRIFRPP", "name": "Crédit Agricole", "bic": "AGRIFRPP", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/creditagricole.svg", "color": "#008075"},
        {"id": "SOCIETEGENERALE_SOGEFRPA", "name": "Société Générale", "bic": "SOGEFRPA", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/societegenerale.svg", "color": "#E60028"},
        {"id": "DEUTSCHEBANK_DEUTDEDD", "name": "Deutsche Bank", "bic": "DEUTDEDD", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/deutschebank.svg", "color": "#0018A8"},
        {"id": "COMMERZBANK_COBADEFF", "name": "Commerzbank", "bic": "COBADEFF", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/commerzbank.svg", "color": "#FFCC00"},
        {"id": "N26_NTCBDEB1", "name": "N26 Bank", "bic": "NTCBDEB1", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/n26.svg", "color": "#36A18B"},
        {"id": "ING_INGBNL2A", "name": "ING Bank", "bic": "INGBNL2A", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/ing.svg", "color": "#FF6200"},
        {"id": "BBVA_BBVAESMM", "name": "BBVA", "bic": "BBVAESMM", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bbva.svg", "color": "#004481"},
        {"id": "SANTANDER_ES_SANTAESMM", "name": "Banco Santander", "bic": "SANTAESMM", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/santander.svg", "color": "#EC0000"},
        {"id": "CAIXABANK_CAIXESBB", "name": "CaixaBank", "bic": "CAIXESBB", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/caixabank.svg", "color": "#007AAE"},
        {"id": "INTESA_BCITITMM", "name": "Intesa Sanpaolo", "bic": "BCITITMM", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/intesasanpaolo.svg", "color": "#005157"},
        {"id": "RABOBANK_RABONL2U", "name": "Rabobank", "bic": "RABONL2U", "logo": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/rabobank.svg", "color": "#FF6600"}
    ]
}


def get_open_banking_client(data):
    ob_cfg = data.get("settings", {}).get("open_banking", {})
    provider = ob_cfg.get("provider", "enablebanking").lower()
    
    if provider == "enablebanking":
        app_id = ob_cfg.get("enablebanking_app_id", ob_cfg.get("secret_id", "")).strip()
        app_key = ob_cfg.get("enablebanking_app_key", ob_cfg.get("secret_key", "")).strip()
        return EnableBankingClient(app_id, app_key)
    elif provider == "truelayer":
        client_id = ob_cfg.get("truelayer_client_id", ob_cfg.get("secret_id", "")).strip()
        client_secret = ob_cfg.get("truelayer_client_secret", ob_cfg.get("secret_key", "")).strip()
        is_sandbox = ob_cfg.get("environment") == "sandbox"
        return TrueLayerClient(client_id, client_secret, is_sandbox=is_sandbox)
    elif provider == "simplefin":
        access_url = ob_cfg.get("simplefin_access_url", ob_cfg.get("secret_id", "")).strip()
        return SimpleFinClient(access_url)
    else:
        # Default GoCardless
        secret_id = ob_cfg.get("secret_id", "").strip()
        secret_key = ob_cfg.get("secret_key", "").strip()
        return GoCardlessClient(secret_id, secret_key)


def reconcile_transactions_and_bills(data):
    """Retroactively reconciles all open banking and imported transactions with scheduled bills & direct debits."""
    all_txns = data.get("open_banking_transactions", [])
    if not all_txns:
        return 0

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    current_year_str = str(datetime.date.today().year)
    stop_words = {"direct", "debit", "dd", "payment", "pymt", "transfer", "standing", "order", "so", "faster", "fps", "card", "purchase", "pos", "the", "ltd", "limited", "uk", "plc", "co", "bill", "auth", "recurring"}

    def tokenize(s):
        clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', (s or '').lower())
        return {w for w in clean.split() if len(w) >= 2 and w not in stop_words}

    match_count = 0
    matched_bill_keys = set()

    # Reset auto_cleared status for non-manually-cleared items so reconciliation evaluates cleanly
    for y_key, y_val in data.get("years", {}).items():
        if isinstance(y_val, dict):
            for r in (y_val.get("recurring_payments", []) + y_val.get("recurring_incomes", []) + y_val.get("yearly_recurring", []) + y_val.get("yearly_income", [])):
                if not r.get("manually_cleared"):
                    if r.get("auto_cleared"):
                        r["status"] = "due"
                        r["auto_cleared"] = False
                        r["matched_txn_id"] = None
                        r["matched_date"] = None
                        r["matched_payee"] = None
                        r["cleared_dates"] = []
            for m_key, m_val in y_val.get("months", {}).items():
                if isinstance(m_val, dict):
                    for d in (m_val.get("direct_debits", []) + m_val.get("payments_in", []) + m_val.get("scheduled_items", [])):
                        if not d.get("manually_cleared"):
                            if d.get("auto_cleared"):
                                d["status"] = "due"
                                d["auto_cleared"] = False
                                d["matched_txn_id"] = None
                                d["matched_date"] = None
                                d["matched_payee"] = None
                                d["cleared_dates"] = []

    for t in all_txns:
        if t.get("auto_cleared") and not t.get("manually_linked"):
            t["matched_bill_id"] = None
            t["auto_cleared"] = False

    settings = data.get("settings", {})
    pday_day = int(settings.get("payday_day", 26) or 26)
    pay_freq = settings.get("pay_frequency", "monthly")

    # Sort transactions chronologically so historical months match sequentially
    RETAIL_STOP_MERCHANTS = {
        "schuh", "zara", "primark", "h&m", "hm", "next", "boots", "superdrug", "clarks", "jd sports", "sports direct",
        "greggs", "costa", "starbucks", "mcdonald", "kfc", "subway", "burger king", "nandos", "pret", "caffe nero",
        "tesco", "sainsbury", "asda", "morrison", "aldi", "lidl", "co-op", "coop", "waitrose", "iceland", "marks & spencer", "m&s",
        "b&m", "home bargains", "wilko", "poundland", "savers", "tk maxx", "argos", "currys", "ikea", "b&q", "wickes", "screwfix", "toolstation",
        "pub", "inn", "bar", "tavern", "arms", "restaurant", "bistro", "bakery", "cafe", "coffee", "cinema", "vue", "odeon", "cineworld",
        "deliveroo", "just eat", "uber eats", "amazon", "ebay", "etsy", "shein", "temu"
    }

    BILL_DOMAIN_ALIASES = {
        "council": ["council", "district", "borough", "lincolnshire", "yorkshire", "lancashire", "cheshire", "derbyshire", "nottinghamshire", "staffordshire", "warwickshire", "leicestershire", "northamptonshire", "gloucestershire", "somerset", "devon", "cornwall", "dorset", "wiltshire", "hampshire", "surrey", "sussex", "kent", "essex", "hertfordshire", "bedfordshire", "buckinghamshire", "oxfordshire", "berkshire", "norfolk", "suffolk", "cambridgeshire", "city of", "metropolitan", "unitary", "local authority", "civic", "ctax", "c tax"],
        "tax": ["council", "district", "borough", "lincolnshire", "yorkshire", "hmrc", "revenue", "customs", "dvla"],
        "tv": ["tv licensing", "tv licence", "tvl", "bbc", "television licence", "tvlicense"],
        "licence": ["tv licensing", "tv licence", "tvl", "bbc", "dvla"],
        "energy": ["british gas", "bg energy", "scottish power", "e.on", "eon", "octopus", "ovo", "edf", "bulb", "utilita", "shell energy", "sse", "so energy"],
        "gas": ["british gas", "bg energy", "scottish power", "e.on", "eon", "octopus", "ovo", "edf", "bulb", "utilita"],
        "water": ["water", "severn trent", "thames water", "anglian water", "united utilities", "yorkshire water", "southern water", "wessex water", "south west water", "northumbrian water", "welsh water", "hafra drenau"],
        "broadband": ["bt", "bt group", "virgin media", "virginmedia", "sky", "talktalk", "plusnet", "vodafone", "hyperoptic", "community fibre", "ee"],
        "phone": ["ee", "o2", "three", "vodafone", "giffgaff", "tesco mobile", "sky mobile", "id mobile", "smarty", "voxi", "lebara", "lyca"],
        "internet": ["bt", "virgin media", "virginmedia", "sky", "talktalk", "plusnet", "vodafone", "ee"],
        "mortgage": ["nationwide", "santander", "halifax", "barclays", "hsbc", "lloyds", "natwest", "tsb", "yorkshire building", "coventry building", "skipton"],
        "rent": ["property", "estate", "lettings", "landlord", "housing", "residential", "homes", "tenancy"],
        "insurance": ["admiral", "aviva", "direct line", "hastings", "churchill", "lv=", "liverpool victoria", "axa", "more than", "sheilas wheels", "esure", "privilege", "aig", "vitality", "bupa", "axa ppp"],
        "breakdown": ["rac", "the aa", "aa breakdown", "green flag", "autoaid"]
    }

    def is_valid_bill_match(b_name, b_amt, b_due_day, t_payee, t_amt, t_day, is_same_month):
        if abs(t_amt - b_amt) > 0.05:
            return False

        p_clean = t_payee.lower()
        b_clean = b_name.lower().replace("🎯", "").replace("🎁", "").replace("📥", "").strip()
        
        is_retail = any(m in p_clean for m in RETAIL_STOP_MERCHANTS)

        t_tokens = tokenize(t_payee)
        b_tokens = tokenize(b_clean)
        name_overlap = bool(t_tokens.intersection(b_tokens))
        
        b_alnum = re.sub(r'[^a-zA-Z0-9]', '', b_clean)
        p_alnum = re.sub(r'[^a-zA-Z0-9]', '', p_clean)
        substring_match = bool(b_alnum and (b_alnum in p_alnum or p_alnum in b_alnum))
        partial_token_match = any(len(tok) >= 3 and (tok in p_alnum or tok in p_clean) for tok in b_tokens)

        if name_overlap or substring_match or partial_token_match:
            return True

        for b_tok in b_tokens:
            if b_tok in BILL_DOMAIN_ALIASES:
                alias_list = BILL_DOMAIN_ALIASES[b_tok]
                if any(alias in p_clean for alias in alias_list):
                    return True

        # Retail store purchases without explicit name overlap must never match bills
        if is_retail:
            return False

        # Non-name match only for distinct, non-round amounts matching due date in same budget month
        is_round_small = (t_amt <= 50.0 and (t_amt % 5 == 0 or (t_amt % 1 == 0 and t_amt <= 25.0)))
        if not is_round_small and is_same_month:
            day_diff = abs(t_day - (b_due_day or 1))
            if day_diff <= 4 or day_diff >= 27:
                return True

        return False

    # Sort transactions chronologically so historical months match sequentially
    sorted_txns = sorted(
        all_txns,
        key=lambda x: x.get("booking_date", "") or "",
        reverse=False
    )

    for t in sorted_txns:
        raw_amt = float(t.get("amount", 0.0))
        t_amt = abs(raw_amt)
        if t_amt < 0.01:
            continue
        t_is_income = (raw_amt > 0)

        t_payee = f"{t.get('payee_name') or ''} {t.get('raw_info') or ''} {t.get('merchant_name') or ''} {t.get('description') or ''}".strip()
        t_date_str = t.get("booking_date", "")

        target_m_name = None
        target_year_str = current_year_str
        t_day = 15
        if t_date_str:
            try:
                dt = datetime.date.fromisoformat(t_date_str[:10])
                target_year_str = str(dt.year)
                t_day = dt.day
                target_m_name, _ = detect_current_month_and_week_py(data, dt)
            except Exception:
                pass

        year_data = data.get("years", {}).get(target_year_str, {})
        if not year_data:
            year_data = data.get("years", {}).get(current_year_str, {})
        months_map = year_data.get("months", {})

        # Order search months prioritizing target_m_name
        search_months = []
        if target_m_name and target_m_name in months_map:
            search_months.append(target_m_name)
        else:
            search_months = list(months_map.keys())

        matched_this_txn = False

        for m_name in search_months:
            if matched_this_txn:
                break
            m_data = months_map.get(m_name, {})

            budget_items = []
            for b_idx, b_obj in enumerate(year_data.get("yearly_budgets", [])):
                for t_idx, b_txn in enumerate(b_obj.get("transactions", [])):
                    budget_items.append({
                        "id": b_txn.get("id") or f"budget_{b_idx}_{t_idx}",
                        "desc": f"🎯 {b_obj.get('name', '')}: {b_txn.get('desc', '')}".strip(": "),
                        "name": b_txn.get("desc") or b_obj.get("name"),
                        "amount": b_txn.get("amount", 0.0),
                        "due_day": int(b_txn.get("date", "2026-01-01")[8:10]) if b_txn.get("date") else 1,
                        "raw_target": b_txn,
                        "status": b_txn.get("status", "due"),
                        "auto_cleared": b_txn.get("auto_cleared", False),
                        "manually_cleared": b_txn.get("manually_cleared", False),
                        "cleared_dates": b_txn.get("cleared_dates", [])
                    })

            birthday_items = []
            for b_idx, b_obj in enumerate(year_data.get("birthdays", []) or data.get("settings", {}).get("birthdays", [])):
                for t_idx, b_txn in enumerate(b_obj.get("transactions", [])):
                    birthday_items.append({
                        "id": b_txn.get("id") or f"bday_{b_idx}_{t_idx}",
                        "desc": f"🎁 {b_obj.get('name', '')}: {b_txn.get('desc', '')}".strip(": "),
                        "name": b_txn.get("desc") or b_obj.get("name"),
                        "amount": b_txn.get("amount", 0.0),
                        "due_day": int(b_txn.get("date", "2026-01-01")[8:10]) if b_txn.get("date") else 1,
                        "raw_target": b_txn,
                        "status": b_txn.get("status", "due"),
                        "auto_cleared": b_txn.get("auto_cleared", False),
                        "manually_cleared": b_txn.get("manually_cleared", False),
                        "cleared_dates": b_txn.get("cleared_dates", [])
                    })

            bill_collections = [
                ("direct_debit", False, m_data.get("direct_debits", [])),
                ("payments_in", True, m_data.get("payments_in", [])),
                ("scheduled_item", False, m_data.get("scheduled_items", [])),
                ("yearly_recurring", False, [b for b in year_data.get("yearly_recurring", []) if not b.get("month") or b.get("month") == m_name]),
                ("yearly_income", True, [b for b in year_data.get("yearly_income", []) if not b.get("month") or b.get("month") == m_name]),
                ("recurring_payment", False, year_data.get("recurring_payments", [])),
                ("recurring_income", True, year_data.get("recurring_incomes", [])),
                ("budget_bill", False, budget_items),
                ("birthday", False, birthday_items)
            ]

            for b_type, is_inc_coll, b_list in bill_collections:
                if matched_this_txn:
                    break

                if t_is_income != is_inc_coll:
                    continue

                is_recurring_type = (b_type in ["recurring_payment", "recurring_income"])
                occ_iso = t_date_str[:10] if t_date_str else ""

                for idx, b in enumerate(b_list or []):
                    b_name = b.get("desc") or b.get("name") or ""
                    if is_recurring_type:
                        b_key = f"rec_{b.get('id') or b_name}_{m_name}_{occ_iso}"
                    else:
                        b_key = b.get("id") or f"{target_year_str}_{m_name}_{b_type}_{idx}"

                    if b_key in matched_bill_keys:
                        continue

                    if is_recurring_type and occ_iso and (occ_iso in b.get("cleared_dates", [])):
                        matched_bill_keys.add(b_key)
                        continue
                    elif not is_recurring_type and b.get("manually_cleared"):
                        matched_bill_keys.add(b_key)
                        continue

                    b_amt = abs(float(b.get("amount", 0.0)))
                    b_due_day = int(b.get("due_day") or b.get("day_of_month") or 1)
                    is_same_month = (target_m_name == m_name)

                    if is_valid_bill_match(b_name, b_amt, b_due_day, t_payee, t_amt, t_day, is_same_month):
                        if is_recurring_type:
                            b_cleared_dates = b.setdefault("cleared_dates", [])
                            if occ_iso and occ_iso not in b_cleared_dates:
                                b_cleared_dates.append(occ_iso)
                            b["matched_txn_id"] = t.get("transaction_id")
                            b["matched_date"] = t_date_str
                            b["matched_payee"] = t.get("payee_name") or t.get("merchant_name")
                        else:
                            b["status"] = "paid"
                            b["auto_cleared"] = True
                            b["matched_txn_id"] = t.get("transaction_id")
                            b["matched_date"] = t_date_str
                            b["matched_amount"] = t_amt
                            b["matched_payee"] = t.get("payee_name") or t.get("merchant_name")
                            if occ_iso:
                                b_cleared_dates = b.setdefault("cleared_dates", [])
                                if occ_iso not in b_cleared_dates:
                                    b_cleared_dates.append(occ_iso)

                        # Also sync to underlying raw_target if this was a budget/birthday transaction
                        raw_target = b.get("raw_target")
                        if raw_target is not None:
                            raw_target["status"] = "paid"
                            raw_target["auto_cleared"] = True
                            raw_target["matched_txn_id"] = t.get("transaction_id")
                            raw_target["matched_date"] = t_date_str
                            raw_target["matched_amount"] = t_amt
                            raw_target["matched_payee"] = t.get("payee_name") or t.get("merchant_name")
                            if occ_iso:
                                raw_cleared = raw_target.setdefault("cleared_dates", [])
                                if occ_iso not in raw_cleared:
                                    raw_cleared.append(occ_iso)

                        t["matched_bill_id"] = b_name
                        t["auto_cleared"] = True
                        matched_bill_keys.add(b_key)
                        matched_this_txn = True
                        match_count += 1
                        log_open_banking_debug(f"Auto-cleared scheduled bill '{b_name}' in {m_name} (£{b_amt:.2f}) with txn '{t.get('payee_name') or t.get('merchant_name')}' (£{t_amt:.2f} on {t_date_str})")
                        break

    return match_count


def sync_open_banking_data(data):
    """Synchronizes balances and posted transactions from linked bank accounts."""
    ob_cfg = data.setdefault("settings", {}).setdefault("open_banking", {})
    provider = ob_cfg.get("provider", "gocardless").lower()
    log_open_banking_debug(f"============================================================")
    log_open_banking_debug(f"STARTING OPEN BANKING SYNC (Provider: {provider})")
    log_open_banking_debug(f"============================================================")
    if not ob_cfg.get("enabled", False):
        log_open_banking_debug("Sync aborted: Open banking is disabled in settings.")
        return {"status": "disabled", "synced_accounts": 0, "transactions_added": 0}

    client = get_open_banking_client(data)
    linked = ob_cfg.get("linked_accounts", [])
    if not linked:
        log_open_banking_debug("Sync aborted: No linked accounts found in settings.")
        return {"status": "no_linked_accounts", "synced_accounts": 0, "transactions_added": 0}

    log_open_banking_debug(f"Found {len(linked)} linked accounts to process.")
    for idx, la in enumerate(linked):
        log_open_banking_debug(f"Linked Account #{idx+1}: ID={la.get('account_id')} | Name='{la.get('account_name')}' | Type={la.get('account_type')} | Mapped='{la.get('mapped_habit_account_id')}'")

    # Shared token fallback & Auto-Discovery for accounts with missing IDs
    shared_token = next((x.get("access_token") for x in linked if x.get("access_token")), None)
    shared_refresh = next((x.get("refresh_token") for x in linked if x.get("refresh_token")), None)

    if shared_token and hasattr(client, "get_accounts"):
        needs_discovery = any(not x.get("account_id") or not x.get("access_token") for x in linked)
        if needs_discovery:
            log_open_banking_debug("Linked accounts with missing IDs detected. Calling get_accounts with shared token...")
            discovered_all = []
            try:
                discovered_all = client.get_accounts(shared_token)
            except Exception as e:
                log_open_banking_debug(f"get_accounts token error: {e}")
                if shared_refresh and hasattr(client, "refresh_access_token"):
                    try:
                        log_open_banking_debug("Refreshing shared token for discovery...")
                        tok_res = client.refresh_access_token(shared_refresh)
                        new_tok = tok_res.get("access_token")
                        if new_tok:
                            shared_token = new_tok
                            discovered_all = client.get_accounts(shared_token)
                    except Exception as e2:
                        log_open_banking_debug(f"get_accounts after refresh error: {e2}")
            log_open_banking_debug(f"Discovery found {len(discovered_all)} accounts on provider: {json.dumps(discovered_all)}")

            for item in linked:
                if not item.get("access_token") and shared_token:
                    item["access_token"] = shared_token
                if not item.get("refresh_token") and shared_refresh:
                    item["refresh_token"] = shared_refresh

                if not item.get("account_id"):
                    for cand in discovered_all:
                        c_id = cand.get("account_id")
                        c_type = cand.get("account_type")
                        if any(x.get("account_id") == c_id for x in linked if x.get("account_id")):
                            continue
                        if item.get("account_type") == c_type or not item.get("account_type") or c_type == "CARD":
                            item["account_id"] = c_id
                            item["account_type"] = c_type or item.get("account_type") or "CARD"
                            log_open_banking_debug(f"Assigned discovered ID '{c_id}' to '{item.get('account_name')}'")
                            break

    all_txns = data.setdefault("open_banking_transactions", [])
    existing_txn_ids = {t.get("transaction_id") for t in all_txns if t.get("transaction_id")}
    new_txns_count = 0
    synced_accounts = 0
    sync_errors = []

    # Date from 30 days ago
    date_from = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()

    current_year_str = str(datetime.date.today().year)
    year_data = data.get("years", {}).get(current_year_str, {})
    accounts_list = year_data.get("accounts", [])
    settings_accounts = data.get("settings", {}).get("accounts", [])

    def refresh_tokens_for_account(target_item):
        r_tok = target_item.get("refresh_token") or next((x.get("refresh_token") for x in linked if x.get("refresh_token")), None)
        if not r_tok or not hasattr(client, "refresh_access_token"):
            return None
        log_open_banking_debug(f"[OpenBanking] Attempting token refresh for account '{target_item.get('account_name')}' (ID: {target_item.get('account_id')})...")
        try:
            tok_res = client.refresh_access_token(r_tok)
            if tok_res and tok_res.get("access_token"):
                new_acc_tok = tok_res.get("access_token")
                new_ref_tok = tok_res.get("refresh_token") or r_tok
                req_id = target_item.get("requisition_id")
                for acc in linked:
                    if (req_id and acc.get("requisition_id") == req_id) or acc.get("refresh_token") == r_tok or acc.get("account_id") == target_item.get("account_id"):
                        acc["access_token"] = new_acc_tok
                        acc["refresh_token"] = new_ref_tok
                target_item["access_token"] = new_acc_tok
                target_item["refresh_token"] = new_ref_tok
                log_open_banking_debug(f"[OpenBanking] Token refresh successful. Rotated tokens across linked accounts.")
                return new_acc_tok
            else:
                log_open_banking_debug(f"[OpenBanking] Token refresh did not return an access token. Consent may be expired.")
        except Exception as ex:
            log_open_banking_debug(f"[OpenBanking] Token refresh exception: {ex}")
        return None

    for item in linked:
        acc_id = item.get("account_id")
        acc_name = item.get("account_name")
        token = item.get("access_token")

        if not acc_id:
            log_open_banking_debug(f"Skipping account '{acc_name}' because account_id is missing.")
            continue

        log_open_banking_debug(f"\n--- Syncing account: {acc_name} (ID: {acc_id}) ---")

        try:
            # 1. Balances
            bal_data = None
            if token:
                try:
                    bal_data = client.get_account_balances(token, acc_id)
                except Exception as e:
                    log_open_banking_debug(f"Exception getting balances for {acc_id}: {e}")
                    new_token = refresh_tokens_for_account(item)
                    if new_token:
                        token = new_token
                        try:
                            bal_data = client.get_account_balances(token, acc_id)
                        except Exception as e2:
                            log_open_banking_debug(f"Exception getting balances after refresh for {acc_id}: {e2}")
                            sync_errors.append(f"{acc_name}: {e2}")
                    else:
                        sync_errors.append(f"{acc_name}: {e}")
            else:
                try:
                    bal_data = client.get_account_balances(acc_id)
                except Exception as e:
                    log_open_banking_debug(f"Exception getting balances for {acc_id}: {e}")
                    sync_errors.append(f"{acc_name}: {e}")

            log_open_banking_debug(f"Raw balances payload for {acc_id}: {json.dumps(bal_data)}")

            if bal_data and bal_data.get("balances"):
                b_list = bal_data["balances"]
                closing_bal = next((b for b in b_list if b.get("balanceType") in ["closingBooked", "interimBooked", "expected", "current"]), None)
                avail_bal = next((b for b in b_list if b.get("balanceType") in ["interimAvailable", "available", "authorized"]), None)

                if closing_bal:
                    item["last_balance"] = float(closing_bal.get("balanceAmount", {}).get("amount", 0.0))
                elif b_list:
                    item["last_balance"] = float(b_list[0].get("balanceAmount", {}).get("amount", 0.0))

                if avail_bal:
                    item["last_available"] = float(avail_bal.get("balanceAmount", {}).get("amount", 0.0))

                for b in b_list:
                    if b.get("creditLimit"):
                        item["credit_limit"] = float(b.get("creditLimit", 0.0))

                item["last_sync_timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                item["status"] = "active"
                synced_accounts += 1

                live_bal = item.get("last_balance", 0.0)
                mapped_id = item.get("mapped_habit_account_id")
                log_open_banking_debug(f"Saved for {acc_id}: last_balance={live_bal}, last_available={item.get('last_available')}, credit_limit={item.get('credit_limit')}")
                if mapped_id:
                    for acc in accounts_list:
                        if acc.get("id") == mapped_id or acc.get("name") == mapped_id:
                            acc["current_balance"] = live_bal
                    for acc in settings_accounts:
                        if acc.get("id") == mapped_id or acc.get("name") == mapped_id:
                            acc["current_balance"] = live_bal
            elif bal_data is not None:
                item["last_sync_timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                synced_accounts += 1
                log_open_banking_debug(f"No balance object returned for {acc_id}")
            else:
                log_open_banking_debug(f"Could not retrieve balances for {acc_id}.")

            # 2. Transactions
            txn_data = None
            if token:
                try:
                    txn_data = client.get_account_transactions(token, acc_id, date_from=date_from)
                except Exception as e:
                    log_open_banking_debug(f"Exception getting transactions for {acc_id}: {e}")
                    new_token = refresh_tokens_for_account(item)
                    if new_token:
                        token = new_token
                        try:
                            txn_data = client.get_account_transactions(token, acc_id, date_from=date_from)
                        except Exception as e2:
                            log_open_banking_debug(f"Exception getting transactions after refresh for {acc_id}: {e2}")
            else:
                try:
                    txn_data = client.get_account_transactions(acc_id, date_from=date_from)
                except Exception as e:
                    log_open_banking_debug(f"Exception getting transactions for {acc_id}: {e}")

            if txn_data:
                booked = txn_data.get("transactions", {}).get("booked", [])
                log_open_banking_debug(f"Transactions returned for {acc_id}: {len(booked)} booked items.")
                mapped_raw = item.get("mapped_habit_account_id") or ""
                clean_mapped_name = re.sub(r'^(current:|credit:|savings:)', '', mapped_raw, flags=re.IGNORECASE).strip()
                disp_name = clean_mapped_name or item.get("account_name", "Checking")

                for raw_t in booked:
                    tid = raw_t.get("transactionId") or f"txn-{acc_id}-{raw_t.get('bookingDate')}-{raw_t.get('transactionAmount',{}).get('amount')}"
                    if tid in existing_txn_ids:
                        continue

                    amount_float = float(raw_t.get("transactionAmount", {}).get("amount", 0.0))
                    payee = raw_t.get("creditorName") or raw_t.get("remittanceInformationUnstructured") or "Debit Transaction"

                    clean_t = {
                        "transaction_id": tid,
                        "account_id": acc_id,
                        "account_name": disp_name,
                        "owner": item.get("owner", "Joint"),
                        "booking_date": raw_t.get("bookingDate", datetime.date.today().isoformat()),
                        "amount": amount_float,
                        "currency": raw_t.get("transactionAmount", {}).get("currency", "GBP"),
                        "payee_name": payee.strip(),
                        "raw_info": raw_t.get("remittanceInformationUnstructured", ""),
                        "merchant_name": raw_t.get("merchantName") or raw_t.get("creditorName", ""),
                        "classification": raw_t.get("transactionClassification", []),
                        "transaction_category": raw_t.get("transactionCategory"),
                        "matched_bill_id": None,
                        "auto_cleared": False
                    }

                    all_txns.append(clean_t)
                    existing_txn_ids.add(tid)
                    new_txns_count += 1

        except Exception as e:
            log_open_banking_debug(f"[OpenBanking] Sync error for account {acc_id}: {e}")
            sync_errors.append(f"{acc_name}: {e}")

    # Retroactively normalize names and card transaction signs across all saved transactions
    is_card_map = {str(item.get("account_id")): (item.get("account_type") == "CARD" or "credit" in (item.get("mapped_habit_account_id") or "").lower()) for item in linked if item.get("account_id")}
    
    # Run retroactive reconciliation across ALL transactions and ALL scheduled bills
    reconciled_matches = reconcile_transactions_and_bills(data)
    log_open_banking_debug(f"Reconciliation pass complete: {reconciled_matches} total bills matched.")
    
    name_map = {}
    for item in linked:
        aid = item.get("account_id")
        if aid:
            m_raw = item.get("mapped_habit_account_id") or ""
            c_name = re.sub(r'^(current:|credit:|savings:)', '', m_raw, flags=re.IGNORECASE).strip()
            name_map[str(aid)] = c_name or item.get("account_name", "Account")

    for t in all_txns:
        t_aid = str(t.get("account_id", ""))
        if t_aid in name_map:
            t["account_name"] = name_map[t_aid]
        if is_card_map.get(t_aid) or is_card_map.get(t.get("account_id")):
            payee_lower = (t.get("payee_name") or "").lower()
            is_payment = any(w in payee_lower for w in ["payment received", "direct debit payment", "faster payment", "refund", "credit received", "cashback", "cr-"])
            amt = float(t.get("amount", 0.0))
            if not is_payment and amt > 0:
                t["amount"] = -amt
            elif is_payment and amt < 0:
                t["amount"] = abs(amt)

    # Auto-update active week's actual check-in fields if enabled
    auto_update_checkins = ob_cfg.get("auto_update_checkins", True)
    if auto_update_checkins and linked:
        today = datetime.date.today()
        cur_year_str = str(today.year)
        m_name, w_name = detect_current_month_and_week_py(data, today)

        year_data = data.setdefault("years", {}).setdefault(cur_year_str, {})
        month_data = year_data.setdefault("months", {}).setdefault(m_name, {})
        weekly_actuals = month_data.setdefault("weekly_actuals", {})
        week_act = weekly_actuals.setdefault(w_name, {})
        ts_map = week_act.setdefault("_timestamps", {})
        sources_map = week_act.setdefault("_sources", {})

        cfg_curr = data.get("settings", {}).get("current_accounts", [])
        cfg_cred = data.get("settings", {}).get("credit_accounts", [])
        cfg_sav = data.get("settings", {}).get("savings_accounts", [])
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        log_open_banking_debug(f"\n--- Updating Active Check-In ({m_name} {w_name}) ---")
        for item in linked:
            mapped_raw = item.get("mapped_habit_account_id") or ""
            mapped = re.sub(r'^(credit|current|savings):', '', mapped_raw, flags=re.IGNORECASE).strip()
            acc_id = item.get("account_id")
            live_bal = item.get("last_balance")
            if not mapped:
                log_open_banking_debug(f"Account {acc_id} has no mapped HABit account. Skipping checkin.")
                continue

            # 1. Current Account
            is_curr = any((str(a).lower() == mapped.lower() if isinstance(a, str) else str(a.get("name", "")).lower() == mapped.lower()) for a in cfg_curr)
            if is_curr:
                c_target = next((a if isinstance(a, str) else a.get("name") for a in cfg_curr if (str(a).lower() == mapped.lower() if isinstance(a, str) else str(a.get("name", "")).lower() == mapped.lower())), mapped)
                f_key = f"curr_{c_target}"
                if sources_map.get(f_key) == "manual":
                    log_open_banking_debug(f"Field {f_key} has manual check-in override. Skipping auto-sync.")
                else:
                    week_act[f_key] = float(live_bal or 0)
                    ts_map[f_key] = now_iso
                    sources_map[f_key] = "open_banking"
                    log_open_banking_debug(f"Updated check-in field {f_key} = {week_act[f_key]}")

            # 2. Savings Account
            is_sav = any((str(s).lower() == mapped.lower() if isinstance(s, str) else str(s.get("name", "")).lower() == mapped.lower()) for s in cfg_sav)
            if is_sav:
                s_target = next((s if isinstance(s, str) else s.get("name") for s in cfg_sav if (str(s).lower() == mapped.lower() if isinstance(s, str) else str(s.get("name", "")).lower() == mapped.lower())), mapped)
                f_key = f"sav_{s_target}"
                if sources_map.get(f_key) == "manual":
                    log_open_banking_debug(f"Field {f_key} has manual check-in override. Skipping auto-sync.")
                else:
                    week_act[f_key] = float(live_bal or 0)
                    ts_map[f_key] = now_iso
                    sources_map[f_key] = "open_banking"
                    log_open_banking_debug(f"Updated check-in field {f_key} = {week_act[f_key]}")

            # 3. Credit Card
            for c in cfg_cred:
                c_name = c if isinstance(c, str) else c.get("name", "")
                if str(c_name).lower() == mapped.lower() or str(c_name).lower() == mapped_raw.lower():
                    f_key = f"c_avail_{c_name}"
                    if sources_map.get(f_key) == "manual":
                        log_open_banking_debug(f"Field {f_key} has manual check-in override. Skipping auto-sync.")
                        continue

                    card_limit = float(c.get("limit", 0.0) if isinstance(c, dict) else 0.0)
                    if card_limit <= 0 and item.get("credit_limit"):
                        card_limit = float(item["credit_limit"])
                        if isinstance(c, dict):
                            c["limit"] = card_limit

                    # If available balance is directly known from the bank, use it
                    debt = abs(float(live_bal or 0))
                    if debt == 0.0 and (item.get("last_available") is None or float(item.get("last_available", 0)) == 0):
                        card_txns = [t for t in all_txns if str(t.get("account_id")) == str(acc_id)]
                        if card_txns:
                            net_spent = sum(-t.get("amount", 0.0) for t in card_txns if t.get("amount", 0.0) < 0) - sum(t.get("amount", 0.0) for t in card_txns if t.get("amount", 0.0) > 0)
                            if net_spent > 0:
                                debt = round(net_spent, 2)
                                item["last_balance"] = debt
                                log_open_banking_debug(f"Calculated debt from {len(card_txns)} transactions: {debt}")

                    if item.get("last_available") is not None and float(item["last_available"]) > 0:
                        avail = float(item["last_available"])
                    elif card_limit > 0:
                        avail = max(0.0, card_limit - debt)
                    else:
                        avail = 0.0

                    week_act[f_key] = avail
                    ts_map[f_key] = now_iso
                    sources_map[f_key] = "open_banking"
                    log_open_banking_debug(f"Updated card check-in {f_key} = {avail} (Limit: {card_limit}, Debt: {debt})")

    ob_cfg["last_sync_timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if synced_accounts == 0 and linked:
        ob_cfg["last_sync_status"] = "error"
        err_msg = sync_errors[0] if sync_errors else "Unable to retrieve balances from bank API"
        ob_cfg["last_sync_error"] = f"Failed to sync accounts ({err_msg})"
    elif synced_accounts < len(linked):
        ob_cfg["last_sync_status"] = "partial_error"
        err_msg = sync_errors[0] if sync_errors else "Some accounts failed to sync"
        ob_cfg["last_sync_error"] = f"Synced {synced_accounts}/{len(linked)} accounts ({err_msg})"
    else:
        ob_cfg["last_sync_status"] = "success"
        ob_cfg["last_sync_error"] = None

    # Sync to Home Assistant
    try:
        sync_ha_sensors(data)
    except Exception as e:
        log_open_banking_debug(f"[OpenBanking] HA Sensor sync notice: {e}")

    save_data(data)
    log_open_banking_debug(f"SYNC FINISHED: {synced_accounts}/{len(linked)} accounts synced, {new_txns_count} new transactions (Status: {ob_cfg['last_sync_status']}).\n")
    return {
        "status": ob_cfg["last_sync_status"],
        "error": ob_cfg.get("last_sync_error"),
        "synced_accounts": synced_accounts,
        "total_accounts": len(linked),
        "transactions_added": new_txns_count,
        "last_sync_timestamp": ob_cfg["last_sync_timestamp"]
    }


def background_open_banking_scheduler():
    """Background daemon worker that triggers automatic open banking sync based on auto_sync_interval_hours."""
    time.sleep(15)  # Initial grace period on server startup
    while True:
        try:
            data = load_data()
            ob_cfg = data.get("settings", {}).get("open_banking", {})
            if ob_cfg.get("enabled", False) and ob_cfg.get("linked_accounts", []):
                interval_hours = float(ob_cfg.get("auto_sync_interval_hours", 6))
                if interval_hours > 0:
                    last_sync_str = ob_cfg.get("last_sync_timestamp")
                    should_sync = False
                    if not last_sync_str:
                        should_sync = True
                    else:
                        try:
                            clean_ts = last_sync_str.replace("Z", "+00:00")
                            last_sync_dt = datetime.datetime.fromisoformat(clean_ts)
                            if last_sync_dt.tzinfo is None:
                                last_sync_dt = last_sync_dt.replace(tzinfo=datetime.timezone.utc)
                            now_dt = datetime.datetime.now(datetime.timezone.utc)
                            diff_hours = (now_dt - last_sync_dt).total_seconds() / 3600.0
                            if diff_hours >= interval_hours:
                                should_sync = True
                        except Exception as parse_err:
                            log_open_banking_debug(f"[AutoSync] Timestamp parse notice: {parse_err}")
                            should_sync = True

                    if should_sync:
                        log_open_banking_debug(f"\n[AutoSync] Background scheduled sync started (Interval: {interval_hours}h)...")
                        sync_open_banking_data(data)
        except Exception as e:
            print(f"[AutoSync] Background scheduler exception: {e}")

        # Check every 60 seconds
        time.sleep(60)


# Start background auto-sync thread
try:
    _scheduler_thread = threading.Thread(target=background_open_banking_scheduler, daemon=True, name="OpenBankingAutoSync")
    _scheduler_thread.start()
except Exception as _th_err:
    print(f"Notice: Failed to start Open Banking scheduler thread: {_th_err}")


@app.route("/api/openbanking/debug/log", methods=["GET"])
def openbanking_get_debug_log():
    content = ""
    for path in [DEBUG_LOG_FILE, "/data/open_banking_debug.txt", "open_banking_debug.txt"]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    c = f.read()
                if len(c) > len(content):
                    content = c
            except Exception:
                pass
    if not content:
        try:
            data = load_data()
            ob_cfg = data.get("settings", {}).get("open_banking", {})
            is_enabled = ob_cfg.get("debug_logging", False)
            status_msg = "enabled" if is_enabled else "currently disabled"
        except Exception:
            status_msg = "disabled"
        content = f"[{datetime.datetime.now(datetime.timezone.utc).isoformat()}] Open Banking debug logging is {status_msg}.\nEnable 'Debug Logging' in Settings → Open Banking and click 'Sync Now' to record detailed logs."
    resp = make_response(content, 200)
    resp.headers["Content-Type"] = "text/plain; charset=utf-8"
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@app.route("/api/openbanking/debug/clear", methods=["POST"])
def openbanking_clear_debug_log():
    for path in [DEBUG_LOG_FILE, "open_banking_debug.txt", "/data/open_banking_debug.txt"]:
        try:
            if os.path.exists(path):
                with open(path, "w", encoding="utf-8") as f:
                    f.write(f"[{datetime.datetime.now(datetime.timezone.utc).isoformat()}] Log cleared.\n")
        except Exception:
            pass
    return jsonify({"success": True, "message": "Debug log cleared"})


@app.route("/api/openbanking/status", methods=["GET"])
def openbanking_status():
    data = load_data()
    ob_cfg = data.get("settings", {}).get("open_banking", {})
    all_txns = data.get("open_banking_transactions", [])
    
    # Hide sensitive raw credentials
    safe_cfg = {
        "enabled": ob_cfg.get("enabled", False),
        "provider": ob_cfg.get("provider", "gocardless"),
        "environment": ob_cfg.get("environment", "live"),
        "auto_update_checkins": ob_cfg.get("auto_update_checkins", True),
        "has_credentials": bool(ob_cfg.get("secret_id")),
        "secret_id_masked": (ob_cfg.get("secret_id", "")[:4] + "••••" + ob_cfg.get("secret_id", "")[-4:]) if len(ob_cfg.get("secret_id", "")) > 8 else "••••",
        "auto_sync_interval_hours": ob_cfg.get("auto_sync_interval_hours", 6),
        "last_sync_timestamp": ob_cfg.get("last_sync_timestamp"),
        "last_sync_status": ob_cfg.get("last_sync_status", "idle"),
        "linked_accounts": ob_cfg.get("linked_accounts", []),
        "transaction_count": len(all_txns)
    }
    return jsonify(safe_cfg)


@app.route("/api/openbanking/config", methods=["POST"])
def openbanking_config():
    data = load_data()
    payload = request.get_json(force=True) or {}
    ob_cfg = data.setdefault("settings", {}).setdefault("open_banking", {})

    if "enabled" in payload:
        ob_cfg["enabled"] = bool(payload["enabled"])
    if "auto_update_checkins" in payload:
        ob_cfg["auto_update_checkins"] = bool(payload["auto_update_checkins"])
    if "provider" in payload:
        ob_cfg["provider"] = str(payload["provider"]).strip().lower()
    if "environment" in payload:
        ob_cfg["environment"] = str(payload["environment"]).strip().lower()
    if "secret_id" in payload:
        ob_cfg["secret_id"] = str(payload["secret_id"]).strip()
    if "secret_key" in payload:
        ob_cfg["secret_key"] = str(payload["secret_key"]).strip()
    if "redirect_uri" in payload:
        ob_cfg["redirect_uri"] = str(payload["redirect_uri"]).strip()
    if "auto_sync_interval_hours" in payload:
        ob_cfg["auto_sync_interval_hours"] = int(payload["auto_sync_interval_hours"])

    save_data(data)
    return jsonify({"success": True, "status": "saved"})


@app.route("/api/openbanking/institutions", methods=["GET"])
def openbanking_institutions():
    country = request.args.get("country", "GB").upper()
    data = load_data()
    client = get_open_banking_client(data)
    
    # Try fetching from live provider API if credentials are present
    has_creds = bool(getattr(client, "secret_id", None) or getattr(client, "app_id", None) or getattr(client, "client_id", None))
    if client and has_creds:
        try:
            live_institutions = client.get_institutions(country=country)
            if live_institutions and isinstance(live_institutions, list) and len(live_institutions) > 0:
                return jsonify({"success": True, "country": country, "institutions": live_institutions, "source": "live"})
        except Exception as e:
            print(f"[OpenBanking] Live fetch notice: {e}")
            
    # Default / fallback to curated catalog of major banks
    curated = CURATED_INSTITUTIONS.get(country, CURATED_INSTITUTIONS.get("GB", []))
    return jsonify({"success": True, "country": country, "institutions": curated, "source": "catalog"})


@app.route("/api/openbanking/statement/upload", methods=["POST"])
def openbanking_upload_statement():
    data = load_data()
    payload = request.get_json(force=True) if request.is_json else {}
    
    content_str = payload.get("file_content", "")
    filename = payload.get("filename", "statement.csv")
    mapped_account = payload.get("mapped_account", "")
    owner = payload.get("owner", "Joint")

    if not content_str:
        return jsonify({"success": False, "error": "No statement content provided"}), 400

    parsed_txns = StatementFileParser.parse_statement(content_str, filename)
    if not parsed_txns:
        return jsonify({"success": False, "error": "No valid transactions could be parsed from file"}), 400

    all_txns = data.setdefault("open_banking_transactions", [])
    existing_txn_ids = {t.get("transaction_id") for t in all_txns if t.get("transaction_id")}
    new_added = 0
    auto_cleared_count = 0

    current_year_str = str(datetime.date.today().year)
    year_data = data.get("years", {}).get(current_year_str, {})
    months_map = year_data.get("months", {})

    for txn in parsed_txns:
        tid = txn.get("transaction_id")
        if tid in existing_txn_ids:
            continue

        txn["account_name"] = mapped_account or "Checking"
        txn["owner"] = owner

        all_txns.append(txn)
        existing_txn_ids.add(tid)
        new_added += 1

    auto_cleared_count = reconcile_transactions_and_bills(data)

    try:
        sync_ha_sensors(data)
    except Exception as e:
        print(f"[OpenBanking] HA sync notice: {e}")

    save_data(data)
    return jsonify({
        "success": True,
        "imported_count": new_added,
        "auto_cleared_count": auto_cleared_count,
        "total_transactions": len(all_txns)
    })


@app.route("/api/openbanking/requisition/create", methods=["POST"])
def openbanking_create_requisition():
    data = load_data()
    payload = request.get_json(force=True) or {}
    institution_id = payload.get("institution_id")
    redirect_uri = payload.get("redirect_uri")
    institution_name = payload.get("institution_name", "Bank")
    institution_logo = payload.get("institution_logo", "")
    owner = payload.get("owner", "Joint")

    if not institution_id or not redirect_uri:
        return jsonify({"success": False, "error": "Missing institution_id or redirect_uri"}), 400

    client = get_open_banking_client(data)
    try:
        ref = f"habit-{uuid.uuid4().hex[:8]}"
        req_res = client.create_requisition(institution_id, redirect_uri, reference=ref)
        
        # Store pending requisition metadata
        pending = data.setdefault("settings", {}).setdefault("open_banking", {}).setdefault("pending_requisitions", {})
        pending[req_res.get("id")] = {
            "institution_id": institution_id,
            "institution_name": institution_name,
            "institution_logo": institution_logo,
            "owner": owner,
            "redirect_uri": redirect_uri.strip(),
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        save_data(data)

        return jsonify({
            "success": True,
            "requisition_id": req_res.get("id"),
            "link": req_res.get("link") or req_res.get("redirect")
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/openbanking/requisition/callback", methods=["POST"])
def openbanking_requisition_callback():
    data = load_data()
    payload = request.get_json(force=True) or {}
    req_id = payload.get("requisition_id")
    code = payload.get("code")
    state = payload.get("state")
    redirect_uri = payload.get("redirect_uri")

    ob_cfg = data.setdefault("settings", {}).setdefault("open_banking", {})
    provider = ob_cfg.get("provider", "truelayer").lower()
    client = get_open_banking_client(data)

    if provider == "truelayer" and code:
        pending_map = ob_cfg.setdefault("pending_requisitions", {})
        pending_meta = pending_map.pop(state, {}) if state else {}
        if not pending_meta and pending_map:
            latest_id = list(pending_map.keys())[-1]
            pending_meta = pending_map.pop(latest_id, {})

        target_redirect = pending_meta.get("redirect_uri") or ob_cfg.get("redirect_uri") or redirect_uri or ""
        try:
            token_res = client.exchange_code_for_token(code, target_redirect)
            access_token = token_res.get("access_token")
            refresh_token = token_res.get("refresh_token")

            raw_accs = client.get_accounts(access_token)
            linked = ob_cfg.setdefault("linked_accounts", [])
            discovered_accounts = []
            for a in raw_accs:
                aid = a.get("account_id")
                acc_name = a.get("display_name") or pending_meta.get("institution_name", "Account")
                acc_num = a.get("account_number", {})
                is_card = a.get("account_type") == "CARD"
                num_str = f"Card: {acc_num.get('number', '****')}" if is_card else (f"Acc: {acc_num.get('number', '****')}" if isinstance(acc_num, dict) else "****")

                existing = next((x for x in linked if x.get("account_id") == aid), None)
                if not existing:
                    new_item = {
                        "requisition_id": state or "truelayer",
                        "institution_id": pending_meta.get("institution_id", ""),
                        "institution_name": pending_meta.get("institution_name", "Bank"),
                        "institution_logo": pending_meta.get("institution_logo", ""),
                        "account_id": aid,
                        "account_name": acc_name,
                        "account_type": a.get("account_type", "ACCOUNT"),
                        "iban_or_masked_num": num_str,
                        "currency": a.get("currency", "GBP"),
                        "owner": pending_meta.get("owner", "Joint"),
                        "mapped_habit_account_id": None,
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "consent_expires_at": (datetime.date.today() + datetime.timedelta(days=90)).isoformat(),
                        "last_balance": 0.0,
                        "status": "active"
                    }
                    linked.append(new_item)
                    discovered_accounts.append(new_item)
                else:
                    existing["access_token"] = access_token
                    existing["refresh_token"] = refresh_token
                    discovered_accounts.append(existing)

            save_data(data)
            sync_open_banking_data(data)
            return jsonify({"success": True, "linked_accounts": discovered_accounts})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    if not req_id:
        return jsonify({"success": False, "error": "Missing requisition_id"}), 400

    try:
        req_data = client.get_requisition(req_id)
        acc_ids = req_data.get("accounts", [])
        if not acc_ids:
            return jsonify({"success": False, "error": "No accounts authorized yet by bank"}), 400

        pending_meta = ob_cfg.setdefault("pending_requisitions", {}).pop(req_id, {})
        linked = ob_cfg.setdefault("linked_accounts", [])

        discovered_accounts = []
        for aid in acc_ids:
            details = {}
            try:
                details = client.get_account_details(aid)
            except Exception:
                pass

            acc_name = details.get("name") or details.get("displayName") or details.get("product") or pending_meta.get("institution_name", "Account")
            masked_pan = details.get("maskedPan")
            iban_or_num = details.get("iban") or (f"Card: {masked_pan}" if masked_pan else None) or ("****" + str(aid)[-4:])
            
            # Check if already linked
            existing = next((a for a in linked if a.get("account_id") == aid), None)
            if not existing:
                new_linked = {
                    "requisition_id": req_id,
                    "institution_id": pending_meta.get("institution_id", ""),
                    "institution_name": pending_meta.get("institution_name", "Bank"),
                    "institution_logo": pending_meta.get("institution_logo", ""),
                    "account_id": aid,
                    "account_name": acc_name,
                    "iban_or_masked_num": iban_or_num,
                    "currency": details.get("currency", "GBP"),
                    "owner": pending_meta.get("owner", "Joint"),
                    "mapped_habit_account_id": None,
                    "consent_expires_at": (datetime.date.today() + datetime.timedelta(days=90)).isoformat(),
                    "last_balance": 0.0,
                    "status": "active"
                }
                linked.append(new_linked)
                discovered_accounts.append(new_linked)
            else:
                discovered_accounts.append(existing)

        save_data(data)
        # Run initial sync for the newly linked accounts
        sync_open_banking_data(data)

        return jsonify({"success": True, "linked_accounts": discovered_accounts})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/openbanking/accounts/map", methods=["POST"])
def openbanking_map_account():
    data = load_data()
    payload = request.get_json(force=True) or {}
    acc_id = payload.get("account_id")
    mapped_habit_account_id = payload.get("mapped_habit_account_id")
    owner = payload.get("owner")

    if not acc_id:
        return jsonify({"success": False, "error": "Missing account_id"}), 400

    ob_cfg = data.setdefault("settings", {}).setdefault("open_banking", {})
    linked = ob_cfg.setdefault("linked_accounts", [])
    
    target = next((a for a in linked if str(a.get("account_id")) == str(acc_id)), None)
    if not target:
        target = next((a for a in linked if str(a.get("account_id", "")).endswith(str(acc_id)) or str(acc_id).endswith(str(a.get("account_id", "")))), None)

    if target:
        if mapped_habit_account_id is not None:
            target["mapped_habit_account_id"] = mapped_habit_account_id
        if owner is not None:
            target["owner"] = owner
    else:
        target = {
            "account_id": acc_id,
            "account_name": mapped_habit_account_id or "Account",
            "owner": owner or "Joint",
            "mapped_habit_account_id": mapped_habit_account_id,
            "last_balance": 0.0,
            "status": "active"
        }
        linked.append(target)

    save_data(data)
    # Trigger sync to apply balances to mapped accounts
    try:
        sync_open_banking_data(data)
    except Exception as e:
        print(f"[OpenBanking] sync on map error: {e}")

    return jsonify({"success": True, "account": target})


@app.route("/api/openbanking/sync", methods=["POST"])
def openbanking_sync_api():
    data = load_data()
    result = sync_open_banking_data(data)
    return jsonify(result)


@app.route("/api/openbanking/unlink", methods=["POST"])
def openbanking_unlink():
    data = load_data()
    payload = request.get_json(force=True) or {}
    acc_id = payload.get("account_id")
    req_id = payload.get("requisition_id")
    
    ob_cfg = data.setdefault("settings", {}).setdefault("open_banking", {})
    linked = ob_cfg.get("linked_accounts", [])
    
    if acc_id:
        if str(acc_id) in ["None", "null", ""]:
            ob_cfg["linked_accounts"] = [a for a in linked if a.get("account_id") and str(a.get("account_id")) not in ["None", "null", ""]]
        else:
            ob_cfg["linked_accounts"] = [a for a in linked if str(a.get("account_id")) != str(acc_id)]
    elif req_id:
        ob_cfg["linked_accounts"] = [a for a in linked if str(a.get("requisition_id")) != str(req_id)]
    else:
        ob_cfg["linked_accounts"] = []

    save_data(data)
    return jsonify({"success": True, "remaining_linked": len(ob_cfg.get("linked_accounts", []))})


@app.route("/api/budget", methods=["GET", "POST"])
def budget_api():
    if request.method == "POST":
        save_data(request.get_json(force=True))
        return jsonify({"status": "saved"})
    data = load_data()
    reconcile_transactions_and_bills(data)
    return jsonify(data)

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

    if path.endswith("api/openbanking/debug/log"):
        return openbanking_get_debug_log()

    if path.endswith("api/openbanking/debug/clear"):
        return openbanking_clear_debug_log()

    if path.endswith("api/openbanking/sync"):
        return openbanking_sync_api()

    if path.endswith("api/openbanking/status"):
        return openbanking_status()
    
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
