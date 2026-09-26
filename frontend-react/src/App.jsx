import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import ProfileModal from "./components/ProfileModal";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Scanner from "./pages/Scanner";
import UrlScan from "./pages/UrlScan";
import Resources from "./pages/Resources";
import "./App.css";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("loggedInUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // When website is opened, show Sign Up modal first if not logged in
  const [showAuthModal, setShowAuthModal] = useState(() => {
    try {
      const savedUser = localStorage.getItem("loggedInUser");
      return !savedUser;
    } catch (e) {
      return true;
    }
  });

  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const handleNavigation = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    setLoggedInUser(null);
    setShowProfileModal(false);
    window.history.pushState({}, "", "/url-scan");
    setPath("/url-scan");
  };

  const handleAuthSuccess = (user) => {
    setLoggedInUser(user);
    window.history.pushState({}, "", "/");
    setPath("/");
  };

  const handleGoToSettings = () => {
    setShowProfileModal(false);
    window.history.pushState({}, "", "/settings");
    setPath("/settings");
  };

  let page;

  // Before login navigation: URL Scan, Resources, About, and Scanner
  if (!loggedInUser) {
    if (path === "/about") {
      page = <About loggedInUser={null} />;
    } else if (path === "/resources") {
      page = <Resources />;
    } else if (path === "/scanner") {
      page = (
        <Scanner
          loggedInUser={null}
          onLoginPrompt={() => setShowAuthModal(true)}
        />
      );
    } else {
      page = <UrlScan />;
    }
  } else if (path === "/scanner") {
    page = (
      <Scanner
        loggedInUser={loggedInUser}
        onLoginPrompt={() => setShowAuthModal(true)}
      />
    );
  } else if (path === "/url-scan") {
    page = <UrlScan />;
  } else if (path === "/resources") {
    page = <Resources />;
  } else if (path === "/about") {
    page = <About loggedInUser={loggedInUser} />;
  } else if (path === "/settings") {
    page = (
      <Settings
        loggedInUser={loggedInUser}
        onLoginPrompt={() => setShowAuthModal(true)}
      />
    );
  } else {
    // Dashboard handles all dashboard metrics, analytics, and history
    page = (
      <Dashboard
        loggedInUser={loggedInUser}
        onLoginPrompt={() => setShowAuthModal(true)}
      />
    );
  }

  return (
    <div className="app app-top-nav-layout">
      <div className="main-content main-content-full">
        <Navbar
          onLoginClick={() => setShowAuthModal(true)}
          onLogout={handleLogout}
          loggedInUser={loggedInUser}
          currentPath={path}
          onProfileClick={() => setShowProfileModal(true)}
        />

        <main>{page}</main>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode="register"
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        loggedInUser={loggedInUser}
        onGoToSettings={handleGoToSettings}
      />
    </div>
  );
}

export default App;