import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CAROUSEL_IMAGES = [
  {
    url: '/assets/carousel-holiday-living-1.jpg',
    alt: 'Beautifully decorated modern living room with Christmas tree and festive decor',
  },
  {
    url: '/assets/carousel-holiday-dining-2.jpg',
    alt: 'Elegant Christmas dining room with festive table setting',
  },
  {
    url: '/assets/carousel-holiday-entryway-3.jpg',
    alt: 'Cozy Christmas entryway with decorated console and holiday decor',
  },
  {
    url: '/assets/carousel-everyday-living-4.jpg',
    alt: 'Modern minimalist living room with neutral tones and clean aesthetic',
  },
  {
    url: '/assets/carousel-everyday-bedroom-5.jpg',
    alt: 'Stylish bedroom interior with cozy bed and modern home decor',
  },
  {
    url: '/assets/carousel-everyday-kitchen-6.jpg',
    alt: 'Contemporary kitchen and dining area with modern furniture',
  },
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl group w-full">
      {/* Images Container with Fixed Height */}
      <div className="relative w-full h-[280px] sm:h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-gray-100">
        {CAROUSEL_IMAGES.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Always visible on mobile for better UX */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#111111] p-2 sm:p-2.5 rounded-full shadow-lg transition-all duration-200 active:scale-95"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#111111] p-2 sm:p-2.5 rounded-full shadow-lg transition-all duration-200 active:scale-95"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {CAROUSEL_IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75 w-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Touch/Swipe Support */}
      <div
        className="absolute inset-0 touch-pan-y"
        onTouchStart={(e) => {
          const touchStart = e.touches[0].clientX;
          const handleTouchEnd = (endEvent: TouchEvent) => {
            const touchEnd = endEvent.changedTouches[0].clientX;
            const diff = touchStart - touchEnd;
            if (Math.abs(diff) > 50) {
              if (diff > 0) {
                goToNext();
              } else {
                goToPrevious();
              }
            }
            document.removeEventListener('touchend', handleTouchEnd);
          };
          document.addEventListener('touchend', handleTouchEnd);
        }}
      />
    </div>
  );
}