import { useEffect, useState } from "react";
import { clearUserScansApi } from "../utils/scanService";
import { useLanguage } from "../context/LanguageContext";

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