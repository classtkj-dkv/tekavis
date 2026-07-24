import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Nilai ini aman untuk ada di frontend: URL project + anon key
// (akses data tetap dibatasi Row Level Security di Supabase).
// Ganti dengan config aktual di index.html (window.__ENV__), atau inject saat deploy.
const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Kalau belum dikonfigurasi, JANGAN panggil createClient (dia langsung error
// kalau URL kosong/tidak valid, dan error itu bisa bikin seluruh app.js gagal
// dimuat). Sebagai gantinya sediakan client kosong yang aman dipanggil tapi
// selalu mengembalikan "tidak ada sesi", supaya UI tetap tampil (login form,
// dsb) meski backend belum tersambung.
function createEmptyClient() {
  return {
    auth: {
      async getSession() { return { data: { session: null } }; },
      async getUser() { return { data: { user: null } }; },
      async signInWithPassword() { return { error: { message: 'Supabase belum dikonfigurasi. Isi window.__ENV__ di index.html.' } }; },
      async signUp() { return { error: { message: 'Supabase belum dikonfigurasi. Isi window.__ENV__ di index.html.' } }; },
      async signOut() {},
    },
    channel() {
      return { on() { return this; }, subscribe() { return this; } };
    },
    removeChannel() {},
  };
}

export const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : createEmptyClient();

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// Sengaja pakai getSession() (baca sesi yang udah tersimpan di localStorage,
// termasuk auto-refresh kalau tokennya mau expired), BUKAN getUser() yang
// selalu bikin network request ke server Supabase tiap dipanggil. Kalau
// getUser() dipanggil di setiap page load dan networknya kebetulan lemot/
// gagal sebentar, user yang sebenarnya masih login bisa keanggep logout.
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}
