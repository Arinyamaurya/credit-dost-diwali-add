import React, { useState, useEffect } from 'react';
import { SparkleIcon } from './icons/FestiveIcons';

/**
 * TopBar: Fixed/sticky slim header with Credit Dost white logo,
 * limited spots note, and dynamic claim offer button when scrolled.
 */
export const TopBar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToOffer = (e) => {
    e.preventDefault();
    const target = document.getElementById('partner');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`site-topbar ${scrolled ? 'scrolled' : ''}`}>
      <a href="#" className="topbar-logo-link" aria-label="Credit Dost Home">
        <img
          src="/assets/white-logo.png"
          alt="Credit Dost Logo"
          className="topbar-logo-img"
          width="180"
          height="45"
        />
      </a>

      <div className="topbar-center-note" role="note">
        <SparkleIcon size={14} />
        <span>Diwali offers for the first 100 partners and 100 customers</span>
      </div>

      {scrolled && (
        <a href="#partner" onClick={scrollToOffer} className="topbar-claim-btn">
          <span>Claim offer</span>
          <span aria-hidden="true">→</span>
        </a>
      )}
    </header>
  );
};
