import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Ключи не прописаны — сайт должен открываться и работать как витрина, а не падать. */
export const isConfigured = Boolean(url && key)

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/** Коды ошибок Postgres/Supabase → ключи в словаре переводов. */
export function errKey(error) {
  const m = (error?.message || '').toUpperCase()
  if (m.includes('INSUFFICIENT_FUNDS')) return 'pay_fail'
  if (m.includes('EMPTY_CART')) return 'cart_empty'
  if (m.includes('AUTH_REQUIRED')) return 'err_auth_required'
  if (m.includes('INVALID LOGIN CREDENTIALS')) return 'err_bad_creds'
  if (m.includes('USER ALREADY REGISTERED')) return 'err_user_exists'
  if (m.includes('PASSWORD SHOULD BE')) return 'err_weak_pass'
  if (m.includes('EMAIL NOT CONFIRMED')) return 'err_not_confirmed'
  if (m.includes('RATE LIMIT') || m.includes('TOO MANY')) return 'err_rate_limit'
  if (m.includes('FAILED TO FETCH') || m.includes('NETWORKERROR')) return 'err_network'
  return 'err_generic'
}
