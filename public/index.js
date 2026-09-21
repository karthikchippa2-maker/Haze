"use strict";
import LibcurlClient from "/libcurl/index.mjs";

/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");
/**
 * @type {HTMLButtonElement}
 */
const frameExit = document.getElementById("frame-exit");

const { Controller } = $scramjetController;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let controller = null;
/** @type {any} */
let activeFrame = null;

/* ================================================================
   sidebar navigation
   ================================================================ */

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    navItems.forEach((b) => b.classList.toggle("active", b === btn));
    views.forEach((v) => v.classList.toggle("active", v.dataset.viewSection === view));
  });
});

/* ================================================================
   haze games fullscreen
   ================================================================ */

const gamesFullscreenBtn = document.getElementById("games-fullscreen");
const gamesWrap = document.querySelector(".games-wrap");

gamesFullscreenBtn.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    gamesWrap.requestFullscreen().catch(() => {});
  }
});

document.addEventListener("fullscreenchange", () => {
  gamesFullscreenBtn.innerHTML = document.fullscreenElement
    ? "&#9974;&nbsp; Exit fullscreen"
    : "&#9974;&nbsp; Fullscreen";
});

/* ================================================================
   settings: themes / wallpaper / search engine (persisted locally)
   ================================================================ */

const STORE_KEY = "haze-settings";

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

/* ---- themes ---- */

const THEMES = [
  { id: "haze", label: "haze", from: "#050505", to: "#1a1a1a" },
  { id: "glass", label: "Liquid Glass", from: "#6ee7f9", to: "#a78bfa" },
  { id: "galaxy", label: "Galaxy", from: "#07020f", to: "#3b2470" },
  { id: "midnight", label: "Midnight", from: "#04070d", to: "#12315e" },
  { id: "cream", label: "Cream", from: "#faf8f2", to: "#e6ddc8" },
  { id: "rose", label: "Rose", from: "#0c0507", to: "#6e2440" },
  { id: "matrix", label: "Matrix", from: "#010602", to: "#0c4d26" },
];

const themeGrid = document.getElementById("theme-grid");

for (const t of THEMES) {
  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "theme-swatch";
  swatch.dataset.theme = t.id;
  swatch.innerHTML = `<span class="swatch" style="background:linear-gradient(135deg, ${t.from}, ${t.to})"></span><span>${t.label}</span>`;
  swatch.addEventListener("click", () => applyTheme(t.id));
  themeGrid.appendChild(swatch);
}

function applyTheme(id) {
  if (!THEMES.some((t) => t.id === id)) id = "haze";
  document.documentElement.dataset.theme = id;
  saveSettings({ theme: id });
  themeGrid.querySelectorAll(".theme-swatch").forEach((el) => {
    el.classList.toggle("active", el.dataset.theme === id);
  });
}

/* ---- wallpaper ---- */

const wallpaperInput = document.getElementById("wallpaper-input");
const wallpaperClear = document.getElementById("wallpaper-clear");
const wallpaperPreview = document.getElementById("wallpaper-preview");
const wallpaperLayer = document.getElementById("wallpaper");

function applyWallpaper(dataUrl) {
  if (dataUrl) {
    wallpaperLayer.style.backgroundImage = `url(${dataUrl})`;
    wallpaperLayer.classList.add("visible");
    wallpaperPreview.style.backgroundImage = `url(${dataUrl})`;
    wallpaperPreview.hidden = false;
    wallpaperClear.hidden = false;
  } else {
    wallpaperLayer.style.backgroundImage = "";
    wallpaperLayer.classList.remove("visible");
    wallpaperPreview.hidden = true;
    wallpaperClear.hidden = true;
  }
}

wallpaperInput.addEventListener("change", () => {
  const file = wallpaperInput.files && wallpaperInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      localStorage.setItem("haze-wallpaper", String(reader.result));
      applyWallpaper(String(reader.result));
    } catch {
      // image too large for localStorage (~5MB) - apply for this session only
      applyWallpaper(String(reader.result));
      wallpaperClear.hidden = false;
      error.textContent = "Image too large to save permanently — applied for this session.";
      setTimeout(() => (error.textContent = ""), 4000);
    }
  };
  reader.readAsDataURL(file);
});

wallpaperClear.addEventListener("click", () => {
  localStorage.removeItem("haze-wallpaper");
  applyWallpaper(null);
});

/* ---- search engine ---- */

const engineSelect = document.getElementById("engine-select");
const ENGINES = {
  brave: "https://search.brave.com/search?q=%s",
  google: "https://www.google.com/search?q=%s",
  duckduckgo: "https://duckduckgo.com/?q=%s",
  bing: "https://www.bing.com/search?q=%s",
  startpage: "https://www.startpage.com/sp/search?query=%s",
};
const ENGINE_PLACEHOLDERS = {
  brave: "Search Brave or type a URL",
  google: "Search Google or type a URL",
  duckduckgo: "Search DuckDuckGo or type a URL",
  bing: "Search Bing or type a URL",
  startpage: "Search Startpage or type a URL",
};

function applyEngine(id) {
  const template = ENGINES[id] || ENGINES.brave;
  searchEngine.value = template;
  address.placeholder = ENGINE_PLACEHOLDERS[id] || ENGINE_PLACEHOLDERS.brave;
  engineSelect.value = ENGINES[id] ? id : "brave";
}

engineSelect.addEventListener("change", () => {
  applyEngine(engineSelect.value);
  saveSettings({ engine: engineSelect.value });
});

/* ---- restore saved settings ---- */

(function restoreSettings() {
  const s = loadSettings();
  applyTheme(s.theme || "haze");
  applyEngine(s.engine || "brave");
  const wp = localStorage.getItem("haze-wallpaper");
  if (wp) applyWallpaper(wp);
})();

/* ================================================================
   proxied frame
   ================================================================ */

function ensureFrame() {
  if (activeFrame) return;
  const frameEl = document.createElement("iframe");
  frameEl.id = "sj-frame";
  frameEl.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;border:none;background:var(--bg);z-index:2000;";
  document.body.appendChild(frameEl);
  activeFrame = controller.createFrame(frameEl);
  frameExit.hidden = false;
}

function launch(url) {
  if (!controller) {
    error.textContent = "Still initializing — try again in a moment.";
    return;
  }
  error.textContent = "";
  errorCode.textContent = "";
  ensureFrame();
  activeFrame.go(url);
}

frameExit.addEventListener("click", () => {
  if (activeFrame) {
    try {
      activeFrame.destroy?.();
    } catch {}
    const el = document.getElementById("sj-frame");
    if (el) el.remove();
    activeFrame = null;
  }
  frameExit.hidden = true;
});

/* ================================================================
   service worker + controller init (scramjet v2)
   ================================================================ */

// if this page loaded under an older service worker and a new one just took
// over (scramjet v2's sw claims clients via skipWaiting), reload once so the
// page boots with scripts served by the new worker - otherwise stale-worker
// routing 500s the scramjet/controller bundles on upgrade visits
const hadControllerAtLoad = !!navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener("controllerchange", () => {
  if (hadControllerAtLoad) location.reload();
});

// wait until the service worker actually controls this page (or time out)
async function waitForControl(timeoutMs = 10000) {
  if (navigator.serviceWorker.controller) return;
  const ready = navigator.serviceWorker.ready.then(() => {});
  const changed = new Promise((resolve) => {
    const onChange = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      resolve();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange, {
      once: true,
    });
  });
  await Promise.race([ready, changed, sleep(timeoutMs)]);
}

async function init() {
  error.textContent = "starting proxy engine...";
  errorCode.textContent = "";

  const registration = await navigator.serviceWorker.register("./sw.js");
  await waitForControl();
  const sw = navigator.serviceWorker.controller ?? registration.active;
  if (!sw) throw new Error("No service worker available for the controller");

  const wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";

  controller = new Controller({
    serviceworker: sw,
    transport: new LibcurlClient({ wisp: wispUrl }),
  });

  // gates on RPC setup + scramjet wasm preload; constructing the LibcurlClient
  // also starts compiling the transport wasm right away, so first navigations
  // no longer race a lazy worker compile (the v1 cold-start issue)
  await Promise.race([controller.wait(), sleep(20000)]);

  window.$haze = { controller, ready: true, initError: null };
  error.textContent = "";
}

init().catch((err) => {
  console.error("haze: controller init failed", err);
  window.$haze = { controller: null, ready: false, initError: String(err) };
  error.textContent = "Failed to initialize the proxy.";
  errorCode.textContent = String(err);
});

/* ================================================================
   home form + shortcuts
   ================================================================ */

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!address.value.trim()) return;
  const url = window.search(address.value, searchEngine.value);
  launch(url).catch((err) => {
    console.error(err);
    error.textContent = "Navigation failed.";
    errorCode.textContent = String(err);
  });
});

document.querySelectorAll(".shortcuts button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.url;
    address.value = url;
    launch(url).catch((err) => {
      console.error(err);
      error.textContent = "Navigation failed.";
      errorCode.textContent = String(err);
    });
  });
});
