import { api } from './apiClient.js';
import { getSession } from './session.js';

export default async function renderUsersPage(container) {
  const me = await getSession();
  const [users, roles] = await Promise.all([
    api.get('/api/users').catch(() => []),
    api.get('/api/roles').catch(() => []),
  ]);

  const roleOptions = (currentRoleName) => roles.map(r => `
    <option value="${r.id}" ${r.name === currentRoleName ? 'selected' : ''} ${r.name === 'owner' ? 'disabled' : ''}>${r.label}</option>
  `).join('');

  const rows = users.map(u => {
    const isOwnerRow = u.roles?.name === 'owner';
    const isSelf = u.id === me?.id;
    return `
    <tr data-user-id="${u.id}">
      <td>${u.full_name || '-'}${isSelf ? ' <span style="color:var(--color-text-muted); font-size:11px;">(kamu)</span>' : ''}</td>
      <td>
        ${isOwnerRow
          ? `<span class="badge badge-published">Owner</span>`
          : `<select class="input role-select" style="padding:6px 10px; font-size:12px;">${roleOptions(u.roles?.name)}</select>`
        }
      </td>
      <td>
        ${!isOwnerRow && !isSelf ? `<button class="icon-btn delete-user-btn" data-id="${u.id}" title="Hapus user"><i class="fa-solid fa-trash"></i></button>` : ''}
      </td>
    </tr>
  `;
  }).join('') || `<tr><td colspan="3" class="empty-state">Belum ada user.</td></tr>`;

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Kelola User &amp; Role</h1>
      <a href="#/roles" class="btn btn-secondary">Atur Permission Role</a>
    </div>
    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Nama</th><th>Role</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const row = e.target.closest('tr');
      const userId = row.dataset.userId;
      try {
        await api.patch('/api/users', { user_id: userId, role_id: e.target.value });
      } catch (err) {
        alert(err.message);
        renderUsersPage(container);
      }
    });
  });

  container.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus user ini? Akun login-nya akan hilang permanen (data siswa terkait, kalau ada, tetap tersimpan).')) return;
      try {
        await api.delete(`/api/users?id=${btn.dataset.id}`);
        renderUsersPage(container);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
