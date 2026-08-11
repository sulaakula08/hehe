/**
 * Клиент Supabase. Ключей нет — сайт продолжает работать на localStorage,
 * поэтому витрину можно открыть и без базы.
 *
 * Из браузера доступна ровно одна операция: получить свой заказ по токену
 * из персональной ссылки. Все таблицы закрыты RLS, писать может только
 * backend под service_role — см. supabase/schema.sql.
 */
const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseReady = Boolean(URL && KEY)

/**
 * Заказ по секретному токену из ссылки /order/<token>.
 * Возвращает null, если база не подключена или заказа нет.
 */
export async function fetchOrderByToken(token) {
  if (!supabaseReady || !token) return null

  const res = await fetch(`${URL}/rest/v1/rpc/order_by_token`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_token: token }),
  })

  if (!res.ok) throw new Error(`supabase ${res.status}`)
  return res.json()
}
