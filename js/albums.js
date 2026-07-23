import { api } from './apiClient.js';
import { getSession } from './session.js';

export default async function renderAlbumsPage(container) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_gallery;

  const albums = await api.get('/api/albums').catch(() => []);

  const grouped = {};
  albums.forEach(a => {
    grouped[a.year] = grouped[a.year] || {};
    grouped[a.year][a.month] = grouped[a.year][a.month] || [];
    grouped[a.year][a.month].push(a);
  });

  const monthName = (m) => ['', 'Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][m];

  let html = '';
  Object.keys(grouped).sort((a, b) => b - a).forEach(year => {
    html += `<h2 class="section-title" style="margin-top:24px;">${year}</h2>`;
    Object.keys(grouped[year]).sort((a, b) => b - a).forEach(month => {
      html += `<h3 style="font-size:14px; color:var(--color-text-muted); margin: 10px 0;">${monthName(month)}</h3>`;
      html += `<div class="album-grid">`;
      grouped[year][month].forEach(album => {
        const count = album.photos?.[0]?.count ?? 0;
        html += `
          <div class="card card-hover album-card" style="background-image:url('${album.cover_url || ''}'); position:relative;">
            <a href="#/albums/${album.id}" style="position:absolute; inset:0;"></a>
            <div class="album-card-overlay">
              <div class="album-card-name">${album.name}</div>
              <div class="album-card-meta">${count} foto</div>
            </div>
            ${canManage ? `
              <div style="position:absolute; top:8px; right:8px; z-index:2;">
                <button class="icon-btn edit-album-btn" data-id="${album.id}" title="Edit" style="background:rgba(255,255,255,0.85); border-radius:6px;">✏️</button>
                <button class="icon-btn delete-album-btn" data-id="${album.id}" title="Hapus" style="background:rgba(255,255,255,0.85); border-radius:6px;">🗑️</button>
              </div>
            ` : ''}
          </div>
        `;
      });
      html += `</div>`;
    });
  });

  container.innerHTML = `
    <div class="card-header">
      <h1 class="section-title" style="margin:0;">Album Kenangan</h1>
      ${canManage ? '<button id="add-album-btn" class="btn btn-primary">+ Album Baru</button>' : ''}
    </div>
    ${html || '<div class="empty-state">Belum ada album.</div>'}

    <dialog id="add-album-dialog" class="modal">
      <form id="add-album-form" class="modal-content">
        <h2 class="section-title">Album Baru</h2>
        <label class="input-label">Nama Album</label>
        <input class="input" name="name" required />
        <label class="input-label" style="margin-top:10px;">Deskripsi</label>
        <textarea class="input" name="description" rows="2"></textarea>
        <label class="input-label" style="margin-top:10px;">URL Cover (opsional)</label>
        <input class="input" name="cover_url" />
        <div style="display:flex; gap:10px; margin-top:10px;">
          <div style="flex:1;">
            <label class="input-label">Tahun</label>
            <input class="input" type="number" name="year" required />
          </div>
          <div style="flex:1;">
            <label class="input-label">Bulan (1-12)</label>
            <input class="input" type="number" min="1" max="12" name="month" required />
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-add-album" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('add-album-dialog');
  const form = document.getElementById('add-album-form');
  let editingId = null;

  document.getElementById('add-album-btn')?.addEventListener('click', () => {
    editingId = null;
    form.reset();
    dialog.showModal();
  });
  document.getElementById('cancel-add-album')?.addEventListener('click', () => dialog.close());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    payload.year = Number(payload.year);
    payload.month = Number(payload.month);
    try {
      if (editingId) {
        await api.patch(`/api/albums?id=${editingId}`, payload);
      } else {
        await api.post('/api/albums', payload);
      }
      dialog.close();
      renderAlbumsPage(container);
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll('.edit-album-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const album = albums.find(x => x.id === btn.dataset.id);
      if (!album) return;
      editingId = album.id;
      form.name.value = album.name;
      form.description.value = album.description || '';
      form.cover_url.value = album.cover_url || '';
      form.year.value = album.year;
      form.month.value = album.month;
      dialog.showModal();
    });
  });

  container.querySelectorAll('.delete-album-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('Hapus album ini beserta seluruh fotonya?')) return;
      try {
        await api.delete(`/api/albums?id=${btn.dataset.id}`);
        renderAlbumsPage(container);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
