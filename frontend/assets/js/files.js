import { API_BASE_URL, clearSession, getStoredToken, isSessionValid } from "./config.js";

const uploadForm = document.querySelector("#upload-form");
const fileInput = document.querySelector("#pdf-file");
const filesList = document.querySelector("#files-list");
const filesStatus = document.querySelector("#files-status");
const filesBanner = document.querySelector("#files-banner");
const refreshButton = document.querySelector("#refresh-files");

function showBanner(message, variant = "neutral") {
  if (!filesBanner) return;

  if (!message) {
    filesBanner.textContent = "";
    filesBanner.classList.add("hidden");
    return;
  }

  filesBanner.textContent = message;
  filesBanner.dataset.variant = variant;
  filesBanner.classList.remove("hidden");
}

function setStatus(message) {
  filesStatus.textContent = message;
}

function redirectToAuth() {
  window.location.replace("./auth.html?mode=login");
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function renderFiles(files) {
  filesList.innerHTML = "";

  if (!files.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300";
    emptyState.textContent = "No PDFs uploaded yet.";
    filesList.appendChild(emptyState);
    return;
  }

  files.forEach((file) => {
    const article = document.createElement("article");
    article.className = "rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-200";

    const topRow = document.createElement("div");
    topRow.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "text-lg font-semibold text-white";
    title.textContent = file.original_filename;

    const stored = document.createElement("p");
    stored.className = "mt-1 text-sm text-slate-400";
    stored.textContent = `Stored as ${file.stored_filename}`;

    titleWrap.append(title, stored);

    const status = document.createElement("span");
    status.className = "inline-flex w-fit rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200";
    status.textContent = file.status;

    topRow.append(titleWrap, status);

    const uploaded = document.createElement("p");
    uploaded.className = "mt-4 text-sm text-slate-400";
    uploaded.textContent = `Uploaded ${formatDate(file.upload_time)}`;

    article.append(topRow, uploaded);
    filesList.appendChild(article);
  });
}

async function apiFetch(path, options = {}) {
  const token = getStoredToken();

  if (!token) {
    redirectToAuth();
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    clearSession();
    redirectToAuth();
    return null;
  }

  return response;
}

async function loadFiles() {
  const response = await apiFetch("/files/");
  if (!response) return;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    setStatus(data.detail || "Unable to load files");
    return;
  }

  const files = Array.isArray(data.files) ? data.files : [];
  renderFiles(files);
  setStatus(files.length ? `Loaded ${files.length} file${files.length === 1 ? "" : "s"}.` : "No files found.");
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = uploadForm.querySelector("button[type='submit']");
  const file = fileInput.files?.[0];

  if (!file) {
    showBanner("Select a PDF first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  submitButton.disabled = true;
  submitButton.textContent = "Uploading...";
  showBanner("", "neutral");

  try {
    const response = await apiFetch("/files/", {
      method: "POST",
      body: formData
    });

    if (!response) return;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Upload failed");
    }

    uploadForm.reset();
    showBanner(data.message || "PDF uploaded successfully.", "success");
    await loadFiles();
  } catch (error) {
    showBanner(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Upload PDF";
  }
});

refreshButton.addEventListener("click", () => {
  loadFiles();
});

async function bootstrap() {
  const valid = await isSessionValid().catch(() => false);

  if (!valid) {
    clearSession();
    redirectToAuth();
    return;
  }

  await loadFiles();
}

bootstrap().catch(() => {
  setStatus("Failed to load PDF library.");
});