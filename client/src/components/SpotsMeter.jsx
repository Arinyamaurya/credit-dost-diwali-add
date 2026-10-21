import React from 'react';
import { motion } from 'framer-motion';

/**
 * SpotsMeter:
 * Displays real-time claimed spots out of total with animated progress bar.
 * If remaining <= 10, highlights an urgent "Only X spots left" tag.
 * Never renders fake numbers; if data is missing or errored, returns null.
 */
export const SpotsMeter = ({ spotData }) => {
  if (!spotData || spotData.claimed === undefined || spotData.total === undefined) {
    return null;
  }

  const { claimed, total, remaining } = spotData;
  const percent = total > 0 ? Math.min(Math.round((claimed / total) * 100), 100) : 0;
  const isUrgent = remaining !== undefined && remaining <= 10 && remaining > 0;
  const isSoldOut = remaining !== undefined && remaining <= 0;

  return (
    <div
      className="spots-progress-box"
      aria-label={`Claimed spots: ${claimed} of ${total}`}
    >
      <div className="spots-progress-header">
        <span>
          <strong>{claimed}</strong> of {total} spots claimed
        </span>

        {isSoldOut ? (
          <span style={{ color: '#ff80ab', fontWeight: 700 }}>All spots claimed</span>
        ) : isUrgent ? (
          <span
            style={{
              color: '#ff9a2e',
              background: 'rgba(255, 154, 46, 0.18)',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 800,
              letterSpacing: '0.02em',
              border: '1px solid rgba(255, 154, 46, 0.35)',
            }}
          >
            🔥 Only {remaining} left!
          </span>
        ) : (
          <span>{remaining} remaining</span>
        )}
      </div>

      <div className="spots-progress-bar-bg" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
        <motion.div
          className="spots-progress-bar-fill"
          initial={{ width: '4%' }}
          animate={{ width: `${Math.max(percent, 4)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
