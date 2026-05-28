import { useState } from 'react'

export default function Accordion({ title, subtitle, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="accordion">
      <button className="accordion__header" onClick={() => setOpen(o => !o)}>
        <div className="accordion__header-text">
          <span className="accordion__title">{title}</span>
          {subtitle && <span className="accordion__subtitle">{subtitle}</span>}
        </div>
        <span className={`accordion__chevron ${open ? 'accordion__chevron--open' : ''}`}>›</span>
      </button>
      {open && <div className="accordion__body">{children}</div>}
    </div>
  )
}
