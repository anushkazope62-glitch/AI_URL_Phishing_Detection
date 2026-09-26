import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchUserScans,
  getLocalScans,
  deleteUserScanApi,
  clearUserScansApi,
} from "../utils/scanService";
import { useLanguage } from "../context/LanguageContext";

function Dashboard({ loggedInUser, onLoginPrompt }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state for History
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "Legitimate" | "Phishing"
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"
  const [copiedUrl, setCopiedUrl] = useState(null);

  // Analytics View State
  const [viewMode, setViewMode] = useState("day");

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthYearOffset, setMonthYearOffset] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);

  const getWeekRange = (offset = 0) => {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  };

  useEffect(() => {
    if (!loggedInUser) {
      setHistory([]);
      return;
    }

    // Load user's cached scans immediately
    const local = getLocalScans(loggedInUser.id);
    setHistory(local);

    // Fetch fresh scans from backend database
    setLoading(true);
    fetchUserScans(loggedInUser.id)
      .then((scans) => {
        setHistory(scans || []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loggedInUser]);

  // Overall counts
  const totalScans = history.length;
  const safeURLs = history.filter((item) => item.prediction === "Legitimate").length;
  const threats = history.filter((item) => item.prediction === "Phishing").length;
  const safePercentage = totalScans > 0 ? Math.round((safeURLs / totalScans) * 100) : 100;
  const detectionRate = totalScans > 0 ? ((threats / totalScans) * 100).toFixed(1) : "0.0";

  // Navigation helpers
  const goTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const jumpToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // History operations
  const handleSearch = () => {
    setSearchQuery(searchTerm.trim());
  };

  const clearHistory = async () => {
    if (!loggedInUser) return;
    const confirmClear = window.confirm(
      t("history_clear_confirm") || "Are you sure you want to permanently clear your private scan audit records?"
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

  const openInScanner = (url) => {
    const userKey = loggedInUser?.id ? String(loggedInUser.id) : "guest";
    localStorage.setItem(`scannerURL_${userKey}`, url);
    goTo("/scanner");
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const exportHistoryCSV = () => {
    if (!history || history.length === 0) return;
    const headers = ["ID", "URL", "Prediction", "Timestamp"];
    const rows = history.map((scan, idx) => [
      scan.id || idx + 1,
      `"${(scan.url || "").replace(/"/g, '""')}"`,
      `"${scan.prediction || "Unknown"}"`,
      `"${scan.timestamp ? new Date(scan.timestamp).toISOString() : ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `url_scan_history_${loggedInUser?.name || "user"}_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const scanDate = new Date(timestamp);
      const now = new Date();
      const diffMs = now - scanDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return t("time_just_now") || "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return `Yesterday at ${scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return scanDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  };

  const filteredHistory = history
    .filter((scan) => {
      const matchesSearch = scan.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ? true : scan.prediction === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  // Analytics data calculation
  const getScansForSelectedPoint = () => {
    if (!selectedPoint) return [];

    if (viewMode === "day") {
      const selected = new Date(selectedDate + "T00:00:00");
      const hour = selectedPoint.hour;

      return history.filter((scan) => {
        const scanDate = new Date(scan.timestamp);
        return (
          scanDate.getFullYear() === selected.getFullYear() &&
          scanDate.getMonth() === selected.getMonth() &&
          scanDate.getDate() === selected.getDate() &&
          scanDate.getHours() === hour
        );
      });
    }

    if (viewMode === "week") {
      const { monday } = getWeekRange(weekOffset);
      const selDate = new Date(monday);
      selDate.setDate(monday.getDate() + selectedPoint.dayIndex);

      return history.filter((scan) => {
        const scanDate = new Date(scan.timestamp);
        return (
          scanDate.getFullYear() === selDate.getFullYear() &&
          scanDate.getMonth() === selDate.getMonth() &&
          scanDate.getDate() === selDate.getDate()
        );
      });
    }

    if (viewMode === "month") {
      const currentYear = new Date().getFullYear() + monthYearOffset;
      return history.filter((scan) => {
        const scanDate = new Date(scan.timestamp);
        return (
          scanDate.getFullYear() === currentYear &&
          scanDate.getMonth() === selectedPoint.monthIndex
        );
      });
    }

    if (viewMode === "year") {
      const selectedYear = Number(selectedPoint.label);
      return history.filter((scan) => {
        return new Date(scan.timestamp).getFullYear() === selectedYear;
      });
    }

    return [];
  };

  const selectedScans = getScansForSelectedPoint().filter((scan) => {
    if (selectedMetric === "threats") {
      return scan.prediction === "Phishing";
    }
    if (selectedMetric === "safe") {
      return scan.prediction === "Legitimate";
    }
    return true;
  });

  const chartData = [];
  let weekDateRange = "";

  if (viewMode === "week") {
    const { monday, sunday } = getWeekRange(weekOffset);
    const mondayText = monday.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
    const sundayText = sunday.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    weekDateRange = `${mondayText} – ${sundayText}`;

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const scansOnDay = history.filter((scan) => {
        const scanDate = new Date(scan.timestamp);
        return (
          scanDate.getFullYear() === date.getFullYear() &&
          scanDate.getMonth() === date.getMonth() &&
          scanDate.getDate() === date.getDate()
        );
      });

      chartData.push({
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        dayIndex: i,
        scans: scansOnDay.length,
        threats: scansOnDay.filter((scan) => scan.prediction === "Phishing").length,
        safe: scansOnDay.filter((scan) => scan.prediction === "Legitimate").length,
      });
    }
  } else if (viewMode === "day") {
    const selected = new Date(selectedDate + "T00:00:00");

    for (let hour = 0; hour < 24; hour++) {
      const scansOnHour = history.filter((scan) => {
        const scanDate = new Date(scan.timestamp);
        return (
          scanDate.getFullYear() === selected.getFullYear() &&
          scanDate.getMonth() === selected.getMonth() &&
          scanDate.getDate() === selected.getDate() &&
          scanDate.getHours() === hour
        );
      });

      chartData.push({
        label: `${hour}:00`,
        hour: hour,
        scans: scansOnHour.length,
        threats: scansOnHour.filter((scan) => scan.prediction === "Phishing").length,
        safe: scansOnHour.filter((scan) => scan.prediction === "Legitimate").length,
      });
    }
  } else if (viewMode === "month") {
    const currentYear = new Date().getFullYear() + monthYearOffset;

    for (let month = 0; month < 12; month++) {
      const scansOnMonth = history.filter((scan) => {
        const scanDate = new Date(scan.timestamp);
        return (
          scanDate.getFullYear() === currentYear &&
          scanDate.getMonth() === month
        );
      });

      chartData.push({
        label: new Date(currentYear, month, 1).toLocaleDateString("en-US", {
          month: "short",
        }),
        monthIndex: month,
        scans: scansOnMonth.length,
        threats: scansOnMonth.filter((scan) => scan.prediction === "Phishing").length,
        safe: scansOnMonth.filter((scan) => scan.prediction === "Legitimate").length,
      });
    }
  } else if (viewMode === "year") {
    const years = [];
    history.forEach((scan) => {
      const year = new Date(scan.timestamp).getFullYear();
      if (!isNaN(year) && !years.includes(year)) {
        years.push(year);
      }
    });

    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.push(currentYear);
    }
    years.sort();

    years.forEach((year) => {
      const scansOnYear = history.filter((scan) => {
        return new Date(scan.timestamp).getFullYear() === year;
      });

      chartData.push({
        label: year.toString(),
        scans: scansOnYear.length,
        threats: scansOnYear.filter((scan) => scan.prediction === "Phishing").length,
        safe: scansOnYear.filter((scan) => scan.prediction === "Legitimate").length,
      });
    });
  }

  // Calculate live period summary metrics
  const periodScansTotal = chartData.reduce((acc, curr) => acc + curr.scans, 0);
  const periodThreatsTotal = chartData.reduce((acc, curr) => acc + curr.threats, 0);
  const periodSafeTotal = chartData.reduce((acc, curr) => acc + curr.safe, 0);
  const periodSafeRatio = periodScansTotal > 0 ? Math.round((periodSafeTotal / periodScansTotal) * 100) : 100;
  const peakPoint = chartData.reduce((max, curr) => (curr.scans > (max?.scans || 0) ? curr : max), chartData[0] || null);

  return (
    <div className="dashboard-page modern-dashboard">
      {/* 1. TOP HERO HEADER BANNER */}
      <div className="dashboard-hero-header">
        <div className="hero-header-content">
          <div className="hero-badge-pill">
            <span className="live-pulse-dot"></span>
            <span>AI Threat Detection Engine v2.4 Active</span>
          </div>
          <h1>{t("app_title")}</h1>
          <p>{t("app_subtitle")}</p>
        </div>

        <div className="hero-header-meta">
          <div className="hero-meta-stat">
            <span className="meta-label">Total Analyzed</span>
            <span className="meta-val">{totalScans} URLs</span>
          </div>
          <div className="hero-meta-stat">
            <span className="meta-label">System Health</span>
            <span className="meta-val safe-green">100% Protected</span>
          </div>
        </div>
      </div>

      {/* 2. DASHBOARD QUICK MODULE JUMP NAVIGATOR */}
      <div className="dashboard-module-navigator">
        <span className="navigator-label">⚡ Jump to Section:</span>
        <div className="navigator-buttons">
          <button onClick={() => jumpToSection("overview-section")} className="nav-jump-btn">
            <span>🛡️</span>
            <span>{t("jump_overview") || "Overview"}</span>
          </button>
          <button onClick={() => jumpToSection("analytics-section")} className="nav-jump-btn highlight-analytics">
            <span>📊</span>
            <span>{t("jump_analytics") || "Analysis"}</span>
            <span className="nav-pill-count">{periodScansTotal} in view</span>
          </button>
          <button onClick={() => jumpToSection("actions-section")} className="nav-jump-btn">
            <span>⚡</span>
            <span>{t("jump_quick_actions") || "Quick Tools"}</span>
          </button>
          <button onClick={() => jumpToSection("history-section")} className="nav-jump-btn highlight-history">
            <span>🕘</span>
            <span>{t("jump_history") || "History Log"}</span>
            <span className="nav-pill-count">{history.length}</span>
          </button>
        </div>
      </div>

      {/* 3. STAT CARDS */}
      <div className="stats-grid modern-stats-grid" id="overview-section">
        <div className="stat-card stat-total">
          <div className="stat-icon-wrapper total-icon">
            <span className="stat-icon">🔍</span>
          </div>
          <div className="stat-content">
            <div className="stat-label-row">
              <p>{t("total_scans")}</p>
              <span className="stat-tag total-tag">All Activity</span>
            </div>
            <h2>{totalScans}</h2>
            <small className="stat-subtext">Verified links</small>
          </div>
        </div>

        <div className="stat-card stat-safe">
          <div className="stat-icon-wrapper safe-icon">
            <span className="stat-icon">🛡️</span>
          </div>
          <div className="stat-content">
            <div className="stat-label-row">
              <p>{t("safe_urls")}</p>
              <span className="stat-tag safe-tag">Verified Safe</span>
            </div>
            <h2>{safeURLs}</h2>
            <small className="stat-subtext">{safePercentage}% Clean Ratio</small>
          </div>
        </div>

        <div className="stat-card stat-threat">
          <div className="stat-icon-wrapper threat-icon">
            <span className="stat-icon">⚠️</span>
          </div>
          <div className="stat-content">
            <div className="stat-label-row">
              <p>{t("threats_detected")}</p>
              <span className="stat-tag threat-tag">Intercepted</span>
            </div>
            <h2>{threats}</h2>
            <small className="stat-subtext">Zero-Day Attacks</small>
          </div>
        </div>

        <div className="stat-card stat-rate">
          <div className="stat-icon-wrapper rate-icon">
            <span className="stat-icon">📊</span>
          </div>
          <div className="stat-content">
            <div className="stat-label-row">
              <p>{t("threat_detection")}</p>
              <span className="stat-tag rate-tag">Threat Rate</span>
            </div>
            <h2>{detectionRate}%</h2>
            <small className="stat-subtext">Attack Frequency</small>
          </div>
        </div>
      </div>

      {/* 4. SECURITY OVERVIEW */}
      <div className="security-overview modern-overview-card">
        <div className="overview-header-row">
          <div className="overview-title-group">
            <div className="section-title-icon">🛡️</div>
            <div>
              <h2>{t("security_overview")}</h2>
              <p>{t("security_overview_sub")}</p>
            </div>
          </div>
          <div className="posture-badge">
            <span>🟢</span>
            <span>Security Posture: Optimal</span>
          </div>
        </div>

        <div className="overview-content">
          <div
            className="security-circle modern-circle"
            style={{
              "--safe-percent": totalScans > 0 ? (safeURLs / totalScans) * 100 : 100,
            }}
          >
            <div className="circle-inner-text">
              <strong>
                {totalScans > 0 ? Math.round((safeURLs / totalScans) * 100) : 100}%
              </strong>
              <span>{t("safe_label")}</span>
            </div>
          </div>

          <div className="security-details modern-details-grid">
            <div className="security-detail-card safe-detail-card">
              <div className="detail-card-top">
                <span className="detail-dot safe-dot"></span>
                <strong>{t("safe_urls")}</strong>
              </div>
              <div className="detail-card-val">{safeURLs}</div>
              <small>{t("scanned_urls_count")}</small>
              <div className="detail-progress-bar">
                <div
                  className="progress-fill safe-fill"
                  style={{ width: `${totalScans > 0 ? (safeURLs / totalScans) * 100 : 100}%` }}
                ></div>
              </div>
            </div>

            <div className="security-detail-card threat-detail-card">
              <div className="detail-card-top">
                <span className="detail-dot threat-dot"></span>
                <strong>{t("threats_detected")}</strong>
              </div>
              <div className="detail-card-val">{threats}</div>
              <small>{t("phishing_urls_count")}</small>
              <div className="detail-progress-bar">
                <div
                  className="progress-fill threat-fill"
                  style={{ width: `${totalScans > 0 ? (threats / totalScans) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="security-detail-card scan-detail-card">
              <div className="detail-card-top">
                <span className="detail-dot scan-dot"></span>
                <strong>{t("total_scans")}</strong>
              </div>
              <div className="detail-card-val">{totalScans}</div>
              <small>{t("security_checks_count")}</small>
              <div className="detail-progress-bar">
                <div className="progress-fill total-fill" style={{ width: "100%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. CENTER WELCOME SECTION */}
      <div className="dashboard-welcome modern-welcome-banner">
        <div className="welcome-center-body">
          <div className="welcome-center-icon glowing-icon">
            🛡️
          </div>
          <div>
            <h2>
              {loggedInUser
                ? t("dash_welcome_user", { name: loggedInUser.name })
                : t("dash_welcome_guest")}
            </h2>
            <p>
              {loggedInUser
                ? t("dash_subtitle_user")
                : t("dash_subtitle_guest")}
            </p>
          </div>
        </div>

        <button
          className="dashboard-scan-button modern-scan-btn"
          onClick={() => goTo("/scanner")}
        >
          <span>🔍</span>
          <span>{t("scan_a_url_btn")}</span>
        </button>
      </div>

      {/* =========================================================================
          6. INTEGRATED MODULE: ANALYSIS & THREAT TRENDS
          ========================================================================= */}
      <div className="dashboard-section-panel dashboard-analytics-section" id="analytics-section">
        {/* Module Header Bar */}
        <div className="module-banner-row">
          <div className="module-badge-tag analytics-badge-tag">
            <span className="badge-pulse-dot"></span>
            <span>{t("module_analytics_badge") || "📊 DASHBOARD MODULE: AI THREAT ANALYSIS"}</span>
          </div>
          <span className="module-timeframe-tag">
            {viewMode === "day" && "🕒 Real-time Hourly Resolution"}
            {viewMode === "week" && "📅 7-Day Window"}
            {viewMode === "month" && "🗓️ 12-Month Annual Timeline"}
            {viewMode === "year" && "📆 Multi-Year Aggregate"}
          </span>
        </div>

        <div className="section-title-wrapper module-title-wrapper">
          <div className="section-title-icon analytics-icon">📊</div>
          <div>
            <h2>{t("analytics_title")}</h2>
            <p>{t("chart_sub")}</p>
          </div>
        </div>

        {/* Period KPI Summary Mini-Cards */}
        <div className="analytics-kpi-grid">
          <div className="kpi-mini-card kpi-scans">
            <div className="kpi-icon-pill">📈</div>
            <div className="kpi-content">
              <span className="kpi-label">{t("analytics_period_scans") || "Period Scans"}</span>
              <strong className="kpi-val">{periodScansTotal}</strong>
              <small className="kpi-sub">in selected view</small>
            </div>
          </div>

          <div className="kpi-mini-card kpi-threats">
            <div className="kpi-icon-pill">⚠️</div>
            <div className="kpi-content">
              <span className="kpi-label">{t("analytics_period_threats") || "Threats Intercepted"}</span>
              <strong className="kpi-val threat-color">{periodThreatsTotal}</strong>
              <small className="kpi-sub">zero-day attacks</small>
            </div>
          </div>

          <div className="kpi-mini-card kpi-ratio">
            <div className="kpi-icon-pill">🛡️</div>
            <div className="kpi-content">
              <span className="kpi-label">{t("analytics_period_safe_ratio") || "Period Clean Ratio"}</span>
              <strong className="kpi-val safe-color">{periodSafeRatio}%</strong>
              <small className="kpi-sub">safe links</small>
            </div>
          </div>

          <div className="kpi-mini-card kpi-peak">
            <div className="kpi-icon-pill">⚡</div>
            <div className="kpi-content">
              <span className="kpi-label">Peak Scan Period</span>
              <strong className="kpi-val peak-color">
                {peakPoint && peakPoint.scans > 0 ? peakPoint.label : "None"}
              </strong>
              <small className="kpi-sub">
                {peakPoint && peakPoint.scans > 0 ? `${peakPoint.scans} scans` : "No activity"}
              </small>
            </div>
          </div>
        </div>

        {/* Analytics Tabs & Controls Toolbar */}
        <div className="analytics-toolbar">
          <div className="analytics-tabs modern-segmented-tabs">
            <button
              className={viewMode === "day" ? "active" : ""}
              onClick={() => {
                setViewMode("day");
                setSelectedPoint(null);
              }}
            >
              {t("tab_day")}
            </button>

            <button
              className={viewMode === "week" ? "active" : ""}
              onClick={() => {
                setViewMode("week");
                setSelectedPoint(null);
              }}
            >
              {t("tab_week")}
            </button>

            <button
              className={viewMode === "month" ? "active" : ""}
              onClick={() => {
                setViewMode("month");
                setSelectedPoint(null);
              }}
            >
              {t("tab_month")}
            </button>

            <button
              className={viewMode === "year" ? "active" : ""}
              onClick={() => {
                setViewMode("year");
                setSelectedPoint(null);
              }}
            >
              {t("tab_year")}
            </button>
          </div>

          {/* Date Controls */}
          {viewMode === "day" && (
            <div className="day-navigation modern-nav-pills">
              <button
                onClick={() => {
                  const date = new Date(selectedDate + "T00:00:00");
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(getLocalDateString(date));
                  setDayOffset(dayOffset - 1);
                  setSelectedPoint(null);
                }}
              >
                {t("btn_yesterday")}
              </button>

              <button
                className={dayOffset === 0 ? "today-active" : ""}
                onClick={() => {
                  setSelectedDate(getLocalDateString());
                  setDayOffset(0);
                  setSelectedPoint(null);
                }}
              >
                {t("btn_today")}
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  const today = getLocalDateString();
                  setDayOffset(newDate === today ? 0 : null);
                  setSelectedPoint(null);
                }}
              />
            </div>
          )}

          {viewMode === "week" && (
            <div className="week-navigation modern-nav-pills">
              <button
                onClick={() => {
                  setWeekOffset(weekOffset - 1);
                  setSelectedPoint(null);
                }}
              >
                {t("btn_prev_week")}
              </button>

              <button
                className={weekOffset === 0 ? "week-active" : ""}
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedPoint(null);
                }}
              >
                {t("btn_this_week")}
              </button>
            </div>
          )}

          {viewMode === "month" && (
            <div className="month-navigation modern-nav-pills">
              <button
                onClick={() => {
                  setMonthYearOffset(monthYearOffset - 1);
                  setSelectedPoint(null);
                }}
              >
                {t("btn_prev_year")}
              </button>

              <button
                className={monthYearOffset === 0 ? "month-active" : ""}
                onClick={() => {
                  setMonthYearOffset(0);
                  setSelectedPoint(null);
                }}
              >
                {t("btn_this_year")}
              </button>
            </div>
          )}
        </div>

        {/* Analytics Chart Card */}
        <div className="analytics-chart-container modern-chart-card">
          <div className="chart-header-row">
            <div className="chart-header-info">
              <h3>
                {viewMode === "day" &&
                  (dayOffset === 0
                    ? t("btn_today")
                    : dayOffset === -1
                    ? t("btn_yesterday")
                    : new Date(selectedDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      ))}

                {viewMode === "week" && (
                  <div>
                    <span>{t("btn_this_week")} </span>
                    <span className="week-date-range">({weekDateRange})</span>
                  </div>
                )}

                {viewMode === "month" &&
                  t("monthly_activity", {
                    year: new Date().getFullYear() + monthYearOffset,
                  })}
                {viewMode === "year" && t("yearly_activity")}
              </h3>
            </div>

            <div className="chart-legend-pills">
              <span className="legend-pill total-pill">● {t("total_scans")}</span>
              <span className="legend-pill safe-pill">● {t("safe_urls")}</span>
              <span className="legend-pill threat-pill">● {t("threats_detected")}</span>
            </div>
          </div>

          <p className="chart-instruction-hint">
            💡 {t("analytics_inspect_hint") || "Click any data point on the chart to inspect scanned URLs for that period."}
          </p>

          <div style={{ width: "100%", height: 320, marginTop: 15 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  height={50}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="scans"
                  stroke="#2563eb"
                  strokeWidth={3}
                  name={t("total_scans")}
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 2 }}
                  activeDot={{
                    r: 8,
                    onClick: (event, payload) => {
                      setSelectedMetric("scans");
                      setSelectedPoint(payload.payload);
                    },
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="threats"
                  stroke="#dc2626"
                  strokeWidth={3}
                  name={t("threats_detected")}
                  dot={{ r: 4, fill: "#dc2626", strokeWidth: 2 }}
                  activeDot={{
                    r: 8,
                    onClick: (event, payload) => {
                      setSelectedMetric("threats");
                      setSelectedPoint(payload.payload);
                    },
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="safe"
                  stroke="#16a34a"
                  strokeWidth={3}
                  name={t("safe_urls")}
                  dot={{ r: 4, fill: "#16a34a", strokeWidth: 2 }}
                  activeDot={{
                    r: 8,
                    onClick: (event, payload) => {
                      setSelectedMetric("safe");
                      setSelectedPoint(payload.payload);
                    },
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Drilldown on selected point */}
          {selectedPoint && (
            <div className="selected-scan-list modern-drilldown-box">
              <div className="drilldown-header">
                <div>
                  <h4>
                    🔍 {viewMode === "day" && `Scans at ${selectedPoint.label}`}
                    {viewMode === "week" &&
                      `Scans on ${selectedPoint.label} ${selectedPoint.date}`}
                    {viewMode === "month" && `Scans in ${selectedPoint.label}`}
                    {viewMode === "year" && `Scans in ${selectedPoint.label}`}
                  </h4>
                  <small className="drilldown-sub">
                    {selectedScans.length} {selectedScans.length === 1 ? "record found" : "records found"}
                  </small>
                </div>
                <button
                  className="drilldown-close"
                  onClick={() => setSelectedPoint(null)}
                >
                  ✕ Close Inspector
                </button>
              </div>

              {selectedScans.length === 0 ? (
                <p className="no-scans-text">{t("no_scans_in_period")}</p>
              ) : (
                <div className="drilldown-cards-list">
                  {selectedScans.map((scan, index) => (
                    <div
                      className="drilldown-item-card"
                      key={scan.id ? `drill-${scan.id}` : `${scan.timestamp}-${index}`}
                    >
                      <div className="drilldown-item-left">
                        <span className={`status-pill-indicator ${scan.prediction === "Phishing" ? "threat-pill" : "safe-pill"}`}>
                          {scan.prediction === "Phishing" ? "⚠️ Threat" : "🛡️ Clean"}
                        </span>
                        <div className="drilldown-url-info">
                          <strong
                            className="drilldown-url-link"
                            onClick={() => openInScanner(scan.url)}
                            title="Open URL in Scanner"
                          >
                            {scan.url}
                          </strong>
                          <span className="drilldown-timestamp">
                            {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : ""}
                          </span>
                        </div>
                      </div>

                      <div className="drilldown-item-actions">
                        <button
                          className="drilldown-action-btn copy-btn"
                          onClick={() => handleCopyUrl(scan.url)}
                          title="Copy URL"
                        >
                          {copiedUrl === scan.url ? "✓ Copied" : "📋 Copy"}
                        </button>
                        <button
                          className="drilldown-action-btn scan-btn"
                          onClick={() => openInScanner(scan.url)}
                          title="Inspect URL in Scanner"
                        >
                          🔍 Inspect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 7. QUICK ACTIONS GRID */}
      <div className="quick-actions modern-quick-actions" id="actions-section">
        <div className="quick-actions-header">
          <div className="section-title-wrapper">
            <div className="section-title-icon actions-icon">⚡</div>
            <div>
              <h2>{t("quick_actions")}</h2>
              <p>{t("quick_actions_sub")}</p>
            </div>
          </div>
        </div>

        <div className="quick-actions-grid four-col-actions">
          <button
            className="quick-action-card action-card-scan"
            onClick={() => goTo("/scanner")}
          >
            <div className="quick-action-icon">🔍</div>
            <div className="quick-action-text">
              <strong>{t("action_scan_url")}</strong>
              <span>{t("action_scan_url_sub")}</span>
            </div>
            <b className="action-arrow">→</b>
          </button>

          <button
            className="quick-action-card action-card-res"
            onClick={() => goTo("/resources")}
          >
            <div className="quick-action-icon">📚</div>
            <div className="quick-action-text">
              <strong>{t("action_resources")}</strong>
              <span>{t("action_resources_sub")}</span>
            </div>
            <b className="action-arrow">→</b>
          </button>

          <button
            className="quick-action-card action-card-hist"
            onClick={() => jumpToSection("history-section")}
          >
            <div className="quick-action-icon">🕘</div>
            <div className="quick-action-text">
              <strong>{t("action_scan_history")}</strong>
              <span>{t("action_scan_history_sub")}</span>
            </div>
            <b className="action-arrow">↓</b>
          </button>

          <button
            className="quick-action-card action-card-set"
            onClick={() => goTo("/settings")}
          >
            <div className="quick-action-icon">⚙️</div>
            <div className="quick-action-text">
              <strong>{t("action_settings")}</strong>
              <span>{t("action_settings_sub")}</span>
            </div>
            <b className="action-arrow">→</b>
          </button>
        </div>
      </div>

      {/* =========================================================================
          8. INTEGRATED MODULE: SCAN HISTORY & AUDIT TRAIL
          ========================================================================= */}
      <div className="dashboard-section-panel dashboard-history-section" id="history-section">
        {/* Module Header Bar */}
        <div className="module-banner-row">
          <div className="module-badge-tag history-badge-tag">
            <span className="badge-pulse-dot"></span>
            <span>{t("module_history_badge") || "🕘 DASHBOARD MODULE: SCAN AUDIT LOG"}</span>
          </div>
          <span className="module-timeframe-tag">
            🔒 Private Encrypted Logs
          </span>
        </div>

        <div className="history-section-header">
          <div className="section-title-wrapper module-title-wrapper">
            <div className="section-title-icon history-icon">🕘</div>
            <div>
              <h2>{t("history_title")}</h2>
              <p>
                {loggedInUser
                  ? t("history_sub_user", {
                      name: loggedInUser.name,
                      email: loggedInUser.email,
                    })
                  : t("history_sub_guest")}
              </p>
            </div>
          </div>

          {loggedInUser && history.length > 0 && (
            <div className="history-header-actions">
              <button
                className="export-history-btn"
                onClick={exportHistoryCSV}
                title="Download your full scan log as CSV"
              >
                {t("export_csv_btn") || "📥 Export CSV"}
              </button>
              <button className="clear-history-button" onClick={clearHistory}>
                {t("clear_my_history")}
              </button>
            </div>
          )}
        </div>

        {/* History Search & Filter Control Strip */}
        {loggedInUser && history.length > 0 && (
          <div className="history-controls-toolbar">
            {/* Search Box */}
            <div className="history-search modern-search-box">
              <span className="search-lens">🔍</span>
              <input
                type="text"
                placeholder={t("search_placeholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchQuery(e.target.value.trim());
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />

              {searchTerm && (
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

            {/* Filter Tabs */}
            <div className="history-filter-chips">
              <button
                className={`filter-chip ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                <span>🌐 {t("filter_all") || "All Scans"}</span>
                <span className="chip-count">{history.length}</span>
              </button>

              <button
                className={`filter-chip chip-safe ${statusFilter === "Legitimate" ? "active" : ""}`}
                onClick={() => setStatusFilter("Legitimate")}
              >
                <span>🛡️ {t("filter_legitimate") || "Legitimate"}</span>
                <span className="chip-count">{safeURLs}</span>
              </button>

              <button
                className={`filter-chip chip-threat ${statusFilter === "Phishing" ? "active" : ""}`}
                onClick={() => setStatusFilter("Phishing")}
              >
                <span>⚠️ {t("filter_phishing") || "Phishing Threats"}</span>
                <span className="chip-count">{threats}</span>
              </button>
            </div>

            {/* Sort & Counter */}
            <div className="history-sort-group">
              <select
                className="history-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">{t("sort_newest") || "Newest First"}</option>
                <option value="oldest">{t("sort_oldest") || "Oldest First"}</option>
              </select>
              <span className="history-record-counter">
                {filteredHistory.length} of {history.length}
              </span>
            </div>
          </div>
        )}

        {/* History Cards List */}
        <div className="recent-card modern-history-container">
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
              <button className="primary-action-btn" onClick={() => goTo("/scanner")}>
                🔍 Start First Scan
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔎</div>
              <h3>{t("no_match_title")}</h3>
              <p>{t("no_match_desc")}</p>
              <button
                className="secondary-action-btn"
                onClick={() => {
                  setSearchTerm("");
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="history-list modern-history-table">
              {filteredHistory.map((scan, index) => (
                <div
                  className={`history-item modern-history-row ${
                    scan.prediction === "Phishing" ? "row-threat" : "row-safe"
                  }`}
                  key={scan.id ? `scan-${scan.id}` : `${scan.timestamp}-${index}`}
                >
                  <div className="history-row-left">
                    <div className={`history-verdict-shield ${scan.prediction === "Phishing" ? "threat-shield" : "safe-shield"}`}>
                      {scan.prediction === "Phishing" ? "⚠️" : "🛡️"}
                    </div>

                    <div className="history-meta-content">
                      <div className="history-url-line">
                        <button
                          className="history-url-button"
                          onClick={() => openInScanner(scan.url)}
                          title="Open this URL in Scanner"
                        >
                          {scan.url}
                        </button>
                      </div>

                      <div className="history-sub-meta">
                        <span className="history-relative-time">
                          🕒 {formatRelativeTime(scan.timestamp)}
                        </span>
                        <span className="history-meta-divider">•</span>
                        <span className="history-full-date">
                          {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="history-row-right">
                    <div
                      className={`history-status-badge ${
                        scan.prediction === "Phishing" ? "danger" : "safe"
                      }`}
                    >
                      {scan.prediction === "Phishing"
                        ? t("phishing_result")
                        : t("legitimate_result")}
                    </div>

                    <div className="history-action-buttons">
                      <button
                        className="row-action-btn copy-btn"
                        onClick={() => handleCopyUrl(scan.url)}
                        title="Copy URL"
                      >
                        {copiedUrl === scan.url ? "✓ Copied" : "📋 Copy"}
                      </button>

                      <button
                        className="row-action-btn inspect-btn"
                        onClick={() => openInScanner(scan.url)}
                        title="Inspect in URL Scanner"
                      >
                        🔍 Re-Scan
                      </button>

                      <button
                        className="delete-history-button"
                        onClick={() => deleteHistoryItem(scan)}
                        title={t("delete_scan_title")}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
