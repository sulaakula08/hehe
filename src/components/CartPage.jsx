import { AnimatePresence, motion } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import Icon from './Icon.jsx'
import Card from './Card.jsx'
import PhoneInput from './PhoneInput.jsx'
import CityInput from './CityInput.jsx'
import { fmt } from '../data.js'

/**
 * Корзина и оформление одной страницей, по структуре образца: список товаров,
 * сводка, форма покупателя, промокод, способ доставки, адрес, комментарий,
 * согласие и кнопка оплаты. Внизу — что ещё добавить к заказу.
 */
export default function CartPage({
  t, lang, cart, resolveItem, setQty, removeFromCart,
  subtotal, discount, total, promo, promoInput, setPromoInput, applyPromo,
  customer, setCustomer, count, upsell, onAdd, priceOf, favorites, onFav,
  onHome, onCatalog, onZoom, onOpen, onNext,
}) {
  const set = (k) => (e) => setCustomer((c) => ({ ...c, [k]: e.target.value }))

  return (
    <section className="section wrap">
      <div className="crumbs">
        <button className="link" onClick={onHome}>{t.nav_home}</button>
        <span>/</span>
        <span className="muted">{t.cart_page_title}</span>
      </div>

      <div className="section-head">
        <div>
          <h1 className="page-title">{t.cart_page_title}</h1>
          <p>{t.cart_page_sub}</p>
        </div>
      </div>

      {/* ── сводка ── */}
      <div className="cart-sum">
        <div className="cart-sum-box"><b>{fmt(total)}</b><span>{t.total}</span></div>
        <div className="cart-sum-box"><b>{count}</b><span>{t.goods.toLowerCase()}</span></div>
      </div>

      {!cart.length ? (
        <div className="cart-empty">
          <span className="tile-ic"><Icon name="cart" size={20} /></span>
          <b>{t.cart_empty}</b>
          <p className="muted">{t.cart_empty_hint}</p>
          <button className="btn btn-solid big" onClick={onCatalog}>{t.cta_shop}</button>
        </div>
      ) : (
        <div className="cart-grid">
          {/* ── список товаров ── */}
          <div className="cart-items">
            <AnimatePresence>
              {cart.map((i) => {
                const { product, title, price } = resolveItem(i)
                return (
                  <motion.div
                    key={i.key} className="line"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  >
                    <div
                      className="line-thumb tee-zoomable" style={{ background: product.color }}
                      role="button" tabIndex={0}
                      aria-label={t.zoom_in} title={t.zoom_in}
                      onClick={() => onZoom?.(product)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onZoom?.(product))}
                    >
                      <Tshirt product={product} lang={lang} />
                    </div>
                    <div className="line-info">
                      <b>{title}</b>
                      <span>{i.size}</span>
                      <div className="qty">
                        <button onClick={() => setQty(i.key, -1)} aria-label="−"><Icon name="minus" size={14} /></button>
                        <b>{i.qty}</b>
                        <button onClick={() => setQty(i.key, +1)} aria-label="+"><Icon name="plus" size={14} /></button>
                      </div>
                    </div>
                    <div className="line-end">
                      <span className="line-price">{fmt(price * i.qty)}</span>
                      <button className="link" onClick={() => removeFromCart(i.key)}>{t.remove}</button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* ── оформление ── */}
          <div className="cart-form">
            <h3>{t.checkout_title}</h3>
            <p className="cart-notice"><Icon name="chat" size={15} /> {t.cart_notice}</p>
            <div className="ship-grid">
              <label className="afield"><span>{t.f_name}</span>
                <input value={customer.name} onChange={set('name')} /></label>
              <label className="afield"><span>{t.f_phone}</span>
                <PhoneInput value={customer.phone}
                  onValue={(v) => setCustomer((c) => ({ ...c, phone: v }))} /></label>
              <label className="afield"><span>WhatsApp</span>
                <PhoneInput value={customer.whatsapp || ''}
                  onValue={(v) => setCustomer((c) => ({ ...c, whatsapp: v }))} /></label>
              <label className="afield"><span>Telegram</span>
                <input placeholder="@ник" value={customer.telegram || ''} onChange={set('telegram')} /></label>
            </div>

            <h3>{t.promo_title}</h3>
            <div className="promo">
              <input
                placeholder={t.promo_ph} value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
              />
              <button className="btn" onClick={applyPromo}>{t.apply}</button>
            </div>
            <p className="muted small">{t.promo_hint}</p>

            <h3>{t.delivery_title}</h3>
            <div className="d-row">
              {[['courier', t.dv_courier, t.dv_courier_d], ['pickup', t.dv_pickup, t.dv_pickup_d]].map(([k, label, hint]) => (
                <button
                  key={k}
                  className={`chip big ${(customer.delivery || 'courier') === k ? 'on' : ''}`}
                  onClick={() => setCustomer((c) => ({ ...c, delivery: k }))}
                  title={hint}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="muted small">
              {(customer.delivery || 'courier') === 'courier' ? t.dv_courier_d : t.dv_pickup_d}
            </p>

            <label className="afield"><span>{t.f_city}</span>
              <CityInput
                value={customer.city} lang={lang} t={t}
                onValue={(v) => setCustomer((c) => ({ ...c, city: v }))}
              /></label>
            <label className="afield"><span>{t.address_title}</span>
              <input value={customer.address} onChange={set('address')} /></label>
            <label className="afield"><span>{t.comment_title}</span>
              <textarea rows={3} value={customer.comment || ''} onChange={set('comment')} /></label>

            {/* Оплата и согласие переехали на второй шаг — «Проверьте свои
                данные». Здесь только состав заказа и данные покупателя. */}
            <div className="cart-totals">
              {discount > 0 && (
                <div className="row muted"><span>{t.discount} · {promo.code}</span><b>−{fmt(discount)}</b></div>
              )}
              <div className="row muted"><span>{t.subtotal}</span><b>{fmt(subtotal)}</b></div>
              <div className="row"><span>{t.total}</span><b>{fmt(total)}</b></div>
            </div>

            <button className="btn btn-solid full big" onClick={onNext} disabled={!cart.length}>
              {t.next_step} →
            </button>
          </div>
        </div>
      )}

      {/* ── добавить к заказу ── */}
      {upsell.length > 0 && (
        <>
          <div className="section-head upsell-head">
            <div><h2>{t.upsell_title}</h2><p>{t.upsell_sub}</p></div>
            <button className="link big" onClick={onCatalog}>{t.see_all} →</button>
          </div>
          <div className="grid">
            {upsell.map((p) => (
              <Card
                key={`up-${p.id}`} p={p} lang={lang} t={t}
                onAdd={onAdd} priceOf={priceOf}
                isFav={favorites.includes(p.id)} onFav={onFav} onZoom={onZoom} onOpen={onOpen}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
