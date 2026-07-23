import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { api } from './apiClient.js';

export default async function renderRegisterPage(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <form id="register-form" class="card auth-card">
        <h1 class="auth-title">Daftar Akun</h1>
        <p class="auth-subtitle">Akun baru akan mendapat role Siswa secara default</p>

        ${!isSupabaseConfigured ? `
          <p class="auth-error" style="background:rgba(245,158,11,0.12); padding:10px 12px; border-radius:8px;">
            ⚠️ Backend belum dikonfigurasi — isi <code>SUPABASE_URL</code> &amp; <code>SUPABASE_ANON_KEY</code> di <code>index.html</code> (bagian <code>window.__ENV__</code>) supaya pendaftaran bisa jalan.
          </p>
        ` : ''}

        <label class="input-label" for="full_name">Nama Lengkap</label>
        <input class="input" type="text" id="full_name" required />

        <label class="input-label" for="email" style="margin-top:12px;">Email</label>
        <input class="input" type="email" id="email" required />

        <label class="input-label" for="password" style="margin-top:12px;">Kata Sandi</label>
        <input class="input" type="password" id="password" minlength="6" required />

        <p id="register-error" class="auth-error" hidden></p>

        <button type="submit" class="btn btn-primary" style="margin-top:18px; width:100%;">Daftar</button>

        <p class="auth-footer">Sudah punya akun? <a href="#/login">Masuk</a></p>
      </form>
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
      window.location.reload();
    } else {
      errorEl.style.color = 'var(--color-success)';
      errorEl.textContent = 'Pendaftaran berhasil. Silakan cek email untuk verifikasi sebelum masuk.';
      errorEl.hidden = false;
    }
  });
}
