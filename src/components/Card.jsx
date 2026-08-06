import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import Icon from './Icon.jsx'
import { MARKETS, SIZES, SIZE_LABELS, fmt } from '../data.js'

/* ─────────────── карточка товара ─────────────── */
export default function Card({ p, lang, t, onAdd, isFav, onFav, priceOf, onZoom }) {
  const [hover, setHover] = useState(false)
  const [size, setSize] = useState('XL')
  const [color, setColor] = useState('black')
  const mediaRef = useRef(null)
  const m = MARKETS[p.market]
  const shown = { ...p, photo: p.photos[color] }

  // Отдаём наверх прямоугольник картинки: от него полетит копия в корзину.
  const add = () => onAdd(p, size, color, mediaRef.current?.getBoundingClientRect())

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

      <h3>{p[lang].title}</h3>
      <p className="card-sub">{p[lang].sub}</p>

      <div className="sizes">
        <span className="sizes-label">{t.color}</span>
        {[['black', t.c_black], ['white', t.c_white]].map(([c, label]) => (
          <button key={c} className={`chip ${color === c ? 'on' : ''}`} onClick={() => setColor(c)}>
            {label}
          </button>
        ))}
      </div>

      <div className="sizes">
        <span className="sizes-label">{t.size}</span>
        {SIZES.map((s) => (
          <button key={s} className={`chip ${size === s ? 'on' : ''}`} onClick={() => setSize(s)}>
            {SIZE_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div className="card-foot">
        <span className="price">{fmt(priceOf(p, size))}</span>
        <motion.button className="btn btn-add" onClick={add} whileTap={{ scale: 0.88 }}>
          {t.add}
        </motion.button>
      </div>
    </motion.article>
  )
}
