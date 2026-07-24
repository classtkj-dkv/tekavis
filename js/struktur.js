import { api } from './apiClient.js';

function memberCard(m) {
  const initials = (m.full_name || 'U').trim().slice(0, 1).toUpperCase();
  return `
    <div class="org-member">
      <div class="org-avatar">${initials}</div>
      <span>${m.full_name || 'Tanpa nama'}</span>
    </div>
  `;
}

function roleCard(role) {
  const members = role.members || [];
  return `
    <div class="card org-role-card">
      <h2 class="org-role-label">${role.label}</h2>
      ${members.length
        ? `<div class="org-member-list">${members.map(memberCard).join('')}</div>`
        : `<p class="empty-state" style="padding:12px 0;">Belum diisi</p>`
      }
    </div>
  `;
}

export default async function renderStrukturPage(container) {
  const structure = await api.get('/api/misc', { resource: 'org-structure' }).catch(() => []);

  container.innerHTML = `
    <h1 class="section-title">Struktur Organisasi</h1>
    <p style="font-size:13px; color:var(--color-text-muted); margin-bottom:16px;">
      Satu jabatan bisa diisi 1 atau lebih orang (misal Sekretaris 1 &amp; Sekretaris 2).
    </p>
    <div class="org-grid">
      ${structure.length ? structure.map(roleCard).join('') : '<div class="empty-state">Belum ada jabatan yang dibuat. Owner bisa menambah lewat halaman Role &amp; Permission.</div>'}
    </div>
  `;
}
