import { API_BASE_URL, clearSession, getStoredToken, isSessionValid } from "./config.js";

const subjectForm = document.querySelector("#subject-form");
const subjectNameInput = document.querySelector("#subject-name");
const assignForm = document.querySelector("#assign-form");
const subjectSelect = document.querySelector("#subject-select");
const fileSelect = document.querySelector("#file-select");
const subjectsList = document.querySelector("#subjects-list");
const subjectsStatus = document.querySelector("#subjects-status");
const subjectsBanner = document.querySelector("#subjects-banner");
const refreshButton = document.querySelector("#refresh-subjects");

let subjects = [];
let files = [];

function redirectToAuth() {
  window.location.replace("./auth.html?mode=login");
}

function setStatus(message) {
  subjectsStatus.textContent = message;
}

function showBanner(message, variant = "neutral") {
  if (!subjectsBanner) return;

  if (!message) {
    subjectsBanner.textContent = "";
    subjectsBanner.classList.add("hidden");
    return;
  }

  subjectsBanner.textContent = message;
  subjectsBanner.dataset.variant = variant;
  subjectsBanner.classList.remove("hidden");
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Unknown";
}

function apiFetch(path, options = {}) {
  const token = getStoredToken();

  if (!token) {
    redirectToAuth();
    return null;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  }).then((response) => {
    if (response.status === 401) {
      clearSession();
      redirectToAuth();
      return null;
    }

    return response;
  });
}

function renderSelectOptions() {
  subjectSelect.innerHTML = "";
  fileSelect.innerHTML = "";

  if (!subjects.length) {
    const subjectOption = document.createElement("option");
    subjectOption.value = "";
    subjectOption.textContent = "Create a subject first";
    subjectSelect.appendChild(subjectOption);
    subjectSelect.disabled = true;
  } else {
    subjectSelect.disabled = false;

    const subjectPlaceholder = document.createElement("option");
    subjectPlaceholder.value = "";
    subjectPlaceholder.textContent = "Select a subject";
    subjectSelect.appendChild(subjectPlaceholder);

    subjects.forEach((subject) => {
      const option = document.createElement("option");
      option.value = subject.id;
      option.textContent = subject.name;
      subjectSelect.appendChild(option);
    });
  }

  if (!files.length) {
    const fileOption = document.createElement("option");
    fileOption.value = "";
    fileOption.textContent = "Upload a PDF first";
    fileSelect.appendChild(fileOption);
    fileSelect.disabled = true;
  } else {
    fileSelect.disabled = false;

    const filePlaceholder = document.createElement("option");
    filePlaceholder.value = "";
    filePlaceholder.textContent = "Select a PDF";
    fileSelect.appendChild(filePlaceholder);

    files.forEach((file) => {
      const option = document.createElement("option");
      option.value = file.id;
      option.textContent = `${file.original_filename} (${file.status})`;
      fileSelect.appendChild(option);
    });
  }
}

function renderSubjects() {
  subjectsList.innerHTML = "";

  if (!subjects.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-300";
    emptyState.innerHTML = '<p class="text-lg font-semibold text-white">No subjects yet</p><p class="mt-2 text-sm leading-7 text-slate-300">Create a subject on the left, then attach PDFs to keep your library organized.</p>';
    subjectsList.appendChild(emptyState);
    return;
  }

  subjects.forEach((subject) => {
    const article = document.createElement("article");
    article.className = "rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-200";

    const topRow = document.createElement("div");
    topRow.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "text-xl font-semibold text-white";
    title.textContent = subject.name;

    const meta = document.createElement("p");
    meta.className = "mt-1 text-sm text-slate-400";
    const fileCount = subject.files?.length || 0;
    meta.textContent = `${fileCount} PDF${fileCount === 1 ? "" : "s"} attached • Created ${formatDate(subject.created_at)}`;

    titleWrap.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "rounded-full border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-300/15";
    deleteButton.textContent = "Delete subject";
    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Delete subject ${subject.name}?`);

      if (!confirmed) {
        return;
      }

      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting...";

      try {
        await deleteSubject(subject.id, subject.name);
        showBanner(`Subject ${subject.name} deleted successfully.`, "success");
        await refreshData();
      } catch (error) {
        showBanner(error.message || `Failed to delete ${subject.name}.`, "error");
      } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete subject";
      }
    });

    actions.appendChild(deleteButton);
    topRow.append(titleWrap, actions);

    const divider = document.createElement("div");
    divider.className = "my-4 h-px bg-white/10";

    const filesWrap = document.createElement("div");
    filesWrap.className = "space-y-3";

    if (!fileCount) {
      const emptyFiles = document.createElement("p");
      emptyFiles.className = "rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-400";
      emptyFiles.textContent = "No PDFs assigned to this subject yet.";
      filesWrap.appendChild(emptyFiles);
    } else {
      subject.files.forEach((file) => {
        const fileRow = document.createElement("div");
        fileRow.className = "flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between";

        const info = document.createElement("div");
        const fileTitle = document.createElement("p");
        fileTitle.className = "font-semibold text-white";
        fileTitle.textContent = file.original_filename;

        const fileMeta = document.createElement("p");
        fileMeta.className = "mt-1 text-sm text-slate-400";
        fileMeta.textContent = `Stored as ${file.stored_filename} • ${file.status}`;

        info.append(fileTitle, fileMeta);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10";
        removeButton.textContent = "Remove PDF";
        removeButton.addEventListener("click", async () => {
          removeButton.disabled = true;
          removeButton.textContent = "Removing...";

          try {
            await removeFileFromSubject(subject.id, file.id, file.original_filename);
            showBanner(`Removed ${file.original_filename} from ${subject.name}.`, "success");
            await refreshData();
          } catch (error) {
            showBanner(error.message || `Failed to remove ${file.original_filename}.`, "error");
          } finally {
            removeButton.disabled = false;
            removeButton.textContent = "Remove PDF";
          }
        });

        fileRow.append(info, removeButton);
        filesWrap.appendChild(fileRow);
      });
    }

    article.append(topRow, divider, filesWrap);
    subjectsList.appendChild(article);
  });
}

async function loadSubjects() {
  const response = await apiFetch("/subjects/");

  if (!response) return;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load subjects");
  }

  subjects = Array.isArray(data.subjects) ? data.subjects : [];
  renderSelectOptions();
  renderSubjects();
}

async function loadFiles() {
  const response = await apiFetch("/files/");

  if (!response) return;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load files");
  }

  files = Array.isArray(data.files) ? data.files : [];
  renderSelectOptions();
}

async function refreshData() {
  setStatus("Refreshing subjects and files...");

  await Promise.all([loadFiles(), loadSubjects()]);

  setStatus(`Loaded ${subjects.length} subject${subjects.length === 1 ? "" : "s"} and ${files.length} PDF${files.length === 1 ? "" : "s"}.`);
}

async function createSubject(name) {
  const response = await apiFetch("/subjects/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  if (!response) return;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to create subject");
  }

  return data;
}

async function assignFileToSubject(subjectId, fileId) {
  const response = await apiFetch("/subjects/assign_file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      subject_id: Number(subjectId),
      file_id: Number(fileId)
    })
  });

  if (!response) return;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Failed to assign PDF");
  }

  return data;
}

async function deleteSubject(subjectId, subjectName) {
  const response = await apiFetch("/subjects/", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ subject_id: Number(subjectId) })
  });

  if (!response) return;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Failed to delete ${subjectName}`);
  }

  return data;
}

async function removeFileFromSubject(subjectId, fileId, fileName) {
  const response = await apiFetch("/subjects/remove_file", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      subject_id: Number(subjectId),
      file_id: Number(fileId)
    })
  });

  if (!response) return;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Failed to remove ${fileName}`);
  }

  return data;
}

subjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = subjectNameInput.value.trim();

  if (!name) {
    showBanner("Type a subject name first.", "error");
    return;
  }

  const submitButton = subjectForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Creating...";
  showBanner("", "neutral");

  try {
    await createSubject(name);
    subjectForm.reset();
    showBanner(`Subject ${name} created successfully.`, "success");
    await refreshData();
  } catch (error) {
    showBanner(error.message || "Failed to create subject.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Create subject";
  }
});

assignForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const subjectId = subjectSelect.value;
  const fileId = fileSelect.value;

  if (!subjectId || !fileId) {
    showBanner("Choose both a subject and a PDF.", "error");
    return;
  }

  const submitButton = assignForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Assigning...";
  showBanner("", "neutral");

  try {
    await assignFileToSubject(subjectId, fileId);
    showBanner("PDF assigned to subject successfully.", "success");
    await refreshData();
  } catch (error) {
    showBanner(error.message || "Failed to assign PDF.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Assign PDF to subject";
  }
});

refreshButton.addEventListener("click", () => {
  refreshData().catch((error) => {
    showBanner(error.message || "Failed to refresh data.", "error");
  });
});

async function bootstrap() {
  const valid = await isSessionValid().catch(() => false);

  if (!valid) {
    clearSession();
    redirectToAuth();
    return;
  }

  await refreshData();
}

bootstrap().catch((error) => {
  setStatus("Failed to load subjects.");
  showBanner(error.message || "Unable to load the subjects page.", "error");
});