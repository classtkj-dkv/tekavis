import { getSession } from './session.js';

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

  const fields = [
    ['Nama', p.full_name],
    ['Email', me.email],
    ['Hobi', p.hobby],
    ['Cita-cita', p.dream_job],
    ['Pekerjaan', p.occupation],
  ].filter(([, value]) => value);

  const isMostlyEmpty = !p.full_name && !p.hobby && !p.dream_job && !p.occupation;

  container.innerHTML = `
    <h1 class="section-title">Profil Saya</h1>
    <div class="card profile-card">
      <div class="profile-avatar">${(p.full_name || me.email || 'U').slice(0,1).toUpperCase()}</div>
      <dl class="detail-list">
        ${fields.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}
      </dl>
    </div>
    ${isMostlyEmpty ? `
      <div class="card" style="margin-top:14px;">
        <p style="font-size:13px; color:var(--color-text-muted);">
          Profil kamu masih kosong (belum ada nama, hobi, cita-cita, atau pekerjaan yang diisi).
          Fitur edit profil dari halaman ini belum tersedia — data ini bisa diisi langsung
          dari tabel <code>profiles</code> di Supabase, atau tunggu fitur edit profil ditambahkan.
        </p>
      </div>
    ` : ''}
  `;
}
