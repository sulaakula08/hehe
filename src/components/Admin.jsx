import { useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'
import { PRODUCTS, MARKETS, SIZES, DEFAULT_SETTINGS, ADMIN_PASS, fmt, asset } from '../data.js'

const EMPTY = {
  ruTitle: '', ruSub: '', kkTitle: '', kkSub: '',
  market: 'ru', base: 9900, white: '', black: '', fresh: true, adult: false,
}

/**
 * Фото из файла ужимаем до 700px и жмём в webp: dataURL уходит в localStorage,
 * а там лимит около 5 МБ — исходный снимок на 400 КБ забил бы его за десяток
 * товаров. webp держит прозрачность, поэтому вырезанный фон не пропадает.
 */
const shrink = (file) => new Promise((resolve, reject) => {
  const fr = new FileReader()
  fr.onerror = () => reject(new Error('read'))
  fr.onload = () => {
    const img = new Image()
    img.onerror = () => reject(new Error('decode'))
    img.onload = () => {
      const k = Math.min(1, 700 / Math.max(img.width, img.height))
      const cv = document.createElement('canvas')
      cv.width = Math.round(img.width * k)
      cv.height = Math.round(img.height * k)
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
      resolve(cv.toDataURL('image/webp', 0.85))
    }
    img.src = fr.result
  }
  fr.readAsDataURL(file)
})

/** Латинский slug из названия — им называется товар в каталоге. */
const slugify = (s) => {
  const map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',
    н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ы:'y',э:'e',
    ю:'yu',я:'ya',ә:'a',ғ:'g',қ:'k',ң:'n',ө:'o',ұ:'u',ү:'u',һ:'h',і:'i',ъ:'',ь:'' }
  return [...s.toLowerCase()].map((c) => map[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'tee'
}

const TABS = [
  ['overview', 'Обзор', 'target'],
  ['catalog', 'Каталог', 'shirt'],
  ['pricing', 'Цены', 'coin'],
  ['orders', 'Заказы', 'cart'],
  ['settings', 'Настройки', 'settings'],
]

/** Плитка статистики. */
function Stat({ value, label, hint }) {
  return (
    <div className="astat">
      <b>{value}</b>
      <span>{label}</span>
      {hint && <i>{hint}</i>}
    </div>
  )
}

export default function Admin({
  onClose, onToast,
  catalog, setCatalog, sizeExtra, setSizeExtra,
  orders, setOrders, settings, setSettings, priceOf,
}) {
  // Панель закрыта своим паролем. Защита демонстрационная: пароль лежит в коде
  // и виден в бандле, но случайный посетитель витрины внутрь не попадёт.
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('hehe.admin') === '1')
  const [pass, setPass] = useState('')
  const [tab, setTab] = useState('overview')
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [openRow, setOpenRow] = useState(null)
  const [payFilter, setPayFilter] = useState('all')

  /* ── правки каталога ── */
  const patch = (id, upd) => setCatalog((c) => c.map((p) => (p.id === id ? { ...p, ...upd } : p)))
  const patchText = (id, lng, field, val) =>
    setCatalog((c) => c.map((p) => (p.id === id ? { ...p, [lng]: { ...p[lng], [field]: val } } : p)))
  const removeProduct = (id) => {
    setCatalog((c) => c.filter((p) => p.id !== id))
    onToast('Товар удалён')
  }

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const pickPhoto = async (which, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return onToast('Нужен файл-картинка')
    setBusy(true)
    try {
      setF(which, await shrink(file))
    } catch {
      onToast('Не удалось прочитать файл')
    } finally {
      setBusy(false)
    }
  }

  /** Создаёт товар из формы: фото, названия, цена. */
  const addProduct = () => {
    const title = form.ruTitle.trim()
    if (!title) return onToast('Впиши название')
    if (!form.white && !form.black) return onToast('Загрузи хотя бы одно фото')
    let id = slugify(title)
    if (catalog.some((p) => p.id === id)) id = `${id}-${Date.now().toString().slice(-4)}`
    // Если загрузили одно фото — показываем его для обоих цветов ткани.
    const white = form.white || form.black
    const black = form.black || form.white
    const np = {
      id, market: form.market, base: Math.max(0, Number(form.base) || 0),
      color: '#e9e7e2', hidden: false, fresh: !!form.fresh, adult: !!form.adult,
      photos: { white, black },
      ru: { title, sub: form.ruSub.trim() },
      kk: { title: form.kkTitle.trim() || title, sub: form.kkSub.trim() || form.ruSub.trim() },
    }
    setCatalog((c) => [np, ...c])
    setForm(EMPTY)
    setOpenRow(id)
    onToast('Товар добавлен')
  }

  // Порядок в каталоге = порядок на витрине, поэтому даём двигать строки.
  const move = (id, dir) => setCatalog((c) => {
    const i = c.findIndex((p) => p.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= c.length) return c
    const next = [...c]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  // factor в процентах: 110 = ×1.1. Делим на 100 (проценты) и ещё на 100,
  // затем ×100 — округление до сотен тенге.
  const bump = (factor) =>
    setCatalog((c) => c.map((p) => ({ ...p, base: Math.max(100, Math.round(p.base * factor / 10000) * 100) })))

  const setAllHidden = (hidden) => setCatalog((c) => c.map((p) => ({ ...p, hidden })))

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

  const shownOrders = payFilter === 'all' ? orders : orders.filter((o) => o.method === payFilter)

  const visibleCount = catalog.filter((p) => !p.hidden).length
  const filtered = catalog.filter((p) => {
    const s = q.trim().toLowerCase()
    return !s || p.id.includes(s) || p.ru.title.toLowerCase().includes(s) || p.kk.title.toLowerCase().includes(s)
  })

  /* ── настройки ── */
  const setS = (upd) => setSettings((s) => ({ ...s, ...upd }))
  const resetDemo = () => {
    setCatalog(PRODUCTS)
    setSizeExtra({ S: 0, M: 0, L: 0, XL: 1000, XXL: 1500 })
    setSettings(DEFAULT_SETTINGS)
    setOpenRow(null)
    onToast('Каталог и цены сброшены')
  }

  if (!unlocked) {
    const submit = (e) => {
      e.preventDefault()
      if (pass === ADMIN_PASS) {
        sessionStorage.setItem('hehe.admin', '1')
        setUnlocked(true)
      } else onToast('Неверный пароль')
    }
    return (
      <div className="apage">
        <header className="apage-top">
          <Logo size={30} />
          <div className="apage-title">Админ-панель <span className="muted">· demo</span></div>
          <div className="apage-top-right">
            <button className="btn" onClick={onClose} title="На витрину" aria-label="На витрину">
              <Icon name="undo" size={14} /> <span className="hide-sm">На витрину</span>
            </button>
          </div>
        </header>
        <form className="alock" onSubmit={submit}>
          <span className="tile-ic"><Icon name="settings" size={20} /></span>
          <h2>Вход в панель</h2>
          <p className="muted">Демо-доступ: пароль зашит в код, настоящей защиты здесь нет.</p>
          <input
            type="password" placeholder="Пароль" autoFocus
            value={pass} onChange={(e) => setPass(e.target.value)}
          />
          <button className="btn btn-solid full big">Войти</button>
        </form>
      </div>
    )
  }

  return (
    <div className="apage">
      {/* ── верхняя панель ── */}
      <header className="apage-top">
        <Logo size={30} />
        <div className="apage-title">
          Админ-панель <span className="muted">· demo</span>
        </div>
        <div className="apage-top-right">

          <button className="btn" onClick={onClose} title="На витрину" aria-label="На витрину">
            <Icon name="undo" size={14} /> <span className="hide-sm">На витрину</span>
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { sessionStorage.removeItem('hehe.admin'); setUnlocked(false) }}
          >
            Запереть
          </button>
        </div>
      </header>

      <div className="apage-main">
        {/* ── боковое меню ── */}
        <aside className="apage-nav">
          {TABS.map(([k, label, icon]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              <Icon name={icon} size={16} /> <span>{label}</span>
            </button>
          ))}
        </aside>

        <section className="apage-content">
          {/* ── Обзор ── */}
          {tab === 'overview' && (
            <div className="apane">
              <h2>Обзор</h2>
              <div className="astats">
                <Stat value={fmt(stats.revenue)} label="выручка" />
                <Stat value={stats.count} label="заказов" />
                <Stat value={fmt(stats.avg)} label="средний чек" />
                <Stat value={`${visibleCount}/${catalog.length}`} label="товаров видно" />
                <Stat value={`${stats.cardCnt}/${stats.count - stats.cardCnt}`} label="карта / кошелёк" />
              </div>

              {stats.top.length > 0 && (
                <>
                  <h3>Топ товаров</h3>
                  <ul className="atop">
                    {stats.top.map(([name, qty]) => (
                      <li key={name}><span>{name}</span><b>×{qty}</b></li>
                    ))}
                  </ul>
                </>
              )}

              <h3>Последние заказы</h3>
              {!orders.length && <p className="empty">Заказов пока нет</p>}
              {orders.slice(0, 3).map((o) => (
                <div key={o.id} className="aorder">
                  <div className="aorder-top">
                    <b>#{String(o.id).slice(-6)}</b>
                    <span className="muted">{new Date(o.created_at).toLocaleString('ru-RU')}</span>
                    <b className="aorder-sum">{fmt(o.total)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Каталог ── */}
          {tab === 'catalog' && (
            <div className="apane">
              <h2>Каталог</h2>
              {/* ── новый товар: свои фото и тексты ── */}
              <details className="anew" open={!catalog.length}>
                <summary><Icon name="plus" size={14} /> Добавить свою футболку</summary>

                <div className="anew-body">
                  <div className="anew-photos">
                    {[['white', 'Фото на белой'], ['black', 'Фото на чёрной']].map(([k, label]) => (
                      <label key={k} className="aupload">
                        {form[k]
                          ? <img src={form[k]} alt="" />
                          : <span className="aupload-empty"><Icon name="image" size={22} />{label}</span>}
                        <input
                          type="file" accept="image/*"
                          onChange={(e) => { pickPhoto(k, e.target.files?.[0]); e.target.value = '' }}
                        />
                        {form[k] && (
                          <button className="aupload-x" onClick={(e) => { e.preventDefault(); setF(k, '') }}>
                            <Icon name="close" size={12} />
                          </button>
                        )}
                      </label>
                    ))}
                  </div>
                  <p className="muted small">
                    Хватит и одного фото — второй цвет возьмёт то же. Картинку ужимаем до 700 px,
                    чтобы каталог влез в память браузера.
                  </p>

                  <div className="agrid2">
                    <label className="afield"><span>Название</span>
                      <input value={form.ruTitle} onChange={(e) => setF('ruTitle', e.target.value)}
                        placeholder="Шашлык не жена" /></label>
                    <label className="afield"><span>Подзаголовок</span>
                      <input value={form.ruSub} onChange={(e) => setF('ruSub', e.target.value)}
                        placeholder="Смело бери 3–4 штуки" /></label>
                    <label className="afield"><span>Название по-казахски</span>
                      <input value={form.kkTitle} onChange={(e) => setF('kkTitle', e.target.value)}
                        placeholder="можно оставить пустым" /></label>
                    <label className="afield"><span>Подзаголовок по-казахски</span>
                      <input value={form.kkSub} onChange={(e) => setF('kkSub', e.target.value)}
                        placeholder="можно оставить пустым" /></label>
                    <label className="afield"><span>Цена, ₸</span>
                      <input type="number" step={100} value={form.base}
                        onChange={(e) => setF('base', e.target.value)} /></label>
                    <label className="afield"><span>Язык принта</span>
                      <select value={form.market} onChange={(e) => setF('market', e.target.value)}>
                        {Object.keys(MARKETS).map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                      </select></label>
                  </div>

                  <div className="arow-tools">
                    <button className={`chip ${form.fresh ? 'on' : ''}`} onClick={() => setF('fresh', !form.fresh)}>
                      Новинка
                    </button>
                    <button className={`chip ${form.adult ? 'on' : ''}`} onClick={() => setF('adult', !form.adult)}>
                      18+
                    </button>
                    <button className="btn btn-solid" onClick={addProduct} disabled={busy}>
                      <Icon name="plus" size={14} /> {busy ? 'Читаю фото…' : 'Добавить в каталог'}
                    </button>
                    <button className="btn" onClick={() => setForm(EMPTY)}>Очистить</button>
                  </div>
                </div>
              </details>

              <div className="arow-tools">
                <input className="asearch" placeholder="Поиск по названию" value={q} onChange={(e) => setQ(e.target.value)} />
                <button className="btn" onClick={() => setAllHidden(false)}>Показать все</button>
                <button className="btn" onClick={() => setAllHidden(true)}>Скрыть все</button>
                <span className="muted">товаров: {catalog.length}, видно: {visibleCount}</span>
              </div>

              {!filtered.length && <p className="empty">Ничего не найдено</p>}

              <div className="arows">
                {filtered.map((p) => (
                  <div key={p.id} className={`arow ${p.hidden ? 'off' : ''}`}>
                    <div className="arow-head">
                      <img src={asset(p.photos?.black)} alt="" className="athumb" />
                      <div className="arow-main">
                        <input
                          className="arow-name"
                          value={p.ru.title}
                          onChange={(e) => patchText(p.id, 'ru', 'title', e.target.value)}
                          placeholder="Название"
                        />
                        <div className="arow-inline">
                          <select value={p.market} onChange={(e) => patch(p.id, { market: e.target.value })}>
                            {Object.keys(MARKETS).map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                          </select>
                          <label className="aprice">
                            ₸<input type="number" value={p.base} step={100}
                              onChange={(e) => patch(p.id, { base: Number(e.target.value) || 0 })} />
                          </label>
                          <button className={`chip ${p.hidden ? '' : 'on'}`} onClick={() => patch(p.id, { hidden: !p.hidden })}>
                            {p.hidden ? 'Скрыт' : 'Виден'}
                          </button>
                          {/* Новинку можно снять и поставить руками — подборка
                              «Новинки» и плашка на карточке смотрят на этот флаг. */}
                          <button
                            className={`chip ${p.fresh ? 'on' : ''}`}
                            onClick={() => patch(p.id, { fresh: !p.fresh })}
                            title="Показывать как новинку"
                          >
                            Новинка
                          </button>
                          {/* Раздел 18+ в подвале и чип в каталоге берут этот флаг. */}
                          <button
                            className={`chip ${p.adult ? 'on' : ''}`}
                            onClick={() => patch(p.id, { adult: !p.adult })}
                            title="Принт с матом — раздел 18+"
                          >
                            18+
                          </button>
                        </div>
                      </div>
                      <div className="arow-side">
                        <button className="aicon" onClick={() => move(p.id, -1)} title="Выше" aria-label="Выше">↑</button>
                        <button className="aicon" onClick={() => move(p.id, 1)} title="Ниже" aria-label="Ниже">↓</button>
                        <button className="aicon" onClick={() => setOpenRow(openRow === p.id ? null : p.id)}
                          title="Подробнее" aria-label="Подробнее">
                          {openRow === p.id ? '−' : '⋯'}
                        </button>
                      </div>
                    </div>

                    {openRow === p.id && (
                      <div className="arow-more">
                        <div className="agrid2">
                          <label className="afield">
                            <span>Подзаголовок RU</span>
                            <input value={p.ru.sub || ''} onChange={(e) => patchText(p.id, 'ru', 'sub', e.target.value)} />
                          </label>
                          <label className="afield">
                            <span>Название KK</span>
                            <input value={p.kk.title || ''} onChange={(e) => patchText(p.id, 'kk', 'title', e.target.value)} />
                          </label>
                          <label className="afield">
                            <span>Подзаголовок KK</span>
                            <input value={p.kk.sub || ''} onChange={(e) => patchText(p.id, 'kk', 'sub', e.target.value)} />
                          </label>
                          <label className="afield">
                            <span>Цвет карточки</span>
                            <input type="color" value={p.color || '#e9e7e2'}
                              onChange={(e) => patch(p.id, { color: e.target.value })} />
                          </label>
                          <label className="afield">
                            <span>Фото (белая)</span>
                            <input value={p.photos?.white || ''}
                              onChange={(e) => patch(p.id, { photos: { ...p.photos, white: e.target.value } })} />
                          </label>
                          <label className="afield">
                            <span>Фото (чёрная)</span>
                            <input value={p.photos?.black || ''}
                              onChange={(e) => patch(p.id, { photos: { ...p.photos, black: e.target.value } })} />
                          </label>
                        </div>
                        <div className="arow-more-foot">
                          <span className="muted">
                            id: {p.id} · S {fmt(priceOf(p, 'S'))} · XL {fmt(priceOf(p, 'XL'))} · XXL {fmt(priceOf(p, 'XXL'))}
                          </span>
                          <button className="link danger" onClick={() => removeProduct(p.id)}>Удалить товар</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Цены ── */}
          {tab === 'pricing' && (
            <div className="apane">
              <h2>Цены</h2>
              <p className="muted">
                <b>Надбавка</b> к базовой цене за размер — не цена. 0 = размер стоит как база;
                обычно S/M/L без надбавки, а XL/XXL дороже.
              </p>
              <div className="asizes">
                {SIZES.map((s) => (
                  <label key={s} className="aprice col">
                    <span>{s}</span>
                    <span className="aplus">+</span>
                    <input type="number" step={100} value={sizeExtra[s] ?? 0}
                      onChange={(e) => setSizeExtra((x) => ({ ...x, [s]: Number(e.target.value) || 0 }))} />
                    <span className="muted">₸</span>
                  </label>
                ))}
              </div>

              <h3>Массовое изменение базовых цен</h3>
              <div className="arow-tools">
                <button className="btn" onClick={() => bump(120)}>+20%</button>
                <button className="btn" onClick={() => bump(110)}>+10%</button>
                <button className="btn" onClick={() => bump(105)}>+5%</button>
                <button className="btn" onClick={() => bump(95)}>−5%</button>
                <button className="btn" onClick={() => bump(90)}>−10%</button>
                <button className="btn" onClick={() => bump(80)}>−20%</button>
              </div>

              <h3>Цена своего дизайна</h3>
              <label className="aprice">
                ₸<input type="number" step={100} value={settings.customPrice}
                  onChange={(e) => setS({ customPrice: Math.max(0, Number(e.target.value) || 0) })} />
              </label>

              <p className="muted">
                Пример: базовая {fmt(9900)} → XL {fmt(9900 + (sizeExtra.XL ?? 0))} → XXL {fmt(9900 + (sizeExtra.XXL ?? 0))}
              </p>
            </div>
          )}

          {/* ── Заказы ── */}
          {tab === 'orders' && (
            <div className="apane">
              <h2>Заказы</h2>
              <div className="astats">
                <Stat value={fmt(stats.revenue)} label="выручка" />
                <Stat value={stats.count} label="заказов" />
                <Stat value={fmt(stats.avg)} label="средний чек" />
                <Stat value={`${stats.cardCnt}/${stats.count - stats.cardCnt}`} label="карта / кошелёк" />
              </div>

              <div className="arow-tools">
                {[['all', 'Все'], ['card', 'Карта'], ['wallet', 'Кошелёк']].map(([k, l]) => (
                  <button key={k} className={`chip ${payFilter === k ? 'on' : ''}`} onClick={() => setPayFilter(k)}>{l}</button>
                ))}
                {orders.length > 0 && (
                  <button className="link danger" onClick={() => { setOrders([]); onToast('Заказы очищены') }}>
                    Очистить все
                  </button>
                )}
              </div>

              <p className="muted">Заказы из этого браузера (бэкенда нет, чужие сюда не попадают).</p>
              {!shownOrders.length && <p className="empty">Заказов нет</p>}
              {shownOrders.map((o) => (
                <div key={o.id} className="aorder">
                  <div className="aorder-top">
                    <b>#{String(o.id).slice(-6)}</b>
                    <span className="muted">{new Date(o.created_at).toLocaleString('ru-RU')}</span>
                    <span className="pay-tag"><Icon name={o.method === 'wallet' ? 'wallet' : 'card'} size={13} /> {o.method}</span>
                    <b className="aorder-sum">{fmt(o.total)}</b>
                    <button className="link danger" onClick={() => setOrders((os) => os.filter((x) => x.id !== o.id))}>
                      Удалить
                    </button>
                  </div>
                  {o.customer?.name && (
                    <div className="acust">
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

          {/* ── Настройки ── */}
          {tab === 'settings' && (
            <div className="apane">
              <h2>Настройки</h2>

              <label className="afield">
                <span>Кэшбэк с оплаты кошельком, %</span>
                <input type="number" min={0} max={100} value={settings.cashback}
                  onChange={(e) => setS({ cashback: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
              </label>

              <label className="afield">
                <span>Цена своего дизайна, ₸</span>
                <input type="number" step={100} value={settings.customPrice}
                  onChange={(e) => setS({ customPrice: Math.max(0, Number(e.target.value) || 0) })} />
              </label>

              <h3>Сброс</h3>
              <p className="muted">
                Вернёт каталог, надбавки за размер и настройки к исходным. Заказы и промокоды не трогает.
              </p>
              <div className="arow-tools">
                <button className="btn" onClick={resetDemo}>Сбросить каталог и цены</button>
              </div>

              <h3>О панели</h3>
              <p className="muted">
                Данные лежат в localStorage этого браузера — бэкенда нет. Пароль администратора
                зашит в код и виден в собранном бандле, так что настоящей защиты здесь нет.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
