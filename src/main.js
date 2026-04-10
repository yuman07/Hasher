import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

// --- i18n ---
const messages = {
  en: {
    dropText: "Drop files here to calculate hash",
    dropSubtext: "Supports multiple files at once",
    clearAll: "Clear All",
    hashAlgorithms: "Hash Algorithms",
    done: "Done",
    settings: "Settings",
    remove: "Remove",
    copyHash: "Copy hash",
    progressDone: "Done",
  },
  zh: {
    dropText: "\u5c06\u6587\u4ef6\u62d6\u653e\u5230\u6b64\u5904\u8ba1\u7b97\u54c8\u5e0c\u503c",
    dropSubtext: "\u652f\u6301\u540c\u65f6\u5904\u7406\u591a\u4e2a\u6587\u4ef6",
    clearAll: "\u5168\u90e8\u6e05\u9664",
    hashAlgorithms: "\u54c8\u5e0c\u7b97\u6cd5",
    done: "\u5b8c\u6210",
    settings: "\u8bbe\u7f6e",
    remove: "\u79fb\u9664",
    copyHash: "\u590d\u5236\u54c8\u5e0c\u503c",
    progressDone: "\u5b8c\u6210",
  },
};

// --- State ---
const state = {
  files: new Map(),
  settings: loadSettings(),
  lang: loadLanguage(),
};

function loadSettings() {
  const defaults = { md5: true, sha1: true, sha256: true, sha512: true };
  try {
    const saved = localStorage.getItem("hasher-settings");
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings() {
  localStorage.setItem("hasher-settings", JSON.stringify(state.settings));
}

function loadLanguage() {
  const saved = localStorage.getItem("hasher-lang");
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language.startsWith("zh") ? "zh" : "en";
}

function t(key) {
  return (messages[state.lang] && messages[state.lang][key]) || messages.en[key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.getElementById("lang-btn").textContent =
    state.lang === "en" ? "EN" : "\u4e2d\u6587";
}

function toggleLanguage() {
  state.lang = state.lang === "en" ? "zh" : "en";
  localStorage.setItem("hasher-lang", state.lang);
  applyTranslations();
}

// --- Helpers ---
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

// --- Initialization ---
async function init() {
  applyTranslations();

  const appWindow = getCurrentWebviewWindow();

  await appWindow.onDragDropEvent((event) => {
    const dropZone = document.getElementById("drop-zone");
    if (event.payload.type === "enter" || event.payload.type === "over") {
      dropZone.classList.add("drag-over");
    } else if (event.payload.type === "drop") {
      dropZone.classList.remove("drag-over");
      handleFiles(event.payload.paths);
    } else {
      dropZone.classList.remove("drag-over");
    }
  });

  await listen("hash-progress", (event) => {
    const { file_id, progress } = event.payload;
    const card = document.querySelector(`[data-file-id="${file_id}"]`);
    if (!card) return;
    const pct = Math.round(progress * 100);
    card.querySelector(".progress-fill").style.width = pct + "%";
    card.querySelector(".progress-text").textContent = pct + "%";
  });

  document.getElementById("lang-btn").addEventListener("click", toggleLanguage);

  document.getElementById("settings-btn").addEventListener("click", () => {
    document.getElementById("settings-overlay").classList.remove("hidden");
  });
  document.getElementById("settings-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget)
      document.getElementById("settings-overlay").classList.add("hidden");
  });
  document.getElementById("settings-close").addEventListener("click", () => {
    document.getElementById("settings-overlay").classList.add("hidden");
  });

  for (const algo of ["md5", "sha1", "sha256", "sha512"]) {
    const toggle = document.getElementById(`toggle-${algo}`);
    toggle.checked = state.settings[algo];
    toggle.addEventListener("change", () => {
      state.settings[algo] = toggle.checked;
      saveSettings();
    });
  }

  document.getElementById("clear-btn").addEventListener("click", () => {
    state.files.clear();
    document.getElementById("file-list").innerHTML = "";
    document.getElementById("app").classList.remove("has-files");
  });
}

// --- File handling ---
async function handleFiles(paths) {
  const algorithms = Object.entries(state.settings)
    .filter(([, v]) => v)
    .map(([k]) => k);

  if (algorithms.length === 0) {
    document.getElementById("settings-overlay").classList.remove("hidden");
    return;
  }

  document.getElementById("app").classList.add("has-files");

  for (const filePath of paths) {
    const fileId =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    let meta;
    try {
      meta = await invoke("get_file_metadata", { filePath });
    } catch {
      meta = { name: filePath.split(/[/\\]/).pop(), size: 0 };
    }

    state.files.set(fileId, { ...meta, path: filePath });
    createFileCard(fileId, meta);
    computeHashes(fileId, filePath, algorithms);
  }
}

function createFileCard(fileId, meta) {
  const card = document.createElement("div");
  card.className = "file-card";
  card.dataset.fileId = fileId;
  card.innerHTML = `
    <div class="file-header">
      <div class="file-info">
        <svg class="file-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div class="file-meta">
          <span class="file-name">${escapeHtml(meta.name)}</span>
          <span class="file-size">${formatSize(meta.size)}</span>
        </div>
      </div>
      <button class="remove-btn" data-i18n-title="remove" title="${t("remove")}">&times;</button>
    </div>
    <div class="progress-container">
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <span class="progress-text">0%</span>
    </div>
    <div class="hash-results"></div>
  `;

  card.querySelector(".remove-btn").addEventListener("click", () => {
    state.files.delete(fileId);
    card.classList.add("removing");
    card.addEventListener("animationend", () => card.remove());
    if (state.files.size === 0) {
      document.getElementById("app").classList.remove("has-files");
    }
  });

  document.getElementById("file-list").appendChild(card);
  requestAnimationFrame(() => card.classList.add("visible"));
}

async function computeHashes(fileId, filePath, algorithms) {
  const card = document.querySelector(`[data-file-id="${fileId}"]`);
  if (!card) return;

  try {
    const results = await invoke("compute_hashes", {
      filePath,
      fileId,
      algorithms,
    });

    const fill = card.querySelector(".progress-fill");
    const progressText = card.querySelector(".progress-text");
    fill.style.width = "100%";
    fill.classList.add("complete");
    progressText.textContent = t("progressDone");
    progressText.dataset.i18n = "progressDone";
    card.querySelector(".progress-container").classList.add("complete");

    const resultsDiv = card.querySelector(".hash-results");
    resultsDiv.innerHTML = results
      .map(
        (r) => `
      <div class="hash-row">
        <span class="hash-label">${escapeHtml(r.algorithm)}</span>
        <code class="hash-value">${escapeHtml(r.hash)}</code>
        <button class="copy-btn" data-i18n-title="copyHash" title="${t("copyHash")}">
          <svg class="icon-copy" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/>
            <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10" stroke-linecap="round"/>
          </svg>
          <svg class="icon-check" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 8.5 6.5 12 13 4"/>
          </svg>
        </button>
      </div>
    `
      )
      .join("");

    resultsDiv.querySelectorAll(".copy-btn").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(results[i].hash);
        btn.classList.add("copied");
        setTimeout(() => btn.classList.remove("copied"), 1500);
      });
    });
  } catch (error) {
    card.querySelector(".progress-container").style.display = "none";
    card.querySelector(".hash-results").innerHTML = `
      <div class="file-error">${escapeHtml(String(error))}</div>
    `;
  }
}

init();
