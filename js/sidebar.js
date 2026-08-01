// Menu sidebar dibangun DINAMIS dari role + permission asli user (bukan
// daftar statis per nama role) — jadi kalau Owner bikin role custom baru
// (misal "Keamanan", "Humas") lewat Role & Permission, siapapun yang pegang
// role itu otomatis dapet akses sidebar ke halaman yang permission-nya
// mereka punya, tanpa perlu ada yang nambahin manual di kode ini.

const DASHBOARD_ITEM = { label: 'Dashboard', path: '/', icon: 'layout-dashboard' };
const STRUKTUR_ITEM = { label: 'Struktur Organisasi', path: '/struktur', icon: 'users-round' };
const PROFILE_ITEM = { label: 'Profil Saya', path: '/profile', icon: 'user' };
const FINANCE_ITEM = { label: 'Kas', path: '/finance', icon: 'wallet' };
const ATTENDANCE_ITEM = { label: 'Absensi', path: '/absensi', icon: 'clipboard-check' };

// Data publik (siswa/jadwal/pengumuman/album) — bisa dilihat siapapun yang
// login (bahkan guest, tergantung setting visibility Owner), jadi selalu
// muncul di sidebar buat semua role yang login.
const PUBLIC_DATA_ITEMS = [
  { label: 'Siswa', path: '/students', icon: 'users' },
  { label: 'Album Kenangan', path: '/albums', icon: 'image' },
  { label: 'Pengumuman', path: '/announcements', icon: 'megaphone' },
  { label: 'Jadwal', path: '/schedule', icon: 'calendar' },
];

const OWNER_ONLY_ITEMS = [
  { label: 'Kelola User & Role', path: '/users', icon: 'shield' },
  { label: 'Role & Permission', path: '/roles', icon: 'key' },
  { label: 'Activity Log', path: '/activity-log', icon: 'history' },
  { label: 'Pengaturan Website', path: '/settings', icon: 'settings' },
];

const GUEST_MENU = [
  { label: 'Beranda', path: '/', icon: 'layout-dashboard' },
  ...PUBLIC_DATA_ITEMS,
  { label: 'Masuk / Daftar', path: '/login', icon: 'log-in' },
];

export function getMenuForUser(role, permissions = {}) {
  if (!role || role === 'guest') return GUEST_MENU;

  const isOwner = role === 'owner';
  const canViewKas = isOwner || permissions.view_kas || permissions.manage_finance;

  const menu = [
    DASHBOARD_ITEM,
    STRUKTUR_ITEM,
    PROFILE_ITEM,
    ...PUBLIC_DATA_ITEMS,
  ];

  // Absensi: siapapun yang login boleh lihat KECUALI role Pengunjung
  // (permintaan eksplisit — pengunjung login tapi tetap gak boleh akses).
  if (role !== 'pengunjung') menu.push(ATTENDANCE_ITEM);

  // Kas itu satu-satunya data yang sengaja privat — cuma muncul buat yang
  // beneran diizinkan (Owner, atau pemegang jabatan yang dikasih izin lihat
  // kas, misal Bendahara).
  if (canViewKas) menu.push(FINANCE_ITEM);

  if (isOwner) menu.push(...OWNER_ONLY_ITEMS);

  return menu;
}

// Kompatibilitas ke pemanggil lama yang cuma ngirim role tanpa permissions.
export function getMenuForRole(role) {
  return getMenuForUser(role, {});
}

// Pemetaan key ikon (sudah ada di data menu) ke class Font Awesome — murni visual,
// tidak mengubah path/label/logic routing sama sekali.
const ICON_MAP = {
  'layout-dashboard': 'fa-solid fa-gauge-high',
  'users': 'fa-solid fa-users',
  'users-round': 'fa-solid fa-sitemap',
  'image': 'fa-solid fa-images',
  'megaphone': 'fa-solid fa-bullhorn',
  'calendar': 'fa-solid fa-calendar-days',
  'wallet': 'fa-solid fa-wallet',
  'clipboard-check': 'fa-solid fa-clipboard-check',
  'shield': 'fa-solid fa-shield-halved',
  'key': 'fa-solid fa-key',
  'history': 'fa-solid fa-clock-rotate-left',
  'settings': 'fa-solid fa-gear',
  'user': 'fa-solid fa-user',
  'log-in': 'fa-solid fa-right-to-bracket',
};

export function renderSidebar(role, siteName = 'Class Tekavis', logoUrl = '', permissions = {}) {
  const menu = getMenuForUser(role, permissions);
  const currentPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

  const items = menu.map(item => `
    <a href="#${item.path}" data-path="${item.path}" class="sidebar-link ${currentPath === item.path ? 'active' : ''}">
      <i class="${ICON_MAP[item.icon] || 'fa-solid fa-circle-dot'}"></i>
      <span class="sidebar-link-label">${item.label}</span>
    </a>
  `).join('');

  const brandIcon = logoUrl
    ? `<img src="${logoUrl}" alt="${siteName}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" />`
    : (siteName || 'C').trim().slice(0, 1).toUpperCase();

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">${brandIcon}</div>
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
