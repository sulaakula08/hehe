import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import { CUSTOM_COLORS, INK_COLORS, CUSTOM_PRICE, SIZES, fmt } from '../data.js'

const MAX_FILE = 8 * 1024 * 1024   // 8 МБ до сжатия
const MAX_SIDE = 420               // во столько ужимаем перед сохранением

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
  textSize: 1,
  image: null,
  imageScale: 1,
  imageFirst: true,
}

export default function Designer({ t, lang, onClose, onAdd, onToast }) {
  const [d, setD] = useState(START)
  const [size, setSize] = useState('M')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const set = (patch) => setD((old) => ({ ...old, ...patch }))

  const pickFabric = (c) => set({ fabric: c.fabric, ink: c.ink })

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
        {/* ── живой предпросмотр ── */}
        <div className="d-preview" style={{ background: `${d.fabric}22` }}>
          <Tshirt product={preview} lang={lang} custom={d} big />
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
                  onClick={() => pickFabric(c)}
                  aria-label={c.id}
                />
              ))}
            </div>
          </div>

          <label className="d-field">
            <span>{t.d_text}</span>
            <textarea
              rows={3}
              value={d.text}
              placeholder={t.d_text_ph}
              onChange={(e) => set({ text: e.target.value.slice(0, 120) })}
            />
            <small className="muted">{t.d_text_hint} · {d.text.length}/120</small>
          </label>

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
              type="range" min="0.6" max="1.6" step="0.05"
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
            <>
              <label className="d-field">
                <span>{t.d_photo_size}</span>
                <input
                  type="range" min="0.5" max="1.6" step="0.05"
                  value={d.imageScale}
                  onChange={(e) => set({ imageScale: +e.target.value })}
                />
              </label>
              <label className="d-check">
                <input
                  type="checkbox"
                  checked={d.imageFirst}
                  onChange={(e) => set({ imageFirst: e.target.checked })}
                />
                <span>{t.d_photo_first}</span>
              </label>
            </>
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
            <span className="price">{fmt(CUSTOM_PRICE)}</span>
            <button className="btn btn-solid" onClick={add} disabled={busy}>{t.add}</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
