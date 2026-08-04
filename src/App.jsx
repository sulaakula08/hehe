import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import Logo from './components/Logo.jsx'
import Tshirt from './components/Tshirt.jsx'
import Account from './components/Account.jsx'
import Designer from './components/Designer.jsx'
import Admin from './components/Admin.jsx'
import Icon from './components/Icon.jsx'
import Card from './components/Card.jsx'
import CatalogPage from './components/CatalogPage.jsx'
import CartPage from './components/CartPage.jsx'
import Privacy from './components/Privacy.jsx'
import { PRODUCTS, MARKETS, SIZES, SIZE_EXTRA, T, fmt, DEFAULT_SETTINGS, COLLECTIONS, CONTACTS } from './data.js'

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
    const added = PRODUCTS.filter((p) => !have.has(p.id) && !known.has(p.id))
    // Флаги fresh и adult появились позже сохранённого каталога, поэтому у старых
    // записей их нет и разделы «Новинки» и 18+ оказались бы пустыми. Подставляем
    // значение из data.js только там, где флага нет вовсе: явное true/false,
    // выставленное в админке, не перетираем.
    const byId = new Map(PRODUCTS.map((p) => [p.id, p]))
    const patched = saved.map((p) => {
      const def = byId.get(p.id)
      const add = {}
      if (p.fresh === undefined) add.fresh = !!def?.fresh
      if (p.adult === undefined) add.adult = !!def?.adult
      return Object.keys(add).length ? { ...p, ...add } : p
    })
    return [...added, ...patched]
  })
  const [sizeExtra, setSizeExtra] = useState(() => load('hehe.sizeExtra', SIZE_EXTRA))
  const [promos, setPromos] = useState(() => load('hehe.promos', []))
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load('hehe.settings', {}) }))
  const [promo, setPromo] = useState(null)   // применённый в корзине
  const [promoInput, setPromoInput] = useState('')
  // Данные доставки: сохраняем, чтобы не вводить заново.
  const [customer, setCustomer] = useState(() => load('hehe.customer', { name: '', phone: '', city: '', address: '' }))

  const [openAccount, setOpenAccount] = useState(false)
  const [openDesigner, setOpenDesigner] = useState(false)
  const [openAdmin, setOpenAdmin] = useState(() => window.location.hash === '#admin')
  // Маршрут держим в хэше: у каждой подборки и у корзины свой адрес, его можно
  // дать ссылкой и открыть из закладок. Раньше всё жило фильтром на главной.
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/')
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(null)     // экран «оплачено» поверх корзины
  const [flights, setFlights] = useState([]) // летящие в корзину копии товара
  const [bottomTab, setBottomTab] = useState('home')  // подсветка нижней панели
  const [showTop, setShowTop] = useState(false)       // кнопка «вверх»
  const [zoomed, setZoomed] = useState(null)          // футболка в увеличении
  const cartBtnRef = useRef(null)   // корзина в шапке
  const cartBarRef = useRef(null)   // корзина в нижней панели (телефон)
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
  useEffect(() => { document.documentElement.lang = lang === 'ru' ? 'ru' : 'kk' }, [lang])
  // Админка открывается по адресу с #admin.
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, '')
      setOpenAdmin(h === 'admin')
      setRoute(h || '/')
      // Новая страница всегда начинается сверху, а не с прошлой прокрутки.
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    save('hehe.theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Просмотр закрывается с клавиатуры — на десктопе так привычнее.
  useEffect(() => {
    if (!zoomed) return
    const onKey = (e) => e.key === 'Escape' && setZoomed(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  // Кнопку «вверх» показываем, когда уехали заметно вниз.
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    // На телефоне шапка уезжает вверх, зато снизу висит панель — целимся в ту
    // корзину, которая сейчас в поле зрения, иначе копия летела за экран.
    const seen = (el) => {
      const r = el?.getBoundingClientRect()
      return r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight ? r : null
    }
    const btn = seen(cartBarRef.current) || seen(cartBtnRef.current)
    // Нет видимой иконки или не дали прямоугольник — просто без полёта.
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
    // чистим корзину: очистка на виду схлопывает форму и итоги разом, страница
    // дёргается. Под непрозрачным экраном этого не видно.
    const earned = payMethod === 'wallet' ? cashback : 0
    setPaying(false)
    setPaid({ total, coins: earned })

    await sleep(280)                    // экран успел стать непрозрачным
    setCart([])
    setPromo(null); setPromoInput('')

    await sleep(1200)                   // даём прочитать сумму
    navigate('/')                       // корзина пуста — возвращаем на витрину
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
    : filter === 'adult' ? visible.filter((p) => p.adult)
    : activeColl ? inCollection(activeColl)
    : visible.filter((p) => p.market === filter)

  /** Переход по адресу: страницы каталога, корзина, политика. */
  const navigate = (to) => {
    if (window.location.hash === '#' + to) { window.scrollTo({ top: 0 }); return }
    window.location.hash = to
  }
  const openCart = route === '/cart'
  const setOpenCart = (v) => navigate(v ? '/cart' : '/')

  /** Ставит фильтр и уводит к каталогу на главной. */
  const gotoCatalog = (f = 'all') => {
    if (route !== '/') { navigate('/catalog' + (f === 'all' ? '' : '/' + f.replace('coll:', ''))); return }
    setFilter(f)
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ── страницы каталога: свой адрес, заголовок и набор товаров ── */
  const PAGES = {
    '/catalog':        { title: t.pg_all, desc: t.pg_all_d,  items: visible },
    '/catalog/ru':     { title: t.pg_ru,  desc: t.pg_ru_d,   items: visible.filter((x) => x.market === 'ru') },
    '/catalog/kk':     { title: t.pg_kk,  desc: t.pg_kk_d,   items: visible.filter((x) => x.market === 'kk') },
    '/catalog/adult':  { title: t.pg_18,  desc: t.pg_18_d,   items: visible.filter((x) => x.adult) },
    '/catalog/fresh':  { title: t.pg_new, desc: t.pg_new_d,  items: visible.filter((x) => x.fresh) },
  }
  const page = PAGES[route]
  const heroTee = findProduct('shashlyk') || visible[0] || PRODUCTS[0]

  const showAdmin = () => {
    window.location.hash = '#admin'
    setOpenAdmin(true)
  }

  const closeAdmin = () => {
    if (window.location.hash === '#admin') window.location.hash = ''
    setOpenAdmin(false)
  }

  // Оверлеи не считают админку: она теперь отдельная страница, а не окно.
  const anyOverlay = openAccount || openDesigner
  const closeOverlays = () => {
    setOpenAccount(false); setOpenDesigner(false)
    setPaid(null)
  }

  /** Досрочно убрать экран «оплачено» — ждать анимацию никто не обязан. */
  const skipPaid = () => { setPaid(null); if (!cart.length) navigate('/') }

  // Админка — полноэкранная страница вместо витрины, а не модальное окно.
  if (openAdmin) {
    return (
      <>
        <Admin
          onClose={closeAdmin} onToast={say}
          catalog={catalog} setCatalog={setCatalog}
          sizeExtra={sizeExtra} setSizeExtra={setSizeExtra}
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

          <button className="btn btn-ghost" onClick={showAdmin} title={t.nav_admin}>
            <Icon name="settings" /> <span className="hide-sm">{t.nav_admin}</span>
          </button>

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

      {route === '/' && (<>
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
      <div className="wrap" id="pay">
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
              isFav={favorites.includes(pr.id)} onFav={onFav} onZoom={setZoomed}
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
          <button className={`chip big ${filter === 'adult' ? 'on' : ''}`} onClick={() => setFilter('adult')}>
            {t.foot_18}
          </button>
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
      <section id="about" className="section wrap">
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
      </>)}

      {/* ── отдельные страницы каталога ── */}
      {page && (
        <CatalogPage
          t={t} lang={lang} title={page.title} desc={page.desc} products={page.items}
          onAdd={addToCart} priceOf={priceOf} favorites={favorites} onFav={onFav} onZoom={setZoomed}
          onDesigner={() => setOpenDesigner(true)} onHome={() => navigate('/')}
        />
      )}

      {/* ── корзина и оформление ── */}
      {route === '/cart' && (
        <CartPage
          t={t} lang={lang} cart={cart} resolveItem={resolveItem}
          setQty={setQty} removeFromCart={removeFromCart}
          subtotal={subtotal} discount={discount} total={total} cashback={cashback}
          promo={promo} promoInput={promoInput} setPromoInput={setPromoInput} applyPromo={applyPromo}
          customer={customer} setCustomer={setCustomer}
          payMethod={payMethod} setPayMethod={setPayMethod} wallet={wallet} settings={settings}
          checkout={checkout} paying={paying} count={count}
          upsell={visible.filter((x) => !cart.some((i) => i.id === x.id)).slice(0, 4)}
          onAdd={addToCart} priceOf={priceOf} favorites={favorites} onFav={onFav}
          onHome={() => navigate('/')} onCatalog={() => navigate('/catalog')}
          onPrivacy={() => navigate('/privacy')} onZoom={setZoomed}
        />
      )}

      {route === '/privacy' && <Privacy t={t} onHome={() => navigate('/')} />}

      <footer className="footer">
        <div className="foot-cols">
          <div className="foot-col">
            <h4>{t.foot_catalog}</h4>
            <button className="foot-link" onClick={() => navigate('/catalog/ru')}>{t.foot_ru}</button>
            <button className="foot-link" onClick={() => navigate('/catalog/kk')}>{t.foot_kk}</button>
            <button className="foot-link" onClick={() => navigate('/catalog/adult')}>{t.foot_18}</button>
            <button className="foot-link" onClick={() => navigate('/catalog/fresh')}>{t.foot_new}</button>
            <button className="foot-link" onClick={() => navigate('/catalog')}>{t.foot_all}</button>
          </div>

          <div className="foot-col">
            <h4>{t.foot_buyer}</h4>
            <button className="foot-link" onClick={() => navigate('/cart')}>{t.foot_cart}</button>
            <a className="foot-link" href="#how">{t.foot_how}</a>
            <a className="foot-link" href="#collections">{t.foot_coll}</a>
            <a className="foot-link" href="#pay">{t.foot_pay}</a>
            <a className="foot-link" href="#/">{t.foot_about}</a>
            <button className="foot-link" onClick={() => navigate('/privacy')}>{t.pp_title}</button>
          </div>

          <div className="foot-col">
            <h4>{t.foot_contact}</h4>
            <a className="foot-link" href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a>
            <a className="foot-link hot" href={CONTACTS.whatsapp.href} target="_blank" rel="noreferrer">
              WhatsApp {CONTACTS.whatsapp.label}
            </a>
            <a className="foot-link hot" href={CONTACTS.telegram.href} target="_blank" rel="noreferrer">
              Telegram {CONTACTS.telegram.label}
            </a>
            <p className="foot-note">{t.foot_note}</p>
          </div>
        </div>

        <div className="foot-bottom">
          <Logo size={30} />
          <p>{t.footer}</p>
          <button className="link" onClick={showAdmin}>{t.nav_admin}</button>
          <span>© {new Date().getFullYear()} funymems.cc</span>
        </div>
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

      {/* ── увеличенная футболка ── */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            key="zoom" className="zoomview"
            onClick={() => setZoomed(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="zoomview-tee"
              initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.75, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 210, damping: 22 }}
            >
              <Tshirt product={zoomed} lang={lang} hovered big />
            </motion.div>
            <div className="zoomview-bar">
              <b>{zoomed[lang]?.title}</b>
              <span className="muted">{t.zoom_out}</span>
            </div>
            <button className="x float" aria-label={t.zoom_out}><Icon name="close" size={15} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── экран «оплачено» поверх страницы ── */}
      <AnimatePresence>
        {paid && <PaidScreen key="paid" t={t} paid={paid} onSkip={skipPaid} />}
      </AnimatePresence>

      {/* ── копии товара, летящие в корзину ── */}
      <div className="flyer-layer">
        {flights.map((f) => (
          <Flyer
            key={f.id} flight={f} lang={lang}
            onDone={() => setFlights((fs) => fs.filter((x) => x.id !== f.id))}
          />
        ))}
      </div>

      {/* ── кнопка «вверх»: на телефоне страницы длинные ── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            key="totop" className="to-top" aria-label={t.to_top} title={t.to_top}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Icon name="up" size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── нижняя панель (только телефон), как у образца ── */}
      <nav className="bottombar">
        <motion.button
          className={!openCart && bottomTab === 'home' ? 'on' : ''}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setBottomTab('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <Icon name="outline" size={19} /><span>{t.nav_home}</span>
        </motion.button>

        <motion.button
          className={!openCart && bottomTab === 'catalog' ? 'on' : ''}
          whileTap={{ scale: 0.9 }}
          onClick={() => { setBottomTab('catalog'); gotoCatalog('all') }}
        >
          <Icon name="shirt" size={19} /><span>{t.nav_shop}</span>
        </motion.button>

        {/* Корзина подсвечивается, пока шторка открыта, и подпрыгивает,
            когда меняется количество — на телефоне счётчик в шапке не виден. */}
        <motion.button
          ref={cartBarRef}
          className={openCart ? 'on' : ''}
          whileTap={{ scale: 0.9 }}
          animate={count ? { scale: [1, 1.16, 0.97, 1] } : {}}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          key={count}
          onClick={() => setOpenCart(true)}
        >
          <Icon name="cart" size={19} /><span>{t.cart}{count ? ` · ${count}` : ''}</span>
        </motion.button>
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
