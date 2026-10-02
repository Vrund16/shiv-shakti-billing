(function () {
  const IS_LOGIN_PAGE = window.location.pathname.endsWith('login.html');

  // Load session from storage
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

  function clearSession() {
    sessionStorage.clear();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('sessionId');
  }

  // Route guard check
  function enforceRouteGuard() {
    if (IS_LOGIN_PAGE) {
      if (isLoggedIn()) window.location.replace('index.html');
      return;
    }

    if (!isLoggedIn()) {
      if (navigator.onLine) {
        clearSession();
        window.location.replace('login.html');
      }
    }
  }

  // Request Header Helper
  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-session-id': getSessionId()
    };
  }

  // Periodic heartbeat ping to server
  function startSessionPing() {
    if (IS_LOGIN_PAGE) return;

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

        if (res.status === 401) {
          clearSession();
          window.location.replace('login.html');
        }
      } catch (err) {
        console.warn('Session ping network issue:', err);
      }
    }, 5000);
  }

  // Logout handler
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

  // Run guard immediately on script parse
  enforceRouteGuard();

  // Global window access
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
