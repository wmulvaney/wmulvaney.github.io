import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMicrophone, faEnvelope, faBook, faArrowRight, faMobileScreenButton, faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faLinkedin, faSpotify, faYoutube } from '@fortawesome/free-brands-svg-icons';
import logo from './resources/wmulvaney.github.io.svg';
import spotifyLogo from './resources/spotify_default.png';
import AboutMe from './components/AboutMe';
import PodcastFeed from './components/PodcastFeed';
import SubstackFeed from './components/SubstackFeed';
import EventFeed from './components/EventFeed';
import PersistentPlayer from './components/PersistentPlayer';
import ReadingList from './components/ReadingList';
import Business from './components/Business';
import ContactForm from './components/ContactForm';
import TestPage from './components/TestPage';
import BookPage from './components/BookPage';
import './styles/Dashboard.css';

const heroMetrics = [
  { label: 'Episodes', value: '100+' },
  { label: 'Installs', value: '400+' },
  { label: 'Failed startups', value: '5' }
];

const oldWaySteps = [
  {
    title: 'Copy habits',
    body: 'Try what works for someone else'
  },
  {
    title: 'Stay consistent',
    body: 'Force yourself to stick to it'
  },
  {
    title: 'Hope it works',
    body: 'Maybe you’ll feel better'
  }
];

const groovesMethodSteps = [
  {
    title: 'Start where you are',
    body: 'AI understands your habits, history, and goals, then quick daily check-ins create a real signal'
  },
  {
    title: 'Learn what works',
    body: 'Connect behaviors to how you feel over time'
  },
  {
    title: 'Optimize and repeat',
    body: 'Add, remove, and adjust habits based on real results so your system gets sharper over time'
  }
];

const platformLinks = [
  {
    label: 'Grooves',
    href: 'https://mygrooves.app',
    icon: '/grooves.png'
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@willpower_lifestyle',
    icon: '/youtube.png'
  },
  {
    label: 'Spotify',
    href: 'https://open.spotify.com/show/50se7WW88PmujAJqhj7cmE?si=eace6536010d4f9b',
    icon: spotifyLogo
  }
];

const roleRibbon = new Array(8).fill('Engineer').flatMap((role) => [role, 'Entrepreneur', 'Podcaster']).join('  |  ');

const pageMeta = {
  default: {
    title: 'William Mulvaney | Official Site',
    description: 'Stories about willpower, discipline, creative work, business building, and events.',
    ogTitle: 'William Mulvaney | Entrepreneur & Podcaster',
    ogDescription: 'Podcast, newsletter, business, reading, events, and contact in one page.',
    image: '/willpower_logo.svg'
  }
};

const PageTitle = () => {
  const location = useLocation();
  const baseUrl = 'https://williammulvaney.com';
  const currentUrl = `${baseUrl}${location.pathname}`;
  const meta = pageMeta[location.pathname] || pageMeta.default;
  const image = `${baseUrl}${meta.image}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'William Mulvaney',
    url: baseUrl,
    sameAs: [
      'https://www.linkedin.com/in/william-mulvaney',
      'https://www.instagram.com/willpower_lifestyle/',
      'https://www.youtube.com/@willpower_lifestyle'
    ],
    jobTitle: 'Entrepreneur and Podcast Host',
    image,
    description: meta.description
  };

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={meta.ogTitle} />
      <meta property="og:description" content={meta.ogDescription} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={meta.ogTitle} />
      <meta name="twitter:description" content={meta.ogDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@willpower_lifestyle" />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

const homeSectionLinks = [
  { id: 'home', label: 'Home', icon: faHome },
  { id: 'grooves', label: 'Grooves', icon: faMobileScreenButton },
  { id: 'podcast', label: 'Podcast', icon: faMicrophone },
  { id: 'community', label: 'Community', icon: faEnvelope },
  { id: 'personal', label: 'Personal', icon: faBook }
];

const desktopSectionIds = ['home', 'grooves', 'podcast', 'community', 'personal'];

const getAbsoluteTop = (node) => {
  let current = node;
  let top = 0;

  while (current) {
    top += current.offsetTop || 0;
    current = current.offsetParent;
  }

  return top;
};

const scrollToSectionById = (sectionId, behavior = 'smooth') => {
  if (typeof window === 'undefined') {
    return;
  }

  const section = document.getElementById(sectionId);
  if (!section) {
    return;
  }

  const header = document.querySelector('.hero-header');
  const headerOffset = header ? header.getBoundingClientRect().height : 0;

  window.scrollTo({
    top: Math.max(0, getAbsoluteTop(section) - headerOffset),
    behavior
  });
};

const ScrollManager = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        requestAnimationFrame(() => {
          scrollToSectionById(location.hash.slice(1), 'smooth');
          window.setTimeout(() => {
            scrollToSectionById(location.hash.slice(1), 'auto');
          }, 260);
        });
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return null;
};

const Navigation = ({ activeSection = 'home', onNavigate }) => {
  const location = useLocation();

  return (
    <nav className="site-nav" aria-label="Primary">
      {homeSectionLinks.map((item) => (
        <Link
          key={item.id}
          to={`/#${item.id}`}
          className={`nav-pill ${location.pathname === '/' && activeSection === item.id ? 'active' : ''}`}
          onClick={(event) => {
            if (location.pathname === '/') {
              event.preventDefault();
              window.history.replaceState(null, '', `/#${item.id}`);
              scrollToSectionById(item.id, 'smooth');
            }

            onNavigate?.();
          }}
        >
          <FontAwesomeIcon icon={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

const SocialLinks = () => {
  const links = [
    { icon: faYoutube, href: 'https://www.youtube.com/@willpower_lifestyle' },
    { icon: faSpotify, href: 'https://open.spotify.com/show/50se7WW88PmujAJqhj7cmE?si=eace6536010d4f9b' },
    { icon: faLinkedin, href: 'https://www.linkedin.com/in/william-mulvaney' },
    { icon: faInstagram, href: 'https://www.instagram.com/willpower_lifestyle/' }
  ];

  return (
    <div className="social-bar">
      {links.map((link) => (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer" aria-label={link.href}>
          <FontAwesomeIcon icon={link.icon} />
        </a>
      ))}
    </div>
  );
};

const StorySection = ({ id, number, label, title, description, actions, children, className = '' }) => (
  <section id={id} className={`story-section ${className}`}>
    <div className="story-rail">
      <div className="story-rail-inner">
        <p className="story-number">{number}</p>
        <p className="story-label">{label}</p>
        <h2>{title}</h2>
        {description && <p className="story-description">{description}</p>}
        {actions && <div className="story-actions">{actions}</div>}
      </div>
    </div>
    <div className="story-panel">
      <div className="story-panel-inner">{children}</div>
    </div>
  </section>
);

const StepCard = ({ variant, index, title, body }) => (
  <article className={`method-step method-step-${variant}`}>
    <span className="method-step-number">{String(index + 1).padStart(2, '0')}</span>
    <h4>{title}</h4>
    <p>{body}</p>
  </article>
);

const SectionObserver = ({ onActiveChange, suspendRef }) => {
  useEffect(() => {
    const sections = homeSectionLinks
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (suspendRef?.current) {
          return;
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          onActiveChange?.(visible.target.id);
          window.history.replaceState(null, '', `/#${visible.target.id}`);
        }
      },
      {
        rootMargin: '-18% 0px -42% 0px',
        threshold: [0.2, 0.4, 0.6, 0.8]
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [onActiveChange, suspendRef]);

  return null;
};

const FullPageScrollManager = ({ activeSection, onActiveChange, suspendObserverRef }) => {
  const activeIndexRef = useRef(Math.max(0, desktopSectionIds.indexOf(activeSection)));
  const lockedRef = useRef(false);
  const animationDoneRef = useRef(true);
  const wheelSettledRef = useRef(true);
  const wheelDeltaRef = useRef(0);
  const gestureConsumedRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const animationTimerRef = useRef(null);
  const settleTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const onActiveChangeRef = useRef(onActiveChange);
  const touchStartYRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchBlockedRef = useRef(false);

  useEffect(() => {
    activeIndexRef.current = Math.max(0, desktopSectionIds.indexOf(activeSection));
  }, [activeSection]);

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  }, [onActiveChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const getSections = () =>
      desktopSectionIds
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    const isDesktopMode = () => window.innerWidth > 768;
    const isMobileMode = () => window.innerWidth <= 768;

    const scrollToIndex = (nextIndex) => {
      const sections = getSections();
      if (!sections.length) {
        return;
      }

      const clampedIndex = Math.max(0, Math.min(nextIndex, sections.length - 1));
      if (clampedIndex === activeIndexRef.current) {
        return;
      }

      lockedRef.current = true;
      cooldownUntilRef.current = Date.now() + 2400;
      if (suspendObserverRef) {
        suspendObserverRef.current = true;
      }
      animationDoneRef.current = false;
      wheelSettledRef.current = false;
      wheelDeltaRef.current = 0;
      gestureConsumedRef.current = true;
      activeIndexRef.current = clampedIndex;
      onActiveChangeRef.current?.(sections[clampedIndex].id);
      scrollToSectionById(sections[clampedIndex].id, 'smooth');
      window.history.replaceState(null, '', `/#${sections[clampedIndex].id}`);
      window.clearTimeout(animationTimerRef.current);
      animationTimerRef.current = window.setTimeout(() => {
        animationDoneRef.current = true;
        if (wheelSettledRef.current) {
          lockedRef.current = false;
        }
      }, 2050);

      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = window.setTimeout(() => {
        if (suspendObserverRef) {
          suspendObserverRef.current = false;
        }
      }, 2200);
    };

    const onWheel = (event) => {
      if (!isDesktopMode()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (Math.abs(event.deltaY) < 2) {
        return;
      }

      if (Date.now() < cooldownUntilRef.current) {
        return;
      }

      wheelSettledRef.current = false;
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        wheelSettledRef.current = true;
        wheelDeltaRef.current = 0;
        gestureConsumedRef.current = false;
        if (animationDoneRef.current) {
          lockedRef.current = false;
        }
      }, 300);

      if (lockedRef.current) {
        return;
      }

      if (gestureConsumedRef.current) {
        return;
      }

      wheelDeltaRef.current += event.deltaY;

      if (Math.abs(wheelDeltaRef.current) < 34) {
        return;
      }

      gestureConsumedRef.current = true;
      scrollToIndex(activeIndexRef.current + (wheelDeltaRef.current > 0 ? 1 : -1));
    };

    const onKeyDown = (event) => {
      if (!isDesktopMode() || lockedRef.current || Date.now() < cooldownUntilRef.current) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        scrollToIndex(activeIndexRef.current + 1);
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        scrollToIndex(activeIndexRef.current - 1);
      }

      if (event.key === 'Home') {
        event.preventDefault();
        scrollToIndex(0);
      }

      if (event.key === 'End') {
        event.preventDefault();
        scrollToIndex(desktopSectionIds.length - 1);
      }
    };

    const shouldIgnoreTouchPaging = (target) => {
      if (!(target instanceof Element)) {
        return false;
      }

      return Boolean(
        target.closest('.books-grid-compact') ||
        target.closest('.contact-modal') ||
        target.closest('input, textarea, select, button, a')
      );
    };

    const onTouchStart = (event) => {
      if (!isMobileMode() || shouldIgnoreTouchPaging(event.target)) {
        touchStartYRef.current = null;
        touchStartXRef.current = null;
        touchBlockedRef.current = false;
        return;
      }

      if (event.touches.length !== 1) {
        return;
      }

      touchStartYRef.current = event.touches[0].clientY;
      touchStartXRef.current = event.touches[0].clientX;
      touchBlockedRef.current = false;
    };

    const onTouchMove = (event) => {
      if (!isMobileMode() || touchStartYRef.current === null || touchStartXRef.current === null) {
        return;
      }

      const deltaY = event.touches[0].clientY - touchStartYRef.current;
      const deltaX = event.touches[0].clientX - touchStartXRef.current;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        touchBlockedRef.current = true;
        return;
      }

      if (Math.abs(deltaY) > 14 && !lockedRef.current) {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event) => {
      if (!isMobileMode() || touchStartYRef.current === null || touchBlockedRef.current) {
        touchStartYRef.current = null;
        touchStartXRef.current = null;
        touchBlockedRef.current = false;
        return;
      }

      if (lockedRef.current || Date.now() < cooldownUntilRef.current) {
        touchStartYRef.current = null;
        touchStartXRef.current = null;
        touchBlockedRef.current = false;
        return;
      }

      const endY = event.changedTouches?.[0]?.clientY;
      const startY = touchStartYRef.current;
      const deltaY = typeof endY === 'number' ? endY - startY : 0;

      if (Math.abs(deltaY) >= 56) {
        scrollToIndex(activeIndexRef.current + (deltaY < 0 ? 1 : -1));
      }

      touchStartYRef.current = null;
      touchStartXRef.current = null;
      touchBlockedRef.current = false;
    };

    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });

    return () => {
      document.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('touchstart', onTouchStart, { capture: true });
      document.removeEventListener('touchmove', onTouchMove, { capture: true });
      document.removeEventListener('touchend', onTouchEnd, { capture: true });
      window.clearTimeout(animationTimerRef.current);
      window.clearTimeout(settleTimerRef.current);
      window.clearTimeout(cooldownTimerRef.current);
    };
  }, [suspendObserverRef]);

  return null;
};

const Home = ({ currentEpisode, handleEpisodeSelect, isPlaying, setIsPlaying, onActiveSectionChange }) => {
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const suspendObserverRef = useRef(false);

  useEffect(() => {
    onActiveSectionChange?.(activeSection);
  }, [activeSection, onActiveSectionChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    if (!isContactModalOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsContactModalOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isContactModalOpen]);

  const getDepthClass = (id) => {
    const activeIndex = desktopSectionIds.indexOf(activeSection);
    const index = desktopSectionIds.indexOf(id);

    if (index === activeIndex) {
      return 'is-active';
    }

    if (index < activeIndex) {
      return index === activeIndex - 1 ? 'is-previous' : 'is-past';
    }

    return index === activeIndex + 1 ? 'is-next' : 'is-future';
  };

  return (
  <div className="home-flow">
    <SectionObserver onActiveChange={setActiveSection} suspendRef={suspendObserverRef} />
    <FullPageScrollManager activeSection={activeSection} onActiveChange={setActiveSection} suspendObserverRef={suspendObserverRef} />
    <section id="home" className={`hero-card depth-stage ${getDepthClass('home')}`}>
      <div className="hero-video-shell" aria-hidden="true">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/hero-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="hero-copy">
        <p className="hero-kicker">Engineer · Entrepreneur · Podcaster</p>
        <h1 className="hero-title">William Mulvaney</h1>
        <p className="hero-lede">
          Building habit systems, documenting the journey, and sharing actionable stories about discipline, tech, and personal performance.
        </p>
        <div className="hero-actions">
          <Link to="/#grooves" className="hero-button primary">Try Grooves</Link>
          <Link to="/#podcast" className="hero-action-link">Hear the podcast <FontAwesomeIcon icon={faArrowRight} /></Link>
        </div>
      </div>

      <div className="hero-sidebar">
        <div className="hero-signals">
          <p className="hero-sidebar-label">Start here</p>
          <div className="platforms-row">
            {platformLinks.map((platform) => (
              <a
                key={platform.label}
                href={platform.href}
                target="_blank"
                rel="noreferrer"
                className={`platform-pill platform-pill-${platform.label.toLowerCase()}`}
              >
                {platform.icon && <img src={platform.icon} alt={platform.label} />}
                {platform.label}
              </a>
            ))}
          </div>
        </div>
        <div className="hero-metrics">
          {heroMetrics.map((metric) => (
            <div key={metric.label} className="metric">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="role-ribbon hero-ribbon" aria-hidden="true">
        <span>{roleRibbon}</span>
        <span>{roleRibbon}</span>
      </div>
    </section>

    <StorySection
      id="grooves"
      className={`depth-stage grooves-premium ${getDepthClass('grooves')}`}
      number="01"
      label="Grooves"
      title="The Grooves App"
      description="Stop guessing what works. Start seeing it. Grooves connects how you feel to what you do each day."
      actions={
        <>
          <a className="hero-button primary grooves-cta" href="https://mygrooves.app" target="_blank" rel="noreferrer">Try Grooves</a>
        </>
      }
    >
      <div className="grooves-shell">
        <section className="grooves-hero-slab">
          <div className="grooves-hero-copy">
            <h3>I built Grooves because</h3>
            <p className="grooves-pull-quote">I wanted to know what actually works for me.</p>
            <p className="feature-body">
              Not guess with new routines, new habits, and generic advice.
            </p>
          </div>
          <div className="grooves-visual" aria-hidden="true">
            <img src="/phones.png" alt="Grooves app statistics screen" className="grooves-visual-image grooves-visual-image-primary" />
          </div>
        </section>

        <section className="grooves-method-section">
          <div className="grooves-method-grid">
            <div className="method-column method-column-old">
              <div className="method-column-head">
                <h4>How most people do it</h4>
              </div>

              <div className="method-step-stack method-step-stack-old">
                {oldWaySteps.map((step, index) => (
                  <StepCard key={step.title} variant="old" index={index} title={step.title} body={step.body} />
                ))}
              </div>
            </div>

            <div className="method-column method-column-grooves">
              <div className="method-column-head">
                <h4>The Grooves Method</h4>
              </div>

              <div className="method-step-stack method-step-stack-grooves">
                {groovesMethodSteps.map((step, index) => (
                  <StepCard key={step.title} variant="grooves" index={index} title={step.title} body={step.body} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </StorySection>

    <StorySection
      id="podcast"
      className={`depth-stage podcast-section ${getDepthClass('podcast')}`}
      number="02"
      label="Podcast"
      title="Podcast and Substack"
      actions={
        <>
          <a className="text-link" href="https://open.spotify.com/show/50se7WW88PmujAJqhj7cmE?si=eace6536010d4f9b" target="_blank" rel="noreferrer">Listen on Spotify <FontAwesomeIcon icon={faArrowRight} /></a>
          <a className="text-link" href="https://williammulvaney.substack.com/" target="_blank" rel="noreferrer">Open Substack <FontAwesomeIcon icon={faArrowRight} /></a>
        </>
      }
    >
      <div className={`media-grid media-grid-stacked ${isMobileViewport ? 'media-grid-mobile-focus' : ''}`}>
        <article className={`feature-card media-feature media-feature-wide ${isMobileViewport ? 'podcast-primary-card' : ''}`}>
          <p className="mini-kicker">Latest episode</p>
          <PodcastFeed
            preview
            limit={isMobileViewport ? 1 : 2}
            currentEpisode={currentEpisode}
            setCurrentEpisode={handleEpisodeSelect}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
        </article>
        <article className={`feature-card media-feature media-feature-wide ${isMobileViewport ? 'podcast-secondary-card' : ''}`}>
          <p className="mini-kicker">{isMobileViewport ? 'Latest essays' : 'Recent essays'}</p>
          <SubstackFeed preview limit={isMobileViewport ? 2 : 4} />
        </article>
      </div>
    </StorySection>

    <StorySection
      id="community"
      className={`depth-stage community-section ${getDepthClass('community')}`}
      number="03"
      label="Community"
      title="Events, contact, and community"
      description="Where to find me live, how to reach out, and how the community stays connected around the work."
    >
      <div className="feature-stack">
        <div className="feature-card">
          <p className="mini-kicker">Events</p>
          <EventFeed preview />
        </div>
        <div className="feature-card">
          <p className="mini-kicker">Contact</p>
          <div className="contact-cta-card">
            <p>Reach out about the podcast, business, collaborations, or to leave feedback.</p>
            <button type="button" className="hero-button primary contact-modal-trigger" onClick={() => setIsContactModalOpen(true)}>
              Open Contact Form
            </button>
          </div>
        </div>
      </div>
    </StorySection>

    <StorySection
      id="personal"
      className={`depth-stage ${getDepthClass('personal')}`}
      number="04"
      label="Personal"
      title="About me and books"
      description="My background, interests, and the books I've enjoyed most."
    >
      <div className="feature-stack">
        <div className="feature-card about-card">
          <AboutMe />
        </div>
        <div className="feature-card">
          <p className="mini-kicker">Books</p>
          <ReadingList compact />
        </div>
      </div>
    </StorySection>

    {isContactModalOpen && (
      <div className="contact-modal-backdrop" onClick={() => setIsContactModalOpen(false)} role="presentation">
        <div
          className="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Contact form"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="contact-modal-close"
            aria-label="Close contact form"
            onClick={() => setIsContactModalOpen(false)}
          >
            ×
          </button>
          <ContactForm compact />
        </div>
      </div>
    )}
  </div>
  );
};

function App() {
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && currentEpisode) {
      if (isPlaying) {
        audioRef.current.play().catch((error) => console.error('Error playing audio:', error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentEpisode]);

  const handleClosePlayer = () => {
    setCurrentEpisode(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleEpisodeSelect = (episode, options = {}) => {
    setCurrentEpisode(episode);
    if (options.time !== undefined) {
      setSeekTime(options.time);
    }
    if (options.shouldPlay) {
      setIsPlaying(true);
    }
  };

  return (
    <HelmetProvider>
      <Router>
        <ScrollManager />
        <PageTitle />
        <div className="app-shell">
          <header className="hero-header">
            <div className="header-inner">
              <Link to="/" className="brand-block" aria-label="William Mulvaney Home">
                <img src={logo} alt="Willpower logo" className="brand-logo" />
                <div>
                  <p className="brand-label">William Mulvaney</p>
                  <p className="brand-subline">Willpower Lifestyle</p>
                </div>
              </Link>
              <button
                type="button"
                className={`mobile-menu-toggle ${mobileMenuOpen ? 'is-open' : ''}`}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-site-menu"
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
              </button>
              <div id="mobile-site-menu" className={`header-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
                <Navigation activeSection={activeSection} onNavigate={() => setMobileMenuOpen(false)} />
                <SocialLinks />
              </div>
            </div>
          </header>
          <main className="site-main">
            <Routes>
              <Route path="/" element={<TestPage />} />
              <Route path="/book" element={<BookPage />} />
              <Route path="*" element={<TestPage />} />
            </Routes>
          </main>
          {currentEpisode && (
            <PersistentPlayer
              episode={currentEpisode}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              onClose={handleClosePlayer}
              currentTime={seekTime}
            />
          )}
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;
