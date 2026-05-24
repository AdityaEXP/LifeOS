import { API_BASE_URL, clearSession, isSessionValid, saveSession } from "./config.js";

const tabs = document.querySelectorAll("[data-auth-tab]");
const panes = document.querySelectorAll("[data-auth-pane]");
const banner = document.querySelector("#auth-banner");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const authTitle = document.querySelector("#auth-title");
const authSubtitle = document.querySelector("#auth-subtitle");

async function redirectIfAuthenticated() {
  const tokenValid = await isSessionValid().catch(() => false);

  if (tokenValid) {
    window.location.replace("./dashboard.html");
    return true;
  }

  clearSession();
  return false;
}

function showMessage(message, variant = "neutral") {
  if (!banner) return;
  if (!message) {
    banner.textContent = "";
    banner.classList.add("hidden");
    return;
  }
  banner.textContent = message;
  banner.dataset.variant = variant;
  banner.classList.remove("hidden");
}

function setActiveTab(mode) {
  tabs.forEach((tab) => {
    const active = tab.dataset.authTab === mode;
    tab.classList.toggle("bg-slate-950", active);
    tab.classList.toggle("text-white", active);
    tab.classList.toggle("shadow-lg", active);
    tab.classList.toggle("text-slate-500", !active);
  });

  panes.forEach((pane) => {
    pane.classList.toggle("hidden", pane.dataset.authPane !== mode);
  });

  if (authTitle && authSubtitle) {
    if (mode === "signup") {
      authTitle.textContent = "Create your account";
      authSubtitle.textContent = "Start with a clean LifeOS workspace in seconds.";
    } else {
      authTitle.textContent = "Welcome back";
      authSubtitle.textContent = "Log in and continue into your dashboard.";
    }
  }

  const search = new URLSearchParams(window.location.search);
  search.set("mode", mode);
  const nextUrl = `${window.location.pathname}?${search.toString()}`;
  window.history.replaceState({}, "", nextUrl);
}

async function submitJson(url, payload) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }

  return data;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showMessage("", "neutral");
    setActiveTab(tab.dataset.authTab);
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector("button[type='submit']");
  const formData = new FormData(loginForm);

  submitButton.disabled = true;
  submitButton.textContent = "Signing in...";

  try {
    const result = await submitJson("/auth/login", {
      email: formData.get("email"),
      password: formData.get("password")
    });

    saveSession({
      accessToken: result.access_token,
      user: {
        username: result.username,
        email: result.email
      }
    });

    window.location.href = "./dashboard.html";
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Log in";
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = signupForm.querySelector("button[type='submit']");
  const formData = new FormData(signupForm);

  submitButton.disabled = true;
  submitButton.textContent = "Creating...";

  try {
    await submitJson("/auth/signup", {
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password")
    });

    signupForm.reset();
    showMessage("Account created. Switch to log in.", "success");
    setActiveTab("login");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Create account";
  }
});

const initialMode = new URLSearchParams(window.location.search).get("mode");
setActiveTab(initialMode === "signup" ? "signup" : "login");

redirectIfAuthenticated();