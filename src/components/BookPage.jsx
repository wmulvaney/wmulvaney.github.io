import { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import './BookPage.css';

// Filled in from Meta Events Manager; the pixel only loads on this page.
const META_PIXEL_ID = '526303911209957';

const CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0S6KnUVY7AmxDddKOoW0L00RfmMiANmdemIt4PyDQivXEPqbfP3gTw8q1TCpd7POu8NACS9w6f?gv=true';
const CALENDAR_FALLBACK_URL = 'https://calendar.app.google/SgK1WwFXghMeX2CT7';

// Spots left in the free cohort. Set to 0 when they're gone — the page copy
// promises this number is real, so it has to be kept honest.
const SPOTS_LEFT = 5;

/*
 * Page variants, keyed to the messaging of the ad that sent the visitor.
 *
 * Selected with an intentionally boring code: ?c=d1 | f1 | p1 | g1
 * The codes are opaque on purpose — a visitor reading the address bar should
 * learn nothing about how they were segmented or what tactics the page uses.
 * Never encode strategy words (scarcity, urgency, funnel, test names) in a URL.
 *
 * If ?c= is missing we fall back to inferring from utm_content, so the ads that
 * are already live (which pass the ad name) keep landing on the right variant.
 */
const VARIANT_CODES = {
  d1: 'dating',
  f1: 'fitness',
  p1: 'discipline',
  g1: 'general',
};
const VARIANTS = {
  dating: {
    eyebrow: 'Free 1-on-1 dating coaching',
    h1: 'Start talking to women.',
    h1sub: 'The real kind. In person.',
    lede:
      "Not scripts. Not openers. Not a 200-page PDF. Four weeks of me coaching you through actual conversations with actual women, until approaching stops feeling like a cliff.",
    thenLine: "I couldn't talk to a woman I found attractive. Not one.",
    nowLine: "I've approached over 1,000 women. I've been with a dream girl for the past year and a half.",
    fieldWork: 'We go out together and you approach. I watch, then we break it down.',
    gimmick: 'fake text screenshots and "3 lines that make her chase you"',
  },
  fitness: {
    eyebrow: 'Free 1-on-1 fitness coaching',
    h1: 'Build the body you actually want.',
    h1sub: 'Starting this week.',
    lede:
      "No secret protocol, no supplement stack, no 12-week shred. Four weeks of me coaching you through the training and eating that actually moves the needle — and the discipline to keep doing it.",
    thenLine: 'I hated my body. I avoided mirrors and photos.',
    nowLine: "Year-round sub-12% body fat. I've finished a 100-mile ultra.",
    fieldWork: 'We train together. I watch you lift and fix what needs fixing.',
    gimmick: "before/after photos you can't verify",
  },
  discipline: {
    eyebrow: 'Free 1-on-1 discipline coaching',
    h1: 'Do the hard thing.',
    h1sub: 'Every day. Even when you don’t feel like it.',
    lede:
      "No morning-routine infographic, no productivity system you'll abandon in nine days. Four weeks of me building the habits with you and holding you to them daily.",
    thenLine:
      'I was scared to leave a "good" job that was quietly killing me. I coped with scrolling, drinking, and food.',
    nowLine: 'I left the comfy tech job. I do the hard thing daily now, and it stuck.',
    fieldWork: "We do the hard thing together — the workout, the cold call, the thing you've been avoiding.",
    gimmick: 'a $997 discipline course',
  },
  general: {
    eyebrow: 'Free 1-on-1 coaching',
    h1: '4 weeks of coaching.',
    h1sub: 'No strings attached.',
    lede:
      "Dating, fitness, or just getting your life in order. Four weeks of real 1-on-1 coaching, free, so you can find out whether I'm any good before you ever pay me.",
    thenLine: 'I was unhappy with my body, terrified to speak up, and stuck in a life I didn’t choose.',
    nowLine: '100-mile ultra. Sub-12% body fat. Left the safe job. Got the girl.',
    fieldWork: "We do the work together, in person — whatever your version of the hard thing is.",
    gimmick: 'a $997 course and a countdown timer',
  },
};

function resolveVariant(search) {
  const p = new URLSearchParams(search);

  const code = (p.get('c') || '').toLowerCase().trim();
  if (VARIANT_CODES[code]) return VARIANT_CODES[code];

  // Readable aliases, handy for testing by hand.
  const explicit = (p.get('v') || p.get('variant') || '').toLowerCase().trim();
  if (VARIANTS[explicit]) return explicit;

  // Fallback: infer from utm_content (Meta fills it with the ad name on the
  // ads that are already live, e.g. "BC 12 typewriter worst case").
  const content = (p.get('utm_content') || '').toLowerCase().replace(/[+_-]/g, ' ');
  if (/dream body|physique|fitness|shred|lean|abs|training|\bf\d/.test(content)) return 'fitness';
  if (/discipline|habit|productivity|morning|routine|hard thing|\bp\d/.test(content)) {
    return 'discipline';
  }
  if (/dating|approach|women|girls|scared|try me|test me|\bbc\b|\ba\d/.test(content)) {
    return 'dating';
  }
  return 'general';
}

function loadPixel(variant) {
  if (window.fbq || META_PIXEL_ID.startsWith('__')) return;
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
  window.fbq('track', 'ViewContent', { content_name: 'book-a-call', content_category: variant });
}

function BookPage() {
  const variant = useMemo(
    () => resolveVariant(typeof window === 'undefined' ? '' : window.location.search),
    []
  );
  const v = VARIANTS[variant];
  const calendarRef = useRef(null);
  const scheduledFired = useRef(false);

  useEffect(() => {
    loadPixel(variant);
  }, [variant]);

  /*
   * IMPORTANT: this fires when the visitor REACHES the calendar, not when they
   * book. Google's scheduler runs in a cross-origin iframe, so the page cannot
   * observe a completed booking — only Google Calendar knows. Swap the embed for
   * Calendly/Cal.com to get a true booking event and re-point this there.
   */
  const fireReachedCalendar = (source) => {
    if (scheduledFired.current) return;
    scheduledFired.current = true;
    if (window.fbq) {
      window.fbq('track', 'Schedule', {
        content_name: 'reached-calendar',
        content_category: variant,
        source,
      });
    }
  };

  // Fire once the calendar scrolls into view, however the visitor got there.
  useEffect(() => {
    const el = calendarRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fireReachedCalendar('scroll');
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToCalendar = () => {
    fireReachedCalendar('cta');
    calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const spotsLine =
    SPOTS_LEFT > 0
      ? `${SPOTS_LEFT} free spots left. When they're gone, this page will say so.`
      : "All free spots are taken right now. Book anyway and I'll tell you when one opens.";

  return (
    <div className="book-page" data-variant={variant}>
      <video
        className="book-bg-video"
        src={
          typeof window !== 'undefined' &&
          window.matchMedia('(max-width: 640px)').matches
            ? '/hero-mobile.mp4'
            : '/hero.mp4'
        }
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="book-bg-overlay" aria-hidden="true" />
      <Helmet>
        <title>Book Your Free Call | William Mulvaney</title>
        <meta
          name="description"
          content="4 weeks of free 1-on-1 coaching. Book a free intro call and let's see if we're a fit."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="book-scroll">
        {/* ---------- HERO: offer + CTA above the fold ---------- */}
        <section className="book-hero">
          <p className="book-eyebrow">{v.eyebrow}</p>
          <h1>
            {v.h1}
            <br />
            <span>{v.h1sub}</span>
          </h1>
          <p className="book-lede">{v.lede}</p>

          <button type="button" className="book-cta" onClick={scrollToCalendar}>
            Book my free call
          </button>
          <p className="book-scarcity">{spotsLine}</p>
          <p className="book-microcopy">
            30 minutes. No pitch, no card, no obligation.
          </p>
        </section>

        {/* ---------- CALENDAR: as high as it can go ---------- */}
        <section ref={calendarRef} className="book-calendar is-open" id="book">
          <h2>Pick a time</h2>
          <iframe
            src={CALENDAR_EMBED_URL}
            title="Book a free intro call"
            frameBorder="0"
            loading="lazy"
          />
          <p className="book-fallback">
            Calendar not loading?{' '}
            <a href={CALENDAR_FALLBACK_URL} target="_blank" rel="noreferrer">
              Open it in a new tab
            </a>
            .
          </p>
        </section>

        {/* ---------- WHY IT'S FREE ---------- */}
        <section className="book-why">
          <h2>Why this is free</h2>
          <p>
            I&rsquo;m new to coaching. That&rsquo;s the whole reason. I don&rsquo;t have a wall of
            testimonials, so instead of asking you to trust me, I&rsquo;m asking you to
            <strong> test me</strong> — four weeks, free, and you decide at the end whether
            I&rsquo;m worth paying.
          </p>
          <p className="book-why-kicker">
            I don&rsquo;t need your money yet. I need proof I&rsquo;m a good coach.
          </p>
        </section>

        {/* ---------- ANTI-GIMMICK ---------- */}
        <section className="book-not">
          <h2>What you won&rsquo;t get</h2>
          <ul>
            <li>No $997 course, no &ldquo;secret system,&rdquo; no PDF you&rsquo;ll never open</li>
            <li>No {v.gimmick}</li>
            <li>No upsell call disguised as a free strategy session</li>
            <li>
              No countdown timer that resets when you reload the page. The {SPOTS_LEFT} spots are
              real, and when they&rsquo;re gone this page will say so.
            </li>
          </ul>
        </section>

        {/* ---------- WHAT YOU ACTUALLY GET ---------- */}
        <section className="book-get">
          <h2>What you actually get, every week</h2>
          <ul>
            <li>
              <strong>1 virtual coaching session.</strong> We plan the week and fix what broke last
              week.
            </li>
            <li>
              <strong>1 &ldquo;in the field&rdquo; session.</strong> {v.fieldWork}
            </li>
            <li>
              <strong>Daily check-ins.</strong> You hear from me every day. That&rsquo;s the part
              that makes it stick.
            </li>
            <li>
              <strong>Habit engineering &amp; tracking.</strong> We build the system, then we watch
              the numbers.
            </li>
          </ul>
          <p className="book-get-kicker">Four weeks of that. $0. No card on file.</p>
        </section>

        {/* ---------- SHORT, EMOTIONAL STORY ---------- */}
        <section className="book-story">
          <h2 className="book-then">Where I used to be</h2>
          <p className="book-then-line">{v.thenLine}</p>
          <p className="book-then-body">
            I knew that feeling where you quietly accept that this is just your life now. That
            nothing is going to change. I stayed there longer than I want to admit.
          </p>
          <h3 className="book-now">Where I am now</h3>
          <p className="book-now-line">{v.nowLine}</p>
          <p className="book-story-kicker">
            I&rsquo;m not special. I just did the work, in that order, with people who held me to
            it. That&rsquo;s all I&rsquo;m offering you.
          </p>
        </section>

        {/* ---------- CLOSE ---------- */}
        <section className="book-close">
          <h2>Worst case, you get 4 free weeks of coaching.</h2>
          <button type="button" className="book-cta" onClick={scrollToCalendar}>
            Book my free call
          </button>
          <p className="book-scarcity">{spotsLine}</p>
        </section>

        <footer className="book-footer">
          <p>William Mulvaney &middot; Willpower Lifestyle</p>
        </footer>
      </div>
    </div>
  );
}

export default BookPage;
