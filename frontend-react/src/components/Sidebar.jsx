import { useLanguage } from "../context/LanguageContext";

function Sidebar({ currentPath, loggedInUser }) {
  const { t } = useLanguage();

  const goTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const isActive = (targetPath) => {
    if (targetPath === "/" && (currentPath === "/" || currentPath === "/dashboard" || !currentPath)) return true;
    return currentPath === targetPath;
  };

  return (
    <aside className="sidebar">
      <div
        className="logo"
        onClick={() => goTo(loggedInUser ? "/" : "/url-scan")}
        style={{ cursor: "pointer" }}
      >
        🛡️
        <span>{t("url_security")}</span>
      </div>

      <nav className="sidebar-menu">
        <button
          className={`menu-item ${isActive("/") ? "active" : ""}`}
          onClick={() => goTo("/")}
        >
          🏠
          <span>{t("nav_dashboard")}</span>
        </button>

        <button
          className={`menu-item ${isActive("/url-scan") ? "active" : ""}`}
          onClick={() => goTo("/url-scan")}
        >
          🔍
          <span>{t("nav_url_scan")}</span>
        </button>

        <button
          className={`menu-item ${isActive("/scanner") ? "active" : ""}`}
          onClick={() => goTo("/scanner")}
        >
          🛡️
          <span>{t("nav_scanner")}</span>
        </button>

        <button
          className={`menu-item ${isActive("/resources") ? "active" : ""}`}
          onClick={() => goTo("/resources")}
        >
          📚
          <span>{t("nav_resources")}</span>
        </button>

        <button
          className={`menu-item ${isActive("/about") ? "active" : ""}`}
          onClick={() => goTo("/about")}
        >
          ℹ️
          <span>{t("nav_about")}</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;