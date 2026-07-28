/* ============================================================
   Shared icon set
   Lives in its own module (not App.jsx) on purpose: Account.jsx
   also needs these, and App.jsx imports Account.jsx. If Icon
   lived in App.jsx, that would be a circular import — Account.jsx
   would try to read Icon off App.jsx before App.jsx had finished
   defining it, throwing "Cannot access 'Icon' before
   initialization" and blanking the whole app. Keep icons here.
   ============================================================ */

export const Icon = {
  search: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>),
  bookmark: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" strokeLinejoin="round" /></svg>),
  bookmarkFilled: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" /></svg>),
  play: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>),
  x: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" /></svg>),
  film: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="4.5" width="18" height="15" rx="4" /><path d="M8 4.5v15M16 4.5v15M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5" /></svg>),
  compass: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-2 6-4 2 2-6 4-2z" /></svg>),
  sliders: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 7h10M17 7h3M4 17h3M10 17h10" strokeLinecap="round" /><circle cx="14" cy="7" r="2.2" /><circle cx="7" cy="17" r="2.2" /></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...p}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  eye: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>),
  star: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" strokeLinejoin="round" /></svg>),
  starFilled: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" /></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>),
  sort: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M6 4v16M6 4l-3 3M6 4l3 3M18 20V4M18 20l-3-3M18 20l3-3" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  user: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="8.5" r="3.6" /><path d="M4.5 20.2c1.7-3.6 4.8-5.4 7.5-5.4s5.8 1.8 7.5 5.4" strokeLinecap="round" /></svg>),
}
