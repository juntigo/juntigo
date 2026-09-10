const JUNTIGO_AUTH_SESSION_KEY = "juntigoSessionToken";
const JUNTIGO_AUTH_API = "https://script.google.com/macros/s/AKfycbz6nBiCff3kuKl4VN06tBxZMbeFICB8WV1S9x5cEQV8kOkwkFbstpYkVuHUtzpvENSu/exec";
const JUNTIGO_API = JUNTIGO_AUTH_API;

function getJuntigoSessionToken() {
  return localStorage.getItem(JUNTIGO_AUTH_SESSION_KEY) || "";
}

function clearJuntigoSession() {
  localStorage.removeItem(JUNTIGO_AUTH_SESSION_KEY);
}

async function validateJuntigoSession() {
  const sessionToken = getJuntigoSessionToken();

  if (!sessionToken) {
    return { authenticated: false, profile: null, identity: null };
  }

  try {
    const response = await fetch(
      JUNTIGO_AUTH_API + "?action=profile&sessionToken=" + encodeURIComponent(sessionToken),
      { method: "GET" }
    );
    const result = await response.json();

    if (!result.success) {
      clearJuntigoSession();
      return { authenticated: false, profile: null, identity: null };
    }

    return {
      authenticated: true,
      profile: result.profile || null,
      identity: result.identity || null
    };
  } catch (error) {
    console.error("Błąd sprawdzania sesji Juntigo:", error);
    return { authenticated: true, profile: null, identity: null };
  }
}

function logoutJuntigo() {
  clearJuntigoSession();
  window.location.href = "index.html";
}

async function protectJuntigoPage() {
  const session = await validateJuntigoSession();

  if (!session.authenticated) {
    window.location.href = "konto.html";
    return null;
  }

  return session;
}

/*
 * Udział w wyjeździe nie wymaga logowania.
 * Jeśli użytkownik jest zalogowany, do istniejącego formularza join
 * automatycznie dokładamy jego podpisaną sesję Juntigo.
 * Dla gościa żadne dane autoryzacyjne nie są dodawane.
 */
const JUNTIGO_NATIVE_FETCH = window.fetch.bind(window);

function isJuntigoGetRequest(input, init) {
  const url = typeof input === "string"
    ? input
    : (input && input.url) || "";

  const method = String(
    (init && init.method) || (input && input.method) || "GET"
  ).toUpperCase();

  return method === "GET" && url.startsWith(JUNTIGO_AUTH_API);
}

async function fetchJuntigoGetWithRetry(input, init, attempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await JUNTIGO_NATIVE_FETCH(input, init);

      if (response.ok || attempt === attempts) {
        return response;
      }
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        throw error;
      }
    }

    await new Promise(resolve => setTimeout(resolve, attempt * 700));
  }

  throw lastError || new Error("Nie udało się połączyć z Juntigo.");
}

window.fetch = function(input, init) {
  const url = typeof input === "string"
    ? input
    : (input && input.url) || "";

  if (url === JUNTIGO_AUTH_API && init && init.body instanceof URLSearchParams) {
    const body = new URLSearchParams(init.body.toString());

    if (body.get("type") === "join") {
      const sessionToken = getJuntigoSessionToken();

      if (sessionToken) {
        body.set("sessionToken", sessionToken);
      }

      return JUNTIGO_NATIVE_FETCH(input, {
        ...init,
        body
      });
    }
  }

  if (isJuntigoGetRequest(input, init)) {
    return fetchJuntigoGetWithRetry(input, init);
  }

  return JUNTIGO_NATIVE_FETCH(input, init);
};

function ensureJuntigoNavStyles() {
  if (document.getElementById("juntigo-auth-nav-styles")) return;

  const style = document.createElement("style");
  style.id = "juntigo-auth-nav-styles";
  style.textContent = `
    .profile-nav-button.is-authenticated {
      width: auto;
      min-width: 44px;
      height: 44px;
      padding: 4px 11px 4px 4px;
      gap: 8px;
      border: 1px solid #e7e1da;
      border-radius: 999px;
      background: #fff;
    }

    .profile-nav-button.is-authenticated .juntigo-nav-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      overflow: hidden;
      background: #071b33;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .profile-nav-button.is-authenticated .juntigo-nav-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .profile-nav-button.is-authenticated .juntigo-nav-label {
      color: #071b33;
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
    }

    .profile-nav-button.is-authenticated .juntigo-nav-chevron {
      color: #667587;
      font-size: 13px;
      line-height: 1;
    }

    .juntigo-auth-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      min-width: 170px;
      padding: 7px;
      background: #fff;
      border: 1px solid #e7e1da;
      border-radius: 14px;
      box-shadow: 0 14px 30px rgba(7,27,51,.14);
      z-index: 1000;
    }

    .juntigo-auth-menu a,
    .juntigo-auth-menu button {
      width: 100%;
      display: block;
      padding: 10px 12px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: #071b33;
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }

    .juntigo-auth-menu a:hover,
    .juntigo-auth-menu button:hover {
      background: #f7f8fa;
    }

    .juntigo-auth-menu button {
      color: #a33a2b;
    }
  `;

  document.head.appendChild(style);
}

function toggleJuntigoAuthMenu() {
  const existing = document.querySelector(".juntigo-auth-menu");

  if (existing) {
    existing.remove();
    return;
  }

  const profileButton = document.querySelector(".profile-nav-button");
  if (!profileButton || !profileButton.parentElement) return;

  const parent = profileButton.parentElement;
  parent.style.position = "relative";

  const menu = document.createElement("div");
  menu.className = "juntigo-auth-menu";
  menu.innerHTML = `
    <a href="profil.html">Mój profil</a>
    <button type="button">Wyloguj się</button>
  `;

  menu.querySelector("button").addEventListener("click", logoutJuntigo);
  parent.appendChild(menu);
}

document.addEventListener("click", function(event) {
  const menu = document.querySelector(".juntigo-auth-menu");
  const button = document.querySelector(".profile-nav-button");

  if (!menu || !button) return;

  if (!button.contains(event.target) && !menu.contains(event.target)) {
    menu.remove();
  }
});

document.addEventListener("DOMContentLoaded", async function () {
  const profileButton = document.querySelector(".profile-nav-button");
  const backLink = document.querySelector(".back-link");

  if (backLink && window.location.pathname.endsWith("/profil.html")) {
    backLink.href = "konto.html";
    backLink.textContent = "Moje konto";
  }

  if (!profileButton) return;

  const session = await validateJuntigoSession();

  profileButton.dataset.authenticated = session.authenticated ? "true" : "false";
  profileButton.setAttribute(
    "aria-label",
    session.authenticated ? "Zalogowany — otwórz menu konta" : "Zaloguj się lub otwórz konto"
  );

  if (session.authenticated) {
    ensureJuntigoNavStyles();
    profileButton.classList.add("is-authenticated");

    const profile = session.profile || {};
    const identity = session.identity || {};
    const name = profile.name || identity.name || "Juntigo";
    const initial = String(name).charAt(0).toUpperCase() || "J";

    profileButton.innerHTML = `
      <span class="juntigo-nav-avatar">
        ${profile.photo
          ? `<img src="${String(profile.photo).replace(/"/g, "&quot;")}" alt="Zdjęcie profilowe">`
          : initial
        }
      </span>
      <span class="juntigo-nav-label">Zalogowany</span>
      <span class="juntigo-nav-chevron">⌄</span>
    `;

    profileButton.onclick = function(event) {
      event.stopPropagation();
      toggleJuntigoAuthMenu();
    };
  } else {
    profileButton.onclick = function () {
      window.location.href = "konto.html";
    };
  }
});
