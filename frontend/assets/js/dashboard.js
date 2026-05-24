import { API_BASE_URL, clearSession, getStoredToken, getStoredUser } from "./config.js";

const usernameEl = document.querySelector("#username");
const emailEl = document.querySelector("#email");
const memberIdEl = document.querySelector("#member-id");
const statusEl = document.querySelector("#dashboard-status");
const signOutButton = document.querySelector("#sign-out");

function showStatus(message, tone = "neutral") {
  statusEl.textContent = message;
  statusEl.dataset.variant = tone;
}

function redirectToAuth() {
  window.location.href = "./auth.html?mode=login";
}

async function loadProfile() {
  const token = getStoredToken();

  if (!token) {
    redirectToAuth();
    return;
  }

  const cachedUser = getStoredUser();
  if (cachedUser) {
    usernameEl.textContent = cachedUser.username || "Member";
    emailEl.textContent = cachedUser.email || "No email";
  }

  showStatus("Loading your profile...");

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    clearSession();
    redirectToAuth();
    return;
  }

  usernameEl.textContent = data.username;
  emailEl.textContent = data.email;
  memberIdEl.textContent = `#${data.id}`;
  showStatus("Connected and ready.", "success");
}

signOutButton.addEventListener("click", () => {
  clearSession();
  redirectToAuth();
});

loadProfile().catch(() => {
  clearSession();
  redirectToAuth();
});