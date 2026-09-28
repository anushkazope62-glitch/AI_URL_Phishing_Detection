import { useEffect, useState, useRef } from "react";
import { getLocalScans, setLocalScans } from "../utils/scanService";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE, getScreenshotUrl } from "../utils/config";

function Scanner({ loggedInUser, onLoginPrompt }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [webpageAnalysis, setWebpageAnalysis] = useState(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);

  const userKey = loggedInUser?.id ? String(loggedInUser.id) : "guest";
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowImageModal(false);
      }
    };
    if (showImageModal) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [showImageModal]);

  useEffect(() => {
    const savedResult = localStorage.getItem(`lastScanResult_${userKey}`);
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch (e) {
        setResult(null);
      }
    } else {
      setResult(null);
    }
  }, [userKey]);

  useEffect(() => {
    const savedURL = localStorage.getItem(`scannerURL_${userKey}`);
    if (savedURL) {
      setUrl(savedURL);
      localStorage.removeItem(`scannerURL_${userKey}`);
    }
  }, [userKey]);

  const autoCaptureScreenshot = async (targetUrl) => {
    if (!targetUrl) return;

    setScreenshotLoading(true);
    setAnalysisError(false);
    setAnalysisErrorMessage("");
    setWebpageAnalysis(null);

    try {
      const response = await fetch(`${API_BASE}/screenshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: targetUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Webpage visual capture failed");
      }

      setWebpageAnalysis(data);
      setAnalysisError(false);
    } catch (error) {
      console.error("Screenshot error:", error);
      setAnalysisError(true);
      setAnalysisErrorMessage(
        error.message || "Unable to capture visual screenshot for this URL."
      );
      setWebpageAnalysis(null);
    } finally {
      setScreenshotLoading(false);
    }
  };

  const scanURL = async () => {
    if (!url.trim()) {
      alert(t("url_placeholder"));
      return;
    }

    const targetUrl = url.trim();
    setLoading(true);
    setResult(null);
    setWebpageAnalysis(null);
    setScreenshotLoading(false);
    setAnalysisError(false);
    setAnalysisErrorMessage("");

    try {
      // Small natural loading delay so the scanning feels realistic & thorough
      const [response] = await Promise.all([
        fetch(`${API_BASE}/predict`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: targetUrl,
            user_id: loggedInUser?.id || null,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1100)),
      ]);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Scan failed");
      }

      setResult(data);
      localStorage.setItem(`lastScanResult_${userKey}`, JSON.stringify(data));

      if (loggedInUser?.id) {
        // Save scan into user's scan cache
        const scanRecord = {
          id: data.id,
          user_id: loggedInUser.id,
          url: data.url,
          prediction: data.prediction,
          confidence: data.confidence,
          threat_level: data.threat_level,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        const currentHistory = getLocalScans(loggedInUser.id);
        const updatedHistory = [scanRecord, ...currentHistory.filter(s => s.id !== data.id)].slice(0, 100);
        setLocalScans(loggedInUser.id, updatedHistory);
      }

      // Automatically capture live website screenshot
      autoCaptureScreenshot(data.url);
    } catch (error) {
      console.error(error);
      alert(
        "Unable to connect to FastAPI backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const scanAnother = () => {
    setResult(null);
    setUrl("");
    setWebpageAnalysis(null);
    setScreenshotLoading(false);
    setAnalysisError(false);
    setAnalysisErrorMessage("");
    localStorage.removeItem(`lastScanResult_${userKey}`);
    localStorage.removeItem(`scannerURL_${userKey}`);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="scanner-page">
      {/* PAGE HEADER */}
      <div className="page-header scanner-page-header">
        <div>
          <h1>{t("scanner_title")}</h1>
          <p>
            {loggedInUser
              ? t("scanner_subtitle_user", { name: loggedInUser.name })
              : t("scanner_subtitle")}
          </p>
        </div>

        <button className="top-scan-button" onClick={scanAnother}>
          {t("scan_another_url")}
        </button>
      </div>

          {/* SCANNER CARD */}
          <div className="scanner-card">
            <div className="scanner-header">
              <div>
                <h2>{t("scanner_card_title")}</h2>
                <p>{t("scanner_card_sub")}</p>
              </div>
            </div>

            <div className="scanner-input">
          <input
            ref={inputRef}
            type="text"
            placeholder={t("url_placeholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                scanURL();
              }
            }}
          />

          <button onClick={scanURL} disabled={loading}>
            {loading ? t("scanning_btn") : t("scan_url_btn")}
          </button>
        </div>

        {/* QUICK TIPS */}
        <div className="scanner-tips">
          <span>{t("tip_ai")}</span>
          <span>{t("tip_https")}</span>
          <span>{t("tip_phishing")}</span>
        </div>
      </div>

      {/* RESULT */}
      {result && (
        <div className="result-card printable-scan-output">
          {/* PRINT-ONLY OFFICIAL REPORT HEADER */}
          <div className="print-only-header">
            <div className="print-header-top">
              <div className="print-logo">
                <span className="print-logo-icon">🛡️</span>
                <div>
                  <h2>AI-Powered URL Phishing Detection System</h2>
                  <p>Official Security Inspection Report</p>
                </div>
              </div>
              <div className="print-meta">
                <div><strong>Scan Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                <div>
                  <strong>Inspector:</strong> {loggedInUser ? `${loggedInUser.name} (${loggedInUser.email})` : "Guest User"}
                </div>
              </div>
            </div>
          </div>

          {/* SECURITY ALERT */}
          <div
            className={`security-alert ${
              result.prediction === "Phishing"
                ? "alert-danger"
                : result.threat_level === "MEDIUM"
                ? "alert-warning"
                : "alert-safe"
            }`}
          >
            <div className="security-alert-icon">
              {result.prediction === "Phishing"
                ? "🚨"
                : result.threat_level === "MEDIUM"
                ? "⚠️"
                : "🛡️"}
            </div>

            <div className="security-alert-content">
              <h3>
                {result.prediction === "Phishing"
                  ? t("security_alert_phishing")
                  : result.threat_level === "MEDIUM"
                  ? t("security_alert_suspicious")
                  : t("security_alert_safe")}
              </h3>

              <p>
                {result.prediction === "Phishing"
                  ? t("alert_phishing_desc")
                  : result.threat_level === "MEDIUM"
                  ? t("alert_suspicious_desc")
                  : t("alert_safe_desc")}
              </p>
            </div>
          </div>

          <div className="result-header">
            <h2>{t("scan_result_header")}</h2>
          </div>

          <div className="result-url">
            <strong>{t("scanned_url_label")}</strong>
            <span>{result.url}</span>
          </div>

          {/* URL RISK CATEGORIES */}
          {result.risk_analysis && (
            <div className="risk-category-card">
              <div className="risk-category-header">
                <div>
                  <h2>{t("risk_categories_title")}</h2>
                  <p>{t("risk_categories_sub")}</p>
                </div>
              </div>

              <div className="risk-category-content">
                <div
                  className="risk-donut"
                  style={{
                    background: `conic-gradient(
                      #22c55e 0% ${result.risk_analysis.safe}%,
                      #ef4444 ${result.risk_analysis.safe}%
                        ${result.risk_analysis.safe + result.risk_analysis.unsafe}%,
                      #f59e0b ${result.risk_analysis.safe + result.risk_analysis.unsafe}% 100%
                    )`,
                  }}
                >
                  <div className="risk-donut-center">
                    <strong>{result.risk_analysis.safe}%</strong>
                    <span>{t("safe_label")}</span>
                  </div>
                </div>

                <div className="risk-legend">
                  <div className="risk-item">
                    <span className="risk-dot safe-risk"></span>
                    <div>
                      <strong>{t("safe_label")} — {result.risk_analysis.safe}%</strong>
                      <small>{t("safe_chars")}</small>
                    </div>
                  </div>

                  <div className="risk-item">
                    <span className="risk-dot phishing-risk"></span>
                    <div>
                      <strong>{t("unsafe_label")} — {result.risk_analysis.unsafe}%</strong>
                      <small>{t("phishing_risk")}</small>
                    </div>
                  </div>

                  <div className="risk-item">
                    <span className="risk-dot suspicious-risk"></span>
                    <div>
                      <strong>{t("suspicious_label")} — {result.risk_analysis.suspicious}%</strong>
                      <small>{t("needs_attention")}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FINAL SECURITY ASSESSMENT */}
          <div className="final-security-card">
            <div className="final-security-header">
              <div>
                <h2>{t("final_assessment_title")}</h2>
                <p>{t("final_assessment_sub")}</p>
              </div>

              {result.trusted_domain ? (
                <span className="final-risk-badge final-safe">
                  {t("trusted_domain_badge")}
                </span>
              ) : result.prediction === "Phishing" ? (
                <span className="final-risk-badge final-danger">
                  {t("dangerous_badge")}
                </span>
              ) : result.threat_level === "MEDIUM" ? (
                <span className="final-risk-badge final-warning">
                  {t("suspicious_badge")}
                </span>
              ) : (
                <span className="final-risk-badge final-safe">
                  {t("no_threats_badge")}
                </span>
              )}
            </div>

            <div className="final-security-message">
              {result.prediction === "Phishing" && (
                <p>{t("alert_phishing_desc")}</p>
              )}

              {result.prediction !== "Phishing" && result.threat_level === "MEDIUM" && (
                <p>{t("alert_suspicious_desc")}</p>
              )}

              {result.prediction !== "Phishing" && result.threat_level === "LOW" && (
                <p>{t("alert_safe_desc")}</p>
              )}
            </div>
          </div>

          {/* SECURITY WARNING */}
          {result.prediction === "Phishing" && (
            <div className="security-warning danger-warning">
              <div className="warning-icon">⚠️</div>
              <div>
                <h3>{t("security_warning_title")}</h3>
                <p>{t("security_warning_desc")}</p>
                <ul>
                  <li>{t("do_not_pwd")}</li>
                  <li>{t("do_not_bank")}</li>
                  <li>{t("do_not_personal")}</li>
                </ul>
              </div>
            </div>
          )}

          {result.prediction !== "Phishing" && result.threat_level === "MEDIUM" && (
            <div className="security-warning suspicious-warning">
              <div className="warning-icon">⚠️</div>
              <div>
                <h3>{t("caution_title")}</h3>
                <p>{t("caution_desc")}</p>
              </div>
            </div>
          )}

          {result.prediction !== "Phishing" && result.threat_level === "LOW" && (
            <div className="security-warning safe-warning">
              <div className="warning-icon">✅</div>
              <div>
                <h3>{t("safe_website_title")}</h3>
                <p>{t("safe_website_desc")}</p>
              </div>
            </div>
          )}

          {/* MAIN RESULT */}
          <div className="result-main">
            <div>
              <p>{t("prediction_label")}</p>
              <h1
                className={
                  result.prediction === "Phishing" ? "danger" : "safe"
                }
              >
                {result.prediction === "Phishing"
                  ? t("phishing_result")
                  : t("legitimate_result")}
              </h1>
            </div>

            <div>
              <p>{t("confidence_label")}</p>
              <h1>{result.confidence}%</h1>
            </div>

            <div>
              <p>{t("threat_level_label")}</p>
              <h1
                className={
                  result.threat_level === "HIGH" ? "danger" : "safe"
                }
              >
                {result.threat_level}
              </h1>
            </div>
          </div>

          {/* SECURITY ANALYSIS */}
          <div className="security-analysis">
            <h3>{t("security_analysis_title")}</h3>
            <div className="analysis-grid">
              <div>
                <strong>{t("https_label")}</strong>
                <span>{result.security_analysis?.https}</span>
              </div>

              <div>
                <strong>{t("ip_label")}</strong>
                <span>{result.security_analysis?.ip_address}</span>
              </div>

              <div>
                <strong>{t("keywords_label")}</strong>
                <span>{result.security_analysis?.suspicious_keywords}</span>
              </div>

              <div>
                <strong>{t("obfuscation_label")}</strong>
                <span>{result.security_analysis?.obfuscation}</span>
              </div>

              <div>
                <strong>{t("url_length_label")}</strong>
                <span>{result.security_analysis?.url_length}</span>
              </div>
            </div>
          </div>

          {/* VISUAL ANALYSIS CARD (Auto Screenshot & Page Title Above Screenshot) */}
          <div className="webpage-analysis-card visual-analysis-card">
            <div className="webpage-analysis-header">
              <div>
                <h2>{t("visual_analysis_title")}</h2>
                <p>{t("visual_analysis_sub")}</p>
              </div>
            </div>

            {/* PAGE TITLE DISPLAYED ABOVE SCREENSHOT */}
            {webpageAnalysis?.webpage_analysis?.title ? (
              <div className="visual-page-title-box">
                <span className="visual-page-title-label">{t("page_title_label")}:</span>
                <strong className="visual-page-title-value">
                  {webpageAnalysis.webpage_analysis.title}
                </strong>
              </div>
            ) : screenshotLoading ? (
              <div className="visual-page-title-box visual-page-title-loading">
                <span className="visual-page-title-label">{t("page_title_label")}:</span>
                <span className="visual-page-title-placeholder">Fetching page metadata...</span>
              </div>
            ) : null}

            {/* SCREENSHOT SECTION */}
            <div className="screenshot-section">
              <h3>{t("screenshot_preview")}</h3>

              {screenshotLoading ? (
                <div className="screenshot-loading-box">
                  <div className="screenshot-spinner"></div>
                  <p className="screenshot-loading-text">{t("visual_loading_text")}</p>
                  <small className="screenshot-loading-sub">
                    Rendering website in an isolated sandbox environment...
                  </small>
                </div>
              ) : webpageAnalysis?.success && webpageAnalysis?.screenshot_url ? (
                <div
                  className="screenshot-container screenshot-clickable"
                  onClick={() => setShowImageModal(true)}
                  title="Click to view enlarged screenshot"
                >
                  <img
                    src={getScreenshotUrl(webpageAnalysis.screenshot_url)}
                    alt="Visual Analysis Screenshot"
                    className="webpage-screenshot"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      if (result?.url) {
                        e.currentTarget.src = `https://s0.wp.com/mshots/v1/${encodeURIComponent(result.url)}?w=1280`;
                      }
                    }}
                  />
                  <div className="screenshot-zoom-overlay">
                    <span className="screenshot-zoom-badge">🔍 Click to Enlarge View</span>
                  </div>
                </div>
              ) : analysisError ? (
                <div className="screenshot-error-box">
                  <div className="screenshot-error-icon">⚠️</div>
                  <div className="screenshot-error-content">
                    <h4>{t("visual_failed_title")}</h4>
                    <p>{t("visual_failed_desc")}</p>
                  </div>
                </div>
              ) : (
                <div className="no-screenshot-message">
                  <p>📸 {t("screenshot_preview")}</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS (Only shown for logged-in users) */}
          {loggedInUser && (
            <div className="scanner-actions">
              <button className="secondary-button print-report-btn" onClick={printReport}>
                {t("print_report_btn")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SCREENSHOT LIGHTBOX / ENLARGED MODAL */}
      {showImageModal && webpageAnalysis?.screenshot_url && (
        <div
          className="screenshot-modal-backdrop"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="screenshot-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="screenshot-modal-header">
              <div className="screenshot-modal-title">
                <span className="modal-title-icon">📸</span>
                <div>
                  <strong>
                    {webpageAnalysis.webpage_analysis?.title || "Webpage Live Screenshot"}
                  </strong>
                  <small className="screenshot-modal-url">{result?.url}</small>
                </div>
              </div>
              <div className="screenshot-modal-actions">
                <a
                  href={getScreenshotUrl(webpageAnalysis.screenshot_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="screenshot-modal-newtab-btn"
                  title="Open in new tab"
                >
                  ↗️ Open in New Tab
                </a>
                <button
                  className="screenshot-modal-close-btn"
                  onClick={() => setShowImageModal(false)}
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="screenshot-modal-image-wrapper">
              <img
                src={getScreenshotUrl(webpageAnalysis.screenshot_url)}
                alt="Enlarged Webpage Screenshot"
                className="screenshot-modal-image"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  if (result?.url) {
                    e.currentTarget.src = `https://s0.wp.com/mshots/v1/${encodeURIComponent(result.url)}?w=1280`;
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scanner;
