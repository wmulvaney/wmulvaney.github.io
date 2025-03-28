import React from 'react';
import '../styles/Business.css';
import proCalLogo from '../resources/procal_logo.png';
import completeCanineLogo from '../resources/Complete_Canine.png';

function Business() {
  const ventures = [
    {
      name: "ProCal",
      logo: proCalLogo,
      description: "Your personal AI nutrition coach that provides customized meal plans and real-time guidance to help you achieve your fitness and health goals.",
      status: "In Development",
      statusType: "development"
    },
    {
      name: "Complete Canine",
      logo: completeCanineLogo,
      description: "A comprehensive all-in-one liquid dog supplement designed to provide your canine companion with all the essential nutrients they need for optimal health.",
      status: "Order Today",
      statusType: "active",
      link: "https://completecanine.shop"
    }
  ];

  return (
    <div className="business">
      <h1>Business Ventures</h1>
      
      <div className="business-intro">
        <h2>Entrepreneurial Ventures</h2>
        <p>
          I've always been driven by the excitement of bringing new ideas to life. 
          This section showcases my current entrepreneurial ventures - projects where 
          I've identified problems and am working to create innovative solutions. 
          Each venture represents a unique challenge and an opportunity to learn, 
          grow, and create value for others.
        </p>
      </div>

      <div className="ventures-grid">
        {ventures.map((venture, index) => (
          <div 
            key={index} 
            className="venture-card"
            onClick={() => venture.link && window.open(venture.link, '_blank')}
            style={{ cursor: venture.link ? 'pointer' : 'default' }}
          >
            <div className="venture-logo">
              <img src={venture.logo} alt={`${venture.name} logo`} />
            </div>
            <div className="venture-info">
              <h3>{venture.name}</h3>
              <p className="venture-description">{venture.description}</p>
              <span className="venture-status">{venture.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Business; 