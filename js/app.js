import { initTheme } from './theme.js';
import { getSession } from './session.js';
import { registerRoute, startRouter, navigate } from './router.js';
import { renderSidebar } from './sidebar.js';
import { renderNavbar, bindNavbarEvents, updateNotifBadge } from './navbar.js';
import { renderBottomNav } from './bottomNav.js';
import { api } from './apiClient.js';
import { subscribeNotifications } from './realtime.js';

const AUTH_ROUTES = ['/login', '/register'];

function registerAppRoutes() {
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
}

async function bootstrap() {
  initTheme();
  registerAppRoutes();

  const app = document.getElementById('app');
  const currentHash = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

  const me = await getSession().catch(() => null);

  if (!me) {
    if (!AUTH_ROUTES.includes(currentHash)) navigate('/login');
    app.innerHTML = '<div id="page-content"></div>';
    startRouter(document.getElementById('page-content'));
    return;
  }

  if (AUTH_ROUTES.includes(currentHash)) navigate('/');

  const settings = await api.get('/api/settings').catch(() => null);
  const siteName = settings?.site_name || 'Sistem Informasi Kelas';

  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(me.role, siteName)}
      <div>
        ${renderNavbar(me.profile)}
        <main class="app-content" id="page-content"></main>
      </div>
      ${renderBottomNav(me.role)}
    </div>
  `;

  bindNavbarEvents({ onSearch: (q) => { if (q) navigate(`/search?q=${encodeURIComponent(q)}`); } });

  window.addEventListener('hashchange', () => {
    document.getElementById('sidebar')?.classList.remove('sidebar-open');
  });

  // Badge notifikasi awal + realtime update (perlu Realtime diaktifkan utk tabel
  // `notifications` di Supabase: Database > Replication).
  api.get('/api/notifications').then(list => {
    updateNotifBadge(list.filter(n => !n.is_read).length);
  }).catch(() => {});

  if (me.profile?.id) {
    subscribeNotifications(me.profile.id, () => {
      const badge = document.getElementById('notif-badge');
      const current = badge && !badge.hidden ? Number(badge.textContent) || 0 : 0;
      updateNotifBadge(current + 1);
    });
  }

  startRouter(document.getElementById('page-content'));
}

document.addEventListener('DOMContentLoaded', bootstrap);
