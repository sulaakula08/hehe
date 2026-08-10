import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import Icon from './Icon.jsx'
import { MARKETS, fmt } from '../data.js'

/**
 * Карточка в сетке: фото, название и цена. Выбор кроя, цвета, размера и
 * количества переехал на страницу товара — на телефоне карточка шириной
 * ~170px не вмещала пять рядов чипов, и попасть по ним пальцем было тяжело.
 * Тап по фото по-прежнему увеличивает саму футболку, а не карточку.
 */
export default function Card({ p, lang, t, priceOf, isFav, onFav, onZoom, onOpen }) {
  const [hover, setHover] = useState(false)
  const mediaRef = useRef(null)
  const m = MARKETS[p.market]
  const shown = { ...p, photo: p.photos.black }

  return (
    <motion.article
      /* Без layout: карточка рендерится в двух сетках («что покупают» и каталог),
         и проекция layout-анимации оставляла на них залипший translateY —
         первая карточка наезжала на заголовок секции. Появление и фильтрацию
         анимируют initial/whileInView и AnimatePresence, их достаточно. */
      id={`card-${p.id}`}
      className="card"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ y: -8 }}
    >
      <span className="rarity" style={{ background: m.color }}>{m[lang]}</span>
      {p.fresh && <span className="rarity is-new">{t.badge_new}</span>}

      <motion.button
        className={`fav ${isFav ? 'on' : ''}`}
        onClick={() => onFav(p)}
        whileTap={{ scale: 0.8 }}
        animate={isFav ? { scale: [1, 1.35, 1] } : {}}
        aria-label={t.to_fav}
        title={t.to_fav}
      >
        <Icon name="heart" size={17} style={{ fill: isFav ? 'currentColor' : 'none' }} />
      </motion.button>

      {/* Растёт только футболка — в отдельном просмотре поверх страницы.
          Раньше разворачивалась вся карточка и распихивала соседние. */}
      <div
        ref={mediaRef}
        className="card-media"
        role="button" tabIndex={0}
        aria-label={t.zoom_in} title={t.zoom_in}
        onClick={() => onZoom?.(shown)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onZoom?.(shown))}
        style={{ background: `radial-gradient(circle at 50% 40%, ${p.color}22, transparent 70%)` }}
      >
        <Tshirt product={shown} lang={lang} hovered={hover} />
        <span className="zoom-hint"><Icon name="plus" size={13} /></span>
      </div>

      <h3 className="card-title" role="button" tabIndex={0}
        onClick={() => onOpen?.(p)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen?.(p))}
      >
        {p[lang].title}
      </h3>
      <p className="card-sub">{p[lang].sub}</p>

      <div className="card-foot">
        <span className="price">{fmt(priceOf(p, 'XL', 'classic'))}</span>
        <motion.button className="btn btn-add" onClick={() => onOpen?.(p)} whileTap={{ scale: 0.88 }}>
          {t.pr_choose}
        </motion.button>
      </div>
    </motion.article>
  )
}
