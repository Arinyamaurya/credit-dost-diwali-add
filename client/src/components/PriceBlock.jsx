import React from 'react';
import { StarburstBadgeSvg } from './icons/FestiveIcons';

/**
 * PriceBlock: Big Fraunces typography, old price with strike-through,
 * savings & discount chips, rotating starburst badge, and price fine print.
 */
export const PriceBlock = ({
  priceFormatted,
  oldPriceFormatted,
  oldPriceLabel = 'Regular price',
  chips = [],
  priceNote,
  starburstText,
}) => {
  return (
    <div className="price-block-wrap">
      {starburstText && (
        <div className="starburst-badge-corner" aria-hidden="true">
          <StarburstBadgeSvg className="starburst-svg" />
          <span className="starburst-text">{starburstText}</span>
        </div>
      )}

      <div className="price-row">
        <span className="price-main">{priceFormatted}</span>

        {oldPriceFormatted && (
          <span className="price-old">
            <span className="sr-only">{oldPriceLabel}: </span>
            {oldPriceFormatted}
          </span>
        )}

        {chips.length > 0 && (
          <div className="chips-container">
            {chips.map((chip, idx) => (
              <span key={idx} className={`price-chip ${chip.variant || 'savings'}`}>
                {chip.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {priceNote && <p className="price-note">{priceNote}</p>}
    </div>
  );
};
