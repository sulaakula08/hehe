import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import Logo from './Logo.jsx'
import Icon from './Icon.jsx'
import { PRODUCTS, fmt } from '../data.js'

/**
 * Кошелёк без аккаунта: баланс, коины, локальная история заказов и избранное.
 * Регистрации нет — всё живёт в браузере.
 */
export default function Account({
  t, lang, wallet, orders, favorites,
  onTopup, onToggleFav, onClose, onToast, onAddToCart,
}) {
  const [tab, setTab] = useState('wallet')

  const spent = orders.reduce((s, o) => s + o.total, 0)
  const favProducts = PRODUCTS.filter((p) => favorites.includes(p.id))

  const tabs = [
    ['wallet', t.tab_wallet],
    ['orders', `${t.tab_orders}${orders.length ? ` (${orders.length})` : ''}`],
    ['fav', `${t.tab_fav}${favProducts.length ? ` (${favProducts.length})` : ''}`],
  ]

  return (
    <motion.aside
      className="drawer account"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div className="drawer-head">
        <h3>{t.account}</h3>
        <button className="x" onClick={onClose} aria-label="close"><Icon name="close" size={15} /></button>
      </div>

      <div className="acc-tabs">
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
            {tab === k && <motion.span layoutId="acc-underline" className="acc-underline" />}
          </button>
        ))}
      </div>

      <div className="drawer-list">
        {/* Без mode="wait": он монтирует новую вкладку только после того, как
            доиграет выход старой — если анимация встанет, вкладка останется пустой. */}
        <AnimatePresence>
          {/* ── кошелёк ── */}
          {tab === 'wallet' && (
            <motion.div key="wallet" className="acc-pane"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="wcard">
                <div className="wcard-top">
                  <Logo size={28} withWord={false} />
                  <span>{t.wallet}</span>
                </div>
                <div className="wcard-balance">{fmt(wallet.balance)}</div>
                <div className="wcard-bottom">
                  <span className="with-icon"><Icon name="coin" size={15} /> {wallet.coins} {t.coins}</span>
                  <span>•••• 4242</span>
                </div>
              </div>

              <p className="muted center">{t.cashback}</p>

              <div className="topups">
                {[5000, 15000, 50000].map((a) => (
                  <button key={a} className="btn btn-ghost" onClick={() => onTopup(a)}>
                    + {fmt(a)}
                  </button>
                ))}
              </div>

              <div className="acc-stats">
                <div><b>{orders.length}</b><span>{t.orders_count}</span></div>
                <div><b>{fmt(spent)}</b><span>{t.spent}</span></div>
                <div><b className="with-icon"><Icon name="coin" size={14} /> {wallet.coins}</b><span>{t.coins}</span></div>
              </div>
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
                    <span className="pay-tag">
                      <Icon name={o.method === 'wallet' ? 'wallet' : 'card'} size={14} />
                      {o.method === 'wallet' ? t.pay_wallet : t.pay_card}
                    </span>
                    {o.coins_earned > 0 && (
                      <span className="coins-badge with-icon"><Icon name="coin" size={13} /> +{o.coins_earned}</span>
                    )}
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
                    <button className="link" onClick={() => onToggleFav(p.id)}>{t.remove}</button>
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
