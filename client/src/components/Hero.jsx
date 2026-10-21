import React from 'react';
import { motion } from 'framer-motion';
import { SparkleIcon, DiyaFlameIcon } from './icons/FestiveIcons';
import { Sparkles } from './Sparkles';
import { Countdown } from './Countdown';

/**
 * Hero Section:
 * Diya centerpiece with pulsing halo + flanking mirrored diyas,
 * Shubh Deepawali Devanagari heading, shimmering gold H1,
 * smooth anchor scroll buttons, and festive countdown timer.
 */
export const Hero = ({ onExpireChange, isExpired }) => {
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-section" aria-label="Festive Diwali Greetings and Offers">
      <Sparkles />
      <div className="hero-glow-halo" aria-hidden="true" />

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Festive Diya Centerpiece */}
        <div className="hero-centerpiece">
          <img
            src="/assets/oil-lamp.png"
            alt=""
            aria-hidden="true"
            className="hero-lamp-flank flank-left"
            width="110"
            height="110"
          />

          <img
            src="/assets/oil-lamp.png"
            alt="Diwali Diya Golden Lamp"
            className="hero-lamp-main"
            width="220"
            height="220"
          />

          <img
            src="/assets/oil-lamp.png"
            alt=""
            aria-hidden="true"
            className="hero-lamp-flank flank-right"
            width="110"
            height="110"
          />
        </div>

        {/* Hindi Greeting */}
        <motion.div
          className="hero-hindi-badge"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <SparkleIcon size={18} />
          <span>शुभ दीपावली</span>
          <SparkleIcon size={18} />
        </motion.div>

        {/* Shimmering Gold H1 */}
        <h1 className="hero-title">
          <span className="shimmer-text">Greetings from Credit Dost</span>
        </h1>

        {/* Lede Paragraph */}
        <p className="hero-lede">
          Wishing you a bright and prosperous Diwali. This festive season, choose
          how Credit Dost can help you: build an income, or build a stronger credit score.
        </p>

        {/* Hero Actions */}
        <div className="hero-actions">
          <button
            type="button"
            onClick={scrollTo('partner')}
            className="btn-primary-gold"
            disabled={isExpired}
            aria-disabled={isExpired}
          >
            <DiyaFlameIcon size={20} />
            <span>Become a franchise partner</span>
          </button>

          <button
            type="button"
            onClick={scrollTo('repair')}
            className="btn-secondary-gold"
            disabled={isExpired}
            aria-disabled={isExpired}
          >
            <span>Repair my credit score</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* Countdown Timer */}
        <Countdown onExpireChange={onExpireChange} />
      </motion.div>
    </section>
  );
};
