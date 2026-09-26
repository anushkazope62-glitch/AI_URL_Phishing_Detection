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
import { fetchUserScans, getLocalScans } from "../utils/scanService";
import { useLanguage } from "../context/LanguageContext";

function Analytics({ loggedInUser, onLoginPrompt }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
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

    // Current week's Monday
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

  const getScansForSelectedPoint = () => {
    if (!selectedPoint) {
      return [];
    }

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

      const selectedDate = new Date(monday);
      selectedDate.setDate(monday.getDate() + selectedPoint.dayIndex);

      return history.filter((scan) => {
        const scanDate = new Date(scan.timestamp);

        return (
          scanDate.getFullYear() === selectedDate.getFullYear() &&
          scanDate.getMonth() === selectedDate.getMonth() &&
          scanDate.getDate() === selectedDate.getDate()
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
  }

  // WEEK VIEW
  if (viewMode === "week") {
    const { monday } = getWeekRange(weekOffset);

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
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        date: date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }),
        dayIndex: i,
        scans: scansOnDay.length,
        threats: scansOnDay.filter((scan) => scan.prediction === "Phishing")
          .length,
        safe: scansOnDay.filter((scan) => scan.prediction === "Legitimate")
          .length,
      });
    }
  }

  // DAY VIEW
  if (viewMode === "day") {
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
        threats: scansOnHour.filter((scan) => scan.prediction === "Phishing")
          .length,
        safe: scansOnHour.filter((scan) => scan.prediction === "Legitimate")
          .length,
      });
    }
  }

  // MONTH VIEW
  if (viewMode === "month") {
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
        threats: scansOnMonth.filter((scan) => scan.prediction === "Phishing")
          .length,
        safe: scansOnMonth.filter((scan) => scan.prediction === "Legitimate")
          .length,
      });
    }
  }

  // YEAR VIEW
  if (viewMode === "year") {
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
        threats: scansOnYear.filter((scan) => scan.prediction === "Phishing")
          .length,
        safe: scansOnYear.filter((scan) => scan.prediction === "Legitimate")
          .length,
      });
    });
  }

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h1>{t("analytics_title")}</h1>
          <p>
            {loggedInUser
              ? t("analytics_sub_user", { name: loggedInUser.name })
              : t("analytics_sub_guest")}
          </p>
        </div>
      </div>

      {/* ANALYTICS TABS */}
      <div className="analytics-tabs">
        <button
          className={viewMode === "day" ? "active" : ""}
          onClick={() => setViewMode("day")}
        >
          {t("tab_day")}
        </button>

        <button
          className={viewMode === "week" ? "active" : ""}
          onClick={() => setViewMode("week")}
        >
          {t("tab_week")}
        </button>

        <button
          className={viewMode === "month" ? "active" : ""}
          onClick={() => setViewMode("month")}
        >
          {t("tab_month")}
        </button>

        <button
          className={viewMode === "year" ? "active" : ""}
          onClick={() => setViewMode("year")}
        >
          {t("tab_year")}
        </button>
      </div>

      {viewMode === "day" && (
        <div className="day-navigation">
          <button
            onClick={() => {
              const date = new Date(selectedDate + "T00:00:00");
              date.setDate(date.getDate() - 1);
              setSelectedDate(getLocalDateString(date));
              setDayOffset(dayOffset - 1);
            }}
          >
            {t("btn_yesterday")}
          </button>

          <button
            className={dayOffset === 0 ? "today-active" : ""}
            onClick={() => {
              setSelectedDate(getLocalDateString());
              setDayOffset(0);
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
              if (newDate === today) {
                setDayOffset(0);
              } else {
                setDayOffset(null);
              }
            }}
          />
        </div>
      )}

      {viewMode === "week" && (
        <div className="week-navigation">
          <button onClick={() => setWeekOffset(weekOffset - 1)}>
            {t("btn_prev_week")}
          </button>

          <button
            className={weekOffset === 0 ? "week-active" : ""}
            onClick={() => setWeekOffset(0)}
          >
            {t("btn_this_week")}
          </button>
        </div>
      )}

      {viewMode === "month" && (
        <div className="month-navigation">
          <button onClick={() => setMonthYearOffset(monthYearOffset - 1)}>
            {t("btn_prev_year")}
          </button>

          <button
            className={monthYearOffset === 0 ? "month-active" : ""}
            onClick={() => setMonthYearOffset(0)}
          >
            {t("btn_this_year")}
          </button>
        </div>
      )}

      {/* CHART */}
      <div className="recent-card">
        <h2>
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
              <div>{t("btn_this_week")}</div>
              <div className="week-date-range">{weekDateRange}</div>
            </div>
          )}

          {viewMode === "month" &&
            t("monthly_activity", {
              year: new Date().getFullYear() + monthYearOffset,
            })}
          {viewMode === "year" && t("yearly_activity")}
        </h2>

        <p>{t("chart_sub")}</p>

        <div
          style={{
            width: "100%",
            height: 350,
            marginTop: 25,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="label"
                height={60}
                padding={{ left: 10, right: 20 }}
                tick={
                  viewMode === "week"
                    ? ({ x, y, payload }) => {
                        const item = chartData[payload.index];
                        if (!item) return null;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={0}
                              dy={12}
                              textAnchor="middle"
                              fill="#374151"
                              fontSize={13}
                              fontWeight={600}
                            >
                              {item.label}
                            </text>
                            <text
                              x={0}
                              y={0}
                              dy={29}
                              textAnchor="middle"
                              fill="#6b7280"
                              fontSize={12}
                            >
                              {item.date}
                            </text>
                          </g>
                        );
                      }
                    : undefined
                }
              />

              <YAxis allowDecimals={false} />
              <Tooltip />

              <Line
                type="monotone"
                dataKey="scans"
                stroke="#2563eb"
                strokeWidth={3}
                name={t("total_scans")}
                dot={true}
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
                dot={true}
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
                dot={true}
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

        {selectedPoint && (
          <div className="selected-scan-list">
            <h3>
              {viewMode === "day" && `Scans at ${selectedPoint.label}`}
              {viewMode === "week" &&
                `Scans on ${selectedPoint.label} ${selectedPoint.date}`}
              {viewMode === "month" && `Scans in ${selectedPoint.label}`}
              {viewMode === "year" && `Scans in ${selectedPoint.label}`}
            </h3>

            {selectedScans.length === 0 ? (
              <p>{t("no_scans_in_period")}</p>
            ) : (
              selectedScans.map((scan, index) => (
                <div
                  className="scan-list-item"
                  key={scan.id ? `scan-${scan.id}` : `${scan.timestamp}-${index}`}
                >
                  <div>
                    <div className="scan-url">{scan.url}</div>
                    <div className="scan-time">
                      {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : ""}
                    </div>
                  </div>

                  <span
                    className={
                      scan.prediction === "Phishing"
                        ? "scan-status phishing"
                        : "scan-status safe"
                    }
                  >
                    {scan.prediction === "Phishing" ? t("phishing_result") : t("legitimate_result")}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;