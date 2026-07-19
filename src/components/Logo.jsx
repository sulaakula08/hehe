import { motion } from 'framer-motion'

/**
 * Логотип ХЕХЕ: квадратный «жмурящийся» смайл.
 * Глаза — перевёрнутые буквы E (лежат на боку = ^ ^ прищур),
 * рот — открытая скобка. При наведении смайл «ржёт»: глаза сжимаются, рот растёт.
 */
export default function Logo({ size = 44, withWord = true }) {
  return (
    <motion.div
      className="logo"
      initial="rest"
      whileHover="lol"
      animate="rest"
      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        variants={{ rest: { rotate: -4 }, lol: { rotate: [-4, 6, -6, 4, -4], transition: { duration: 0.5 } } }}
      >
        <rect x="4" y="4" width="92" height="92" rx="22" fill="var(--ink)" stroke="var(--ink)" strokeWidth="6" />
        {/* глаза-«E» на боку: три штриха + опора */}
        {[28, 60].map((x) => (
          <motion.g
            key={x}
            variants={{ rest: { y: 0, scaleY: 1 }, lol: { y: 4, scaleY: 0.55 } }}
            style={{ transformOrigin: `${x + 6}px 40px` }}
          >
            <rect x={x} y="30" width="4" height="18" rx="2" fill="var(--acid)" />
            <rect x={x + 5} y="26" width="4" height="22" rx="2" fill="var(--acid)" />
            <rect x={x + 10} y="30" width="4" height="18" rx="2" fill="var(--acid)" />
          </motion.g>
        ))}
        {/* рот */}
        <motion.path
          d="M28 62 Q50 88 72 62"
          fill="none"
          stroke="var(--acid)"
          strokeWidth="7"
          strokeLinecap="round"
          variants={{ rest: { d: 'M28 62 Q50 84 72 62' }, lol: { d: 'M26 58 Q50 96 74 58' } }}
        />
        <motion.circle
          cx="50" cy="78" r="6" fill="var(--hot)"
          variants={{ rest: { scale: 0, opacity: 0 }, lol: { scale: 1, opacity: 1 } }}
        />
      </motion.svg>
      {withWord && (
        <div className="logo-word">
          ХЕХЕ<span className="logo-dot">.</span>
        </div>
      )}
    </motion.div>
  )
}
