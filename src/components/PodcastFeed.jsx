import React, { useEffect, useState, useRef } from 'react';
import PodcastLinks from './PodcastLinks';  
import './PodcastFeed.css';
import he from 'he';

const PodcastFeed = ({ activeComponent }) => {
  const [episodes, setEpisodes] = useState([]);
  const [podcastDescription, setPodcastDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioRef = useRef(null);
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

        setEpisodes(episodes);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching the podcast feed:", error);
        setLoading(false);
      }
    };

    fetchPodcastFeed();
  }, []);

  const formatDescription = (description) => {
    let formattedDesc = description.replace(/\n/g, '<br>');
    formattedDesc = formattedDesc.replace(/(\d{1,2}):(\d{2}):(\d{2})|(\d{1,2}):(\d{2})/g, (match, h, m, s, mm, ss) => {
      if (h) {
        return `<span class="timestamp" data-time="${h}:${m}:${s}">${match}</span>`;
      } else {
        return `<span class="timestamp" data-time="${mm}:${ss}">${match}</span>`;
      }
    });
    return formattedDesc;
  };

  const loadAudio = (episode) => {
    return new Promise((resolve, reject) => {
      if (!audioRef.current) {
        console.warn("Audio element not found, creating a new one");
        audioRef.current = new Audio();
      }
      audioRef.current.src = episode.audioUrl;
      audioRef.current.load();
      audioRef.current.oncanplaythrough = resolve;
      audioRef.current.onerror = reject;
    });
  };

  const handleTimestampClick = async (event) => {
    if (event.target.classList.contains('timestamp')) {
      event.preventDefault();
      event.stopPropagation();
      const timeString = event.target.getAttribute('data-time');
      const timeParts = timeString.split(':').map(Number);
      let timeInSeconds;
      
      if (timeParts.length === 3) {
        timeInSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      } else {
        timeInSeconds = timeParts[0] * 60 + timeParts[1];
      }
      
      setIsAudioLoading(true);
      
      try {
        if (currentEpisode !== selectedEpisode) {
          setCurrentEpisode(selectedEpisode);
          await loadAudio(selectedEpisode);
        }
        
        if (audioRef.current) {
          audioRef.current.currentTime = timeInSeconds;
          await audioRef.current.play();
          setIsPlaying(true);
        } else {
          console.error("Audio element still not available after loading");
        }
      } catch (error) {
        console.error("Error playing audio:", error);
      } finally {
        setIsAudioLoading(false);
      }
    }
  };

  const handleEpisodeSelect = (episode) => {
    setSelectedEpisode(episode);
    // Remove the following lines to prevent changing the current episode
    // if (currentEpisode !== episode) {
    //   setCurrentEpisode(episode);
    //   setIsPlaying(false);
    // }
  };

  const handlePlayPause = (episode, e) => {
    e.stopPropagation();
    if (currentEpisode === episode) {
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
      setCurrentEpisode(selectedEpisode);
      setIsPlaying(true);
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

  useEffect(() => {
    const mainAudio = audioRef.current;

    if (mainAudio) {
      const handleCanPlay = () => {
        setIsAudioLoading(false);
        if (isPlaying) {
          mainAudio.play().catch(error => console.error("Error playing audio:", error));
        }
      };

      const handleError = (error) => {
        console.error("Error loading audio:", error);
        setIsAudioLoading(false);
      };

      mainAudio.addEventListener('canplay', handleCanPlay);
      mainAudio.addEventListener('error', handleError);

      return () => {
        mainAudio.removeEventListener('canplay', handleCanPlay);
        mainAudio.removeEventListener('error', handleError);
      };
    }
  }, [isPlaying, currentEpisode]);

  useEffect(() => {
    if (audioRef.current && currentEpisode) {
      if (isPlaying) {
        audioRef.current.play().catch(error => console.error("Error playing audio:", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentEpisode]);

  window.addEventListener('scroll', () => {
    const podcastHeader = document.querySelector('.podcast-header');
    const podcastLinks = document.querySelector('.podcast-links');
    if (podcastLinks?.style) {
      podcastLinks.style.top = `${podcastHeader.offsetHeight - 50}px`;
    }
});

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ position: 'relative' }}>
      {activeComponent === 'podcast' && (
        <>
          <div className="podcast-header">
            <h1 className="podcast-header-text">THE WILLPOWER PODCAST</h1>
          </div>
          <p className="podcast-description">{podcastDescription}</p>
          <PodcastLinks />  
          <div className="episode-list">
            {episodes.map((episode, index) => (
              <div key={index} className="episode clickable-episode" onClick={() => handleEpisodeSelect(episode)}>
                <img src={episode.imageUrl} alt="Podcast cover" className="episode-image" />
                <div className="episode-details">
                  <h3 className="episode-title">{episode.title}</h3>
                  <p className="episode-date">{episode.pubDate}</p>
                </div>
                <div 
                  className={`play-button ${currentEpisode === episode && isPlaying ? 'playing' : ''}`} 
                  onClick={(e) => handlePlayPause(episode, e)}
                />
              </div>
            ))}
          </div>

          {selectedEpisode && (
            <div className="modal" onClick={handleOutsideClick}>
              <div className="modal-content" ref={modalRef}>
                <button className="close-modal-btn" onClick={handleCloseModal}>✕</button>
                <div className="modal-header">
                  <div className="modal-image-and-title">
                    <img src={selectedEpisode.imageUrl} alt="Podcast cover" className="modal-image" />
                    <div className="modal-title-container">
                      <h2 className="modal-title">{selectedEpisode.title}</h2>
                      <p className="modal-date">{selectedEpisode.pubDate}</p>
                    </div>
                  </div>
                  <div className="modal-play-button-wrapper">
                    <button 
                      className={isPlaying && selectedEpisode === currentEpisode ? 'playing' : ''}
                      onClick={handleModalPlayPause}
                      disabled={isAudioLoading}
                      aria-label={isPlaying && selectedEpisode === currentEpisode ? 'Pause' : 'Play'}
                    >
                      {isAudioLoading ? 'Loading...' : ''}
                    </button>
                  </div>
                </div>
                <div className="modal-scrollable-content">
                  <div 
                    className="modal-description" 
                    dangerouslySetInnerHTML={{ __html: selectedEpisode.description }}
                    onClick={handleTimestampClick}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {currentEpisode && (
        <div className="podcast-player">
          <div className="player-info">
            <img src={currentEpisode.imageUrl} alt="Podcast cover" className="player-image" />
            <div className="episode-info">
              <h4 className="episode-title">{currentEpisode.title}</h4>
            </div>
            <button className="close-btn" onClick={() => setCurrentEpisode(null)}>✕</button>
          </div>
          <audio 
            ref={audioRef} 
            controls
            src={currentEpisode.audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadStart={() => setIsAudioLoading(true)}
            onCanPlay={() => setIsAudioLoading(false)}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default PodcastFeed;
