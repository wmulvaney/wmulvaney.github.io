import React, { useState, useEffect } from 'react';
import './QualiaNotificationBanner.css';

const QualiaNotificationBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem('qualia-banner-dismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('qualia-banner-dismissed', 'true');
    setIsVisible(false);
  };

  const handleLearnMore = () => {
    window.open('https://mygrooves.app', '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="qualia-banner">
      <div className="qualia-banner-content">
        <div className="qualia-banner-text">
          <h3>Introducing Grooves</h3>
          <p>Discover habits that make you feel fulfilled, energized, and truly alive. Track what matters for your well-being.</p>
        </div>
        <div className="qualia-banner-actions">
          <button 
            className="qualia-btn-primary" 
            onClick={handleLearnMore}
          >
            Learn More
          </button>
          <button 
            className="qualia-btn-dismiss" 
            onClick={handleDismiss}
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default QualiaNotificationBanner;