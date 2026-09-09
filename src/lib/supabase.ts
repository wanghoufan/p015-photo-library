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
        // 关掉自动回调检测，改由 consumeLoginCallback 统一处理（见其注释）：
        // 本 Supabase 项目的 Google 登录回落 implicit flow，票据落在 URL **hash**
        //（#access_token=…&refresh_token=…）。supabase-js 2.95 默认 PKCE，
        // 不会自动消费 implicit hash，只把 URL 擦干净 ⇒ 登录永远不生效（BUG-15）。
        // 关掉它，避免 supabase 抢先清理 URL，票据由我们自己接。
        detectSessionInUrl: false,
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

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string; url?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: '未配置 Supabase' };
  // 不用内置跳转：部分老旧 Chrome 实例对 location.assign 静默无导航（BUG-14）；
  // 拿到干净 URL 后由调用方自行跳转（不要加 skipBrowserRedirect，否则 URL 会带
  // skip_http_redirect 参数，Supabase 不再 302 到 Google）。
  const ret = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  const { data, error } = ret;
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: data.url };
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

// ── 回调票据快照（模块加载即抓取，抢在 React 之前）──────────────
// React 挂载后 Gallery 会 replaceState('/') 同步筛选条件，把 hash 连同票据一起抹掉（BUG-15），
// 等 useEffect 里再读 location 时为时已晚。故在模块阶段就把票据拿到手。
// 只用于建立会话，绝不落盘、绝不外传。
const urlSnapshot = (() => {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const h = window.location.hash.length > 1
    ? new URLSearchParams(window.location.hash.slice(1))
    : null;
  return {
    error: q.get('error'),
    errorCode: q.get('error_code'),
    errorDescription: q.get('error_description'),
    code: q.get('code'),
    accessToken: h?.get('access_token') ?? null,
    refreshToken: h?.get('refresh_token') ?? null,
  };
})();

/**
 * 登录回调处理（同时覆盖 implicit 与 PKCE 两种 flow，票据只消费一次）：
 * - 有 error 参数 → 返回可见错误并清理，不碰 code/token
 * - 有 code 参数（仅 PKCE 流程会出现）→ 手动 exchangeCodeForSession，成功/失败都可见
 * - 都没有 → { status: 'none' }（调用方无感）
 * 注意：implicit flow 下票据在 URL hash，由 detectSessionInUrl=true 自动消费，本函数不介入。
 *      code 只能消费一次；重复调用看到的将是清理后的 URL。
 */
export async function consumeLoginCallback(): Promise<
  { status: 'none' } | { status: 'ok' } | { status: 'error'; message: string }
> {
  const snap = urlSnapshot;
  if (!snap) return { status: 'none' };
  const { error: err, errorCode: errCode, errorDescription: errDesc, code } = snap;
  const hashToken = snap.accessToken;
  const hashRefresh = snap.refreshToken;
  if (!err && !errCode && !code && !hashToken) return { status: 'none' };

  const clean = () => {
    const kept = new URLSearchParams(window.location.search);
    for (const k of ['error', 'error_code', 'error_description', 'code']) kept.delete(k);
    const rest = kept.toString();
    // 不保留 hash：票据只消费一次，不能留在地址栏
    window.history.replaceState(
      null, '', window.location.pathname + (rest ? `?${rest}` : ''),
    );
  };

  if (err || errCode) {
    const message = [err, errCode, errDesc].filter(Boolean).join(' | ') || '登录回调失败';
    clean();
    return { status: 'error', message };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    clean();
    return { status: 'error', message: '未配置 Supabase' };
  }

  // implicit flow：hash 里的票据直接建会话
  if (hashToken && hashRefresh) {
    try {
      const { error } = await sb.auth.setSession({
        access_token: hashToken,
        refresh_token: hashRefresh,
      });
      clean();
      if (error) return { status: 'error', message: error.message };
      return { status: 'ok' };
    } catch (e) {
      clean();
      return { status: 'error', message: e instanceof Error ? e.message : String(e) };
    }
  }

  // PKCE flow：query 里的 code 换会话（只做一次）
  try {
    const { error } = await sb.auth.exchangeCodeForSession(code as string);
    clean();
    if (error) return { status: 'error', message: error.message };
    return { status: 'ok' };
  } catch (e) {
    clean();
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
