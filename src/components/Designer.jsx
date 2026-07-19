import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Tshirt, { PRINT_ZONE } from './Tshirt.jsx'
import { CUSTOM_COLORS, INK_COLORS, FONTS, CUSTOM_PRICE, SIZES, fmt } from '../data.js'

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
        // PNG сохраняем как PNG, чтобы не потерять прозрачность
        const png = file.type === 'image/png'
        resolve(c.toDataURL(png ? 'image/png' : 'image/jpeg', png ? undefined : 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

const START = {
  fabric: CUSTOM_COLORS[0].fabric,
  ink: CUSTOM_COLORS[0].ink,
  text: '',
  font: 'display',
  bold: true,
  italic: false,
  upper: true,
  textSize: 1,
  textPos: { x: 0, y: 34 },
  image: null,
  imageScale: 1,
  imagePos: { x: 0, y: -26 },
}

export default function Designer({ t, lang, onClose, onAdd, onToast }) {
  const [d, setD] = useState(START)
  const [size, setSize] = useState('M')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const set = (patch) => setD((old) => ({ ...old, ...patch }))

  // Двигаем элемент, не выпуская его за печатную зону.
  const move = useCallback((target, dx, dy) => {
    setD((old) => {
      const key = target === 'image' ? 'imagePos' : 'textPos'
      const p = old[key]
      return {
        ...old,
        [key]: {
          x: clamp(p.x + dx, -PRINT_ZONE.x, PRINT_ZONE.x),
          y: clamp(p.y + dy, PRINT_ZONE.yTop, PRINT_ZONE.yBottom),
        },
      }
    })
  }, [])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''                       // чтобы тот же файл можно было выбрать снова
    if (!file) return
    if (!file.type.startsWith('image/')) return onToast(t.d_bad_file)
    if (file.size > MAX_FILE) return onToast(t.d_too_big)
    setBusy(true)
    try {
      set({ image: await shrink(file) })
    } catch (err) {
      onToast(t[err.message] || t.err_generic)
    } finally {
      setBusy(false)
    }
  }

  const empty = !d.image && d.text.trim() === ''

  const add = () => {
    if (empty) return onToast(t.d_empty)
    onAdd({ ...d, text: d.text.trim() }, size)
    onToast(t.d_added)
    onClose()
  }

  // Товар-пустышка для предпросмотра: Tshirt берёт из него только id.
  const preview = { id: 'designer', color: d.fabric, ink: d.ink, ru: {}, kk: {} }

  return (
    <motion.div
      className="modal designer"
      initial={{ opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 24 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
    >
      <button className="x float" onClick={onClose} aria-label="close">✕</button>

      <div className="d-head">
        <h3>{t.designer_title}</h3>
        <p className="muted">{t.designer_sub}</p>
      </div>

      <div className="d-body">
        {/* ── живой предпросмотр, тут же и двигаем ── */}
        <div className="d-preview-wrap">
          <div className="d-preview" style={{ background: `${d.fabric}22` }}>
            <Tshirt product={preview} lang={lang} custom={d} big editable onMove={move} />
          </div>
          <p className="d-hint muted">✋ {t.d_drag}</p>
        </div>

        {/* ── настройки ── */}
        <div className="d-controls">
          <div className="d-field">
            <span>{t.d_fabric}</span>
            <div className="swatches">
              {CUSTOM_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`swatch ${d.fabric === c.fabric ? 'on' : ''}`}
                  style={{ background: c.fabric }}
                  onClick={() => set({ fabric: c.fabric, ink: c.ink })}
                  aria-label={c.id}
                />
              ))}
            </div>
          </div>

          <label className="d-field">
            <span>{t.d_text}</span>
            <textarea
              rows={2}
              value={d.text}
              placeholder={t.d_text_ph}
              onChange={(e) => set({ text: e.target.value.slice(0, 120) })}
            />
            <small className="muted">{t.d_text_hint} · {d.text.length}/120</small>
          </label>

          <div className="d-field">
            <span>{t.d_font}</span>
            <div className="d-fonts">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  className={`fontbtn ${d.font === f.id ? 'on' : ''}`}
                  style={{ fontFamily: f.css }}
                  onClick={() => set({ font: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="d-field">
            <span>{t.d_style}</span>
            <div className="d-row">
              <button
                className={`chip big ${d.bold ? 'on' : ''}`}
                style={{ fontWeight: 800 }}
                onClick={() => set({ bold: !d.bold })}
              >
                B
              </button>
              <button
                className={`chip big ${d.italic ? 'on' : ''}`}
                style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}
                onClick={() => set({ italic: !d.italic })}
              >
                I
              </button>
              <button
                className={`chip big ${d.upper ? 'on' : ''}`}
                onClick={() => set({ upper: !d.upper })}
              >
                {t.d_upper}
              </button>
            </div>
          </div>

          <div className="d-field">
            <span>{t.d_ink}</span>
            <div className="swatches">
              {INK_COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch small ${d.ink === c ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => set({ ink: c })}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <label className="d-field">
            <span>{t.d_size}</span>
            <input
              type="range" min="0.5" max="2.2" step="0.05"
              value={d.textSize}
              onChange={(e) => set({ textSize: +e.target.value })}
            />
          </label>

          <div className="d-field">
            <span>{t.d_photo}</span>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            <div className="d-row">
              <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? t.processing : t.d_photo_add}
              </button>
              {d.image && (
                <button className="btn" onClick={() => set({ image: null })}>{t.d_photo_del}</button>
              )}
            </div>
          </div>

          {d.image && (
            <label className="d-field">
              <span>{t.d_photo_size}</span>
              <input
                type="range" min="0.4" max="2" step="0.05"
                value={d.imageScale}
                onChange={(e) => set({ imageScale: +e.target.value })}
              />
            </label>
          )}

          <div className="d-field">
            <span>{t.size}</span>
            <div className="sizes">
              {SIZES.map((s) => (
                <button key={s} className={`chip ${size === s ? 'on' : ''}`} onClick={() => setSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="d-foot">
            <button className="btn" onClick={() => setD(START)}>{t.d_reset}</button>
            <button
              className="btn"
              onClick={() => set({ textPos: { x: 0, y: START.textPos.y }, imagePos: { x: 0, y: START.imagePos.y } })}
            >
              {t.d_center}
            </button>
            <span className="price">{fmt(CUSTOM_PRICE)}</span>
            <button className="btn btn-solid" onClick={add} disabled={busy}>{t.add}</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
