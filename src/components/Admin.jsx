import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from './Icon.jsx'
import { PRODUCTS, MARKETS, SIZES, fmt, asset } from '../data.js'

// Демо-пароль. Настоящей защиты тут нет — он виден в коде, а данные лежат
// в браузере. Панель для правки витрины, не для реальной безопасности.
const ADMIN_PASS = 'funymems'

const ALL_SLUGS = PRODUCTS.map((p) => p.id)

export default function Admin({
  onClose, onToast,
  catalog, setCatalog, sizeExtra, setSizeExtra, promos, setPromos, orders, priceOf,
}) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('hehe.admin') === '1')
  const [pass, setPass] = useState('')
  const [tab, setTab] = useState('catalog')
  const [addSlug, setAddSlug] = useState(ALL_SLUGS[0])

  const login = (e) => {
    e.preventDefault()
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem('hehe.admin', '1')
      setUnlocked(true)
    } else onToast('Неверный пароль')
  }

  /* ── правки каталога ── */
  const patch = (id, upd) => setCatalog((c) => c.map((p) => (p.id === id ? { ...p, ...upd } : p)))
  const patchText = (id, lng, field, val) =>
    setCatalog((c) => c.map((p) => (p.id === id ? { ...p, [lng]: { ...p[lng], [field]: val } } : p)))
  const removeProduct = (id) => setCatalog((c) => c.filter((p) => p.id !== id))

  const addProduct = (slug) => {
    if (!slug) return
    const base = PRODUCTS.find((p) => p.id === slug)
    const id = catalog.some((p) => p.id === slug) ? `${slug}-${Date.now().toString().slice(-4)}` : slug
    const np = base
      ? { ...base, id }
      : { id, market: 'ru', base: 9900, color: '#e9e7e2', hidden: false,
          photos: { white: `/tees/${slug}-w.png`, black: `/tees/${slug}-b.png` },
          ru: { title: slug, sub: '' }, kk: { title: slug, sub: '' } }
    setCatalog((c) => [np, ...c])
    onToast('Товар добавлен')
  }

  // factor в процентах: 110 = ×1.1. Делим на 100 (проценты) и ещё на 100,
  // затем ×100 — округление до сотен тенге. Раньше второго деления не было,
  // и цены раздувались в 100 раз.
  const bump = (factor) =>
    setCatalog((c) => c.map((p) => ({ ...p, base: Math.max(100, Math.round(p.base * factor / 10000) * 100) })))

  /* ── статистика ── */
  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + o.total, 0)
    const byProduct = {}
    for (const o of orders) for (const it of o.items || []) {
      byProduct[it.title] = (byProduct[it.title] || 0) + it.qty
    }
    const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const cardCnt = orders.filter((o) => o.method === 'card').length
    return { revenue, count: orders.length, avg: orders.length ? Math.round(revenue / orders.length) : 0, top, cardCnt }
  }, [orders])

  /* ── промокоды ── */
  const [pCode, setPCode] = useState('')
  const [pType, setPType] = useState('percent')
  const [pVal, setPVal] = useState(10)
  const addPromo = () => {
    const code = pCode.trim().toUpperCase()
    if (!code) return
    if (promos.some((p) => p.code === code)) return onToast('Такой код уже есть')
    setPromos((ps) => [{ code, type: pType, value: Number(pVal) || 0, active: true }, ...ps])
    setPCode(''); setPVal(10)
    onToast('Промокод создан')
  }
  const togglePromo = (code) => setPromos((ps) => ps.map((p) => (p.code === code ? { ...p, active: !p.active } : p)))
  const delPromo = (code) => setPromos((ps) => ps.filter((p) => p.code !== code))

  if (!unlocked) {
    return (
      <motion.div className="modal admin-lock"
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}>
        <button className="x float" onClick={onClose} aria-label="close"><Icon name="close" size={15} /></button>
        <h3>Админ-панель</h3>
        <p className="muted">Демо-доступ. Пароль хранится в коде, реальной защиты нет.</p>
        <form className="auth-form" onSubmit={login}>
          <input type="password" placeholder="Пароль" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
          <button className="btn btn-solid full">Войти</button>
        </form>
      </motion.div>
    )
  }

  return (
    <motion.div className="admin"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <div className="admin-head">
        <h3>Админ-панель <span className="muted">· demo</span></h3>
        <button className="btn" onClick={onClose}><Icon name="close" size={15} /> Закрыть</button>
      </div>

      <div className="admin-tabs">
        {[['catalog', 'Каталог'], ['pricing', 'Цены'], ['orders', 'Заказы'], ['promos', 'Промокоды']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="admin-body">
        {/* ── Каталог ── */}
        {tab === 'catalog' && (
          <div className="admin-pane">
            <div className="admin-add">
              <select value={addSlug} onChange={(e) => setAddSlug(e.target.value)}>
                {ALL_SLUGS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-solid" onClick={() => addProduct(addSlug)}>
                <Icon name="plus" size={14} /> Добавить
              </button>
              <span className="muted">товаров: {catalog.length}, видно: {catalog.filter((p) => !p.hidden).length}</span>
            </div>

            <div className="admin-rows">
              {catalog.map((p) => (
                <div key={p.id} className={`admin-row ${p.hidden ? 'off' : ''}`}>
                  <img src={asset(p.photos?.black)} alt="" className="admin-thumb" />
                  <div className="admin-fields">
                    <input value={p.ru.title} onChange={(e) => patchText(p.id, 'ru', 'title', e.target.value)} placeholder="Название" />
                    <div className="admin-inline">
                      <select value={p.market} onChange={(e) => patch(p.id, { market: e.target.value })}>
                        {Object.keys(MARKETS).map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                      </select>
                      <label className="admin-price">
                        ₸<input type="number" value={p.base} step={100}
                          onChange={(e) => patch(p.id, { base: Number(e.target.value) || 0 })} />
                      </label>
                      <button className={`chip ${p.hidden ? '' : 'on'}`} onClick={() => patch(p.id, { hidden: !p.hidden })}>
                        {p.hidden ? 'Скрыт' : 'Виден'}
                      </button>
                      <button className="link danger" onClick={() => removeProduct(p.id)}>Удалить</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Цены ── */}
        {tab === 'pricing' && (
          <div className="admin-pane">
            <p className="muted">
              <b>Надбавка</b> к базовой цене за размер — не цена. 0 = размер стоит как база;
              обычно S/M/L без надбавки, а XL/XXL дороже.
            </p>
            <div className="admin-sizes">
              {SIZES.map((s) => (
                <label key={s} className="admin-price">
                  <span>{s}</span>
                  <span className="admin-plus">+</span>
                  <input type="number" step={100} value={sizeExtra[s] ?? 0}
                    onChange={(e) => setSizeExtra((x) => ({ ...x, [s]: Number(e.target.value) || 0 }))} />
                  <span className="muted">₸</span>
                </label>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 16 }}>Массовое изменение базовых цен:</p>
            <div className="d-row">
              <button className="btn" onClick={() => bump(110)}>+10% ко всем</button>
              <button className="btn" onClick={() => bump(90)}>−10% ко всем</button>
            </div>
            <p className="muted" style={{ marginTop: 16 }}>
              Пример: базовая {fmt(9900)} → XL {fmt(9900 + (sizeExtra.XL ?? 0))} → XXL {fmt(9900 + (sizeExtra.XXL ?? 0))}
            </p>
          </div>
        )}

        {/* ── Заказы ── */}
        {tab === 'orders' && (
          <div className="admin-pane">
            <div className="admin-stats">
              <div><b>{fmt(stats.revenue)}</b><span>выручка</span></div>
              <div><b>{stats.count}</b><span>заказов</span></div>
              <div><b>{fmt(stats.avg)}</b><span>средний чек</span></div>
              <div><b>{stats.cardCnt}/{stats.count - stats.cardCnt}</b><span>карта / кошелёк</span></div>
            </div>

            {stats.top.length > 0 && (
              <>
                <p className="muted" style={{ marginTop: 14 }}>Топ товаров:</p>
                <ul className="admin-top">
                  {stats.top.map(([name, qty]) => (
                    <li key={name}><span>{name}</span><b>×{qty}</b></li>
                  ))}
                </ul>
              </>
            )}

            <p className="muted" style={{ marginTop: 14 }}>
              Заказы из этого браузера (бэкенда нет, чужие сюда не попадают):
            </p>
            {!orders.length && <p className="empty">Заказов пока нет</p>}
            {orders.map((o) => (
              <div key={o.id} className="admin-order">
                <div className="admin-order-top">
                  <b>#{String(o.id).slice(-6)}</b>
                  <span className="muted">{new Date(o.created_at).toLocaleString('ru-RU')}</span>
                  <span className="pay-tag"><Icon name={o.method === 'wallet' ? 'wallet' : 'card'} size={13} /> {o.method}</span>
                  <b className="admin-order-sum">{fmt(o.total)}</b>
                </div>
                {o.customer?.name && (
                  <div className="admin-cust">
                    <b>{o.customer.name}</b> · {o.customer.phone}
                    {(o.customer.city || o.customer.address) &&
                      <span className="muted"> · {[o.customer.city, o.customer.address].filter(Boolean).join(', ')}</span>}
                  </div>
                )}
                <div className="muted">{(o.items || []).map((i) => `${i.title} ×${i.qty}`).join(' · ')}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Промокоды ── */}
        {tab === 'promos' && (
          <div className="admin-pane">
            <div className="admin-promo-add">
              <input placeholder="КОД" value={pCode} onChange={(e) => setPCode(e.target.value.toUpperCase())} />
              <select value={pType} onChange={(e) => setPType(e.target.value)}>
                <option value="percent">%</option>
                <option value="fixed">₸</option>
              </select>
              <input type="number" value={pVal} onChange={(e) => setPVal(e.target.value)} />
              <button className="btn btn-solid" onClick={addPromo}><Icon name="plus" size={14} /> Создать</button>
            </div>

            {!promos.length && <p className="empty">Промокодов нет</p>}
            {promos.map((p) => (
              <div key={p.code} className={`admin-promo ${p.active ? '' : 'off'}`}>
                <b>{p.code}</b>
                <span>{p.type === 'percent' ? `−${p.value}%` : `−${fmt(p.value)}`}</span>
                <button className={`chip ${p.active ? 'on' : ''}`} onClick={() => togglePromo(p.code)}>
                  {p.active ? 'Активен' : 'Выключен'}
                </button>
                <button className="link danger" onClick={() => delPromo(p.code)}>Удалить</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
