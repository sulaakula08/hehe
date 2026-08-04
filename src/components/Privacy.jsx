import { CONTACTS } from '../data.js'

/**
 * Базовая политика обработки данных. Написана под то, как магазин работает
 * сейчас: бэкенда нет, заказы и данные лежат в localStorage браузера, никуда
 * не уходят. Когда появится сервер и приём платежей, текст надо переписать —
 * это заготовка, а не юридический документ.
 */
export default function Privacy({ t, onHome }) {
  const blocks = t.pp_blocks
  return (
    <section className="section wrap">
      <div className="crumbs">
        <button className="link" onClick={onHome}>{t.nav_home}</button>
        <span>/</span>
        <span className="muted">{t.pp_title}</span>
      </div>

      <div className="section-head">
        <div>
          <h1 className="page-title">{t.pp_title}</h1>
          <p>{t.pp_updated}</p>
        </div>
      </div>

      <div className="doc">
        <p className="doc-lead">{t.pp_lead}</p>

        {blocks.map((b, i) => (
          <div key={b.h} className="doc-block">
            <h3>{i + 1}. {b.h}</h3>
            {b.p.map((line) => <p key={line}>{line}</p>)}
            {b.list && (
              <ul>
                {b.list.map((li) => <li key={li}>{li}</li>)}
              </ul>
            )}
          </div>
        ))}

        <div className="doc-block">
          <h3>{blocks.length + 1}. {t.pp_contact_h}</h3>
          <p>{t.pp_contact_p}</p>
          <p>
            <a className="link" href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a>
            {' · '}
            <a className="link" href={CONTACTS.whatsapp.href} target="_blank" rel="noreferrer">
              WhatsApp {CONTACTS.whatsapp.label}
            </a>
          </p>
        </div>

        <p className="doc-note">{t.pp_demo_note}</p>
      </div>
    </section>
  )
}
