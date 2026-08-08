import { initTheme } from './theme.js';
import { getSession } from './session.js';
import { registerRoute, startRouter, navigate } from './router.js';
import { renderSidebar, updateActiveSidebarLink } from './sidebar.js';
import { renderNavbar, bindNavbarEvents, updateNotifBadge } from './navbar.js';
import { api } from './apiClient.js';
import { subscribeNotifications } from './realtime.js';

const AUTH_ROUTES = ['/login', '/register'];

// Footer: baris copyright (bisa dikustom Owner lewat footer_text) + baris
// "Developed by" yang selalu tampil. Kontak/medsos Class Tekavis & Developer
// sekarang punya section sendiri yang lebih proper di halaman Beranda
// (kartu + modal), jadi footer-nya sengaja disederhanain, gak dobel.
function renderFooter(settings) {
  return `
    <div class="footer-copyright">${settings?.footer_text || `© ${new Date().getFullYear()} CLASS TEKAVIS. All Rights Reserved.`}</div>
    <div class="footer-copyright">Developed by XREZZKY OFFICIAL.</div>
  `;
}

let routesRegistered = false;
let sidebarCloseBound = false;
function registerAppRoutes() {
  if (routesRegistered) return;
  routesRegistered = true;
  registerRoute('/', () => import('./dashboard.js?v=29').then(m => m.default));
  registerRoute('/login', () => import('./login.js?v=29').then(m => m.default));
  registerRoute('/register', () => import('./register.js?v=29').then(m => m.default));
  registerRoute('/students', () => import('./students.js?v=29').then(m => m.default));
  registerRoute('/albums', () => import('./albums.js?v=29').then(m => m.default));
  registerRoute('/albums/:id', () => import('./albumDetail.js?v=29').then(m => m.default));
  registerRoute('/photos/:id', () => import('./photoDetail.js?v=29').then(m => m.default));
  registerRoute('/announcements', () => import('./announcements.js?v=29').then(m => m.default));
  registerRoute('/schedule', () => import('./schedule.js?v=29').then(m => m.default));
  registerRoute('/finance', () => import('./finance.js?v=29').then(m => m.default));
  registerRoute('/settings', () => import('./settings.js?v=29').then(m => m.default));
  registerRoute('/profile', () => import('./profile.js?v=29').then(m => m.default));
  registerRoute('/notifications', () => import('./notifications.js?v=29').then(m => m.default));
  registerRoute('/activity-log', () => import('./activityLog.js?v=29').then(m => m.default));
  registerRoute('/users', () => import('./users.js?v=29').then(m => m.default));
  registerRoute('/roles', () => import('./roles.js?v=29').then(m => m.default));
  registerRoute('/search', () => import('./search.js?v=29').then(m => m.default));
  registerRoute('/struktur', () => import('./struktur.js?v=29').then(m => m.default));
  registerRoute('/absensi', () => import('./attendance.js?v=29').then(m => m.default));
}

async function bootstrap() {
  const app = document.getElementById('app');
  try {
    initTheme();
    registerAppRoutes();

    const currentHash = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

    const me = await getSession().catch((err) => {
      console.error('getSession gagal:', err);
      return null;
    });

    // Halaman login/register selalu ditampilkan polos (tanpa shell), baik sudah
    // login maupun belum — kalau sudah login dan buka /login, lempar ke dashboard.
    if (AUTH_ROUTES.includes(currentHash)) {
      if (me) navigate('/');
      app.innerHTML = '<div id="page-content"></div>';
      startRouter(document.getElementById('page-content'));
      return;
    }

    // Tidak wajib login untuk melihat halaman lain — kalau belum login, tetap
    // tampilkan shell & halamannya (data yang butuh izin akan otomatis kosong,
    // ditangani masing-masing halaman lewat .catch(() => [])).
    const settings = await api.get('/api/settings').catch(() => null);
    const siteName = settings?.site_name || 'Class Tekavis';

    if (settings?.favicon_url) {
      let iconLink = document.querySelector('link[rel="icon"]');
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = settings.favicon_url;
    }
    // FIX: sebelumnya `me?.role || 'guest'` nyamain dua kondisi beda — "belum
    // login" (me null) VS "sudah login tapi role-nya null" (me ada, me.role
    // null, misal row profiles belum sempat kebuat). Keduanya kefallback ke
    // 'guest' dan bikin user yang SEBENARNYA login keliatan kayak guest
    // (nongol menu "Masuk/Daftar" walau session-nya valid). Sekarang dibedain:
    // cuma bener-bener 'guest' kalau memang belum ada sesi sama sekali.
    const role = me ? (me.role || 'siswa') : 'guest';

    app.innerHTML = `
      <div class="app-shell">
        ${renderSidebar(role, siteName, settings?.logo_url, me?.permissions)}
        <div class="app-main">
          ${renderNavbar(me?.profile, me?.email)}
          <main class="app-content" id="page-content"></main>
          <footer class="app-footer">
            ${renderFooter(settings)}
          </footer>
        </div>
      </div>
    `;

    bindNavbarEvents();

    if (!sidebarCloseBound) {
      sidebarCloseBound = true;
      window.addEventListener('hashchange', () => {
        document.getElementById('sidebar')?.classList.remove('sidebar-open');
        updateActiveSidebarLink();
      });
      // FIX: 'hashchange' gak nyala kalau user nge-tap link ke halaman yang
      // SEDANG aktif (hash-nya emang gak berubah) — jadi di HP sidebar-nya
      // kesangkut kebuka. Ini nutup sidebar langsung pas link mana pun
      // ditekan, gak nunggu hashchange.
      document.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar-link')) {
          document.getElementById('sidebar')?.classList.remove('sidebar-open');
        }
      });

      // Tap di luar sidebar (area backdrop gelap) buat nutup drawer di
      // mobile — sebelumnya cuma bisa ditutup lewat tombol hamburger lagi
      // atau nge-klik link, jadi berasa gak natural buat pola mobile.
      document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar?.classList.contains('sidebar-open')) return;
        if (e.target.closest('#sidebar') || e.target.closest('#sidebar-toggle')) return;
        sidebar.classList.remove('sidebar-open');
      });
    }

    if (me) {
      // Badge notifikasi awal + realtime update (perlu Realtime diaktifkan utk tabel
      // `notifications` di Supabase: Database > Replication).
      api.get('/api/misc', { resource: 'notifications' }).then(list => {
        updateNotifBadge(list.filter(n => !n.is_read).length);
      }).catch(() => {});

      if (me.profile?.id) {
        subscribeNotifications(me.profile.id, () => {
          const badge = document.getElementById('notif-badge');
          const current = badge && !badge.hidden ? Number(badge.textContent) || 0 : 0;
          updateNotifBadge(current + 1);
        });
      }
    }

    startRouter(document.getElementById('page-content'));
  } catch (err) {
    // Sengaja ditangkap di sini: kalau ada apapun yang gagal di luar dugaan,
    // tampilkan pesannya daripada nyisain layar putih kosong tanpa penjelasan.
    console.error('Bootstrap gagal:', err);
    app.innerHTML = `
      <div style="max-width:420px; margin:60px auto; padding:20px; font-family:system-ui, sans-serif;">
        <h1 style="font-size:18px; margin-bottom:8px;">Gagal memuat aplikasi</h1>
        <p style="font-size:13px; color:#4B5563; margin-bottom:12px;">${err?.message || 'Terjadi kesalahan tak terduga.'}</p>
        <button onclick="window.location.reload()" style="padding:8px 16px; border-radius:8px; border:none; background:#4F6EF7; color:#fff; cursor:pointer;">Muat Ulang</button>
      </div>
    `;
  }
}

export async function restartApp() {
  return bootstrap();
}

document.addEventListener('DOMContentLoaded', bootstrap);
