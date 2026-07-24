import { api } from './apiClient.js';
import { getSession } from './session.js';

function statCard(label, value) {
  return `
    <div class="card stat-card">
      <span class="stat-value">${value}</span>
      <span class="stat-label">${label}</span>
    </div>
  `;
}

// Menu cepat per role/jabatan, sesuai pembagian di spek "Struktur Organisasi":
// Ketua -> Pengumuman & Agenda, Sekretaris -> Jadwal & Dokumen, Bendahara -> Kas, dst.
const ROLE_PANEL = {
  owner: [
    { label: 'Kelola User & Role', path: '/users', desc: 'Atur akses dan jabatan seluruh anggota' },
    { label: 'Role & Permission', path: '/roles', desc: 'Kelola jabatan dan hak aksesnya' },
    { label: 'Pengaturan Website', path: '/settings', desc: 'Tema, banner, backup & restore database' },
    { label: 'Activity Log', path: '/activity-log', desc: 'Riwayat aktivitas seluruh sistem' },
  ],
  admin: [
    { label: 'Data Siswa', path: '/students', desc: 'Kelola data siswa kelas' },
    { label: 'Album Kenangan', path: '/albums', desc: 'Kelola galeri & foto kelas' },
    { label: 'Pengumuman', path: '/announcements', desc: 'Kelola pengumuman kelas' },
    { label: 'Jadwal', path: '/schedule', desc: 'Atur jadwal pelajaran' },
  ],
  ketua: [
    { label: 'Pengumuman', path: '/announcements', desc: 'Buat & kelola pengumuman kelas' },
  ],
  wakil: [
    { label: 'Pengumuman', path: '/announcements', desc: 'Pantau pengumuman kelas' },
  ],
  sekretaris: [
    { label: 'Jadwal', path: '/schedule', desc: 'Kelola jadwal pelajaran, jadi acuan dokumen kelas' },
  ],
  bendahara: [
    { label: 'Kas', path: '/finance', desc: 'Kelola pemasukan, pengeluaran, dan saldo kas kelas' },
  ],
  siswa: [
    { label: 'Profil Saya', path: '/profile', desc: 'Lihat & lengkapi profil kamu' },
    { label: 'Album Kenangan', path: '/albums', desc: 'Lihat momen & kenangan kelas' },
  ],
};

// Fallback buat role custom yang dibuat Owner (Keamanan, Kebersihan, dst) dan
// belum ada di daftar spesifik di atas — tetap dikasih menu cepat yang masuk akal.
const DEFAULT_PANEL = [
  { label: 'Struktur Organisasi', path: '/struktur', desc: 'Lihat susunan pengurus & jabatan kelas' },
  { label: 'Pengumuman', path: '/announcements', desc: 'Lihat pengumuman terbaru' },
];

function panelCard(item) {
  return `
    <a href="#${item.path}" class="card card-hover" style="display:block;">
      <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${item.label}</div>
      <div style="font-size:12px; color:var(--color-text-muted);">${item.desc}</div>
    </a>
  `;
}

export default async function renderDashboardPage(container) {
  const me = await getSession();
  const role = me ? (me.role || 'siswa') : 'guest';
  const perms = me?.permissions || {};
  const canViewKas = role === 'owner' || perms.view_kas;

  const [announcements, schedule] = await Promise.all([
    api.get('/api/announcements').catch(() => []),
    api.get('/api/schedule').catch(() => []),
  ]);

  let stats = '';
  if (role === 'owner' || role === 'admin') {
    const [students, albums, users] = await Promise.all([
      api.get('/api/students').catch(() => []),
      api.get('/api/albums').catch(() => []),
      role === 'owner' ? api.get('/api/users').catch(() => []) : Promise.resolve([]),
    ]);
    stats += statCard('Total Siswa', students.length);
    stats += statCard('Total Album', albums.length);
    if (role === 'owner') stats += statCard('Total User', users.length);
  }

  if (canViewKas) {
    const finance = await api.get('/api/finance').catch(() => null);
    if (finance) {
      stats += statCard('Saldo Kas', `Rp${Number(finance.summary.balance).toLocaleString('id-ID')}`);
    }
  }

  const announcementItems = announcements.slice(0, 5).map(a => `
    <div class="list-item">
      <div class="list-item-title">${a.is_pinned ? '📌 ' : ''}${a.title}</div>
      <div class="list-item-meta">${new Date(a.created_at).toLocaleDateString('id-ID')}</div>
    </div>
  `).join('') || '<div class="empty-state">Belum ada pengumuman.</div>';

  const scheduleItems = schedule.slice(0, 5).map(s => `
    <div class="list-item">
      <div class="list-item-title">${s.subject}</div>
      <div class="list-item-meta">${s.teacher || '-'} · ${s.room || '-'} · ${s.start_time?.slice(0,5)}-${s.end_time?.slice(0,5)}</div>
    </div>
  `).join('') || '<div class="empty-state">Belum ada jadwal.</div>';

  const rolePanel = me ? (ROLE_PANEL[role] || DEFAULT_PANEL) : [];

  container.innerHTML = `
    <h1 class="section-title" style="font-size:20px; margin-bottom:20px;">
      ${me ? `Selamat datang, ${me.profile?.full_name || 'Pengguna'} 👋` : 'Selamat datang di Sistem Informasi Kelas 👋'}
    </h1>

    ${stats ? `<div class="stat-grid">${stats}</div>` : ''}

    ${rolePanel.length ? `
      <h2 class="section-title" style="margin-bottom:12px;">Menu Cepat</h2>
      <div class="stat-grid" style="margin-bottom:24px;">${rolePanel.map(panelCard).join('')}</div>
    ` : ''}

    <div class="two-col">
      <div>
        <h2 class="section-title">Pengumuman Terbaru</h2>
        <div class="list-plain">${announcementItems}</div>
      </div>
      <div>
        <h2 class="section-title">Jadwal</h2>
        <div class="list-plain">${scheduleItems}</div>
      </div>
    </div>
  `;
}
