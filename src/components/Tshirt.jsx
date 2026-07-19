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

/**
 * Футболка целиком рисуется в SVG — никаких внешних картинок.
 * Ткань слегка «дышит» и реагирует на наведение.
 */
export default function Tshirt({ product, lang, hovered = false, big = false }) {
  const { color, ink, art } = product
  const lines = product[lang].print.split('\n')

  // Принт не должен вылезать за ткань: подгоняем кегль под самую длинную строку.
  // Корпус футболки — 152px по viewBox; печатаем внутри 120px, чтобы остались поля.
  // 0.86 — средняя ширина глифа Unbounded 800 относительно кегля (замерено в браузере).
  const longest = Math.max(...lines.map((l) => l.length))
  const fontSize = Math.min(big ? 25 : 23, 118 / (longest * 0.86))
  const lineH = fontSize * 1.18

  return (
    <motion.svg
      viewBox="0 0 300 320"
      className="tee"
      animate={hovered ? { rotate: [0, -1.5, 1.5, 0] } : { rotate: 0 }}
      transition={{ duration: 0.6 }}
    >
      <defs>
        <linearGradient id={`sh-${product.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* силуэт */}
      <path
        d="M95 28 L58 46 L26 88 L62 116 L74 100 L74 288 Q150 300 226 288 L226 100 L238 116 L274 88 L242 46 L205 28 Q150 62 95 28 Z"
        fill={color}
        stroke="#111"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* ворот */}
      <path d="M95 28 Q150 62 205 28" fill="none" stroke="#111" strokeWidth="4" />
      <path d="M100 34 Q150 66 200 34" fill="none" stroke="#111" strokeWidth="2" strokeOpacity="0.35" />
      {/* складки */}
      <path d="M86 130 q10 60 4 140 M214 130 q-10 60 -4 140" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="3" />
      <path
        d="M95 28 L58 46 L26 88 L62 116 L74 100 L74 288 Q150 300 226 288 L226 100 L238 116 L274 88 L242 46 L205 28 Q150 62 95 28 Z"
        fill={`url(#sh-${product.id})`}
      />

      {/* принт */}
      <g transform="translate(150 165)">
        <motion.g
          animate={hovered ? { scale: 1.05 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <g transform={`translate(0 ${-30 - (lines.length - 1) * lineH * 0.5})`}>
            <Art kind={art} ink={ink} />
          </g>
          {lines.map((l, i) => (
            <text
              key={i}
              x="0"
              y={(i - (lines.length - 1) / 2) * lineH + fontSize * 0.35 + 14}
              textAnchor="middle"
              fill={ink}
              className="tee-print"
              style={{ fontSize }}
            >
              {l}
            </text>
          ))}
        </motion.g>
      </g>
    </motion.svg>
  )
}
