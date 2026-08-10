import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import Card from './Card.jsx'
import Icon from './Icon.jsx'
import { MARKETS, SIZES, SIZE_LABELS, FITS, fmt } from '../data.js'

/**
 * Отдельная страница товара: крупное фото и полный выбор — крой, цвет,
 * размер, количество. Раньше всё это жило на карточке в сетке, из-за чего
 * карточка была перегружена, а выбрать что-то пальцем на телефоне тяжело.
 */
export default function ProductPage({
  t, lang, product, similar, onAdd, priceOf, favorites, onFav, onZoom,
  onHome, onCatalog, onOpen, onCart, onPay,
}) {
  const isFav = favorites.includes(product?.id)
  const [fit, setFit] = useState('classic')
  const [size, setSize] = useState('XL')
  const [color, setColor] = useState('black')
  const [qty, setQty] = useState(1)
  const mediaRef = useRef(null)

  // Открыли другой товар — выбор начинаем заново, иначе он «перетекает».
  useEffect(() => { setFit('classic'); setSize('XL'); setColor('black'); setQty(1) }, [product?.id])

  if (!product) {
    return (
      <section className="section wrap">
        <div className="crumbs">
          <button className="link" onClick={onHome}>{t.nav_home}</button>
          <span>/</span>
          <span className="muted">{t.pr_notfound}</span>
        </div>
        <h1 className="page-title">{t.pr_notfound}</h1>
        <p className="muted">{t.pr_notfound_d}</p>
        <button className="btn btn-solid big" onClick={onCatalog}>{t.foot_all}</button>
      </section>
    )
  }

  const m = MARKETS[product.market]
  const shown = { ...product, photo: product.photos[color] }
  const unit = priceOf(product, size, fit)

  const add = () => {
    // Количество отправляем одним вызовом: qty раз дёргать корзину не нужно.
    onAdd(product, size, color, mediaRef.current?.getBoundingClientRect(), { fit, qty })
  }
  const buyNow = () => { add(); onCart() }

  return (
    <>
      <section className="section wrap">
        <div className="crumbs">
          <button className="link" onClick={onHome}>{t.nav_home}</button>
          <span>/</span>
          <button className="link" onClick={onCatalog}>{t.foot_all}</button>
          <span>/</span>
          <span className="muted">{product[lang].title}</span>
        </div>

        <div className="pdp">
          {/* ── фото ── */}
          <div className="pdp-media">
            <motion.div
              ref={mediaRef}
              className="pdp-photo"
              role="button" tabIndex={0}
              aria-label={t.zoom_in} title={t.zoom_in}
              onClick={() => onZoom?.(shown)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onZoom?.(shown))}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: `radial-gradient(circle at 50% 40%, ${product.color}22, transparent 70%)` }}
            >
              <Tshirt product={shown} lang={lang} hovered big />
              <span className="zoom-hint"><Icon name="plus" size={13} /></span>
            </motion.div>

            <div className="pdp-thumbs">
              {[['black', t.c_black], ['white', t.c_white]].map(([c, label]) => (
                <button
                  key={c}
                  className={`pdp-thumb ${color === c ? 'on' : ''}`}
                  onClick={() => setColor(c)}
                  aria-label={label} title={label}
                >
                  <img src={product.photos[c]} alt={label} loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          {/* ── выбор ── */}
          <div className="pdp-info">
            <div className="pdp-badges">
              <span className="rarity" style={{ background: m.color }}>{m[lang]}</span>
              {product.fresh && <span className="rarity is-new">{t.badge_new}</span>}
            </div>

            <h1 className="pdp-title">{product[lang].title}</h1>
            <p className="pdp-sub">{product[lang].sub}</p>
            <div className="pdp-price">{fmt(unit)}</div>

            <div className="pdp-opt">
              <span className="pdp-opt-label">{t.pr_fit}</span>
              <div className="pdp-chips">
                {Object.entries(FITS).map(([k, v]) => (
                  <button key={k} className={`chip big ${fit === k ? 'on' : ''}`} onClick={() => setFit(k)}>
                    {v[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp-opt">
              <span className="pdp-opt-label">{t.color}</span>
              <div className="pdp-chips">
                {[['black', t.c_black], ['white', t.c_white]].map(([c, label]) => (
                  <button key={c} className={`chip big ${color === c ? 'on' : ''}`} onClick={() => setColor(c)}>
                    <i className="dot-color" style={{ background: c === 'black' ? '#141414' : '#f0efec' }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp-opt">
              <span className="pdp-opt-label">{t.size}</span>
              <div className="pdp-chips">
                {SIZES.map((s) => (
                  <button key={s} className={`chip big ${size === s ? 'on' : ''}`} onClick={() => setSize(s)}>
                    {SIZE_LABELS[s] ?? s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp-opt">
              <span className="pdp-opt-label">{t.pr_qty}</span>
              <div className="pdp-qty">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−">
                  <Icon name="minus" size={16} />
                </button>
                <b>{qty}</b>
                <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="+">
                  <Icon name="plus" size={16} />
                </button>
              </div>
            </div>

            {qty > 1 && (
              <div className="pdp-total">
                {t.pr_total} {qty} {t.pr_pcs}: <b>{fmt(unit * qty)}</b>
              </div>
            )}

            <div className="pdp-actions">
              <motion.button className="btn btn-solid big" onClick={add} whileTap={{ scale: 0.95 }}>
                <Icon name="cart" /> {t.add}
              </motion.button>
              <motion.button className="btn btn-hot big" onClick={buyNow} whileTap={{ scale: 0.95 }}>
                {t.pr_buy}
              </motion.button>
              <button
                className={`btn pdp-fav ${isFav ? 'on' : ''}`}
                onClick={() => onFav(product)}
                aria-label={t.to_fav} title={t.to_fav}
              >
                <Icon name="heart" size={18} style={{ fill: isFav ? 'currentColor' : 'none' }} />
              </button>
            </div>

            <div className="pdp-facts">
              <h4>{t.pr_care_h}</h4>
              <ul>{t.pr_care.map((c) => <li key={c}>{c}</li>)}</ul>
              <h4>{t.pr_ship_h}</h4>
              <p className="muted">{t.pr_ship}</p>
              <button className="link" onClick={onPay}>{t.pr_ship_link} →</button>
            </div>
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="section wrap">
          <div className="section-head"><h2>{t.pr_similar}</h2></div>
          <div className="grid">
            {similar.map((s) => (
              <Card
                key={s.id} p={s} lang={lang} t={t}
                onAdd={onAdd} priceOf={priceOf}
                isFav={favorites.includes(s.id)} onFav={onFav}
                onZoom={onZoom} onOpen={onOpen}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
