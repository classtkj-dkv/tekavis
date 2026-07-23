import { api } from './apiClient.js';
import { getSession } from './session.js';
import { navigate } from './router.js';

export default async function renderPhotoDetailPage(container, { id }) {
  const me = await getSession();
  const canManage = me?.role === 'owner' || me?.permissions?.manage_gallery;

  const photo = await api.get(`/api/photos?id=${id}`).catch(() => null);
  if (!photo) {
    container.innerHTML = '<div class="card">Foto tidak ditemukan.</div>';
    return;
  }

  container.innerHTML = `
    <a href="#/albums/${photo.album_id}" style="font-size:13px; color:var(--color-text-muted);">&larr; Kembali ke Album</a>
    <div class="photo-detail" style="margin-top:12px;">
      <img src="${photo.url}" alt="${photo.name}" class="photo-detail-img" />
      <div class="card photo-detail-info">
        <div class="card-header">
          <h1 class="section-title" style="margin:0;">${photo.name}</h1>
          ${canManage ? `<button id="delete-photo-btn" class="btn btn-danger" style="padding:6px 12px; font-size:12px;">Hapus</button>` : ''}
        </div>
        <dl class="detail-list">
          <dt>Album</dt><dd>${photo.albums?.name || '-'}</dd>
          <dt>Tanggal</dt><dd>${new Date(photo.taken_or_uploaded_at).toLocaleDateString('id-ID')}</dd>
          <dt>Lokasi</dt><dd>${photo.location || '-'}</dd>
          <dt>Kategori</dt><dd>${photo.category || '-'}</dd>
          <dt>Tag</dt><dd>${(photo.tags || []).join(', ') || '-'}</dd>
          <dt>Deskripsi</dt><dd>${photo.description || '-'}</dd>
        </dl>
      </div>
    </div>
  `;

  document.getElementById('delete-photo-btn')?.addEventListener('click', async () => {
    if (!confirm('Hapus foto ini secara permanen?')) return;
    try {
      await api.delete(`/api/photos?id=${id}`);
      navigate(`/albums/${photo.album_id}`);
    } catch (err) {
      alert(err.message);
    }
  });
}
