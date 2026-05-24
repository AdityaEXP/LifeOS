import { API_BASE_URL, clearSession, getStoredToken, getStoredUser, isSessionValid } from "./config.js";

const chatMessages = document.querySelector("#chat-messages");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatStatus = document.querySelector("#chat-status");
const sendButton = document.querySelector("#send-button");
const clearButton = document.querySelector("#clear-chat");
const quickPrompts = document.querySelectorAll("[data-prompt]");

const conversation = [];

if (window.marked) {
  window.marked.setOptions({
    breaks: true,
    gfm: true
  });
}

function redirectToAuth() {
  window.location.replace("./auth.html?mode=login");
}

function setStatus(message, variant = "neutral") {
  chatStatus.textContent = message;
  chatStatus.dataset.variant = variant;
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createBubble({ role, content, pending = false }) {
  const wrapper = document.createElement("div");
  wrapper.className = role === "user" ? "flex justify-end" : "flex justify-start";

  const bubble = document.createElement("div");
  bubble.className = role === "user"
    ? "max-w-[85%] rounded-[1.5rem] rounded-tr-md border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-slate-100"
    : "max-w-[85%] rounded-[1.5rem] rounded-tl-md border border-white/10 bg-white/5 px-4 py-3 text-slate-200";

  const label = document.createElement("p");
  label.className = "mb-1 text-xs uppercase tracking-[0.3em] text-slate-500";
  label.textContent = role === "user" ? "You" : pending ? "Assistant typing" : "Assistant";

  const body = document.createElement("p");
  body.className = "leading-7 text-slate-100 [&_a]:text-sky-300 [&_a]:underline [&_code]:rounded-lg [&_code]:bg-slate-950/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-amber-200 [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-slate-950/80 [&_pre]:p-4 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal";

  if (role === "assistant" && !pending && window.marked && window.DOMPurify) {
    body.innerHTML = window.DOMPurify.sanitize(window.marked.parse(content));
  } else {
    body.textContent = content;
  }

  bubble.append(label, body);
  wrapper.appendChild(bubble);
  return wrapper;
}

function renderConversation() {
  chatMessages.innerHTML = "";

  if (!conversation.length) {
    const welcome = document.createElement("div");
    welcome.className = "rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 p-6 text-slate-300";
    welcome.innerHTML = '<p class="text-lg font-semibold text-white">Start a conversation</p><p class="mt-2 text-sm leading-7 text-slate-300">Ask about a PDF you uploaded, request a summary, or look for specific details in your documents.</p>';
    chatMessages.appendChild(welcome);
    return;
  }

  conversation.forEach((message) => {
    chatMessages.appendChild(createBubble(message));
  });

  scrollToBottom();
}

function pushMessage(message) {
  conversation.push(message);
  renderConversation();
}

function updateLastAssistantMessage(content) {
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    if (conversation[index].role === "assistant" && conversation[index].pending) {
      conversation[index] = { role: "assistant", content };
      renderConversation();
      return;
    }
  }
}

function getAnswerText(data) {
  if (typeof data?.answer === "string") {
    return data.answer;
  }

  if (typeof data?.answer?.content === "string") {
    return data.answer.content;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  return "I couldn't generate a response from the uploaded documents.";
}

async function apiQuery(query) {
  const token = getStoredToken();

  if (!token) {
    redirectToAuth();
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/query/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query })
  });

  if (response.status === 401) {
    clearSession();
    redirectToAuth();
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getAnswerText(data));
  }

  return data;
}

async function sendMessage(text) {
  const query = text.trim();

  if (!query) {
    setStatus("Type a question first.", "error");
    return;
  }

  pushMessage({ role: "user", content: query });
  pushMessage({ role: "assistant", content: "Thinking...", pending: true });
  setStatus("Waiting for the query route to respond...");
  chatInput.value = "";
  chatInput.focus();
  sendButton.disabled = true;

  try {
    const data = await apiQuery(query);

    if (!data) {
      return;
    }

    updateLastAssistantMessage(getAnswerText(data));
    setStatus("Answer ready.", "success");
  } catch (error) {
    updateLastAssistantMessage(error.message || "Something went wrong.");
    setStatus(error.message || "Failed to answer the question.", "error");
  } finally {
    sendButton.disabled = false;
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(chatInput.value);
});

quickPrompts.forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt || "");
  });
});

clearButton.addEventListener("click", () => {
  conversation.length = 0;
  renderConversation();
  setStatus("Conversation cleared.");
  chatInput.focus();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

async function bootstrap() {
  const valid = await isSessionValid().catch(() => false);

  if (!valid) {
    clearSession();
    redirectToAuth();
    return;
  }

  const user = getStoredUser();
  const greeting = user?.username ? `Chatting as ${user.username}.` : "Session active. Ask away.";
  setStatus(greeting, "success");
  renderConversation();
}

bootstrap().catch(() => {
  clearSession();
  redirectToAuth();
});