# Kelas CMS

Sistem Informasi Kelas — pusat informasi kelas dari kelas X hingga lulus, dirancang agar bisa berkembang jadi Portal Alumni.

## Stack
- **Frontend**: HTML/CSS/Vanilla JS (ES Modules, SPA hash-router), tanpa framework/build step
- **Backend**: Vercel Serverless Functions (`/api`)
- **Database**: Supabase PostgreSQL (+ Row Level Security)
- **Auth**: Supabase Auth
- **Storage**: Cloudinary (foto), metadata selalu di Supabase

## Status
Aplikasi sudah bisa dijalankan end-to-end: login/register, dashboard per role, siswa, album+upload foto ke Cloudinary (dengan edit/hapus), pengumuman (edit/hapus), jadwal (edit/hapus), kas (edit/hapus), notifikasi realtime (toast + badge lonceng via Supabase Realtime), pengaturan website, backup & restore database (Owner, unduh/unggah JSON), activity log, kelola user (ganti role langsung dari dropdown), **kelola role & permission secara visual** (halaman `/roles` — centang permission per role, tambah/hapus role/jabatan baru), dan search global. UI mengikuti color palette, tipografi Inter, dan dark/light mode sesuai spek.

Semua fitur di spek fungsional & UI/UX sudah tercakup di scaffold ini. Yang bisa dikembangkan lebih lanjut sesuai kebutuhan lo ke depan: halaman detail siswa (saat ini baru tabel ringkas), grafik kas (chart, saat ini baru angka ringkasan), draft/jadwal publish otomatis untuk pengumuman `scheduled` (butuh cron job Vercel), dan validasi form yang lebih ketat di sisi client.

**Penting untuk Realtime**: pastikan tabel `notifications` sudah masuk publication `supabase_realtime` (sudah otomatis lewat migration `0001_init.sql`), dan Realtime diaktifkan di Supabase → Database → Replication.

## Langkah Setup (sampai bisa dipakai)

1. **Buat project Supabase** di supabase.com.
2. **Jalankan migration**: buka SQL Editor Supabase → tempel isi `supabase/migrations/0001_init.sql` → Run.
3. **(Opsional) Data contoh**: jalankan `supabase/seed/0001_sample_data.sql`.
4. **Buat project Cloudinary** di cloudinary.com, catat Cloud Name, API Key, API Secret.
5. **Isi Environment Variables**:
   - Salin `.env.example` jadi `.env` (untuk lokal), atau isi langsung di dashboard Vercel (Project Settings → Environment Variables) untuk deploy.
   - Isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (3-3nya ada di Supabase → Project Settings → API).
   - Isi `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
6. **Isi konfigurasi Supabase untuk browser** di `public/index.html`, pada blok `window.__ENV__`:
   ```html
   window.__ENV__ = {
     SUPABASE_URL: "https://xxxx.supabase.co",
     SUPABASE_ANON_KEY: "isi-anon-key-di-sini"
   };
   ```
   (anon key aman ditaruh di frontend — akses data tetap dibatasi RLS di Supabase).
7. **Deploy**: `vercel` (login dulu dengan `vercel login`), lalu `vercel --prod`. Atau hubungkan repo GitHub-nya ke Vercel dashboard.
8. **Daftar akun pertama** lewat halaman `/register` di website yang sudah live — otomatis dapat role `siswa`.
9. **Jadikan akun itu Owner**: buka Supabase → Table Editor → `profiles`, cari user tsb, ubah `role_id` ke id role `owner` (lihat tabel `roles`). Setelah itu, login ulang — dashboard Owner akan otomatis muncul.

Setelah langkah 9, sistem 100% bisa dipakai: Owner bisa menambah Admin/struktur organisasi, kelola siswa, album, kas, dst dari UI.

## Struktur folder
```
api/                  1 file = 1 fitur, langsung di /api (gak pakai folder per resource)
  _lib/                Shared: supabaseClient, cloudinary, auth, permissions, response, activityLog
  auth.js              GET = profil user login, POST = buat profil setelah signUp
  students.js          GET/POST/PATCH/DELETE (edit & hapus pakai ?id=...)
  albums.js            GET (list / detail via ?id=), POST, PATCH ?id=, DELETE ?id=
  photos.js            GET ?id=, POST (upload ke Cloudinary), PATCH ?id=, DELETE ?id=
  announcements.js     GET/POST/PATCH ?id=/DELETE ?id=
  schedule.js          GET/POST/PATCH ?id=/DELETE ?id=
  finance.js           GET (ringkasan+riwayat)/POST/PATCH ?id=/DELETE ?id=
  settings.js          GET/PATCH site settings; ?action=backup (GET) & ?action=restore (POST)
  notifications.js     GET/PATCH (tandai dibaca)
  activity-log.js      GET (Owner & Admin)
  users.js             GET daftar user, PATCH ganti role
  roles.js             GET/POST, PATCH ?id=/DELETE ?id= (kelola role & permission)
  search.js            GET ?q=... (search global)

public/                Semua yang di-serve statis oleh Vercel — sengaja flat, gak ada subfolder
  css/tokens.css       Design tokens: warna, radius, shadow, spacing, font (light & dark mode)
  css/base.css         Reset + style dasar (body, heading, link, dst)
  css/components.css   Reusable: button, card, input, table, modal, badge, toast
  css/layout.css       Shell: sidebar, navbar, bottom nav, responsive breakpoint
  css/pages.css        Style khusus halaman: auth, dashboard, gallery/album
  js/app.js            Entry point: bootstrap sesi, render shell, daftarin semua route
  js/router.js         Hash router sederhana
  js/apiClient.js      Wrapper fetch ke /api, otomatis kirim token
  js/supabaseClient.js Supabase client browser (auth)
  js/session.js        Cache profil user yang login
  js/theme.js           Light/dark/auto tersimpan di localStorage
  js/toast.js           Toast notification
  js/realtime.js         Subscribe Supabase Realtime utk notifikasi
  js/sidebar.js js/navbar.js js/bottomNav.js   Komponen shell
  js/dashboard.js js/students.js js/albums.js js/albumDetail.js js/photoDetail.js
  js/announcements.js js/schedule.js js/finance.js js/settings.js js/profile.js
  js/notifications.js js/activityLog.js js/users.js js/roles.js js/search.js
  js/login.js js/register.js    Satu file = satu halaman, di-load lewat dynamic import di app.js
  assets/              icon, manifest PWA

supabase/
  migrations/          SQL migration terurut (0001_init.sql = skema awal + RLS + seed role)
  seed/                data contoh untuk development

docs/                  Catatan teknis/arsitektur tambahan
```

Semua file JS di `public/js/` saling import pakai `./nama-file.js` (flat, gak ada `../core/` atau `../pages/` lagi).

Pola tiap file `/api`: cek method (`GET`/`POST`/`PATCH`/`DELETE`) → kalau ada `req.query.id`, itu operasi ke satu record; kalau tidak, ke seluruh koleksi. Ini sengaja dipilih supaya jumlah file tetap sedikit dan gampang dinavigasi, bukan tersebar di banyak folder.

## Prinsip desain kode
- Struktur `/api` sengaja flat (1 file per fitur) supaya gampang dinavigasi — bukan 1 folder per resource. Edit/hapus satu record pakai query `?id=...`, bukan dynamic route folder.
- Setiap endpoint API mengikuti pola: auth → (kalau ada `id`, operasi single record; kalau tidak, operasi koleksi) → permission check → query → activity log → response konsisten (`_lib/response.js`).
- RBAC dinamis: permission disimpan sebagai JSON di tabel `roles`, dicek lewat `_lib/permissions.js`, dan bisa diatur visual dari halaman `/roles` (Owner). Owner selalu lolos semua permission.
- Cloudinary hanya menyimpan file; `cloudinary_public_id`/URL tidak pernah ditampilkan langsung ke user — semua label yang tampil (nama foto, tag, lokasi, dll) berasal dari tabel `photos`.
- Semua rahasia (Supabase service role, Cloudinary secret) hanya dipakai di `/api`, tidak pernah dikirim ke browser.
- Frontend adalah SPA ringan: `js/router.js` (hash-based) me-render halaman ke `#page-content` di dalam shell (sidebar+navbar+bottom nav) yang dirender sekali di `app.js` setelah sesi user diketahui.

## Catatan teknis
- Upload foto dikirim sebagai base64 lewat `POST /api/photos` — Vercel serverless punya limit body ~4.5MB per request; untuk foto resolusi sangat besar, pertimbangkan kompres di sisi klien sebelum upload atau pindah ke Cloudinary unsigned upload preset.
- Realtime notifikasi belum disambungkan ke Supabase Realtime — tabel & endpoint `notifications` sudah siap, tinggal subscribe channel di `public/js/session.js` atau `app.js`.
- **Bisa di-host statis (GitHub Pages, dsb), tapi `/api` gak akan jalan di sana.** Semua path CSS/JS di `index.html` sengaja relatif (`./css/...`, `./js/app.js`) supaya tetap kebaca walau situsnya ada di subfolder (misal `username.github.io/nama-repo/`). Tapi folder `/api` itu Vercel Serverless Function — GitHub Pages cuma static hosting, jadi endpoint apa pun (`/api/auth`, `/api/students`, dst) akan 404 di sana. UI tetap kebuka & bisa dilihat-lihat (halaman login/register muncul, dengan notice kalau `window.__ENV__` belum diisi), tapi login, ambil data, dan semua fitur yang butuh backend cuma akan benar-benar jalan kalau di-deploy ke Vercel (atau platform lain yang support serverless functions) + `window.__ENV__` di `index.html` sudah diisi Supabase URL/anon key.
