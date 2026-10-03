import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../resources/wmulvaney.github.io.svg';
import './TestPage.css';

const SPOTIFY_SHOW = 'https://open.spotify.com/show/50se7WW88PmujAJqhj7cmE?si=eace6536010d4f9b';

/* ── Slide data ──────────────────────────────────────────── */
const INTRO_CALL = 'https://cal.com/william-mulvaney-s0q4fq/introwithwill3';
const COMEDY_IG = 'https://www.instagram.com/will.m.comedy/';

// Workshop popup comes down on its own once the event is over
const WORKSHOP_ENDS = new Date('2026-10-17T15:00:00-05:00');

const slides = [
  {
    id: 'about',
    kicker: 'Engineer · Coach · Podcaster',
    titleLines: ['William', 'Mulvaney'],
    bio: 'Trying to build a better life, which sometimes means doing hard things. Right now that means podcasting, coaching, and, more recently, stand-up comedy.',
    cta: { label: 'Join the Community', href: 'https://www.skool.com/grooves-8558' },
    card: { label: 'About' },
    bg: { type: 'video' },
  },
  {
    id: 'coaching',
    kicker: 'Men\'s Coaching · Dating · Fitness · Discipline',
    titleLines: ['Let\'s', 'Work.'],
    bio: 'Private 1-on-1 coaching for men in their 20s and 30s ready to build from the ground up. My clients tend to focus on dating, fitness, and staying disciplined in general. Feel free to book an intro call to learn more.',
    cta: { label: 'Book a 1-1 Intro', href: INTRO_CALL },
    ctaSecondary: { label: 'Dating Workshop', href: '/workshop/' },
    card: { label: 'Coaching' },
    bg: {
      type: 'image',
      src: '/contact.jpeg',
      style: {
        backgroundSize: 'auto 150%',
        backgroundPosition: '80% top',
        backgroundRepeat: 'no-repeat',
        filter: 'brightness(1.05) grayscale(0)',
      },
    },
  },
  {
    id: 'podcast',
    kicker: 'The Willpower Podcast',
    titleLines: ['The', 'Podcast'],
    bio: 'Raw conversations about discipline, entrepreneurship, and building a life you\'re proud of. New episodes drop every week on Spotify and Apple Podcasts.',
    cta: { label: 'Listen Now', href: SPOTIFY_SHOW },
    card: { label: 'Podcast' },
    bg: { type: 'studio' },
  },
  {
    id: 'standup',
    kicker: 'Stand-up · Open Mics',
    titleLines: ['Stand-', 'Up.'],
    bio: 'I\'m a brand new open mic\'er. I started doing stand-up to see what happens when I get on stage with five minutes and a few jokes. Some sets go well, some don\'t.',
    cta: { label: 'Follow @will.m.comedy', href: COMEDY_IG },
    card: { label: 'Stand-up' },
    bg: {
      type: 'image',
      src: '/standup.jpg',
      style: {
        // Portrait photo: fit the height so the head and mic stay in frame
        backgroundSize: 'auto 100%',
        backgroundPosition: 'right top',
        backgroundRepeat: 'no-repeat',
        filter: 'brightness(0.9)',
      },
    },
  },
  {
    id: 'writing',
    kicker: 'Essays on Discipline & Purpose',
    titleLines: ['Substack', 'Essays'],
    bio: 'Long-form writing on the systems behind high performance, entrepreneurship, and living with intention. Subscribe free — paid tier for those who want to go deeper.',
    cta: { label: 'Read the Newsletter', href: 'https://williammulvaney.substack.com' },
    card: { label: 'Writing' },
    bg: { type: 'desk' },
  },
  {
    id: 'community',
    kicker: 'The Grooves Community',
    titleLines: ['Join the', 'Community'],
    bio: 'A private group for people building better habits, sharing what\'s working, and holding each other accountable. Free to join — show up and do the work.',
    cta: { label: 'Join on Skool', href: 'https://www.skool.com/grooves-8558' },
    ctaSecondary: { label: 'Austin Events', href: 'https://luma.com/willpower_lifestyle' },
    card: { label: 'Community' },
    bg: {
      type: 'image',
      src: '/community.png',
      style: {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'brightness(0.7) grayscale(0.2)',
      },
    },
  },
];

const PODCAST_INDEX = slides.findIndex(s => s.id === 'podcast');

/* ── Social links ────────────────────────────────────────── */
const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/willpower_lifestyle',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/william-mulvaney',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: 'Spotify',
    href: SPOTIFY_SHOW,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@willpower_lifestyle',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
];
const WRITING_INDEX = slides.findIndex(s => s.id === 'writing');

/* ── Looping side list ───────────────────────────────────── */
// Drifts upward on its own; hovering pauses it and the wheel scrolls it by hand.
// Children are rendered twice, so wrapping at half the height is seamless.
function LoopingList({ visible, speed, className, children }) {
  const ref = useRef(null);
  const holdRef = useRef(false);
  const releaseRef = useRef(null);

  useEffect(() => {
    if (!visible) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;
    let last = performance.now();
    let pos = ref.current ? ref.current.scrollTop : 0;

    const tick = (now) => {
      const el = ref.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (el) {
        if (holdRef.current || reduceMotion) pos = el.scrollTop;
        else pos += speed * dt;
        const half = el.scrollHeight / 2;
        if (half > 0) {
          if (pos >= half) pos -= half;
          if (pos <= 0) pos += half;
        }
        el.scrollTop = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, speed]);

  useEffect(() => () => clearTimeout(releaseRef.current), []);

  const hold = () => { clearTimeout(releaseRef.current); holdRef.current = true; };
  const release = (delay = 0) => {
    clearTimeout(releaseRef.current);
    releaseRef.current = setTimeout(() => { holdRef.current = false; }, delay);
  };

  return (
    <div
      ref={ref}
      className={`vignelli-bg-scroll ${className} ${visible ? 'is-visible' : ''}`}
      onMouseEnter={hold}
      onMouseLeave={() => release()}
      onTouchStart={hold}
      onTouchEnd={() => release(2500)}
    >
      <div className="vignelli-bg-scroll-inner">
        {children}
        {children}
      </div>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────── */
export default function TestPage() {
  const [activeIndex,  setActiveIndex]  = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [phase,        setPhase]        = useState('idle');
  const [episodes,       setEpisodes]       = useState([]);
  const [articles,       setArticles]       = useState([]);
  const [showToast,      setShowToast]      = useState(() => new Date() < WORKSHOP_ENDS);
  const [showStackModal, setShowStackModal] = useState(false);
  const [stackEmail,     setStackEmail]     = useState('');
  const [stackSubmitted, setStackSubmitted] = useState(false);
  const [stackLoading,   setStackLoading]   = useState(false);
  const [stackError,     setStackError]     = useState('');
  const [newsletterEmail,     setNewsletterEmail]     = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterLoading,   setNewsletterLoading]   = useState(false);
  const [newsletterError,     setNewsletterError]     = useState('');
  const trackRef   = useRef(null);
  const timerRef   = useRef(null);
  const navigateRef = useRef(null);

  // Fetch podcast episodes from RSS feed
  useEffect(() => {
    fetch('https://anchor.fm/s/f40349c8/podcast/rss')
      .then(r => r.text())
      .then(text => {
        const xml = new DOMParser().parseFromString(text, 'application/xml');
        const items = Array.from(xml.getElementsByTagName('item'));
        setEpisodes(items.map(item => ({
          title: item.getElementsByTagName('title')[0]?.textContent || '',
          pubDate: (() => {
            const d = new Date(item.getElementsByTagName('pubDate')[0]?.textContent || '');
            return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          })(),
        })));
      })
      .catch(() => {}); // silent fail — episode scroll is purely decorative
  }, []);

  // Fetch Substack articles
  useEffect(() => {
    fetch(`/substack-feed.json?ts=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(payload => {
        const items = Array.isArray(payload.articles) ? payload.articles : [];
        setArticles(items);
      })
      .catch(() => {});
  }, []);

  const selectSlide = (i) => {
    // No mid-transition lock: if a timer never fires (e.g. a hot reload), the tabs would freeze for good
    if (i === activeIndex) return;

    setActiveIndex(i);
    setPhase('exiting');
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setVisibleIndex(i);
      setPhase('entering');
      timerRef.current = setTimeout(() => setPhase('idle'), 480);
    }, 290);

    const card = trackRef.current?.children[i];
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Keep a ref to the latest navigate function so the wheel listener
  // never goes stale without re-registering
  navigateRef.current = (dir) => {
    const next = dir > 0
      ? Math.min(slides.length - 1, activeIndex + 1)
      : Math.max(0, activeIndex - 1);
    selectSlide(next);
  };

  // Scroll wheel → slide navigation (registered once)
  useEffect(() => {
    const cooldown = { t: 0 };
    const onWheel = (e) => {
      // Wheel over an episode/essay list scrolls the list, not the slides
      if (e.target instanceof Element && e.target.closest('.vignelli-bg-scroll.is-visible')) return;
      const now = Date.now();
      if (now - cooldown.t < 750) return;   // one slide per scroll gesture
      if (Math.abs(e.deltaY) < 15) return;  // ignore tiny trackpad nudges
      cooldown.t = now;
      navigateRef.current(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Open stack modal via URL hash (#willpower)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#willpower') setShowStackModal(true);
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Escape closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setShowStackModal(false);
    };
    if (showStackModal) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showStackModal]);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setNewsletterLoading(true);
    setNewsletterError('');
    try {
      const res = await fetch('https://api.convertkit.com/v3/forms/9627178/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: '3eosTgIXLwC5r9lGfyoqnw', email: newsletterEmail }),
      });
      const data = await res.json();
      console.log('Kit response:', res.status, data);
      if (!res.ok) throw new Error();
      setNewsletterSubmitted(true);
    } catch {
      setNewsletterError('Something went wrong — please try again.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleStackSubmit = async (e) => {
    e.preventDefault();
    setStackLoading(true);
    setStackError('');
    try {
      const res = await fetch('https://api.convertkit.com/v3/sequences/2810762/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: '3eosTgIXLwC5r9lGfyoqnw',
          email: stackEmail,
        }),
      });
      if (!res.ok) throw new Error();
      setStackSubmitted(true);
      setTimeout(() => {
        setShowStackModal(false);
        setStackSubmitted(false);
        setStackEmail('');
        setShowToast(false);
      }, 2500);
    } catch {
      setStackError('Something went wrong — please try again.');
    } finally {
      setStackLoading(false);
    }
  };

  const slide = slides[visibleIndex];
  const heroClass = [
    'vignelli-hero-content',
    phase === 'exiting'  ? 'is-exiting'  : '',
    phase === 'entering' ? 'is-entering' : '',
  ].filter(Boolean).join(' ');

  const podcastScrollVisible = activeIndex === PODCAST_INDEX;

  return (
    <div className="vignelli-page">

      {/* ── Backgrounds ── */}
      <div className="vignelli-bg" aria-hidden="true">
        {slides.map((s, i) => {
          const isActive = i === activeIndex;
          if (s.bg.type === 'video') {
            return (
              <video
                key={s.id}
                className={`vignelli-bg-video ${isActive ? 'is-visible' : ''}`}
                autoPlay muted loop playsInline
              >
                <source src="/hero-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
                <source src="/hero.mp4" type="video/mp4" />
              </video>
            );
          }
          if (s.bg.type === 'studio') {
            return (
              <div key={s.id} className={`vignelli-bg-layer vignelli-studio ${isActive ? 'is-visible' : ''}`}>
                <div className="vignelli-studio-glow" />
                <div className="vignelli-vinyl">
                  <img src="/podcast-label.jpg" alt="" className="vignelli-vinyl-label" />
                </div>
                <div className="vignelli-on-air"><span className="vignelli-on-air-dot" />On Air</div>
                <div className="vignelli-eq">
                  {Array.from({ length: 48 }, (_, n) => (
                    <span key={n} style={{ animationDelay: `${-((n * 137) % 1100)}ms`, animationDuration: `${700 + ((n * 61) % 600)}ms` }} />
                  ))}
                </div>
              </div>
            );
          }
          if (s.bg.type === 'desk') {
            return (
              <div key={s.id} className={`vignelli-bg-layer vignelli-desk ${isActive ? 'is-visible' : ''}`}>
                <div className="vignelli-desk-glow" />
                <div className="vignelli-paper">
                  <span className="vignelli-paper-heading" />
                  {[92, 100, 84, 97, 100, 61, 0, 95, 100, 88, 74].map((w, n) => (
                    <span
                      key={n}
                      className="vignelli-paper-line"
                      style={{ '--w': `${w}%`, animationDelay: `${n * 420}ms` }}
                    />
                  ))}
                  <span className="vignelli-paper-caret" />
                </div>
              </div>
            );
          }
          return (
            <div
              key={s.id}
              className={`vignelli-bg-layer vignelli-bg-layer--${s.id} ${isActive ? 'is-visible' : ''}`}
              style={s.bg.type === 'image'
                ? { backgroundImage: `url(${s.bg.src})`, ...s.bg.style }
                : s.bg.style
              }
            />
          );
        })}
        <div className="vignelli-overlay" />
      </div>

      {/* ── Podcast episode scroll (right-side column) ── */}
      {episodes.length > 0 && (
        <LoopingList visible={podcastScrollVisible} speed={24} className="vignelli-side-scroll">
          {episodes.map((ep, i) => (
            <a
              key={i}
              href={SPOTIFY_SHOW}
              target="_blank"
              rel="noopener noreferrer"
              className="vignelli-bg-scroll-item"
              tabIndex={podcastScrollVisible ? 0 : -1}
            >
              <span className="vignelli-bg-scroll-title">{ep.title}</span>
              {ep.pubDate && <span className="vignelli-bg-scroll-date">{ep.pubDate}</span>}
            </a>
          ))}
        </LoopingList>
      )}

      {/* ── Substack essay scroll (right-side column) ── */}
      {articles.length > 0 && (
        <LoopingList visible={activeIndex === WRITING_INDEX} speed={24} className="vignelli-side-scroll vignelli-essay-scroll">
          {articles.map((a, i) => (
            <a
              key={i}
              href={a.link || 'https://williammulvaney.substack.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="vignelli-bg-scroll-item"
              tabIndex={activeIndex === WRITING_INDEX ? 0 : -1}
            >
              <span className="vignelli-bg-scroll-title">{a.title}</span>
              {a.pubDate && <span className="vignelli-bg-scroll-date">{a.pubDate}</span>}
            </a>
          ))}
        </LoopingList>
      )}

      {/* ── Nav ── */}
      <nav className="vignelli-nav">
        <Link to="/" className="vignelli-logo-link" aria-label="Home">
          <img src={logo} alt="Willpower" className="vignelli-logo-img" />
        </Link>
        <div className="vignelli-social-strip" aria-label="Social links">
          {socialLinks.map(({ label, href, icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="vignelli-social-link" aria-label={label}>
              {icon}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Hero text ── */}
      <div className="vignelli-hero">
        <div className={heroClass}>
          <p className="vignelli-kicker">{slide.kicker}</p>
          <h1 className="vignelli-name">
            {slide.titleLines.map((line, i) => (
              <span key={i} className="vignelli-name-line">{line}</span>
            ))}
          </h1>
          <p className="vignelli-bio">{slide.bio}</p>
          <div className="vignelli-cta-group">
            {slide.id === 'about' ? (
              newsletterSubmitted ? (
                <p className="vignelli-newsletter-success">You're in. Check your inbox.</p>
              ) : (
                <form className="vignelli-newsletter-form" onSubmit={handleNewsletterSubmit}>
                  <input
                    className="vignelli-newsletter-input"
                    type="email"
                    placeholder="your@email.com"
                    value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="vignelli-newsletter-btn" disabled={newsletterLoading}>
                    {newsletterLoading ? '…' : 'Follow Along'}
                  </button>
                  {newsletterError && <p className="vignelli-newsletter-error">{newsletterError}</p>}
                </form>
              )
            ) : (
              <a
                href={slide.cta.href}
                className="vignelli-cta"
                target={slide.cta.href.startsWith('http') ? '_blank' : undefined}
                rel={slide.cta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {slide.cta.label} ›
              </a>
            )}
            {slide.ctaSecondary && (
              <a
                href={slide.ctaSecondary.href}
                className="vignelli-cta-secondary"
                target={slide.ctaSecondary.href.startsWith('http') ? '_blank' : undefined}
                rel={slide.ctaSecondary.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {slide.ctaSecondary.label} ›
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Right timeline ── */}
      <div className="vignelli-timeline" aria-hidden="true">
        {slides.map((s, i) => (
          <div key={s.id} className={`vignelli-milestone ${i === activeIndex ? 'is-active' : ''}`}>
            <span className="vignelli-milestone-label">{s.card.label}</span>
            <span className="vignelli-tick" />
          </div>
        ))}
      </div>

      {/* ── Bottom selector ── */}
      <div className="vignelli-selector">
        <div className="vignelli-selector-track" ref={trackRef}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={`vignelli-sel-card vignelli-sel-card--${s.id} ${i === activeIndex ? 'is-active' : ''}`}
              onClick={() => selectSlide(i)}
              aria-label={`View ${s.card.label}`}
              aria-current={i === activeIndex ? 'true' : undefined}
            >
              <span className="vignelli-sel-label">{s.card.label}</span>
              <span className="vignelli-sel-indicator" />
            </button>
          ))}
        </div>

      </div>


      {/* ── Workshop toast ── */}
      {showToast && (
        <div className="vignelli-toast">
          <button className="vignelli-toast-close" onClick={() => setShowToast(false)} aria-label="Dismiss">×</button>
          <p className="vignelli-toast-kicker">Live · Sat, Oct 17 · 1 PM CT</p>
          <p className="vignelli-toast-heading">Dating Discipline Workshop</p>
          <p className="vignelli-toast-sub">A 2-hour workshop to change your dating life in 90 days.</p>
          <a className="vignelli-toast-btn" href="/workshop/">
            Save a Seat ›
          </a>
        </div>
      )}

      {/* ── Willpower Stack email modal ── */}
      {showStackModal && (
        <div className="vignelli-form-backdrop" onClick={() => setShowStackModal(false)}>
          <div className="vignelli-form-modal" onClick={e => e.stopPropagation()}>
            <button className="vignelli-form-close" onClick={() => setShowStackModal(false)} aria-label="Close">×</button>
            {stackSubmitted ? (
              <div className="vignelli-form-success">
                <p className="vignelli-form-kicker">You're in</p>
                <h2 className="vignelli-form-heading">Check your<br />inbox.</h2>
              </div>
            ) : (
              <>
                <p className="vignelli-form-kicker">Free Walkthrough</p>
                <h2 className="vignelli-form-heading">The Fundamental<br />Willpower Stack</h2>
                <p className="vignelli-form-stack-sub">I built a sequence that I can <em>almost</em> guarantee will noticeably increase your willpower in the span of 10 days. Give it a try and let me know what you think.</p>
                <form className="vignelli-form" onSubmit={handleStackSubmit}>
                  <div className="vignelli-newsletter-form">
                    <input
                      className="vignelli-newsletter-input"
                      type="email"
                      placeholder="your@email.com"
                      value={stackEmail}
                      onChange={e => setStackEmail(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="vignelli-newsletter-btn"
                      disabled={stackLoading}
                    >
                      {stackLoading ? '…' : 'Start Now'}
                    </button>
                  </div>
                  {stackError && <p className="vignelli-form-error">{stackError}</p>}
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
