import { api } from './apiClient.js';

// Daftar permission yang dikenali sistem. Kalau nambah fitur baru yang butuh
// permission baru, tinggal tambahkan key di sini (dan cek di endpoint API terkait).
const PERMISSION_DEFS = [
  { key: 'manage_students', label: 'Kelola Data Siswa' },
  { key: 'manage_gallery', label: 'Kelola Album (buat/edit/hapus album & foto)' },
  { key: 'upload_album', label: 'Upload Foto ke Album' },
  { key: 'manage_announcements', label: 'Kelola Pengumuman' },
  { key: 'manage_schedule', label: 'Kelola Jadwal' },
  { key: 'manage_finance', label: 'Kelola Transaksi Kas' },
  { key: 'view_kas', label: 'Lihat Kas' },
  { key: 'manage_documents', label: 'Kelola Dokumen/Notulen' },
];

function roleCard(role) {
  const isOwner = role.name === 'owner';
  const perms = role.permissions || {};

  const checkboxes = PERMISSION_DEFS.map(p => `
    <label class="permission-item">
      <input type="checkbox" data-key="${p.key}" ${perms[p.key] ? 'checked' : ''} ${isOwner ? 'disabled' : ''} />
      <span>${p.label}</span>
    </label>
  `).join('');

  return `
    <div class="card role-card" data-role-id="${role.id}" data-role-name="${role.name}">
      <div class="card-header">
        <div>
          <h2 style="font-size:15px; margin:0;">${role.label}</h2>
          <span style="font-size:12px; color:var(--color-text-muted);">kode: ${role.name}${isOwner ? ' · akses penuh, tidak bisa diubah' : ''}</span>
        </div>
        ${!role.is_system ? `<button class="icon-btn delete-role-btn" title="Hapus role">🗑️</button>` : ''}
      </div>

      ${isOwner ? '' : `
        <div class="permission-grid">${checkboxes}</div>
        <button class="btn btn-primary save-role-btn" style="margin-top:14px;">Simpan Permission</button>
      `}
    </div>
  `;
}

export default async function renderRolesPage(container) {
  const roles = await api.get('/api/roles').catch(() => []);

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Kelola Role &amp; Permission</h1>
      <button id="add-role-btn" class="btn btn-primary">+ Role Baru</button>
    </div>
    <p style="font-size:13px; color:var(--color-text-muted); margin-bottom:16px;">
      Owner selalu punya akses penuh ke semua fitur. Role lain hanya bisa melakukan aksi sesuai permission yang dicentang di sini.
    </p>

    <div class="role-list">${roles.map(roleCard).join('')}</div>

    <dialog id="add-role-dialog" class="modal">
      <form id="add-role-form" class="modal-content">
        <h2 class="section-title">Role / Jabatan Baru</h2>
        <label class="input-label">Kode Role (huruf kecil, tanpa spasi)</label>
        <input class="input" name="name" placeholder="contoh: humas" required />
        <label class="input-label" style="margin-top:10px;">Nama Tampilan</label>
        <input class="input" name="label" placeholder="contoh: Humas" required />
        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-role" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('add-role-dialog');
  document.getElementById('add-role-btn')?.addEventListener('click', () => dialog.showModal());
  document.getElementById('cancel-add-role')?.addEventListener('click', () => dialog.close());

  document.getElementById('add-role-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.post('/api/roles', payload);
      dialog.close();
      renderRolesPage(container);
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll('.save-role-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.role-card');
      const roleId = card.dataset.roleId;
      const permissions = {};
      card.querySelectorAll('.permission-item input[type="checkbox"]').forEach(cb => {
        permissions[cb.dataset.key] = cb.checked;
      });
      try {
        await api.patch(`/api/roles?id=${roleId}`, { permissions });
        btn.textContent = 'Tersimpan ✓';
        setTimeout(() => { btn.textContent = 'Simpan Permission'; }, 1500);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  container.querySelectorAll('.delete-role-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.role-card');
      if (!confirm(`Hapus role "${card.dataset.roleName}"?`)) return;
      try {
        await api.delete(`/api/roles?id=${card.dataset.roleId}`);
        renderRolesPage(container);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
