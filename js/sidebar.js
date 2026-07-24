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
  guest: [
    { label: 'Beranda', path: '/', icon: 'layout-dashboard' },
    { label: 'Album Kenangan', path: '/albums', icon: 'image' },
    { label: 'Pengumuman', path: '/announcements', icon: 'megaphone' },
    { label: 'Jadwal', path: '/schedule', icon: 'calendar' },
    { label: 'Masuk / Daftar', path: '/login', icon: 'log-in' },
  ],
};

export function getMenuForRole(role) {
  const menu = MENU_BY_ROLE[role] || MENU_BY_ROLE.siswa;
  const hasStruktur = menu.some(item => item.path === '/struktur');
  if (hasStruktur) return menu;

  // Sisipkan "Struktur Organisasi" setelah Dashboard/Beranda untuk semua role,
  // termasuk role custom (Keamanan, Kebersihan, dst) yang belum masuk daftar di atas.
  return [menu[0], { label: 'Struktur Organisasi', path: '/struktur', icon: 'users-round' }, ...menu.slice(1)];
}

export function renderSidebar(role, siteName = 'Sistem Informasi Kelas') {
  const menu = getMenuForRole(role);
  const currentPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

  const items = menu.map(item => `
    <a href="#${item.path}" data-path="${item.path}" class="sidebar-link ${currentPath === item.path ? 'active' : ''}">
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

// FIX: sebelumnya status "active" cuma dihitung sekali pas renderSidebar()
// dipanggil (awal buka app), dan gak pernah diupdate lagi walau user pindah
// halaman lewat router — jadi highlight-nya nyangkut di halaman lama padahal
// konten yang tampil udah beda. Fungsi ini dipanggil tiap 'hashchange' buat
// nyamain highlight sidebar sama halaman yang beneran lagi aktif, tanpa perlu
// render ulang seluruh sidebar (cukup toggle class).
export function updateActiveSidebarLink() {
  const currentPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
  document.querySelectorAll('#sidebar .sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.path === currentPath);
  });
}
