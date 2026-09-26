import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

function Resources() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);

  const goTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const guides = [
    {
      id: "guide-1",
      category: "guides",
      badge: "🔍 URL Analysis",
      title: t("res_guide_1_title"),
      desc: t("res_guide_1_desc"),
      bullets: [
        "Homograph / Punycode (e.g. micrоsoft.com with Cyrillic 'о')",
        "Misleading subdomains (e.g. paypal.com.account-verify.xyz)",
        "High-risk TLDs (.xyz, .top, .buzz, .tk, .work)",
        "Direct IP addresses without domain resolution (http://192.168.1.1/login)",
      ],
    },
    {
      id: "guide-2",
      category: "guides",
      badge: "🛡️ Best Practices",
      title: t("res_guide_2_title"),
      desc: t("res_guide_2_desc"),
      bullets: [
        "Always verify HTTPS and SSL certificate issuer in the address bar",
        "Never enter credentials from unsolicited emails or urgent SMS alerts",
        "Enable hardware or app-based 2FA (TOTP / FIDO2) across all accounts",
        "Use sandboxed URL scanners before visiting unfamiliar links",
      ],
    },
    {
      id: "guide-3",
      category: "indicators",
      badge: "🚨 Incident Response",
      title: t("res_guide_3_title"),
      desc: t("res_guide_3_desc"),
      bullets: [
        "Immediately disconnect or isolate the affected session",
        "Change master passwords from a clean, separate device",
        "Revoke active OAuth sessions and login tokens",
        "Report the phishing domain to your security team and threat feeds",
      ],
    },
    {
      id: "guide-4",
      category: "tools",
      badge: "🤖 AI Intelligence",
      title: t("res_guide_4_title"),
      desc: t("res_guide_4_desc"),
      bullets: [
        "15+ Lexical & Structural heuristic feature extractions",
        "Random Forest classification trained on 10,000+ threat vectors",
        "Isolated sandbox visual inspection and form detection",
        "Zero-day resilience before public blacklist propagation",
      ],
    },
  ];

  const threatFeeds = [
    {
      name: "APWG (Anti-Phishing Working Group)",
      desc: "Global coalition fighting cybercrime, phishing, and electronic identity theft.",
      link: "https://apwg.org",
      tag: "Global Coalition",
    },
    {
      name: "CISA Cyber Defense",
      desc: "United States Cybersecurity & Infrastructure Security Agency advisories.",
      link: "https://www.cisa.gov",
      tag: "Advisories & Alerts",
    },
    {
      name: "VirusTotal Intelligence",
      desc: "Multivendor malware and URL threat inspection aggregator.",
      link: "https://www.virustotal.com",
      tag: "Threat Aggregator",
    },
    {
      name: "OpenPhish Threat Feed",
      desc: "Automated zero-day phishing intelligence and real-time feed.",
      link: "https://openphish.com",
      tag: "Live Feed",
    },
    {
      name: "Google Safe Browsing",
      desc: "Protects billions of devices by warning users of unsafe web destinations.",
      link: "https://safebrowsing.google.com",
      tag: "Global Defense",
    },
    {
      name: "PhishTank Database",
      desc: "Community-driven collaborative clearinghouse for phishing data and verification.",
      link: "https://phishtank.org",
      tag: "Open Community",
    },
  ];

  const faqs = [
    {
      q: "What makes a URL classified as Phishing?",
      a: "A URL is flagged as phishing when its lexical traits, domain heuristics, or webpage structure exhibit deceptive patterns designed to impersonate trusted institutions, steal credentials, or deploy malware.",
    },
    {
      q: "How does this platform detect zero-day phishing links?",
      a: "Unlike traditional static blacklists which take hours to update, our platform uses machine learning feature vectors (URL length, character entropy, subdomain depth, keyword obfuscation) and sandbox inspection to detect threats instantly.",
    },
    {
      q: "Can HTTPS websites still be malicious or phishing?",
      a: "Yes. Over 80% of modern phishing websites utilize free SSL/TLS certificates (HTTPS). While HTTPS encrypts the connection, it does NOT guarantee the legitimacy of the destination domain.",
    },
    {
      q: "What should I do if a URL is flagged as 'Potentially Dangerous'?",
      a: "Do not open the link in your regular browser. Do not enter passwords, credit card numbers, or personal info. If the link was sent via email or SMS, report it as spam/phishing and delete it.",
    },
    {
      q: "Are my scanned URLs and personal history private?",
      a: "Yes. Scans performed under your account are isolated to your profile and secured. You have full control to view, export, or permanently delete your scan logs anytime.",
    },
  ];

  const filteredGuides = guides.filter((g) => {
    const matchesTab = activeTab === "all" || g.category === activeTab;
    const matchesSearch =
      !searchQuery ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="resources-page dashboard">
      {/* 1. HERO HEADER */}
      <div className="resources-hero">
        <div className="resources-hero-badge">
          {t("resources_hero_tag")}
        </div>
        <h1>{t("resources_title")}</h1>
        <p>{t("resources_sub")}</p>

        {/* Quick Search */}
        <div className="resources-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={t("res_search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. CATEGORY TABS */}
      <div className="resources-tabs">
        <button
          className={`res-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          🌐 {t("res_cat_all")}
        </button>
        <button
          className={`res-tab-btn ${activeTab === "guides" ? "active" : ""}`}
          onClick={() => setActiveTab("guides")}
        >
          📖 {t("res_cat_guides")}
        </button>
        <button
          className={`res-tab-btn ${activeTab === "indicators" ? "active" : ""}`}
          onClick={() => setActiveTab("indicators")}
        >
          🔍 {t("res_cat_indicators")}
        </button>
        <button
          className={`res-tab-btn ${activeTab === "tools" ? "active" : ""}`}
          onClick={() => setActiveTab("tools")}
        >
          🤖 {t("res_cat_tools")}
        </button>
        <button
          className={`res-tab-btn ${activeTab === "faq" ? "active" : ""}`}
          onClick={() => setActiveTab("faq")}
        >
          ❓ {t("res_cat_faq")}
        </button>
      </div>

      {/* 3. GUIDES & ARTICLES GRID */}
      {activeTab !== "faq" && (
        <div className="resources-grid">
          {filteredGuides.map((guide) => (
            <div className="resource-card" key={guide.id}>
              <div className="resource-card-header">
                <span className="resource-badge">{guide.badge}</span>
              </div>
              <h3>{guide.title}</h3>
              <p>{guide.desc}</p>

              <div className="resource-bullets">
                {guide.bullets.map((bullet, idx) => (
                  <div className="resource-bullet-item" key={idx}>
                    <span className="bullet-dot">✓</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. INTERACTIVE URL ANATOMY BREAKDOWN */}
      {(activeTab === "all" || activeTab === "indicators") && (
        <div className="url-anatomy-card">
          <div className="anatomy-header">
            <span className="anatomy-icon">🔬</span>
            <div>
              <h2>{t("res_anatomy_title")}</h2>
              <p>{t("res_anatomy_sub")}</p>
            </div>
          </div>

          <div className="anatomy-visual-container">
            <div className="anatomy-url-display">
              <span className="url-part proto" title="Protocol (Encrypted, but doesn't mean safe)">
                https://
              </span>
              <span className="url-part sub" title="Subdomain (Often faked as a trusted brand)">
                paypal-support.
              </span>
              <span className="url-part domain" title="Target Domain (Notice the spoofed name)">
                account-security-alert
              </span>
              <span className="url-part tld" title="Suspicious TLD (.xyz, .tk, etc.)">
                .xyz
              </span>
              <span className="url-part path" title="Path / Parameter (Targeting login credentials)">
                /login/verify.php?token=9x821
              </span>
            </div>

            <div className="anatomy-legend-grid">
              <div className="legend-item proto-item">
                <strong>1. Protocol (https://)</strong>
                <p>SSL Encryption exists, but scammers also use free certificates.</p>
              </div>
              <div className="legend-item sub-item">
                <strong>2. Subdomain (paypal-support)</strong>
                <p>Brand name is placed in subdomain to fool hurried users.</p>
              </div>
              <div className="legend-item domain-item">
                <strong>3. Actual Domain (account-security-alert)</strong>
                <p>The true registered domain owned by the cybercriminal.</p>
              </div>
              <div className="legend-item tld-item">
                <strong>4. Suspicious TLD (.xyz)</strong>
                <p>High-abuse, low-cost top level domain frequently utilized in scams.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. GLOBAL THREAT FEEDS & DATABASES */}
      {(activeTab === "all" || activeTab === "tools") && (
        <div className="threat-feeds-section">
          <div className="section-title-wrapper">
            <div className="section-title-icon">🌐</div>
            <div>
              <h2>{t("res_threat_org_title")}</h2>
              <p>{t("res_threat_org_sub")}</p>
            </div>
          </div>

          <div className="threat-feeds-grid">
            {threatFeeds.map((feed, idx) => (
              <a
                href={feed.link}
                target="_blank"
                rel="noopener noreferrer"
                className="threat-feed-card"
                key={idx}
              >
                <div className="threat-feed-top">
                  <strong>{feed.name}</strong>
                  <span className="threat-feed-tag">{feed.tag}</span>
                </div>
                <p>{feed.desc}</p>
                <span className="threat-feed-arrow">External Reference ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 6. SECURITY FAQS */}
      {(activeTab === "all" || activeTab === "faq") && (
        <div className="faq-section">
          <div className="section-title-wrapper">
            <div className="section-title-icon">❓</div>
            <div>
              <h2>{t("res_faq_title")}</h2>
              <p>{t("res_faq_sub")}</p>
            </div>
          </div>

          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div
                className={`faq-item ${expandedFaq === idx ? "expanded" : ""}`}
                key={idx}
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <div className="faq-question">
                  <strong>{faq.q}</strong>
                  <span className="faq-toggle">{expandedFaq === idx ? "−" : "+"}</span>
                </div>
                {expandedFaq === idx && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. QUICK SCAN CTA BANNER */}
      <div className="resources-cta-banner">
        <div className="cta-content">
          <h2>🛡️ Test Any Suspicious Link in Real Time</h2>
          <p>
            Put our AI-powered Random Forest URL phishing detection engine to work. Inspect links in a live isolated sandbox.
          </p>
        </div>
        <button className="cta-scan-btn" onClick={() => goTo("/scanner")}>
          🔍 Scan a URL Now
        </button>
      </div>
    </div>
  );
}

export default Resources;
