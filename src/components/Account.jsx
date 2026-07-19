import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth.jsx'
import Tshirt from './Tshirt.jsx'
import Logo from './Logo.jsx'
import { PRODUCTS, fmt } from '../data.js'

const EMOJI = ['😎', '😂', '🗿', '🤡', '👽', '🐈', '🍩', '🔥', '💀', '🧃']

export default function Account({ t, lang, onClose, onToast, onAddToCart }) {
  const { user, profile, orders, favorites, signOut, topup, updateProfile, toggleFavorite } = useAuth()
  const [tab, setTab] = useState('profile')
  const [name, setName] = useState(profile?.name ?? '')
  const [emoji, setEmoji] = useState(profile?.emoji ?? '😎')
  const [busy, setBusy] = useState(false)
  const [savedFlag, setSavedFlag] = useState(false)

  const spent = orders.reduce((s, o) => s + o.total, 0)
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'kk-KZ', { month: 'long', year: 'numeric' })
    : '—'

  const guard = async (fn) => {
    if (busy) return
    setBusy(true)
    try { await fn() } catch (e) { onToast(t[e.message] || t.err_generic) } finally { setBusy(false) }
  }

  const save = () => guard(async () => {
    await updateProfile({ name: name.trim() || null, emoji })
    setSavedFlag(true)
    setTimeout(() => setSavedFlag(false), 1600)
  })

  const favProducts = PRODUCTS.filter((p) => favorites.includes(p.id))

  return (
    <motion.aside
      className="drawer account"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div className="drawer-head">
        <h3>{t.account}</h3>
        <button className="x" onClick={onClose} aria-label="close">✕</button>
      </div>

      <div className="acc-tabs">
        {[['profile', t.tab_profile], ['orders', `${t.tab_orders} ${orders.length ? `(${orders.length})` : ''}`], ['fav', `${t.tab_fav} ${favProducts.length ? `(${favProducts.length})` : ''}`]].map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
            {tab === k && <motion.span layoutId="acc-underline" className="acc-underline" />}
          </button>
        ))}
      </div>

      <div className="drawer-list">
        <AnimatePresence mode="wait">
          {/* ── профиль ── */}
          {tab === 'profile' && (
            <motion.div key="profile" className="acc-pane"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="wcard">
                <div className="wcard-top">
                  <Logo size={28} withWord={false} />
                  <span>{t.wallet}</span>
                </div>
                <div className="wcard-balance">{fmt(profile?.balance ?? 0)}</div>
                <div className="wcard-bottom">
                  <span>🪙 {profile?.coins ?? 0} {t.coins}</span>
                  <span>{user?.email}</span>
                </div>
              </div>

              <div className="topups">
                {[5000, 15000, 50000].map((a) => (
                  <button key={a} className="btn btn-ghost" disabled={busy}
                    onClick={() => guard(async () => { await topup(a); onToast(`${t.topup_added}: +${fmt(a)}`) })}>
                    + {fmt(a)}
                  </button>
                ))}
              </div>

              <div className="acc-stats">
                <div><b>{orders.length}</b><span>{t.orders_count}</span></div>
                <div><b>{fmt(spent)}</b><span>{t.spent}</span></div>
                <div><b>{since}</b><span>{t.member_since}</span></div>
              </div>

              <label className="acc-field">
                <span>{t.name}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name_ph} />
              </label>

              <div className="acc-field">
                <span>{t.pick_emoji}</span>
                <div className="emoji-row">
                  {EMOJI.map((e) => (
                    <button key={e} className={`emoji ${emoji === e ? 'on' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
                  ))}
                </div>
              </div>

              <button className="btn btn-solid full" onClick={save} disabled={busy}>
                {savedFlag ? t.saved : t.save}
              </button>
              <button className="btn full" onClick={() => { signOut(); onClose() }}>{t.logout}</button>
            </motion.div>
          )}

          {/* ── заказы ── */}
          {tab === 'orders' && (
            <motion.div key="orders" className="acc-pane"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {!orders.length && <p className="empty">{t.no_orders}</p>}
              {orders.map((o) => (
                <div key={o.id} className="order">
                  <div className="order-top">
                    <b>{t.order_no} #{String(o.id).slice(0, 8)}</b>
                    <span>{new Date(o.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'kk-KZ')}</span>
                  </div>
                  <ul className="order-items">
                    {(o.items || []).map((i, n) => (
                      <li key={n}><span>{i.title}</span><span className="muted">{i.size} · ×{i.qty}</span></li>
                    ))}
                  </ul>
                  <div className="order-bot">
                    <span className="price">{fmt(o.total)}</span>
                    <span className="coins-badge">🪙 +{o.coins_earned}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── избранное ── */}
          {tab === 'fav' && (
            <motion.div key="fav" className="acc-pane"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {!favProducts.length && <p className="empty">{t.no_fav}</p>}
              {favProducts.map((p) => (
                <div key={p.id} className="line">
                  <div className="line-thumb" style={{ background: p.color }}>
                    <Tshirt product={p} lang={lang} />
                  </div>
                  <div className="line-info">
                    <b>{p[lang].title}</b>
                    <span>{fmt(p.price)}</span>
                    <button className="link" onClick={() => guard(() => toggleFavorite(p.id))}>✕ {t.remove}</button>
                  </div>
                  <button className="btn btn-add" onClick={() => { onAddToCart(p, 'M'); onToast(t.added) }}>
                    {t.add}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
