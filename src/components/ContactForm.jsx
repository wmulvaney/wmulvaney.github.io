import React from 'react';
import './ContactForm.css';

const ContactForm = () => {
  return (
    <div className="contact-form-container">
      <div className="contact-form-header">
        <h2>Get In Touch</h2>
        <p>
          If you know someone who should be on the show or need to reach me for any other reason, 
          don't hesitate to get in touch. I'd love to hear from you!
        </p>
      </div>
      
      <form 
        action="https://formsubmit.co/8e1ece6d01afba749223e8cba5624874" 
        method="POST"
        className="contact-form"
      >
        {/* Honeypot for spam protection */}
        <input type="text" name="_honey" style={{ display: 'none' }} />
        
        {/* Disable captcha */}
        <input type="hidden" name="_captcha" value="false" />
        
        {/* Custom subject line */}
        <input type="hidden" name="_subject" value="New contact from williammulvaney.com" />
        
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input 
            type="text" 
            id="name"
            name="name" 
            required 
            placeholder="Your full name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input 
            type="email" 
            id="email"
            name="email" 
            required 
            placeholder="your.email@example.com"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <select id="subject" name="subject">
            <option value="Podcast Guest Suggestion">Podcast Guest Suggestion</option>
            <option value="Podcast Comment">Podcast Reflection</option>
            <option value="Speaking Opportunity">Speaking Opportunity</option>
            <option value="Business Inquiry">Business Inquiry</option>
            <option value="Collaboration">Collaboration</option>
            <option value="General Inquiry">General Inquiry</option>
            <option value="Random Thought For Will">Random Thought For Will</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea 
            id="message"
            name="message" 
            required 
            rows="6"
            placeholder="Tell me about your idea, suggestion, or how I can help you..."
          />
        </div>
        
        <button type="submit" className="submit-button">
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm; 