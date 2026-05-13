// localStorage-backed shim that restores the window.storage surface the
// codebase inherited from its Anthropic Artifacts origin. Five call sites
// across App.jsx and ImportView.jsx already pre-stringify on set and
// JSON.parse(saved.value) on get; the shim only wraps localStorage with
// the {value} envelope on get and swallows quota / private-mode errors.

export const storage = {
  async get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? undefined : { value: raw };
    } catch { return undefined; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  },
  async delete(key) {
    try { localStorage.removeItem(key); } catch {}
  },
};
