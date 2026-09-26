from datetime import datetime
import os
import uuid

from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from playwright.sync_api import sync_playwright

from urllib.parse import urlparse
from app.feature_extractor import extract_features

from app.database import create_tables

import hashlib
from app.database import get_connection


app = FastAPI(
    title="AI-Powered URL Phishing Detection API",
    description="API for detecting whether a URL is phishing or legitimate.",
    version="1.0"
)

create_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-url-phishing-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load trained model
model = joblib.load("model/phishing_model.joblib")


# Create screenshots folder
os.makedirs("screenshots", exist_ok=True)


# Mount frontend
app.mount(
    "/frontend",
    StaticFiles(directory="frontend"),
    name="frontend"
)


# Mount screenshots
app.mount(
    "/screenshots",
    StaticFiles(directory="screenshots"),
    name="screenshots"
)


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

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
        existing_user = cursor.fetchone()
        if existing_user:
            connection.close()
            return {
                "success": False,
                "message": "An account with this email already exists."
            }

        cursor.execute(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (?, ?, ?)
            """,
            (name, email, password_hash)
        )
        connection.commit()
        user_id = cursor.lastrowid

        cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        connection.close()

        return {
            "success": True,
            "message": "Account created successfully!",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "created_at": user["created_at"]
            }
        }
    except Exception as e:
        connection.close()
        return {
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }


@app.post("/login")
def login(request: LoginRequest):
    email = request.email.strip().lower()
    password_hash = hashlib.sha256(
        request.password.encode()
    ).hexdigest()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, name, email, created_at
        FROM users
        WHERE LOWER(email) = ? AND password_hash = ?
        """,
        (email, password_hash)
    )

    user = cursor.fetchone()
    connection.close()

    if user is None:
        return {
            "success": False,
            "message": "Invalid email or password"
        }

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
    }


@app.post("/update-profile")
def update_profile(request: UpdateProfileRequest):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT id, name, email, password_hash, created_at FROM users WHERE id = ?", (request.user_id,))
    user = cursor.fetchone()

    if not user:
        connection.close()
        return {"success": False, "message": "User not found."}

    new_name = user["name"]
    if request.name and request.name.strip():
        new_name = request.name.strip()
        cursor.execute("UPDATE users SET name = ? WHERE id = ?", (new_name, request.user_id))

    if request.new_password:
        if not request.current_password:
            connection.close()
            return {"success": False, "message": "Current password is required to change password."}
        current_hash = hashlib.sha256(request.current_password.encode()).hexdigest()
        if current_hash != user["password_hash"]:
            connection.close()
            return {"success": False, "message": "Current password does not match."}
        if len(request.new_password) < 6:
            connection.close()
            return {"success": False, "message": "New password must be at least 6 characters long."}
        new_hash = hashlib.sha256(request.new_password.encode()).hexdigest()
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, request.user_id))

    connection.commit()
    cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (request.user_id,))
    updated_user = cursor.fetchone()
    connection.close()

    return {
        "success": True,
        "message": "Profile updated successfully!",
        "user": {
            "id": updated_user["id"],
            "name": updated_user["name"],
            "email": updated_user["email"],
            "created_at": updated_user["created_at"]
        }
    }


@app.get("/api/scans")
def get_user_scans(user_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, user_id, url, prediction, confidence, threat_level, timestamp
        FROM scans
        WHERE user_id = ?
        ORDER BY timestamp DESC, id DESC
        """,
        (user_id,)
    )
    rows = cursor.fetchall()
    connection.close()

    scans = [
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "url": row["url"],
            "prediction": row["prediction"],
            "confidence": row["confidence"],
            "threat_level": row["threat_level"],
            "timestamp": row["timestamp"]
        }
        for row in rows
    ]

    return {"success": True, "scans": scans}


@app.delete("/api/scans/{scan_id}")
def delete_user_scan(scan_id: int, user_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM scans
        WHERE id = ? AND user_id = ?
        """,
        (scan_id, user_id)
    )
    connection.commit()
    rowcount = cursor.rowcount
    connection.close()

    return {
        "success": rowcount > 0,
        "message": "Scan deleted successfully" if rowcount > 0 else "Scan not found"
    }


@app.delete("/api/scans")
def clear_user_scans(user_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM scans
        WHERE user_id = ?
        """,
        (user_id,)
    )
    connection.commit()
    connection.close()

    return {"success": True, "message": "All scan history cleared"}


# Home page
@app.get("/")
def home():
    return FileResponse("frontend/index.html")


# =========================
# URL PHISHING PREDICTION
# =========================

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

        # Trusted website = completely safe
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

        # =========================
        # RISK PERCENTAGES
        # =========================

        if result == "Phishing":

            unsafe_percent = max(risk_score, 70)

            suspicious_percent = min(
                30,
                100 - unsafe_percent
            )

            safe_percent = max(
                0,
                100 - unsafe_percent - suspicious_percent
            )

        else:

            suspicious_percent = min(risk_score, 40)

            safe_percent = 100 - suspicious_percent

            unsafe_percent = 0


    # =========================
    # SECURITY ANALYSIS
    # =========================

    security_analysis = {

        "https": "Detected"
        if features["IsHTTPS"] == 1
        else "Not Detected",

        "ip_address": "Detected"
        if features["IsDomainIP"] == 1
        else "Not Detected",

        "suspicious_keywords": "Detected"
        if features["SuspiciousKeywordCount"] > 0
        else "Not Detected",

        "obfuscation": "Detected"
        if features["HasObfuscation"] == 1
        else "Not Detected",

        "url_length": features["URLLength"]
    }


    # =========================
    # SAVE SCAN FOR LOGGED-IN USER
    # =========================

    scan_id = None
    scan_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if request.user_id is not None:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
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

        connection.commit()
        scan_id = cursor.lastrowid
        connection.close()

    # =========================
    # FINAL RESPONSE
    # =========================

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


# =========================
# WEBSITE SCREENSHOT + WEBPAGE ANALYSIS
# =========================

@app.post("/screenshot")
def take_screenshot(request: URLRequest):

    url = request.url.strip()

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join("screenshots", filename)


    

    try:
        with sync_playwright() as p:

            browser = p.chromium.launch(
                headless=True
            )

            page = browser.new_page(
                viewport={
                    "width": 1280,
                    "height": 800
                }
            )

            # Open webpage in background browser
            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=15000
            )

            # Small wait for dynamic content
            page.wait_for_timeout(300)

            # =========================
            # WEBPAGE INFORMATION
            # =========================

            page_title = page.title()

            try:
                visible_text = page.locator("body").inner_text(
                    timeout=3000
                )
            except Exception:
                visible_text = ""

            text_lower = visible_text.lower()

            # =========================
            # DETECT SUSPICIOUS CONTENT
            # =========================

            suspicious_keywords = [
                "login",
                "sign in",
                "signin",
                "password",
                "verify your account",
                "verify account",
                "bank",
                "banking",
                "credit card",
                "debit card",
                "payment",
                "otp",
                "one time password",
                "confirm your identity",
                "urgent",
                "security alert",
                "account suspended",
                "account blocked"
            ]

            detected_keywords = []

            for keyword in suspicious_keywords:

                if keyword in text_lower:
                    detected_keywords.append(keyword)

            # =========================
            # FORM DETECTION
            # =========================

            login_forms = page.locator(
                "input[type='password']"
            ).count()

            email_inputs = page.locator(
                "input[type='email']"
            ).count()

            payment_inputs = page.locator(
                "input[name*='card'], "
                "input[name*='cvv'], "
                "input[name*='upi']"
            ).count()

            # =========================
            # SCREENSHOT
            # =========================

            page.screenshot(
                path=filepath,
                full_page=False
            )

            browser.close()

        # =========================
        # VISUAL RISK CALCULATION
        # =========================

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

        return {

            "success": True,

            "url": url,

            "screenshot_url": f"/screenshots/{filename}",

            "webpage_analysis": {

                "title": page_title,

                "login_form": (
                    "Detected"
                    if login_forms > 0
                    else "Not Detected"
                ),

                "email_field": (
                    "Detected"
                    if email_inputs > 0
                    else "Not Detected"
                ),

                "payment_field": (
                    "Detected"
                    if payment_inputs > 0
                    else "Not Detected"
                ),

                "suspicious_keywords": detected_keywords,

                "visual_risk": visual_risk,

                "risk_score": risk_points
            }
        }

    except Exception as e:

        return {

            "success": False,

            "url": url,

            "error": str(e)

        }