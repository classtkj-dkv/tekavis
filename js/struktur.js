import { api } from './apiClient.js';

// ============================================================
// PAIRING LOGIC — murni di frontend, gak nyentuh data/backend.
// "Ketua" & "Wakil" jadi baris pertama (role bawaan sistem, selalu di
// atas). Buat role lain: SEMUA ANGGOTA (bukan role-nya) dipasangin 2-2
// jadi kotak kiri-kanan — jadi kalau 1 jabatan diisi 2 orang (mis.
// Bendahara: Khoirunnisa & Fathiyah), otomatis kesplit kiri-kanan kayak
// Ketua/Wakil, BUKAN numpuk dalam 1 kotak (itu yang bikin garis vertikal
// jadi panjang lurus kayak salib). Orang yang beneran gak punya pasangan
// (jabatan cuma diisi 1 orang) dikumpulin jadi satu grup di paling bawah,
// ditata berdampingan (wrap), bukan masing-masing dapet baris sendiri.
// ============================================================
function isFilled(role) {
  return !!(role && role.members && role.members.length);
}

function baseLabel(label) {
  return String(label || '').trim().replace(/\s+(2|ii)$/i, '').trim().toLowerCase();
}

export function buildOrgTree(structure) {
  const top = structure.find(r => r.name === 'admin') || null;
  const ketua = structure.find(r => r.name === 'ketua') || null;
  const wakil = structure.find(r => r.name === 'wakil') || null;
  const usedIds = new Set([top, ketua, wakil].filter(Boolean).map(r => r.id));

  const leaderRow = (isFilled(ketua) || isFilled(wakil))
    ? [
        isFilled(ketua) ? { role: ketua, member: ketua.members[0] } : null,
        isFilled(wakil) ? { role: wakil, member: wakil.members[0] } : null,
      ]
    : null;

  const rest = structure.filter(r => !usedIds.has(r.id) && isFilled(r));
  const groups = new Map();
  rest.forEach(r => {
    const key = baseLabel(r.label);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  const pairRows = [];
  const soloEntries = [];
  const seenKeys = new Set();
  rest.forEach(r => {
    const key = baseLabel(r.label);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const group = groups.get(key);
    const entries = group.flatMap(role => role.members.map(m => ({ role, member: m })));
    for (let i = 0; i < entries.length; i += 2) {
      if (entries[i + 1]) pairRows.push([entries[i], entries[i + 1]]);
      else soloEntries.push(entries[i]);
    }
  });

  return { top, leaderRow, pairRows, soloEntries };
}

// ============================================================
// RENDER
// ============================================================
function initials(name) {
  return (name || 'U').trim().slice(0, 1).toUpperCase();
}

function orgMember(m, roleLabel) {
  return `
    <button type="button" class="org-member member-detail-trigger" data-id="${m.id}" data-role-label="${roleLabel}">
      <span class="org-avatar" style="${m.avatar_url ? `background-image:url('${m.avatar_url}'); background-size:cover; background-position:center;` : ''}">${m.avatar_url ? '' : initials(m.full_name)}</span>
      <span class="org-member-name">${m.full_name || 'Tanpa nama'}</span>
    </button>
  `;
}

// Kotak buat 1 orang (role + 1 anggota) — dipakai buat semua node kecuali
// Wali Kelas (yang masih boleh nampung >1 anggota kalau ada).
function orgMemberNode(entry, variant = '') {
  if (!entry) return '';
  const { role, member } = entry;
  return `
    <div class="org-node ${variant}">
      <div class="org-node-label">${role.label}</div>
      <div class="org-node-members">${orgMember(member, role.label)}</div>
    </div>
  `;
}

function orgNode(role, variant = '') {
  if (!isFilled(role)) return '';
  return `
    <div class="org-node ${variant}">
      <div class="org-node-label">${role.label}</div>
      <div class="org-node-members">${role.members.map(m => orgMember(m, role.label)).join('')}</div>
    </div>
  `;
}

// Satu baris = 2 kotak berdampingan (kalau berpasangan) ATAU 1 kotak
// yang nempel di tengah, ngambang di atas garis trunk (kalau solo).
function orgPairRow([a, b]) {
  if (a && b) return orgMemberNode(a) + orgMemberNode(b);
  const solo = a || b;
  if (!solo) return '';
  return `<div class="org-node-solo">${orgMemberNode(solo)}</div>`;
}

export default async function renderStrukturPage(container) {
  const structure = await api.get('/api/misc', { resource: 'org-structure' }).catch(() => []);
  const allMembers = structure.flatMap(role => (role.members || []).map(m => ({ ...m, roleLabel: role.label })));
  const tree = buildOrgTree(structure);
  const hasAnything = isFilled(tree.top) || tree.leaderRow || tree.pairRows.length || tree.soloEntries.length;

  container.innerHTML = `
    <h1 class="section-title">Struktur Organisasi</h1>
    <p style="font-size:13px; color:var(--color-text-muted); margin-bottom:20px;">
      Susunan pengurus kelas. Ketuk nama buat lihat profilnya.
    </p>

    ${!hasAnything ? '<div class="empty-state">Belum ada jabatan yang diisi. Owner bisa menambah lewat halaman Role &amp; Permission, lalu isi anggotanya lewat Kelola User.</div>' : `
      <div class="org-chart">
        ${isFilled(tree.top) ? `
          <div class="org-top-wrap">
            ${orgNode(tree.top, 'org-node-top')}
          </div>
        ` : ''}

        ${tree.leaderRow || tree.pairRows.length || tree.soloEntries.length ? `
          <div class="org-branch">
            ${tree.leaderRow ? orgPairRow(tree.leaderRow) : ''}
            ${tree.pairRows.map(orgPairRow).join('')}
            ${tree.soloEntries.length ? `
              <div class="org-node-solo-group">
                ${tree.soloEntries.map(e => orgMemberNode(e)).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `}

    <dialog id="member-detail-dialog" class="modal id-card-modal">
      <div class="modal-content" id="member-detail-body" style="padding:0;"></div>
    </dialog>
  `;

  bindMemberDetailClicks(allMembers);
}

// Diekspor biar dashboard.js bisa pakai modal detail yang sama persis
// (satu sumber kebenaran buat tampilan kartu ID anggota).
export function bindMemberDetailClicks(allMembers, selector = '.member-detail-trigger') {
  const dialog = document.getElementById('member-detail-dialog');
  const body = document.getElementById('member-detail-body');
  if (!dialog || !body) return;

  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', () => {
      const m = allMembers.find(x => x.id === btn.dataset.id);
      if (!m) return;
      const rows = [
        ['🏷️', 'Nama', m.full_name],
        ['🪪', 'Jabatan', m.roleLabel ?? btn.dataset.roleLabel],
        m.motto ? ['💬', 'Moto', m.motto] : null,
        m.hobby ? ['🎮', 'Hobi', m.hobby] : null,
        m.dream_job ? ['🚀', 'Cita-cita', m.dream_job] : null,
      ].filter(Boolean);

      body.innerHTML = `
        <div class="id-card-photo" style="${m.avatar_url ? `background-image:url('${m.avatar_url}')` : ''}">
          ${!m.avatar_url ? `<span>${initials(m.full_name)}</span>` : ''}
          <span class="id-card-major-badge">${m.roleLabel ?? btn.dataset.roleLabel}</span>
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
