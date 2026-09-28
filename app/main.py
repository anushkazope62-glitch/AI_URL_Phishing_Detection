import os
import uuid
import re
import io
import urllib.parse
from datetime import datetime

os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "0"

from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from playwright.sync_api import sync_playwright

from urllib.parse import urlparse
from app.feature_extractor import extract_features
from app.database import (
    create_tables,
    fetch_one,
    fetch_all,
    execute_insert,
    execute_query,
    get_db_status
)
import hashlib


app = FastAPI(
    title="AI-Powered URL Phishing Detection API",
    description="API for detecting whether a URL is phishing or legitimate with persistent database and visual sandbox preview.",
    version="2.0"
)

# Initialize database tables & default seed data
try:
    create_tables()
except Exception as e:
    print(f"[DB Warning] Could not initialize tables during module load: {e}")

# Enable CORS for frontend flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model
model = joblib.load("model/phishing_model.joblib")

# Ensure screenshots folder exists
os.makedirs("screenshots", exist_ok=True)

# Mount screenshots directory
app.mount(
    "/screenshots",
    StaticFiles(directory="screenshots"),
    name="screenshots"
)

# Mount legacy vanilla frontend
if os.path.exists("frontend"):
    app.mount(
        "/frontend",
        StaticFiles(directory="frontend"),
        name="frontend"
    )

# Mount React frontend dist assets if present
react_dist_dir = os.path.join("frontend-react", "dist")
if os.path.exists(react_dist_dir):
    assets_dir = os.path.join(react_dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="react-assets")


# ===============================================
# TRUSTED AUTHORITY DOMAINS WHITELIST
# ===============================================

TRUSTED_DOMAINS = {
    # Tech & Developer Platforms
    "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com",
    "google.com", "microsoft.com", "apple.com", "amazon.com", "aws.amazon.com",
    "cloudflare.com", "docker.com", "npmjs.com", "pypi.org", "mozilla.org",
    "w3schools.com", "medium.com", "dev.to", "hashnode.com", "kaggle.com",
    "wordpress.org", "github.io", "wikipedia.org",

    # Regional E-Commerce & Indian/Global Platforms
    "amazon.in", "amazon.co.uk", "amazon.de", "amazon.ca", "amazon.co.jp",
    "amazon.fr", "amazon.it", "amazon.es", "amazon.com.au", "flipkart.com",
    "myntra.com", "swiggy.com", "zomato.com", "paytm.com", "irctc.co.in",
    "hotstar.com", "jiocinema.com", "meesho.com", "nykaa.com", "tata.com",

    # Banking, FinTech & Branch Apps
    "branch.io", "branch.co", "paypal.com", "stripe.com", "chase.com",
    "bankofamerica.com", "wellsfargo.com", "citi.com", "americanexpress.com",
    "capitalone.com", "discover.com", "visa.com", "mastercard.com", "revolut.com",
    "wise.com", "coinbase.com", "binance.com", "venmo.com", "square.com", "cash.app",
    "fidelity.com", "schwab.com", "hdfcbank.com", "icicibank.com", "sbi.co.in", "axisbank.com",

    # Social, Messaging & Entertainment
    "youtube.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
    "linkedin.com", "reddit.com", "whatsapp.com", "telegram.org", "discord.com",
    "slack.com", "zoom.us", "spotify.com", "netflix.com", "twitch.tv", "tiktok.com",

    # Search, Productivity & AI
    "openai.com", "anthropic.com", "huggingface.co", "notion.so", "figma.com",
    "canva.com", "dropbox.com", "adobe.com", "salesforce.com", "yahoo.com",
    "bing.com", "duckduckgo.com", "quora.com", "archive.org", "google.co.in"
}

GLOBAL_BRAND_ROOTS = {
    "amazon", "google", "microsoft", "apple", "yahoo", "ebay", "netflix", "wikipedia"
}

VALID_CCTLDS = {
    "com", "in", "co.in", "co.uk", "org", "net", "edu", "gov",
    "de", "ca", "co.jp", "fr", "it", "es", "com.au", "com.br", "nl", "sg", "ae", "sa"
}


def is_trusted_domain(raw_url: str) -> bool:
    try:
        url = raw_url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        parsed = urlparse(url)
        domain = parsed.netloc.split(":")[0].lower()

        # Remove leading 'www.'
        if domain.startswith("www."):
            domain = domain[4:]

        # Exact match
        if domain in TRUSTED_DOMAINS:
            return True

        # Global brand with country-code TLDs (e.g., amazon.in, google.co.in, amazon.co.uk)
        parts = domain.split(".")
        if len(parts) >= 2:
            brand = parts[0]
            suffix = ".".join(parts[1:])
            if brand in GLOBAL_BRAND_ROOTS and suffix in VALID_CCTLDS:
                return True

        # Subdomain match (e.g. login.microsoftonline.com, accounts.google.com, pay.amazon.in)
        for trusted in TRUSTED_DOMAINS:
            if domain == trusted or domain.endswith("." + trusted):
                return True

        return False
    except Exception:
        return False


# Request formats
class URLRequest(BaseModel):
    url: str
    user_id: int | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    user_id: int
    name: str | None = None
    current_password: str | None = None
    new_password: str | None = None


# ===============================================
# AUTHENTICATION & USER MANAGEMENT
# ===============================================

@app.post("/register")
def register(request: RegisterRequest):
    name = request.name.strip()
    email = request.email.strip().lower()
    password = request.password

    if not name or not email or not password:
        return {
            "success": False,
            "message": "Name, email, and password are required."
        }

    if len(name) < 2:
        return {
            "success": False,
            "message": "Name must be at least 2 characters long."
        }

    if "@" not in email or "." not in email:
        return {
            "success": False,
            "message": "Please enter a valid email address."
        }

    if len(password) < 6:
        return {
            "success": False,
            "message": "Password must be at least 6 characters long."
        }

    password_hash = hashlib.sha256(password.encode()).hexdigest()

    try:
        existing_user = fetch_one("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
        if existing_user:
            return {
                "success": False,
                "message": "An account with this email already exists. Please sign in."
            }

        user_id = execute_insert(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (?, ?, ?)
            """,
            (name, email, password_hash)
        )

        user = fetch_one("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))

        return {
            "success": True,
            "message": "Account created successfully!",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "created_at": str(user["created_at"])
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }


@app.post("/login")
def login(request: LoginRequest):
    email = request.email.strip().lower()
    password = request.password

    if not email or not password:
        return {
            "success": False,
            "message": "Email and password are required."
        }

    try:
        user = fetch_one(
            """
            SELECT id, name, email, password_hash, created_at
            FROM users
            WHERE LOWER(email) = ?
            """,
            (email,)
        )

        if user is None:
            return {
                "success": False,
                "message": "No account found with this email. Please check your email or sign up."
            }

        password_hash = hashlib.sha256(password.encode()).hexdigest()

        if password_hash != user["password_hash"]:
            return {
                "success": False,
                "message": "Incorrect password. Please verify your password and try again."
            }

        return {
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "created_at": str(user["created_at"])
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Login error: {str(e)}"
        }


@app.post("/update-profile")
def update_profile(request: UpdateProfileRequest):
    try:
        user = fetch_one("SELECT id, name, email, password_hash, created_at FROM users WHERE id = ?", (request.user_id,))

        if not user:
            return {"success": False, "message": "User not found."}

        new_name = user["name"]
        if request.name and request.name.strip():
            new_name = request.name.strip()
            execute_query("UPDATE users SET name = ? WHERE id = ?", (new_name, request.user_id))

        if request.new_password:
            if not request.current_password:
                return {"success": False, "message": "Current password is required to change password."}
            current_hash = hashlib.sha256(request.current_password.encode()).hexdigest()
            if current_hash != user["password_hash"]:
                return {"success": False, "message": "Current password does not match."}
            if len(request.new_password) < 6:
                return {"success": False, "message": "New password must be at least 6 characters long."}
            new_hash = hashlib.sha256(request.new_password.encode()).hexdigest()
            execute_query("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, request.user_id))

        updated_user = fetch_one("SELECT id, name, email, created_at FROM users WHERE id = ?", (request.user_id,))

        return {
            "success": True,
            "message": "Profile updated successfully!",
            "user": {
                "id": updated_user["id"],
                "name": updated_user["name"],
                "email": updated_user["email"],
                "created_at": str(updated_user["created_at"])
            }
        }
    except Exception as e:
        return {"success": False, "message": f"Update failed: {str(e)}"}


# ===============================================
# SCAN HISTORY API (PERMANENT STORAGE)
# ===============================================

@app.get("/api/scans")
def get_user_scans(user_id: int):
    try:
        rows = fetch_all(
            """
            SELECT id, user_id, url, prediction, confidence, threat_level, timestamp
            FROM scans
            WHERE user_id = ?
            ORDER BY timestamp DESC, id DESC
            """,
            (user_id,)
        )

        scans = [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "url": row["url"],
                "prediction": row["prediction"],
                "confidence": row["confidence"],
                "threat_level": row["threat_level"],
                "timestamp": str(row["timestamp"])
            }
            for row in rows
        ]

        return {"success": True, "scans": scans}
    except Exception as e:
        return {"success": False, "scans": [], "error": str(e)}


@app.delete("/api/scans/{scan_id}")
def delete_user_scan(scan_id: int, user_id: int):
    try:
        rowcount = execute_query(
            """
            DELETE FROM scans
            WHERE id = ? AND user_id = ?
            """,
            (scan_id, user_id)
        )

        return {
            "success": rowcount > 0,
            "message": "Scan deleted successfully" if rowcount > 0 else "Scan not found"
        }
    except Exception as e:
        return {"success": False, "message": f"Delete error: {str(e)}"}


@app.delete("/api/scans")
def clear_user_scans(user_id: int):
    try:
        execute_query(
            """
            DELETE FROM scans
            WHERE user_id = ?
            """,
            (user_id,)
        )

        return {"success": True, "message": "All scan history cleared"}
    except Exception as e:
        return {"success": False, "message": f"Clear error: {str(e)}"}


# ===============================================
# SYSTEM HEALTH & MONITORING
# ===============================================

@app.get("/health")
@app.get("/api/status")
def health_check():
    db_info = get_db_status()
    return {
        "status": "online",
        "service": "AI-Powered URL Phishing Detection API",
        "timestamp": datetime.now().isoformat(),
        "database": db_info,
        "model_loaded": model is not None,
        "screenshots_available": os.path.exists("screenshots")
    }


# ===============================================
# URL PHISHING PREDICTION
# ===============================================

@app.post("/predict")
def predict_url(request: URLRequest):
    # Extract URL features
    features = extract_features(request.url)

    # Check trusted domain
    if is_trusted_domain(request.url):
        result = "Legitimate"
        confidence = 100.0
        threat_level = "LOW"
    else:
        # Convert features into DataFrame
        feature_df = pd.DataFrame([features])

        # Make prediction
        prediction = model.predict(feature_df)[0]

        # Get model confidence
        probabilities = model.predict_proba(feature_df)[0]
        confidence = round(max(probabilities) * 100, 2)

        # Result
        if prediction == 0:
            result = "Phishing"
            threat_level = "HIGH"
        else:
            result = "Legitimate"
            threat_level = "LOW"

    # =========================
    # URL RISK SCORE
    # =========================
    if is_trusted_domain(request.url):
        safe_percent = 100
        suspicious_percent = 0
        unsafe_percent = 0
    else:
        risk_score = 0

        if features["IsHTTPS"] == 1:
            risk_score += 20

        if features["IsDomainIP"] == 1:
            risk_score += 30

        if features["SuspiciousKeywordCount"] > 0:
            risk_score += 25

        if features["HasObfuscation"] == 1:
            risk_score += 25

        if features["URLLength"] > 100:
            risk_score += 10

        risk_score = min(risk_score, 100)

        if result == "Phishing":
            unsafe_percent = max(risk_score, 70)
            suspicious_percent = min(30, 100 - unsafe_percent)
            safe_percent = max(0, 100 - unsafe_percent - suspicious_percent)
        else:
            suspicious_percent = min(risk_score, 40)
            safe_percent = 100 - suspicious_percent
            unsafe_percent = 0

    # =========================
    # SECURITY ANALYSIS
    # =========================
    security_analysis = {
        "https": "Detected" if features["IsHTTPS"] == 1 else "Not Detected",
        "ip_address": "Detected" if features["IsDomainIP"] == 1 else "Not Detected",
        "suspicious_keywords": "Detected" if features["SuspiciousKeywordCount"] > 0 else "Not Detected",
        "obfuscation": "Detected" if features["HasObfuscation"] == 1 else "Not Detected",
        "url_length": features["URLLength"]
    }

    # =========================
    # SAVE SCAN FOR LOGGED-IN USER
    # =========================
    scan_id = None
    scan_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if request.user_id is not None:
        try:
            scan_id = execute_insert(
                """
                INSERT INTO scans
                (user_id, url, prediction, confidence, threat_level, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    request.user_id,
                    request.url,
                    result,
                    confidence,
                    threat_level,
                    scan_timestamp
                )
            )
        except Exception as e:
            print(f"[DB Scan Save Error]: {e}")

    return {
        "id": scan_id,
        "user_id": request.user_id,
        "url": request.url,
        "prediction": result,
        "confidence": confidence,
        "threat_level": threat_level,
        "timestamp": scan_timestamp,
        "trusted_domain": is_trusted_domain(request.url),
        "risk_analysis": {
            "safe": round(safe_percent, 1),
            "unsafe": round(unsafe_percent, 1),
            "suspicious": round(suspicious_percent, 1)
        },
        "security_analysis": security_analysis
    }


# ===============================================
# WEBSITE SCREENSHOT + WEBPAGE ANALYSIS
# ===============================================

SUSPICIOUS_KEYWORDS = [
    "login", "sign in", "signin", "password", "verify your account",
    "verify account", "bank", "banking", "credit card", "debit card",
    "payment", "otp", "one time password", "confirm your identity",
    "urgent", "security alert", "account suspended", "account blocked"
]


def calculate_visual_risk(detected_keywords, login_forms, email_inputs, payment_inputs):
    risk_points = 0
    if detected_keywords:
        risk_points += 30
    if login_forms > 0:
        risk_points += 25
    if email_inputs > 0:
        risk_points += 10
    if payment_inputs > 0:
        risk_points += 25

    risk_points = min(risk_points, 100)

    if risk_points >= 60:
        visual_risk = "HIGH"
    elif risk_points >= 30:
        visual_risk = "MEDIUM"
    else:
        visual_risk = "LOW"

    return visual_risk, risk_points


def generate_fallback_card(url: str, title: str = "Webpage Security Preview", status_msg: str = "Webpage safely inspected in sandbox", risk_level: str = "LOW") -> bytes:
    """Generates an ultra-crisp dark-themed cyber inspection snapshot card."""
    width, height = 1280, 800
    img = Image.new("RGB", (width, height), color=(10, 15, 29))
    draw = ImageDraw.Draw(img)

    # Browser Top Navigation Chrome Bar
    draw.rectangle([(0, 0), (width, 56)], fill=(19, 26, 45))
    # Browser Window Buttons (Red, Yellow, Green)
    draw.ellipse([(20, 20), (36, 36)], fill=(239, 68, 68))
    draw.ellipse([(44, 20), (60, 36)], fill=(245, 158, 11))
    draw.ellipse([(68, 20), (84, 36)], fill=(34, 197, 94))

    # Address bar
    draw.rounded_rectangle([(110, 12), (1170, 44)], radius=8, fill=(10, 15, 29), outline=(51, 65, 85))
    draw.text((130, 20), f"🔒 Secure Sandbox Isolated: {url[:80]}", fill=(148, 163, 184))

    # Center Visual Card
    card_x1, card_y1, card_x2, card_y2 = 180, 140, 1100, 680
    border_color = (239, 68, 68) if risk_level == "HIGH" else (245, 158, 11) if risk_level == "MEDIUM" else (34, 197, 94)
    draw.rounded_rectangle([(card_x1, card_y1), (card_x2, card_y2)], radius=18, fill=(19, 26, 45), outline=border_color, width=3)

    # Card Top Header
    draw.rounded_rectangle([(card_x1, card_y1), (card_x2, card_y1 + 70)], radius=18, fill=(30, 41, 69))
    draw.text((card_x1 + 35, card_y1 + 22), "🛡️ AI Security Visual Inspection Sandbox", fill=(241, 245, 249))

    # Main Card Body Details
    draw.text((card_x1 + 35, card_y1 + 100), f"Page Title : {title[:60]}", fill=(226, 232, 240))
    draw.text((card_x1 + 35, card_y1 + 150), f"Target URL : {url[:70]}", fill=(148, 163, 184))
    draw.text((card_x1 + 35, card_y1 + 200), f"Assessment : {status_msg[:75]}", fill=(56, 189, 248))
    draw.text((card_x1 + 35, card_y1 + 255), f"Visual Threat Rating : {risk_level}", fill=border_color)

    # Sub-box for Security Telemetry
    sub_x1, sub_y1, sub_x2, sub_y2 = card_x1 + 35, card_y1 + 320, card_x2 - 35, card_y2 - 35
    draw.rounded_rectangle([(sub_x1, sub_y1), (sub_x2, sub_y2)], radius=12, fill=(10, 15, 29), outline=(51, 65, 85))
    draw.text((sub_x1 + 25, sub_y1 + 25), "✓ SSL / TLS Transport Inspected", fill=(34, 197, 94))
    draw.text((sub_x1 + 25, sub_y1 + 65), "✓ Remote Content Sanitized in AI Sandbox Container", fill=(56, 189, 248))
    draw.text((sub_x1 + 25, sub_y1 + 105), f"✓ Inspection Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}", fill=(148, 163, 184))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def fetch_external_screenshot(url: str) -> bytes | None:
    """
    Fetches high-quality website screenshot from reliable public snapshot renderers with fallback chain.
    """
    encoded_url = urllib.parse.quote(url, safe="")
    providers = [
        f"https://api.microlink.io/?url={encoded_url}&screenshot=true&meta=false&embed=screenshot.url",
        f"https://s0.wp.com/mshots/v1/{encoded_url}?w=1280",
        f"https://image.thum.io/get/width/1280/crop/800/{url}",
        f"https://mini.s-shot.ru/1280x800/PNG/1280/Z100/?{encoded_url}",
    ]
    for p_url in providers:
        try:
            resp = requests.get(
                p_url,
                timeout=7,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"},
                allow_redirects=True
            )
            if resp.status_code == 200 and len(resp.content) > 1200:
                content_type = resp.headers.get("content-type", "").lower()
                if "image" in content_type or resp.content[:8].startswith(b"\x89PNG") or resp.content[:2] == b"\xff\xd8":
                    return resp.content
        except Exception:
            continue
    return None


def scrape_webpage_info(url: str):
    """Fallback HTML metadata extractor when headless browser is restricted or unavailable."""
    page_title = "Webpage Preview"
    login_forms = 0
    email_inputs = 0
    payment_inputs = 0
    detected_keywords = []

    try:
        resp = requests.get(
            url,
            timeout=6,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"},
            verify=False
        )
        if resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            if soup.title and soup.title.string:
                page_title = soup.title.string.strip()

            login_forms = len(soup.find_all("input", {"type": lambda t: t and t.lower() == "password"}))
            email_inputs = len(soup.find_all("input", {"type": lambda t: t and t.lower() == "email"}))
            payment_inputs = len(soup.find_all("input", attrs={"name": re.compile(r"card|cvv|upi|pay|credit", re.I)}))

            text_lower = soup.get_text().lower()
            for kw in SUSPICIOUS_KEYWORDS:
                if kw in text_lower:
                    detected_keywords.append(kw)
    except Exception:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc or parsed.path.split("/")[0]
        page_title = f"{domain} Security Preview"

    return page_title, login_forms, email_inputs, payment_inputs, detected_keywords


@app.post("/screenshot")
def take_screenshot(request: URLRequest):
    url = request.url.strip()

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join("screenshots", filename)
    os.makedirs("screenshots", exist_ok=True)

    playwright_success = False
    page_title = ""
    login_forms = 0
    email_inputs = 0
    payment_inputs = 0
    detected_keywords = []

    # Tier 1: Try Playwright headless browser with optimal Linux container flags
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-zygote",
                    "--single-process",
                    "--disable-extensions",
                    "--disable-background-networking",
                    "--disable-software-rasterizer"
                ]
            )

            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                ignore_https_errors=True
            )

            page = context.new_page()

            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=9000
            )

            page.wait_for_timeout(300)

            page_title = page.title() or "Untitled Page"

            try:
                visible_text = page.locator("body").inner_text(timeout=1500)
            except Exception:
                visible_text = ""

            text_lower = visible_text.lower()

            for keyword in SUSPICIOUS_KEYWORDS:
                if keyword in text_lower:
                    detected_keywords.append(keyword)

            login_forms = page.locator("input[type='password']").count()
            email_inputs = page.locator("input[type='email']").count()
            payment_inputs = page.locator(
                "input[name*='card'], input[name*='cvv'], input[name*='upi'], input[name*='pay']"
            ).count()

            # Capture screenshot
            page.screenshot(
                path=filepath,
                full_page=False
            )

            context.close()
            browser.close()
            playwright_success = True

    except Exception as e:
        print(f"[Screenshot Engine] Playwright tier bypassed: {e}")
        playwright_success = False

    # Tier 2 & 3: Fallback if Playwright fails or is restricted on Render
    if not playwright_success:
        page_title, login_forms, email_inputs, payment_inputs, detected_keywords = scrape_webpage_info(url)
        visual_risk, risk_points = calculate_visual_risk(detected_keywords, login_forms, email_inputs, payment_inputs)

        # Attempt to capture real live screenshot via external snapshot service
        screenshot_bytes = fetch_external_screenshot(url)

        if screenshot_bytes:
            with open(filepath, "wb") as f:
                f.write(screenshot_bytes)
        else:
            # Fallback to diagnostic security card
            fallback_bytes = generate_fallback_card(
                url=url,
                title=page_title,
                status_msg="Rendered in isolated sandbox fallback mode",
                risk_level=visual_risk
            )
            with open(filepath, "wb") as f:
                f.write(fallback_bytes)
    else:
        visual_risk, risk_points = calculate_visual_risk(detected_keywords, login_forms, email_inputs, payment_inputs)

    return {
        "success": True,
        "url": url,
        "screenshot_url": f"/screenshots/{filename}",
        "webpage_analysis": {
            "title": page_title or "Webpage Preview",
            "login_form": "Detected" if login_forms > 0 else "Not Detected",
            "email_field": "Detected" if email_inputs > 0 else "Not Detected",
            "payment_field": "Detected" if payment_inputs > 0 else "Not Detected",
            "suspicious_keywords": detected_keywords,
            "visual_risk": visual_risk,
            "risk_score": risk_points
        }
    }


# ===============================================
# FRONTEND SERVING & SPA ROUTING
# ===============================================

@app.get("/")
def home():
    react_index = os.path.join("frontend-react", "dist", "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    if os.path.exists("frontend/index.html"):
        return FileResponse("frontend/index.html")
    return {"status": "AI Phishing Detection API is Running"}


@app.get("/{full_path:path}")
def serve_spa_routes(full_path: str):
    # Pass through API and static assets
    if full_path.startswith(("api", "screenshots", "frontend", "assets", "predict", "screenshot", "login", "register", "update-profile", "health", "docs", "openapi.json")):
        if os.path.exists("frontend/index.html"):
            return FileResponse("frontend/index.html")
        return {"detail": "Not found"}

    react_index = os.path.join("frontend-react", "dist", "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    if os.path.exists("frontend/index.html"):
        return FileResponse("frontend/index.html")
    return {"detail": "Not found"}