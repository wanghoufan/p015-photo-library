import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'photo_library',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null && supabaseUrl !== '' && supabaseAnonKey !== '';
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback: (userId: string | null) => void) {
  if (!supabase) return () => {};
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null);
  }).data.subscription.unsubscribe;
}
