// Warns when the app is open in another tab of the same browser, because two
// tabs overwrite each other's progress (T-07). It only makes the problem
// visible: nothing is blocked and nothing is synchronized (D-43).

import { createId, PROGRESS_KEY } from "./state.js";

const CHANNEL_NAME = "kanjiGame.tabs";
const FALLBACK_KEY = "kanjiGame.tabs.heartbeat"; // used where BroadcastChannel is missing
const HEARTBEAT_MS = 5000;
// Browsers slow down timers in background tabs, so a tab counts as gone only
// after a long silence (or immediately when it says goodbye).
const STALE_MS = 75000;

/** @param {HTMLElement} banner element to show and fill; hidden while there is nothing to report */
export function startTabGuard(banner) {
  const tabId = createId();
  const others = new Map(); // tab id → last time heard
  let progressChangedElsewhere = false;

  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(CHANNEL_NAME) : null;

  function post(type) {
    const message = { type, tabId, at: Date.now() };
    try {
      if (channel) channel.postMessage(message);
      else localStorage.setItem(FALLBACK_KEY, JSON.stringify(message));
    } catch {
      // Detection is best effort; never disturb the game.
    }
  }

  function receive(message) {
    if (!message || message.tabId === tabId) return;
    if (message.type === "bye") others.delete(message.tabId);
    else others.set(message.tabId, Date.now());
    if (message.type === "hello") post("here");
    render();
  }

  function render() {
    const now = Date.now();
    for (const [id, heardAt] of others) if (now - heardAt > STALE_MS) others.delete(id);

    if (!others.size && !progressChangedElsewhere) {
      banner.hidden = true;
      banner.replaceChildren();
      return;
    }
    const lines = [];
    if (others.size) {
      lines.push("Aplikasi ini juga terbuka di tab lain. Progres di dua tab bisa saling menimpa. Tutup salah satu tab.");
    }
    if (progressChangedElsewhere) {
      lines.push("Progres baru saja diubah dari tab lain. Muat ulang halaman ini sebelum melanjutkan.");
    }
    const reload = document.createElement("button");
    reload.type = "button";
    reload.className = "button tab-warning__reload";
    reload.textContent = "Muat ulang halaman ini";
    reload.addEventListener("click", () => location.reload());

    const text = document.createElement("p");
    text.className = "tab-warning__text";
    text.textContent = `⚠ ${lines.join(" ")}`;
    banner.replaceChildren(text, ...(progressChangedElsewhere ? [reload] : []));
    banner.hidden = false;
  }

  if (channel) {
    channel.addEventListener("message", (event) => receive(event.data));
  }
  window.addEventListener("storage", (event) => {
    if (!channel && event.key === FALLBACK_KEY && event.newValue) {
      try {
        receive(JSON.parse(event.newValue));
      } catch {
        // ignore malformed heartbeat
      }
    }
    // Storage events fire only in the other tabs, so this is always a foreign write.
    if (event.key === PROGRESS_KEY) {
      progressChangedElsewhere = true;
      render();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) post("hello");
  });
  window.addEventListener("pagehide", () => post("bye"));
  setInterval(() => {
    post("ping");
    render();
  }, HEARTBEAT_MS);

  post("hello");
}
