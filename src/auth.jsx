import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isConfigured, errKey } from './lib/supabase.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

/**
 * Держит сессию, профиль (баланс/коины), заказы и избранное.
 * Все обращения к базе идут отсюда, компоненты дёргают только методы.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [favorites, setFavorites] = useState([])   // массив product_id
  const [ready, setReady] = useState(!isConfigured)

  const user = session?.user ?? null

  /* ── сессия ── */
  useEffect(() => {
    if (!isConfigured) return
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setReady(true)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  /* ── данные пользователя ── */
  const refresh = useCallback(async () => {
    if (!isConfigured || !user) {
      setProfile(null); setOrders([]); setFavorites([])
      return
    }
    const [p, o, f] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('favorites').select('product_id'),
    ])
    setProfile(p.data ?? null)
    setOrders(o.data ?? [])
    setFavorites((f.data ?? []).map((r) => r.product_id))
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  /* ── действия ── */
  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(errKey(error))
    // Если в проекте включено подтверждение почты — сессии сразу не будет.
    const { data } = await supabase.auth.getSession()
    return { needsConfirm: !data.session }
  }

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(errKey(error))
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw new Error(errKey(error))
  }

  const signOut = async () => { await supabase.auth.signOut() }

  const topup = async (amount) => {
    const { data, error } = await supabase.rpc('topup', { p_amount: amount })
    if (error) throw new Error(errKey(error))
    setProfile(data)
  }

  /** items: [{id, size, qty, price, title}] — сумму пересчитывает сервер. */
  const checkout = async (items) => {
    const { data, error } = await supabase.rpc('checkout', { p_items: items })
    if (error) throw new Error(errKey(error))
    setOrders((o) => [data, ...o])
    setProfile((p) => p && ({
      ...p,
      balance: p.balance - data.total,
      coins: p.coins + data.coins_earned,
    }))
    return data
  }

  const toggleFavorite = async (productId) => {
    const on = favorites.includes(productId)
    setFavorites((f) => (on ? f.filter((x) => x !== productId) : [...f, productId]))  // оптимистично
    const q = on
      ? supabase.from('favorites').delete().eq('product_id', productId).eq('user_id', user.id)
      : supabase.from('favorites').insert({ product_id: productId, user_id: user.id })
    const { error } = await q
    if (error) {
      setFavorites((f) => (on ? [...f, productId] : f.filter((x) => x !== productId)))  // откат
      throw new Error(errKey(error))
    }
    return !on
  }

  const updateProfile = async (patch) => {
    const { data, error } = await supabase
      .from('profiles').update(patch).eq('id', user.id).select().single()
    if (error) throw new Error(errKey(error))
    setProfile(data)
  }

  const value = useMemo(() => ({
    isConfigured, ready, user, profile, orders, favorites,
    signUp, signIn, signInWithGoogle, signOut,
    topup, checkout, toggleFavorite, updateProfile, refresh,
  }), [ready, user, profile, orders, favorites, refresh])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
