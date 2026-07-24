import { api } from './apiClient.js';

export default async function renderActivityLogPage(container) {
  const logs = await api.get('/api/misc', { resource: 'activity-log' }).catch(() => []);

  const rows = logs.map(l => `
    <tr>
      <td>${new Date(l.created_at).toLocaleString('id-ID')}</td>
      <td>${l.role_name || '-'}</td>
      <td>${l.action}</td>
      <td>${l.target_table || '-'}</td>
      <td>${l.ip_address || '-'}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="empty-state">Belum ada aktivitas tercatat.</td></tr>`;

  container.innerHTML = `
    <h1 class="section-title">Activity Log</h1>
    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Waktu</th><th>Role</th><th>Aksi</th><th>Target</th><th>IP</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
