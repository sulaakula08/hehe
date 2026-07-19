import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Tshirt, { PRINT_ZONE, TEXT_WIDTH } from './Tshirt.jsx'
import Icon from './Icon.jsx'
import { CUSTOM_COLORS, INK_COLORS, FONTS, TEMPLATES, CUSTOM_PRICE, SIZES, fmt } from '../data.js'

const MAX_FILE = 8 * 1024 * 1024   // 8 МБ до сжатия
const MAX_SIDE = 420               // во столько ужимаем перед сохранением

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/**
 * Ужимает картинку в браузере: дизайн уезжает в localStorage и в заказ,
 * поэтому исходные мегабайты туда пускать нельзя.
 */
function shrink(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('d_bad_file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('d_bad_file'))
      img.onload = () => {
        const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
        const w = Math.round(img.width * k)
        const h = Math.round(img.height * k)
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        const png = file.type === 'image/png'   // PNG — ради прозрачности
        resolve(c.toDataURL(png ? 'image/png' : 'image/jpeg', png ? undefined : 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

const EMPTY_SIDE = {
  text: '',
  font: 'display',
  bold: true,
  italic: false,
  upper: true,
  outline: false,
  textSize: 1,
  textWidth: TEXT_WIDTH.start,
  textPos: { x: 0, y: 34 },
  textRotate: 0,
  image: null,
  imageScale: 1,
  imagePos: { x: 0, y: -26 },
  imageRotate: 0,
}

const START = {
  fabric: CUSTOM_COLORS[0].fabric,
  ink: CUSTOM_COLORS[0].ink,
  side: 'front',
  front: { ...EMPTY_SIDE },
  back: { ...EMPTY_SIDE },
}

const sideEmpty = (s) => !s.image && s.text.trim() === ''
const clone = (o) => JSON.parse(JSON.stringify(o))

export default function Designer({ t, lang, onClose, onAdd, onToast }) {
  const [d, setD] = useState(START)
  const [tab, setTab] = useState('text')
  const [size, setSize] = useState('M')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const cur = d[d.side]

  /* ── история для отмены ── */
  // Снимки кладём только на «начало действия»: перед перетаскиванием, перед
  // возёй со слайдером, перед переключателем. Иначе один драг забил бы всю историю.
  const hist = useRef({ past: [], future: [] })
  const dRef = useRef(d)
  useEffect(() => { dRef.current = d }, [d])
  const [, bump] = useState(0)

  const snapshot = useCallback(() => {
    hist.current.past.push(clone(dRef.current))
    if (hist.current.past.length > 50) hist.current.past.shift()
    hist.current.future = []
    bump((n) => n + 1)
  }, [])

  const undo = useCallback(() => {
    const h = hist.current
    if (!h.past.length) return
    h.future.push(clone(dRef.current))
    setD(h.past.pop())
    bump((n) => n + 1)
  }, [])

  const redo = useCallback(() => {
    const h = hist.current
    if (!h.future.length) return
    h.past.push(clone(dRef.current))
    setD(h.future.pop())
    bump((n) => n + 1)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo(); else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  /* ── правки ── */
  const setSideData = (patch) => setD((old) => ({ ...old, [old.side]: { ...old[old.side], ...patch } }))
  // Для дискретных переключателей: снимок + правка одним действием.
  const edit = (patch) => { snapshot(); setSideData(patch) }

  const move = useCallback((target, dx, dy) => {
    setD((old) => {
      const s = old[old.side]
      if (target === 'width-right' || target === 'width-left') {
        const delta = target === 'width-right' ? dx * 2 : -dx * 2
        return { ...old, [old.side]: { ...s, textWidth: clamp(s.textWidth + delta, TEXT_WIDTH.min, TEXT_WIDTH.max) } }
      }
      const key = target === 'image' ? 'imagePos' : 'textPos'
      const p = s[key]
      return {
        ...old,
        [old.side]: {
          ...s,
          [key]: {
            x: clamp(p.x + dx, -PRINT_ZONE.x, PRINT_ZONE.x),
            y: clamp(p.y + dy, PRINT_ZONE.yTop, PRINT_ZONE.yBottom),
          },
        },
      }
    })
  }, [])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return onToast(t.d_bad_file)
    if (file.size > MAX_FILE) return onToast(t.d_too_big)
    setBusy(true)
    try {
      const img = await shrink(file)
      snapshot()
      setSideData({ image: img })
    } catch (err) {
      onToast(t[err.message] || t.err_generic)
    } finally {
      setBusy(false)
    }
  }

  const applyTemplate = (tpl) => {
    snapshot()
    setSideData(tpl.patch)
    setTab('text')
  }

  const bothEmpty = sideEmpty(d.front) && sideEmpty(d.back)

  const add = () => {
    if (bothEmpty) return onToast(t.d_empty)
    onAdd(clone(d), size)
    onToast(t.d_added)
    onClose()
  }

  // Пустышка-товар для предпросмотра: Tshirt берёт из неё только id и цвета.
  const preview = { id: `designer-${d.side}`, color: d.fabric, ink: d.ink, ru: {}, kk: {} }
  const flat = { ...cur, fabric: d.fabric, ink: d.ink }

  const Slider = ({ label, value, min, max, step, onInput }) => (
    <label className="d-field">
      <span>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onPointerDown={snapshot}
        onChange={(e) => onInput(+e.target.value)}
      />
    </label>
  )

  const TABS = [
    ['tpl', t.d_tab_tpl],
    ['text', t.d_tab_text],
    ['photo', t.d_tab_photo],
    ['shirt', t.d_tab_shirt],
  ]

  return (
    <motion.div
      className="modal designer"
      initial={{ opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 24 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
    >
      <button className="x float" onClick={onClose} aria-label="close"><Icon name="close" size={15} /></button>

      <div className="d-head">
        <h3>{t.designer_title}</h3>
        <div className="d-undo">
          <button className="btn" onClick={undo} disabled={!hist.current.past.length} title={`${t.d_undo} (Ctrl+Z)`}><Icon name="undo" size={17} /></button>
          <button className="btn" onClick={redo} disabled={!hist.current.future.length} title={`${t.d_redo} (Ctrl+Shift+Z)`}><Icon name="redo" size={17} /></button>
        </div>
      </div>

      <div className="d-body">
        {/* ── предпросмотр, тут же и двигаем ── */}
        <div className="d-preview-wrap">
          <div className="d-sides">
            {['front', 'back'].map((s) => (
              <button
                key={s}
                className={`chip big ${d.side === s ? 'on' : ''}`}
                onClick={() => { snapshot(); setD((o) => ({ ...o, side: s })) }}
              >
                {s === 'front' ? t.d_front : t.d_back}
                {!sideEmpty(d[s]) && <span className="dot" />}
              </button>
            ))}
          </div>

          <div className="d-preview" style={{ background: `${d.fabric}22` }}>
            <Tshirt
              product={preview} lang={lang} custom={flat} big
              editable onMove={move} onMoveStart={snapshot} back={d.side === 'back'}
            />
          </div>
          <p className="d-hint muted with-icon"><Icon name="hand" size={14} /> {t.d_drag}</p>
        </div>

        {/* ── настройки ── */}
        <div className="d-controls">
          <div className="d-tabs">
            {TABS.map(([k, label]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>

          {tab === 'tpl' && (
            <div className="d-pane">
              <p className="muted">{t.d_tpl_hint}</p>
              <div className="d-tpls">
                {TEMPLATES.map((tpl) => (
                  <button key={tpl.id} className="tpl" onClick={() => applyTemplate(tpl)}>
                    <b>{tpl[lang]}</b>
                    <span style={{ fontFamily: FONTS.find((f) => f.id === tpl.patch.font)?.css }}>
                      {tpl.patch.text.split('\n')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'text' && (
            <div className="d-pane">
              <label className="d-field">
                <span>{t.d_text}</span>
                <textarea
                  rows={2}
                  value={cur.text}
                  placeholder={t.d_text_ph}
                  onFocus={snapshot}
                  onChange={(e) => setSideData({ text: e.target.value.slice(0, 120) })}
                />
                <small className="muted">{t.d_text_hint} · {cur.text.length}/120</small>
              </label>

              <div className="d-field">
                <span>{t.d_font}</span>
                <div className="d-fonts">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      className={`fontbtn ${cur.font === f.id ? 'on' : ''}`}
                      style={{ fontFamily: f.css }}
                      onClick={() => edit({ font: f.id })}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-field">
                <span>{t.d_style}</span>
                <div className="d-row">
                  <button className={`chip big ${cur.bold ? 'on' : ''}`} style={{ fontWeight: 800 }}
                    onClick={() => edit({ bold: !cur.bold })}>B</button>
                  <button className={`chip big ${cur.italic ? 'on' : ''}`}
                    style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}
                    onClick={() => edit({ italic: !cur.italic })}>I</button>
                  <button className={`chip big ${cur.upper ? 'on' : ''}`}
                    onClick={() => edit({ upper: !cur.upper })}>{t.d_upper}</button>
                  <button className={`chip big ${cur.outline ? 'on' : ''}`}
                    onClick={() => edit({ outline: !cur.outline })}>
                    <Icon name="outline" size={15} /> {t.d_outline}
                  </button>
                </div>
              </div>

              <div className="d-field">
                <span>{t.d_ink}</span>
                <div className="swatches">
                  {INK_COLORS.map((c) => (
                    <button key={c} className={`swatch small ${cur.ink === c || d.ink === c ? 'on' : ''}`}
                      style={{ background: c }} onClick={() => { snapshot(); setD((o) => ({ ...o, ink: c })) }}
                      aria-label={c} />
                  ))}
                </div>
              </div>

              <Slider label={t.d_size} value={cur.textSize} min={0.5} max={3} step={0.05}
                onInput={(v) => setSideData({ textSize: v })} />
              <Slider label={t.d_width} value={cur.textWidth} min={TEXT_WIDTH.min} max={TEXT_WIDTH.max} step={1}
                onInput={(v) => setSideData({ textWidth: v })} />
              <Slider label={`${t.d_rotate}: ${cur.textRotate}°`} value={cur.textRotate} min={-45} max={45} step={1}
                onInput={(v) => setSideData({ textRotate: v })} />
            </div>
          )}

          {tab === 'photo' && (
            <div className="d-pane">
              <div className="d-field">
                <span>{t.d_photo}</span>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                <div className="d-row">
                  <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                    <Icon name="image" /> {busy ? t.processing : t.d_photo_add}
                  </button>
                  {cur.image && (
                    <button className="btn" onClick={() => edit({ image: null })}>{t.d_photo_del}</button>
                  )}
                </div>
              </div>

              {cur.image ? (
                <>
                  <Slider label={t.d_photo_size} value={cur.imageScale} min={0.4} max={2} step={0.05}
                    onInput={(v) => setSideData({ imageScale: v })} />
                  <Slider label={`${t.d_rotate}: ${cur.imageRotate}°`} value={cur.imageRotate} min={-45} max={45} step={1}
                    onInput={(v) => setSideData({ imageRotate: v })} />
                </>
              ) : (
                <p className="muted">{t.d_photo_add}</p>
              )}
            </div>
          )}

          {tab === 'shirt' && (
            <div className="d-pane">
              <div className="d-field">
                <span>{t.d_fabric}</span>
                <div className="swatches">
                  {CUSTOM_COLORS.map((c) => (
                    <button key={c.id} className={`swatch ${d.fabric === c.fabric ? 'on' : ''}`}
                      style={{ background: c.fabric }}
                      onClick={() => { snapshot(); setD((o) => ({ ...o, fabric: c.fabric, ink: c.ink })) }}
                      aria-label={c.id} />
                  ))}
                </div>
              </div>

              <div className="d-field">
                <span>{t.size}</span>
                <div className="sizes">
                  {SIZES.map((s) => (
                    <button key={s} className={`chip ${size === s ? 'on' : ''}`} onClick={() => setSize(s)}>{s}</button>
                  ))}
                </div>
              </div>

              <button className="btn full" onClick={() => { snapshot(); setD(START) }}>{t.d_reset}</button>
            </div>
          )}
        </div>
      </div>

      <div className="d-foot">
        <button
          className="btn"
          onClick={() => { snapshot(); setSideData({ textPos: { ...EMPTY_SIDE.textPos }, imagePos: { ...EMPTY_SIDE.imagePos }, textRotate: 0, imageRotate: 0 }) }}
        >
          {t.d_center}
        </button>
        <span className="price">{fmt(CUSTOM_PRICE)}</span>
        <button className="btn btn-solid" onClick={add} disabled={busy}>{t.add}</button>
      </div>
    </motion.div>
  )
}
