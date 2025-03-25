import React from 'react';
import './PodcastModal.css';

const PodcastModal = ({ 
  episode, 
  onClose, 
  onPlayPause, 
  isPlaying, 
  isCurrentEpisode,
  onTimestampClick 
}) => {
  return (
    <div className="podcast-modal" onClick={onClose}>
      <div className="podcast-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-image-and-title">
            <img src={episode.imageUrl} alt="Podcast cover" className="modal-image" />
            <div className="modal-title-container">
              <h2 className="modal-title">{episode.title}</h2>
              <p className="modal-date">{episode.pubDate}</p>
              <button 
                className={`modal-play-button ${isPlaying && isCurrentEpisode ? 'playing' : ''}`}
                onClick={onPlayPause}
                aria-label={isPlaying && isCurrentEpisode ? 'Pause' : 'Play'}
              >
                <span className="button-icon"></span>
              </button>
            </div>
          </div>
        </div>
        <div className="modal-content-scroll">
          <div 
            className="modal-description" 
            dangerouslySetInnerHTML={{ __html: episode.description }}
            onClick={onTimestampClick}
          />
        </div>
      </div>
    </div>
  );
};

export default PodcastModal; 