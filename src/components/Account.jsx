import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from './Icon.jsx'
import PhoneInput from './PhoneInput.jsx'
import { fmt } from '../data.js'
import CityInput from './CityInput.jsx'

/**
 * Личный кабинет без регистрации: только история заказов этого браузера.
 * Кошелёк и коины временно убраны, избранное живёт отдельной страницей.
 */
export default function Account({ t, lang, orders, onClose, auth, onToast }) {
  const user = auth?.user
  // Профиль правим в локальном состоянии и сохраняем кнопкой — иначе каждый
  // введённый символ уходил бы запросом в базу.
  const FIELDS = ['name', 'phone', 'whatsapp', 'telegram', 'city', 'address']
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((f) => [f, ''])))
  const [busy, setBusy] = useState(false)
  const p = auth?.profile
  useEffect(() => {
    setForm(Object.fromEntries(FIELDS.map((f) => [f, p?.[f] || ''])))
    // Пересобираем, когда профиль подгрузился или сменился аккаунт.
  }, [p?.id, p?.name, p?.phone, p?.whatsapp, p?.telegram, p?.city, p?.address])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setBusy(true)
    try {
      await auth.saveProfile(Object.fromEntries(FIELDS.map((f) => [f, form[f].trim()])))
      onToast?.(t.au_saved)
    } catch (e) {
      onToast?.(t[e.message] || t.au_generic)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.aside
      className="drawer account"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div className="drawer-head">
        <h3>{user ? t.au_account : t.my_orders}</h3>
        <button className="x" onClick={onClose} aria-label="close"><Icon name="close" size={15} /></button>
      </div>

      <div className="drawer-list">
        {user && (
          <div className="acc-user">
            <div className="acc-user-top">
              <span className="tile-ic"><Icon name="user" size={18} /></span>
              <div>
                <b>{auth.profile?.name || t.au_account}</b>
                <span className="muted">{user.email}</span>
              </div>
            </div>

            <p className="muted small">{t.au_profile}</p>
            <div className="acc-form">
              <label className="afield"><span>{t.au_name}</span>
                <input value={form.name} onChange={set('name')} /></label>
              <label className="afield"><span>{t.f_phone}</span>
                <PhoneInput value={form.phone}
                  onValue={(v) => setForm((f) => ({ ...f, phone: v }))} /></label>
              <label className="afield"><span>WhatsApp</span>
                <PhoneInput value={form.whatsapp}
                  onValue={(v) => setForm((f) => ({ ...f, whatsapp: v }))} /></label>
              <label className="afield"><span>Telegram</span>
                <input placeholder="@ник" value={form.telegram} onChange={set('telegram')} /></label>
              <label className="afield"><span>{t.f_city}</span>
                <CityInput
                  value={form.city} lang={lang} t={t}
                  onValue={(v) => setForm((f) => ({ ...f, city: v }))}
                /></label>
              <label className="afield wide"><span>{t.address_title}</span>
                <input value={form.address} onChange={set('address')} /></label>
            </div>

            <div className="d-row">
              <button className="btn btn-solid" onClick={save} disabled={busy}>
                {busy ? t.processing : t.au_save}
              </button>
              <button className="btn" onClick={() => { auth.signOut(); onClose() }}>
                {t.au_logout}
              </button>
            </div>
          </div>
        )}

        <h4 className="acc-section">{t.my_orders}</h4>
        {!orders.length && <p className="empty">{t.no_orders}</p>}
        {orders.map((o) => (
          <div key={o.id} className="order">
            <div className="order-top">
              <b>{t.order_no} #{String(o.id).slice(-6)}</b>
              <span>{new Date(o.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'kk-KZ')}</span>
            </div>
            <ul className="order-items">
              {(o.items || []).map((i, n) => (
                <li key={n}><span>{i.title}</span><span className="muted">{i.size} · ×{i.qty}</span></li>
              ))}
            </ul>
            <div className="order-bot">
              <span className="price">{fmt(o.total)}</span>
              <span className="pay-tag"><Icon name="card" size={14} /> Kaspi Pay</span>
            </div>
          </div>
        ))}
      </div>
    </motion.aside>
  )
}
