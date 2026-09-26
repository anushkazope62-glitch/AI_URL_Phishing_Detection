import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { fetchUserScans, getLocalScans } from "../utils/scanService";

function ProfileModal({ isOpen, onClose, loggedInUser, onGoToSettings }) {
  const { t } = useLanguage();
  const [userScans, setUserScans] = useState([]);

  useEffect(() => {
    if (!isOpen || !loggedInUser) return;

    // Load local scans immediately
    const local = getLocalScans(loggedInUser.id);
    setUserScans(local);

    // Fetch fresh scans
    fetchUserScans(loggedInUser.id).then((scans) => {
      if (scans) setUserScans(scans);
    });
  }, [isOpen, loggedInUser]);

  if (!isOpen || !loggedInUser) return null;

  const totalScans = userScans.length;
  const safeScans = userScans.filter((s) => s.prediction === "Legitimate").length;
  const threatScans = userScans.filter((s) => s.prediction === "Phishing").length;
  const avatarLetter = loggedInUser.name
    ? loggedInUser.name.trim().charAt(0).toUpperCase()
    : "👤";

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal profile-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-close"
          onClick={onClose}
          aria-label={t("profile_close_btn")}
        >
          ✕
        </button>

        <div className="profile-modal-header">
          <div className="profile-modal-avatar-wrapper">
            <div className="profile-modal-avatar">{avatarLetter}</div>
            <span className="profile-online-badge" title="Online"></span>
          </div>

          <div className="profile-modal-titles">
            <h2>{loggedInUser.name}</h2>
            <p className="profile-modal-email">{loggedInUser.email}</p>
            <div className="profile-verified-badge">
              <span>🛡️</span>
              <span>{t("profile_verified")}</span>
            </div>
          </div>
        </div>

        <div className="profile-modal-stats-grid">
          <div className="profile-stat-box">
            <span className="profile-stat-num">{totalScans}</span>
            <span className="profile-stat-label">{t("profile_total_scans")}</span>
          </div>

          <div className="profile-stat-box safe-box">
            <span className="profile-stat-num">{safeScans}</span>
            <span className="profile-stat-label">{t("profile_safe_urls")}</span>
          </div>

          <div className="profile-stat-box threat-box">
            <span className="profile-stat-num">{threatScans}</span>
            <span className="profile-stat-label">{t("profile_threats_found")}</span>
          </div>
        </div>

        <div className="profile-modal-details">
          <div className="profile-detail-row">
            <span className="profile-detail-key">👤 {t("profile_full_name")}</span>
            <strong className="profile-detail-val">{loggedInUser.name}</strong>
          </div>

          <div className="profile-detail-row">
            <span className="profile-detail-key">✉️ {t("profile_email")}</span>
            <strong className="profile-detail-val">{loggedInUser.email}</strong>
          </div>

          <div className="profile-detail-row">
            <span className="profile-detail-key">🛡️ {t("profile_account_status")}</span>
            <span className="profile-status-pill">{t("profile_verified")}</span>
          </div>
        </div>

        <div className="profile-modal-actions">
          {onGoToSettings && (
            <button
              className="profile-modal-settings-btn"
              onClick={() => {
                onClose();
                onGoToSettings();
              }}
            >
              {t("profile_settings_btn")}
            </button>
          )}

          <button className="profile-modal-close-btn" onClick={onClose}>
            {t("profile_close_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
