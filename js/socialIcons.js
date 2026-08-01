// Daftar ikon kontak/medsos yang bisa dipilih Owner di Pengaturan Website.
// Disimpan di DB cuma "key"-nya (mis. "whatsapp"), bukan class Font Awesome
// mentah — biar aman (gak ada risiko Owner ngetik class sembarangan) dan
// gampang ditambah/diubah di satu tempat ini aja.
export const SOCIAL_ICONS = {
  whatsapp: { fa: 'fa-brands fa-whatsapp', label: 'WhatsApp' },
  instagram: { fa: 'fa-brands fa-instagram', label: 'Instagram' },
  tiktok: { fa: 'fa-brands fa-tiktok', label: 'TikTok' },
  telegram: { fa: 'fa-brands fa-telegram', label: 'Telegram' },
  youtube: { fa: 'fa-brands fa-youtube', label: 'YouTube' },
  facebook: { fa: 'fa-brands fa-facebook', label: 'Facebook' },
  x: { fa: 'fa-brands fa-x-twitter', label: 'X (Twitter)' },
  github: { fa: 'fa-brands fa-github', label: 'GitHub' },
  linkedin: { fa: 'fa-brands fa-linkedin', label: 'LinkedIn' },
  discord: { fa: 'fa-brands fa-discord', label: 'Discord' },
  email: { fa: 'fa-solid fa-envelope', label: 'Email' },
  phone: { fa: 'fa-solid fa-phone', label: 'Telepon' },
  website: { fa: 'fa-solid fa-globe', label: 'Website' },
  other: { fa: 'fa-solid fa-link', label: 'Lainnya' },
};

export function socialIconClass(key) {
  return SOCIAL_ICONS[key]?.fa || SOCIAL_ICONS.other.fa;
}
