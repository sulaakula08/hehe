import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { KZ_CITIES } from '../data.js'

/**
 * Поле города с подсказкой по списку казахстанских городов.
 *
 * Список не закрытый: подсказка помогает попасть в привычное написание, но
 * вписать свой посёлок руками по-прежнему можно — заказ не должен упираться
 * в то, что города нет в списке.
 *
 * Ищем сразу по обоим названиям: интерфейс двуязычный, и человек с русским
 * интерфейсом может набрать «Өскемен», а с казахским — «Усть-Каменогорск».
 */
export default function CityInput({ value = '', onValue, lang = 'ru', t, ...rest }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)          // подсвеченная строка для клавиатуры
  const box = useRef(null)
  const listId = useId()

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    const hit = (c) => !q || c.ru.toLowerCase().includes(q) || c.kk.toLowerCase().includes(q)
    // Точное совпадение с выбранным городом подсказку не показывает.
    const exact = KZ_CITIES.some((c) => c[lang].toLowerCase() === q)
    return exact ? [] : KZ_CITIES.filter(hit).slice(0, 8)
  }, [value, lang])

  // Клик мимо поля закрывает список.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => { setHi(0) }, [value])

  const pick = (c) => {
    onValue(c[lang])
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!open || !matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => (i + 1) % matches.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => (i - 1 + matches.length) % matches.length) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[hi]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="city" ref={box}>
      <input
        value={value}
        onChange={(e) => { onValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t?.city_ph}
        autoComplete="address-level2"
        role="combobox" aria-expanded={open && matches.length > 0}
        aria-controls={listId} aria-autocomplete="list"
        {...rest}
      />

      {open && matches.length > 0 && (
        <ul className="city-list" id={listId} role="listbox">
          {matches.map((c, i) => (
            <li key={c.ru}>
              <button
                type="button" role="option" aria-selected={i === hi}
                className={i === hi ? 'on' : ''}
                // mousedown, а не click: blur поля успевает закрыть список раньше клика
                onMouseDown={(e) => { e.preventDefault(); pick(c) }}
                onMouseEnter={() => setHi(i)}
              >
                <b>{c[lang]}</b>
                <span>, {t?.country_kz}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
