import { api } from './apiClient.js';
import { getSession } from './session.js';

export default async function renderAnnouncementsPage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_announcements;

  const list = await api.get('/api/announcements').catch(() => []);

  const items = list.map(a => `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-header">
        <h2 style="font-size:16px; margin:0;">${a.is_pinned ? '📌 ' : ''}${a.title}</h2>
        <span class="badge badge-${a.status}">${a.status}</span>
      </div>
      <p>${a.content}</p>
      <div class="card-header" style="margin-top:8px;">
        <div class="list-item-meta">${new Date(a.created_at).toLocaleDateString('id-ID')}</div>
        ${canManage ? `<div>
          <button class="icon-btn edit-announcement-btn" data-id="${a.id}" title="Edit">✏️</button>
          <button class="icon-btn delete-announcement-btn" data-id="${a.id}" title="Hapus">🗑️</button>
        </div>` : ''}
      </div>
    </div>
  `).join('') || '<div class="empty-state">Belum ada pengumuman.</div>';

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Pengumuman</h1>
      ${canManage ? '<button id="add-announcement-btn" class="btn btn-primary">+ Buat Pengumuman</button>' : ''}
    </div>
    ${items}

    <dialog id="add-announcement-dialog" class="modal">
      <form id="add-announcement-form" class="modal-content">
        <h2 class="section-title">Buat Pengumuman</h2>
        <label class="input-label">Judul</label>
        <input class="input" name="title" required />
        <label class="input-label" style="margin-top:10px;">Isi</label>
        <textarea class="input" name="content" rows="4" required></textarea>
        <label class="input-label" style="margin-top:10px;">Status</label>
        <select class="input" name="status">
          <option value="draft">Draft</option>
          <option value="published">Terbitkan Sekarang</option>
        </select>
        <label style="display:flex; align-items:center; gap:8px; margin-top:10px; font-size:13px;">
          <input type="checkbox" name="is_pinned" /> Pin pengumuman ini
        </label>
        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-announcement" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('add-announcement-dialog');
  const form = document.getElementById('add-announcement-form');
  let editingId = null;

  document.getElementById('add-announcement-btn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    dialog.showModal();
  });
  document.getElementById('cancel-add-announcement')?.addEventListener('click', () => dialog.close());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    payload.is_pinned = formData.get('is_pinned') === 'on';
    try {
      if (editingId) {
        await api.patch(`/api/announcements?id=${editingId}`, payload);
      } else {
        await api.post('/api/announcements', payload);
      }
      dialog.close();
      renderAnnouncementsPage(container);
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll('.edit-announcement-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = list.find(x => x.id === btn.dataset.id);
      if (!a) return;
      editingId = a.id;
      form.title.value = a.title;
      form.content.value = a.content;
      form.status.value = a.status;
      form.is_pinned.checked = a.is_pinned;
      dialog.showModal();
    });
  });

  container.querySelectorAll('.delete-announcement-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus pengumuman ini?')) return;
      try {
        await api.delete(`/api/announcements?id=${btn.dataset.id}`);
        renderAnnouncementsPage(container);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
