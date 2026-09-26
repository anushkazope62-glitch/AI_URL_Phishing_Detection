"""
Live Webpage Screenshot Sandbox Engine
Safely renders, captures, and analyzes suspicious webpages in an isolated browser environment.
"""

import asyncio
import base64
import io
import re
import socket
import time
from urllib.parse import urlparse
from typing import Dict, Any, Optional

from playwright.async_api import async_playwright
from PIL import Image, ImageDraw


VIEWPORT_CONFIGS = {
    "desktop": {"width": 1280, "height": 800, "is_mobile": False},
    "mobile": {"width": 390, "height": 844, "is_mobile": True},
    "tablet": {"width": 768, "height": 1024, "is_mobile": False}
}

USER_AGENTS = {
    "desktop": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "mobile": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "tablet": "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
}


def normalize_url(raw_url: str) -> str:
    url = raw_url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url
    return url


def generate_fallback_image(url: str, message: str, status_title: str = "Sandbox Warning") -> str:
    """Generates a clean fallback screenshot when a site is unreachable or blocked."""
    width, height = 1280, 800
    img = Image.new("RGB", (width, height), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([(0, 0), (width, 50)], fill=(30, 41, 59))
    draw.ellipse([(20, 18), (34, 32)], fill=(239, 68, 68))
    draw.ellipse([(42, 18), (56, 32)], fill=(234, 179, 8))
    draw.ellipse([(64, 18), (78, 32)], fill=(34, 197, 94))
    
    # URL text box in header
    draw.rounded_rectangle([(100, 10), (1100, 40)], radius=6, fill=(15, 23, 42), outline=(51, 65, 85))
    draw.text((120, 16), f"Sandbox Preview: {url}", fill=(148, 163, 184))

    # Center card
    card_x1, card_y1, card_x2, card_y2 = 280, 220, 1000, 580
    draw.rounded_rectangle([(card_x1, card_y1), (card_x2, card_y2)], radius=16, fill=(30, 41, 59), outline=(239, 68, 68), width=2)

    # Text in card
    draw.text((card_x1 + 40, card_y1 + 40), f"[!] {status_title}", fill=(248, 113, 113))
    draw.text((card_x1 + 40, card_y1 + 90), f"Target URL: {url[:70]}", fill=(226, 232, 240))
    draw.text((card_x1 + 40, card_y1 + 130), f"Sandbox Report: {message[:90]}", fill=(148, 163, 184))
    draw.text((card_x1 + 40, card_y1 + 180), "Live Sandbox protected your system from directly opening this target.", fill=(56, 189, 248))
    draw.text((card_x1 + 40, card_y1 + 220), "Status: Connection Closed / Host Unreachable or Timed Out", fill=(100, 116, 139))

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


async def capture_webpage_sandbox(
    raw_url: str,
    viewport_type: str = "desktop",
    full_page: bool = False,
    timeout_ms: int = 15000
) -> Dict[str, Any]:
    """
    Safely navigates to the given URL in a sandboxed headless browser context,
    captures the live screenshot, extracts DOM/security metrics, and identifies phishing indicators.
    """
    url = normalize_url(raw_url)
    parsed = urlparse(url)
    domain = parsed.netloc or parsed.path.split('/')[0]

    viewport = VIEWPORT_CONFIGS.get(viewport_type.lower(), VIEWPORT_CONFIGS["desktop"])
    user_agent = USER_AGENTS.get(viewport_type.lower(), USER_AGENTS["desktop"])

    start_time = time.time()
    network_requests = []
    http_status = None
    response_headers = {}
    content_type = ""
    is_https = url.startswith("https://")

    # Security findings list
    sandbox_threats = []
    sandbox_risk_score = 0

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu"
                ]
            )

            context = await browser.new_context(
                viewport={"width": viewport["width"], "height": viewport["height"]},
                is_mobile=viewport["is_mobile"],
                user_agent=user_agent,
                ignore_https_errors=True,
                bypass_csp=False,
                java_script_enabled=True
            )

            page = await context.new_page()

            # Track network events
            async def handle_response(res):
                nonlocal http_status, response_headers, content_type
                try:
                    if res.url == url or res.url == page.url:
                        http_status = res.status
                        response_headers = await res.all_headers()
                        content_type = response_headers.get("content-type", "")
                    network_requests.append({
                        "url": res.url,
                        "status": res.status,
                        "resource_type": res.request.resource_type
                    })
                except Exception:
                    pass

            page.on("response", handle_response)

            try:
                main_response = await page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=timeout_ms
                )
                if main_response:
                    http_status = main_response.status
                    response_headers = await main_response.all_headers()
                    content_type = response_headers.get("content-type", "")
                
                # Allow minor dynamic elements / renders to settle
                await asyncio.sleep(1.0)
            except Exception as nav_err:
                pass

            final_url = page.url
            page_title = await page.title() or "Untitled Page"

            # Execute safe in-page analysis
            dom_analysis = await page.evaluate("""() => {
                const inputs = Array.from(document.querySelectorAll('input'));
                const passwordInputs = inputs.filter(i => (i.type || '').toLowerCase() === 'password');
                const emailInputs = inputs.filter(i => {
                    const t = (i.type || '').toLowerCase();
                    const n = (i.name || '').toLowerCase();
                    const id = (i.id || '').toLowerCase();
                    return t === 'email' || n.includes('email') || n.includes('user') || n.includes('login') || id.includes('user') || id.includes('email');
                });
                
                const forms = Array.from(document.querySelectorAll('forms, form')).map(f => ({
                    action: f.getAttribute('action') || '',
                    method: (f.getAttribute('method') || 'GET').toUpperCase(),
                    input_count: f.querySelectorAll('input').length,
                    has_password: !!f.querySelector('input[type="password"]')
                }));

                const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
                    src: f.getAttribute('src') || '',
                    hidden: f.offsetWidth === 0 || f.offsetHeight === 0 || window.getComputedStyle(f).display === 'none'
                }));

                const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src') || '');
                const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href') || '');

                const metaTags = {};
                document.querySelectorAll('meta').forEach(m => {
                    const name = m.getAttribute('name') || m.getAttribute('property');
                    const content = m.getAttribute('content');
                    if (name && content) {
                        metaTags[name.toLowerCase()] = content;
                    }
                });

                // Favicon finder
                let favicon = '';
                const iconLink = document.querySelector('link[rel*="icon"]');
                if (iconLink) {
                    favicon = iconLink.href;
                }

                return {
                    password_inputs_count: passwordInputs.length,
                    login_inputs_count: emailInputs.length,
                    total_inputs: inputs.length,
                    forms: forms,
                    iframes_count: iframes.length,
                    hidden_iframes_count: iframes.filter(i => i.hidden).length,
                    external_scripts_count: scripts.length,
                    total_links: links.length,
                    meta_description: metaTags['description'] || metaTags['og:description'] || '',
                    favicon: favicon,
                    body_text_length: (document.body ? document.body.innerText.length : 0)
                };
            }""")

            # Capture screenshot
            screenshot_bytes = await page.screenshot(
                full_page=full_page,
                type="png"
            )

            await context.close()
            await browser.close()

            latency_ms = round((time.time() - start_time) * 1000)

            # Security heuristics evaluation
            if dom_analysis.get("password_inputs_count", 0) > 0:
                sandbox_risk_score += 40
                sandbox_threats.append({
                    "severity": "CRITICAL",
                    "title": "Credential Harvester (Password Input Field)",
                    "detail": f"Detected {dom_analysis['password_inputs_count']} password entry field(s) on the rendered page."
                })

            if final_url and parsed.netloc and (urlparse(final_url).netloc.lower() != parsed.netloc.lower()):
                sandbox_risk_score += 30
                sandbox_threats.append({
                    "severity": "HIGH",
                    "title": "URL Redirection Cloaking",
                    "detail": f"Initial target domain redirected to an external domain: {urlparse(final_url).netloc}"
                })

            if not is_https:
                sandbox_risk_score += 20
                sandbox_threats.append({
                    "severity": "MEDIUM",
                    "title": "Insecure HTTP Protocol",
                    "detail": "Connection is not encrypted with SSL/TLS."
                })

            if dom_analysis.get("hidden_iframes_count", 0) > 0:
                sandbox_risk_score += 25
                sandbox_threats.append({
                    "severity": "HIGH",
                    "title": "Hidden Iframe Overlay Detected",
                    "detail": f"Page contains {dom_analysis['hidden_iframes_count']} invisible iframe(s) often used for clickjacking or silent credential theft."
                })

            # Check for suspicious brand keywords in title vs non-brand domain
            brand_keywords = ["google", "microsoft", "paypal", "netflix", "apple", "amazon", "chase", "bank", "instagram", "facebook", "login", "signin", "verify", "secure", "update-account"]
            lower_title = page_title.lower()
            for kw in brand_keywords:
                if kw in lower_title and kw not in domain.lower():
                    sandbox_risk_score += 25
                    sandbox_threats.append({
                        "severity": "HIGH",
                        "title": f"Brand Impersonation in Page Title ({kw.capitalize()})",
                        "detail": f"Webpage title contains '{kw}' but the domain name does not match the official platform."
                    })
                    break

            # Threat level determination
            if sandbox_risk_score >= 60:
                overall_threat = "HIGH"
            elif sandbox_risk_score >= 30:
                overall_threat = "MEDIUM"
            else:
                overall_threat = "LOW"

            screenshot_b64 = f"data:image/png;base64,{base64.b64encode(screenshot_bytes).decode('utf-8')}"

            return {
                "status": "success",
                "url": url,
                "final_url": final_url or url,
                "page_title": page_title,
                "http_status": http_status or 200,
                "latency_ms": latency_ms,
                "viewport": viewport_type,
                "is_https": is_https,
                "content_type": content_type,
                "screenshot": screenshot_b64,
                "dom_metrics": dom_analysis,
                "threat_assessment": {
                    "overall_threat": overall_threat,
                    "risk_score": min(sandbox_risk_score, 100),
                    "threats_count": len(sandbox_threats),
                    "threats": sandbox_threats
                },
                "network_summary": {
                    "requests_count": len(network_requests),
                    "server": response_headers.get("server", "Protected / Hidden"),
                    "security_headers": {
                        "content_security_policy": "present" if "content-security-policy" in response_headers else "missing",
                        "x_frame_options": response_headers.get("x-frame-options", "None"),
                        "strict_transport_security": "present" if "strict-transport-security" in response_headers else "missing"
                    }
                }
            }

    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000)
        error_msg = str(e)
        fallback_screenshot = generate_fallback_image(url, error_msg, "Sandbox Target Unreachable")

        return {
            "status": "unreachable",
            "url": url,
            "final_url": url,
            "page_title": "Unreachable / Blocked Destination",
            "http_status": 0,
            "latency_ms": latency_ms,
            "viewport": viewport_type,
            "is_https": is_https,
            "content_type": "N/A",
            "screenshot": fallback_screenshot,
            "dom_metrics": {
                "password_inputs_count": 0,
                "login_inputs_count": 0,
                "total_inputs": 0,
                "forms": [],
                "iframes_count": 0,
                "hidden_iframes_count": 0,
                "external_scripts_count": 0,
                "total_links": 0,
                "meta_description": "Target server refused connection, timed out, or blocked sandbox crawler.",
                "favicon": "",
                "body_text_length": 0
            },
            "threat_assessment": {
                "overall_threat": "SUSPICIOUS",
                "risk_score": 45,
                "threats_count": 1,
                "threats": [{
                    "severity": "MEDIUM",
                    "title": "Host Offline / Cloaked / Connection Failed",
                    "detail": f"Sandbox failed to establish TCP/HTTP handshake ({error_msg[:120]}). Malicious campaigns often rapidly take down or cloak their hosting."
                }]
            },
            "network_summary": {
                "requests_count": 0,
                "server": "Unavailable",
                "security_headers": {}
            }
        }
