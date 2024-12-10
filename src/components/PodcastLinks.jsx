import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify, faApple, faAmazon, faYoutube } from '@fortawesome/free-brands-svg-icons';
import './PodcastFeed.css';

const PodcastLinks = () => {
  const linksContainerRef = useRef(null);

  useEffect(() => {
    const adjustLinksPosition = () => {
      const header = document.querySelector('.podcast-header');
      if (header && linksContainerRef.current) {
        const headerHeight = header.offsetHeight;
        linksContainerRef.current.style.top = `${headerHeight}px`;
      }
    };

    adjustLinksPosition();
    window.addEventListener('resize', adjustLinksPosition);

    return () => {
      window.removeEventListener('resize', adjustLinksPosition);
    };
  }, []);

  return (
    <div className="podcast-links" ref={linksContainerRef}>
      <a href="https://open.spotify.com/show/50se7WW88PmujAJqhj7cmE" target="_blank" rel="noopener noreferrer" style={{ margin: '0 10px' }}>
        <FontAwesomeIcon icon={faSpotify} size="2x" />
      </a>
      <a href="https://podcasts.apple.com/us/podcast/the-willpower-podcast/id1752157754" target="_blank" rel="noopener noreferrer" style={{ margin: '0 10px' }}>
        <FontAwesomeIcon icon={faApple} size="2x" />
      </a>
      <a href="https://music.amazon.com/podcasts/785a758e-dcfe-4126-8006-2c9585daf406/the-willpower-podcast" target="_blank" rel="noopener noreferrer" style={{ margin: '0 10px' }}>
        <FontAwesomeIcon icon={faAmazon} size="2x" />
      </a>
      <a href="https://www.youtube.com/@willpower_lifestyle/featured" target="_blank" rel="noopener noreferrer" style={{ margin: '0 10px' }}>
        <FontAwesomeIcon icon={faYoutube} size="2x" />
      </a>
    </div>
  );
};

export default PodcastLinks;