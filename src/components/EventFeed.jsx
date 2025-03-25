import React from 'react';
import './EventFeed.css';

const EventFeed = ({ preview }) => {
  if (preview) {
    return (
      <div className="preview-event-list">
        <p>Check out upcoming events on Luma</p>
      </div>
    );
  }

  return (
    <div className="event-feed">
      <div className="event-header">
        <h1 className="event-header-text">UPCOMING EVENTS</h1>
      </div>
      <div className="calendar-container">
        <iframe
          src="https://lu.ma/embed/calendar/cal-DEbnYgDbsEcgAcQ/events"
          width="600"
          height="450"
          frameBorder="0"
          title="Willpower Events Calendar"
          allowFullScreen
          aria-hidden="false"
          tabIndex="0"
        />
      </div>
    </div>
  );
};

export default EventFeed;