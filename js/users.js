import { api } from './apiClient.js';

export default async function renderUsersPage(container) {
  const [users, roles] = await Promise.all([
    api.get('/api/users').catch(() => []),
    api.get('/api/roles').catch(() => []),
  ]);

  const roleOptions = (currentRoleName) => roles.map(r => `
    <option value="${r.id}" ${r.name === currentRoleName ? 'selected' : ''} ${r.name === 'owner' ? 'disabled' : ''}>${r.label}</option>
  `).join('');

  const rows = users.map(u => `
    <tr data-user-id="${u.id}">
      <td>${u.full_name || '-'}</td>
      <td>
        ${u.roles?.name === 'owner'
          ? `<span class="badge badge-published">Owner</span>`
          : `<select class="input role-select" style="padding:6px 10px; font-size:12px;">${roleOptions(u.roles?.name)}</select>`
        }
      </td>
    </tr>
  `).join('') || `<tr><td colspan="2" class="empty-state">Belum ada user.</td></tr>`;

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Kelola User &amp; Role</h1>
      <a href="#/roles" class="btn btn-secondary">Atur Permission Role</a>
    </div>
    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Nama</th><th>Role</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const row = e.target.closest('tr');
      const userId = row.dataset.userId;
      try {
        await api.patch('/api/users/role', { user_id: userId, role_id: e.target.value });
      } catch (err) {
        alert(err.message);
        renderUsersPage(container);
      }
    });
  });
}
