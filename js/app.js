import { initTheme } from './theme.js';
import { getSession } from './session.js';
import { registerRoute, startRouter, navigate } from './router.js';
import { renderSidebar, updateActiveSidebarLink } from './sidebar.js';
import { renderNavbar, bindNavbarEvents, updateNotifBadge } from './navbar.js';
import { api } from './apiClient.js';
import { subscribeNotifications } from './realtime.js';

const AUTH_ROUTES = ['/login', '/register'];

let routesRegistered = false;
let sidebarCloseBound = false;
function registerAppRoutes() {
  if (routesRegistered) return;
  routesRegistered = true;
  registerRoute('/', () => import('./dashboard.js').then(m => m.default));
  registerRoute('/login', () => import('./login.js').then(m => m.default));
  registerRoute('/register', () => import('./register.js').then(m => m.default));
  registerRoute('/students', () => import('./students.js').then(m => m.default));
  registerRoute('/albums', () => import('./albums.js').then(m => m.default));
  registerRoute('/albums/:id', () => import('./albumDetail.js').then(m => m.default));
  registerRoute('/photos/:id', () => import('./photoDetail.js').then(m => m.default));
  registerRoute('/announcements', () => import('./announcements.js').then(m => m.default));
  registerRoute('/schedule', () => import('./schedule.js').then(m => m.default));
  registerRoute('/finance', () => import('./finance.js').then(m => m.default));
  registerRoute('/settings', () => import('./settings.js').then(m => m.default));
  registerRoute('/profile', () => import('./profile.js').then(m => m.default));
  registerRoute('/notifications', () => import('./notifications.js').then(m => m.default));
  registerRoute('/activity-log', () => import('./activityLog.js').then(m => m.default));
  registerRoute('/users', () => import('./users.js').then(m => m.default));
  registerRoute('/roles', () => import('./roles.js').then(m => m.default));
  registerRoute('/search', () => import('./search.js').then(m => m.default));
  registerRoute('/struktur', () => import('./struktur.js').then(m => m.default));
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
    const siteName = settings?.site_name || 'Sistem Informasi Kelas';
    // FIX: sebelumnya `me?.role || 'guest'` nyamain dua kondisi beda — "belum
    // login" (me null) VS "sudah login tapi role-nya null" (me ada, me.role
    // null, misal row profiles belum sempat kebuat). Keduanya kefallback ke
    // 'guest' dan bikin user yang SEBENARNYA login keliatan kayak guest
    // (nongol menu "Masuk/Daftar" walau session-nya valid). Sekarang dibedain:
    // cuma bener-bener 'guest' kalau memang belum ada sesi sama sekali.
    const role = me ? (me.role || 'siswa') : 'guest';

    app.innerHTML = `
      <div class="app-shell">
        ${renderSidebar(role, siteName)}
        <div>
          ${renderNavbar(me?.profile, me?.email)}
          <main class="app-content" id="page-content"></main>
        </div>
      </div>
    `;

    bindNavbarEvents({ onSearch: (q) => { if (q) navigate(`/search?q=${encodeURIComponent(q)}`); } });

    if (!sidebarCloseBound) {
      sidebarCloseBound = true;
      window.addEventListener('hashchange', () => {
        document.getElementById('sidebar')?.classList.remove('sidebar-open');
        updateActiveSidebarLink();
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
        <button onclick="window.location.reload()" style="padding:8px 16px; border-radius:8px; border:none; background:#1E3A5F; color:#fff; cursor:pointer;">Muat Ulang</button>
      </div>
    `;
  }
}

export async function restartApp() {
  return bootstrap();
}

document.addEventListener('DOMContentLoaded', bootstrap);
