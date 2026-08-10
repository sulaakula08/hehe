import { motion } from 'framer-motion'
import Icon from './Icon.jsx'
import { fmt } from '../data.js'

/**
 * Личный кабинет без регистрации: только история заказов этого браузера.
 * Кошелёк и коины временно убраны, избранное живёт отдельной страницей.
 */
export default function Account({ t, lang, orders, onClose }) {
  return (
    <motion.aside
      className="drawer account"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div className="drawer-head">
        <h3>{t.my_orders}</h3>
        <button className="x" onClick={onClose} aria-label="close"><Icon name="close" size={15} /></button>
      </div>

      <div className="drawer-list">
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
