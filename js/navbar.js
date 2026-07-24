import { getStoredTheme, setTheme } from './theme.js';

export function renderNavbar(profile, email) {
  const initials = (profile?.full_name || email || 'U').trim().slice(0, 1).toUpperCase();
  const currentTheme = getStoredTheme();
  const isLoggedIn = Boolean(profile || email);

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

        <div class="navbar-avatar-wrap">
          <button id="navbar-avatar-btn" class="navbar-avatar" title="${profile?.full_name || email || ''}">${initials}</button>
          ${isLoggedIn ? `
            <div id="navbar-user-menu" class="navbar-user-menu" hidden>
              <div class="navbar-user-menu-info">
                <div style="font-weight:600; font-size:13px;">${profile?.full_name || 'Pengguna'}</div>
                <div style="font-size:12px; color:var(--color-text-muted);">${email || ''}</div>
              </div>
              <a href="#/profile" class="navbar-user-menu-item">Profil Saya</a>
              <button id="navbar-logout-btn" class="navbar-user-menu-item navbar-user-menu-item-danger">Keluar</button>
            </div>
          ` : ''}
        </div>
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

  const avatarBtn = document.getElementById('navbar-avatar-btn');
  const userMenu = document.getElementById('navbar-user-menu');
  avatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (userMenu) userMenu.hidden = !userMenu.hidden;
  });
  document.addEventListener('click', () => {
    if (userMenu) userMenu.hidden = true;
  });

  document.getElementById('navbar-logout-btn')?.addEventListener('click', async () => {
    const { signOut } = await import('./session.js');
    await signOut();
  });
}
