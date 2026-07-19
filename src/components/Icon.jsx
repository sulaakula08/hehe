/**
 * Иконки одной системы: сетка 24×24, штрих 2px, скруглённые концы,
 * цвет наследуется от текста. Никаких эмодзи в интерфейсе.
 */
const PATHS = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  cart: (
    <>
      <path d="M2.5 3.5h2.6l2.2 10.4a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2l1.6-6.3H6.2" />
      <circle cx="9.5" cy="19.5" r="1.6" />
      <circle cx="17.5" cy="19.5" r="1.6" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.8h19" />
      <path d="M6 14.6h3.4" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7.2A2.2 2.2 0 0 1 5.2 5h11.3a2.2 2.2 0 0 1 2.2 2.2v1.3" />
      <rect x="3" y="7.2" width="18" height="12.3" rx="2.4" />
      <circle cx="16.6" cy="13.4" r="1.3" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.6v8.8M14.4 9.5c-.6-.7-1.5-1-2.4-1-1.4 0-2.4.8-2.4 1.9 0 2.6 4.9 1.2 4.9 3.8 0 1.1-1 1.9-2.5 1.9-1 0-1.9-.4-2.5-1.1" />
    </>
  ),
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.4" />
      <circle cx="8.6" cy="8.6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="15.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="8.6" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  brush: (
    <>
      <path d="M15.6 3.8 20.2 8.4 9.9 18.7l-5.6 1 1-5.6z" />
      <path d="M13.4 6 18 10.6" />
    </>
  ),
  heart: <path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z" />,
  hand: (
    <>
      <path d="M9 11V5.6a1.6 1.6 0 0 1 3.2 0V11" />
      <path d="M12.2 10.6V4.8a1.6 1.6 0 0 1 3.2 0V11" />
      <path d="M15.4 11V6.8a1.6 1.6 0 0 1 3.2 0v7.4a6.4 6.4 0 0 1-6.4 6.4h-.9a6 6 0 0 1-4.5-2L4 15.2a1.7 1.7 0 0 1 2.6-2.1L9 15.4V11" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  shirt: (
    <>
      <path d="M8.4 3.5 4 5.8l1.6 4.2 2.1-.8v10.5h8.6V9.2l2.1.8L20 5.8l-4.4-2.3" />
      <path d="M8.4 3.5a3.6 3.6 0 0 0 7.2 0" />
    </>
  ),
  undo: (
    <>
      <path d="M4 9.5h9.6a5.4 5.4 0 0 1 0 10.8H8.2" />
      <path d="M7.6 5.2 3.4 9.5l4.2 4.3" />
    </>
  ),
  redo: (
    <>
      <path d="M20 9.5h-9.6a5.4 5.4 0 0 0 0 10.8h5.4" />
      <path d="M16.4 5.2l4.2 4.3-4.2 4.3" />
    </>
  ),
  close: <path d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4" />,
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  minus: <path d="M5.2 12h13.6" />,
  image: (
    <>
      <rect x="3" y="4.6" width="18" height="14.8" rx="2.4" />
      <circle cx="8.6" cy="9.8" r="1.7" />
      <path d="M3.6 17.4 8.9 12.6l3.4 3.1 3.6-3.3 4.5 4.2" />
    </>
  ),
  outline: (
    <>
      <path d="M6.5 18.5 12 5.5l5.5 13" />
      <path d="M8.6 14.2h6.8" />
      <path d="M3 21.2h18" strokeOpacity=".45" />
    </>
  ),
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
}

export default function Icon({ name, size = 18, className = '', style }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`icon ${className}`} style={style} aria-hidden focusable="false"
    >
      {d}
    </svg>
  )
}
