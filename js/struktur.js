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

function roleCard(role, isTop = false) {
  const members = role.members || [];
  return `
    <div class="card org-role-card ${isTop ? 'org-role-top' : ''}">
      <h2 class="org-role-label">${isTop ? '<i class="fa-solid fa-crown" style="color:var(--color-warning); margin-right:6px;"></i>' : ''}${role.label}</h2>
      ${members.length
        ? `<div class="org-member-list">${members.map(memberCard).join('')}</div>`
        : `<p class="empty-state" style="padding:12px 0;">Belum diisi</p>`
      }
    </div>
  `;
}

export default async function renderStrukturPage(container) {
  const structure = await api.get('/api/misc', { resource: 'org-structure' }).catch(() => []);
  const [top, ...rest] = structure;

  container.innerHTML = `
    <h1 class="section-title">Struktur Organisasi</h1>
    <p style="font-size:13px; color:var(--color-text-muted); margin-bottom:16px;">
      Satu jabatan bisa diisi 1 atau lebih orang (misal Sekretaris 1 &amp; Sekretaris 2).
    </p>
    ${!structure.length ? '<div class="empty-state">Belum ada jabatan yang dibuat. Owner bisa menambah lewat halaman Role &amp; Permission.</div>' : ''}
    ${top ? `<div style="margin-bottom:16px;">${roleCard(top, true)}</div>` : ''}
    ${rest.length ? `<div class="org-grid">${rest.map(r => roleCard(r)).join('')}</div>` : ''}
  `;
}
