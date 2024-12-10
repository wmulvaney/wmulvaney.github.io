import React from 'react';
import './EventFeed.css';

const EventFeed = ({ activeComponent }) => {
    return (
        activeComponent === 'events' && (
            <div className="event-feed">
                <iframe
                    className="event-feed-iframe"
                    title="Event Feed"
                    src="https://lu.ma/embed/calendar/cal-DEbnYgDbsEcgAcQ/events?"
                    width="100%"
                    height="100vh"
                    frameBorder="0"
                    allowFullScreen={true}
                    aria-hidden="false"
                    tabIndex="0"
                    style={{ minHeight: '600px', height: '100vh', width: '100%' }}
                ></iframe>
            </div>
        )
    );
};

export default EventFeed;