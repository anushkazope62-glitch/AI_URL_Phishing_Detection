import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

function Navbar({ onLoginClick, onLogout, loggedInUser, currentPath, onProfileClick }) {
  const { t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const goTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const isActive = (targetPath) => {
    if (loggedInUser) {
      if (targetPath === "/") {
        return currentPath === "/" || currentPath === "/dashboard" || !currentPath;
      }
      return currentPath === targetPath;
    } else {
      if (targetPath === "/url-scan") {
        return currentPath === "/url-scan" || currentPath === "/" || currentPath === "/scanner" || !currentPath;
      }
      return currentPath === targetPath;
    }
  };

  const avatarLetter = loggedInUser?.name
    ? loggedInUser.name.trim().charAt(0).toUpperCase()
    : "👤";

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <header className="navbar navbar-top-nav">
      <div className="navbar-left">
        <div
          className="navbar-logo"
          onClick={() => goTo(loggedInUser ? "/" : "/url-scan")}
          style={{ cursor: "pointer" }}
          title={t("url_security")}
        >
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">{t("url_security")}</span>
        </div>
      </div>

      <div className="navbar-center">
        <nav className="navbar-nav-links">
          {loggedInUser ? (
            /* AFTER LOGIN: Dashboard, URL Scan, URL Scanner, Resources, About */
            <>
              <button
                className={`nav-link-btn ${isActive("/") ? "active" : ""}`}
                onClick={() => goTo("/")}
              >
                <span>🏠</span>
                <span>{t("nav_dashboard")}</span>
              </button>

              <button
                className={`nav-link-btn ${isActive("/url-scan") ? "active" : ""}`}
                onClick={() => goTo("/url-scan")}
              >
                <span>🔍</span>
                <span>{t("nav_url_scan")}</span>
              </button>

              <button
                className={`nav-link-btn ${isActive("/scanner") ? "active" : ""}`}
                onClick={() => goTo("/scanner")}
              >
                <span>🛡️</span>
                <span>{t("nav_scanner")}</span>
              </button>

              <button
                className={`nav-link-btn ${isActive("/resources") ? "active" : ""}`}
                onClick={() => goTo("/resources")}
              >
                <span>📚</span>
                <span>{t("nav_resources")}</span>
              </button>

              <button
                className={`nav-link-btn ${isActive("/about") ? "active" : ""}`}
                onClick={() => goTo("/about")}
              >
                <span>ℹ️</span>
                <span>{t("nav_about")}</span>
              </button>
            </>
          ) : (
            /* BEFORE LOGIN: URL Scan, Resources, About */
            <>
              <button
                className={`nav-link-btn ${isActive("/url-scan") ? "active" : ""}`}
                onClick={() => goTo("/url-scan")}
              >
                <span>🔍</span>
                <span>{t("nav_url_scan")}</span>
              </button>

              <button
                className={`nav-link-btn ${isActive("/resources") ? "active" : ""}`}
                onClick={() => goTo("/resources")}
              >
                <span>📚</span>
                <span>{t("nav_resources")}</span>
              </button>

              <button
                className={`nav-link-btn ${isActive("/about") ? "active" : ""}`}
                onClick={() => goTo("/about")}
              >
                <span>ℹ️</span>
                <span>{t("nav_about")}</span>
              </button>
            </>
          )}
        </nav>
      </div>

      <div className="navbar-right">
        {!loggedInUser ? (
          <button
            className="nav-login-button"
            onClick={onLoginClick}
            title={t("sign_in_register")}
          >
            {t("sign_in_register")}
          </button>
        ) : (
          <div className="user-dropdown-container" ref={dropdownRef}>
            <button
              className={`user-profile-trigger ${isDropdownOpen ? "dropdown-active" : ""}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-label={loggedInUser.name}
              title={loggedInUser.name}
            >
              <div className="profile-avatar">{avatarLetter}</div>
              <div className="profile-info">
                <strong className="user-nav-name">{loggedInUser.name}</strong>
                <small className="user-nav-email">{loggedInUser.email}</small>
              </div>
              <span className={`dropdown-caret ${isDropdownOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>

            {isDropdownOpen && (
              <div className="user-nav-dropdown-menu" role="menu">
                <div className="dropdown-user-header">
                  <div className="dropdown-user-avatar">{avatarLetter}</div>
                  <div className="dropdown-user-info">
                    <strong>{loggedInUser.name}</strong>
                    <small>{loggedInUser.email}</small>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onProfileClick) onProfileClick();
                  }}
                >
                  <span className="dropdown-item-icon">👤</span>
                  <span className="dropdown-item-label">{t("menu_profile")}</span>
                </button>

                <button
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    goTo("/settings");
                  }}
                >
                  <span className="dropdown-item-icon">⚙️</span>
                  <span className="dropdown-item-label">{t("menu_settings")}</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item dropdown-logout-item"
                  role="menuitem"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onLogout();
                  }}
                >
                  <span className="dropdown-item-icon">🚪</span>
                  <span className="dropdown-item-label">{t("menu_logout")}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;