import React, { useEffect, useRef, useState } from 'react';
import '../styles/ReadingList.css';

function ReadingList({ compact = false, limit = null }) {
  const railRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const books = [
    {
      title: "Deep Work",
      author: "Cal Newport",
      image: "https://images-na.ssl-images-amazon.com/images/P/1455586692.01.L.jpg",
      link: "https://www.amazon.com/Deep-Work-Focused-Success-Distracted/dp/1455586692",
      description: "Rules for Focused Success in a Distracted World"
    },
    {
      title: "Atlas Shrugged",
      author: "Ayn Rand",
      image: "https://images-na.ssl-images-amazon.com/images/P/0451191145.01.L.jpg",
      link: "https://www.amazon.com/Atlas-Shrugged-Ayn-Rand/dp/0451191145",
      description: "A philosophical revolution told through an epic story of industrial achievement"
    },
    {
      title: "Can't Hurt Me",
      author: "David Goggins",
      image: "https://images-na.ssl-images-amazon.com/images/P/1544507852.01.L.jpg",
      link: "https://www.amazon.com/Cant-Hurt-Me-Master-Your/dp/1544507852",
      description: "Master Your Mind and Defy the Odds"
    },
    {
      title: "How to Think Like a Roman Emperor",
      author: "Donald Robertson",
      image: "https://images-na.ssl-images-amazon.com/images/P/1250196620.01.L.jpg",
      link: "https://www.amazon.com/How-Think-Like-Roman-Emperor/dp/1250196620",
      description: "The Stoic Philosophy of Marcus Aurelius"
    },
    {
      title: "Red Rising",
      author: "Pierce Brown",
      image: "https://images-na.ssl-images-amazon.com/images/P/0345539788.01.L.jpg",
      link: "https://www.amazon.com/Red-Rising-Pierce-Brown/dp/0345539788",
      description: "A science fiction series that explores themes of power, loyalty, and revolution"
    },
    {
      title: "The Brothers Karamazov",
      author: "Fyodor Dostoevsky",
      image: "https://images-na.ssl-images-amazon.com/images/P/0374528373.01.L.jpg",
      link: "https://www.amazon.com/Brothers-Karamazov-Fyodor-Dostoevsky/dp/0374528373",
      description: "A philosophical novel that explores faith, doubt, and morality"
    },
    {
      title: "The Selfish Gene",
      author: "Richard Dawkins",
      image: "https://images-na.ssl-images-amazon.com/images/P/0198788606.01.L.jpg",
      link: "https://www.amazon.com/Selfish-Gene-Anniversary-Landmark-Science/dp/0198788606",
      description: "A groundbreaking look at evolution that explains how genes drive biological evolution and shape all living things"
    },
    {
      title: "Man's Search for Meaning",
      author: "Viktor E. Frankl",
      image: "https://images-na.ssl-images-amazon.com/images/P/0807014273.01.L.jpg",
      link: "https://www.amazon.com/Mans-Search-Meaning-Viktor-Frankl/dp/0807014273",
      description: "A powerful memoir and psychological exploration of how we can find purpose in the face of suffering"
    },
    {
      title: "1984",
      author: "George Orwell",
      image: "https://images-na.ssl-images-amazon.com/images/P/0451524934.01.L.jpg",
      link: "https://www.amazon.com/1984-Signet-Classics-George-Orwell/dp/0451524934",
      description: "A dystopian masterpiece that explores surveillance, control, and the importance of truth in society"
    },
    {
      title: "Models",
      author: "Mark Manson",
      image: "https://images-na.ssl-images-amazon.com/images/P/1463750358.01.L.jpg",
      link: "https://www.amazon.com/Models-Attract-Women-Through-Honesty/dp/1463750358",
      description: "A comprehensive guide to authentic attraction and building genuine relationships through vulnerability and honesty"
    },
    {
      title: "Unbroken",
      author: "Laura Hillenbrand",
      image: "https://images-na.ssl-images-amazon.com/images/P/0812974492.01.L.jpg",
      link: "https://www.amazon.com/Unbroken-World-Survival-Resilience-Redemption/dp/0812974492",
      description: "The incredible true story of Louis Zamperini's journey from Olympic runner to WWII survivor, demonstrating the triumph of the human spirit"
    },
    {
      title: "Anna Karenina",
      author: "Leo Tolstoy",
      image: "https://images-na.ssl-images-amazon.com/images/P/B0C3SJDLK8.01.L.jpg",
      link: "https://www.amazon.com/Anna-Karenina-Leo-Tolstoy-ebook/dp/B0C3SJDLK8",
      description: "A masterpiece of Russian literature exploring love, society, and the human condition through the tragic story of Anna Karenina"
    }
  ];

  const visibleBooks = limit ? books.slice(0, limit) : books;

  const updateScrollState = () => {
    const rail = railRef.current;
    if (!rail || !compact) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setCanScrollLeft(rail.scrollLeft > 8);
    setCanScrollRight(rail.scrollLeft < maxScrollLeft - 8);
  };

  useEffect(() => {
    updateScrollState();

    if (!compact) {
      return undefined;
    }

    const rail = railRef.current;
    if (!rail) {
      return undefined;
    }

    const handleScroll = () => updateScrollState();
    const handleResize = () => updateScrollState();

    rail.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      rail.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [compact, visibleBooks.length]);

  const scrollBooks = (direction) => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

     const firstCard = rail.querySelector('.book-card');
     const railStyles = window.getComputedStyle(rail);
     const gap = parseFloat(railStyles.columnGap || railStyles.gap || '0') || 0;
     const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : rail.clientWidth;

    rail.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: 'smooth'
    });
  };

  return (
    <div className="reading-list">
      {!compact && (
        <>
          <h1>Reading List</h1>
          <p className="reading-intro">A curated selection of books that have shaped my thinking and perspective.</p>
        </>
      )}

      <div className={`books-rail-shell ${compact ? 'is-compact' : ''}`}>
        {compact && canScrollLeft && (
          <button
            type="button"
            className="books-rail-control books-rail-control-left"
            aria-label="Scroll books left"
            onClick={() => scrollBooks(-1)}
          >
            ‹
          </button>
        )}

        <div ref={railRef} className={`books-grid ${compact ? 'books-grid-compact' : ''}`}>
          {visibleBooks.map((book, index) => (
          <a 
            href={book.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="book-card" 
            key={index}
          >
            <div className="book-image">
              <img src={book.image} alt={book.title} />
            </div>
            <div className="book-info">
              <h3>{book.title}</h3>
              <p className="author">by {book.author}</p>
              <p className="description">{book.description}</p>
            </div>
          </a>
          ))}
        </div>

        {compact && canScrollRight && (
          <button
            type="button"
            className="books-rail-control books-rail-control-right"
            aria-label="Scroll books right"
            onClick={() => scrollBooks(1)}
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

export default ReadingList; 
