import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import Logo from './components/Logo.jsx'
import Tshirt from './components/Tshirt.jsx'
import Account from './components/Account.jsx'
import Designer from './components/Designer.jsx'
import Admin from './components/Admin.jsx'
import Icon from './components/Icon.jsx'
import Gate from './components/Gate.jsx'
import { PRODUCTS, MARKETS, SIZES, SIZE_EXTRA, T, fmt, DEFAULT_SETTINGS, COLLECTIONS } from './data.js'

const load = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
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

/* ─────────────── летящая копия товара ─────────────── */
// Точки квадратичной кривой Безье от 0 до 1. Три ключевых кадра давали
// излом посередине — между кадрами framer идёт по прямой, так что дугу
// приходится задавать частой выборкой.
const STEPS = 14
const bezier = (dx, dy, lift) => {
  const p1x = dx * 0.5, p1y = dy * 0.5 - lift        // контрольная точка выше хорды
  const xs = [], ys = []
  for (let i = 0; i <= STEPS; i++) {
    const u = i / STEPS, n = 1 - u
    xs.push(n * n * 0 + 2 * n * u * p1x + u * u * dx)
    ys.push(n * n * 0 + 2 * n * u * p1y + u * u * dy)
  }
  return { xs, ys }
}

/**
 * Копия футболки летит от карточки к иконке корзины по дуге: сначала
 * подбрасывает вверх, потом затягивает в корзину, уменьшаясь.
 * Живёт на fixed-слое поверх всего и сама себя убирает по завершении.
 */
function Flyer({ flight, lang, onDone }) {
  const { from, to, product } = flight
  const dx = to.x - (from.left + from.width / 2)
  const dy = to.y - (from.top + from.height / 2)
  const lift = Math.min(150, Math.abs(dx) * 0.3 + 70)

  const { xs, ys } = bezier(dx, dy, lift)
  // Равномерные доли времени: скорость по дуге постоянная, без рывков.
  const times = xs.map((_, i) => i / STEPS)
  const scale = times.map((u) => 1 - 0.88 * u * u)     // тает к концу
  const opacity = times.map((u) => (u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25 * 0.7))

  return (
    <motion.div
      className="flyer"
      style={{ left: from.left, top: from.top, width: from.width, height: from.height }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{ x: xs, y: ys, scale, opacity, rotate: times.map((u) => u * 14) }}
      transition={{ duration: 0.7, times, ease: 'linear' }}
      onAnimationComplete={onDone}
    >
      <Tshirt product={product} lang={lang} />
    </motion.div>
  )
}

/* ─────────────── экран «оплачено» ─────────────── */
/** Накрывает корзину после оплаты: галочка рисуется штрихом, потом сумма. */
function PaidScreen({ t, paid, onSkip }) {
  return (
    <motion.div
      className="paid"
      onClick={onSkip}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.svg
        className="paid-mark" viewBox="0 0 52 52"
        fill="none" stroke="currentColor" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ scale: 0.7 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      >
        <motion.circle
          cx="26" cy="26" r="23"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.path
          d="M15 26.5 L22.5 34 L37 19"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.34, duration: 0.32, ease: 'easeOut' }}
        />
      </motion.svg>

      <motion.b
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {t.paid_title}
      </motion.b>
      <motion.span
        className="paid-sum"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.58 }}
      >
        {fmt(paid.total)}
      </motion.span>
      <motion.span
        className="muted"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.66 }}
      >
        {t.paid_sub}
      </motion.span>

      {paid.coins > 0 && (
        <motion.span
          className="paid-coins"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.74, type: 'spring', stiffness: 300, damping: 16 }}
        >
          <Icon name="coin" size={15} /> +{paid.coins} {t.added_coins}
        </motion.span>
      )}
    </motion.div>
  )
}

/* ─────────────── карточка товара ─────────────── */
function Card({ p, lang, t, onAdd, isFav, onFav, priceOf }) {
  const [hover, setHover] = useState(false)
  const [size, setSize] = useState('M')
  const [color, setColor] = useState('black')
  const mediaRef = useRef(null)
  const m = MARKETS[p.market]
  const shown = { ...p, photo: p.photos[color] }

  // Отдаём наверх прямоугольник картинки: от него полетит копия в корзину.
  const add = () => onAdd(p, size, color, mediaRef.current?.getBoundingClientRect())

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
      <span className="rarity" style={{ background: m.color }}>{m[lang]}</span>

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

      <div ref={mediaRef} className="card-media" style={{ background: `radial-gradient(circle at 50% 40%, ${p.color}22, transparent 70%)` }}>
        <Tshirt product={shown} lang={lang} hovered={hover} />
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
            {s}
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

  // Каталог, размерная наценка и промокоды редактируются из админки и живут
  // в localStorage. Каталог инициализируется дефолтами из data.js.
  const [catalog, setCatalog] = useState(() => {
    const saved = load('hehe.catalog', null)
    if (!saved) return PRODUCTS
    // Каталог лежит в localStorage, поэтому новинки из data.js сами не появятся
    // у того, кто уже заходил. Дописываем их в начало — но только те, которых
    // витрина ещё не показывала: иначе удалённые из админки товары возвращались
    // бы при каждой загрузке и кнопка «Удалить» выглядела бы сломанной.
    const known = new Set(load('hehe.knownIds', []))
    const have = new Set(saved.map((p) => p.id))
    const fresh = PRODUCTS.filter((p) => !have.has(p.id) && !known.has(p.id))
    return [...fresh, ...saved]
  })
  const [sizeExtra, setSizeExtra] = useState(() => load('hehe.sizeExtra', SIZE_EXTRA))
  const [promos, setPromos] = useState(() => load('hehe.promos', []))
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load('hehe.settings', {}) }))
  // Вход демонстрационный: храним только почту и признак админа, пароля тут нет.
  const [auth, setAuth] = useState(() => load('hehe.auth', null))
  const [promo, setPromo] = useState(null)   // применённый в корзине
  const [promoInput, setPromoInput] = useState('')
  // Данные доставки: сохраняем, чтобы не вводить заново.
  const [customer, setCustomer] = useState(() => load('hehe.customer', { name: '', phone: '', city: '', address: '' }))

  const [openCart, setOpenCart] = useState(false)
  const [openAccount, setOpenAccount] = useState(false)
  const [openDesigner, setOpenDesigner] = useState(false)
  const [openAdmin, setOpenAdmin] = useState(() => window.location.hash === '#admin')
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(null)     // экран «оплачено» поверх корзины
  const [flights, setFlights] = useState([]) // летящие в корзину копии товара
  const [cartStep, setCartStep] = useState('items')  // items → form
  const cartBtnRef = useRef(null)
  const t = T[lang]

  // Товар ищем сначала в редактируемом каталоге, потом в дефолтах — чтобы
  // старые заказы и избранное на удалённый товар не падали.
  const findProduct = (id) => catalog.find((x) => x.id === id) || PRODUCTS.find((x) => x.id === id)
  const priceOf = (p, size) => (p?.base ?? 0) + (sizeExtra[size] ?? 0)

  useEffect(() => save('hehe.lang', lang), [lang])
  useEffect(() => save('hehe.cart', cart), [cart])
  useEffect(() => save('hehe.wallet', wallet), [wallet])
  useEffect(() => save('hehe.fav', favorites), [favorites])
  useEffect(() => save('hehe.orders', orders), [orders])
  useEffect(() => save('hehe.pay', payMethod), [payMethod])
  useEffect(() => save('hehe.catalog', catalog), [catalog])
  // Запоминаем, какие товары из data.js витрина уже показывала.
  useEffect(() => save('hehe.knownIds', PRODUCTS.map((p) => p.id)), [])
  useEffect(() => save('hehe.sizeExtra', sizeExtra), [sizeExtra])
  useEffect(() => save('hehe.promos', promos), [promos])
  useEffect(() => save('hehe.customer', customer), [customer])
  useEffect(() => save('hehe.settings', settings), [settings])
  // Корзина всегда открывается со списком, а не на форме с прошлого раза.
  useEffect(() => { if (!openCart) setCartStep('items') }, [openCart])
  // Убрали последний товар, стоя на форме — возвращаемся к списку.
  useEffect(() => { if (!cart.length) setCartStep('items') }, [cart.length])
  useEffect(() => save('hehe.auth', auth), [auth])
  useEffect(() => { document.documentElement.lang = lang === 'ru' ? 'ru' : 'kk' }, [lang])
  // Админка открывается по адресу с #admin.
  useEffect(() => {
    const onHash = () => setOpenAdmin(window.location.hash === '#admin')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
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

  /** Запускает копию товара из точки from к иконке корзины. */
  const launchFlight = (product, from) => {
    const btn = cartBtnRef.current?.getBoundingClientRect()
    // Нет иконки (узкий экран) или не дали прямоугольник — просто без полёта.
    if (!btn || !from) return
    const id = `${Date.now()}-${Math.random()}`
    setFlights((f) => [...f, {
      id, from, product,
      to: { x: btn.left + btn.width / 2, y: btn.top + btn.height / 2 },
    }])
  }

  const addToCart = (p, size, color = 'black', from) => {
    launchFlight({ ...p, photo: p.photos?.[color] }, from)
    setCart((c) => {
      const key = p.id + size + color
      const found = c.find((i) => i.key === key)
      if (found) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i))
      return [...c, { key, id: p.id, size, color, qty: 1 }]
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
        price: settings.customPrice,
        title: label,
        product: { id: i.key, color: fabric, ink, custom: { ...shown, fabric, ink }, ru: {}, kk: {} },
      }
    }
    const p = findProduct(i.id)
    if (!p) return { price: 0, title: '—', product: { id: i.id, color: '#ccc', ru: {}, kk: {} } }
    const color = i.color ?? 'black'
    const cLabel = color === 'white' ? t.c_white : t.c_black
    return {
      price: priceOf(p, i.size),
      title: `${p[lang].title} · ${cLabel}`,
      product: { ...p, photo: p.photos[color] },
    }
  }

  const removeFromCart = (key) => setCart((c) => c.filter((i) => i.key !== key))
  const setQty = (key, delta) => setCart((c) => c
    .map((i) => (i.key === key ? { ...i, qty: i.qty + delta } : i))
    .filter((i) => i.qty > 0))

  const subtotal = cart.reduce((s, i) => s + resolveItem(i).price * i.qty, 0)
  const count = cart.reduce((s, i) => s + i.qty, 0)
  const discount = !promo ? 0
    : Math.min(subtotal, promo.type === 'percent' ? Math.round(subtotal * promo.value / 100) : promo.value)
  const total = Math.max(0, subtotal - discount)
  const cashback = Math.round(total * (settings.cashback ?? 0) / 100)

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    const found = promos.find((p) => p.active && p.code === code)
    if (!found) { setPromo(null); return say(t.promo_bad) }
    setPromo(found)
    say(t.promo_on)
  }

  /** Оплата пока фейковая: карта всегда проходит, кошелёк проверяет баланс. */
  const checkout = async () => {
    if (!cart.length || paying) return
    if (!customer.name.trim() || !customer.phone.trim()) return say(t.fill_ship)
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
      discount,
      promo: promo?.code ?? null,
      customer: { ...customer },
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

    // Порядок важен. Сначала наплывает экран «оплачено», и только под ним
    // чистим корзину: очистка на виду схлопывает форму доставки, промокод и
    // итоги разом — шторка дёргается. Под непрозрачным экраном это не видно.
    const earned = payMethod === 'wallet' ? cashback : 0
    setPaying(false)
    setPaid({ total, coins: earned })

    await sleep(280)                    // экран успел стать непрозрачным
    setCart([])
    setPromo(null); setPromoInput('')

    await sleep(1200)                   // даём прочитать сумму
    setOpenCart(false)
    // Ждём, пока шторка уедет, и только тогда снимаем экран оплаты.
    setTimeout(() => setPaid(null), 400)
    say(earned ? `${t.pay_ok} +${earned} ${t.added_coins}` : t.pay_ok)
  }

  const topup = (amount) => {
    setWallet((w) => ({ ...w, balance: w.balance + amount }))
    say(`${t.topup_added}: +${fmt(amount)}`)
  }

  const onFav = (p) => setFavorites((f) => (f.includes(p.id) ? f.filter((x) => x !== p.id) : [...f, p.id]))

  const visible = catalog.filter((p) => !p.hidden)
  // Фильтр — 'all', код рынка ('ru'/'kk') или 'coll:<id>' для готовой подборки.
  const inCollection = (c) => visible.filter((pr, i) => c.match(pr, i))
  const activeColl = filter.startsWith('coll:')
    ? COLLECTIONS.find((c) => c.id === filter.slice(5))
    : null
  const shown = filter === 'all' ? visible
    : activeColl ? inCollection(activeColl)
    : visible.filter((p) => p.market === filter)

  /** Ставит фильтр и уводит к каталогу — как «Открыть подборку» у образца. */
  const gotoCatalog = (f = 'all') => {
    setFilter(f)
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const heroTee = findProduct('shashlyk') || visible[0] || PRODUCTS[0]

  const showAdmin = () => {
    window.location.hash = '#admin'
    setOpenAdmin(true)
  }

  const closeAdmin = () => {
    if (window.location.hash === '#admin') window.location.hash = ''
    setOpenAdmin(false)
  }

  const logout = () => {
    closeAdmin()
    setAuth(null)
  }

  // Оверлеи не считают админку: она теперь отдельная страница, а не окно.
  const anyOverlay = openCart || openAccount || openDesigner
  const closeOverlays = () => {
    setOpenCart(false); setOpenAccount(false); setOpenDesigner(false)
    setPaid(null)
  }

  /** Досрочно убрать экран «оплачено» — ждать анимацию никто не обязан. */
  const skipPaid = () => { setPaid(null); setOpenCart(false) }

  // Витрина закрыта демо-входом. Пароль не сохраняется — только почта и роль.
  if (!auth) {
    return (
      <Gate
        t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
        onEnter={(a) => {
          setAuth(a)
          if (a.admin) say(t.hello_admin)
        }}
      />
    )
  }

  // Админка — полноэкранная страница вместо витрины, а не модальное окно.
  if (openAdmin && auth.admin) {
    return (
      <>
        <Admin
          auth={auth} onLogout={logout} onClose={closeAdmin} onToast={say}
          catalog={catalog} setCatalog={setCatalog}
          sizeExtra={sizeExtra} setSizeExtra={setSizeExtra}
          promos={promos} setPromos={setPromos}
          orders={orders} setOrders={setOrders}
          settings={settings} setSettings={setSettings}
          priceOf={priceOf}
        />
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

          {auth.admin && (
            <button className="btn btn-ghost" onClick={showAdmin} title={t.nav_admin}>
              <Icon name="settings" /> <span className="hide-sm">{t.nav_admin}</span>
            </button>
          )}

          <button className="btn btn-ghost" onClick={() => setOpenAccount(true)}>
            <Icon name="wallet" /> {fmt(wallet.balance)}
          </button>

          <motion.button
            ref={cartBtnRef}
            className="btn btn-solid"
            onClick={() => setOpenCart(true)}
            animate={count ? { scale: [1, 1.22, 0.96, 1] } : {}}
            transition={{ duration: 0.42, ease: 'easeOut' }}
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
          <motion.span className="eyebrow" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            {t.shop_eyebrow}
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

          <motion.p className="hero-lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            {t.hero_lead}
          </motion.p>

          <motion.div className="hero-cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <button className="btn btn-solid big" onClick={() => gotoCatalog('all')}>{t.cta_shop}</button>
            <a href="#collections" className="btn big">{t.cta_collections}</a>
          </motion.div>
        </div>

        <motion.div
          className="hero-tee"
          initial={{ opacity: 0, scale: 0.85, rotate: 8 }}
          animate={{ opacity: 1, scale: 1, rotate: 3 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 70, damping: 14 }}
        >
          <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <Tshirt product={{ ...heroTee, photo: heroTee.photos.black }} lang={lang} hovered big />
          </motion.div>
        </motion.div>
      </section>

      {/* ── полоса цифр ── */}
      <div className="wrap">
        <div className="statstrip">
          {[
            [visible.length, t.st_products], [SIZES.length, t.st_sizes], [2, t.st_colors],
            [settings.cashback, t.st_cashback], [2, t.st_langs], ['∞', t.st_custom],
          ].map(([n, l]) => (
            <div key={l} className="statcard"><b>{n}</b><span>{l}</span></div>
          ))}
        </div>
      </div>

      <Ticker text="funymems.cc" />

      {/* ── мозаика: крупная плитка + мелкие ── */}
      <div className="wrap">
        <div className="mosaic">
          <button className="mtile big" onClick={() => gotoCatalog('coll:fresh')}>
            <div className="mtile-art">
              <Tshirt product={{ ...heroTee, photo: heroTee.photos.black }} lang={lang} big />
            </div>
            <div className="mtile-cap">
              <b>{T[lang].collections_title}</b>
              <span>{t.collections_sub}</span>
            </div>
          </button>
          {[['ru', t.sec_ru, t.sec_ru_d], ['kk', t.sec_kk, t.sec_kk_d]].map(([m, ti, de]) => {
            const pr = visible.find((x) => x.market === m) || visible[0]
            return (
              <button key={m} className="mtile" onClick={() => gotoCatalog(m)}>
                <div className="mtile-art">
                  {pr && <Tshirt product={{ ...pr, photo: pr.photos.white }} lang={lang} />}
                </div>
                <div className="mtile-cap"><b>{ti}</b><span>{de}</span></div>
              </button>
            )
          })}
          <button className="mtile" onClick={() => setOpenDesigner(true)}>
            <div className="mtile-art center"><Icon name="brush" size={54} /></div>
            <div className="mtile-cap"><b>{t.sec_custom}</b><span>{t.sec_custom_d}</span></div>
          </button>
        </div>
      </div>

      {/* ── разделы магазина ── */}
      <section id="sections" className="section wrap">
        <div className="section-head">
          <div><h2>{t.sections_title}</h2><p>{t.sections_sub}</p></div>
        </div>
        <div className="tilegrid">
          {[
            ['shirt', t.sec_all, t.sec_all_d, `${visible.length} ${t.goods}`, () => gotoCatalog('all')],
            ['shirt', t.sec_ru, t.sec_ru_d, `${visible.filter((p) => p.market === 'ru').length} ${t.goods}`, () => gotoCatalog('ru')],
            ['shirt', t.sec_kk, t.sec_kk_d, `${visible.filter((p) => p.market === 'kk').length} ${t.goods}`, () => gotoCatalog('kk')],
            ['brush', t.sec_custom, t.sec_custom_d, '∞', () => setOpenDesigner(true)],
            ['heart', t.sec_fav, t.sec_fav_d, `${favorites.length} ${t.goods}`, () => setOpenAccount(true)],
            ['wallet', t.sec_wallet, t.sec_wallet_d, fmt(wallet.balance), () => setOpenAccount(true)],
          ].map(([ic, ti, de, meta, go]) => (
            <motion.button
              key={ti} className="tile" onClick={go}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} whileHover={{ y: -5 }}
            >
              <span className="tile-ic"><Icon name={ic} size={20} /></span>
              <b>{ti}</b>
              <span className="tile-d">{de}</span>
              <span className="tile-meta">{meta}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── готовые подборки ── */}
      <section id="collections" className="section wrap">
        <div className="section-head">
          <div><h2>{t.collections_title}</h2><p>{t.collections_sub}</p></div>
        </div>
        <div className="collgrid">
          {COLLECTIONS.map((c) => {
            const n = inCollection(c).length
            return (
              <motion.div
                key={c.id} className="collcard"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
              >
                <span className="coll-count">{n} {t.goods}</span>
                <b>{c[lang].title}</b>
                <p>{c[lang].desc}</p>
                <button className="link big" onClick={() => gotoCatalog(`coll:${c.id}`)}>
                  {t.collection_open} →
                </button>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── преимущества ── */}
      <div className="wrap">
        <div className="benefits">
          {[['cart', t.ben_1_t, t.ben_1_d], ['coin', t.ben_2_t, t.ben_2_d],
            ['brush', t.ben_3_t, t.ben_3_d], ['hand', t.ben_4_t, t.ben_4_d]].map(([ic, ti, de]) => (
            <div key={ti} className="benefit">
              <Icon name={ic} size={19} />
              <div><b>{ti}</b><span>{de}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* ── что покупают прямо сейчас ── */}
      <section className="section wrap">
        <div className="section-head">
          <div><h2>{t.popular_title}</h2><p>{t.popular_sub}</p></div>
          <button className="link big" onClick={() => gotoCatalog('all')}>{t.see_all} →</button>
        </div>
        <div className="grid">
          {visible.slice(0, 4).map((pr) => (
            <Card
              key={`pop-${pr.id}`} p={pr} lang={lang} t={t}
              onAdd={addToCart} priceOf={priceOf}
              isFav={favorites.includes(pr.id)} onFav={onFav}
            />
          ))}
        </div>
      </section>

      <Countdown t={t} />

      {/* ── каталог ── */}
      <section id="catalog" className="section wrap">
        <div className="section-head catalog-head">
          <div>
            <h2>{t.catalog_title}</h2>
            <p>{activeColl ? activeColl[lang].desc : t.catalog_sub}</p>
          </div>
          <button className="btn btn-hot big" onClick={() => setOpenDesigner(true)}>
            <Icon name="brush" /> {t.designer_open}
          </button>
        </div>

        <div className="filters">
          <button className={`chip big ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
            {t.filter_all}
          </button>
          {Object.entries(MARKETS).map(([k, r]) => (
            <button
              key={k}
              className={`chip big ${filter === k ? 'on' : ''}`}
              onClick={() => setFilter(k)}
              style={filter === k ? { background: r.color, borderColor: r.color, color: '#fff' } : {}}
            >
              {r[lang]}
            </button>
          ))}
          {/* Активная подборка показывается отдельным чипом со сбросом. */}
          {activeColl && (
            <button className="chip big on" onClick={() => setFilter('all')}>
              {activeColl[lang].title} <Icon name="close" size={12} />
            </button>
          )}
          <span className="filters-count">{shown.length} {t.goods}</span>
        </div>

        <motion.div layout className="grid">
          <AnimatePresence>
            {shown.map((pr) => (
              <Card
                key={pr.id} p={pr} lang={lang} t={t}
                onAdd={addToCart} priceOf={priceOf}
                isFav={favorites.includes(pr.id)} onFav={onFav}
              />
            ))}
          </AnimatePresence>
        </motion.div>
        {!shown.length && <p className="empty">{t.cart_empty}</p>}
      </section>

      {/* ── не только футболки ── */}
      <section className="section wrap">
        <div className="section-head">
          <div><h2>{t.life_title}</h2><p>{t.life_sub}</p></div>
        </div>
        <div className="lifegrid">
          {[[t.life_1_t, t.life_1_d, t.life_1_c, 'brush', () => setOpenDesigner(true)],
            [t.life_2_t, t.life_2_d, t.life_2_c, 'wallet', () => setOpenAccount(true)],
            [t.life_3_t, t.life_3_d, t.life_3_c, 'heart', () => setOpenAccount(true)]].map(([ti, de, cta, ic, go]) => (
            <motion.div
              key={ti} className="lifecard"
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
            >
              <span className="tile-ic"><Icon name={ic} size={20} /></span>
              <b>{ti}</b>
              <p>{de}</p>
              <button className="link big" onClick={go}>{cta} →</button>
            </motion.div>
          ))}
        </div>
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

      {/* ── о проекте ── */}
      <section className="section wrap">
        <div className="about">
          <span className="eyebrow">{t.about_eyebrow}</span>
          <p className="about-text">{t.about_text}</p>
          <div className="hero-cta">
            <button className="btn btn-solid big" onClick={() => gotoCatalog('all')}>{t.cta_shop}</button>
            <button className="btn big" onClick={() => setOpenDesigner(true)}>{t.designer_open}</button>
          </div>
          <div className="aboutstats">
            {[[visible.length, t.ab_1], [2, t.ab_2], [2, t.ab_3], ['∞', t.ab_4]].map(([n, l]) => (
              <div key={l}><b>{n}</b><span>{l}</span></div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <Logo size={34} />
        <p>{t.footer}</p>
        <span className="foot-who">{auth.email}</span>
        <button className="link" onClick={logout}>{t.logout}</button>
        <span>© {new Date().getFullYear()} funymems.cc</span>
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
                {cartStep === 'form' && (
                  <button className="x back" onClick={() => setCartStep('items')} aria-label="назад">
                    <Icon name="undo" size={15} />
                  </button>
                )}
                <h3>{cartStep === 'form' ? t.checkout_title : t.cart}</h3>
                <button className="x" onClick={() => { setOpenCart(false); setPaid(null) }} aria-label="close"><Icon name="close" size={15} /></button>
              </div>

              {/* Шаг 1 — что лежит в корзине. Шаг 2 — данные и оплата.
                  Раньше форма доставки висела под списком всегда, и корзина
                  открывалась сразу простынёй из полей. */}
              <AnimatePresence mode="wait" initial={false}>
                {cartStep === 'items' ? (
                  <motion.div
                    key="step-items" className="cart-step"
                    initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
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
                              </div>
                            </div>
                            <div className="line-end">
                              <span className="line-price">{fmt(price * i.qty)}</span>
                              <button className="link" onClick={() => removeFromCart(i.key)}>{t.remove}</button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {cart.length > 0 && (
                      <div className="drawer-foot">
                        <div className="row"><span>{t.total}</span><b>{fmt(total)}</b></div>
                        <button className="btn btn-solid full big" onClick={() => setCartStep('form')}>
                          {t.to_checkout}
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-form" className="cart-step"
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <div className="drawer-list">
                      <div className="ship">
                        <span className="pay-label">{t.ship_title}</span>
                        <div className="ship-grid">
                          <input placeholder={t.f_name} value={customer.name}
                            onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} />
                          <input placeholder={t.f_phone} inputMode="tel" value={customer.phone}
                            onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} />
                          <input placeholder={t.f_city} value={customer.city}
                            onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))} />
                          <input placeholder={t.f_address} value={customer.address}
                            onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} />
                        </div>
                      </div>

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

                      <div className="promo">
                        <input
                          placeholder={t.promo_ph} value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                        />
                        <button className="btn" onClick={applyPromo}>{t.apply}</button>
                      </div>

                      <p className="muted">{t.in_cart}: {count}</p>
                    </div>

                    <div className="drawer-foot">
                      {discount > 0 && (
                        <div className="row muted"><span>{t.discount} · {promo.code}</span><b>−{fmt(discount)}</b></div>
                      )}
                      <div className="row"><span>{t.total}</span><b>{fmt(total)}</b></div>
                      {payMethod === 'wallet' && (
                        <div className="row muted"><span>{t.cashback}</span><b className="with-icon"><Icon name="coin" size={15} /> +{cashback}</b></div>
                      )}
                      <button className="btn btn-solid full big" onClick={checkout} disabled={!cart.length || paying}>
                        {paying ? t.processing : t.checkout}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {paid && <PaidScreen key="paid" t={t} paid={paid} onSkip={skipPaid} />}
              </AnimatePresence>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {openDesigner && (
            <Designer
              key="designer" t={t} lang={lang}
              onClose={() => setOpenDesigner(false)}
              onAdd={addCustomToCart}
              price={settings.customPrice}
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

      {/* ── копии товара, летящие в корзину ── */}
      <div className="flyer-layer">
        {flights.map((f) => (
          <Flyer
            key={f.id} flight={f} lang={lang}
            onDone={() => setFlights((fs) => fs.filter((x) => x.id !== f.id))}
          />
        ))}
      </div>

      {/* ── нижняя панель (только телефон), как у образца ── */}
      <nav className="bottombar">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Icon name="outline" size={19} /><span>{t.nav_home}</span>
        </button>
        <button onClick={() => gotoCatalog('all')}>
          <Icon name="shirt" size={19} /><span>{t.nav_shop}</span>
        </button>
        <button className={count ? 'hot' : ''} onClick={() => setOpenCart(true)}>
          <Icon name="cart" size={19} /><span>{t.cart}{count ? ` · ${count}` : ''}</span>
        </button>
      </nav>

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
