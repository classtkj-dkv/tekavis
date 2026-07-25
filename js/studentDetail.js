// Modal detail profil siswa — dipanggil pas nama siswa di-tap, baik dari
// preview di beranda maupun dari halaman Data Siswa penuh.

export function studentDetailDialogHtml(idPrefix = 'sd') {
  return `
    <dialog id="${idPrefix}-detail-dialog" class="modal">
      <div class="modal-content" id="${idPrefix}-detail-body"></div>
    </dialog>
  `;
}

function avatarHtml(s) {
  const initials = (s.name || '?').trim().slice(0, 1).toUpperCase();
  if (s.photo_url) {
    return `<div class="profile-avatar" style="background:none; padding:0; overflow:hidden;"><img src="${s.photo_url}" alt="${s.name}" style="width:100%; height:100%; object-fit:cover;" /></div>`;
  }
  return `<div class="profile-avatar">${initials}</div>`;
}

export function openStudentDetail(idPrefix, student) {
  const dialog = document.getElementById(`${idPrefix}-detail-dialog`);
  const body = document.getElementById(`${idPrefix}-detail-body`);
  if (!dialog || !body) return;

  const p = student.profiles || {};
  const optionalFields = [
    ['Moto', p.motto],
    ['Hobi', p.hobby],
    ['Cita-cita', p.dream_job],
  ].filter(([, v]) => v);

  body.innerHTML = `
    <div class="profile-card" style="max-width:none;">
      ${avatarHtml(student)}
      <div style="min-width:0;">
        <h2 class="section-title" style="font-size:18px;">${student.name}</h2>
        <p style="font-size:13px; margin-top:2px;">${student.major || '-'}</p>
      </div>
    </div>
    <dl class="detail-list" style="margin-top:16px;">
      ${student.nisn ? `<dt>NISN</dt><dd>${student.nisn}</dd>` : ''}
      <dt>Tempat, Tgl Lahir</dt><dd>${student.birth_place}, ${new Date(student.birth_date).toLocaleDateString('id-ID')}</dd>
    </dl>
    ${optionalFields.length ? `
      <hr style="border:none; border-top:1px solid var(--color-border); margin:14px 0;" />
      <dl class="detail-list">
        ${optionalFields.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}
      </dl>
    ` : ''}
    <button type="button" class="btn btn-secondary" style="width:100%; margin-top:18px;" onclick="this.closest('dialog').close()">Tutup</button>
  `;
  dialog.showModal();
}

export function bindStudentDetailClicks(containerSelector, students, idPrefix = 'sd') {
  document.querySelectorAll(containerSelector).forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const student = students.find(s => s.id === row.dataset.id);
      if (student) openStudentDetail(idPrefix, student);
    });
  });
}
