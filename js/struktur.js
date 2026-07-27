import { api } from './apiClient.js';

function memberCard(m, role) {
  const initials = (m.full_name || 'U').trim().slice(0, 1).toUpperCase();
  return `
    <button type="button" class="org-member member-detail-trigger" data-id="${m.id}" data-role-label="${role.label}" style="border:none; background:none; padding:0; cursor:pointer; text-align:left; width:100%;">
      <div class="org-avatar" style="${m.avatar_url ? `background-image:url('${m.avatar_url}'); background-size:cover; background-position:center;` : ''}">${m.avatar_url ? '' : initials}</div>
      <span>${m.full_name || 'Tanpa nama'}</span>
      <i class="fa-solid fa-chevron-right" style="margin-left:auto; color:var(--color-text-muted); font-size:11px;"></i>
    </button>
  `;
}

function roleCard(role, isTop = false) {
  const members = role.members || [];
  return `
    <div class="card org-role-card ${isTop ? 'org-role-top' : ''}">
      <h2 class="org-role-label">${isTop ? '<i class="fa-solid fa-crown" style="color:var(--color-warning); margin-right:6px;"></i>' : ''}${role.label}</h2>
      ${members.length
        ? `<div class="org-member-list">${members.map(m => memberCard(m, role)).join('')}</div>`
        : `<p class="empty-state" style="padding:12px 0;">Belum diisi</p>`
      }
    </div>
  `;
}

export default async function renderStrukturPage(container) {
  const structure = await api.get('/api/misc', { resource: 'org-structure' }).catch(() => []);
  const [top, ...rest] = structure;

  const allMembers = structure.flatMap(role => (role.members || []).map(m => ({ ...m, roleLabel: role.label })));

  container.innerHTML = `
    <h1 class="section-title">Struktur Organisasi</h1>
    <p style="font-size:13px; color:var(--color-text-muted); margin-bottom:16px;">
      Satu jabatan bisa diisi 1 atau lebih orang (misal Sekretaris 1 &amp; Sekretaris 2). Ketuk nama buat lihat profilnya.
    </p>
    ${!structure.length ? '<div class="empty-state">Belum ada jabatan yang dibuat. Owner bisa menambah lewat halaman Role &amp; Permission.</div>' : ''}
    ${top ? `<div style="margin-bottom:16px;">${roleCard(top, true)}</div>` : ''}
    ${rest.length ? `<div class="org-grid">${rest.map(r => roleCard(r)).join('')}</div>` : ''}

    <dialog id="member-detail-dialog" class="modal id-card-modal">
      <div class="modal-content" id="member-detail-body" style="padding:0;"></div>
    </dialog>
  `;

  const dialog = document.getElementById('member-detail-dialog');
  const body = document.getElementById('member-detail-body');

  document.querySelectorAll('.member-detail-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = allMembers.find(x => x.id === btn.dataset.id);
      if (!m) return;
      const initials = (m.full_name || 'U').trim().slice(0, 1).toUpperCase();
      const rows = [
        ['🏷️', 'Nama', m.full_name],
        ['🪪', 'Jabatan', m.roleLabel],
        m.motto ? ['💬', 'Moto', m.motto] : null,
        m.hobby ? ['🎮', 'Hobi', m.hobby] : null,
        m.dream_job ? ['🚀', 'Cita-cita', m.dream_job] : null,
      ].filter(Boolean);

      body.innerHTML = `
        <div class="id-card-photo" style="${m.avatar_url ? `background-image:url('${m.avatar_url}')` : ''}">
          ${!m.avatar_url ? `<span>${initials}</span>` : ''}
          <span class="id-card-major-badge">${m.roleLabel}</span>
          <button type="button" class="icon-btn" onclick="this.closest('dialog').close()" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.4); color:#fff;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="id-card-body">
          <dl class="id-card-fields">
            ${rows.map(([icon, label, value]) => `
              <div class="id-card-row"><dt>${icon} ${label}</dt><dd>${value}</dd></div>
            `).join('')}
          </dl>
        </div>
      `;
      dialog.showModal();
    });
  });
}
