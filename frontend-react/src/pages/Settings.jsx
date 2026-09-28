import { useEffect, useState } from "react";
import { clearUserScansApi } from "../utils/scanService";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE } from "../utils/config";

function Settings({ loggedInUser, onLoginPrompt }) {
  const { t, language, setLanguage } = useLanguage();
  const userKey = loggedInUser?.id ? String(loggedInUser.id) : "guest";

  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem(`notifications_${userKey}`) !== "false";
  });

  const [saveHistory, setSaveHistory] = useState(() => {
    return localStorage.getItem(`saveHistory_${userKey}`) !== "false";
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  // Account Security state
  const [profileName, setProfileName] = useState(loggedInUser?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (loggedInUser?.name) {
      setProfileName(loggedInUser.name);
    }
  }, [loggedInUser]);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    localStorage.setItem(`language_${userKey}`, selectedLang);
  };

  const handleNotificationsToggle = () => {
    const nextVal = !notifications;
    setNotifications(nextVal);
    localStorage.setItem(`notifications_${userKey}`, String(nextVal));
  };

  const handleSaveHistoryToggle = () => {
    const nextVal = !saveHistory;
    setSaveHistory(nextVal);
    localStorage.setItem(`saveHistory_${userKey}`, String(nextVal));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!loggedInUser) {
      if (onLoginPrompt) onLoginPrompt();
      return;
    }

    setProfileMessage({ text: "", type: "" });

    if (newPassword && newPassword.length < 6) {
      setProfileMessage({ text: "New password must be at least 6 characters long.", type: "danger" });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setProfileMessage({ text: "New passwords do not match.", type: "danger" });
      return;
    }

    if (newPassword && !currentPassword) {
      setProfileMessage({ text: "Please enter your current password to set a new password.", type: "danger" });
      return;
    }

    setProfileLoading(true);

    try {
      const response = await fetch(`${API_BASE}/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: loggedInUser.id,
          name: profileName.trim(),
          current_password: currentPassword || null,
          new_password: newPassword || null,
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        localStorage.setItem("loggedInUser", JSON.stringify(data.user));
        setProfileMessage({ text: data.message || "Profile updated successfully!", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setProfileMessage({ text: data.message || "Failed to update profile.", type: "danger" });
      }
    } catch (err) {
      console.error(err);
      setProfileMessage({ text: "Unable to connect to server. Please try again.", type: "danger" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!loggedInUser) {
      alert(t("settings_sub_guest"));
      return;
    }

    const confirmClear = window.confirm(
      "Are you sure you want to permanently clear all scan history for your account?"
    );

    if (confirmClear) {
      await clearUserScansApi(loggedInUser.id);
      alert("Your scan history has been cleared successfully.");
    }
  };

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h1>{t("settings_title")}</h1>
          <p>
            {loggedInUser
              ? t("settings_sub_user", { name: loggedInUser.name })
              : t("settings_sub_guest")}
          </p>
        </div>
      </div>

      {/* ACCOUNT & SECURITY PROFILE (Only for logged-in users) */}
      {loggedInUser && (
        <div className="settings-card">
          <div className="settings-header">
            <div>
              <h2>🛡️ Account & Password Security</h2>
              <p>Manage your account name and update your secure access password</p>
            </div>
          </div>

          {profileMessage.text && (
            <div
              className={`auth-alert ${
                profileMessage.type === "success" ? "success-alert" : "danger-alert"
              }`}
              style={{ marginBottom: "1rem" }}
            >
              {profileMessage.type === "success" ? "✅" : "⚠️"} {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="auth-form" style={{ maxWidth: "600px" }}>
            <div className="form-group">
              <label>Registered Email</label>
              <input type="email" value={loggedInUser.email} disabled readOnly style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "1rem 0" }} />

            <div className="form-group">
              <label>Current Password (leave blank if not changing password)</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label>New Password (min 6 characters)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={profileLoading} style={{ marginTop: "0.5rem" }}>
              {profileLoading ? "Saving Changes..." : "Save Profile & Password"}
            </button>
          </form>
        </div>
      )}

      {/* GENERAL PREFERENCES */}
      <div className="settings-card">
        <div className="settings-header">
          <div>
            <h2>{t("general_pref_title")}</h2>
            <p>{t("general_pref_sub")}</p>
          </div>
        </div>

        {/* LANGUAGE OPTION */}
        <div className="setting-item">
          <div>
            <h3>{t("language_title")}</h3>
            <p>{t("language_desc")}</p>
          </div>

          <div className="language-selector-wrapper">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="language-select"
            >
              <option value="en">🇺🇸 English (US)</option>
              <option value="es">🇪🇸 Español (Spanish)</option>
              <option value="fr">🇫🇷 Français (French)</option>
              <option value="de">🇩🇪 Deutsch (German)</option>
              <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
              <option value="ja">🇯🇵 日本語 (Japanese)</option>
              <option value="zh">🇨🇳 中文 (Chinese)</option>
            </select>
          </div>
        </div>

        {/* DARK MODE */}
        <div className="setting-item">
          <div>
            <h3>{t("dark_mode_title")}</h3>
            <p>{t("dark_mode_desc")}</p>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* SCAN NOTIFICATIONS */}
        <div className="setting-item">
          <div>
            <h3>{t("notifications_title")}</h3>
            <p>{t("notifications_desc")}</p>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={notifications}
              onChange={handleNotificationsToggle}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* SAVE SCAN HISTORY */}
        <div className="setting-item">
          <div>
            <h3>{t("save_history_title")}</h3>
            <p>{t("save_history_desc")}</p>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={handleSaveHistoryToggle}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* DATA MANAGEMENT */}
      <div className="settings-card">
        <div className="settings-header">
          <div>
            <h2>{t("data_mgmt_title")}</h2>
            <p>{t("data_mgmt_sub")}</p>
          </div>
        </div>

        <div className="danger-setting">
          <div>
            <h3>{t("clear_history_box_title")}</h3>
            <p>{t("clear_history_box_desc")}</p>
          </div>

          <button className="danger-button" onClick={handleClearHistory}>
            {t("clear_history_btn")}
          </button>
        </div>
      </div>

      {/* MODEL INFORMATION */}
      <div className="settings-card">
        <div className="settings-header">
          <div>
            <h2>{t("ml_model_title")}</h2>
            <p>{t("ml_model_sub")}</p>
          </div>
        </div>

        <div className="model-info-grid">
          <div>
            <span>{t("model_name_label")}</span>
            <strong>{t("random_forest_val")}</strong>
          </div>

          <div>
            <span>{t("task_label")}</span>
            <strong>{t("task_val")}</strong>
          </div>

          <div>
            <span>{t("input_label")}</span>
            <strong>{t("input_val")}</strong>
          </div>

          <div>
            <span>{t("output_label")}</span>
            <strong>{t("output_val")}</strong>
          </div>
        </div>
      </div>

      {/* SYSTEM STATUS */}
      <div className="settings-card">
        <div className="settings-header">
          <div>
            <h2>{t("system_status_title")}</h2>
            <p>{t("system_status_sub")}</p>
          </div>
        </div>

        <div className="system-status">
          <div>
            <span className="status-dot"></span>
            <strong>{t("system_status_online")}</strong>
          </div>

          <span className="status-text">{t("system_status_ready")}</span>
        </div>
      </div>
    </div>
  );
}

export default Settings;