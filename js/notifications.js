import { api } from './apiClient.js';

export default async function renderNotificationsPage(container) {
  const list = await api.get('/api/misc', { resource: 'notifications' }).catch(() => []);

  const items = list.map(n => `
    <div class="list-item" style="${n.is_read ? '' : 'border-left:3px solid var(--color-accent);'}">
      <div class="list-item-title">${n.title}</div>
      <div class="list-item-meta">${n.body || ''} · ${new Date(n.created_at).toLocaleString('id-ID')}</div>
    </div>
  `).join('') || '<div class="empty-state">Belum ada notifikasi.</div>';

  container.innerHTML = `
    <h1 class="section-title">Notifikasi</h1>
    <div class="list-plain">${items}</div>
  `;

  const unreadIds = list.filter(n => !n.is_read).map(n => n.id);
  if (unreadIds.length) api.patch('/api/misc?resource=notifications', { ids: unreadIds }).catch(() => {});
}
