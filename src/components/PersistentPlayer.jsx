// PersistentPlayer.jsx
import React, { useEffect, useState, useRef } from 'react';
import './PersistentPlayer.css';

const PersistentPlayer = ({ episode, isPlaying, setIsPlaying, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, []);

  useEffect(() => {
    const loadAndPlayAudio = async () => {
      if (episode) {
        audioRef.current.src = episode.audioUrl;
        audioRef.current.load();
        if (isPlaying) {
          try {
            await audioRef.current.play();
          } catch (error) {
            console.error('Error playing audio:', error);
          }
        }
      }
    };
    loadAndPlayAudio();
  }, [episode, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play().catch(error => console.error('Error playing:', error));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const progressBar = e.currentTarget;
    const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
    audioRef.current.currentTime = clickPosition * audioRef.current.duration;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!episode) {
    return null;
  }

  return (
    <div className="podcast-player">
      <div className="player-info">
        <img src={episode.imageUrl} alt="Podcast cover" className="player-image" />
        <div className="episode-info">
          <h4 className="episode-title">{episode.title}</h4>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="progress-bar" onClick={handleProgressClick}>
        <div className="progress" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="controls">
        <div
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlayPause}
        ></div>
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default PersistentPlayer;
