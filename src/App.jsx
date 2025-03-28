import React, { useState, useEffect, useRef } from 'react';
import logo from './resources/wmulvaney.github.io.svg';
import './styles/Dashboard.css';
import PodcastFeed from './components/PodcastFeed';
import SubstackFeed from './components/SubstackFeed';
import EventFeed from './components/EventFeed';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMicrophone, faNewspaper, faCalendar, faBook, faBriefcase } from '@fortawesome/free-solid-svg-icons';
import PersistentPlayer from './components/PersistentPlayer';
import LatestVideo from './components/LatestVideo';
import YoutubeShorts from './components/YoutubeShorts';
import AboutMe from './components/AboutMe';
import ReadingList from './components/ReadingList';
import Business from './components/Business';

function App() {
  const [activeComponent, setActiveComponent] = useState(() => {
    return localStorage.getItem('activeComponent') || 'home';
  });
  
  // Add player state
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('activeComponent', activeComponent);
  }, [activeComponent]);

  // Save player state
  useEffect(() => {
    if (currentEpisode) {
      localStorage.setItem('currentEpisode', JSON.stringify(currentEpisode));
    } else {
      localStorage.removeItem('currentEpisode');
    }
    localStorage.setItem('isPlaying', isPlaying.toString());
  }, [currentEpisode, isPlaying]);

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
    localStorage.removeItem('currentEpisode');
    localStorage.setItem('isPlaying', 'false');
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const setCurrentTime = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Modify handleEpisodeChange to handle both episode and time
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
    <div className="dashboard">
      {/* Navigation Box */}
      <div className="nav-box">
        <div className="logo-container">
          <img src={logo} alt="Willpower Logo" className="sidebar-logo" />
          <h1 className="brand">WILLPOWER</h1>
        </div>

        <nav className="nav-list">
          <button 
            className={`nav-item ${activeComponent === 'home' ? 'active' : ''}`}
            onClick={() => setActiveComponent('home')}
          >
            <FontAwesomeIcon icon={faHome} className="nav-icon" />
            <span className="nav-text">HOME</span>
          </button>

          <button 
            className={`nav-item ${activeComponent === 'podcast' ? 'active' : ''}`}
            onClick={() => setActiveComponent('podcast')}
          >
            <FontAwesomeIcon icon={faMicrophone} className="nav-icon" />
            <span className="nav-text">PODCAST</span>
          </button>

          <button 
            className={`nav-item ${activeComponent === 'substack' ? 'active' : ''}`}
            onClick={() => setActiveComponent('substack')}
          >
            <FontAwesomeIcon icon={faNewspaper} className="nav-icon" />
            <span className="nav-text">SUBSTACK</span>
          </button>

          <button 
            className={`nav-item ${activeComponent === 'events' ? 'active' : ''}`}
            onClick={() => setActiveComponent('events')}
          >
            <FontAwesomeIcon icon={faCalendar} className="nav-icon" />
            <span className="nav-text">EVENTS</span>
          </button>

          <button 
            className={`nav-item ${activeComponent === 'reading' ? 'active' : ''}`}
            onClick={() => setActiveComponent('reading')}
          >
            <FontAwesomeIcon icon={faBook} className="nav-icon" />
            <span className="nav-text">READING</span>
          </button>

          <button 
            className={`nav-item ${activeComponent === 'business' ? 'active' : ''}`}
            onClick={() => setActiveComponent('business')}
          >
            <FontAwesomeIcon icon={faBriefcase} className="nav-icon" />
            <span className="nav-text">BUSINESS</span>
          </button>
        </nav>
      </div>

      {/* Content Box */}
      <div className={`content-box ${currentEpisode ? 'player-active' : ''}`}>
        {activeComponent === 'home' && (
          <div className="home-content">
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
        )}
        
        {activeComponent === 'podcast' && (
          <PodcastFeed 
            currentEpisode={currentEpisode}
            setCurrentEpisode={handleEpisodeSelect}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            setCurrentTime={(time) => handleEpisodeSelect(currentEpisode, { time, shouldPlay: true })}
          />
        )}
        {activeComponent === 'substack' && <SubstackFeed />}
        {activeComponent === 'events' && <EventFeed />}
        {activeComponent === 'reading' && <ReadingList />}
        {activeComponent === 'business' && <Business />}
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
  );
}

export default App;