import React, { useEffect, useState, useRef } from 'react';
import './SubstackFeed.css'; // Import the CSS file
import he from 'he';

const SubstackFeed = ({ activeComponent }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null); // Store the selected article
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchSubstackFeed = async () => {
      try {
        const response = await fetch('https://thingproxy.freeboard.io/fetch/https://williammulvaney.substack.com/feed');
    
        const data = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");

        const items = Array.from(xml.getElementsByTagName("item"));
        const articles = items.map(item => ({
          title: item.getElementsByTagName('title')[0]?.textContent || "No title",
          pubDate: new Date(item.getElementsByTagName('pubDate')[0]?.textContent || "").toDateString(),
          link: item.getElementsByTagName('link')[0]?.textContent || "#",
          description: he.decode(item.getElementsByTagName('description')[0]?.textContent) || "No description",
          content: item.getElementsByTagName('content:encoded')[0]?.textContent || item.getElementsByTagName('description')[0]?.textContent || "No content available",
        }));

        setArticles(articles);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchSubstackFeed();
  }, []);

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
    return <div>Loading Substack feed...</div>;
  }

  return (
    activeComponent === 'substack' && (
      <div className="substack-feed">
        {/* <h1 className="substack-header">The Willpower Substack</h1>
        <p className="newsletter-description">{newsletterDescription}</p> */}
        <iframe
                  title="Substack Embed"
                  src="https://williammulvaney.substack.com/embed"
                  width="100%"
                  height="320"
                  className="iframe-container"
                  frameBorder="0"
                  scrolling="yes"
        ></iframe>

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

        <div className="article-list">
          {articles.map((article, index) => (
            <div
              key={index}
              className="article clickable-article"
              onClick={() => handleArticleClick(article)}
            >
              <h3 className="article-title">{article.title}</h3>
              <p className="article-description">{article.description}</p>
              <p className="article-date">{article.pubDate}</p>
            </div>
          ))}
        </div>
      </div>
    )
  );
};

export default SubstackFeed;
