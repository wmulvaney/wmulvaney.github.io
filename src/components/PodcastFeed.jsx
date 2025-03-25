import React, { useEffect, useState, useRef } from 'react';
import PodcastLinks from './PodcastLinks';  
import './PodcastFeed.css';
import he from 'he';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import PodcastModal from './PodcastModal';

const PodcastFeed = ({ 
  preview = false,
  limit = null,
  currentEpisode, 
  setCurrentEpisode, 
  isPlaying, 
  setIsPlaying,
  setCurrentTime,
}) => {
  const [episodes, setEpisodes] = useState([]);
  const [podcastDescription, setPodcastDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchPodcastFeed = async () => {
      try {
        const response = await fetch('https://anchor.fm/s/f40349c8/podcast/rss');
        const text = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");

        const channel = xml.getElementsByTagName("channel")[0];
        const description = channel.getElementsByTagName("description")[0]?.textContent ||
                            channel.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'summary')[0]?.textContent ||
                            "No description available";
        setPodcastDescription(description);

        const items = Array.from(xml.getElementsByTagName("item"));
        const episodes = items.map(item => ({
          title: item.getElementsByTagName('title')[0]?.textContent || "No title",
          pubDate: new Date(item.getElementsByTagName('pubDate')[0]?.textContent || "").toDateString(),
          audioUrl: item.getElementsByTagName('enclosure')[0]?.getAttribute('url') || "",
          imageUrl: item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'image')[0]?.getAttribute('href') || "https://via.placeholder.com/50",
          description: formatDescription(he.decode(item.getElementsByTagName('description')[0]?.textContent || "No description available")),
        }));

        setEpisodes(limit ? episodes.slice(0, limit) : episodes);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching the podcast feed:", error);
        setLoading(false);
      }
    };

    fetchPodcastFeed();
  }, [limit]);

  const formatDescription = (description) => {
    let formattedDesc = description.replace(/\n/g, '<br>');
    formattedDesc = formattedDesc.replace(/(\d{1,2}):(\d{2}):(\d{2})|(\d{1,2}):(\d{2})/g, (match) => {
      const parts = match.split(':');
      const seconds = parts.length === 3 
        ? parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
        : parseInt(parts[0]) * 60 + parseInt(parts[1]);
      return `<span class="timestamp" data-time="${seconds}">${match}</span>`;
    });
    return formattedDesc;
  };

  const handleTimestampClick = (event) => {
    if (event.target.classList.contains('timestamp')) {
      event.preventDefault();
      event.stopPropagation();
      
      const timeInSeconds = parseInt(event.target.getAttribute('data-time'));
      
      setCurrentEpisode(selectedEpisode, { 
        time: timeInSeconds,
        shouldPlay: true 
      });
    }
  };

  const handleEpisodeSelect = (episode) => {
    setSelectedEpisode(episode);
  };

  const handlePlayPause = (episode, e) => {
    e.stopPropagation();
    if (currentEpisode?.audioUrl === episode.audioUrl) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentEpisode(episode);
      setIsPlaying(true);
    }
  };

  const handleModalPlayPause = (e) => {
    e.stopPropagation();
    if (selectedEpisode === currentEpisode) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentEpisode(selectedEpisode, { 
        shouldPlay: true 
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedEpisode(null);
  };

  const handleOutsideClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      handleCloseModal();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Preview mode
  if (preview) {
    return (
      <div className="preview-episode-list" style={{ width: '50%' }}>
        {episodes.slice(0, 3).map((episode, index) => (
          <div 
          key={index} 
          className="episode clickable-episode" 
          onClick={() => handleEpisodeSelect(episode)}
        >
          <img src={episode.imageUrl} alt="Podcast cover" className="episode-image" />
          <div className="episode-overlay">
            <div className="episode-details">
              <h3 className="episode-title">{episode.title}</h3>
              <p className="episode-date">{episode.pubDate}</p>
            </div>
          </div>
          <div 
            className={`play-button ${currentEpisode?.audioUrl === episode.audioUrl && isPlaying ? 'playing' : ''}`}
            onClick={(e) => handlePlayPause(episode, e)}
          />
        </div>
        ))}
      </div>
    );
  }

  // Full mode
  return (
    <div style={{ position: 'relative' }}>
      <div className="podcast-header">
        <div className="header-content">
          <div className="title-with-info">
            <h1 className="podcast-header-text">THE WILLPOWER PODCAST</h1>
            <button 
              className="info-button"
              onClick={() => setShowDescription(!showDescription)}
              aria-label="Show podcast description"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
            </button>
          </div>
          <div className={`description-popover ${showDescription ? 'visible' : ''}`}>
            <p>{podcastDescription}</p>
          </div>
        </div>
        <PodcastLinks />
      </div>
      <div className="episode-list">
        {episodes.map((episode, index) => (
          <div 
            key={index} 
            className="episode clickable-episode" 
            onClick={() => handleEpisodeSelect(episode)}
          >
            <img src={episode.imageUrl} alt="Podcast cover" className="episode-image" />
            <div className="episode-overlay">
              <div className="episode-details">
                <h3 className="episode-title">{episode.title}</h3>
                <p className="episode-date">{episode.pubDate}</p>
              </div>
            </div>
            <div 
              className={`play-button ${currentEpisode?.audioUrl === episode.audioUrl && isPlaying ? 'playing' : ''}`}
              onClick={(e) => handlePlayPause(episode, e)}
            />
          </div>
        ))}
      </div>

      {selectedEpisode && (
        <PodcastModal
          episode={selectedEpisode}
          onClose={handleCloseModal}
          onPlayPause={handleModalPlayPause}
          isPlaying={isPlaying}
          isCurrentEpisode={selectedEpisode === currentEpisode}
          onTimestampClick={handleTimestampClick}
        />
      )}
    </div>
  );
};

export default PodcastFeed;
