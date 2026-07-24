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

  container.innerHTML = `
    <h1 class="section-title" style="font-size:20px; margin-bottom:20px;">
      ${me ? `Selamat datang, ${me.profile?.full_name || 'Pengguna'} 👋` : 'Selamat datang di Sistem Informasi Kelas 👋'}
    </h1>

    ${stats ? `<div class="stat-grid">${stats}</div>` : ''}

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
