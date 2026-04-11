import React from 'react';
import '../styles/Business.css';
import proCalLogo from '../resources/procal_logo.png';
import completeCanineLogo from '../resources/Complete_Canine.png';
import qualiaLogo from '../resources/Qualia.png';

function Business({ compact = false }) {
  const ventures = [
    {
      name: "Qualia",
      logo: qualiaLogo,
      description: "An AI-powered life quality tracking app that helps you understand how your daily habits impact your wellbeing. Track mood, energy, mental clarity, and more with personalized insights and behavioral analysis.",
      status: "Early Access",
      statusType: "active",
      link: "https://livequalia.app"
    }
  ];

  return (
    <div className="business">
      {!compact && (
        <div className="business-intro">
          <h1>Entrepreneurial Ventures</h1>
          <p>
            I've always been driven by the excitement of bringing new ideas to life.
            This section showcases my current entrepreneurial ventures - projects where
            I've identified problems and am working to create innovative solutions.
            Each venture represents a unique challenge and an opportunity to learn,
            grow, and create value for others.
          </p>
        </div>
      )}

      <div className="ventures-grid">
        {ventures.map((venture, index) => (
          <div 
            key={index} 
            className="venture-card"
            onClick={() => venture.link && window.open(venture.link, '_blank')}
            style={{ cursor: venture.link ? 'pointer' : 'default' }}
          >
            {venture.logo && (
              <div className="venture-logo">
                <img src={venture.logo} alt={`${venture.name} logo`} />
              </div>
            )}
            <div className="venture-info">
              <h3>{venture.name}</h3>
              <p className="venture-description">{venture.description}</p>
              <span className="venture-status" data-status={venture.statusType}>{venture.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Business; 
