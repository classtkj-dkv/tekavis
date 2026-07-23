const MENU_BY_ROLE = {
  owner: [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
    { label: 'Siswa', path: '/students', icon: 'users' },
    { label: 'Album Kenangan', path: '/albums', icon: 'image' },
    { label: 'Pengumuman', path: '/announcements', icon: 'megaphone' },
    { label: 'Jadwal', path: '/schedule', icon: 'calendar' },
    { label: 'Kas', path: '/finance', icon: 'wallet' },
    { label: 'Kelola User & Role', path: '/users', icon: 'shield' },
    { label: 'Role & Permission', path: '/roles', icon: 'key' },
    { label: 'Activity Log', path: '/activity-log', icon: 'history' },
    { label: 'Pengaturan Website', path: '/settings', icon: 'settings' },
  ],
  admin: [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
    { label: 'Siswa', path: '/students', icon: 'users' },
    { label: 'Album Kenangan', path: '/albums', icon: 'image' },
    { label: 'Pengumuman', path: '/announcements', icon: 'megaphone' },
    { label: 'Jadwal', path: '/schedule', icon: 'calendar' },
  ],
  ketua: [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
    { label: 'Pengumuman', path: '/announcements', icon: 'megaphone' },
  ],
  wakil: [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
  ],
  sekretaris: [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
    { label: 'Jadwal', path: '/schedule', icon: 'calendar' },
  ],
  bendahara: [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
    { label: 'Kas', path: '/finance', icon: 'wallet' },
  ],
  siswa: [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
    { label: 'Profil Saya', path: '/profile', icon: 'user' },
    { label: 'Album Kenangan', path: '/albums', icon: 'image' },
    { label: 'Pengumuman', path: '/announcements', icon: 'megaphone' },
    { label: 'Jadwal', path: '/schedule', icon: 'calendar' },
  ],
};

export function getMenuForRole(role) {
  return MENU_BY_ROLE[role] || MENU_BY_ROLE.siswa;
}

export function renderSidebar(role, siteName = 'Sistem Informasi Kelas') {
  const menu = getMenuForRole(role);
  const currentPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

  const items = menu.map(item => `
    <a href="#${item.path}" class="sidebar-link ${currentPath === item.path ? 'active' : ''}">
      <span class="sidebar-link-label">${item.label}</span>
    </a>
  `).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <span class="sidebar-brand-name">${siteName}</span>
      </div>
      <nav class="sidebar-nav">${items}</nav>
    </aside>
  `;
}
