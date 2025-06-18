import React from 'react';
import './NewsletterBox.css';

const NewsletterBox = () => {
  return (
    <div className="newsletter-embed">
      <iframe 
        src="https://embeds.beehiiv.com/dc8ed4f2-5d1e-4530-b408-65ca0d410fa9" 
        data-test-id="beehiiv-embed" 
        width="100%" 
        height="320" 
        frameBorder="0" 
        scrolling="no" 
        style={{borderRadius: '10px', border: '2px solid #e5e7eb', margin: 0, backgroundColor: 'transparent'}}
      ></iframe>
    </div>
  );
};

export default NewsletterBox; 