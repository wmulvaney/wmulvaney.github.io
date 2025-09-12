import React, { useState, useEffect } from 'react';
import './LatestVideo.css';

const LatestVideo = () => {
  const [latestVideo, setLatestVideo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const channelId = 'UCf7XVnPzsixuKFYF1hwId-A';
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        setLoading(true);
        // First get list of recent videos
        let response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10&type=video&videoDuration=any`
        );
        let data = await response.json();
        console.log('YouTube API response:', data);
        if (data.error) {
          throw new Error(data.error.message || 'YouTube API error');
        }
        
        if (data.items.length > 0) {
          // Get video details to check duration
          const videoIds = data.items.map(item => item.id.videoId).join(',');
          const detailsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds}&part=contentDetails`
          );
          const detailsData = await detailsResponse.json();
          
          // Find first video longer than 90 seconds
          const longVideo = data.items.find((item, index) => {
            const details = detailsData.items[index];
            const duration = parseDuration(details.contentDetails.duration);
            return duration > 90;
          });
          
          if (longVideo) {
            setLatestVideo(longVideo);
          } else {
            throw new Error('No long-form videos found');
          }
        } else {
          throw new Error('No videos found');
        }
      } catch (error) {
        console.error('Error fetching latest video:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestVideo();
  }, [apiKey]);

  // Helper function to parse YouTube duration format (PT1H2M10S) to seconds
  const parseDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
  };

  if (loading) return null;
  if (error || !latestVideo) return null;

  return (
    <div className="latest-video-container">
      <iframe
        width="100%"
        height={window.innerWidth < 768 ? '300' : '600'}
        src={`https://www.youtube.com/embed/${latestVideo.id.videoId}`}
        title="Latest YouTube video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

export default LatestVideo; 