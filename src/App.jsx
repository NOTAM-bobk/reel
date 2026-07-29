import { useEffect, useMemo, useRef, useState, useCallback, memo, lazy, Suspense } from 'react'
import { Icon } from './icons.jsx'
const AccountSheet = lazy(() => import('./Account.jsx'))

/* ============================================================
   TMDB API
   ============================================================ */

const TMDB_KEY = 'b1941699110de014fceb3d15828f4718'
const BASE = 'https://api.themoviedb.org/3'
const REGION = 'US'

const img = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

// In-memory response cache. Switching tabs (Discover <-> Search <-> Watchlist)
// re-mounts views that hit the same endpoints — this makes that instant
// instead of re-fetching, and de-dupes concurrent identical requests.
const tmdbCache = new Map()
const TMDB_CACHE_TTL = 5 * 60 * 1000

async function tmdb(path, params = {}) {
  const qs = new URLSearchParams({ api_key: TMDB_KEY, language: 'en-US', ...params })
  const url = `${BASE}${path}?${qs.toString()}`
  const hit = tmdbCache.get(url)
  if (hit) {
    if (hit.promise) return hit.promise
    if (Date.now() - hit.t < TMDB_CACHE_TTL) return hit.data
  }
  const promise = fetch(url)
    .then((res) => { if (!res.ok) throw new Error(`TMDB ${res.status}`); return res.json() })
    .then((data) => { tmdbCache.set(url, { data, t: Date.now() }); return data })
    .catch((err) => { tmdbCache.delete(url); throw err })
  tmdbCache.set(url, { promise })
  return promise
}

const yearOf = (item) => {
  const d = item.release_date || item.first_air_date
  return d ? d.slice(0, 4) : '—'
}

const titleOf = (item) => item.title || item.name || 'Untitled'
const mediaTypeOf = (item) => item.media_type || (item.first_air_date ? 'tv' : 'movie')

const GENRES_CURATED = [
  { name: 'Action', movieId: 28, tvId: 10759 },
  { name: 'Comedy', movieId: 35, tvId: 35 },
  { name: 'Animation', movieId: 16, tvId: 16 },
  { name: 'Horror', movieId: 27, tvId: 9648 },
]



/* ============================================================
   Watchlist persistence — now with status, rating, timestamps
   ============================================================ */

function useWatchlist() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('reel_watchlist')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('reel_watchlist', JSON.stringify(items))
  }, [items])

  const has = useCallback((id, mediaType) => items.some((i) => i.id === id && i.media_type === mediaType), [items])
  const get = useCallback((id, mediaType) => items.find((i) => i.id === id && i.media_type === mediaType), [items])

  const toggle = useCallback((item) => {
    const mediaType = mediaTypeOf(item)
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id && i.media_type === mediaType)
      if (exists) return prev.filter((i) => !(i.id === item.id && i.media_type === mediaType))
      return [{
        id: item.id,
        media_type: mediaType,
        title: titleOf(item),
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        year: yearOf(item),
        genre_ids: item.genre_ids || (item.genres ? item.genres.map((g) => g.id) : []),
        status: 'planned',
        rating: 0,
        saved_at: Date.now(),
        watched_at: null,
      }, ...prev]
    })
  }, [])

  const setWatched = useCallback((item, watched) => {
    const mediaType = mediaTypeOf(item)
    setItems((prev) => prev.map((i) => {
      if (i.id !== item.id || i.media_type !== mediaType) return i
      return { ...i, status: watched ? 'watched' : 'planned', watched_at: watched ? Date.now() : null }
    }))
  }, [])

  const setRating = useCallback((item, rating) => {
    const mediaType = mediaTypeOf(item)
    setItems((prev) => prev.map((i) => (i.id === item.id && i.media_type === mediaType) ? { ...i, rating } : i))
  }, [])

  return { items, has, get, toggle, setWatched, setRating }
}

/* ============================================================
   Shared pieces
   ============================================================ */

function ScoreRing({ value = 0, size = 38 }) {
  const pct = Math.max(0, Math.min(100, Math.round((value || 0) * 10)))
  const r = 15
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="score-wrap">
      <svg className="score-ring" width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#F1E0D9" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="#B3391F" strokeWidth="3" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 18 18)" />
      </svg>
      <span className="score-num">{pct}% liked</span>
    </div>
  )
}

// Save/unsave button used on posters, hero cards, and the detail sheet.
// A remounting inner span (keyed on saved state) gets a small pop animation
// on every toggle, so the action always reads as a clear, deliberate change.
function SaveToggle({ item, watchlist, className = 'card-save' }) {
  const mediaType = mediaTypeOf(item)
  const saved = watchlist.has(item.id, mediaType)
  return (
    <span
      className={className}
      role="button"
      tabIndex={0}
      aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}
      onClick={(e) => { e.stopPropagation(); watchlist.toggle(item) }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); watchlist.toggle(item) } }}
    >
      <span key={saved ? 'on' : 'off'} className="save-icon-pop">
        {saved ? <Icon.bookmarkFilled style={{ color: '#B3391F' }} /> : <Icon.bookmark style={{ color: '#211A17' }} />}
      </span>
    </span>
  )
}

const PosterCard = memo(function PosterCard({ item, watchlist, onOpen, showWatchedMark }) {
  const mediaType = mediaTypeOf(item)
  const saved = watchlist.has(item.id, mediaType)
  const record = watchlist.get(item.id, mediaType)
  const isWatched = record?.status === 'watched'
  return (
    <div className="card">
      <button className="card-poster" onClick={() => onOpen(item)} aria-label={`Open ${titleOf(item)}`}>
        {item.poster_path ? <img src={img(item.poster_path)} alt="" loading="lazy" decoding="async" /> : <div className="card-empty-poster">{titleOf(item)}</div>}
        <SaveToggle item={item} watchlist={watchlist} />
        {isWatched && (
          <span className="card-watched-badge"><Icon.check /></span>
        )}
        {showWatchedMark && saved && (
          <span
            className={`wl-mark ${isWatched ? 'done' : ''}`}
            role="button"
            onClick={(e) => { e.stopPropagation(); watchlist.setWatched(item, !isWatched) }}
          >
            <Icon.check style={{ color: isWatched ? '#fff' : '#52443F' }} />
          </span>
        )}
      </button>
      <div className="card-title">{titleOf(item)}</div>
      <div className="card-year">{yearOf(item)} · {mediaType === 'tv' ? 'Series' : 'Film'}</div>
    </div>
  )
})

const Rail = memo(function Rail({ title, sub, badge, items, loading, watchlist, onOpen }) {
  if (!loading && (!items || items.length === 0)) return null
  return (
    <div className="rail-section">
      <div className="rail-head">
        <div className="rail-title-wrap">
          <div className="rail-title">{title}</div>
          {sub && <div className="rail-sub">{sub}</div>}
        </div>
        {badge && <div className="rail-badge">{badge}</div>}
      </div>
      {loading ? (
        <div className="skel-rail">{[...Array(4)].map((_, i) => <div key={i} className="skel-card" />)}</div>
      ) : (
        <div className="rail">
          {items.map((item) => <PosterCard key={`${mediaTypeOf(item)}-${item.id}`} item={item} watchlist={watchlist} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
})

const Top10Rail = memo(function Top10Rail({ title, sub, items, loading, watchlist, onOpen }) {
  if (!loading && (!items || items.length === 0)) return null
  return (
    <div className="rail-section">
      <div className="rail-head">
        <div className="rail-title-wrap">
          <div className="rail-title">{title}</div>
          {sub && <div className="rail-sub">{sub}</div>}
        </div>
        <div className="rail-badge">Top 10</div>
      </div>
      {loading ? (
        <div className="skel-rail">{[...Array(4)].map((_, i) => <div key={i} className="skel-card" />)}</div>
      ) : (
        <div className="top10-rail">
          {items.slice(0, 10).map((item, i) => (
            <div className="top10-item" key={`${mediaTypeOf(item)}-${item.id}`}>
              <span className="top10-num">{i + 1}</span>
              <button className="card-poster" onClick={() => onOpen(item)} aria-label={`Open ${titleOf(item)}`}>
                {item.poster_path ? <img src={img(item.poster_path)} alt="" loading="lazy" decoding="async" /> : <div className="card-empty-poster">{titleOf(item)}</div>}
                <SaveToggle item={item} watchlist={watchlist} />
              </button>
              <div className="card-title">{titleOf(item)}</div>
              <div className="card-year">{yearOf(item)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

/* ============================================================
   Detail sheet
   ============================================================ */

function DetailSheet({ item, onClose, watchlist }) {
  const mediaType = mediaTypeOf(item)
  const [data, setData] = useState(null)
  const [showTrailer, setShowTrailer] = useState(false)
  const sheetRef = useRef(null)
  const drag = useRef({ startY: 0, dragging: false })

  useEffect(() => {
    let alive = true
    setData(null)
    setShowTrailer(false)
    tmdb(`/${mediaType}/${item.id}`, { append_to_response: 'credits,videos,watch/providers' })
      .then((d) => { if (alive) setData(d) }).catch(() => {})
    return () => { alive = false }
  }, [item.id, mediaType])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

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

  const trailer = useMemo(() => {
    const vids = data?.videos?.results || []
    return vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || vids.find((v) => v.site === 'YouTube')
  }, [data])

  const providers = data?.['watch/providers']?.results?.[REGION]
  const providerList = useMemo(() => {
    if (!providers) return []
    const merged = [...(providers.flatrate || []), ...(providers.ads || [])]
    const seen = new Set()
    return merged.filter((p) => { if (seen.has(p.provider_id)) return false; seen.add(p.provider_id); return true })
  }, [providers])

  const cast = (data?.credits?.cast || []).slice(0, 12)
  const record = watchlist.get(item.id, mediaType)
  const saved = !!record
  const isWatched = record?.status === 'watched'
  const runtime = data?.runtime || data?.episode_run_time?.[0]
  const genres = data?.genres || []
  const fullItem = data ? { ...item, ...data } : item

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" ref={sheetRef}>
        <div
          className="sheet-handle-wrap"
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
        >
          <div className="sheet-handle" />
          <button className="sheet-close" onClick={onClose} aria-label="Close"><Icon.x style={{ color: '#fff' }} /></button>
        </div>

        {item.backdrop_path || data?.backdrop_path ? (
          <img className="sheet-backdrop-img" src={img(data?.backdrop_path || item.backdrop_path, 'w780')} alt="" decoding="async" fetchPriority="high" />
        ) : <div className="sheet-backdrop-img" />}

        <div className="sheet-body">
          <div className="sheet-poster-row">
            <div className="sheet-poster">{item.poster_path ? <img src={img(item.poster_path)} alt="" /> : null}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sheet-title">{titleOf(item)}</div>
              <div className="sheet-meta">
                <span>{yearOf(item)}</span>
                {runtime ? <><span className="dot">·</span><span>{mediaType === 'tv' ? `${runtime}m/ep` : `${runtime}m`}</span></> : null}
                <span className="dot">·</span>
                <span>{mediaType === 'tv' ? 'Series' : 'Film'}</span>
              </div>
              {data ? <ScoreRing value={data.vote_average} /> : null}
            </div>
          </div>

          {genres.length > 0 && (
            <div className="chip-wrap" style={{ marginBottom: 18 }}>
              {genres.map((g) => <span key={g.id} className="chip">{g.name}</span>)}
            </div>
          )}

          <div className="actions-row">
            <button className={`btn btn-save ${saved ? 'is-saved' : ''}`} onClick={() => watchlist.toggle(fullItem)}>
              <span key={saved ? 'on' : 'off'} className="save-icon-pop">
                {saved ? <Icon.bookmarkFilled /> : <Icon.bookmark />}
              </span>
              {saved ? 'Saved' : 'Save to watchlist'}
            </button>
            <button className={`btn ${isWatched ? 'btn-secondary' : 'btn-outline'}`} onClick={() => { if (!saved) watchlist.toggle(fullItem); watchlist.setWatched(fullItem, !isWatched) }}>
              {isWatched ? <Icon.check /> : <Icon.eye />}
              {isWatched ? 'Watched' : 'Mark as watched'}
            </button>
            {trailer && (
              <button className="btn btn-gold" onClick={() => setShowTrailer((s) => !s)}><Icon.play />Trailer</button>
            )}
          </div>

          {isWatched && (
            <>
              <div className="section-label">Your rating</div>
              <div className="rate-row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className="rate-star" onClick={() => watchlist.setRating(fullItem, n === record?.rating ? 0 : n)}>
                    {(record?.rating || 0) >= n ? <Icon.starFilled style={{ color: '#8A5D00' }} /> : <Icon.star style={{ color: '#A48981' }} />}
                  </button>
                ))}
              </div>
            </>
          )}

          {showTrailer && trailer && (
            <div className="trailer-frame">
              <iframe src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`} title="Trailer" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          )}

          {(data?.overview || item.overview) && (
            <><div className="section-label">Overview</div><p className="overview">{data?.overview || item.overview}</p></>
          )}

          {providerList.length > 0 && (
            <>
              <div className="section-label">Stream on</div>
              <div className="provider-row">
                {providerList.map((p) => (
                  <div className="provider-chip" key={p.provider_id}>
                    <div className="provider-logo"><img src={img(p.logo_path, 'w92')} alt="" /></div>
                    <span className="provider-name">{p.provider_name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {cast.length > 0 && (
            <>
              <div className="section-label">Cast</div>
              <div className="cast-row">
                {cast.map((c) => (
                  <div className="cast-item" key={c.id}>
                    <div className="cast-photo">{c.profile_path ? <img src={img(c.profile_path, 'w185')} alt="" /> : null}</div>
                    <div className="cast-name">{c.name}</div>
                    <div className="cast-role">{c.character}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!data && <div className="spinner-dot">loading reel —</div>}
        </div>
      </div>
    </>
  )
}

/* ============================================================
   Hero carousel — auto-advances every 6s, loops, swipeable
   ============================================================ */

const HERO_INTERVAL = 6000

function HeroCarousel({ items, loading, watchlist, onOpen }) {
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)
  const touch = useRef({ x: 0, dragging: false })
  const trackRef = useRef(null)

  const count = items.length

  const restart = useCallback(() => {
    clearInterval(timerRef.current)
    if (count > 1) {
      timerRef.current = setInterval(() => setIndex((i) => (i + 1) % count), HERO_INTERVAL)
    }
  }, [count])

  useEffect(() => {
    if (loading || count === 0) return
    restart()
    return () => clearInterval(timerRef.current)
  }, [loading, count, restart])

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0)
  }, [count, index])

  const goTo = (i) => {
    setIndex(((i % count) + count) % count)
    restart()
  }

  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, dragging: true } }
  const onTouchMove = (e) => {
    if (!touch.current.dragging || !trackRef.current) return
    const dx = e.touches[0].clientX - touch.current.x
    trackRef.current.style.transition = 'none'
    trackRef.current.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`
  }
  const onTouchEnd = (e) => {
    if (!touch.current.dragging || !trackRef.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    trackRef.current.style.transition = ''
    trackRef.current.style.transform = ''
    touch.current.dragging = false
    if (dx < -48) goTo(index + 1)
    else if (dx > 48) goTo(index - 1)
    else restart()
  }

  if (loading || count === 0) {
    return (
      <div className="hero-viewport">
        <div className="hero skel-hero" />
      </div>
    )
  }

  return (
    <div className="hero-viewport">
      <div
        className="hero-track"
        ref={trackRef}
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {items.map((h, i) => (
          <div className="hero" key={`${mediaTypeOf(h)}-${h.id}`}>
            <img src={img(h.backdrop_path || h.poster_path, 'w780')} alt="" decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} loading={i === 0 ? 'eager' : 'lazy'} />
            <div className="hero-scrim" />
            <div className="hero-content">
              <span className="hero-eyebrow">No. {i + 1} this week</span>
              <div className="hero-title">{titleOf(h)}</div>
              <div className="hero-meta"><span>{yearOf(h)}</span><span className="dot">·</span><span>{mediaTypeOf(h) === 'tv' ? 'Series' : 'Film'}</span></div>
              <div className="hero-actions">
                <button className="btn btn-gold" onClick={() => onOpen(h)}><Icon.play /> View</button>
                <button className={`btn btn-ghost ${watchlist.has(h.id, mediaTypeOf(h)) ? 'is-saved' : ''}`} onClick={() => watchlist.toggle(h)}>
                  <span key={watchlist.has(h.id, mediaTypeOf(h)) ? 'on' : 'off'} className="save-icon-pop">
                    {watchlist.has(h.id, mediaTypeOf(h)) ? <Icon.bookmarkFilled /> : <Icon.bookmark />}
                  </span>
                  {watchlist.has(h.id, mediaTypeOf(h)) ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="hero-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === index ? 'active' : ''}`}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Discover tab — long, rich scroll for finding new things
   ============================================================ */

function DiscoverView({ watchlist, onOpen }) {
  const [trending, setTrending] = useState([])
  const [top10Movies, setTop10Movies] = useState([])
  const [top10Tv, setTop10Tv] = useState([])
  const [nowPlaying, setNowPlaying] = useState([])
  const [popularMovies, setPopularMovies] = useState([])
  const [popularTv, setPopularTv] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [topRated, setTopRated] = useState([])
  const [airingToday, setAiringToday] = useState([])
  const [genreRails, setGenreRails] = useState({})
  const [personalized, setPersonalized] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const ok = (r) => (r.status === 'fulfilled' ? (r.value.results || []) : [])
    Promise.allSettled([
      tmdb('/trending/all/week'),
      tmdb('/trending/movie/day'),
      tmdb('/trending/tv/day'),
      tmdb('/movie/now_playing'),
      tmdb('/movie/popular'),
      tmdb('/tv/popular'),
      tmdb('/movie/upcoming'),
      tmdb('/movie/top_rated'),
      tmdb('/tv/airing_today'),
      ...GENRES_CURATED.map((g) => tmdb('/discover/movie', { with_genres: g.movieId, sort_by: 'popularity.desc' })),
    ]).then(([t, tm, tt, np, pm, pt, up, tr, at, ...genreResults]) => {
      // allSettled means one flaky endpoint (rate limit, network blip) no
      // longer blanks every rail on the page — each section just falls
      // back to empty and quietly hides itself.
      if (!alive) return
      setTrending(ok(t))
      setTop10Movies(ok(tm))
      setTop10Tv(ok(tt))
      setNowPlaying(ok(np))
      setPopularMovies(ok(pm))
      setPopularTv(ok(pt))
      setUpcoming(ok(up))
      setTopRated(ok(tr))
      setAiringToday(ok(at))
      const rails = {}
      GENRES_CURATED.forEach((g, i) => { rails[g.name] = ok(genreResults[i]) })
      setGenreRails(rails)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (watchlist.items.length === 0) { setPersonalized(null); return }
    const recent = watchlist.items[0]
    const genreId = recent.genre_ids?.[0]
    if (!genreId) { setPersonalized(null); return }
    tmdb(`/discover/${recent.media_type}`, { with_genres: genreId, sort_by: 'popularity.desc' })
      .then((d) => setPersonalized({ title: recent.title, items: (d.results || []).map((r) => ({ ...r, media_type: recent.media_type })) }))
      .catch(() => setPersonalized(null))
  }, [watchlist.items.length])

  const hero = trending.slice(0, 5)

  return (
    <div>
      <HeroCarousel items={hero} loading={loading} watchlist={watchlist} onOpen={onOpen} />

      <Top10Rail title="Top 10 films today" items={top10Movies} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Top10Rail title="Top 10 series today" items={top10Tv} loading={loading} watchlist={watchlist} onOpen={onOpen} />

      {personalized && personalized.items.length > 0 && (
        <Rail title={`Because you saved ${personalized.title}`} sub="more like it" items={personalized.items} loading={false} watchlist={watchlist} onOpen={onOpen} />
      )}

      <Rail title="New in theaters" sub="now playing" items={nowPlaying} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Trending this week" items={trending.slice(5)} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Popular series" items={popularTv} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Coming soon" sub="mark your calendar" items={upcoming} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Popular films" items={popularMovies} loading={loading} watchlist={watchlist} onOpen={onOpen} />

      {GENRES_CURATED.map((g) => (
        <Rail key={g.name} title={`${g.name} picks`} items={genreRails[g.name]} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      ))}

      <Rail title="Critics' picks" sub="highest rated films" items={topRated} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Airing today" sub="on TV right now" items={airingToday} loading={loading} watchlist={watchlist} onOpen={onOpen} />
    </div>
  )
}

/* ============================================================
   Search tab — search only, on purpose. No default browse grid:
   an empty query shows a prompt (plus a few trending shortcuts),
   never a silent discover feed standing in for search results.
   ============================================================ */

function SearchView({ watchlist, onOpen, autoFocus }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [mediaType, setMediaType] = useState('all')
  const [suggestions, setSuggestions] = useState([])
  const requestId = useRef(0)

  useEffect(() => {
    let alive = true
    tmdb('/trending/all/day').then((d) => { if (alive) setSuggestions((d.results || []).slice(0, 8)) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const id = ++requestId.current
    if (!debounced) { setResults([]); setLoading(false); return }
    setLoading(true)
    tmdb('/search/multi', { query: debounced, include_adult: 'false' })
      .then((d) => {
        if (id !== requestId.current) return
        let list = (d.results || []).filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        if (mediaType !== 'all') list = list.filter((r) => r.media_type === mediaType)
        setResults(list)
        setLoading(false)
      })
      .catch(() => { if (id === requestId.current) setLoading(false) })
  }, [debounced, mediaType])

  return (
    <div>
      <div className="search-wrap">
        <div className="search-box">
          <Icon.search />
          <input
            autoFocus={autoFocus}
            placeholder="Search films and series…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            inputMode="search"
          />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search"><Icon.x style={{ width: 14, height: 14, color: '#8C7A73' }} /></button>}
        </div>
      </div>

      {debounced && (
        <div className="filter-row">
          {['all', 'movie', 'tv'].map((t) => (
            <button key={t} className={`chip ${mediaType === t ? 'active' : ''}`} onClick={() => setMediaType(t)}>
              {t === 'all' ? 'Everything' : t === 'movie' ? 'Films' : 'Series'}
            </button>
          ))}
        </div>
      )}

      {!debounced ? (
        <div className="search-empty">
          <div className="search-empty-icon"><Icon.search /></div>
          <div className="state-msg"><strong>Find something to watch</strong>Search by title — or try what's trending right now.</div>
          {suggestions.length > 0 && (
            <div className="suggest-wrap">
              {suggestions.map((s) => (
                <button key={`${mediaTypeOf(s)}-${s.id}`} className="chip suggest-chip" onClick={() => setQuery(titleOf(s))}>
                  {titleOf(s)}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="grid">{[...Array(9)].map((_, i) => <div key={i} className="skel-card" style={{ width: '100%', aspectRatio: '2/3' }} />)}</div>
      ) : results.length === 0 ? (
        <div className="state-msg"><strong>No matches</strong>Try a different title or spelling.</div>
      ) : (
        <div className="grid">
          {results.map((item) => <PosterCard key={`${mediaTypeOf(item)}-${item.id}`} item={item} watchlist={watchlist} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}

// Full-screen search reachable from the Discover tab's FAB, without leaving
// the tab you were on. Same SearchView, just presented as an overlay with
// its own close control and an auto-focused input.
function SearchOverlay({ onClose, watchlist, onOpen }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className="search-overlay">
      <div className="search-overlay-top">
        <div className="search-overlay-title">Search</div>
        <button className="search-overlay-close" onClick={onClose} aria-label="Close search"><Icon.x /></button>
      </div>
      <div className="search-overlay-body">
        <SearchView watchlist={watchlist} onOpen={onOpen} autoFocus />
      </div>
    </div>
  )
}

/* ============================================================
   Watchlist tab — status, rating, sorting, stats
   ============================================================ */

function WatchlistView({ watchlist, onOpen }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  const plannedCount = watchlist.items.filter((i) => i.status !== 'watched').length
  const watchedCount = watchlist.items.filter((i) => i.status === 'watched').length

  const visible = useMemo(() => {
    let list = watchlist.items
    if (statusFilter === 'planned') list = list.filter((i) => i.status !== 'watched')
    if (statusFilter === 'watched') list = list.filter((i) => i.status === 'watched')
    list = [...list]
    if (sortBy === 'recent') list.sort((a, b) => b.saved_at - a.saved_at)
    if (sortBy === 'az') list.sort((a, b) => a.title.localeCompare(b.title))
    if (sortBy === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    return list
  }, [watchlist.items, statusFilter, sortBy])

  if (watchlist.items.length === 0) {
    return <div className="state-msg"><strong>Your shelf is empty</strong>Tap the bookmark on anything you'd like to watch later — it'll turn up here.</div>
  }

  return (
    <div>
      <div className="wl-stats">
        <div className="wl-stat planned"><div className="wl-stat-num">{plannedCount}</div><div className="wl-stat-label">to watch</div></div>
        <div className="wl-stat watched"><div className="wl-stat-num">{watchedCount}</div><div className="wl-stat-label">watched</div></div>
      </div>

      <div className="filter-row">
        {['all', 'planned', 'watched'].map((s) => (
          <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s === 'planned' ? 'To watch' : 'Watched'}
          </button>
        ))}
        <button className={`chip ${sortBy !== 'recent' ? 'active' : ''}`} onClick={() => setSortBy(sortBy === 'recent' ? 'az' : sortBy === 'az' ? 'rating' : 'recent')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon.sort style={{ width: 12, height: 12 }} /> {sortBy === 'recent' ? 'Recent' : sortBy === 'az' ? 'A–Z' : 'My rating'}
          </span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="state-msg"><strong>Nothing here</strong>Nothing matches that filter yet.</div>
      ) : (
        <div className="grid">
          {visible.map((item) => (
            <PosterCard key={`${item.media_type}-${item.id}`} item={item} watchlist={watchlist} onOpen={onOpen} showWatchedMark />
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   App shell
   ============================================================ */

export default function App() {
  const [tab, setTab] = useState('discover')
  const [selected, setSelected] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const watchlist = useWatchlist()

  // The FAB is a Discover-tab shortcut into search, not a replacement for
  // the Search tab — hide it once something is already covering the screen.
  const showFab = tab === 'discover' && !selected && !accountOpen && !searchOpen

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">reel<span>.</span></div>
        <div className="topbar-right">
          <div className="brand-mark">now showing</div>
          <button className="account-btn" onClick={() => setAccountOpen(true)} aria-label="Account">
            <Icon.user />
          </button>
        </div>
      </div>

      {tab === 'discover' && <DiscoverView watchlist={watchlist} onOpen={setSelected} />}
      {tab === 'search' && <SearchView watchlist={watchlist} onOpen={setSelected} />}
      {tab === 'watchlist' && <WatchlistView watchlist={watchlist} onOpen={setSelected} />}

      {showFab && (
        <button className="fab-search" onClick={() => setSearchOpen(true)} aria-label="Search">
          <Icon.search />
        </button>
      )}

      {selected && <DetailSheet item={selected} onClose={() => setSelected(null)} watchlist={watchlist} />}
      {accountOpen && (
        <Suspense fallback={null}>
          <AccountSheet onClose={() => setAccountOpen(false)} />
        </Suspense>
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} watchlist={watchlist} onOpen={setSelected} />}

      <nav className="tabbar">
        <button className={`tab ${tab === 'discover' ? 'active' : ''}`} onClick={() => setTab('discover')}>
          <span className="tab-icon-wrap"><Icon.film /></span>Discover
        </button>
        <button className={`tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
          <span className="tab-icon-wrap"><Icon.search /></span>Search
        </button>
        <button className={`tab ${tab === 'watchlist' ? 'active' : ''}`} onClick={() => setTab('watchlist')}>
          <span className="tab-icon-wrap"><Icon.bookmark /></span>Watchlist
          {watchlist.items.length > 0 && <span className="tab-count">{watchlist.items.length}</span>}
        </button>
      </nav>
    </div>
  )
}
