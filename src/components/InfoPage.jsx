import Icon from './Icon.jsx'
import { CONTACTS } from '../data.js'

/**
 * Текстовая страница из блоков: «Оплата и доставка», «О проекте».
 * Строки берутся из словаря, поэтому страница сразу двуязычная, а вёрстка
 * общая с политикой — один стиль документа на весь сайт.
 */
export default function InfoPage({ t, title, lead, blocks, note, onHome }) {
  return (
    <section className="section wrap">
      <div className="crumbs">
        <button className="link" onClick={onHome}>{t.nav_home}</button>
        <span>/</span>
        <span className="muted">{title}</span>
      </div>

      <div className="section-head">
        <div>
          <h1 className="page-title">{title}</h1>
        </div>
      </div>

      <div className="doc">
        <p className="doc-lead">{lead}</p>

        {blocks.map((b, i) => (
          <div key={b.h} className="doc-block">
            <h3>{i + 1}. {b.h}</h3>
            {(b.p || []).map((line) => <p key={line}>{line}</p>)}
            {b.list && <ul>{b.list.map((li) => <li key={li}>{li}</li>)}</ul>}
          </div>
        ))}

        <div className="doc-block">
          <h3>{t.pp_contact_h}</h3>
          <p>{t.pp_contact_p}</p>
          <div className="doc-contacts">
            <a className="btn btn-solid" href={CONTACTS.whatsapp.href} target="_blank" rel="noreferrer">
              WhatsApp {CONTACTS.whatsapp.label}
            </a>
            <a className="btn" href={CONTACTS.telegram.href} target="_blank" rel="noreferrer">
              Telegram {CONTACTS.telegram.label}
            </a>
          </div>
        </div>

        {note && (
          <p className="doc-note"><Icon name="chat" size={15} /> {note}</p>
        )}
      </div>
    </section>
  )
}
