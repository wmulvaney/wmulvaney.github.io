import React, { useEffect, useState, useRef } from 'react';
import './SubstackFeed.css'; // Import the CSS file
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const SubstackFeed = ({ preview = false, limit = null }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null); // Store the selected article
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    console.log('SubstackFeed mounted, preview:', preview, 'limit:', limit);
    const fetchSubstackFeed = async () => {
      try {
        // Use a CORS proxy to access the feed
        const corsProxy = 'https://api.allorigins.win/get?url=';
        const substackUrl = encodeURIComponent('https://williammulvaney.substack.com/feed');
        const response = await fetch(`${corsProxy}${substackUrl}`);
        
        console.log('Substack response:', response);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Substack data:', data);
        const text = data.contents;
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");
        
        const parseError = xml.querySelector('parsererror');
        if (parseError) {
          throw new Error('XML parsing error: ' + parseError.textContent);
        }

        const channel = xml.getElementsByTagName("channel")[0];
        if (!channel) {
          throw new Error('No channel element found in feed');
        }

        const description = channel.getElementsByTagName("description")[0]?.textContent || "No description available";
        setDescription(description);

        const items = Array.from(xml.getElementsByTagName("item"));
        
        const articles = items.map(item => {
          // Get the content from CDATA section
          const content = item.getElementsByTagName('content:encoded')[0]?.textContent || '';
          const description = item.getElementsByTagName('description')[0]?.textContent || '';
          
          // Clean up the content by removing CDATA markers
          const cleanContent = content.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
          const cleanDescription = description.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
          
          // Try to find image in different possible locations
          const imgMatch = cleanContent.match(/<img[^>]+src="([^">]+)"/);
          const defaultImage = 'https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7c64c3cd-dcf7-482a-8beb-77af1dd7e752_1600x1600.jpeg';
          
          // Get the title without CDATA markers
          const rawTitle = item.getElementsByTagName('title')[0]?.textContent || "No title";
          const title = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');

          // Get subtitle from description or first paragraph
          const subtitle = cleanDescription.split('\n')[0].replace(/<[^>]+>/g, '').trim();

          return {
            title: title,
            subtitle: subtitle,
            pubDate: new Date(item.getElementsByTagName('pubDate')[0]?.textContent || "").toDateString(),
            link: item.getElementsByTagName('link')[0]?.textContent || "#",
            description: cleanDescription,
            content: cleanContent,
            hasImage: !!imgMatch,
            image: imgMatch?.[1] || defaultImage
          };
        });

        setArticles(limit ? articles.slice(0, limit) : articles);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching the Substack feed:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchSubstackFeed();
  }, [limit]);

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
    return <div>Error loading Substack feed: {error}</div>;
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
