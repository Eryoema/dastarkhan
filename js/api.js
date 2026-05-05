// ============================================================
// api.js — JWT и запросы к Django API (тот же origin, runserver)
// ============================================================
(function () {
  const ACCESS = "dastarkhan-access";
  const REFRESH = "dastarkhan-refresh";

  function getAccess() {
    try {
      return localStorage.getItem(ACCESS);
    } catch (e) {
      return null;
    }
  }

  function setTokens(access, refresh) {
    try {
      if (access) localStorage.setItem(ACCESS, access);
      if (refresh) localStorage.setItem(REFRESH, refresh);
    } catch (e) {}
  }

  function clearTokens() {
    try {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
    } catch (e) {}
  }

  function isLoggedIn() {
    return !!getAccess();
  }

  async function tryRefresh() {
    let ref;
    try {
      ref = localStorage.getItem(REFRESH);
    } catch (e) {
      return false;
    }
    if (!ref) return false;
    const res = await fetch("/api/auth/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh: ref }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.access, null);
    return true;
  }

  async function apiFetch(url, opts) {
    opts = opts || {};
    const headers = Object.assign({ Accept: "application/json" }, opts.headers || {});
    if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const token = getAccess();
    if (token) headers["Authorization"] = "Bearer " + token;

    let res = await fetch(url, Object.assign({}, opts, { headers }));

    if (res.status === 401 && !opts._skipRefresh) {
      const ok = await tryRefresh();
      if (ok) {
        headers["Authorization"] = "Bearer " + getAccess();
        res = await fetch(url, Object.assign({}, opts, { headers }));
      }
    }
    return res;
  }

  function register(payload) {
    return apiFetch("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function menuList() {
    return apiFetch("/api/menu/");
  }

  function login(email, password) {
    return fetch("/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: email.trim().toLowerCase(), password }),
    }).then(async (res) => {
      if (!res.ok) return res;
      const data = await res.json();
      setTokens(data.access, data.refresh);
      return res;
    });
  }

  function profileGet() {
    return apiFetch("/api/auth/profile/");
  }

  function profilePatch(payload) {
    return apiFetch("/api/auth/profile/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  function favoritesList() {
    return apiFetch("/api/favorites/");
  }

  function favoriteAdd(itemId) {
    return apiFetch("/api/favorites/" + encodeURIComponent(itemId) + "/", {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  function favoriteRemove(itemId) {
    return apiFetch("/api/favorites/" + encodeURIComponent(itemId) + "/", {
      method: "DELETE",
    });
  }

  function ordersList() {
    return apiFetch("/api/orders/");
  }

  function orderCreate(payload) {
    return apiFetch("/api/orders/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function reviewsList() {
    return apiFetch("/api/reviews/");
  }

  function reviewCreate(payload) {
    return apiFetch("/api/reviews/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function reservationCreate(payload) {
    return apiFetch("/api/reservations/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function chatSend(message, lang) {
    return fetch("/api/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ message, lang }),
    });
  }

  window.DastarkhanAPI = {
    getAccess,
    setTokens,
    clearTokens,
    isLoggedIn,
    apiFetch,
    menuList,
    register,
    login,
    profileGet,
    profilePatch,
    favoritesList,
    favoriteAdd,
    favoriteRemove,
    ordersList,
    orderCreate,
    reviewsList,
    reviewCreate,
    reservationCreate,
    chatSend,
  };
})();
