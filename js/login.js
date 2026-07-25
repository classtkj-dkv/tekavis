import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { clearSessionCache } from './session.js';
import { restartApp } from './app.js';
import { api } from './apiClient.js';

export default async function renderLoginPage(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <form id="login-form" class="card auth-card">
        <div class="auth-logo">
          <div class="auth-brand-icon"><i class="fa-solid fa-graduation-cap"></i></div>
          <h1 class="auth-title">Masuk</h1>
          <p class="auth-subtitle">Masuk ke Class Tekavis</p>
        </div>

        ${!isSupabaseConfigured ? `
          <p class="auth-error">
            ⚠️ Backend belum dikonfigurasi — isi <code>SUPABASE_URL</code> &amp; <code>SUPABASE_ANON_KEY</code> di <code>index.html</code> (bagian <code>window.__ENV__</code>) supaya login bisa jalan.
          </p>
        ` : ''}

        <label class="input-label" for="email">Email</label>
        <div style="position:relative;">
          <i class="fa-regular fa-envelope" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--color-text-muted); font-size:14px;"></i>
          <input class="input" style="padding-left:40px;" type="email" id="email" required />
        </div>

        <label class="input-label" for="password" style="margin-top:14px;">Kata Sandi</label>
        <div style="position:relative;">
          <i class="fa-solid fa-lock" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--color-text-muted); font-size:14px;"></i>
          <input class="input" style="padding-left:40px;" type="password" id="password" required />
        </div>

        <p id="login-error" class="auth-error" hidden></p>

        <button type="submit" class="btn btn-primary" style="margin-top:18px; width:100%;"><i class="fa-solid fa-right-to-bracket"></i> Masuk</button>

        <p class="auth-footer">Belum punya akun? <a href="#/register">Daftar</a></p>
      </form>
      <p class="auth-copyright">© ${new Date().getFullYear()} XREZZKY OFFICIAL. All Rights Reserved.</p>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = error.message || 'Email atau kata sandi salah.';
      errorEl.hidden = false;
      return;
    }

    clearSessionCache();

    // FIX: sebelumnya row `profiles` cuma dibuat di register.js, dan CUMA kalau
    // signUp langsung dapet session (gak kejadian kalau project Supabase-nya
    // punya "Confirm email" aktif — user yang confirm lewat email lalu login
    // normal di sini gak pernah dapet row profiles, jadi selamanya ke-anggep
    // guest oleh UI). POST /api/auth idempotent (lihat api/auth.js), jadi aman
    // dipanggil di sini sebagai jaring pengaman tiap kali berhasil login.
    try {
      await api.post('/api/auth', {});
    } catch (err) {
      console.error('Gagal memastikan profil user:', err);
    }

    window.location.hash = '/';
    await restartApp();
  });
}
