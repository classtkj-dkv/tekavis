import { api } from './apiClient.js';
import { getSession, clearSessionCache } from './session.js';

export default async function renderProfilePage(container) {
  const me = await getSession();

  if (!me) {
    container.innerHTML = `
      <h1 class="section-title">Profil Saya</h1>
      <div class="card">
        <p>Kamu belum masuk. <a href="#/login" style="color:var(--color-primary); font-weight:600;">Masuk / Daftar</a> untuk melihat dan mengatur profilmu.</p>
      </div>
    `;
    return;
  }

  const p = me.profile || {};
  const s = me.student || null; // hanya terisi kalau rolenya 'siswa'

  // Field terkunci (dikelola Admin/Owner lewat data siswa) — tampil apa adanya, tidak bisa diedit di sini.
  const lockedFields = s ? [
    ['Nama', s.name],
    ['NISN', s.nisn],
    ['Tempat, Tgl Lahir', `${s.birth_place}, ${new Date(s.birth_date).toLocaleDateString('id-ID')}`],
    ['Jurusan', s.major],
  ].filter(([, value]) => value) : [
    ['Nama', p.full_name],
  ];

  container.innerHTML = `
    <h1 class="section-title">Profil Saya</h1>
    <div class="card profile-card">
      <div class="profile-avatar">${(s?.name || p.full_name || me.email || 'U').slice(0,1).toUpperCase()}</div>
      <div style="flex:1;">
        <dl class="detail-list">
          ${lockedFields.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}
          <dt>Email</dt><dd>${me.email}</dd>
        </dl>
      </div>
    </div>

    <div class="card-header" style="margin-top:20px;">
      <h2 class="section-title" style="margin:0; font-size:16px;">Moto, Hobi &amp; Cita-cita</h2>
      <button id="edit-optional-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-pen"></i> Edit</button>
    </div>

    <div class="card" id="optional-view">
      <dl class="detail-list">
        ${[['Moto', p.motto], ['Hobi', p.hobby], ['Cita-cita', p.dream_job]].filter(([, v]) => v).map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('') || '<dd style="color:var(--color-text-muted);">Belum diisi. Klik "Edit" untuk menambahkan.</dd>'}
      </dl>
    </div>

    <form id="optional-form" class="card" style="display:none;">
      <label class="input-label">Moto (opsional)</label>
      <input class="input" name="motto" value="${p.motto || ''}" placeholder="Kata-kata favoritmu" />

      <label class="input-label" style="margin-top:12px;">Hobi (opsional)</label>
      <input class="input" name="hobby" value="${p.hobby || ''}" placeholder="Contoh: Membaca, Futsal" />

      <label class="input-label" style="margin-top:12px;">Cita-cita (opsional)</label>
      <input class="input" name="dream_job" value="${p.dream_job || ''}" placeholder="Contoh: Software Engineer" />

      <div style="display:flex; gap:10px; margin-top:16px;">
        <button type="button" id="cancel-optional" class="btn btn-secondary" style="flex:1;">Batal</button>
        <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
      </div>
    </form>
  `;

  const viewEl = document.getElementById('optional-view');
  const formEl = document.getElementById('optional-form');

  document.getElementById('edit-optional-btn')?.addEventListener('click', () => {
    viewEl.style.display = 'none';
    formEl.style.display = 'block';
  });
  document.getElementById('cancel-optional')?.addEventListener('click', () => {
    formEl.style.display = 'none';
    viewEl.style.display = 'block';
  });

  formEl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.patch('/api/auth', payload);
      clearSessionCache();
      renderProfilePage(container);
    } catch (err) {
      alert(err.message);
    }
  });
}
