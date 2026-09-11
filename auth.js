const JUNTIGO_AUTH_SESSION_KEY = "juntigoSessionToken";
const JUNTIGO_AUTH_API = "https://script.google.com/macros/s/AKfycbz6nBiCff3kuKl4VN06tBxZMbeFICB8WV1S9x5cEQV8kOkwkFbstpYkVuHUtzpvENSu/exec";
const JUNTIGO_API = JUNTIGO_AUTH_API;

const interestAliases = {
  "Podróże": "",
  "Imprezy": "",
  "Sport": "⚽ Sport",
  "Muzyka": "🎶 Muzyka i festiwale",
  "Jedzenie": "🍷 Lokalne smaki",
  "Fotografia": "📸 Fotografia",
  "Góry": "🏔️ Góry",
  "Morze": "🌊 Morze",
  "Plaża": "🌊 Morze",
  "Piłka nożna": "⚽ Sport",
  "Festiwale": "🎶 Muzyka i festiwale",
  "Kultura": "🎨 Kultura i sztuka",
  "Zwiedzanie": "🏛️ Historia i zabytki"
};

const styleAliases = {
  "Zwiedzanie": "🏛️ Historia i zabytki",
  "Relaks": "😎 Na luzie",
  "Imprezy": "🎉 Imprezowo",
  "Jedzenie i lokalny klimat": "",
  "Sport": "🥾 Aktywnie",
  "Fotografia": "",
  "Aktywnie": "🥾 Aktywnie",
  "Chill": "😎 Na luzie"
};

function normalizeTagList(values, aliases) {
  const list = Array.isArray(values)
    ? values
    : String(values || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);

  return list
    .map(item => aliases[item] || item)
    .filter(Boolean);
}

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

  if (
    url === JUNTIGO_AUTH_API &&
    init &&
    (init.body instanceof URLSearchParams || init.body instanceof FormData)
  ) {
    const body = new URLSearchParams();

    if (init.body instanceof URLSearchParams) {
      init.body.forEach((value, key) => body.append(key, value));
    } else {
      init.body.forEach((value, key) => {
        if (typeof value === "string") {
          body.append(key, value);
        }
      });
    }

    const method = String(init.method || "GET").toUpperCase();

    if (body.get("type") === "join") {
      const sessionToken = getJuntigoSessionToken();

      if (sessionToken) {
        body.set("sessionToken", sessionToken);
      }

      return JUNTIGO_NATIVE_FETCH(input, {
        ...init,
        body: body.toString(),
        redirect: "follow",
        credentials: "omit",
        headers: {
          ...(init.headers || {}),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        }
      });
    }

    if (method === "POST" && body.get("type") === "profile") {
      return JUNTIGO_NATIVE_FETCH(input, {
        ...init,
        body: body.toString(),
        redirect: "follow",
        credentials: "omit",
        headers: {
          ...(init.headers || {}),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        }
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
      position: fixed;
      min-width: 190px;
      padding: 6px;
      background: #fff;
      border: 1px solid #e7e1da;
      border-radius: 14px;
      box-shadow: 0 16px 38px rgba(7,27,51,.16);
      z-index: 100000;
    }

    .juntigo-auth-menu a,
    .juntigo-auth-menu button {
      width: 100%;
      display: block;
      padding: 11px 13px;
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

    @media (max-width: 700px) {
      .profile-nav-button.is-authenticated {
        width: 44px;
        min-width: 44px;
        padding: 4px;
        gap: 0;
        justify-content: center;
      }

      .profile-nav-button.is-authenticated .juntigo-nav-label {
        display: none;
      }

      .profile-nav-button.is-authenticated .juntigo-nav-chevron {
        display: none;
      }

      .profile-nav-button.is-authenticated .juntigo-nav-avatar {
        width: 34px;
        height: 34px;
      }

      .juntigo-auth-menu {
        min-width: 170px;
      }

      .juntigo-auth-menu a,
      .juntigo-auth-menu button {
        padding: 10px 12px;
        font-size: 14px;
      }
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
  if (!profileButton) return;

  const rect = profileButton.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.className = "juntigo-auth-menu";
  menu.innerHTML = `
    <a href="profil.html">Mój profil</a>
    <button type="button">Wyloguj się</button>
  `;

  document.body.appendChild(menu);

  const menuRect = menu.getBoundingClientRect();
  const gap = 10;
  const margin = 12;

  let left = rect.right - menuRect.width;
  let top = rect.bottom + gap;

  if (left < margin) {
    left = margin;
  }

  if (left + menuRect.width > window.innerWidth - margin) {
    left = window.innerWidth - menuRect.width - margin;
  }

  if (top + menuRect.height > window.innerHeight - margin) {
    top = rect.top - menuRect.height - gap;
  }

  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;

  menu.querySelector("button").addEventListener("click", logoutJuntigo);
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
