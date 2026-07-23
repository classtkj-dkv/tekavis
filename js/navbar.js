import { getStoredTheme, setTheme } from './theme.js';

export function renderNavbar(profile) {
  const initials = (profile?.full_name || 'U').trim().slice(0, 1).toUpperCase();
  const currentTheme = getStoredTheme();

  return `
    <header class="navbar">
      <button id="sidebar-toggle" class="icon-btn" aria-label="Buka menu">☰</button>

      <div class="navbar-search">
        <input id="global-search" class="input" type="search" placeholder="Cari siswa, album, pengumuman..." />
      </div>

      <div class="navbar-actions">
        <select id="theme-select" class="theme-select" aria-label="Ganti tema">
          <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Terang</option>
          <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Gelap</option>
          <option value="auto" ${currentTheme === 'auto' ? 'selected' : ''}>Sistem</option>
        </select>

        <a href="#/notifications" class="icon-btn notif-bell" aria-label="Notifikasi">
          🔔<span id="notif-badge" class="notif-badge" hidden>0</span>
        </a>

        <div class="navbar-avatar" title="${profile?.full_name || ''}">${initials}</div>
      </div>
    </header>
  `;
}

export function updateNotifBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

export function bindNavbarEvents({ onSearch } = {}) {
  const themeSelect = document.getElementById('theme-select');
  themeSelect?.addEventListener('change', (e) => setTheme(e.target.value));

  const sidebarToggle = document.getElementById('sidebar-toggle');
  sidebarToggle?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar-open');
  });

  const searchInput = document.getElementById('global-search');
  let debounceTimer;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => onSearch?.(e.target.value.trim()), 300);
  });
}
