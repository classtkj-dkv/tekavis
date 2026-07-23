import { supabase, getCurrentUser } from './supabaseClient.js';
import { api } from './apiClient.js';

let cachedMe = null;

export async function getSession() {
  const user = await getCurrentUser();
  if (!user) {
    cachedMe = null;
    return null;
  }
  if (!cachedMe) {
    cachedMe = await api.get('/api/auth');
  }
  return cachedMe;
}

export function clearSessionCache() {
  cachedMe = null;
}

export async function signOut() {
  await supabase.auth.signOut();
  clearSessionCache();
  window.location.hash = '/login';
}
