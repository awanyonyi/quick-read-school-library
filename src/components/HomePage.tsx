
import React from 'react';
import HomeNavigation from './home/HomeNavigation';
import HeroSection from './home/HeroSection';
import SchoolInfoSection from './home/SchoolInfoSection';
import ContactSection from './home/ContactSection';
import HomeFooter from './home/HomeFooter';

interface HomePageProps {
  onShowLogin: () => void;
}

const HomePage = ({ onShowLogin }: HomePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <HomeNavigation onShowLogin={onShowLogin} />
      <HeroSection onShowLogin={onShowLogin} />
      <SchoolInfoSection />
      <ContactSection />
      <HomeFooter />
    </div>
  );
};

export default HomePage;
