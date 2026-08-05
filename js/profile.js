import { api } from './apiClient.js';
import { getSession, clearSessionCache } from './session.js';
import { showAlert, showConfirm } from './ui.js';
import { supabase } from './supabaseClient.js';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

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
  const perms = me.permissions || {};
  const photoUrl = s?.photo_url || p.avatar_url || '';
  const attendance = s ? await api.get('/api/attendance', { resource: 'summary', student_id: s.id }).catch(() => null) : null;

  // Field data siswa: NISN / TTL / Jurusan bisa jadi read-only ATAU editable,
  // tergantung permission self_edit_nisn/self_edit_birth/self_edit_major yang
  // Owner set per role di halaman Role & Permission. Kalau izinnya OFF, field
  // itu cuma tampil apa adanya (gak ada tombol edit sama sekali).
  const editableFields = s ? [
    { key: 'nisn', label: 'NISN', value: s.nisn, editable: Boolean(perms.self_edit_nisn), type: 'text' },
    { key: 'birth', label: 'Tempat, Tgl Lahir', value: (s.birth_place || s.birth_date) ? `${s.birth_place || '-'}, ${s.birth_date ? new Date(s.birth_date).toLocaleDateString('id-ID') : '-'}` : null, editable: Boolean(perms.self_edit_birth), type: 'birth' },
    { key: 'major', label: 'Jurusan', value: s.major, editable: Boolean(perms.self_edit_major), type: 'text' },
  ] : [];
  const anyStudentFieldEditable = editableFields.some(f => f.editable);

  container.innerHTML = `
    <h1 class="section-title">Profil Saya</h1>
    <div class="card profile-card">
      <div style="position:relative; flex-shrink:0;">
        <div class="profile-avatar" id="profile-avatar-preview" style="${photoUrl ? 'background:none; padding:0; overflow:hidden;' : ''}">
          ${photoUrl ? `<img src="${photoUrl}" alt="Foto profil" style="width:100%; height:100%; object-fit:cover;" />` : (s?.name || p.full_name || me.email || 'U').slice(0,1).toUpperCase()}
        </div>
        <label class="icon-btn" style="position:absolute; bottom:-4px; right:-4px; background:var(--color-primary); color:#fff; cursor:pointer;" title="Ganti foto">
          <i class="fa-solid fa-camera"></i>
          <input type="file" accept="image/*" id="photo-file" style="display:none;" />
        </label>
      </div>
      <div style="flex:1; min-width:0;">
        <dl class="detail-list">
          <dt>Nama</dt><dd>${s?.name || p.full_name || '-'}</dd>
          ${editableFields.map(f => f.value ? `<dt>${f.label}</dt><dd>${f.value}</dd>` : '').join('')}
        </dl>
        <span id="photo-status" style="font-size:11px; color:var(--color-text-muted); display:block; margin-top:6px;"></span>
      </div>
    </div>

    ${anyStudentFieldEditable ? `
      <div class="card-header" style="margin-top:20px;">
        <h2 class="section-title" style="margin:0; font-size:16px;">Data Siswa</h2>
        <button id="edit-student-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-pen"></i> Edit</button>
      </div>
      <p style="font-size:11.5px; margin-bottom:8px;">Field yang bisa kamu ubah sendiri sesuai izin dari Owner. Field lain tetap dikelola Admin/Owner.</p>
      <form id="student-form" class="card" style="display:none;">
        ${editableFields.filter(f => f.editable && f.type === 'text').map(f => `
          <label class="input-label">${f.label}</label>
          <input class="input" name="${f.key}" value="${s[f.key] || ''}" style="margin-bottom:12px;" />
        `).join('')}
        ${editableFields.find(f => f.key === 'birth' && f.editable) ? `
          <label class="input-label">Tempat Lahir</label>
          <input class="input" name="birth_place" value="${s.birth_place || ''}" style="margin-bottom:12px;" />
          <label class="input-label">Tanggal Lahir</label>
          <input class="input" type="date" name="birth_date" value="${s.birth_date || ''}" style="margin-bottom:12px;" />
        ` : ''}
        <div style="display:flex; gap:10px; margin-top:6px;">
          <button type="button" id="cancel-student-edit" class="btn btn-secondary" style="flex:1;">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Simpan</button>
        </div>
        <span id="student-form-status" style="font-size:12px; color:var(--color-text-muted); display:block; margin-top:8px;"></span>
      </form>
    ` : ''}

    ${(perms.self_edit_email || perms.self_edit_password) ? `
      <h2 class="section-title" style="margin-top:20px;">Akun &amp; Keamanan</h2>
      <div class="card" style="display:flex; flex-direction:column; gap:16px;">
        ${perms.self_edit_email ? `
          <div>
            <label class="input-label">Email saat ini: ${me.email}</label>
            <div style="display:flex; gap:8px; margin-top:6px;">
              <input class="input" type="email" id="new-email" placeholder="Email baru" />
              <button type="button" id="change-email-btn" class="btn btn-secondary" style="flex-shrink:0;">Ganti Email</button>
            </div>
            <span id="email-status" style="font-size:11.5px; color:var(--color-text-muted); display:block; margin-top:6px;"></span>
          </div>
        ` : ''}
        ${perms.self_edit_password ? `
          <div>
            <label class="input-label">Password Baru</label>
            <div style="display:flex; gap:8px; margin-top:6px;">
              <input class="input" type="password" id="new-password" placeholder="Minimal 6 karakter" autocomplete="new-password" />
              <button type="button" id="change-password-btn" class="btn btn-secondary" style="flex-shrink:0;">Ganti Password</button>
            </div>
            <span id="password-status" style="font-size:11.5px; color:var(--color-text-muted); display:block; margin-top:6px;"></span>
          </div>
        ` : ''}
      </div>
    ` : ''}

    ${attendance ? `
      <h2 class="section-title" style="margin-top:20px;">Rekap Absensi</h2>
      <div class="stat-grid" style="margin-bottom:16px;">
        <div class="card stat-card"><span class="stat-value" style="color:var(--color-success);">${attendance.hadir}</span><span class="stat-label">Hadir</span></div>
        <div class="card stat-card"><span class="stat-value" style="color:var(--color-info);">${attendance.sakit}</span><span class="stat-label">Sakit</span></div>
        <div class="card stat-card"><span class="stat-value" style="color:var(--color-warning);">${attendance.izin}</span><span class="stat-label">Izin</span></div>
        <div class="card stat-card"><span class="stat-value" style="color:var(--color-danger);">${attendance.alpa}</span><span class="stat-label">Alpa</span></div>
      </div>

      <div class="card" style="max-width:420px; margin-bottom:16px;">
        <label class="input-label">Rekap per Rentang Tanggal</label>
        <div style="display:flex; gap:10px; margin:8px 0 12px;">
          <input type="date" class="input" id="self-recap-from" />
          <input type="date" class="input" id="self-recap-to" value="${new Date().toISOString().slice(0,10)}" />
        </div>
        <button type="button" id="self-recap-btn" class="btn btn-secondary btn-sm">Buat Rekap</button>
        <div id="self-recap-result" style="display:none; margin-top:14px;">
          <div class="stat-grid">
            <div class="card stat-card"><span class="stat-value" id="self-recap-hadir" style="color:var(--color-success);">0</span><span class="stat-label">Hadir</span></div>
            <div class="card stat-card"><span class="stat-value" id="self-recap-sakit" style="color:var(--color-info);">0</span><span class="stat-label">Sakit</span></div>
            <div class="card stat-card"><span class="stat-value" id="self-recap-izin" style="color:var(--color-warning);">0</span><span class="stat-label">Izin</span></div>
            <div class="card stat-card"><span class="stat-value" id="self-recap-alpa" style="color:var(--color-danger);">0</span><span class="stat-label">Alpa</span></div>
          </div>
        </div>
      </div>
    ` : ''}

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

  document.getElementById('photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('photo-status');
    status.textContent = 'Mengunggah...';
    try {
      const base64 = await fileToBase64(file);
      const { url } = await api.post('/api/auth?action=upload-photo', { file: base64 });
      const preview = document.getElementById('profile-avatar-preview');
      preview.style.background = 'none';
      preview.style.padding = '0';
      preview.style.overflow = 'hidden';
      preview.innerHTML = `<img src="${url}" alt="Foto profil" style="width:100%; height:100%; object-fit:cover;" />`;
      status.textContent = 'Foto berhasil diperbarui.';
      clearSessionCache();
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  // ---- Edit Data Siswa (NISN/TTL/Jurusan) sesuai izin ----
  const studentForm = document.getElementById('student-form');
  document.getElementById('edit-student-btn')?.addEventListener('click', () => {
    studentForm.style.display = 'block';
  });
  document.getElementById('cancel-student-edit')?.addEventListener('click', () => {
    studentForm.style.display = 'none';
  });
  studentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('student-form-status');
    const payload = Object.fromEntries(new FormData(e.target).entries());
    status.textContent = 'Menyimpan...';
    try {
      await api.patch('/api/auth', payload);
      clearSessionCache();
      renderProfilePage(container);
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  // ---- Ganti Email (langsung ke Supabase Auth, minta konfirmasi email baru) ----
  document.getElementById('change-email-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('email-status');
    const newEmail = document.getElementById('new-email').value.trim();
    if (!newEmail) { status.textContent = 'Isi email baru dulu.'; return; }
    if (!(await showConfirm(`Ganti email ke ${newEmail}? Kamu perlu konfirmasi lewat link yang dikirim ke email tersebut.`))) return;
    status.textContent = 'Memproses...';
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    status.textContent = error ? 'Gagal: ' + error.message : 'Link konfirmasi terkirim ke email baru. Buka email itu untuk menyelesaikan.';
  });

  // ---- Ganti Password (langsung ke Supabase Auth, sesi aktif jadi otorisasinya) ----
  document.getElementById('change-password-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('password-status');
    const newPassword = document.getElementById('new-password').value;
    if (!newPassword || newPassword.length < 6) { status.textContent = 'Password minimal 6 karakter.'; return; }
    if (!(await showConfirm('Ganti password sekarang?'))) return;
    status.textContent = 'Memproses...';
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { status.textContent = 'Gagal: ' + error.message; return; }
    status.textContent = 'Password berhasil diganti.';
    document.getElementById('new-password').value = '';
  });

  // ---- Rekap absensi diri sendiri per rentang tanggal ----
  document.getElementById('self-recap-btn')?.addEventListener('click', async () => {
    const from = document.getElementById('self-recap-from').value;
    const to = document.getElementById('self-recap-to').value;
    if (!from || !to) { await showAlert('Isi tanggal Dari & Sampai dulu.'); return; }
    const result = await api.get('/api/attendance', { resource: 'recap', from, to, student_ids: s.id }).catch(() => null);
    if (!result || !result.recap?.[0]) { await showAlert('Gagal membuat rekap.'); return; }
    const r = result.recap[0];
    document.getElementById('self-recap-hadir').textContent = r.hadir;
    document.getElementById('self-recap-sakit').textContent = r.sakit;
    document.getElementById('self-recap-izin').textContent = r.izin;
    document.getElementById('self-recap-alpa').textContent = r.alpa;
    document.getElementById('self-recap-result').style.display = '';
  });

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
      await showAlert(err.message);
    }
  });
}
