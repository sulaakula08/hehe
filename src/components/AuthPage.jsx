import { useState } from 'react'
import { motion } from 'framer-motion'
import Icon from './Icon.jsx'

/**
 * Вход и регистрация по почте одной страницей: две вкладки, общая форма.
 * Отдельного экрана «забыли пароль» нет — письмо со ссылкой отправляем
 * прямо отсюда, по адресу, который человек уже ввёл.
 */
export default function AuthPage({ t, auth, onHome, onToast, onDone }) {
  const [mode, setMode] = useState('in')          // 'in' | 'up'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState('')            // сообщение «проверьте почту»

  const up = mode === 'up'

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr(''); setSent('')

    if (!email.trim() || !password) return setErr(t.au_fill)
    if (up && password.length < 6) return setErr(t.au_min_pass)

    setBusy(true)
    try {
      if (up) {
        const { needsConfirm } = await auth.signUp(email, password, name)
        if (needsConfirm) {
          // Сессии нет — в проекте включено подтверждение почты.
          setSent(t.au_confirm)
        } else {
          onToast(t.au_registered)
          onDone()
        }
      } else {
        await auth.signIn(email, password)
        onToast(t.au_welcome)
        onDone()
      }
    } catch (e2) {
      setErr(t[e2.message] || t.au_generic)
    } finally {
      setBusy(false)
    }
  }

  const forgot = async () => {
    if (!email.trim()) return setErr(t.au_fill)
    setBusy(true); setErr(''); setSent('')
    try {
      await auth.resetPassword(email)
      setSent(t.au_reset_sent)
    } catch (e2) {
      setErr(t[e2.message] || t.au_generic)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section wrap">
      <div className="crumbs">
        <button className="link" onClick={onHome}>{t.nav_home}</button>
        <span>/</span>
        <span className="muted">{up ? t.au_signup : t.au_login}</span>
      </div>

      <motion.div
        className="authbox"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="auth-tabs">
          {[['in', t.au_login], ['up', t.au_signup]].map(([k, label]) => (
            <button
              key={k}
              className={mode === k ? 'on' : ''}
              onClick={() => { setMode(k); setErr(''); setSent('') }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <h1 className="page-title">{up ? t.au_title_up : t.au_title_in}</h1>
        <p className="muted">{up ? t.au_sub_up : t.au_sub_in}</p>

        {!auth.ready && <p className="cart-notice"><Icon name="chat" size={15} /> {t.au_off}</p>}

        <form className="auth-form" onSubmit={submit}>
          {up && (
            <label className="afield">
              <span>{t.au_name}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
          )}

          <label className="afield">
            <span>{t.au_email}</span>
            <input
              type="email" inputMode="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="afield">
            <span>{t.au_password}</span>
            <input
              type="password"
              autoComplete={up ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {err && <p className="auth-err">{err}</p>}
          {sent && <p className="auth-ok"><Icon name="check" size={15} /> {sent}</p>}

          <button className="btn btn-solid full big" disabled={busy || !auth.ready}>
            {busy ? t.processing : (up ? t.au_signup : t.au_login)}
          </button>
        </form>

        <div className="auth-foot">
          <button className="link" onClick={() => { setMode(up ? 'in' : 'up'); setErr(''); setSent('') }}>
            {up ? t.au_have : t.au_no}
          </button>
          {!up && <button className="link" onClick={forgot} disabled={busy}>{t.au_forgot}</button>}
        </div>
      </motion.div>
    </section>
  )
}
