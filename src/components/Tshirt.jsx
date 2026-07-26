import { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { FONTS, asset } from '../data.js'

// Печатная зона в координатах viewBox, относительно центра груди (150, 158).
export const PRINT_ZONE = { x: 56, yTop: -74, yBottom: 96 }
export const TEXT_WIDTH = { min: 28, max: 118, start: 92 }

/**
 * В SVG нет переноса строк — считаем его сами.
 * Единицы viewBox совпадают с пикселями кегля, поэтому canvas.measureText
 * даёт ширину прямо в тех же координатах.
 */
function wrapLines(ctx, paragraphs, maxW, fontSpec) {
  ctx.font = fontSpec
  const out = []
  const fits = (s) => ctx.measureText(s).width <= maxW

  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let line = ''
    for (const raw of words) {
      // Слово шире блока рубим по буквам, иначе оно вылезет за край.
      let word = raw
      while (!fits(word) && word.length > 1) {
        let cut = word.length - 1
        while (cut > 1 && !fits(word.slice(0, cut))) cut--
        if (line) { out.push(line); line = '' }
        out.push(word.slice(0, cut))
        word = word.slice(cut)
      }
      const test = line ? `${line} ${word}` : word
      if (!line || fits(test)) line = test
      else { out.push(line); line = word }
    }
    if (line) out.push(line)
  }
  return out
}

// Мини-иллюстрации для принтов. Каждая — набор путей поверх текста.
function Art({ kind, ink }) {
  const s = { fill: 'none', stroke: ink, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (kind) {
    case 'face-dead':
      return (
        <g {...s}>
          <path d="M-16 -8 l10 10 M-6 -8 l-10 10" />
          <path d="M6 -8 l10 10 M16 -8 l-10 10" />
          <path d="M-12 14 q12 -8 24 0" />
        </g>
      )
    case 'cup':
      return (
        <g {...s}>
          <path d="M-16 -6 h26 v14 a13 13 0 0 1 -26 0 z" />
          <path d="M10 -2 h6 a5 5 0 0 1 0 10 h-6" />
          <path d="M-8 -16 q3 -5 0 -9 M0 -16 q3 -5 0 -9 M8 -16 q3 -5 0 -9" />
        </g>
      )
    case 'glitch':
      return (
        <g {...s}>
          <rect x="-20" y="-12" width="40" height="26" rx="3" />
          <path d="M-20 -2 h40 M-8 -12 v26 M8 -12 v26" strokeOpacity="0.4" />
        </g>
      )
    case 'baursak':
      return (
        <g {...s}>
          <rect x="-18" y="-14" width="16" height="14" rx="4" transform="rotate(-12 -10 -7)" />
          <rect x="2" y="-16" width="16" height="14" rx="4" transform="rotate(9 10 -9)" />
          <rect x="-9" y="2" width="16" height="14" rx="4" transform="rotate(-4 -1 9)" />
        </g>
      )
    case 'clock':
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="17" />
          <path d="M0 -10 v10 l8 5" />
        </g>
      )
    case 'cat':
      return (
        <g {...s}>
          <path d="M-16 6 v-14 l8 6 h16 l8 -6 v14 a16 12 0 0 1 -32 0 z" />
          <path d="M-7 -2 h.1 M7 -2 h.1" strokeWidth="5" />
          <path d="M-14 4 h8 M6 4 h8" />
        </g>
      )
    case 'phone':
      return (
        <g {...s}>
          <rect x="-11" y="-17" width="22" height="34" rx="5" />
          <path d="M-4 11 h8" />
          <path d="M18 -14 l10 -8 M18 -4 h12 M18 6 l10 8" strokeOpacity="0.5" />
        </g>
      )
    case 'eyes':
      return (
        <g {...s}>
          <path d="M-22 0 q9 -11 18 0 q-9 11 -18 0" />
          <path d="M4 0 q9 -11 18 0 q-9 11 -18 0" />
          <circle cx="-13" cy="0" r="3" fill={ink} />
          <circle cx="13" cy="0" r="3" fill={ink} />
        </g>
      )
    case 'tv':
      return (
        <g {...s}>
          <rect x="-20" y="-11" width="40" height="28" rx="4" />
          <path d="M-8 -11 l-8 -12 M8 -11 l8 -12" />
          <path d="M-13 -4 h14 M-13 3 h20" strokeOpacity="0.5" />
        </g>
      )
    case 'walk':
      return (
        <g {...s}>
          <circle cx="0" cy="-16" r="5" />
          <path d="M0 -11 v14 l-9 14 M0 3 l9 13 M-10 -6 l10 3 l11 -5" />
        </g>
      )
    default:
      return null
  }
}

/* Силуэт оверсайза: приспущенное плечо, широкий короткий рукав, прямой корпус. */
const BODY = `
  M118,58
  C100,60 84,65 70,73
  L30,111
  C26,122 28,141 36,161
  L45,173
  C59,179 75,177 89,169
  L83,201
  C79,241 77,270 79,297
  C120,307 180,307 221,297
  C223,270 221,241 217,201
  L211,169
  C225,177 241,179 255,173
  L264,161
  C272,141 274,122 270,111
  L230,73
  C216,65 200,60 182,58
  C176,81 124,81 118,58 Z
`

// Ворот: внешний край горловины и внутренняя кромка рубчика.
// Со спины горловина заметно выше и площе — по этому силуэт и читается.
const COLLAR_OUT = 'M118,58 C124,81 176,81 182,58'
const COLLAR_IN = 'M126,55 C132,73 168,73 174,55'
const COLLAR_OUT_BACK = 'M118,58 C124,70 176,70 182,58'
const COLLAR_IN_BACK = 'M126,55 C132,64 168,64 174,55'

/**
 * Футболка целиком рисуется в SVG — никаких внешних картинок.
 * Объём делают три слоя поверх заливки: продольный градиент (цилиндр корпуса),
 * мягкие затемнения в проймах и у подола, и тонкие складки.
 */
export default function Tshirt({
  product, lang, hovered = false, big = false,
  custom = null, editable = false, onMove = null, onMoveStart = null, back = false,
}) {
  const { color, ink, art, id } = product

  // Дизайн из конструктора приходит либо пропом, либо внутри товара в корзине.
  const design = custom ?? product.custom ?? null

  /* ── перетаскивание элементов дизайна ── */
  const svgRef = useRef(null)
  const drag = useRef(null)

  // Экранные координаты → координаты viewBox, иначе перетаскивание
  // рассыпается при любом масштабе превью.
  const toViewBox = (e) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }

  const startDrag = (target) => (e) => {
    if (!editable || !onMove) return
    e.stopPropagation()
    // Захват указателя — необязательная оптимизация: если браузер его не даёт
    // (указателя уже нет), перетаскивание всё равно должно начаться.
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* не критично */ }
    onMoveStart?.(target)          // конструктор снимает состояние для отмены
    const p = toViewBox(e)
    drag.current = { target, x: p.x, y: p.y }
  }

  const moveDrag = (e) => {
    if (!drag.current) return
    const p = toViewBox(e)
    const d = drag.current
    onMove(d.target, p.x - d.x, p.y - d.y)
    drag.current = { ...d, x: p.x, y: p.y }
  }

  const endDrag = (e) => {
    if (!drag.current) return
    try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch { /* не критично */ }
    drag.current = null
  }

  // У товара может быть настоящая фотография — тогда показываем её как есть.
  if (product.photo) {
    return (
      <motion.img
        src={asset(product.photo)}
        alt={product[lang].title}
        className="tee tee-photo"
        animate={hovered ? { scale: 1.04 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      />
    )
  }

  // Дизайн из конструктора перебивает цвет ткани и содержимое принта.
  const fabric = design?.fabric ?? color
  const inkColor = design?.ink ?? ink
  const fontCss = FONTS.find((f) => f.id === (design?.font ?? 'display'))?.css ?? FONTS[0].css

  const measure = useMemo(
    () => (typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')),
    [],
  )

  const rawLines = design
    ? (design.text ?? '').split('\n')
    : product[lang].print.split('\n')
  const cased = design?.upper ? rawLines.map((l) => l.toUpperCase()) : rawLines

  // В конструкторе кегль задаёт пользователь; в каталоге подгоняем под ширину сами.
  // 0.86 — средняя ширина глифа Unbounded 800 относительно кегля (замерено в браузере).
  const catalogLongest = design ? 1 : Math.max(...cased.map((l) => l.length), 1)
  // 14 — базовый кегль дизайна: при 20 в строку влезало 6 букв Unbounded 800,
  // потому что печатная зона всего ~118 единиц. Крупнее делается слайдером.
  const fontSize = design
    ? 14 * (design.textSize ?? 1)
    : Math.min(big ? 25 : 23, 108 / (catalogLongest * 0.86))
  const lineH = fontSize * 1.2

  const textWidth = design?.textWidth ?? TEXT_WIDTH.start

  // Текст дизайна переносим по ширине блока, а не только по явным \n.
  const lines = useMemo(() => {
    if (!design) return cased.filter((l) => l.trim() !== '')
    if (!measure) return cased.filter((l) => l.trim() !== '')
    const spec = `${design.italic ? 'italic ' : ''}${design.bold ? 800 : 400} ${fontSize}px ${fontCss}`
    return wrapLines(measure, cased, textWidth, spec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.text, design?.upper, design?.italic, design?.bold, fontSize, fontCss, textWidth, measure, product, lang])

  const uid = `t-${id}`

  return (
    <motion.svg
      ref={svgRef}
      viewBox="0 0 300 340"
      className="tee"
      animate={hovered && !editable ? { rotate: [0, -1.2, 1.2, 0] } : { rotate: 0 }}
      transition={{ duration: 0.6 }}
      onPointerMove={editable ? moveDrag : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerCancel={editable ? endDrag : undefined}
      style={editable ? { touchAction: 'none' } : undefined}
    >
      <defs>
        {/* Цилиндрический объём корпуса: края в тень, центр в свет.
            Больше остановок — мягче переход, ткань перестаёт быть плоской. */}
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.34" />
          <stop offset="8%"   stopColor="#000" stopOpacity="0.20" />
          <stop offset="20%"  stopColor="#000" stopOpacity="0.06" />
          <stop offset="34%"  stopColor="#fff" stopOpacity="0.13" />
          <stop offset="46%"  stopColor="#fff" stopOpacity="0.17" />
          <stop offset="62%"  stopColor="#fff" stopOpacity="0.07" />
          <stop offset="78%"  stopColor="#000" stopOpacity="0.09" />
          <stop offset="92%"  stopColor="#000" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.36" />
        </linearGradient>

        {/* Свет сверху на груди, подол и низ в тени. */}
        <linearGradient id={`${uid}-vert`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.18" />
          <stop offset="26%"  stopColor="#fff" stopOpacity="0.07" />
          <stop offset="52%"  stopColor="#000" stopOpacity="0" />
          <stop offset="82%"  stopColor="#000" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>

        <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={`${uid}-fold`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id={`${uid}-fold-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`${uid}-drop`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>

        {/* Зерно трикотажа. Обесцвеченный шум, накладывается умножением:
            светлые точки почти не меняют цвет, тёмные крупинки чуть затемняют. */}
        <filter id={`${uid}-grain`} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g">
            <feFuncR type="linear" slope="0.30" intercept="0.72" />
            <feFuncG type="linear" slope="0.30" intercept="0.72" />
            <feFuncB type="linear" slope="0.30" intercept="0.72" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
        </filter>

        {/* Всё, что рисуем поверх, обрезаем по силуэту. */}
        <clipPath id={`${uid}-clip`}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* Тень на поверхности под футболкой */}
      <ellipse cx="150" cy="303" rx="96" ry="13" fill="#000" opacity="0.16" filter={`url(#${uid}-drop)`} />

      {/* Ткань. Свет и складки идут ПОСЛЕ принта (ниже), чтобы тень от складки
          ложилась и на ткань, и на печать — из-за обратного порядка принт
          раньше выглядел наклейкой. */}
      <path d={BODY} fill={fabric} />

      {/* Рубчатый ворот */}
      <path d={back ? COLLAR_OUT_BACK : COLLAR_OUT} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="9" strokeLinecap="round" />
      <path d={back ? COLLAR_IN_BACK : COLLAR_IN} fill="none" stroke={fabric} strokeWidth="7" strokeLinecap="round" />
      <path d={back ? COLLAR_IN_BACK : COLLAR_IN} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      {/* Со спины видна тесьма по горловине */}
      {back && (
        <path d="M112,62 C124,78 176,78 188,62" fill="none" stroke="#000" strokeOpacity="0.16" strokeWidth="3" strokeLinecap="round" />
      )}

      {/* Отстрочка по подолу и низу рукавов */}
      <g fill="none" stroke="#000" strokeOpacity="0.14" strokeWidth="1.6" strokeDasharray="4 4">
        <path d="M82 285 C120 295 180 295 218 285" />
        <path d="M47 165 C60 170 74 169 86 162" />
        <path d="M253 165 C240 170 226 169 214 162" />
      </g>

      {/* Принт. Лежит на ткани: чуть прозрачный, со слабой тенью от волокон. */}
      <g clipPath={`url(#${uid}-clip)`}>
        <g transform="translate(150 158)">
          <motion.g
            animate={hovered && !editable ? { scale: 1.04 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            opacity={editable ? 1 : 0.93}
          >
            {design ? (
              /* ── дизайн из конструктора: картинка и текст двигаются отдельно ── */
              (() => {
                const imgH = 92 * (design.imageScale ?? 1)
                const ip = design.imagePos ?? { x: 0, y: -26 }
                const tp = design.textPos ?? { x: 0, y: 34 }
                const textH = lines.length * lineH

                const imageNode = design.image && (
                  <g
                    key="img"
                    transform={`translate(${ip.x} ${ip.y}) rotate(${design.imageRotate ?? 0})`}
                    onPointerDown={startDrag('image')}
                    style={{ cursor: editable ? 'grab' : 'default' }}
                  >
                    <image
                      href={design.image}
                      x={-imgH / 2} y={-imgH / 2}
                      width={imgH} height={imgH}
                      preserveAspectRatio="xMidYMid meet"
                    />
                    {editable && (
                      <rect
                        x={-imgH / 2} y={-imgH / 2} width={imgH} height={imgH}
                        fill="transparent" stroke={inkColor} strokeOpacity="0.35"
                        strokeWidth="1" strokeDasharray="4 4"
                      />
                    )}
                  </g>
                )

                const halfW = textWidth / 2
                // Обводка спасает светлый текст на светлой ткани и наоборот.
                const outlineColor = design.ink === '#141414' ? '#ffffff' : '#141414'
                const textNode = lines.length > 0 && (
                  <g key="txt" transform={`translate(${tp.x} ${tp.y}) rotate(${design.textRotate ?? 0})`}>
                    <g
                      onPointerDown={startDrag('text')}
                      style={{ cursor: editable ? 'grab' : 'default' }}
                    >
                      {editable && (
                        <rect
                          x={-halfW} y={-textH / 2 - 4} width={textWidth} height={textH + 8}
                          fill="transparent" stroke={inkColor} strokeOpacity="0.3"
                          strokeWidth="1" strokeDasharray="4 4"
                        />
                      )}
                      {lines.map((l, i) => (
                        <text
                          key={i}
                          x="0"
                          y={-textH / 2 + i * lineH + fontSize * 0.85}
                          textAnchor="middle"
                          fill={inkColor}
                          stroke={design.outline ? outlineColor : undefined}
                          strokeWidth={design.outline ? Math.max(1, fontSize * 0.14) : undefined}
                          strokeLinejoin="round"
                          paintOrder="stroke"
                          style={{
                            fontFamily: fontCss,
                            fontSize,
                            fontWeight: design.bold ? 800 : 400,
                            fontStyle: design.italic ? 'italic' : 'normal',
                            userSelect: 'none',
                          }}
                        >
                          {l}
                        </text>
                      ))}
                    </g>

                    {/* Ручки ширины блока: тянешь — текст переносится по-новому. */}
                    {editable && [['left', -halfW], ['right', halfW]].map(([side, hx]) => (
                      <g
                        key={side}
                        onPointerDown={startDrag(`width-${side}`)}
                        style={{ cursor: 'ew-resize' }}
                      >
                        {/* широкая прозрачная зона — чтобы попадать пальцем */}
                        <rect x={hx - 10} y={-18} width="20" height="36" fill="transparent" />
                        <rect
                          x={hx - 1.6} y={-7} width="3.2" height="14" rx="1.6"
                          fill={inkColor} fillOpacity="0.75"
                        />
                      </g>
                    ))}
                  </g>
                )

                return <>{imageNode}{textNode}</>
              })()
            ) : (
              <>
                <g transform={`translate(0 ${-30 - (lines.length - 1) * lineH * 0.5})`}>
                  <Art kind={art} ink={inkColor} />
                </g>
                {lines.map((l, i) => (
                  <text
                    key={i}
                    x="0"
                    y={(i - (lines.length - 1) / 2) * lineH + fontSize * 0.35 + 14}
                    textAnchor="middle"
                    fill={inkColor}
                    className="tee-print"
                    style={{ fontSize }}
                  >
                    {l}
                  </text>
                ))}
              </>
            )}
          </motion.g>
        </g>
      </g>

      {/* Свет, складки, швы и зерно — поверх принта. В редакторе притушены,
          чтобы дизайн было хорошо видно; overlay не ловит клики. */}
      <g clipPath={`url(#${uid}-clip)`} style={{ pointerEvents: 'none' }} opacity={editable ? 0.55 : 1}>
        <rect x="0" y="0" width="300" height="340" fill={`url(#${uid}-body)`} />
        <rect x="0" y="0" width="300" height="340" fill={`url(#${uid}-vert)`} />

        {/* Затемнение в проймах и под воротом — от них силуэт объёмный */}
        <ellipse cx="90" cy="146" rx="27" ry="36" fill="#000" opacity="0.22" filter={`url(#${uid}-soft)`} />
        <ellipse cx="210" cy="146" rx="27" ry="36" fill="#000" opacity="0.22" filter={`url(#${uid}-soft)`} />
        <ellipse cx="150" cy="84" rx="44" ry="15" fill="#000" opacity="0.20" filter={`url(#${uid}-soft)`} />
        <ellipse cx="58" cy="138" rx="17" ry="32" fill="#000" opacity="0.14" filter={`url(#${uid}-soft)`} />
        <ellipse cx="242" cy="138" rx="17" ry="32" fill="#000" opacity="0.14" filter={`url(#${uid}-soft)`} />
        {/* Блик на груди */}
        <ellipse cx="150" cy="150" rx="52" ry="44" fill="#fff" opacity="0.07" filter={`url(#${uid}-soft)`} />

        {/* Крупные мягкие тени от того, как ткань висит */}
        <g filter={`url(#${uid}-fold-soft)`} fill="none" strokeLinecap="round">
          <path d="M96 190 C90 226 90 262 95 296" stroke="#000" strokeOpacity="0.10" strokeWidth="14" />
          <path d="M204 190 C210 226 210 262 205 296" stroke="#000" strokeOpacity="0.10" strokeWidth="14" />
        </g>

        {/* Складки: разной толщины, с бликом по краю, иначе читаются как полоски */}
        <g filter={`url(#${uid}-fold)`} fill="none" strokeLinecap="round">
          <path d="M106 198 C101 232 101 264 105 293" stroke="#000" strokeOpacity="0.13" strokeWidth="7" />
          <path d="M110 200 C105 234 105 264 109 292" stroke="#fff" strokeOpacity="0.08" strokeWidth="2.5" />
          <path d="M194 198 C199 232 199 264 195 293" stroke="#000" strokeOpacity="0.13" strokeWidth="7" />
          <path d="M190 200 C195 234 195 264 191 292" stroke="#fff" strokeOpacity="0.08" strokeWidth="2.5" />
          <path d="M131 216 C129 246 130 270 133 292" stroke="#000" strokeOpacity="0.07" strokeWidth="5" />
          <path d="M171 222 C174 250 173 272 170 292" stroke="#000" strokeOpacity="0.07" strokeWidth="5" />
          <path d="M148 236 C147 258 148 276 149 292" stroke="#000" strokeOpacity="0.05" strokeWidth="4" />
          {/* заломы у пройм и на рукавах */}
          <path d="M96 176 C108 186 116 198 118 210" stroke="#000" strokeOpacity="0.08" strokeWidth="5" />
          <path d="M204 176 C192 186 184 198 182 210" stroke="#000" strokeOpacity="0.08" strokeWidth="5" />
          <path d="M50 118 L72 145" stroke="#000" strokeOpacity="0.11" strokeWidth="5" />
          <path d="M250 118 L228 145" stroke="#000" strokeOpacity="0.11" strokeWidth="5" />
          <path d="M56 132 L74 152" stroke="#fff" strokeOpacity="0.07" strokeWidth="3" />
          <path d="M244 132 L226 152" stroke="#fff" strokeOpacity="0.07" strokeWidth="3" />
        </g>

        {/* Швы: плечевой, окат рукава и боковой */}
        <g fill="none" stroke="#000" strokeLinecap="round">
          <path d="M120 60 C104 64 88 70 74 79" strokeOpacity="0.16" strokeWidth="1.4" />
          <path d="M180 60 C196 64 212 70 226 79" strokeOpacity="0.16" strokeWidth="1.4" />
          <path d="M88 168 C92 150 92 122 84 100" strokeOpacity="0.13" strokeWidth="1.4" />
          <path d="M212 168 C208 150 208 122 216 100" strokeOpacity="0.13" strokeWidth="1.4" />
          <path d="M84 200 C80 240 79 270 80 294" strokeOpacity="0.10" strokeWidth="1.4" />
          <path d="M216 200 C220 240 221 270 220 294" strokeOpacity="0.10" strokeWidth="1.4" />
        </g>

        {/* Зерно трикотажа поверх всего */}
        <rect
          x="0" y="0" width="300" height="340"
          filter={`url(#${uid}-grain)`}
          style={{ mixBlendMode: 'multiply' }}
          opacity={big ? 0.5 : 0.34}
        />
      </g>
    </motion.svg>
  )
}
