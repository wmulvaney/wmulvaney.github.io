import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import logo from './resources/wmulvaney.github.io.svg';
import './styles/Dashboard.css';
import PodcastFeed from './components/PodcastFeed';
import SubstackFeed from './components/SubstackFeed';
import EventFeed from './components/EventFeed';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMicrophone, faNewspaper, faCalendar, faBook, faBriefcase, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import PersistentPlayer from './components/PersistentPlayer';
import LatestVideo from './components/LatestVideo';
import YoutubeShorts from './components/YoutubeShorts';
import AboutMe from './components/AboutMe';
import ReadingList from './components/ReadingList';
import Business from './components/Business';
import NewsletterBox from './components/NewsletterBox';
import ContactForm from './components/ContactForm';

// Title component that updates based on current route
const PageTitle = () => {
  const location = useLocation();
  const getTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Home';
      case '/podcast':
        return 'Podcast';
      case '/substack':
        return 'Substack';
      case '/events':
        return 'Events';
      case '/reading':
        return 'Reading List';
      case '/business':
        return 'Business';
      case '/contact':
        return 'Contact';
      default:
        return 'Home';
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "William Mulvaney",
    "url": "https://williammulvaney.com",
    "sameAs": [
      "https://www.linkedin.com/in/william-mulvaney",
      "https://www.instagram.com/willpower_lifestyle",
      "https://www.youtube.com/@willpower_lifestyle"
    ],
    "jobTitle": "Entrepreneur and Podcast Host",
    "image": "https://williammulvaney.com/willpower_header.jpg",
    "description": "William Mulvaney is the founder of the Willpower Podcast and creator of ProCal, the AI-powered calorie tracking chatbot.",
    "brand": {
      "@type": "Brand",
      "name": "Willpower",
      "logo": "https://williammulvaney.com/favicon.svg"
    },
    "owns": [
      {
        "@type": "Product",
        "name": "ProCal",
        "description": "AI-powered calorie tracking chatbot"
      }
    ],
    "subjectOf": {
      "@type": "PodcastSeries",
      "name": "The Willpower Podcast",
      "url": "https://williammulvaney.com/podcast"
    }
  };

  return (
    <Helmet>
      <title>{getTitle()} | William Mulvaney | Official Site</title>
      <meta name="description" content="Welcome to the official website of William Mulvaney. Explore podcast episodes, articles, events, and more about personal development, technology, and building a meaningful life." />
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
};

// Page Header component for SEO-friendly h1 tags
const PageHeader = ({ title }) => (
  <h1 className="seo-header" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
    {title} | William Mulvaney
  </h1>
);

// Create a component for the Home page content
const Home = ({ currentEpisode, handleEpisodeSelect, isPlaying, setIsPlaying }) => (
  <div className="home-content">
    <PageHeader title="Welcome to William Mulvaney's Official Website" />
    <div className="about-me-container">
      <AboutMe />
    </div>
    <h2> New This Week </h2>
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap',
      gap: '2rem',
      marginBottom: '2rem'
    }}>
      <PodcastFeed 
        preview={true} 
        limit={1}
        currentEpisode={currentEpisode}
        setCurrentEpisode={handleEpisodeSelect}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />
      <SubstackFeed preview={true} limit={1} />
    </div>
    <LatestVideo />
    <h2>Latest Shorts</h2>
    <YoutubeShorts preview={true} limit={3} />
  </div>
);

// Wrap other components with PageHeader
const PodcastPage = (props) => (
  <>
    <PageHeader title="The Willpower Podcast with William Mulvaney" />
    <PodcastFeed {...props} />
  </>
);

const SubstackPage = () => (
  <>
    <PageHeader title="William Mulvaney's Substack Newsletter" />
    <SubstackFeed />
  </>
);

const EventsPage = () => (
  <>
    <PageHeader title="William Mulvaney's Events and Appearances" />
    <EventFeed />
  </>
);

const ReadingPage = () => (
  <>
    <PageHeader title="William Mulvaney's Reading List and Book Recommendations" />
    <ReadingList />
  </>
);

const BusinessPage = () => (
  <>
    <PageHeader title="William Mulvaney's Business Ventures" />
    <Business />
  </>
);

const ContactPage = () => (
  <>
    <PageHeader title="Contact William Mulvaney" />
    <ContactForm />
  </>
);

// Create the main App component
function App() {
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const audioRef = useRef(null);

  // Handle audio play/pause
  useEffect(() => {
    if (audioRef.current && currentEpisode) {
      if (isPlaying) {
        audioRef.current.play().catch(error => console.error("Error playing audio:", error));
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

  // Navigation component that uses useLocation
  const Navigation = () => {
    const location = useLocation();
    
    return (
      <nav className="nav-list">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <FontAwesomeIcon icon={faHome} className="nav-icon" />
          <span className="nav-text">HOME</span>
        </Link>

        <Link to="/podcast" className={`nav-item ${location.pathname === '/podcast' ? 'active' : ''}`}>
          <FontAwesomeIcon icon={faMicrophone} className="nav-icon" />
          <span className="nav-text">PODCAST</span>
        </Link>

        <Link to="/substack" className={`nav-item ${location.pathname === '/substack' ? 'active' : ''}`}>
          <FontAwesomeIcon icon={faNewspaper} className="nav-icon" />
          <span className="nav-text">SUBSTACK</span>
        </Link>

        <Link to="/events" className={`nav-item ${location.pathname === '/events' ? 'active' : ''}`}>
          <FontAwesomeIcon icon={faCalendar} className="nav-icon" />
          <span className="nav-text">EVENTS</span>
        </Link>

        <Link to="/reading" className={`nav-item ${location.pathname === '/reading' ? 'active' : ''}`}>
          <FontAwesomeIcon icon={faBook} className="nav-icon" />
          <span className="nav-text">READING</span>
        </Link>

        <Link to="/business" className={`nav-item ${location.pathname === '/business' ? 'active' : ''}`}>
          <FontAwesomeIcon icon={faBriefcase} className="nav-icon" />
          <span className="nav-text">BUSINESS</span>
        </Link>

        <Link to="/contact" className={`nav-item ${location.pathname === '/contact' ? 'active' : ''}`}>
          <FontAwesomeIcon icon={faEnvelope} className="nav-icon" />
          <span className="nav-text">CONTACT</span>
        </Link>
      </nav>
    );
  };

  return (
    <HelmetProvider>
      <Router>
        <div className="dashboard">
          <PageTitle />
          <div className="main-content">
            <div className="left-column">
              {/* Navigation Box */}
              <div className="nav-box">
                <div className="logo-container">
                  <img src={logo} alt="Willpower Logo" className="sidebar-logo" />
                  <h1 className="brand">WILLPOWER</h1>
                </div>
                <Navigation />
              </div>
              {/* Newsletter Box - Below the navigation */}
              <NewsletterBox />
            </div>

            {/* Content Box */}
            <div className={`content-box ${currentEpisode ? 'player-active' : ''}`}>
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <Home 
                      currentEpisode={currentEpisode}
                      handleEpisodeSelect={handleEpisodeSelect}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlaying}
                    />
                  } 
                />
                <Route 
                  path="/podcast" 
                  element={
                    <PodcastPage 
                      currentEpisode={currentEpisode}
                      setCurrentEpisode={handleEpisodeSelect}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlaying}
                      setCurrentTime={(time) => handleEpisodeSelect(currentEpisode, { time, shouldPlay: true })}
                    />
                  } 
                />
                <Route path="/substack" element={<SubstackPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/reading" element={<ReadingPage />} />
                <Route path="/business" element={<BusinessPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Routes>
            </div>
          </div>

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