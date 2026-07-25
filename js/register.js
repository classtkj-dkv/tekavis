import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { api } from './apiClient.js';
import { restartApp } from './app.js';

export default async function renderRegisterPage(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <form id="register-form" class="card auth-card">
        <div class="auth-logo">
          <div class="auth-brand-icon"><i class="fa-solid fa-user-plus"></i></div>
          <h1 class="auth-title">Daftar Akun</h1>
          <p class="auth-subtitle">Akun baru akan mendapat role Siswa secara default</p>
        </div>

        ${!isSupabaseConfigured ? `
          <p class="auth-error">
            ⚠️ Backend belum dikonfigurasi — isi <code>SUPABASE_URL</code> &amp; <code>SUPABASE_ANON_KEY</code> di <code>index.html</code> (bagian <code>window.__ENV__</code>) supaya pendaftaran bisa jalan.
          </p>
        ` : ''}

        <label class="input-label" for="full_name">Nama Lengkap</label>
        <div style="position:relative;">
          <i class="fa-regular fa-user" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--color-text-muted); font-size:14px;"></i>
          <input class="input" style="padding-left:40px;" type="text" id="full_name" required />
        </div>

        <label class="input-label" for="email" style="margin-top:14px;">Email</label>
        <div style="position:relative;">
          <i class="fa-regular fa-envelope" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--color-text-muted); font-size:14px;"></i>
          <input class="input" style="padding-left:40px;" type="email" id="email" required />
        </div>

        <label class="input-label" for="password" style="margin-top:14px;">Kata Sandi</label>
        <div style="position:relative;">
          <i class="fa-solid fa-lock" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--color-text-muted); font-size:14px;"></i>
          <input class="input" style="padding-left:40px;" type="password" id="password" minlength="6" required />
        </div>

        <p id="register-error" class="auth-error" hidden></p>

        <button type="submit" class="btn btn-primary" style="margin-top:18px; width:100%;"><i class="fa-solid fa-user-plus"></i> Daftar</button>

        <p class="auth-footer">Sudah punya akun? <a href="#/login">Masuk</a></p>
      </form>
      <p class="auth-copyright">© ${new Date().getFullYear()} XREZZKY OFFICIAL. All Rights Reserved.</p>
    </div>
  `;

  const form = document.getElementById('register-form');
  const errorEl = document.getElementById('register-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const full_name = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }

    // Jika project Supabase mewajibkan verifikasi email, session bisa null di sini.
    if (data.session) {
      await api.post('/api/auth', { full_name });
      window.location.hash = '/';
      await restartApp();
    } else {
      errorEl.style.color = 'var(--color-success)';
      errorEl.textContent = 'Pendaftaran berhasil. Silakan cek email untuk verifikasi sebelum masuk.';
      errorEl.hidden = false;
    }
  });
}
