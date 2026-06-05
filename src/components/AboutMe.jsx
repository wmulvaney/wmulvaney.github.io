import React from 'react';
import './AboutMe.css';

const AboutMe = () => {
  return (
    <div className="about-section">
      <p className="mini-kicker" style={{ color: 'var(--muted)', marginBottom: '0.85rem' }}>About me</p>
      <div className="about-content">
        <p>
          I'm Will — software engineer in Austin, TX. I started the Willpower Podcast to have honest
          conversations about discipline, performance, and building a life on your own terms.
          100+ episodes later, it's become a community of people who take their growth seriously.
        </p>
        <p>
          Outside the mic, I'm building Grooves — a habit intelligence app I made because I wanted to
          understand what actually moves the needle for me, not just copy someone else's morning routine.
        </p>
        <p className="about-tagline">Engineering by day. Building by choice.</p>
      </div>
    </div>
  );
};

export default AboutMe;
