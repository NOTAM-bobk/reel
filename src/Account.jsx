import { useRef } from 'react'
import { Icon } from './icons.jsx'

/* ============================================================
   Account — placeholder sheet, opened from the top-right button.
   Same bottom-sheet + drag-to-close pattern as DetailSheet, so
   it feels like part of the same system. Expand this file as
   real account features (auth, settings, etc.) are added.
   ============================================================ */

const ROWS = [
  { icon: 'bell', label: 'Notifications' },
  { icon: 'sliders', label: 'Preferences' },
  { icon: 'globe', label: 'Region · US' },
  { icon: 'info', label: 'About reel' },
]

const RowIcon = {
  bell: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M6 10a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 18.5a2.5 2.5 0 005 0" strokeLinecap="round" /></svg>),
  sliders: Icon.sliders,
  globe: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.8 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.8-3.8-9s1.3-6.4 3.8-9z" /></svg>),
  info: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" strokeLinecap="round" /><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" /></svg>),
}

export default function AccountSheet({ onClose }) {
  const sheetRef = useRef(null)
  const drag = useRef({ startY: 0, dragging: false })

  const onHandleStart = (e) => {
    drag.current = { startY: e.touches[0].clientY, dragging: true }
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  const onHandleMove = (e) => {
    if (!drag.current.dragging || !sheetRef.current) return
    const dy = e.touches[0].clientY - drag.current.startY
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  const onHandleEnd = (e) => {
    if (!drag.current.dragging || !sheetRef.current) return
    drag.current.dragging = false
    const dy = e.changedTouches[0].clientY - drag.current.startY
    sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(.2,.9,.25,1.1)'
    if (dy > 100) {
      sheetRef.current.style.transform = 'translateY(100%)'
      setTimeout(onClose, 200)
    } else {
      sheetRef.current.style.transform = 'translateY(0)'
    }
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet account-sheet" ref={sheetRef}>
        <div
          className="sheet-handle-wrap"
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
        >
          <div className="sheet-handle" />
          <button className="sheet-close sheet-close-dark" onClick={onClose} aria-label="Close">
            <Icon.x />
          </button>
        </div>

        <div className="account-body">
          <div className="account-header">
            <div className="account-avatar">R</div>
            <div className="account-header-text">
              <div className="account-name">Guest</div>
              <div className="account-sub">Sign in to sync your watchlist</div>
            </div>
          </div>

          <button className="btn btn-primary btn-full account-signin">Sign in</button>

          <div className="account-list">
            {ROWS.map((r) => {
              const RIcon = RowIcon[r.icon]
              return (
                <button className="account-row" key={r.label}>
                  <span className="account-row-icon"><RIcon /></span>
                  <span className="account-row-label">{r.label}</span>
                  <span className="account-row-chevron">›</span>
                </button>
              )
            })}
          </div>

          <div className="account-footer">More account features coming soon.</div>
        </div>
      </div>
    </>
  )
}
