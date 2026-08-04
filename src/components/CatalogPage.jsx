import { motion } from 'framer-motion'
import Card from './Card.jsx'
import Icon from './Icon.jsx'

/**
 * Отдельная страница каталога: свой заголовок, описание и сетка.
 * Ссылки в подвале ведут именно сюда, а не на отфильтрованную главную —
 * у каждой подборки свой адрес, его можно дать ссылкой и открыть из закладок.
 */
export default function CatalogPage({
  t, lang, title, desc, products, onAdd, priceOf, favorites, onFav, onDesigner, onHome,
}) {
  return (
    <section className="section wrap">
      <div className="crumbs">
        <button className="link" onClick={onHome}>{t.nav_home}</button>
        <span>/</span>
        <span className="muted">{title}</span>
      </div>

      <div className="section-head catalog-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p>{desc}</p>
          <span className="page-count">{products.length} {t.goods}</span>
        </div>
        <button className="btn btn-hot big" onClick={onDesigner}>
          <Icon name="brush" /> {t.designer_open}
        </button>
      </div>

      {!products.length && <p className="empty">{t.nothing_found}</p>}

      <motion.div className="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {products.map((p) => (
          <Card
            key={p.id} p={p} lang={lang} t={t}
            onAdd={onAdd} priceOf={priceOf}
            isFav={favorites.includes(p.id)} onFav={onFav}
          />
        ))}
      </motion.div>
    </section>
  )
}
