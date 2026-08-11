import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseReady, authErrorKey } from './supabase.js'

/**
 * Вход по почте и паролю. Держит сессию и профиль, сам подхватывает
 * возврат по ссылке из письма и выход в другой вкладке.
 *
 * Без ключей Supabase возвращает ready: false — сайт работает как раньше,
 * просто без аккаунта.
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  // Пока сессию не прочитали, шапка не должна мигать «Войти» → «Кабинет».
  const [loading, setLoading] = useState(supabaseReady)

  useEffect(() => {
    if (!supabaseReady) return
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    // Ловим и вход, и выход, и обновление токена — в том числе из другой вкладки.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null)
      setLoading(false)
    })

    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  // Профиль тянем отдельно: в сессии его нет, он живёт в своей таблице.
  const user = session?.user ?? null
  useEffect(() => {
    if (!supabaseReady || !user) { setProfile(null); return }
    let alive = true
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (alive) setProfile(data ?? null) })
    return () => { alive = false }
  }, [user?.id])

  const signUp = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name?.trim() || '' },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw new Error(authErrorKey(error))
    // Если в проекте включено подтверждение почты, сессии сразу не будет —
    // человеку нужно сказать «проверь письмо», а не «готово».
    return { needsConfirm: !data.session }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(authErrorKey(error))
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (error) throw new Error(authErrorKey(error))
  }, [])

  const saveProfile = useCallback(async (patch) => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles').update(patch).eq('id', user.id).select().single()
    if (error) throw new Error(authErrorKey(error))
    setProfile(data)
  }, [user?.id])

  return {
    ready: supabaseReady,
    loading,
    user,
    profile,
    signUp,
    signIn,
    signOut,
    resetPassword,
    saveProfile,
  }
}
