import { useState } from 'react'
import { motion } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import Icon from './Icon.jsx'
import { fmt } from '../data.js'

/** Строка «поле — значение»; пустое показываем серым, а не прячем. */
function Row({ label, value, muted }) {
  return (
    <div className="co-row">
      <span className="co-label">{label}</span>
      <span className={`co-value ${value ? '' : 'muted'}`}>{value || muted}</span>
    </div>
  )
}

/**
 * Второй шаг оформления: показываем всё, что человек ввёл в корзине,
 * и только здесь — согласие с политикой и оплата. Разнесли на два шага,
 * чтобы форма и кнопка оплаты не жили на одном экране.
 */
export default function CheckoutPage({
  t, lang, cart, resolveItem, subtotal, discount, total, promo,
  customer, checkout, paying, onBack, onPrivacy, onToast,
}) {
  const [agree, setAgree] = useState(false)

  if (!cart.length) {
    return (
      <section className="section wrap">
        <div className="crumbs">
          <button className="link" onClick={onBack}>{t.cart_page_title}</button>
          <span>/</span>
          <span className="muted">{t.co_title}</span>
        </div>
        <h1 className="page-title">{t.co_title}</h1>
        <p className="empty">{t.co_empty}</p>
        <button className="btn btn-solid big" onClick={onBack}>{t.co_back}</button>
      </section>
    )
  }

  const pay = () => {
    if (!agree) return onToast(t.co_need_agree)
    checkout()
  }

  const delivery = (customer.delivery || 'courier') === 'courier' ? t.dv_courier : t.dv_pickup

  return (
    <section className="section wrap">
      <div className="crumbs">
        <button className="link" onClick={onBack}>{t.cart_page_title}</button>
        <span>/</span>
        <span className="muted">{t.co_title}</span>
      </div>

      <div className="section-head">
        <div>
          <h1 className="page-title">{t.co_title}</h1>
          <p>{t.co_sub}</p>
        </div>
      </div>

      <div className="co-grid">
        {/* ── введённые данные ── */}
        <div className="co-side">
          <div className="co-card">
            <div className="co-card-head">
              <h3>{t.co_contacts}</h3>
              <button className="link" onClick={onBack}>{t.co_edit}</button>
            </div>
            <Row label={t.f_name} value={customer.name} muted={t.co_not_set} />
            <Row label={t.f_phone} value={customer.phone} muted={t.co_not_set} />
            <Row label="WhatsApp" value={customer.whatsapp} muted={t.co_not_set} />
            <Row label="Telegram" value={customer.telegram} muted={t.co_not_set} />
          </div>

          <div className="co-card">
            <div className="co-card-head">
              <h3>{t.co_delivery}</h3>
              <button className="link" onClick={onBack}>{t.co_edit}</button>
            </div>
            <Row label={t.delivery_title} value={delivery} muted={t.co_not_set} />
            <Row label={t.f_city} value={customer.city} muted={t.co_not_set} />
            <Row label={t.address_title} value={customer.address} muted={t.co_not_set} />
            <Row label={t.comment_title} value={customer.comment} muted={t.co_not_set} />
          </div>
        </div>

        {/* ── состав заказа и оплата ── */}
        <div className="co-main">
          <div className="co-card">
            <div className="co-card-head">
              <h3>{t.co_order}</h3>
              <button className="link" onClick={onBack}>{t.co_edit}</button>
            </div>

            <div className="co-items">
              {cart.map((i) => {
                const { product, title, price } = resolveItem(i)
                return (
                  <div key={i.key} className="co-item">
                    <div className="co-thumb" style={{ background: product.color }}>
                      <Tshirt product={product} lang={lang} />
                    </div>
                    <div className="co-item-info">
                      <b>{title}</b>
                      <span className="muted">{i.size} · ×{i.qty}</span>
                    </div>
                    <span className="line-price">{fmt(price * i.qty)}</span>
                  </div>
                )
              })}
            </div>

            <div className="cart-totals">
              <div className="row muted"><span>{t.subtotal}</span><b>{fmt(subtotal)}</b></div>
              {discount > 0 && (
                <div className="row muted"><span>{t.discount} · {promo.code}</span><b>−{fmt(discount)}</b></div>
              )}
              <div className="row"><span>{t.total}</span><b>{fmt(total)}</b></div>
            </div>

            {/* Согласие переехало сюда: подтверждаем прямо перед оплатой. */}
            <label className="consent">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                {t.consent_1}{' '}
                <button type="button" className="link" onClick={onPrivacy}>{t.consent_link}</button>.
              </span>
            </label>

            <motion.button
              className="btn btn-kaspi full big"
              onClick={pay} disabled={paying || !agree}
              whileTap={{ scale: 0.98 }}
            >
              <Icon name="card" /> {paying ? t.processing : `${t.co_pay} · ${fmt(total)}`}
            </motion.button>
            <p className="muted small">{t.co_kaspi_note}</p>

            <button className="btn full" onClick={onBack}>{t.co_back}</button>
          </div>
        </div>
      </div>
    </section>
  )
}
