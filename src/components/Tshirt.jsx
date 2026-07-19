import { motion } from 'framer-motion'

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
const COLLAR_OUT = 'M118,58 C124,81 176,81 182,58'
const COLLAR_IN = 'M126,55 C132,73 168,73 174,55'

/**
 * Футболка целиком рисуется в SVG — никаких внешних картинок.
 * Объём делают три слоя поверх заливки: продольный градиент (цилиндр корпуса),
 * мягкие затемнения в проймах и у подола, и тонкие складки.
 */
export default function Tshirt({ product, lang, hovered = false, big = false, custom = null }) {
  const { color, ink, art, id } = product

  // Дизайн из конструктора приходит либо пропом, либо внутри товара в корзине.
  const design = custom ?? product.custom ?? null

  // У товара может быть настоящая фотография — тогда показываем её как есть.
  if (product.photo) {
    return (
      <motion.img
        src={product.photo}
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
  const lines = design
    ? (design.text ?? '').split('\n').filter((l) => l.trim() !== '')
    : product[lang].print.split('\n')

  // Корпус — 144px по viewBox; печатаем внутри 108px, чтобы остались поля.
  // 0.86 — средняя ширина глифа Unbounded 800 относительно кегля (замерено в браузере).
  const longest = lines.length ? Math.max(...lines.map((l) => l.length)) : 1
  const baseMax = design ? 20 * (design.textSize ?? 1) : (big ? 25 : 23)
  const fontSize = Math.min(baseMax, 108 / (longest * 0.86))
  const lineH = fontSize * 1.18

  const uid = `t-${id}`

  return (
    <motion.svg
      viewBox="0 0 300 340"
      className="tee"
      animate={hovered ? { rotate: [0, -1.2, 1.2, 0] } : { rotate: 0 }}
      transition={{ duration: 0.6 }}
    >
      <defs>
        {/* Цилиндрический объём корпуса: края в тень, центр в свет. */}
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.30" />
          <stop offset="14%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="38%" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="84%" stopColor="#000" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>

        {/* Свет сверху, подол в тени. */}
        <linearGradient id={`${uid}-vert`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.20" />
        </linearGradient>

        <filter id={`${uid}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`${uid}-fold`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id={`${uid}-drop`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>

        {/* Тканевая крошка — только на крупной футболке, чтобы не грузить сетку. */}
        {big && (
          <filter id={`${uid}-cloth`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n" />
            <feColorMatrix in="n" type="saturate" values="0" result="g" />
            <feComponentTransfer in="g" result="a">
              <feFuncA type="linear" slope="0.055" intercept="0" />
            </feComponentTransfer>
            <feComposite in="a" in2="SourceGraphic" operator="in" />
          </filter>
        )}

        {/* Всё, что рисуем поверх, обрезаем по силуэту. */}
        <clipPath id={`${uid}-clip`}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* Тень на поверхности под футболкой */}
      <ellipse cx="150" cy="303" rx="96" ry="13" fill="#000" opacity="0.16" filter={`url(#${uid}-drop)`} />

      {/* Ткань */}
      <path d={BODY} fill={fabric} />

      <g clipPath={`url(#${uid}-clip)`}>
        <rect x="0" y="0" width="300" height="340" fill={`url(#${uid}-body)`} />
        <rect x="0" y="0" width="300" height="340" fill={`url(#${uid}-vert)`} />

        {/* Тени в проймах — от них силуэт перестаёт быть плоским */}
        <ellipse cx="92" cy="150" rx="26" ry="34" fill="#000" opacity="0.20" filter={`url(#${uid}-soft)`} />
        <ellipse cx="208" cy="150" rx="26" ry="34" fill="#000" opacity="0.20" filter={`url(#${uid}-soft)`} />
        {/* Тень под воротом */}
        <ellipse cx="150" cy="86" rx="42" ry="14" fill="#000" opacity="0.18" filter={`url(#${uid}-soft)`} />
        {/* Тень на рукавах у корпуса */}
        <ellipse cx="60" cy="140" rx="16" ry="30" fill="#000" opacity="0.12" filter={`url(#${uid}-soft)`} />
        <ellipse cx="240" cy="140" rx="16" ry="30" fill="#000" opacity="0.12" filter={`url(#${uid}-soft)`} />

        {/* Складки ткани */}
        <g filter={`url(#${uid}-fold)`} fill="none" strokeLinecap="round">
          <path d="M104 196 C100 232 100 264 104 292" stroke="#000" strokeOpacity="0.13" strokeWidth="7" />
          <path d="M196 196 C200 232 200 264 196 292" stroke="#000" strokeOpacity="0.13" strokeWidth="7" />
          <path d="M132 214 C130 246 131 270 134 292" stroke="#000" strokeOpacity="0.07" strokeWidth="5" />
          <path d="M170 220 C173 250 172 272 169 292" stroke="#000" strokeOpacity="0.07" strokeWidth="5" />
          <path d="M118 200 C116 234 117 262 120 290" stroke="#fff" strokeOpacity="0.10" strokeWidth="4" />
          <path d="M182 204 C185 236 184 262 181 290" stroke="#fff" strokeOpacity="0.10" strokeWidth="4" />
          {/* заломы на рукавах */}
          <path d="M52 120 L74 146" stroke="#000" strokeOpacity="0.10" strokeWidth="5" />
          <path d="M248 120 L226 146" stroke="#000" strokeOpacity="0.10" strokeWidth="5" />
        </g>

      </g>

      {/* Рубчатый ворот */}
      <path d={COLLAR_OUT} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="9" strokeLinecap="round" />
      <path d={COLLAR_IN} fill="none" stroke={fabric} strokeWidth="7" strokeLinecap="round" />
      <path d={COLLAR_IN} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />

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
            animate={hovered ? { scale: 1.04 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            opacity="0.93"
          >
            {design ? (
              /* ── дизайн из конструктора: картинка + текст ── */
              (() => {
                const imgH = 92 * (design.imageScale ?? 1)
                const textH = lines.length * lineH
                const gap = design.image && lines.length ? 10 : 0
                const totalH = (design.image ? imgH : 0) + gap + textH
                let cursor = -totalH / 2          // верх композиции
                const imageFirst = design.imageFirst !== false

                const imageNode = design.image && (
                  <image
                    href={design.image}
                    x={-imgH / 2} y={imageFirst ? cursor : cursor + textH + gap}
                    width={imgH} height={imgH}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )
                const textNode = lines.map((l, i) => (
                  <text
                    key={i}
                    x="0"
                    y={(imageFirst && design.image ? cursor + imgH + gap : cursor)
                       + i * lineH + fontSize * 0.82}
                    textAnchor="middle"
                    fill={inkColor}
                    className="tee-print"
                    style={{ fontSize }}
                  >
                    {l}
                  </text>
                ))

                return imageFirst ? <>{imageNode}{textNode}</> : <>{textNode}{imageNode}</>
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
    </motion.svg>
  )
}
