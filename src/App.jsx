import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import Logo from './components/Logo.jsx'
import Tshirt from './components/Tshirt.jsx'
import AuthModal from './components/AuthModal.jsx'
import Account from './components/Account.jsx'
import Designer from './components/Designer.jsx'
import { useAuth } from './auth.jsx'
import { PRODUCTS, RARITY, SIZES, T, fmt, CUSTOM_PRICE } from './data.js'

const load = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d }
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

/* ─────────────── ЛОЛ-метр ─────────────── */
function LolMeter({ value, label }) {
  return (
    <div className="lol">
      <div className="lol-head">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="lol-bar">
        <motion.div
          className="lol-fill"
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

/* ─────────────── карточка товара ─────────────── */
function Card({ p, lang, t, onAdd, flash, isFav, onFav }) {
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
      className={`card ${flash ? 'flash' : ''}`}
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
        {isFav ? '❤️' : '🤍'}
      </motion.button>

      <div className="card-media" style={{ background: `radial-gradient(circle at 50% 40%, ${p.color}22, transparent 70%)` }}>
        <Tshirt product={p} lang={lang} hovered={hover} />
      </div>

      <h3>{p[lang].title}</h3>
      <p className="card-sub">{p[lang].sub}</p>

      <LolMeter value={p.lol} label={t.lol_meter} />

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
  const auth = useAuth()
  const { user, profile, favorites, ready, isConfigured } = auth

  const [lang, setLang] = useState(() => load('hehe.lang', 'ru'))
  const [cart, setCart] = useState(() => load('hehe.cart', []))   // корзина живёт локально до оплаты
  const [openCart, setOpenCart] = useState(false)
  const [openAuth, setOpenAuth] = useState(null)   // null | 'in' | 'up'
  // Счётчик открытий: пока идёт exit-анимация, React переиспользует инстанс модалки
  // и она открывается в том режиме, в котором её закрыли. Новый ключ = чистое состояние.
  const [authSeq, setAuthSeq] = useState(0)
  const [openAccount, setOpenAccount] = useState(false)
  const [openDesigner, setOpenDesigner] = useState(false)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [flashId, setFlashId] = useState(null)
  const [paying, setPaying] = useState(false)
  const t = T[lang]

  useEffect(() => localStorage.setItem('hehe.lang', JSON.stringify(lang)), [lang])
  // Дизайны из конструктора хранят картинку прямо в корзине, поэтому запись
  // может упереться в квоту localStorage — корзина в памяти при этом остаётся целой.
  useEffect(() => {
    try { localStorage.setItem('hehe.cart', JSON.stringify(cart)) }
    catch { /* переполнили квоту — просто не сохраняем между перезагрузками */ }
  }, [cart])
  useEffect(() => { document.documentElement.lang = lang === 'ru' ? 'ru' : 'kk' }, [lang])

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

  // Дизайн из конструктора — отдельная позиция: он не лежит в PRODUCTS,
  // поэтому носит свои данные прямо в строке корзины.
  const addCustomToCart = (design, size) => {
    const key = `custom-${Date.now()}`
    setCart((c) => [...c, { key, id: 'custom', size, qty: 1, custom: design }])
  }

  /** Приводит строку корзины к единому виду: что рисовать, как назвать, почём. */
  const resolveItem = (i) => {
    if (i.custom) {
      const label = i.custom.text ? `${t.designer}: «${i.custom.text.split('\n')[0]}»` : t.designer
      return {
        price: CUSTOM_PRICE,
        title: label,
        product: { id: i.key, color: i.custom.fabric, ink: i.custom.ink, custom: i.custom, ru: {}, kk: {} },
      }
    }
    const p = PRODUCTS.find((x) => x.id === i.id)
    return { price: p.price, title: p[lang].title, product: p }
  }

  const removeFromCart = (key) => setCart((c) => c.filter((i) => i.key !== key))

  const total = cart.reduce((s, i) => s + resolveItem(i).price * i.qty, 0)
  const count = cart.reduce((s, i) => s + i.qty, 0)

  const openAuthModal = (mode = 'in') => {
    setOpenCart(false)
    setAuthSeq((n) => n + 1)
    setOpenAuth(mode)
  }
  const needAuth = openAuthModal

  const checkout = async () => {
    if (!cart.length || paying) return
    if (!user) { say(t.login_to_buy); return needAuth('in') }

    setPaying(true)
    try {
      // Картинку дизайна в заказ не кладём — она раздула бы строку в базе.
      const items = cart.map((i) => {
        const { price, title } = resolveItem(i)
        return { id: i.id, size: i.size, qty: i.qty, price, title }
      })
      const order = await auth.checkout(items)
      setCart([])
      setOpenCart(false)
      say(`${t.pay_ok} +${order.coins_earned} ${t.added_coins}`)
    } catch (e) {
      say(t[e.message] || t.err_generic)
    } finally {
      setPaying(false)
    }
  }

  const onFav = async (p) => {
    if (!user) { say(t.login_to_fav); return needAuth('in') }
    try { await auth.toggleFavorite(p.id) }
    catch (e) { say(t[e.message] || t.err_generic) }
  }

  const random = () => {
    const p = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]
    document.getElementById(`card-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlashId(p.id)
    setTimeout(() => setFlashId(null), 1800)
  }

  const shown = filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.rarity === filter)

  /* хвост из эмодзи за курсором */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const emo = ['😂', '💀', '🤡', '😭', '🗿', '✨']
    let last = 0
    const onMove = (e) => {
      const now = Date.now()
      if (now - last < 110) return
      last = now
      const el = document.createElement('span')
      el.className = 'trail'
      el.textContent = emo[Math.floor(Math.random() * emo.length)]
      el.style.left = e.clientX + 'px'
      el.style.top = e.clientY + 'px'
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 900)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const anyOverlay = openCart || Boolean(openAuth) || openAccount || openDesigner

  const closeOverlays = () => {
    setOpenCart(false); setOpenAuth(null); setOpenAccount(false); setOpenDesigner(false)
  }

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
          <div className="lang-switch">
            {['ru', 'kk'].map((l) => (
              <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
                {T[l].lang}
              </button>
            ))}
          </div>

          {ready && (user ? (
            <button className="btn btn-ghost acc-btn" onClick={() => setOpenAccount(true)}>
              <span className="acc-avatar">{profile?.emoji ?? '😎'}</span>
              <span className="acc-bal">{fmt(profile?.balance ?? 0)}</span>
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => openAuthModal('in')}>
              👤 {t.login}
            </button>
          ))}

          <motion.button
            className="btn btn-solid"
            onClick={() => setOpenCart(true)}
            animate={count ? { scale: [1, 1.12, 1] } : {}}
            key={count}
          >
            🛒 {count}
          </motion.button>
        </div>
      </header>

      {!isConfigured && <div className="setup-banner">{t.not_setup}</div>}

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
            <button className="btn btn-hot big" onClick={() => setOpenDesigner(true)}>{t.designer_open}</button>
            <button className="btn btn-ghost big" onClick={random}>{t.cta_random}</button>
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
            <Tshirt product={PRODUCTS[3]} lang={lang} hovered big />
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
            {t.designer_open}
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
                onAdd={addToCart} flash={flashId === p.id}
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
          {[[t.how_1_t, t.how_1_d, '🎯'], [t.how_2_t, t.how_2_d, '💳'], [t.how_3_t, t.how_3_d, '🚶']].map(([ti, de, e], i) => (
            <motion.div
              key={ti} className="step"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }}
            >
              <span className="step-num">0{i + 1}</span>
              <span className="step-emoji">{e}</span>
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

      {/* ── оверлеи ── */}
      {/* Каждый оверлей — в своём AnimatePresence: с одним общим и меняющимися
          ключами framer оставляет выходящие узлы висеть в DOM.

          Обёртка гасит клики, когда не открыто ничего: если анимация закрытия
          не доиграет (например, вкладка ушла в фон и rAF встал), невидимый
          оверлей всё равно не перехватит клики по странице. */}
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
              <button className="x" onClick={() => setOpenCart(false)} aria-label="close">✕</button>
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
                      <span>{i.size} · ×{i.qty}</span>
                      <button className="link" onClick={() => removeFromCart(i.key)}>{t.remove}</button>
                    </div>
                    <span className="line-price">{fmt(price * i.qty)}</span>
                  </motion.div>
                )
              })}
            </div>

            <div className="drawer-foot">
              <div className="row"><span>{t.total}</span><b>{fmt(total)}</b></div>
              <div className="row muted"><span>{t.cashback}</span><b>🪙 +{Math.round(total * 0.07)}</b></div>
              {user && (
                <div className="row muted"><span>{t.balance}</span><b>{fmt(profile?.balance ?? 0)}</b></div>
              )}
              <button className="btn btn-solid full" onClick={checkout} disabled={!cart.length || paying}>
                {paying ? t.processing : user ? t.checkout : t.login_to_buy}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openAuth && (
          <AuthModal
            key={`auth-${authSeq}`} t={t} startMode={openAuth}
            onClose={() => setOpenAuth(null)} onDone={say}
          />
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
        {openAccount && user && (
          <Account
            key="account" t={t} lang={lang}
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
