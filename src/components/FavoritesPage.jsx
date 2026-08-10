import { motion } from 'framer-motion'
import Card from './Card.jsx'
import Icon from './Icon.jsx'

/**
 * Избранное отдельной страницей: сердечко на карточке складывает принты сюда,
 * а в нижней панели на неё ведёт своя кнопка.
 */
export default function FavoritesPage({
  t, lang, products, priceOf, favorites, onFav, onZoom, onOpen, onHome, onCatalog,
}) {
  return (
    <section className="section wrap">
      <div className="crumbs">
        <button className="link" onClick={onHome}>{t.nav_home}</button>
        <span>/</span>
        <span className="muted">{t.fav_title}</span>
      </div>

      <div className="section-head">
        <div>
          <h1 className="page-title">{t.fav_title}</h1>
          <p>{t.fav_sub}</p>
          {products.length > 0 && <span className="page-count">{products.length} {t.goods}</span>}
        </div>
      </div>

      {!products.length ? (
        <div className="cart-empty">
          <span className="tile-ic"><Icon name="heart" size={20} /></span>
          <b>{t.fav_empty}</b>
          <button className="btn btn-solid big" onClick={onCatalog}>{t.cta_shop}</button>
        </div>
      ) : (
        <motion.div className="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {products.map((p) => (
            <Card
              key={p.id} p={p} lang={lang} t={t}
              priceOf={priceOf}
              isFav={favorites.includes(p.id)} onFav={onFav}
              onZoom={onZoom} onOpen={onOpen}
            />
          ))}
        </motion.div>
      )}
    </section>
  )
}
