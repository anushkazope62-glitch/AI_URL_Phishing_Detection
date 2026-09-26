import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../utils/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem("app_language") || "en";
    } catch (e) {
      return "en";
    }
  });

  const setLanguage = (newLang) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem("app_language", newLang);
    } catch (e) {
      console.error("Failed to save language preference", e);
    }
  };

  const t = (key, params = {}) => {
    const currentDict = translations[language] || translations["en"];
    let text = currentDict[key] || translations["en"][key] || key;

    if (params && typeof params === "object") {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), params[paramKey]);
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if not wrapped in provider
    return {
      language: "en",
      setLanguage: () => {},
      t: (key) => translations["en"][key] || key,
    };
  }
  return context;
}
