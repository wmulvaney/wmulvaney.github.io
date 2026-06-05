import React, { useEffect, useState, useRef } from 'react';
import './SubstackFeed.css'; // Import the CSS file
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const SubstackFeed = ({ preview = false, limit = null, showHeader = true }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null); // Store the selected article
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const modalRef = useRef(null);
  const observerRef = useRef();

  useEffect(() => {
    const fetchGeneratedFeed = async () => {
      try {
        const response = await fetch(`/substack-feed.json?ts=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const payload = await response.json();
        const nextArticles = Array.isArray(payload.articles) ? payload.articles : [];

        setDescription(payload.description || 'No description available');
        setArticles(limit ? nextArticles.slice(0, limit) : nextArticles);
        setLoading(false);
        setError(null);
      } catch (err) {
        setError(err?.message || 'Unknown error');
        setLoading(false);
      }
    };

    fetchGeneratedFeed();
  }, [limit]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observerRef.current.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll('.clickable-article:not(.visible)');
    elements.forEach(el => observerRef.current.observe(el));
  }, [articles]);

  // Handle article click to open the modal reader
  const handleArticleClick = (article) => {
    setSelectedArticle(article);
  };

  // Handle closing the modal reader
  const handleCloseReader = () => {
    setSelectedArticle(null);
  };

  // Handle clicking outside the modal
  const handleOutsideClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      handleCloseReader();
    }
  };

  if (loading) {
    return <div>Loading Substack articles...</div>;
  }

  if (error) {
    if (preview) {
      return (
        <div className="substack-fallback">
          <p className="substack-fallback-text">Essays on discipline, performance, and building.</p>
          <a
            href="https://williammulvaney.substack.com"
            target="_blank"
            rel="noreferrer"
            className="substack-fallback-link"
          >
            Read on Substack →
          </a>
        </div>
      );
    }
    return (
      <div className="subscription-container">
        <iframe
          src="https://williammulvaney.substack.com/embed"
          width="480"
          height="150"
          frameBorder="0"
          scrolling="no"
          title="Subscribe to Willpower Substack"
        />
      </div>
    );
  }

  // Preview mode
  if (preview) {
    return (
      <div className="preview-article-list">
        {articles.map((article, index) => (
          <div 
            key={index}
            className={`substack-article clickable-article ${!article.hasImage ? 'no-image' : ''}`}
            onClick={() => window.open(article.link, '_blank')}
          >
            {article.hasImage ? (
              <img src={article.image} alt="Article cover" className="substack-article-image" />
            ) : (
              <div className="substack-article-placeholder" />
            )}
            <div className="substack-article-overlay">
              <div className="substack-article-details">
                <h3 className="substack-article-title">{article.title}</h3>
                <p className="substack-article-subtitle">{article.subtitle}</p>
                <p className="substack-article-date">{article.pubDate}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Full mode
  return (
    <div style={{ position: 'relative' }}>
      {showHeader && (
        <div className="substack-header">
          <div className="header-content">
            <div className="title-section">
              <div className="title-with-info">
                <h1 className="substack-header-text">THE WILLPOWER SUBSTACK</h1>
                <button 
                  className="info-button"
                  onClick={() => setShowDescription(!showDescription)}
                  aria-label="Show Substack description"
                >
                  <FontAwesomeIcon icon={faInfoCircle} />
                </button>
              </div>
              <div className={`description-popover ${showDescription ? 'visible' : ''}`}>
                <p>{description}</p>
              </div>
              <div className="subscription-container">
                <iframe 
                  src="https://williammulvaney.substack.com/embed" 
                  width="480" 
                  height="150" 
                  frameBorder="0" 
                  scrolling="no"
                  title="Subscribe to Willpower Substack"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="article-list">
        {articles.map((article, index) => (
          <div 
            key={index}
            className={`substack-article clickable-article ${!article.hasImage ? 'no-image' : ''}`}
            onClick={() => window.open(article.link, '_blank')}
          >
            {article.hasImage ? (
              <img src={article.image} alt="Article cover" className="substack-article-image" />
            ) : (
              <div className="substack-article-placeholder" />
            )}
            <div className="substack-article-overlay">
              <div className="substack-article-details">
                <h3 className="substack-article-title">{article.title}</h3>
                <p className="substack-article-subtitle">{article.subtitle}</p>
                <p className="substack-article-date">{article.pubDate}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedArticle && (
        <div className="modal" onClick={handleOutsideClick}>
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <button 
                className="open-substack-btn" 
                onClick={() => window.open(selectedArticle.link, "_blank")}
                aria-label="Open in Substack" // Add this for accessibility
              />
              <button className="close-modal-btn" onClick={handleCloseReader}>
                ✕
              </button>
            </div>
            <article className="article-details">
              <h2 className="article-title">{selectedArticle.title}</h2>
              <p className="article-description">{selectedArticle.description}</p>
              <p className="article-author">
                {selectedArticle.author || 'William Mulvaney'}
              </p>
              <p className="article-date">{selectedArticle.pubDate}</p>
              <div 
                className="article-content" 
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }} 
              />
            </article>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubstackFeed;
