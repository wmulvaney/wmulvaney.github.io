import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../resources/wmulvaney.github.io.svg';
import './TestPage.css';

const SPOTIFY_SHOW = 'https://open.spotify.com/show/50se7WW88PmujAJqhj7cmE?si=eace6536010d4f9b';

/* ── Slide data ──────────────────────────────────────────── */
const slides = [
  {
    id: 'about',
    kicker: 'Engineer · Entrepreneur · Podcaster',
    titleLines: ['William', 'Mulvaney'],
    bio: 'Building habit systems, documenting the journey, and sharing actionable stories about discipline, technology, and personal performance.',
    cta: { label: 'Join the Community', href: 'https://www.skool.com/grooves-8558' },
    card: { label: 'About' },
    bg: { type: 'video' },
  },
  {
    id: 'podcast',
    kicker: 'The Willpower Podcast',
    titleLines: ['The', 'Podcast'],
    bio: 'Raw conversations about discipline, entrepreneurship, and building a life you\'re proud of. New episodes drop every week on Spotify and Apple Podcasts.',
    cta: { label: 'Listen Now', href: SPOTIFY_SHOW },
    card: { label: 'Podcast' },
    bg: {
      type: 'image',
      src: '/1429109-200.png',
      style: {
        backgroundSize: '55% auto',
        backgroundPosition: '82% center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#06101a',
        filter: 'brightness(0.62) grayscale(0.25)',
      },
    },
  },
  {
    id: 'grooves',
    kicker: 'Habit Tracking, Reimagined',
    titleLines: ['Grooves', 'App'],
    bio: 'AI-powered habit tracking that learns what actually works for you. Discover patterns, optimize your days, and build systems that stick — starting from where you are now.',
    cta: { label: 'Try Grooves Free', href: 'https://mygrooves.app?source=will' },
    card: { label: 'Grooves' },
    bg: {
      type: 'image',
      src: '/phones.png',
      style: {
        backgroundSize: 'auto 90%',
        backgroundPosition: '88% 105%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#040d18',
        filter: 'brightness(0.78)',
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
    bg: {
      type: 'gradient',
      style: {
        background: 'radial-gradient(ellipse 70% 90% at 78% 50%, #0d2236 0%, #03080f 65%)',
      },
    },
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
  {
    id: 'coaching',
    kicker: 'Men\'s Coaching · Dating · Fitness · Self-Expression',
    titleLines: ['Build Your', 'Life.'],
    bio: 'Private 1-on-1 coaching for men in their 20s and 30s ready to build from the ground up. We focus on the three pillars that actually move the needle: fitness, dating, and self-expression. Work on these long enough and who you are on the inside starts matching who you show up as in every room.',
    cta: { label: "Let's Talk", href: '#' },
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
    href: 'https://youtube.com/@willpowerlifestyle',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
];
const WRITING_INDEX = slides.findIndex(s => s.id === 'writing');

/* ── Component ───────────────────────────────────────────── */
export default function TestPage() {
  const [activeIndex,  setActiveIndex]  = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [phase,        setPhase]        = useState('idle');
  const [episodes,       setEpisodes]       = useState([]);
  const [articles,       setArticles]       = useState([]);
  const [showContact,    setShowContact]    = useState(false);
  const [formData,       setFormData]       = useState({ name: '', email: '', message: '' });
  const [formSubmitted,  setFormSubmitted]  = useState(false);
  const [formLoading,    setFormLoading]    = useState(false);
  const [formError,      setFormError]      = useState('');
  const [showToast,      setShowToast]      = useState(true);
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
    if (i === activeIndex || phase !== 'idle') return;

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
      if (e.key === 'Escape') { setShowContact(false); setShowStackModal(false); }
    };
    if (showContact || showStackModal) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showContact, showStackModal]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('https://formsubmit.co/ajax/w.mulvaney00@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: `Message from ${formData.name} — williammulvaney.com`,
          _captcha: 'false',
        }),
      });
      if (!res.ok) throw new Error('Send failed');
      setFormSubmitted(true);
      setTimeout(() => {
        setShowContact(false);
        setFormSubmitted(false);
        setFormData({ name: '', email: '', message: '' });
      }, 2500);
    } catch {
      setFormError('Something went wrong — please try again.');
    } finally {
      setFormLoading(false);
    }
  };

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

      {/* ── Podcast episode scroll (right-side background) ── */}
      {episodes.length > 0 && (
        <div
          className={`vignelli-bg-scroll ${podcastScrollVisible ? 'is-visible' : ''}`}
          aria-hidden="true"
        >
          <div className="vignelli-bg-scroll-inner">
            {/* Duplicate list for seamless loop: scroll -50% = exactly one list height */}
            {[...episodes, ...episodes].map((ep, i) => (
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
          </div>
        </div>
      )}

      {/* ── Substack essay scroll (writing slide background) ── */}
      {articles.length > 0 && (
        <div
          className={`vignelli-bg-scroll vignelli-essay-scroll ${activeIndex === WRITING_INDEX ? 'is-visible' : ''}`}
          aria-hidden="true"
        >
          <div className="vignelli-bg-scroll-inner">
            {[...articles, ...articles].map((a, i) => (
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
          </div>
        </div>
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
            ) : slide.id === 'coaching' ? (
              <button className="vignelli-cta" onClick={() => setShowContact(true)}>
                {slide.cta.label} ›
              </button>
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
                target="_blank"
                rel="noopener noreferrer"
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


      {/* ── Contact form modal ── */}
      {showContact && (
        <div className="vignelli-form-backdrop" onClick={() => setShowContact(false)}>
          <div className="vignelli-form-modal" onClick={e => e.stopPropagation()}>
            <button className="vignelli-form-close" onClick={() => setShowContact(false)} aria-label="Close">×</button>

            {formSubmitted ? (
              <div className="vignelli-form-success">
                <p className="vignelli-form-kicker">Message sent</p>
                <h2 className="vignelli-form-heading">Talk soon.</h2>
              </div>
            ) : (
              <>
                <p className="vignelli-form-kicker">Get in Touch</p>
                <h2 className="vignelli-form-heading">Say<br />Hello.</h2>
                <form className="vignelli-form" onSubmit={handleFormSubmit}>
                  <div className="vignelli-form-field">
                    <label className="vignelli-form-label">Name</label>
                    <input
                      className="vignelli-form-input"
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="vignelli-form-field">
                    <label className="vignelli-form-label">Email</label>
                    <input
                      className="vignelli-form-input"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="vignelli-form-field">
                    <label className="vignelli-form-label">Message</label>
                    <textarea
                      className="vignelli-form-textarea"
                      placeholder="What's on your mind?"
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                      required
                    />
                  </div>
                  {formError && (
                    <p className="vignelli-form-error">{formError}</p>
                  )}
                  <button
                    type="submit"
                    className="vignelli-cta vignelli-form-submit"
                    disabled={formLoading}
                  >
                    {formLoading ? 'Sending…' : 'Send Message ›'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Willpower Stack toast ── */}
      {showToast && (
        <div className="vignelli-toast">
          <button className="vignelli-toast-close" onClick={() => setShowToast(false)} aria-label="Dismiss">×</button>
          <p className="vignelli-toast-heading">The Fundamental Willpower Stack</p>
          <p className="vignelli-toast-sub">10 days to noticeably higher willpower.</p>
          <button className="vignelli-toast-btn" onClick={() => setShowStackModal(true)}>Free Walkthrough ›</button>
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
