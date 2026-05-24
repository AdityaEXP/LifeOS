export const API_BASE_URL = "http://127.0.0.1:8000";
export const ACCESS_TOKEN_KEY = "lifeos_access_token";
export const USER_KEY = "lifeos_user";

export function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY);
  return rawUser ? JSON.parse(rawUser) : null;
}

export function saveSession({ accessToken, user }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function isSessionValid() {
  const token = getStoredToken();

  if (!token) {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.ok;
}