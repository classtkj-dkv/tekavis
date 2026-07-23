const STORAGE_KEY = 'kelas-cms-theme'; // 'light' | 'dark' | 'auto'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode) {
  const resolved = mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'auto';
}

export function setTheme(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

export function initTheme() {
  const mode = getStoredTheme();
  applyTheme(mode);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'auto') applyTheme('auto');
  });
}
