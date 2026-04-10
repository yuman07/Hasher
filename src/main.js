import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

// ── i18n ──────────────────────────────────────────────────────────────
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
    toggleTheme: "Toggle theme",
    skippedDirs: "Folders cannot be hashed and were skipped: ",
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
    toggleTheme: "\u5207\u6362\u4e3b\u9898",
    skippedDirs: "\u6587\u4ef6\u5939\u65e0\u6cd5\u8ba1\u7b97\u54c8\u5e0c\uff0c\u5df2\u8df3\u8fc7\uff1a",
  },
};

// ── state ─────────────────────────────────────────────────────────────
const state = {
  files: new Map(),
  settings: loadSettings(),
  lang: loadLanguage(),
  theme: loadTheme(),
  upperCase: localStorage.getItem("hasher-case") === "upper",
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

function loadTheme() {
  const saved = localStorage.getItem("hasher-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
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
  document.getElementById("lang-btn").classList.toggle("lang-zh", state.lang === "zh");
}

let _themeSwitchTimer = 0;
function applyTheme(animate) {
  const root = document.documentElement;
  if (animate) {
    // Uniform 0.3 s transition on every element via !important class
    root.classList.add("theme-switching");
    clearTimeout(_themeSwitchTimer);
    _themeSwitchTimer = setTimeout(() => root.classList.remove("theme-switching"), 350);
  }
  root.setAttribute("data-theme", state.theme);
  getCurrentWindow().setTheme(state.theme).catch(() => {});
}

function applyHashCase() {
  document.getElementById("app").classList.toggle("hash-upper", state.upperCase);
  document.getElementById("case-btn").classList.toggle("upper", state.upperCase);
}

function syncCollapseAllBtn() {
  const cards = document.querySelectorAll(".file-card");
  const allCollapsed = cards.length > 0 && Array.from(cards).every((c) => c.classList.contains("collapsed"));
  document.getElementById("collapse-all-btn").classList.toggle("all-collapsed", allCollapsed);
}

function updateSettingsCloseBtn() {
  const hasAny = Object.values(state.settings).some((v) => v);
  document.getElementById("settings-close").disabled = !hasAny;
}

// ── helpers ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
  setTimeout(() => {
    el.classList.remove("visible");
    el.addEventListener("transitionend", () => el.remove());
  }, 3000);
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

// ── file-type icons ───────────────────────────────────────────────────
const EXT_SETS = {
  image: ["jpg","jpeg","png","gif","svg","webp","bmp","ico","tiff","tif","heic","heif","avif","raw"],
  video: ["mp4","avi","mkv","mov","wmv","flv","webm","m4v","mpg","mpeg","3gp"],
  audio: ["mp3","wav","flac","aac","ogg","wma","m4a","opus","ape","aiff"],
  archive: ["zip","rar","7z","tar","gz","bz2","xz","zst","dmg","iso","pkg","deb","rpm","cab","lz4"],
  code: ["js","ts","jsx","tsx","py","rs","go","java","c","cpp","h","hpp","html","css","scss","json","xml","yaml","yml","toml","sh","rb","php","swift","kt","lua","sql","r","m","vue","svelte"],
  doc: ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt","rtf","csv","md","odt","ods","odp","pages","numbers","key","epub"],
  exe: ["exe","msi","app","bat","cmd","com","appimage","apk","ipa","deb","rpm"],
};

function getFileIconSvg(filename) {
  const ext = (filename.lastIndexOf(".") > 0
    ? filename.slice(filename.lastIndexOf(".") + 1)
    : ""
  ).toLowerCase();

  for (const [type, exts] of Object.entries(EXT_SETS)) {
    if (exts.includes(ext)) return ICONS[type];
  }
  return ICONS.default;
}

const ICONS = {
  image: `<svg class="file-icon fi-image" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>`,
  video: `<svg class="file-icon fi-video" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>`,
  audio: `<svg class="file-icon fi-audio" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>`,
  archive: `<svg class="file-icon fi-archive" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>`,
  code: `<svg class="file-icon fi-code" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>`,
  doc: `<svg class="file-icon fi-doc" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>`,
  exe: `<svg class="file-icon fi-exe" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
  </svg>`,
  default: `<svg class="file-icon fi-default" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>`,
};

// ── initialisation ────────────────────────────────────────────────────
async function init() {
  // Detect macOS for overlay title-bar padding
  if (/Mac/.test(navigator.userAgent)) {
    document.body.classList.add("platform-mac");
  }

  applyTheme(false);
  applyTranslations();
  applyHashCase();

  // Window dragging: mousedown on header (but not on buttons) starts drag
  document.querySelector("header").addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    getCurrentWindow().startDragging().catch(() => {});
  });

  // The <head> inline script added .no-transition to prevent flash.
  // Remove it after the first frame so future toggles can animate.
  requestAnimationFrame(() => {
    document.documentElement.classList.remove("no-transition");
  });

  // follow system theme when no explicit preference
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("hasher-theme")) {
        state.theme = e.matches ? "dark" : "light";
        applyTheme(true);
      }
    });

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

  // Files opened via macOS Dock drop (app already running)
  await listen("open-files", (event) => {
    handleFiles(event.payload);
  });

  // Files opened via macOS Dock drop (cold launch — arrived before frontend)
  const pending = await invoke("take_pending_files");
  if (pending.length > 0) {
    handleFiles(pending);
  }

  await listen("hash-progress", (event) => {
    const { file_id, progress } = event.payload;
    const card = document.querySelector(`[data-file-id="${file_id}"]`);
    if (!card) return;
    const pct = Math.round(progress * 100);
    card.querySelector(".progress-fill").style.width = pct + "%";
    card.querySelector(".progress-text").textContent = pct + "%";
  });

  // hash case
  document.getElementById("case-btn").addEventListener("click", () => {
    state.upperCase = !state.upperCase;
    localStorage.setItem("hasher-case", state.upperCase ? "upper" : "lower");
    applyHashCase();
  });

  // language
  document.getElementById("lang-btn").addEventListener("click", () => {
    state.lang = state.lang === "en" ? "zh" : "en";
    localStorage.setItem("hasher-lang", state.lang);
    applyTranslations();
  });

  // theme
  document.getElementById("theme-btn").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    localStorage.setItem("hasher-theme", state.theme);
    applyTheme(true);
  });

  // settings modal
  document.getElementById("settings-btn").addEventListener("click", () => {
    updateSettingsCloseBtn();
    document.getElementById("settings-overlay").classList.remove("hidden");
  });
  document.getElementById("settings-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget && !document.getElementById("settings-close").disabled)
      document.getElementById("settings-overlay").classList.add("hidden");
  });
  document.getElementById("settings-close").addEventListener("click", () => {
    if (document.getElementById("settings-close").disabled) return;
    document.getElementById("settings-overlay").classList.add("hidden");
  });

  for (const algo of ["md5", "sha1", "sha256", "sha512"]) {
    const toggle = document.getElementById(`toggle-${algo}`);
    toggle.checked = state.settings[algo];
    toggle.addEventListener("change", () => {
      state.settings[algo] = toggle.checked;
      saveSettings();
      updateSettingsCloseBtn();
    });
  }

  // collapse/expand all
  document.getElementById("collapse-all-btn").addEventListener("click", () => {
    const btn = document.getElementById("collapse-all-btn");
    if (btn.disabled) return;
    const cards = document.querySelectorAll(".file-card");
    const allCollapsed = Array.from(cards).every((c) => c.classList.contains("collapsed"));
    cards.forEach((c) => c.classList.toggle("collapsed", !allCollapsed));
    syncCollapseAllBtn();
  });

  document.getElementById("clear-btn").addEventListener("click", () => {
    if (document.getElementById("clear-btn").disabled) return;
    state.files.clear();
    document.getElementById("file-list").innerHTML = "";
    document.getElementById("app").classList.remove("has-files");
    document.getElementById("clear-btn").disabled = true;
    document.getElementById("collapse-all-btn").disabled = true;
  });
}

// ── file handling ─────────────────────────────────────────────────────
async function handleFiles(paths) {
  const algorithms = Object.entries(state.settings)
    .filter(([, v]) => v)
    .map(([k]) => k);

  if (algorithms.length === 0) {
    document.getElementById("settings-overlay").classList.remove("hidden");
    return;
  }

  document.getElementById("app").classList.add("has-files");
  document.getElementById("clear-btn").disabled = false;
  document.getElementById("collapse-all-btn").disabled = false;

  const skipped = [];
  for (const filePath of paths) {
    // Remove existing card for the same file path
    for (const [oldId, oldFile] of state.files) {
      if (oldFile.path === filePath) {
        const oldCard = document.querySelector(`[data-file-id="${oldId}"]`);
        if (oldCard) oldCard.remove();
        state.files.delete(oldId);
        break;
      }
    }

    const fileId =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    let meta;
    try {
      meta = await invoke("get_file_metadata", { filePath });
    } catch {
      skipped.push(filePath.split(/[/\\]/).pop());
      continue;
    }

    state.files.set(fileId, { ...meta, path: filePath });
    createFileCard(fileId, meta, filePath);
    computeHashes(fileId, filePath, algorithms);
  }

  if (skipped.length > 0) {
    showToast(t("skippedDirs") + skipped.join(", "));
  }

  if (state.files.size === 0) {
    document.getElementById("app").classList.remove("has-files");
    document.getElementById("clear-btn").disabled = true;
    document.getElementById("collapse-all-btn").disabled = true;
  }
}

function createFileCard(fileId, meta, filePath) {
  const card = document.createElement("div");
  card.className = "file-card";
  card.dataset.fileId = fileId;
  card.innerHTML = `
    <div class="file-header">
      <div class="file-info">
        ${getFileIconSvg(meta.name)}
        <div class="file-meta">
          <span class="file-name">${escapeHtml(meta.name)}</span>
          <span class="file-size">${formatSize(meta.size)}</span>
          <span class="file-path" title="${escapeHtml(filePath)}">${escapeHtml(filePath)}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="collapse-btn" title="Collapse">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 6 8 10 12 6"/>
          </svg>
        </button>
        <button class="remove-btn" data-i18n-title="remove" title="${t("remove")}">&times;</button>
      </div>
    </div>
    <div class="card-body">
    <div class="progress-container">
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <span class="progress-text">0%</span>
    </div>
    <div class="hash-results"></div>
    </div>
  `;

  card.querySelector(".collapse-btn").addEventListener("click", () => {
    card.classList.toggle("collapsed");
    syncCollapseAllBtn();
  });

  card.querySelector(".remove-btn").addEventListener("click", () => {
    state.files.delete(fileId);
    card.classList.add("removing");
    card.addEventListener("animationend", () => card.remove());
    if (state.files.size === 0) {
      document.getElementById("app").classList.remove("has-files");
      document.getElementById("clear-btn").disabled = true;
      document.getElementById("collapse-all-btn").disabled = true;
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

    const progressContainer = card.querySelector(".progress-container");
    const fill = progressContainer.querySelector(".progress-fill");
    const progressText = progressContainer.querySelector(".progress-text");
    fill.style.width = "100%";
    fill.classList.add("complete");
    progressText.textContent = t("progressDone");
    progressText.dataset.i18n = "progressDone";
    progressContainer.classList.add("complete");
    setTimeout(() => progressContainer.classList.add("hide"), 500);

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
        const h = state.upperCase ? results[i].hash.toUpperCase() : results[i].hash;
        navigator.clipboard.writeText(`${results[i].algorithm}: ${h}`);
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
