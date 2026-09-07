// Supabase 适配 + 认证
// 参考 place-journal：Schema 隔离、table() helper
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

// 规范：业务表不进 public，本工具固定使用独立 Schema
export const DB_SCHEMA = 'photo_library';

let client: SupabaseClient | null = null;

/** 带 Schema 的查询入口：table('works') → photo_library.works */
export function table(sb: SupabaseClient, name: string) {
  return sb.schema(DB_SCHEMA).from(name);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

// 向后兼容
export const supabase = getSupabaseClient();

export function isSupabaseConfigured(): boolean {
  return supabaseUrl !== '' && supabaseAnonKey !== '';
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

export async function currentUserId(): Promise<string | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user?.id ?? null;
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: '未配置 Supabase' };
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.auth.signOut();
}

export function onAuthStateChange(callback: (userId: string | null) => void): () => void {
  const sb = getSupabaseClient();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}
