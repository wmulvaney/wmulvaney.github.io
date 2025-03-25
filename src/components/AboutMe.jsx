import React from 'react';
import './AboutMe.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faInstagram, 
  faLinkedin, 
  faSpotify, 
  faYoutube 
} from '@fortawesome/free-brands-svg-icons';

const AboutMe = () => {
  return (
    <div className="about-section">
      <div className="about-content">
        <h1>About Me</h1>
        <p>
          Hey! I'm Will, a software engineer based in Austin, TX. When I'm not coding, 
          you can find me recording episodes for my podcast, working out, or spending quality 
          time with my dog. I'm passionate about personal development, technology, and connecting 
          with other driven individuals who are committed to growth.
        </p>
        <p>
          Through my content, I explore topics like willpower, discipline, and what it takes to 
          build a meaningful life. I believe in the power of community and continuous learning.
        </p>
        <div className="social-links">
          <a 
            href="https://instagram.com/willpower_lifestyle" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
          >
            <FontAwesomeIcon icon={faInstagram} />
            <span>Instagram</span>
          </a>
          <a 
            href="https://www.linkedin.com/in/william-mulvaney" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
          >
            <FontAwesomeIcon icon={faLinkedin} />
            <span>LinkedIn</span>
          </a>
          <a 
            href="https://open.spotify.com/show/50se7WW88PmujAJqhj7cmE" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
          >
            <FontAwesomeIcon icon={faSpotify} />
            <span>Spotify</span>
          </a>
          <a 
            href="https://youtube.com/@willpower_lifestyle" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link"
          >
            <FontAwesomeIcon icon={faYoutube} />
            <span>YouTube</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutMe;