import { api } from './apiClient.js';
import { getSession } from './session.js';
import { renderScheduleWeek, bindScheduleWeek } from './scheduleWidget.js';
import { studentDetailDialogHtml, bindStudentDetailClicks } from './studentDetail.js';
import { buildOrgTree, bindMemberDetailClicks } from './struktur.js';
import { SOCIAL_ICONS, socialIconClass } from './socialIcons.js';

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

// Menu cepat dibangun DINAMIS dari permission asli (bukan nama role) — biar
// kartu yang muncul di beranda dijamin nyambung ke fitur yang beneran bisa
// dipakai user itu, sama kayak sidebar. Role custom apapun yang Owner bikin
// otomatis dapet kartu yang sesuai tanpa perlu dihardcode manual.
function buildRolePanel(role, permissions = {}) {
  if (role === 'owner') {
    return [
      { label: 'Kelola User & Role', path: '/users', desc: 'Atur akses dan jabatan seluruh anggota' },
      { label: 'Role & Permission', path: '/roles', desc: 'Kelola jabatan dan hak aksesnya' },
      { label: 'Pengaturan Website', path: '/settings', desc: 'Tema, banner, backup & restore database' },
      { label: 'Activity Log', path: '/activity-log', desc: 'Riwayat aktivitas seluruh sistem' },
    ];
  }

  const panel = [];
  if (permissions.manage_students) panel.push({ label: 'Data Siswa', path: '/students', desc: 'Kelola data siswa kelas' });
  if (permissions.manage_gallery) panel.push({ label: 'Album Kenangan', path: '/albums', desc: 'Kelola galeri & foto kelas' });
  if (permissions.manage_announcements) panel.push({ label: 'Pengumuman', path: '/announcements', desc: 'Buat & kelola pengumuman kelas' });
  if (permissions.manage_schedule) panel.push({ label: 'Jadwal', path: '/schedule', desc: 'Kelola jadwal pelajaran' });

  if (permissions.manage_finance) {
    panel.push({ label: 'Kas', path: '/finance', desc: 'Kelola pemasukan, pengeluaran, dan saldo kas kelas' });
  } else if (permissions.view_kas) {
    panel.push({ label: 'Kas', path: '/finance', desc: 'Lihat saldo dan riwayat transaksi kas kelas' });
  }

  if (role === 'siswa' || role === 'pengunjung') {
    panel.push({ label: 'Profil Saya', path: '/profile', desc: 'Lihat & lengkapi profil kamu' });
  }

  // Role tanpa permission manage_* apapun (Wakil, atau role custom kosong)
  // tetap dikasih pintasan yang masuk akal, bukan kartu kosong.
  if (!panel.length) {
    panel.push({ label: 'Struktur Organisasi', path: '/struktur', desc: 'Lihat susunan pengurus & jabatan kelas' });
    panel.push({ label: 'Pengumuman', path: '/announcements', desc: 'Lihat pengumuman terbaru' });
  }

  return panel;
}

// Widget ringkas struktur organisasi di beranda: Wali Kelas + Ketua/Wakil
// aja (biar gak makan tempat), pakai pairing logic yang sama kayak
// halaman /struktur — otomatis kosong kalau belum ada yang diisi.
function orgPreviewMember(m, roleLabel) {
  const initial = (m.full_name || 'U').trim().slice(0, 1).toUpperCase();
  return `
    <button type="button" class="org-member member-detail-trigger" data-id="${m.id}" data-role-label="${roleLabel}">
      <span class="org-avatar" style="${m.avatar_url ? `background-image:url('${m.avatar_url}'); background-size:cover; background-position:center;` : ''}">${m.avatar_url ? '' : initial}</span>
      <span class="org-member-name">${m.full_name || 'Tanpa nama'}</span>
    </button>
  `;
}

function orgPreviewSection(structure) {
  const tree = buildOrgTree(structure);
  const leaderRoles = (tree.leaderRow || [])
    .filter(Boolean)
    .map(entry => ({ label: entry.role.label, members: [entry.member] }));
  const rows = [tree.top, ...leaderRoles].filter(r => r && r.members?.length);
  if (!rows.length) return '';

  return `
    <div class="card-header" style="margin-top:28px;">
      <h2 class="section-title" style="margin:0;">Struktur Organisasi</h2>
      <a href="#/struktur" class="btn btn-secondary btn-sm">Lihat Semua</a>
    </div>
    <div class="list-plain" style="margin-bottom:24px;">
      ${rows.map(role => `
        <div class="list-item" style="display:flex; flex-direction:column; gap:8px;">
          <span class="list-item-meta" style="text-transform:uppercase; letter-spacing:0.02em;">${role.label}</span>
          ${role.members.map(m => orgPreviewMember(m, role.label)).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Tentang Kami / Visi / Misi — teks bebas dari site_settings.homepage,
// diisi Owner lewat Pengaturan Website. Section-nya otomatis gak muncul
// kalau field-nya kosong.
// ---------------------------------------------------------------------------
function aboutSection(homepage) {
  if (!homepage?.about) return '';
  return `
    <h2 class="section-title">Tentang Kami</h2>
    <div class="card about-card" style="margin-bottom:24px; white-space:pre-line;">${homepage.about}</div>
  `;
}

function visiMisiSection(homepage) {
  const visi = homepage?.visi;
  const misi = homepage?.misi;
  if (!visi && !misi) return '';
  return `
    ${visi ? `
      <h2 class="section-title">Visi</h2>
      <div class="card about-card" style="margin-bottom:24px; white-space:pre-line;">${visi}</div>
    ` : ''}
    ${misi ? `
      <h2 class="section-title">Misi</h2>
      <div class="card about-card" style="margin-bottom:24px; white-space:pre-line;">${misi}</div>
    ` : ''}
  `;
}

// ---------------------------------------------------------------------------
// Kontak / Media Sosial — 2 section terpisah biar identitasnya beda:
// "KONTAK / MEDIA SOSIAL" = akun resmi Class Tekavis, ditampilin sebagai
// kartu (icon + label + link, warna aksen kelas). "DEVELOPER" = section
// beda gaya, tombol "Hubungi Developer" buka modal berisi kontak si
// developer, biar identitas class vs developer gak ketuker.
// ---------------------------------------------------------------------------
function contactClassSection(socialMedia) {
  const entries = Array.isArray(socialMedia?.class) ? socialMedia.class : [];
  if (!entries.length) return '';
  return `
    <h2 class="section-title">Kontak / Media Sosial</h2>
    <p style="font-size:12.5px; margin-bottom:14px;">Akun resmi Class Tekavis — kontak &amp; media sosial kelas.</p>
    <div class="contact-grid" style="margin-bottom:24px;">
      ${entries.map(e => `
        <a href="${e.url}" target="_blank" rel="noopener noreferrer" class="card card-hover contact-card contact-card-class">
          <span class="contact-card-icon"><i class="${socialIconClass(e.icon)}"></i></span>
          <span class="contact-card-label">${e.label || SOCIAL_ICONS[e.icon]?.label || 'Kontak'}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function developerSection(socialMedia) {
  const entries = Array.isArray(socialMedia?.developer) ? socialMedia.developer : [];
  if (!entries.length) return '';
  return `
    <div class="card developer-card-mini" style="margin-bottom:24px;">
      <div class="developer-card-badge"><i class="fa-solid fa-code"></i></div>
      <div class="developer-card-mini-text">
        <div class="developer-card-title">Developed by XREZZKY OFFICIAL</div>
        <p class="developer-card-desc">Pembuat website ini</p>
      </div>
      <button type="button" id="contact-dev-btn" class="btn btn-secondary btn-xs">Hubungi</button>
    </div>

    <dialog id="dev-contact-dialog" class="modal">
      <div class="modal-content">
        <div class="card-header" style="margin-bottom:14px;">
          <h2 class="section-title" style="margin:0; font-size:16px;">Hubungi Developer</h2>
          <button type="button" class="icon-btn" onclick="this.closest('dialog').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="contact-grid">
          ${entries.map(e => `
            <a href="${e.url}" target="_blank" rel="noopener noreferrer" class="card card-hover contact-card contact-card-dev">
              <span class="contact-card-icon"><i class="${socialIconClass(e.icon)}"></i></span>
              <span class="contact-card-label">${e.label || SOCIAL_ICONS[e.icon]?.label || 'Kontak'}</span>
            </a>
          `).join('')}
        </div>
      </div>
    </dialog>
  `;
}

function bindDeveloperContactModal() {
  document.getElementById('contact-dev-btn')?.addEventListener('click', () => {
    document.getElementById('dev-contact-dialog')?.showModal();
  });
}

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
    <div class="hero-slide" data-index="${i}" style="position:relative;width:100%;flex:0 0 100%;overflow:hidden;background:var(--color-bg-2);">
      <img class="hero-slide-img" src="${s.url}" alt="${s.title || badge}" loading="${i === 0 ? 'eager' : 'lazy'}" style="display:block;width:100%;height:auto;" />
      <div class="hero-slide-overlay" style="position:absolute;left:0;right:0;bottom:0;z-index:2;">
        <span class="hero-badge"><i class="fa-solid fa-star"></i> ${badge}</span>
        ${s.title ? `<h2>${s.title}</h2>` : ''}
        ${s.subtitle ? `<p>${s.subtitle}</p>` : ''}
      </div>
    </div>
  `).join('');

  const dots = slides.map((_, i) => `<button type="button" class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`).join('');

  return `
    <div class="hero-carousel" id="hero-carousel" style="position:relative;overflow:hidden;border-radius:20px;margin-bottom:26px;">
      <div class="hero-track" id="hero-track" style="display:flex;align-items:flex-start;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;">${slideEls}</div>
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

  // Autoplay tiap beberapa detik. Begitu user pegang/geser sendiri, berhenti
  // dulu selama 30 detik, abis itu lanjut jalan otomatis lagi (bukan berhenti
  // permanen).
  if (track.children.length > 1) {
    let autoplay = null;
    let resumeTimer = null;

    const startAutoplay = () => {
      clearInterval(autoplay);
      autoplay = setInterval(() => {
        const next = (Math.round(track.scrollLeft / track.clientWidth) + 1) % track.children.length;
        goTo(next);
      }, 4000);
    };

    const pauseThenResume = () => {
      clearInterval(autoplay);
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(startAutoplay, 30000);
    };

    startAutoplay();
    track.addEventListener('pointerdown', pauseThenResume);
  }
}

// ---------------------------------------------------------------------------
// Preview "Daftar Siswa" di beranda — publik (gak wajib login), dengan
// pencarian cepat (filter client-side) dan tap nama buat lihat detail profil.
// ---------------------------------------------------------------------------
function studentCard(s) {
  const initials = (s.name || '?').trim().slice(0, 1).toUpperCase();
  return `
    <div class="student-card" data-name="${(s.name || '').toLowerCase()}" data-nisn="${(s.nisn || '').toLowerCase()}">
      <div class="student-card-photo" style="${s.photo_url ? `background-image:url('${s.photo_url}')` : ''}">
        ${!s.photo_url ? initials : ''}
      </div>
      <div class="student-card-info">
        <span class="student-card-name" title="${s.name}">${s.name}</span>
        <button type="button" class="student-card-menu-btn detail-trigger" data-id="${s.id}" title="Lihat detail">
          <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>
      </div>
    </div>
  `;
}

function studentListSection(students) {
  const cards = students.map(studentCard).join('') || '<div class="empty-state">Belum ada data siswa.</div>';
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
    <div class="student-card-grid" id="student-list">${cards}</div>
    ${studentDetailDialogHtml('dash')}
  `;
}

function bindStudentSearch() {
  const input = document.getElementById('student-search');
  const list = document.getElementById('student-list');
  if (!input || !list) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    list.querySelectorAll('.student-card').forEach(card => {
      const match = card.dataset.name.includes(q) || card.dataset.nisn.includes(q);
      card.style.display = match ? '' : 'none';
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

  const [announcements, schedule, settings, students, albums, orgStructure] = await Promise.all([
    api.get('/api/announcements').catch(() => []),
    api.get('/api/schedule').catch(() => []),
    api.get('/api/settings').catch(() => null),
    api.get('/api/students').catch(() => []), // publik — gak digantungin status login
    api.get('/api/albums').catch(() => []), // publik juga
    api.get('/api/misc', { resource: 'org-structure' }).catch(() => []),
  ]);

  let stats = '';
  if (role === 'owner' || role === 'admin') {
    const users = role === 'owner' ? await api.get('/api/users').catch(() => []) : [];
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

  const rolePanel = me ? buildRolePanel(role, perms) : [];

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

    ${aboutSection(settings?.homepage)}

    <h2 class="section-title">Pengumuman Terbaru</h2>
    <div class="list-plain" style="margin-bottom:24px;">${announcementItems}</div>

    <h2 class="section-title">Jadwal Hari Ini</h2>
    ${renderScheduleWeek(schedule, { canManage: false, idPrefix: 'dash-sched' })}

    ${orgPreviewSection(orgStructure)}

    <div class="card-header" style="margin-top:28px;">
      <div>
        <h2 class="section-title" style="margin:0;">Album Kenangan</h2>
        <p style="font-size:12.5px; margin-top:2px;">Momen &amp; kenangan kelas</p>
      </div>
      <a href="#/albums" class="btn btn-secondary btn-sm">Lihat Semua</a>
    </div>
    ${albums.length ? `
      <div class="album-grid" style="margin-bottom:8px;">
        ${albums.slice(0, 4).map(a => `
          <div class="card card-hover album-card" style="background-image:url('${a.cover_url || ''}');">
            <a href="#/albums/${a.id}" style="position:absolute; inset:0;"></a>
            <div class="album-card-overlay">
              <div class="album-card-name">${a.name}</div>
              <div class="album-card-meta">${a.photos?.[0]?.count ?? 0} foto</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : '<div class="empty-state">Belum ada album.</div>'}

    ${studentListSection(students.slice(0, 8))}

    ${visiMisiSection(settings?.homepage)}
    ${contactClassSection(settings?.social_media)}
    ${developerSection(settings?.social_media)}

    <dialog id="member-detail-dialog" class="modal id-card-modal">
      <div class="modal-content" id="member-detail-body" style="padding:0;"></div>
    </dialog>
  `;

  bindHeroCarousel();
  bindScheduleWeek('dash-sched');
  bindMemberDetailClicks(orgStructure.flatMap(role => (role.members || []).map(m => ({ ...m, roleLabel: role.label }))));
  bindStudentSearch();
  bindStudentDetailClicks('#student-list .detail-trigger', students, 'dash', settings?.contact?.card_footer || settings?.site_name || 'Class Tekavis', Boolean(me && role !== 'pengunjung'));
  bindDeveloperContactModal();
}
