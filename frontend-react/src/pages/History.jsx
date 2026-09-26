import { useEffect, useState } from "react";
import {
  fetchUserScans,
  getLocalScans,
  deleteUserScanApi,
  clearUserScansApi,
} from "../utils/scanService";
import { useLanguage } from "../context/LanguageContext";

function History({ loggedInUser, onLoginPrompt }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loggedInUser) {
      setHistory([]);
      return;
    }

    const local = getLocalScans(loggedInUser.id);
    setHistory(local);

    setLoading(true);
    fetchUserScans(loggedInUser.id)
      .then((scans) => {
        setHistory(scans || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loggedInUser]);

  // Search button
  const handleSearch = () => {
    setSearchQuery(searchTerm.trim());
  };

  // Clear history
  const clearHistory = async () => {
    if (!loggedInUser) return;

    const confirmClear = window.confirm(
      "Are you sure you want to clear your private scan history?"
    );

    if (!confirmClear) return;

    await clearUserScansApi(loggedInUser.id);
    setHistory([]);
    setSearchTerm("");
    setSearchQuery("");
  };

  const deleteHistoryItem = async (scan) => {
    if (!loggedInUser) return;

    const updated = await deleteUserScanApi(
      loggedInUser.id,
      scan.id,
      scan.timestamp
    );
    setHistory(updated || []);
  };

  // Open URL in Scanner
  const openInScanner = (url) => {
    const userKey = loggedInUser?.id ? String(loggedInUser.id) : "guest";
    localStorage.setItem(`scannerURL_${userKey}`, url);

    window.history.pushState({}, "", "/scanner");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Filter history
  const filteredHistory = history.filter((scan) =>
    scan.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard">
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <h1>{t("history_title")}</h1>
          <p>
            {loggedInUser
              ? t("history_sub_user", {
                  name: loggedInUser.name,
                  email: loggedInUser.email,
                })
              : t("history_sub_guest")}
          </p>
        </div>

        {loggedInUser && history.length > 0 && (
          <button className="clear-history-button" onClick={clearHistory}>
            {t("clear_my_history")}
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      {loggedInUser && history.length > 0 && (
        <div className="history-search">
          <input
            type="text"
            placeholder={t("search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />

          <button className="search-button" onClick={handleSearch}>
            {t("search_btn")}
          </button>

          {searchQuery && (
            <button
              className="clear-search-button"
              onClick={() => {
                setSearchTerm("");
                setSearchQuery("");
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* HISTORY CARD */}
      <div className="recent-card">
        {loading ? (
          <div className="empty-state">
            <p>{t("loading_scans")}</p>
          </div>
        ) : !loggedInUser ? (
          <div className="empty-state">
            <div className="empty-icon">🔐</div>
            <h3>{t("no_history_title")}</h3>
            <p>{t("history_sub_guest")}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>{t("no_history_title")}</h3>
            <p>{t("no_history_desc")}</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔎</div>
            <h3>{t("no_match_title")}</h3>
            <p>{t("no_match_desc")}</p>
          </div>
        ) : (
          <div className="history-list">
            {filteredHistory.map((scan, index) => (
              <div
                className="history-item"
                key={scan.id ? `scan-${scan.id}` : `${scan.timestamp}-${index}`}
              >
                <div className="history-url">
                  <button
                    className="history-url-button"
                    onClick={() => openInScanner(scan.url)}
                    title="Open this URL in Scanner"
                  >
                    {scan.url}
                  </button>

                  <small>
                    {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : ""}
                  </small>
                </div>

                <div className="history-actions">
                  <div
                    className={
                      scan.prediction === "Phishing" ? "danger" : "safe"
                    }
                  >
                    {scan.prediction === "Phishing"
                      ? t("phishing_result")
                      : t("legitimate_result")}
                  </div>

                  <button
                    className="delete-history-button"
                    onClick={() => deleteHistoryItem(scan)}
                    title={t("delete_scan_title")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
