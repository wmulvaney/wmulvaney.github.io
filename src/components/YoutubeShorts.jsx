import React, { useState, useEffect } from 'react';
import './YoutubeShorts.css';

const YoutubeShorts = ({ preview = false, limit = null }) => {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShort, setSelectedShort] = useState(null);

  const handleShortClick = (short) => {
    setSelectedShort(short);
  };

  const handleCloseModal = () => {
    setSelectedShort(null);
  };

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        const playlistId = 'PL4YfptIK2xeM9TJRoB28BCQ_AFThFUZv6';
        const maxResults = limit || 10;
        
        const response = await fetch(
          `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const shortsData = data.items.map(item => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          publishedAt: new Date(item.snippet.publishedAt).toDateString()
        }));

        setShorts(shortsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching YouTube shorts:', error);
        setLoading(false);
      }
    };

    fetchShorts();
  }, [limit]);

  if (loading) return <div>Loading shorts...</div>;

  if (preview) {
    return (
      <>
        <div className="shorts-preview">
          {shorts.map(short => (
            <div 
              key={short.id} 
              className="short-preview"
              onClick={() => handleShortClick(short)}
            >
              <div className="short-thumbnail-container">
                <img src={short.thumbnail} alt={short.title} className="short-thumbnail" />
                <div className="short-overlay">
                  <h3 className="short-title">{short.title}</h3>
                  <p className="short-date">{short.publishedAt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {selectedShort && (
          <div className="shorts-modal" onClick={handleCloseModal}>
            <div 
              className="shorts-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <button className="close-modal-btn" onClick={handleCloseModal}>✕</button>
              <iframe
                src={`https://www.youtube.com/embed/${selectedShort.id}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // Full view implementation here...
  return (
    <div className="shorts-grid">
      {/* Similar to preview but with more shorts */}
    </div>
  );
};

export default YoutubeShorts; 