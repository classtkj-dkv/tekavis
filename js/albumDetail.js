import { api } from './apiClient.js';
import { getSession } from './session.js';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default async function renderAlbumDetailPage(container, { id }) {
  const me = await getSession();
  const canUpload = me?.role === 'owner' || me?.permissions?.upload_album;

  const album = await api.get(`/api/albums?id=${id}`).catch(() => null);
  if (!album) {
    container.innerHTML = '<div class="card">Album tidak ditemukan.</div>';
    return;
  }

  const photoCards = (album.photos || []).map(p => `
    <a href="#/photos/${p.id}" class="photo-thumb" style="background-image:url('${p.url}')"></a>
  `).join('') || '<div class="empty-state">Belum ada foto di album ini.</div>';

  container.innerHTML = `
    <a href="#/albums" style="font-size:13px; color:var(--color-text-muted);">&larr; Kembali ke Album</a>
    <div class="card-header" style="margin-top:10px;">
      <div>
        <h1 class="section-title" style="margin:0;">${album.name}</h1>
        <p style="font-size:13px; margin-top:4px;">${album.description || ''}</p>
      </div>
      ${canUpload ? '<button id="upload-photo-btn" class="btn btn-primary">+ Upload Foto</button>' : ''}
    </div>

    <div class="photo-grid">${photoCards}</div>

    <dialog id="upload-photo-dialog" class="modal">
      <form id="upload-photo-form" class="modal-content">
        <h2 class="section-title">Upload Foto</h2>
        <label class="input-label">File Foto</label>
        <input class="input" type="file" name="file" accept="image/*" required />
        <label class="input-label" style="margin-top:10px;">Nama Foto</label>
        <input class="input" name="name" required />
        <label class="input-label" style="margin-top:10px;">Kategori</label>
        <input class="input" name="category" />
        <label class="input-label" style="margin-top:10px;">Lokasi</label>
        <input class="input" name="location" />
        <label class="input-label" style="margin-top:10px;">Tag (pisahkan koma)</label>
        <input class="input" name="tags" />
        <label class="input-label" style="margin-top:10px;">Deskripsi</label>
        <textarea class="input" name="description" rows="2"></textarea>
        <div style="display:flex; gap:10px; margin-top:18px;">
          <button type="button" id="cancel-upload-photo" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Upload</button>
        </div>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('upload-photo-dialog');
  document.getElementById('upload-photo-btn')?.addEventListener('click', () => dialog.showModal());
  document.getElementById('cancel-upload-photo')?.addEventListener('click', () => dialog.close());

  document.getElementById('upload-photo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('[name="file"]');
    const file = fileInput.files[0];
    if (!file) return;

    const base64 = await fileToBase64(file);
    const payload = {
      file: base64,
      album_id: id,
      name: form.name.value,
      category: form.category.value,
      location: form.location.value,
      tags: form.tags.value ? form.tags.value.split(',').map(t => t.trim()) : [],
      description: form.description.value,
    };

    try {
      await api.post('/api/photos', payload);
      dialog.close();
      renderAlbumDetailPage(container, { id });
    } catch (err) {
      alert(err.message);
    }
  });
}
