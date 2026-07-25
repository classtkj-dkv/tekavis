import { getStoredTheme, setTheme } from './theme.js';

const THEME_ICONS = {
  light: 'fa-solid fa-sun',
  dark: 'fa-solid fa-moon',
  auto: 'fa-solid fa-circle-half-stroke',
};
const THEME_LABELS = { light: 'Terang', dark: 'Gelap', auto: 'Sistem' };
const THEME_CYCLE = ['light', 'dark', 'auto'];

export function renderNavbar(profile, email) {
  const initials = (profile?.full_name || email || 'U').trim().slice(0, 1).toUpperCase();
  const currentTheme = getStoredTheme();
  const isLoggedIn = Boolean(profile || email);

  return `
    <header class="navbar">
      <button id="sidebar-toggle" class="icon-btn" aria-label="Buka menu"><i class="fa-solid fa-bars"></i></button>

      <span class="navbar-spacer"></span>

      <div class="navbar-actions">
        <button id="theme-toggle-btn" class="icon-btn" aria-label="Ganti tema (${THEME_LABELS[currentTheme]})" title="Tema: ${THEME_LABELS[currentTheme]}">
          <i class="${THEME_ICONS[currentTheme]}"></i>
        </button>

        <a href="#/notifications" class="icon-btn notif-bell" aria-label="Notifikasi">
          <i class="fa-regular fa-bell"></i><span id="notif-badge" class="notif-badge" hidden>0</span>
        </a>

        <div class="navbar-avatar-wrap">
          <button id="navbar-avatar-btn" class="navbar-avatar" title="${profile?.full_name || email || ''}">${initials}</button>
          ${isLoggedIn ? `
            <div id="navbar-user-menu" class="navbar-user-menu" hidden>
              <div class="navbar-user-menu-info">
                <div style="font-weight:700; font-size:13px;">${profile?.full_name || 'Pengguna'}</div>
                <div style="font-size:12px; color:var(--color-text-muted);">${email || ''}</div>
              </div>
              <a href="#/profile" class="navbar-user-menu-item"><i class="fa-regular fa-user"></i> Profil Saya</a>
              <button id="navbar-logout-btn" class="navbar-user-menu-item navbar-user-menu-item-danger"><i class="fa-solid fa-right-from-bracket"></i> Keluar</button>
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

export function bindNavbarEvents() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  themeBtn?.addEventListener('click', () => {
    const current = getStoredTheme();
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
    setTheme(next);
    const icon = themeBtn.querySelector('i');
    icon.className = THEME_ICONS[next];
    themeBtn.title = `Tema: ${THEME_LABELS[next]}`;
    themeBtn.setAttribute('aria-label', `Ganti tema (${THEME_LABELS[next]})`);
  });

  const sidebarToggle = document.getElementById('sidebar-toggle');
  sidebarToggle?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar-open');
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
