
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

interface HeroSectionProps {
  onShowLogin: () => void;
}

interface ImageData {
  src: string;
  alt: string;
  title: string;
  description: string;
}

const HeroSection = ({ onShowLogin }: HeroSectionProps) => {
  const schoolImages: ImageData[] = [
    {
      src: "/lovable-uploads/4966ace3-8bbd-447b-8523-60a0ff5b4e0b.png",
      alt: "Maryland Secondary School",
      title: "Excellence in Education",
      description: "State-of-the-art facilities fostering academic excellence"
    },
    {
      src: "/lovable-uploads/455cb73f-07ec-42ce-ae0e-40bdfb1cb59d.png",
      alt: "Maryland Secondary School Library",
      title: "Modern Library System",
      description: "Advanced digital library with biometric access control"
    },
    {
      src: "/lovable-uploads/ec3be63c-3db6-44c0-82fd-38309c32da32.png",
      alt: "Maryland Secondary School Students",
      title: "School of Winners",
      description: "Nurturing tomorrow's leaders and innovators"
    },
     {
      src: "/lovable-uploads/dad.jpeg",
      alt: "Maryland Secondary School Students in Tech Challenge",
      title: "Trailblazers in Tech Challenge 2025",
      description: "Pioneering innovation and excellence in technology"
    },
     {
      src: "/lovable-uploads/staff.jpeg",
      alt: "Maryland Secondary School Staff",
      title: "Dedicated Educators",
      description: "Committed to nurturing and inspiring students"
    },
    {
      src: "/lovable-uploads/award.jpeg",
      alt: "Maryland Secondary School Award",
      title: "KCSE top performers 2024 awarding ceremony",
      description: "Recognizing outstanding achievements to KCSE top performers with University entry grades"
    },
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const nextImage = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex((prev) => (prev + 1) % schoolImages.length);
    setTimeout(() => setIsTransitioning(false), 1000);
  }, [schoolImages.length, isTransitioning]);

  const prevImage = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex((prev) => (prev - 1 + schoolImages.length) % schoolImages.length);
    setTimeout(() => setIsTransitioning(false), 1000);
  }, [schoolImages.length, isTransitioning]);

  const goToImage = useCallback((index: number) => {
    if (isTransitioning || index === currentImageIndex) return;
    setIsTransitioning(true);
    setCurrentImageIndex(index);
    setTimeout(() => setIsTransitioning(false), 1000);
  }, [currentImageIndex, isTransitioning]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      nextImage();
    }, 5000);

    return () => clearInterval(interval);
  }, [nextImage, isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        case ' ':
          event.preventDefault();
          togglePlayPause();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextImage, prevImage]);

  // Touch handlers for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }
  };

  const currentImage = schoolImages[currentImageIndex];

  return (
    <section
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          className={`w-full h-64 sm:h-80 lg:h-96 object-cover transition-all duration-1000 ${
            isTransitioning ? 'scale-105' : 'scale-100'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevImage}
          className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
          disabled={isTransitioning}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextImage}
          className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
          disabled={isTransitioning}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Play/Pause Control */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlayPause}
          className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center">
          {/* Dynamic Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-white mb-2 sm:mb-4 animate-fade-in leading-tight">
            {currentImage.title}
          </h1>

          {/* Dynamic Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-2 sm:mb-4 max-w-2xl mx-auto px-2">
            {currentImage.description}
          </p>

          {/* Static School Info */}
          <p className="text-sm sm:text-base text-white/80 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
            Maryland Senior School - School of Winners • Located in Subukia Sub-County, Nakuru County
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Button
              size="lg"
              onClick={onShowLogin}
              className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm sm:text-lg px-6 sm:px-8 py-2 sm:py-3 w-full sm:w-auto transition-all duration-300 hover:scale-105"
            >
              Access Library System
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white text-white hover:bg-white hover:text-primary text-sm sm:text-lg px-6 sm:px-8 py-2 sm:py-3 w-full sm:w-auto transition-all duration-300 hover:scale-105"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Image Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {schoolImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToImage(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentImageIndex
                ? 'bg-white scale-125'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
        <div
          className={`h-full bg-white transition-all duration-300 ease-linear ${
            isPlaying ? 'animate-progress' : ''
          }`}
          style={{
            width: isPlaying ? '100%' : '0%'
          }}
        />
      </div>
    </section>
  );
};

export default HeroSection;
