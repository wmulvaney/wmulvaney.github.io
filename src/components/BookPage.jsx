import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import './BookPage.css';

// Filled in from Meta Events Manager; the pixel only loads on this page.
const META_PIXEL_ID = '526303911209957';

const CALENDAR_EMBED_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0S6KnUVY7AmxDddKOoW0L00RfmMiANmdemIt4PyDQivXEPqbfP3gTw8q1TCpd7POu8NACS9w6f?gv=true';
const CALENDAR_FALLBACK_URL = 'https://calendar.app.google/SgK1WwFXghMeX2CT7';

function loadPixel() {
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
  window.fbq('track', 'ViewContent', { content_name: 'book-a-call' });
}

function track(event, params) {
  if (window.fbq) window.fbq('track', event, params);
}

function BookPage() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scheduledFired = useRef(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    loadPixel();
  }, []);

  const openCalendar = () => {
    setCalendarOpen(true);
    if (!scheduledFired.current) {
      scheduledFired.current = true;
      track('Schedule', { content_name: 'book-a-call' });
    }
    requestAnimationFrame(() => {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="book-page">
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
        aria-hidden="true"
      />
      <div className="book-bg-overlay" aria-hidden="true" />
      <Helmet>
        <title>Book Your Free Call — William Mulvaney</title>
        <meta
          name="description"
          content="4 weeks of free 1-on-1 coaching. Book a free intro call and let's see if we're a fit."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="book-scroll">
        <section className="book-hero">
          <p className="book-eyebrow">Free 1-on-1 Coaching</p>
          <h1>
            4 weeks of coaching.
            <br />
            <span>No strings attached.</span>
          </h1>
          <p className="book-lede">
            If you&rsquo;re ready to make a real change in your life, the first step is a
            30-minute call. No pitch, no pressure. We talk about where you are, where
            you want to be, and whether we&rsquo;re a fit.
          </p>
          <button type="button" className="book-cta" onClick={openCalendar}>
            Book my free call
          </button>
        </section>

        <section className="book-story">
          <h2>I&rsquo;ve been where you are</h2>
          <div className="book-columns">
            <div className="book-col">
              <h3>I used to be</h3>
              <ul>
                <li>Unhappy with my body</li>
                <li>Unable to even talk to cute girls</li>
                <li>Scared to quit a &ldquo;good&rdquo; job that felt unfulfilling</li>
                <li>Terrified to speak in front of a group of 10 people</li>
              </ul>
            </div>
            <div className="book-col">
              <h3>Today, I have</h3>
              <ul>
                <li>Completed a 100 mile ultra</li>
                <li>Year round sub 12% body fat</li>
                <li>Left a comfy tech job to pursue a life of excitement</li>
                <li>Approached over 1000 women</li>
                <li>Been with a dream girl for the past year and a half</li>
              </ul>
            </div>
          </div>
          <p>
            None of this is to brag. I tell you this because I know that you are capable of
            more than you can imagine. I want to help you build your list.
          </p>
          <p>
            I&rsquo;m new to coaching, so I&rsquo;m doing it for free. Because my
            time is limited, I&rsquo;m selective about who I work with. The call is how we
            both figure out if this is worth 4 weeks of your life.
          </p>
        </section>

        <section className="book-steps">
          <h2>How it works</h2>
          <ol>
            <li>
              <strong>Book a free 30-minute call.</strong> Pick any time that works below.
            </li>
            <li>
              <strong>We talk goals.</strong> Where you&rsquo;re stuck, what you want, and
              whether we&rsquo;re a fit.
            </li>
            <li>
              <strong>4 weeks of 1-on-1 coaching.</strong> Free. You bring the commitment.
            </li>
          </ol>
          {!calendarOpen && (
            <button type="button" className="book-cta" onClick={openCalendar}>
              Pick a time
            </button>
          )}
        </section>

        <section
          ref={calendarRef}
          className={`book-calendar ${calendarOpen ? 'is-open' : ''}`}
        >
          {calendarOpen && (
            <>
              <h2>Pick a time</h2>
              <iframe
                src={CALENDAR_EMBED_URL}
                title="Book a free intro call"
                frameBorder="0"
              />
              <p className="book-fallback">
                Calendar not loading?{' '}
                <a href={CALENDAR_FALLBACK_URL} target="_blank" rel="noreferrer">
                  Open it in a new tab
                </a>
                .
              </p>
            </>
          )}
        </section>

        <footer className="book-footer">
          <p>William Mulvaney &middot; Willpower Lifestyle</p>
        </footer>
      </div>
    </div>
  );
}

export default BookPage;
