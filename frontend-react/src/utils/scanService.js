import { API_BASE } from "./config";

export const getLocalScans = (userId) => {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`urlScanHistory_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading local scans", e);
    return [];
  }
};

export const setLocalScans = (userId, scans) => {
  if (!userId) return;
  try {
    localStorage.setItem(`urlScanHistory_${userId}`, JSON.stringify(scans));
  } catch (e) {
    console.error("Error saving local scans", e);
  }
};

export const fetchUserScans = async (userId) => {
  if (!userId) return [];
  try {
    const response = await fetch(`${API_BASE}/api/scans?user_id=${userId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.scans)) {
        setLocalScans(userId, data.scans);
        return data.scans;
      }
    }
  } catch (err) {
    console.warn("Backend scans fetch failed, falling back to local storage", err);
  }
  return getLocalScans(userId);
};

export const deleteUserScanApi = async (userId, scanId, timestamp) => {
  if (!userId) return;
  const current = getLocalScans(userId);
  const updated = current.filter((item) => {
    if (scanId && item.id) return item.id !== scanId;
    return item.timestamp !== timestamp;
  });
  setLocalScans(userId, updated);

  if (scanId) {
    try {
      await fetch(`${API_BASE}/api/scans/${scanId}?user_id=${userId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete scan on server", err);
    }
  }
  return updated;
};

export const clearUserScansApi = async (userId) => {
  if (!userId) return;
  try {
    localStorage.removeItem(`urlScanHistory_${userId}`);
    await fetch(`${API_BASE}/api/scans?user_id=${userId}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to clear scans on server", err);
  }
};
