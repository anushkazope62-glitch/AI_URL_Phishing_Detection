// Centralized dynamic API configuration supporting dynamic origins, environment variables, and local dev
export const API_BASE = (() => {
  if (import.meta.env?.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    // When developing on Vite dev server (port 5173/3000), route to local FastAPI on port 8000
    if (window.location.port === "5173" || window.location.port === "3000") {
      return "http://localhost:8000";
    }
    // When served from FastAPI / deployed on Render, use the active website origin dynamically
    return window.location.origin;
  }
  return "";
})();

export const getScreenshotUrl = (screenshotUrl) => {
  if (!screenshotUrl) return "";
  if (
    screenshotUrl.startsWith("http://") ||
    screenshotUrl.startsWith("https://") ||
    screenshotUrl.startsWith("data:")
  ) {
    return screenshotUrl;
  }
  const cleanPath = screenshotUrl.startsWith("/") ? screenshotUrl : `/${screenshotUrl}`;
  return `${API_BASE}${cleanPath}`;
};
