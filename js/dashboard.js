import { api } from './apiClient.js';
import { getSession } from './session.js';

const STAT_ICON_CYCLE = [
  { icon: 'fa-solid fa-user-graduate', chip: 'si-blue' },
  { icon: 'fa-solid fa-images', chip: 'si-purple' },
  { icon: 'fa-solid fa-user-shield', chip: 'si-orange' },
  { icon: 'fa-solid fa-wallet', chip: 'si-green' },
];
let statCardIndex = 0;

function statCard(label, value) {
  const style = STAT_ICON_CYCLE[statCardIndex % STAT_ICON_CYCLE.length];
  statCardIndex += 1;
  return `
    <div class="card stat-card">
      <div class="stat-icon ${style.chip}"><i class="${style.icon}"></i></div>
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
    <a href="#${item.path}" class="card card-hover" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div>
        <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${item.label}</div>
        <div style="font-size:12px; color:var(--color-text-muted);">${item.desc}</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:var(--color-text-muted); font-size:12px; flex-shrink:0;"></i>
    </a>
  `;
}

// ---------------------------------------------------------------------------
// Hero carousel — diambil dari site_settings.homepage.slides (dikelola Owner
// lewat halaman Pengaturan Website). Geser pakai native scroll-snap, jadi
// swipe di HP kerasa natural tanpa library tambahan.
// ---------------------------------------------------------------------------
function heroCarousel(homepage, siteName, isOwner) {
  const slides = Array.isArray(homepage?.slides) ? homepage.slides.filter(s => s?.url) : [];
  const badge = homepage?.badge || siteName;

  if (!slides.length) {
    if (!isOwner) return '';
    return `
      <a href="#/settings" class="card card-hover" style="display:flex; align-items:center; gap:14px; margin-bottom:24px;">
        <div class="stat-icon si-blue" style="margin:0;"><i class="fa-solid fa-images"></i></div>
        <div>
          <div style="font-weight:700; font-size:14px;">Tambahkan foto banner beranda</div>
          <div style="font-size:12px; color:var(--color-text-muted); margin-top:2px;">Buka Pengaturan Website untuk pasang foto yang bisa digeser di halaman ini.</div>
        </div>
      </a>
    `;
  }

  const slideEls = slides.map((s, i) => `
    <div class="hero-slide" style="background-image:url('${s.url}')" data-index="${i}">
      <div class="hero-slide-overlay">
        <span class="hero-badge"><i class="fa-solid fa-star"></i> ${badge}</span>
        ${s.title ? `<h2>${s.title}</h2>` : ''}
        ${s.subtitle ? `<p>${s.subtitle}</p>` : ''}
      </div>
    </div>
  `).join('');

  const dots = slides.map((_, i) => `<button type="button" class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`).join('');

  return `
    <div class="hero-carousel" id="hero-carousel">
      <div class="hero-track" id="hero-track">${slideEls}</div>
      ${slides.length > 1 ? `
        <button type="button" class="hero-nav hero-prev" id="hero-prev" aria-label="Sebelumnya"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" class="hero-nav hero-next" id="hero-next" aria-label="Berikutnya"><i class="fa-solid fa-chevron-right"></i></button>
        <div class="hero-dots" id="hero-dots">${dots}</div>
      ` : ''}
    </div>
  `;
}

function bindHeroCarousel() {
  const track = document.getElementById('hero-track');
  if (!track) return;
  const dots = Array.from(document.querySelectorAll('.hero-dot'));

  const setActive = (index) => {
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  };

  const goTo = (index) => {
    const slide = track.children[index];
    if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
  };

  let scrollTimer;
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      setActive(index);
    }, 80);
  });

  document.getElementById('hero-prev')?.addEventListener('click', () => {
    const index = Math.max(0, Math.round(track.scrollLeft / track.clientWidth) - 1);
    goTo(index);
  });
  document.getElementById('hero-next')?.addEventListener('click', () => {
    const index = Math.min(track.children.length - 1, Math.round(track.scrollLeft / track.clientWidth) + 1);
    goTo(index);
  });
  dots.forEach(dot => dot.addEventListener('click', () => goTo(Number(dot.dataset.index))));

  // Autoplay ringan, berhenti sendiri kalau user lagi interaksi (scroll manual).
  if (track.children.length > 1) {
    let autoplay = setInterval(() => {
      const next = (Math.round(track.scrollLeft / track.clientWidth) + 1) % track.children.length;
      goTo(next);
    }, 5000);
    track.addEventListener('pointerdown', () => clearInterval(autoplay), { once: true });
  }
}

// ---------------------------------------------------------------------------
// Preview "Daftar Siswa" di beranda, dengan pencarian cepat (filter client-side
// dari data yang sudah ke-fetch — tidak nambah request baru per ketikan).
// ---------------------------------------------------------------------------
function studentRow(s) {
  const initials = (s.name || '?').trim().slice(0, 1).toUpperCase();
  return `
    <div class="list-item student-row" data-name="${(s.name || '').toLowerCase()}" data-nisn="${(s.nisn || '').toLowerCase()}" style="display:flex; align-items:center; gap:12px;">
      <div class="org-avatar" style="flex-shrink:0;">${initials}</div>
      <div style="min-width:0;">
        <div class="list-item-title">${s.name}</div>
        <div class="list-item-meta">${s.major || '-'} ${s.nisn ? `· NISN ${s.nisn}` : ''}</div>
      </div>
    </div>
  `;
}

function studentListSection(students) {
  const rows = students.map(studentRow).join('') || '<div class="empty-state">Belum ada data siswa.</div>';
  return `
    <div class="card-header" style="margin-top:28px;">
      <div>
        <h2 class="section-title" style="margin:0;">Daftar Siswa</h2>
        <p style="font-size:12.5px; margin-top:2px;">Temukan teman-teman satu kelas</p>
      </div>
      <a href="#/students" class="btn btn-secondary btn-sm">Lihat Semua</a>
    </div>
    ${students.length ? `
      <div style="position:relative; margin-bottom:14px; max-width:360px;">
        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--color-text-muted); font-size:13px;"></i>
        <input id="student-search" class="input" style="padding-left:38px;" type="search" placeholder="Cari nama / NIS..." />
      </div>
    ` : ''}
    <div class="list-plain" id="student-list">${rows}</div>
  `;
}

function bindStudentSearch() {
  const input = document.getElementById('student-search');
  const list = document.getElementById('student-list');
  if (!input || !list) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    list.querySelectorAll('.student-row').forEach(row => {
      const match = row.dataset.name.includes(q) || row.dataset.nisn.includes(q);
      row.style.display = match ? '' : 'none';
    });
  });
}

export default async function renderDashboardPage(container) {
  statCardIndex = 0;
  const me = await getSession();
  const role = me ? (me.role || 'siswa') : 'guest';
  const perms = me?.permissions || {};
  const canViewKas = role === 'owner' || perms.view_kas;
  const isOwner = role === 'owner';

  const [announcements, schedule, settings, students] = await Promise.all([
    api.get('/api/announcements').catch(() => []),
    api.get('/api/schedule').catch(() => []),
    api.get('/api/settings').catch(() => null),
    me ? api.get('/api/students').catch(() => []) : Promise.resolve([]),
  ]);

  const heroSlides = settings?.homepage?.slides || [];
  let stats = '';
  if (role === 'owner' || role === 'admin') {
    const [albums, users] = await Promise.all([
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
    ${heroCarousel(settings?.homepage, settings?.site_name || 'Class Tekavis', isOwner)}

    <h1 class="section-title" style="font-size:20px; margin-bottom:20px;">
      ${me ? `Selamat datang, ${me.profile?.full_name || 'Pengguna'} 👋` : 'Selamat datang di Class Tekavis 👋'}
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

    ${me ? studentListSection(students.slice(0, 8)) : ''}
  `;

  bindHeroCarousel();
  bindStudentSearch();
}
