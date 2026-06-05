import React from 'react';
import './EventFeed.css';

const EventFeed = ({ preview, showHeader = true }) => {
  return (
    <div className="event-feed">
      {!preview && showHeader && (
        <div className="event-header">
          <h1 className="event-header-text">UPCOMING EVENTS</h1>
        </div>
      )}
      <div className="luma-embed-shell">
        <iframe
          src="https://luma.com/embed/calendar/cal-DEbnYgDbsEcgAcQ/events"
          frameBorder="0"
          style={{ border: 'none', width: '100%' }}
          allowFullScreen
          title="Upcoming Events"
        />
      </div>
      <div className="event-feed-footer">
        <a
          href="https://lu.ma/willpower"
          target="_blank"
          rel="noopener noreferrer"
          className="event-view-all"
        >
          View all events →
        </a>
      </div>
    </div>
  );
};

export default EventFeed;
