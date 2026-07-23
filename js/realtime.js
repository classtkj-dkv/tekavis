import { supabase } from './supabaseClient.js';
import { showToast } from './toast.js';

let channel = null;

/**
 * Subscribe ke notifikasi realtime milik user yang login.
 * Menampilkan toast setiap ada notifikasi baru & memperbarui badge lonceng.
 */
export function subscribeNotifications(profileId, onNewNotification) {
  if (channel) supabase.removeChannel(channel);

  channel = supabase
    .channel(`notifications:${profileId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profileId}` },
      (payload) => {
        const n = payload.new;
        showToast(n.title, { type: 'info' });
        onNewNotification?.(n);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeNotifications() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
