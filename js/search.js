import { api } from './apiClient.js';

export default async function renderSearchPage(container) {
  const hash = window.location.hash.replace(/^#/, '');
  const query = new URLSearchParams(hash.split('?')[1] || '');
  const q = query.get('q') || '';

  if (!q) {
    container.innerHTML = '<div class="empty-state">Ketik sesuatu di kotak pencarian.</div>';
    return;
  }

  const result = await api.get('/api/misc', { resource: 'search', q }).catch(() => null);
  if (!result) {
    container.innerHTML = '<div class="card">Pencarian gagal.</div>';
    return;
  }

  const section = (title, items, renderItem) => items.length ? `
    <h2 class="section-title" style="margin-top:20px;">${title}</h2>
    <div class="list-plain">${items.map(renderItem).join('')}</div>
  ` : '';

  container.innerHTML = `
    <h1 class="section-title">Hasil pencarian: "${q}"</h1>
    ${section('Siswa', result.students, s => `<div class="list-item">${s.name} · ${s.major}</div>`)}
    ${section('Album', result.albums, a => `<a href="#/albums/${a.id}" class="list-item">${a.name} (${a.month}/${a.year})</a>`)}
    ${section('Foto', result.photos, p => `<a href="#/photos/${p.id}" class="list-item">${p.name}</a>`)}
    ${section('Pengumuman', result.announcements, a => `<div class="list-item">${a.title}</div>`)}
    ${section('Jadwal', result.schedules, s => `<div class="list-item">${s.subject} - ${s.teacher || ''}</div>`)}
    ${!result.students.length && !result.albums.length && !result.photos.length && !result.announcements.length && !result.schedules.length ? '<div class="empty-state">Tidak ada hasil ditemukan.</div>' : ''}
  `;
}
