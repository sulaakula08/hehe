const PREFIX = '+7 '

/** Цифры без разделителей: по ним судим, введён телефон или только префикс. */
export const phoneDigits = (v) => (v || '').replace(/\D/g, '')

/**
 * Поле телефона с автоматическим +7.
 *
 * Префикс подставляется, когда человек попадает в пустое поле, и убирается,
 * если он ушёл, так ничего и не набрав. Держать «+7» в пустом поле постоянно
 * нельзя: проверка при оформлении считает поле заполненным по непустой
 * строке, и заказ уходил бы с одним префиксом вместо номера.
 */
export default function PhoneInput({ value = '', onValue, ...rest }) {
  const onFocus = () => {
    if (!value.trim()) onValue(PREFIX)
  }

  const onBlur = () => {
    // Только код страны — считаем, что номер не введён.
    if (phoneDigits(value).length <= 1) onValue('')
  }

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={PREFIX + '…'}
      value={value}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={(e) => onValue(e.target.value)}
      {...rest}
    />
  )
}
