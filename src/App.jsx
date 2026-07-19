import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import Logo from './components/Logo.jsx'
import Tshirt from './components/Tshirt.jsx'
import Account from './components/Account.jsx'
import Designer from './components/Designer.jsx'
import Icon from './components/Icon.jsx'
import { PRODUCTS, RARITY, SIZES, T, fmt, CUSTOM_PRICE } from './data.js'

const load = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d }
}
const save = (k, v) => {
  // Дизайны из конструктора хранят картинку, поэтому запись может упереться
  // в квоту localStorage — состояние в памяти при этом остаётся целым.
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* переполнили квоту */ }
}

/* ─────────────── бегущая строка ─────────────── */
function Ticker({ text }) {
  return (
    <div className="ticker">
      <motion.div
        className="ticker-row"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i}>{text} <b>✱</b> </span>
        ))}
      </motion.div>
    </div>
  )
}

/* ─────────────── карточка товара ─────────────── */
function Card({ p, lang, t, onAdd, isFav, onFav }) {
  const [hover, setHover] = useState(false)
  const [size, setSize] = useState('M')
  const [justAdded, setJustAdded] = useState(false)
  const r = RARITY[p.rarity]

  const add = () => {
    onAdd(p, size)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <motion.article
      layout
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
      <span className="rarity" style={{ background: r.color }}>{r[lang]}</span>

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

      <div className="card-media" style={{ background: `radial-gradient(circle at 50% 40%, ${p.color}22, transparent 70%)` }}>
        <Tshirt product={p} lang={lang} hovered={hover} />
      </div>

      <h3>{p[lang].title}</h3>
      <p className="card-sub">{p[lang].sub}</p>

      <div className="sizes">
        <span className="sizes-label">{t.size}</span>
        {SIZES.map((s) => (
          <button key={s} className={`chip ${size === s ? 'on' : ''}`} onClick={() => setSize(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="card-foot">
        <span className="price">{fmt(p.price)}</span>
        <motion.button className="btn btn-add" onClick={add} whileTap={{ scale: 0.92 }}>
          {justAdded ? t.added : t.add}
        </motion.button>
      </div>
    </motion.article>
  )
}

/* ─────────────── таймер дропа ─────────────── */
function Countdown({ t }) {
  const target = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + ((7 - d.getDay()) || 7))
    d.setHours(23, 59, 59, 0)
    return d
  }, [])
  const [left, setLeft] = useState(target - Date.now())

  useEffect(() => {
    const i = setInterval(() => setLeft(target - Date.now()), 1000)
    return () => clearInterval(i)
  }, [target])

  const sec = Math.max(0, Math.floor(left / 1000))
  const parts = [
    [Math.floor(sec / 86400), t.d],
    [Math.floor((sec % 86400) / 3600), t.h],
    [Math.floor((sec % 3600) / 60), t.m],
    [sec % 60, t.s],
  ]

  return (
    <div className="drop">
      <span className="drop-title">{t.drop_title}</span>
      <div className="drop-nums">
        {parts.map(([v, l]) => (
          <div key={l} className="drop-cell">
            <b>{String(v).padStart(2, '0')}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── приложение ─────────────── */
export default function App() {
  const [lang, setLang] = useState(() => load('hehe.lang', 'ru'))
  const [theme, setTheme] = useState(() => load('hehe.theme', null)
    ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [cart, setCart] = useState(() => load('hehe.cart', []))
  const [wallet, setWallet] = useState(() => load('hehe.wallet', { balance: 25000, coins: 0 }))
  const [favorites, setFavorites] = useState(() => load('hehe.fav', []))
  const [orders, setOrders] = useState(() => load('hehe.orders', []))
  const [payMethod, setPayMethod] = useState(() => load('hehe.pay', 'card'))

  const [openCart, setOpenCart] = useState(false)
  const [openAccount, setOpenAccount] = useState(false)
  const [openDesigner, setOpenDesigner] = useState(false)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [paying, setPaying] = useState(false)
  const t = T[lang]

  useEffect(() => save('hehe.lang', lang), [lang])
  useEffect(() => save('hehe.cart', cart), [cart])
  useEffect(() => save('hehe.wallet', wallet), [wallet])
  useEffect(() => save('hehe.fav', favorites), [favorites])
  useEffect(() => save('hehe.orders', orders), [orders])
  useEffect(() => save('hehe.pay', payMethod), [payMethod])
  useEffect(() => { document.documentElement.lang = lang === 'ru' ? 'ru' : 'kk' }, [lang])
  useEffect(() => {
    save('hehe.theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })

  // Один таймер на все тосты: иначе таймер предыдущего гасит только что показанный.
  const toastTimer = useRef(null)
  const say = (msg) => {
    clearTimeout(toastTimer.current)
    setToast({ msg, id: Math.random() })
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const addToCart = (p, size) => {
    setCart((c) => {
      const key = p.id + size
      const found = c.find((i) => i.key === key)
      if (found) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i))
      return [...c, { key, id: p.id, size, qty: 1 }]
    })
  }

  const addCustomToCart = (design, size) => {
    setCart((c) => [...c, { key: `custom-${Date.now()}`, id: 'custom', size, qty: 1, custom: design }])
  }

  /** Приводит строку корзины к единому виду: что рисовать, как назвать, почём. */
  const resolveItem = (i) => {
    if (i.custom) {
      const { fabric, ink } = i.custom
      // До появления сторон дизайн лежал плоско. Корзина у людей могла
      // сохраниться в старом виде — читаем её как «только перёд».
      const front = i.custom.front ?? (i.custom.text != null || i.custom.image ? i.custom : null)
      const back = i.custom.back ?? null
      const has = (s) => s && (s.image || (s.text ?? '').trim() !== '')
      const shown = has(front) ? front : back
      const firstText = (front?.text || back?.text || '').split('\n')[0]
      const both = has(front) && has(back)
      const label = firstText
        ? `${t.designer}: «${firstText}»${both ? ` (${t.d_both})` : ''}`
        : `${t.designer}${both ? ` (${t.d_both})` : ''}`
      return {
        price: CUSTOM_PRICE,
        title: label,
        product: { id: i.key, color: fabric, ink, custom: { ...shown, fabric, ink }, ru: {}, kk: {} },
      }
    }
    const p = PRODUCTS.find((x) => x.id === i.id)
    return { price: p.price, title: p[lang].title, product: p }
  }

  const removeFromCart = (key) => setCart((c) => c.filter((i) => i.key !== key))
  const setQty = (key, delta) => setCart((c) => c
    .map((i) => (i.key === key ? { ...i, qty: i.qty + delta } : i))
    .filter((i) => i.qty > 0))

  const total = cart.reduce((s, i) => s + resolveItem(i).price * i.qty, 0)
  const count = cart.reduce((s, i) => s + i.qty, 0)
  const cashback = Math.round(total * 0.07)

  /** Оплата пока фейковая: карта всегда проходит, кошелёк проверяет баланс. */
  const checkout = async () => {
    if (!cart.length || paying) return
    if (payMethod === 'wallet' && wallet.balance < total) return say(t.pay_fail)

    setPaying(true)
    if (payMethod === 'card') {
      say(t.authorizing)
      await new Promise((r) => setTimeout(r, 900))   // имитация авторизации
    }

    const order = {
      id: `${Date.now()}`,
      created_at: new Date().toISOString(),
      method: payMethod,
      total,
      coins_earned: payMethod === 'wallet' ? cashback : 0,
      items: cart.map((i) => {
        const { price, title } = resolveItem(i)
        return { id: i.id, size: i.size, qty: i.qty, price, title }
      }),
    }

    if (payMethod === 'wallet') {
      setWallet((w) => ({ balance: w.balance - total, coins: w.coins + cashback }))
    }
    setOrders((o) => [order, ...o])
    setCart([])
    setPaying(false)
    setOpenCart(false)
    say(payMethod === 'wallet' ? `${t.pay_ok} +${cashback} ${t.added_coins}` : t.pay_ok)
  }

  const topup = (amount) => {
    setWallet((w) => ({ ...w, balance: w.balance + amount }))
    say(`${t.topup_added}: +${fmt(amount)}`)
  }

  const onFav = (p) => setFavorites((f) => (f.includes(p.id) ? f.filter((x) => x !== p.id) : [...f, p.id]))

  const shown = filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.rarity === filter)

  const anyOverlay = openCart || openAccount || openDesigner
  const closeOverlays = () => { setOpenCart(false); setOpenAccount(false); setOpenDesigner(false) }

  return (
    <>
      <motion.div className="scrollbar" style={{ scaleX: bar }} />

      {/* ── шапка ── */}
      <header className="nav">
        <Logo />
        <nav className="nav-links">
          <a href="#catalog">{t.nav_shop}</a>
          <a href="#how">{t.nav_how}</a>
        </nav>
        <div className="nav-right">
          <button
            className="btn btn-icon"
            onClick={() => setTheme((th) => (th === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? t.theme_light : t.theme_dark}
            aria-label={theme === 'dark' ? t.theme_light : t.theme_dark}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>

          <div className="lang-switch">
            {['ru', 'kk'].map((l) => (
              <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
                {T[l].lang}
              </button>
            ))}
          </div>

          <button className="btn btn-ghost" onClick={() => setOpenAccount(true)}>
            <Icon name="wallet" /> {fmt(wallet.balance)}
          </button>

          <motion.button
            className="btn btn-solid"
            onClick={() => setOpenCart(true)}
            animate={count ? { scale: [1, 1.12, 1] } : {}}
            key={count}
          >
            <Icon name="cart" /> {count}
          </motion.button>
        </div>
      </header>

      {/* ── герой ── */}
      <section className="hero">
        <div className="hero-blob b1" />
        <div className="hero-blob b2" />
        <div className="hero-inner">
          <motion.span className="badge" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            {t.tagline}
          </motion.span>

          <h1 className="hero-title">
            {[t.hero_1, t.hero_2, t.hero_3].map((w, i) => (
              <motion.span
                key={w}
                className={`hw hw${i}`}
                initial={{ opacity: 0, y: 60, rotate: i === 1 ? -6 : 3 }}
                animate={{ opacity: 1, y: 0, rotate: i === 1 ? -3 : 1 }}
                transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 90, damping: 14 }}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            {t.hero_sub}
          </motion.p>

          <motion.div className="hero-cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <a href="#catalog" className="btn btn-solid big">{t.cta_shop}</a>
            <button className="btn btn-hot big" onClick={() => setOpenDesigner(true)}>
              <Icon name="brush" /> {t.designer_open}
            </button>
          </motion.div>

          <div className="stats">
            {[[PRODUCTS.length, t.stat_1], ['∞', t.stat_2], ['1–3', t.stat_3]].map(([n, l]) => (
              <div key={l}><b>{n}</b><span>{l}</span></div>
            ))}
          </div>
        </div>

        <motion.div
          className="hero-tee"
          initial={{ opacity: 0, scale: 0.85, rotate: 8 }}
          animate={{ opacity: 1, scale: 1, rotate: 3 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 70, damping: 14 }}
        >
          <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <Tshirt product={PRODUCTS[5]} lang={lang} hovered big />
          </motion.div>
        </motion.div>
      </section>

      <Ticker text="ХЕХЕ" />
      <Countdown t={t} />

      {/* ── каталог ── */}
      <section id="catalog" className="section">
        <div className="section-head catalog-head">
          <div>
            <h2>{t.catalog_title}</h2>
            <p>{t.catalog_sub}</p>
          </div>
          <button className="btn btn-hot big" onClick={() => setOpenDesigner(true)}>
            <Icon name="brush" /> {t.designer_open}
          </button>
        </div>

        <div className="filters">
          <button className={`chip big ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
            {t.filter_all}
          </button>
          {Object.entries(RARITY).map(([k, r]) => (
            <button
              key={k}
              className={`chip big ${filter === k ? 'on' : ''}`}
              onClick={() => setFilter(k)}
              style={filter === k ? { background: r.color, borderColor: r.color, color: '#fff' } : {}}
            >
              {r[lang]}
            </button>
          ))}
        </div>

        <motion.div layout className="grid">
          <AnimatePresence>
            {shown.map((p) => (
              <Card
                key={p.id} p={p} lang={lang} t={t}
                onAdd={addToCart}
                isFav={favorites.includes(p.id)} onFav={onFav}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ── как это работает ── */}
      <section id="how" className="section how">
        <div className="section-head"><h2>{t.how_title}</h2></div>
        <div className="steps">
          {[[t.how_1_t, t.how_1_d, 'target'], [t.how_2_t, t.how_2_d, 'card'], [t.how_3_t, t.how_3_d, 'shirt']].map(([ti, de, e], i) => (
            <motion.div
              key={ti} className="step"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }}
            >
              <span className="step-num">0{i + 1}</span>
              <span className="step-icon"><Icon name={e} size={26} /></span>
              <h4>{ti}</h4>
              <p>{de}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <Logo size={34} />
        <p>{t.footer}</p>
        <span>© {new Date().getFullYear()} ХЕХЕ</span>
      </footer>

      {/* Обёртка гасит клики, когда не открыто ничего: если анимация закрытия
          не доиграет, невидимый оверлей не перехватит клики по странице. */}
      <div className="overlay-root" style={{ pointerEvents: anyOverlay ? 'auto' : 'none' }}>
        <AnimatePresence>
          {anyOverlay && (
            <motion.div key="scrim" className="scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeOverlays} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {openCart && (
            <motion.aside
              key="cart" className="drawer"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <div className="drawer-head">
                <h3>{t.cart}</h3>
                <button className="x" onClick={() => setOpenCart(false)} aria-label="close"><Icon name="close" size={15} /></button>
              </div>

              {!cart.length && <p className="empty">{t.cart_empty}</p>}

              <div className="drawer-list">
                {cart.map((i) => {
                  const { product, title, price } = resolveItem(i)
                  return (
                    <motion.div key={i.key} layout className="line"
                      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
                      <div className="line-thumb" style={{ background: product.color }}>
                        <Tshirt product={product} lang={lang} />
                      </div>
                      <div className="line-info">
                        <b>{title}</b>
                        <span>{i.size}</span>
                        <div className="qty">
                          <button onClick={() => setQty(i.key, -1)} aria-label="−"><Icon name="minus" size={14} /></button>
                          <b>{i.qty}</b>
                          <button onClick={() => setQty(i.key, +1)} aria-label="+"><Icon name="plus" size={14} /></button>
                          <button className="link" onClick={() => removeFromCart(i.key)}>{t.remove}</button>
                        </div>
                      </div>
                      <span className="line-price">{fmt(price * i.qty)}</span>
                    </motion.div>
                  )
                })}
              </div>

              <div className="drawer-foot">
                <div className="pay-methods">
                  <span className="pay-label">{t.pay_method}</span>
                  <div className="d-row">
                    <button
                      className={`chip big ${payMethod === 'card' ? 'on' : ''}`}
                      onClick={() => setPayMethod('card')}
                    >
                      <Icon name="card" /> {t.pay_card} •••• 4242
                    </button>
                    <button
                      className={`chip big ${payMethod === 'wallet' ? 'on' : ''}`}
                      onClick={() => setPayMethod('wallet')}
                    >
                      <Icon name="wallet" /> {t.pay_wallet}
                    </button>
                  </div>
                  <small className="muted">
                    {payMethod === 'card' ? t.card_demo : `${t.balance}: ${fmt(wallet.balance)} · ${t.cashback}`}
                  </small>
                </div>

                <div className="row"><span>{t.total}</span><b>{fmt(total)}</b></div>
                {payMethod === 'wallet' && (
                  <div className="row muted"><span>{t.cashback}</span><b className="with-icon"><Icon name="coin" size={15} /> +{cashback}</b></div>
                )}
                <button className="btn btn-solid full" onClick={checkout} disabled={!cart.length || paying}>
                  {paying ? t.processing : t.checkout}
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {openDesigner && (
            <Designer
              key="designer" t={t} lang={lang}
              onClose={() => setOpenDesigner(false)}
              onAdd={addCustomToCart}
              onToast={say}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {openAccount && (
            <Account
              key="account" t={t} lang={lang}
              wallet={wallet} orders={orders} favorites={favorites}
              onTopup={topup} onToggleFav={(id) => setFavorites((f) => f.filter((x) => x !== id))}
              onClose={() => setOpenAccount(false)} onToast={say} onAddToCart={addToCart}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── тост ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id} className="toast"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
