import time
import json
import os
import copy
import re
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
    return os.environ.get("APP_VERSION", "0.1.0")

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

DEFAULT_SETTINGS = {
    "currency": "\u00a3",
    "theme": "grey_dark",
    "country_holidays": "uk_ew",
    "payday_day": 26,
    "track_savings": True,
    "enable_yearly_budgets": True,
    "enable_multi_user": False,
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

def save_data(data):
    try:
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
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

@app.route("/api/budget", methods=["GET", "POST"])
def budget_api():
    if request.method == "POST":
        save_data(request.get_json(force=True))
        return jsonify({"status": "saved"})
    return jsonify(load_data())

@app.route("/", defaults={"path": ""}, methods=["GET", "POST"])
@app.route("/<path:path>", methods=["GET", "POST"])
def catch_all(path):
    if path.endswith("api/version"):
        return jsonify({"build_id": BUILD_ID, "version": APP_VERSION})

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8099)
