import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = "register" }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(initialMode); // "register" or "login"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (mode === "register") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setErrorMessage("Please enter your name.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("https://ai-url-phishing-detection.onrender.com/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            password: password,
          }),
        });

        const data = await response.json();
        if (data.success && data.user) {
          setSuccessMessage("Account created successfully! Logging you in...");
          localStorage.setItem("loggedInUser", JSON.stringify(data.user));
          setTimeout(() => {
            onAuthSuccess(data.user);
            resetForm();
            onClose();
          }, 800);
        } else {
          setErrorMessage(data.message || "Failed to create account.");
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("Unable to connect to server. Ensure FastAPI is running.");
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        const response = await fetch("https://ai-url-phishing-detection.onrender.com/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password: password,
          }),
        });

        const data = await response.json();
        if (data.success && data.user) {
          setSuccessMessage("Login successful! Loading your dashboard...");
          localStorage.setItem("loggedInUser", JSON.stringify(data.user));
          setTimeout(() => {
            onAuthSuccess(data.user);
            resetForm();
            onClose();
          }, 600);
        } else {
          setErrorMessage(data.message || "Invalid email or password.");
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("Unable to connect to server. Ensure FastAPI is running.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="auth-close-btn"
          onClick={onClose}
          title="Close (✕)"
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="auth-header">
          <div className="auth-icon-badge">🛡️</div>
          <h2>{mode === "register" ? t("auth_create_account") : t("auth_welcome_back")}</h2>
          <p>
            {mode === "register"
              ? t("auth_register_desc")
              : t("auth_login_desc")}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => switchMode("register")}
          >
            {t("auth_tab_signup")}
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => switchMode("login")}
          >
            {t("auth_tab_signin")}
          </button>
        </div>

        {errorMessage && <div className="auth-alert danger-alert">⚠️ {errorMessage}</div>}
        {successMessage && <div className="auth-alert success-alert">✅ {successMessage}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="reg-name">{t("auth_full_name")}</label>
              <input
                id="reg-name"
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">{t("auth_email")}</label>
            <input
              id="auth-email"
              type="email"
              placeholder="e.g. name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">{t("auth_password")}</label>
            <input
              id="auth-password"
              type="password"
              placeholder={mode === "register" ? "At least 6 characters" : "Enter password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />
          </div>

          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="reg-confirm-password">{t("auth_confirm_password")}</label>
              <input
                id="reg-confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? t("auth_processing") : mode === "register" ? t("auth_tab_signup") : t("auth_tab_signin")}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "register" ? (
            <p>
              {t("auth_have_account")}{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => switchMode("login")}
              >
                {t("auth_signin_link")}
              </button>
            </p>
          ) : (
            <p>
              {t("auth_no_account")}{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => switchMode("register")}
              >
                {t("auth_signup_link")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
