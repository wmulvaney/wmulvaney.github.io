import React, { useEffect, useState, useRef } from 'react';
import './SubstackFeed.css'; // Import the CSS file
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const CONTENT_NS = 'http://purl.org/rss/1.0/modules/content/';
const MEDIA_NS = 'http://search.yahoo.com/mrss/';
const DEFAULT_SUBSTACK_IMAGE = 'https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7c64c3cd-dcf7-482a-8beb-77af1dd7e752_1600x1600.jpeg';

const getNodeText = (parent, tagName, namespace) => {
  if (!parent) return '';

  if (namespace) {
    const namespacedNode = parent.getElementsByTagNameNS(namespace, tagName)[0];
    if (namespacedNode?.textContent) return namespacedNode.textContent;
  }

  return parent.getElementsByTagName(tagName)[0]?.textContent || '';
};

const getImageUrlFromNode = (parent) => {
  if (!parent) return '';

  const mediaContent = parent.getElementsByTagNameNS(MEDIA_NS, 'content')[0]?.getAttribute('url');
  if (mediaContent) return mediaContent;

  const mediaThumbnail = parent.getElementsByTagNameNS(MEDIA_NS, 'thumbnail')[0]?.getAttribute('url');
  if (mediaThumbnail) return mediaThumbnail;

  const enclosureImage = Array.from(parent.getElementsByTagName('enclosure')).find(
    (node) => (node.getAttribute('type') || '').startsWith('image/')
  )?.getAttribute('url');
  if (enclosureImage) return enclosureImage;

  const description = getNodeText(parent, 'description');
  const encodedContent = getNodeText(parent, 'encoded', CONTENT_NS) || getNodeText(parent, 'content:encoded');
  const html = `${encodedContent}\n${description}`;
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);

  return imgMatch?.[1] || '';
};

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
    console.log('SubstackFeed mounted, preview:', preview, 'limit:', limit);
    const proxies = [
      url => `https://corsproxy.io/?${url}`,
      url => `https://thingproxy.freeboard.io/fetch/${url}`,
      url => `https://api.codetabs.com/v1/proxy/?quest=${url}`,
    ];
    const substackUrl = 'https://williammulvaney.substack.com/feed';

    const fetchWithProxies = async () => {
      let lastError = null;
      for (const proxy of proxies) {
        try {
          const proxiedUrl = proxy(encodeURIComponent(substackUrl));
          const response = await fetch(proxiedUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const text = await response.text();
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, "application/xml");
          const parseError = xml.querySelector('parsererror');
          if (parseError) throw new Error('XML parsing error: ' + parseError.textContent);
          const channel = xml.getElementsByTagName("channel")[0];
          if (!channel) throw new Error('No channel element found in feed');
          const description = channel.getElementsByTagName("description")[0]?.textContent || "No description available";
          setDescription(description);
          const items = Array.from(xml.getElementsByTagName("item"));
          const articles = items.map(item => {
            const content = getNodeText(item, 'encoded', CONTENT_NS) || getNodeText(item, 'content:encoded');
            const description = getNodeText(item, 'description');
            const cleanContent = content.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
            const cleanDescription = description.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
            const imageUrl = getImageUrlFromNode(item) || DEFAULT_SUBSTACK_IMAGE;
            const rawTitle = item.getElementsByTagName('title')[0]?.textContent || "No title";
            const title = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
            const subtitle = cleanDescription.split('\n')[0].replace(/<[^>]+>/g, '').trim();
            return {
              title: title,
              subtitle: subtitle,
              pubDate: new Date(item.getElementsByTagName('pubDate')[0]?.textContent || "").toDateString(),
              link: item.getElementsByTagName('link')[0]?.textContent || "#",
              description: cleanDescription,
              content: cleanContent,
              hasImage: !!imageUrl,
              image: imageUrl
            };
          });
          setArticles(limit ? articles.slice(0, limit) : articles);
          setLoading(false);
          setError(null);
          return;
        } catch (err) {
          lastError = err;
          continue;
        }
      }
      setError(lastError ? lastError.message : 'Unknown error');
      setLoading(false);
    };
    fetchWithProxies();
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
    // If there's an error, only show the subscribe iframe (no article block)
    if (preview) return null;
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
