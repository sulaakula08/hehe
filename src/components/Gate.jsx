import { useState } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo.jsx'
import Icon from './Icon.jsx'
import { ADMIN_PASS } from '../data.js'

// Вход ненастоящий: бэкенда нет, пароль никуда не уходит и нигде не
// сохраняется — в localStorage кладём только почту и признак админа.
// Пускаем с любой почтой и любым паролем; админский пароль даёт доступ
// к панели. Это витрина-демо, а не система безопасности.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Gate({ t, lang, onEnter, theme, setTheme, setLang }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const mail = email.trim().toLowerCase()
    if (!EMAIL_RE.test(mail)) return setErr(t.gate_bad_email)
    if (pass.length < 4) return setErr(t.gate_bad_pass)
    // Пароль дальше не живёт: сравнили и забыли.
    onEnter({ email: mail, admin: pass === ADMIN_PASS })
  }

  return (
    <div className="gate">
      <div className="gate-side">
        <div className="gate-topbar">
          <button
            className="btn btn-icon"
            onClick={() => setTheme((th) => (th === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? t.theme_light : t.theme_dark}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
          <div className="lang-switch">
            {['ru', 'kk'].map((l) => (
              <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
                {l === 'ru' ? 'RU' : 'ҚАЗ'}
              </button>
            ))}
          </div>
        </div>

        <motion.form
          className="gate-card"
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <Logo size={40} />
          <h1 className="gate-title">{t.gate_title}</h1>
          <p className="muted">{t.gate_sub}</p>

          <label className="gate-field">
            <span>{t.gate_email}</span>
            <input
              type="email" inputMode="email" autoComplete="email" autoFocus
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr('') }}
            />
          </label>

          <label className="gate-field">
            <span>{t.gate_pass}</span>
            <input
              type="password" autoComplete="current-password"
              placeholder="••••••"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setErr('') }}
            />
          </label>

          {err && <p className="gate-err">{err}</p>}

          <button className="btn btn-solid full big">{t.gate_enter}</button>
          <p className="gate-note">{t.gate_note}</p>
        </motion.form>
      </div>

      <div className="gate-art" aria-hidden="true">
        <div className="gate-blob b1" />
        <div className="gate-blob b2" />
        <p className="gate-slogan">{t.tagline}</p>
      </div>
    </div>
  )
}
