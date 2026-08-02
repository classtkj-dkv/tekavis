import { api } from './apiClient.js';
import { getSession } from './session.js';
import { showAlert, showConfirm } from './ui.js';

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
      <div style="display:flex; gap:8px;">
        ${me?.role === 'owner' ? '<button id="add-user-btn" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah User</button>' : ''}
        <a href="#/roles" class="btn btn-secondary">Atur Permission Role</a>
      </div>
    </div>
    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>Nama</th><th>Role</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <dialog id="add-user-dialog" class="modal">
      <form id="add-user-form" class="modal-content">
        <h2 class="section-title">Tambah User Baru</h2>
        <p style="font-size:12px; color:var(--color-text-muted); margin:6px 0 12px;">
          Buat akun buat pengurus/staff (misal Wali Kelas, Ketua, Bendahara) yang belum pernah daftar sendiri.
          Untuk siswa, pakai halaman Data Siswa biar biodatanya lengkap.
        </p>
        <label class="input-label">Nama Lengkap</label>
        <input class="input" name="full_name" required />

        <label class="input-label" style="margin-top:10px;">Gmail (email login)</label>
        <input class="input" type="email" name="email" required />

        <label class="input-label" style="margin-top:10px;">Password</label>
        <input class="input" type="text" name="password" required placeholder="Minimal 6 karakter" />

        <label class="input-label" style="margin-top:10px;">Jabatan / Role</label>
        <select class="input" name="role_id" required>
          ${roles.filter(r => r.name !== 'owner' && r.name !== 'siswa').map(r => `<option value="${r.id}">${r.label}</option>`).join('')}
        </select>

        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-user" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Buat Akun</button>
        </div>
      </form>
    </dialog>
  `;

  const addDialog = document.getElementById('add-user-dialog');
  document.getElementById('add-user-btn')?.addEventListener('click', () => addDialog.showModal());
  document.getElementById('cancel-add-user')?.addEventListener('click', () => addDialog.close());
  document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/api/users', payload);
      addDialog.close();
      renderUsersPage(container);
    } catch (err) {
      await showAlert(err.message);
    }
  });

  container.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const row = e.target.closest('tr');
      const userId = row.dataset.userId;
      try {
        await api.patch('/api/users', { user_id: userId, role_id: e.target.value });
      } catch (err) {
        await showAlert(err.message);
        renderUsersPage(container);
      }
    });
  });

  container.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!(await showConfirm('Hapus user ini? Akun login-nya akan hilang permanen (data siswa terkait, kalau ada, tetap tersimpan).', { okText: 'Ya, hapus', danger: true }))) return;
      try {
        await api.delete(`/api/users?id=${btn.dataset.id}`);
        renderUsersPage(container);
      } catch (err) {
        await showAlert(err.message);
      }
    });
  });
}
