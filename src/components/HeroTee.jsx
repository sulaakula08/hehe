import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Tshirt from './Tshirt.jsx'
import Icon from './Icon.jsx'

/**
 * Футболка на главной как объёмный предмет: наклоняется за курсором,
 * крутится пальцем, ловит блик и отбрасывает тень в сторону наклона.
 *
 * Настоящей 3D-модели тут нет — принты это плоские фото спереди. Объём
 * даёт перспектива плюс параллакс слоёв: тень, футболка и блик двигаются
 * с разной глубиной, поэтому плоская картинка читается как предмет.
 *
 * Пока крутят, автосмена футболок стоит: неудобно рассматривать вещь,
 * которая сама подменяется под руками.
 */
export default function HeroTee({ product, lang, t, onZoom, onHold }) {
  const box = useRef(null)
  const drag = useRef(null)
  const [held, setHeld] = useState(false)

  // Положение курсора внутри блока, от -0.5 до 0.5.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)

  const spring = { stiffness: 140, damping: 14, mass: 0.6 }
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-26, 26]), spring)
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [18, -18]), spring)

  // Блик ползёт навстречу наклону — так свет выглядит закреплённым в сцене,
  // а не приклеенным к футболке.
  const glareX = useTransform(mx, [-0.5, 0.5], ['85%', '15%'])
  const glareY = useTransform(my, [-0.5, 0.5], ['80%', '20%'])
  const glareOn = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 })
  const glareBg = useTransform(
    [glareX, glareY],
    ([gx, gy]) => `radial-gradient(closest-side at ${gx} ${gy},
      rgba(255,255,255,.5), rgba(255,255,255,0) 70%)`,
  )

  // Тень сдвигается против наклона: предмет как будто висит над плоскостью.
  const shadowX = useSpring(useTransform(mx, [-0.5, 0.5], [26, -26]), spring)
  const shadowY = useSpring(useTransform(my, [-0.5, 0.5], [10, 30]), spring)

  const hold = (on) => { setHeld(on); onHold?.(on) }

  const track = (e) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  const reset = () => {
    mx.set(0); my.set(0)
    glareOn.set(0)
    drag.current = null
    hold(false)
  }

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
    hold(true)
    glareOn.set(1)
    track(e)
  }

  const onPointerMove = (e) => {
    // Мышью крутим на наведении, пальцем — только пока держат.
    if (e.pointerType !== 'mouse' && !drag.current) return
    if (drag.current) {
      const d = Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y)
      if (d > 6) drag.current.moved = true
    }
    track(e)
  }

  const onPointerUp = () => {
    // Клик увеличивает, но только если это был клик, а не вращение.
    const wasClick = drag.current && !drag.current.moved
    drag.current = null
    if (wasClick) onZoom?.()
    hold(false)
    glareOn.set(0)
    mx.set(0); my.set(0)
  }

  return (
    <div
      ref={box}
      className={`hero3d ${held ? 'held' : ''}`}
      role="button" tabIndex={0}
      aria-label={t.zoom_in} title={t.hero3d_hint}
      onPointerEnter={() => glareOn.set(1)}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={reset}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onZoom?.())}
    >
      {/* Тень живёт под сценой и не наклоняется вместе с футболкой. */}
      <motion.div className="hero3d-shadow" style={{ x: shadowX, y: shadowY }} />

      <motion.div
        className="hero3d-stage"
        style={{ rotateX: rotX, rotateY: rotY }}
        // Парение отключаем на время осмотра: качающийся предмет неудобно ловить.
        animate={held ? { y: 0 } : { y: [0, -14, 0] }}
        transition={held
          ? { duration: 0.3 }
          : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          key={product.id}
          className="hero3d-tee"
          initial={{ opacity: 0, rotateY: -30, scale: 0.92 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <Tshirt product={{ ...product, photo: product.photos.black }} lang={lang} hovered big />

          {/* Блик поверх ткани, режим screen — светит, а не забеливает. */}
          <motion.span
            className="hero3d-glare"
            style={{ opacity: glareOn, background: glareBg }}
          />
        </motion.div>
      </motion.div>

      <span className="hero3d-hint"><Icon name="hand" size={14} /> {t.hero3d_hint}</span>
    </div>
  )
}
