import React, { useState } from 'react';
import { PLANS } from './config';
import { useSpots } from './hooks/useSpots';
import { Torana } from './components/Torana';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { RangoliDivider } from './components/RangoliDivider';
import { OfferCard } from './components/OfferCard';
import { Footer } from './components/Footer';
import { MandalaWatermarkSvg, SparkleIcon } from './components/icons/FestiveIcons';

export function App() {
  const [isExpired, setIsExpired] = useState(false);
  const { partner, customer, updateLocalSpots, refresh } = useSpots();

  // When a lead is registered successfully, immediately update local spot counts and trigger background refresh
  const handleLeadSuccess = (kind, newKindSpots) => {
    if (newKindSpots) {
      updateLocalSpots(kind, newKindSpots);
    }
    refresh();
  };

  return (
    <div className="credit-dost-diwali-app">
      {/* 1. Festive Torana Garland / String Lights */}
      <Torana />

      {/* 2. Sticky Slim TopBar */}
      <TopBar />

      <main id="main-content">
        {/* 3. Hero Section */}
        <Hero onExpireChange={setIsExpired} isExpired={isExpired} />

        {/* 4. Rangoli Divider */}
        <RangoliDivider />

        {/* 5. Offers Section */}
        <section
          id="offers"
          className="offers-section"
          aria-label="Diwali Special Offers"
        >
          {/* Subtle Mandala Background Watermark (5% opacity) */}
          <div className="mandala-watermark" aria-hidden="true">
            <MandalaWatermarkSvg />
          </div>

          <div className="offers-header">
            <div className="offers-header-badge">
              <SparkleIcon size={16} />
              <span>Exclusive Festive Pricing</span>
              <SparkleIcon size={16} />
            </div>
            <h2 className="hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              <span className="shimmer-text">Choose Your Diwali Pathway</span>
            </h2>
            <p className="hero-lede" style={{ marginBottom: 0 }}>
              Whether you want to launch a profitable credit consultancy or resolve your personal credit score,
              we have reserved special festive privileges for you.
            </p>
          </div>

          <div className="offers-grid">
            {/* Offer 1: Franchise Partner */}
            <OfferCard
              plan={PLANS.partner}
              spotData={partner}
              onLeadSuccess={handleLeadSuccess}
            />

            {/* Offer 2: Customer Score Repair */}
            <OfferCard
              plan={PLANS.customer}
              spotData={customer}
              onLeadSuccess={handleLeadSuccess}
            />
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <Footer />
    </div>
  );
}

export default App;
