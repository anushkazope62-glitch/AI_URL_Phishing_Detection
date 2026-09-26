import { useLanguage } from "../context/LanguageContext";

function UrlScan() {
  const { t } = useLanguage();

  const handleStartScanClick = () => {
    window.history.pushState({}, "", "/scanner");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="scanner-page">
      {/* 1. CENTERED CLEAN PROJECT TITLE */}
      <div className="scanner-clean-header">
        <div className="scanner-header-badge">
          <span className="live-pulsing-dot"></span>
          <span>{t("app_subtitle")}</span>
        </div>
        <h1 className="scanner-clean-title">
          🛡️ {t("project_intro_title")}
        </h1>
        <p className="scanner-clean-desc">
          {t("project_intro_desc")}
        </p>
      </div>

      {/* 2. WHO USES URL SCANNING */}
      <section className="scanner-info-section who-uses-section">
        <div className="scanner-section-heading">
          <h2>{t("who_uses_title")}</h2>
          <p>{t("who_uses_sub")}</p>
        </div>

        <div className="who-uses-grid">
          <div className="who-card">
            <div className="who-icon">🛒</div>
            <h3>{t("user_type_1_title")}</h3>
            <p>{t("user_type_1_desc")}</p>
          </div>

          <div className="who-card">
            <div className="who-icon">💼</div>
            <h3>{t("user_type_2_title")}</h3>
            <p>{t("user_type_2_desc")}</p>
          </div>

          <div className="who-card">
            <div className="who-icon">💳</div>
            <h3>{t("user_type_3_title")}</h3>
            <p>{t("user_type_3_desc")}</p>
          </div>

          <div className="who-card">
            <div className="who-icon">🛡️</div>
            <h3>{t("user_type_4_title")}</h3>
            <p>{t("user_type_4_desc")}</p>
          </div>

          <div className="who-card">
            <div className="who-icon">🎓</div>
            <h3>{t("user_type_5_title")}</h3>
            <p>{t("user_type_5_desc")}</p>
          </div>
        </div>
      </section>

      {/* 3. HOW URL SCANNING WORKS */}
      <section className="scanner-info-section how-works-section">
        <div className="scanner-section-heading">
          <h2>{t("how_works_title")}</h2>
          <p>{t("how_works_sub")}</p>
        </div>

        <div className="how-works-pipeline">
          <div className="pipeline-step">
            <div className="pipeline-step-badge">01</div>
            <h3>{t("scan_step_1_title")}</h3>
            <p>{t("scan_step_1_desc")}</p>
          </div>

          <div className="pipeline-step">
            <div className="pipeline-step-badge">02</div>
            <h3>{t("scan_step_2_title")}</h3>
            <p>{t("scan_step_2_desc")}</p>
          </div>

          <div className="pipeline-step">
            <div className="pipeline-step-badge">03</div>
            <h3>{t("scan_step_3_title")}</h3>
            <p>{t("scan_step_3_desc")}</p>
          </div>

          <div className="pipeline-step">
            <div className="pipeline-step-badge">04</div>
            <h3>{t("scan_step_4_title")}</h3>
            <p>{t("scan_step_4_desc")}</p>
          </div>
        </div>
      </section>

      {/* 4. WHY URL SCANNING IS IMPORTANT */}
      <section className="scanner-info-section why-important-section">
        <div className="scanner-section-heading">
          <h2>{t("why_important_title")}</h2>
          <p>{t("why_important_sub")}</p>
        </div>

        <div className="why-important-grid">
          <div className="why-card">
            <div className="why-icon">🔐</div>
            <h3>{t("why_imp_1_title")}</h3>
            <p>{t("why_imp_1_desc")}</p>
          </div>

          <div className="why-card">
            <div className="why-icon">🛑</div>
            <h3>{t("why_imp_2_title")}</h3>
            <p>{t("why_imp_2_desc")}</p>
          </div>

          <div className="why-card">
            <div className="why-icon">💰</div>
            <h3>{t("why_imp_3_title")}</h3>
            <p>{t("why_imp_3_desc")}</p>
          </div>

          <div className="why-card">
            <div className="why-icon">⚡</div>
            <h3>{t("why_imp_4_title")}</h3>
            <p>{t("why_imp_4_desc")}</p>
          </div>
        </div>
      </section>

      {/* 5. OTHER USEFUL INFORMATION & DAILY SECURITY INTELLIGENCE */}
      <section className="scanner-info-section other-info-section">
        <div className="scanner-section-heading">
          <h2>{t("other_info_title")}</h2>
          <p>{t("other_info_sub")}</p>
        </div>

        {/* Subcard 1: Today's URL Security Briefing */}
        <div className="today-security-subcard">
          <div className="section-header-badge-row">
            <div className="today-header-content">
              <h3>{t("today_security_title")}</h3>
              <p>{t("today_security_sub")}</p>
            </div>
            <div className="live-date-pill">
              <span className="live-pulsing-dot"></span>
              <strong>{todayFormatted}</strong>
            </div>
          </div>

          <div className="today-stats-grid">
            <div className="today-stat-card">
              <div className="today-stat-icon">📨</div>
              <div className="today-stat-number">{t("stat_daily_phishing_num")}</div>
              <div className="today-stat-desc">{t("stat_daily_phishing_desc")}</div>
            </div>

            <div className="today-stat-card">
              <div className="today-stat-icon">🎯</div>
              <div className="today-stat-number">{t("stat_attack_origin_num")}</div>
              <div className="today-stat-desc">{t("stat_attack_origin_desc")}</div>
            </div>

            <div className="today-stat-card">
              <div className="today-stat-icon">⏱️</div>
              <div className="today-stat-number">{t("stat_domain_life_num")}</div>
              <div className="today-stat-desc">{t("stat_domain_life_desc")}</div>
            </div>
          </div>
        </div>

        {/* Subcard 2: Key Phishing Red Flags & Safety Checklist */}
        <div className="red-flags-subblock">
          <div className="red-flags-subheading">
            <h3>{t("red_flags_title")}</h3>
            <p>{t("red_flags_sub")}</p>
          </div>

          <div className="red-flags-grid">
            <div className="flag-card">
              <div className="flag-badge">⚠️ 01</div>
              <h4>{t("flag_1_title")}</h4>
              <p>{t("flag_1_desc")}</p>
            </div>

            <div className="flag-card">
              <div className="flag-badge">⚠️ 02</div>
              <h4>{t("flag_2_title")}</h4>
              <p>{t("flag_2_desc")}</p>
            </div>

            <div className="flag-card">
              <div className="flag-badge">⚠️ 03</div>
              <h4>{t("flag_3_title")}</h4>
              <p>{t("flag_3_desc")}</p>
            </div>

            <div className="flag-card">
              <div className="flag-badge">⚠️ 04</div>
              <h4>{t("flag_4_title")}</h4>
              <p>{t("flag_4_desc")}</p>
            </div>

            <div className="flag-card">
              <div className="flag-badge">⚠️ 05</div>
              <h4>{t("flag_5_title")}</h4>
              <p>{t("flag_5_desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LARGE ATTRACTIVE "START URL SCAN" CTA BOX */}
      <div className="start-scan-hero-box">
        <div className="start-scan-badge">{t("start_scan_box_badge")}</div>
        <h2>{t("start_scan_box_title")}</h2>
        <p>{t("start_scan_box_desc")}</p>

        <div className="start-scan-features">
          <span>{t("start_scan_feat_1")}</span>
          <span>{t("start_scan_feat_2")}</span>
          <span>{t("start_scan_feat_3")}</span>
          <span>{t("start_scan_feat_4")}</span>
        </div>

        <div className="start-scan-cta-row">
          <button className="start-scan-cta-btn" onClick={handleStartScanClick}>
            {t("start_scan_box_btn")} →
          </button>
        </div>
      </div>
    </div>
  );
}

export default UrlScan;
