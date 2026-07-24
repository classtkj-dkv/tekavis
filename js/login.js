import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { clearSessionCache } from './session.js';
import { restartApp } from './app.js';

export default async function renderLoginPage(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <form id="login-form" class="card auth-card">
        <h1 class="auth-title">Masuk</h1>
        <p class="auth-subtitle">Masuk ke Sistem Informasi Kelas</p>

        ${!isSupabaseConfigured ? `
          <p class="auth-error" style="background:rgba(245,158,11,0.12); padding:10px 12px; border-radius:8px;">
            ⚠️ Backend belum dikonfigurasi — isi <code>SUPABASE_URL</code> &amp; <code>SUPABASE_ANON_KEY</code> di <code>index.html</code> (bagian <code>window.__ENV__</code>) supaya login bisa jalan.
          </p>
        ` : ''}

        <label class="input-label" for="email">Email</label>
        <input class="input" type="email" id="email" required />

        <label class="input-label" for="password" style="margin-top:12px;">Kata Sandi</label>
        <input class="input" type="password" id="password" required />

        <p id="login-error" class="auth-error" hidden></p>

        <button type="submit" class="btn btn-primary" style="margin-top:18px; width:100%;">Masuk</button>

        <p class="auth-footer">Belum punya akun? <a href="#/register">Daftar</a></p>
      </form>
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
    window.location.hash = '/';
    await restartApp();
  });
}
