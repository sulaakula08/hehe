import { createClient } from '@supabase/supabase-js'

/**
 * Клиент Supabase. Без ключей сайт работает как раньше, на localStorage —
 * витрину можно открыть и без базы, просто без входа в аккаунт.
 */
const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseReady = Boolean(URL && KEY)

export const supabase = supabaseReady
  ? createClient(URL, KEY, {
      auth: {
        persistSession: true,      // вход переживает перезагрузку
        autoRefreshToken: true,
        detectSessionInUrl: true,  // возврат по ссылке из письма
      },
    })
  : null

/**
 * Заказ по секретному токену из персональной ссылки.
 * Отдельная функция в базе — прямого доступа к таблицам у браузера нет.
 */
export async function fetchOrderByToken(token) {
  if (!supabase || !token) return null
  const { data, error } = await supabase.rpc('order_by_token', { p_token: token })
  if (error) throw error
  return data
}

/**
 * Ошибки Supabase приходят по-английски. Переводим только те, что человек
 * реально может увидеть, остальное — общим текстом.
 */
export function authErrorKey(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'au_bad_creds'
  if (m.includes('already registered')) return 'au_taken'
  if (m.includes('password should be')) return 'au_weak'
  if (m.includes('email not confirmed')) return 'au_unconfirmed'
  if (m.includes('unable to validate email') || m.includes('invalid format')) return 'au_bad_email'
  if (m.includes('rate limit') || m.includes('too many')) return 'au_rate'
  if (m.includes('failed to fetch') || m.includes('networkerror')) return 'au_network'
  return 'au_generic'
}
