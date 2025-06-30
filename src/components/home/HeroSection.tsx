
import React from 'react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onShowLogin: () => void;
}

const HeroSection = ({ onShowLogin }: HeroSectionProps) => {
  const schoolImages = [
    "/lovable-uploads/4966ace3-8bbd-447b-8523-60a0ff5b4e0b.png",
    "/lovable-uploads/455cb73f-07ec-42ce-ae0e-40bdfb1cb59d.png",
    "/lovable-uploads/ec3be63c-3db6-44c0-82fd-38309c32da32.png"
  ];

  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % schoolImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [schoolImages.length]);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={schoolImages[currentImageIndex]}
          alt="Maryland Secondary School"
          className="w-full h-96 object-cover transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
            Welcome to Maryland Secondary School
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto">
            Excellence in Education - Located in the heart of Subukia Sub-County, Nakuru County
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onShowLogin}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
            >
              Access Library System
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
