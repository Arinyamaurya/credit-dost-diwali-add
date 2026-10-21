import React, { useState, useEffect } from 'react';
import { OFFER_END_DATE } from '../config';

/**
 * Countdown Timer Component
 * Computes remaining Days, Hours, Mins, Secs from OFFER_END_DATE.
 * When expired, displays 'Offer closed' badge and signals isExpired.
 */
export const Countdown = ({ onExpireChange }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(OFFER_END_DATE).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        const expiredState = {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        };
        setTimeLeft(expiredState);
        if (onExpireChange) onExpireChange(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
      });
      if (onExpireChange) onExpireChange(false);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [onExpireChange]);

  const pad = (num) => String(num).padStart(2, '0');

  if (timeLeft.isExpired) {
    return (
      <div className="hero-countdown-wrap">
        <div className="countdown-expired-badge" role="status">
          Offer closed — All festive spots fully booked
        </div>
      </div>
    );
  }

  return (
    <div className="hero-countdown-wrap" aria-label="Special offer countdown">
      <div className="countdown-label">
        <span aria-hidden="true">⏱️</span> Limited Festive Offer Ends In
      </div>
      <div className="countdown-tiles">
        <div className="countdown-tile">
          <span className="countdown-num">{pad(timeLeft.days)}</span>
          <span className="countdown-unit">Days</span>
        </div>
        <span className="countdown-colon" aria-hidden="true">:</span>
        <div className="countdown-tile">
          <span className="countdown-num">{pad(timeLeft.hours)}</span>
          <span className="countdown-unit">Hours</span>
        </div>
        <span className="countdown-colon" aria-hidden="true">:</span>
        <div className="countdown-tile">
          <span className="countdown-num">{pad(timeLeft.minutes)}</span>
          <span className="countdown-unit">Mins</span>
        </div>
        <span className="countdown-colon" aria-hidden="true">:</span>
        <div className="countdown-tile">
          <span className="countdown-num">{pad(timeLeft.seconds)}</span>
          <span className="countdown-unit">Secs</span>
        </div>
      </div>
    </div>
  );
};
