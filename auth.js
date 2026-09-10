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

document.addEventListener("DOMContentLoaded", async function () {
  const profileButton = document.querySelector(".profile-nav-button");

  if (!profileButton) return;

  const session = await validateJuntigoSession();

  profileButton.dataset.authenticated = session.authenticated ? "true" : "false";
  profileButton.setAttribute(
    "aria-label",
    session.authenticated ? "Otwórz moje konto" : "Zaloguj się lub otwórz konto"
  );
});
