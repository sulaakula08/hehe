import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Logo from './Logo.jsx'

export default function AuthModal({ t, onClose, onDone, startMode = 'in' }) {
  const { signUp, signIn, signInWithGoogle, isConfigured } = useAuth()
  const [mode, setMode] = useState(startMode)   // 'in' | 'up'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const up = mode === 'up'

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!email.trim() || !password || (up && !name.trim())) return setErr(t.err_fill)

    setBusy(true); setErr('')
    try {
      if (up) {
        const { needsConfirm } = await signUp(email.trim(), password, name.trim())
        onDone(needsConfirm ? t.confirm_sent : `${t.welcome}, ${name.trim()}! 👋`)
      } else {
        await signIn(email.trim(), password)
        onDone(`${t.welcome}! 👋`)
      }
      onClose()
    } catch (e2) {
      setErr(t[e2.message] || t.err_generic)
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setBusy(true); setErr('')
    try { await signInWithGoogle() }         // уводит на редирект
    catch (e2) { setErr(t[e2.message] || t.err_generic); setBusy(false) }
  }

  return (
    <motion.div
      className="modal auth-modal"
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 30 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
    >
      <button className="x float" onClick={onClose} aria-label="close">✕</button>

      <div className="auth-head">
        <Logo size={40} withWord={false} />
        <div>
          <h3>{up ? t.auth_title_up : t.auth_title_in}</h3>
          <p className="muted">{up ? t.auth_sub_up : t.auth_sub_in}</p>
        </div>
      </div>

      {!isConfigured && <div className="warn">{t.not_setup}</div>}

      <div className="auth-tabs">
        {[['in', t.login], ['up', t.signup]].map(([m, label]) => (
          <button
            key={m}
            className={mode === m ? 'on' : ''}
            onClick={() => { setMode(m); setErr('') }}
            type="button"
          >
            {label}
            {mode === m && <motion.span layoutId="auth-pill" className="auth-pill" />}
          </button>
        ))}
      </div>

      <form className="auth-form" onSubmit={submit}>
        {up && (
          <label>
            <span>{t.name}</span>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t.name_ph} autoComplete="name" disabled={!isConfigured}
            />
          </label>
        )}
        <label>
          <span>{t.email}</span>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="hehe@mail.kz" autoComplete="email" disabled={!isConfigured}
          />
        </label>
        <label>
          <span>{t.password}</span>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••" minLength={6}
            autoComplete={up ? 'new-password' : 'current-password'} disabled={!isConfigured}
          />
        </label>

        {err && (
          <motion.div className="auth-err" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            {err}
          </motion.div>
        )}

        <button className="btn btn-solid full" disabled={busy || !isConfigured}>
          {busy ? t.processing : up ? t.signup : t.login}
        </button>
      </form>

      <div className="auth-or"><span>{t.or}</span></div>

      <button className="btn full google" onClick={google} disabled={busy || !isConfigured} type="button">
        <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.6l7.8 6c1.9-5.7 7.2-10.1 13.6-10.1z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.4 28.4c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.6 10.4l7.8-6z" />
          <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.4 0-11.7-4.3-13.6-10.1l-7.8 6C6.5 42.2 14.6 47.5 24 47.5z" />
        </svg>
        {t.google}
      </button>

      <p className="auth-swap muted center">
        {up ? t.have_acc : t.no_acc}{' '}
        <button type="button" className="link" onClick={() => { setMode(up ? 'in' : 'up'); setErr('') }}>
          {up ? t.login : t.signup}
        </button>
      </p>
    </motion.div>
  )
}
