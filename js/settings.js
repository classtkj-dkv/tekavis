import { api } from './apiClient.js';
import { getSession } from './session.js';
import { getAccessToken } from './supabaseClient.js';

// Baca file dari galeri/device sebagai base64, dikirim ke /api/settings?action=upload
// yang lalu naruhnya ke Cloudinary dan balikin URL — jadi user tinggal pilih foto,
// tanpa perlu tempel link manual.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

async function uploadAsset(file, folder) {
  const base64 = await fileToBase64(file);
  const res = await api.post('/api/settings?action=upload', { file: base64, folder });
  return res; // { url, publicId }
}

function slideCard(slide, index) {
  return `
    <div class="card" style="display:flex; gap:14px; align-items:center;" data-index="${index}">
      <div style="width:84px; height:56px; border-radius:10px; background-image:url('${slide.url}'); background-size:cover; background-position:center; flex-shrink:0;"></div>
      <div style="flex:1; min-width:0;">
        <div class="list-item-title">${slide.title || '(Tanpa judul)'}</div>
        <div class="list-item-meta">${slide.subtitle || '-'}</div>
      </div>
      <button type="button" class="btn btn-danger btn-xs banner-delete-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
    </div>
  `;
}

export default async function renderSettingsPage(container) {
  const me = await getSession();
  const isOwner = me?.role === 'owner';

  const settings = await api.get('/api/settings').catch(() => null);
  if (!settings) {
    container.innerHTML = '<div class="card">Gagal memuat pengaturan.</div>';
    return;
  }

  const homepage = settings.homepage || {};
  const slides = Array.isArray(homepage.slides) ? homepage.slides : [];

  container.innerHTML = `
    <h1 class="section-title">Pengaturan Website</h1>
    <form id="settings-form" class="card" style="max-width:520px;">
      <label class="input-label">Nama Website</label>
      <input class="input" name="site_name" value="${settings.site_name || ''}" required />

      <label class="input-label" style="margin-top:14px;">Logo Website</label>
      <div style="display:flex; align-items:center; gap:12px;">
        <div id="logo-preview" style="width:52px; height:52px; border-radius:10px; background:var(--color-bg-2); background-image:${settings.logo_url ? `url('${settings.logo_url}')` : 'none'}; background-size:cover; background-position:center; flex-shrink:0; border:1px solid var(--color-border);"></div>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
          <i class="fa-solid fa-image"></i> Pilih dari Galeri
          <input type="file" accept="image/*" id="logo-file" style="display:none;" />
        </label>
        <span id="logo-status" style="font-size:12px; color:var(--color-text-muted);"></span>
      </div>
      <input type="hidden" name="logo_url" id="logo_url" value="${settings.logo_url || ''}" />

      <label class="input-label" style="margin-top:14px;">Favicon Website</label>
      <div style="display:flex; align-items:center; gap:12px;">
        <div id="favicon-preview" style="width:36px; height:36px; border-radius:8px; background:var(--color-bg-2); background-image:${settings.favicon_url ? `url('${settings.favicon_url}')` : 'none'}; background-size:cover; background-position:center; flex-shrink:0; border:1px solid var(--color-border);"></div>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
          <i class="fa-solid fa-image"></i> Pilih dari Galeri
          <input type="file" accept="image/*" id="favicon-file" style="display:none;" />
        </label>
        <span id="favicon-status" style="font-size:12px; color:var(--color-text-muted);"></span>
      </div>
      <input type="hidden" name="favicon_url" id="favicon_url" value="${settings.favicon_url || ''}" />

      <label class="input-label" style="margin-top:14px;">Teks Footer</label>
      <input class="input" name="footer_text" value="${settings.footer_text || ''}" />

      <button type="submit" class="btn btn-primary" style="margin-top:18px;">Simpan Perubahan</button>
      <p id="settings-saved" style="color:var(--color-success); font-size:13px; margin-top:10px;" hidden>Tersimpan.</p>
    </form>

    ${isOwner ? `
      <h2 class="section-title" style="margin-top:28px;">Foto Beranda (Bisa Digeser)</h2>
      <p style="font-size:12.5px; margin-bottom:12px;">Foto-foto ini tampil sebagai carousel yang bisa digeser di halaman beranda. Pilih langsung dari galeri, otomatis ke-upload ke Cloudinary.</p>
      <div class="card" style="max-width:560px; display:flex; flex-direction:column; gap:12px;">
        <label class="input-label">Label Badge (opsional)</label>
        <input class="input" id="banner-badge" value="${homepage.badge || ''}" placeholder="Contoh: Class Tekavis" />

        <div id="banner-list" style="display:flex; flex-direction:column; gap:10px; margin-top:6px;">
          ${slides.length ? slides.map(slideCard).join('') : '<div class="empty-state">Belum ada foto beranda.</div>'}
        </div>

        <hr style="border:none; border-top:1px solid var(--color-border); margin:6px 0;" />

        <label class="input-label">Tambah Foto Baru</label>
        <label class="btn btn-secondary" style="cursor:pointer; width:fit-content;">
          <i class="fa-solid fa-image"></i> Pilih dari Galeri
          <input type="file" accept="image/*" id="banner-file" style="display:none;" />
        </label>
        <div id="banner-new-preview" style="display:none; width:100%; height:120px; border-radius:10px; background-size:cover; background-position:center; border:1px solid var(--color-border);"></div>
        <input class="input" id="banner-title" placeholder="Judul (opsional)" />
        <input class="input" id="banner-subtitle" placeholder="Subjudul (opsional)" />
        <button type="button" id="banner-add-btn" class="btn btn-primary" style="width:fit-content;" disabled><i class="fa-solid fa-plus"></i> Tambah Slide</button>
        <span id="banner-status" style="font-size:12px; color:var(--color-text-muted);"></span>
      </div>

      <h2 class="section-title" style="margin-top:28px;">Backup &amp; Restore Database</h2>
      <div class="card" style="max-width:520px; display:flex; flex-direction:column; gap:12px;">
        <div>
          <button id="backup-btn" class="btn btn-secondary"><i class="fa-solid fa-download"></i> Backup Database (unduh JSON)</button>
        </div>
        <div>
          <label class="input-label">Restore dari file backup (.json)</label>
          <input class="input" type="file" id="restore-file" accept="application/json" />
          <button id="restore-btn" class="btn btn-danger" style="margin-top:10px;"><i class="fa-solid fa-triangle-exclamation"></i> Restore Database</button>
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

  // ---- Upload logo & favicon langsung dari galeri ----
  document.getElementById('logo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('logo-status');
    status.textContent = 'Mengunggah...';
    try {
      const { url } = await uploadAsset(file, 'logo');
      document.getElementById('logo_url').value = url;
      document.getElementById('logo-preview').style.backgroundImage = `url('${url}')`;
      status.textContent = 'Terunggah. Klik "Simpan Perubahan" untuk menyimpan.';
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  document.getElementById('favicon-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('favicon-status');
    status.textContent = 'Mengunggah...';
    try {
      const { url } = await uploadAsset(file, 'favicon');
      document.getElementById('favicon_url').value = url;
      document.getElementById('favicon-preview').style.backgroundImage = `url('${url}')`;
      status.textContent = 'Terunggah. Klik "Simpan Perubahan" untuk menyimpan.';
    } catch (err) {
      status.textContent = 'Gagal: ' + err.message;
    }
  });

  // ---- Kelola foto beranda (carousel) ----
  if (isOwner) {
    let pendingBannerUpload = null; // { url, publicId }

    document.getElementById('banner-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = document.getElementById('banner-status');
      const preview = document.getElementById('banner-new-preview');
      const addBtn = document.getElementById('banner-add-btn');
      status.textContent = 'Mengunggah...';
      addBtn.disabled = true;
      try {
        const { url, publicId } = await uploadAsset(file, 'banner');
        pendingBannerUpload = { url, publicId };
        preview.style.display = 'block';
        preview.style.backgroundImage = `url('${url}')`;
        status.textContent = 'Terunggah. Isi judul/subjudul (opsional) lalu klik Tambah Slide.';
        addBtn.disabled = false;
      } catch (err) {
        status.textContent = 'Gagal: ' + err.message;
      }
    });

    document.getElementById('banner-add-btn')?.addEventListener('click', async () => {
      if (!pendingBannerUpload) return;
      const status = document.getElementById('banner-status');
      const newSlide = {
        url: pendingBannerUpload.url,
        public_id: pendingBannerUpload.publicId,
        title: document.getElementById('banner-title').value.trim(),
        subtitle: document.getElementById('banner-subtitle').value.trim(),
      };
      const nextSlides = [...slides, newSlide];
      const badge = document.getElementById('banner-badge').value.trim();
      try {
        status.textContent = 'Menyimpan...';
        await api.patch('/api/settings', { homepage: { badge, slides: nextSlides } });
        window.location.reload();
      } catch (err) {
        status.textContent = 'Gagal menyimpan: ' + err.message;
      }
    });

    document.getElementById('banner-list')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.banner-delete-btn');
      if (!btn) return;
      if (!confirm('Hapus foto beranda ini?')) return;
      const index = Number(btn.dataset.index);
      const target = slides[index];
      const nextSlides = slides.filter((_, i) => i !== index);
      const badge = document.getElementById('banner-badge').value.trim();
      try {
        await api.patch('/api/settings', { homepage: { badge, slides: nextSlides } });
        if (target?.public_id) {
          await api.post('/api/settings?action=delete-asset', { publicId: target.public_id }).catch(() => {});
        }
        window.location.reload();
      } catch (err) {
        alert('Gagal menghapus: ' + err.message);
      }
    });
  }

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
