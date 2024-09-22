import React, { useState, useEffect } from 'react';
import logo from './resources/wmulvaney.github.io.svg';
import './styles/Header.css';
import PodcastFeed from './components/PodcastFeed';
import SubstackFeed from './components/SubstackFeed';
import EventFeed from './components/EventFeed';

function App() {
  const [activeComponent, setActiveComponent] = useState(() => {
    // Try to get the stored value from localStorage, or default to ''
    return localStorage.getItem('activeComponent') || '';
  });

  useEffect(() => {
    // Store the activeComponent in localStorage whenever it changes
    localStorage.setItem('activeComponent', activeComponent);
  }, [activeComponent]);

  const handleSetActiveComponent = (component) => {
    setActiveComponent(component);
    // You don't need to set localStorage here, as the useEffect will handle it
  };

  return (
    <div className="App">
      <header className="main-header">
        <img src={logo} alt="Willpower Logo" className="header-logo" />
        <div className="header-content">
          <h1 className="site-title">Willpower</h1>
          <nav className="site-nav">
            <ul>
              <li>
                <button onClick={() => handleSetActiveComponent('podcast')}>
                  Willpower Podcast
                </button>
              </li>
              <li>
                <button onClick={() => handleSetActiveComponent('substack')}>
                  Willpower Substack
                </button>
              </li>
              <li>
                <button onClick={() => handleSetActiveComponent('events')}>
                  Willpower Events
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="content-area">
        <PodcastFeed activeComponent={activeComponent}/>
        {activeComponent === 'substack' && (<SubstackFeed activeComponent={activeComponent}/>)}
        {activeComponent === 'events' && (<EventFeed activeComponent={activeComponent}/>)}
      </main>
    </div>
  );
}

export default App;