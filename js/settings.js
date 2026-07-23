import { api } from './apiClient.js';
import { getSession } from './session.js';
import { getAccessToken } from './supabaseClient.js';

export default async function renderSettingsPage(container) {
  const me = await getSession();
  const isOwner = me?.role === 'owner';

  const settings = await api.get('/api/settings').catch(() => null);
  if (!settings) {
    container.innerHTML = '<div class="card">Gagal memuat pengaturan.</div>';
    return;
  }

  container.innerHTML = `
    <h1 class="section-title">Pengaturan Website</h1>
    <form id="settings-form" class="card" style="max-width:520px;">
      <label class="input-label">Nama Website</label>
      <input class="input" name="site_name" value="${settings.site_name || ''}" required />

      <label class="input-label" style="margin-top:12px;">URL Logo</label>
      <input class="input" name="logo_url" value="${settings.logo_url || ''}" />

      <label class="input-label" style="margin-top:12px;">URL Favicon</label>
      <input class="input" name="favicon_url" value="${settings.favicon_url || ''}" />

      <label class="input-label" style="margin-top:12px;">Teks Footer</label>
      <input class="input" name="footer_text" value="${settings.footer_text || ''}" />

      <button type="submit" class="btn btn-primary" style="margin-top:18px;">Simpan Perubahan</button>
      <p id="settings-saved" style="color:var(--color-success); font-size:13px; margin-top:10px;" hidden>Tersimpan.</p>
    </form>

    ${isOwner ? `
      <h2 class="section-title" style="margin-top:28px;">Backup &amp; Restore Database</h2>
      <div class="card" style="max-width:520px; display:flex; flex-direction:column; gap:12px;">
        <div>
          <button id="backup-btn" class="btn btn-secondary">⬇️ Backup Database (unduh JSON)</button>
        </div>
        <div>
          <label class="input-label">Restore dari file backup (.json)</label>
          <input class="input" type="file" id="restore-file" accept="application/json" />
          <button id="restore-btn" class="btn btn-danger" style="margin-top:10px;">⚠️ Restore Database</button>
          <p style="font-size:12px; color:var(--color-text-muted); margin-top:6px;">
            Restore akan MENIMPA data yang ada saat ini. Pastikan sudah backup terlebih dulu.
          </p>
        </div>
      </div>
    ` : ''}
  `;

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api.patch('/api/settings', payload);
      document.getElementById('settings-saved').hidden = false;
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('backup-btn')?.addEventListener('click', async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/settings?action=backup', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Backup gagal');

      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kelas-cms-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('restore-btn')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('restore-file');
    const file = fileInput.files[0];
    if (!file) return alert('Pilih file backup terlebih dahulu.');
    if (!confirm('Restore akan MENIMPA data saat ini dengan isi file backup. Lanjutkan?')) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed.tables ? { tables: parsed.tables } : { tables: parsed };
      await api.post('/api/settings?action=restore', payload);
      alert('Restore berhasil. Halaman akan dimuat ulang.');
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
}
