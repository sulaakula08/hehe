import { motion } from 'framer-motion'

/**
 * Знак ХЕХЕ.
 *
 * Идея: кириллическая «Х» из самого названия — это готовые зажмуренные глаза,
 * как в «XD». Два таких креста плюс широкая улыбка читаются как смеющееся лицо
 * и при этом остаются буквами бренда. Геометрия строгая: скруглённый квадрат,
 * штрихи одной толщины, две краски — без градиентов и объёма.
 *
 * При наведении лицо «ржёт»: глаза сжимаются, улыбка растёт, знак качается.
 */
export default function Logo({ size = 44, withWord = true }) {
  const stroke = { stroke: 'var(--logo-fg)', strokeWidth: 5, strokeLinecap: 'round' }

  return (
    <motion.div className="logo" initial="rest" whileHover="lol" animate="rest">
      <motion.svg
        width={size} height={size} viewBox="0 0 48 48"
        variants={{ rest: { rotate: -3 }, lol: { rotate: [-3, 5, -5, 3, -3], transition: { duration: 0.55 } } }}
        aria-hidden
      >
        <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="var(--logo-bg)" />

        {/* Глаза — две «Х». При смехе сплющиваются, как настоящий прищур. */}
        {[13.5, 30].map((cx) => (
          <motion.g
            key={cx}
            variants={{ rest: { scaleY: 1, y: 0 }, lol: { scaleY: 0.62, y: 1.5 } }}
            style={{ transformOrigin: `${cx + 2.25}px 19px` }}
          >
            <line x1={cx} y1="15" x2={cx + 4.5} y2="23" {...stroke} />
            <line x1={cx + 4.5} y1="15" x2={cx} y2="23" {...stroke} />
          </motion.g>
        ))}

        {/* Улыбка — половина капсулы, плотная и широкая. */}
        <motion.path
          fill="var(--logo-fg)"
          variants={{
            rest: { d: 'M13 29 H35 A11 11 0 0 1 13 29 Z' },
            lol: { d: 'M11 28 H37 A13 13 0 0 1 11 28 Z' },
          }}
        />
        {/* Язык появляется только на пике смеха. */}
        <motion.rect
          x="20" y="36" width="8" height="6" rx="3" fill="var(--hot)"
          variants={{ rest: { scaleY: 0, opacity: 0 }, lol: { scaleY: 1, opacity: 1 } }}
          style={{ transformOrigin: '24px 36px' }}
        />
      </motion.svg>

      {withWord && <span className="logo-word">ХЕХЕ<i className="logo-dot" /></span>}
    </motion.div>
  )
}
