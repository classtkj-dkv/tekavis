import { getSession } from './session.js';

export default async function renderProfilePage(container) {
  const me = await getSession();
  const p = me?.profile || {};

  const fields = [
    ['Nama', p.full_name],
    ['Hobi', p.hobby],
    ['Cita-cita', p.dream_job],
    ['Pekerjaan', p.occupation],
  ].filter(([, value]) => value);

  container.innerHTML = `
    <h1 class="section-title">Profil Saya</h1>
    <div class="card profile-card">
      <div class="profile-avatar">${(p.full_name || 'U').slice(0,1).toUpperCase()}</div>
      <dl class="detail-list">
        ${fields.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}
      </dl>
    </div>
  `;
}
