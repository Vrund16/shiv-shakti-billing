// public/auth-session.js - Portfolio Showcase Client Session Manager

(function () {
  const IS_LOGIN_PAGE = window.location.pathname.endsWith('login.html') || window.location.pathname === '/login';

  // Load session ID from storage
  function getSessionId() {
    return sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId') || '';
  }

  function isLoggedIn() {
    const sessionVal = sessionStorage.getItem('isLoggedIn') || localStorage.getItem('isLoggedIn');
    return sessionVal === 'true' && Boolean(getSessionId());
  }

  // Sync session state across storages
  function saveSession(sessionId) {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('sessionId', sessionId);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('sessionId', sessionId);
  }

  // Clear session storage on logout or expiry
  function clearSession() {
    sessionStorage.clear();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('sessionId');
  }

  // Route guard check to prevent unauthorized page access
  function enforceRouteGuard() {
    if (IS_LOGIN_PAGE) {
      if (isLoggedIn()) {
        window.location.replace('index.html');
      }
      return;
    }

    if (!isLoggedIn()) {
      clearSession();
      window.location.replace('login.html');
    }
  }

  // Request Header Helper for authenticated API calls
  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-session-id': getSessionId()
    };
  }

  // Periodic heartbeat ping to refresh 60-minute server session timer
  function startSessionPing() {
    if (IS_LOGIN_PAGE) return;

    // Heartbeat ping every 10 seconds
    setInterval(async () => {
      if (!navigator.onLine) return;

      const sid = getSessionId();
      if (!sid) {
        clearSession();
        window.location.replace('login.html');
        return;
      }

      try {
        const res = await fetch('/api/session-ping', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ sessionId: sid })
        });

        // 401 response indicates 60-min session expiry or admin termination
        if (res.status === 401) {
          clearSession();
          window.location.replace('login.html');
        }
      } catch (err) {
        console.warn('Session heartbeat network issue:', err);
      }
    }, 10000);
  }

  // Explicit user logout handler
  async function logout() {
    const sid = getSessionId();
    if (sid && navigator.onLine) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ sessionId: sid })
        });
      } catch (err) {
        console.warn('Logout notification error:', err);
      }
    }
    clearSession();
    window.location.replace('login.html');
  }

  // Instantly release user session when mobile or browser tab is closed/hidden
  window.addEventListener('pagehide', () => {
    const sid = getSessionId();
    if (sid && navigator.sendBeacon && !IS_LOGIN_PAGE) {
      const payload = JSON.stringify({ sessionId: sid });
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/logout', blob);
    }
  });

  // Run Route Guard immediately on script parse
  enforceRouteGuard();

  // Expose global session functions for index.html, history.html, etc.
  window.AuthSession = {
    saveSession,
    clearSession,
    getSessionId,
    getAuthHeaders,
    logout
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSessionPing);
  } else {
    startSessionPing();
  }
})();
