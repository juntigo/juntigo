const JUNTIGO_AUTH_SESSION_KEY = "juntigoSessionToken";
const JUNTIGO_AUTH_API = "https://script.google.com/macros/s/AKfycbz6nBiCff3kuKl4VN06tBxZMbeFICB8WV1S9x5cEQV8kOkwkFbstpYkVuHUtzpvENSu/exec";

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
    session.authenticated ? "Otwórz moje konto" : "Zaloguj się lub otwórz konto"
  );

  profileButton.onclick = function () {
    window.location.href = session.authenticated ? "profil.html" : "konto.html";
  };
});
