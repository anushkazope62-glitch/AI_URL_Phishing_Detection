from app.feature_extractor import extract_features
from app.main import is_trusted_domain, predict_url, URLRequest

test_urls = [
    "www.amazon.in",
    "https://www.amazon.in",
    "https://github.com/login",
    "https://www.google.com/signin",
    "https://branch.io/login",
    "https://flipkart.com",
    "http://amazon-security-verification.xyz/update",
    "http://free-iphone-claim-login-secure.xyz"
]

print("=" * 60)
print("TESTING URL VERIFICATION & PHISHING PREDICTION")
print("=" * 60)

for url in test_urls:
    res = predict_url(URLRequest(url=url))
    print(f"\nURL: {url}")
    print(f"Trusted Domain: {is_trusted_domain(url)}")
    print(f"Prediction: {res['prediction']} (Confidence: {res['confidence']}%, Threat Level: {res['threat_level']})")
    print(f"Suspicious Keywords Detected: {res['security_analysis']['suspicious_keywords']}")