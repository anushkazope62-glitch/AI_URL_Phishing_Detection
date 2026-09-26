import { useLanguage } from "../context/LanguageContext";

function About() {
  const { t } = useLanguage();

  return (
    <div className="dashboard about-page-wrapper">
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <h1>{t("about_title")}</h1>
          <p>{t("about_sub")}</p>
        </div>
      </div>

      {/* HERO CARD */}
      <div className="about-hero">
        <div className="about-hero-icon">🛡️</div>

        <div>
          <h2>{t("about_hero_title")}</h2>

          <p>{t("about_hero_desc")}</p>

          <div className="about-badges">
            <span>🤖 Machine Learning</span>
            <span>⚡ FastAPI</span>
            <span>⚛️ React</span>
            <span>🔐 Cyber Security</span>
            <span>👥 Multi-User Privacy</span>
          </div>
        </div>
      </div>

      {/* PROJECT OVERVIEW */}
      <div className="about-section">
        <div className="about-section-header">
          <h2>{t("project_overview_title")}</h2>
          <p>{t("project_overview_sub")}</p>
        </div>

        <div className="about-grid">
          <div className="about-info-card">
            <div className="about-card-icon">🎯</div>
            <h3>{t("obj_title")}</h3>
            <p>{t("obj_desc")}</p>
          </div>

          <div className="about-info-card">
            <div className="about-card-icon">🔍</div>
            <h3>{t("url_analysis_title")}</h3>
            <p>{t("url_analysis_desc")}</p>
          </div>

          <div className="about-info-card">
            <div className="about-card-icon">🤖</div>
            <h3>{t("ml_pred_title")}</h3>
            <p>{t("ml_pred_desc")}</p>
          </div>

          <div className="about-info-card">
            <div className="about-card-icon">🔒</div>
            <h3>{t("privacy_title")}</h3>
            <p>{t("privacy_desc")}</p>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="about-section">
        <div className="about-section-header">
          <h2>{t("how_it_works_title")}</h2>
          <p>{t("how_it_works_sub")}</p>
        </div>

        <div className="workflow">
          <div className="workflow-step">
            <div className="workflow-number">01</div>
            <div>
              <h3>{t("step1_title")}</h3>
              <p>{t("step1_desc")}</p>
            </div>
          </div>

          <div className="workflow-line"></div>

          <div className="workflow-step">
            <div className="workflow-number">02</div>
            <div>
              <h3>{t("step2_title")}</h3>
              <p>{t("step2_desc")}</p>
            </div>
          </div>

          <div className="workflow-line"></div>

          <div className="workflow-step">
            <div className="workflow-number">03</div>
            <div>
              <h3>{t("step3_title")}</h3>
              <p>{t("step3_desc")}</p>
            </div>
          </div>

          <div className="workflow-line"></div>

          <div className="workflow-step">
            <div className="workflow-number">04</div>
            <div>
              <h3>{t("step4_title")}</h3>
              <p>{t("step4_desc")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TECHNOLOGIES */}
      <div className="about-section">
        <div className="about-section-header">
          <h2>{t("tech_title")}</h2>
          <p>{t("tech_sub")}</p>
        </div>

        <div className="technology-grid">
          <div className="technology-card">
            <span>🐍</span>
            <div>
              <h3>Python</h3>
              <p>Backend & ML development</p>
            </div>
          </div>

          <div className="technology-card">
            <span>🤖</span>
            <div>
              <h3>Scikit-learn</h3>
              <p>Machine Learning model</p>
            </div>
          </div>

          <div className="technology-card">
            <span>⚡</span>
            <div>
              <h3>FastAPI</h3>
              <p>REST API backend</p>
            </div>
          </div>

          <div className="technology-card">
            <span>⚛️</span>
            <div>
              <h3>React.js</h3>
              <p>Interactive frontend</p>
            </div>
          </div>

          <div className="technology-card">
            <span>📊</span>
            <div>
              <h3>Pandas</h3>
              <p>Dataset processing</p>
            </div>
          </div>

          <div className="technology-card">
            <span>🗄️</span>
            <div>
              <h3>SQLite & Storage</h3>
              <p>Private user data management</p>
            </div>
          </div>
        </div>
      </div>

      {/* KEY FEATURES */}
      <div className="about-section">
        <div className="about-section-header">
          <h2>{t("key_features_title")}</h2>
        </div>

        <div className="features-list">
          <div>✅ Real-time URL scanning & feature extraction</div>
          <div>✅ Machine Learning based Random Forest prediction</div>
          <div>✅ Multi-user login, registration & account security</div>
          <div>✅ Isolated user Dashboard, Scan History & Analytics</div>
          <div>✅ Visual screenshot & webpage form threat inspection</div>
          <div>✅ Downloadable and printable security reports</div>
          <div>✅ 7-day, monthly & yearly interactive threat analytics</div>
          <div>✅ Dark mode and multilingual preferences</div>
        </div>
      </div>

      {/* PROJECT ARCHITECTURE */}
      <div className="about-section">
        <div className="about-section-header">
          <h2>{t("arch_title")}</h2>
          <p>{t("arch_sub")}</p>
        </div>

        <div className="architecture">
          <div className="architecture-box">
            <strong>⚛️ React Frontend</strong>
            <span>User Interface & Auth</span>
          </div>

          <div className="architecture-arrow">→</div>

          <div className="architecture-box">
            <strong>⚡ FastAPI</strong>
            <span>Auth & REST API</span>
          </div>

          <div className="architecture-arrow">→</div>

          <div className="architecture-box">
            <strong>🔍 Feature Extraction</strong>
            <span>URL Features</span>
          </div>

          <div className="architecture-arrow">→</div>

          <div className="architecture-box">
            <strong>🤖 Random Forest</strong>
            <span>Prediction Engine</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="about-footer">
        <h3>{t("footer_built_for")}</h3>
        <p>{t("app_subtitle")}</p>
        <span>{t("developed_by")}</span>
      </div>
    </div>
  );
}

export default About;