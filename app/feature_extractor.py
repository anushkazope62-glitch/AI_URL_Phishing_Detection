from urllib.parse import urlparse
import re
import math
from collections import Counter


def extract_features(url):

    # Default to https if scheme is missing (standard modern web)
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)

    domain = parsed.netloc.split(":")[0].lower()
    path = parsed.path
    query = parsed.query

    url_lower = url.lower()

    # -----------------------------
    # Basic URL features
    # -----------------------------

    url_length = len(url)
    domain_length = len(domain)

    # IP address
    is_domain_ip = 1 if re.match(
        r"^\d{1,3}(\.\d{1,3}){3}$",
        domain
    ) else 0

    # Domain parts
    parts = domain.split(".")
    tld = parts[-1] if len(parts) > 1 else ""

    no_of_subdomain = max(len(parts) - 2, 0)

    # -----------------------------
    # Character statistics
    # -----------------------------

    letters = sum(c.isalpha() for c in url)
    digits = sum(c.isdigit() for c in url)

    # Only suspicious special characters
    suspicious_special_chars = sum(
        1 for c in url if c in "@%$&=?_~"
    )

    # Domain-specific characters
    dots_in_domain = domain.count(".")
    hyphens_in_domain = domain.count("-")
    digits_in_domain = sum(c.isdigit() for c in domain)

    # -----------------------------
    # URL structure
    # -----------------------------

    equals_count = url.count("=")
    question_count = url.count("?")
    ampersand_count = url.count("&")

    path_length = len(path)
    query_length = len(query)

    path_segments = len([
        x for x in path.split("/")
        if x
    ])

    # -----------------------------
    # Obfuscation
    # -----------------------------

    percent_count = url.count("%")
    at_count = url.count("@")

    double_slash_count = url.count("//")

    # Extra // after http:// or https://
    suspicious_double_slash = max(
        double_slash_count - 1, 0
    )

    # Punycode
    has_punycode = 1 if "xn--" in domain else 0

    domain_lower = domain.lower()
    path_lower = path.lower()

    # -----------------------------
    # Suspicious keywords (Domain vs Path)
    # -----------------------------

    # High-risk keywords in DOMAIN (strong indicator of domain spoofing/brandjacking)
    domain_suspicious_keywords = [
        "verify",
        "verification",
        "secure",
        "account",
        "update",
        "confirm",
        "password",
        "credential",
        "wallet",
        "authentication",
        "recover",
        "unlock",
        "suspend",
        "alert",
        "billing",
        "payment"
    ]

    # High-risk keywords in PATH (excluding standard navigation like 'login' and 'signin')
    path_suspicious_keywords = [
        "password",
        "credential",
        "verification",
        "unlock",
        "suspend",
        "wallet",
        "recover"
    ]

    domain_kw_count = sum(
        1 for word in domain_suspicious_keywords
        if word in domain_lower
    )

    path_kw_count = sum(
        1 for word in path_suspicious_keywords
        if word in path_lower
    )

    suspicious_keyword_count = domain_kw_count + path_kw_count

    # -----------------------------
    # Existing dataset-style features
    # -----------------------------

    obfuscated_chars = percent_count + at_count

    has_password = 1 if "password" in url_lower else 0

    bank = 1 if "bank" in url_lower else 0

    pay = 1 if "pay" in url_lower else 0

    crypto = 1 if "crypto" in url_lower else 0

    # -----------------------------
    # URL entropy
    # -----------------------------

    counts = Counter(url)
    total = len(url)

    entropy = 0

    for count in counts.values():
        probability = count / total
        entropy -= probability * math.log2(probability)

    # -----------------------------
    # Final features
    # -----------------------------

    features = {

        "URLLength": url_length,

        "DomainLength": domain_length,

        "IsDomainIP": is_domain_ip,

        "TLDLength": len(tld),

        "NoOfSubDomain": no_of_subdomain,

        "HasObfuscation":
            1 if obfuscated_chars > 0 else 0,

        "NoOfObfuscatedChar":
            obfuscated_chars,

        "ObfuscationRatio":
            obfuscated_chars / url_length
            if url_length > 0 else 0,

        "NoOfLettersInURL":
            letters,

        "LetterRatioInURL":
            letters / url_length
            if url_length > 0 else 0,

        "NoOfDegitsInURL":
            digits,

        "DegitRatioInURL":
            digits / url_length
            if url_length > 0 else 0,

        "NoOfEqualsInURL":
            equals_count,

        "NoOfQMarkInURL":
            question_count,

        "NoOfAmpersandInURL":
            ampersand_count,

        "NoOfOtherSpecialCharsInURL":
            suspicious_special_chars,

        "SpacialCharRatioInURL":
            suspicious_special_chars / url_length
            if url_length > 0 else 0,

        "IsHTTPS":
            1 if parsed.scheme == "https" else 0,

        "HasPasswordField":
            has_password,

        "Bank":
            bank,

        "Pay":
            pay,

        "Crypto":
            crypto,

        # New stronger features
        "DotsInDomain":
            dots_in_domain,

        "HyphensInDomain":
            hyphens_in_domain,

        "DigitsInDomain":
            digits_in_domain,

        "PathLength":
            path_length,

        "QueryLength":
            query_length,

        "PathSegments":
            path_segments,

        "PercentCount":
            percent_count,

        "AtCount":
            at_count,

        "SuspiciousDoubleSlash":
            suspicious_double_slash,

        "HasPunycode":
            has_punycode,

        "SuspiciousKeywordCount":
            suspicious_keyword_count,

        "URL_Entropy":
            entropy
    }

    return features