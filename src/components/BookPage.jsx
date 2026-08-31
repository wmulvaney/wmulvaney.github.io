import { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import './BookPage.css';

// Filled in from Meta Events Manager; the pixel only loads on this page.
const META_PIXEL_ID = '526303911209957';

const CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0S6KnUVY7AmxDddKOoW0L00RfmMiANmdemIt4PyDQivXEPqbfP3gTw8q1TCpd7POu8NACS9w6f?gv=true';
const CALENDAR_FALLBACK_URL = 'https://calendar.app.google/SgK1WwFXghMeX2CT7';

// Each offer books on its own schedule so cohorts stay distinguishable in
// Google Calendar: $50 trial, no-explicit-offer (guarantee), and 2-week free.
const TRIAL_CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ13N1osP0koWVi_I6c1IP7Rb_P4QzpSH8cMm_nG80kRyuhCdzANvwfga-CMZux2tstFuZMaa0l1?gv=true';
const TRIAL_CALENDAR_FALLBACK_URL = 'https://calendar.app.google/hLLbTXAZPezzvv5U6';

const NP_CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ20uUGAqEwSeiQ9OEaJQPgJgv5Yq40fj_OMsILlLf6e7ZVq4kFygRHVbD3QKc2pjn7vnc3XhPhn?gv=true';
const NP_CALENDAR_FALLBACK_URL = 'https://calendar.app.google/VvyuHg9mUhJRc4Q47';

const FREE2W_CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1xcEw9dNSCM0oDQpJSiu-NOjGggkIIC4OZXGf7m3PBR4_uek2zL0BTNZCuxCb8vp2eJxjU2iZd?gv=true';
const FREE2W_CALENDAR_FALLBACK_URL = 'https://calendar.app.google/Fk4XcjviQToqUJeTA';

// Spots left in the free cohort. Set to 0 when they're gone — the page copy
// promises this number is real, so it has to be kept honest.
const SPOTS_LEFT = 5;

// Spots left in the $50 trial cohort. Same honesty rule as SPOTS_LEFT.
const TRIAL_SPOTS_LEFT = 5;

// Spots left in the 2-week free cohort. Same honesty rule.
const FREE2W_SPOTS_LEFT = 5;

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
  d2: 'dating50',
  f2: 'fitness50',
  g2: 'general50',
  d3: 'datingNP',
  f3: 'fitnessNP',
  g3: 'generalNP',
  d4: 'dating2w',
  f4: 'fitness2w',
  g4: 'general2w',
};
const VARIANTS = {
  dating: {
    eyebrow: 'Free 1-1 dating coaching',
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
    eyebrow: 'Free 1-1 fitness coaching',
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
    eyebrow: 'Free 1-1 discipline coaching',
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
    eyebrow: 'Free 1-1 coaching',
    h1: '4 weeks of coaching.',
    h1sub: 'No strings attached.',
    lede:
      "Dating, fitness, or just getting your life in order. Four weeks of real 1-1 coaching, free, so you can find out whether I'm any good before you ever pay me.",
    thenLine: 'I was unhappy with my body, terrified to speak up, and stuck in a life I didn’t choose.',
    nowLine: '100-mile ultra. Sub-12% body fat. Left the safe job. Got the girl.',
    fieldWork: "We do the work together, in person — whatever your version of the hard thing is.",
    gimmick: 'a $997 course and a countdown timer',
  },

  /* ---- $50-for-4-weeks trial offer (money back, no questions asked) ---- */
  dating50: {
    offer: 'trial',
    eyebrow: '1-1 dating coaching · $50 for 4 weeks',
    h1: 'Start talking to women.',
    h1sub: 'The real kind. In person.',
    lede:
      "Not scripts. Not openers. Not a 200-page PDF. Four weeks of me coaching you through actual conversations with actual women — for $50 total, not per week. If you're not satisfied at the end of the month, you get it back.",
    thenLine: "I couldn't talk to a woman I found attractive. Not one.",
    nowLine: "I've approached over 1,000 women. I've been with a dream girl for the past year and a half.",
    fieldWork: 'We go out together and you approach. I watch, then we break it down.',
    gimmick: 'fake text screenshots and "3 lines that make her chase you"',
  },
  fitness50: {
    offer: 'trial',
    eyebrow: '1-1 fitness coaching · $50 for 4 weeks',
    h1: 'Build the body you actually want.',
    h1sub: 'Starting this week.',
    lede:
      "No secret protocol, no supplement stack, no 12-week shred. Four weeks of me coaching you through the training and eating that actually moves the needle — for $50 total, not per week. If your body hasn't changed by the end of the month, you get it back.",
    thenLine: 'I hated my body. I avoided mirrors and photos.',
    nowLine: "Year-round sub-12% body fat. I've finished a 100-mile ultra.",
    fieldWork: 'We train together. I watch you lift and fix what needs fixing.',
    gimmick: "before/after photos you can't verify",
  },
  general50: {
    offer: 'trial',
    eyebrow: '1-1 coaching · $50 for 4 weeks',
    h1: '4 weeks of coaching.',
    h1sub: '$50. Total.',
    lede:
      "Dating, fitness, or just getting your life in order. Four weeks of real 1-1 coaching for $50 — total, not per week — and if you're not satisfied at the end, you get it back. That's the whole deal.",
    thenLine: 'I was unhappy with my body, terrified to speak up, and stuck in a life I didn’t choose.',
    nowLine: '100-mile ultra. Sub-12% body fat. Left the safe job. Got the girl.',
    fieldWork: "We do the work together, in person — whatever your version of the hard thing is.",
    gimmick: 'a $997 course and a countdown timer',
  },

  /* ---- guarantee offer, price never named on the page ('NP' = no price) ---- */
  datingNP: {
    offer: 'trialnp',
    eyebrow: '1-1 dating coaching · money-back guarantee',
    h1: 'Start talking to women.',
    h1sub: 'The real kind. In person.',
    lede:
      "Not scripts. Not openers. Not a 200-page PDF. Me coaching you through actual conversations with actual women — and if your life hasn't changed after 4 weeks, you get your money back.",
    thenLine: "I couldn't talk to a woman I found attractive. Not one.",
    nowLine: "I've approached over 1,000 women. I've been with a dream girl for the past year and a half.",
    fieldWork: 'We go out together and you approach. I watch, then we break it down.',
    gimmick: 'fake text screenshots and "3 lines that make her chase you"',
  },
  fitnessNP: {
    offer: 'trialnp',
    eyebrow: '1-1 fitness coaching · money-back guarantee',
    h1: 'Build the body you actually want.',
    h1sub: 'Starting this week.',
    lede:
      "No secret protocol, no supplement stack, no 12-week shred. Me coaching you through the training and eating that actually moves the needle — and if your body hasn't changed after 4 weeks, you get your money back.",
    thenLine: 'I hated my body. I avoided mirrors and photos.',
    nowLine: "Year-round sub-12% body fat. I've finished a 100-mile ultra.",
    fieldWork: 'We train together. I watch you lift and fix what needs fixing.',
    gimmick: "before/after photos you can't verify",
  },
  generalNP: {
    offer: 'trialnp',
    eyebrow: '1-1 coaching · money-back guarantee',
    h1: 'Coaching that works.',
    h1sub: 'Money back if it doesn’t.',
    lede:
      "Dating, fitness, or just getting your life in order. Real 1-1 coaching — and if your life hasn't changed after 4 weeks, you get your money back. That's the whole deal.",
    thenLine: 'I was unhappy with my body, terrified to speak up, and stuck in a life I didn’t choose.',
    nowLine: '100-mile ultra. Sub-12% body fat. Left the safe job. Got the girl.',
    fieldWork: "We do the work together, in person — whatever your version of the hard thing is.",
    gimmick: 'a $997 course and a countdown timer',
  },

  /* ---- 2-week free offer ---- */
  dating2w: {
    offer: 'free2w',
    eyebrow: 'Free 1-1 dating coaching · 2 weeks',
    h1: 'Start talking to women.',
    h1sub: 'The real kind. In person.',
    lede:
      "Not scripts. Not openers. Not a 200-page PDF. Two weeks of me coaching you through actual conversations with actual women — completely free, so you can find out whether I'm any good before you ever pay me.",
    thenLine: "I couldn't talk to a woman I found attractive. Not one.",
    nowLine: "I've approached over 1,000 women. I've been with a dream girl for the past year and a half.",
    fieldWork: 'We go out together and you approach. I watch, then we break it down.',
    gimmick: 'fake text screenshots and "3 lines that make her chase you"',
  },
  fitness2w: {
    offer: 'free2w',
    eyebrow: 'Free 1-1 fitness coaching · 2 weeks',
    h1: 'Build the body you actually want.',
    h1sub: 'Starting this week.',
    lede:
      "No secret protocol, no supplement stack, no 12-week shred. Two weeks of me coaching you through the training and eating that actually moves the needle — completely free, so you can find out whether I'm any good before you ever pay me.",
    thenLine: 'I hated my body. I avoided mirrors and photos.',
    nowLine: "Year-round sub-12% body fat. I've finished a 100-mile ultra.",
    fieldWork: 'We train together. I watch you lift and fix what needs fixing.',
    gimmick: "before/after photos you can't verify",
  },
  general2w: {
    offer: 'free2w',
    eyebrow: 'Free 1-1 coaching · 2 weeks',
    h1: '2 weeks of coaching.',
    h1sub: 'Free. No strings attached.',
    lede:
      "Dating, fitness, or just getting your life in order. Two weeks of real 1-1 coaching, free, so you can find out whether I'm any good before you ever pay me.",
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
  const iframeRef = useRef(null);
  const scheduledFired = useRef(false);

  useEffect(() => {
    loadPixel(variant);
  }, [variant]);

  /*
   * Schedule = the visitor actually engaged with the booking widget.
   *
   * This is the ad set's optimization event, so it has to mean something. It
   * fires only when the visitor clicks INTO the calendar iframe — not when they
   * scroll past it and not when they tap the CTA. Clicking a cross-origin iframe
   * blurs the parent window and moves document.activeElement to that iframe,
   * which is the only engagement signal the parent page can legitimately see.
   *
   * It still is NOT a booking. Google's scheduler is cross-origin, so a completed
   * booking is invisible here — only Google Calendar knows. Swapping the embed for
   * Calendly/Cal.com would expose a real booking event; re-point this there then.
   */
  const fireOpenedCalendar = (source) => {
    if (scheduledFired.current) return;
    scheduledFired.current = true;
    if (window.fbq) {
      window.fbq('track', 'Schedule', {
        content_name: 'opened-calendar',
        content_category: variant,
        source,
      });
    }
  };

  useEffect(() => {
    const isCalendarFocused = () =>
      iframeRef.current && document.activeElement === iframeRef.current;

    // Desktop and most mobile browsers blur the window when an iframe takes focus.
    const onBlur = () => {
      window.setTimeout(() => {
        if (isCalendarFocused()) fireOpenedCalendar('iframe-focus');
      }, 0);
    };
    window.addEventListener('blur', onBlur);

    // Fallback: some mobile browsers don't reliably emit blur for iframe taps,
    // so poll activeElement as well. Cheap, and stops as soon as it fires.
    const poll = window.setInterval(() => {
      if (scheduledFired.current) {
        window.clearInterval(poll);
        return;
      }
      if (isCalendarFocused()) {
        fireOpenedCalendar('iframe-poll');
        window.clearInterval(poll);
      }
    }, 750);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * CTA taps are intent, not engagement, so they get their own event and are
   * deliberately kept OUT of Schedule. Useful for spotting the gap between
   * "wanted to book" and "actually touched the calendar".
   */
  const scrollToCalendar = () => {
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_name: 'cta-tap',
        content_category: variant,
      });
    }
    calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 'trial' and 'trialnp' share the paid-cohort calendar and CTA; 'trialnp'
  // additionally never names the price anywhere on the page.
  const isTrial = v.offer === 'trial' || v.offer === 'trialnp';
  const showPrice = v.offer === 'trial';
  // The 2-week free offer follows the free-offer copy but with its own duration,
  // spot counter, and (eventually) its own booking calendar.
  const isTwoWeek = v.offer === 'free2w';
  const weeksWord = isTwoWeek ? 'two' : 'four';
  const weeksNum = isTwoWeek ? 2 : 4;
  const spots = isTrial ? TRIAL_SPOTS_LEFT : isTwoWeek ? FREE2W_SPOTS_LEFT : SPOTS_LEFT;
  const calendarEmbedUrl =
    v.offer === 'trial'
      ? TRIAL_CALENDAR_EMBED_URL
      : v.offer === 'trialnp'
        ? NP_CALENDAR_EMBED_URL
        : isTwoWeek
          ? FREE2W_CALENDAR_EMBED_URL
          : CALENDAR_EMBED_URL;
  const calendarFallbackUrl =
    v.offer === 'trial'
      ? TRIAL_CALENDAR_FALLBACK_URL
      : v.offer === 'trialnp'
        ? NP_CALENDAR_FALLBACK_URL
        : isTwoWeek
          ? FREE2W_CALENDAR_FALLBACK_URL
          : CALENDAR_FALLBACK_URL;
  const ctaLabel = isTrial ? 'Book my intro call' : 'Book my free call';

  const spotsLine = isTrial
    ? spots > 0
      ? `${spots} spots ${showPrice ? 'at $50' : 'left'}. When they're gone, this page will say so.`
      : "All spots are taken right now. Book anyway and I'll tell you when one opens."
    : spots > 0
      ? `${spots} free spots left. When they're gone, this page will say so.`
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
        <title>{isTrial ? 'Book Your Intro Call | William Mulvaney' : 'Book Your Free Call | William Mulvaney'}</title>
        <meta
          name="description"
          content={
            showPrice
              ? "4 weeks of 1-1 coaching for $50 total, money back if you're not satisfied. Book a free intro call and let's see if we're a fit."
              : isTrial
                ? "4 weeks of 1-1 coaching with a money-back guarantee. Book a free intro call and let's see if we're a fit."
                : `${weeksNum} weeks of free 1-1 coaching. Book a free intro call and let's see if we're a fit.`
          }
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
            {ctaLabel}
          </button>
          <p className="book-scarcity">{spotsLine}</p>
          <p className="book-microcopy">
            {showPrice
              ? 'The call is free. 30 minutes, no pitch, no obligation — you only pay the $50 if we both decide it’s a fit.'
              : isTrial
                ? 'The call is free. 30 minutes, no pitch, no obligation.'
                : '30 minutes. No pitch, no card, no obligation.'}
          </p>
        </section>

        {/* ---------- CALENDAR: as high as it can go ---------- */}
        <section ref={calendarRef} className="book-calendar is-open" id="book">
          <h2>Pick a time</h2>
          <iframe
            ref={iframeRef}
            src={calendarEmbedUrl}
            title="Book a free intro call"
            frameBorder="0"
            loading="lazy"
          />
          <p className="book-fallback">
            Calendar not loading?{' '}
            <a href={calendarFallbackUrl} target="_blank" rel="noreferrer">
              Open it in a new tab
            </a>
            .
          </p>
        </section>

        {/* ---------- WHY IT'S FREE / WHY IT'S $50 / WHY THE GUARANTEE ---------- */}
        {isTrial && !showPrice ? (
          <section className="book-why">
            <h2>Why the guarantee</h2>
            <p>
              I&rsquo;m new to coaching. I don&rsquo;t have a wall of testimonials, so instead of
              asking you to trust me, I&rsquo;m asking you to <strong>try me</strong>. If you&rsquo;re
              not satisfied after 4 weeks, you get your money back.
              <strong> No questions asked.</strong> No forms, no exit call, no fine print.
            </p>
            <p className="book-why-kicker">
              Don&rsquo;t trust me. Try me.
            </p>
          </section>
        ) : isTrial ? (
          <section className="book-why">
            <h2>Why it&rsquo;s $50 &mdash; total</h2>
            <p>
              Not per week. Not per session. <strong>$50 for the whole 4 weeks</strong>, stated
              right here on the page, because I&rsquo;m tired of coaches who make you sit through
              a &ldquo;free strategy call&rdquo; to hear a price. It&rsquo;s small enough that
              you&rsquo;ll risk it and large enough that you&rsquo;ll show up.
            </p>
            <p>
              And if you&rsquo;re not satisfied after the 4 weeks, you get your money back.
              <strong> No questions asked.</strong> No forms, no exit call, no fine print.
            </p>
            <p className="book-why-kicker">
              Don&rsquo;t trust me. Try me.
            </p>
          </section>
        ) : (
          <section className="book-why">
            <h2>Why this is free</h2>
            <p>
              I&rsquo;m new to coaching. That&rsquo;s the whole reason. I don&rsquo;t have a wall of
              testimonials, so instead of asking you to trust me, I&rsquo;m asking you to
              <strong> test me</strong> — {weeksWord} weeks, free, and you decide at the end
              whether I&rsquo;m worth paying.
            </p>
            <p className="book-why-kicker">
              I don&rsquo;t need your money yet. I need proof I&rsquo;m a good coach.
            </p>
          </section>
        )}

        {/* ---------- ANTI-GIMMICK ---------- */}
        <section className="book-not">
          <h2>What you won&rsquo;t get</h2>
          <ul>
            <li>No $997 course, no &ldquo;secret system,&rdquo; no PDF you&rsquo;ll never open</li>
            <li>No {v.gimmick}</li>
            <li>No upsell call disguised as a free strategy session</li>
            {showPrice && (
              <li>
                No hidden pricing. It&rsquo;s $50 total, it&rsquo;s written on this page, and
                that&rsquo;s the whole price.
              </li>
            )}
            <li>
              No countdown timer that resets when you reload the page. The {spots} spots are
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
          <p className="book-get-kicker">
            {showPrice
              ? 'Four weeks of that. $50 total — money back if you’re not satisfied.'
              : isTrial
                ? 'All of that, with a guarantee: money back if you’re not satisfied after 4 weeks.'
                : `${isTwoWeek ? 'Two' : 'Four'} weeks of that. $0. No card on file.`}
          </p>
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
          <h2>
            {showPrice
              ? 'Worst case: you try it for 4 weeks and get your $50 back.'
              : isTrial
                ? 'Worst case: you try it for 4 weeks and get your money back.'
                : `Worst case, you get ${weeksNum} free weeks of coaching.`}
          </h2>
          <button type="button" className="book-cta" onClick={scrollToCalendar}>
            {ctaLabel}
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
